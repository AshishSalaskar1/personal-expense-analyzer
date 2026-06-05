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

const COLORS = ['#B45309', '#1D4ED8', '#7C3AED', '#047857', '#BE123C', '#0E7490', '#A16207', '#9333EA']

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

/**
 * ChartPanel — renders charts based on groupBy and transaction data.
 *
 * Props:
 *   data        – array of TransactionOut objects
 *   groupBy     – 'tag' | 'category' | 'type' | 'month'
 *   chartType   – 'bar' | 'line' | 'pie'  (default 'bar')
 */
export default function ChartPanel({ data = [], groupBy = 'tag', chartType = 'bar' }) {
  const [drillKey, setDrillKey] = useState(null)
  useEffect(() => { setDrillKey(null) }, [groupBy])

  // Aggregate debits by groupBy × month for bar/line, or by groupBy for pie
  const { barData, pieData, keys } = useMemo(() => {
    const debits = data.filter((t) => t.type === 'debit' && !t.ignored)

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
  }, [data, groupBy])

  // Drill-down: when drillKey is set (category → tags), re-aggregate by tag
  const drillData = useMemo(() => {
    if (!drillKey || groupBy !== 'category') return null
    const debits = data.filter((t) => t.type === 'debit' && !t.ignored && (t.category || 'Unknown') === drillKey)

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
  }, [drillKey, data, groupBy])

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

  if (chartType === 'pie') {
    return (
      <div>
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
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
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
              <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
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
                fill={COLORS[i % COLORS.length]}
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
              fill={COLORS[i % COLORS.length]}
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
