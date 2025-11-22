// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {StarcUnifiedVault} from "../src/StarcUnifiedVault.sol";
import {MockStable} from "../src/MockStable.sol";
import {MockV3Aggregator} from "../src/MockV3Aggregator.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StarcUnifiedVaultTest is Test {
    StarcUnifiedVault public vault;
    MockStable public mARS;
    MockStable public nARS;
    MockV3Aggregator public oracle;

    address public admin = address(1);
    address public riskManager = address(1); // Admin is also risk manager in constructor
    address public treasury = address(2);
    address public riskFund = address(3);
    address public user1 = address(4);
    address public user2 = address(5);

    uint256 public constant INITIAL_BALANCE = 10000 * 1e18;

    function setUp() public {
        // 1. Deploy Mocks
        mARS = new MockStable("Mock ARS", "mARS", 18);
        nARS = new MockStable("Native ARS", "nARS", 18);
        oracle = new MockV3Aggregator(8, 100000000); // 1.00 * 1e8

        // 2. Deploy Vault
        vm.prank(admin);
        vault = new StarcUnifiedVault(
            "Unified ARS",
            "uARS",
            treasury,
            riskFund,
            admin
        );

        // 3. Setup Asset Config
        vm.startPrank(admin);
        // Add mARS: 18 decimals, oracle 8 decimals, limit 1M, price 0.95-1.05
        vault.addSupportedAsset(
            address(mARS),
            address(oracle),
            18,
            8,
            1_000_000 * 1e18, // Daily limit
            95000000,         // Min price 0.95
            105000000         // Max price 1.05
        );
        // Add nARS: same config
        vault.addSupportedAsset(
            address(nARS),
            address(oracle),
            18,
            8,
            1_000_000 * 1e18,
            95000000,
            105000000
        );
        vm.stopPrank();

        // 4. Mint tokens to users
        mARS.mint(user1, INITIAL_BALANCE);
        nARS.mint(user1, INITIAL_BALANCE);
        mARS.mint(user2, INITIAL_BALANCE);
        nARS.mint(user2, INITIAL_BALANCE);

        // 5. Approve vault
        vm.prank(user1);
        mARS.approve(address(vault), type(uint256).max);
        vm.prank(user1);
        nARS.approve(address(vault), type(uint256).max);
        vm.prank(user2);
        mARS.approve(address(vault), type(uint256).max);
    }

    function test_InitialState() public view {
        assertEq(vault.name(), "Unified ARS");
        assertEq(vault.symbol(), "uARS");
        assertEq(vault.hasRole(vault.ADMIN_ROLE(), admin), true);
    }

    function test_GuardedLaunch() public {
        // First deposit must be admin
        vm.prank(user1);
        vm.expectRevert("guarded: only admin can seed");
        vault.deposit(address(mARS), 100 * 1e18, user1);

        // Admin seeds
        mARS.mint(admin, 1000 * 1e18);
        vm.startPrank(admin);
        mARS.approve(address(vault), type(uint256).max);
        vault.deposit(address(mARS), 100 * 1e18, admin);
        vm.stopPrank();

        // Total supply should be equal to the value deposited (100 * 1e18)
        // because fees are minted as shares, so total shares = userShares + feeShares
        assertEq(vault.totalSupply(), 100 * 1e18);
    }

    function test_DepositAndWithdraw() public {
        // Seed first
        _seedVault();

        // User 1 deposits 1000 mARS
        vm.startPrank(user1);
        uint256 shares = vault.deposit(address(mARS), 1000 * 1e18, user1);
        vm.stopPrank();

        // Check shares (approx 1000 * 0.999)
        assertGt(shares, 0);
        assertEq(vault.balanceOf(user1), shares);

        // User 1 withdraws 500 shares to nARS (cross-asset)
        // Ensure vault has nARS liquidity (seed it)
        nARS.mint(address(vault), 1000 * 1e18); 

        vm.startPrank(user1);
        uint256 assetsOut = vault.withdraw(address(nARS), 500 * 1e18, user1, user1);
        vm.stopPrank();

        assertGt(assetsOut, 0);
        assertEq(nARS.balanceOf(user1), INITIAL_BALANCE + assetsOut);
    }

    function test_OracleBounds() public {
        _seedVault();

        // Set oracle price to 1.10 (above max 1.05)
        oracle.updateAnswer(110000000);

        vm.startPrank(user1);
        vm.expectRevert("price out of bounds");
        vault.deposit(address(mARS), 100 * 1e18, user1);
        vm.stopPrank();
    }

    function test_DailyLimit() public {
        _seedVault();

        // Limit is 1M. Deposit 1M + 1
        uint256 largeAmount = 1_000_001 * 1e18;
        mARS.mint(user1, largeAmount);
        
        vm.startPrank(user1);
        mARS.approve(address(vault), largeAmount);
        vm.expectRevert("daily limit exceeded");
        vault.deposit(address(mARS), largeAmount, user1);
        vm.stopPrank();
    }

    function test_FeeDistribution() public {
        _seedVault();
        
        uint256 treasuryBefore = vault.balanceOf(treasury);
        uint256 riskFundBefore = vault.balanceOf(riskFund);

        vm.prank(user1);
        vault.deposit(address(mARS), 1000 * 1e18, user1);

        // Fees are 10bps (0.1%) of 1000 = 1 share
        // Split 50/50
        assertGt(vault.balanceOf(treasury), treasuryBefore);
        assertGt(vault.balanceOf(riskFund), riskFundBefore);
    }

    function _seedVault() internal {
        mARS.mint(admin, 1000 * 1e18);
        vm.startPrank(admin);
        mARS.approve(address(vault), type(uint256).max);
        vault.deposit(address(mARS), 100 * 1e18, admin);
        vm.stopPrank();
    }
}
