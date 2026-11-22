'use client'

import { useState } from 'react'
import {
  CreditCard,
  Activity,
  Clock,
  AlertCircle,
  Wallet,
  ChevronDown,
  ChevronUp,
  Pencil,
} from 'lucide-react'

import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatStudentDate } from '@/features/lms/types/student'
import type { StudentPaymentInfo, StudentCourseEntry } from '@/features/lms/types/student'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PaymentInfoCardProps {
  paymentInfo: StudentPaymentInfo | undefined
  paymentList: StudentCourseEntry[]
}

// ---------------------------------------------------------------------------
// Stat item config — static colors for tree-shaking safety
// ---------------------------------------------------------------------------

const STATS_CONFIG = [
  {
    key: 'studied',
    label: 'Studied',
    icon: Activity,
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    borderClass: 'border-emerald-100 dark:border-emerald-900',
  },
  {
    key: 'remaining',
    label: 'Remaining',
    icon: Clock,
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    textClass: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-blue-100 dark:border-blue-900',
  },
  {
    key: 'absences',
    label: 'Absences',
    icon: AlertCircle,
    bgClass: 'bg-rose-50 dark:bg-rose-950/30',
    textClass: 'text-rose-600 dark:text-rose-400',
    borderClass: 'border-rose-100 dark:border-rose-900',
  },
  {
    key: 'lastAttend',
    label: 'Last Attend',
    icon: Wallet,
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    textClass: 'text-amber-600 dark:text-amber-400',
    borderClass: 'border-amber-100 dark:border-amber-900',
  },
] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format amount to VND display */
function formatVND(amount: number | null): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

function getStatValue(
  key: string,
  info: StudentPaymentInfo,
): string {
  switch (key) {
    case 'studied':
      return `${info.totalStudiedSessions} / ${info.totalSessions}`
    case 'remaining':
      return `${info.totalRemainSessions} sess.`
    case 'absences':
      return `${info.numberOfAbsences ?? 0} (${info.numberOfFrequentAbsences ?? 0})`
    case 'lastAttend':
      return formatStudentDate(info.lastAttendanceDate)
    default:
      return '—'
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PaymentInfoCard({ paymentInfo, paymentList }: PaymentInfoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const displayedList = isExpanded ? paymentList : paymentList.slice(0, 3)
  const hasMore = paymentList.length > 3

  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center justify-between border-b h-9 py-0 space-y-0">
        <CardTitle className="flex items-center gap-1.5 text-xs">
          <CreditCard className="size-3.5" />
          Payment Info
        </CardTitle>
        {paymentInfo && (
          <CardAction className="self-center mt-0">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {paymentInfo.endDateOfSession && (
                <span>
                  Expected End:{' '}
                  <strong className="text-foreground tabular-nums">
                    {formatStudentDate(paymentInfo.endDateOfSession)}
                  </strong>
                </span>
              )}
              <Badge variant="outline" className="tabular-nums text-[10px]">
                Balance: {formatVND(paymentInfo.paymentRemaining)}
              </Badge>
            </div>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Left: Stats */}
          <div className="lg:w-2/5 p-4 border-b lg:border-b-0 lg:border-r border-border grid grid-cols-2 lg:grid-cols-1 gap-2">
            {paymentInfo ? (
              STATS_CONFIG.map((stat) => {
                const IconComponent = stat.icon
                const value = getStatValue(stat.key, paymentInfo)
                return (
                  <div
                    key={stat.key}
                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`size-7 rounded-md ${stat.bgClass} ${stat.textClass} flex items-center justify-center border ${stat.borderClass}`}
                      >
                        <IconComponent className="size-3.5" />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
                        {stat.label}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-foreground tabular-nums">
                      {value}
                    </span>
                  </div>
                )
              })
            ) : (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-7 rounded-md" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-3 w-12" />
                </div>
              ))
            )}
          </div>

          {/* Right: Course history table */}
          <div className="lg:w-3/5 flex flex-col min-h-[200px]">
            <div className="flex-1 w-full overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow className="bg-card hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase">
                      Course
                    </TableHead>
                    <TableHead className="text-[10px] uppercase">
                      Sess.
                    </TableHead>
                    <TableHead className="text-[10px] uppercase">
                      Date
                    </TableHead>
                    <TableHead className="text-[10px] uppercase text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedList.length > 0 ? (
                    displayedList.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-xs truncate max-w-[120px]">
                          {item.name ?? '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs tabular-nums">
                          {item.numberOfSession}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs tabular-nums">
                          {formatStudentDate(item.startDate)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            aria-label={`Edit course ${item.name ?? ''}`}
                          >
                            <Pencil />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground text-xs py-8"
                      >
                        No payment history
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Expand/collapse toggle */}
            {hasMore && (
              <CardFooter className="border-t justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[10px] text-muted-foreground"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <>
                      Collapse <ChevronUp data-icon="inline-end" />
                    </>
                  ) : (
                    <>
                      View {paymentList.length - 3} more{' '}
                      <ChevronDown data-icon="inline-end" />
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
