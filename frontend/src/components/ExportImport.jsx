import { useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <div className="flex items-center gap-3">
      <a href="/api/export" download="expense_buddy.db">
        <Button variant="outline" size="sm">
          <Download size={14} className="mr-1" /> Export DB
        </Button>
      </a>

      <label>
        <Button variant="outline" size="sm" asChild>
          <span>
            <Upload size={14} className="mr-1" />
            {importing ? 'Importing…' : 'Import DB'}
          </span>
        </Button>
        <input
          type="file"
          accept=".db"
          className="hidden"
          onChange={handleImport}
          disabled={importing}
        />
      </label>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="py-2 px-3 text-xs">
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
