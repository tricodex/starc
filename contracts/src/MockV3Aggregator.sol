// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockV3Aggregator {
    uint8 public decimals;
    int256 public latestAnswer;
    constructor(uint8 _d, int256 _a) { decimals = _d; latestAnswer = _a; }
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (1, latestAnswer, block.timestamp, block.timestamp, 1);
    }
}
