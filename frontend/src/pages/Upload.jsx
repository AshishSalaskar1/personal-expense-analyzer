import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import MonthMismatchBanner from '@/components/MonthMismatchBanner'
import MonthConflictDialog from '@/components/MonthConflictDialog'
import { uploadPDF, getMonths, saveTransactions } from '@/api/client'
import { CheckCircle, Loader2 } from 'lucide-react'

// Upload stages: 'idle' | 'uploading' | 'preview' | 'saving' | 'done'

export default function Upload() {
  const [month, setMonth] = useState('')
  const [file, setFile] = useState(null)
  const [stage, setStage] = useState('idle')
  const [uploadResult, setUploadResult] = useState(null)
  const [pendingMonth, setPendingMonth] = useState('')
  const [showConflict, setShowConflict] = useState(false)
  const [error, setError] = useState(null)
  const [saveResult, setSaveResult] = useState(null)

  const reset = () => {
    setStage('idle')
    setUploadResult(null)
    setPendingMonth('')
    setShowConflict(false)
    setError(null)
    setSaveResult(null)
    setFile(null)
    setMonth('')
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file || !month) return
    setStage('uploading')
    setError(null)

    try {
      const fd = new FormData()
      fd.append('pdf', file)
      fd.append('month', month)
      const { data } = await uploadPDF(fd)
      setUploadResult(data)
      setPendingMonth(month)
      setStage('preview')
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed. Check the PDF and try again.')
      setStage('idle')
    }
  }

  const handleProceed = async () => {
    // Check if month already exists before saving
    try {
      const { data: months } = await getMonths()
      const exists = months.some((m) => m.month === pendingMonth)
      if (exists) {
        setShowConflict(true)
      } else {
        await doSave(false)
      }
    } catch (err) {
      setError('Could not check existing months.')
    }
  }

  const doSave = async (replace) => {
    setShowConflict(false)
    setStage('saving')
    try {
      const { data } = await saveTransactions(pendingMonth, uploadResult.transactions, replace)
      setSaveResult(data)
      setStage('done')
    } catch (err) {
      setError(err.response?.data?.detail || 'Save failed.')
      setStage('preview')
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Upload Bank Statement</h2>

      {stage === 'idle' || stage === 'uploading' ? (
        <Card>
          <CardHeader>
            <CardTitle>Select PDF & Month</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-5">
              <div className="space-y-1">
                <Label htmlFor="month">Statement Month</Label>
                <Input
                  id="month"
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pdf">Bank Statement PDF</Label>
                <Input
                  id="pdf"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                  required
                />
              </div>
              <Button type="submit" disabled={stage === 'uploading'} className="w-full">
                {stage === 'uploading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extracting transactions…
                  </>
                ) : (
                  'Upload & Extract'
                )}
              </Button>
            </form>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : null}

      {(stage === 'preview' || stage === 'saving') && uploadResult && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preview — {uploadResult.transactions.length} transactions found</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploadResult.month_mismatch && (
                <MonthMismatchBanner
                  userMonth={pendingMonth}
                  detectedMonth={uploadResult.detected_month}
                  onUseDetected={() => setPendingMonth(uploadResult.detected_month)}
                />
              )}

              {/* Transaction preview table */}
              <div className="rounded-md border overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      {['Date', 'Type', 'Amount', 'Particulars'].map((h) => (
                        <th key={h} className="px-2 py-1 text-left font-medium text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResult.transactions.map((t, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">{t.date}</td>
                        <td className="px-2 py-1 capitalize">{t.type}</td>
                        <td className="px-2 py-1">
                          ₹{t.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-1 truncate max-w-xs">{t.particulars}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-muted-foreground">
                Saving to month: <strong>{pendingMonth}</strong>. Tags will be auto-resolved.
              </p>

              <div className="flex gap-3">
                <Button onClick={handleProceed} disabled={stage === 'saving'}>
                  {stage === 'saving' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    'Save to Database'
                  )}
                </Button>
                <Button variant="outline" onClick={reset}>
                  Cancel
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {stage === 'done' && saveResult && (
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle className="mx-auto text-green-500" size={48} />
            <h3 className="text-lg font-semibold">Successfully saved!</h3>
            <p className="text-muted-foreground">
              <strong>{saveResult.saved_count}</strong> transactions saved for{' '}
              <strong>{pendingMonth}</strong>.{' '}
              <strong>{saveResult.tags_resolved}</strong> tags resolved.
            </p>
            <Button onClick={reset}>Upload Another</Button>
          </CardContent>
        </Card>
      )}

      <MonthConflictDialog
        open={showConflict}
        month={pendingMonth}
        onReplace={() => doSave(true)}
        onCancel={() => setShowConflict(false)}
      />
    </div>
  )
}
