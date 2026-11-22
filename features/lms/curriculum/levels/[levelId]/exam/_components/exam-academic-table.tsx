'use client'
// ---------------------------------------------------------------------------
// _components/exam-academic-table.tsx
// Editable academic scoring table
// Subject column = READ-ONLY, weight + score = editable (kept as string)
// Footer shows total weight — warning badge if ≠ 100
// ---------------------------------------------------------------------------

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { ExamAcademicItem } from '@/features/lms/types/curriculum'

interface ExamAcademicTableProps {
  items: ExamAcademicItem[]
  onChange: (items: ExamAcademicItem[]) => void
}

export function ExamAcademicTable({ items, onChange }: ExamAcademicTableProps) {
  function updateItem(index: number, field: keyof ExamAcademicItem, value: string) {
    onChange(
      items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    )
  }

  function addRow() {
    onChange([
      ...items,
      { name: 'New Subject', weight: '0', score: '0' },
    ])
  }

  const totalWeight = items.reduce((sum, item) => sum + Number(item.weight), 0)
  const weightOk = totalWeight === 100

  return (
    <Table className="text-xs">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-8 text-center">#</TableHead>
          <TableHead>Subject</TableHead>
          <TableHead className="w-28 text-center">Weight (%)</TableHead>
          <TableHead className="w-28 text-center">Score Config</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, i) => (
          <TableRow key={i} className="hover:bg-muted/30">
            <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>

            {/* Read-only: name */}
            <TableCell className="text-muted-foreground font-medium">
              {item.name}
            </TableCell>

            {/* Editable: weight (stored as string) */}
            <TableCell>
              <Input
                type="number"
                value={item.weight}
                onChange={(e) => updateItem(i, 'weight', e.target.value)}
                className="h-7 text-xs text-center border-0 bg-transparent focus:bg-background focus:border-border"
                placeholder="0"
              />
            </TableCell>

            {/* Editable: score (stored as string) */}
            <TableCell>
              <Input
                value={item.score}
                onChange={(e) => updateItem(i, 'score', e.target.value)}
                className="h-7 text-xs text-center border-0 bg-transparent focus:bg-background focus:border-border"
                placeholder="0"
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>
            <button
              type="button"
              onClick={addRow}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              + Add row
            </button>
          </TableCell>
          <TableCell className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="font-semibold">{totalWeight}%</span>
              {!weightOk && (
                <Badge variant="destructive" className="text-xs py-0 h-4 px-1">
                  ≠ 100
                </Badge>
              )}
              {weightOk && (
                <Badge className="text-xs py-0 h-4 px-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                  ✓
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  )
}
