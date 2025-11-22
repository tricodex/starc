// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/StarcVaultV2.sol";
import "../src/MockStable.sol";

/**
 * @title DeployVaultV2
 * @notice Deployment script for StarcVaultV2 (ERC4626 Single-Asset Vault)
 *
 * Usage:
 *   Deploy to testnet:
 *   forge script script/DeployVaultV2.s.sol:DeployVaultV2 --rpc-url <RPC_URL> --broadcast --verify
 *
 *   Deploy locally (Anvil):
 *   forge script script/DeployVaultV2.s.sol:DeployVaultV2
 */
contract DeployVaultV2 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying StarcVaultV2...");
        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // For Arc Testnet: Use Native USDC Precompile
        address usdcAddress = 0x3600000000000000000000000000000000000000;
        IERC20 usdc = IERC20(usdcAddress);
        console.log("Using Native USDC at:", address(usdc));

        // Deploy Vault
        StarcVaultV2 vault = new StarcVaultV2(
            usdc,
            "Starc USDC Vault",
            "sUSDC",
            deployer, // Admin
            deployer, // Treasury (change for production)
            deployer  // Risk Fund (change for production)
        );

        console.log("StarcVaultV2 deployed at:", address(vault));
        console.log("Asset (USDC):", address(usdc));
        console.log("Admin:", deployer);
        console.log("Treasury:", deployer);
        console.log("Risk Fund:", deployer);
        console.log("Deposit Fee:", vault.depositFeeBps(), "bps (0.1%)");
        console.log("Withdraw Fee:", vault.withdrawFeeBps(), "bps (0.1%)");

        // Cannot mint Native USDC (must use faucet or bridge)
        // usdc.mint(deployer, 10_000 * 1e6); 
        
        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("Vault:", address(vault));
        console.log("USDC:", address(usdc));
        console.log("Update app/config/assets.ts with these addresses");
    }
}
