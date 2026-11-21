'use client'
// ---------------------------------------------------------------------------
// _components/students-page-client.tsx
// Students Management — main page client with server-side filters, table, actions
// Pattern: synchronized with users-page-client.tsx
// ---------------------------------------------------------------------------

import { useMemo, useCallback } from 'react'
import { useStudentNavigation } from './panel-support'
import { Search, UserPlus, ListRestart } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'

import { renderStudentsHeader } from './panel-support'
import { useStudentStore } from '@/features/lms/stores/use-student-store'
import { useAllStudentsV2 } from '@/features/lms/hooks/students/use-students'
import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import {
  STUDENT_TYPE_OPTIONS,
  type StudentAllItem,
} from '@/features/lms/types/student'

import { StudentsTable } from './students-table'

export function StudentsPageClient() {
  // ── Auth ───────────────────────────────────────────────────────────

  // ── Permissions ──────────────────────────────────────────────────
  const { can } = usePermission()
  const canEnrollStudent = can(PERMISSIONS.STUDENT_ENROLL)
  const canUpdateStudent = can(PERMISSIONS.STUDENT_UPDATE)

  // ── Store (filter + pagination state) ─────────────────────────────
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    campusFilter,
    setCampusFilter,
    levelFilter,
    setLevelFilter,
    classFilter,
    setClassFilter,
    typeFilter,
    setTypeFilter,
    page,
    pageSize,
    setPage,
    setPageSize,
    resetFilters,
  } = useStudentStore()

  // ── Sentinel for "All" select items (Radix doesn't accept value="") ─
  const ALL = '__all__'

  // ── Data — fetch ALL students (V2 API) ────────────────────────────
  const { data: allStudents = [], isLoading, isError, refetch } = useAllStudentsV2()

  // ── Client-side filtering by Active/Inactive ─────────────────────
  // Active: currentStudentType 1, 2, 3 (Regular, CatchUp, Demo)
  // Inactive: currentStudentType 4, 5 (Suspended, Terminated)
  const activeStudents = useMemo(
    () => allStudents.filter((s) => {
      const type = s.currentStudentType
      return type !== null && type >= 1 && type <= 3
    }),
    [allStudents]
  )

  const inactiveStudents = useMemo(
    () => allStudents.filter((s) => {
      const type = s.currentStudentType
      return type !== null && (type === 4 || type === 5)
    }),
    [allStudents]
  )

  // ── Build filter dropdowns from current tab's students ─────────────────
  // Options are context-sensitive: show only what exists in the current tab
  const activeStudentList = activeTab === 'active' ? activeStudents : inactiveStudents

  // Campus dropdown: distinct campuses from current tab's students
  const campusOptions = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; address: string | null }>()
    for (const s of activeStudentList) {
      if (s.campusId && !seen.has(s.campusId)) {
        seen.set(s.campusId, {
          id: s.campusId,
          name: s.campusName || s.campusId.slice(0, 8),
          address: s.campusAddress ?? null,
        })
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [activeStudentList])

  // Level dropdown: distinct levels from current tab's students
  const levelOptions = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>()
    for (const s of activeStudentList) {
      if (s.levelId && !seen.has(s.levelId)) {
        seen.set(s.levelId, {
          id: s.levelId,
          name: s.levelName || s.levelId.slice(0, 8),
        })
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [activeStudentList])

  // Class dropdown: distinct classes from current tab's students
  const classOptions = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; campusId: string; levelId: string }>()
    for (const s of activeStudentList) {
      if (s.currentClassId && !seen.has(s.currentClassId)) {
        seen.set(s.currentClassId, {
          id: s.currentClassId,
          name: s.currentClassName || s.currentClassId.slice(0, 8),
          campusId: s.campusId || '',
          levelId: s.levelId || '',
        })
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [activeStudentList])

  // ── Cascading filter: Campus → Level → Class ─────────────────────
  // When campus is selected, only show levels/classes in that campus
  // When level is also selected, only show classes for that campus+level combo
  const filteredLevelOptions = useMemo(() => {
    if (!campusFilter) return levelOptions
    const levelIdsInCampus = new Set(
      classOptions.filter((c) => c.campusId === campusFilter).map((c) => c.levelId),
    )
    return levelOptions.filter((l) => levelIdsInCampus.has(l.id))
  }, [campusFilter, classOptions, levelOptions])

  const filteredClassOptions = useMemo(() => {
    let filtered = classOptions
    if (campusFilter) {
      filtered = filtered.filter((c) => c.campusId === campusFilter)
    }
    if (levelFilter) {
      filtered = filtered.filter((c) => c.levelId === levelFilter)
    }
    return filtered
  }, [classOptions, campusFilter, levelFilter])

  // ── Client-side filter: apply search + branch + level + class + type ─
  const filteredActiveStudents = useMemo(() => {
    let filtered = activeStudents

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((s) => {
        const name = (s.studentName || '').toLowerCase()
        const engName = (s.englishName || '').toLowerCase()
        const fatherPhone = (s.fatherPhone || '').toLowerCase()
        const motherPhone = (s.motherPhone || '').toLowerCase()
        return (
          name.includes(q) ||
          engName.includes(q) ||
          fatherPhone.includes(q) ||
          motherPhone.includes(q)
        )
      })
    }

    // Branch filter — match via campusId directly
    if (campusFilter) {
      filtered = filtered.filter((s) => s.campusId === campusFilter)
    }

    // Level filter — match via levelId directly
    if (levelFilter) {
      filtered = filtered.filter((s) => s.levelId === levelFilter)
    }

    // Class filter — match via currentClassId directly
    if (classFilter) {
      filtered = filtered.filter((s) => s.currentClassId === classFilter)
    }

    // Type filter
    if (typeFilter !== 0) {
      filtered = filtered.filter((s) => s.currentStudentType === typeFilter)
    }

    return filtered
  }, [activeStudents, searchQuery, campusFilter, levelFilter, classFilter, typeFilter])

  const filteredInactiveStudents = useMemo(() => {
    let filtered = inactiveStudents

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((s) => {
        const name = (s.studentName || '').toLowerCase()
        const engName = (s.englishName || '').toLowerCase()
        const fatherPhone = (s.fatherPhone || '').toLowerCase()
        const motherPhone = (s.motherPhone || '').toLowerCase()
        return (
          name.includes(q) ||
          engName.includes(q) ||
          fatherPhone.includes(q) ||
          motherPhone.includes(q)
        )
      })
    }

    // Branch filter
    if (campusFilter) {
      filtered = filtered.filter((s) => s.campusId === campusFilter)
    }

    // Level filter
    if (levelFilter) {
      filtered = filtered.filter((s) => s.levelId === levelFilter)
    }

    // Class filter
    if (classFilter) {
      filtered = filtered.filter((s) => s.currentClassId === classFilter)
    }

    // Type filter
    if (typeFilter !== 0) {
      filtered = filtered.filter((s) => s.currentStudentType === typeFilter)
    }

    return filtered
  }, [inactiveStudents, searchQuery, campusFilter, levelFilter, classFilter, typeFilter])

  // Deduplicate students by ID
  const deduplicateStudents = useCallback((students: StudentAllItem[]) => {
    const seen = new Map<string, StudentAllItem>()
    for (const s of students) {
      if (!seen.has(s.id)) seen.set(s.id, s)
    }
    return [...seen.values()]
  }, [])

  const dedupedActiveStudents = useMemo(
    () => deduplicateStudents(filteredActiveStudents),
    [deduplicateStudents, filteredActiveStudents]
  )

  const dedupedInactiveStudents = useMemo(
    () => deduplicateStudents(filteredInactiveStudents),
    [deduplicateStudents, filteredInactiveStudents]
  )

  // ── Client-side pagination ────────────────────────────────────────
  const activeToShow = dedupedActiveStudents
  const inactiveToShow = dedupedInactiveStudents
  const currentStudents = activeTab === 'active' ? activeToShow : inactiveToShow
  const totalFiltered = currentStudents.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))

  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * pageSize
    return currentStudents.slice(start, start + pageSize)
  }, [currentStudents, page, pageSize])

  // ── Router ──────────────────────────────────────────────────────
  const router = useStudentNavigation()

  // ── Handlers ──────────────────────────────────────────────────────
  const handleViewInfo = useCallback((id: string) => {
    router.push(`/students/${id}`)
  }, [router])

  const handleRenew = useCallback(() => {
    toast.info('Renew flow coming soon')
  }, [])

  const handleReserve = useCallback(() => {
    toast.info('Reserve flow coming soon')
  }, [])

  const handleRegister = useCallback(() => {
    toast.info('Register new student flow coming soon')
  }, [])

  const handleListAll = useCallback(() => {
    resetFilters()
  }, [resetFilters])

  // ── Header breadcrumbs ────────────────────────────────────────────
  const header = renderStudentsHeader({
    breadcrumbs: (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Students Management</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    ),
  })

  // ── Tab change handler ────────────────────────────────────────────
  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value as 'active' | 'inactive')
      // Reset filters so dropdowns rebuild from the new tab's data
      setCampusFilter('')
      setLevelFilter('')
      setClassFilter('')
      setTypeFilter(0)
      setSearchQuery('')
      setPage(1)
    },
    [setActiveTab, setCampusFilter, setLevelFilter, setClassFilter, setTypeFilter, setSearchQuery, setPage],
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      {header}
      {isError && <div role="alert" className="p-4">Could not load students. <Button onClick={() => void refetch()}>Retry</Button></div>}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex flex-col h-full"
        >
          {/* ── Toolbar ──────────────────────────────────────────── */}
          <div className="px-4 pt-3 pb-2 space-y-2 border-b shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Tabs — Active / Inactive (Suspended + Terminated) */}
              <TabsList className="h-8">
                <TabsTrigger value="active" className="text-xs h-7 px-3 gap-1.5">
                  Active
                  <Badge className="text-[10px] h-4 min-w-4 px-1 rounded-full bg-emerald-600 text-white border-0">
                    {dedupedActiveStudents.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="inactive" className="text-xs h-7 px-3 gap-1.5">
                  Inactive
                  <Badge
                    variant="outline"
                    className="text-[10px] h-4 min-w-4 px-1 rounded-full"
                  >
                    {dedupedInactiveStudents.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              {/* Branch filter */}
              <Select value={campusFilter || ALL} onValueChange={(v) => setCampusFilter(v === ALL ? '' : v)}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Branches</SelectItem>
                  {campusOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name ? `${c.name}${c.address ? ` (${c.address})` : ''}` : (c.address || c.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Level filter */}
              <Select value={levelFilter || ALL} onValueChange={(v) => setLevelFilter(v === ALL ? '' : v)}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Levels</SelectItem>
                  {filteredLevelOptions.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Class filter */}
              <Select value={classFilter || ALL} onValueChange={(v) => setClassFilter(v === ALL ? '' : v)}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Classes</SelectItem>
                  {filteredClassOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Type filter */}
              <Select
                value={String(typeFilter)}
                onValueChange={(v) => setTypeFilter(Number(v))}
              >
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {STUDENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Action buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={handleListAll}
                >
                  <ListRestart className="h-3.5 w-3.5" />
                  List All
                </Button>
                {canEnrollStudent && (
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={handleRegister}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Register
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ── Table Area ────────────────────────────────────────── */}
          <TabsContent
            value="active"
            className="flex-1 overflow-hidden m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
          >
            <StudentsTable
              students={paginatedStudents}
              isLoading={isLoading}
              totalFiltered={totalFiltered}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              totalPages={totalPages}
              onViewInfo={handleViewInfo}
              onRenew={handleRenew}
              onReserve={handleReserve}
              canUpdateStudent={canUpdateStudent}
            />
          </TabsContent>

          <TabsContent
            value="inactive"
            className="flex-1 overflow-hidden m-0 h-full data-[state=active]:flex data-[state=active]:flex-col"
          >
            <StudentsTable
              students={paginatedStudents}
              isLoading={isLoading}
              totalFiltered={totalFiltered}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              totalPages={totalPages}
              onViewInfo={handleViewInfo}
              onRenew={handleRenew}
              onReserve={handleReserve}
              canUpdateStudent={canUpdateStudent}
              isInactiveTab
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
