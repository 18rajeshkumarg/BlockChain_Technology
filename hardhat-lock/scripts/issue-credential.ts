import { network } from "hardhat";

// Usage:
//   npx hardhat run scripts/issue-credential.ts --network sepolia -- <contractAddress> <holderAddress> <claim> [salt] [expiresAt]
// expiresAt is a unix timestamp in seconds; 0 (default) means it never expires.

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
const holder = args[1];
const claim = args[2];
const salt = args[3] ?? ethers.hexlify(ethers.randomBytes(16));
const expiresAt = args[4] !== undefined ? Number(args[4]) : 0;

if (!contractAddress || !holder || !claim) {
  console.error(
    "Usage: issue-credential.ts -- <contractAddress> <holderAddress> <claim> [salt] [expiresAt]",
  );
  process.exit(1);
}

const [issuer] = await ethers.getSigners();
const service = await ethers.getContractAt("CredentialService", contractAddress, issuer);

// Salted hash: keeps raw claim fields off-chain while remaining deterministic
// for anyone who knows the claim + salt.
const credentialHash = ethers.solidityPackedKeccak256(
  ["string", "string"],
  [claim, salt],
);

console.log("Issuing credential");
console.log("  Contract:", contractAddress);
console.log("  Holder:", holder);
console.log("  Issuer:", issuer.address);
console.log("  Salt:", salt);
console.log("  Expires at:", expiresAt === 0 ? "never" : expiresAt);
console.log("  Credential hash:", credentialHash);

const tx = await service.issueCredential(credentialHash, holder, expiresAt);
console.log("  Tx hash:", tx.hash);
await tx.wait();

console.log("Credential issued successfully");
