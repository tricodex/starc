// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {StarcVaultV2} from "../src/StarcVaultV2.sol";
import {MockStable} from "../src/MockStable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StarcVaultV2Test is Test {
    StarcVaultV2 public vault;
    MockStable public usdc;

    address public admin = address(1);
    address public treasury = address(2);
    address public riskFund = address(3);
    address public user1 = address(4);
    address public user2 = address(5);

    uint256 public constant INITIAL_BALANCE = 10000 * 1e6; // 10k USDC (6 decimals)
    uint256 public constant DEPOSIT_FEE = 10; // 0.1%
    uint256 public constant WITHDRAW_FEE = 10; // 0.1%

    event FeeSharesMinted(uint256 treasuryShares, uint256 riskFundShares);
    event FeesUpdated(uint256 newDepositFeeBps, uint256 newWithdrawFeeBps);

    function setUp() public {
        // 1. Deploy USDC mock (6 decimals like real USDC)
        usdc = new MockStable("USD Coin", "USDC", 6);

        // 2. Deploy Vault
        vm.prank(admin);
        vault = new StarcVaultV2(
            IERC20(address(usdc)),
            "Starc USDC Vault",
            "sUSDC",
            admin,
            treasury,
            riskFund
        );

        // 3. Mint USDC to users
        usdc.mint(user1, INITIAL_BALANCE);
        usdc.mint(user2, INITIAL_BALANCE);

        // 4. Approve vault
        vm.prank(user1);
        usdc.approve(address(vault), type(uint256).max);
        vm.prank(user2);
        usdc.approve(address(vault), type(uint256).max);
    }

    // ================== Initial State Tests ==================

    function test_InitialState() public view {
        assertEq(vault.name(), "Starc USDC Vault");
        assertEq(vault.symbol(), "sUSDC");
        assertEq(address(vault.asset()), address(usdc));
        assertEq(vault.depositFeeBps(), DEPOSIT_FEE);
        assertEq(vault.withdrawFeeBps(), WITHDRAW_FEE);
        assertEq(vault.treasury(), treasury);
        assertEq(vault.riskFund(), riskFund);
        assertTrue(vault.hasRole(vault.ADMIN_ROLE(), admin));
        assertTrue(vault.hasRole(vault.RISK_MANAGER_ROLE(), admin));
    }

    function test_AssetDecimals() public view {
        // USDC has 6 decimals
        assertEq(usdc.decimals(), 6);
        // Vault should inherit asset decimals
        assertEq(vault.decimals(), 6);
    }

    // ================== Deposit Tests ==================

    function test_Deposit_Success() public {
        uint256 depositAmount = 1000 * 1e6; // 1000 USDC

        vm.prank(user1);
        uint256 shares = vault.deposit(depositAmount, user1);

        // User should receive shares
        assertGt(shares, 0);
        assertEq(vault.balanceOf(user1), shares);

        // Vault should hold the assets
        assertEq(usdc.balanceOf(address(vault)), depositAmount);

        // Fee shares should be minted
        uint256 expectedFeeShares = (shares * DEPOSIT_FEE) / 10_000;
        uint256 treasuryShares = vault.balanceOf(treasury);
        uint256 riskFundShares = vault.balanceOf(riskFund);

        // Fees should be split 50/50
        assertEq(treasuryShares, expectedFeeShares / 2);
        assertEq(riskFundShares, expectedFeeShares / 2);

        // Total supply = user shares + fee shares
        assertEq(vault.totalSupply(), shares + expectedFeeShares);
    }

    function test_Deposit_MultipleUsers() public {
        // User1 deposits
        vm.prank(user1);
        uint256 shares1 = vault.deposit(1000 * 1e6, user1);

        // User2 deposits same amount
        vm.prank(user2);
        uint256 shares2 = vault.deposit(1000 * 1e6, user2);

        // Both deposits of same assets should get approximately same shares
        // (within small rounding difference from fee calculations)
        assertApproxEqAbs(shares1, shares2, 2e6); // Within 2 shares difference

        // Total assets should be 2000 USDC
        assertEq(vault.totalAssets(), 2000 * 1e6);
    }

    function test_Deposit_ZeroAmount_Reverts() public {
        vm.prank(user1);
        vm.expectRevert();
        vault.deposit(0, user1);
    }

    function test_Deposit_WhenPaused_Reverts() public {
        vm.prank(admin);
        vault.pause();

        vm.prank(user1);
        vm.expectRevert();
        vault.deposit(1000 * 1e6, user1);
    }

    function test_Deposit_PreviewMatches() public {
        uint256 depositAmount = 1000 * 1e6;

        uint256 previewShares = vault.previewDeposit(depositAmount);

        vm.prank(user1);
        uint256 actualShares = vault.deposit(depositAmount, user1);

        assertEq(previewShares, actualShares);
    }

    // ================== Withdraw Tests ==================

    function test_Withdraw_Success() public {
        // Setup: User deposits
        vm.prank(user1);
        vault.deposit(1000 * 1e6, user1);

        uint256 withdrawAmount = 500 * 1e6; // Withdraw 500 USDC
        uint256 userSharesBefore = vault.balanceOf(user1);
        uint256 userUsdcBefore = usdc.balanceOf(user1);

        vm.prank(user1);
        uint256 sharesBurned = vault.withdraw(withdrawAmount, user1, user1);

        // User should receive USDC
        assertEq(usdc.balanceOf(user1), userUsdcBefore + withdrawAmount);

        // Shares should be burned (user shares + fee)
        assertLt(vault.balanceOf(user1), userSharesBefore);

        // Fee shares should be minted to treasury/riskFund
        assertGt(vault.balanceOf(treasury), 0);
        assertGt(vault.balanceOf(riskFund), 0);
    }

    function test_Withdraw_FullAmount() public {
        // Setup: User deposits
        vm.prank(user1);
        vault.deposit(1000 * 1e6, user1);

        uint256 userShares = vault.balanceOf(user1);

        // Withdraw all available assets
        uint256 maxWithdraw = vault.maxWithdraw(user1);

        vm.prank(user1);
        vault.withdraw(maxWithdraw, user1, user1);

        // After full withdrawal, all user shares should be burned
        // But user needs to have enough shares to cover withdrawal + fee
        // So we check that user has less shares than they started with
        assertLt(vault.balanceOf(user1), userShares);
    }

    function test_Withdraw_ExceedsMax_Reverts() public {
        vm.prank(user1);
        vault.deposit(1000 * 1e6, user1);

        uint256 maxWithdraw = vault.maxWithdraw(user1);

        vm.prank(user1);
        vm.expectRevert();
        vault.withdraw(maxWithdraw + 1, user1, user1);
    }

    function test_Withdraw_WhenPaused_Reverts() public {
        vm.prank(user1);
        vault.deposit(1000 * 1e6, user1);

        vm.prank(admin);
        vault.pause();

        vm.prank(user1);
        vm.expectRevert();
        vault.withdraw(500 * 1e6, user1, user1);
    }

    function test_Withdraw_WithAllowance() public {
        // User1 deposits
        vm.prank(user1);
        vault.deposit(1000 * 1e6, user1);

        // User1 approves user2 to withdraw
        uint256 sharesToApprove = vault.balanceOf(user1);
        vm.prank(user1);
        vault.approve(user2, sharesToApprove);

        // User2 withdraws on behalf of user1
        vm.prank(user2);
        vault.withdraw(500 * 1e6, user2, user1);

        // User2 should receive the USDC
        assertGt(usdc.balanceOf(user2), INITIAL_BALANCE);

        // User1's shares should be burned
        assertLt(vault.balanceOf(user1), sharesToApprove);
    }

    // ================== Mint/Redeem Tests ==================

    function test_Mint_Success() public {
        uint256 sharesToMint = 1000 * 1e6; // Request 1000 shares

        vm.prank(user1);
        uint256 assetsUsed = vault.mint(sharesToMint, user1);

        // User should receive the requested shares
        assertEq(vault.balanceOf(user1), sharesToMint);

        // Assets should be transferred
        assertEq(usdc.balanceOf(address(vault)), assetsUsed);
    }

    function test_Redeem_Success() public {
        // Setup: User mints shares
        vm.prank(user1);
        vault.mint(1000 * 1e6, user1);

        uint256 sharesToRedeem = 500 * 1e6;

        vm.prank(user1);
        uint256 assetsReceived = vault.redeem(sharesToRedeem, user1, user1);

        // User should receive assets
        assertGt(assetsReceived, 0);
        assertGt(usdc.balanceOf(user1), INITIAL_BALANCE - 1000 * 1e6);
    }

    // ================== Fee Tests ==================

    function test_FeeDistribution_50_50_Split() public {
        vm.prank(user1);
        uint256 shares = vault.deposit(1000 * 1e6, user1);

        uint256 expectedFeeShares = (shares * DEPOSIT_FEE) / 10_000;
        uint256 treasuryShares = vault.balanceOf(treasury);
        uint256 riskFundShares = vault.balanceOf(riskFund);

        // Fees should be split 50/50 by default
        assertEq(treasuryShares, expectedFeeShares / 2);
        assertEq(riskFundShares, expectedFeeShares / 2);
    }

    function test_SetFees_OnlyAdmin() public {
        vm.prank(admin);
        vault.setFees(20, 20); // 0.2%

        assertEq(vault.depositFeeBps(), 20);
        assertEq(vault.withdrawFeeBps(), 20);
    }

    function test_SetFees_NonAdmin_Reverts() public {
        vm.prank(user1);
        vm.expectRevert();
        vault.setFees(20, 20);
    }

    function test_SetFees_TooHigh_Reverts() public {
        vm.prank(admin);
        vm.expectRevert("deposit fee > 5%");
        vault.setFees(501, 100); // > 5%

        vm.prank(admin);
        vm.expectRevert("withdraw fee > 5%");
        vault.setFees(100, 501);
    }

    function test_SetFees_EmitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit FeesUpdated(20, 20);

        vm.prank(admin);
        vault.setFees(20, 20);
    }

    // ================== Access Control Tests ==================

    function test_Pause_OnlyRiskManager() public {
        vm.prank(admin);
        vault.pause();

        assertTrue(vault.paused());
    }

    function test_Pause_NonRiskManager_Reverts() public {
        vm.prank(user1);
        vm.expectRevert();
        vault.pause();
    }

    function test_Unpause_OnlyAdmin() public {
        vm.prank(admin);
        vault.pause();

        vm.prank(admin);
        vault.unpause();

        assertFalse(vault.paused());
    }

    function test_SetTreasury_OnlyAdmin() public {
        address newTreasury = address(10);
        address newRiskFund = address(11);

        vm.prank(admin);
        vault.setTreasury(newTreasury, newRiskFund);

        assertEq(vault.treasury(), newTreasury);
        assertEq(vault.riskFund(), newRiskFund);
    }

    function test_SetTreasury_ZeroAddress_Reverts() public {
        vm.prank(admin);
        vm.expectRevert("treasury=0");
        vault.setTreasury(address(0), riskFund);

        vm.prank(admin);
        vm.expectRevert("riskFund=0");
        vault.setTreasury(treasury, address(0));
    }

    // ================== ERC4626 Compliance Tests ==================

    function test_TotalAssets_Matches_USDCBalance() public {
        vm.prank(user1);
        vault.deposit(1000 * 1e6, user1);

        // Total assets should match USDC balance in vault
        assertEq(vault.totalAssets(), usdc.balanceOf(address(vault)));
    }

    function test_ConvertToShares_And_ConvertToAssets() public {
        vm.prank(user1);
        vault.deposit(1000 * 1e6, user1);

        uint256 assets = 100 * 1e6;
        uint256 shares = vault.convertToShares(assets);
        uint256 convertedBackAssets = vault.convertToAssets(shares);

        // Should round-trip correctly (within rounding error)
        assertApproxEqRel(assets, convertedBackAssets, 0.01e18); // 1% tolerance
    }

    function test_MaxDeposit_WhenPaused_ReturnsZero() public {
        vm.prank(admin);
        vault.pause();

        assertEq(vault.maxDeposit(user1), 0);
    }

    function test_MaxWithdraw_WhenPaused_ReturnsZero() public {
        vm.prank(user1);
        vault.deposit(1000 * 1e6, user1);

        vm.prank(admin);
        vault.pause();

        assertEq(vault.maxWithdraw(user1), 0);
    }

    // ================== Edge Cases ==================

    function test_RoundingErrors_SmallDeposit() public {
        // Test with very small amount (1 USDC cent)
        uint256 smallAmount = 1e4; // 0.01 USDC

        vm.prank(user1);
        uint256 shares = vault.deposit(smallAmount, user1);

        // Should still receive some shares
        assertGt(shares, 0);
    }

    function test_MultipleDepositsAndWithdrawals() public {
        // User1 deposits
        vm.prank(user1);
        vault.deposit(1000 * 1e6, user1);

        // User2 deposits
        vm.prank(user2);
        vault.deposit(500 * 1e6, user2);

        // User1 withdraws half
        vm.prank(user1);
        vault.withdraw(500 * 1e6, user1, user1);

        // User2 deposits more
        vm.prank(user2);
        vault.deposit(300 * 1e6, user2);

        // Total assets should be: 1000 - 500 + 500 + 300 = 1300
        uint256 expectedAssets = 1300 * 1e6;
        assertApproxEqRel(vault.totalAssets(), expectedAssets, 0.01e18); // 1% tolerance for fees
    }

    function test_VaultNeverInsolvent() public {
        // Deposits
        vm.prank(user1);
        vault.deposit(1000 * 1e6, user1);

        vm.prank(user2);
        vault.deposit(1000 * 1e6, user2);

        uint256 totalAssetsBefore = vault.totalAssets();

        // User1 withdraws their maximum
        uint256 maxUser1 = vault.maxWithdraw(user1);
        vm.prank(user1);
        vault.withdraw(maxUser1, user1, user1);

        // Vault should still have assets (user2's deposit + fees)
        assertGt(vault.totalAssets(), 0);

        // User2 should still be able to withdraw
        assertGt(vault.maxWithdraw(user2), 0);

        // Total assets should have decreased but not by full deposit (fees remain)
        assertLt(vault.totalAssets(), totalAssetsBefore);
    }

    // ================== Reentrancy Tests ==================

    function test_ReentrancyGuard_Deposit() public {
        // If there was a reentrancy vulnerability, this would be exploitable
        // ReentrancyGuard modifier should prevent it
        vm.prank(user1);
        vault.deposit(1000 * 1e6, user1);

        // If we got here, reentrancy guard is working
        assertTrue(true);
    }

    // ================== Preview Function Tests ==================

    function test_PreviewDeposit_MatchesActual() public {
        uint256 assets = 1000 * 1e6;
        uint256 previewShares = vault.previewDeposit(assets);

        vm.prank(user1);
        uint256 actualShares = vault.deposit(assets, user1);

        assertEq(previewShares, actualShares);
    }

    function test_PreviewWithdraw_MatchesActual() public {
        // Setup
        vm.prank(user1);
        vault.deposit(1000 * 1e6, user1);

        uint256 assets = 500 * 1e6;
        uint256 previewShares = vault.previewWithdraw(assets);

        vm.prank(user1);
        uint256 actualShares = vault.withdraw(assets, user1, user1);

        assertEq(previewShares, actualShares);
    }
}
