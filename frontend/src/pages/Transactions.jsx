import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import TransactionTable from '@/components/TransactionTable'
import ChartPanel from '@/components/ChartPanel'
import ExportImport from '@/components/ExportImport'
import { getTransactions, getMonths } from '@/api/client'
import { SlidersHorizontal } from 'lucide-react'

const ALL_COLUMNS = ['date', 'type', 'amount', 'particulars', 'tag', 'category', 'comments', 'month']
const GROUP_BY_OPTIONS = [
  { value: 'tag', label: 'Tag' },
  { value: 'category', label: 'Category' },
  { value: 'type', label: 'Type' },
  { value: 'month', label: 'Month' },
]
const CHART_TYPES = [
  { value: 'bar', label: 'Stacked Bar' },
  { value: 'line', label: 'Line' },
  { value: 'pie', label: 'Pie' },
]

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [months, setMonths] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterMonth, setFilterMonth] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Display options
  const [groupBy, setGroupBy] = useState('tag')
  const [chartType, setChartType] = useState('bar')
  const [visibleCols, setVisibleCols] = useState(ALL_COLUMNS.filter((c) => c !== 'month'))
  const [showColPicker, setShowColPicker] = useState(false)

  useEffect(() => {
    getMonths().then((r) => setMonths(r.data))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (filterMonth) params.month = filterMonth
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    getTransactions(params)
      .then((r) => setTransactions(r.data))
      .finally(() => setLoading(false))
  }, [filterMonth, dateFrom, dateTo])

  const handleDataChange = (id, comments) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, comments } : t))
    )
  }

  const toggleCol = (col, checked) => {
    setVisibleCols((prev) =>
      checked ? [...prev, col] : prev.filter((c) => c !== col)
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Transactions</h2>
        <ExportImport />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label>Month</Label>
              <Select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-36"
              >
                <option value="">All months</option>
                {months.map((m) => (
                  <option key={m.month} value={m.month}>
                    {m.month}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <Label>From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-36"
              />
            </div>

            <div className="space-y-1">
              <Label>To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-36"
              />
            </div>

            <div className="space-y-1">
              <Label>Group by</Label>
              <Select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-32"
              >
                {GROUP_BY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Chart</Label>
              <Select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="w-32"
              >
                {CHART_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColPicker((v) => !v)}
            >
              <SlidersHorizontal size={14} className="mr-1" /> Columns
            </Button>

            {(filterMonth || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFilterMonth(''); setDateFrom(''); setDateTo('') }}
              >
                Clear filters
              </Button>
            )}
          </div>

          {/* Column picker */}
          {showColPicker && (
            <div className="mt-3 pt-3 border-t flex flex-wrap gap-4">
              {ALL_COLUMNS.map((col) => (
                <label key={col} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={visibleCols.includes(col)}
                    onCheckedChange={(v) => toggleCol(col, v)}
                  />
                  {col}
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {chartType === 'pie' ? 'Distribution' : chartType === 'line' ? 'Trend' : 'Breakdown'} by{' '}
            {GROUP_BY_OPTIONS.find((o) => o.value === groupBy)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartPanel data={transactions} groupBy={groupBy} chartType={chartType} />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? 'Loading…' : `${transactions.length} transactions`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionTable
            data={transactions}
            visibleColumns={visibleCols}
            onDataChange={handleDataChange}
          />
        </CardContent>
      </Card>
    </div>
  )
}
