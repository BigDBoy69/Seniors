import { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'

export interface VariantRow {
  size: string | null
  color: string | null
  colorHex: string | null
  stock: number
  reserved: number
  sku: string | null
}

interface ColorEntry {
  name: string
  hex: string
}

interface Props {
  value: VariantRow[]
  onChange: (rows: VariantRow[]) => void
  productSlug?: string
}

const PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size']

const SIZE_ORDER: Record<string, number> = {
  'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6, 'XXXL': 7,
  '34': 10, '36': 11, '38': 12, '40': 13, '42': 14, '44': 15, '46': 16,
  'One Size': 20, 'OS': 21,
}

function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const oa = SIZE_ORDER[a] ?? 50
    const ob = SIZE_ORDER[b] ?? 50
    if (oa !== ob) return oa - ob
    return a.localeCompare(b)
  })
}

function toTitleCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function toHex(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return '#000000'
  if (trimmed.startsWith('#')) return trimmed.length === 4
    ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
    : trimmed
  return `#${trimmed}`
}

function buildRows(sizes: string[], colors: ColorEntry[], stock: Record<string, Record<string, number>>, slug: string): VariantRow[] {
  const sortedSizes = sortSizes(sizes)
  const rows: VariantRow[] = []

  if (sortedSizes.length === 0 && colors.length === 0) return rows

  if (sortedSizes.length > 0 && colors.length > 0) {
    for (const size of sortedSizes) {
      for (const color of colors) {
        const colorKey = color.name.toLowerCase()
        const qty = stock[size]?.[colorKey] ?? 0
        rows.push({
          size,
          color: toTitleCase(color.name),
          colorHex: color.hex || null,
          stock: qty,
          reserved: 0,
          sku: `${slug}-${size}-${color.name}`.toLowerCase().replace(/\s+/g, '-') || null,
        })
      }
    }
  } else if (sortedSizes.length > 0) {
    for (const size of sortedSizes) {
      const qty = stock[size]?.['_'] ?? 0
      rows.push({ size, color: null, colorHex: null, stock: qty, reserved: 0, sku: `${slug}-${size}`.toLowerCase() || null })
    }
  } else {
    for (const color of colors) {
      const colorKey = color.name.toLowerCase()
      const qty = stock['_']?.[colorKey] ?? 0
      rows.push({
        size: null,
        color: toTitleCase(color.name),
        colorHex: color.hex || null,
        stock: qty,
        reserved: 0,
        sku: `${slug}-${color.name}`.toLowerCase().replace(/\s+/g, '-') || null,
      })
    }
  }

  return rows
}

function rowsToState(rows: VariantRow[]): { sizes: string[]; colors: ColorEntry[]; stock: Record<string, Record<string, number>> } {
  const sizeSet = new Set<string>()
  const colorMap = new Map<string, ColorEntry>()
  const stock: Record<string, Record<string, number>> = {}

  for (const row of rows) {
    const size = row.size ?? '_'
    const colorKey = (row.color ?? '_').toLowerCase()

    if (row.size) sizeSet.add(row.size)
    if (row.color) {
      colorMap.set(colorKey, { name: row.color, hex: toHex(row.colorHex ?? '') })
    }

    if (!stock[size]) stock[size] = {}
    stock[size][colorKey] = row.stock
  }

  return {
    sizes: sortSizes(Array.from(sizeSet)),
    colors: Array.from(colorMap.values()),
    stock,
  }
}

