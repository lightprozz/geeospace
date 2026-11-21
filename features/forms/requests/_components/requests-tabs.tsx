// ---------------------------------------------------------------------------
// requests-tabs.tsx — 3-tab inbox switcher with server-driven count badges
// Each tab renders with a lucide icon prefix for quick visual identification.
// ---------------------------------------------------------------------------

import { AlertCircle, Eye, Send } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { RequestTab } from '@/features/lms/types/request'
import { REQUEST_TABS } from '@/features/lms/types/request'

import { useRequestTabCounts } from '@/features/lms/hooks/requests/use-requests'

/** Narrows a raw URL param to a known tab; unknown values fall back to "action". */
function isRequestTab(value: string | null): value is RequestTab {
  return value != null && (REQUEST_TABS as readonly string[]).includes(value)
}

interface RequestsTabsProps {
  activeTab: string | null
  setActiveTab: (tab: RequestTab) => void
  collectionId: string | null
  status: string | null
  keyword: string | null
  archived: string | null
  toolbar: React.ReactNode
  table: React.ReactNode
}

function toBool(archived: string | null): boolean {
  return archived === 'true'
}

export function RequestsTabs({
  activeTab,
  setActiveTab,
  collectionId,
  status,
  keyword,
  archived,
  toolbar,
  table,
}: RequestsTabsProps) {
  const filters = {
    collectionId: collectionId ?? undefined,
    status: status ? Number(status) : undefined,
    keyword: keyword ?? undefined,
    archived: toBool(archived),
  }
  const { data: counts } = useRequestTabCounts(filters)

  // The inbox always lands on the "action" tab when the URL carries no tab
  // (or carries a value that is not a known tab), so the fallback must apply
  // to BOTH the Tabs value and the content check. Otherwise the trigger reads
  // "action" while no panel renders its body and the inbox looks empty.
  const current = isRequestTab(activeTab) ? activeTab : 'action'

  const tabs: {
    value: string
    label: string
    Icon: React.ElementType
    count: number | undefined
  }[] = [
    { value: 'action', label: 'Need My Action', Icon: AlertCircle, count: counts?.action },
    { value: 'created', label: 'Created by Me', Icon: Send, count: counts?.created },
    { value: 'viewer', label: 'Viewer', Icon: Eye, count: counts?.viewer },
  ]

  return (
    <Tabs
      value={current}
      onValueChange={(v) => setActiveTab(v as RequestTab)}
      className="flex flex-1 flex-col overflow-hidden"
    >
      <div className="shrink-0 px-4 pt-3 pb-2">
        <TabsList className="h-8">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-7 gap-1.5 px-3 text-xs"
            >
              {(() => {
                const Icon = tab.Icon
                return <Icon className="hidden h-4 w-4 sm:inline-block" aria-hidden="true" />
              })()}
              {tab.label}
              {counts != null && (
                <span className="ml-1 rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                  {tab.count ?? 0}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {tabs.map((tab) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          className="m-0 h-full flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
        >
          {current === tab.value && (
            <div className="flex flex-col h-full overflow-hidden">
              {toolbar}
              <div className="flex-1 min-h-0 overflow-hidden">
                {table}
              </div>
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}
