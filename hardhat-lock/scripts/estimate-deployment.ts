import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

// Estimates the deployment gas of CredentialService by deploying it to a
// local, in-memory EDR-simulated network. No state is committed to Sepolia,
// mainnet, or any persistent chain.
//
// Usage:
//   npx hardhat run scripts/estimate-deployment.ts

const ARTIFACT_PATH = path.join(
  process.cwd(),
  "artifacts",
  "contracts",
  "CredentialService.sol",
  "CredentialService.json",
);

// 1. Validate that the compiled artifact (ABI + bytecode) is present.
if (!fs.existsSync(ARTIFACT_PATH)) {
  console.error(`Artifact not found at ${ARTIFACT_PATH}. Run \`npx hardhat compile\` first.`);
  process.exit(1);
}

const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf8"));
if (!Array.isArray(artifact.abi) || artifact.abi.length === 0) {
  console.error("CredentialService artifact is missing a valid ABI.");
  process.exit(1);
}
if (!artifact.bytecode || artifact.bytecode === "0x") {
  console.error("CredentialService artifact is missing deployment bytecode.");
  process.exit(1);
}
console.log("Artifact check: ABI and bytecode present.");
console.log(`Bytecode size: ${(artifact.bytecode.length - 2) / 2} bytes`);

// 2. Deploy to an in-memory simulated network and measure the gas used.
const { ethers } = await network.create({
  network: "hardhatMainnet",
  chainType: "l1",
});

const [deployer] = await ethers.getSigners();
console.log("Simulated deployer:", deployer.address);

const factory = await ethers.getContractFactory("CredentialService");
const deployTx = await factory.getDeployTransaction();
const gasEstimate = await deployer.estimateGas(deployTx);
console.log("Estimated deployment gas:", gasEstimate.toString(), "gas units");

const service = await ethers.deployContract("CredentialService");
const receipt = await service.deploymentTransaction()?.wait();
console.log("Gas used by deployment:", receipt?.gasUsed.toString(), "gas units");

const address = await service.getAddress();
console.log("Deployed (in-memory only) at:", address);
console.log("Owner:", await service.owner());
console.log("Verification fee:", ethers.formatEther(await service.verificationFee()), "ETH");

console.log(
  "\nDeployment readiness: OK. No state was committed to any live network.",
);
