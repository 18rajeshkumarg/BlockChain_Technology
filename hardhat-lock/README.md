# Hardhat Lock — Credential Verification Service

A Hardhat 3 project implementing a fee-backed credential verification service on Ethereum.

## Architecture

- **Sepolia testnet** — demo deployment with test ETH (no cash value)
- **Ethereum Mainnet** — production deployment with real ETH (irreversible transactions)

Each network has its own:
- Ignition deployment module
- Saved contract address (localStorage in the React app)
- Confirmation flow in the UI

## Project Layout

```
contracts/
  Lock.sol                 — Time-locked ETH example contract
  CredentialService.sol    — Fee-backed credential verification
test/
  Lock.ts                  — Lock tests (2 tests)
  CredentialService.ts     — CredentialService tests (4 tests)
ignition/modules/
  Lock.ts                  — Lock deployment module
  CredentialService.ts     — Sepolia deployment module
  CredentialServiceMainnet.ts — Mainnet deployment module (separate)
scripts/
  deploy-to-local.ts          — Localhost deployment helper
  estimate-deployment.ts      — Deployment gas estimate (in-memory, no committed state)
  preflight-mainnet.ts        — Mainnet preflight checks (env, artifact, gas, readiness)
  send-op-tx.ts               — OP chain transaction demo
docs/
  mainnet-deploy.md           — Mainnet deployment guide
  security-review.md          — Security review of CredentialService
```

## Quick Start

### Compile and Test

```shell
npx hardhat compile
npx hardhat test
```

### Deploy to Sepolia (React UI)

The contract is **already deployed** on Sepolia at:

```
0xC8b1B2168B4639b2cB2342C02F9A040eBb8443E6
```

To test it:

```shell
cd ../reactdemo/myreactapp
npm run sync:contracts
npm run dev -- --host 127.0.0.1 --port 5174
```

Then:
1. Open Chrome → MetaMask → switch to **Sepolia**
2. Connect wallet in the React app
3. Paste the address above in **"Already deployed?"**
4. Issue a credential, then verify it with the 0.001 ETH fee

### Deploy to Ethereum Mainnet (CLI)

Mainnet deployment uses a separate Ignition module and requires real ETH.

**Step 1 — Store credentials in the encrypted Hardhat keystore:**

```shell
npx hardhat keystore set MAINNET_RPC_URL
npx hardhat keystore set MAINNET_PRIVATE_KEY
```

These values are stored encrypted and never appear in source code, logs, or command history.

**Step 2 — Verify the configuration:**

```shell
npx hardhat keystore list
```

**Step 3 — Review the deployment module:**

Open `ignition/modules/CredentialServiceMainnet.ts` and confirm:
- The contract is `CredentialService`
- The deployment parameters match your intended configuration
- The gas estimate is acceptable (MetaMask will show this)

**Step 4 — Deploy:**

```shell
npx hardhat ignition deploy ignition/modules/CredentialServiceMainnet.ts --network mainnet
```

This sends an irreversible Ethereum Mainnet transaction. Ensure the account has sufficient ETH for gas.

**Step 5 — Estimate gas and verify** (see [docs/mainnet-deploy.md](docs/mainnet-deploy.md)):

```shell
npx hardhat run scripts/estimate-deployment.ts
npx hardhat verify --network mainnet <DEPLOYED_ADDRESS>
```

For the full mainnet runbook (pre-deployment checklist, gas estimation, transaction verification, post-deployment checks, rollback/upgrade, and legal & pricing review), see **[docs/mainnet-deploy.md](docs/mainnet-deploy.md)**.

## Credential Service Contract

### Revenue Model

1. **Issuers** publish a salted credential hash on-chain (credential details stay off-chain)
2. **Verifiers** pay the configured fee (default `0.001 ETH`) for an on-chain verification receipt
3. **Owner** accumulates fees and can withdraw them

### Security Properties

- Only authorized issuers can issue credentials
- Only the owner can update the fee or withdraw funds
- Credentials can be revoked by the issuer, holder, or owner
- The public chain stores only the salted hash — never the credential details
- The salt is generated client-side and shared privately with the verifier

## Networks

| Network | Chain ID | Purpose |
|---------|----------|---------|
| `hardhatMainnet` | — | Local EDR-simulated L1 |
| `hardhatOp` | — | Local EDR-simulated OP |
| `localhost` | — | Local HTTP node (port 8545) |
| `ganache` | — | Ganache Local (port 7545) |
| `sepolia` | 11155111 | Sepolia testnet (test ETH) |
| `mainnet` | 1 | Ethereum Mainnet (real ETH) |

## Safety Notes

- Never commit `.env` files or keystore credentials
- Mainnet transactions are irreversible and cost real ETH
- The `0.001 ETH` verification fee is a demo default, not a validated business price
- Do not put real personal data on-chain; use salted hashes and share private bundles securely
