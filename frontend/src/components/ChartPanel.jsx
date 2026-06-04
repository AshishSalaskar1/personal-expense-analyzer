import { useMemo } from 'react'
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

const COLORS = ['#047857', '#4f46e5', '#d97706', '#be123c', '#0891b2', '#7c3aed', '#65a30d', '#c2410c', '#0f766e', '#b45309']

const CHART_STYLE = {
  grid: 'hsl(214 18% 85% / 0.75)',
  tooltip: {
    backgroundColor: '#ffffff',
    border: '1px solid hsl(214 18% 85%)',
    borderRadius: '8px',
    boxShadow: '0 14px 30px rgba(15, 23, 42, 0.12)',
    fontSize: '12px',
  },
  tick: { fontSize: 12, fill: '#536071' },
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

  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 text-sm font-medium text-muted-foreground">
        No data to display
      </div>
    )
  }

  if (chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={112}
            paddingAngle={2}
          >
            {pieData.map((_, i) => (
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
    )
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={barData} margin={{ top: 8, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="4 4" stroke={CHART_STYLE.grid} vertical={false} />
          <XAxis dataKey="month" tick={CHART_STYLE.tick} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={CHART_STYLE.tick} axisLine={false} tickLine={false} width={54} />
          <Tooltip
            formatter={(v) => fmt(v)}
            contentStyle={CHART_STYLE.tooltip}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          {keys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  // Grouped bar chart (bars side-by-side, no stackId)
  if (chartType === 'grouped') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={barData} margin={{ top: 8, right: 20, left: 0, bottom: 5 }} barCategoryGap="20%" barGap={3}>
          <CartesianGrid strokeDasharray="4 4" stroke={CHART_STYLE.grid} vertical={false} />
          <XAxis dataKey="month" tick={CHART_STYLE.tick} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={CHART_STYLE.tick} axisLine={false} tickLine={false} width={54} />
          <Tooltip
            formatter={(v) => fmt(v)}
            contentStyle={CHART_STYLE.tooltip}
            cursor={{ fill: 'hsl(210 20% 94%)' }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          {keys.map((k, i) => (
            <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // Default: stacked bar chart
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={barData} margin={{ top: 8, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="4 4" stroke={CHART_STYLE.grid} vertical={false} />
        <XAxis dataKey="month" tick={CHART_STYLE.tick} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={CHART_STYLE.tick} axisLine={false} tickLine={false} width={54} />
        <Tooltip
          formatter={(v) => fmt(v)}
          contentStyle={CHART_STYLE.tooltip}
          cursor={{ fill: 'hsl(210 20% 94%)' }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        {keys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} stackId="stack" radius={[2, 2, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
