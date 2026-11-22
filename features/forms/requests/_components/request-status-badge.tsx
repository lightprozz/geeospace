// ---------------------------------------------------------------------------
// request-status-badge.tsx
// Maps RequestFormStatus (100/1/6) to label + shadcn Badge variant.
// Each status renders with its lucide icon prefix for visual clarity.
// ---------------------------------------------------------------------------

import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Clock,
  FileText,
  XCircle,
} from 'lucide-react'
import {
  RequestFormStatus,
  type RequestFormStatusValue,
} from '@/features/lms/types/request'

interface RequestStatusBadgeProps {
  status: RequestFormStatusValue
  className?: string
}

const STATUS_CONFIG: Record<
  number,
  {
    label: string
    variant: 'default' | 'secondary' | 'outline' | 'destructive'
    Icon?: React.ElementType
  }
> = {
  [RequestFormStatus.Draft]: { label: 'Draft', variant: 'secondary', Icon: FileText },
  [RequestFormStatus.New]: { label: 'New', variant: 'default', Icon: Clock },
  [RequestFormStatus.Processing]: { label: 'Processing', variant: 'outline', Icon: Clock },
  [RequestFormStatus.DoneApproved]: { label: 'Approved', variant: 'default', Icon: CheckCircle2 },
  [RequestFormStatus.DoneDenied]: { label: 'Denied', variant: 'destructive', Icon: XCircle },
  [RequestFormStatus.Closed]: { label: 'Closed', variant: 'secondary', Icon: FileText },
  [RequestFormStatus.Expired]: { label: 'Expired', variant: 'secondary', Icon: Clock },
}

export function RequestStatusBadge({ status, className }: RequestStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: `Status ${status}`,
    variant: 'secondary' as const,
  }

  const { Icon, label, variant } = config

  return (
    <Badge variant={variant} className={className}>
      {Icon && <Icon className="mr-1 inline-block h-3.5 w-3.5 -translate-y-px" aria-hidden="true" />}
      {label}
    </Badge>
  )
}
