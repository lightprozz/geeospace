// ---------------------------------------------------------------------------
// lib/curriculum/api.ts — V2 Curriculum API
// Routes: api/v2/curriculum/levels/*, api/v2/curriculum/lessons/*,
//         api/v2/curriculum/units/*, api/v2/curriculum/lesson-comments/*
// All endpoints now on V2. No @gap V1 fallbacks needed.
// ---------------------------------------------------------------------------

import { api, resolveApiUrl } from "@/features/lms/lib/transport"
import type {
  LevelListItem,
  LevelDetail,
  CreateLevelRequest,
  UpdateLevelRequest,
  LevelDropdown,
  ExamFormDto,
  SaveExamFormsRequest,
  LessonListItem,
  LessonDetail,
  CreateLessonRequest,
  UpdateLessonRequest,
  LessonContentDto,
  SaveLessonContentRequest,
  LessonExistsCheck,
  DeletedLesson,
  LessonSortItem,
  UnitListItem,
  UnitDetail,
  CreateUnitRequest,
  UpdateUnitRequest,
  ReorderItem,
  CopyUnitsRequest,
  RelatedLesson,
  UnitSearchResult,
  LessonComment,
  CreateCommentRequest,
} from "@/features/lms/types/curriculum"

// ---- V2 route prefixes ----

const CURRICULUM = "/api/v2/curriculum"

// =========================================================================
// Levels — V2
// =========================================================================

/** GET /api/v2/curriculum/levels */
export async function fetchLevels(): Promise<LevelListItem[]> {
  return api.get<LevelListItem[]>(`${CURRICULUM}/levels`)
}

/** GET /api/v2/curriculum/levels/{id} */
export async function fetchLevelById(id: string): Promise<LevelDetail> {
  return api.get<LevelDetail>(`${CURRICULUM}/levels/${id}`)
}

/** POST /api/v2/curriculum/levels */
export async function createLevel(data: CreateLevelRequest): Promise<LevelDetail> {
  return api.post<LevelDetail>(`${CURRICULUM}/levels`, data)
}

/** PUT /api/v2/curriculum/levels/{id} */
export async function updateLevel(id: string, data: UpdateLevelRequest): Promise<void> {
  return api.put<void>(`${CURRICULUM}/levels/${id}`, data)
}

/** DELETE /api/v2/curriculum/levels/{id} */
export async function deleteLevel(id: string): Promise<void> {
  return api.delete<void>(`${CURRICULUM}/levels/${id}`)
}

/** POST /api/v2/curriculum/levels/{id}/duplicate */
export async function duplicateLevel(id: string): Promise<LevelDetail> {
  return api.post<LevelDetail>(`${CURRICULUM}/levels/${id}/duplicate`, {})
}

/** GET /api/v2/curriculum/levels/dropdown */
export async function fetchLevelDropdown(): Promise<LevelDropdown[]> {
  return api.get<LevelDropdown[]>(`${CURRICULUM}/levels/dropdown`)
}

// ---- Exam Forms (sub-resource of level) ----

/** GET /api/v2/curriculum/levels/{id}/exam-forms */
export async function fetchExamForms(levelId: string): Promise<ExamFormDto[]> {
  return api.get<ExamFormDto[]>(`${CURRICULUM}/levels/${levelId}/exam-forms`)
}

/** PUT /api/v2/curriculum/levels/{id}/exam-forms */
export async function saveExamForms(
  levelId: string,
  data: SaveExamFormsRequest,
): Promise<void> {
  return api.put<void>(`${CURRICULUM}/levels/${levelId}/exam-forms`, data)
}

/** DELETE /api/v2/curriculum/levels/{id}/exam-forms/{examFormId} */
export async function deleteExamForm(
  levelId: string,
  examFormId: string,
): Promise<void> {
  return api.delete<void>(
    `${CURRICULUM}/levels/${levelId}/exam-forms/${examFormId}`,
  )
}

// =========================================================================
// Lessons — V2
// =========================================================================

/** GET /api/v2/curriculum/levels/{levelId}/lessons */
export async function fetchLessonsByLevel(
  levelId: string,
): Promise<LessonListItem[]> {
  return api.get<LessonListItem[]>(
    `${CURRICULUM}/levels/${levelId}/lessons`,
  )
}

