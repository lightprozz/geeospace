// Mirror of the GeeO.Common authorization policies from frontendv2.
export const PERMISSIONS = {
  // Curriculum
  CURRICULUM_READ: 'curriculum.read',
  CURRICULUM_CREATE: 'curriculum.create',
  CURRICULUM_UPDATE: 'curriculum.update',
  CURRICULUM_DELETE: 'curriculum.delete',
  CURRICULUM_APPROVE: 'curriculum.approve',

  // Class
  CLASS_READ: 'class.read',
  CLASS_CREATE: 'class.create',
  CLASS_UPDATE: 'class.update',
  CLASS_DELETE: 'class.delete',
  CLASS_SCHEDULE: 'class.schedule',

  // Teacher ops
  TEACHER_LESSONLOG_READ: 'teacher.lessonlog.read',
  TEACHER_LESSONLOG_WRITE: 'teacher.lessonlog.write',
  TEACHER_ASSESSMENT_READ: 'teacher.assessment.read',
  TEACHER_ASSESSMENT_WRITE: 'teacher.assessment.write',
  TEACHER_TASK_MANAGE: 'teacher.task.manage',

  // Student
  STUDENT_READ: 'student.read',
  STUDENT_ENROLL: 'student.enroll',
  STUDENT_UPDATE: 'student.update',
  STUDENT_SUSPEND: 'student.suspend',
  STUDENT_TERMINATE: 'student.terminate',
  STUDENT_DELETE: 'student.delete',
  STUDENT_PARENT_READ: 'student.parent.read',
  STUDENT_PARENT_MANAGE: 'student.parent.manage',
  STUDENT_PAYMENT_READ: 'student.payment.read',
  STUDENT_PAYMENT_WRITE: 'student.payment.write',

  // Reports
  REPORT_CAMPUS: 'report.campus',
  REPORT_LESSON: 'report.lesson',
  REPORT_STUDENT: 'report.student',
  REPORT_TEACHER: 'report.teacher',
  REPORT_FINANCIAL: 'report.financial',

  // Content > Material
  CONTENT_MATERIAL_READ: 'content.material.read',
  CONTENT_MATERIAL_WRITE: 'content.material.write',
  CONTENT_MATERIAL_DELETE: 'content.material.delete',
  CONTENT_MATERIAL_APPROVE: 'content.material.approve',

  // Content > Story
  CONTENT_STORY_READ: 'content.story.read',
  CONTENT_STORY_WRITE: 'content.story.write',
  CONTENT_STORY_DELETE: 'content.story.delete',

  // Content > Media
  CONTENT_MEDIA_READ: 'content.media.read',
  CONTENT_MEDIA_UPLOAD: 'content.media.upload',
  CONTENT_MEDIA_DELETE: 'content.media.delete',

  // Communication
  COMM_EMAIL_SEND: 'comm.email.send',
  COMM_CHAT: 'comm.chat',
  COMM_LIVECLASS: 'comm.liveclass',

  // Admin
  ADMIN_USERS_READ: 'admin.users.read',
  ADMIN_USERS_MANAGE: 'admin.users.manage',
  ADMIN_ROLES_MANAGE: 'admin.roles.manage',
  ADMIN_CAMPUS_READ: 'admin.campus.read',
  ADMIN_CAMPUS_MANAGE: 'admin.campus.manage',
  ADMIN_FACILITIES_READ: 'admin.facilities.read',
  ADMIN_FACILITIES_MANAGE: 'admin.facilities.manage',
  ADMIN_AUDIT_READ: 'admin.audit.read',
  ADMIN_TOKENS_MANAGE: 'admin.tokens.manage',

  // Attendance > CatchUp
  ATTENDANCE_CATCHUP_READ: 'attendance.catchup.read',
  ATTENDANCE_CATCHUP_WRITE: 'attendance.catchup.write',
  ATTENDANCE_CATCHUP_DELETE: 'attendance.catchup.delete',

  // Attendance > Events (SingleLessons)
  ATTENDANCE_EVENT_READ: 'attendance.event.read',
  ATTENDANCE_EVENT_WRITE: 'attendance.event.write',
  ATTENDANCE_EVENT_DELETE: 'attendance.event.delete',
  ATTENDANCE_EVENT_ARCHIVE: 'attendance.event.archive',
  ATTENDANCE_EVENT_APPROVE: 'attendance.event.approve',

  // Lesson Delivery
  LESSON_LIVE_READ: 'lesson.live.read',
  LESSON_LIVE_WRITE: 'lesson.live.write',

  // External integration (JWT OR API Key)
  EXTERNAL_READ: 'external.read',

  // Account
  ACCOUNT_PROFILE_READ: 'account.profile.read',
  ACCOUNT_PROFILE_WRITE: 'account.profile.write',
  ACCOUNT_PROFILE_READ_OTHERS: 'account.profile.read.others',
  ACCOUNT_WORKTIME_READ: 'account.worktime.read',
  ACCOUNT_WORKTIME_WRITE: 'account.worktime.write',
  ACCOUNT_TEMPLATE_READ: 'account.template.read',
  ACCOUNT_TEMPLATE_MANAGE: 'account.template.manage',

  // ClassApp (Electron class-app sync client)
  CLASSAPP_CLIENT: 'classapp.client',

  // Working Time — Worklog
  WORKLOG_READ: 'worklog.read',
  WORKLOG_WRITE: 'worklog.write',
  WORKLOG_APPROVE: 'worklog.approve',
  WORKINGTIME_CHECKIN: 'workingtime.checkin',

  // Forms — Requests
  FORMS_REQUEST_READ: 'forms.request.read',
  FORMS_REQUEST_WRITE: 'forms.request.write',
  /** Read-only participant bypass for support/audit. Granted to Admin role only (seed: V8_9/001). */
  FORMS_REQUEST_ADMIN: 'forms.request.admin',

  // Forms — Template Builder (FRM v2 admin)
  FORMS_TEMPLATE_READ: 'forms.template.read',
  FORMS_TEMPLATE_WRITE: 'forms.template.write',
  FORMS_TEMPLATE_ADMIN: 'forms.template.admin',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
