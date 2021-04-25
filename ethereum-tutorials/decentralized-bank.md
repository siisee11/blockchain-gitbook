---
description: 탈중앙화된 은행 시스템 만들기
---

# Build Decentralized Bank

## Decentralized Bank System

본 실습은 dapp university의 [https://www.youtube.com/watch?v=xWFba\_9QYmc](https://www.youtube.com/watch?v=xWFba_9QYmc) 영상을 참고해서 작성하였다. 해당 영상은 코드 작성 위주라 자세한 내용이 빠져있는데, 이 문서에서는 조금 더 자세히 다루도록 한다.

{% hint style="warning" %}
이 문서는 solidity와 React 문법에 대해 알고 있다는 가정으로 작성되었습니다. 몰라도 따라할 수 는 있습니다.
{% endhint %}

### 구현 할 것

* [ ] Solidity언어로 smart contract \(보상 토큰, 은행 업무\) 구현
* [ ] Javascript + Chai로 contract test 구현
* [ ] React로 프론트엔드 구현

### 준비

* truffle 설치 

```
$ npm install --g truffle@5.1.39
```

* Ganache 설치

{% embed url="https://www.trufflesuite.com/ganache" %}

### 참고 문서

Web3: [https://web3js.readthedocs.io/en/v1.3.4/](https://web3js.readthedocs.io/en/v1.3.4/)  
Truffle:  [https://www.trufflesuite.com/docs/truffle/overview](https://www.trufflesuite.com/docs/truffle/overview)  
Ganache: [https://www.trufflesuite.com/ganache](https://www.trufflesuite.com/ganache) 

## Environment Setting & Token Contract

### Step \#1

작업 디렉토리를 만들고 truffle init을 수행한다.  

```bash
mkdir deBank && cd deBank && truffle init
```

{% hint style="info" %}
 Truffle은 개발자들이 편하게 smart contract를 개발할 수 있도록 도와주는 프레임워크이다. 
{% endhint %}

세개의 디렉토리와 truffle-config.js 파일이 생성된다.

* contract/ : smart contract 코드인 .sol\(solidity\)파일이 위치하는 곳
* migration/ : migration을 위한 javascript 코드가 위치하는 곳
* test/ : smart contract를 테스트하기 위한 javascript 혹은 solidity 코드가 위치하는 곳
* truffle-config.js : truffle 관련 설정하는 파일

각각에 대한 자세한 내용은 [Truffle 문서](../ethereum-development-tools/truffle.md)를 참고하자. 

먼저 `truffle-config.js` 파일을 열어서 다음 부분을 uncomment하고 수정한다.

```bash
  networks: {
    development: {
     host: "127.0.0.1",     // Localhost (default: none)
     port: 8545,            // Standard Ethereum port (default: none)
     network_id: "*",       // Any network (default: none)
    },
    
  ...
  
  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.0",    // Fetch exact version from solc-bin (default: truffle's version)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
       optimizer: {
         enabled: false,
         runs: 200
       },
      }
    },
  },
```

### Step \#2 토큰 컨트랙트 생성

은행에서 이자로 배포할 토큰은 ERC20 규약을 따르도록 할 것이다. Openzeppelin 라이브러리를 이용해서 이를 처리하도록 한다. 이에 대한 문서는 아래 링크에 있다.

{% embed url="https://docs.openzeppelin.com/contracts/4.x/" %}

먼저 openzeppelin library를 설치한다. 해당 라이브러리에는 ERC20토큰에 대한 인터페이스가 정의되어 있다. 이를 import하여 상속받아 사용할 것이다.

```bash
npm install @openzeppelin/contracts
```

새로 생성할 토큰에 대한 solidity 파일을 contract/ 밑에 생성하고\(contract/Token.sol\) 아래 내용을 입력한다.

```bash
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
```

Solidity 개발 관습에 맞게 주석을 달아 두었다. 토큰을 위한 코드는 생각보다 간단하다. 이제 truffle로 해당 코드를 컴파일해보자. `truffle-config.js` 에 따로 설정하지 않았다면 컴파일 결과물은 `build/contracts` 에 생성된다.

```bash
truffle compile
```

### Step \#3 Test our token contract

Token 컨트랙트가 컴파일 되었으니, 문제 없이 동작하는 지 테스트해보도록 한다. 컨트랙트는 한번 배포되면 수정할 수 없으니 다른 프로그래밍에 비해 test과정이 특히 중요하다.

Truffle의 test과정에서 Ganache를 이용하는 것이 좋다. Ganache는 이더리움 로컬 네트워크를 생성하고 100ETH를 가진 10개의 account를 제공해준다.

![Ganache](../.gitbook/assets/image%20%2843%29.png)

Test를 진행할 때 사용할 수 있는 여러 assertion module이 있는 데, 이 중 CryptoZombies 튜토리얼에서 쓰였던 chai를 이용할 것 이다. chai는 아래와 같이 다운로드할 수 있다.

```bash
npm install chai
npm i chai-as-promised
```

이제 `test/` 폴더에 `test.js` 파일과 `helpers/time.js helpers/utils.js` 를 생성한다.

먼저 `test.js` 파일에 아래 내용을 입력한다. 설명은 주석을 참고하자.

```bash
const Token = artifacts.require('./Token')
const utils = require("./helpers/utils");
const time = require("./helpers/time");

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('DeBank', ([deployer, user]) => {
  let token
  const interestPerSecond = 31668017 //(10% APY) for min. deposit (0.01 ETH)

  // beforEach hook은 테스트 전에 매번 실행되는 함수이다.
  beforeEach(async () => {
    token = await Token.new()
  })

  // context는 testing group 같은 느낌
  context('testing token contract...', () => {
    context('success', () => {
        // it은 테스트 최소 단위이다.
        it('checking token name', async () => {
            // 아래와 같이 글로 읽히는 assertion module이 chai
            expect(await token.name()).to.be.eq('Decentralized Bank Token')
        })

        it('checking token symbol', async () => {
            expect(await token.symbol()).to.be.eq('DEBT')
        })

        it('checking token initial total supply', async () => {
            expect(Number(await token.totalSupply())).to.eq(0)
        })

        // xit은 실행되지 않고 pending된다. 아직 DeBank를 구현 안했으니 패스
        xit('DeBank should have Token minter role', async () => {
            // ...
        })
    })

    // xcontext도 역시 pending된다.
    xcontext('failure', () => {
      it('passing minter role should be rejected', async () => {
          // ...
      })

      it('tokens minting should be rejected', async () => {
          // ...
      })
    })
  })

  xcontext('testing deposit...', () => {
      // ...
  })

  xcontext('testing withdraw...', () => {

  })

  xcontext('testing borrow...', () => {

  })

  xcontext('testing payOff...', () => {

  })
})
```

다음은 `utils.js` 파일이다. 자주 사용하는 기능을 따로 구현한 것이다.

```bash
const ETHER_ADDRESS = '0x0000000000000000000000000000000000000000'
const EVM_REVERT = 'VM Exception while processing transaction: revert'

const ether = n => {
  return new web3.utils.BN(
    web3.utils.toWei(n.toString(), 'ether')
  )
}

// Same as ether
const tokens = n => ether(n)

const wait = s => {
  const milliseconds = s * 1000
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

module.exports = {
  ETHER_ADDRESS,
  EVM_REVERT,
  tokens,
  wait,
};

```

Truffle로 테스트를 수행한다. 자동으로 `test/` 에 있는 코드를 실행하여 테스트한다.

```bash
truffle test
```

### Step \#4 Token migration

컴파일된 토큰 컨트랙트를 Ganache가 만들어준 로컬 네트워크에 deploy하자. 이를 migration이라고 한다.

`migrations/` 폴더에 1로 시작하는 js파일이 있다. Truffle에서 기본 템플릿으로 제공하는 거라 사실 뭔지 자게하게 모르겠다. `migrations/` 폴더의 파일은 숫자 prefixed 파일명을 사용해야 하는데, Truffle이 이 숫자 순서대로 실행시키기 때문이다. Token을 배포하기 위한 `2_deploy.js` 파일을 생성하고 아래 내용을 붙혀넣는다.

```bash
// Compile 결과물인 json 객체를 가져온다.
const Token = artifacts.require("Token");

module.exports = async function(deployer) {
	// Deploy token
	await deployer.deploy(Token)

  // Token 객체를 token에 저장한다.
	const token = await Token.deployed()
};
```

Ganache가 동작하고 있는지 확인하고 아래 커맨드를 입력한다.

```bash
truffle migrate
```

성공적으로 수행되면 2개의 deployment가 수행되었다고 출력된다.

```bash
Summary
=======
> Total deployments:   2
> Final cost:          0.0348687 ETH 
```

## Decentralized Bank\(DeBank\) Contract

### Step \#5 DeBank Contract 작

이제 예금, 출금, 대출, 상환 등의 기능을 가진 DeBank contract에 대해 코드를 작성할 것이다. 우선 컨트랙트의 기본 뼈대부터 입력한다. 

```bash
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Token.sol";

contract DeBank {
    Token private token;

    // Token contract의 주소를 받아 내부 private 변수에 저장한다.
    constructor(Token _token) {
        token = _token;
    }

    function deposit() payable public {
    }

    function withdraw() public {
    }

    function borrow() payable public {
    }

    function payOff() public {
    }
}
```

위 코드에서 payable 제어자\(modifier\)는 함수가 ETH를 받을 수 있게 한다. 즉, payable 제어자가 붙은 함수를 실행할 때 ETH를 동봉해서 실행할 수 있다. 

Deposit함수를 작성하자. 아래 내용을 알맞은 위치에 붙혀넣는다.

```bash
contract DeBank {
    Token private token;
    
    // user{address}의 예금 시점{uint}을 저장하는 mapping
    mapping(address => uint) public depositStart;
    // user{address}의 잔액{uint}을 저장하는 mapping
    mapping(address => uint) public etherBalanceOf;
    // user{address}가 예금을 했는 지{bool}를 저장하는 mapping
    mapping(address => bool) public isDeposited;

    // Event는 frontend와 소통하기 위해 사용된다.
    event Deposit(address indexed user, uint etherAmount, uint timeStart);

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
```

Withdraw 함수도 아래와 같이 작성한다. \(역시 주석 참고\)

```bash
    event Withdraw(address indexed user, uint etherAmount, uint depositTime, uint interest);
    
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
```

{% hint style="info" %}
block.timestamp와 now는 같다. \(now 가 block.timestamp의 alias\) now는 deprecated이므로 block.timestamp를 사용하자.
{% endhint %}

### Step \#6 DeBank Testing

Test 파일은 로직만 잘 작성하면 되므로 자세한 설명은 생략하고 한번 읽어 보길 바란다. 전체 코드는 아래와 같다.

```bash
const Token = artifacts.require('./Token')
const DecentralizedBank = artifacts.require('./DeBank')
const utils = require("./helpers/utils");
const time = require("./helpers/time");

require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('DeBank', ([deployer, user]) => {
  let token, deBank;
  const interestPerSecond = 31668017 //(10% APY) for min. deposit (0.01 ETH)

  // beforEach hook은 테스트 전에 매번 실행되는 함수이다.
  beforeEach(async () => {
    token = await Token.new()
    // token.address를 넘겨주어 DecentralizedBank 생성
    deBank = await DecentralizedBank.new(token.address)
    // token의 발행권을 deBank로 넘겨준다.
    await token.passMinterRole(deBank.address, {from: deployer})
  })

  // context는 testing group 같은 느낌
  context('testing token contract...', () => {
    context('success', () => {
        // it은 테스트 최소 단위이다.
        it('checking token name', async () => {
            // 아래와 같이 글로 읽히는 assertion module이 chai
            expect(await token.name()).to.be.eq('Decentralized Bank Token')
        })

        it('checking token symbol', async () => {
            expect(await token.symbol()).to.be.eq('DEBT')
        })

        it('checking token initial total supply', async () => {
            expect(Number(await token.totalSupply())).to.eq(0)
        })

        it('DeBank should have Token minter role', async () => {
            // minter를 deBank로 넘겼으므로 minter가 deBank여야 한다.
            expect(await token.minter()).to.eq(deBank.address)
        })
    })

    context('failure', () => {
        it('passing minter role should be rejected', async () => {
            // 현재 minter{deBank}만이 passMinterRole을 실행할 수 있다.    
            await token.passMinterRole(user, {from: deployer}).should.be.rejectedWith(utils.EVM_REVERT)
        })

        it('tokens minting should be rejected', async () => {
            // 현재 minter{deBank}만이 mint를 실행할 수 있다.    
            await token.mint(user, '1', {from: deployer}).should.be.rejectedWith(utils.EVM_REVERT) //unauthorized minter
        })
    })
  })

  context('testing deposit...', () => {
    let balance

    context('success', () => {
      beforeEach(async () => {
        await deBank.deposit({value: 10**16, from: user}) //0.01 ETH
      })

      it('balance should increase', async () => {
        expect(Number(await deBank.etherBalanceOf(user))).to.eq(10**16)
      })

      it('deposit time should > 0', async () => {
        expect(Number(await deBank.depositStart(user))).to.be.above(0)
      })

      it('deposit status should eq true', async () => {
        expect(await deBank.isDeposited(user)).to.eq(true)
      })
    })

    context('failure', () => {
      it('depositing should be rejected', async () => {
        await deBank.deposit({value: 10**15, from: user}).should.be.rejectedWith(utils.EVM_REVERT) //to small amount
      })
    })
  })

  context('testing withdraw...', () => {
    let balance

    context('success', () => {

      beforeEach(async () => {
        await deBank.deposit({value: 10**16, from: user}) //0.01 ETH

        await utils.wait(2) //accruing interest

        balance = await web3.eth.getBalance(user)
        await deBank.withdraw({from: user})
      })

      it('balances should decrease', async () => {
        expect(Number(await web3.eth.getBalance(deBank.address))).to.eq(0)
        expect(Number(await deBank.etherBalanceOf(user))).to.eq(0)
      })

      it('user should receive ether back', async () => {
        expect(Number(await web3.eth.getBalance(user))).to.be.above(Number(balance))
      })

      it('user should receive proper amount of interest', async () => {
        //time synchronization problem make us check the 1-3s range for 2s deposit time
        balance = Number(await token.balanceOf(user))
        expect(balance).to.be.above(0)
        expect(balance%interestPerSecond).to.eq(0)
        expect(balance).to.be.below(interestPerSecond*4)
      })

      it('depositer data should be reseted', async () => {
        expect(Number(await deBank.depositStart(user))).to.eq(0)
        expect(Number(await deBank.etherBalanceOf(user))).to.eq(0)
        expect(await deBank.isDeposited(user)).to.eq(false)
      })
    })

    context('failure', () => {
      it('withdrawing should be rejected', async () =>{
        await deBank.deposit({value: 10**16, from: user}) //0.01 ETH
        await utils.wait(2) //accruing interest
        await deBank.withdraw({from: deployer}).should.be.rejectedWith(utils.EVM_REVERT) //wrong user
      })
    })
  })

  xcontext('testing borrow...', () => {

  })

  xcontext('testing payOff...', () => {

  })
})
```

Truffle로 테스트를 진행한다.

```bash
truffle test
```

###  Step \#7 Deploy DeBank

Deploy 코드를 업데이트한다. `2_deploy.js` 파일을 업데이트한다.

```bash
// Compile 결과물인 json 객체를 가져온다.
const Token = artifacts.require("Token");
const DeBank = artifacts.require("DeBank");

module.exports = async function(deployer) {
	// Deploy token
	await deployer.deploy(Token)

	// Token의 객체를 token에 담는다.
	const token = await Token.deployed()

  // token의 주소를 넣어 deBank를 deploy한다.
	await deployer.deploy(DeBank, token.address)
	const deBank = await DeBank.deployed()

  // token의 passMinterRole 함수를 불러서 {minter}를 deBank로 바꾼다.
	await token.passMinterRole(deBank.address)
};
```

다시 처음상태부터 migrate하기 위해 --reset 옵션을 추가한다.

```bash
truffle migrate --reset
```

## Frontend 구현

### Step \#8 Create React App

백엔드로 사용할 블록체인 구현이 완료되었으니 \(DeBank의 borrow, payOff는 추후에 추가 구현\) 이제 React를 이용해서 프론트엔드 구현한다. 프로젝트 루트 디렉토리에서 아래 커맨드를 입력하여 react 환경을 구성한다.

```bash
npx create-react-app client
```

client 디렉토리로 이동해서 실행해본다.

```bash
cd client && yarn start
```

### Step \#9 Install dependency & Metamask

필요한 모듈을 설치한다.

```bash
npm install react-bootstrap bootstrap web3
```

브라우저에서 web3 어플리케이션을 사용하기 위해 Metamask 확장 프로그램 설치가 필요하다.  

![Metamask](../.gitbook/assets/image%20%2848%29.png)

확장 프로그램을 설치하면 브라우저 오른쪽 위에 해당아이콘이 생성된다. 

### Step \#10 Metamask setting

Metamask 계정을 생성한 후 테스트 용도로 쓰기 위해서 Ganache network를 등록해주어야 한다. Etereum mainnet을 클릭하고 Custom RPC를 선택한다.

![](../.gitbook/assets/image%20%2849%29.png)

아래와 같이 입력해서 Ganache Test Network를 설정한다. \(포트번호가 7545일수도 있다.\)

![](../.gitbook/assets/image%20%2850%29.png)

다음으로 Ganache에 생성되어 있는 10개의 test 계정 중 1개를 import한다. 프로필 사진 같은 것을 누르고 Import Account를 누르고 Ganache에서 열쇠 모양 아이콘을 클릭한 후 private key를 복사해 붙혀넣는다.

![](../.gitbook/assets/image%20%2852%29.png)

Import한 Account를 개발하고 있는 웹 사이트에 conntect 시킨다. 옵션 아이콘을 누르고 connected sites를 누르고 확인을 계속 누르면 된다.

![](../.gitbook/assets/image%20%2844%29.png)

### Step \#11 React Skeleton code

React 작성에 대한 가이드는 아니니 React 코드에 대한 설명은 생략한다. 아래는 UI를 보여주는 React 템ㅍ플릿 코드이다. 이제 Metamask를 연결해 web3 어플리케이션으로 만들고, deposit과 withdraw함수를 구현해서 이더리움 네트워크\(여기서는 Ganache local network\)와 상호작용을 해볼것이다. 

```bash
import { Tabs, Tab } from 'react-bootstrap'
import DeBank from './contracts/DeBank.json'
import Token from './contracts/Token.json'
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';

const App = () => {
  const [web3, setWeb3] = useState();
  const [account, setAccount] = useState();
  const [token, setToken] = useState();
  const [deBank, setDeBank] = useState();
  const [balance, setBalance] = useState();
  const [deBankAddress, setDeBankAddress] = useState();
  const [depositAmount, setDepositAmount] = useState();

  useEffect(() => {
    async function componentWillMount() {
      await loadBlockchainData()
    }
    componentWillMount();
  }, []);

  const loadBlockchainData = async () => {

  }

  const deposit = async (amount) => {

  }

  const withdraw = async (e) => {

  }


  return (
    <div className='text-monospace'>
      <nav className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
        <a
          className="navbar-brand col-sm-3 col-md-2 mr-0"
          href="http://github.com/siisee11/"
          target="_blank"
          rel="noopener noreferrer"
        >
        <b>Decentralized Bank</b>
      </a>
      </nav>
      <div className="container-fluid mt-5 text-center">
      <br></br>
        <h1>Welcome to Decentralized Bank</h1>
        <h2>{account}</h2>
        <h2>{web3 && (web3.utils.fromWei(balance))} ETH</h2>
        <br></br>
        <div className="row">
          <main role="main" className="col-lg-12 d-flex text-center">
            <div className="content mr-auto ml-auto">
            <Tabs defaultActiveKey="profile" id="uncontrolled-tab-example">
              <Tab eventKey="deposit" title="Deposit">
                <div>
                  <br></br>
                  How much do you want to deposit?
                  <br></br>
                  (min. amount is 0.01 ETH)
                  <br></br>
                  <form onSubmit={(e)=> {
                    e.preventDefault();
                    let amount = depositAmount.value;
                    amount = amount * 10 ** 18
                    deposit(amount);
                  }}>
                    <div className='form-group mr-sm-2'>
                      <br></br>
                      <input
                        id='depositAmount'
                        step='0.01'
                        type='number'
                        className='form-control form-control-md'
                        placeholder='amount...'
                        required
                        ref={(input)=> {setDepositAmount(input)}}
                      />
                    </div>
                    <button type='submit' className='btn btn-primary'>DEPOSIT</button>
                  </form>

                </div>
              </Tab>
              <Tab eventKey="withdraw" title="Withdraw">
                <div>
                  <br></br>
                  Do you want to withdraw?
                  <br></br>
                  <button type='submit' className='btn btn-primary' onClick={(e)=> { withdraw(e)}}>WITHDRAW</button>
                </div>
              </Tab>
            </Tabs>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
```

### Step \#12 Connect to blockchain \(Become a web3 app\)

아래 코드는 Metamask, Blockchain backend와 연동하는 부분이다. 컨트랙트와 계정에 대한 정보를 웹으로 가져올 수 있다.

```bash
  const loadBlockchainData = async () => {
    // Metamask가 window.ethereum에 API를 삽입하기 때문에
    // undefined가 아니라면 Metamask가 있는 것.
    if (typeof window.ethereum !== "undefined") {
      const web3 = new Web3(window.ethereum);
      // network마다 고유의 ID가 부여된다. 아래 함수로 Ganache의 ID인 5777이 반환된다.
      const netId = await web3.eth.net.getId();
      // 우리가 Import한 계정이 받아진다.
      const accounts = await web3.eth.getAccounts();

      // log는 개발자 도구에서 볼 수 있다.
      console.log(netId, accounts)

      // account가 연결되어 있다면
      if (typeof accounts[0] !== "undefined") {
        // balance를 구하고 변수를 저장한다.
        const balance = await web3.eth.getBalance(accounts[0]);
        setAccount(accounts[0]);
        setBalance(balance);
        setWeb3(web3);
      } else {
        window.alert("Please Login With MetaMask");
      }

      try {
        // web3.eth.Contract로 contract 객체를 얻어 올 수 있다.
        // 파라메터로 abi와 현재 네트워크 상에서의 주소를 넘겨준다.
        const token = new web3.eth.Contract(
          Token.abi,
          Token.networks[netId].address
        );
        const deBank = new web3.eth.Contract(
          DeBank.abi,
          DeBank.networks[netId].address
        );
        const deBankAddress = DeBank.networks[netId].address;
        setToken(token)
        setDeBank(deBank)
        setDeBankAddress(deBankAddress)
      } catch (error) {
        console.log("Error", error);
        window.alert("Contract not deployed to the current network");
      }
    } else {
      window.alert("Please Install MetaMask");
    }
  }
```

 계좌가 연동되어 계좌 주소와 잔고가 출력된다.

![](../.gitbook/assets/image%20%2851%29.png)

### Step \#13 Interact with smart contract

Smart contract의 함수는 contract 객체의 methods.&lt;function&gt;.call\(\) 혹은 methods.&lt;function&gt;.send\(\) 를 호출는 것으로 실행한다.

{% hint style="info" %}
call\(\) 과 send\(\)는 함수 실행이 state를 변화시키느냐에 따라 구분되어 사용된다. 예를 들어 deposit과 withdraw는 contract 내부에 저장되는 잔고\(state\)를 변화시키므로 send\(\)함수를 사용해야한다. 
{% endhint %}

Deposit, Withdraw 함수는 아래와 같다.

```bash
  const deposit = async (amount) => {
    if (deBank !== 'undefined') {
      //in try block call deBank deposit();
      try {
        // deposit 함수는 payable 이므로 실어보낼 ETH의 양{value}과
        // 누가 deposit 함수를 호출하는지를 나타내는 {from}이 필요하다.
        // 아래 구문은 지금 연결되어 있는 account가 amount만큼의 ETH를 deposit한다는 뜻.  
        await deBank.methods.deposit().send({value: amount.toString(), from: account}) 
      } catch (error) {
        console.log('Error, deposit: ', error)
      }
    }
  }

  const withdraw = async (e) => {
    e.preventDefault()
    if (deBank !== 'undefined') {
      try {
        await deBank.methods.withdraw().send({from: account})
      } catch (error) {
        console.log('Error, withdraw: ', error)
      }
    }
  }
```

이제 3 ETH를 예금해보자.

![](../.gitbook/assets/image%20%2845%29.png)

confirm을 누르면 계좌에서 3 ETH가 빠져나간 것을 확인할 수 있다.

시간이 조금 흐른 후에 Withdraw를 진행해보자.

![](../.gitbook/assets/image%20%2846%29.png)

 Deposit했던 ETH가 다시 들어왔다. 그런데 이자로 받은 토큰은 어떻게 확인할까? 토큰을 Metamask에 추가해주어야 지갑에서 확인 가능하다. 토큰 컨트랙트 주소를 복사해서 Metamask의 Assets - Add Token에 붙혀넣는다. Token.json 파일에서 확인 가능하다.

![&quot;address&quot;](../.gitbook/assets/image%20%2847%29.png)

아주 잠깐 예금했기때문에 매우 적지만 이자가 DEBT 토큰으로 계좌에 들어온 것을 확인할 수 있다.

![](../.gitbook/assets/image%20%2853%29.png)

### Step \#14 To Be Continueeee

대출이나 UI 업데이트등은 추후에 진행하도록 한다. 





참고:  
[https://www.youtube.com/watch?v=xWFba\_9QYmc](https://www.youtube.com/watch?v=xWFba_9QYmc)

  
 Last update: 2021/04/25

