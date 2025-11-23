// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/StreamingPayments.sol";
import "../src/LiquidityManager.sol";

contract DeployStreamingAndLiquidity is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address usdcAddress = 0x3600000000000000000000000000000000000000;

        // Deploy StreamingPayments
        StreamingPayments streamingPayments = new StreamingPayments(usdcAddress);
        console.log("StreamingPayments deployed at:", address(streamingPayments));

        // Deploy LiquidityManager
        // Target Ratio: 50% (5000 bps)
        // Rebalance Threshold: 5% (500 bps)
        LiquidityManager liquidityManager = new LiquidityManager(5000, 500);
        console.log("LiquidityManager deployed at:", address(liquidityManager));

        vm.stopBroadcast();
    }
}
