'use client'
// ---------------------------------------------------------------------------
// _components/class-detail-client.tsx
// 'use client' shell for Class Detail — fetches data, renders split layout
// Layout: 2-panel grid matching curriculum pattern (aside + main)
// Header: breadcrumb + status + actions in shared dashboard header
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react'
import { useRouter } from '@/features/lms/classes/navigation'
import {
  ArrowLeft,
  ArrowRightLeft,
  BookOpen,
  Settings,
} from 'lucide-react'
import { toast } from 'sonner'

import { useSetDashboardHeader } from '@/features/lms/classes/panel-header'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useClassById, useClassInfo, useClassTeachers } from '@/features/lms/hooks/classes/use-classes'

import { ClassOverviewPanel } from './class-overview-panel'
import { ClassTabsShell } from './class-tabs-shell'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ClassDetailClientProps {
  classId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClassDetailClient({ classId }: ClassDetailClientProps) {
  const router = useRouter()
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)

  // ── Data fetching (parallel) ─────────────────────────────────────────
  const { data: classEntity, isLoading: loadingEntity, error: errorEntity } = useClassById(classId)
  const { data: classInfo, isLoading: loadingInfo } = useClassInfo(classId)
  const { data: teachers, isLoading: loadingTeachers } = useClassTeachers(classId)

  const isLoading = loadingEntity || loadingInfo || loadingTeachers

  // ── Derived data ─────────────────────────────────────────────────────
  const className = classEntity?.name ?? classInfo?.class ?? 'Loading...'
  const levelName = classEntity?.level?.name ?? classInfo?.level ?? ''

  let scheduleDays = '—'
  let infoStartTime = classInfo?.startTimeLocal
  let infoEndTime = classInfo?.endTimeLocal

  if (classInfo?.schedule) {
    if (typeof classInfo.schedule === 'string') {
      scheduleDays = classInfo.schedule
    } else if (typeof classInfo.schedule === 'object') {
      // Schedule can be a dynamic object with varying properties
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sObj = classInfo.schedule as any
      scheduleDays = sObj.format || '—'
      infoStartTime = infoStartTime || sObj.startTime
      infoEndTime = infoEndTime || sObj.endTime
    }
  }

  // ── Breadcrumb + Actions → shared dashboard header ───────────────────
  const header = useSetDashboardHeader(
    {
      breadcrumbs: (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#lms-classes">Classes</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-2">
                {className}
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                  Active
                </span>
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      ),
      actions: (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/classes')}
          >
            <ArrowLeft className="mr-1.5 size-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50"
            onClick={() => toast.info('End Class & Transfer coming soon')}
          >
            <ArrowRightLeft data-icon="inline-start" />
            <span className="hidden sm:inline">End Class</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('Class Settings coming soon')}
          >
            <Settings data-icon="inline-start" />
            <span className="hidden sm:inline">Class Settings</span>
          </Button>
        </>
      ),
    },
    `${className}-${levelName}`,
  )

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleTogglePanel = useCallback(() => {
    setIsPanelCollapsed((prev) => !prev)
  }, [])

  const handleCollapsePanel = useCallback(() => {
    setIsPanelCollapsed(true)
  }, [])

  // ── Error state ──────────────────────────────────────────────────────
  if (errorEntity) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <BookOpen className="size-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold text-foreground">Class not found</h2>
        <p className="text-sm text-muted-foreground">
          The class you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/classes')}
        >
          Back to Classes
        </Button>
      </div>
    )
  }

  // ── Loading state ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar skeleton */}
          <aside className="w-72 lg:w-80 flex flex-col gap-3 border-r bg-card shrink-0 p-3">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </aside>
          {/* Main skeleton */}
          <main className="flex-1 flex flex-col overflow-hidden bg-background p-4">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-80 rounded-lg mt-2" />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-w-[760px] flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3"><div>{header.breadcrumbs}</div><div className="flex gap-2">{header.actions}</div></header>
      {/* ── Two-panel body (curriculum pattern) ───────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Class overview sidebar */}
        <ClassOverviewPanel
          classEntity={classEntity}
          classInfo={classInfo}
          teachers={teachers ?? []}
          isLoading={false}
          isPanelCollapsed={isPanelCollapsed}
          onTogglePanel={handleTogglePanel}
        />

        {/* Right panel — Tabs content */}
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          <ClassTabsShell
            classId={classId}
            isPanelCollapsed={isPanelCollapsed}
            onTogglePanel={handleTogglePanel}
            onCollapsePanel={handleCollapsePanel}
            classScheduleDays={scheduleDays}
            classStartTime={infoStartTime ?? undefined}
            classEndTime={infoEndTime ?? undefined}
          />
        </main>
      </div>
    </div>
  )
}
