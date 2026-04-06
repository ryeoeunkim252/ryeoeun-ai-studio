'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  type Task, type TeamId, type TaskPriority, type TaskStatus,
  TEAM_CONFIG, PRIORITY_CONFIG, loadTasks, saveTasks, createTask,
} from '@/lib/tasks'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

function statusInfo(s: TaskStatus) {
  return {
    pending: { text: '대기중', dot: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
    running: { text: '실행중', dot: '#f97316', bg: 'rgba(249,115,22,0.15)' },
    done:    { text: '완료',   dot: '#22c55e', bg: 'rgba(34,197,94,0.15)'  },
    error:   { text: '오류',   dot: '#ef4444', bg: 'rgba(239,68,68,0.15)'  },
  }[s]
}

function OrgChart({ tasks }: { tasks: Task[] }) {
  const cnt = (id: TeamId) => tasks.filter(t => t.team === id && t.status !== 'done').length
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
      <p style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>조직도 — RYEO EUN AI STUDIO</p>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--blush) 0%, #c06080 100%)', borderRadius: 12, padding: '12px 24px', textAlign: 'center', boxShadow: '0 4px 16px rgba(200,100,128,0.3)' }}>
          <div style={{ fontSize: 22, marginBottom: 2 }}>👑</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>려은 CEO</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>업무 지시 · 전략 결정</div>
        </div>
        <div style={{ width: 2, height: 20, background: 'var(--border)' }} />
        <div style={{ width: '90%', maxWidth: 560, height: 2, background: 'var(--border)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, width: '90%', maxWidth: 560 }}>
          {(Object.entries(TEAM_CONFIG) as [TeamId, typeof TEAM_CONFIG[TeamId]][]).map(([id, team]) => (
            <div key={id} style={{ background: 'var(--bg2, var(--card))', border: '1px solid var(--border)', borderTop: '3px solid var(--blush)', borderRadius: 10, padding: '10px 8px', textAlign: 'center', position: 'relative' }}>
              {cnt(id) > 0 && (
                <div style={{ position: 'absolute', top: -8, right: -6, background: 'var(--copper)', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cnt(id)}</div>
              )}
              <div style={{ fontSize: 18, marginBottom: 3 }}>{team.emoji}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{team.agentName}</div>
              <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>{team.name}</div>
              <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                {team.tools.map(t => (
                  <span key={t} style={{ fontSize: 8, background: 'var(--blush-l, rgba(200,100,128,0.1))', color: 'var(--blush)', borderRadius: 3, padding: '1px 4px' }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ResultModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const team = TEAM_CONFIG[task.team]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, maxWidth: 560, width: '100%', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 22 }}>{team.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{task.title}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{team.agentName} · {task.completedAt ? timeAgo(task.completedAt) + ' 완료' : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ background: 'var(--blush-l, rgba(200,100,128,0.1))', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: 'var(--blush)', marginBottom: 4 }}>👑 CEO 업무 지시</div>
          <div style={{ fontSize: 12, color: 'var(--text2, var(--text))', lineHeight: 1.6 }}>{task.description}</div>
        </div>
        <div style={{ background: 'var(--bg2, var(--card))', border: '1px solid var(--border)', borderRadius: 8, padding: 14, fontSize: 13, color: 'var(--text)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
          {task.result || task.error || '결과 없음'}
        </div>
        {task.tokenUsed && <div style={{ marginTop: 10, fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>⚡ 사용 토큰: {task.tokenUsed.toLocaleString()}</div>}
      </div>
    </div>
  )
}

function TaskCard({ task, onExecute, onDelete, onView }: { task: Task; onExecute: (id: string) => void; onDelete: (id: string) => void; onView: (t: Task) => void }) {
  const team = TEAM_CONFIG[task.team]
  const priority = PRIORITY_CONFIG[task.priority]
  const status = statusInfo(task.status)
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--blush)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', lineHeight: 1.3 }}>{task.title}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{timeAgo(task.createdAt)} · {team.emoji} {team.agentName}</div>
        </div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600, color: priority.color, background: priority.bgColor }}>{priority.label}</span>
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600, color: status.dot, background: status.bg, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: status.dot, display: 'inline-block', animation: task.status === 'running' ? 'cc-pulse 1.2s infinite' : 'none' }} />
            {status.text}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{task.description}</div>
      {task.tokenUsed && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>⚡ 토큰 {task.tokenUsed.toLocaleString()} 사용</div>}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {task.status === 'pending' && <button onClick={() => onExecute(task.id)} style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', background: 'var(--blush)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>▶ 실행</button>}
        {task.status === 'running' && <div style={{ flex: 1, padding: '7px', borderRadius: 8, textAlign: 'center', background: 'rgba(249,115,22,0.12)', color: '#f97316', fontSize: 12, fontWeight: 600 }}>⏳ AI 처리중...</div>}
        {(task.status === 'done' || task.status === 'error') && (
          <button onClick={() => onView(task)} style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', background: task.status === 'done' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: task.status === 'done' ? '#22c55e' : '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {task.status === 'done' ? '📋 결과 보기' : '⚠️ 오류 확인'}
          </button>
        )}
        <button onClick={() => onDelete(task.id)} disabled={task.status === 'running'} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: 11, cursor: task.status === 'running' ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>✕</button>
      </div>
    </div>
  )
}

export default function CommandCenter() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [modal, setModal] = useState<Task | null>(null)
  const [form, setForm] = useState({ title: '', description: '', team: 'ops' as TeamId, priority: 'normal' as TaskPriority })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [filterTeam, setFilterTeam] = useState<TeamId | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')

  useEffect(() => { setTasks(loadTasks()) }, [])
  useEffect(() => { saveTasks(tasks) }, [tasks])

  const handleSubmit = () => {
    if (!form.title.trim() || !form.description.trim()) { setFormError('업무 제목과 내용을 모두 입력해주세요.'); return }
    setFormError(''); setSubmitting(true)
    setTasks(prev => [createTask(form.title.trim(), form.description.trim(), form.team, form.priority), ...prev])
    setForm({ title: '', description: '', team: 'ops', priority: 'normal' })
    setSubmitting(false)
  }

  const handleExecute = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'running' as TaskStatus, startedAt: new Date().toISOString() } : t))
    try {
      const res = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: task.title, description: task.description, team: task.team, priority: task.priority }) })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || '실행 실패')
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done' as TaskStatus, result: data.result, tokenUsed: data.tokenUsed, completedAt: data.completedAt || new Date().toISOString() } : t))
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류'
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error' as TaskStatus, error: msg, completedAt: new Date().toISOString() } : t))
    }
  }, [tasks])

  const handleDelete = useCallback((id: string) => { setTasks(prev => prev.filter(t => t.id !== id)) }, [])

  const filtered = tasks.filter(t => (filterTeam === 'all' || t.team === filterTeam) && (filterStatus === 'all' || t.status === filterStatus))
  const stats = { total: tasks.length, pending: tasks.filter(t => t.status === 'pending').length, running: tasks.filter(t => t.status === 'running').length, done: tasks.filter(t => t.status === 'done').length, tokens: tasks.reduce((s, t) => s + (t.tokenUsed || 0), 0) }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h2 className="text-[22px] font-semibold mb-1" style={{ color: 'var(--text)' }}>👑 CEO 커맨드 센터</h2>
        <p className="text-[13px] mb-5" style={{ color: 'var(--muted)' }}>업무를 지시하면 AI 팀이 실행하고 결과를 보고해요</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 24 }}>
          {[
            { label: '전체 업무', value: stats.total, color: 'var(--text)' },
            { label: '대기중', value: stats.pending, color: '#94a3b8' },
            { label: '실행중', value: stats.running, color: '#f97316' },
            { label: '완료', value: stats.done, color: '#22c55e' },
            { label: '사용 토큰', value: stats.tokens.toLocaleString(), color: 'var(--blush)', small: true },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: s.small ? 13 : 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <OrgChart tasks={tasks} />

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>👑 새 업무 지시서</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="업무 제목 (예: 홈페이지 Hero 섹션 카피라이팅 초안 3가지)" style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg2, var(--card))', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="업무 내용을 구체적으로 작성하세요. AI 에이전트가 이 내용을 바탕으로 실제 작업을 수행해요." rows={4} style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg2, var(--card))', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>담당 팀</label>
                <select value={form.team} onChange={e => setForm(p => ({ ...p, team: e.target.value as TeamId }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg2, var(--card))', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                  {(Object.entries(TEAM_CONFIG) as [TeamId, typeof TEAM_CONFIG[TeamId]][]).map(([id, t]) => (
                    <option key={id} value={id}>{t.emoji} {t.name} ({t.agentName})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>우선순위</label>
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as TaskPriority }))} style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg2, var(--card))', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                  <option value="urgent">🔴 긴급</option>
                  <option value="high">🟠 높음</option>
                  <option value="normal">🟡 보통</option>
                  <option value="low">🟢 낮음</option>
                </select>
              </div>
            </div>
            {formError && <div style={{ fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,0.08)', borderRadius: 6, padding: '8px 12px' }}>{formError}</div>}
            <button onClick={handleSubmit} disabled={submitting} style={{ padding: '11px', borderRadius: 9, border: 'none', background: submitting ? 'var(--border)' : 'var(--blush)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {submitting ? '⏳ 등록 중...' : '📋 업무 지시서 등록'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {(['all', 'design', 'edu', 'ops', 'marketing'] as (TeamId | 'all')[]).map(id => (
            <button key={id} onClick={() => setFilterTeam(id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 11, background: filterTeam === id ? 'var(--blush)' : 'var(--card)', color: filterTeam === id ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
              {id === 'all' ? '전체 팀' : `${TEAM_CONFIG[id as TeamId].emoji} ${TEAM_CONFIG[id as TeamId].agentName}`}
            </button>
          ))}
          <div style={{ width: 1, background: 'var(--border)', margin: '0 2px' }} />
          {(['all', 'pending', 'running', 'done', 'error'] as (TaskStatus | 'all')[]).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 11, background: filterStatus === s ? 'var(--bg2,var(--card))' : 'transparent', color: filterStatus === s ? 'var(--text)' : 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
              {s === 'all' ? '전체' : s === 'pending' ? '대기' : s === 'running' ? '실행중' : s === 'done' ? '완료' : '오류'}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)', fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            {tasks.length === 0 ? '첫 번째 업무 지시서를 작성해보세요! 👑' : '조건에 맞는 업무가 없어요.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(task => <TaskCard key={task.id} task={task} onExecute={handleExecute} onDelete={handleDelete} onView={setModal} />)}
          </div>
        )}
      </div>
      {modal && <ResultModal task={modal} onClose={() => setModal(null)} />}
      <style>{`@keyframes cc-pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }`}</style>
    </div>
  )
}