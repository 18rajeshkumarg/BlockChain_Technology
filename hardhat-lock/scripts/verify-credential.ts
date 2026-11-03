import { network } from "hardhat";

// Usage:
//   npx hardhat run scripts/verify-credential.ts --network sepolia -- <contractAddress> <credentialHash>

const { ethers } = await network.create({
  network: process.env.HARDHAT_NETWORK ?? "sepolia",
  chainType: "l1",
});

function scriptArgs(): string[] {
  const argv = process.argv;
  const dashDash = argv.indexOf("--");
  if (dashDash !== -1) return argv.slice(dashDash + 1);
  const scriptIdx = argv.findIndex((a) => a.endsWith(".ts"));
  const rest = argv.slice(scriptIdx === -1 ? 2 : scriptIdx + 1);
  const positionals: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith("-")) {
      i++; // skip the flag's value, e.g. "--network sepolia"
      continue;
    }
    positionals.push(rest[i]);
  }
  return positionals;
}

const args = scriptArgs();
const contractAddress = args[0] ?? process.env.CREDENTIAL_SERVICE_ADDRESS;
const credentialHash = args[1];

if (!contractAddress || !credentialHash) {
  console.error(
    "Usage: verify-credential.ts -- <contractAddress> <credentialHash>",
  );
  process.exit(1);
}

const [verifier] = await ethers.getSigners();
const service = await ethers.getContractAt("CredentialService", contractAddress, verifier);

const fee = await service.verificationFee();
console.log("Verification fee:", ethers.formatEther(fee), "ETH");

// Preview the outcome without spending gas...
const valid = await service.verifyCredential.staticCall(credentialHash, {
  value: fee,
});
console.log("Credential valid (preview):", valid);

// ...then pay the fee and record the verification on-chain.
const tx = await service.verifyCredential(credentialHash, { value: fee });
console.log("Tx hash:", tx.hash);
const receipt = await tx.wait();

console.log("Verification recorded in block", receipt?.blockNumber);
console.log("Total verifications:", (await service.totalVerifications()).toString());
