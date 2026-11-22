'use client'

import { useState, useMemo, useCallback } from 'react'
import { useStudentNavigation } from './panel-support'
import { toast } from 'sonner'
import {
  ArrowLeft,
  RefreshCw,
  Clock,
  User,
} from 'lucide-react'

import { usePermission } from '@/components/auth/permission-guard'
import { PERMISSIONS } from '@/lib/permissions'
import { renderStudentsHeader } from './panel-support'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useStudentDetail,
  useStudentParents,
  useStudentPaymentInfo,
  useStudentPaymentList,
  useStudentLearningOutcomes,
} from '@/features/lms/hooks/students/use-students'
import {
  deriveStudentStatus,
  getStatusBadgeConfig,
  CLASS_TYPE,
} from '@/features/lms/types/student'
import type { StudentStatus } from '@/features/lms/types/student'

import { StudentProfileCard } from './student-profile-card'
import { ParentInfoCard } from './parent-info-card'
import { PaymentInfoCard } from './payment-info-card'
import { ReportsCard } from './reports-card'
import { StudentEditDialog } from './student-edit-dialog'
import { ParentEditDialog } from './parent-edit-dialog'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StudentInfoClientProps {
  studentId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StudentInfoClient({ studentId }: StudentInfoClientProps) {
  const router = useStudentNavigation()
  const { can } = usePermission()

  // ── Dialog state ───────────────────────────────────────────────────────
  const [editStudentOpen, setEditStudentOpen] = useState(false)
  const [editParentOpen, setEditParentOpen] = useState(false)
  const [editParentRelation, setEditParentRelation] = useState<number>(1)

  // ── Data fetching (parallel) ───────────────────────────────────────────
  const { data: student, isLoading: loadingStudent, isError, refetch } = useStudentDetail(studentId)
  const { data: parents, isLoading: loadingParents } = useStudentParents(studentId)
  const { data: paymentInfo } = useStudentPaymentInfo(studentId)
  const { data: paymentList } = useStudentPaymentList(studentId)
  const { data: learningOutcomes } = useStudentLearningOutcomes(studentId)

  // ── Derived data ───────────────────────────────────────────────────────
  const status: StudentStatus = student
    ? deriveStudentStatus(student)
    : 'Active'

  const statusConfig = getStatusBadgeConfig(status)

  /** Find current (latest Regular) class from ClassStudents */
  const currentClass = useMemo(() => {
    if (!student?.classStudents?.length) return null
    const regular = student.classStudents
      .filter((cs) => cs.studentType === CLASS_TYPE.Regular)
      .sort((a, b) => {
        const da = a.registerDate ? new Date(a.registerDate).getTime() : 0
        const db = b.registerDate ? new Date(b.registerDate).getTime() : 0
        return db - da
      })
    return regular[0] ?? null
  }, [student])

  /** Previous class (second most recent Regular) */
  const prevClass = useMemo(() => {
    if (!student?.classStudents?.length) return null
    const regular = student.classStudents
      .filter((cs) => cs.studentType === CLASS_TYPE.Regular)
      .sort((a, b) => {
        const da = a.registerDate ? new Date(a.registerDate).getTime() : 0
        const db = b.registerDate ? new Date(b.registerDate).getTime() : 0
        return db - da
      })
    return regular[1] ?? null
  }, [student])

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    router.push('/students')
  }, [router])

  const handleRenew = useCallback(() => {
    toast.info('Renew flow coming soon')
  }, [])

  const handleReserve = useCallback(() => {
    toast.info('Reserve flow coming soon')
  }, [])

  const handleEditFather = useCallback(() => {
    setEditParentRelation(1)
    setEditParentOpen(true)
  }, [])

  const handleEditMother = useCallback(() => {
    setEditParentRelation(2)
    setEditParentOpen(true)
  }, [])

  // ── Breadcrumb header ──────────────────────────────────────────────────
  const header = renderStudentsHeader(
    {
      breadcrumbs: (
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#lms-students">Students</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {student?.studentName ?? 'Loading...'}
                </span>
                {student?.englishName && (
                  <span className="text-muted-foreground font-normal">
                    ({student.englishName})
                  </span>
                )}
                {student && (
                  <Badge variant="outline" className={statusConfig.className}>
                    {statusConfig.label}
                  </Badge>
                )}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      ),
      actions: student ? (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft data-icon="inline-start" />
            Back
          </Button>
          {can(PERMISSIONS.STUDENT_UPDATE) && (
            <>
              <Button variant="outline" size="sm" onClick={handleRenew} className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50">
                <RefreshCw data-icon="inline-start" />
                Renew
              </Button>
              <Button size="sm" onClick={handleReserve}>
                <Clock data-icon="inline-start" />
                Reserve
              </Button>
            </>
          )}
        </div>
      ) : undefined,
    },
  )

  // ── Loading state ──────────────────────────────────────────────────────
  if (loadingStudent) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-3 animate-in fade-in duration-300">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        {/* Content skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-6 gap-4">
          <div className="xl:col-span-1 flex flex-col gap-4">
            <Skeleton className="h-52 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <div className="xl:col-span-5 flex flex-col gap-4">
            <Skeleton className="h-52 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  // ── Not found state ────────────────────────────────────────────────────
  if (isError) return <div role="alert" className="p-4">Could not load student. <Button onClick={() => void refetch()}>Retry</Button><Button onClick={handleBack}>Back to Students</Button></div>

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <User className="size-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold text-foreground">Student not found</h2>
        <p className="text-sm text-muted-foreground">
          The student you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Button variant="outline" size="sm" onClick={handleBack}>
          <ArrowLeft data-icon="inline-start" />
          Back to Students
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {header}
      {/* ── Main Content Grid ───────────────────────────────────────── */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 p-4">
          {/* LEFT COLUMN: Student & Parent Info */}
          <div className="xl:col-span-1 flex flex-col gap-4">
            <StudentProfileCard
              student={student}
              currentClassName={currentClass?.className ?? null}
              prevClassName={prevClass?.className ?? null}
              status={status}
              campusName={student.campusName}
              campusAddress={student.campusAddress}
              levelName={student.levelName}
              currentStudentType={student.currentStudentType}
              onEdit={() => setEditStudentOpen(true)}
            />
            <ParentInfoCard
              parents={parents ?? []}
              address={student.address}
              isLoading={loadingParents}
              onEditFather={handleEditFather}
              onEditMother={handleEditMother}
            />
          </div>

          {/* RIGHT COLUMN: Payment & Reports */}
          <div className="xl:col-span-4 flex flex-col gap-4">
            <PaymentInfoCard
              paymentInfo={paymentInfo}
              paymentList={paymentList ?? []}
            />
            <ReportsCard learningOutcomes={learningOutcomes ?? []} />
          </div>
        </div>
      </div>

      {/* ── Edit Dialogs ──────────────────────────────────────────────── */}
      <StudentEditDialog
        open={editStudentOpen}
        onOpenChange={setEditStudentOpen}
        student={student}
      />

      <ParentEditDialog
        open={editParentOpen}
        onOpenChange={setEditParentOpen}
        studentId={studentId}
        parentData={
          (parents ?? []).find((p) => p.relation === editParentRelation) ?? null
        }
        relation={editParentRelation}
      />
    </div>
  )
}
