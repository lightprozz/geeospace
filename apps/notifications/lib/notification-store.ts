import { createStore } from "zustand/vanilla";
export type NotificationState = {
  query: string; subject: string | null; source: "all" | "calendar";
  period: "all" | "upcoming" | "past"; preferences: boolean; group: boolean; automatic: boolean;
  set: (next: Partial<Omit<NotificationState, "set">>) => void;
};
export const createNotificationStore = () => createStore<NotificationState>()(set => ({
  query: "", subject: null, source: "all", period: "all", preferences: false, group: true, automatic: true,
  set: next => set(next),
}));
