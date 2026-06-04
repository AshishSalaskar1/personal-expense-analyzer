import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function MonthConflictDialog({ open, month, onReplace, onCancel }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Month already uploaded</DialogTitle>
          <DialogDescription>
            Transactions for <strong>{month}</strong> already exist in the database.
            Do you want to replace them with the newly extracted data?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onReplace}>
            Replace existing data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
