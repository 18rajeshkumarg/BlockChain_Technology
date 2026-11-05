# Blockchain and Big Data Project

This repository now combines a complete blockchain project with a Hadoop/Big Data analytics project in one unified workspace.

## Project structure

- `hardhat-lock/`: Hardhat smart-contract project for the credential service and contract tests.
- `reactdemo/myreactapp/`: Vite + React frontend for credential verification and wallet-based deployment flows.
- `Big Data Hadoop/`: Hadoop/Pig data-analysis projects covering Titanic, demonetization sentiment analysis, and basketball match analytics.
- `bigdata_analysis/`: Generated analysis reports and per-project result folders for the Big Data Hadoop examples.

## What this project includes

### Blockchain application
- Issues credential commitments using salted hashes on-chain.
- Tracks verification receipts and paid validation flows.
- Provides a browser wallet flow for Sepolia deployment and contract interaction.
- Publishes the frontend on GitHub Pages.

### Big Data Hadoop projects
- Titanic dataset reporting examples.
- Demonetization tweet sentiment analysis.
- Basketball match dataset processing and aggregation.

## Local validation

Use Node.js 22 LTS for the blockchain app.

```bash
npm ci --prefix hardhat-lock
npm test --prefix hardhat-lock

npm ci --prefix reactdemo/myreactapp
npm run build --prefix reactdemo/myreactapp
```

The Hadoop examples are Pig-based scripts and require a Hadoop/Pig environment to execute. They are included in the repo as part of the broader project archive, but they are not browser-based apps and do not require the blockchain frontend runtime.

## Complete local deployment runbook

### 1. Start the local blockchain node

```bash
npx hardhat node
```

This exposes the JSON-RPC endpoint at `http://127.0.0.1:8545` (chain ID `31337`).

### 2. Deploy the credential service locally

In a second terminal:

```bash
npx hardhat run scripts/deploy-to-local.ts --network localhost
```

The script deploys `CredentialService` to the local node and prints the deployment address, owner, and verification fee.

### 3. Run the frontend against the local deployment

```bash
npm run sync:contracts --prefix reactdemo/myreactapp
npm run dev -- --host 127.0.0.1 --port 5174 --prefix reactdemo/myreactapp
```

Then in the browser:

1. Open MetaMask and add a custom network pointing at `http://127.0.0.1:8545` (chain ID `31337`) — the app also offers an automatic "Local Hardhat" network option that adds it for you.
2. Select **Local Hardhat** in the app's deployment network selector.
3. Connect the wallet, deploy `CredentialService` on the local network, issue a salted credential, and pay the verification fee.

### 4. Sepolia testnet deployment

The demo `CredentialService` is already deployed on Sepolia at:

```
0xC8b1B2168B4639b2cB2342C02F9A040eBb8443E6
```

Use the app's **Sepolia testnet** network option, connect MetaMask on Sepolia, and paste the address under "Already deployed?" if prompted.

## GitHub Pages deployment

The frontend is deployed from the `main` branch using `.github/workflows/pages.yml` with GitHub Actions as the Pages source.

## Security notes

- Do not commit private keys, `.env` files, or recovery phrases.
- The blockchain app is configured for Sepolia testnet use only.
- Mainnet deployment should only be attempted with a proper wallet, RPC endpoint, and independent security review.

This repository keeps the working blockchain app and the supporting Big Data Hadoop examples together in one final project layout.