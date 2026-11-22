import type { Page } from '@playwright/test'

export const classRow = {
  id: 'class-1', name: 'Starters A', description: 'Monday and Wednesday English',
  levelId: 'level-1', levelName: 'Starters', campusId: 'campus-1', campusName: 'Main campus',
  schedule: 'Mon, Wed', startDate: '2026-01-01', endDate: '2026-12-31',
  startTime: '17:30', endTime: '19:00', teachers: 'Mai Nguyen',
  numberOfStudents: 1, teachingProgress: 12, isFinished: false,
}
const student = {
  id: 'roster-1', studentId: 'student-1', sortOrder: 1, studentName: 'Linh Nguyen', englishName: 'Lily',
  birthday: '2018-02-10', birthdayFormat: '10/02/2018', traits: null,
  fatherName: null, fatherPhone: null, motherName: null, motherPhone: null, elAccount: null,
  studentType: 1, classType: 'Regular', studentTypeText: 'Regular', startTimeFormat: null,
  endTimeFormat: null, present: true, suspendDate: null, terminateDate: null,
}
export async function mockClassesApi(page: Page, list: 'normal' | 'empty' | 'error' = 'normal') {
  await page.route('https://api.geeo.test/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    let json: unknown = []
    if (path.endsWith('/classes/all')) {
      if (list === 'error') return route.fulfill({ status: 500, body: 'Unavailable', headers: { 'access-control-allow-origin': '*' } })
      json = list === 'empty' ? [] : [classRow]
    } else if (path.endsWith('/classes/class-1')) {
      json = { id: 'class-1', name: 'Starters A', levelId: 'level-1', campusId: 'campus-1', description: classRow.description, level: { id: 'level-1', name: 'Starters' }, schedule: null }
    } else if (path.endsWith('/class-1/info')) {
      json = { id: 'class-1', class: 'Starters A', level: 'Starters', description: classRow.description, schedule: 'Mon, Wed', startTimeLocal: '17:30', endTimeLocal: '19:00', startDate: '2026-01-01', endDate: '2026-12-31', numberOfStudents: 1, teacher: 'Mai Nguyen', teachingProccess: '12' }
    } else if (path.endsWith('/class-1/teachers')) {
      json = [{ id: 'teacher-1', teacherId: 'teacher-1', fullName: 'Mai Nguyen', englishName: 'Mai', isPrimary: true }]
    } else if (path.endsWith('/class-1/lessons')) {
      json = [{ id: 'class-lesson-1', lessonId: 'lesson-1', level: 'Starters', lesson: 'Unit 1 - Hello', subject: 'Greetings', content: 'Say hello', tb: 'Page 1' }]
    } else if (path.endsWith('/class-1/students')) {
      json = [student]
    } else if (path.endsWith('/exams/templates')) {
      json = [{ id: 'exam-1', examType: 1, examName: 'Midterm', examFormJson: JSON.stringify({ examName: 'Midterm', examType: 1, overall: [{ name: 'Confidence', altName: 'Sự tự tin', evaluation: '4' }], academic: [{ name: 'Speaking', weight: '10', score: '9' }] }) }]
    } else if (path.includes('/exams/students/')) {
      json = null
    } else if (path.endsWith('/StudentReport')) {
      json = { items: [], page: 1, pageSize: 500, hasNext: false }
    }
    await route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json })
  })
}
