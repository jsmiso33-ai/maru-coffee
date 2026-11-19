import { Link } from 'react-router';
import { Avatar, FlavorChip, Stars } from './ui.jsx';
import RadarChart from './RadarChart.jsx';
import { formatDate } from '../lib/format.js';

export default function NoteCard({ note }) {
  const meta = [note.origin, note.process, note.roast_level].filter(Boolean).join(' · ');
  return (
    <Link
      to={`/notes/${note.id}`}
      className="group flex h-full flex-col rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-line-strong"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">{note.roaster || '로스터리 미기재'}</p>
          <h3 className="mt-1 text-[1.05rem] font-bold leading-snug group-hover:text-accent">{note.bean_name}</h3>
          {meta && <p className="mt-1 text-sm text-muted">{meta}</p>}
        </div>
        <div className="shrink-0 opacity-90" aria-hidden>
          <RadarChart note={note} size={64} compact />
        </div>
      </div>

      {note.flavors?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {note.flavors.slice(0, 5).map((f) => <FlavorChip key={f} name={f} size="sm" />)}
          {note.flavors.length > 5 && <span className="self-center text-xs text-muted">+{note.flavors.length - 5}</span>}
        </div>
      )}

      {note.memo && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-soft">{note.memo}</p>}

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <Avatar name={note.author_name} src={note.author_avatar} size={24} />
          <span className="truncate font-medium text-ink-soft">{note.author_name}</span>
          <span className="shrink-0 text-xs text-muted tnum">{formatDate(note.tasted_on || note.created_at)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <Stars value={Number(note.rating)} size={14} />
          <span className="text-sm font-semibold tnum">{Number(note.rating).toFixed(1)}</span>
        </span>
      </div>
    </Link>
  );
}
