import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { getTransactions, getMonths } from '@/api/client'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'

const fmt = (v) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

export default function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [months, setMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getTransactions(), getMonths()])
      .then(([txRes, mRes]) => {
        setTransactions(txRes.data)
        setMonths(mRes.data)
        if (mRes.data.length > 0) setSelectedMonth(mRes.data[0].month)
      })
      .finally(() => setLoading(false))
  }, [])

  // Monthly totals for line chart
  const monthlyTotals = useMemo(() => {
    const map = {}
    for (const t of transactions) {
      if (!map[t.month]) map[t.month] = { month: t.month, debit: 0, credit: 0 }
      if (t.type === 'debit') map[t.month].debit += t.amount
      else map[t.month].credit += t.amount
    }
    return Object.values(map)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((r) => ({ ...r, debit: Math.round(r.debit), credit: Math.round(r.credit) }))
  }, [transactions])

  // Summary for selected month
  const monthSummary = useMemo(() => {
    const txs = transactions.filter((t) => t.month === selectedMonth)
    const debit = txs.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0)
    const credit = txs.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0)
    return { txs, debit, credit, count: txs.length }
  }, [transactions, selectedMonth])

  // Top tags for selected month
  const tagBreakdown = useMemo(() => {
    const map = {}
    for (const t of monthSummary.txs.filter((t) => t.type === 'debit')) {
      const k = t.tag || 'Unknown'
      map[k] = (map[k] || 0) + t.amount
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [monthSummary])

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      {/* Month selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Selected month:</span>
        <Select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-40"
        >
          {months.map((m) => (
            <option key={m.month} value={m.month}>
              {m.month} ({m.count})
            </option>
          ))}
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown size={14} className="text-red-500" /> Total Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{fmt(monthSummary.debit)}</p>
            <p className="text-xs text-muted-foreground mt-1">{monthSummary.count} transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp size={14} className="text-green-500" /> Total Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{fmt(monthSummary.credit)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet size={14} /> Net
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${monthSummary.credit - monthSummary.debit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmt(Math.abs(monthSummary.credit - monthSummary.debit))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {monthSummary.credit - monthSummary.debit >= 0 ? 'surplus' : 'deficit'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly trend line chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyTotals} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend />
              <Line type="monotone" dataKey="debit" stroke="#ef4444" name="Debit" dot />
              <Line type="monotone" dataKey="credit" stroke="#10b981" name="Credit" dot />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tag breakdown for selected month */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spend by Tag — {selectedMonth}</CardTitle>
        </CardHeader>
        <CardContent>
          {tagBreakdown.length === 0 ? (
            <p className="text-muted-foreground text-sm">No debit data for this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={tagBreakdown} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={60} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
