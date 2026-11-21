// Auto-generated from GeeO.Data.Dto.V2.Curriculum

import { z } from 'zod';

// ---- Level ----

export interface LevelListItem {
  id: string;
  name: string;
  description?: string | null;
  numberOfLesson?: number | null;
  lessonTime?: number | null;
  createdDate?: string | null;
}

export interface LevelDetail {
  id: string;
  name: string;
  description?: string | null;
  numberOfLesson?: number | null;
  lessonTime?: number | null;
  lessonPlanCount: number;
  createdDate?: string | null;
  modifiedDate?: string | null;
}

export interface CreateLevelRequest {
  name: string;
  description?: string | null;
  numberOfLesson?: number | null;
  lessonTime?: number | null;
}

export interface UpdateLevelRequest {
  name: string;
  description?: string | null;
  numberOfLesson?: number | null;
  lessonTime?: number | null;
}

export interface LevelDropdown {
  id: string;
  name: string;
}

// ---- Exam Form ----

export interface ExamFormDto {
  id: string;
  examType: number;
  examName?: string | null;
  examFormJson?: string | null;
  levelId: string;
  createdDate?: string | null;
  modifiedDate?: string | null;
}

export interface SaveExamFormsRequest {
  examForms: ExamFormItemRequest[];
}

export interface ExamFormItemRequest {
  id?: string | null;
  examType: number;
  examName?: string | null;
  examFormJson?: string | null;
}

// ---- Lesson ----

export interface LessonListItem {
  id: string;
  level: string;
  lesson: string;
  subject?: string | null;
  content?: string | null;
  tb?: string | null;
  worksheetFileName?: string | null;
  createdDate?: string | null;
}

export interface LessonDetail {
  id: string;
  levelId: string;
  levelName?: string | null;
  lesson: string;
  subject?: string | null;
  content?: string | null;
  tb?: string | null;
  worksheetFileName?: string | null;
  createdDate?: string | null;
  modifiedDate?: string | null;
}

export interface CreateLessonRequest {
  levelId: string;
  lesson: string;
  subject?: string | null;
  content?: string | null;
  tb?: string | null;
}

export interface UpdateLessonRequest {
  lesson: string;
  subject?: string | null;
  content?: string | null;
  tb?: string | null;
}

// ---- Lesson Content ----

export interface LessonContentDto {
  id?: string | null;
  lessonPlanId: string;
  textbook?: string | null;
  page?: string | null;
  coreWords?: string | null;
  keyWords?: string | null;
  keyQuestions?: string | null;
  keyAnswers?: string | null;
  activities?: string | null;
  media?: string | null;
}

export interface SaveLessonContentRequest {
  id?: string | null;
  textbook?: string | null;
  page?: string | null;
  coreWords?: string | null;
  keyWords?: string | null;
  keyQuestions?: string | null;
  keyAnswers?: string | null;
  activities?: string | null;
  media?: string | null;
}

export interface LessonExistsCheck {
  exists: boolean;
  exceedsMaxLessons: boolean;
  hasTeachingLog: boolean;
}

export interface DeletedLesson {
  id: string;
  levelName?: string | null;
  lesson: string;
  subject?: string | null;
  content?: string | null;
  createdDate?: string | null;
}

export interface LessonSortItem {
  id: string;
  lesson: string;
}

// ---- Unit ----

export interface UnitListItem {
  id: string;
  lessonPlanId: string;
  sortOrder?: number | null;
  time?: number | null;
  procedures?: string | null;
  description?: string | null;
  materials?: string | null;
  teacherActivities?: string | null;
  learningOutcome?: string | null;
  note?: string | null;
  category?: string | null;
  materialId?: string | null;
  materialName?: string | null;
}

export interface UnitDetail {
  id: string;
  lessonPlanId: string;
  lessonName?: string | null;
  levelName?: string | null;
  sortOrder?: number | null;
  time?: number | null;
  procedures?: string | null;
  description?: string | null;
  materials?: string | null;
  teacherActivities?: string | null;
  learningOutcome?: string | null;
  note?: string | null;
  category?: string | null;
  materialId?: string | null;
  materialName?: string | null;
}

