'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { AGENTS, type AgentId } from '@/lib/agents'
import { loadData, saveData, DEFAULT_SETTINGS, type AppSettings, type ChatLog, STUDIO_NAME, PAGE_TITLE, USER_NAME } from '@/lib/store'
import Dashboard from '@/components/Dashboard'
import TaskManager from '@/components/TaskManager'
import Settings from '@/components/Settings'

const PixelOffice = dynamic(() => import('@/components/PixelOffice'), { ssr: false })

type Page = 'dashboard' | 'office' | 'tasks' | 'chat' | 'settings' | 'saved'

const AGENT_ICONS: Record<string, string> = {
  router: '🔀', web: '🌐', content: '✍️', edu: '📚', research: '🔬', ops: '🚀'
}
const AGENT_ACCENT: Record<string, string> = {
  router: 'var(--blush)', web: 'var(--olive)', content: 'var(--copper)',
  edu: 'var(--blush)', research: 'var(--olive)', ops: 'var(--copper)'
}

const NAV = [
  { id: 'dashboard' as Page, icon: '📊', label: '대시보드' },
  { id: 'office'    as Page, icon: '🏢', label: 'AI 오피스' },
  { id: 'tasks'     as Page, icon: '📋', label: '작업 관리' },
  { id: 'chat'      as Page, icon: '💬', label: '팀 채팅' },
  { id: 'saved'     as Page, icon: '⭐', label: '저장 자료' },
  { id: 'settings'  as Page, icon: '⚙️', label: '설정' },
]

// ✅ 마크다운 기호 제거
const cleanText = (text: string) => {
  return text
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/---+/g, '')
    .trim()
}

// ✅ 모델명 짧게
const shortModel = (model?: string) => {
  if (!model) return ''
  if (model.includes('opus')) return 'OPUS'
  if (model.includes('sonnet')) return 'SONNET'
  if (model.includes('haiku')) return 'HAIKU'
  if (model.includes('gemini')) return 'GEMINI'
  if (model.includes('grok')) return 'GROK'
  return model.toUpperCase()
}

// ChatLog 확장 타입 (modelName 포함)
type ExtChatLog = ChatLog & { modelName?: string }

