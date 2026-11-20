import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { MessageCircle, Send } from 'lucide-react';
import { addComment, deleteComment, listComments, updateComment, useAsync } from '../lib/db.js';
import { useAuth } from '../lib/auth.jsx';
import { isConfigured } from '../lib/supabase.js';
import { Avatar, Button, Notice, Spinner, cx } from './ui.jsx';
import { formatDate, timeAgo } from '../lib/format.js';

const MAX = 500;

// 노트 아래 댓글. 읽기는 누구나, 쓰기는 로그인한 사람.
// 삭제: 본인 · 노트 작성자 · 운영진 (DB 정책과 같은 규칙으로 버튼을 보여 준다)
export default function Comments({ note }) {
  const { user, isMember, isAdmin, signIn, loading: authLoading } = useAuth();
  const { data, loading, error, reload } = useAsync(() => listComments(note.id), [note.id]);
  const [comments, setComments] = useState([]);
  useEffect(() => { if (data) setComments(data); }, [data]);

  const isNoteOwner = user && note.user_id === user.id;
  const onAdded = (c) => setComments((cs) => [...cs, c]);
  const onUpdated = (c) => setComments((cs) => cs.map((x) => (x.id === c.id ? c : x)));
  const onDeleted = (id) => setComments((cs) => cs.filter((x) => x.id !== id));

  if (!isConfigured) return null;

  return (
    <section aria-labelledby="comments-title" className="mt-10">
      <h2 id="comments-title" className="flex items-center gap-2 text-lg font-bold">
        <MessageCircle size={19} /> 댓글 <span className="text-muted tnum">{comments.length}</span>
      </h2>

      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="mt-4">
          <Notice tone="accent" action={<Button size="sm" variant="outline" onClick={reload}>다시 시도</Button>}>{error}</Notice>
        </div>
      ) : comments.length ? (
        <ol className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-surface">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              canEdit={user && c.user_id === user.id && isMember}
              canDelete={user && (c.user_id === user.id || isNoteOwner || isAdmin)}
              isNoteAuthor={c.user_id === note.user_id}
              onUpdated={onUpdated}
              onDeleted={onDeleted}
            />
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-muted">아직 댓글이 없어요. 같은 원두를 마셔 봤다면 느낌을 나눠 주세요.</p>
      )}

      <div className="mt-4">
        {authLoading ? null : !user ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-dashed border-line-strong px-4 py-3.5 text-sm text-muted">
            로그인하면 댓글을 쓸 수 있어요.
            <Button size="sm" variant="outline" onClick={signIn}>로그인</Button>
          </div>
        ) : !isMember ? (
          <p className="text-sm text-muted">로그인 정보를 확인하고 있어요. 잠시 뒤 새로고침해 주세요.</p>
        ) : (
          <CommentForm noteId={note.id} onAdded={onAdded} />
        )}
      </div>
    </section>
  );
}

function CommentForm({ noteId, onAdded }) {
  const { displayName, avatar } = useAuth();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);
  const empty = !body.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (empty || busy) return;
    setBusy(true);
    setError('');
    try {
      onAdded(await addComment(noteId, body));
      setBody('');
      ref.current?.style.removeProperty('height');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex items-start gap-3">
      <Avatar name={displayName} src={avatar} size={34} />
      <div className="min-w-0 flex-1">
        <label htmlFor="comment-body" className="sr-only">댓글</label>
        <div className="rounded-[var(--radius-card)] border border-line bg-surface focus-within:border-ink-soft focus-within:shadow-[0_0_0_3px_rgb(48_42_37/0.08)]">
          <textarea
            id="comment-body"
            ref={ref}
            value={body}
            rows={2}
            maxLength={MAX}
            onChange={(e) => {
              setBody(e.target.value);
              // 내용에 맞춰 높이 늘리기
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 240)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
            }}
            placeholder="같이 마셔 본 느낌, 추천 레시피, 궁금한 점…"
            className="block w-full resize-none bg-transparent px-3.5 pt-3 text-base leading-relaxed outline-none placeholder:text-[#857769]"
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-2 pl-3.5">
            <span className={cx('text-xs tnum', body.length > MAX - 50 ? 'text-accent' : 'text-muted')}>
              {body.length > 0 ? `${body.length}/${MAX}` : ''}
            </span>
            <button
              type="submit"
              disabled={empty || busy}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-paper transition-colors hover:bg-ink-soft disabled:opacity-40"
            >
              <Send size={15} /> {busy ? '올리는 중…' : '댓글 달기'}
            </button>
          </div>
        </div>
        {error && <p className="mt-1.5 text-sm text-accent">{error}</p>}
      </div>
    </form>
  );
}

function CommentItem({ comment, canEdit, canDelete, isNoteAuthor, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const edited = new Date(comment.updated_at) - new Date(comment.created_at) > 60_000;

  const save = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    setError('');
    try {
      onUpdated(await updateComment(comment.id, draft));
      setEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      await deleteComment(comment.id);
      onDeleted(comment.id);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <li className="flex gap-3 px-4 py-4">
      <Avatar name={comment.author_name} src={comment.author_avatar} size={32} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <Link to={`/people/${comment.user_id}`} className="font-semibold hover:text-accent">{comment.author_name}</Link>
          {isNoteAuthor && <span className="rounded-full bg-accent-soft px-1.5 py-px text-[0.7rem] font-semibold text-accent-strong">작성자</span>}
          <time dateTime={comment.created_at} title={formatDate(comment.created_at)} className="text-xs text-muted">
            {timeAgo(comment.created_at)}{edited && ' · 수정됨'}
          </time>
        </p>

        {editing ? (
          <div className="mt-2">
            <label htmlFor={`edit-${comment.id}`} className="sr-only">댓글 수정</label>
            <textarea
              id={`edit-${comment.id}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX}
              rows={3}
              autoFocus
              className="field resize-y text-base leading-relaxed"
            />
            <div className="mt-2 flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(comment.body); }} disabled={busy}>취소</Button>
              <Button size="sm" onClick={save} disabled={busy || !draft.trim()}>저장</Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-line leading-relaxed text-ink-soft">{comment.body}</p>
        )}

        {!editing && (canEdit || canDelete) && (
          <div className="mt-1.5 flex items-center gap-1 text-xs">
            {confirming ? (
              <>
                <span className="mr-1 text-ink-soft">삭제할까요?</span>
                <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="h-11 rounded-full px-2.5 sm:h-9 font-semibold text-muted hover:bg-sunken">취소</button>
                <button type="button" onClick={remove} disabled={busy} className="h-11 rounded-full px-2.5 sm:h-9 font-semibold text-accent hover:bg-accent-soft">삭제</button>
              </>
            ) : (
              <>
                {canEdit && <button type="button" onClick={() => setEditing(true)} className="-ml-2.5 h-11 rounded-full px-2.5 sm:h-9 font-semibold text-muted hover:bg-sunken hover:text-ink">수정</button>}
                {canDelete && <button type="button" onClick={() => setConfirming(true)} className={cx('h-11 rounded-full px-2.5 font-semibold text-muted hover:bg-sunken hover:text-accent sm:h-9', !canEdit && '-ml-2.5')}>삭제</button>}
              </>
            )}
          </div>
        )}
        {error && <p className="mt-1 text-sm text-accent">{error}</p>}
      </div>
    </li>
  );
}
