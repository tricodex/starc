// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockStable is ERC20 {
    uint8 private _decimals;
    constructor(string memory n, string memory s, uint8 d) ERC20(n, s) {
        _decimals = d;
        _mint(msg.sender, 1_000_000_000 * 10**d);
    }
    function decimals() public view override returns (uint8) { return _decimals; }
    function mint(address to, uint256 amount) public { _mint(to, amount); }
}
