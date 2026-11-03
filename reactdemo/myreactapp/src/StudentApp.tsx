import { useState, type FormEvent } from 'react'
import {
  BrowserProvider,
  Contract,
  type ContractTransactionResponse,
  type InterfaceAbi,
} from 'ethers'
import './StudentApp.css'

type Student = {
  rolenum: bigint
  name: string
  course: string
  year: bigint
  semester: bigint
  cgpa: bigint
}

type StudentRegistry = {
  addStudent: (
    rolenum: bigint,
    name: string,
    course: string,
    year: bigint,
    semester: bigint,
    cgpa: bigint,
  ) => Promise<ContractTransactionResponse>
  listAllStudents: () => Promise<readonly [bigint, string, string, bigint, bigint, bigint][]>
  modifyCgpa: (rolenum: bigint, cgpa: bigint) => Promise<ContractTransactionResponse>
  deleteStudent: (rolenum: bigint) => Promise<ContractTransactionResponse>
}

type Artifact = {
  abi: InterfaceAbi
  networks: Record<string, { address: string }>
}

type StudentForm = {
  rolenum: string
  name: string
  course: string
  year: string
  semester: string
  cgpa: string
}

const emptyForm: StudentForm = {
  rolenum: '',
  name: '',
  course: '',
  year: '',
  semester: '',
  cgpa: '',
}

