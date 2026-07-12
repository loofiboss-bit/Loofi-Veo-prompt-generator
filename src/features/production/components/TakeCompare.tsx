import { useMemo, useState } from 'react';
import type { ProductionTake } from '@core/types';

export function TakeCompare({
  takes,
  onKeep,
  onReject,
  onRevise,
}: {
  takes: ProductionTake[];
  onKeep: (take: ProductionTake) => void;
  onReject: (take: ProductionTake) => void;
  onRevise: (take: ProductionTake, notes: string) => void;
}) {
  const available = useMemo(
    () => takes.filter((take) => take.localMediaUrl || take.providerMediaUri),
    [takes],
  );
  const [leftId, setLeftId] = useState(available.at(-2)?.id ?? available[0]?.id ?? '');
  const [rightId, setRightId] = useState(available.at(-1)?.id ?? available[0]?.id ?? '');
  const [notes, setNotes] = useState('');
  if (!available.length) return <p className="text-sm text-slate-500">No playable takes yet.</p>;
  const left = available.find((take) => take.id === leftId) ?? available[0];
  const right = available.find((take) => take.id === rightId) ?? available.at(-1)!;
  const pane = (label: string, take: ProductionTake, setId: (id: string) => void) => (
    <div className="space-y-2 rounded-lg border border-slate-700 bg-slate-950 p-3">
      <label className="flex items-center gap-2 text-xs text-slate-400">
        {label}
        <select
          value={take.id}
          onChange={(event) => setId(event.target.value)}
          className="rounded bg-slate-800 px-2 py-1"
        >
          {available.map((item, index) => (
            <option key={item.id} value={item.id}>
              Take {index + 1}
            </option>
          ))}
        </select>
      </label>
      <video
        controls
        preload="metadata"
        src={take.localMediaUrl ?? take.providerMediaUri}
        className="aspect-video w-full rounded bg-black"
      />
      <p className="text-xs text-slate-400">Score: {take.review?.overallScore ?? 'Not reviewed'}</p>
      {take.review?.dimensions.length ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-400">
          {take.review.dimensions.map((dimension) => (
            <div
              key={dimension.id}
              title={dimension.summary}
              className="flex justify-between gap-2"
            >
              <dt>{dimension.id.replaceAll('-', ' ')}</dt>
              <dd className="font-medium text-slate-200">{dimension.score}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onKeep(take)}
          className="rounded bg-emerald-600 px-2 py-1 text-xs"
        >
          Keep
        </button>
        <button
          type="button"
          onClick={() => onReject(take)}
          className="rounded bg-rose-700 px-2 py-1 text-xs"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => onRevise(take, notes)}
          className="rounded bg-amber-600 px-2 py-1 text-xs"
        >
          Revise
        </button>
      </div>
    </div>
  );
  return (
    <div aria-label="A/B take comparison" className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        {pane('A', left, setLeftId)}
        {pane('B', right, setRightId)}
      </div>
      <label className="block text-xs text-slate-400">
        Comparison notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="mt-1 h-20 w-full rounded border border-slate-700 bg-slate-950 p-2"
        />
      </label>
    </div>
  );
}
