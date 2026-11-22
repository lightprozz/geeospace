// ---------------------------------------------------------------------------
// _components/form-templates-list-states.tsx
// Empty and error states for the form templates list.
// Mirrors the mockup's dashed-border card pattern.
// ---------------------------------------------------------------------------

import { AlertCircle, FileText, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

interface FormTemplatesEmptyStateProps {
  hasFilters?: boolean
}

export function FormTemplatesEmptyState({
  hasFilters,
}: FormTemplatesEmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 border border-dashed border-border/60 py-16">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <FileText className="size-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">Không tìm thấy biểu mẫu nào</p>
        <p className="text-xs text-muted-foreground">
          {hasFilters
            ? 'Thử điều chỉnh từ khoá tìm kiếm hoặc bộ lọc.'
            : 'Tạo biểu mẫu đầu tiên của bạn để bắt đầu.'}
        </p>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

interface FormTemplatesErrorStateProps {
  onRetry: () => void
  isRetrying?: boolean
}

export function FormTemplatesErrorState({
  onRetry,
  isRetrying,
}: FormTemplatesErrorStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 border border-destructive/30 py-16">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-destructive">Không tải được danh sách biểu mẫu</p>
        <p className="text-xs text-muted-foreground">
          Đã xảy ra lỗi khi tải biểu mẫu của bạn.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={onRetry}
        disabled={isRetrying}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {isRetrying ? 'Đang thử lại…' : 'Thử lại'}
      </Button>
    </Card>
  )
}
