'use client'
// ---------------------------------------------------------------------------
// _components/class-exams-tab.tsx
// Exam Results tab for Class Detail — split panel layout (1:1 ratio)
// Left: Exam Grading Form (student selector, comment, scores)
// Right: Live A4 Document Preview with zoom + print
// Style: line-grid (border dividers, no card/shadow) matching reports-tab
// ---------------------------------------------------------------------------

import { useState, useMemo, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReactToPrint } from 'react-to-print'
import {
  Printer,
  Save,
  User,
  Sparkles,
  FileBadge,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Settings2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react'

// shadcn/ui
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Composed components
import { TiptapEditor } from '@/features/lms/classes/tiptap-editor'

// Hooks
import {
  useClassStudents,
  useClassInfo,
  useClassTeachers,
  useExamTemplates,
  useExamResultForm,
  useSaveExamResult,
} from '@/features/lms/hooks/classes/use-classes'
import { useAuthStore } from '@/stores/use-auth-store'
import { useExamDraftStore, buildExamDraftKey } from '@/features/lms/stores/use-exam-draft-store'
import { usePermission } from '@/features/lms/classes/temp-permissions'
import { PERMISSIONS } from '@/features/lms/classes/temp-permissions'

// Types + Utils
import {
  EVALUATION_SCALES,
  DEFAULT_EXAM_FORM,
  calcExamResult,
  calculateAcademicTotal,
  parseExamFormJson,
} from '@/features/lms/types/exam-result'
import type {
  ExamFormJson,
  PrintTemplateProps,
} from '@/features/lms/types/exam-result'

// Template
import { DefaultTemplate } from './exam-print-templates'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BG_IMAGE_URL = '/images/geeo-exam-bg.jpg'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ClassExamsTabProps {
  classId: string
}

export function ClassExamsTab({ classId }: ClassExamsTabProps) {
  // ── Permissions ──
  const { can } = usePermission()
  const canSaveExamResult = can(PERMISSIONS.CLASS_UPDATE)

  // ── Data hooks ──
  const { data: students = [] } = useClassStudents(classId)
  const { data: classInfo } = useClassInfo(classId)
  const { data: teachers = [] } = useClassTeachers(classId)
  const { data: examTemplates = [] } = useExamTemplates(classId)
  const authUser = useAuthStore((s) => s.user)

  // ── Derived teacher data ──
  /** Format: "EnglishName - FullName" or just "FullName" */
  const formatTeacherName = (t: { englishName?: string | null; fullName: string }) =>
    t.englishName ? `${t.englishName} - ${t.fullName}` : t.fullName

  const mainTeacher = useMemo(
    () => {
      const primary = teachers.find((t) => t.isPrimary)
      return primary ? formatTeacherName(primary) : ''
    },
    [teachers],
  )
  const coTeachers = useMemo(
    () =>
      teachers
        .filter((t) => !t.isPrimary)
        .map(formatTeacherName)
        .join(', '),
    [teachers],
  )

  // ── Local state ──
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [selectedExamType, setSelectedExamType] = useState<string>('')
  const [scores, setScores] = useState<ExamFormJson>({
    ...DEFAULT_EXAM_FORM,
    overall: DEFAULT_EXAM_FORM.overall.map((o) => ({
      ...o,
      evaluation: '4',
    })),
  })
  const [comment, setComment] = useState('')
  const [zoomLevel, setZoomLevel] = useState(0.65)

  // ── Draft persistence ──
  const [draftRestored, setDraftRestored] = useState(false)
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const { saveDraft, getDraft, clearDraft, hasDraft } = useExamDraftStore()
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Tracks whether the user has made manual edits (prevents initial API load from saving draft) */
  const hasUserEdited = useRef(false)
  /** Tracks previous draftKey to detect selection transitions and prevent saving stale data */
  const prevDraftKeyRef = useRef('')

  /** Compute composite draft key — empty string when form not ready */
  const draftKey = selectedStudentId && selectedExamType
    ? buildExamDraftKey(classId, selectedStudentId, selectedExamType)
    : ''

  // ── Reset hasUserEdited when selection changes ──
  // Use useLayoutEffect to run synchronously before paint to prevent
  // the auto-save effect from firing with stale scores under a new draftKey.
  useLayoutEffect(() => {
    if (draftKey !== prevDraftKeyRef.current) {
      hasUserEdited.current = false
      // Clear any pending debounce timer from the previous selection
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current)
        draftSaveTimerRef.current = null
      }
      prevDraftKeyRef.current = draftKey
    }
  }, [draftKey])

  // ── Derived ──
  // V2 /classes/{id}/students returns ClassStudentListItemDto with `studentId` as
  // the Student.Id FK — that is what we use for the Select value and lookup key.
  const selectedStudent = useMemo(
    () => students.find((s) => s.studentId === selectedStudentId),
    [students, selectedStudentId],
  )

  const selectedTemplate = useMemo(
    () => examTemplates.find((t) => String(t.examType) === selectedExamType),
    [examTemplates, selectedExamType],
  )

  const examTitle = selectedTemplate?.examName ?? ''

  const { total, maxTotal, percent: totalPercent } = useMemo(
    () => calculateAcademicTotal(scores.academic),
    [scores.academic],
  )

  const resultLabel = useMemo(
    () => calcExamResult(totalPercent),
    [totalPercent],
  )

  // ── Load saved exam result for student + exam type ──
  const examTypeNum = selectedExamType ? Number(selectedExamType) : 0
  const { data: savedResult } = useExamResultForm(
    classId,
    selectedStudentId,
    examTypeNum,
  )

  // ── Derived: compute initial scores/comment from template, draft, or saved result ──
  // Template-based scores (when exam type changes)
  const templateScores = useMemo<ExamFormJson | null>(() => {
    if (!selectedTemplate) return null
    return parseExamFormJson(selectedTemplate.examFormJson)
  }, [selectedTemplate])

  // Draft-based scores (takes priority over saved result)
  // Note: getDraft and hasDraft are stable store methods; including them would
  // cause unnecessary re-renders since they are Zustand selectors.
  const draftScores = useMemo<{ scores: ExamFormJson; comment: string } | null>(() => {
    if (!draftKey || !hasDraft(draftKey)) return null
    const draft = getDraft(draftKey)
    return draft ? { scores: draft.scores, comment: draft.comment } : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey])

  // Saved result-based scores
  const savedScores = useMemo<{ scores: ExamFormJson | null; comment: string }>(() => {
    const result = savedResult
      ? {
          scores: savedResult.examResultJson
            ? parseExamFormJson(savedResult.examResultJson)
            : null,
          comment: savedResult.teacherComment ?? '',
        }
      : { scores: null, comment: '' }
    return result
  }, [savedResult])

  // ── Final form state: draft > saved > template ──
  const computedScores = draftScores?.scores ?? savedScores.scores ?? templateScores
  const computedComment = draftScores?.comment ?? savedScores.comment

  // Sync to local state only when computed values change.
  // This is a legitimate "derived state" pattern for external data (API/localStorage).
  // The eslint rule is overly strict; the data sources (draft, savedResult, template) are
  // already memoized, so adding them to deps would be redundant.
  useLayoutEffect(() => {
    if (computedScores) {
      hasUserEdited.current = draftScores !== null // Don't mark as edited if restored from draft
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScores(computedScores)
       
      setComment(computedComment)
       
      setDraftRestored(draftScores !== null)
    }
     
  }, [computedScores, computedComment, draftScores])

  // ── Auto-hide draft banner after 3 seconds ──
  // This is a side-effect (timeout) that must run when draftRestored changes.
  useEffect(() => {
    if (draftRestored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowDraftBanner(true)
      const timer = setTimeout(() => {
         
        setShowDraftBanner(false)
      }, 3000)
      return () => clearTimeout(timer)
    } else {
       
      setShowDraftBanner(false)
    }
  }, [draftRestored])

  // ── Auto-save draft (debounced 500ms) — triggered by useEffect on scores/comment changes ──
  useEffect(() => {
    // Guard: only save when user has actively edited AND key is stable
    if (!draftKey || !hasUserEdited.current) return

    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current)
    draftSaveTimerRef.current = setTimeout(() => {
      // Double-check hasUserEdited inside timeout — key may have changed during debounce
      if (hasUserEdited.current) {
        saveDraft(draftKey, scores, comment)
      }
    }, 500)

    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current)
    }
  }, [scores, comment, draftKey, saveDraft])

  // ── beforeunload warning when user has unsaved edits ──
  useEffect(() => {
    if (!hasUserEdited.current || !draftKey) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [scores, comment, draftKey]) // Re-attach when state changes

  // ── Form readiness ──
  const isFormReady = !!selectedStudentId && !!selectedExamType

  // ── Handlers ──
  const handleOverallChange = useCallback(
    (index: number, value: number) => {
      hasUserEdited.current = true
      setScores((prev) => {
        const newOverall = [...prev.overall]
        newOverall[index] = { ...newOverall[index], evaluation: String(value) }
        return { ...prev, overall: newOverall }
      })
    },
    [],
  )

  const handleAcademicChange = useCallback(
    (index: number, rawValue: string, maxWeight: string) => {
      hasUserEdited.current = true
      const max = parseFloat(maxWeight) || 100
      let numVal = parseFloat(rawValue)
      // Clamp: prevent typing values exceeding max
      if (Number.isNaN(numVal)) {
        // Allow empty string while typing
        setScores((prev) => {
          const newAcademic = [...prev.academic]
          newAcademic[index] = { ...newAcademic[index], score: rawValue }
          return { ...prev, academic: newAcademic }
        })
        return
      }
      if (numVal < 0) numVal = 0
      if (numVal > max) numVal = max
      setScores((prev) => {
        const newAcademic = [...prev.academic]
        newAcademic[index] = { ...newAcademic[index], score: String(numVal) }
        return { ...prev, academic: newAcademic }
      })
    },
    [],
  )

  /** Wrap comment change to track user edits for draft persistence */
  const handleCommentChange = useCallback((html: string) => {
    hasUserEdited.current = true
    setComment(html)
  }, [])

  // ── react-to-print: print via isolated iframe ──
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Exam_${selectedStudent?.englishName ?? 'Result'}_${examTitle}`,
    pageStyle: `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      @page { size: A4 portrait; margin: 0; }
      html, body {
        width: 210mm;
        margin: 0;
        padding: 0;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      /* Reset preview zoom so iframe prints at 100% scale */
      #exam-printable-area {
        transform: none !important;
        gap: 0 !important;
      }
    `,
  })

  // ── Save mutation ──
  const { mutate: saveResult, isPending: isSaving } = useSaveExamResult(
    classId,
    selectedStudentId,
    examTypeNum,
  )

  const handleSave = useCallback(() => {
    if (!selectedStudentId || !selectedExamType) {
      return
    }
    const examFormJson: ExamFormJson = {
      examName: examTitle,
      examType: examTypeNum,
      overall: scores.overall,
      academic: scores.academic,
    }
    saveResult(
      {
        classId,
        studentId: selectedStudentId,
        examType: examTypeNum,
        examResultJson: JSON.stringify(examFormJson),
        teacherComment: comment,
        modifiedBy: authUser?.name ?? 'system',
      },
      {
        onSuccess: () => {
          // Clear draft from localStorage after successful save
          if (draftKey) clearDraft(draftKey)
          hasUserEdited.current = false
          setDraftRestored(false)
        },
      },
    )
  }, [
    selectedStudentId,
    selectedExamType,
    examTitle,
    examTypeNum,
    scores,
    comment,
    classId,
    authUser,
    saveResult,
    draftKey,
    clearDraft,
  ])

  /** Discard draft and reset form to API data */
  const handleDiscardDraft = useCallback(() => {
    if (draftKey) clearDraft(draftKey)
    hasUserEdited.current = false
    setDraftRestored(false)
    // Re-apply API data
    if (savedResult) {
      if (savedResult.examResultJson) {
        setScores(parseExamFormJson(savedResult.examResultJson))
      }
      setComment(savedResult.teacherComment ?? '')
    } else if (selectedTemplate) {
      setScores(parseExamFormJson(selectedTemplate.examFormJson))
      setComment('')
    }
  }, [draftKey, clearDraft, savedResult, selectedTemplate])

  const handleZoomIn = () =>
    setZoomLevel((prev) => Math.min(prev + 0.1, 2.0))
  const handleZoomOut = () =>
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.3))
  const handleZoomReset = () => setZoomLevel(0.65)

  // ── Map state → PrintTemplateProps ──
  const templateProps: PrintTemplateProps = useMemo(
    () => ({
      student: {
        name: selectedStudent?.studentName ?? 'Select a student',
        englishName: selectedStudent?.englishName ?? '',
      },
      className: classInfo?.class ?? '',
      mainTeacher,
      coTeacher: coTeachers,
      startDate: classInfo?.startDate ?? '',
      examTitle,
      overallScores: scores.overall.map((o) => ({
        skillName: o.name,
        skillNameVi: o.altName,
        value: Number(o.evaluation) || 0,
      })),
      academicScores: scores.academic.map((a) => ({
        subjectName: a.name,
        score: parseFloat(a.score) || 0,
        maxScore: parseFloat(a.weight) || 0,
      })),
      totalPercent,
      resultLabel,
      comment,
      evaluationScales: [...EVALUATION_SCALES],
      backgroundImageUrl: BG_IMAGE_URL,
    }),
    [
      selectedStudent,
      classInfo,
      mainTeacher,
      coTeachers,
      examTitle,
      scores,
      totalPercent,
      resultLabel,
      comment,
    ],
  )

  // ── Empty state ──
  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="size-10 mb-3 opacity-15" />
        <p className="text-sm font-medium">No students found</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Add students to this class to start exam grading
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* LEFT PANEL — Exam Grading Form (1:1 ratio)                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="w-[50%] flex flex-col min-w-0 shrink-0 h-full border-r overflow-hidden no-print">
        {/* Header — compact, p-3, h5 title, subtitle inline */}
        <div className="flex items-center justify-between h-14 px-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            <h5 className="font-semibold text-sm text-foreground">
              Exam Grading
            </h5>
            <span className="text-xs text-muted-foreground">
              — Input scores & evaluation
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {draftRestored && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscardDraft}
                className="h-7 text-xs gap-1 text-muted-foreground"
              >
                <X className="h-3 w-3" />
                Discard
              </Button>
            )}
            {canSaveExamResult && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!selectedStudentId || !selectedExamType || isSaving}
                className="h-7 gap-1.5 text-xs"
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* 1. Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Student
              </label>
              <Select
                value={selectedStudentId}
                onValueChange={setSelectedStudentId}
              >
                <SelectTrigger className="h-9">
                  <User className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Select student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.studentId} value={s.studentId}>
                      {s.englishName} - {s.studentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Exam Type
              </label>
              <Select
                value={selectedExamType}
                onValueChange={setSelectedExamType}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select exam..." />
                </SelectTrigger>
                <SelectContent>
                  {examTemplates.map((t) => (
                    <SelectItem key={t.id} value={String(t.examType)}>
                      {t.examName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Draft restored banner */}
          <AnimatePresence>
            {showDraftBanner && isFormReady && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200 overflow-hidden"
              >
                <AlertCircle className="size-3.5 shrink-0" />
                <span className="font-medium">Unsaved draft restored.</span>
                <span className="text-amber-600 dark:text-amber-400">Review and save or discard your changes.</span>
              </motion.div>
            )}
          </AnimatePresence>

          {!isFormReady ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium">Select a student and exam type</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Choose both options above to start grading
              </p>
            </div>
          ) : (
            <>
              <Separator />

              {/* 2. Overall Performance */}
              <div className="space-y-3">
                <h5 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary rounded-full" />
                  Overall Performance
                </h5>

                <div className="space-y-3">
                  {scores.overall.map((skill, idx) => (
                    <div key={skill.name} className="space-y-1.5">
                      <div className="text-sm font-medium pb-1">
                        {skill.name}{' '}
                        <span className="text-muted-foreground font-normal text-xs ml-1">
                          ({skill.altName})
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 ">
                        {EVALUATION_SCALES.map((scale) => {
                          const isSelected =
                            Number(skill.evaluation) === scale.value
                          return (
                            <label
                              key={scale.value}
                              className={`cursor-pointer flex flex-col items-center justify-center py-1.5 px-1 rounded-md border text-center transition-all ${isSelected
                                ? 'bg-background border-primary text-primary ring-1 ring-primary'
                                : 'bg-background border-transparent hover:bg-muted text-muted-foreground'
                                }`}
                            >
                              <input
                                type="radio"
                                name={`overall-${skill.name}`}
                                className="sr-only"
                                checked={isSelected}
                                onChange={() =>
                                  handleOverallChange(idx, scale.value)
                                }
                              />
                              <div
                                className={`w-2.5 h-2.5 rounded-full border mb-0.5 ${isSelected
                                  ? 'bg-primary border-primary'
                                  : 'border-muted-foreground'
                                  }`}
                              />
                              <span className="text-[10px] font-semibold leading-tight">
                                {scale.label}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* 4. Academic Performance */}
              <div className="space-y-3 pb-4">
                <h5 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary rounded-full" />
                  Academic Performance
                </h5>

                <div className="grid grid-cols-2 gap-3">
                  {scores.academic.map((item, idx) => (
                    <div key={item.name} className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        {item.name} (Max {item.weight})
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={parseFloat(item.weight) || 100}
                        step="0.5"
                        value={item.score}
                        onChange={(e) =>
                          handleAcademicChange(idx, e.target.value, item.weight)
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>

                {/* Total + Result display */}
                <div className="flex items-center justify-between px-3 py-2 rounded-md border border-border/50 bg-muted/5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Total: {total}/{maxTotal} ({totalPercent.toFixed(2)}%)
                  </span>
                  <span
                    className={`text-xs font-bold uppercase ${totalPercent >= 80
                      ? 'text-emerald-600'
                      : totalPercent >= 60
                        ? 'text-amber-600'
                        : 'text-red-600'
                      }`}
                  >
                    {resultLabel}
                  </span>
                </div>
              </div>

              <Separator />

              {/* 4. Teacher's Comment */}
              <div className="space-y-2 pb-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary rounded-full" />
                    Teacher&apos;s Comment
                  </h5>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="text-[10px] font-bold uppercase tracking-wide gap-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-100 h-6"
                  >
                    <Sparkles className="h-3 w-3" />
                    AI Generate
                  </Button>
                </div>

                <TiptapEditor
                  value={comment}
                  onChange={handleCommentChange}
                  placeholder="Enter teacher's comment..."
                  minHeight="min-h-[160px]"
                  showToolbar
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* RIGHT PANEL — Live Document Preview (1:1 ratio)               */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="w-[50%] flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header — compact, p-3, h5 title, subtitle inline */}
        <div className="flex items-center justify-between h-14 px-3 border-b shrink-0 no-print">
          <div className="flex items-center gap-2">
            <FileBadge className="h-4 w-4 text-primary" />
            <h5 className="font-semibold text-sm text-foreground">
              Document Preview
            </h5>
            <span className="text-xs text-muted-foreground">
              — A4 Print Layout
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Zoom Controls */}
            <div className="flex items-center border border-border rounded-md">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-r-none border-r border-border"
                onClick={handleZoomOut}
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="w-10 text-center text-[11px] font-mono">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-none border-r border-border"
                onClick={handleZoomIn}
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-l-none"
                onClick={handleZoomReset}
                title="Reset Zoom"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePrint()}
              className="h-7 gap-1.5 text-xs"
            >
              <Printer className="h-3 w-3" />
              Print / PDF
            </Button>
          </div>
        </div>

        {/* A4 Preview Container — dot background */}
        <div
          className="flex-1 overflow-auto pt-6 pb-6 flex flex-col items-center relative"
          style={{
            backgroundColor: 'var(--color-muted)',
            backgroundImage:
              'radial-gradient(circle, oklch(0.55 0 0 / 0.25) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        >
          {isFormReady ? (
            <div
              ref={printRef}
              id="exam-printable-area"
              className="flex flex-col gap-4 origin-top transition-transform duration-200 ease-out"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <DefaultTemplate {...templateProps} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FileBadge className="h-10 w-10 mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium">No document to preview</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Select a student and exam type to generate
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
