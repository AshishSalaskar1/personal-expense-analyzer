import { useEffect, useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ChevronRight } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { DEFAULT_CHART_PALETTE, getChartPalette } from '@/lib/chartPalettes'

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

const fmt = (v) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const isWithinMonthRange = (month, from, to) => {
  if (!month) return false
  if (from && month < from) return false
  if (to && month > to) return false
  return true
}

function MonthRangeControls({ months = [], from, to, onFromChange, onToChange }) {
  const ascendingMonths = useMemo(() => [...months].sort((a, b) => a.localeCompare(b)), [months])
  const firstMonth = ascendingMonths[0] || ''
  const lastMonth = ascendingMonths[ascendingMonths.length - 1] || ''

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/35 px-2.5 py-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Range</span>
      <Select value={from || firstMonth} onChange={(event) => onFromChange(event.target.value)} className="min-h-9 w-32 border-0 bg-card px-2 py-1 text-xs font-bold shadow-none focus:ring-1">
        {ascendingMonths.map((month) => (
          <option key={month} value={month}>{month}</option>
        ))}
      </Select>
      <span className="text-xs font-bold text-muted-foreground">to</span>
      <Select value={to || lastMonth} onChange={(event) => onToChange(event.target.value)} className="min-h-9 w-32 border-0 bg-card px-2 py-1 text-xs font-bold shadow-none focus:ring-1">
        {ascendingMonths.map((month) => (
          <option key={month} value={month}>{month}</option>
        ))}
      </Select>
    </div>
  )
}

/**
 * ChartPanel — renders charts based on groupBy and transaction data.
 *
 * Props:
 *   data        – array of TransactionOut objects
 *   groupBy     – 'tag' | 'category' | 'type' | 'month'
 *   chartType   – 'bar' | 'line' | 'pie'  (default 'bar')
 */
