import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LockModule = buildModule("LockModule", (m) => {
  const unlockTime = 1_900_000_000;
  const lockedAmount = 1n * 10n ** 18n;
  const lock = m.contract("Lock", [unlockTime], { value: lockedAmount });

  return { lock };
});

export default LockModule;