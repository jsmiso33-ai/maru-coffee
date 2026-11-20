import { useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { listMembers, removeMember, upsertMember, useAsync } from '../lib/db.js';
import { useAuth } from '../lib/auth.jsx';
import { Button, Card, Notice, PageHeader, Spinner, cx } from '../components/ui.jsx';
import MemberGate from '../components/MemberGate.jsx';
import { formatDate } from '../lib/format.js';

export default function Members() {
  return (
    <MemberGate admin what="운영진 관리는">
      <MembersInner />
    </MemberGate>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function MembersInner() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(listMembers, []);
  const [bulk, setBulk] = useState('');
  const role = 'admin';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  // "이름, 이메일" 또는 "이메일" 을 줄마다 — 단톡방 명단을 그대로 붙여 넣을 수 있게
  const parsed = bulk
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const email = line.match(/[^\s,;<>]+@[^\s,;<>]+/)?.[0]?.toLowerCase() ?? '';
      const name = line.replace(email, '').replace(/[<>,;\t]/g, ' ').trim();
      return { email, name, valid: EMAIL_RE.test(email) };
    });
  const valid = parsed.filter((p) => p.valid);

  const add = async () => {
    setBusy(true);
    setMessage(null);
    let ok = 0;
    const failed = [];
    for (const p of valid) {
      try {
        await upsertMember({ email: p.email, name: p.name, role });
        ok++;
      } catch {
        failed.push(p.email);
      }
    }
    setBusy(false);
    setBulk('');
    setMessage(failed.length ? { tone: 'accent', text: `${ok}명 추가, 실패: ${failed.join(', ')}` } : { tone: 'neutral', text: `${ok}명을 운영진으로 추가했어요.` });
    reload();
  };

  const changeRole = async (m, next) => {
    try {
      await upsertMember({ ...m, role: next });
      reload();
    } catch (e) {
      setMessage({ tone: 'accent', text: e.message });
    }
  };

  const remove = async (email) => {
    try {
      await removeMember(email);
      setPendingDelete(null);
      reload();
    } catch (e) {
      setMessage({ tone: 'accent', text: e.message });
    }
  };

  return (
    <>
      <PageHeader eyebrow="Admin" title="운영진 관리">
        노트·레시피·댓글은 로그인한 누구나 쓸 수 있어요. 여기 있는 운영진은 활동을 만들고, 모든 글과 댓글을 지우고, 운영진을 관리할 수 있어요.
      </PageHeader>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-bold"><UserPlus size={18} /> 운영진 추가</h2>
          <label htmlFor="bulk" className="mt-4 block text-sm text-muted">한 줄에 한 명씩 — <span className="font-mono text-xs">이름, 이메일</span> 또는 이메일만</label>
          <textarea
            id="bulk"
            rows={6}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            className="field mt-2 font-mono text-sm leading-relaxed"
            placeholder={'김마루, maru.kim@gmail.com\nlee.coffee@korea.ac.kr'}
          />
          {parsed.length > 0 && (
            <p className="mt-2 text-sm text-muted tnum">
              {valid.length}명 인식{parsed.length > valid.length && <span className="text-accent"> · 이메일을 못 찾은 줄 {parsed.length - valid.length}개</span>}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            <Button onClick={add} disabled={!valid.length || busy}>{busy ? '추가 중…' : `${valid.length || ''}명 추가`}</Button>
          </div>
          {message && <div className="mt-4"><Notice tone={message.tone}>{message.text}</Notice></div>}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-bold">운영진</h2>
            {data && <span className="text-sm text-muted tnum">{data.length}명</span>}
          </div>
          {loading ? <Spinner /> : error ? <div className="p-5"><Notice tone="accent">{error}</Notice></div> : (
            <ul className="divide-y divide-line">
              {data.map((m) => {
                const me = m.email === user.email?.toLowerCase();
                return (
                  <li key={m.email} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{m.name || '이름 없음'}{me && <span className="ml-1.5 text-xs font-normal text-muted">(나)</span>}</p>
                      <p className="truncate text-sm text-muted">{m.email} · {formatDate(m.created_at)}</p>
                    </div>
                    <button
                      type="button"
                      disabled={me}
                      onClick={() => changeRole(m, m.role === 'admin' ? 'member' : 'admin')}
                      title={me ? '자기 권한은 바꿀 수 없어요' : '눌러서 권한 전환'}
                      className={cx('h-10 rounded-full px-3.5 text-xs font-semibold disabled:cursor-not-allowed', m.role === 'admin' ? 'bg-accent-soft text-accent-strong' : 'bg-sunken text-ink-soft hover:bg-line')}
                    >
                      {m.role === 'admin' ? '운영진' : '권한 없음'}
                    </button>
                    {pendingDelete === m.email ? (
                      <span className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setPendingDelete(null)}>취소</Button>
                        <Button size="sm" variant="accent" onClick={() => remove(m.email)}>빼기</Button>
                      </span>
                    ) : (
                      <button type="button" disabled={me} onClick={() => setPendingDelete(m.email)} aria-label={`${m.email} 명단에서 빼기`} className="grid size-11 place-items-center rounded-full text-muted hover:bg-sunken hover:text-accent disabled:invisible">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
