import { type ReactNode, useEffect, useState } from 'react';
import type { AdminReportSummary, AdminVisibleReportContext, ReportStatus } from '@kapool/shared';
import { ChevronLeft, MessageCircle, Send, ShieldCheck } from 'lucide-react';
import { theme } from '../lib/theme';
import { Avatar } from '../components/Avatar';
import { createAdminReportMessage, fetchAdminReportDetail, fetchAdminReports, updateAdminReportStatus } from '../lib/api';

interface AdminScreenProps {
  accessToken: string;
  userName: string;
  userId?: string;
  userPhotoDataUrl?: string;
  onBack?: () => void;
}

export function AdminScreen({ accessToken, userName, userId, userPhotoDataUrl, onBack }: AdminScreenProps) {
  const [reports, setReports] = useState<AdminReportSummary[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminVisibleReportContext | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [status, setStatus] = useState<ReportStatus>('in_review');
  const [adminNote, setAdminNote] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');
  const [messageText, setMessageText] = useState('');
  const [messageState, setMessageState] = useState<'idle' | 'sending'>('idle');
  const [updateState, setUpdateState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const filteredReports = statusFilter === 'all'
    ? reports
    : reports.filter((report) => report.status === statusFilter);

  useEffect(() => {
    let cancelled = false;

    fetchAdminReports(accessToken)
      .then((nextReports) => {
        if (cancelled) return;
        setReports(nextReports);
        setSelectedReportId(nextReports[0]?.id ?? null);
        setLoadState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedReportId) {
      Promise.resolve().then(() => {
        if (!cancelled) setDetail(null);
      });
      return () => {
        cancelled = true;
      };
    }

    fetchAdminReportDetail(accessToken, selectedReportId)
      .then((nextDetail) => {
        if (cancelled) return;
        setDetail(nextDetail);
        setStatus(nextDetail.report.status);
        setAdminNote(nextDetail.report.adminNote ?? '');
      })
      .catch(() => {
        if (cancelled) return;
        setDetail(null);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, selectedReportId]);

  const submitUpdate = () => {
    if (!detail) return;
    setUpdateState('saving');
    updateAdminReportStatus(accessToken, detail.report.id, status, adminNote)
      .then((nextDetail) => {
        setDetail(nextDetail);
        setReports((currentReports) => currentReports.map((report) => (
          report.id === nextDetail.report.id ? { ...report, status: nextDetail.report.status, adminNote: nextDetail.report.adminNote } : report
        )));
        setUpdateState('saved');
        window.setTimeout(() => setUpdateState('idle'), 900);
      })
      .catch(() => setUpdateState('idle'));
  };

  const submitOperationMessage = () => {
    const text = messageText.trim();

    if (!detail || !text) return;

    setMessageState('sending');
    createAdminReportMessage(accessToken, detail.report.id, { text })
      .then((nextDetail) => {
        setDetail(nextDetail);
        setMessageText('');
      })
      .catch(() => undefined)
      .finally(() => setMessageState('idle'));
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4" style={{ color: theme.txt0 }}>
      {!onBack && (
        <div className="pb-3.5">
          <div className="relative overflow-hidden rounded-3xl border p-4" style={{ background: theme.routeWash, border: `1px solid ${theme.borderMint}`, boxShadow: theme.shadowCard }}>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${theme.mint},transparent)` }} />
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-xs font-bold uppercase" style={{ color: theme.mint, letterSpacing: '0.08em' }}>
                My Kapool
              </div>
              <div className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: theme.blueDim, color: theme.blue, border: `1px solid ${theme.borderBlue}` }}>
                운영자
              </div>
            </div>
            <div className="mb-2 flex min-w-0 items-center gap-3">
              <div className="rounded-full p-0.75" style={{ background: theme.mintDim, border: `1px solid ${theme.borderMint}` }}>
                <Avatar name={userName} idx={avatarIndex(userId ?? userName)} size={42} photoDataUrl={userPhotoDataUrl} />
              </div>
              <div className="min-w-0 text-2xl font-black leading-tight" style={{ letterSpacing: '-0.04em', color: theme.txt0 }}>
                <span className="break-words">{userName}님</span>
                <span className="whitespace-nowrap"> 안녕하세요!</span>
              </div>
            </div>
            <div className="text-xs" style={{ color: theme.txt1, lineHeight: 1.55 }}>
              접수된 신고와 운영 대화를 현재 계정 기준으로 빠르게 확인합니다.
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2.5 mb-4">
        {onBack && (
          <button onClick={onBack} className="w-11 h-11 rounded-full flex items-center justify-center border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ background: theme.card, border: `1px solid ${theme.border}`, outlineColor: theme.mint }}>
            <ChevronLeft size={18} color={theme.txt0} />
          </button>
        )}
        <div>
          <div className="text-lg font-black">신고 운영 확인</div>
          <div className="text-xs" style={{ color: theme.txt2 }}>{userName} 관리자 계정 · 신고 맥락만 표시</div>
        </div>
      </div>

      {loadState === 'error' && <AdminNotice tone="warm" text="신고 목록을 불러오지 못했습니다. 관리자 권한과 연결 상태를 확인해 주세요." />}
      {loadState === 'loading' && <AdminNotice tone="blue" text="신고 목록을 불러오는 중입니다." />}

      <div className="mb-3 grid grid-cols-5 gap-1.5">
        {(['all', 'open', 'in_review', 'resolved', 'dismissed'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            className="min-h-10 rounded-2xl px-2 text-xs font-black transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: statusFilter === filter ? theme.mintDim : theme.card,
              color: statusFilter === filter ? theme.mint : theme.txt2,
              border: `1px solid ${statusFilter === filter ? theme.borderMint : theme.border}`,
              outlineColor: theme.mint,
            }}
          >
            {filter === 'all' ? '전체' : reportStatusLabel(filter)}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 mb-4 pr-1">
        {filteredReports.map((report) => (
          <button key={report.id} onClick={() => setSelectedReportId(report.id)} className="min-h-20 text-left rounded-3xl p-4 border transition-all active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ background: selectedReportId === report.id ? theme.blueDim : theme.cardStrong, border: `1px solid ${selectedReportId === report.id ? theme.borderBlue : theme.border}`, boxShadow: selectedReportId === report.id ? theme.shadowCard : 'none', outlineColor: theme.mint }}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="min-w-0 text-base font-black break-words" style={{ color: theme.txt0, letterSpacing: '-0.02em' }}>{reportTypeLabel(report.type)}</span>
              <StatusBadge status={report.status} />
            </div>
            <div className="text-xs mb-2 break-words" style={{ color: theme.txt2, lineHeight: 1.55 }}>
              {report.ride ? `${report.ride.from} → ${report.ride.to}` : '계정/인증 맥락'} · {report.reporter?.nickname ?? '신고자'} 접수
            </div>
            {report.adminNote && <div className="rounded-2xl px-3 py-2 text-xs" style={{ color: theme.txt1, background: theme.card, border: `1px solid ${theme.border}` }}>{report.adminNote}</div>}
          </button>
        ))}
        {loadState === 'ready' && filteredReports.length === 0 && (
          <AdminNotice tone="blue" text="현재 필터에 해당하는 신고가 없습니다." />
        )}
      </div>

      {detail && (
        <div className="rounded-3xl p-4 border mb-4" style={{ background: theme.cardStrong, border: `1px solid ${theme.border}`, boxShadow: theme.shadowCard }}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-2xl flex items-center justify-center" style={{ background: theme.mintDim, border: `1px solid ${theme.borderMint}` }}>
                <ShieldCheck size={16} color={theme.mint} />
              </div>
              <div>
                <div className="text-base font-black" style={{ letterSpacing: '-0.02em' }}>신고 상세</div>
                <div className="text-xs mt-0.5" style={{ color: theme.txt2 }}>필요 맥락만 묶어서 확인</div>
              </div>
            </div>
            <StatusBadge status={detail.report.status} />
          </div>

          <DetailGroup title="신고 내용">
            <div className="text-sm" style={{ color: theme.txt0, lineHeight: 1.65 }}>{detail.report.description}</div>
          </DetailGroup>

          <DetailGroup title="연결된 사람">
            <DetailLine label="신고자" value={`${detail.reporter?.nickname ?? '-'} · ${detail.reporter?.phone ?? '연락처 없음'}`} />
            {detail.subjectUser && <DetailLine label="대상" value={`${detail.subjectUser.nickname} · ${detail.subjectUser.phone ?? '연락처 없음'}`} />}
          </DetailGroup>

          <DetailGroup title="운영 대화">
            <div className="rounded-3xl border p-3" style={{ background: theme.bg2, border: `1px solid ${theme.border}` }}>
              {(detail.operationMessages ?? []).length === 0 && (
                <div className="rounded-2xl px-3 py-2 text-xs" style={{ color: theme.txt2, background: theme.card, border: `1px solid ${theme.border}` }}>
                  아직 운영 대화가 없습니다. 신고자에게 확인할 내용을 남겨 주세요.
                </div>
              )}
              {(detail.operationMessages ?? []).map((message) => (
                <div key={message.id} className="mb-2 rounded-2xl px-3 py-2" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-black" style={{ color: theme.mint }}>
                    <MessageCircle size={12} color={theme.mint} />
                    {message.senderName}
                  </div>
                  <div className="text-xs" style={{ color: theme.txt1, lineHeight: 1.6 }}>{message.text}</div>
                </div>
              ))}
              <div className="mt-2 flex gap-2">
                <input
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && submitOperationMessage()}
                  disabled={messageState === 'sending'}
                  placeholder="신고자에게 남길 운영 메시지"
                  className="h-11 min-w-0 flex-1 rounded-2xl px-3 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ background: theme.field, color: theme.txt0, border: `1px solid ${theme.border}`, outlineColor: theme.mint }}
                />
                <button
                  type="button"
                  onClick={submitOperationMessage}
                  disabled={messageState === 'sending' || !messageText.trim()}
                  className="h-11 w-11 rounded-2xl flex items-center justify-center transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    background: messageState === 'sending' || !messageText.trim() ? theme.disabledSurface : theme.mintDim,
                    color: messageState === 'sending' || !messageText.trim() ? theme.txtDisabled : theme.mint,
                    border: `1px solid ${messageState === 'sending' || !messageText.trim() ? theme.borderBri : theme.borderMint}`,
                    outlineColor: theme.mint,
                  }}
                  aria-label="운영 메시지 보내기"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </DetailGroup>

          {(detail.ride || detail.reservation || detail.paymentRecord) && (
            <DetailGroup title="운행 확인 맥락">
              {detail.ride && <DetailLine label="운행" value={`${detail.ride.from} → ${detail.ride.to} · ${detail.ride.fare.toLocaleString()}원`} />}
              {detail.reservation && <DetailLine label="예약" value={`${detail.reservation.status} · ${detail.reservation.seatsRequested}석`} />}
              {detail.paymentRecord && <DetailLine label="정산 기록" value={`${detail.paymentRecord.amount.toLocaleString()}원 · 신고와 연결된 내역`} />}
            </DetailGroup>
          )}

          {detail.chatMessages && (
            <div className="mb-3 rounded-3xl p-3.5 border" style={{ background: theme.bg2, border: `1px solid ${theme.border}` }}>
              <div className="text-xs font-black mb-2.5" style={{ color: theme.txt1 }}>신고 연결 채팅 발췌</div>
              {detail.chatMessages.map((message) => (
                <div key={message.id} className="mb-2 rounded-2xl px-3 py-2" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
                  <div className="text-xs font-bold mb-1" style={{ color: message.type === 'other' ? theme.mint : message.type === 'me' ? theme.blue : theme.txt2 }}>
                    {message.type === 'other' ? message.name : message.type === 'me' ? '신고자' : '시스템'}
                  </div>
                  <div className="text-xs" style={{ color: theme.txt1, lineHeight: 1.6 }}>{message.text}</div>
                </div>
              ))}
            </div>
          )}
          <div className="kapool-grid-actions gap-2 mt-4">
            <select value={status} onChange={(event) => setStatus(event.target.value as ReportStatus)} className="h-11 rounded-xl px-3 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ background: theme.bg2, color: theme.txt0, border: `1px solid ${theme.border}`, outlineColor: theme.mint }}>
              <option value="open">접수</option>
              <option value="in_review">검토 중</option>
              <option value="resolved">해결</option>
              <option value="dismissed">기각</option>
            </select>
            <button
              onClick={submitUpdate}
              disabled={updateState === 'saving'}
              className="h-11 rounded-xl text-xs font-bold transition-all active:scale-[0.96] disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                background: updateState === 'saved' ? theme.mint : updateState === 'saving' ? theme.disabledSurface : theme.mintDim,
                color: updateState === 'saved' ? '#FFFFFF' : updateState === 'saving' ? theme.txtDisabled : theme.mint,
                border: `1px solid ${updateState === 'saving' ? theme.borderBri : theme.borderMint}`,
                boxShadow: updateState === 'saved' ? theme.shadowMint : 'none',
                transform: updateState === 'saved' ? 'translateY(-1px)' : 'translateY(0)',
                outlineColor: theme.mint,
              }}
            >
              {updateState === 'saving' ? '처리 중' : updateState === 'saved' ? '처리 완료' : '상태 저장'}
            </button>
          </div>
          <textarea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} rows={3} placeholder="처리 메모" className="w-full mt-2 rounded-xl p-3 text-xs resize-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ background: theme.bg2, color: theme.txt0, border: `1px solid ${theme.border}`, outlineColor: theme.mint }} />
        </div>
      )}
    </div>
  );
}

function AdminNotice({ tone, text }: { tone: 'blue' | 'warm'; text: string }) {
  const color = tone === 'blue' ? theme.blue : theme.warm;
  return <div className="rounded-2xl p-3 text-xs mb-4 border" style={{ color, background: tone === 'blue' ? theme.blueDim : theme.warmDim, border: `1px solid ${tone === 'blue' ? theme.borderBlue : theme.borderWarm}` }}>{text}</div>;
}

function DetailGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-3 rounded-3xl p-3.5 border" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
      <div className="text-xs font-black mb-2" style={{ color: theme.txt2 }}>{title}</div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs" style={{ color: theme.txt2, lineHeight: 1.55 }}>
      <span className="min-w-12 rounded-full px-2 py-1 text-center font-bold" style={{ color: theme.txt1, background: theme.field, border: `1px solid ${theme.border}` }}>{label}</span>
      <span className="min-w-0 break-words pt-1" style={{ color: theme.txt1 }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const styles = reportStatusStyle(status);

  return (
    <span className="inline-flex w-auto min-w-fit flex-shrink-0 items-center whitespace-nowrap rounded-full px-3 py-2 text-xs font-black leading-none" style={{ color: styles.color, background: styles.background, border: `1px solid ${styles.border}` }}>
      {reportStatusLabel(status)}
    </span>
  );
}

function reportTypeLabel(type: string) {
  const labels: Record<string, string> = {
    settlement_missing: '운행/정산 확인',
    inappropriate_chat: '안전/이용 문제',
    safety_issue: '안전/이용 문제',
    account_auth: '안전/이용 문제',
  };
  return labels[type] ?? type;
}

function reportStatusLabel(status: ReportStatus) {
  const labels: Record<ReportStatus, string> = {
    open: '접수',
    in_review: '검토 중',
    resolved: '해결',
    dismissed: '기각',
  };
  return labels[status];
}

function reportStatusStyle(status: ReportStatus) {
  if (status === 'resolved') return { color: theme.mint, background: theme.mintDim, border: theme.borderMint };
  if (status === 'dismissed') return { color: theme.txt2, background: theme.disabledSurface, border: theme.border };
  if (status === 'in_review') return { color: theme.blue, background: theme.blueDim, border: theme.borderBlue };
  return { color: theme.warm, background: theme.warmDim, border: theme.borderWarm };
}

function avatarIndex(value: string) {
  return Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0) % 4;
}
