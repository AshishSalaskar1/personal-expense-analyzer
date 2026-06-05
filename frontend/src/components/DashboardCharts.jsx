import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, ChevronDown, ChevronRight, PieChart as PieIcon, ReceiptText } from 'lucide-react'
import { DEFAULT_CHART_PALETTE, getChartPalette } from '@/lib/chartPalettes'

const fmt = (value) => `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const shortFmt = (value) => `₹${(Number(value) / 1000).toFixed(0)}k`

const CHART_STYLE = {
  cursor: { fill: 'hsl(var(--muted))', fillOpacity: 0.65 },
  grid: 'hsl(var(--border) / 0.9)',
  tooltip: {
    backgroundColor: '#ffffff',
    border: '1px solid hsl(var(--border))',
    borderRadius: '10px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
    color: 'hsl(var(--foreground))',
    fontSize: '12px',
    fontFamily: "'Bricolage Grotesque', sans-serif",
  },
  tick: { fontSize: 12, fontWeight: 650, fill: 'hsl(var(--muted-foreground))' },
}

const DIM_OPTIONS = [
  { value: 'tag', label: 'Tag' },
  { value: 'category', label: 'Category' },
]
const DIM_LABEL = { tag: 'Tag', category: 'Category' }
const DASHBOARD_SECTIONS_KEY = 'dashboardSections:v2'

const isWithinMonthRange = (month, from, to) => {
  if (!month) return false
  if (from && month < from) return false
  if (to && month > to) return false
  return true
}

function MonthRangeControls({ months = [], from, to, onFromChange, onToChange, label = 'Range' }) {
  const ascendingMonths = useMemo(() => [...months].sort((a, b) => a.localeCompare(b)), [months])
  const firstMonth = ascendingMonths[0] || ''
  const lastMonth = ascendingMonths[ascendingMonths.length - 1] || ''
  const effectiveFrom = from || firstMonth
  const effectiveTo = to || lastMonth

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/35 px-2.5 py-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <Select value={effectiveFrom} onChange={(event) => onFromChange(event.target.value)} className="min-h-9 w-32 border-0 bg-card px-2 py-1 text-xs font-bold shadow-none focus:ring-1">
        {ascendingMonths.map((month) => (
          <option key={month} value={month}>{month}</option>
        ))}
      </Select>
      <span className="text-xs font-bold text-muted-foreground">to</span>
      <Select value={effectiveTo} onChange={(event) => onToChange(event.target.value)} className="min-h-9 w-32 border-0 bg-card px-2 py-1 text-xs font-bold shadow-none focus:ring-1">
        {ascendingMonths.map((month) => (
          <option key={month} value={month}>{month}</option>
        ))}
      </Select>
    </div>
  )
}

// CRED-style stat card — big bold number, accent top stripe, no icon
function StatCard({ label, value, detail, tone = 'primary', colors }) {
  const accentColor = {
    primary: colors[1],
    income: colors[3],
    spend: colors[0],
    amber: colors[2],
  }[tone]

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl" style={{ backgroundColor: accentColor }} />
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
        <p className="mt-2.5 break-words text-3xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-[2rem]">
          {value}
        </p>
        {detail && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  )
}

function CollapsibleSection({ title, collapsed, onToggle, children }) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full items-center gap-3 py-2"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground transition-colors group-hover:text-foreground">
          {title}
        </span>
        <div className="h-px flex-1 bg-border" />
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted-foreground transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
        />
      </button>
      {!collapsed && <div className="mt-4">{children}</div>}
    </div>
  )
}

export default function DashboardCharts({ transactions = [], selectedMonth = '', onSelectedMonthChange, paletteKey = DEFAULT_CHART_PALETTE }) {
  const palette = useMemo(() => getChartPalette(paletteKey), [paletteKey])
  const colors = palette.swatches
  const cleanTransactions = useMemo(() => transactions.filter((transaction) => !transaction.ignored), [transactions])

  const availableMonths = useMemo(
    () => [...new Set(cleanTransactions.map((transaction) => transaction.month).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
    [cleanTransactions]
  )
  const [trendFromMonth, setTrendFromMonth] = useState('')
  const [trendToMonth, setTrendToMonth] = useState('')
  const [categoryFromMonth, setCategoryFromMonth] = useState('')
  const [categoryToMonth, setCategoryToMonth] = useState('')

  const ascendingMonths = useMemo(() => [...availableMonths].sort((a, b) => a.localeCompare(b)), [availableMonths])
  const firstMonth = ascendingMonths[0] || ''
  const lastMonth = ascendingMonths[ascendingMonths.length - 1] || ''
  const activeMonth = availableMonths.includes(selectedMonth) ? selectedMonth : availableMonths[0] || ''
  const effectiveTrendFrom = trendFromMonth || firstMonth
  const effectiveTrendTo = trendToMonth || lastMonth
  const effectiveCategoryFrom = categoryFromMonth || activeMonth || firstMonth
  const effectiveCategoryTo = categoryToMonth || activeMonth || lastMonth
  const trendRangeFrom = effectiveTrendFrom > effectiveTrendTo ? effectiveTrendTo : effectiveTrendFrom
  const trendRangeTo = effectiveTrendFrom > effectiveTrendTo ? effectiveTrendFrom : effectiveTrendTo
  const categoryRangeFrom = effectiveCategoryFrom > effectiveCategoryTo ? effectiveCategoryTo : effectiveCategoryFrom
  const categoryRangeTo = effectiveCategoryFrom > effectiveCategoryTo ? effectiveCategoryFrom : effectiveCategoryTo

  const monthlyTotals = useMemo(() => {
    const map = {}
    for (const transaction of cleanTransactions.filter((transaction) => isWithinMonthRange(transaction.month, trendRangeFrom, trendRangeTo))) {
      if (!map[transaction.month]) map[transaction.month] = { month: transaction.month, debit: 0, credit: 0, net: 0 }
      if (transaction.type === 'debit') map[transaction.month].debit += transaction.amount
      else map[transaction.month].credit += transaction.amount
      map[transaction.month].net = map[transaction.month].credit - map[transaction.month].debit
    }
    return Object.values(map)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => ({ ...row, debit: Math.round(row.debit), credit: Math.round(row.credit), net: Math.round(row.net) }))
  }, [cleanTransactions, trendRangeFrom, trendRangeTo])

  const monthSummary = useMemo(() => {
    const monthTransactions = cleanTransactions.filter((transaction) => transaction.month === activeMonth)
    const debits = monthTransactions.filter((transaction) => transaction.type === 'debit')
    const debit = debits.reduce((sum, transaction) => sum + transaction.amount, 0)
    const credit = monthTransactions.filter((transaction) => transaction.type === 'credit').reduce((sum, transaction) => sum + transaction.amount, 0)
    return { txs: monthTransactions, debit, credit, avgDebit: debits.length ? debit / debits.length : 0, count: monthTransactions.length }
  }, [cleanTransactions, activeMonth])

  const [tagChartBy, setTagChartBy] = useState('tag')
  const [catChartBy, setCatChartBy] = useState('category')

  const tagBreakdown = useMemo(() => {
    const map = {}
    for (const transaction of monthSummary.txs.filter((entry) => entry.type === 'debit')) {
      const key = transaction[tagChartBy] || 'Unknown'
      map[key] = (map[key] || 0) + transaction.amount
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [monthSummary, tagChartBy])

  const categoryRangeTransactions = useMemo(
    () => cleanTransactions.filter((transaction) => isWithinMonthRange(transaction.month, categoryRangeFrom, categoryRangeTo)),
    [cleanTransactions, categoryRangeFrom, categoryRangeTo]
  )

  const categoryBreakdown = useMemo(() => {
    const map = {}
    for (const transaction of categoryRangeTransactions.filter((entry) => entry.type === 'debit')) {
      const key = transaction[catChartBy] || 'Uncategorized'
      map[key] = (map[key] || 0) + transaction.amount
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)
  }, [categoryRangeTransactions, catChartBy])

  const daySpend = useMemo(() => {
    const map = {}
    for (const transaction of monthSummary.txs.filter((entry) => entry.type === 'debit')) {
      const day = String(transaction.date).slice(-2)
      map[day] = (map[day] || 0) + transaction.amount
    }
    return Object.entries(map)
      .map(([day, amount]) => ({ day, amount: Math.round(amount) }))
      .sort((a, b) => a.day.localeCompare(b.day))
  }, [monthSummary])

  const net = monthSummary.credit - monthSummary.debit
  const savingsRate = monthSummary.credit > 0 ? (net / monthSummary.credit) * 100 : 0
  const topTag = tagBreakdown[0]

  const [collapsedSections, setCollapsedSections] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DASHBOARD_SECTIONS_KEY) || '{}') }
    catch { return {} }
  })
  const toggleSection = (key) => setCollapsedSections((prev) => {
    const next = { ...prev, [key]: !prev[key] }
    localStorage.setItem(DASHBOARD_SECTIONS_KEY, JSON.stringify(next))
    return next
  })

  const [drillCategory, setDrillCategory] = useState(null)
  useEffect(() => { setDrillCategory(null) }, [categoryRangeFrom, categoryRangeTo, catChartBy])

  const categoryTagMap = useMemo(() => {
    const map = {}
    for (const t of categoryRangeTransactions.filter((e) => e.type === 'debit')) {
      const cat = t.category || 'Uncategorized'
      const tag = t.tag || 'Unknown'
      if (!map[cat]) map[cat] = {}
      map[cat][tag] = (map[cat][tag] || 0) + t.amount
    }
    const result = {}
    for (const [cat, tags] of Object.entries(map)) {
      result[cat] = Object.entries(tags)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 4)
    }
    return result
  }, [categoryRangeTransactions])

  const drillBreakdown = useMemo(() => {
    if (!drillCategory) return []
    const map = {}
    for (const t of categoryRangeTransactions.filter((e) => e.type === 'debit' && (e.category || 'Uncategorized') === drillCategory)) {
      const key = t.tag || 'Unknown'
      map[key] = (map[key] || 0) + t.amount
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [drillCategory, categoryRangeTransactions])

  const categoryTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const name = payload[0].name
    const value = payload[0].value
    const tags = categoryTagMap[name] || []
    return (
      <div style={{ ...CHART_STYLE.tooltip, padding: '10px 14px', minWidth: '180px' }}>
        <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{name}</div>
        <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px', marginBottom: tags.length ? '8px' : '4px' }}>{fmt(value)}</div>
        {tags.length > 0 && (
          <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '8px' }}>
            {tags.map(({ name: tagName, value: tagValue }) => (
              <div key={tagName} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '11px', marginBottom: '3px' }}>
                <span style={{ color: 'hsl(var(--muted-foreground))', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '110px', whiteSpace: 'nowrap' }}>{tagName}</span>
                <span style={{ fontWeight: 500 }}>{fmt(tagValue)}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: '8px', fontSize: '10px', color: 'hsl(var(--muted-foreground))', fontStyle: 'italic' }}>Click to drill down →</div>
      </div>
    )
  }

  if (!cleanTransactions.length) {
    return (
      <Card>
        <CardContent className="flex min-h-64 items-center justify-center p-6 text-sm font-medium text-muted-foreground">
          No dashboard data matches the current filters.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-2xl font-extrabold tracking-tight text-foreground">Dashboard</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Charts update from the filtered transaction set.</p>
        </div>
        <div className="flex min-w-56 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Month</span>
          <Select value={activeMonth} onChange={(event) => onSelectedMonthChange?.(event.target.value)} className="min-w-36 flex-1 border-0 bg-transparent p-0 shadow-none focus:ring-0">
            {availableMonths.map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </Select>
        </div>
      </div>

      <CollapsibleSection title="Summary" collapsed={!!collapsedSections.summary} onToggle={() => toggleSection('summary')}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total spend" value={fmt(monthSummary.debit)} detail={`${monthSummary.count} clean transactions`} tone="spend" colors={colors} />
          <StatCard label="Credits" value={fmt(monthSummary.credit)} detail="Income, refunds, and transfers" tone="income" colors={colors} />
          <StatCard label={net >= 0 ? 'Surplus' : 'Deficit'} value={fmt(Math.abs(net))} detail={`${Math.round(savingsRate)}% savings rate`} tone={net >= 0 ? 'primary' : 'spend'} colors={colors} />
          <StatCard label="Avg debit" value={fmt(monthSummary.avgDebit)} detail={topTag ? `Largest tag: ${topTag.name}` : 'No debit data yet'} tone="amber" colors={colors} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Trends" collapsed={!!collapsedSections.trends} onToggle={() => toggleSection('trends')}>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle className="flex items-center gap-2"><Activity size={18} className="text-primary" /> Cash flow trend</CardTitle>
                <MonthRangeControls
                  months={availableMonths}
                  from={trendFromMonth}
                  to={trendToMonth}
                  onFromChange={setTrendFromMonth}
                  onToChange={setTrendToMonth}
                  label="Range"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={monthlyTotals} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={CHART_STYLE.grid} vertical={false} />
                  <XAxis dataKey="month" tick={CHART_STYLE.tick} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={shortFmt} tick={CHART_STYLE.tick} tickLine={false} axisLine={false} width={54} />
                  <Tooltip formatter={(value) => fmt(value)} contentStyle={CHART_STYLE.tooltip} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="credit" name="Credit" stroke={palette.credit} fill={palette.credit} fillOpacity={0.16} strokeWidth={3} />
                  <Area type="monotone" dataKey="debit" name="Spend" stroke={palette.spend} fill={palette.spend} fillOpacity={0.18} strokeWidth={3} />
                  <Line type="monotone" dataKey="net" name="Net" stroke={palette.net} strokeWidth={3} dot={false} strokeDasharray="5 3" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <PieIcon size={18} className="text-primary" />
                    {drillCategory ? (
                      <span className="flex items-center gap-1">
                        <button type="button" onClick={() => setDrillCategory(null)} className="text-primary hover:underline">
                          All {DIM_LABEL[catChartBy]}s
                        </button>
                        <ChevronRight size={13} className="text-muted-foreground" />
                        <span>{drillCategory}</span>
                      </span>
                    ) : (
                      `${DIM_LABEL[catChartBy]} mix`
                    )}
                  </CardTitle>
                  {!drillCategory && (
                    <select value={catChartBy} onChange={(e) => setCatChartBy(e.target.value)} className="cursor-pointer rounded border border-border bg-card px-1.5 py-0.5 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                      {DIM_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  )}
                </div>
                <MonthRangeControls
                  months={availableMonths}
                  from={categoryFromMonth || activeMonth}
                  to={categoryToMonth || activeMonth}
                  onFromChange={setCategoryFromMonth}
                  onToChange={setCategoryToMonth}
                  label="Range"
                />
              </div>
            </CardHeader>
            <CardContent>
              {(drillCategory ? drillBreakdown : categoryBreakdown).length === 0 ? (
                <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
                  {drillCategory ? `No tag data for "${drillCategory}".` : `No ${DIM_LABEL[catChartBy].toLowerCase()} data for this month.`}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={drillCategory ? drillBreakdown : categoryBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      innerRadius={58}
                      outerRadius={104}
                      paddingAngle={2}
                      cursor={!drillCategory && catChartBy === 'category' ? 'pointer' : 'default'}
                      onClick={!drillCategory && catChartBy === 'category' ? (entry) => setDrillCategory(entry.name) : undefined}
                    >
                      {(drillCategory ? drillBreakdown : categoryBreakdown).map((entry, index) => (
                        <Cell key={entry.name} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    {!drillCategory && catChartBy === 'category' ? (
                      <Tooltip content={categoryTooltip} />
                    ) : (
                      <Tooltip formatter={(value) => fmt(value)} contentStyle={CHART_STYLE.tooltip} />
                    )}
                    <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '12px', lineHeight: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Breakdown" collapsed={!!collapsedSections.breakdown} onToggle={() => toggleSection('breakdown')}>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2"><ReceiptText size={18} className="text-primary" /> Spend by {DIM_LABEL[tagChartBy]}</CardTitle>
                <select value={tagChartBy} onChange={(e) => setTagChartBy(e.target.value)} className="cursor-pointer rounded border border-border bg-card px-1.5 py-0.5 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  {DIM_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {tagBreakdown.length === 0 ? (
                <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">No debit data for this month.</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tagBreakdown} layout="vertical" margin={{ top: 0, right: 58, left: 24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} horizontal={false} />
                    <XAxis type="number" tickFormatter={shortFmt} tick={CHART_STYLE.tick} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={96} tick={CHART_STYLE.tick} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => fmt(value)} contentStyle={CHART_STYLE.tooltip} cursor={CHART_STYLE.cursor} />
                    <Bar dataKey="value" fill={palette.spend} stroke={palette.spendStroke} strokeWidth={1.5} radius={[0, 8, 8, 0]} barSize={18}>
                      <LabelList
                        dataKey="value"
                        position="right"
                        offset={6}
                        formatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                        style={{ fontSize: 11, fontWeight: 800, fill: palette.spendStroke }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity size={18} className="text-primary" /> Daily spend pulse</CardTitle>
            </CardHeader>
            <CardContent>
              {daySpend.length === 0 ? (
                <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">No daily spend data for this month.</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={daySpend} margin={{ top: 28, right: 18, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} vertical={false} />
                    <XAxis dataKey="day" tick={CHART_STYLE.tick} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={shortFmt} tick={CHART_STYLE.tick} axisLine={false} tickLine={false} width={48} />
                    <Tooltip formatter={(value) => fmt(value)} labelFormatter={(day) => `Day ${day}`} contentStyle={CHART_STYLE.tooltip} cursor={CHART_STYLE.cursor} />
                    <Bar dataKey="amount" name="Spend" fill={palette.net} stroke={palette.netStroke} strokeWidth={1.5} radius={[8, 8, 0, 0]} barSize={18}>
                      <LabelList
                        dataKey="amount"
                        position="top"
                        formatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : '')}
                        style={{ fontSize: 10, fontWeight: 800, fill: palette.netStroke }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </CollapsibleSection>
    </div>
  )
}