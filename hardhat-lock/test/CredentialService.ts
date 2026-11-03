import { expect } from "chai";
import { network } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-ethers-chai-matchers/withArgs";

const { ethers } = await network.create();
const claimHash = ethers.keccak256(ethers.toUtf8Bytes("salted test credential"));

describe("CredentialService", function () {
  it("allows an issuer to issue a salted hash without putting claim fields on-chain", async function () {
    const [owner, holder] = await ethers.getSigners();
    const service = await ethers.deployContract("CredentialService");
    await service.waitForDeployment();

    await expect(service.issueCredential(claimHash, holder.address, 0))
      .to.emit(service, "CredentialIssued")
      .withArgs(claimHash, holder.address, owner.address, 0);
    expect(await service.authorizedIssuers(owner.address)).to.equal(true);
  });

  it("charges the configured fee and emits a paid verification receipt", async function () {
    const [, holder, verifier] = await ethers.getSigners();
    const service = await ethers.deployContract("CredentialService");
    await service.waitForDeployment();
    const fee = await service.verificationFee();
    await service.issueCredential(claimHash, holder.address, 0);

    await expect(service.connect(verifier).verifyCredential(claimHash, { value: fee }))
      .to.emit(service, "CredentialVerified")
      .withArgs(claimHash, verifier.address, true, fee, anyValue);
    expect(await service.totalVerifications()).to.equal(1);
  });

  it("rejects incorrect fees and reports revoked credentials as invalid", async function () {
    const [, holder, verifier] = await ethers.getSigners();
    const service = await ethers.deployContract("CredentialService");
    await service.waitForDeployment();
    const fee = await service.verificationFee();
    await service.issueCredential(claimHash, holder.address, 0);

    await expect(service.connect(verifier).verifyCredential(claimHash, { value: fee - 1n }))
      .to.be.revertedWith("Incorrect verification fee.");
    await service.connect(holder).revokeCredential(claimHash);
    await expect(service.connect(verifier).verifyCredential(claimHash, { value: fee }))
      .to.emit(service, "CredentialVerified")
      .withArgs(claimHash, verifier.address, false, fee, anyValue);
  });

  it("restricts issuance and fee withdrawal to authorized roles", async function () {
    const [, holder, stranger] = await ethers.getSigners();
    const service = await ethers.deployContract("CredentialService");
    await service.waitForDeployment();

    await expect(service.connect(stranger).issueCredential(claimHash, holder.address, 0))
      .to.be.revertedWith("Not an authorized issuer.");
    await expect(service.connect(stranger).withdrawFees())
      .to.be.revertedWith("Only owner can call this function.");
  });
});