import { useState, useEffect } from 'react'
import { BookOpen, CheckCircle, Clock, XCircle, PauseCircle, ChevronDown } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '@/context/AuthContext'

export type ReadingStatus = 'reading' | 'completed' | 'plan_to_read' | 'dropped' | 'on_hold' | null

const STATUS_CONFIG: Record<Exclude<ReadingStatus, null>, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  reading:      { label: 'Reading',      icon: BookOpen,     color: 'text-green-400',  bg: 'bg-green-500/20 border-green-500/40' },
  completed:    { label: 'Completed',    icon: CheckCircle,  color: 'text-blue-400',   bg: 'bg-blue-500/20 border-blue-500/40' },
  plan_to_read: { label: 'Plan to Read', icon: Clock,        color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/40' },
  on_hold:      { label: 'On Hold',      icon: PauseCircle,  color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/40' },
  dropped:      { label: 'Dropped',      icon: XCircle,      color: 'text-red-400',    bg: 'bg-red-500/20 border-red-500/40' },
}

interface Props {
  mangaId: string
}

export default function ReadingListButton({ mangaId }: Props) {
  const { user } = useAuth()
  const [status, setStatus] = useState<ReadingStatus>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user || !mangaId) return
    axios.get(`/api/social/reading-list/${mangaId}`, { withCredentials: true })
      .then(res => setStatus(res.data.status))
      .catch(() => {})
  }, [user, mangaId])

  if (!user) return null

  const setReadingStatus = async (newStatus: ReadingStatus) => {
    setSaving(true)
    setOpen(false)
    try {
      const res = await axios.post('/api/social/reading-list', { mangaId, status: newStatus }, { withCredentials: true })
      setStatus(res.data.status)
    } catch {}
    setSaving(false)
  }

  const current = status ? STATUS_CONFIG[status] : null
  const CurrentIcon = current?.icon || BookOpen

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={saving}
        className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-body border transition-all disabled:opacity-50 ${
          current ? `${current.bg} ${current.color}` : 'glass border-white/10 text-text-muted hover:border-primary/30 hover:text-text'
        }`}
      >
        <CurrentIcon size={15} />
        {current ? current.label : 'Add to List'}
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-48 glass border border-white/10 rounded-2xl p-1.5 z-50 shadow-2xl">
          {(Object.entries(STATUS_CONFIG) as [Exclude<ReadingStatus, null>, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => {
            const Icon = cfg.icon
            return (
              <button
                key={key}
                onClick={() => setReadingStatus(status === key ? null : key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-body transition-all text-left ${
                  status === key ? `${cfg.bg} ${cfg.color}` : 'text-text-muted hover:text-text hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                {cfg.label}
                {status === key && <span className="ml-auto text-[10px] opacity-60">✓ Remove</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}