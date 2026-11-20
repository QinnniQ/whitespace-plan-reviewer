import { useEffect, useState } from 'react';
import { message, requestJson, validateTasks, type Plan, type Review, type Schedule } from './review';

export type Calculation = { result: Schedule | null; error?: string; pending?: boolean };

export function useSchedule(plan: Plan, review: Review) {
  const [attempt, setAttempt] = useState(0);
  // Use the same key for the displayed answer and the posted inputs. An older
  // result disappears on the first render of an edit, even before its effect runs.
  const body = JSON.stringify({ tasks: review.tasks, deadline_day: review.deadline_day });
  const key = attempt + ':' + body;
  const originalInputs = review.deadline_day === plan.review.deadline_day &&
    JSON.stringify(review.tasks) === JSON.stringify(plan.review.tasks);
  const useOriginal = originalInputs && (!!plan.schedule || attempt === 0);
  const invalid = validateTasks(review.tasks) || (review.deadline_day !== null &&
    !Number.isSafeInteger(review.deadline_day) ? 'Enter a whole number for the deadline.' : null);
  const needsRequest = !invalid && review.deadline_day !== null && !useOriginal;
  const [answer, setAnswer] = useState<(Calculation & { key: string }) | null>(null);

  useEffect(() => {
    if (!needsRequest) return;
    const controller = new AbortController();
    requestJson<Schedule>('/api/schedule', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: controller.signal,
    }).then(result => {
      if (!controller.signal.aborted) setAnswer({ key, result });
    }).catch(error => {
      if (!controller.signal.aborted) setAnswer({ key, result: null, error: message(error) });
    });
    return () => controller.abort();
  }, [needsRequest, body, key]);

  let calculation: Calculation;
  if (invalid) calculation = { result: null, error: invalid };
  else if (review.deadline_day === null) calculation = { result: null };
  else if (useOriginal) calculation = { result: plan.schedule, error: plan.schedule_error ||
    (plan.schedule ? undefined : 'No schedule was returned. Try calculating again.') };
  else calculation = answer?.key === key ? answer : { result: null, pending: true };
  return { calculation, retry: () => setAttempt(n => n + 1) };
}
