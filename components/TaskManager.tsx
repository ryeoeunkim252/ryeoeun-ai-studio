'use client'
import { useEffect, useState } from 'react'
import { loadData, saveData } from '@/lib/store'

// ── 타입 정의 ────────────────────────────────────────────────
type Priority = 'high' | 'medium' | 'low'
type Category = '스튜디오' | '개인' | '업무' | '기타'
type Filter = 'all' | 'todo' | 'done'

interface Task {
  id: string
  text: string
  done: boolean
  priority: Priority
  category: Category
  dueDate: string        // 'YYYY-MM-DD' 또는 ''
  createdAt: string
}

// ── 상수 ────────────────────────────────────────────────────
const PRIORITY_INFO: Record<Priority, { label: string; color: string; bg: string; star: string }> = {
  high:   { label: '중요',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   star: '⭐⭐⭐' },
  medium: { label: '보통',  color: '#f97316', bg: 'rgba(249,115,22,0.1)',  star: '⭐⭐' },
  low:    { label: '낮음',  color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', star: '⭐' },
}

const CATEGORY_INFO: Record<Category, { emoji: string; color: string }> = {
  스튜디오: { emoji: '🎨', color: 'var(--blush)' },
  개인:     { emoji: '🙋', color: 'var(--olive)' },
  업무:     { emoji: '💼', color: 'var(--copper)' },
  기타:     { emoji: '📌', color: '#94a3b8' },
}

// ── 헬퍼 ────────────────────────────────────────────────────
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function dueDateLabel(dateStr: string): { text: string; color: string } | null {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr).getTime() - new Date(today()).getTime()) / 86400000)
  if (diff < 0)  return { text: `${Math.abs(diff)}일 지남`,  color: '#ef4444' }
  if (diff === 0) return { text: '오늘 마감!',               color: '#f97316' }
  if (diff === 1) return { text: '내일 마감',                color: '#eab308' }
  return { text: `D-${diff}`,                                color: '#94a3b8' }
}

