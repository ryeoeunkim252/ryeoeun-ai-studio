'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { AGENTS, type AgentId } from '@/lib/agents'
import { loadData } from '@/lib/store'

interface MessageBlock {
  step?: number
  agentId?: AgentId
  agentName?: string
  modelName?: string
  content: string
  isVerify?: boolean
  streaming?: boolean
}

interface Message {
  id: string
  role: 'user' | 'agent' | 'router'
  text?: string
  time: string
  blocks?: MessageBlock[]
  isPipeline?: boolean
  teamId?: AgentId
  teamName?: string
  refinedTask?: string
}

interface TeamChatProps {
  onActiveAgent: (id: AgentId | null) => void
}

const AGENT_ICONS: Record<string, string> = {
  router: '🎯', secretary: '✨', web: '💰', content: '✍️',
  edu: '📊', research: '🔬', ops: '⚙️',
}

const EXAMPLES = [
  '🔥 블로그 제목 5개 추천해줘',
  '🌐 랜딩 페이지 기획해줘 >> @web 컴포넌트 작성',
  '🔬 @research AI 트렌드 분석해줘 !verify',
  '📚 초등학생 수학 학습 자료 만들어줘',
]

export default function TeamChat({ onActiveAgent }: TeamChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const msgsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight, behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  const now = () => {
    const d = new Date()
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)

    const teamModels = loadData<Record<string, string>>('nk_team_models', {
      router: 'claude-haiku-4-5-20251001', web: 'claude-opus-4-5', content: 'claude-sonnet-4-5',
      edu: 'claude-sonnet-4-5', research: 'claude-sonnet-4-5', ops: 'claude-sonnet-4-5',
    })
    const teamEnabled = loadData<Record<string, boolean>>('nk_team_enabled', {
      router: true, web: true, content: true, edu: true, research: true, ops: true,
    })

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text, time: now() }
    setMessages(prev => [...prev, userMsg])

    const routerMsgId = crypto.randomUUID()
    const agentMsgId  = crypto.randomUUID()

    // ✅ router_report에서 받은 데이터 임시 저장
    let pendingRouterReport: { teamId: AgentId; teamName: string; refinedTask: string } | null = null
    let agentInserted = false

    const updateBlocks = (updater: (b: MessageBlock[]) => MessageBlock[]) => {
      setMessages(prev => prev.map(m => m.id === agentMsgId
        ? { ...m, blocks: updater(m.blocks ?? []) }
        : m
      ))
    }

    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, teamModels, teamEnabled }),
      })
      if (!res.ok || !res.body) throw new Error('오류')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') { onActiveAgent(null); break }

          try {
            const ev = JSON.parse(raw)

            // ✅ router_report → 임시 저장 (아직 메시지 추가 안 함)
            if (ev.type === 'router_report') {
              pendingRouterReport = {
                teamId: ev.teamId as AgentId,
                teamName: ev.teamName,
                refinedTask: ev.refinedTask,
              }
            }

            // ✅ agent → 라우터 메시지 + 에이전트 메시지를 단 하나의 setMessages로 동시 추가!
            else if (ev.type === 'agent') {
              onActiveAgent(ev.agentId as AgentId)
              if (!agentInserted) {
                agentInserted = true
                const routerData = pendingRouterReport ?? {
                  teamId: ev.agentId as AgentId,
                  teamName: ev.agentName,
                  refinedTask: text,
                }
                // ✅ 핵심: 두 메시지를 하나의 setState로 동시 삽입 → 순서 보장
                setMessages(prev => [...prev,
                  {
                    id: routerMsgId,
                    role: 'router' as const,
                    teamId: routerData.teamId,
                    teamName: routerData.teamName,
                    refinedTask: routerData.refinedTask,
                    time: now(),
                  },
                  {
                    id: agentMsgId,
                    role: 'agent' as const,
                    blocks: [{
                      content: '',
                      streaming: true,
                      agentId: ev.agentId as AgentId,
                      agentName: ev.agentName,
                      modelName: ev.modelName,
                    }],
                    isPipeline: text.includes('>>'),
                    time: now(),
                  },
                ])
              } else {
                updateBlocks(b => {
                  const u = [...b]
                  u[u.length - 1] = { ...u[u.length - 1], agentId: ev.agentId, agentName: ev.agentName, modelName: ev.modelName }
                  return u
                })
              }
            }

            else if (ev.type === 'pipeline_step' && ev.step > 1) {
              updateBlocks(b => [...b, { step: ev.step, content: '', streaming: true }])
            }
            else if (ev.type === 'text') {
              updateBlocks(b => {
                const u = [...b]
                u[u.length - 1] = { ...u[u.length - 1], content: u[u.length - 1].content + ev.text }
                return u
              })
            }
            else if (ev.type === 'step_done') {
              updateBlocks(b => { const u = [...b]; u[u.length - 1] = { ...u[u.length - 1], streaming: false }; return u })
            }
            else if (ev.type === 'verify_start') {
              updateBlocks(b => [...b, { content: '', isVerify: true, streaming: true }])
            }
            else if (ev.type === 'verify_result') {
              updateBlocks(b => { const u = [...b]; u[u.length - 1] = { ...u[u.length - 1], content: ev.text, streaming: false }; return u })
            }
            else if (ev.type === 'done') {
              updateBlocks(b => b.map(bl => ({ ...bl, streaming: false })))
              onActiveAgent(null)
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        id: agentMsgId,
        role: 'agent',
        blocks: [{ content: '⚠️ 오류가 발생했어요. 잠시 후 다시 시도해주세요.', agentName: '시스템' }],
        time: now(),
      }])
      onActiveAgent(null)
    } finally {
      setLoading(false)
    }
  }

  const agentColor = (id?: AgentId) => AGENTS.find(a => a.id === id)?.color ?? '#c9a0dc'

  return (
    <div className="flex flex-col h-full" style={{ background: '#1a1030', borderLeft: '2px solid #3d2458', fontFamily: "'Jua', sans-serif" }}>

      {/* 헤더 */}
      <div className="px-4 py-3 flex-shrink-0" style={{ background: '#2a1845', borderBottom: '2px solid #3d2458' }}>
        <div className="text-[12px]" style={{ color: '#f0c4ff' }}>🎯 팀 커뮤니케이션</div>
        <div className="text-[8px] mt-0.5" style={{ color: '#7a5a9a' }}>업무를 지시하고 결과를 확인해요</div>
      </div>

      {/* 메시지 목록 */}
      <div ref={msgsRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0">
        {messages.length === 0 && (
          <div className="m-auto text-center">
            <div className="text-3xl mb-3">🐰</div>
            <p className="text-[11px] mb-3" style={{ color: '#c9a0dc' }}>대표님, 무엇을 도와드릴까요? 🔥</p>
            <div className="flex flex-col gap-2">
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => setInput(ex.replace(/^[🔥🌐🔬📚]\s/, ''))}
                  className="text-[9px] px-3 py-2 rounded-xl text-left transition-all"
                  style={{ background: '#2a1845', color: '#c9a0dc', border: '1.5px solid #3d2458' }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-1 duration-200">

            {/* 유저 메시지 */}
            {msg.role === 'user' && (
              <div className="flex flex-col items-end gap-1">
                <div className="text-[7px] flex items-center gap-1" style={{ color: '#7a5a9a' }}>
                  <span>{msg.time}</span><span>나</span>
                </div>
                <div className="text-[10px] px-3 py-2 rounded-2xl rounded-tr-sm max-w-[90%] leading-relaxed"
                  style={{ background: 'linear-gradient(135deg, #6d3d88, #4a1d6a)', color: '#f0d4ff' }}>
                  {msg.text}
                </div>
              </div>
            )}

            {/* 총괄실장 보고 버블 */}
            {msg.role === 'router' && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[8px] px-1">
                  <span className="text-sm">🎯</span>
                  <span style={{ color: '#c06080', fontWeight: 600 }}>총괄실장</span>
                  <span className="text-[7px] px-1.5 py-0.5 rounded-full"
                    style={{ background: '#3d1535', color: '#f0a0c0', border: '1px solid #c0608044' }}>
                    업무 지시
                  </span>
                  <span className="ml-auto text-[7px]" style={{ color: '#5a4a7a' }}>{msg.time}</span>
                </div>
                <div className="text-[9px] px-3 py-2.5 rounded-2xl rounded-tl-sm leading-relaxed"
                  style={{
                    background: '#2a1535',
                    color: '#e8b4d0',
                    border: '1.5px solid #c0608055',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span style={{ color: '#ff8ab0' }}>▶</span>
                    <span style={{ color: '#ffc0d8', fontWeight: 600, fontSize: '10px' }}>
                      {AGENT_ICONS[msg.teamId ?? ''] ?? '👥'} {msg.teamName}에 업무 지시했어요
                    </span>
                  </div>
                  <div style={{ color: '#c090a8', lineHeight: '1.6' }}>
                    {msg.refinedTask}
                  </div>
                </div>
              </div>
            )}

            {/* 팀 응답 메시지 */}
            {msg.role === 'agent' && (
              <div className="flex flex-col gap-2">
                {msg.isPipeline && msg.blocks && msg.blocks.length > 1 && (
                  <div className="text-[8px] px-2" style={{ color: '#c9a0dc' }}>
                    🔗 파이프라인 {msg.blocks.filter(b => !b.isVerify).length}단계 실행 중
                  </div>
                )}
                {msg.blocks?.map((block, bi) => (
                  <div key={bi} className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[8px] px-1">
                      {block.isVerify ? (
                        <span style={{ color: '#a0e0a0' }}>✅ 검증 결과</span>
                      ) : (
                        <>
                          <span className="text-sm">{block.agentId ? (AGENT_ICONS[block.agentId] ?? '⏳') : '⏳'}</span>
                          <span style={{ color: agentColor(block.agentId) }}>{block.agentName ?? '작업 중...'}</span>
                          {block.modelName && (
                            <span className="text-[7px] px-1.5 py-0.5 rounded-full"
                              style={{ background: '#3d2458', color: '#e0b8ff', border: '1px solid #6d4a8a' }}>
                              {block.modelName.replace('claude-','').replace('-4-5','').replace('-20251001','').replace('-5','').toUpperCase()}
                            </span>
                          )}
                          {block.step && msg.isPipeline && (
                            <span className="text-[6px] px-1.5 py-0.5 rounded-full"
                              style={{ background: '#3d2458', color: '#c9a0dc' }}>
                              {block.step}단계
                            </span>
                          )}
                        </>
                      )}
                      {bi === 0 && <span className="ml-auto text-[7px]" style={{ color: '#5a4a7a' }}>{msg.time}</span>}
                    </div>
                    <div className="text-[10px] px-3 py-2.5 rounded-2xl rounded-tl-sm leading-relaxed"
                      style={{
                        background: block.isVerify ? '#1a3a1a' : '#2a1845',
                        color: block.isVerify ? '#a0e0a0' : '#d4b4f4',
                        border: `1.5px solid ${block.isVerify ? '#2a6a2a' : agentColor(block.agentId) + '44'}`,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}>
                      {block.content || (block.streaming && (
                        <span className="inline-flex gap-1 items-center">
                          {[0, 1, 2].map(i => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                              style={{ background: '#c9a0dc', animationDelay: `${i * 0.15}s`, animationDuration: '1s' }} />
                          ))}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        ))}
      </div>

      {/* 빠른 태그 */}
      <div className="px-3 py-2 flex gap-1.5 flex-wrap flex-shrink-0" style={{ borderTop: '2px solid #3d2458' }}>
        {['@비서','@총괄실장','@전략실장','@콘텐츠팀장','@수익화팀','@자동화팀','@데이터팀장'].map(k => (
          <button key={k} onClick={() => setInput(v => v + k + ' ')}
            className="text-[7px] px-2 py-1 rounded-full transition-all"
            style={{ background: '#2a1845', color: '#c9a0dc', border: '1px solid #4d2d68' }}>
            {k}
          </button>
        ))}
        <button onClick={() => setInput(v => v + ' !verify')}
          className="text-[7px] px-2 py-1 rounded-full"
          style={{ background: '#1a3a1a', color: '#a0e0a0', border: '1px solid #2a6a2a' }}>
          !verify
        </button>
        <button onClick={() => setInput(v => v + ' >> ')}
          className="text-[7px] px-2 py-1 rounded-full"
          style={{ background: '#2a1845', color: '#ff9eb5', border: '1px solid #4d2d68' }}>
          &gt;&gt; 파이프
        </button>
      </div>

      {/* 입력창 */}
      <div className="p-3 flex gap-2 flex-shrink-0">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={loading}
          placeholder={loading ? '⏳ AI 팀 작업 중...' : '업무를 지시해보세요!'}
          className="flex-1 px-4 py-2.5 text-[10px] outline-none transition-all"
          style={{
            background: '#2a1845', border: '2px solid #4d2d68', borderRadius: '999px',
            color: '#d4b4f4', fontFamily: "'Jua', sans-serif",
          }}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center text-sm transition-all"
          style={{
            background: loading || !input.trim() ? '#3d2458' : 'linear-gradient(135deg, #ff9eb5, #c9a0dc)',
            borderRadius: '999px', color: '#fff',
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}>
          ↑
        </button>
      </div>

    </div>
  )
}
