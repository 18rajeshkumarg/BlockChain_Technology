import { useState, type FormEvent } from 'react'
import {
  BrowserProvider,
  Contract,
  ContractFactory,
  formatEther,
  hexlify,
  isAddress,
  keccak256,
  parseEther,
  randomBytes,
  toUtf8Bytes,
  type ContractTransactionResponse,
  type EventLog,
  type InterfaceAbi,
} from 'ethers'
import './CredentialApp.css'

type DeploymentNetwork = 'sepolia' | 'mainnet'

const NETWORKS: Record<DeploymentNetwork, { chainId: bigint; chainIdHex: string; label: string; storageKey: string }> = {
  sepolia: {
    chainId: 11155111n,
    chainIdHex: '0xaa36a7',
    label: 'Sepolia',
    storageKey: 'credential-service:sepolia:address',
  },
  mainnet: {
    chainId: 1n,
    chainIdHex: '0x1',
    label: 'Ethereum Mainnet',
    storageKey: 'credential-service:mainnet:address',
  },
}

type InjectedProvider = ConstructorParameters<typeof BrowserProvider>[0]

type CredentialService = {
  owner: () => Promise<string>
  verificationFee: () => Promise<bigint>
  totalVerifications: () => Promise<bigint>
  issueCredential: (hash: string, holder: string, expiry: bigint) => Promise<ContractTransactionResponse>
  verifyCredential: (hash: string, overrides: { value: bigint }) => Promise<ContractTransactionResponse>
  setVerificationFee: (fee: bigint) => Promise<ContractTransactionResponse>
  withdrawFees: () => Promise<ContractTransactionResponse>
}

type CredentialArtifact = {
  abi: InterfaceAbi
  bytecode: string
}

type CredentialClaim = {
  salt: string
  holder: string
  fullName: string
  organization: string
  qualification: string
  credentialNumber: string
  expiresAt: string
}

type CredentialBundle = CredentialClaim & { credentialHash: string }

type VerificationRecord = {
  credentialHash: string
  verifier: string
  valid: boolean
  fee: bigint
  verifiedAt: bigint
}

async function loadArtifact(): Promise<CredentialArtifact> {
  const response = await fetch(`${import.meta.env.BASE_URL}contracts/CredentialService.json`)
  if (!response.ok) throw new Error('CredentialService artifact is missing. Run npm run sync:contracts.')
  return await response.json() as CredentialArtifact
}

function hashClaim(claim: CredentialClaim): string {
  return keccak256(toUtf8Bytes(JSON.stringify(claim)))
}

