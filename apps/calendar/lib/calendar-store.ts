import { createStore } from "zustand/vanilla";
export type CalendarView = "week" | "month" | "agenda";
type CalendarState = { day: string; view: CalendarView; campus: string; set: (value: Partial<Omit<CalendarState, "set">>) => void };
export const createCalendarStore = (day: string) => createStore<CalendarState>()(set => ({ day, view: "week", campus: "", set: value => set(value) }));
