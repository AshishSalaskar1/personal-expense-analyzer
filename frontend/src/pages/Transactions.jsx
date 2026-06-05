import { useEffect, useMemo, useRef, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import TransactionTable from '@/components/TransactionTable'
import ChartPanel from '@/components/ChartPanel'
import DashboardCharts from '@/components/DashboardCharts'
import ExportImport from '@/components/ExportImport'
import { getTransactions, getMonths, getTagMappings } from '@/api/client'
import { CopyPlus, Save, SlidersHorizontal, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react'

const ALL_COLUMNS = ['date', 'type', 'amount', 'particulars', 'tag', 'category', 'comments', 'month']
const DEFAULT_VISIBLE_COLUMNS = ALL_COLUMNS.filter((c) => c !== 'month')
const SAVED_DASHBOARDS_KEY = 'expense-buddy-saved-dashboards'
const GROUP_BY_OPTIONS = [
  { value: 'tag', label: 'Tag' },
  { value: 'category', label: 'Category' },
  { value: 'type', label: 'Type' },
  { value: 'month', label: 'Month' },
]

function loadSavedDashboards() {
  if (typeof window === 'undefined') return []

  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_DASHBOARDS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistSavedDashboards(dashboards) {
  window.localStorage.setItem(SAVED_DASHBOARDS_KEY, JSON.stringify(dashboards))
}

function createDashboardId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
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

function MultiFilterSelect({ label, values, options, onChange, placeholder, className = '' }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const selectedValues = useMemo(() => new Set(values), [values])

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const toggleValue = (option) => {
    onChange(selectedValues.has(option) ? values.filter((value) => value !== option) : [...values, option])
  }

  const summary = values.length === 0 ? placeholder : values.length === 1 ? values[0] : `${values.length} selected`

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</Label>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
        className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 py-2 text-left text-sm text-foreground ring-offset-background transition-colors hover:border-primary/45 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background cursor-pointer ${className}`}
        aria-expanded={open}
      >
        <span className={values.length ? 'truncate' : 'truncate text-muted-foreground'}>{summary}</span>
        <ChevronDown size={15} className="shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-2">
            <span className="text-xs font-semibold text-muted-foreground">{values.length} selected</span>
            {values.length > 0 && (
              <button type="button" onClick={() => onChange([])} className="text-xs font-semibold text-primary hover:text-foreground cursor-pointer">
                Clear
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-auto py-1">
            {options.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">No options available</div>
            ) : (
              options.map((option) => (
                <label key={option} className="flex min-h-10 cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted">
                  <Checkbox checked={selectedValues.has(option)} onCheckedChange={() => toggleValue(option)} />
                  <span className="min-w-0 flex-1 truncate">{option}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
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
  const [savedDashboards, setSavedDashboards] = useState(loadSavedDashboards)
  const [selectedDashboardId, setSelectedDashboardId] = useState('')
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [dashboardName, setDashboardName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  // Filters
  const [filterMonth, setFilterMonth] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterTags, setFilterTags] = useState([])
  const [filterCategories, setFilterCategories] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  // Display options
  const [dashboardMonth, setDashboardMonth] = useState('')
  const [groupBy, setGroupBy] = useState('tag')
  const [chartType, setChartType] = useState('bar')
  const [visibleCols, setVisibleCols] = useState(DEFAULT_VISIBLE_COLUMNS)
  const [showColPicker, setShowColPicker] = useState(false)

  const currentDashboardState = useMemo(() => ({
    filterMonth,
    filterType,
    filterTags,
    filterCategories,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    dashboardMonth,
    groupBy,
    chartType,
    visibleCols,
    showMoreFilters,
    showColPicker,
  }), [filterMonth, filterType, filterTags, filterCategories, dateFrom, dateTo, minAmount, maxAmount, dashboardMonth, groupBy, chartType, visibleCols, showMoreFilters, showColPicker])

  const selectedDashboard = savedDashboards.find((dashboard) => dashboard.id === selectedDashboardId)

  useEffect(() => {
    getMonths().then((r) => setMonths(r.data))
    getTagMappings().then((r) => setTagMappings(r.data))
  }, [])

  useEffect(() => {
    const params = {}
    if (filterMonth) params.month = filterMonth
    if (filterType) params.type = filterType
    if (filterTags.length) params.tag = filterTags
    if (filterCategories.length) params.category = filterCategories
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    if (minAmount) params.min_amount = minAmount
    if (maxAmount) params.max_amount = maxAmount
    getTransactions(params)
      .then((r) => setTransactions(r.data))
      .finally(() => setLoading(false))
  }, [filterMonth, filterType, filterTags, filterCategories, dateFrom, dateTo, minAmount, maxAmount])

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
    setFilterMonth(''); setFilterType(''); setFilterTags([]); setFilterCategories([])
    setDateFrom(''); setDateTo(''); setMinAmount(''); setMaxAmount('')
  }

  const applyDashboardState = (state = {}) => {
    setFilterMonth(state.filterMonth || '')
    setFilterType(state.filterType || '')
    setFilterTags(Array.isArray(state.filterTags) ? state.filterTags : [])
    setFilterCategories(Array.isArray(state.filterCategories) ? state.filterCategories : [])
    setDateFrom(state.dateFrom || '')
    setDateTo(state.dateTo || '')
    setMinAmount(state.minAmount || '')
    setMaxAmount(state.maxAmount || '')
    setDashboardMonth(state.dashboardMonth || '')
    setGroupBy(GROUP_BY_OPTIONS.some((option) => option.value === state.groupBy) ? state.groupBy : 'tag')
    setChartType(CHART_TYPES.some((option) => option.value === state.chartType) ? state.chartType : 'bar')
    setVisibleCols(Array.isArray(state.visibleCols) && state.visibleCols.length ? state.visibleCols.filter((col) => ALL_COLUMNS.includes(col)) : DEFAULT_VISIBLE_COLUMNS)
    setShowMoreFilters(Boolean(state.showMoreFilters))
    setShowColPicker(Boolean(state.showColPicker))
  }

  const loadDashboard = (dashboardId) => {
    setSelectedDashboardId(dashboardId)
    const dashboard = savedDashboards.find((item) => item.id === dashboardId)
    if (dashboard) {
      applyDashboardState(dashboard.state)
    }
  }

  const saveDashboards = (nextDashboards) => {
    setSavedDashboards(nextDashboards)
    persistSavedDashboards(nextDashboards)
  }

  const saveDashboardAsNew = () => {
    const name = dashboardName.trim()
    if (!name) return

    const dashboard = {
      id: createDashboardId(),
      name,
      state: currentDashboardState,
      updatedAt: new Date().toISOString(),
    }
    const nextDashboards = [...savedDashboards, dashboard].sort((a, b) => a.name.localeCompare(b.name))
    saveDashboards(nextDashboards)
    setSelectedDashboardId(dashboard.id)
    setDashboardName('')
    setSaveDialogOpen(false)
  }

  const updateSelectedDashboard = () => {
    if (!selectedDashboard) return

    const nextDashboards = savedDashboards.map((dashboard) => (
      dashboard.id === selectedDashboard.id
        ? { ...dashboard, state: currentDashboardState, updatedAt: new Date().toISOString() }
        : dashboard
    ))
    saveDashboards(nextDashboards)
  }

  const deleteSelectedDashboard = () => {
    if (!selectedDashboard) return

    const nextDashboards = savedDashboards.filter((dashboard) => dashboard.id !== selectedDashboard.id)
    saveDashboards(nextDashboards)
    setSelectedDashboardId('')
  }

  const activeFilters = [
    filterMonth && { key: 'month', label: `Month: ${filterMonth}`, clear: () => setFilterMonth('') },
    filterType && { key: 'type', label: `Type: ${filterType}`, clear: () => setFilterType('') },
    ...filterTags.map((tag) => ({ key: `tag-${tag}`, label: `Tag: ${tag}`, clear: () => setFilterTags((values) => values.filter((value) => value !== tag)) })),
    ...filterCategories.map((category) => ({ key: `category-${category}`, label: `Category: ${category}`, clear: () => setFilterCategories((values) => values.filter((value) => value !== category)) })),
    dateFrom && { key: 'from', label: `From: ${dateFrom}`, clear: () => setDateFrom('') },
    dateTo && { key: 'to', label: `To: ${dateTo}`, clear: () => setDateTo('') },
    minAmount && { key: 'min', label: `Min: ₹${minAmount}`, clear: () => setMinAmount('') },
    maxAmount && { key: 'max', label: `Max: ₹${maxAmount}`, clear: () => setMaxAmount('') },
  ].filter(Boolean)

  return (
    <PageShell
      eyebrow="Overview"
      title="Dashboard"
      description="Filter, chart, inspect, annotate, and export your statement data from one consistent workspace."
      actions={<ExportImport />}
    >

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Saved dashboard</Label>
              <Select value={selectedDashboardId} onChange={(event) => loadDashboard(event.target.value)}>
                <option value="">Select a saved dashboard</option>
                {savedDashboards.map((dashboard) => (
                  <option key={dashboard.id} value={dashboard.id}>{dashboard.name}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(true)}>
                <CopyPlus size={15} /> Save as new
              </Button>
              <Button onClick={updateSelectedDashboard} disabled={!selectedDashboard}>
                <Save size={15} /> Update saved
              </Button>
              <Button variant="ghost" onClick={deleteSelectedDashboard} disabled={!selectedDashboard}>
                <Trash2 size={15} /> Delete
              </Button>
            </div>
          </div>
          {selectedDashboard && (
            <p className="text-xs text-muted-foreground">
              Loaded: <span className="font-semibold text-foreground">{selectedDashboard.name}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save dashboard</DialogTitle>
            <DialogDescription>
              Save the current filters, dashboard month, custom chart settings, and table columns as a reusable dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-4">
            <Label htmlFor="dashboard-name" className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Dashboard name</Label>
            <Input
              id="dashboard-name"
              value={dashboardName}
              onChange={(event) => setDashboardName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveDashboardAsNew()
              }}
              placeholder="Monthly essentials"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveDashboardAsNew} disabled={!dashboardName.trim()}>
              <Save size={15} /> Save dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

            <MultiFilterSelect label="Tag" values={filterTags} options={availableTags} onChange={setFilterTags} placeholder="All tags" className="w-40" />

            <MultiFilterSelect label="Category" values={filterCategories} options={availableCategories} onChange={setFilterCategories} placeholder="All categories" className="w-40" />

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

      <DashboardCharts transactions={transactions} selectedMonth={dashboardMonth} onSelectedMonthChange={setDashboardMonth} />

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

      {/* Custom chart */}
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
