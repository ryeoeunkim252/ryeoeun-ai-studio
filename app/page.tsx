'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { AGENTS, type AgentId } from '@/lib/agents'
import { loadData, saveData, DEFAULT_SETTINGS, type AppSettings, type ChatLog, STUDIO_NAME, PAGE_TITLE, USER_NAME } from '@/lib/store'
import Dashboard from '@/components/Dashboard'
import TaskManager from '@/components/TaskManager'
import Settings from '@/components/Settings'

const PixelOffice = dynamic(() => import('@/components/PixelOffice'), { ssr: false })

type Page = 'dashboard' | 'office' | 'tasks' | 'chat' | 'settings'

const AGENT_ICONS: Record<string, string> = {
  router: '🔀', web: '🌐', content: '✍️', edu: '📚', research: '🔬', ops: '🚀'
}
const AGENT_ACCENT: Record<string, string> = {
  router: 'var(--blush)', web: 'var(--olive)', content: 'var(--copper)',
  edu: 'var(--blush)', research: 'var(--olive)', ops: 'var(--copper)'
}

const NAV = [
  { id: 'dashboard' as Page, icon: '🏠', label: '대시보드' },
  { id: 'office' as Page, icon: '🏢', label: 'AI 오피스' },
  { id: 'tasks' as Page, icon: '📋', label: '작업 관리' },
  { id: 'chat' as Page, icon: '💬', label: '팀 채팅' },
  { id: 'settings' as Page, icon: '⚙️', label: '설정' },
]

