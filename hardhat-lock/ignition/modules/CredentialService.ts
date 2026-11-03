import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CredentialServiceModule = buildModule("CredentialServiceModule", (m) => {
  const credentialService = m.contract("CredentialService");
  return { credentialService };
});

export default CredentialServiceModule;