export type Task = {
  id: string; name: string; owner: string | null; duration_days: number;
  depends_on: string[]; quote: string;
};
export type Finding = { title: string; detail: string; quote: string | null };
export type Review = { deadline_day: number | null; tasks: Task[]; findings: Finding[] };
export type Timing = { id: string; start_day: number; end_day: number };
export type Schedule =
  | { status: 'cycle'; cycle: string[]; schedule: []; end_day: null }
  | { status: 'scheduled'; cycle: []; schedule: Timing[]; end_day: number; meets_deadline: boolean; days_late: number };
export type Plan = { id: string; text: string; review: Review; schedule: Schedule | null; schedule_error?: string | null };
export type PlanSummary = { id: string; title: string };

export function validateTasks(tasks: Task[]): string | null {
  if (tasks.length > 60) return 'Scheduling supports up to 60 tasks.';
  const ids = new Set(tasks.map(task => task.id));
  if (ids.size !== tasks.length) return 'Each task needs a unique ID.';
  for (const task of tasks) {
    if (!Number.isSafeInteger(task.duration_days) || task.duration_days < 1)
      return 'Enter a whole number of at least 1 for each duration.';
    if (task.depends_on.some(id => !ids.has(id))) return 'A prerequisite refers to a missing task.';
  }
  return null;
}

export async function requestJson<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (response.status === 503) throw new Error('The calculation timed out. Try again to check the earliest finish.');
  if (response.status === 422) throw new Error('The schedule could not be calculated. Check the task details and deadline.');
  if (!response.ok) throw new Error(`The server could not complete the request (HTTP ${response.status}).`);
  return response.json();
}

export function message(error: unknown): string {
  return error instanceof Error && !(error instanceof TypeError) ? error.message : 'Could not reach the server. Check the connection and try again.';
}

// Python's Unicode whitespace includes four ASCII separators as well as White_Space.
// Record UTF-16 offsets so React can highlight the original, unmodified source.
export function quoteRange(text: string, quote: string): [number, number] | null {
  const space = /[\p{White_Space}\u001c-\u001f]+/gu;
  const offsets: number[] = [];
  let normalized = '', cursor = 0;
  for (const match of text.matchAll(space)) {
    const at = match.index!;
    for (let i = cursor; i < at; i++) offsets.push(i);
    normalized += text.slice(cursor, at) + ' ';
    offsets.push(at);
    cursor = at + match[0].length;
  }
  normalized += text.slice(cursor);
  for (let i = cursor; i <= text.length; i++) offsets.push(i);
  const needle = quote.replace(space, ' ');
  const at = normalized.indexOf(needle);
  return at < 0 || !needle.trim() ? null : [offsets[at], offsets[at + needle.length]];
}
