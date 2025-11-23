// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IMockMintable {
    function mint(address to, uint256 amount) external;
}

contract StarcRouter {
    using SafeERC20 for IERC20;

    event PaymentRouted(
        address indexed tokenIn,
        uint256 amountIn,
        address indexed vault,
        address indexed merchant,
        uint256 sharesOut
    );

    /**
     * @notice Pays a merchant by converting tokenIn to the vault's asset and depositing.
     * @param tokenIn The token the user is paying with.
     * @param amountIn The amount of tokenIn to pay.
     * @param vault The StarcVaultV2 (ERC4626) to deposit into.
     * @param merchant The merchant receiving the shares.
     */
    function pay(
        address tokenIn,
        uint256 amountIn,
        address vault,
        address merchant
    ) external returns (uint256 shares) {
        require(amountIn > 0, "Zero amount");
        
        // Transfer tokenIn from user to Router
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        IERC4626 vaultContract = IERC4626(vault);
        address baseAsset = vaultContract.asset();
        uint256 amountToDeposit = amountIn;

        // If tokens are different, we need to "swap"
        if (tokenIn != baseAsset) {
            // 1. Calculate amount based on decimals
            uint8 decimalsIn = IERC20Metadata(tokenIn).decimals();
            uint8 decimalsBase = IERC20Metadata(baseAsset).decimals();

            if (decimalsIn != decimalsBase) {
                if (decimalsBase > decimalsIn) {
                    amountToDeposit = amountIn * (10 ** (decimalsBase - decimalsIn));
                } else {
                    amountToDeposit = amountIn / (10 ** (decimalsIn - decimalsBase));
                }
            }

            // 2. "Swap" execution
            // Try to mint. If fail (e.g. Real USDC), check balance.
            try IMockMintable(baseAsset).mint(address(this), amountToDeposit) {
                // Minted successfully
            } catch {
                // Could not mint. Check if we have enough balance
                uint256 balance = IERC20(baseAsset).balanceOf(address(this));
                require(balance >= amountToDeposit, "Router: Insufficient liquidity for swap");
            }
        }

        // Approve vault to spend baseAsset
        IERC20(baseAsset).forceApprove(vault, amountToDeposit);

        // Deposit into Vault
        // merchant receives shares
        shares = vaultContract.deposit(amountToDeposit, merchant);

        emit PaymentRouted(tokenIn, amountIn, vault, merchant, shares);
    }
}