function CredentialApp() {
  const [targetNetwork, setTargetNetwork] = useState<DeploymentNetwork>('sepolia')
  const [injectedProvider, setInjectedProvider] = useState<InjectedProvider | null>(null)
  const [signerAddress, setSignerAddress] = useState('')
  const [serviceAddress, setServiceAddress] = useState(() => localStorage.getItem(NETWORKS.sepolia.storageKey) ?? '')
  const [service, setService] = useState<CredentialService | null>(null)
  const [ownerAddress, setOwnerAddress] = useState('')
  const [fee, setFee] = useState('')
  const [verificationCount, setVerificationCount] = useState('0')
  const [newFee, setNewFee] = useState('0.001')
  const [bundleText, setBundleText] = useState('')
  const [verificationBundle, setVerificationBundle] = useState('')
  const [history, setHistory] = useState<VerificationRecord[]>([])
  const [status, setStatus] = useState('Connect MetaMask on Sepolia to begin.')
  const [statusKind, setStatusKind] = useState<'info' | 'error' | 'success'>('info')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    holder: '',
    fullName: '',
    organization: '',
    qualification: '',
    credentialNumber: '',
    expiresAt: '',
  })

  function report(message: string, kind: 'info' | 'error' | 'success' = 'info') {
    setStatus(message)
    setStatusKind(kind)
  }

  async function loadHistory(address: string, provider: InjectedProvider) {
    try {
      const artifact = await loadArtifact()
      const browserProvider = new BrowserProvider(provider)
      const contract = new Contract(address, artifact.abi, browserProvider)
      const filter = contract.filters.CredentialVerified()
      const events = await contract.queryFilter(filter, 0, 'latest')
      const records: VerificationRecord[] = events.map(event => {
        const parsed = (event as EventLog).args
        return {
          credentialHash: String(parsed.credentialHash ?? parsed[0]),
          verifier: String(parsed.verifier ?? parsed[1]),
          valid: Boolean(parsed.valid ?? parsed[2]),
          fee: BigInt(parsed.fee ?? parsed[3]),
          verifiedAt: BigInt(parsed.verifiedAt ?? parsed[4]),
        }
      })
      setHistory(records.reverse())
    } catch {
      setHistory([])
    }
  }

  async function selectNetwork(provider: InjectedProvider, networkName: DeploymentNetwork): Promise<BrowserProvider> {
    const target = NETWORKS[networkName]
    let browserProvider = new BrowserProvider(provider)
    await browserProvider.send('eth_requestAccounts', [])
    let network = await browserProvider.getNetwork()

    if (network.chainId !== target.chainId) {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: target.chainIdHex }],
        })
      } catch (error) {
        const walletError = error as { code?: number }
        if (walletError.code !== 4902 || networkName !== 'sepolia') {
          throw new Error(`Switch MetaMask to ${target.label} before continuing.`)
        }
        await provider.request({ method: 'wallet_addEthereumChain', params: [{
          chainId: target.chainIdHex,
          chainName: 'Sepolia',
          nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
          blockExplorerUrls: ['https://sepolia.etherscan.io'],
        }] })
      }
      browserProvider = new BrowserProvider(provider)
      network = await browserProvider.getNetwork()
    }

    if (network.chainId !== target.chainId) throw new Error(`Select ${target.label} in MetaMask to continue.`)
    return browserProvider
  }

  function changeNetwork(networkName: DeploymentNetwork) {
    setTargetNetwork(networkName)
    setService(null)
    setOwnerAddress('')
    setSignerAddress('')
    setFee('')
    setVerificationCount('0')
    setHistory([])
    setServiceAddress(localStorage.getItem(NETWORKS[networkName].storageKey) ?? '')
    report(networkName === 'mainnet'
      ? 'Mainnet uses real ETH and irreversible transactions. Confirm every wallet prompt carefully.'
      : 'Sepolia test ETH has no cash value.')
  }

  async function connectWallet() {
    const provider = (window as Window & { ethereum?: InjectedProvider }).ethereum
    if (!provider) {
      report('MetaMask was not detected in this browser.', 'error')
      return
    }

    setBusy(true)
    try {
      const browserProvider = await selectNetwork(provider, targetNetwork)
      const signer = await browserProvider.getSigner()
      setInjectedProvider(provider)
      setSignerAddress(await signer.getAddress())

      const savedAddress = localStorage.getItem(NETWORKS[targetNetwork].storageKey) ?? ''
      setServiceAddress(savedAddress)
      if (savedAddress) await attachService(provider, savedAddress)
      else report(`Connected to ${NETWORKS[targetNetwork].label}. Deploy the credential contract to activate the service.`, 'success')
    } catch (error) {
      report(error instanceof Error ? error.message : 'Wallet connection failed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function attachService(provider: InjectedProvider, address: string) {
    if (!isAddress(address)) throw new Error('The saved credential contract address is invalid.')
    const artifact = await loadArtifact()
    const browserProvider = await selectNetwork(provider, targetNetwork)

    // Verify the contract actually exists on this network before calling it
    const code = await browserProvider.getCode(address)
    if (code === '0x') {
      throw new Error(
        `No contract is deployed at ${address} on ${NETWORKS[targetNetwork].label}. ` +
        'Please deploy first or enter a valid contract address.'
      )
    }

    const signer = await browserProvider.getSigner()
    const contract = new Contract(address, artifact.abi, signer) as unknown as CredentialService
    const [owner, verificationFee, count] = await Promise.all([
      contract.owner(),
      contract.verificationFee(),
      contract.totalVerifications(),
    ])
    setService(contract)
    setServiceAddress(address)
    setOwnerAddress(owner)
    setFee(formatEther(verificationFee))
    setVerificationCount(count.toString())
    report(`Credential service connected on ${NETWORKS[targetNetwork].label}.`, 'success')
    await loadHistory(address, provider)
  }

  async function deployService() {
    if (!injectedProvider) {
      report('Connect MetaMask first.', 'error')
      return
    }
    if (targetNetwork === 'mainnet' && !window.confirm('This will deploy CredentialService to Ethereum Mainnet and spend real ETH. Transactions are irreversible. Continue only after a security review and checking the gas estimate in MetaMask.')) {
      return
    }

    setBusy(true)
    try {
      const artifact = await loadArtifact()
      const browserProvider = await selectNetwork(injectedProvider, targetNetwork)
      const signer = await browserProvider.getSigner()
      const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer)
      report(`Confirm the ${NETWORKS[targetNetwork].label} deployment in MetaMask.`)
      const deployed = await factory.deploy()
      await deployed.waitForDeployment()
      const address = await deployed.getAddress()
      localStorage.setItem(NETWORKS[targetNetwork].storageKey, address)
      setServiceAddress(address)
      await attachService(injectedProvider, address)
    } catch (error) {
      report(error instanceof Error ? error.message : 'Deployment failed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function issueCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!service || !isAddress(form.holder)) {
      report('Connect the deployed service and enter a valid holder address.', 'error')
      return
    }

    setBusy(true)
    try {
      const salt = hexlify(randomBytes(32))
      const expiresAt = form.expiresAt ? BigInt(Math.floor(new Date(form.expiresAt).getTime() / 1000)) : 0n
      const claim: CredentialClaim = {
        salt,
        holder: form.holder.toLowerCase(),
        fullName: form.fullName.trim(),
        organization: form.organization.trim(),
        qualification: form.qualification.trim(),
        credentialNumber: form.credentialNumber.trim(),
        expiresAt: expiresAt.toString(),
      }
      const credentialHash = hashClaim(claim)
      report('Confirm credential issuance in MetaMask.')
      await (await service.issueCredential(credentialHash, form.holder, expiresAt)).wait()

      const bundle: CredentialBundle = { ...claim, credentialHash }
      const serialized = JSON.stringify(bundle, null, 2)
      setBundleText(serialized)
      setVerificationBundle(serialized)
      setForm({ holder: '', fullName: '', organization: '', qualification: '', credentialNumber: '', expiresAt: '' })
      report('Credential issued. Copy the private verification bundle to the holder.', 'success')
    } catch (error) {
      report(error instanceof Error ? error.message : 'Credential issuance failed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function verifyCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!service) {
      report('Connect MetaMask and deploy or attach the Sepolia contract first.', 'error')
      return
    }

    setBusy(true)
    try {
      const bundle = JSON.parse(verificationBundle) as CredentialBundle
      const claim: CredentialClaim = {
        salt: bundle.salt,
        holder: bundle.holder,
        fullName: bundle.fullName,
        organization: bundle.organization,
        qualification: bundle.qualification,
        credentialNumber: bundle.credentialNumber,
        expiresAt: bundle.expiresAt,
      }
      const computedHash = hashClaim(claim)
      if (computedHash.toLowerCase() !== bundle.credentialHash.toLowerCase()) {
        throw new Error('Bundle hash mismatch. The credential details may have changed.')
      }

      const verificationFee = parseEther(fee)
      report(`Confirm the ${fee} ${NETWORKS[targetNetwork].label} verification fee in MetaMask.`)
      const receipt = await (await service.verifyCredential(computedHash, { value: verificationFee })).wait()
      let isValid = false
      for (const log of receipt?.logs ?? []) {
        try {
          const parsed = new Contract(serviceAddress, (await loadArtifact()).abi).interface.parseLog(log)
          if (parsed?.name === 'CredentialVerified') isValid = parsed.args.valid
        } catch {
          // Ignore logs emitted by other contracts.
        }
      }
      const count = await service.totalVerifications()
      setVerificationCount(count.toString())
      report(isValid ? `Verified. The credential is active; the paid receipt is on ${NETWORKS[targetNetwork].label}.` : 'Verification complete: this credential is unknown, expired, or revoked.', isValid ? 'success' : 'error')
      if (injectedProvider) await loadHistory(serviceAddress, injectedProvider)
    } catch (error) {
      report(error instanceof Error ? error.message : 'Verification failed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function updateFee() {
    if (!service) return
    setBusy(true)
    try {
      await (await service.setVerificationFee(parseEther(newFee))).wait()
      setFee(newFee)
      report('Per-verification fee updated.', 'success')
    } catch (error) {
      report(error instanceof Error ? error.message : 'Could not update fee.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function withdrawFees() {
    if (!service) return
    setBusy(true)
    try {
      await (await service.withdrawFees()).wait()
      report(`Accumulated ${NETWORKS[targetNetwork].label} fees withdrawn to the contract owner.`, 'success')
    } catch (error) {
      report(error instanceof Error ? error.message : 'Fee withdrawal failed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const normalizedSigner = signerAddress.trim().toLowerCase()
  const normalizedOwner = ownerAddress.trim().toLowerCase()
  const isOwner = Boolean(normalizedSigner && normalizedOwner && normalizedSigner === normalizedOwner)

  return (
    <main className="credential-shell">
      <header className="credential-header">
        <div>
          <p className="credential-eyebrow">{NETWORKS[targetNetwork].label.toUpperCase()} · PER-VERIFICATION RECEIPTS</p>
          <h1>Credential Verification</h1>
        </div>
        <div className="header-actions">
          <label className="network-select">Deployment network
            <select value={targetNetwork} onChange={event => changeNetwork(event.target.value as DeploymentNetwork)}>
              <option value="sepolia">Sepolia testnet</option>
              <option value="mainnet">Ethereum Mainnet</option>
            </select>
          </label>
          <span className="network-chip">{targetNetwork === 'sepolia' ? 'Test ETH · no cash value' : 'Real ETH · irreversible'}</span>
          <button className="credential-primary" onClick={connectWallet} disabled={busy}>
            {signerAddress ? 'Wallet connected' : 'Connect MetaMask'}
          </button>
        </div>
      </header>

      <details className="how-it-works">
        <summary>How it works</summary>
        <div className="how-it-works-body">
          <p><strong>Salted hash privacy model.</strong> Personal details never go on-chain. The issuer bundles a random 32-byte salt with the holder's name, organization, qualification, credential number, and expiry, then stores only the keccak256 hash of that JSON claim. Anyone can recompute the hash from the private bundle, and the contract checks it matches, but nobody can reverse the hash to recover the name or other fields.</p>
          <p>The holder keeps the bundle (including the salt) off-chain and shares it only with verifiers they trust. Verifiers pay a small fee, submit the recomputed hash, and the contract records a paid receipt: hash prefix, verifier address, valid/invalid, timestamp, and fee. The receipt proves a verification happened at a specific time — without revealing who the credential belongs to.</p>
        </div>
      </details>

      <p className={`credential-status status-${statusKind}`} role="status">{status}</p>
      <div className="contract-line">
        <span>{signerAddress ? `Wallet ${signerAddress}` : 'Wallet not connected'}</span>
        <span>{serviceAddress ? `Contract ${serviceAddress}` : 'Contract not deployed'}</span>
      </div>

      {!serviceAddress ? (
        <section className="deployment-section">
          <div>
            <p className="credential-eyebrow">FIRST-TIME SETUP</p>
            <h2>Deploy to {NETWORKS[targetNetwork].label}</h2>
            <p>{targetNetwork === 'sepolia'
              ? 'MetaMask will show the testnet transaction before you approve it.'
              : 'Mainnet costs real ETH. Deploy only after an independent security review and careful gas review.'}</p>
          </div>
          <button className="credential-primary" onClick={deployService} disabled={busy || !signerAddress}>
            Deploy on {targetNetwork === 'sepolia' ? 'Sepolia' : 'Mainnet'}
          </button>

          <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #444' }}>
            <p className="credential-eyebrow">OR CONNECT EXISTING</p>
            <h3>Already deployed?</h3>
            <label>
              Contract address
              <input
                type="text"
                placeholder="0x..."
                defaultValue={localStorage.getItem(NETWORKS[targetNetwork].storageKey) ?? ''}
                onBlur={async (event) => {
                  const addr = event.target.value.trim()
                  if (addr && isAddress(addr)) {
                    localStorage.setItem(NETWORKS[targetNetwork].storageKey, addr)
                    if (injectedProvider) await attachService(injectedProvider, addr)
                  }
                }}
              />
            </label>
          </div>
        </section>
      ) : (
        <>
          <section className="business-strip">
            <div>
              <p className="credential-eyebrow">REVENUE MODEL</p>
              <strong>{fee || '0.001'} {NETWORKS[targetNetwork].label} ETH per on-chain verification receipt</strong>
              <span>{verificationCount} paid receipts recorded on this contract</span>
            </div>
            {isOwner && (
              <div className="owner-controls">
                <label>Fee (ETH)<input type="number" min="0" step="0.0001" value={newFee} onChange={event => setNewFee(event.target.value)} /></label>
                <button className="secondary-button" onClick={updateFee} disabled={busy}>Set fee</button>
                <button className="secondary-button" onClick={withdrawFees} disabled={busy}>Withdraw fees</button>
              </div>
            )}
          </section>

          <div className="credential-grid">
            <section>
              <div className="credential-section-title">
                <div><p className="credential-eyebrow">ISSUER WORKFLOW</p><h2>Issue a credential</h2></div>
              </div>
              <form className="credential-form" onSubmit={issueCredential}>
                <label>Holder wallet address<input required value={form.holder} onChange={event => setForm({ ...form, holder: event.target.value })} placeholder="0x…" /></label>
                <label>Full name (kept in the bundle only)<input required value={form.fullName} onChange={event => setForm({ ...form, fullName: event.target.value })} /></label>
                <label>Issuing organization<input required value={form.organization} onChange={event => setForm({ ...form, organization: event.target.value })} /></label>
                <label>Credential or qualification<input required value={form.qualification} onChange={event => setForm({ ...form, qualification: event.target.value })} /></label>
                <label>Credential number<input required value={form.credentialNumber} onChange={event => setForm({ ...form, credentialNumber: event.target.value })} /></label>
                <label>Expiry (optional)<input type="date" value={form.expiresAt} onChange={event => setForm({ ...form, expiresAt: event.target.value })} /></label>
                <button className="credential-primary" type="submit" disabled={busy || !service}>Issue hashed credential</button>
              </form>
              {bundleText && <label className="bundle-field">Private holder bundle<textarea readOnly value={bundleText} rows={7} /><button className="secondary-button" type="button" onClick={() => navigator.clipboard.writeText(bundleText)}>Copy bundle</button></label>}
            </section>

            <section>
              <div className="credential-section-title">
                <div><p className="credential-eyebrow">VERIFIER WORKFLOW</p><h2>Verify and record receipt</h2></div>
              </div>
              <form className="credential-form" onSubmit={verifyCredential}>
                <label>Paste holder's verification bundle<textarea required value={verificationBundle} onChange={event => setVerificationBundle(event.target.value)} rows={12} placeholder="Paste the JSON bundle shared by the holder" /></label>
                <button className="credential-primary" type="submit" disabled={busy || !service}>Pay {fee || '0.001'} {NETWORKS[targetNetwork].label} ETH and verify</button>
              </form>
              <p className="verifier-note">This transaction records a paid verification receipt. Public-chain events are visible; the claim fields remain off-chain.</p>
            </section>
          </div>

          <section className="history-section">
            <div className="credential-section-title">
              <div><p className="credential-eyebrow">VERIFICATION LEDGER</p><h2>Past verifications</h2></div>
              </div>
              {history.length === 0 ? (
                <p className="verifier-note">No verification receipts recorded on this contract yet.</p>
              ) : (
                <ul className="history-list">
                  {history.map((record, index) => (
                    <li className="history-row" key={`${record.credentialHash}-${index}`}>
                      <span className="history-hash" title={record.credentialHash}>{record.credentialHash.slice(0, 10)}…{record.credentialHash.slice(-6)}</span>
                      <span className="history-verifier" title={record.verifier}>{record.verifier.slice(0, 8)}…{record.verifier.slice(-4)}</span>
                      <span className={record.valid ? 'history-badge history-valid' : 'history-badge history-invalid'}>{record.valid ? 'Valid' : 'Invalid'}</span>
                      <span className="history-time">{new Date(Number(record.verifiedAt) * 1000).toLocaleString()}</span>
                      <span className="history-fee">{formatEther(record.fee)} ETH</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
        </>
      )}

      <footer className="credential-footnote">
        {targetNetwork === 'sepolia'
          ? <><strong>Testnet only:</strong> Sepolia ETH is not money. Never issue real personal data on a public chain; use salted hashes and share the private bundle securely. Public verification events and wallet addresses remain visible.</>
          : <><strong>Mainnet warning:</strong> transactions spend real ETH and are irreversible. Only use after independent security, privacy, legal, and pricing review. Do not put real personal data on-chain.</>}
      </footer>
    </main>
  )
}

export default CredentialApp
