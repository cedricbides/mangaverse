import { useState } from 'react'
import { Download, Loader, CheckCircle, XCircle } from 'lucide-react'
import axios from 'axios'

interface Props {
  mdxChapterId?: string
  pages?: string[]
  label: string
  mangaId?: string
  mangaTitle?: string
  mangaCover?: string
  chapterNumber?: string
}

type Status = 'idle' | 'fetching' | 'downloading' | 'done' | 'error'

export interface DownloadRecord {
  id: string
  mangaId: string
  mangaTitle: string
  mangaCover: string
  chapterLabel: string
  chapterNumber: string
  downloadedAt: string
  pageCount: number
}

export function getDownloads(): DownloadRecord[] {
  try { return JSON.parse(localStorage.getItem('mv_downloads') || '[]') } catch { return [] }
}

function saveDownload(record: DownloadRecord) {
  const existing = getDownloads().filter(d => d.id !== record.id)
  localStorage.setItem('mv_downloads', JSON.stringify([record, ...existing].slice(0, 200)))
}

export default function DownloadChapterButton({
  mdxChapterId, pages, label,
  mangaId = '', mangaTitle = '', mangaCover = '', chapterNumber = ''
}: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)

  const download = async () => {
    if (status === 'downloading' || status === 'fetching') return
    setStatus('fetching')
    setProgress(0)
    try {
      let pageUrls: string[] = []
      if (pages && pages.length > 0) {
        pageUrls = pages
      } else if (mdxChapterId) {
        const res = await axios.get(`/api/mangadex/chapter-pages/${mdxChapterId}`)
        pageUrls = res.data.pages
      } else {
        throw new Error('No pages available')
      }
      if (pageUrls.length === 0) throw new Error('No pages found')
      setTotal(pageUrls.length)
      setStatus('downloading')
      const JSZip = await loadJSZip()
      const zip = new JSZip()
      const folder = zip.folder(label) as any
      for (let i = 0; i < pageUrls.length; i++) {
        const url = pageUrls[i]
        const ext = url.split('?')[0].split('.').pop() || 'jpg'
        const filename = `page_${String(i + 1).padStart(3, '0')}.${ext}`
        const blob = await fetchImage(url)
        folder.file(filename, blob)
        setProgress(i + 1)
      }
      const content = await zip.generateAsync({ type: 'blob' })
      triggerDownload(content, `${label}.zip`)
      saveDownload({
        id: mdxChapterId || `${mangaId}_${chapterNumber}`,
        mangaId, mangaTitle, mangaCover, chapterLabel: label,
        chapterNumber, downloadedAt: new Date().toISOString(), pageCount: pageUrls.length,
      })
      setStatus('done')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err) {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const isActive = status !== 'idle'
  return (
    <button onClick={download}
      disabled={status === 'downloading' || status === 'fetching'}
      title="Download chapter as ZIP"
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-body border transition-all disabled:cursor-wait ${
        status === 'done' ? 'bg-green-500/10 border-green-500/20 text-green-400'
        : status === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400'
        : isActive ? 'bg-primary/10 border-primary/30 text-primary'
        : 'glass border-white/10 text-text-muted hover:text-primary hover:border-primary/30'
      }`}>
      {status === 'fetching' || status === 'downloading' ? <Loader size={13} className="animate-spin" />
        : status === 'done' ? <CheckCircle size={13} />
        : status === 'error' ? <XCircle size={13} />
        : <Download size={13} />}
      {isActive && <span>
        {status === 'fetching' ? 'Fetching…' : status === 'done' ? 'Saved!' : status === 'error' ? 'Failed' : `${progress}/${total}`}
      </span>}
      {status === 'downloading' && total > 0 && (
        <span className="ml-1 w-12 h-1 bg-white/10 rounded-full overflow-hidden inline-block align-middle">
          <span className="h-full bg-primary rounded-full block transition-all"
            style={{ width: `${Math.round((progress / total) * 100)}%` }} />
        </span>
      )}
    </button>
  )
}

async function fetchImage(url: string): Promise<Blob> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) throw new Error()
    return await res.blob()
  } catch {
    const res = await fetch(`/api/proxy/image?url=${encodeURIComponent(url)}`)
    if (!res.ok) throw new Error('Failed')
    return await res.blob()
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

let _jszip: any = null
async function loadJSZip(): Promise<any> {
  if (_jszip) return _jszip
  return new Promise((resolve, reject) => {
    if ((window as any).JSZip) { _jszip = (window as any).JSZip; return resolve(_jszip) }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
    s.onload = () => { _jszip = (window as any).JSZip; resolve(_jszip) }
    s.onerror = () => reject(new Error('JSZip load failed'))
    document.head.appendChild(s)
  })
}