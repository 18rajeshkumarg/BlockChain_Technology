import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

// Mainnet preflight check — validates everything before the real deployment.
// Run this BEFORE `npx hardhat ignition deploy ... --network mainnet`.
//
// Usage:
//   npx hardhat run scripts/preflight-mainnet.ts --network hardhatMainnet
//
// Environment variables required:
//   MAINNET_RPC_URL
//   MAINNET_PRIVATE_KEY

const ARTIFACT_PATH = path.join(
  process.cwd(),
  "artifacts",
  "contracts",
  "CredentialService.sol",
  "CredentialService.json",
);

console.log("=== Mainnet Deployment Preflight ===\n");

// 1. Check environment variables
const rpcUrl = process.env.MAINNET_RPC_URL;
const privateKey = process.env.MAINNET_PRIVATE_KEY;

if (!rpcUrl) {
  console.error("MISSING: MAINNET_RPC_URL is not set.");
  process.exit(1);
}
if (!privateKey) {
  console.error("MISSING: MAINNET_PRIVATE_KEY is not set.");
  process.exit(1);
}
console.log("Environment: MAINNET_RPC_URL and MAINNET_PRIVATE_KEY are present.");

// 2. Check artifact
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
console.log("Artifact: ABI and bytecode present.");
console.log(`Bytecode size: ${(artifact.bytecode.length - 2) / 2} bytes`);

// 3. Simulate deployment locally to get gas estimate
const { ethers } = await network.create({
  network: "hardhatMainnet",
  chainType: "l1",
});

const [deployer] = await ethers.getSigners();
console.log("\nSimulated deployer:", deployer.address);

const factory = await ethers.getContractFactory("CredentialService");
const deployTx = await factory.getDeployTransaction();
const gasEstimate = await deployer.estimateGas(deployTx);
console.log("Estimated deployment gas:", gasEstimate.toString(), "gas units");

// 4. Estimate cost at a sample gas price (e.g. 30 gwei) as a ballpark
const sampleGasPrice = ethers.parseUnits("30", "gwei");
const approxCost = gasEstimate * sampleGasPrice;
console.log(
  `Approx cost at 30 gwei: ${ethers.formatEther(approxCost)} ETH`,
);

// 5. Run local deployment to prove readiness
const service = await ethers.deployContract("CredentialService");
const receipt = await service.deploymentTransaction()?.wait();
console.log("Gas used by deployment:", receipt?.gasUsed.toString(), "gas units");

console.log("Deployed address (in-memory):", await service.getAddress());
console.log("Owner:", await service.owner());
console.log("Verification fee:", ethers.formatEther(await service.verificationFee()), "ETH");

console.log("\n=== PREFLIGHT: READY FOR MAINNET DEPLOYMENT ===");
console.log("Next step:");
console.log(
  "  MAINNET_RPC_URL=... MAINNET_PRIVATE_KEY=... npx hardhat ignition deploy ignition/modules/CredentialServiceMainnet.ts --network mainnet",
);