/** GET /api/v2/curriculum/lessons/{id} */
export async function fetchLessonById(id: string): Promise<LessonDetail> {
  return api.get<LessonDetail>(`${CURRICULUM}/lessons/${id}`)
}

/** GET /api/v2/curriculum/lessons/by-class-lesson/{classLessonId} */
export async function fetchLessonByClassLesson(
  classLessonId: string,
): Promise<LessonDetail> {
  return api.get<LessonDetail>(
    `${CURRICULUM}/lessons/by-class-lesson/${classLessonId}`,
  )
}

/** GET /api/v2/curriculum/lessons/check-exists/{levelId}/{lesson}/{id?} */
export async function checkLessonExists(
  levelId: string,
  lesson: string,
  id = "",
): Promise<LessonExistsCheck> {
  const path = id
    ? `${CURRICULUM}/lessons/check-exists/${levelId}/${lesson}/${id}`
    : `${CURRICULUM}/lessons/check-exists/${levelId}/${lesson}`
  return api.get<LessonExistsCheck>(path)
}

/** GET /api/v2/curriculum/lessons/{id}/deleted-versions */
export async function fetchDeletedLessons(
  lessonId: string,
): Promise<DeletedLesson[]> {
  return api.get<DeletedLesson[]>(
    `${CURRICULUM}/lessons/${lessonId}/deleted-versions`,
  )
}

/** POST /api/v2/curriculum/lessons */
export async function createLesson(
  data: CreateLessonRequest,
): Promise<LessonDetail> {
  return api.post<LessonDetail>(`${CURRICULUM}/lessons`, data)
}

/** PUT /api/v2/curriculum/lessons/{id} */
export async function updateLesson(
  id: string,
  data: UpdateLessonRequest,
): Promise<void> {
  return api.put<void>(`${CURRICULUM}/lessons/${id}`, data)
}

/** DELETE /api/v2/curriculum/lessons/{id} */
export async function deleteLesson(id: string): Promise<void> {
  return api.delete<void>(`${CURRICULUM}/lessons/${id}`)
}

/** DELETE /api/v2/curriculum/lessons/bulk */
export async function bulkDeleteLessons(ids: string[]): Promise<void> {
  return api.delete<void>(`${CURRICULUM}/lessons/bulk`, { body: ids })
}

// ---- Lesson Content (sub-resource) ----

/** GET /api/v2/curriculum/lessons/{id}/content */
export async function fetchLessonContent(
  lessonId: string,
): Promise<LessonContentDto | null> {
  try {
    return await api.get<LessonContentDto>(
      `${CURRICULUM}/lessons/${lessonId}/content`,
    )
  } catch {
    return null // 204 No Content
  }
}

/** PUT /api/v2/curriculum/lessons/{id}/content */
export async function saveLessonContent(
  lessonId: string,
  data: SaveLessonContentRequest,
): Promise<LessonContentDto> {
  return api.put<LessonContentDto>(
    `${CURRICULUM}/lessons/${lessonId}/content`,
    data,
  )
}

// ---- Lesson Files (sub-resource) ----

/** POST /api/v2/curriculum/lessons/{id}/files — upload worksheet */
export async function uploadWorksheet(id: string, file: File): Promise<void> {
  const formData = new FormData()
  formData.append("files", file)
  await api.post<void>(`${CURRICULUM}/lessons/${id}/files`, formData, { responseType: "void" })
}

/** GET /api/v2/curriculum/lessons/{id}/files/{filename} */
export function getWorksheetUrl(id: string, filename: string): string {
  return resolveApiUrl(`${CURRICULUM}/lessons/${id}/files/${encodeURIComponent(filename)}`)
}

/** DELETE /api/v2/curriculum/lessons/{id}/files */
export async function deleteWorksheet(id: string): Promise<void> {
  return api.delete<void>(`${CURRICULUM}/lessons/${id}/files`)
}

// ---- Admin commands ----

/** POST /api/v2/curriculum/levels/{levelId}/copy-sort */
export async function copySortLessons(
  levelId: string,
  items: LessonSortItem[],
): Promise<void> {
  return api.post<void>(
    `${CURRICULUM}/levels/${levelId}/copy-sort`,
    items,
  )
}

