// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/**
 * @title LiquidityManager
 * @notice Automated USDC/EURC liquidity management with rebalancing and optimization
 * @dev Manages dual stablecoin positions with slippage protection and automated strategies
 */
contract LiquidityManager {
    /// @notice Minimum liquidity amount (1 USDC/EURC with 6 decimals)
    uint256 public constant MIN_LIQUIDITY = 1_000_000;

    /// @notice Maximum liquidity per position (10M USDC/EURC with 6 decimals)
    uint256 public constant MAX_LIQUIDITY = 10_000_000_000_000;

    /// @notice Maximum slippage tolerance (10% = 1000 basis points)
    uint256 public constant MAX_SLIPPAGE_BPS = 1000;

    /// @notice Basis points denominator (100% = 10000)
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Target USDC ratio (50% = 5000 basis points)
    uint256 public targetUsdcRatio;

    /// @notice Rebalancing threshold (5% = 500 basis points)
    uint256 public rebalanceThreshold;

    /// @notice Contract owner
    address public owner;

    /// @notice Emergency pause state
    bool public paused;

    /// @notice Position counter for unique IDs
    uint256 public positionCount;

    /// @notice Total USDC liquidity provided
    uint256 public totalUsdcLiquidity;

    /// @notice Total EURC liquidity provided
    uint256 public totalEurcLiquidity;

    /// @notice Authorized strategy managers
    mapping(address => bool) public strategyManagers;

    /// @notice Total number of strategy managers
    uint256 public managerCount;

    /// @dev Liquidity position structure
    struct Position {
        address provider;
        uint256 usdcAmount;
        uint256 eurcAmount;
        uint256 timestamp;
        bool active;
        uint256 rewards;
    }

    /// @dev Trade execution structure
    struct Trade {
        address initiator;
        bool usdcToEurc;
        uint256 amountIn;
        uint256 amountOut;
        uint256 timestamp;
        uint256 slippageBps;
    }

    /// @notice Mapping of position ID to position details
    mapping(uint256 => Position) public positions;

    /// @notice Mapping of provider address to their position IDs
    mapping(address => uint256[]) public providerPositions;

    /// @notice Trade history counter
    uint256 public tradeCount;

    /// @notice Mapping of trade ID to trade details
    mapping(uint256 => Trade) public trades;

    // Events
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event StrategyManagerAdded(address indexed manager);
    event StrategyManagerRemoved(address indexed manager);
    event TargetRatioUpdated(uint256 oldRatio, uint256 newRatio);
    event RebalanceThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event LiquidityProvided(
        uint256 indexed positionId,
        address indexed provider,
        uint256 usdcAmount,
        uint256 eurcAmount
    );
    event LiquidityWithdrawn(
        uint256 indexed positionId,
        address indexed provider,
        uint256 usdcAmount,
        uint256 eurcAmount
    );
    event TradeExecuted(
        uint256 indexed tradeId,
        address indexed initiator,
        bool usdcToEurc,
        uint256 amountIn,
        uint256 amountOut,
        uint256 slippageBps
    );
    event PositionRebalanced(
        uint256 indexed positionId,
        uint256 newUsdcAmount,
        uint256 newEurcAmount
    );
    event RewardsDistributed(uint256 indexed positionId, uint256 amount);
    event Deposited(address indexed depositor, uint256 amount);
    event EmergencyPaused(address indexed caller);
    event EmergencyUnpaused(address indexed caller);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "LiquidityManager: caller is not owner");
        _;
    }

    modifier onlyStrategyManager() {
        require(strategyManagers[msg.sender], "LiquidityManager: caller is not strategy manager");
        _;
    }

    modifier onlyOwnerOrManager() {
        require(
            msg.sender == owner || strategyManagers[msg.sender],
            "LiquidityManager: caller is not owner or manager"
        );
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "LiquidityManager: contract is paused");
        _;
    }

    modifier whenPaused() {
        require(paused, "LiquidityManager: contract is not paused");
        _;
    }

    /**
     * @notice Initialize the liquidity manager
     * @param _targetUsdcRatio Target USDC ratio in basis points (5000 = 50%)
     * @param _rebalanceThreshold Rebalancing threshold in basis points (500 = 5%)
     */
    constructor(uint256 _targetUsdcRatio, uint256 _rebalanceThreshold) {
        require(_targetUsdcRatio <= BPS_DENOMINATOR, "LiquidityManager: invalid target ratio");
        require(
            _rebalanceThreshold <= MAX_SLIPPAGE_BPS,
            "LiquidityManager: invalid rebalance threshold"
        );

        owner = msg.sender;
        targetUsdcRatio = _targetUsdcRatio;
        rebalanceThreshold = _rebalanceThreshold;

        emit OwnershipTransferred(address(0), msg.sender);
        emit TargetRatioUpdated(0, _targetUsdcRatio);
        emit RebalanceThresholdUpdated(0, _rebalanceThreshold);
    }

    /**
     * @notice Receive ETH deposits
     */
    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Transfer ownership to a new address
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "LiquidityManager: new owner is zero address");
        require(newOwner != owner, "LiquidityManager: new owner is current owner");

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    /**
     * @notice Add a new strategy manager
     * @param manager Address to grant strategy manager role
     */
    function addStrategyManager(address manager) external onlyOwner {
        require(manager != address(0), "LiquidityManager: manager is zero address");
        require(!strategyManagers[manager], "LiquidityManager: already a manager");

        strategyManagers[manager] = true;
        managerCount++;

        emit StrategyManagerAdded(manager);
    }

    /**
     * @notice Remove a strategy manager
     * @param manager Address to revoke strategy manager role
     */
    function removeStrategyManager(address manager) external onlyOwner {
        require(strategyManagers[manager], "LiquidityManager: not a manager");

        strategyManagers[manager] = false;
        managerCount--;

        emit StrategyManagerRemoved(manager);
    }

    /**
     * @notice Update the target USDC ratio
     * @param newRatio New target ratio in basis points
     */
    function updateTargetRatio(uint256 newRatio) external onlyOwner {
        require(newRatio <= BPS_DENOMINATOR, "LiquidityManager: invalid ratio");
        require(newRatio != targetUsdcRatio, "LiquidityManager: ratio unchanged");

        uint256 oldRatio = targetUsdcRatio;
        targetUsdcRatio = newRatio;

        emit TargetRatioUpdated(oldRatio, newRatio);
    }

    /**
     * @notice Update the rebalancing threshold
     * @param newThreshold New threshold in basis points
     */
    function updateRebalanceThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold <= MAX_SLIPPAGE_BPS, "LiquidityManager: invalid threshold");
        require(newThreshold != rebalanceThreshold, "LiquidityManager: threshold unchanged");

        uint256 oldThreshold = rebalanceThreshold;
        rebalanceThreshold = newThreshold;

        emit RebalanceThresholdUpdated(oldThreshold, newThreshold);
    }

    /**
     * @notice Provide liquidity to the pool
     * @param usdcAmount Amount of USDC to provide
     * @param eurcAmount Amount of EURC to provide
     * @return positionId The ID of the created position
     */
    function provideLiquidity(uint256 usdcAmount, uint256 eurcAmount)
        external
        whenNotPaused
        returns (uint256)
    {
        require(
            usdcAmount >= MIN_LIQUIDITY || eurcAmount >= MIN_LIQUIDITY,
            "LiquidityManager: amount below minimum"
        );
        require(
            usdcAmount <= MAX_LIQUIDITY && eurcAmount <= MAX_LIQUIDITY,
            "LiquidityManager: amount exceeds maximum"
        );
        require(usdcAmount > 0 || eurcAmount > 0, "LiquidityManager: zero liquidity");

        uint256 positionId = positionCount++;

        positions[positionId] = Position({
            provider: msg.sender,
            usdcAmount: usdcAmount,
            eurcAmount: eurcAmount,
            timestamp: block.timestamp,
            active: true,
            rewards: 0
        });

        providerPositions[msg.sender].push(positionId);

        totalUsdcLiquidity += usdcAmount;
        totalEurcLiquidity += eurcAmount;

        emit LiquidityProvided(positionId, msg.sender, usdcAmount, eurcAmount);

        return positionId;
    }

    /**
     * @notice Withdraw liquidity from a position
     * @param positionId ID of the position to withdraw
     */
    function withdrawLiquidity(uint256 positionId) external whenNotPaused {
        require(positionId < positionCount, "LiquidityManager: position does not exist");

        Position storage position = positions[positionId];
        require(position.active, "LiquidityManager: position not active");
        require(position.provider == msg.sender, "LiquidityManager: not position provider");

        uint256 usdcAmount = position.usdcAmount;
        uint256 eurcAmount = position.eurcAmount;

        position.active = false;
        totalUsdcLiquidity -= usdcAmount;
        totalEurcLiquidity -= eurcAmount;

        emit LiquidityWithdrawn(positionId, msg.sender, usdcAmount, eurcAmount);
    }

    /**
     * @notice Execute a trade between USDC and EURC
     * @param usdcToEurc Direction of trade (true = USDC to EURC, false = EURC to USDC)
     * @param amountIn Amount of input token
     * @param minAmountOut Minimum amount of output token (slippage protection)
     * @return amountOut Actual amount of output token received
     */
    function executeTrade(
        bool usdcToEurc,
        uint256 amountIn,
        uint256 minAmountOut
    ) external onlyOwnerOrManager whenNotPaused returns (uint256) {
        require(amountIn >= MIN_LIQUIDITY, "LiquidityManager: amount below minimum");
        require(minAmountOut > 0, "LiquidityManager: min output must be > 0");

        // Simplified constant product formula (would integrate with actual DEX in production)
        uint256 amountOut = calculateSwapOutput(amountIn, usdcToEurc);

        require(amountOut >= minAmountOut, "LiquidityManager: slippage too high");

        uint256 slippageBps = calculateSlippage(amountIn, amountOut);
        require(slippageBps <= MAX_SLIPPAGE_BPS, "LiquidityManager: slippage exceeds maximum");

        uint256 tradeId = tradeCount++;
        trades[tradeId] = Trade({
            initiator: msg.sender,
            usdcToEurc: usdcToEurc,
            amountIn: amountIn,
            amountOut: amountOut,
            timestamp: block.timestamp,
            slippageBps: slippageBps
        });

        // Update liquidity pools
        if (usdcToEurc) {
            totalUsdcLiquidity += amountIn;
            totalEurcLiquidity -= amountOut;
        } else {
            totalEurcLiquidity += amountIn;
            totalUsdcLiquidity -= amountOut;
        }

        emit TradeExecuted(tradeId, msg.sender, usdcToEurc, amountIn, amountOut, slippageBps);

        return amountOut;
    }

    /**
     * @notice Rebalance a position to match target ratio
     * @param positionId ID of the position to rebalance
     */
    function rebalancePosition(uint256 positionId) external onlyOwnerOrManager whenNotPaused {
        require(positionId < positionCount, "LiquidityManager: position does not exist");

        Position storage position = positions[positionId];
        require(position.active, "LiquidityManager: position not active");

        uint256 totalValue = position.usdcAmount + position.eurcAmount;
        require(totalValue > 0, "LiquidityManager: empty position");

        uint256 currentRatio = (position.usdcAmount * BPS_DENOMINATOR) / totalValue;
        uint256 deviation = currentRatio > targetUsdcRatio
            ? currentRatio - targetUsdcRatio
            : targetUsdcRatio - currentRatio;

        require(deviation >= rebalanceThreshold, "LiquidityManager: within threshold");

        uint256 targetUsdcAmount = (totalValue * targetUsdcRatio) / BPS_DENOMINATOR;
        uint256 targetEurcAmount = totalValue - targetUsdcAmount;

        position.usdcAmount = targetUsdcAmount;
        position.eurcAmount = targetEurcAmount;

        emit PositionRebalanced(positionId, targetUsdcAmount, targetEurcAmount);
    }

    /**
     * @notice Distribute rewards to a position
     * @param positionId ID of the position
     * @param rewardAmount Amount of rewards to distribute
     */
    function distributeRewards(uint256 positionId, uint256 rewardAmount)
        external
        onlyOwnerOrManager
    {
        require(positionId < positionCount, "LiquidityManager: position does not exist");
        require(rewardAmount > 0, "LiquidityManager: reward must be > 0");

        Position storage position = positions[positionId];
        require(position.active, "LiquidityManager: position not active");

        position.rewards += rewardAmount;

        emit RewardsDistributed(positionId, rewardAmount);
    }

    /**
     * @notice Emergency pause mechanism
     * @dev Can only be called by owner
     */
    function pause() external onlyOwner whenNotPaused {
        paused = true;
        emit EmergencyPaused(msg.sender);
    }

    /**
     * @notice Unpause the contract
     * @dev Can only be called by owner
     */
    function unpause() external onlyOwner whenPaused {
        paused = false;
        emit EmergencyUnpaused(msg.sender);
    }

    /**
     * @notice Calculate swap output amount (simplified constant product)
     * @param amountIn Input amount
     * @param usdcToEurc Direction of swap
     * @return Output amount
     */
    function calculateSwapOutput(uint256 amountIn, bool usdcToEurc)
        public
        view
        returns (uint256)
    {
        if (usdcToEurc) {
            require(totalEurcLiquidity > 0, "LiquidityManager: insufficient EURC liquidity");
            // Simplified: 1:1 swap minus 0.3% fee
            return (amountIn * 997) / 1000;
        } else {
            require(totalUsdcLiquidity > 0, "LiquidityManager: insufficient USDC liquidity");
            // Simplified: 1:1 swap minus 0.3% fee
            return (amountIn * 997) / 1000;
        }
    }

    /**
     * @notice Calculate slippage in basis points
     * @param amountIn Input amount
     * @param amountOut Output amount
     * @return Slippage in basis points
     */
    function calculateSlippage(uint256 amountIn, uint256 amountOut)
        public
        pure
        returns (uint256)
    {
        if (amountIn == 0) return 0;

        uint256 expectedOut = amountIn;
        if (amountOut >= expectedOut) return 0;

        uint256 difference = expectedOut - amountOut;
        return (difference * BPS_DENOMINATOR) / expectedOut;
    }

    /**
     * @notice Get current USDC ratio
     * @return Current USDC ratio in basis points
     */
    function getCurrentRatio() public view returns (uint256) {
        uint256 totalLiquidity = totalUsdcLiquidity + totalEurcLiquidity;
        if (totalLiquidity == 0) return 0;

        return (totalUsdcLiquidity * BPS_DENOMINATOR) / totalLiquidity;
    }

    /**
     * @notice Check if rebalancing is needed
     * @return Whether rebalancing is needed
     */
    function needsRebalancing() public view returns (bool) {
        uint256 currentRatio = getCurrentRatio();
        uint256 deviation = currentRatio > targetUsdcRatio
            ? currentRatio - targetUsdcRatio
            : targetUsdcRatio - currentRatio;

        return deviation >= rebalanceThreshold;
    }

    /**
     * @notice Get position details
     * @param positionId ID of the position
     * @return provider Position provider
     * @return usdcAmount USDC amount in position
     * @return eurcAmount EURC amount in position
     * @return timestamp Position creation timestamp
     * @return active Whether position is active
     * @return rewards Accumulated rewards
     */
    function getPosition(uint256 positionId)
        external
        view
        returns (
            address provider,
            uint256 usdcAmount,
            uint256 eurcAmount,
            uint256 timestamp,
            bool active,
            uint256 rewards
        )
    {
        require(positionId < positionCount, "LiquidityManager: position does not exist");
        Position storage position = positions[positionId];

        return (
            position.provider,
            position.usdcAmount,
            position.eurcAmount,
            position.timestamp,
            position.active,
            position.rewards
        );
    }

    /**
     * @notice Get trade details
     * @param tradeId ID of the trade
     * @return initiator Trade initiator
     * @return usdcToEurc Direction of trade
     * @return amountIn Input amount
     * @return amountOut Output amount
     * @return timestamp Trade timestamp
     * @return slippageBps Slippage in basis points
     */
    function getTrade(uint256 tradeId)
        external
        view
        returns (
            address initiator,
            bool usdcToEurc,
            uint256 amountIn,
            uint256 amountOut,
            uint256 timestamp,
            uint256 slippageBps
        )
    {
        require(tradeId < tradeCount, "LiquidityManager: trade does not exist");
        Trade storage trade = trades[tradeId];

        return (
            trade.initiator,
            trade.usdcToEurc,
            trade.amountIn,
            trade.amountOut,
            trade.timestamp,
            trade.slippageBps
        );
    }

    /**
     * @notice Get all position IDs for a provider
     * @param provider Provider address
     * @return Array of position IDs
     */
    function getProviderPositions(address provider) external view returns (uint256[] memory) {
        return providerPositions[provider];
    }

    /**
     * @notice Get total liquidity value
     * @return Total combined USDC and EURC liquidity
     */
    function getTotalLiquidity() external view returns (uint256) {
        return totalUsdcLiquidity + totalEurcLiquidity;
    }
}
