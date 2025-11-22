// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MockStable.sol";

contract FundMockARS is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address fundRecipient = 0xeFE5b15B606915D607959d21880769e9d269A99d;

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Mock ARS Tokens
        MockStable mARS = new MockStable("Mock ARS", "mARS", 18);
        MockStable nARS = new MockStable("Native ARS", "nARS", 18);
        MockStable wARS = new MockStable("Wrapped ARS", "wARS", 18);
        MockStable dARS = new MockStable("Digital ARS", "dARS", 18);
        MockStable bARS = new MockStable("Bank ARS", "bARS", 18);

        // Mint to Recipient
        uint256 amount = 1_000_000 * 1e18;
        mARS.mint(fundRecipient, amount);
        nARS.mint(fundRecipient, amount);
        wARS.mint(fundRecipient, amount);
        dARS.mint(fundRecipient, amount);
        bARS.mint(fundRecipient, amount);

        vm.stopBroadcast();

        console.log("=== Mock ARS Deployment & Funding Complete ===");
        console.log("Recipient:", fundRecipient);
        console.log("mARS:", address(mARS));
        console.log("nARS:", address(nARS));
        console.log("wARS:", address(wARS));
        console.log("dARS:", address(dARS));
        console.log("bARS:", address(bARS));
    }
}
