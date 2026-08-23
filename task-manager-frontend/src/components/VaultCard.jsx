import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, CreditCard, Edit3, Eye, EyeOff, FileKey2, KeyRound, ShieldQuestion, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const categoryMeta = {
  login: { icon: KeyRound, color: 'from-indigo-500/20 to-indigo-500/5 text-indigo-300 border-indigo-400/15' },
  payment: { icon: CreditCard, color: 'from-amber-500/20 to-amber-500/5 text-amber-300 border-amber-400/15' },
  recovery: { icon: ShieldQuestion, color: 'from-emerald-500/20 to-emerald-500/5 text-emerald-300 border-emerald-400/15' },
  note: { icon: FileKey2, color: 'from-fuchsia-500/20 to-fuchsia-500/5 text-fuchsia-300 border-fuchsia-400/15' },
}

export default function VaultCard({ entry, onEdit, onDelete }) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const meta = categoryMeta[entry.category] || categoryMeta.login
  const Icon = meta.icon

  async function copy() {
    try {
      await navigator.clipboard.writeText(entry.password)
      setCopied(true)
      toast.success('Password copied')
      window.setTimeout(() => setCopied(false), 1600)
    } catch { toast.error('Clipboard unavailable') }
  }

  return (
    <motion.li layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .97 }} whileHover={{ y: -4 }} transition={{ duration: .22 }} className="group relative overflow-hidden rounded-2xl border border-white/[.075] bg-gradient-to-br from-white/[.055] to-white/[.018] p-4 shadow-[0_16px_45px_rgba(0,0,0,.18)] backdrop-blur-xl transition-colors hover:border-indigo-400/20">
      <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-indigo-500/[.05] blur-2xl transition group-hover:bg-indigo-500/[.11]" />
      <div className="mb-5 flex items-start justify-between">
        <div className={`grid size-10 place-items-center rounded-xl border bg-gradient-to-br ${meta.color}`}><Icon className="size-4.5" /></div>
        <div className="flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"><button type="button" onClick={() => onEdit(entry)} className="grid size-8 place-items-center rounded-lg text-zinc-600 transition hover:bg-white/[.06] hover:text-zinc-200" aria-label={`Edit ${entry.title}`}><Edit3 className="size-3.5" /></button><button type="button" onClick={() => onDelete(entry)} className="grid size-8 place-items-center rounded-lg text-zinc-600 transition hover:bg-red-400/[.08] hover:text-red-300" aria-label={`Delete ${entry.title}`}><Trash2 className="size-3.5" /></button></div>
      </div>
      <div className="mb-4"><div className="mb-1.5 flex items-center gap-2"><h3 className="truncate text-[14px] font-semibold tracking-[-.02em] text-zinc-100">{entry.title || 'Untitled entry'}</h3><span className="rounded-md bg-white/[.055] px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wider text-zinc-600">{entry.category}</span></div><p className="truncate text-[10px] text-zinc-600">{entry.username || 'No username saved'}</p></div>
      <div className="flex items-center gap-1.5 rounded-xl border border-white/[.055] bg-black/25 p-2 pl-3"><motion.code key={revealed ? 'shown' : 'hidden'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0 flex-1 truncate text-[11px] tracking-[.1em] text-zinc-400">{revealed ? entry.password : '••••••••••••'}</motion.code><button type="button" onClick={() => setRevealed((value) => !value)} className="grid size-7 place-items-center rounded-lg text-zinc-600 transition hover:bg-white/[.06] hover:text-zinc-300" aria-label={revealed ? 'Hide password' : 'Show password'}>{revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</button><button type="button" onClick={copy} disabled={!entry.password} className={`grid size-7 place-items-center rounded-lg transition ${copied ? 'bg-emerald-400/10 text-emerald-300' : 'text-zinc-600 hover:bg-white/[.06] hover:text-zinc-300'}`} aria-label="Copy password">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</button></div>
      {entry.notes && <p className="mt-3 line-clamp-2 text-[9px] leading-4 text-zinc-700">{entry.notes}</p>}
    </motion.li>
  )
}
