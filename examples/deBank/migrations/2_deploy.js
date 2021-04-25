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