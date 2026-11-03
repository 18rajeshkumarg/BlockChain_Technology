import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("Lock", function () {
  it("records the owner and unlock time and holds the locked ETH", async function () {
    const [owner] = await ethers.getSigners();
    const unlockTime = BigInt(Math.floor(Date.now() / 1000) + 60);
    const lockedAmount = ethers.parseEther("1");
    const lock = await ethers.deployContract("Lock", [unlockTime], { value: lockedAmount });
    await lock.waitForDeployment();

    expect(await lock.owner()).to.equal(owner.address);
    expect(await lock.unlockTime()).to.equal(unlockTime);
    expect(await ethers.provider.getBalance(await lock.getAddress())).to.equal(lockedAmount);
  });

  it("rejects withdrawal before the unlock time", async function () {
    const unlockTime = BigInt(Math.floor(Date.now() / 1000) + 60);
    const lock = await ethers.deployContract("Lock", [unlockTime], { value: ethers.parseEther("1") });
    await lock.waitForDeployment();

    await expect(lock.withdraw()).to.be.revertedWith("Lock has not expired");
  });
});