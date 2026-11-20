import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Icon } from './Icon';
import { quoteRange, validateTasks, type Finding, type Review, type Task } from './review';

export type DialogState = { kind: 'source'; quote?: string; title: string } | { kind: 'task'; id: string }
  | { kind: 'finding'; index: number } | { kind: 'deadline' };

function Dialog({ title, children, close, wide = false }: { title: string; children: ReactNode; close: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} aria-labelledby={id} className={wide ? 'wide' : ''} onCancel={close}>
    <header><h2 id={id}>{title}</h2><button className="icon-button" aria-label="Close" onClick={close}><Icon name="close" /></button></header>
    {children}
  </dialog>;
}

function Source({ source, quote, title, close }: { source: string; quote?: string; title: string; close: () => void }) {
  const mark = useRef<HTMLElement>(null);
  const range = quote ? quoteRange(source, quote) : null;
  useEffect(() => { mark.current?.scrollIntoView({ block: 'center' }); }, [quote]);
  return <Dialog title="Original plan" close={close} wide>
    <div className="source-caption"><Icon name="file" /><span>{title}</span></div>
    {quote && !range && <p role="status" className="warning">This passage could not be located in the original plan.</p>}
    <div className="source-scroll" tabIndex={0} aria-label="Original Markdown text">
      <pre>{range ? <>{source.slice(0, range[0])}<mark ref={mark}>{source.slice(...range)}</mark>{source.slice(range[1])}</> : source}</pre>
    </div>
  </Dialog>;
}

function TaskFields({ task, tasks, change }: { task: Task; tasks: Task[]; change: (task: Task) => void }) {
  return <>
    <label>Task name<input value={task.name} required onChange={e => change({ ...task, name: e.target.value })} /></label>
    <label>Assigned owner<input value={task.owner ?? ''} placeholder="Unassigned" list="owners"
      onChange={e => change({ ...task, owner: e.target.value || null })} /></label>
    <datalist id="owners">{[...new Set(tasks.map(t => t.owner).filter(Boolean))].map(owner => <option key={owner} value={owner!} />)}</datalist>
    <label>Duration in days<input type="number" min="1" step="1" required value={Number.isFinite(task.duration_days) ? task.duration_days : ''}
      onChange={e => change({ ...task, duration_days: e.target.valueAsNumber })} /></label>
    <fieldset><legend>Tasks that must finish first</legend><div className="choices">
      {tasks.filter(t => t.id !== task.id || task.depends_on.includes(t.id)).map(t => <label key={t.id}>
        <input type="checkbox" checked={task.depends_on.includes(t.id)} onChange={e => change({ ...task,
          depends_on: e.target.checked ? [...task.depends_on, t.id] : task.depends_on.filter(id => id !== t.id) })} />{t.name}</label>)}
      {tasks.length === 1 && !task.depends_on.length && <small>No other tasks in this plan.</small>}
    </div></fieldset>
  </>;
}

function Editor({ state, review, original, save, close }: { state: Exclude<DialogState, { kind: 'source' }>; review: Review; original: Review;
  save: (review: Review) => void; close: () => void }) {
  const [task, setTask] = useState(() => state.kind === 'task' ? review.tasks.find(t => t.id === state.id)! : null);
  const [finding, setFinding] = useState<Finding | null>(() => state.kind === 'finding' ? review.findings[state.index] : null);
  const [deadline, setDeadline] = useState(String(review.deadline_day ?? ''));
  const [error, setError] = useState('');
  let originalDetails: ReactNode;
  if (state.kind === 'task' && task) {
    const initial = original.tasks.find(t => t.id === task.id)!;
    if (JSON.stringify(initial) !== JSON.stringify(task)) {
      const before = initial.depends_on.map(id => original.tasks.find(t => t.id === id)?.name);
      originalDetails = <><strong>{initial.name}</strong><p>{initial.owner ?? 'Unassigned'} · {initial.duration_days} days</p>
        <p>Must follow · {before.join(', ') || 'None'}</p></>;
    }
  } else if (state.kind === 'finding' && finding) {
    const initial = original.findings[state.index];
    if (JSON.stringify(initial) !== JSON.stringify(finding)) originalDetails = <><strong>{initial.title}</strong><p>{initial.detail}</p></>;
  } else if (deadline !== String(original.deadline_day ?? '')) {
    originalDetails = original.deadline_day === null ? 'Deadline not stated' : `Deadline · Day ${original.deadline_day}`;
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    let next = review;
    if (task) {
      if (!task.name.trim()) { setError('Enter a task name.'); return; }
      next = { ...review, tasks: review.tasks.map(t => t.id === task.id ? { ...task, name: task.name.trim(), owner: task.owner?.trim() || null } : t) };
    } else if (state.kind === 'finding' && finding) {
      if (!finding.title.trim() || !finding.detail.trim()) { setError('Enter a title and explanation.'); return; }
      next = { ...review, findings: review.findings.map((f, i) => i === state.index ? finding : f) };
    } else {
      const value = deadline.trim() === '' ? null : Number(deadline);
      if (value !== null && !Number.isSafeInteger(value)) { setError('Enter a whole number for the deadline.'); return; }
      next = { ...review, deadline_day: value };
    }
    const invalid = validateTasks(next.tasks);
    if (invalid) { setError(invalid); return; }
    save(next);
    close();
  }
  return <Dialog title={task ? 'Edit task' : finding ? 'Edit finding' : 'Edit deadline'} close={close}>
    <form onSubmit={submit}><div className="form-body">
      {task ? <TaskFields task={task} tasks={review.tasks} change={setTask} /> : finding ? <>
        <label>Finding title<input required value={finding.title} onChange={e => setFinding({ ...finding, title: e.target.value })} /></label>
        <label>Explanation<textarea required rows={5} value={finding.detail} onChange={e => setFinding({ ...finding, detail: e.target.value })} /></label>
      </> : <label>Deadline day<input type="number" step="1" value={deadline} onChange={e => setDeadline(e.target.value)} />
        <small>Count from kickoff on day 0. Leave blank if the deadline is unknown.</small></label>}
      {error && <p className="warning" role="alert">{error}</p>}
      {originalDetails && <details className="original-values"><summary>Original review values</summary>{originalDetails}</details>}
    </div><footer><small>Changes stay in this tab.</small><button type="button" onClick={close}>Cancel</button>
      <button className="primary" type="submit">{finding || (state.kind === 'deadline' ? deadline === '' : review.deadline_day === null) ? 'Save correction' : 'Save and recalculate'}</button></footer></form>
  </Dialog>;
}

export function ReviewDialog({ state, source, ...props }: { state: DialogState; source: string; review: Review; original: Review;
  save: (review: Review) => void; close: () => void }) {
  return state.kind === 'source' ? <Source source={source} quote={state.quote} title={state.title} close={props.close} /> : <Editor state={state} {...props} />;
}
