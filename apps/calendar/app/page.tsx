import { CalendarApp } from "../components/calendar-app";
import { today } from "../lib/dates.mjs";
export default function Page() { return <CalendarApp initialDay={today()} />; }
