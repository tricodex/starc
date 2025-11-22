// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title StarcVaultV2
 * @notice Single-Asset Yield Vault (ERC4626)
 *         - Eliminates oracle risk by accepting only ONE asset per vault.
 *         - Eliminates "death spiral" risk by enforcing 1:1 asset matching.
 *         - Implements standard ERC4626 for composability.
 *         - Includes fee mechanism for revenue/insurance.
 *
 * @dev Key Design Decisions:
 *      - Fees are taken in SHARES, not assets (preserves capital for yield generation)
 *      - Override _deposit and _withdraw (internal) not deposit/withdraw (public)
 *      - Uses previewDeposit/previewWithdraw for share calculations
 *      - Maintains ERC4626 compliance for composability
 */
contract StarcVaultV2 is ERC4626, AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // --------------------------- Roles ---------------------------
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RISK_MANAGER_ROLE = keccak256("RISK_MANAGER_ROLE");

    // --------------------------- Constants ---------------------------
    uint256 public constant BPS = 10_000;

    // --------------------------- Fees & Treasury ---------------------------
    uint256 public depositFeeBps;
    uint256 public withdrawFeeBps;
    address public treasury;
    address public riskFund;
    uint256 public riskFundSplitBps = 5_000; // 50% to risk fund

    // --------------------------- Events ---------------------------
    event FeesUpdated(uint256 newDepositFeeBps, uint256 newWithdrawFeeBps);
    event TreasuryUpdated(address newTreasury, address newRiskFund);
    event FeeSharesMinted(uint256 treasuryShares, uint256 riskFundShares);

    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol,
        address _admin,
        address _treasury,
        address _riskFund
    ) ERC4626(_asset) ERC20(_name, _symbol) {
        require(_admin != address(0), "admin=0");
        require(_treasury != address(0), "treasury=0");
        require(_riskFund != address(0), "riskFund=0");

        treasury = _treasury;
        riskFund = _riskFund;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(RISK_MANAGER_ROLE, _admin);

        // Defaults: 0.1%
        depositFeeBps = 10;
        withdrawFeeBps = 10;
    }

    // --------------------------- Admin Functions ---------------------------

    function setFees(uint256 _depositFeeBps, uint256 _withdrawFeeBps) external onlyRole(ADMIN_ROLE) {
        require(_depositFeeBps <= 500, "deposit fee > 5%");
        require(_withdrawFeeBps <= 500, "withdraw fee > 5%");
        depositFeeBps = _depositFeeBps;
        withdrawFeeBps = _withdrawFeeBps;
        emit FeesUpdated(_depositFeeBps, _withdrawFeeBps);
    }

    function setTreasury(address _treasury, address _riskFund) external onlyRole(ADMIN_ROLE) {
        require(_treasury != address(0), "treasury=0");
        require(_riskFund != address(0), "riskFund=0");
        treasury = _treasury;
        riskFund = _riskFund;
        emit TreasuryUpdated(_treasury, _riskFund);
    }

    function pause() external onlyRole(RISK_MANAGER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // --------------------------- ERC4626 Overrides ---------------------------

    /**
     * @dev Override deposit to add pause check and reentrancy guard.
     *      Fee logic is in _deposit override.
     */
    function deposit(uint256 assets, address receiver)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        require(assets > 0, "Cannot deposit zero");
        return super.deposit(assets, receiver);
    }

    /**
     * @dev Override mint to add pause check and reentrancy guard.
     */
    function mint(uint256 shares, address receiver)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        return super.mint(shares, receiver);
    }

    /**
     * @dev Override withdraw to add pause check and reentrancy guard.
     *      Fee logic is in _withdraw override.
     */
    function withdraw(uint256 assets, address receiver, address owner)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        return super.withdraw(assets, receiver, owner);
    }

    /**
     * @dev Override redeem to add pause check and reentrancy guard.
     */
    function redeem(uint256 shares, address receiver, address owner)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        return super.redeem(shares, receiver, owner);
    }

    /**
     * @dev Internal deposit override with fee mechanism.
     *      Takes fee in SHARES (not assets) to preserve capital.
     *
     * Flow:
     * 1. Transfer assets from caller
     * 2. Mint shares to receiver (standard ERC4626)
     * 3. Calculate fee in shares
     * 4. Mint fee shares to treasury/riskFund
     */
    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        // Standard ERC4626 deposit flow
        super._deposit(caller, receiver, assets, shares);

        // Calculate and mint fee shares
        if (depositFeeBps > 0) {
            uint256 feeShares = (shares * depositFeeBps) / BPS;
            if (feeShares > 0) {
                _mintFeeShares(feeShares);
            }
        }
    }

    /**
     * @dev Internal withdraw override with fee mechanism.
     *      Takes fee in SHARES (burned from owner).
     *
     * Flow:
     * 1. Spend allowance if needed (done in parent)
     * 2. Calculate fee in shares
     * 3. Burn total shares (user shares + fee shares) from owner
     * 4. Mint fee shares to treasury/riskFund
     * 5. Transfer assets to receiver
     */
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        // Handle allowance (shares already includes fee from previewWithdraw)
        if (caller != owner) {
            _spendAllowance(owner, caller, shares);
        }

        // shares already includes the fee (calculated in previewWithdraw)
        // Calculate base shares (shares needed for assets) and fee shares
        uint256 baseShares = super.previewWithdraw(assets);
        uint256 feeShares = shares - baseShares;

        // Burn total shares from owner
        _burn(owner, shares);

        // Mint fee shares to treasury/riskFund
        if (feeShares > 0) {
            _mintFeeShares(feeShares);
        }

        // Transfer assets to receiver
        SafeERC20.safeTransfer(IERC20(asset()), receiver, assets);

        emit Withdraw(caller, receiver, owner, assets, shares);
    }

    /**
     * @dev Mint fee shares and distribute to treasury and risk fund.
     *      Uses shares (not assets) to keep capital in vault for yield generation.
     */
    function _mintFeeShares(uint256 feeShares) internal {
        uint256 riskPortion = (feeShares * riskFundSplitBps) / BPS;
        uint256 treasuryPortion = feeShares - riskPortion;

        if (riskPortion > 0) {
            _mint(riskFund, riskPortion);
        }
        if (treasuryPortion > 0) {
            _mint(treasury, treasuryPortion);
        }

        emit FeeSharesMinted(treasuryPortion, riskPortion);
    }

    /**
     * @dev Preview deposit accounting for fees.
     *      Returns shares user will receive AFTER fees.
     */
    function previewDeposit(uint256 assets) public view virtual override returns (uint256) {
        uint256 grossShares = super.previewDeposit(assets);
        uint256 feeShares = (grossShares * depositFeeBps) / BPS;
        return grossShares; // User receives full shares; fee shares minted separately
    }

    /**
     * @dev Preview withdraw accounting for fees.
     *      Returns shares that will be burned (including fee).
     */
    function previewWithdraw(uint256 assets) public view virtual override returns (uint256) {
        uint256 baseShares = super.previewWithdraw(assets);
        uint256 feeShares = (baseShares * withdrawFeeBps) / BPS;
        return baseShares + feeShares; // Total shares burned (user + fee)
    }

    /**
     * @dev Max deposit accounting for paused state.
     */
    function maxDeposit(address) public view virtual override returns (uint256) {
        return paused() ? 0 : type(uint256).max;
    }

    /**
     * @dev Max mint accounting for paused state.
     */
    function maxMint(address) public view virtual override returns (uint256) {
        return paused() ? 0 : type(uint256).max;
    }

    /**
     * @dev Max withdraw accounting for paused state and withdrawal fees.
     *      User can only withdraw assets for which they have enough shares to cover assets + fee.
     */
    function maxWithdraw(address owner) public view virtual override returns (uint256) {
        if (paused()) return 0;

        uint256 ownerShares = balanceOf(owner);
        if (ownerShares == 0) return 0;

        // Calculate max assets that can be withdrawn given user's shares
        // shares = baseShares + feeShares
        // shares = baseShares * (1 + fee%)
        // baseShares = shares / (1 + fee%)
        // assets = convertToAssets(baseShares)

        uint256 baseShares = (ownerShares * BPS) / (BPS + withdrawFeeBps);
        return convertToAssets(baseShares);
    }

    /**
     * @dev Max redeem accounting for paused state.
     */
    function maxRedeem(address owner) public view virtual override returns (uint256) {
        if (paused()) return 0;
        return balanceOf(owner);
    }
}
