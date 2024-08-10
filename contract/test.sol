// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

contract testing{
    uint public x;

    function setval(uint val)public {
        x = val;
    }
}