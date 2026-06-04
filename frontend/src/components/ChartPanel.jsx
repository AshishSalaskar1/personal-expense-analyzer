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

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1',
]

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
  const { barData, pieData, months, keys } = useMemo(() => {
    const debits = data.filter((t) => t.type === 'debit')

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

    return { barData, pieData, months: allMonths, keys: allKeys }
  }, [data, groupBy])

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
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
            outerRadius={110}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => fmt(v)} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v) => fmt(v)} />
          <Legend />
          {keys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  // Default: grouped bar chart
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v) => fmt(v)} />
        <Legend />
        {keys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} stackId="stack" />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
