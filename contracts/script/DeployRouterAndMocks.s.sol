// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/StarcRouter.sol";
import "../src/StarcVaultV2.sol";
import "../src/MockStable.sol";

contract DeployRouterAndMocks is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Mock Tokens (ARS Ecosystem)
        MockStable mARS = new MockStable("Mock ARS", "mARS", 18);
        MockStable nARS = new MockStable("Native ARS", "nARS", 18);
        MockStable wARS = new MockStable("Wrapped ARS", "wARS", 18);

        console.log("mARS deployed at:", address(mARS));
        console.log("nARS deployed at:", address(nARS));
        console.log("wARS deployed at:", address(wARS));

        // 2. Deploy ARS Vault (Base: mARS)
        StarcVaultV2 arsVault = new StarcVaultV2(
            IERC20(address(mARS)),
            "Starc ARS Vault",
            "uARS", // Shares symbol
            deployer,
            deployer,
            deployer
        );
        console.log("ARS Vault (uARS) deployed at:", address(arsVault));

        // 3. Deploy Router
        StarcRouter router = new StarcRouter();
        console.log("StarcRouter deployed at:", address(router));
        
        // 4. Fund Router with some ARS liquidity (optional, since mint works)
        // mARS.mint(address(router), 1_000_000 * 1e18);

        vm.stopBroadcast();
    }
}

