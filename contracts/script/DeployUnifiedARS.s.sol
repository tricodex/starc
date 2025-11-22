// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/StarcUnifiedVault.sol";
import "../src/MockStable.sol";
import "../src/MockV3Aggregator.sol";

contract DeployUnifiedARS is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Mocks
        MockStable mARS = new MockStable("Mock ARS", "mARS", 18);
        MockStable nARS = new MockStable("Native ARS", "nARS", 18);
        MockStable wARS = new MockStable("Wrapped ARS", "wARS", 18);
        MockStable dARS = new MockStable("Digital ARS", "dARS", 18);
        MockStable bARS = new MockStable("Bank ARS", "bARS", 18);

        // 2. Deploy Oracle (Price: 0.001 USD, Decimals: 8)
        MockV3Aggregator oracle = new MockV3Aggregator(8, 100000); // 0.001 * 1e8

        // 3. Deploy Vault
        StarcUnifiedVault vault = new StarcUnifiedVault(
            "Unified ARS", 
            "uARS", 
            deployer, // Treasury
            deployer, // Risk Fund
            deployer  // Admin
        );

        // 4. Add Supported Assets
        // Daily Limit: 1M USD (1M * 1000 ARS/USD = 1B ARS) -> 1B * 1e18
        // But limit is in Value18 (USD). So 1M * 1e18.
        uint256 dailyLimit = 1_000_000 * 1e18;
        int256 minPrice = 95000; // -5%
        int256 maxPrice = 105000; // +5%

        vault.addSupportedAsset(address(mARS), address(oracle), 18, 8, dailyLimit, minPrice, maxPrice);
        vault.addSupportedAsset(address(nARS), address(oracle), 18, 8, dailyLimit, minPrice, maxPrice);
        vault.addSupportedAsset(address(wARS), address(oracle), 18, 8, dailyLimit, minPrice, maxPrice);
        vault.addSupportedAsset(address(dARS), address(oracle), 18, 8, dailyLimit, minPrice, maxPrice);
        vault.addSupportedAsset(address(bARS), address(oracle), 18, 8, dailyLimit, minPrice, maxPrice);

        // 5. Mint tokens to test user (deployer)
        // Already minted in constructor of MockStable

        vm.stopBroadcast();

        console.log("Vault deployed at:", address(vault));
        console.log("mARS deployed at:", address(mARS));
    }
}
