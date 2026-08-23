import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Clock3, LockKeyhole, LogOut, Plus, Search, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiRequest } from '../api'
import { decryptVaultEntry, encryptVaultEntry } from '../crypto'
import EntryModal from '../components/EntryModal'
import Logo from '../components/Logo'
import PasswordGenerator from '../components/PasswordGenerator'
import VaultCard from '../components/VaultCard'

const categories = ['all', 'login', 'payment', 'recovery', 'note']
const recordId = (record) => record?._id || record?.id

function SkeletonCard() {
  return <div className="animate-pulse rounded-2xl border border-white/[.055] bg-white/[.025] p-4"><div className="mb-6 size-10 rounded-xl bg-white/[.055]" /><div className="mb-2 h-3 w-28 rounded bg-white/[.06]" /><div className="mb-5 h-2 w-40 rounded bg-white/[.035]" /><div className="h-11 rounded-xl bg-black/25" /></div>
}

function EmptyVault({ filtered, onAdd }) {
  return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="col-span-full grid min-h-[340px] place-items-center rounded-[24px] border border-dashed border-white/[.08] bg-gradient-to-b from-white/[.025] to-transparent p-8 text-center"><div><div className="relative mx-auto mb-6 grid size-20 place-items-center rounded-[24px] border border-indigo-400/15 bg-gradient-to-br from-indigo-500/15 to-violet-500/[.03] shadow-[0_0_50px_rgba(99,102,241,.1)]"><ShieldCheck className="size-8 text-indigo-300" /><Sparkles className="absolute -right-1 -top-1 size-4 text-violet-300" /></div><h3 className="mb-2 text-[17px] font-semibold tracking-[-.025em] text-zinc-200">{filtered ? 'No secrets found' : 'Your private vault is ready'}</h3><p className="mx-auto mb-5 max-w-sm text-[11px] leading-5 text-zinc-600">{filtered ? 'Try another search or choose a different category.' : 'Add your first password, recovery code, or private note. It will be encrypted before it leaves this device.'}</p>{!filtered && <button type="button" onClick={onAdd} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-500 px-4 text-[10px] font-semibold text-white shadow-[0_0_25px_rgba(99,102,241,.25)] transition hover:-translate-y-0.5 hover:bg-indigo-400"><Plus className="size-3.5" />Add first entry</button>}</div></motion.div>
}

function ConfirmDelete({ entry, onCancel, onConfirm, busy }) {
  return <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 px-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.section initial={{ scale: .96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .97, opacity: 0 }} className="glass w-full max-w-sm rounded-[22px] p-5"><div className="mb-4 grid size-11 place-items-center rounded-xl border border-red-400/15 bg-red-400/[.08] text-red-300"><Trash2 className="size-4.5" /></div><h2 className="mb-2 text-[18px] font-semibold text-white">Delete this entry?</h2><p className="mb-5 text-[11px] leading-5 text-zinc-500">“{entry.title}” will be permanently removed from your vault. This action cannot be undone.</p><div className="flex justify-end gap-2"><button type="button" onClick={onCancel} className="h-9 rounded-xl px-4 text-[10px] text-zinc-500 hover:bg-white/[.05] hover:text-white">Cancel</button><button type="button" onClick={onConfirm} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-xl bg-red-500/90 px-4 text-[10px] font-semibold text-white hover:bg-red-400 disabled:opacity-50"><Trash2 className="size-3" />{busy ? 'Deleting…' : 'Delete entry'}</button></div></motion.section></motion.div>
}

export default function DashboardPage({ session, onLock }) {
  const { token, vaultKey, user } = session
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [editor, setEditor] = useState(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const displayName = user.name || user.email?.split('@')[0] || 'Vault owner'

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const response = await apiRequest('/api/vault', { token })
        const payload = response?.data || response
        const records = Array.isArray(payload) ? payload : payload?.entries || payload?.vaultEntries || []
        const decrypted = await Promise.all(records.map(async (record) => {
          try { return await decryptVaultEntry(record, vaultKey) }
          catch { return { ...record, title: record.title || 'Encrypted entry', username: '', password: '', notes: '', category: record.category || 'login', decryptError: true } }
        }))
        if (!ignore) setEntries(decrypted)
      } catch (error) {
        if (error.message.toLowerCase().includes('session')) onLock()
        else toast.error(error.message)
      } finally { if (!ignore) setLoading(false) }
    }
    load()
    return () => { ignore = true }
  }, [token, vaultKey, onLock])

  const counts = useMemo(() => ({ all: entries.length, ...Object.fromEntries(categories.slice(1).map((item) => [item, entries.filter((entry) => entry.category === item).length])) }), [entries])
  const visibleEntries = useMemo(() => {
    const search = query.trim().toLowerCase()
    return entries.filter((entry) => (category === 'all' || entry.category === category) && (!search || [entry.title, entry.username, entry.notes, entry.category].some((value) => String(value || '').toLowerCase().includes(search))))
  }, [entries, query, category])

  function addEntry() { setEditor(null); setEditorOpen(true) }
  function editEntry(entry) { setEditor(entry); setEditorOpen(true) }

  async function saveEntry(values) {
    setSaving(true)
    try {
      const encryptedPayload = await encryptVaultEntry(values, vaultKey)
      const id = recordId(editor)
      const response = await apiRequest(id ? `/api/vault/${id}` : '/api/vault', { method: id ? 'PUT' : 'POST', token, body: encryptedPayload })
      const saved = response.entry || response.vaultEntry || response.data || response
      const localEntry = { ...editor, ...saved, ...values, ...encryptedPayload, _id: recordId(saved) || id, updatedAt: saved.updatedAt || new Date().toISOString() }
      setEntries((current) => id ? current.map((entry) => recordId(entry) === id ? localEntry : entry) : [localEntry, ...current])
      setEditorOpen(false)
      setEditor(null)
      toast.success(id ? 'Entry updated securely' : 'Entry encrypted and saved')
    } catch (error) { toast.error(error.message) } finally { setSaving(false) }
  }

  async function deleteEntry() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const id = recordId(deleteTarget)
      await apiRequest(`/api/vault/${id}`, { method: 'DELETE', token })
      setEntries((current) => current.filter((entry) => recordId(entry) !== id))
      setDeleteTarget(null)
      toast.success('Entry deleted')
    } catch (error) { toast.error(error.message) } finally { setDeleting(false) }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#09090b] text-white">
      <div className="ambient-grid pointer-events-none fixed inset-0 opacity-50" /><div className="pointer-events-none fixed -left-40 top-0 size-[420px] rounded-full bg-indigo-700/[.08] blur-[120px]" /><div className="pointer-events-none fixed -right-40 bottom-0 size-[420px] rounded-full bg-violet-700/[.07] blur-[120px]" />
      <header className="sticky top-0 z-30 border-b border-white/[.065] bg-[#09090b]/75 backdrop-blur-2xl"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6"><Logo /><div className="flex items-center gap-2"><span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-400/[.055] px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[.12em] text-emerald-300 sm:flex"><span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />Vault unlocked</span><div className="relative"><button type="button" onClick={() => setUserMenu((value) => !value)} className="flex items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] p-1.5 pr-2 text-left transition hover:bg-white/[.055]"><span className="grid size-7 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-semibold">{displayName.charAt(0).toUpperCase()}</span><span className="hidden text-[10px] font-medium text-zinc-400 sm:block">{displayName}</span><ChevronDown className="size-3 text-zinc-600" /></button><AnimatePresence>{userMenu && <motion.div initial={{ opacity: 0, y: -6, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} className="glass absolute right-0 mt-2 w-52 rounded-xl p-2"><div className="border-b border-white/[.06] px-2 py-2.5"><p className="truncate text-[10px] font-medium text-zinc-300">{displayName}</p><p className="truncate text-[9px] text-zinc-600">{user.email}</p></div><button type="button" onClick={onLock} className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[10px] text-zinc-500 transition hover:bg-white/[.055] hover:text-white"><LogOut className="size-3.5" />Lock and sign out</button></motion.div>}</AnimatePresence></div></div></div></header>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-11">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><span className="mb-3 inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[.2em] text-indigo-400"><ShieldCheck className="size-3.5" />Private by design</span><h1 className="mb-2 text-3xl font-semibold tracking-[-.045em] text-white sm:text-[38px]">Your digital life, secured.</h1><p className="max-w-xl text-[11px] leading-5 text-zinc-600">Passwords, recovery codes, and private notes — encrypted locally and organized beautifully.</p></div><div className="grid grid-cols-2 gap-2 sm:flex"><div className="rounded-xl border border-white/[.06] bg-white/[.025] px-3.5 py-2.5"><span className="mb-1 block text-[8px] uppercase tracking-wider text-zinc-700">Protected items</span><strong className="text-[17px] font-semibold text-zinc-200">{entries.length}</strong></div><div className="rounded-xl border border-white/[.06] bg-white/[.025] px-3.5 py-2.5"><span className="mb-1 block text-[8px] uppercase tracking-wider text-zinc-700">Security</span><strong className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300"><ShieldCheck className="size-3.5" />Excellent</strong></div></div></motion.section>

        <section className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="group relative block w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-700 transition group-focus-within:text-indigo-400" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, usernames, notes…" className="h-11 w-full rounded-xl border border-white/[.07] bg-white/[.025] pl-10 pr-9 text-[11px] text-zinc-200 outline-none transition placeholder:text-zinc-700 hover:border-white/[.11] focus:border-indigo-500/45 focus:bg-white/[.035] focus:ring-4 focus:ring-indigo-500/[.08]" />{query && <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-white"><X className="size-3" /></button>}</label><div className="flex gap-2"><button type="button" onClick={() => setGeneratorOpen(true)} className="flex h-11 items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] px-3.5 text-[10px] font-medium text-zinc-500 transition hover:border-indigo-400/20 hover:bg-indigo-500/[.045] hover:text-indigo-300"><Sparkles className="size-3.5" />Generator</button><motion.button whileHover={{ y: -1 }} whileTap={{ scale: .98 }} type="button" onClick={addEntry} className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 text-[10px] font-semibold text-white shadow-[0_0_28px_rgba(99,102,241,.23)]"><Plus className="size-3.5" />Add new</motion.button></div></section>

        <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-white/[.055] pb-3" aria-label="Vault categories">{categories.map((item) => <button type="button" key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-lg px-3 py-2 text-[9px] font-medium capitalize transition ${category === item ? 'bg-indigo-500/10 text-indigo-300' : 'text-zinc-700 hover:bg-white/[.035] hover:text-zinc-400'}`}>{item}<span className="ml-1.5 text-[8px] opacity-55">{counts[item]}</span></button>)}</nav>

        <AnimatePresence mode="popLayout"><motion.ul layout className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{loading ? Array.from({ length: 8 }, (_, index) => <SkeletonCard key={index} />) : visibleEntries.length ? visibleEntries.map((entry) => <VaultCard key={recordId(entry) || `${entry.title}-${entry.createdAt}`} entry={entry} onEdit={editEntry} onDelete={setDeleteTarget} />) : <EmptyVault filtered={Boolean(query || category !== 'all')} onAdd={addEntry} />}</motion.ul></AnimatePresence>
      </div>

      <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: .95 }} type="button" onClick={addEntry} className="fixed bottom-5 right-5 z-20 grid size-13 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-[0_10px_38px_rgba(99,102,241,.38)] sm:hidden" aria-label="Add vault entry"><Plus className="size-5" /></motion.button>

      <AnimatePresence>{editorOpen && <EntryModal key={editor ? recordId(editor) : 'new'} entry={editor} saving={saving} onSave={saveEntry} onClose={() => { setEditorOpen(false); setEditor(null) }} />}{generatorOpen && <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && setGeneratorOpen(false)}><motion.section initial={{ opacity: 0, y: 20, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: .98 }} className="glass w-full max-w-md rounded-[24px] p-5"><div className="mb-4 flex items-center justify-between"><div><span className="text-[9px] font-semibold uppercase tracking-[.18em] text-indigo-400">Built-in tool</span><h2 className="mt-1 text-[20px] font-semibold tracking-[-.03em] text-white">Password generator</h2></div><button type="button" onClick={() => setGeneratorOpen(false)} className="grid size-8 place-items-center rounded-lg text-zinc-600 hover:bg-white/[.05] hover:text-white"><X className="size-4" /></button></div><PasswordGenerator /></motion.section></motion.div>}{deleteTarget && <ConfirmDelete entry={deleteTarget} busy={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={deleteEntry} />}</AnimatePresence>
      <footer className="relative mx-auto flex max-w-7xl items-center justify-between border-t border-white/[.05] px-4 py-6 text-[8px] uppercase tracking-[.13em] text-zinc-800 sm:px-6"><span className="flex items-center gap-1.5"><LockKeyhole className="size-3" />AES-256-GCM encrypted</span><span className="flex items-center gap-1.5"><Clock3 className="size-3" />Session key stays in memory</span></footer>
    </main>
  )
}
