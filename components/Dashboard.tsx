'use client'
import { useEffect, useState } from 'react'
import { loadData, type Task, type ChatLog, DEFAULT_SETTINGS, type AppSettings } from '@/lib/store'

const AGENT_ICONS: Record<string, string> = {
  router: '🔀', web: '🌐', content: '✍️', edu: '📚', research: '🔬', ops: '🚀'
}
const AGENT_ACCENT: Record<string, string> = {
  router: 'var(--blush)', web: 'var(--olive)', content: 'var(--copper)',
  edu: 'var(--blush)', research: 'var(--olive)', ops: 'var(--copper)'
}
const AGENT_ROLES: Record<string, string> = {
  router: '총괄 조정', web: '웹 개발/디자인', content: '콘텐츠 제작',
  edu: '교육 프로그램', research: '시장 조사/분석', ops: '인프라/운영'
}

type CustomTeam = { id: string; icon: string; name: string; role: string; desc: string }

const CUSTOM_ACCENTS = ['var(--blush)', 'var(--olive)', 'var(--copper)']

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [logs, setLogs] = useState<ChatLog[]>([])
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [now, setNow] = useState(new Date())
  const [customTeams, setCustomTeams] = useState<CustomTeam[]>([])

  useEffect(() => {
    setTasks(loadData<Task[]>('nk_tasks', []))
    setLogs(loadData<ChatLog[]>('nk_chatlogs', []))
    setSettings(loadData<AppSettings>('nk_settings', DEFAULT_SETTINGS))
    setCustomTeams(loadData<CustomTeam[]>('nk_custom_teams', []))
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const done = tasks.filter(t => t.done).length
  const today = logs.filter(l => new Date(l.createdAt).toDateString() === now.toDateString())
  const teamCounts: Record<string, number> = {}
  logs.forEach(l => { teamCounts[l.agentId] = (teamCounts[l.agentId] || 0) + 1 })

  // ✅ 기본 6팀 + 커스텀 팀 합치기
  const defaultAgentIds = ['router', 'web', 'content', 'edu', 'research', 'ops']
  const allAgentIds = [...defaultAgentIds, ...customTeams.map(t => t.id)]

  // ✅ 커스텀 팀 아이콘/역할/색상 동적 추가
  const getIcon = (id: string) => AGENT_ICONS[id] || customTeams.find(t => t.id === id)?.icon || '🤖'
  const getAccent = (id: string) => AGENT_ACCENT[id] || CUSTOM_ACCENTS[customTeams.findIndex(t => t.id === id) % 3]
  const getRole = (id: string) => AGENT_ROLES[id] || customTeams.find(t => t.id === id)?.role || ''
  const getName = (id: string) => settings.agentNames?.[id] || customTeams.find(t => t.id === id)?.name || id

  const statCards = [
    { icon: '📋', label: '전체 작업', value: tasks.length, sub: `완료 ${done}개`, color: 'var(--blush)', bg: 'var(--blush-l)', border: 'var(--blush-b)' },
    { icon: '✅', label: '완료율', value: tasks.length ? Math.round(done / tasks.length * 100) + '%' : '0%', sub: `${tasks.length - done}개 남음`, color: 'var(--olive)', bg: 'var(--olive-l)', border: 'var(--olive-b)' },
    { icon: '💬', label: '오늘 대화', value: today.length, sub: '건', color: 'var(--copper)', bg: 'var(--copper-l)', border: 'var(--copper-b)' },
    { icon: '⏳', label: '전체 대화', value: logs.length, sub: '누적', color: 'var(--blush)', bg: 'var(--blush-l)', border: 'var(--blush-b)' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
      <div className="max-w-4xl mx-auto">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[22px] font-bold" style={{ color: 'var(--text)' }}>📊 대시보드</h2>
            <p className="text-[13px] mt-1" style={{ color: 'var(--muted)' }}>AI 에이전트 현황 모니터</p>
          </div>
          <div className="text-right">
            <div className="text-[18px] font-bold" style={{ color: 'var(--text)' }}>
              {now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
              {now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
            </div>
          </div>
        </div>

        {/* 통계 카드 4개 */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {statCards.map(card => (
            <div key={card.label} className="p-4 rounded-2xl"
              style={{ background: card.bg, border: `1.5px solid ${card.border}` }}>
              <div className="text-2xl mb-2">{card.icon}</div>
              <div className="text-[12px] mb-1" style={{ color: 'var(--muted)' }}>{card.label}</div>
              <div className="text-[26px] font-bold" style={{ color: card.color }}>{card.value}</div>
              <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{card.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">

          {/* ✅ AI 에이전트 상태 — 커스텀 팀 포함 */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <h3 className="text-[15px] font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
              ⏳ AI 에이전트 상태
              <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto font-normal"
                style={{ background: 'var(--olive-l)', color: 'var(--olive)', border: '1px solid var(--olive-b)' }}>
                ● 전체 정상
              </span>
            </h3>
            <div className="flex flex-col gap-2">
              {allAgentIds.map(id => {
                const count = teamCounts[id] || 0
                const max = Math.max(...Object.values(teamCounts), 1)
                const pct = Math.round(count / max * 100)
                const name = getName(id)
                const color = getAccent(id)
                const icon = getIcon(id)
                const role = getRole(id)
                return (
                  <div key={id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--bg2)' }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: `${color}20` }}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{name}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--olive)' }} />
                          <span className="text-[10px]" style={{ color: 'var(--olive)' }}>대기중</span>
                        </div>
                      </div>
                      <div className="text-[10px] mb-1.5" style={{ color: 'var(--muted)' }}>{role}</div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                        <div className="h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[14px] font-bold" style={{ color }}>{count}</div>
                      <div className="text-[9px]" style={{ color: 'var(--muted)' }}>처리</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4">

            {/* ✅ 팀별 활동 — 커스텀 팀 포함 */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <h3 className="text-[15px] font-bold mb-4" style={{ color: 'var(--text)' }}>📢 팀별 활동</h3>
              {logs.length === 0 ? (
                <div className="text-center py-4">
                  <img src="/rabbit.png" alt="🐰" width={36} height={36} style={{ display:'inline-block', marginBottom:8 }} />
                  <p className="text-[12px]" style={{ color: 'var(--muted)' }}>아직 데이터가 없어요</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {Object.entries(teamCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([id, count]) => {
                      const pct = Math.round(count / logs.length * 100)
                      const color = getAccent(id)
                      const name = getName(id)
                      const icon = getIcon(id)
                      return (
                        <div key={id} className="flex items-center gap-2">
                          <span className="text-sm w-5">{icon}</span>
                          <span className="text-[12px] w-20 flex-shrink-0" style={{ color: 'var(--text2)' }}>{name}</span>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg2)' }}>
                            <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color }} />
                          </div>
                          <span className="text-[11px] w-8 text-right flex-shrink-0" style={{ color: 'var(--muted)' }}>{pct}%</span>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* 최근 대화 */}
            <div className="rounded-2xl p-5 flex-1" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <h3 className="text-[15px] font-bold mb-3" style={{ color: 'var(--text)' }}>🕐 최근 대화</h3>
              {logs.length === 0 ? (
                <div className="text-center py-4">
                  <img src="/rabbit.png" alt="🐰" width={36} height={36} style={{ display:'inline-block', marginBottom:8 }} />
                  <p className="text-[12px]" style={{ color: 'var(--muted)' }}>아직 대화 기록이 없어요</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {logs.slice(-4).reverse().map(log => (
                    <div key={log.id} className="flex items-start gap-2 p-2.5 rounded-xl"
                      style={{ background: 'var(--bg2)' }}>
                      <span className="text-sm flex-shrink-0">{getIcon(log.agentId)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-[11px] font-medium" style={{ color: 'var(--text)' }}>{getName(log.agentId)}</span>
                          <span className="text-[9px] ml-auto flex-shrink-0" style={{ color: 'var(--muted)' }}>
                            {new Date(log.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] truncate" style={{ color: 'var(--muted)' }}>"{log.userText}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 진행 중인 작업 */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>📋 진행 중인 작업</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full"
              style={{ background: 'var(--blush-l)', color: 'var(--blush)', border: '1px solid var(--blush-b)' }}>
              {tasks.filter(t => !t.done).length}개 남음
            </span>
          </div>
          {tasks.filter(t => !t.done).length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-[13px]" style={{ color: 'var(--muted)' }}>모든 작업이 완료됐어요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {tasks.filter(t => !t.done).slice(0, 6).map(task => (
                <div key={task.id} className="flex items-center gap-2 p-3 rounded-xl"
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--blush)' }} />
                  <span className="text-[12px] truncate" style={{ color: 'var(--text)' }}>{task.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