export default function Home() {
  const [page, setPage] = useState<Page>('office')
  const [activeAgentId, setActiveAgentId] = useState<AgentId | null>(null)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [messages, setMessages] = useState<Array<{
    id: string; role: 'user' | 'agent'
    text?: string; agentId?: string; agentName?: string; content?: string; time: string
  }>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<ChatLog[]>([])

  useEffect(() => {
    setSettings(loadData<AppSettings>('nk_settings', DEFAULT_SETTINGS))
    setLogs(loadData<ChatLog[]>('nk_chatlogs', []))
  }, [])

  const now = () => {
    const d = new Date()
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput(''); setLoading(true)
    const agentMsgId = crypto.randomUUID()
    setMessages(prev => [...prev,
      { id: crypto.randomUUID(), role: 'user', text, time: now() },
      { id: agentMsgId, role: 'agent', content: '', agentName: '분석 중...', time: now() }
    ])
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      if (!res.ok || !res.body) throw new Error()
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = '', finalAgentId = 'router', finalAgentName = '라우터', fullContent = ''
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
              finalAgentId = ev.agentId; finalAgentName = ev.agentName
              setActiveAgentId(ev.agentId as AgentId)
              setMessages(prev => prev.map(m => m.id === agentMsgId ? { ...m, agentId: ev.agentId, agentName: ev.agentName } : m))
            } else if (ev.type === 'text') {
              fullContent += ev.text
              setMessages(prev => prev.map(m => m.id === agentMsgId ? { ...m, content: (m.content||'') + ev.text } : m))
            } else if (ev.type === 'done') {
              setActiveAgentId(null)
              const newLog: ChatLog = { id: crypto.randomUUID(), userText: text, agentId: finalAgentId, agentName: finalAgentName, result: fullContent, createdAt: new Date().toISOString() }
              const updated = [...logs, newLog]; setLogs(updated); saveData('nk_chatlogs', updated)
            }
          } catch { }
        }
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === agentMsgId ? { ...m, content: '오류가 생겼어요 😢', agentName: '시스템' } : m))
      setActiveAgentId(null)
    } finally { setLoading(false) }
  }

  const accentOf = (id?: string) => AGENT_ACCENT[id || ''] || 'var(--blush)'

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* 🔵 상단 배너 */}
      <div className="flex items-center justify-center gap-2 py-2 flex-shrink-0 text-[12px] font-medium"
        style={{ background: 'linear-gradient(90deg, #201018, #3d1020, #201018)', color: '#f5ede8', borderBottom: '1px solid var(--sidebar-b)' }}>
        <span style={{ color: 'var(--blush)' }}>✦</span>
        {STUDIO_NAME}
        <span style={{ color: 'var(--copper)' }}>✦</span>
      </div>

      <div className="flex flex-1 overflow-hidden" style={{ display: 'grid', gridTemplateColumns: '180px 1fr 270px' }}>

        {/* ── 사이드바 ── */}
        <aside className="flex flex-col overflow-hidden" style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--sidebar-b)' }}>
          <div className="px-4 py-4 flex items-center gap-3 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--sidebar-b)' }}>
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-base flex-shrink-0"
              style={{ background: 'var(--blush)', color: '#fff' }}>
              🐰
            </div>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: '#ffffff' }}>{USER_NAME}</p>
              <p className="text-[10px]" style={{ color: 'var(--blush-b)' }}>AI 스튜디오</p>
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

          <div className="px-4 py-1 text-[10px] font-medium tracking-widest" style={{ color: 'var(--blush-b)' }}>
            AI 에이전트
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {AGENTS.map(agent => {
              const isActive = activeAgentId === agent.id
              const color = AGENT_ACCENT[agent.id] || 'var(--blush)'
              return (
                <div key={agent.id} onClick={() => { setPage('office'); setActiveAgentId(agent.id) }}
                  className="px-3 py-2 flex items-center gap-2.5 cursor-pointer rounded-xl mb-0.5 text-[12px] transition-all"
                  style={{
                    background: isActive ? 'var(--sidebar-b)' : 'transparent',
                    borderLeft: `2px solid ${isActive ? color : 'transparent'}`,
                    color: isActive ? color : '#ffffff',
                  }}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: isActive ? color : 'var(--blush-b)' }} />
                  <span style={{ fontSize: 13 }}>{AGENT_ICONS[agent.id]}</span>
                  <span>{settings.agentNames[agent.id] || agent.name}</span>
                  <span className="ml-auto text-[9px]" style={{ color: isActive ? color : 'var(--blush-b)' }}>
                    {isActive ? '작업중' : '대기'}
                  </span>
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
                <span style={{ color: 'var(--olive)', fontWeight: 500 }}>● 정상</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── 메인 ── */}
        <div className="flex flex-col min-w-0 overflow-hidden" style={{ background: 'var(--bg2)' }}>

          {/* 🟡 탑바 */}
          <div className="px-5 py-3 flex items-center gap-3 flex-shrink-0"
            style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 18 }}>{NAV.find(n => n.id === page)?.icon}</span>
            <span className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
              {page === 'office' ? PAGE_TITLE : NAV.find(n => n.id === page)?.label}
            </span>
            {activeAgentId && page === 'office' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full animate-pulse ml-1"
                style={{ background: 'var(--blush-l)', color: 'var(--blush)', border: '1px solid var(--blush-b)' }}>
                ✦ 작업 중...
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
          {page === 'chat' && (
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              <h2 className="text-[20px] font-semibold" style={{ color: 'var(--text)' }}>💬 전체 대화 기록</h2>
              {logs.length === 0 ? (
                <div className="m-auto text-center py-20">
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🐰</div>
                  <p style={{ color: 'var(--muted)', fontSize: 14 }}>아직 대화 기록이 없어요!</p>
                </div>
              ) : logs.slice().reverse().map(log => (
                <div key={log.id} className="p-4 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ fontSize: 14 }}>{AGENT_ICONS[log.agentId]}</span>
                    <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{log.agentName}</span>
                    <span className="text-[10px] ml-auto" style={{ color: 'var(--muted)' }}>{new Date(log.createdAt).toLocaleString('ko-KR')}</span>
                  </div>
                  <p className="text-[12px] mb-2 px-3 py-2 rounded-xl" style={{ background: 'var(--blush-l)', color: 'var(--blush)' }}>🙋 {log.userText}</p>
                  <p className="text-[12px] px-3 py-2 rounded-xl" style={{ background: 'var(--bg2)', color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>
                    {log.result.slice(0, 300)}{log.result.length > 300 ? '...' : ''}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="px-5 py-1.5 flex-shrink-0" style={{ background: 'var(--card)', borderTop: '1px solid var(--border)' }}>
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>✦ {STUDIO_NAME}</span>
          </div>
        </div>

        {/* ── 채팅 ── */}
        <div className="flex flex-col h-full"
          style={{ background: 'var(--blush-l)', borderLeft: '1px solid var(--blush-b)' }}>
          <div className="px-4 py-3.5 flex-shrink-0"
            style={{ background: 'var(--sidebar)', borderBottom: '1px solid var(--sidebar-b)' }}>
            <div className="text-[14px] font-semibold" style={{ color: '#ffffff' }}>💌 팀 커뮤니케이션</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--blush-b)' }}>업무를 지시하고 결과를 확인해요</div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0">
            {messages.length === 0 && (
              <div className="m-auto text-center px-3">
                <div style={{ fontSize: 40, marginBottom: 10 }}>🐰</div>
                <p className="text-[13px] font-medium mb-4" style={{ color: 'var(--text)' }}>대표님, 업무를 주세요</p>
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
                    <div className="text-[10px]" style={{ color: 'var(--muted)' }}>나 🙋 {msg.time}</div>
                    <div className="text-[13px] px-3.5 py-2.5 rounded-2xl rounded-tr-sm max-w-[90%] leading-relaxed"
                      style={{ background: 'var(--blush)', color: '#fff' }}>
                      {msg.text}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span style={{ fontSize: 13 }}>{msg.agentId ? AGENT_ICONS[msg.agentId] : '🤖'}</span>
                      <span style={{ color: accentOf(msg.agentId), fontWeight: 500 }}>{msg.agentName}</span>
                      <span className="ml-auto" style={{ color: 'var(--muted)' }}>{msg.time}</span>
                    </div>
                    <div className="text-[13px] px-3.5 py-2.5 rounded-2xl rounded-tl-sm leading-relaxed"
                      style={{ background: '#fff', color: 'var(--text)', border: `1.5px solid ${accentOf(msg.agentId)}40`, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.content || (
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
              ✈️
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}