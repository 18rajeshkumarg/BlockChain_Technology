import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = resolve(scriptDirectory, '../../..')
const artifactPath = resolve(
  workspaceRoot,
  'programs_blockchain/dapps/studentapp/build/contracts/StudentRegistry.json',
)
const credentialArtifactPath = resolve(
  workspaceRoot,
  'hardhat-lock/artifacts/contracts/CredentialService.sol/CredentialService.json',
)
const contractsDirectory = resolve(scriptDirectory, '../public/contracts')

await mkdir(contractsDirectory, { recursive: true })
await copyFile(artifactPath, resolve(contractsDirectory, 'StudentRegistry.json'))
await copyFile(credentialArtifactPath, resolve(contractsDirectory, 'CredentialService.json'))
console.log(`Synced StudentRegistry and CredentialService artifacts to ${contractsDirectory}`)