'use client'
// ---------------------------------------------------------------------------
// _components/exam-overall-table.tsx
// Editable overall assessment table
// name column = ALWAYS READ-ONLY (legacy business rule)
// ---------------------------------------------------------------------------

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import type { ExamOverallItem } from '@/features/lms/types/curriculum'

interface ExamOverallTableProps {
  items: ExamOverallItem[]
  onChange: (items: ExamOverallItem[]) => void
}

export function ExamOverallTable({ items, onChange }: ExamOverallTableProps) {
  function updateItem(index: number, field: keyof ExamOverallItem, value: string) {
    onChange(
      items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    )
  }

  return (
    <Table className="text-xs">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-8 text-center">#</TableHead>
          <TableHead className="w-40">Skill (EN)</TableHead>
          <TableHead>Vietnamese Name</TableHead>
          <TableHead className="w-32">Evaluation</TableHead>
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

            {/* Editable: altName */}
            <TableCell>
              <Input
                value={item.altName}
                onChange={(e) => updateItem(i, 'altName', e.target.value)}
                className="h-7 text-xs border-0 bg-transparent focus:bg-background focus:border-border"
                placeholder="Vietnamese name..."
              />
            </TableCell>

            {/* Editable: evaluation */}
            <TableCell>
              <Input
                value={item.evaluation}
                onChange={(e) => updateItem(i, 'evaluation', e.target.value)}
                className="h-7 text-xs border-0 bg-transparent focus:bg-background focus:border-border"
                placeholder="e.g. 0"
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