function StudentApp() {
  const [registry, setRegistry] = useState<StudentRegistry | null>(null)
  const [account, setAccount] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [form, setForm] = useState(emptyForm)
  const [cgpaEdits, setCgpaEdits] = useState<Record<string, string>>({})
  const [status, setStatus] = useState('Connect MetaMask to view the registry.')
  const [statusKind, setStatusKind] = useState<'info' | 'error' | 'success'>('info')
  const [busy, setBusy] = useState(false)

  function report(message: string, kind: 'info' | 'error' | 'success' = 'info') {
    setStatus(message)
    setStatusKind(kind)
  }

  async function refreshStudents(contract = registry) {
    if (!contract) return
    const rows = await contract.listAllStudents()
    setStudents(rows.map(([rolenum, name, course, year, semester, cgpa]) => ({
      rolenum,
      name,
      course,
      year,
      semester,
      cgpa,
    })))
  }

  async function connectWallet() {
    const injectedProvider = (window as Window & {
      ethereum?: ConstructorParameters<typeof BrowserProvider>[0]
    }).ethereum
    if (!injectedProvider) {
      report('MetaMask was not detected. Install it and select Ganache Local.', 'error')
      return
    }

    setBusy(true)
    try {
      const provider = new BrowserProvider(injectedProvider)
      await provider.send('eth_requestAccounts', [])
      const network = await provider.getNetwork()
      if (network.chainId !== 1337n) {
        throw new Error('Switch MetaMask to Ganache Local (chain ID 1337).')
      }

      const response = await fetch(`${import.meta.env.BASE_URL}contracts/StudentRegistry.json`)
      if (!response.ok) throw new Error('Student contract artifact missing. Run npm run sync:contracts.')
      const artifact = await response.json() as Artifact
      const deployment = artifact.networks['5777']
      if (!deployment?.address) throw new Error('StudentRegistry has not been deployed to Ganache.')

      const signer = await provider.getSigner()
      const connected = new Contract(deployment.address, artifact.abi, signer) as unknown as StudentRegistry
      setRegistry(connected)
      setAccount(await signer.getAddress())
      await refreshStudents(connected)
      report('Connected to Ganache Local. Student records are public on this chain.', 'success')
    } catch (error) {
      report(error instanceof Error ? error.message : 'Wallet connection failed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!registry) {
      report('Connect MetaMask before adding a student.', 'error')
      return
    }

    setBusy(true)
    try {
      const transaction = await registry.addStudent(
        BigInt(form.rolenum),
        form.name.trim(),
        form.course.trim(),
        BigInt(form.year),
        BigInt(form.semester),
        BigInt(form.cgpa),
      )
      await transaction.wait()
      setForm(emptyForm)
      await refreshStudents()
      report('Student record added.', 'success')
    } catch (error) {
      report(error instanceof Error ? error.message : 'Could not add student.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function updateCgpa(rolenum: bigint) {
    if (!registry) return
    const value = cgpaEdits[rolenum.toString()]
    if (!value || !/^\d+$/.test(value)) {
      report('Enter CGPA as an integer value.', 'error')
      return
    }

    setBusy(true)
    try {
      await (await registry.modifyCgpa(rolenum, BigInt(value))).wait()
      await refreshStudents()
      report(`CGPA updated for roll number ${rolenum}.`, 'success')
    } catch (error) {
      report(error instanceof Error ? error.message : 'Could not update CGPA.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function removeStudent(rolenum: bigint) {
    if (!registry) return
    setBusy(true)
    try {
      await (await registry.deleteStudent(rolenum)).wait()
      await refreshStudents()
      report(`Student ${rolenum} deleted.`, 'success')
    } catch (error) {
      report(error instanceof Error ? error.message : 'Could not delete student.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="student-shell">
      <header className="student-header">
        <div>
          <p className="student-eyebrow">LOCAL GANACHE · CHAIN 1337</p>
          <h1>Student Registry</h1>
        </div>
        <button className="connect-button" onClick={connectWallet} disabled={busy}>
          {account ? 'Reconnect wallet' : 'Connect MetaMask'}
        </button>
      </header>

      <section className={`student-status status-${statusKind}`} role="status">{status}</section>
      {account && <p className="account-line">Connected account <span>{account}</span></p>}

      <div className="student-layout">
        <section className="student-form-section" aria-labelledby="add-heading">
          <div className="section-heading">
            <div>
              <p className="student-eyebrow">ACADEMIC RECORDS</p>
              <h2 id="add-heading">Add student</h2>
            </div>
            <span>{students.length} records</span>
          </div>
          <form onSubmit={addStudent}>
            <div className="student-fields">
              <label>Roll number<input required type="number" min="1" value={form.rolenum} onChange={event => setForm({ ...form, rolenum: event.target.value })} /></label>
              <label>Student name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
              <label>Course<input required value={form.course} onChange={event => setForm({ ...form, course: event.target.value })} /></label>
              <label>Year<input required type="number" min="1" value={form.year} onChange={event => setForm({ ...form, year: event.target.value })} /></label>
              <label>Semester<input required type="number" min="1" value={form.semester} onChange={event => setForm({ ...form, semester: event.target.value })} /></label>
              <label>CGPA (integer)<input required type="number" min="0" value={form.cgpa} onChange={event => setForm({ ...form, cgpa: event.target.value })} /></label>
            </div>
            <button className="primary-button" type="submit" disabled={busy || !registry}>Add record</button>
          </form>
        </section>

        <section className="student-records" aria-labelledby="records-heading">
          <div className="section-heading">
            <div>
              <p className="student-eyebrow">ON-CHAIN LIST</p>
              <h2 id="records-heading">Students</h2>
            </div>
            <button className="secondary-button" onClick={() => refreshStudents()} disabled={busy || !registry}>Refresh</button>
          </div>

          {students.length === 0 ? (
            <p className="empty-state">{registry ? 'No student records yet.' : 'Connect your wallet to load records.'}</p>
          ) : (
            <div className="student-list">
              {students.map(student => (
                <article className="student-row" key={student.rolenum.toString()}>
                  <div className="student-main">
                    <span className="student-id">#{student.rolenum.toString()}</span>
                    <div>
                      <h3>{student.name}</h3>
                      <p>{student.course} · Year {student.year.toString()} · Semester {student.semester.toString()}</p>
                    </div>
                    <strong className="cgpa-value">{student.cgpa.toString()}</strong>
                  </div>
                  <div className="student-actions">
                    <label>New CGPA<input type="number" min="0" value={cgpaEdits[student.rolenum.toString()] ?? ''} onChange={event => setCgpaEdits({ ...cgpaEdits, [student.rolenum.toString()]: event.target.value })} /></label>
                    <button className="secondary-button" onClick={() => updateCgpa(student.rolenum)} disabled={busy}>Update</button>
                    <button className="delete-button" onClick={() => removeStudent(student.rolenum)} disabled={busy}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <p className="privacy-note">Ganache is for learning. Student information written to a public blockchain is visible and permanent; do not enter real personal data.</p>
    </main>
  )
}

export default StudentApp