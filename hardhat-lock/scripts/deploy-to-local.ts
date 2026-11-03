import { network } from "hardhat";

// Usage:
//   npx hardhat node   # in another terminal
//   npx hardhat run scripts/deploy-to-local.ts

const { ethers } = await network.create({
  network: process.env.HARDHAT_NETWORK ?? "localhost",
  chainType: "l1",
});

const [deployer] = await ethers.getSigners();
console.log("Deploying CredentialService with", deployer.address);

const service = await ethers.deployContract("CredentialService");
await service.waitForDeployment();

const address = await service.getAddress();
console.log("CredentialService deployed to:", address);
console.log("Owner:", await service.owner());
console.log("Verification fee:", ethers.formatEther(await service.verificationFee()), "ETH");
