import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { FundMe, MockV3Aggregator } from "../../typechain";
import { assert, expect } from "chai";
import { developmentChain } from "../../helper-hardhat-config";

!developmentChain.includes(network.name)
  ? describe.skip
  : describe("FundMe", async function () {
      let fundMe: FundMe;
      let deployer: string;
      // alternative: let deployer: SignerWithAddress
      let mockV3Aggregator: MockV3Aggregator;
      const sendValue = ethers.utils.parseEther("1"); //"1000000000000000000" // 1ETH

      this.beforeEach(async () => {
        // deploy Fundme using hardhat-deploy
        // alternative: const accounts = await ethers.getSigners();
        // alternative: const deployer = accounts[0];
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture("all");
        fundMe = await ethers.getContract("FundMe", deployer);
        mockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        );
      });

      describe("contstructor", async function () {
        it("sets the aggregator addresses correctly", async function () {
          const response = await fundMe.getPriceFeed();
          assert.equal(response, mockV3Aggregator.address);
        });
      });

      describe("fund", async function () {
        it("fails if you don't send enough ETH", async function () {
          await expect(fundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH"
          );
        });

        it("update the amount funded data structure", async function () {
          await fundMe.fund({ value: sendValue });
          const response = await fundMe.getAddressToAmountFunded(deployer);
          // alternative: const response = await fundMe.addressToAmountFunded(deployer.address);
          assert.equal(response.toString(), sendValue.toString());
        });

        it("adds funder to array of funders", async function () {
          await fundMe.fund({ value: sendValue });
          const funder = await fundMe.getFunder(0);
          assert.equal(funder, deployer);
        });
      });

      describe("withdraw", async function () {
        beforeEach(async function () {
          await fundMe.fund({ value: sendValue });
        });

        it("withdraw ETH from a single funder", async function () {
          // Arrange
          const startingFumdMeBlalance = await fundMe.provider.getBalance(
            fundMe.address
          );

          const startingDeployerBlalance = await fundMe.provider.getBalance(
            deployer
          );
          // Act
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);

          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFumdMeBlalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBlalance = await fundMe.provider.getBalance(
            deployer
          );
          // Assert
          assert.equal(endingFumdMeBlalance.toString(), "0");
          assert.equal(
            startingFumdMeBlalance.add(startingDeployerBlalance).toString(),
            endingDeployerBlalance.add(gasCost).toString()
          );
        });

        it("allows to withdraw with multiple funders", async function () {
          const accounts = await ethers.getSigners();
          // Arrange
          // 0 is deployer
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }

          const startingFumdMeBlalance = await fundMe.provider.getBalance(
            fundMe.address
          );

          const startingDeployerBlalance = await fundMe.provider.getBalance(
            deployer
          );
          // Act
          const transactionResponse = await fundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);

          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          // Assert
          const endingFumdMeBlalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBlalance = await fundMe.provider.getBalance(
            deployer
          );

          assert.equal(endingFumdMeBlalance.toString(), "0");
          assert.equal(
            startingFumdMeBlalance.add(startingDeployerBlalance).toString(),
            endingDeployerBlalance.add(gasCost).toString()
          );

          // Make sure the funders are reset properly
          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (let i = 1; i < 6; i++) {
            assert.equal(
              (
                await fundMe.getAddressToAmountFunded(accounts[i].address)
              ).toString(),
              "0"
            );
          }
        });

        it("only allows the owner to withdraw", async function () {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const attackerConnectedContract = fundMe.connect(attacker);

          await expect(attackerConnectedContract.withdraw()).to.be.revertedWith(
            "FundMe__NotOwner"
          );
        });

        it("cheaperWithdraw testing ...", async function () {
          const accounts = await ethers.getSigners();
          // Arrange
          // 0 is deployer
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = fundMe.connect(accounts[i]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }

          const startingFumdMeBlalance = await fundMe.provider.getBalance(
            fundMe.address
          );

          const startingDeployerBlalance = await fundMe.provider.getBalance(
            deployer
          );
          // Act
          const transactionResponse = await fundMe.cheaperWithdraw();
          const transactionReceipt = await transactionResponse.wait(1);

          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          // Assert
          const endingFumdMeBlalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBlalance = await fundMe.provider.getBalance(
            deployer
          );

          assert.equal(endingFumdMeBlalance.toString(), "0");
          assert.equal(
            startingFumdMeBlalance.add(startingDeployerBlalance).toString(),
            endingDeployerBlalance.add(gasCost).toString()
          );

          // Make sure the funders are reset properly
          await expect(fundMe.getFunder(0)).to.be.reverted;

          for (let i = 1; i < 6; i++) {
            assert.equal(
              (
                await fundMe.getAddressToAmountFunded(accounts[i].address)
              ).toString(),
              "0"
            );
          }
        });
      });
    });