export default function ChartPanel({ data = [], groupBy = 'tag', chartType = 'bar', paletteKey = DEFAULT_CHART_PALETTE }) {
  const palette = useMemo(() => getChartPalette(paletteKey), [paletteKey])
  const colors = palette.swatches
  const [fromMonth, setFromMonth] = useState('')
  const [toMonth, setToMonth] = useState('')
  const [drillKey, setDrillKey] = useState(null)
  useEffect(() => { setDrillKey(null) }, [groupBy])

  const availableMonths = useMemo(
    () => [...new Set(data.map((transaction) => transaction.month).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [data]
  )
  const firstMonth = availableMonths[0] || ''
  const lastMonth = availableMonths[availableMonths.length - 1] || ''
  const effectiveFrom = fromMonth || firstMonth
  const effectiveTo = toMonth || lastMonth
  const rangeFrom = effectiveFrom > effectiveTo ? effectiveTo : effectiveFrom
  const rangeTo = effectiveFrom > effectiveTo ? effectiveFrom : effectiveTo
  const rangedData = useMemo(
    () => data.filter((transaction) => isWithinMonthRange(transaction.month, rangeFrom, rangeTo)),
    [data, rangeFrom, rangeTo]
  )
  const rangeControls = availableMonths.length > 1 ? (
    <MonthRangeControls months={availableMonths} from={fromMonth} to={toMonth} onFromChange={setFromMonth} onToChange={setToMonth} />
  ) : null

  // Aggregate debits by groupBy × month for bar/line, or by groupBy for pie
  const { barData, pieData, keys } = useMemo(() => {
    const debits = rangedData.filter((t) => t.type === 'debit' && !t.ignored)

    // Pie: sum by groupBy
    const pieMap = {}
    for (const t of debits) {
      const k = t[groupBy] || 'Unknown'
      pieMap[k] = (pieMap[k] || 0) + t.amount
    }
    const pieData = Object.entries(pieMap)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12) // top 12

    // Bar/line: sum by month × groupBy
    const allMonths = [...new Set(debits.map((t) => t.month))].sort()
    const allKeys = [...new Set(debits.map((t) => t[groupBy] || 'Unknown'))]
      .filter(Boolean)
      .slice(0, 10) // top 10 keys to avoid chart overload

    const monthMap = {}
    for (const m of allMonths) {
      monthMap[m] = { month: m }
      for (const k of allKeys) monthMap[m][k] = 0
    }
    for (const t of debits) {
      const k = t[groupBy] || 'Unknown'
      if (monthMap[t.month] && allKeys.includes(k)) {
        monthMap[t.month][k] = (monthMap[t.month][k] || 0) + t.amount
      }
    }
    const barData = allMonths.map((m) => {
      const row = { ...monthMap[m] }
      for (const k of allKeys) row[k] = Math.round(row[k] || 0)
      return row
    })

    return { barData, pieData, keys: allKeys }
  }, [rangedData, groupBy])

  // Drill-down: when drillKey is set (category → tags), re-aggregate by tag
  const drillData = useMemo(() => {
    if (!drillKey || groupBy !== 'category') return null
    const debits = rangedData.filter((t) => t.type === 'debit' && !t.ignored && (t.category || 'Unknown') === drillKey)

    const allMonths = [...new Set(debits.map((t) => t.month))].sort()
    const allTagKeys = [...new Set(debits.map((t) => t.tag || 'Unknown'))].filter(Boolean).slice(0, 10)

    const monthMap = {}
    for (const m of allMonths) {
      monthMap[m] = { month: m }
      for (const k of allTagKeys) monthMap[m][k] = 0
    }
    for (const t of debits) {
      const k = t.tag || 'Unknown'
      if (monthMap[t.month] && allTagKeys.includes(k)) {
        monthMap[t.month][k] = (monthMap[t.month][k] || 0) + t.amount
      }
    }
    const drillBarData = allMonths.map((m) => {
      const row = { ...monthMap[m] }
      for (const k of allTagKeys) row[k] = Math.round(row[k] || 0)
      return row
    })

    const pieMap = {}
    for (const t of debits) {
      const k = t.tag || 'Unknown'
      pieMap[k] = (pieMap[k] || 0) + t.amount
    }
    const drillPieData = Object.entries(pieMap)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12)

    return { barData: drillBarData, pieData: drillPieData, keys: allTagKeys }
  }, [drillKey, rangedData, groupBy])

  const active = drillData || { barData, pieData, keys }
  const canDrill = groupBy === 'category' && !drillKey

  const breadcrumb = drillKey ? (
    <div className="mb-3 flex items-center gap-1.5 text-xs">
      <button
        type="button"
        onClick={() => setDrillKey(null)}
        className="font-medium text-primary hover:underline"
      >
        All Categories
      </button>
      <ChevronRight size={12} className="text-muted-foreground" />
      <span className="font-medium text-foreground">{drillKey}</span>
      <span className="ml-1 text-muted-foreground">· by tag</span>
    </div>
  ) : null

  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-sm font-medium text-muted-foreground">
        No data to display
      </div>
    )
  }

  if (!rangedData.length) {
    return (
      <div>
        {rangeControls}
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-sm font-medium text-muted-foreground">
          No data in selected range
        </div>
      </div>
    )
  }

  if (chartType === 'pie') {
    return (
      <div>
        {rangeControls}
        {breadcrumb}
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={active.pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={112}
              paddingAngle={2}
              cursor={canDrill ? 'pointer' : 'default'}
              onClick={canDrill ? (entry) => setDrillKey(entry.name) : undefined}
            >
              {active.pieData.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => fmt(v)}
              contentStyle={CHART_STYLE.tooltip}
            />
            <Legend wrapperStyle={{ fontSize: '12px', lineHeight: '20px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (chartType === 'line') {
    return (
      <div>
        {rangeControls}
        {breadcrumb}
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={active.barData} margin={{ top: 8, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="4 4" stroke={CHART_STYLE.grid} vertical={false} />
            <XAxis dataKey="month" tick={CHART_STYLE.tick} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={CHART_STYLE.tick} axisLine={false} tickLine={false} width={54} />
            <Tooltip
              formatter={(v) => fmt(v)}
              contentStyle={CHART_STYLE.tooltip}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {active.keys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]} dot={false} strokeWidth={2.5} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Grouped bar chart (bars side-by-side, no stackId)
  if (chartType === 'grouped') {
    return (
      <div>
        {rangeControls}
        {breadcrumb}
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={active.barData} margin={{ top: 8, right: 20, left: 0, bottom: 5 }} barCategoryGap="20%" barGap={3}>
            <CartesianGrid strokeDasharray="4 4" stroke={CHART_STYLE.grid} vertical={false} />
            <XAxis dataKey="month" tick={CHART_STYLE.tick} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={CHART_STYLE.tick} axisLine={false} tickLine={false} width={54} />
            <Tooltip
              formatter={(v) => fmt(v)}
              contentStyle={CHART_STYLE.tooltip}
              cursor={CHART_STYLE.cursor}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {active.keys.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                fill={colors[i % colors.length]}
                fillOpacity={0.95}
                stroke="hsl(var(--foreground) / 0.28)"
                strokeWidth={1}
                radius={[3, 3, 0, 0]}
                cursor={canDrill ? 'pointer' : 'default'}
                onClick={canDrill ? () => setDrillKey(k) : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Default: stacked bar chart
  return (
    <div>
      {rangeControls}
      {breadcrumb}
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={active.barData} margin={{ top: 8, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="4 4" stroke={CHART_STYLE.grid} vertical={false} />
          <XAxis dataKey="month" tick={CHART_STYLE.tick} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={CHART_STYLE.tick} axisLine={false} tickLine={false} width={54} />
          <Tooltip
            formatter={(v) => fmt(v)}
            contentStyle={CHART_STYLE.tooltip}
            cursor={CHART_STYLE.cursor}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          {active.keys.map((k, i) => (
            <Bar
              key={k}
              dataKey={k}
              fill={colors[i % colors.length]}
              fillOpacity={0.95}
              stroke="hsl(var(--foreground) / 0.28)"
              strokeWidth={1}
              stackId="stack"
              radius={[2, 2, 0, 0]}
              cursor={canDrill ? 'pointer' : 'default'}
              onClick={canDrill ? () => setDrillKey(k) : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