// ── 메인 컴포넌트 ────────────────────────────────────────────
export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [catFilter, setCatFilter] = useState<Category | 'all'>('all')
  const [showForm, setShowForm] = useState(false)

  // 폼 상태
  const [text, setText] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [category, setCategory] = useState<Category>('스튜디오')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    // 기존 데이터 마이그레이션: 옛날 Task 형식이면 새 형식으로 변환
    const raw = loadData<Task[]>('nk_tasks', [])
    const migrated = raw.map((t: Task) => ({
      ...t,
      priority: t.priority ?? 'medium',
      category: t.category ?? '스튜디오',
      dueDate: t.dueDate ?? '',
    }))
    setTasks(migrated)
  }, [])

  const save = (updated: Task[]) => { setTasks(updated); saveData('nk_tasks', updated) }

  const addTask = () => {
    if (!text.trim()) return
    save([{
      id: crypto.randomUUID(),
      text: text.trim(),
      done: false,
      priority,
      category,
      dueDate,
      createdAt: new Date().toISOString(),
    }, ...tasks])
    setText(''); setPriority('medium'); setCategory('스튜디오'); setDueDate('')
    setShowForm(false)
  }

  const toggle = (id: string) => save(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const del    = (id: string) => save(tasks.filter(t => t.id !== id))

  // 필터링
  const filtered = tasks.filter(t => {
    const byStatus = filter === 'all' ? true : filter === 'done' ? t.done : !t.done
    const byCat    = catFilter === 'all' ? true : t.category === catFilter
    return byStatus && byCat
  })

  // 통계
  const total    = tasks.length
  const done     = tasks.filter(t => t.done).length
  const overdue  = tasks.filter(t => !t.done && t.dueDate && t.dueDate < today()).length
  const pct      = total ? Math.round((done / total) * 100) : 0

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 className="text-[22px] font-semibold" style={{ color: 'var(--text)' }}>📋 작업 관리</h2>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--muted)' }}>
              전체 {total}개 · 완료 {done}개 · 남은 {total - done}개
              {overdue > 0 && <span style={{ color: '#ef4444', marginLeft: 8 }}>· ⚠️ 기한 초과 {overdue}개</span>}
            </p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            style={{
              padding: '8px 16px', borderRadius: 10, border: 'none',
              background: showForm ? 'var(--border)' : 'var(--blush)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {showForm ? '✕ 닫기' : '＋ 새 작업'}
          </button>
        </div>

        {/* 진행률 바 */}
        {total > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>전체 진행률</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: pct === 100 ? '#22c55e' : 'var(--blush)' }}>{pct}%</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg2)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                background: pct === 100
                  ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                  : 'linear-gradient(90deg, var(--blush), var(--copper))',
                width: `${pct}%`, transition: 'width 0.5s ease',
              }} />
            </div>
            {/* 카테고리별 미니 현황 */}
            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
              {(Object.keys(CATEGORY_INFO) as Category[]).map(cat => {
                const catTasks = tasks.filter(t => t.category === cat)
                if (catTasks.length === 0) return null
                const catDone = catTasks.filter(t => t.done).length
                return (
                  <div key={cat} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 20,
                    background: 'var(--card)', border: '1px solid var(--border)',
                    fontSize: 11, color: 'var(--text2)',
                  }}>
                    <span>{CATEGORY_INFO[cat].emoji}</span>
                    <span style={{ color: CATEGORY_INFO[cat].color, fontWeight: 600 }}>{cat}</span>
                    <span style={{ color: 'var(--muted)' }}>{catDone}/{catTasks.length}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 새 작업 폼 */}
        {showForm && (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 18, marginBottom: 20,
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>새 작업 추가</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* 작업 내용 */}
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="작업 내용을 입력하세요..."
                style={{
                  padding: '10px 14px', borderRadius: 8,
                  border: '1.5px solid var(--border)', background: 'var(--bg2, var(--card))',
                  color: 'var(--text)', fontSize: 13, outline: 'none',
                  fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {/* 카테고리 */}
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>카테고리</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as Category)}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      border: '1.5px solid var(--border)', background: 'var(--bg2, var(--card))',
                      color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
                    }}
                  >
                    {(Object.keys(CATEGORY_INFO) as Category[]).map(c => (
                      <option key={c} value={c}>{CATEGORY_INFO[c].emoji} {c}</option>
                    ))}
                  </select>
                </div>

                {/* 중요도 */}
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>중요도</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as Priority)}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      border: '1.5px solid var(--border)', background: 'var(--bg2, var(--card))',
                      color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
                    }}
                  >
                    <option value="high">⭐⭐⭐ 중요</option>
                    <option value="medium">⭐⭐ 보통</option>
                    <option value="low">⭐ 낮음</option>
                  </select>
                </div>

                {/* 마감일 */}
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>마감일 (선택)</label>
                  <input
                    type="date"
                    value={dueDate}
                    min={today()}
                    onChange={e => setDueDate(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      border: '1.5px solid var(--border)', background: 'var(--bg2, var(--card))',
                      color: dueDate ? 'var(--text)' : 'var(--muted)', fontSize: 13,
                      fontFamily: 'inherit', outline: 'none', cursor: 'pointer', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <button
                onClick={addTask}
                disabled={!text.trim()}
                style={{
                  padding: '10px', borderRadius: 9, border: 'none',
                  background: text.trim() ? 'var(--blush)' : 'var(--border)',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: text.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                }}
              >
                ＋ 작업 추가
              </button>
            </div>
          </div>
        )}

        {/* 필터 바 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {/* 상태 필터 */}
          {(['all', 'todo', 'done'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '5px 12px', borderRadius: 20, border: 'none', fontSize: 11,
              background: filter === f ? 'var(--blush)' : 'var(--card)',
              color: filter === f ? '#fff' : 'var(--muted)',
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: filter === f ? 600 : 400,
            }}>
              {f === 'all' ? '📋 전체' : f === 'todo' ? '⏳ 진행중' : '✅ 완료'}
            </button>
          ))}
          <div style={{ width: 1, background: 'var(--border)', margin: '0 2px' }} />
          {/* 카테고리 필터 */}
          {(['all', ...Object.keys(CATEGORY_INFO)] as (Category | 'all')[]).map(c => (
            <button key={c} onClick={() => setCatFilter(c)} style={{
              padding: '5px 12px', borderRadius: 20, border: '1px solid var(--border)', fontSize: 11,
              background: catFilter === c ? 'var(--bg2, var(--card))' : 'transparent',
              color: catFilter === c ? 'var(--text)' : 'var(--muted)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {c === 'all' ? '전체 카테고리' : `${CATEGORY_INFO[c as Category].emoji} ${c}`}
            </button>
          ))}
        </div>

        {/* 작업 목록 */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <img src="/rabbit.png" alt="🐰" width={48} height={48} style={{ marginBottom: 12 }} />
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>
              {tasks.length === 0 ? '+ 새 작업 버튼을 눌러 첫 작업을 추가해보세요!' : '조건에 맞는 작업이 없어요.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered
              // 미완료 먼저, 그 안에서 중요도 순, 마감일 순
              .sort((a, b) => {
                if (a.done !== b.done) return a.done ? 1 : -1
                const pOrder = { high: 0, medium: 1, low: 2 }
                if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority]
                if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
                if (a.dueDate) return -1
                if (b.dueDate) return 1
                return 0
              })
              .map(task => {
                const p = PRIORITY_INFO[task.priority]
                const cat = CATEGORY_INFO[task.category]
                const due = dueDateLabel(task.dueDate)
                return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '14px 16px', borderRadius: 12,
                      background: task.done ? 'var(--bg2, var(--card))' : 'var(--card)',
                      border: `1.5px solid ${task.done ? 'var(--border)' : 'var(--border)'}`,
                      borderLeft: `4px solid ${task.done ? 'var(--border)' : cat.color}`,
                      opacity: task.done ? 0.65 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    {/* 체크버튼 */}
                    <button
                      onClick={() => toggle(task.id)}
                      style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${task.done ? 'var(--blush)' : 'var(--border)'}`,
                        background: task.done ? 'var(--blush)' : 'transparent',
                        color: '#fff', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: 11, marginTop: 1,
                      }}
                    >
                      {task.done && '✓'}
                    </button>

                    {/* 내용 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                        {/* 카테고리 배지 */}
                        <span style={{
                          fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600,
                          color: cat.color, background: `${cat.color}20`,
                        }}>{cat.emoji} {task.category}</span>
                        {/* 중요도 배지 */}
                        <span style={{
                          fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600,
                          color: p.color, background: p.bg,
                        }}>{p.star}</span>
                        {/* 마감일 배지 */}
                        {due && (
                          <span style={{
                            fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600,
                            color: due.color, background: `${due.color}18`,
                          }}>📅 {due.text}</span>
                        )}
                      </div>
                      <p style={{
                        fontSize: 14, color: 'var(--text)', margin: 0,
                        textDecoration: task.done ? 'line-through' : 'none',
                        wordBreak: 'break-word', lineHeight: 1.4,
                      }}>{task.text}</p>
                      <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                        {new Date(task.createdAt).toLocaleDateString('ko-KR')} 등록
                        {task.dueDate && ` · 마감 ${task.dueDate}`}
                      </p>
                    </div>

                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => del(task.id)}
                      style={{
                        background: 'none', border: 'none', color: 'var(--muted)',
                        cursor: 'pointer', fontSize: 14, padding: '2px 4px',
                        opacity: 0.4, flexShrink: 0,
                      }}
                    >🗑️</button>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
