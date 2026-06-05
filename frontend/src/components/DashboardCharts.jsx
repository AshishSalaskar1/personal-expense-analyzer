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
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, ArrowDownRight, ArrowUpRight, BadgeIndianRupee, ChevronDown, ChevronRight, PieChart as PieIcon, ReceiptText, TrendingDown, TrendingUp } from 'lucide-react'

const fmt = (value) => `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const shortFmt = (value) => `₹${(Number(value) / 1000).toFixed(0)}k`
const COLORS = ['#047857', '#4f46e5', '#d97706', '#be123c', '#0891b2', '#7c3aed', '#65a30d', '#c2410c']

const CHART_STYLE = {
  cursor: { fill: 'hsl(var(--muted))', fillOpacity: 0.55 },
  grid: 'hsl(var(--border) / 0.75)',
  tooltip: {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    boxShadow: '0 14px 30px rgba(15, 23, 42, 0.12)',
    color: 'hsl(var(--foreground))',
    fontSize: '12px',
  },
  tick: { fontSize: 12, fill: 'hsl(var(--muted-foreground))' },
}

const DIM_OPTIONS = [
  { value: 'tag', label: 'Tag' },
  { value: 'category', label: 'Category' },
]
const DIM_LABEL = { tag: 'Tag', category: 'Category' }

function StatCard({ label, value, detail, icon: Icon, tone = 'primary' }) {
  const toneClass = {
    primary: 'bg-primary/10 text-primary',
    income: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    spend: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  }[tone]

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
            <p className="mt-2 break-words text-2xl font-semibold leading-tight text-foreground tabular-nums sm:text-3xl">
              {value}
            </p>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">{detail}</p>
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
            <Icon size={21} />
          </div>
        </div>
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
        className="group flex w-full items-center gap-3 py-1"
      >
        <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover:text-foreground">
          {title}
        </span>
        <div className="h-px flex-1 bg-border" />
        {collapsed ? (
          <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
        )}
      </button>
      {!collapsed && <div className="mt-4">{children}</div>}
    </div>
  )
}

export default function DashboardCharts({ transactions = [], selectedMonth = '', onSelectedMonthChange }) {
  const cleanTransactions = useMemo(() => transactions.filter((transaction) => !transaction.ignored), [transactions])

  const availableMonths = useMemo(
    () => [...new Set(cleanTransactions.map((transaction) => transaction.month).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
    [cleanTransactions]
  )
  const activeMonth = availableMonths.includes(selectedMonth) ? selectedMonth : availableMonths[0] || ''

  const monthlyTotals = useMemo(() => {
    const map = {}
    for (const transaction of cleanTransactions) {
      if (!map[transaction.month]) map[transaction.month] = { month: transaction.month, debit: 0, credit: 0, net: 0 }
      if (transaction.type === 'debit') map[transaction.month].debit += transaction.amount
      else map[transaction.month].credit += transaction.amount
      map[transaction.month].net = map[transaction.month].credit - map[transaction.month].debit
    }
    return Object.values(map)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => ({ ...row, debit: Math.round(row.debit), credit: Math.round(row.credit), net: Math.round(row.net) }))
  }, [cleanTransactions])

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

  const categoryBreakdown = useMemo(() => {
    const map = {}
    for (const transaction of monthSummary.txs.filter((entry) => entry.type === 'debit')) {
      const key = transaction[catChartBy] || 'Uncategorized'
      map[key] = (map[key] || 0) + transaction.amount
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)
  }, [monthSummary, catChartBy])

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
    try { return JSON.parse(localStorage.getItem('dashboardSections') || '{}') }
    catch { return {} }
  })
  const toggleSection = (key) => setCollapsedSections((prev) => {
    const next = { ...prev, [key]: !prev[key] }
    localStorage.setItem('dashboardSections', JSON.stringify(next))
    return next
  })

  const [drillCategory, setDrillCategory] = useState(null)
  useEffect(() => { setDrillCategory(null) }, [activeMonth, catChartBy])

  const categoryTagMap = useMemo(() => {
    const map = {}
    for (const t of monthSummary.txs.filter((e) => e.type === 'debit')) {
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
  }, [monthSummary])

  const drillBreakdown = useMemo(() => {
    if (!drillCategory) return []
    const map = {}
    for (const t of monthSummary.txs.filter((e) => e.type === 'debit' && (e.category || 'Uncategorized') === drillCategory)) {
      const key = t.tag || 'Unknown'
      map[key] = (map[key] || 0) + t.amount
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [drillCategory, monthSummary])

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
          <h3 className="text-lg font-semibold text-foreground">Dashboard</h3>
          <p className="mt-1 text-sm text-muted-foreground">Charts update from the filtered transaction set.</p>
        </div>
        <div className="flex min-w-56 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Month</span>
          <Select value={activeMonth} onChange={(event) => onSelectedMonthChange?.(event.target.value)} className="min-w-36 flex-1 border-0 bg-transparent p-0 shadow-none focus:ring-0">
            {availableMonths.map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </Select>
        </div>
      </div>

      <CollapsibleSection title="Summary" collapsed={!!collapsedSections.summary} onToggle={() => toggleSection('summary')}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total spend" value={fmt(monthSummary.debit)} detail={`${monthSummary.count} clean transactions`} icon={TrendingDown} tone="spend" />
          <StatCard label="Credits" value={fmt(monthSummary.credit)} detail="Income, refunds, and transfers" icon={TrendingUp} tone="income" />
          <StatCard label={net >= 0 ? 'Surplus' : 'Deficit'} value={fmt(Math.abs(net))} detail={`${Math.round(savingsRate)}% savings rate`} icon={net >= 0 ? ArrowUpRight : ArrowDownRight} tone={net >= 0 ? 'primary' : 'spend'} />
          <StatCard label="Avg debit" value={fmt(monthSummary.avgDebit)} detail={topTag ? `Largest tag: ${topTag.name}` : 'No debit data yet'} icon={BadgeIndianRupee} tone="amber" />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Trends" collapsed={!!collapsedSections.trends} onToggle={() => toggleSection('trends')}>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity size={18} className="text-primary" /> Cash flow trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={monthlyTotals} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={CHART_STYLE.grid} vertical={false} />
                  <XAxis dataKey="month" tick={CHART_STYLE.tick} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={shortFmt} tick={CHART_STYLE.tick} tickLine={false} axisLine={false} width={54} />
                  <Tooltip formatter={(value) => fmt(value)} contentStyle={CHART_STYLE.tooltip} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="credit" name="Credit" stroke="#047857" fill="#047857" fillOpacity={0.12} strokeWidth={2.5} />
                  <Area type="monotone" dataKey="debit" name="Spend" stroke="#be123c" fill="#be123c" fillOpacity={0.1} strokeWidth={2.5} />
                  <Line type="monotone" dataKey="net" name="Net" stroke="#4f46e5" strokeWidth={2.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
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
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
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
                  <BarChart data={tagBreakdown} layout="vertical" margin={{ top: 0, right: 18, left: 24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke={CHART_STYLE.grid} horizontal={false} />
                    <XAxis type="number" tickFormatter={shortFmt} tick={CHART_STYLE.tick} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={96} tick={CHART_STYLE.tick} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => fmt(value)} contentStyle={CHART_STYLE.tooltip} cursor={CHART_STYLE.cursor} />
                    <Bar dataKey="value" fill="#047857" radius={[0, 6, 6, 0]} />
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
                  <BarChart data={daySpend} margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke={CHART_STYLE.grid} vertical={false} />
                    <XAxis dataKey="day" tick={CHART_STYLE.tick} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={shortFmt} tick={CHART_STYLE.tick} axisLine={false} tickLine={false} width={54} />
                    <Tooltip formatter={(value) => fmt(value)} labelFormatter={(day) => `Day ${day}`} contentStyle={CHART_STYLE.tooltip} cursor={CHART_STYLE.cursor} />
                    <Bar dataKey="amount" name="Spend" fill="#4f46e5" radius={[6, 6, 0, 0]} />
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