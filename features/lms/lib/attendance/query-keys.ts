// ---------------------------------------------------------------------------
// lib/attendance/query-keys.ts
// Centralized TanStack Query key factories for Attendance module
// Prevents cache key drift across hooks
// Same pattern as lib/schedule/query-keys.ts
// ---------------------------------------------------------------------------

export const attendanceKeys = {
  // -- CatchUp Schedule --
  catchUps: ['catchUps'] as const,
  catchUpLists: () => [...attendanceKeys.catchUps, 'list'] as const,
  catchUpList: (teacherId: string) =>
    [...attendanceKeys.catchUpLists(), teacherId] as const,
  catchUpDetails: () => [...attendanceKeys.catchUps, 'detail'] as const,
  catchUpDetail: (id: string) =>
    [...attendanceKeys.catchUpDetails(), id] as const,

  // -- Absent Students --
  absentStudents: ['absentStudents'] as const,
  absentStudentList: (teacherId: string) =>
    [...attendanceKeys.absentStudents, 'list', teacherId] as const,

  // -- Single Lessons --
  singleLessons: ['singleLessons'] as const,
  singleLessonLists: () => [...attendanceKeys.singleLessons, 'list'] as const,
  singleLessonList: () => [...attendanceKeys.singleLessonLists()] as const,
  singleLessonDetails: () =>
    [...attendanceKeys.singleLessons, 'detail'] as const,
  singleLessonDetail: (id: string) =>
    [...attendanceKeys.singleLessonDetails(), id] as const,
  singleLessonApproved: (id: string) =>
    [...attendanceKeys.singleLessons, 'approved', id] as const,

  // -- Lookups (for form selects) --
  lookups: ['attendanceLookups'] as const,
  classLessons: (teacherId: string) =>
    [...attendanceKeys.lookups, 'classLessons', teacherId] as const,
  classCourses: () =>
    [...attendanceKeys.lookups, 'classCourses'] as const,
  studentsByBranch: (branchId: string) =>
    [...attendanceKeys.lookups, 'studentsByBranch', branchId] as const,
  teachersByBranch: (branchId: string) =>
    [...attendanceKeys.lookups, 'teachersByBranch', branchId] as const,
}
