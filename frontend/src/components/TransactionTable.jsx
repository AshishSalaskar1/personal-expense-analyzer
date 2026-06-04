import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { updateComments } from '@/api/client'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const helper = createColumnHelper()

function EditableCell({ value: initialValue, transactionId, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(initialValue ?? '')

  const commit = async () => {
    setEditing(false)
    if (val !== (initialValue ?? '')) {
      await updateComments(transactionId, val || null).catch(() => {})
      onSave?.(val)
    }
  }

  if (editing) {
    return (
      <Input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        className="h-7 text-xs"
      />
    )
  }
  return (
    <span
      className="cursor-pointer hover:underline text-muted-foreground text-xs"
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {val || <span className="italic opacity-40">add note…</span>}
    </span>
  )
}

export default function TransactionTable({ data, onDataChange, visibleColumns = null }) {
  const [sorting, setSorting] = useState([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 })

  const allColumns = useMemo(
    () => [
      helper.accessor('date', { header: 'Date', size: 100 }),
      helper.accessor('type', {
        header: 'Type',
        size: 70,
        cell: (info) => (
          <Badge variant={info.getValue() === 'debit' ? 'destructive' : 'default'}>
            {info.getValue()}
          </Badge>
        ),
      }),
      helper.accessor('amount', {
        header: 'Amount',
        size: 100,
        cell: (info) => `₹${info.getValue().toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      }),
      helper.accessor('particulars', { header: 'Particulars', size: 220 }),
      helper.accessor('tag', {
        header: 'Tag',
        size: 120,
        cell: (info) => info.getValue() ? <Badge variant="secondary">{info.getValue()}</Badge> : '—',
      }),
      helper.accessor('category', {
        header: 'Category',
        size: 120,
        cell: (info) => info.getValue() || '—',
      }),
      helper.accessor('comments', {
        header: 'Notes',
        size: 180,
        cell: (info) => (
          <EditableCell
            value={info.getValue()}
            transactionId={info.row.original.id}
            onSave={(v) => onDataChange?.(info.row.original.id, v)}
          />
        ),
      }),
      helper.accessor('month', { header: 'Month', size: 80 }),
    ],
    [onDataChange]
  )

  const columns = useMemo(
    () =>
      visibleColumns
        ? allColumns.filter((c) => visibleColumns.includes(c.accessorKey ?? c.id))
        : allColumns,
    [allColumns, visibleColumns]
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className="space-y-2">
      <div className="rounded-md border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap"
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' ? (
                        <ChevronUp size={12} />
                      ) : header.column.getIsSorted() === 'desc' ? (
                        <ChevronDown size={12} />
                      ) : (
                        <ChevronsUpDown size={12} className="opacity-30" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  No transactions found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t hover:bg-muted/30 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2" style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {table.getFilteredRowModel().rows.length} rows
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            ‹ Prev
          </Button>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next ›
          </Button>
        </div>
      </div>
    </div>
  )
}
