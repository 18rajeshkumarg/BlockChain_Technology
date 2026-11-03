# Security Review: CredentialService.sol

## Summary

The contract implements a paid, on-chain credential verification service with role-based issuance and owner-controlled fee management. The design is minimal and follows Solidity best practices.

---

## Access Control Analysis

| Function | Access Control | Notes |
|----------|---------------|-------|
| `setIssuer` | `onlyOwner` | Owner can authorize/deauthorize any address. |
| `issueCredential` | `onlyIssuer` | Only authorized issuers can write credential hashes. |
| `revokeCredential` | Owner, issuer, or holder | Adequate for the business model. |
| `setVerificationFee` | `onlyOwner` | Owner sets the price. |
| `verifyCredential` | Anyone (pay fee) | Requires exact `msg.value == verificationFee`. |
| `withdrawFees` | `onlyOwner` | Owner sweeps accumulated balance. |

**Good:** Owner is immutable; no privilege escalation path. Authorized issuers are explicitly checked.

---

## Economic Attack Vectors

### 1. Fee mismatch (safe)
`verifyCredential` uses `msg.value == verificationFee`. A user cannot send excess or insufficient ETH; the transaction reverts. No refund logic needed.

### 2. Front-running / sandwiching
A malicious actor could attempt to front-run an `issueCredential` or `revokeCredential` transaction. Because `credentials` is keyed by a hash controlled by the issuer, the practical impact is limited to a DoS if the issuer does not use fresh salts.

### 3. Malleability of the public chain
The public chain stores only salted hashes. An attacker who sees the hash cannot derive the underlying claim fields without the 32-byte salt and the original JSON.

### 4. Owner key compromise
If the owner’s private key is compromised, an attacker can change fees, authorize issuers, and withdraw accrued ETH. Mitigation: use a multisig or hardware wallet.

---

## Privacy Considerations

- `holder` and `issuer` addresses are visible on-chain. This is standard for ERC-20/ERC-721-style contracts but may expose relationships.
- Credential details (name, organization, etc.) remain off-chain in the private bundle. Only the salted hash is on-chain.
- The `totalVerifications` counter is public and may leak usage patterns.

---

## Recommendations

### Immediate Actions Before Mainnet

1. **Audit by a professional firm** — code review, formal verification, gas analysis.
2. **Use a multisig for `owner`** — replace EOA with Gnosis Safe or similar.
3. **Validate the fee market** — 0.001 ETH is a demo default; it should be validated with actual verifiers.
4. **Consider contract versioning / upgradeability** — the current contract is immutable, so a bug cannot be patched. A proxy pattern or new deployment strategy is needed for long-term maintenance.

### Gas & Optimization

- `verifyCredential` writes the event even when the credential is invalid (unknown/expired/revoked). This may be intentional for receipt keeping, but consider whether a `valid == false` event should still cost the same gas.
- `withdrawFees` uses `.call{value: amount}("")` and checks the boolean return. Ensure the owner address can always receive ETH (do not use a zero-address fallback that reverts).

### Testing Coverage

The existing tests cover happy paths and revert cases. Suggest adding:
- Re-entrancy attempt on `withdrawFees` (the contract is not reentrancy-guarded because no external call occurs inside a state mutation, but a reviewer should confirm).
- Boundary test for `expiresAt == block.timestamp` (currently valid because `block.timestamp <= credential.expiresAt`).
- Fee update + immediate verification in the same block.

---

## Conclusion

The contract is **not production-ready** for uncontrolled mainnet deployment. Before launch:

- Get a professional audit.
- Validate pricing with real verifiers.
- Deploy via a multisig owner.
- Limit the first mainnet deployment to a small, trusted issuer group.

This is a solid educational/demo contract with the right architectural primitives for a paid credential service.
