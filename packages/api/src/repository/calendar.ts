import { run_query } from "../db/init.js";

interface CalendarEventRow {
  event_type: "gig" | "showcase" | "rehearsal";
  event_id: number;
  title: string;
  event_date: string;
  location: string | null;
}

export async function readCalendarEvents(): Promise<CalendarEventRow[]> {
  return run_query<CalendarEventRow>({
    text: `
      SELECT event_type, event_id, title, event_date, location
      FROM calendar_events
      ORDER BY event_date, title;
    `,
  });
}