export interface CreateUnitRequest {
  lessonPlanId: string;
  time?: number | null;
  procedures?: string | null;
  description?: string | null;
  materials?: string | null;
  teacherActivities?: string | null;
  learningOutcome?: string | null;
  note?: string | null;
  category?: string | null;
  materialId?: string | null;
}

export interface UpdateUnitRequest {
  time?: number | null;
  procedures?: string | null;
  description?: string | null;
  materials?: string | null;
  teacherActivities?: string | null;
  learningOutcome?: string | null;
  note?: string | null;
  category?: string | null;
  materialId?: string | null;
}

export interface ReorderItem {
  id: string;
  sortOrder: number;
}

export interface CopyUnitsRequest {
  sourceLessonId: string;
}

export interface RelatedLesson {
  id: string;
  lesson: string;
  subject?: string | null;
  content?: string | null;
}

export interface UnitSearchResult {
  id: string;
  routeId: string;
  className?: string | null;
  classId?: string | null;
  level?: string | null;
  levelId?: string | null;
  lesson?: string | null;
  content?: string | null;
  subject?: string | null;
  campus?: string | null;
  campusId?: string | null;
  calendar?: string | null;
  createdDate?: string | null;
}

// ---- Lesson Comment ----

export interface LessonComment {
  id: string;
  classLessonId: string;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  content?: string | null;
  dateTime?: string | null;
}

export interface CreateCommentRequest {
  classLessonId: string;
  content: string;
}

export interface ExamOverallItem {
  name: string;
  altName: string;
  evaluation: string;
}

export interface ExamAcademicItem {
  name: string;
  weight: string;
  score: string;
}

export interface UnitCategory {
  math: boolean;
  science: boolean;
  music: boolean;
  phonics: boolean;
  sightwords: boolean;
  english: boolean;
  softSkills: boolean;
  activityBook: boolean;
  studentBook: boolean;
  teacherPlanner: boolean;
  m0: boolean;
  m1: boolean;
  m2: boolean;
  m3: boolean;
  a: boolean;
  m: boolean;
  e: boolean;
  v: boolean;
  c: boolean;
  j: boolean;
  s: boolean;
}

export const DEFAULT_CATEGORY: UnitCategory = {
  math: false, science: false, music: false, phonics: false,
  sightwords: false, english: false, softSkills: false,
  activityBook: false, studentBook: false, teacherPlanner: false,
  m0: false, m1: false, m2: false, m3: false,
  a: false, m: false, e: false, v: false, c: false, j: false, s: false,
};

export interface ExamFormJson {
  examName: string;
  overall: ExamOverallItem[];
  academic: ExamAcademicItem[];
}

// ---- Validation Schemas ----

export const UpsertUnitSchema = z.object({
  lessonPlanId: z.string().min(1),
  time: z.coerce.number().min(1, 'Time is required').default(5),
  procedures: z.string().min(1, 'Procedures are required'),
  description: z.string().optional(),
  materials: z.string().optional(),
  teacherActivities: z.string().optional(),
  learningOutcome: z.string().optional(),
  note: z.string().optional(),
});

export type UpsertUnitInput = z.infer<typeof UpsertUnitSchema>;

export const UpsertLevelSchema = z.object({
  branchId: z.string().optional().nullable(),
  courseId: z.string().optional().nullable(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  tb: z.string().optional().nullable(),
  levelCode: z.string().optional().nullable(),
  target: z.string().optional().nullable(),
  order: z.coerce.number().default(0),
  lessonTime: z.coerce.number().default(0),
  numberOfLesson: z.coerce.number().default(0),
});

export type UpsertLevelInput = z.infer<typeof UpsertLevelSchema>;

export const UpsertLessonSchema = z.object({
  levelId: z.string().min(1),
  lesson: z.string().min(1, 'Lesson is required'),
  subject: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  tb: z.string().optional().nullable(),
  sortOrder: z.coerce.number().default(0),
});

export type UpsertLessonInput = z.infer<typeof UpsertLessonSchema>;

export const DEFAULT_EXAM_FORM: ExamFormJson = {
  examName: '',
  overall: [],
  academic: [],
};
