import { network } from "hardhat";

// Usage:
//   npx hardhat run scripts/revoke-credential.ts --network sepolia -- <contractAddress> <credentialHash>

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
    "Usage: revoke-credential.ts -- <contractAddress> <credentialHash>",
  );
  process.exit(1);
}

const [revoker] = await ethers.getSigners();
const service = await ethers.getContractAt("CredentialService", contractAddress, revoker);

console.log("Revoking credential");
console.log("  Contract:", contractAddress);
console.log("  Credential hash:", credentialHash);
console.log("  Revoked by:", revoker.address);

const tx = await service.revokeCredential(credentialHash);
console.log("  Tx hash:", tx.hash);
await tx.wait();

console.log("Credential revoked successfully");
