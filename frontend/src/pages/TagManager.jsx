import { useEffect, useState, useMemo } from 'react'
import PageShell from '@/components/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'  // used for search bar
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getTagMappings, updateTagMapping, setTagIgnored } from '@/api/client'
import { ChevronDown, Filter, EyeOff } from 'lucide-react'
import { compactLongIdentifiers } from '@/lib/compactIdentifiers'

function CategoryCell({ mapping, onSave, existingCategories = [], prominent = false }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(mapping.category ?? '')
  const [customMode, setCustomMode] = useState(false)

  // Sync local val when the category is updated externally (e.g. bulk tag save)
  useEffect(() => {
    if (!editing) {
      queueMicrotask(() => setVal(mapping.category ?? ''))
      setCustomMode(false)
    }
  }, [mapping.category, editing])

  const commit = async (nextValue = val) => {
    setEditing(false)
    setCustomMode(false)
    const newCat = nextValue.trim() || null
    if (newCat !== (mapping.category ?? null)) {
      await onSave(mapping.particulars, newCat)
    }
  }

  const handleSelect = (event) => {
    const nextValue = event.target.value
    if (nextValue === '__new__') {
      setCustomMode(true)
      setVal('')
      return
    }
    setVal(nextValue)
    queueMicrotask(() => commit(nextValue))
  }

  if (editing) {
    return (
      <div className={`${prominent ? 'w-full min-w-56' : 'w-56'} space-y-2`}>
        {!customMode ? (
          <Select
            autoFocus
            value={mapping.category ?? ''}
            onChange={handleSelect}
            onBlur={() => setEditing(false)}
            className="min-h-10 rounded-lg font-semibold"
          >
            <option value="">No category</option>
            {existingCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
            <option value="__new__">+ New category...</option>
          </Select>
        ) : (
          <div className="flex gap-2">
            <Input
              autoFocus
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') setEditing(false)
              }}
              className="min-h-10 text-sm font-semibold"
              placeholder="New category"
            />
            <button
              type="button"
              onClick={() => commit()}
              className="min-h-10 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
            >
              Save
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`${prominent ? 'min-h-11 w-full justify-between rounded-xl px-3 text-sm' : 'rounded-lg px-2 py-1 text-xs'} inline-flex items-center gap-2 border border-border bg-card font-bold text-foreground shadow-sm transition-colors hover:border-primary/50 hover:bg-muted cursor-pointer`}
      onClick={() => setEditing(true)}
      title="Click to edit category"
    >
      {mapping.category ? (
        <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">{mapping.category}</span>
      ) : (
        <span className="text-muted-foreground">set category…</span>
      )}
      {prominent && <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Edit</span>}
    </button>
  )
}

function TypeBadge({ type }) {
  const tone = {
    debit: 'bg-red-50 text-red-700 border-red-200',
    credit: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    mixed: 'bg-amber-50 text-amber-700 border-amber-200',
  }[type] || 'bg-muted text-muted-foreground border-border'

  return (
    <span className={`inline-flex min-h-6 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}>
      {type || '—'}
    </span>
  )
}

function inferMappingType(mapping) {
  if (mapping.type) return mapping.type
  if (!mapping.tx_count) return null
  return Number(mapping.total_amount || 0) > 0 ? 'debit' : 'credit'
}

export default function TagManager() {
  const [mappings, setMappings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uncategorizedOnly, setUncategorizedOnly] = useState(false)
  const [excludedOnly, setExcludedOnly] = useState(false)
  const [sortBy, setSortBy] = useState('count')
  const [search, setSearch] = useState('')
  const [expandedTags, setExpandedTags] = useState(() => new Set())

  const fmtMoney = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  const load = () => {
    setLoading(true)
    getTagMappings()
      .then((r) => setMappings(r.data))
      .catch(() => setError('Failed to load tag mappings'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { queueMicrotask(load) }, [])

  const handleSave = async (particulars, category) => {
    try {
      await updateTagMapping(particulars, category)
      setMappings((prev) =>
        prev.map((m) => (m.particulars === particulars ? { ...m, category } : m))
      )
    } catch {
      setError('Failed to save category')
    }
  }

  // Save a category to ALL particulars that share the same tag
  const handleSaveAllInTag = async (tag, category) => {
    const targets = mappings.filter((m) => m.tag === tag)
    try {
      await Promise.all(targets.map((m) => updateTagMapping(m.particulars, category)))
      setMappings((prev) =>
        prev.map((m) => (m.tag === tag ? { ...m, category } : m))
      )
    } catch {
      setError('Failed to save category')
    }
  }

  // Toggle ignored state for all particulars in a tag
  const handleToggleIgnored = async (tag, currentlyIgnored) => {
    const newIgnored = !currentlyIgnored
    try {
      await setTagIgnored(tag, newIgnored)
      setMappings((prev) =>
        prev.map((m) => (m.tag === tag ? { ...m, ignored: newIgnored } : m))
      )
    } catch {
      setError('Failed to update ignored status')
    }
  }

  const toggleExpanded = (tag) => {
    setExpandedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  // Group by tag
  const existingCategories = useMemo(
    () => [...new Set(mappings.map((m) => m.category).filter(Boolean))].sort(),
    [mappings]
  )

  const grouped = useMemo(() => {
    let list = mappings
    if (uncategorizedOnly) list = list.filter((m) => !m.category)
    if (excludedOnly) list = list.filter((m) => m.ignored)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (m) =>
          m.particulars.toLowerCase().includes(q) ||
          m.tag.toLowerCase().includes(q) ||
          (m.category ?? '').toLowerCase().includes(q)
      )
    }
    // Group by tag
    const groups = {}
    for (const m of list) {
      if (!groups[m.tag]) groups[m.tag] = []
      groups[m.tag].push(m)
    }
    return Object.entries(groups)
      .map(([tag, items]) => {
        const totalAmount = items.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)
        const avgAmount = items.length ? totalAmount / items.length : 0
        return { tag, items, totalAmount, avgAmount }
      })
      .sort((a, b) => {
        if (sortBy === 'total') return b.totalAmount - a.totalAmount
        if (sortBy === 'avg') return b.avgAmount - a.avgAmount
        return b.items.length - a.items.length
      })
  }, [mappings, uncategorizedOnly, excludedOnly, search, sortBy])

  const uncategorizedCount = useMemo(
    () => mappings.filter((m) => !m.category).length,
    [mappings]
  )
  const excludedCount = useMemo(
    () => new Set(mappings.filter((m) => m.ignored).map((m) => m.tag)).size,
    [mappings]
  )

  return (
    <PageShell
      eyebrow="Taxonomy"
      title="Tag Manager"
      description="Normalize merchant tags into reporting categories and exclude noisy tags from dashboards."
      actions={(uncategorizedCount > 0 || excludedCount > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {excludedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border shrink-0">
              <EyeOff size={12} /> {excludedCount} excluded
            </span>
          )}
          {uncategorizedCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 shrink-0">
            {uncategorizedCount} uncategorized
          </span>
          )}
        </div>
      )}
    >

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <Card>
        <CardHeader className="border-b border-border/70 pb-3">
          <CardTitle className="text-base">Find mappings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <Input
          placeholder="Search tag, particulars, or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xl"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-bold text-foreground">Sort</span>
            <Select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="min-h-10 w-44 text-sm font-semibold">
              <option value="count">Most particulars</option>
              <option value="total">Highest total</option>
              <option value="avg">Highest avg amount</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer text-muted-foreground hover:text-foreground transition-colors select-none">
            <Checkbox
              checked={uncategorizedOnly}
              onCheckedChange={setUncategorizedOnly}
            />
            <Filter size={13} />
            Show uncategorized only
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer text-muted-foreground hover:text-foreground transition-colors select-none">
            <Checkbox
              checked={excludedOnly}
              onCheckedChange={setExcludedOnly}
            />
            <EyeOff size={13} />
            Show excluded only
          </label>
        </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          Loading tag mappings…
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
            <Filter size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No tag mappings found</p>
          <p className="text-xs text-muted-foreground mt-1">Upload a statement first to generate tags</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ tag, items, totalAmount, avgAmount }) => {
            const expanded = expandedTags.has(tag)
            return (
            <Card key={tag} className={`transition-opacity ${items[0].ignored ? 'opacity-55' : ''}`}>
              <CardHeader className="pb-4 pt-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)_auto_auto] lg:items-center">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Tag</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`max-w-full truncate rounded-xl bg-foreground px-3 py-2 text-base font-extrabold tracking-tight text-background ${items[0].ignored ? 'opacity-50' : ''}`}>
                        {tag}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground">
                        {items.length} particular{items.length !== 1 ? 's' : ''}
                      </span>
                      <span className="rounded-full border border-border bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                        Total {fmtMoney(totalAmount)}
                      </span>
                      <span className="rounded-full border border-border bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                        Avg {fmtMoney(avgAmount)}
                      </span>
                      {items[0].ignored && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                          <EyeOff size={10} /> excluded
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Category for this tag</p>
                    <CategoryCell
                      mapping={{ ...items[0], category: items[0].category ?? null }}
                      onSave={(_, category) => handleSaveAllInTag(tag, category)}
                      existingCategories={existingCategories}
                      prominent
                    />
                  </div>
                  <button
                    onClick={() => handleToggleIgnored(tag, items[0].ignored)}
                    title={items[0].ignored ? 'Include in dashboards' : 'Exclude from dashboards'}
                    className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors cursor-pointer ${
                      items[0].ignored
                        ? 'border-primary/30 text-primary bg-primary/10 hover:bg-primary/20'
                        : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5'
                    }`}
                  >
                    <EyeOff size={13} />
                    {items[0].ignored ? 'Excluded' : 'Exclude'}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(tag)}
                    aria-expanded={expanded}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-bold text-foreground transition-colors hover:border-primary/40 hover:bg-muted cursor-pointer"
                  >
                    <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                    {expanded ? 'Hide items' : 'Show items'}
                  </button>
                </div>
              </CardHeader>
              {expanded && (
              <CardContent className="pt-0">
                <div className="overflow-auto rounded-lg border border-border/80">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Particulars
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground w-24">
                          Type
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground w-24 text-right">
                          Amount
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground w-24">
                          Last Seen
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground w-44">
                          Category
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((m) => (
                        <tr key={m.particulars} className="border-t border-border/40 hover:bg-muted/20 transition-colors">
                          <td className="max-w-xs truncate px-3 py-2 font-medium text-foreground" title={m.particulars}>
                            {compactLongIdentifiers(m.particulars)}
                          </td>
                          <td className="px-3 py-2">
                            <TypeBadge type={inferMappingType(m)} />
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-foreground/80">
                            {m.total_amount != null
                              ? `₹${m.total_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground tabular-nums">
                            {m.last_date ?? '—'}
                          </td>
                          <td className="px-3 py-2">
                            <CategoryCell mapping={m} onSave={handleSave} existingCategories={existingCategories} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              )}
            </Card>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
