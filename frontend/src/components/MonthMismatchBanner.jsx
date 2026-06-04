import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export default function MonthMismatchBanner({ userMonth, detectedMonth, onUseDetected }) {
  return (
    <Alert variant="destructive" className="mt-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Month mismatch detected</AlertTitle>
      <AlertDescription className="mt-1 space-y-2">
        <p>
          You selected <strong>{userMonth}</strong>, but the statement appears to contain
          transactions from <strong>{detectedMonth}</strong>.
        </p>
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" onClick={onUseDetected}>
            Switch to {detectedMonth}
          </Button>
          <span className="text-xs self-center text-muted-foreground">
            or keep your selection and continue
          </span>
        </div>
      </AlertDescription>
    </Alert>
  )
}
