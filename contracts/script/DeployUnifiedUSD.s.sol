// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/StarcUnifiedVault.sol";
import "../src/MockStable.sol";
import "../src/MockV3Aggregator.sol";

contract DeployUnifiedUSD is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Mocks
        MockStable mUSD = new MockStable("Mock USD", "mUSD", 18);
        MockStable nUSD = new MockStable("Native USD", "nUSD", 18);
        MockStable wUSD = new MockStable("Wrapped USD", "wUSD", 18);

        // 2. Deploy Oracle (Price: 1.00 USD, Decimals: 8)
        MockV3Aggregator oracle = new MockV3Aggregator(8, 100000000); // 1.00 * 1e8

        // 3. Deploy Vault
        StarcUnifiedVault vault = new StarcUnifiedVault(
            "Unified USD", 
            "uUSD", 
            deployer, // Treasury
            deployer, // Risk Fund
            deployer  // Admin
        );

        // 4. Add Supported Assets
        uint256 dailyLimit = 1_000_000 * 1e18;
        int256 minPrice = 95000000; // -5%
        int256 maxPrice = 105000000; // +5%

        // Native USDC (Arc Testnet)
        address nativeUSDC = 0x3600000000000000000000000000000000000000;
        // Note: We can't mint Native USDC, but we can add it to the vault.
        // Assuming 6 decimals for USDC
        vault.addSupportedAsset(nativeUSDC, address(oracle), 6, 8, dailyLimit, minPrice, maxPrice);

        vault.addSupportedAsset(address(mUSD), address(oracle), 18, 8, dailyLimit, minPrice, maxPrice);
        vault.addSupportedAsset(address(nUSD), address(oracle), 18, 8, dailyLimit, minPrice, maxPrice);
        vault.addSupportedAsset(address(wUSD), address(oracle), 18, 8, dailyLimit, minPrice, maxPrice);

        vm.stopBroadcast();

        console.log("Vault deployed at:", address(vault));
    }
}
