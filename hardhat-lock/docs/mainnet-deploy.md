# Mainnet Deployment Guide — CredentialService

This guide walks through deploying `CredentialService` to Ethereum Mainnet.
Mainnet transactions are irreversible and cost real ETH. Read every section
before submitting a deployment transaction.

---

## 1. Pre-Deployment Checklist

Complete all items before attempting a deployment.

### Audit

- [ ] The contract has been reviewed/audited by a qualified independent party.
- [ ] Any audit findings are resolved or explicitly accepted in writing.
- [ ] The exact bytecode you intend to deploy matches the audited source
      (recompile and compare — see §2).

### Gas & Configuration Review

- [ ] Optimizer and `evmVersion` settings in `hardhat.config.ts` match the
      configuration that was audited and gas-profiled.
- [ ] `solidity` profile used for deployment is confirmed
      (currently `default` == `production`; verify before deploying).
- [ ] You have run the local gas estimate (see §2) and reviewed the result.

### Keystore Setup

- [ ] `MAINNET_RPC_URL` and `MAINNET_PRIVATE_KEY` are stored in the encrypted
      Hardhat keystore (never in `.env`, source code, or shell history):

  ```shell
  npx hardhat keystore set MAINNET_RPC_URL
  npx hardhat keystore set MAINNET_PRIVATE_KEY
  npx hardhat keystore list   # verify both exist
  ```

- [ ] The deployment account holds enough ETH to cover the deployment gas
      plus a safety buffer (recommend ≥ 2× the estimate).
- [ ] The private key corresponds to the intended owner address — confirm
      with a read-only `eth_getBalance` or a small Sepolia dry run.

### Business / Legal

- [ ] Legal review complete — see §6.
- [ ] Pricing validated — see §6.

---

## 2. Estimating Deployment Gas & Verifying the Transaction

### Local estimate (no state committed)

Run the estimate script. It deploys `CredentialService` to an in-memory
EDR-simulated L1 and reports the gas estimate and actual gas used:

```shell
npx hardhat run scripts/estimate-deployment.ts
```

Expected output (approximate — depends on compiler settings):

```
Artifact check: ABI and bytecode present.
Bytecode size: 6744 bytes
Estimated deployment gas: ~1470157 gas units
Gas used by deployment: ~1470157 gas units
```

Multiply gas units by current mainnet `baseFeePerGas` + `maxPriorityFeePerGas`
to estimate the ETH cost.

### Verify the exact transaction before submitting

Hardhat Ignition prints the deployment plan and the transaction it will send
before broadcast. To preview without sending:

```shell
npx hardhat ignition deploy ignition/modules/CredentialServiceMainnet.ts --network mainnet --dry-run
```

(If your Hardhat version does not support `--dry-run`, use the local network
first and inspect the broadcasted transaction via the resulting receipt.)

Before signing, confirm:

- Target chain is mainnet (chain ID 1)
- `to` is null (contract creation)
- `data` starts with the expected `CredentialService` creation bytecode
  (compare with `artifacts/contracts/CredentialService.sol/CredentialService.json` → `bytecode`)
- Value is 0 ETH
- Gas limit is plausible (≈1.5M for current bytecode, per §2 estimate)

---

## 3. Deployment Steps

### Step 1 — Store credentials in the keystore

```shell
npx hardhat keystore set MAINNET_RPC_URL
npx hardhat keystore set MAINNET_PRIVATE_KEY
npx hardhat keystore list
```

### Step 2 — Compile fresh artifacts

```shell
npx hardhat compile
```

### Step 3 — Review the deployment module

Open `ignition/modules/CredentialServiceMainnet.ts` and confirm:

- It deploys `CredentialService`
- Parameters match your intended configuration
- The module ID is `CredentialServiceMainnetModule` (separate from Sepolia)

### Step 4 — Run the gas estimate script (final review)

```shell
npx hardhat run scripts/estimate-deployment.ts
```

### Step 5 — Deploy

```shell
npx hardhat ignition deploy ignition/modules/CredentialServiceMainnet.ts --network mainnet
```

This broadcasts an irreversible mainnet transaction. Confirm details when
prompted.

### Step 6 — Verify on Etherscan

After the deployment transaction is mined:

```shell
npx hardhat verify --network mainnet <DEPLOYED_ADDRESS>
```

Then confirm the contract appears as *Verified* on
`https://etherscan.io/address/<DEPLOYED_ADDRESS>#code`.

---

## 4. Post-Deployment Verification

Immediately after deployment, check the following on the live contract
(via Etherscan "Read Contract" or a script):

1. **Owner** — `owner()` returns the intended deployment address.
2. **Fee** — `verificationFee()` returns the expected value (default
   `0.001 ETH` = `1000000000000000` wei). If different, investigate before
   taking users.
3. **Issuer authorization** — `authorizedIssuers(<owner>)` returns `true`.
   The deployer is authorized by default; add/remove issuers deliberately
   via `setIssuer(...)`.
4. **Events** — The deployment receipt emits
   `IssuerAuthorizationChanged(<owner>, true)`.
5. **State counters** — `totalVerifications()` is `0`.
6. Run a low-stakes smoke test: issue a test credential, verify it with a
   verifier account paying the fee, then revoke it.

Record the deployed address, deployment transaction hash, block number, and
deployer address in your deployment log.

---

## 5. Rollback / Upgrade Considerations

- **There is no rollback on mainnet.** A deployed contract cannot be removed;
  only a new deployment replaces it. Treat the deployment transaction as
  final.
- `CredentialService` is **not upgradeable** (no proxy pattern). Bugs require
  a new deployment and a migration of the contract address in all clients
  (including the React app's saved address and any off-chain bundles).
- If a critical issue is found:
  1. Pause new usage at the product level (frontend/distribution).
  2. Use `setVerificationFee` / issuer revocation only for damage control —
     they cannot remove existing state.
  3. Deploy a patched contract, verify it on Etherscan, and update all
     references.
- Keep the previous deployment address documented so verifiers with stale
  clients can be alerted.
- Ignition keeps its own deployment journal under `ignition/deployments/`.
  Commit the chain-1 journal (it contains no secrets) for auditability, but
  never commit keystore files or `.env`.

---

## 6. Legal and Pricing Review Reminders

- Legal sign-off on collecting `verificationFee` ETH, issuing/revoking
  credentials, and storing salted hashes of credential data (jurisdiction-
  dependent).
- Confirm the fee model is compliant with local payment/consumer rules;
  `0.001 ETH` is a demo default, **not** a validated business price.
- Do not put real personal data on-chain — only salted hashes, and share
  salt/holder bundles through a secure channel.
- Privacy/data-protection review (GDPR/CCPA) for whatever the off-chain
  bundle reveals to verifiers.
- Confirm the deployment account and `owner` address are controlled by an
  appropriate organization (multisig recommended for production).
- Verify RPC provider, gas price strategy, and MEV/ordering considerations
  for the `verifyCredential` flow.
