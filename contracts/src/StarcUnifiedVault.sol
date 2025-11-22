// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title StarcUnifiedVault
 * @notice Unified per-currency stablecoin vault (e.g. uARS, uUSD)
 *         - Aggregates multiple stablecoins of the SAME currency into a single ERC20 share token.
 *         - Uses Chainlink oracles to normalize value to 18-dec "units" (e.g. 1e18 == 1 USD).
 *         - ERC4626-like share logic (shares represent pro-rata claim on total vault value).
 *         - Fees are taken in shares and minted to treasury / riskFund.
 *
 * IMPORTANT:
 * - This is NOT an AMM. It is a price-oracle-based vault.
 * - Bridging (CCTP, etc.) should interact as a normal depositor via `deposit()`.
 * - Still needs full security review + tests before mainnet.
 */

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );

    function decimals() external view returns (uint8);
}

contract StarcUnifiedVault is ERC20, AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // --------------------------- Roles ---------------------------

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RISK_MANAGER_ROLE = keccak256("RISK_MANAGER_ROLE");

    // --------------------------- Constants ---------------------------

    uint256 public constant BPS = 10_000;
    uint256 public constant SECONDS_PER_DAY = 1 days;

    // --------------------------- Asset Config ---------------------------

    struct AssetConfig {
        bool isSupported;              // Is this token allowed?
        address oracle;                // Chainlink feed (proxy) address
        uint8 tokenDecimals;           // ERC20 decimals of token
        uint8 oracleDecimals;          // Expected oracle decimals
        uint256 dailyDepositLimit;     // Per-asset daily limit in 18-dec "value" units
        uint256 dailyDeposited;        // Accumulated today (18-dec)
        uint256 lastResetTimestamp;    // For daily limit reset
        int256 minPrice;               // Lower bound: e.g. 0.99 * 10^oracleDecimals
        int256 maxPrice;               // Upper bound: e.g. 1.01 * 10^oracleDecimals
    }

    mapping(address => AssetConfig) public assetConfig;
    address[] public supportedAssets;

    // --------------------------- Fees & Treasury ---------------------------

    uint256 public depositFeeBps;      // e.g. 10 = 0.10%
    uint256 public withdrawFeeBps;     // e.g. 10 = 0.10%
    address public treasury;
    address public riskFund;
    uint256 public riskFundSplitBps = 5_000; // 50% of fees to riskFund, rest to treasury

    // --------------------------- Oracle risk params ---------------------------

    uint256 public maxOracleStaleness = 1 hours; // max allowed age of oracle data

    // --------------------------- Events ---------------------------

    event AssetAdded(
        address indexed asset,
        address indexed oracle,
        uint8 tokenDecimals,
        uint8 oracleDecimals,
        uint256 dailyLimit,
        int256 minPrice,
        int256 maxPrice
    );

    event AssetUpdated(
        address indexed asset,
        address indexed oracle,
        uint8 tokenDecimals,
        uint8 oracleDecimals,
        uint256 dailyLimit,
        int256 minPrice,
        int256 maxPrice
    );

    event FeesUpdated(uint256 newDepositFeeBps, uint256 newWithdrawFeeBps);
    event RiskParamsUpdated(uint256 newMaxOracleStaleness, uint256 newRiskFundSplitBps);

    event DepositAsset(
        address indexed caller,
        address indexed receiver,
        address indexed asset,
        uint256 assetsIn,
        uint256 userShares,
        uint256 feeShares
    );

    event WithdrawAsset(
        address indexed caller,
        address indexed receiver,
        address indexed assetOut,
        uint256 assetsOut,
        uint256 sharesBurned,
        uint256 feeShares
    );

    // --------------------------- Constructor ---------------------------

    constructor(
        string memory _name,
        string memory _symbol,
        address _treasury,
        address _riskFund,
        address _admin
    ) ERC20(_name, _symbol) {
        require(_treasury != address(0), "treasury=0");
        require(_riskFund != address(0), "riskFund=0");
        require(_admin != address(0), "admin=0");

        treasury = _treasury;
        riskFund = _riskFund;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(RISK_MANAGER_ROLE, _admin);

        // sensible defaults
        depositFeeBps = 10;  // 0.10%
        withdrawFeeBps = 10; // 0.10%
    }

    // --------------------------- Admin / Risk Management ---------------------------

    function addSupportedAsset(
        address _asset,
        address _oracle,
        uint8 _tokenDecimals,
        uint8 _oracleDecimals,
        uint256 _dailyLimitValue18,
        int256 _minPrice,
        int256 _maxPrice
    ) external onlyRole(ADMIN_ROLE) {
        require(_asset != address(0), "asset=0");
        require(_oracle != address(0), "oracle=0");
        require(_tokenDecimals <= 18, "tokenDecimals>18");
        require(_minPrice > 0 && _maxPrice > 0, "price bounds zero");
        require(_minPrice < _maxPrice, "min>=max");
        require(_dailyLimitValue18 > 0, "dailyLimit=0");

        AssetConfig storage cfg = assetConfig[_asset];

        // Check oracle decimals match expectation
        uint8 actualOracleDec = AggregatorV3Interface(_oracle).decimals();
        require(actualOracleDec == _oracleDecimals, "oracle decimals mismatch");

        bool isNew = !cfg.isSupported;

        cfg.isSupported = true;
        cfg.oracle = _oracle;
        cfg.tokenDecimals = _tokenDecimals;
        cfg.oracleDecimals = _oracleDecimals;
        cfg.dailyDepositLimit = _dailyLimitValue18;
        cfg.minPrice = _minPrice;
        cfg.maxPrice = _maxPrice;

        if (cfg.lastResetTimestamp == 0) {
            cfg.lastResetTimestamp = block.timestamp;
        }

        if (isNew) {
            supportedAssets.push(_asset);
            emit AssetAdded(
                _asset,
                _oracle,
                _tokenDecimals,
                _oracleDecimals,
                _dailyLimitValue18,
                _minPrice,
                _maxPrice
            );
        } else {
            emit AssetUpdated(
                _asset,
                _oracle,
                _tokenDecimals,
                _oracleDecimals,
                _dailyLimitValue18,
                _minPrice,
                _maxPrice
            );
        }
    }

    function setFees(uint256 _depositFeeBps, uint256 _withdrawFeeBps) external onlyRole(ADMIN_ROLE) {
        require(_depositFeeBps <= 500 && _withdrawFeeBps <= 500, "fee too high");
        depositFeeBps = _depositFeeBps;
        withdrawFeeBps = _withdrawFeeBps;
        emit FeesUpdated(_depositFeeBps, _withdrawFeeBps);
    }

    function setRiskParams(uint256 _maxOracleStaleness, uint256 _riskFundSplitBps)
        external
        onlyRole(RISK_MANAGER_ROLE)
    {
        require(_maxOracleStaleness > 0, "staleness=0");
        require(_riskFundSplitBps <= BPS, "split>100%");
        maxOracleStaleness = _maxOracleStaleness;
        riskFundSplitBps = _riskFundSplitBps;
        emit RiskParamsUpdated(_maxOracleStaleness, _riskFundSplitBps);
    }

    function setTreasury(address _treasury) external onlyRole(ADMIN_ROLE) {
        require(_treasury != address(0), "treasury=0");
        treasury = _treasury;
    }

    function setRiskFund(address _riskFund) external onlyRole(ADMIN_ROLE) {
        require(_riskFund != address(0), "riskFund=0");
        riskFund = _riskFund;
    }

    function pause() external onlyRole(RISK_MANAGER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // --------------------------- Core View Logic ---------------------------

    /**
     * @notice Total vault value in 18-dec "accounting units".
     */
    function totalAssets() public view returns (uint256) {
        return _totalAssetsInternal();
    }

    function getSupportedAssets() external view returns (address[] memory) {
        return supportedAssets;
    }

    // --------------------------- User Actions ---------------------------

    /**
     * @notice Deposit `assets` of `asset` and receive vault shares.
     * @param asset    Supported stablecoin address.
     * @param assets   Amount of `asset` to deposit (in token decimals).
     * @param receiver Recipient of minted shares.
     */
    function deposit(address asset, uint256 assets, address receiver)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 shares)
    {
        require(assets > 0, "assets=0");
        require(receiver != address(0), "receiver=0");

        AssetConfig storage cfg = assetConfig[asset];
        require(cfg.isSupported, "asset not supported");

        // Guarded launch: first deposit must be admin to avoid inflation attack on empty vault.
        if (totalSupply() == 0) {
            require(hasRole(ADMIN_ROLE, msg.sender), "guarded: only admin can seed");
        }

        // 1. Compute deposit value (18-dec) using oracle BEFORE moving tokens.
        uint256 value18 = _toValue(asset, assets, cfg);
        require(value18 > 0, "value=0");

        // 2. Daily limit in value terms
        _enforceDailyLimit(cfg, value18);

        // 3. Compute shares using ERC4626-style logic with totalAssets BEFORE deposit.
        uint256 supply = totalSupply();
        uint256 totalValueBefore = _totalAssetsInternal();

        if (supply == 0) {
            // 1:1 initial: 1 share = 1 unit of value
            shares = value18;
        } else {
            require(totalValueBefore > 0, "totalAssets=0");
            shares = (value18 * supply) / totalValueBefore;
        }
        require(shares > 0, "shares=0");

        // 4. Apply deposit fee in shares
        uint256 feeShares = (shares * depositFeeBps) / BPS;
        uint256 userShares = shares - feeShares;
        require(userShares > 0, "fee>shares");

        // 5. Pull tokens IN AFTER all math checks
        IERC20(asset).safeTransferFrom(msg.sender, address(this), assets);

        // 6. Mint shares
        _mint(receiver, userShares);
        _distributeFeeShares(feeShares);

        emit DepositAsset(msg.sender, receiver, asset, assets, userShares, feeShares);
        return userShares;
    }

    /**
     * @notice Withdraw underlying `assetOut` by burning `shares` from `owner`.
     * @param assetOut  Supported stablecoin to withdraw.
     * @param shares    Amount of vault shares to burn.
     * @param receiver  Receiver of tokens.
     * @param owner     Owner of the shares (must approve if != msg.sender).
     */
    function withdraw(
        address assetOut,
        uint256 shares,
        address receiver,
        address owner
    ) external nonReentrant whenNotPaused returns (uint256 assetsOut) {
        require(shares > 0, "shares=0");
        require(receiver != address(0), "receiver=0");
        require(owner != address(0), "owner=0");

        AssetConfig storage cfg = assetConfig[assetOut];
        require(cfg.isSupported, "asset not supported");

        uint256 supply = totalSupply();
        require(supply > 0, "supply=0");
        require(shares <= balanceOf(owner), "insufficient shares");

        if (msg.sender != owner) {
            _spendAllowance(owner, msg.sender, shares);
        }

        // Total vault value BEFORE burning
        uint256 totalValueBefore = _totalAssetsInternal();
        require(totalValueBefore > 0, "totalAssets=0");

        // 1. Compute fee in shares & net shares
        uint256 feeShares = (shares * withdrawFeeBps) / BPS;
        uint256 netShares = shares - feeShares;
        require(netShares > 0, "fee>shares");

        // 2. Compute value (18-dec) represented by netShares
        uint256 value18 = (netShares * totalValueBefore) / supply;
        require(value18 > 0, "value=0");

        // 3. Convert that value to amount of `assetOut` using oracle
        uint256 amountOut = _fromValue(assetOut, value18, cfg);
        require(amountOut > 0, "amountOut=0");

        // 4. Check liquidity
        require(IERC20(assetOut).balanceOf(address(this)) >= amountOut, "insufficient liquidity");

        // 5. Burn shares from owner
        _burn(owner, shares);

        // 6. Mint fee shares to treasury / riskFund
        _distributeFeeShares(feeShares);

        // 7. Transfer tokens out
        IERC20(assetOut).safeTransfer(receiver, amountOut);

        emit WithdrawAsset(msg.sender, receiver, assetOut, amountOut, shares, feeShares);
        return amountOut;
    }

    // --------------------------- Internal Helpers ---------------------------

    function _totalAssetsInternal() internal view returns (uint256 totalValue18) {
        uint256 len = supportedAssets.length;
        for (uint256 i = 0; i < len; ++i) {
            address asset = supportedAssets[i];
            AssetConfig storage cfg = assetConfig[asset];
            if (!cfg.isSupported) continue;

            uint256 bal = IERC20(asset).balanceOf(address(this));
            if (bal == 0) continue;

            uint256 value18 = _toValue(asset, bal, cfg);
            totalValue18 += value18;
        }
    }

    // Normalize token amount -> 18-dec value using oracle
    function _toValue(
        address asset,
        uint256 amount,
        AssetConfig storage cfg
    ) internal view returns (uint256) {
        require(cfg.isSupported, "asset not supported");
        require(amount > 0, "amount=0");

        uint256 price = _getOraclePrice(cfg); // price in oracleDecimals

        // Scale token amount up to 18 decimals
        uint256 scaled = amount * (10 ** (18 - cfg.tokenDecimals));
        // value18 = scaled * price / 10^oracleDecimals
        return (scaled * price) / (10 ** cfg.oracleDecimals);
    }

    // Convert 18-dec value back into token amount using oracle
    function _fromValue(
        address asset,
        uint256 value18,
        AssetConfig storage cfg
    ) internal view returns (uint256) {
        require(cfg.isSupported, "asset not supported");
        require(value18 > 0, "value=0");

        uint256 price = _getOraclePrice(cfg); // price in oracleDecimals

        // scaled = value18 * 10^oracleDecimals / price  (still 18-dec scale)
        uint256 scaled = (value18 * (10 ** cfg.oracleDecimals)) / price;

        // tokenAmount = scaled / 10^(18 - tokenDecimals)
        return scaled / (10 ** (18 - cfg.tokenDecimals));
    }

    function _getOraclePrice(AssetConfig storage cfg) internal view returns (uint256) {
        require(cfg.oracle != address(0), "oracle=0");

        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = AggregatorV3Interface(cfg.oracle).latestRoundData();

        require(answer > 0, "price<=0");
        require(updatedAt > 0, "round incomplete");
        require(block.timestamp - updatedAt <= maxOracleStaleness, "price stale");
        require(answeredInRound >= roundId, "stale round");

        uint8 dec = AggregatorV3Interface(cfg.oracle).decimals();
        require(dec == cfg.oracleDecimals, "oracle decimals changed");

        // Bound within configured peg band
        require(answer >= cfg.minPrice && answer <= cfg.maxPrice, "price out of bounds");

        return uint256(answer);
    }

    function _enforceDailyLimit(AssetConfig storage cfg, uint256 value18) internal {
        // Reset on new day
        if (block.timestamp >= cfg.lastResetTimestamp + SECONDS_PER_DAY) {
            cfg.dailyDeposited = 0;
            cfg.lastResetTimestamp = block.timestamp;
        }

        uint256 newTotal = cfg.dailyDeposited + value18;
        require(newTotal <= cfg.dailyDepositLimit, "daily limit exceeded");
        cfg.dailyDeposited = newTotal;
    }

    function _distributeFeeShares(uint256 feeShares) internal {
        if (feeShares == 0) return;
        if (treasury == address(0) && riskFund == address(0)) return;

        uint256 riskPortion = (feeShares * riskFundSplitBps) / BPS;
        uint256 treasuryPortion = feeShares - riskPortion;

        if (riskPortion > 0 && riskFund != address(0)) {
            _mint(riskFund, riskPortion);
        }
        if (treasuryPortion > 0 && treasury != address(0)) {
            _mint(treasury, treasuryPortion);
        }
    }
}
