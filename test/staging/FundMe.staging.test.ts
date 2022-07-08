import { assert } from "chai";
import { developmentChain } from "./../../helper-hardhat-config";
import { getNamedAccounts, ethers, network } from "hardhat";
import { FundMe } from "../../typechain";

developmentChain.includes(network.name)
  ? describe.skip
  : describe("FundMe", async function () {
      let fundMe: FundMe;
      let deployer: string;
      // alternative: let deployer: SignerWithAddress
      const sendValue = ethers.utils.parseEther("1"); //"1000000000000000000" // 1ETH

      this.beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        console.log("Depl " + deployer);
        console.log("Value: " + sendValue);
        fundMe = await ethers.getContract("FundMe", deployer);
      });

      it("allows to fund and withdraw", async function () {
        await fundMe.fund({ value: sendValue });
        await fundMe.withdraw();
        const endingBalance = await fundMe.provider.getBalance(fundMe.address);

        assert.equal(endingBalance.toString(), "0");
      });
    });
