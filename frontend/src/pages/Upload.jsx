import { useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import MonthMismatchBanner from '@/components/MonthMismatchBanner'
import MonthConflictDialog from '@/components/MonthConflictDialog'
import { uploadPDF, getMonths, saveTransactions } from '@/api/client'
import { CheckCircle, Loader2, FileText, Upload as UploadIcon } from 'lucide-react'

// Upload stages: 'idle' | 'uploading' | 'preview' | 'saving' | 'done'

const STEPS = ['Select File', 'Review', 'Done']

function StepIndicator({ stage }) {
  const activeIdx =
    stage === 'uploading' ? 0
    : stage === 'preview' || stage === 'saving' ? 1
    : stage === 'done' ? 2
    : 0

  return (
    <div className="mb-8 flex items-center">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-2 shrink-0">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 ${
              i < activeIdx ? 'bg-primary text-primary-foreground'
              : i === activeIdx ? 'bg-primary/20 text-primary ring-2 ring-primary/40'
              : 'bg-muted text-muted-foreground'
            }`}>
              {i < activeIdx ? <CheckCircle size={13} /> : i + 1}
            </div>
            <span className={`hidden text-sm font-semibold sm:block ${i === activeIdx ? 'text-foreground' : 'text-muted-foreground'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`mx-3 h-px flex-1 transition-colors ${i < activeIdx ? 'bg-primary/50' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

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
    } catch {
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
    <PageShell
      eyebrow="Import"
      title="Upload Bank Statement"
      description="Extract transactions from a PDF, review the detected rows, then save them into a month with conflict checks."
      className="max-w-5xl"
    >

      <StepIndicator stage={stage} />

      {(stage === 'idle' || stage === 'uploading') && (
        <Card>
          <CardHeader>
            <CardTitle>Select PDF and month</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="month" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Statement Month
                </Label>
                <Input
                  id="month"
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  required
                  className="max-w-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Bank Statement PDF
                </Label>
                <div className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
                  file
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border hover:border-border/80 hover:bg-muted/20'
                }`}>
                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText size={16} className="text-primary shrink-0" />
                      <span className="max-w-xs truncate text-sm font-semibold text-foreground">{file.name}</span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground transition-colors ml-1 cursor-pointer shrink-0 text-base leading-none"
                        onClick={(e) => { e.stopPropagation(); setFile(null) }}
                        aria-label="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div>
                      <UploadIcon size={24} className="mx-auto mb-3 text-primary" />
                      <p className="text-sm font-semibold text-foreground">Click to select a PDF file</p>
                      <p className="mt-1 text-sm text-muted-foreground">Supports .pdf bank statements</p>
                    </div>
                  )}
                  <input
                    id="pdf"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setFile(e.target.files[0])}
                    required
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              <Button type="submit" disabled={stage === 'uploading'} className="w-full">
                {stage === 'uploading' ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Extracting transactions…</>
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
      )}

      {(stage === 'preview' || stage === 'saving') && uploadResult && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>
                  Preview — {uploadResult.transactions.length} transactions
                </CardTitle>
                <Badge variant="secondary" className="text-xs shrink-0">{pendingMonth}</Badge>
              </div>
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
              <div className="max-h-80 overflow-auto rounded-lg border border-border/80">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      {['Date', 'Type', 'Amount', 'Particulars'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResult.transactions.map((t, i) => (
                      <tr key={i} className="border-t border-border/40 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-1.5 tabular-nums text-foreground/80">{t.date}</td>
                        <td className="px-3 py-1.5">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            t.type === 'debit'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 tabular-nums text-foreground/80">
                          ₹{t.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-1.5 truncate max-w-xs text-muted-foreground">{t.particulars}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground">
                Saving to month: <strong className="text-foreground">{pendingMonth}</strong>. Tags will be auto-resolved.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={handleProceed} disabled={stage === 'saving'}>
                  {stage === 'saving' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
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
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                <CheckCircle size={21} className="text-emerald-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-emerald-800">Transactions saved</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong className="text-foreground">{saveResult.saved_count}</strong> transactions saved for{' '}
                  <strong className="text-foreground">{pendingMonth}</strong>.{' '}
                  <strong className="text-foreground">{saveResult.tags_resolved}</strong> tags resolved.
                </p>
                <Button variant="outline" size="sm" onClick={reset} className="mt-4">
                  Upload Another
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <MonthConflictDialog
        open={showConflict}
        month={pendingMonth}
        onReplace={() => doSave(true)}
        onCancel={() => setShowConflict(false)}
      />
    </PageShell>
  )
}
