# Blockchain and Big Data Project

This repository now combines a complete blockchain project with a Hadoop/Big Data analytics project in one unified workspace.

## Project structure

- `hardhat-lock/`: Hardhat smart-contract project for the credential service and contract tests.
- `reactdemo/myreactapp/`: Vite + React frontend for credential verification and wallet-based deployment flows.
- `Big Data Hadoop/`: Hadoop/Pig data-analysis projects covering Titanic, demonetization sentiment analysis, and basketball match analytics.

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

## GitHub Pages deployment

The frontend is deployed from the `main` branch using `.github/workflows/pages.yml` with GitHub Actions as the Pages source.

## Security notes

- Do not commit private keys, `.env` files, or recovery phrases.
- The blockchain app is configured for Sepolia testnet use only.
- Mainnet deployment should only be attempted with a proper wallet, RPC endpoint, and independent security review.

This repository keeps the working blockchain app and the supporting Big Data Hadoop examples together in one final project layout.