// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    address public minter; // 화폐 주조자 라는 뜻이다.

    // Event
    event MinterChanged(address indexed from, address to);

    /**
     * @dev 토큰의 이름과 심볼을 ERC20 constructor를 이용해 등록하고, minter를 저장한다.
     *
     * 토큰의 이름, 심볼, minter 모두 변경할 수 없다. constructor는 단 한번만 실행된다.
     */
    constructor() payable ERC20("Decentralized Bank Token", "DEBT") {
        minter = msg.sender;  // deployer가 처음에는 minter로 등록된다.
    }

    /**
     * @dev 등록된 minter를 {newMinter}로 바꾸는 함수이다.
     * 토큰이 생성된 후 은행을 새로운 minter로 바꾼다.
     */
    function passMinterRole(address newMinter) public returns (bool) {
        // deployer만 이 함수를 실행할 수 있다. 
        require(
            msg.sender == minter,
            "Error, only owner can change pass minter role"
        );
        minter = newMinter;

        // Event를 발생시킨다.
        emit MinterChanged(msg.sender, newMinter);
        return true;
    }

    /**
     * @dev Token을 발행하는 함수
     */
    function mint(address account, uint256 amount) public {
        // minter만 이 함수를 실행할 수 있다.
        require(
            msg.sender == minter,
            "Error, msg.sender does not have minter role"
        ); 
        // ERC20에 정의되어 있다.
        _mint(account, amount);
    }
}
