'use client'
// ---------------------------------------------------------------------------
// _components/class-tabs-shell.tsx
// Right panel: tab headers + placeholder content (tabs pending implementation)
// Design: clean pill-accent tabs — no border-b-2, no bg-muted wrapper
// ---------------------------------------------------------------------------

import { useEffect } from 'react'
import { useWindowNavigation } from '@/components/desktop/window-navigation'
import { parseClassPath } from './navigation'
import {
  BookOpen,
  Users,
  BarChart3,
  FileBadge,
  GraduationCap,
  AlertCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

import { ClassLessonsTab } from './class-lessons-tab'
import { ClassStudentsTab } from './class-students-tab'
import { ClassReportsTab } from './class-reports-tab'
import { ClassExamsTab } from './class-exams-tab'

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'lessons', label: 'Lessons', icon: BookOpen },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'reports', label: 'Class Reports', icon: BarChart3 },
  { id: 'exams', label: 'Exam Results', icon: FileBadge },
  { id: 'events', label: 'Class Events', icon: GraduationCap },
] as const

type TabId = (typeof TABS)[number]['id']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ClassTabsShellProps {
  classId: string
  isPanelCollapsed: boolean
  onTogglePanel: () => void
  /** Explicitly collapse the overview panel (no toggle) */
  onCollapsePanel: () => void
  /** Class schedule days (e.g. "Mon, Wed") — passed to Lessons tab */
  classScheduleDays?: string
  /** Class start time (e.g. "17:30") — passed to Lessons tab */
  classStartTime?: string
  /** Class end time (e.g. "19:00") — passed to Lessons tab */
  classEndTime?: string
}

export function ClassTabsShell({
  classId,
  isPanelCollapsed,
  onTogglePanel,
  onCollapsePanel,
  classScheduleDays,
  classStartTime,
  classEndTime,
}: ClassTabsShellProps) {
  const { path, navigate } = useWindowNavigation()
  const activeTab = parseClassPath(path).tab as TabId

// Auto-collapse Overview panel for full-width tabs (Reports, Exams)
  useEffect(() => {
    if (activeTab === 'reports' || activeTab === 'exams') {
      onCollapsePanel()
    }
     
  }, [activeTab, onCollapsePanel])

  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={(v) => navigate(`${classId}/${v}`)}
        className="flex flex-col h-full"
      >
        {/* Tab Header — clean, no bg tint, subtle active pill */}
        <div className="px-3 py-2 border-b shrink-0 flex items-center justify-between">
          <TabsList className="h-8 bg-muted/50 p-0.5 rounded-lg gap-0.5">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm text-muted-foreground transition-all whitespace-nowrap"
                >
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {/* Panel toggle button (desktop only) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex size-7 ml-2 text-muted-foreground"
                onClick={onTogglePanel}
                aria-label={
                  isPanelCollapsed ? 'Expand panel' : 'Collapse panel'
                }
              >
                {isPanelCollapsed ? (
                  <PanelLeftOpen />
                ) : (
                  <PanelLeftClose />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPanelCollapsed ? 'Expand Overview' : 'Collapse Overview'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Lessons tab — real implementation */}
        <TabsContent
          value="lessons"
          className="flex-1 overflow-hidden m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
        >
          <ClassLessonsTab
            classId={classId}
            classScheduleDays={classScheduleDays}
            classStartTime={classStartTime}
            classEndTime={classEndTime}
          />
        </TabsContent>

        {/* Students tab — real implementation */}
        <TabsContent
          value="students"
          className="flex-1 overflow-hidden m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
        >
          <ClassStudentsTab classId={classId} />
        </TabsContent>

        {/* Reports tab — real implementation */}
        <TabsContent
          value="reports"
          className="flex-1 overflow-hidden m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
        >
          <ClassReportsTab classId={classId} />
        </TabsContent>

        {/* Exams tab — real implementation */}
        <TabsContent
          value="exams"
          className="flex-1 overflow-hidden m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
        >
          <ClassExamsTab classId={classId} />
        </TabsContent>

        {/* Remaining tabs — placeholder */}
        {TABS.filter((t) => t.id !== 'lessons' && t.id !== 'students' && t.id !== 'reports' && t.id !== 'exams').map((tab) => (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="flex-1 overflow-hidden m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
          >
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <AlertCircle className="size-10 mb-3 opacity-15" />
              <p className="text-sm font-medium">
                {tab.label} — Coming Soon
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                This tab will be implemented in a future session
              </p>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
