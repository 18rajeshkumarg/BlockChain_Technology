import { copyFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

// Absolute paths based on the project structure
// Project root: /c/Users/asha g/Documents/BlockChain Project
const projectRoot = resolve('c:/Users/asha g/Documents/BlockChain Project')

// Hardhat artifacts location
const hardhatArtifacts = resolve(projectRoot, 'hardhat-lock/artifacts/contracts/CredentialService.sol/CredentialService.json')

// React app's public/contracts directory
const contractsDir = resolve(projectRoot, 'reactdemo/myreactapp/public/contracts')

// Ensure the contracts directory exists
await mkdir(contractsDir, { recursive: true })

// Copy CredentialService artifact from Hardhat to React app
try {
  await copyFile(hardhatArtifacts, resolve(contractsDir, 'CredentialService.json'))
  console.log(`Copied CredentialService artifact from ${hardhatArtifacts} to ${contractsDir}`)
} catch (error) {
  console.warn(`Failed to copy CredentialService artifact: ${error.message}`)
}

// StudentRegistry.json - check if it exists in the build output
const studentRegistrySource = resolve(projectRoot, 'reactdemo/myreactapp/dist/contracts/StudentRegistry.json')
const studentRegistryTarget = resolve(contractsDir, 'StudentRegistry.json')

try {
  await copyFile(studentRegistrySource, studentRegistryTarget)
  console.log(`Copied StudentRegistry artifact from ${studentRegistrySource}`)
} catch (error) {
  console.warn(`StudentRegistry artifact not found at ${studentRegistrySource}: ${error.message}`)
}

console.log(`Synced contract artifacts to ${contractsDir}`)