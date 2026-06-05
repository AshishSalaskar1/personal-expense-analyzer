import { useEffect, useMemo, useState } from 'react'
import PageShell from '@/components/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { getMonths, getTransactions } from '@/api/client'
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
import { Activity, ArrowDownRight, ArrowUpRight, BadgeIndianRupee, PieChart as PieIcon, ReceiptText, TrendingDown, TrendingUp } from 'lucide-react'

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

function StatCard({ label, value, detail, icon: Icon, tone = 'primary' }) {
  const toneClass = {
    primary: 'bg-primary/10 text-primary',
    income: 'bg-emerald-100 text-emerald-700',
    spend: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-700',
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

export default function Dashboard() {
  const [transactions, setTransactions] = useState([])
  const [months, setMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getTransactions(), getMonths()])
      .then(([txRes, monthRes]) => {
        setTransactions(txRes.data)
        setMonths(monthRes.data)
        if (monthRes.data.length > 0) setSelectedMonth(monthRes.data[0].month)
      })
      .finally(() => setLoading(false))
  }, [])

  const cleanTransactions = useMemo(() => transactions.filter((transaction) => !transaction.ignored), [transactions])

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
    const txs = cleanTransactions.filter((transaction) => transaction.month === selectedMonth)
    const debits = txs.filter((transaction) => transaction.type === 'debit')
    const debit = debits.reduce((sum, transaction) => sum + transaction.amount, 0)
    const credit = txs.filter((transaction) => transaction.type === 'credit').reduce((sum, transaction) => sum + transaction.amount, 0)
    return { txs, debit, credit, avgDebit: debits.length ? debit / debits.length : 0, count: txs.length }
  }, [cleanTransactions, selectedMonth])

  const tagBreakdown = useMemo(() => {
    const map = {}
    for (const transaction of monthSummary.txs.filter((entry) => entry.type === 'debit')) {
      const key = transaction.tag || 'Unknown'
      map[key] = (map[key] || 0) + transaction.amount
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [monthSummary])

  const categoryBreakdown = useMemo(() => {
    const map = {}
    for (const transaction of monthSummary.txs.filter((entry) => entry.type === 'debit')) {
      const key = transaction.category || 'Uncategorized'
      map[key] = (map[key] || 0) + transaction.amount
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)
  }, [monthSummary])

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

  if (loading) {
    return (
      <PageShell title="Dashboard" description="Preparing your financial overview.">
        <Card>
          <CardContent className="flex min-h-80 items-center justify-center p-6">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              <p className="text-sm font-medium">Loading dashboard</p>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell
      eyebrow="Overview"
      title="Dashboard"
      description="Track cash flow, spending concentration, and month-level patterns without losing readability."
      actions={(
        <div className="flex min-w-56 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Month</span>
          <Select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="min-w-36 flex-1 border-0 bg-transparent p-0 shadow-none focus:ring-0">
            {months.map((month) => (
              <option key={month.month} value={month.month}>{month.month} ({month.count})</option>
            ))}
          </Select>
        </div>
      )}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total spend" value={fmt(monthSummary.debit)} detail={`${monthSummary.count} clean transactions`} icon={TrendingDown} tone="spend" />
        <StatCard label="Credits" value={fmt(monthSummary.credit)} detail="Income, refunds, and transfers" icon={TrendingUp} tone="income" />
        <StatCard label={net >= 0 ? 'Surplus' : 'Deficit'} value={fmt(Math.abs(net))} detail={`${Math.round(savingsRate)}% savings rate`} icon={net >= 0 ? ArrowUpRight : ArrowDownRight} tone={net >= 0 ? 'primary' : 'spend'} />
        <StatCard label="Avg debit" value={fmt(monthSummary.avgDebit)} detail={topTag ? `Largest tag: ${topTag.name}` : 'No debit data yet'} icon={BadgeIndianRupee} tone="amber" />
      </div>

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
            <CardTitle className="flex items-center gap-2"><PieIcon size={18} className="text-primary" /> Category mix</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">No category data for this month.</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="48%" innerRadius={58} outerRadius={104} paddingAngle={2}>
                    {categoryBreakdown.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => fmt(value)} contentStyle={CHART_STYLE.tooltip} />
                  <Legend layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: '12px', lineHeight: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ReceiptText size={18} className="text-primary" /> Spend by tag</CardTitle>
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
    </PageShell>
  )
}
