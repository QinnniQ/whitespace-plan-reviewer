import { useState } from 'react';
import { Icon } from './Icon';
import type { DialogState } from './ReviewDialog';
import type { Review, Schedule } from './review';

export function ReviewDetails({ review, original, result, open }: {
  review: Review; original: Review; result: Schedule | null; open: (state: DialogState) => void;
}) {
  const [view, setView] = useState<'tasks' | 'findings'>('tasks');
  const [query, setQuery] = useState('');
  const timings = new Map(result?.schedule.map(item => [item.id, item]));
  const names = new Map(review.tasks.map(task => [task.id, task.name]));
  const visible = review.tasks.filter(task => (task.name + ' ' + (task.owner ?? 'Unassigned')).toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="details" aria-label="Review details">
    <div className="views" aria-label="Review sections">
      <button aria-pressed={view === 'tasks'} onClick={() => setView('tasks')}><Icon name="list" />Task schedule <span>{review.tasks.length}</span></button>
      <button aria-pressed={view === 'findings'} onClick={() => setView('findings')}><Icon name="note" />Review findings <span>{review.findings.length}</span></button>
    </div>
    {view === 'tasks' ? <div className="panel schedule-panel">
      <div className="table-tools"><div><h2>Task schedule</h2><small>Start and finish days are counted from kickoff.</small></div>
        <label className="search"><Icon name="search" /><input type="search" aria-label="Filter tasks by name or owner" placeholder="Find a task or owner" value={query} onChange={e => setQuery(e.target.value)} /></label>
      </div>
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
            <td data-label="Source"><button className="icon-button source-button" title="View in plan" aria-label={`View in plan: ${task.name}`}
              onClick={() => open({ kind: 'source', quote: task.quote, title: task.name })}><Icon name="book" /></button></td>
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
