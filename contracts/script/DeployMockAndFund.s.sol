// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/StarcVaultV2.sol";
import "../src/MockStable.sol";

contract DeployMockAndFund is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address fundRecipient = 0xeFE5b15B606915D607959d21880769e9d269A99d;

        console.log("Deploying Mock USDC and Vault...");
        console.log("Deployer:", deployer);
        console.log("Recipient:", fundRecipient);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Mock USDC
        MockStable usdc = new MockStable("Mock USDC", "mUSDC", 6);
        console.log("Mock USDC Deployed at:", address(usdc));

        // 2. Mint to Recipient (1M USDC)
        usdc.mint(fundRecipient, 1_000_000 * 1e6);
        console.log("Minted 1,000,000 mUSDC to:", fundRecipient);

        // 3. Deploy Vault using Mock USDC
        StarcVaultV2 vault = new StarcVaultV2(
            IERC20(address(usdc)),
            "Starc USDC Vault",
            "sUSDC",
            deployer, // Admin
            deployer, // Treasury
            deployer  // Risk Fund
        );
        console.log("StarcVaultV2 Deployed at:", address(vault));

        vm.stopBroadcast();

        console.log("\n=== Update app/config/assets.ts ===");
        console.log("USDC Address:", address(usdc));
        console.log("Vault Address:", address(vault));
    }
}
