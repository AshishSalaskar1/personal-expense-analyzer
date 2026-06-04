import { useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { importDB } from '@/api/client'

export default function ExportImport() {
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState(null)

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setMessage(null)
    try {
      const fd = new FormData()
      fd.append('db_file', file)
      await importDB(fd)
      setMessage({ type: 'success', text: 'Database imported successfully. Refresh to see updated data.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Import failed' })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href="/api/export"
        download="expense_buddy.db"
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-center text-xs font-semibold leading-tight text-foreground no-underline shadow-sm transition-colors hover:border-primary/45 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Download size={15} /> Export DB
      </a>

      <label>
        <span className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-center text-xs font-semibold leading-tight text-foreground shadow-sm transition-colors hover:border-primary/45 hover:bg-primary/5 hover:text-primary">
            <Upload size={15} />
            {importing ? 'Importing…' : 'Import DB'}
        </span>
        <input
          type="file"
          accept=".db"
          className="hidden"
          onChange={handleImport}
          disabled={importing}
        />
      </label>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="px-3 py-2 text-xs">
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
