export type CalendarNotice = { id: string; title: string; subject: string; startTime: string };
export type NotificationSnapshot = { events: CalendarNotice[]; observedAt: string };
