# Blockchain Technology

This repository is a single complete blockchain project built around a Solidity credential service and a React frontend for verification and student registry workflows.

## Project structure

- `hardhat-lock/`: Hardhat smart-contract project with contract tests, deployment scripts, and deployment guidance.
- `reactdemo/myreactapp/`: Vite + React application used for credential verification, wallet connection, and deployment flows.

## What this project does

- Issues credential commitments using salted hashes on-chain.
- Tracks payment and verification receipts for credential validation.
- Uses a browser wallet flow for Sepolia deployment and contract interaction.
- Publishes the frontend on GitHub Pages for a clean demo experience.

## Local validation

Use Node.js 22 LTS.

```bash
npm ci --prefix hardhat-lock
npm test --prefix hardhat-lock

npm ci --prefix reactdemo/myreactapp
npm run build --prefix reactdemo/myreactapp
```

## GitHub Pages deployment

The frontend is deployed from the `main` branch using `.github/workflows/pages.yml` with GitHub Actions as the Pages source.

## Security notes

- Do not commit private keys, `.env` files, or recovery phrases.
- The app is configured for Sepolia testnet use only.
- Mainnet deployment should only be attempted with a proper wallet, RPC endpoint, and security review.

This repo intentionally keeps only the production-ready blockchain project and excludes unrelated coursework and demo folders.