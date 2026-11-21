import { useRef, useState } from 'react';
import { Icon } from './Icon';
import type { DialogState } from './ReviewDialog';
import type { Review, Schedule } from './review';

export function ReviewDetails({ review, original, result, open, reset }: {
  review: Review; original: Review; result: Schedule | null; open: (state: DialogState) => void; reset?: () => void;
}) {
  const [view, setView] = useState<'tasks' | 'findings'>('tasks');
  const [query, setQuery] = useState('');
  const findingsButton = useRef<HTMLButtonElement>(null);
  // Preserve review order, favouring a finding Nora can check against the plan.
  const leadIndex = Math.max(0, review.findings.findIndex(finding => finding.quote !== null));
  const lead = review.findings[leadIndex];
  const leadEdited = JSON.stringify(lead) !== JSON.stringify(original.findings[leadIndex]);
  const timings = new Map(result?.schedule.map(item => [item.id, item]));
  const names = new Map(review.tasks.map(task => [task.id, task.name]));
  const visible = review.tasks.filter(task => (task.name + ' ' + (task.owner ?? 'Unassigned')).toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="details" aria-label="Review details">
    {lead && <section className="finding-summary" aria-label="Finding to check">
      <div><small>{leadEdited ? 'Finding edited in this tab' : 'From the saved review'}</small><h3>{lead.title}</h3></div>
      <div className="actions">{lead.quote !== null && <button className="text-action"
        onClick={() => open({ kind: 'source', title: lead.title, quote: lead.quote! })}><Icon name="book" />View in plan</button>}
        <button className="text-action" onClick={() => { setView('findings'); findingsButton.current?.focus(); }}>
          {review.findings.length === 1 ? 'See finding' : `See all ${review.findings.length} findings`}<Icon name="arrow" size={14} /></button>
      </div>
    </section>}
    {reset && <div className="correction-note"><span>These edits apply only in this tab.</span><button className="text-action" onClick={reset}><Icon name="reset" />Reset to original review</button></div>}
    <div className="views" aria-label="Review sections">
      <button aria-pressed={view === 'tasks'} onClick={() => setView('tasks')}><Icon name="list" />Task schedule <span>{review.tasks.length}</span></button>
      <button ref={findingsButton} aria-pressed={view === 'findings'} onClick={() => setView('findings')}><Icon name="note" />Review findings <span>{review.findings.length}</span></button>
    </div>
    {view === 'tasks' ? <div className="panel schedule-panel">
      <div className="table-tools"><div><h2>Task schedule</h2><small>{result?.status === 'cycle'
        ? 'Start and finish days are unavailable because the tasks named above depend on each other.'
        : result?.status === 'scheduled'
          ? 'Day 0 is kickoff. These dates show one way to finish the listed tasks as early as possible. Individual tasks may start earlier with the same finish day.'
          : 'Start and finish days appear once a schedule is available.'}</small></div>
        <label className="search"><Icon name="search" /><input type="search" aria-label="Filter tasks by name or owner" placeholder="Find a task or owner" value={query} onChange={e => setQuery(e.target.value)} /></label>
      </div>
      <p className="task-help">Select a task name to edit it or <strong>Quote</strong> to read its source. Reset to original review clears this tab’s edits.</p>
      {visible.length ? <div className="table-wrap"><table aria-label="Task schedule">
        <thead><tr>{['Task', 'Owner', 'Duration', 'Must follow', 'Start', 'Finish', 'Source'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{visible.map(task => {
          const timing = timings.get(task.id);
          const deps = task.depends_on.map(id => names.get(id) ?? 'Unknown task');
          const edited = JSON.stringify(task) !== JSON.stringify(original.tasks.find(t => t.id === task.id));
          return <tr key={task.id}><th scope="row"><button className="task-link" aria-label={`Edit task: ${task.name}`} onClick={() => open({ kind: 'task', id: task.id })}>
            {task.name}<Icon name="edit" size={12} /></button>{edited && <small className="edited">Edited</small>}</th>
            <td data-label="Owner">{task.owner === null ? <span className="unassigned">Unassigned</span> : <span className="owner">{task.owner || 'Unnamed owner'}</span>}</td>
            <td data-label="Duration">{task.duration_days} {task.duration_days === 1 ? 'day' : 'days'}</td>
            <td data-label="Must follow" className="deps">{deps.length ? deps.join(' · ') : 'None'}</td>
            <td data-label="Start">{timing?.start_day ?? '—'}</td><td data-label="Finish">{timing?.end_day ?? '—'}</td>
            <td data-label="Source"><button className="icon-button source-button" title="View in plan" aria-label={`Quote for ${task.name}`}
              onClick={() => open({ kind: 'source', quote: task.quote, title: task.name })}><Icon name="book" size={14} />Quote</button></td>
          </tr>;
        })}</tbody></table></div> : <p className="empty">{review.tasks.length ? 'No tasks match your search.' : 'No tasks were extracted from this plan.'}</p>}
    </div> : <div className="panel"><div className="table-tools"><div><h2>Review findings</h2><small>Observations from the saved review. Open the plan to check the evidence.</small></div></div>
      {review.findings.length === 0 && <p className="empty">The review recorded no findings.</p>}
      {review.findings.map((finding, index) => <article className="finding" key={index}>
        <div><h3>{finding.title}</h3>{JSON.stringify(finding) !== JSON.stringify(original.findings[index]) && <small className="edited">Edited</small>}</div>
        <p>{finding.detail}</p><div className="actions">{finding.quote !== null ?
          <button onClick={() => open({ kind: 'source', quote: finding.quote!, title: finding.title })}><Icon name="book" />View in plan</button> :
          <small>No specific source quotation was provided.</small>}
          <button className="text-action" onClick={() => open({ kind: 'finding', index })}><Icon name="edit" />Edit finding</button></div>
      </article>)}</div>}
  </section>;
}
