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
        className="min-h-10 text-sm"
      />
    )
  }
  return (
    <span
      className="cursor-pointer text-sm text-muted-foreground hover:text-primary hover:underline"
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
        cell: (info) => {
          const v = info.getValue()
          return (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              v === 'debit'
                ? 'bg-red-500/15 text-red-400'
                : 'bg-emerald-500/15 text-emerald-400'
            }`}>
              {v}
            </span>
          )
        },
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

  // eslint-disable-next-line react-hooks/incompatible-library
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
    <div className="space-y-3">
      <div className="overflow-auto rounded-lg border border-border/80 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="cursor-pointer select-none whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' ? (
                        <ChevronUp size={11} className="text-primary" />
                      ) : header.column.getIsSorted() === 'desc' ? (
                        <ChevronDown size={11} className="text-primary" />
                      ) : (
                        <ChevronsUpDown size={11} className="opacity-25" />
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
                <td colSpan={columns.length} className="py-14 text-center text-sm font-medium text-muted-foreground">
                  No transactions found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-border/70 transition-colors hover:bg-muted/45">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-3 align-middle" style={{ width: cell.column.getSize() }}>
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
      <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="font-medium">{table.getFilteredRowModel().rows.length} rows</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3"
          >
            ‹ Prev
          </Button>
          <span className="px-1 font-semibold text-foreground">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3"
          >
            Next ›
          </Button>
        </div>
      </div>
    </div>
  )
}
