// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

interface AggregatorV3Interface {
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
    function decimals() external view returns (uint8);
}

contract StarcUnifiedVault is ERC20, AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RISK_MANAGER_ROLE = keccak256("RISK_MANAGER_ROLE");
    uint256 public constant BPS = 10_000;
    uint256 public constant SECONDS_PER_DAY = 1 days;

    struct AssetConfig {
        bool isSupported;
        address oracle;
        uint8 tokenDecimals;
        uint8 oracleDecimals;
        uint256 dailyDepositLimit;
        uint256 dailyDeposited;
        uint256 lastResetTimestamp;
        int256 minPrice;
        int256 maxPrice;
    }

    mapping(address => AssetConfig) public assetConfig;
    address[] public supportedAssets;

    uint256 public depositFeeBps = 10;
    uint256 public withdrawFeeBps = 10;
    address public treasury;
    address public riskFund;
    uint256 public riskFundSplitBps = 5_000;
    uint256 public maxOracleStaleness = 24 hours;

    event AssetAdded(address indexed asset, address indexed oracle, uint256 dailyLimit);
    event DepositAsset(address indexed caller, address indexed asset, uint256 assetsIn, uint256 shares);
    event WithdrawAsset(address indexed caller, address indexed assetOut, uint256 assetsOut, uint256 shares);

    constructor(string memory _name, string memory _symbol, address _treasury, address _riskFund, address _admin) ERC20(_name, _symbol) {
        treasury = _treasury;
        riskFund = _riskFund;
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(RISK_MANAGER_ROLE, _admin);
    }

    function addSupportedAsset(
        address _asset, address _oracle, uint8 _tokenDecimals, uint8 _oracleDecimals,
        uint256 _dailyLimitValue18, int256 _minPrice, int256 _maxPrice
    ) external onlyRole(ADMIN_ROLE) {
        AssetConfig storage cfg = assetConfig[_asset];
        if (!cfg.isSupported) supportedAssets.push(_asset);
        cfg.isSupported = true;
        cfg.oracle = _oracle;
        cfg.tokenDecimals = _tokenDecimals;
        cfg.oracleDecimals = _oracleDecimals;
        cfg.dailyDepositLimit = _dailyLimitValue18;
        cfg.minPrice = _minPrice;
        cfg.maxPrice = _maxPrice;
        if (cfg.lastResetTimestamp == 0) cfg.lastResetTimestamp = block.timestamp;
        emit AssetAdded(_asset, _oracle, _dailyLimitValue18);
    }

    function totalAssets() public view returns (uint256 totalValue18) {
        for (uint256 i = 0; i < supportedAssets.length; ++i) {
            address asset = supportedAssets[i];
            AssetConfig storage cfg = assetConfig[asset];
            if (!cfg.isSupported) continue;
            uint256 bal = IERC20(asset).balanceOf(address(this));
            if (bal == 0) continue;
            totalValue18 += _toValue(asset, bal, cfg);
        }
    }

    function deposit(address asset, uint256 assets) external nonReentrant whenNotPaused returns (uint256 shares) {
        require(assets > 0, "assets=0");
        AssetConfig storage cfg = assetConfig[asset];
        require(cfg.isSupported, "unsupported");

        uint256 value18 = _toValue(asset, assets, cfg);
        _enforceDailyLimit(cfg, value18);

        uint256 supply = totalSupply();
        uint256 totalValueBefore = totalAssets();

        if (supply == 0) shares = value18;
        else shares = (value18 * supply) / totalValueBefore;
        
        require(shares > 0, "shares=0");

        uint256 feeShares = (shares * depositFeeBps) / BPS;
        uint256 userShares = shares - feeShares;

        IERC20(asset).safeTransferFrom(msg.sender, address(this), assets);
        _mint(msg.sender, userShares);
        _distributeFeeShares(feeShares);
        emit DepositAsset(msg.sender, asset, assets, userShares);
    }

    function withdraw(address assetOut, uint256 shares) external nonReentrant whenNotPaused returns (uint256 assetsOut) {
        require(shares > 0, "shares=0");
        AssetConfig storage cfg = assetConfig[assetOut];
        require(cfg.isSupported, "unsupported");

        uint256 supply = totalSupply();
        uint256 totalValueBefore = totalAssets();
        
        uint256 feeShares = (shares * withdrawFeeBps) / BPS;
        uint256 netShares = shares - feeShares;
        
        uint256 value18 = (netShares * totalValueBefore) / supply;
        uint256 amountOut = _fromValue(assetOut, value18, cfg);
        
        require(IERC20(assetOut).balanceOf(address(this)) >= amountOut, "liquidity");

        _burn(msg.sender, shares);
        _distributeFeeShares(feeShares);
        IERC20(assetOut).safeTransfer(msg.sender, amountOut);
        emit WithdrawAsset(msg.sender, assetOut, amountOut, shares);
    }

    function _toValue(address, uint256 amount, AssetConfig storage cfg) internal view returns (uint256) {
        uint256 price = _getOraclePrice(cfg);
        uint256 scaled = amount * (10 ** (18 - cfg.tokenDecimals));
        return (scaled * price) / (10 ** cfg.oracleDecimals);
    }

    function _fromValue(address, uint256 value18, AssetConfig storage cfg) internal view returns (uint256) {
        uint256 price = _getOraclePrice(cfg);
        uint256 scaled = (value18 * (10 ** cfg.oracleDecimals)) / price;
        return scaled / (10 ** (18 - cfg.tokenDecimals));
    }

    function _getOraclePrice(AssetConfig storage cfg) internal view returns (uint256) {
        (, int256 answer,,,) = AggregatorV3Interface(cfg.oracle).latestRoundData();
        require(answer >= cfg.minPrice && answer <= cfg.maxPrice, "peg breach");
        return uint256(answer);
    }

    function _enforceDailyLimit(AssetConfig storage cfg, uint256 value18) internal {
        if (block.timestamp >= cfg.lastResetTimestamp + SECONDS_PER_DAY) {
            cfg.dailyDeposited = 0;
            cfg.lastResetTimestamp = block.timestamp;
        }
        cfg.dailyDeposited += value18;
        require(cfg.dailyDeposited <= cfg.dailyDepositLimit, "limit");
    }

    function _distributeFeeShares(uint256 feeShares) internal {
        if (feeShares == 0) return;
        uint256 risk = (feeShares * riskFundSplitBps) / BPS;
        if (risk > 0) _mint(riskFund, risk);
        if (feeShares - risk > 0) _mint(treasury, feeShares - risk);
    }
}
