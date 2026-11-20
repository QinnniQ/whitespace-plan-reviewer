import { useEffect, useState } from 'react';
import { Decision } from './Decision';
import { Icon } from './Icon';
import { ReviewDetails } from './ReviewDetails';
import { ReviewDialog, type DialogState } from './ReviewDialog';
import { message, requestJson, type Plan, type PlanSummary, type Review } from './review';
import { useSchedule } from './useSchedule';
import './style.css';

function useResource<T>(url: string) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ data?: T; error?: string }>({});
  useEffect(() => {
    const controller = new AbortController();
    setState({});
    requestJson<T>(url, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ data });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ error: message(error) });
    });
    return () => controller.abort();
  }, [url, version]);
  return { ...state, retry: () => setVersion(v => v + 1) };
}

function Workspace({ title, plan, correction, save }: {
  title: string; plan: Plan; correction?: Review; save: (value?: Review) => void;
}) {
  const review = correction ?? plan.review;
  const { calculation, retry } = useSchedule(plan, review);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const owners = new Set(review.tasks.map(t => t.owner).filter(v => v !== null));
  return <>
    <div className="page-heading"><div><div className="eyebrow">Plan review</div><h1>{title}</h1>
      <p>{review.tasks.length} tasks <i>·</i> {owners.size} {owners.size === 1 ? 'owner' : 'owners'} <i>·</i> {correction ? 'Edited in this tab' : 'Original review'}</p>
    </div><button onClick={() => setDialog({ kind: 'source', title })}><Icon name="book" />Original plan</button></div>
    <Decision review={review} calculation={calculation} original={plan.schedule} edited={!!correction}
      editDeadline={() => setDialog({ kind: 'deadline' })} retry={retry} />
    {correction && <div className="correction-note"><span>Corrections apply only in this tab.</span><button className="text-action" onClick={() => save()}><Icon name="reset" />Reset to original review</button></div>}
    <ReviewDetails review={review} original={plan.review} result={calculation.result} open={setDialog} />
    {dialog && <ReviewDialog state={dialog} source={plan.text} review={review} original={plan.review} close={() => setDialog(null)}
      save={next => save(JSON.stringify(next) === JSON.stringify(plan.review) ? undefined : next)} />}
  </>;
}

function PlanPage({ selected, correction, save }: { selected: PlanSummary; correction?: Review; save: (value?: Review) => void }) {
  const { data, error, retry } = useResource<Plan>('/api/plans/' + encodeURIComponent(selected.id));
  if (!data) return <div className="panel notice" role="status"><h1>{selected.title}</h1><p>{error || 'Opening the plan…'}</p>{error && <button onClick={retry}>Try again</button>}</div>;
  return <Workspace title={selected.title} plan={data} correction={correction} save={save} />;
}

export default function App() {
  const { data: plans, error, retry } = useResource<PlanSummary[]>('/api/plans');
  const [selectedId, setSelectedId] = useState('');
  const selected = plans?.find(plan => plan.id === selectedId) ?? plans?.[0];
  const [corrections, setCorrections] = useState<Record<string, Review | undefined>>({});
  return <>
    <a className="skip" href="#review-content">Skip to review</a>
    <header className="topbar"><div className="brand"><span className="brand-mark"><Icon name="book" size={22} /></span>Plan reviewer</div>
      <span className="council">Pellerby Town Council</span></header>
    <div className="shell">
      <aside className="sidebar"><nav aria-label="Event plans"><div className="nav-heading"><span className="eyebrow">Event plans</span><span>{plans?.length ?? '—'}</span></div>
        {plans?.map(plan => <button key={plan.id} aria-current={selected?.id === plan.id ? 'page' : undefined} onClick={() => setSelectedId(plan.id)}>
          <Icon name="file" /><span>{plan.title.replace(/^Pellerby /, '')}</span></button>)}</nav>
        <label className="mobile-picker">Event plan<select value={selected?.id ?? ''} onChange={e => setSelectedId(e.target.value)}>
          {plans?.map(plan => <option key={plan.id} value={plan.id}>{plan.title}</option>)}</select></label>
        <div className="profile"><span className="avatar">NC</span><div>Nora Calloway<small>Events officer</small></div></div>
      </aside>
      <main id="review-content" tabIndex={-1}>{selected ? <PlanPage key={selected.id} selected={selected} correction={corrections[selected.id]}
        save={value => setCorrections(previous => ({ ...previous, [selected.id]: value }))} /> :
        <div className="panel notice" role="status"><h1>Event plans</h1><p>{error || (plans ? 'There are no event plans to review.' : 'Loading event plans…')}</p>{error && <button onClick={retry}>Try again</button>}</div>}
      </main>
    </div>
  </>;
}
