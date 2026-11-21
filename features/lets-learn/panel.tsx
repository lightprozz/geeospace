'use client'

import { LmsUiScope } from '@/components/ui/lms-ui-scope'
import { useWindowNavigation } from '@/components/desktop/window-navigation'
import { LetsLearnClient } from './lets-learn-client'

export default function LetsLearnPanel() {
  const { path, navigate } = useWindowNavigation()
  const [id, classId, mode] = path.split('/')
  return <LmsUiScope className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
    {id ? <LetsLearnClient key={path} id={id} classId={classId || undefined} source={mode === 'lessonPlan' ? 'lessonPlan' : 'classLesson'} isPreview /> :
      <div className="m-auto w-full max-w-lg space-y-6 overflow-auto p-6">
        <h1 className="text-2xl font-bold">Let&apos;s Learn</h1>
        <p>Enter a class lesson ID to start presenting. Maximize this window for more space.</p>
        <form className="flex flex-col gap-4" onSubmit={event => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const lesson = String(data.get('lesson')).trim()
          const roster = String(data.get('class')).trim()
          if (lesson && !/[\s/?#\\]/.test(lesson + roster)) navigate(lesson + (roster ? '/' + roster : ''))
        }}>
          <label className="flex flex-col gap-2">Class lesson ID<input className="rounded-md border p-2" name="lesson" required pattern="[^\\s/?#\\\\]+" /></label>
          <label className="flex flex-col gap-2">Class ID (optional, for student roster)<input className="rounded-md border p-2" name="class" pattern="[^\\s/?#\\\\]+" /></label>
          <button className="rounded-md bg-primary p-3 text-primary-foreground" type="submit">Start lesson</button>
        </form>
        <p className="text-sm text-muted-foreground">Classroom tools and badges are session-only. Attendance and worklog recording are not available here.</p>
      </div>}
  </LmsUiScope>
}