export function VariantEditor({ value, onChange, productSlug = '' }: Props) {
  const [sizes, setSizes] = useState<string[]>([])
  const [colors, setColors] = useState<ColorEntry[]>([])
  const [stock, setStock] = useState<Record<string, Record<string, number>>>({})
  const [newColor, setNewColor] = useState({ name: '', hex: '#1a1a1a' })
  const [customSize, setCustomSize] = useState('')

  useEffect(() => {
    if (value.length > 0) {
      const parsed = rowsToState(value)
      setSizes(parsed.sizes)
      setColors(parsed.colors)
      setStock(parsed.stock)
    }
  }, [])

  const emit = (nextSizes: string[], nextColors: ColorEntry[], nextStock: Record<string, Record<string, number>>) => {
    onChange(buildRows(nextSizes, nextColors, nextStock, productSlug))
  }

  const toggleSize = (size: string) => {
    const next = sizes.includes(size) ? sizes.filter((s) => s !== size) : sortSizes([...sizes, size])
    setSizes(next)
    emit(next, colors, stock)
  }

  const addCustomSize = () => {
    const s = customSize.trim().toUpperCase()
    if (!s || sizes.includes(s)) { setCustomSize(''); return }
    const next = sortSizes([...sizes, s])
    setSizes(next)
    setCustomSize('')
    emit(next, colors, stock)
  }

  const removeSize = (size: string) => {
    const next = sizes.filter((s) => s !== size)
    setSizes(next)
    emit(next, colors, stock)
  }

  const addColor = () => {
    const name = newColor.name.trim()
    if (!name) return
    const normalized = toTitleCase(name)
    if (colors.some((c) => c.name.toLowerCase() === name.toLowerCase())) return
    const next = [...colors, { name: normalized, hex: newColor.hex }]
    setColors(next)
    setNewColor({ name: '', hex: '#1a1a1a' })
    emit(sizes, next, stock)
  }

  const removeColor = (name: string) => {
    const next = colors.filter((c) => c.name !== name)
    setColors(next)
    emit(sizes, next, stock)
  }

  const setStockValue = (size: string, colorKey: string, qty: number) => {
    const next = { ...stock, [size]: { ...(stock[size] ?? {}), [colorKey]: qty } }
    setStock(next)
    emit(sizes, colors, next)
  }

  const hasSizes = sizes.length > 0
  const hasColors = colors.length > 0

  return (
    <div className="border border-gray-200 rounded p-4 space-y-5 bg-white">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Variants</p>

      {/* Sizes */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Sizes</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSize(s)}
              className={`px-3 py-1.5 text-xs border rounded transition-colors ${
                sizes.includes(s)
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            placeholder="Custom size (e.g. 38)"
            value={customSize}
            onChange={(e) => setCustomSize(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSize())}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900 w-44"
          />
          <button type="button" onClick={addCustomSize} className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-200">
            Add
          </button>
        </div>
        {hasSizes && (
          <div className="flex flex-wrap gap-1 mt-1">
            {sizes.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                {s}
                <button type="button" onClick={() => removeSize(s)} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Colors */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Colors</p>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Color name (e.g. Ivory)"
            value={newColor.name}
            onChange={(e) => setNewColor((p) => ({ ...p, name: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-900 w-44"
          />
          <input
            type="color"
            value={newColor.hex}
            onChange={(e) => setNewColor((p) => ({ ...p, hex: e.target.value }))}
            className="w-9 h-9 rounded border border-gray-300 cursor-pointer p-0.5"
            title="Pick color"
          />
          <button type="button" onClick={addColor} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-200">
            <Plus size={14} /> Add
          </button>
        </div>
        {hasColors && (
          <div className="flex flex-wrap gap-2 mt-1">
            {colors.map((c) => (
              <span key={c.name} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                <span className="w-3.5 h-3.5 rounded-full border border-gray-300 inline-block" style={{ background: c.hex }} />
                {c.name}
                <button type="button" onClick={() => removeColor(c.name)} className="text-gray-400 hover:text-gray-700"><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stock grid */}
      {hasSizes && hasColors && (
        <div className="space-y-2 overflow-x-auto">
          <p className="text-sm font-medium text-gray-700">Stock</p>
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr>
                <th className="text-left text-xs text-gray-500 pb-2 pr-3 w-16">Size</th>
                {colors.map((c) => (
                  <th key={c.name} className="text-center text-xs text-gray-500 pb-2 px-2 min-w-[72px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="w-4 h-4 rounded-full border border-gray-300" style={{ background: c.hex }} />
                      {c.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizes.map((size) => (
                <tr key={size} className="border-t border-gray-100">
                  <td className="py-1.5 pr-3 font-medium text-gray-700 text-xs">{size}</td>
                  {colors.map((c) => {
                    const colorKey = c.name.toLowerCase()
                    return (
                      <td key={c.name} className="py-1.5 px-2 text-center">
                        <input
                          type="number"
                          min={0}
                          value={stock[size]?.[colorKey] ?? 0}
                          onChange={(e) => setStockValue(size, colorKey, Number(e.target.value))}
                          className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-sm text-gray-900 bg-white"
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasSizes && !hasColors && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Stock per size</p>
          <div className="flex flex-wrap gap-3">
            {sizes.map((size) => (
              <div key={size} className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700 w-10">{size}</span>
                <input
                  type="number"
                  min={0}
                  value={stock[size]?.['_'] ?? 0}
                  onChange={(e) => setStockValue(size, '_', Number(e.target.value))}
                  className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-sm text-gray-900 bg-white"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasSizes && hasColors && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Stock per color</p>
          <div className="flex flex-wrap gap-3">
            {colors.map((c) => (
              <div key={c.name} className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border border-gray-300 inline-block flex-shrink-0" style={{ background: c.hex }} />
                <span className="text-xs font-medium text-gray-700 w-16">{c.name}</span>
                <input
                  type="number"
                  min={0}
                  value={stock['_']?.[c.name.toLowerCase()] ?? 0}
                  onChange={(e) => setStockValue('_', c.name.toLowerCase(), Number(e.target.value))}
                  className="w-16 border border-gray-300 rounded px-2 py-1 text-center text-sm text-gray-900 bg-white"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasSizes && !hasColors && (
        <p className="text-xs text-gray-400 italic">Select sizes or add colors above to configure stock.</p>
      )}
    </div>
  )
}
