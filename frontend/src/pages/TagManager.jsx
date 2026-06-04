import { useEffect, useState, useMemo } from 'react'
import PageShell from '@/components/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'  // used for search bar
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getTagMappings, updateTagMapping, setTagIgnored } from '@/api/client'
import { Filter, EyeOff } from 'lucide-react'

function CategoryCell({ mapping, onSave, existingCategories = [] }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(mapping.category ?? '')
  const listId = `cat-list-${mapping.particulars.replace(/\W/g, '_')}`

  // Sync local val when the category is updated externally (e.g. bulk tag save)
  useEffect(() => {
    if (!editing) queueMicrotask(() => setVal(mapping.category ?? ''))
  }, [mapping.category, editing])

  const commit = async () => {
    setEditing(false)
    const newCat = val.trim() || null
    if (newCat !== (mapping.category ?? null)) {
      await onSave(mapping.particulars, newCat)
    }
  }

  if (editing) {
    return (
      <>
        <datalist id={listId}>
          {existingCategories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <input
          autoFocus
          list={listId}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit() }}
          className="min-h-10 w-44 rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="e.g. Groceries"
        />
      </>
    )
  }

  return (
    <span
      className="cursor-pointer text-sm hover:underline"
      onClick={() => setEditing(true)}
      title="Click to edit category"
    >
      {mapping.category ? (
        <Badge variant="secondary">{mapping.category}</Badge>
      ) : (
        <span className="italic text-muted-foreground text-xs">set category…</span>
      )}
    </span>
  )
}

export default function TagManager() {
  const [mappings, setMappings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uncategorizedOnly, setUncategorizedOnly] = useState(false)
  const [search, setSearch] = useState('')

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

  // Group by tag
  const existingCategories = useMemo(
    () => [...new Set(mappings.map((m) => m.category).filter(Boolean))].sort(),
    [mappings]
  )

  const grouped = useMemo(() => {
    let list = mappings
    if (uncategorizedOnly) list = list.filter((m) => !m.category)
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
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
  }, [mappings, uncategorizedOnly, search])

  const uncategorizedCount = useMemo(
    () => mappings.filter((m) => !m.category).length,
    [mappings]
  )

  return (
    <PageShell
      eyebrow="Taxonomy"
      title="Tag Manager"
      description="Normalize merchant tags into reporting categories and exclude noisy tags from dashboards."
      actions={uncategorizedCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20 shrink-0">
            {uncategorizedCount} uncategorized
          </span>
        )}
    >

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <Input
          placeholder="Search tag, particulars, or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xl"
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer text-muted-foreground hover:text-foreground transition-colors select-none">
          <Checkbox
            checked={uncategorizedOnly}
            onCheckedChange={setUncategorizedOnly}
          />
          <Filter size={13} />
          Show uncategorized only
        </label>
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
          {grouped.map(([tag, items]) => (
            <Card key={tag} className={`transition-opacity ${items[0].ignored ? 'opacity-55' : ''}`}>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                  <Badge className={`font-medium ${items[0].ignored ? 'opacity-40' : ''}`}>{tag}</Badge>
                  <span className="text-muted-foreground font-normal text-xs">
                    {items.length} particular{items.length !== 1 ? 's' : ''}
                  </span>
                  {items[0].ignored && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50">
                      <EyeOff size={9} /> excluded
                    </span>
                  )}
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleToggleIgnored(tag, items[0].ignored)}
                      title={items[0].ignored ? 'Include in dashboards' : 'Exclude from dashboards'}
                      className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors cursor-pointer ${
                        items[0].ignored
                          ? 'border-primary/30 text-primary bg-primary/10 hover:bg-primary/20'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5'
                      }`}
                    >
                      <EyeOff size={11} />
                      {items[0].ignored ? 'Excluded' : 'Exclude'}
                    </button>
                    <CategoryCell
                      mapping={{ ...items[0], category: items[0].category ?? null }}
                      onSave={(_, category) => handleSaveAllInTag(tag, category)}
                      existingCategories={existingCategories}
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-auto rounded-lg border border-border/80">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          Particulars
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
                          <td className="px-3 py-2 text-muted-foreground truncate max-w-xs">
                            {m.particulars}
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
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  )
}
