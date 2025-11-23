// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title StreamingPayments
 * @notice Continuous payment streaming with per-second calculations, milestone escrows, and subscriptions
 * @dev Enables payroll, subscriptions, and KPI-based payments with automatic renewal capabilities
 * @dev Now uses USDC ERC-20 token instead of native ETH for Circle prize compliance
 */
contract StreamingPayments {
    using SafeERC20 for IERC20;

    /// @notice Minimum stream rate per second (1 USDC base unit/second, 6 decimals)
    uint256 public constant MIN_RATE_PER_SECOND = 1;

    /// @notice Maximum stream duration (365 days)
    uint256 public constant MAX_DURATION = 365 days;

    /// @notice Maximum number of milestones per escrow
    uint256 public constant MAX_MILESTONES = 50;

    /// @notice USDC token contract (6 decimals)
    IERC20 public immutable usdc;

    /// @notice Contract owner
    address public owner;

    /// @notice Stream counter for unique IDs
    uint256 public streamCount;

    /// @notice Escrow counter for unique IDs
    uint256 public escrowCount;

    /// @notice Total number of active streams
    uint256 public activeStreamCount;

    /// @notice Total amount currently locked in streams
    uint256 public totalStreamedAmount;

    /// @notice Total amount currently locked in escrows
    uint256 public totalEscrowedAmount;

    /// @notice Emergency pause state
    bool public paused;

    /// @dev Payment stream structure
    struct Stream {
        address payer;
        address recipient;
        uint256 amountPerSecond;
        uint256 startTime;
        uint256 stopTime;
        uint256 withdrawn;
        bool active;
        bool subscription;
        uint256 renewalDuration;
    }

    /// @dev Milestone escrow structure
    struct Escrow {
        address payer;
        address recipient;
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 milestoneCount;
        mapping(uint256 => Milestone) milestones;
        bool active;
    }

    /// @dev Individual milestone within an escrow
    struct Milestone {
        uint256 amount;
        bool released;
        uint256 releaseTime;
    }

    /// @notice Mapping of stream ID to stream details
    mapping(uint256 => Stream) public streams;

    /// @notice Mapping of escrow ID to escrow details
    mapping(uint256 => Escrow) public escrows;

    /// @notice Mapping of recipient to their stream IDs
    mapping(address => uint256[]) public recipientStreams;

    /// @notice Mapping of payer to their stream IDs
    mapping(address => uint256[]) public payerStreams;

    // Events
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event StreamCreated(
        uint256 indexed streamId,
        address indexed payer,
        address indexed recipient,
        uint256 amountPerSecond,
        uint256 startTime,
        uint256 stopTime,
        bool subscription
    );
    event StreamWithdrawn(
        uint256 indexed streamId,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
    event StreamCancelled(
        uint256 indexed streamId,
        address indexed canceller,
        uint256 remainingAmount,
        uint256 timestamp
    );
    event StreamRenewed(
        uint256 indexed streamId,
        uint256 newStopTime,
        uint256 additionalAmount,
        uint256 timestamp
    );
    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed payer,
        address indexed recipient,
        uint256 totalAmount,
        uint256 milestoneCount
    );
    event MilestoneReleased(
        uint256 indexed escrowId,
        uint256 indexed milestoneIndex,
        uint256 amount,
        address indexed recipient
    );
    event EscrowCancelled(
        uint256 indexed escrowId,
        address indexed canceller,
        uint256 remainingAmount
    );
    event Deposited(address indexed depositor, uint256 amount);
    event EmergencyPaused(address indexed caller);
    event EmergencyUnpaused(address indexed caller);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "StreamingPayments: caller is not owner");
        _;
    }

    modifier streamExists(uint256 streamId) {
        require(streamId < streamCount, "StreamingPayments: stream does not exist");
        _;
    }

    modifier escrowExists(uint256 escrowId) {
        require(escrowId < escrowCount, "StreamingPayments: escrow does not exist");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "StreamingPayments: contract is paused");
        _;
    }

    modifier whenPaused() {
        require(paused, "StreamingPayments: contract is not paused");
        _;
    }

    /**
     * @notice Initialize the contract with USDC token address
     * @param _usdc Address of USDC token contract on Arc Testnet
     */
    constructor(address _usdc) {
        require(_usdc != address(0), "StreamingPayments: invalid USDC address");
        usdc = IERC20(_usdc);
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    /**
     * @notice Transfer ownership to a new address
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "StreamingPayments: new owner is zero address");
        require(newOwner != owner, "StreamingPayments: new owner is current owner");

        address previousOwner = owner;
        owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    /**
     * @notice Create a new payment stream
     * @param recipient Address to receive the streamed payments
     * @param amountPerSecond Amount to stream per second
     * @param duration Duration of the stream in seconds
     * @param subscription Whether the stream should auto-renew
     * @return streamId The ID of the created stream
     */
    function createStream(
        address recipient,
        uint256 amountPerSecond,
        uint256 duration,
        bool subscription
    ) external whenNotPaused returns (uint256) {
        require(recipient != address(0), "StreamingPayments: recipient is zero address");
        require(recipient != msg.sender, "StreamingPayments: cannot stream to self");
        require(
            amountPerSecond >= MIN_RATE_PER_SECOND,
            "StreamingPayments: rate below minimum"
        );
        require(duration > 0, "StreamingPayments: duration must be > 0");
        require(duration <= MAX_DURATION, "StreamingPayments: duration exceeds maximum");

        uint256 totalAmount = amountPerSecond * duration;

        // Transfer USDC from payer to contract
        usdc.safeTransferFrom(msg.sender, address(this), totalAmount);

        uint256 streamId = streamCount++;
        uint256 startTime = block.timestamp;
        uint256 stopTime = startTime + duration;

        streams[streamId] = Stream({
            payer: msg.sender,
            recipient: recipient,
            amountPerSecond: amountPerSecond,
            startTime: startTime,
            stopTime: stopTime,
            withdrawn: 0,
            active: true,
            subscription: subscription,
            renewalDuration: duration
        });

        recipientStreams[recipient].push(streamId);
        payerStreams[msg.sender].push(streamId);

        activeStreamCount++;
        totalStreamedAmount += totalAmount;

        emit StreamCreated(
            streamId,
            msg.sender,
            recipient,
            amountPerSecond,
            startTime,
            stopTime,
            subscription
        );

        return streamId;
    }

    /**
     * @notice Calculate available balance for a stream
     * @param streamId ID of the stream
     * @return Available amount that can be withdrawn
     */
    function balanceOf(uint256 streamId) public view streamExists(streamId) returns (uint256) {
        Stream storage stream = streams[streamId];

        if (!stream.active) {
            return 0;
        }

        uint256 elapsedTime;
        if (block.timestamp >= stream.stopTime) {
            elapsedTime = stream.stopTime - stream.startTime;
        } else {
            elapsedTime = block.timestamp - stream.startTime;
        }

        uint256 totalEarned = stream.amountPerSecond * elapsedTime;

        return totalEarned - stream.withdrawn;
    }

    /**
     * @notice Withdraw from a stream
     * @param streamId ID of the stream to withdraw from
     * @param amount Amount to withdraw (0 = withdraw all available)
     */
    function withdrawFromStream(uint256 streamId, uint256 amount)
        external
        streamExists(streamId)
    {
        Stream storage stream = streams[streamId];

        require(stream.active, "StreamingPayments: stream not active");
        require(
            msg.sender == stream.recipient,
            "StreamingPayments: caller is not recipient"
        );

        uint256 available = balanceOf(streamId);
        require(available > 0, "StreamingPayments: no funds available");

        uint256 withdrawAmount;
        if (amount == 0 || amount > available) {
            withdrawAmount = available;
        } else {
            withdrawAmount = amount;
        }

        stream.withdrawn += withdrawAmount;

        // Auto-renew subscription if stream ended
        if (block.timestamp >= stream.stopTime && stream.subscription) {
            _renewStream(streamId);
        }

        // Transfer USDC to recipient
        usdc.safeTransfer(stream.recipient, withdrawAmount);

        emit StreamWithdrawn(streamId, stream.recipient, withdrawAmount, block.timestamp);
    }

    /**
     * @notice Cancel a stream
     * @param streamId ID of the stream to cancel
     */
    function cancelStream(uint256 streamId) external streamExists(streamId) {
        Stream storage stream = streams[streamId];

        require(stream.active, "StreamingPayments: stream not active");
        require(
            msg.sender == stream.payer || msg.sender == stream.recipient,
            "StreamingPayments: caller not authorized"
        );

        uint256 recipientBalance = balanceOf(streamId);
        uint256 totalAmount = stream.amountPerSecond * (stream.stopTime - stream.startTime);
        uint256 payerBalance = totalAmount - stream.withdrawn - recipientBalance;

        stream.active = false;
        activeStreamCount--;
        totalStreamedAmount -= (totalAmount - stream.withdrawn);

        // Transfer USDC balances
        if (recipientBalance > 0) {
            usdc.safeTransfer(stream.recipient, recipientBalance);
        }

        if (payerBalance > 0) {
            usdc.safeTransfer(stream.payer, payerBalance);
        }

        emit StreamCancelled(streamId, msg.sender, payerBalance, block.timestamp);
    }

    /**
     * @notice Renew a subscription stream
     * @param streamId ID of the stream to renew
     */
    function renewStream(uint256 streamId) external streamExists(streamId) {
        Stream storage stream = streams[streamId];

        require(stream.subscription, "StreamingPayments: not a subscription");
        require(stream.active, "StreamingPayments: stream not active");
        require(msg.sender == stream.payer, "StreamingPayments: caller is not payer");

        uint256 additionalAmount = stream.amountPerSecond * stream.renewalDuration;

        // Transfer USDC from payer to contract
        usdc.safeTransferFrom(msg.sender, address(this), additionalAmount);

        stream.stopTime = stream.stopTime + stream.renewalDuration;
        totalStreamedAmount += additionalAmount;

        emit StreamRenewed(streamId, stream.stopTime, additionalAmount, block.timestamp);
    }

    /**
     * @dev Internal function to renew a stream
     * @param streamId ID of the stream to renew
     */
    function _renewStream(uint256 streamId) internal {
        Stream storage stream = streams[streamId];

        uint256 additionalAmount = stream.amountPerSecond * stream.renewalDuration;
        require(
            usdc.balanceOf(address(this)) >= additionalAmount,
            "StreamingPayments: insufficient contract balance for renewal"
        );

        stream.stopTime = stream.stopTime + stream.renewalDuration;
        totalStreamedAmount += additionalAmount;

        emit StreamRenewed(streamId, stream.stopTime, additionalAmount, block.timestamp);
    }

    /**
     * @notice Create a milestone-based escrow
     * @param recipient Address to receive milestone payments
     * @param milestoneAmounts Array of amounts for each milestone
     * @return escrowId The ID of the created escrow
     */
    function createMilestoneEscrow(address recipient, uint256[] memory milestoneAmounts)
        external
        whenNotPaused
        returns (uint256)
    {
        require(recipient != address(0), "StreamingPayments: recipient is zero address");
        require(recipient != msg.sender, "StreamingPayments: cannot escrow to self");
        require(milestoneAmounts.length > 0, "StreamingPayments: no milestones provided");
        require(
            milestoneAmounts.length <= MAX_MILESTONES,
            "StreamingPayments: too many milestones"
        );

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            require(milestoneAmounts[i] > 0, "StreamingPayments: milestone amount must be > 0");
            totalAmount += milestoneAmounts[i];
        }

        // Transfer USDC from payer to contract
        usdc.safeTransferFrom(msg.sender, address(this), totalAmount);

        uint256 escrowId = escrowCount++;
        Escrow storage escrow = escrows[escrowId];

        escrow.payer = msg.sender;
        escrow.recipient = recipient;
        escrow.totalAmount = totalAmount;
        escrow.releasedAmount = 0;
        escrow.milestoneCount = milestoneAmounts.length;
        escrow.active = true;

        for (uint256 i = 0; i < milestoneAmounts.length; i++) {
            escrow.milestones[i] = Milestone({
                amount: milestoneAmounts[i],
                released: false,
                releaseTime: 0
            });
        }

        totalEscrowedAmount += totalAmount;

        emit EscrowCreated(escrowId, msg.sender, recipient, totalAmount, milestoneAmounts.length);

        return escrowId;
    }

    /**
     * @notice Release a specific milestone
     * @param escrowId ID of the escrow
     * @param milestoneIndex Index of the milestone to release
     */
    function releaseMilestone(uint256 escrowId, uint256 milestoneIndex)
        external
        escrowExists(escrowId)
    {
        Escrow storage escrow = escrows[escrowId];

        require(escrow.active, "StreamingPayments: escrow not active");
        require(msg.sender == escrow.payer, "StreamingPayments: caller is not payer");
        require(
            milestoneIndex < escrow.milestoneCount,
            "StreamingPayments: invalid milestone index"
        );

        Milestone storage milestone = escrow.milestones[milestoneIndex];
        require(!milestone.released, "StreamingPayments: milestone already released");

        milestone.released = true;
        milestone.releaseTime = block.timestamp;
        escrow.releasedAmount += milestone.amount;
        totalEscrowedAmount -= milestone.amount;

        // Transfer USDC to recipient
        usdc.safeTransfer(escrow.recipient, milestone.amount);

        emit MilestoneReleased(escrowId, milestoneIndex, milestone.amount, escrow.recipient);

        // Mark escrow as inactive if all milestones released
        if (escrow.releasedAmount == escrow.totalAmount) {
            escrow.active = false;
        }
    }

    /**
     * @notice Cancel an escrow and refund unreleased funds
     * @param escrowId ID of the escrow to cancel
     */
    function cancelEscrow(uint256 escrowId) external escrowExists(escrowId) {
        Escrow storage escrow = escrows[escrowId];

        require(escrow.active, "StreamingPayments: escrow not active");
        require(msg.sender == escrow.payer, "StreamingPayments: caller is not payer");

        uint256 remainingAmount = escrow.totalAmount - escrow.releasedAmount;
        escrow.active = false;
        totalEscrowedAmount -= remainingAmount;

        if (remainingAmount > 0) {
            // Transfer USDC refund to payer
            usdc.safeTransfer(escrow.payer, remainingAmount);
        }

        emit EscrowCancelled(escrowId, msg.sender, remainingAmount);
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
     * @notice Get stream details
     * @param streamId ID of the stream
     * @return payer The stream payer
     * @return recipient The stream recipient
     * @return amountPerSecond The amount per second
     * @return startTime The start timestamp
     * @return stopTime The stop timestamp
     * @return withdrawn The amount withdrawn
     * @return active Whether the stream is active
     * @return subscription Whether it's a subscription
     * @return renewalDuration The renewal duration for subscriptions
     */
    function getStream(uint256 streamId)
        external
        view
        streamExists(streamId)
        returns (
            address payer,
            address recipient,
            uint256 amountPerSecond,
            uint256 startTime,
            uint256 stopTime,
            uint256 withdrawn,
            bool active,
            bool subscription,
            uint256 renewalDuration
        )
    {
        Stream storage stream = streams[streamId];
        return (
            stream.payer,
            stream.recipient,
            stream.amountPerSecond,
            stream.startTime,
            stream.stopTime,
            stream.withdrawn,
            stream.active,
            stream.subscription,
            stream.renewalDuration
        );
    }

    /**
     * @notice Get escrow details
     * @param escrowId ID of the escrow
     * @return payer The escrow payer
     * @return recipient The escrow recipient
     * @return totalAmount The total escrow amount
     * @return releasedAmount The amount already released
     * @return milestoneCount The number of milestones
     * @return active Whether the escrow is active
     */
    function getEscrow(uint256 escrowId)
        external
        view
        escrowExists(escrowId)
        returns (
            address payer,
            address recipient,
            uint256 totalAmount,
            uint256 releasedAmount,
            uint256 milestoneCount,
            bool active
        )
    {
        Escrow storage escrow = escrows[escrowId];
        return (
            escrow.payer,
            escrow.recipient,
            escrow.totalAmount,
            escrow.releasedAmount,
            escrow.milestoneCount,
            escrow.active
        );
    }

    /**
     * @notice Get milestone details
     * @param escrowId ID of the escrow
     * @param milestoneIndex Index of the milestone
     * @return amount The milestone amount
     * @return released Whether the milestone has been released
     * @return releaseTime The release timestamp (0 if not released)
     */
    function getMilestone(uint256 escrowId, uint256 milestoneIndex)
        external
        view
        escrowExists(escrowId)
        returns (
            uint256 amount,
            bool released,
            uint256 releaseTime
        )
    {
        require(
            milestoneIndex < escrows[escrowId].milestoneCount,
            "StreamingPayments: invalid milestone index"
        );

        Milestone storage milestone = escrows[escrowId].milestones[milestoneIndex];
        return (milestone.amount, milestone.released, milestone.releaseTime);
    }

    /**
     * @notice Get all stream IDs for a recipient
     * @param recipient The recipient address
     * @return Array of stream IDs
     */
    function getRecipientStreams(address recipient) external view returns (uint256[] memory) {
        return recipientStreams[recipient];
    }

    /**
     * @notice Get all stream IDs for a payer
     * @param payer The payer address
     * @return Array of stream IDs
     */
    function getPayerStreams(address payer) external view returns (uint256[] memory) {
        return payerStreams[payer];
    }

    /**
     * @notice Get contract USDC balance
     * @return Current contract USDC balance
     */
    function getContractBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