/** POST /api/v2/curriculum/lessons/bulk-remove-content */
export async function bulkRemoveContent(
  lessonIds: string[],
): Promise<void> {
  return api.post<void>(
    `${CURRICULUM}/lessons/bulk-remove-content`,
    lessonIds,
  )
}

// =========================================================================
// Units — V2
// =========================================================================

/** GET /api/v2/curriculum/lessons/{lessonId}/units */
export async function fetchUnitsByLesson(
  lessonId: string,
): Promise<UnitListItem[]> {
  return api.get<UnitListItem[]>(
    `${CURRICULUM}/lessons/${lessonId}/units`,
  )
}

/** GET /api/v2/curriculum/units/{id} */
export async function fetchUnitById(id: string): Promise<UnitDetail> {
  return api.get<UnitDetail>(`${CURRICULUM}/units/${id}`)
}

/** POST /api/v2/curriculum/units */
export async function createUnit(
  data: CreateUnitRequest,
): Promise<UnitDetail> {
  return api.post<UnitDetail>(`${CURRICULUM}/units`, data)
}

/** PUT /api/v2/curriculum/units/{id} */
export async function updateUnit(
  id: string,
  data: UpdateUnitRequest,
): Promise<UnitDetail> {
  return api.put<UnitDetail>(`${CURRICULUM}/units/${id}`, data)
}

/** DELETE /api/v2/curriculum/units/{id} */
export async function deleteUnit(id: string): Promise<void> {
  return api.delete<void>(`${CURRICULUM}/units/${id}`)
}

/** DELETE /api/v2/curriculum/units/bulk */
export async function bulkDeleteUnits(ids: string[]): Promise<void> {
  return api.delete<void>(`${CURRICULUM}/units/bulk`, { body: ids })
}

/** POST /api/v2/curriculum/lessons/{lessonId}/units/reorder */
export async function reorderUnits(
  lessonId: string,
  items: ReorderItem[],
): Promise<void> {
  return api.post<void>(
    `${CURRICULUM}/lessons/${lessonId}/units/reorder`,
    items,
  )
}

/** GET /api/v2/curriculum/lessons/{lessonId}/related */
export async function fetchRelatedLessons(
  lessonId: string,
): Promise<RelatedLesson[]> {
  return api.get<RelatedLesson[]>(
    `${CURRICULUM}/lessons/${lessonId}/related`,
  )
}

/** POST /api/v2/curriculum/lessons/{lessonId}/units/copy-from */
export async function copyUnitsFromLesson(
  targetLessonId: string,
  sourceLessonId: string,
): Promise<void> {
  return api.post<void>(
    `${CURRICULUM}/lessons/${targetLessonId}/units/copy-from`,
    { sourceLessonId } as CopyUnitsRequest,
  )
}

/** GET /api/v2/curriculum/units/search */
export async function searchUnits(params: {
  levelId?: string
  classId?: string
  campusId?: string
  calendar?: string
}): Promise<UnitSearchResult[]> {
  const qs = new URLSearchParams()
  if (params.levelId) qs.set("levelId", params.levelId)
  if (params.classId) qs.set("classId", params.classId)
  if (params.campusId) qs.set("campusId", params.campusId)
  if (params.calendar) qs.set("calendar", params.calendar)
  return api.get<UnitSearchResult[]>(
    `${CURRICULUM}/units/search?${qs.toString()}`,
  )
}

// =========================================================================
// Lesson Comments — V2
// =========================================================================

/** GET /api/v2/curriculum/lesson-comments/by-class-lesson/{classLessonId} */
export async function fetchLessonComments(
  classLessonId: string,
): Promise<LessonComment[]> {
  return api.get<LessonComment[]>(
    `${CURRICULUM}/lesson-comments/by-class-lesson/${classLessonId}`,
  )
}

/** POST /api/v2/curriculum/lesson-comments */
export async function createLessonComment(
  data: CreateCommentRequest,
): Promise<LessonComment> {
  return api.post<LessonComment>(`${CURRICULUM}/lesson-comments`, data)
}

/** DELETE /api/v2/curriculum/lesson-comments/{id} */
export async function deleteLessonComment(id: string): Promise<void> {
  return api.delete<void>(`${CURRICULUM}/lesson-comments/${id}`)
}
