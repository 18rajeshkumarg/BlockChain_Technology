import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Mainnet deployment module for CredentialService.
 *
 * SECURITY CHECKLIST before deploying:
 * 1. Contract has been independently audited
 * 2. Verification fee is validated for the target market
 * 3. Gas estimate has been reviewed (MetaMask will display it)
 * 4. Deployment account has sufficient ETH for gas
 * 5. MAINNET_RPC_URL and MAINNET_PRIVATE_KEY are set in the Hardhat keystore
 *
 * This module is separate from the Sepolia deployment to ensure:
 * - Distinct contract addresses per network
 * - No accidental mainnet deployment from testnet workflows
 * - Clear audit trail for production deployments
 */
const CredentialServiceMainnetModule = buildModule("CredentialServiceMainnetModule", (m) => {
  const credentialService = m.contract("CredentialService");
  return { credentialService };
});

export default CredentialServiceMainnetModule;
