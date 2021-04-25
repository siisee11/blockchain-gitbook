// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Token.sol";

contract DeBank {
    Token private token;

    // user{address}의 예금 시점{uint}을 저장하는 mapping
    mapping(address => uint) public depositStart;
    // user{address}의 잔액{uint}을 저장하는 mapping
    mapping(address => uint) public etherBalanceOf;
    mapping(address => uint) public collateralEther;
    // user{address}가 예금을 했는 지{bool}를 저장하는 mapping
    mapping(address => bool) public isDeposited;
    mapping(address => bool) public isBorrowed;

    // Event는 frontend와 소통하기 위해 사용된다.
    event Deposit(address indexed user, uint etherAmount, uint timeStart);
    event Withdraw(address indexed user, uint etherAmount, uint depositTime, uint interest);
    event Borrow(address indexed user, uint collateralEtherAmount, uint borrowedTokenAmount);
    event PayOff(address indexed user, uint fee);

    // Token contract의 주소를 받아 내부 private 변수에 저장한다.
    constructor(Token _token) {
        token = _token;
    }

    /**
     * @dev Eth를 받아 예금한다. 
     */
    function deposit() payable public {
        // 예금 중인 사람은 더 예금할 수 없다. (이자 관리 어려움 때문에)
        require(isDeposited[msg.sender] == false, 'Error, deposit already active');
        // 예치 최소 금액을 확인한다. msg.value는 함수가 받은 ETH량이 저장되어있다.
        require(msg.value>=1e16, 'Error, deposit must be >= 0.01 ETH');

        etherBalanceOf[msg.sender] = etherBalanceOf[msg.sender] + msg.value;
        // deposit한 시점 저장
        depositStart[msg.sender] = depositStart[msg.sender] + block.timestamp;
        isDeposited[msg.sender] = true; 

        // Event 발생
        emit Deposit(msg.sender, msg.value, block.timestamp);
    }

    function withdraw() public {
        // 예금하고 있는 지 확인
        require(isDeposited[msg.sender]==true, 'Error, no previous deposit');
        uint userBalance = etherBalanceOf[msg.sender]; //for event

        // 예금 기간 확인 (초 단위)
        uint depositTime = block.timestamp - depositStart[msg.sender];

        // 이자 계산 (10% APY(Annual Percentage Yield) 기준, 자세한 계산 생략)
        uint interestPerSecond = 31668017 * (etherBalanceOf[msg.sender] / 1e16);
        uint interest = interestPerSecond * depositTime;

        // ETH를 돌려준다.
        payable(msg.sender).transfer(etherBalanceOf[msg.sender]); //eth back to user

        // 유저에게 이자만큼의 토큰을 발행해준다.
        token.mint(msg.sender, interest); //interest to user

        // 초기화
        depositStart[msg.sender] = 0;
        etherBalanceOf[msg.sender] = 0;
        isDeposited[msg.sender] = false;

        // 이벤트 발생
        emit Withdraw(msg.sender, userBalance, depositTime, interest);
    }


    function borrow() payable public {
        require(msg.value>=1e16, 'Error, collateral must be >= 0.01 ETH');
        require(isBorrowed[msg.sender] == false, 'Error, loan already taken');

        //this Ether will be locked till user payOff the loan
        collateralEther[msg.sender] = collateralEther[msg.sender] + msg.value;

        //calc tokens amount to mint, 50% of msg.value
        uint tokensToMint = collateralEther[msg.sender] / 2;

        //mint&send tokens to user
        token.mint(msg.sender, tokensToMint);

        //activate borrower's loan status
        isBorrowed[msg.sender] = true;

        emit Borrow(msg.sender, collateralEther[msg.sender], tokensToMint);
    }

    function payOff() public {
        require(isBorrowed[msg.sender] == true, 'Error, loan not active');
        require(token.transferFrom(msg.sender, address(this), collateralEther[msg.sender]/2), "Error, can't receive tokens"); //must approve dBank 1st

        uint fee = collateralEther[msg.sender]/10; //calc 10% fee

        //send user's collateral minus fee
        payable(msg.sender).transfer(collateralEther[msg.sender]-fee);

        //reset borrower's data
        collateralEther[msg.sender] = 0;
        isBorrowed[msg.sender] = false;

        emit PayOff(msg.sender, fee);
    }
}
