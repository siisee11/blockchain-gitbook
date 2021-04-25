const Token = artifacts.require('./Token')
const DecentralizedBank = artifacts.require('./DeBank')
const utils = require("./helpers/utils");
const time = require("./helpers/time");

require('chai')
  .use(require('chai-as-promised'))
  .should()

//h0m3w0rk - check values from events.

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

  context('testing borrow...', () => {

    context('success', () => {
      beforeEach(async () => {
        await deBank.borrow({value: 10**16, from: user}) //0.01 ETH
      })

      it('token total supply should increase', async () => {
        expect(Number(await token.totalSupply())).to.eq(5*(10**15)) //10**16/2
      })

      it('balance of user should increase', async () => {
        expect(Number(await token.balanceOf(user))).to.eq(5*(10**15)) //10**16/2
      })

      it('collateralEther should increase', async () => {
        expect(Number(await deBank.collateralEther(user))).to.eq(10**16) //0.01 ETH
      })

      it('user isBorrowed status should eq true', async () => {
        expect(await deBank.isBorrowed(user)).to.eq(true)
      })
    })

    context('failure', () => {
      it('borrowing should be rejected', async () => {
        await deBank.borrow({value: 10**15, from: user}).should.be.rejectedWith(utils.EVM_REVERT) //to small amount
      })
    })
  })

  context('testing payOff...', () => {

    context('success', () => {
      beforeEach(async () => {
        await deBank.borrow({value: 10**16, from: user}) //0.01 ETH
        await token.approve(deBank.address, (5*(10**15)).toString(), {from: user})
        await deBank.payOff({from: user})
      })

      it('user token balance should eq 0', async () => {
        expect(Number(await token.balanceOf(user))).to.eq(0)
      })

      it('dBank eth balance should get fee', async () => {
        expect(Number(await web3.eth.getBalance(deBank.address))).to.eq(10**15) //10% of 0.01 ETH
      })

      it('borrower data should be reseted', async () => {
        expect(Number(await deBank.collateralEther(user))).to.eq(0)
        expect(await deBank.isBorrowed(user)).to.eq(false)
      })
    })

    context('failure', () => {
      it('paying off should be rejected', async () =>{
        await deBank.borrow({value: 10**16, from: user}) //0.01 ETH
        await token.approve(deBank.address, (5*(10**15)).toString(), {from: user})
        await deBank.payOff({from: deployer}).should.be.rejectedWith(utils.EVM_REVERT) //wrong user
      })
    })
  })
})