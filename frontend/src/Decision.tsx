import { Icon } from './Icon';
import type { Review, Schedule } from './review';
import type { Calculation } from './useSchedule';

export function assessDeadline(review: Review, { result, pending, error }: Calculation) {
  const deadline = review.deadline_day;
  if (error) return { label: 'Schedule unavailable', title: 'The earliest finish is unknown.', detail: error, warning: true };
  if (deadline === null) return { label: 'Deadline not stated', title: 'A deadline is needed.', detail: 'Enter the deadline day to calculate the schedule and check whether the plan can meet it.' };
  if (pending || !result) return { label: 'Calculating', title: 'Checking the earliest finish…', detail: 'Checking who is available and which tasks need to finish first.' };
  if (result.status === 'cycle') {
    const names = result.cycle.map(id => review.tasks.find(task => task.id === id)?.name ?? 'Unknown task');
    return { label: 'Cannot schedule', title: 'These tasks depend on one another.',
      detail: names.length === 1 ? `“${names[0]}” waits for itself. Correct its prerequisites to continue.`
        : names.map(name => `“${name}”`).join(' and ') + ' form a loop. Correct their prerequisites to continue.', warning: true };
  }
  if (result.meets_deadline) {
    const margin = deadline - result.end_day;
    return { label: 'On track', title: margin ? `Finishes ${margin} ${margin === 1 ? 'day' : 'days'} before the deadline.` : 'Finishes on the deadline.',
      detail: 'The assigned owners can complete their tasks in time, working on one task at a time.' };
  }
  const work = new Map<string, number>();
  for (const task of review.tasks) if (task.owner !== null)
    work.set(task.owner, (work.get(task.owner) ?? 0) + task.duration_days);
  const busiest = [...work.entries()].sort((a, b) => b[1] - a[1])[0];
  const last = result.schedule.find(entry => entry.end_day === result.end_day);
  const lastTask = review.tasks.find(task => task.id === last?.id);
  return { label: 'At risk', title: `Earliest completion is ${result.days_late} ${result.days_late === 1 ? 'day' : 'days'} late.`,
    detail: busiest && busiest[1] > deadline && deadline >= 0
      ? `${busiest[0]} has ${busiest[1]} days of assigned work and only ${deadline} days are available.`
      : `Given the prerequisites and each owner’s availability, ${lastTask ? '“' + lastTask.name + '” finishes' : 'the work finishes'} on day ${result.end_day}.`, warning: true };
}

export function Decision({ review, calculation, info, original, edited, editDeadline, retry }: {
  review: Review; calculation: Calculation; info: ReturnType<typeof assessDeadline>; original: Schedule | null; edited: boolean;
  editDeadline: () => void; retry: () => void;
}) {
  const end = calculation.result?.end_day;
  return <section className={'decision panel' + (info.warning ? ' attention' : '')} aria-label="Deadline assessment">
    <div className="assessment" aria-live="polite">
      <span className={'status ' + (info.warning ? 'warn' : end != null ? 'good' : 'neutral')}>
        <Icon name={info.warning ? 'alert' : end != null ? 'check' : 'clock'} size={14} />{info.label}
      </span>
      <h2>{info.title}</h2><p>{info.detail}</p>
      {calculation.error && <button className="text-action" onClick={retry}>Try again</button>}
      {edited && original && <small>Original review · {original.status === 'cycle' ? 'Could not schedule' : `Finished on day ${original.end_day}`}</small>}
    </div>
    <dl className="metrics">
      <div><dt>Deadline <button className="icon-button" aria-label="Edit deadline" title="Edit deadline" onClick={editDeadline}><Icon name="edit" size={14} /></button></dt>
        <dd>{review.deadline_day === null ? 'Not stated' : `Day ${review.deadline_day}`}</dd></div>
      <div><dt>Earliest finish</dt><dd>{end == null ? '—' : `Day ${end}`}</dd></div>
    </dl>
  </section>;
}
