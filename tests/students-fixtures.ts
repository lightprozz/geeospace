import type { StudentAllItem, StudentDetail } from '@/features/lms/types/student'

export const student = {
  id: 'student-1', studentName: 'Nguyen Minh Anh', englishName: 'Annie',
  birthday: '2016-04-12', yob: 2016, address: '12 Lotus Street', beginDate: '2025-01-06',
  suspendDate: null, suspendMonths: null, suspendReason: null, terminateDate: null,
  terminateReason: null, traits: null, note: null, rating: null, status: null,
  fatherId: 'father-1', fatherName: 'Nguyen Van Minh', fatherPhone: '0901234567',
  motherId: null, motherName: null, motherPhone: null,
  currentClassId: 'class-1', currentClassName: 'Explorers A', currentStudentType: 1,
  currentStudentTypeName: 'Regular', currentSortOrder: 1, currentRegisterDate: '2025-01-06',
  campusId: 'campus-1', campusName: 'Lotus Campus', campusAddress: '12 Lotus Street',
  levelId: 'level-1', levelName: 'Explorers',
} satisfies StudentAllItem

export const students: StudentAllItem[] = [student,
  { ...student, id: 'student-2', studentName: 'Tran Bao Long', englishName: 'Leo', campusId: 'campus-2', campusName: 'River Campus' },
  { ...student, id: 'student-3', studentName: 'Le Mai', englishName: 'May', currentStudentType: 4, currentStudentTypeName: 'Suspended' },
]

export const studentDetail: StudentDetail = {
  ...student, elAccount: 'annie.student', firstCourse: null, renewCourse: null,
  classStudents: [{ id: 'enrollment-1', studentId: student.id, classId: 'class-1', className: 'Explorers A', studentType: 1, sortOrder: 1, numberOfDemoSessions: 0, registerDate: '2025-01-06' }],
}

export function studentResponse(path: string): unknown {
  path = path.split('?')[0]
  if (path.endsWith('/all')) return students
  if (path.endsWith('/parents')) return [{ id: 'father-1', name: 'Nguyen Van Minh', relation: 1, phoneNumber: '0901234567', email: 'minh@example.test', address: '12 Lotus Street', job: 'Engineer', yob: 1985 }]
  if (path.endsWith('/payment-summary')) return { totalSessions: 48, totalStudiedSessions: 18, totalRemainSessions: 30, paymentRemaining: 2500000, numberOfAbsences: 1, numberOfFrequentAbsences: 0, endDateOfSession: '2027-06-01', lastAttendanceDate: '2026-11-20' }
  if (path.endsWith('/payments')) return [{ id: 'payment-1', name: 'Explorers Term 1', startDate: '2026-09-01', endDate: '2027-06-01', numberOfSession: 48, amount: 6000000, transferType: 2, type: 1 }]
  if (path.endsWith('/learning-outcomes')) return [{ id: 'lesson-1', present: 1, starScore: 4, note: 'Great work', lesson: 'My family', subject: 'English', className: 'Explorers A', levelName: 'Explorers', logDateTime: '2026-11-20T09:30:00' }]
  if (path.endsWith('/search')) return []
  if (path.endsWith('/student-1')) return studentDetail
  return null
}
