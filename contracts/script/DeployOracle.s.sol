// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockV3Aggregator.sol";

contract DeployOracle is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy Oracle with 8 decimals and initial price of 1.0 (100,000,000)
        MockV3Aggregator oracle = new MockV3Aggregator(8, 100000000);
        
        console.log("Mock Oracle Deployed at:", address(oracle));

        vm.stopBroadcast();
    }
}