export default function Home() {
  const [page, setPage] = useState<Page>('office')
  const [activeAgentId, setActiveAgentId] = useState<AgentId | null>(null)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [messages, setMessages] = useState<Array<{
    id: string; role: 'user' | 'agent'
    text?: string; agentId?: string; agentName?: string; modelName?: string; content?: string; time: string
  }>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<ExtChatLog[]>([])
  const [savedLogs, setSavedLogs] = useState<ExtChatLog[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [customTeams, setCustomTeams] = useState<{id:string;icon:string;name:string;role:string;desc:string}[]>([])

  useEffect(() => {
    setSettings(loadData<AppSettings>('nk_settings', DEFAULT_SETTINGS))
    setLogs(loadData<ExtChatLog[]>('nk_chatlogs', []))
    setSavedLogs(loadData<ExtChatLog[]>('nk_savedlogs', []))
    setCustomTeams(loadData('nk_custom_teams', []))
  }, [])

  // ✅ 설정에서 에이전트 이름 가져오기 (변경된 이름 반영)
  const getAgentName = (agentId?: string, fallback?: string) => {
    if (!agentId) return fallback || ''
    return settings.agentNames[agentId] || fallback || agentId
  }

  const now = () => {
    const d = new Date()
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }

  // ✅ 선택 삭제
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const deleteSelected = () => {
    if (selectedIds.size === 0) return
    if (!confirm(`선택한 ${selectedIds.size}개 대화를 삭제할까요?`)) return
    const updated = logs.filter(l => !selectedIds.has(l.id))
    setLogs(updated)
    saveData('nk_chatlogs', updated)
    setSelectedIds(new Set())
  }

  const clearAllMessages = () => {
    if (!confirm('대화 내용을 모두 삭제할까요?')) return
    setMessages([]); setLogs([]); saveData('nk_chatlogs', [])
    setSelectedIds(new Set())
  }

  // ✅ 저장
  const saveLog = (log: ExtChatLog) => {
    if (savedLogs.find(s => s.id === log.id)) return alert('이미 저장된 자료예요!')
    const updated = [...savedLogs, log]
    setSavedLogs(updated); saveData('nk_savedlogs', updated)
    alert('⭐ 저장 자료에 보관했어요!')
  }

  const deleteSaved = (id: string) => {
    const updated = savedLogs.filter(s => s.id !== id)
    setSavedLogs(updated); saveData('nk_savedlogs', updated)
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput(''); setLoading(true)

    const teamModels = loadData<Record<string, string>>('nk_team_models', {
      router: 'claude-haiku-4-5-20251001', web: 'claude-opus-4-5',
      content: 'claude-sonnet-4-5', edu: 'claude-sonnet-4-5',
      research: 'claude-sonnet-4-5', ops: 'claude-sonnet-4-5',
    })
    const teamEnabled = loadData<Record<string, boolean>>('nk_team_enabled', {
      router: true, web: true, content: true, edu: true, research: true, ops: true,
    })

    const agentMsgId = crypto.randomUUID()
    setMessages(prev => [...prev,
      { id: crypto.randomUUID(), role: 'user', text, time: now() },
      { id: agentMsgId, role: 'agent', content: '', agentName: '라우팅 중..', time: now() }
    ])

    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, teamModels, teamEnabled }),
      })
      if (!res.ok || !res.body) throw new Error()
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = '', finalAgentId = 'router', finalAgentName = '라우터', fullContent = '', finalModel = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') { setActiveAgentId(null); break }
          try {
            const ev = JSON.parse(raw)
            if (ev.type === 'agent') {
              finalAgentId = ev.agentId; finalAgentName = ev.agentName; finalModel = ev.modelName ?? ''
              setActiveAgentId(ev.agentId as AgentId)
              setMessages(prev => prev.map(m => m.id === agentMsgId
                ? { ...m, agentId: ev.agentId, agentName: ev.agentName, modelName: ev.modelName } : m))
            } else if (ev.type === 'text') {
              fullContent += ev.text
              setMessages(prev => prev.map(m => m.id === agentMsgId
                ? { ...m, content: (m.content || '') + ev.text } : m))
            } else if (ev.type === 'done') {
              setActiveAgentId(null)
              const newLog: ExtChatLog = {
                id: crypto.randomUUID(), userText: text,
                agentId: finalAgentId, agentName: finalAgentName,
                modelName: finalModel,
                result: fullContent, createdAt: new Date().toISOString()
              }
              const updated = [...logs, newLog]; setLogs(updated); saveData('nk_chatlogs', updated)
            }
          } catch { }
        }
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === agentMsgId
        ? { ...m, content: '오류가 발생했어요. 다시 시도해주세요.', agentName: '시스템' } : m))
      setActiveAgentId(null)
    } finally { setLoading(false) }
  }

  const accentOf = (id?: string) => AGENT_ACCENT[id || ''] || 'var(--blush)'

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* 상단 배너 */}
      <div className="flex items-center justify-center gap-2 py-2 flex-shrink-0 text-[12px] font-medium"
        style={{ background: 'linear-gradient(90deg,#201018,#3d1020,#201018)', color:'#f5ede8', borderBottom:'1px solid var(--sidebar-b)' }}>
        <span style={{ color: 'var(--blush)' }}>✦</span>
        {STUDIO_NAME}
        <span style={{ color: 'var(--copper)' }}>✦</span>
      </div>

      <div className="flex flex-1 overflow-hidden" style={{ display: 'grid', gridTemplateColumns: '180px 1fr 270px' }}>

        {/* 사이드바 */}
        <aside className="flex flex-col overflow-hidden" style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--sidebar-b)' }}>
          <div className="px-4 py-4 flex items-center gap-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--sidebar-b)' }}>
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-base flex-shrink-0"
              style={{ background: 'var(--blush)', color: '#fff' }}>🐰</div>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: '#ffffff' }}>{USER_NAME}</p>
              <p className="text-[10px]" style={{ color: 'var(--blush-b)' }}>김려은 AI 스튜디오</p>
            </div>
          </div>

          <nav className="py-2 flex-shrink-0">
            {NAV.map(item => (
              <button key={item.id} onClick={() => setPage(item.id)}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-[13px] transition-all"
                style={{
                  background: page === item.id ? 'var(--sidebar-b)' : 'transparent',
                  color: page === item.id ? 'var(--blush)' : '#ffffff',
                  borderLeft: `3px solid ${page === item.id ? 'var(--blush)' : 'transparent'}`,
                  fontWeight: page === item.id ? 700 : 400,
                }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>{item.label}
              </button>
            ))}
          </nav>

          <div className="mx-4 my-2 h-px" style={{ background: 'var(--sidebar-b)' }} />

          <div className="px-4 py-1 text-[10px] font-medium tracking-widest" style={{ color: 'var(--blush-b)' }}>AI 에이전트</div>
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {/* 기본 6개 팀 */}
            {AGENTS.map(agent => {
              const isActive = activeAgentId === agent.id
              const color = AGENT_ACCENT[agent.id] || 'var(--blush)'
              const displayName = settings.agentNames[agent.id] || agent.name
              return (
                <div key={agent.id} onClick={() => { setPage('office'); setActiveAgentId(agent.id) }}
                  className="px-3 py-2 flex items-center gap-2.5 cursor-pointer rounded-xl mb-0.5 text-[12px] transition-all"
                  style={{ background: isActive ? 'var(--sidebar-b)' : 'transparent', borderLeft: `2px solid ${isActive ? color : 'transparent'}`, color: isActive ? color : '#ffffff' }}>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'animate-pulse' : ''}`}
                    style={{ background: isActive ? color : 'var(--blush-b)' }} />
                  <span style={{ fontSize: 13 }}>{AGENT_ICONS[agent.id]}</span>
                  <span>{displayName}</span>
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ background: isActive ? color + '33' : 'transparent', color: isActive ? color : 'var(--blush-b)', fontWeight: isActive ? 700 : 400, border: isActive ? `1px solid ${color}` : 'none' }}>
                    {isActive ? '⚡업무중' : '대기'}
                  </span>
                </div>
              )
            })}
            {/* ✅ 커스텀 팀도 표시 */}
            {customTeams.map(team => {
              const isActive = activeAgentId === (team.id as AgentId)
              const color = 'var(--copper)'
              const displayName = settings.agentNames[team.id] || team.name
              return (
                <div key={team.id}
                  className="px-3 py-2 flex items-center gap-2.5 cursor-pointer rounded-xl mb-0.5 text-[12px] transition-all"
                  style={{ background: isActive ? 'var(--sidebar-b)' : 'transparent', borderLeft: `2px solid ${isActive ? color : 'transparent'}`, color: isActive ? color : '#ffffff' }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: isActive ? color : 'var(--blush-b)' }} />
                  <span style={{ fontSize: 13 }}>{team.icon}</span>
                  <span>{displayName}</span>
                  <span className="ml-auto text-[9px]" style={{ color: 'var(--blush-b)' }}>대기</span>
                </div>
              )
            })}
          </div>

          <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--sidebar-b)' }}>
            <div className="rounded-xl px-3 py-2 text-[10px]" style={{ background: 'var(--sidebar-b)' }}>
              <div className="flex justify-between mb-1.5">
                <span style={{ color: 'var(--blush-b)' }}>모델</span>
                <span style={{ color: 'var(--blush)', fontWeight: 500 }}>Sonnet</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--blush-b)' }}>상태</span>
                <span style={{ color: activeAgentId ? 'var(--copper)' : 'var(--olive)', fontWeight: 500 }}>
                  {activeAgentId ? '⚡ 작업중' : '● 정상'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* 메인 */}
        <div className="flex flex-col min-w-0 overflow-hidden" style={{ background: 'var(--bg2)' }}>
          <div className="px-5 py-3 flex items-center gap-3 flex-shrink-0"
            style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 18 }}>{NAV.find(n => n.id === page)?.icon}</span>
            <span className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
              {page === 'office' ? PAGE_TITLE : NAV.find(n => n.id === page)?.label}
            </span>
            {activeAgentId && page === 'office' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full animate-pulse ml-1"
                style={{ background: 'var(--blush-l)', color: 'var(--blush)', border: '1px solid var(--blush-b)' }}>
                ⚡ 작업 중..
              </span>
            )}
          </div>

          {page === 'office' && (
            <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(32,16,24,0.08)' }}>
                <PixelOffice activeAgentId={activeAgentId} />
              </div>
            </div>
          )}
          {page === 'dashboard' && <Dashboard />}
          {page === 'tasks' && <TaskManager />}
          {page === 'settings' && <Settings />}

          {/* ✅ 팀 채팅 - 선택삭제 + 배지 + 이름반영 */}
          {page === 'chat' && (
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between flex-shrink-0">
                <h2 className="text-[20px] font-semibold" style={{ color: 'var(--text)' }}>💬 전체 대화 기록</h2>
                <div className="flex gap-2">
                  {selectedIds.size > 0 && (
                    <button onClick={deleteSelected}
                      className="text-[12px] px-3 py-1.5 rounded-xl"
                      style={{ background: 'var(--blush)', color: '#fff' }}>
                      🗑️ 선택 삭제 ({selectedIds.size})
                    </button>
                  )}
                  {logs.length > 0 && (
                    <button onClick={clearAllMessages}
                      className="text-[12px] px-3 py-1.5 rounded-xl"
                      style={{ background: 'var(--blush-l)', color: 'var(--blush)', border: '1px solid var(--blush-b)' }}>
                      전체 삭제
                    </button>
                  )}
                </div>
              </div>

              {logs.length === 0 ? (
                <div className="m-auto text-center py-20">
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🐰</div>
                  <p style={{ color: 'var(--muted)', fontSize: 14 }}>아직 대화 기록이 없어요</p>
                </div>
              ) : logs.slice().reverse().map(log => {
                const isSelected = selectedIds.has(log.id)
                return (
                  <div key={log.id} className="p-4 rounded-2xl cursor-pointer transition-all"
                    style={{ background: isSelected ? 'var(--blush-l)' : 'var(--card)', border: `1.5px solid ${isSelected ? 'var(--blush)' : 'var(--border)'}` }}
                    onClick={() => toggleSelect(log.id)}>
                    <div className="flex items-center gap-2 mb-2">
                      {/* ✅ 선택 체크박스 */}
                      <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                        style={{ background: isSelected ? 'var(--blush)' : 'var(--bg2)', border: `1.5px solid ${isSelected ? 'var(--blush)' : 'var(--border)'}` }}>
                        {isSelected && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 14 }}>{AGENT_ICONS[log.agentId]}</span>
                      {/* ✅ 2번 - 변경된 이름 반영 */}
                      <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                        {getAgentName(log.agentId, log.agentName)}
                      </span>
                      {/* ✅ 3번 - 팀 채팅에도 배지 */}
                      {(log as ExtChatLog).modelName && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--blush-l)', color: 'var(--blush)', border: '1px solid var(--blush-b)' }}>
                          {shortModel((log as ExtChatLog).modelName)}
                        </span>
                      )}
                      <span className="text-[10px] ml-auto" style={{ color: 'var(--muted)' }}>
                        {new Date(log.createdAt).toLocaleString('ko-KR')}
                      </span>
                      <button onClick={e => { e.stopPropagation(); saveLog(log) }}
                        className="text-[11px] px-2 py-1 rounded-lg"
                        style={{ background: 'var(--olive-l)', color: 'var(--olive)', border: '1px solid var(--olive-b)' }}>
                        ⭐ 저장
                      </button>
                    </div>
                    <p className="text-[12px] mb-2 px-3 py-2 rounded-xl" style={{ background: 'var(--blush-l)', color: 'var(--blush)' }}>
                      나 {log.userText}
                    </p>
                    <p className="text-[12px] px-3 py-2 rounded-xl" style={{ background: 'var(--bg2)', color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>
                      {cleanText(log.result)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {/* 저장 자료 */}
          {page === 'saved' && (
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              <h2 className="text-[20px] font-semibold" style={{ color: 'var(--text)' }}>⭐ 저장 자료</h2>
              {savedLogs.length === 0 ? (
                <div className="m-auto text-center py-20">
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
                  <p style={{ color: 'var(--muted)', fontSize: 14 }}>저장된 자료가 없어요</p>
                  <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>팀 채팅에서 ⭐ 저장 버튼을 눌러보세요!</p>
                </div>
              ) : savedLogs.slice().reverse().map(log => (
                <div key={log.id} className="p-4 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ fontSize: 14 }}>{AGENT_ICONS[log.agentId]}</span>
                    <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                      {getAgentName(log.agentId, log.agentName)}
                    </span>
                    {log.modelName && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--blush-l)', color: 'var(--blush)', border: '1px solid var(--blush-b)' }}>
                        {shortModel(log.modelName)}
                      </span>
                    )}
                    <span className="text-[10px] ml-auto" style={{ color: 'var(--muted)' }}>{new Date(log.createdAt).toLocaleString('ko-KR')}</span>
                    <button onClick={() => deleteSaved(log.id)}
                      className="text-[11px] px-2 py-1 rounded-lg"
                      style={{ background: 'var(--blush-l)', color: 'var(--blush)', border: '1px solid var(--blush-b)' }}>
                      🗑️ 삭제
                    </button>
                  </div>
                  <p className="text-[12px] mb-2 px-3 py-2 rounded-xl" style={{ background: 'var(--blush-l)', color: 'var(--blush)' }}>나 {log.userText}</p>
                  <p className="text-[12px] px-3 py-2 rounded-xl" style={{ background: 'var(--bg2)', color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>
                    {cleanText(log.result)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="px-5 py-1.5 flex-shrink-0" style={{ background: 'var(--card)', borderTop: '1px solid var(--border)' }}>
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>✦ {STUDIO_NAME}</span>
          </div>
        </div>

        {/* 오른쪽 채팅 패널 */}
        <div className="flex flex-col overflow-hidden"
          style={{ background: 'var(--blush-l)', borderLeft: '1px solid var(--blush-b)', height: '100%' }}>
          <div className="px-4 py-3.5 flex-shrink-0"
            style={{ background: 'var(--sidebar)', borderBottom: '1px solid var(--sidebar-b)' }}>
            <div className="text-[14px] font-semibold" style={{ color: '#ffffff' }}>🎯 팀 커뮤니케이션</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--blush-b)' }}>업무를 지시하고 결과를 확인해요</div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0">
            {messages.length === 0 && (
              <div className="m-auto text-center px-3">
                <div style={{ fontSize: 40, marginBottom: 10 }}>🐰</div>
                <p className="text-[13px] font-medium mb-4" style={{ color: 'var(--text)' }}>대표님, 무엇을 도와드릴까요? 🔥</p>
                {[
                  { e: '✍️', t: '블로그 제목 5개 추천해줘' },
                  { e: '🌐', t: '@web 랜딩 페이지 기획해줘' },
                  { e: '🔬', t: '@research AI 트렌드 분석해줘' },
                ].map((ex, i) => (
                  <button key={i} onClick={() => setInput(ex.t)}
                    className="w-full text-[12px] px-3 py-2.5 rounded-xl text-left mb-2"
                    style={{ background: '#fff', color: 'var(--text2)', border: '1px solid var(--blush-b)' }}>
                    {ex.e} {ex.t}
                  </button>
                ))}
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id}>
                {msg.role === 'user' ? (
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-[10px]" style={{ color: 'var(--muted)' }}>나 🔥 {msg.time}</div>
                    <div className="text-[13px] px-3.5 py-2.5 rounded-2xl rounded-tr-sm max-w-[90%] leading-relaxed"
                      style={{ background: 'var(--blush)', color: '#fff' }}>
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span style={{ fontSize: 13 }}>{msg.agentId ? AGENT_ICONS[msg.agentId] : '⏳'}</span>
                      {/* ✅ 변경된 이름 반영 */}
                      <span style={{ color: accentOf(msg.agentId), fontWeight: 500 }}>
                        {getAgentName(msg.agentId, msg.agentName)}
                      </span>
                      {/* ✅ 배지 */}
                      {msg.modelName && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--blush-l)', color: 'var(--blush)', border: '1px solid var(--blush-b)' }}>
                          {shortModel(msg.modelName)}
                        </span>
                      )}
                      <span className="ml-auto" style={{ color: 'var(--muted)' }}>{msg.time}</span>
                    </div>
                    <div className="text-[13px] px-3.5 py-2.5 rounded-2xl rounded-tl-sm leading-relaxed"
                      style={{ background: '#fff', color: 'var(--text)', border: `1.5px solid ${accentOf(msg.agentId)}40`, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.content ? cleanText(msg.content) : (
                        <span className="inline-flex gap-1 items-center">
                          {[0,1,2].map(i => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                              style={{ background: 'var(--blush-b)', animationDelay: `${i*0.15}s` }} />
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="px-3 py-2 flex gap-1.5 flex-wrap flex-shrink-0"
            style={{ borderTop: '1px solid var(--blush-b)', background: '#fff' }}>
            {[
              { k: '@web',      c: 'var(--olive)',  bg: 'var(--olive-l)',  b: 'var(--olive-b)'  },
              { k: '@research', c: 'var(--copper)', bg: 'var(--copper-l)', b: 'var(--copper-b)' },
              { k: '@content',  c: 'var(--blush)',  bg: 'var(--blush-l)',  b: 'var(--blush-b)'  },
              { k: '@edu',      c: 'var(--olive)',  bg: 'var(--olive-l)',  b: 'var(--olive-b)'  },
              { k: '@ops',      c: 'var(--copper)', bg: 'var(--copper-l)', b: 'var(--copper-b)' },
            ].map(({ k, c, bg, b }) => (
              <button key={k} onClick={() => setInput(v => v + k + ' ')}
                className="text-[10px] px-2.5 py-1 rounded-full"
                style={{ background: bg, color: c, border: `1px solid ${b}` }}>
                {k}
              </button>
            ))}
            <button onClick={() => setInput(v => v + ' >> ')}
              className="text-[10px] px-2.5 py-1 rounded-full"
              style={{ background: 'var(--bg2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
              &gt;&gt;
            </button>
          </div>

          <div className="p-3 flex gap-2 flex-shrink-0"
            style={{ background: '#fff', borderTop: '1px solid var(--blush-b)' }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={loading}
              placeholder={loading ? '⏳ 작업 중...' : '업무를 지시해보세요!'}
              className="flex-1 px-4 py-2.5 text-[13px] outline-none rounded-full"
              style={{ background: 'var(--blush-l)', border: '1.5px solid var(--blush-b)', color: 'var(--text)' }}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full"
              style={{ background: loading || !input.trim() ? 'var(--bg2)' : 'var(--blush)', color: loading || !input.trim() ? 'var(--muted)' : '#fff' }}>
              ↑
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
