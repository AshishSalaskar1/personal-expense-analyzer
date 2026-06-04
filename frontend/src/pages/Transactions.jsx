import { useEffect, useState, useMemo } from 'react'
import PageShell from '@/components/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import TransactionTable from '@/components/TransactionTable'
import ChartPanel from '@/components/ChartPanel'
import ExportImport from '@/components/ExportImport'
import { getTransactions, getMonths, getTagMappings } from '@/api/client'
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react'

const ALL_COLUMNS = ['date', 'type', 'amount', 'particulars', 'tag', 'category', 'comments', 'month']
const GROUP_BY_OPTIONS = [
  { value: 'tag', label: 'Tag' },
  { value: 'category', label: 'Category' },
  { value: 'type', label: 'Type' },
  { value: 'month', label: 'Month' },
]
const CHART_TYPES = [
  { value: 'bar', label: 'Stacked Bar' },
  { value: 'grouped', label: 'Grouped Bar' },
  { value: 'line', label: 'Line' },
  { value: 'pie', label: 'Pie' },
]

function FilterSelect({ label, value, onChange, children, className = '' }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</Label>
      <Select value={value} onChange={onChange} className={`w-full text-sm ${className}`}>
        {children}
      </Select>
    </div>
  )
}

function ActiveChip({ label, onRemove }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
      {label}
      <button onClick={onRemove} className="hover:text-foreground transition-colors cursor-pointer" aria-label={`Remove ${label} filter`}>
        <X size={10} />
      </button>
    </span>
  )
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [months, setMonths] = useState([])
  const [tagMappings, setTagMappings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  // Filters
  const [filterMonth, setFilterMonth] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  // Display options
  const [groupBy, setGroupBy] = useState('tag')
  const [chartType, setChartType] = useState('bar')
  const [visibleCols, setVisibleCols] = useState(ALL_COLUMNS.filter((c) => c !== 'month'))
  const [showColPicker, setShowColPicker] = useState(false)

  useEffect(() => {
    getMonths().then((r) => setMonths(r.data))
    getTagMappings().then((r) => setTagMappings(r.data))
  }, [])

  useEffect(() => {
    const params = {}
    if (filterMonth) params.month = filterMonth
    if (filterType) params.type = filterType
    if (filterTag) params.tag = filterTag
    if (filterCategory) params.category = filterCategory
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    if (minAmount) params.min_amount = minAmount
    if (maxAmount) params.max_amount = maxAmount
    getTransactions(params)
      .then((r) => setTransactions(r.data))
      .finally(() => setLoading(false))
  }, [filterMonth, filterType, filterTag, filterCategory, dateFrom, dateTo, minAmount, maxAmount])

  // Derive unique tags and categories from tag mappings
  const availableTags = useMemo(
    () => [...new Set(tagMappings.map((m) => m.tag).filter(Boolean))].sort(),
    [tagMappings]
  )
  const availableCategories = useMemo(
    () => [...new Set(tagMappings.map((m) => m.category).filter(Boolean))].sort(),
    [tagMappings]
  )

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

  const clearAll = () => {
    setFilterMonth(''); setFilterType(''); setFilterTag(''); setFilterCategory('')
    setDateFrom(''); setDateTo(''); setMinAmount(''); setMaxAmount('')
  }

  const activeFilters = [
    filterMonth && { key: 'month', label: `Month: ${filterMonth}`, clear: () => setFilterMonth('') },
    filterType && { key: 'type', label: `Type: ${filterType}`, clear: () => setFilterType('') },
    filterTag && { key: 'tag', label: `Tag: ${filterTag}`, clear: () => setFilterTag('') },
    filterCategory && { key: 'category', label: `Category: ${filterCategory}`, clear: () => setFilterCategory('') },
    dateFrom && { key: 'from', label: `From: ${dateFrom}`, clear: () => setDateFrom('') },
    dateTo && { key: 'to', label: `To: ${dateTo}`, clear: () => setDateTo('') },
    minAmount && { key: 'min', label: `Min: ₹${minAmount}`, clear: () => setMinAmount('') },
    maxAmount && { key: 'max', label: `Max: ₹${maxAmount}`, clear: () => setMaxAmount('') },
  ].filter(Boolean)

  return (
    <PageShell
      eyebrow="Ledger"
      title="Transactions"
      description="Filter, inspect, chart, annotate, and export your statement data from one consistent workspace."
      actions={<ExportImport />}
    >

      {/* Filter panel */}
      <Card>
        <CardContent className="space-y-4 p-5">
          {/* Primary filters row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <FilterSelect label="Month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              <option value="">All months</option>
              {months.map((m) => (
                <option key={m.month} value={m.month}>{m.month}</option>
              ))}
            </FilterSelect>

            <FilterSelect label="Type" value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-28">
              <option value="">All</option>
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </FilterSelect>

            <FilterSelect label="Tag" value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className="w-40">
              <option value="">All tags</option>
              {availableTags.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </FilterSelect>

            <FilterSelect label="Category" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-40">
              <option value="">All categories</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </FilterSelect>

            <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMoreFilters((v) => !v)}
                className="w-full sm:w-auto"
              >
                {showMoreFilters ? <ChevronUp size={13} className="mr-1" /> : <ChevronDown size={13} className="mr-1" />}
                More
              </Button>
              {activeFilters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="w-full sm:w-auto"
                >
                  <X size={13} className="mr-1" /> Clear all
                </Button>
              )}
            </div>
          </div>

          {/* Secondary filters (dates + amount) */}
          {showMoreFilters && (
            <div className="grid grid-cols-1 gap-4 border-t border-border/70 pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">From date</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">To date</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Min amount (₹)</Label>
                <Input type="number" min="0" placeholder="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Max amount (₹)</Label>
                <Input type="number" min="0" placeholder="No cap" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {activeFilters.map((f) => (
                <ActiveChip key={f.key} label={f.label} onRemove={f.clear} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Display options */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <FilterSelect label="Group by" value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="w-32">
              {GROUP_BY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </FilterSelect>

            <FilterSelect label="Chart type" value={chartType} onChange={(e) => setChartType(e.target.value)} className="w-36">
              {CHART_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </FilterSelect>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Table</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColPicker((v) => !v)}
                className="w-full"
              >
                <SlidersHorizontal size={13} className="mr-1.5" /> Columns
              </Button>
            </div>
          </div>

          {showColPicker && (
            <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-4">
              {ALL_COLUMNS.map((col) => (
                <label key={col} className="flex items-center gap-2 text-sm cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
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
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {loading ? (
              <span className="text-muted-foreground">Loading…</span>
            ) : (
              <span>{transactions.length} transactions</span>
            )}
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
    </PageShell>
  )
}
