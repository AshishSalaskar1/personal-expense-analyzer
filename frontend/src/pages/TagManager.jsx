import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'  // used for search bar
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getTagMappings, updateTagMapping } from '@/api/client'
import { Filter } from 'lucide-react'

function CategoryCell({ mapping, onSave, existingCategories = [] }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(mapping.category ?? '')
  const listId = `cat-list-${mapping.particulars.replace(/\W/g, '_')}`

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
          className="h-7 text-xs w-36 rounded-md border border-input bg-background px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

  useEffect(() => { load() }, [])

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
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [mappings, uncategorizedOnly, search])

  const uncategorizedCount = useMemo(
    () => mappings.filter((m) => !m.category).length,
    [mappings]
  )

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tag Manager</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Assign categories to tags. Categories are used for reporting.
          </p>
        </div>
        {uncategorizedCount > 0 && (
          <Badge variant="destructive">{uncategorizedCount} uncategorized</Badge>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search tag, particulars, or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-72"
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={uncategorizedOnly}
            onCheckedChange={setUncategorizedOnly}
          />
          <Filter size={14} />
          Show uncategorized only
        </label>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : grouped.length === 0 ? (
        <p className="text-muted-foreground">No tag mappings found. Upload a statement first.</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(([tag, items]) => (
            <Card key={tag}>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge>{tag}</Badge>
                  <span className="text-muted-foreground font-normal">
                    {items.length} particular{items.length !== 1 ? 's' : ''}
                  </span>
                  {/* Show category inline for the tag group */}
                  <span className="ml-auto">
                    <CategoryCell mapping={items[0]} onSave={handleSave} existingCategories={existingCategories} />
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="rounded border overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-3 py-1 text-left font-medium text-muted-foreground">
                          Particulars
                        </th>
                        <th className="px-3 py-1 text-left font-medium text-muted-foreground w-40">
                          Category
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((m) => (
                        <tr key={m.particulars} className="border-t">
                          <td className="px-3 py-1.5 text-muted-foreground truncate max-w-xs">
                            {m.particulars}
                          </td>
                          <td className="px-3 py-1.5">
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
    </div>
  )
}
