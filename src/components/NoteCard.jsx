import { Link } from 'react-router';
import { MessageCircle, Star } from 'lucide-react';
import { Avatar, FlavorChip } from './ui.jsx';
import RadarChart from './RadarChart.jsx';
import { formatDate } from '../lib/format.js';
import { commentCount } from '../lib/db.js';
import { photoUrl } from '../lib/photos.js';

export default function NoteCard({ note }) {
  const meta = [note.origin, note.process, note.roast_level].filter(Boolean).join(' · ');
  return (
    <Link
      to={`/notes/${note.id}`}
      className="note-card group"
    >
      <div className="note-topline">
        <span>{[note.roaster, note.brew_method].filter(Boolean).join(' · ') || '테이스팅 노트'}</span>
        <span className="note-rating" aria-label={`별점 ${Number(note.rating).toFixed(1)}점`}>
          <Star size={13} fill="currentColor" /> {Number(note.rating).toFixed(1)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-snug tracking-tight group-hover:text-accent">{note.bean_name}</h3>
          {meta && <p className="mt-1.5 text-sm text-muted">{meta}</p>}
        </div>
        <div className="shrink-0" aria-hidden>
          {note.photos?.length ? (
            <img src={photoUrl(note.photos[0])} alt="" loading="lazy" className="size-14 rounded-lg object-cover" />
          ) : (
            <RadarChart note={note} size={54} compact />
          )}
        </div>
      </div>

      {note.flavors?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {note.flavors.slice(0, 5).map((f) => <FlavorChip key={f} name={f} size="sm" />)}
          {note.flavors.length > 5 && <span className="self-center text-xs text-muted">+{note.flavors.length - 5}</span>}
        </div>
      )}

      {note.memo && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-soft">{note.memo}</p>}

      <div className="note-signature">
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <Avatar name={note.author_name} src={note.author_avatar} size={24} />
          <span className="truncate font-medium text-ink-soft">{note.author_name}</span>
        </span>
        {commentCount(note) > 0 && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs text-muted tnum" aria-label={`댓글 ${commentCount(note)}개`}>
            <MessageCircle size={13} /> {commentCount(note)}
          </span>
        )}
        <time className="shrink-0 text-xs text-muted tnum" dateTime={(note.tasted_on || note.created_at)?.slice(0, 10)}>{formatDate(note.tasted_on || note.created_at)}</time>
      </div>
    </Link>
  );
}
