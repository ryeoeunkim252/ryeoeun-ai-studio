'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { AGENTS, type AgentId } from '@/lib/agents'
import {
  loadData, saveData, syncFromCloud,
  DEFAULT_SETTINGS, type AppSettings, type ChatLog,
  STUDIO_NAME, PAGE_TITLE, USER_NAME,
} from '@/lib/store'
import Dashboard from '@/components/Dashboard'
import TaskManager from '@/components/TaskManager'
import Settings from '@/components/Settings'
import CommandCenter from '@/components/CommandCenter'

const PixelOffice = dynamic(() => import('@/components/PixelOffice'), { ssr: false })

type Page = 'dashboard' | 'office' | 'tasks' | 'chat' | 'settings' | 'saved' | 'command'

// ── 새 조직도 반영 아이콘 ────────────────────────────────────
const AGENT_ICONS: Record<string, string> = {
  router:   '🔀',  // 총괄실장
  content:  '✍️',  // 콘텐츠팀장
  research: '📊',  // 전략실장
  ops:      '⚙️',  // 자동화팀장
  web:      '💰',  // 수익화팀장
  edu:      '📂',  // 데이터팀장
}

// ── 새 조직도 반영 색상 ──────────────────────────────────────
const AGENT_ACCENT: Record<string, string> = {
  router:   '#c06080',
  content:  '#d85a30',
  research: '#1d9e75',
  ops:      '#378add',
  web:      '#ba7517',
  edu:      '#3b6d11',
}

// ── 콘텐츠본부 서브팀 3개 (시각적 표기용) ────────────────────
const CONTENT_SUB_TEAMS = [
  { name: '기획팀',   icon: '✍️', desc: '기획·카피' },
  { name: '디자인팀',  icon: '🎨', desc: '썸네일·이미지' },
  { name: '채널운영팀', icon: '📱', desc: '인스타·블로그' },
]

const ALL_NAV = [
  { id: 'dashboard' as Page, icon: '📊', label: '대시보드' },
  { id: 'office'    as Page, icon: '🏢', label: 'AI 오피스' },
  { id: 'tasks'     as Page, icon: '📋', label: '작업 관리' },
  { id: 'chat'      as Page, icon: '💬', label: '팀 채팅' },
  { id: 'saved'     as Page, icon: '⭐', label: '저장 자료' },
  { id: 'settings'  as Page, icon: '⚙️', label: '설정' },
  { id: 'command'   as Page, icon: '👑', label: '본부' },
]

const RabbitEmoji = ({ size = 40 }: { size?: number }) => (
  <img src="/rabbit.png" alt="🐰" width={size} height={size}
    style={{ display: 'inline-block', verticalAlign: 'middle', imageRendering: 'auto' }} />
)

const cleanText = (text: string) =>
  text
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/---+/g, '')
    .trim()

const shortModel = (model?: string) => {
  if (!model) return ''
  if (model.includes('opus'))   return 'OPUS'
  if (model.includes('sonnet')) return 'SONNET'
  if (model.includes('haiku'))  return 'HAIKU'
  if (model.includes('gemini')) return 'GEMINI'
  if (model.includes('grok'))   return 'GROK'
  return ''
}

type ExtChatLog = ChatLog & { modelName?: string }
type CustomTeam = { id: string; icon: string; name: string; role: string; desc: string }

export default function Home() {
  const [page, setPage]                   = useState<Page>('office')
  const [activeAgentId, setActiveAgentId] = useState<AgentId | null>(null)
  const [settings, setSettings]           = useState<AppSettings>(DEFAULT_SETTINGS)
  const [messages, setMessages]           = useState<Array<{
    id: string; role: 'user' | 'agent'
    text?: string; agentId?: string; agentName?: string
    modelName?: string; content?: string; time: string
  }>>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [logs, setLogs]           = useState<ExtChatLog[]>([])
  const [savedLogs, setSavedLogs] = useState<ExtChatLog[]>([])
  const [customTeams, setCustomTeams] = useState<CustomTeam[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [syncing, setSyncing]         = useState(true)
  const [chatFilter, setChatFilter]   = useState<string | null>(null)
  const [savedFilter, setSavedFilter] = useState<string | null>(null)
  const [NAV, setNAV]                 = useState(ALL_NAV)
  // ── 에이전트 표시 순서 (Settings에서 저장한 nk_team_order 반영) ─
  const [agentOrder, setAgentOrder]   = useState<string[]>([])

  useEffect(() => {
    const init = async () => {
      setSyncing(true)
      await syncFromCloud()

      // ── 에이전트 이름 강제 고정 (어떤 값이 저장됐든 무조건 덮어씀) ─
      const stored = loadData<AppSettings>('nk_settings', DEFAULT_SETTINGS)
      const FORCED_NAMES: Record<string, string> = {
        secretary: 'CEO 비서',
        router:   '총괄실장',
        research: '전략기획실장',
        content:  '콘텐츠팀장',
        web:      '수익화팀',
        ops:      '자동화팀',
        edu:      '데이터팀',
      }
      const forcedSettings = {
        ...stored,
        agentNames: { ...stored.agentNames, ...FORCED_NAMES }
      }
      await saveData('nk_settings', forcedSettings)
      setSettings(forcedSettings)

      // ── 불필요한 커스텀 팀 삭제 (전략기획실, 디자인팀 등 구 커스텀 팀) ──
      await saveData('nk_custom_teams', [])
      setCustomTeams([])

      // ── 에이전트 순서 강제 리셋 (항상 올바른 순서로) ────────────
      const CORRECT_ORDER = ['secretary', 'router', 'research', 'content', 'web', 'ops', 'edu']
      await saveData('nk_team_order', CORRECT_ORDER)
      setAgentOrder(CORRECT_ORDER)
      // ─────────────────────────────────────────────────────────────
      setLogs(loadData<ExtChatLog[]>('nk_chatlogs', []))
      setSavedLogs(loadData<ExtChatLog[]>('nk_savedlogs', []))
      // ── 에이전트 순서 로드 (마이그레이션에서 이미 처리됨) ────────
      const savedAgentOrder = loadData<string[]>('nk_team_order', [])
      if (savedAgentOrder.length > 0 && agentOrder.length === 0) {
        setAgentOrder(savedAgentOrder)
      }
      // ── 메뉴 순서 로드 ──────────────────────────────────────────
      const savedNavOrder = loadData<string[]>('nk_nav_order', [])
      if (savedNavOrder.length > 0) {
        const sorted = [
          ...savedNavOrder.map(id => ALL_NAV.find(n => n.id === id)).filter(Boolean) as typeof ALL_NAV,
          ...ALL_NAV.filter(n => !savedNavOrder.includes(n.id)),
        ]
        setNAV(sorted)
      }
      setSyncing(false)
    }
    init()
  }, [])

  // ── Settings 저장 순서에 맞게 에이전트 정렬 ──────────────────
  const sortedAgents = agentOrder.length > 0
    ? [...AGENTS].sort((a, b) => {
        const ia = agentOrder.indexOf(a.id)
        const ib = agentOrder.indexOf(b.id)
        if (ia === -1 && ib === -1) return 0
        if (ia === -1) return 1
        if (ib === -1) return -1
        return ia - ib
      })
    : AGENTS

  const getAgentName = (agentId?: string, fallback?: string) =>
    agentId
      ? (settings.agentNames[agentId] || customTeams.find(t => t.id === agentId)?.name || fallback || agentId)
      : (fallback || '')
  const getIcon   = (id: string) => AGENT_ICONS[id] || customTeams.find(t => t.id === id)?.icon || '🤖'
  const getAccent = (id?: string) => AGENT_ACCENT[id || ''] || 'var(--blush)'
  const now = () => {
    const d = new Date()
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }
  const getTeamCounts = (logList: ExtChatLog[]) => {
    const counts: Record<string, number> = {}
    logList.forEach(l => { counts[l.agentId] = (counts[l.agentId] || 0) + 1 })
    return counts
  }
  const allTeamIds = [...AGENTS.map(a => a.id), ...customTeams.map(t => t.id)]

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const deleteSelected = () => {
    if (selectedIds.size === 0) return
    if (!confirm(`선택한 ${selectedIds.size}개 대화를 삭제할까요?`)) return
    const updated = logs.filter(l => !selectedIds.has(l.id))
    setLogs(updated); saveData('nk_chatlogs', updated); setSelectedIds(new Set())
  }
  const clearAllMessages = () => {
    if (!confirm('대화 내용을 모두 삭제할까요?')) return
    setMessages([]); setLogs([]); saveData('nk_chatlogs', []); setSelectedIds(new Set())
  }
  const saveLog = (log: ExtChatLog) => {
    if (savedLogs.find(s => s.id === log.id)) return alert('이미 저장된 자료예요!')
    const updated = [...savedLogs, log]; setSavedLogs(updated); saveData('nk_savedlogs', updated)
    alert('⭐ 저장 자료에 보관했어요!')
  }
  const deleteSaved = (id: string) => {
    const updated = savedLogs.filter(s => s.id !== id); setSavedLogs(updated); saveData('nk_savedlogs', updated)
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput(''); setLoading(true)
    const teamModels  = loadData<Record<string, string>>('nk_team_models', {
      router: 'claude-haiku-4-5-20251001', content: 'claude-sonnet-4-5',
      research: 'claude-sonnet-4-5', ops: 'claude-sonnet-4-5',
      web: 'claude-sonnet-4-5', edu: 'claude-sonnet-4-5',
    })
    const teamEnabled = loadData<Record<string, boolean>>('nk_team_enabled', {
      router: true, content: true, research: true, ops: true, web: true, edu: true,
    })
    const mcpEnabled  = loadData<Record<string, boolean>>('nk_mcp', {})
    const mcpTeams    = loadData<Record<string, string[]>>('nk_mcp_teams', {})
    const agentMsgId  = crypto.randomUUID()
    setMessages(prev => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', text, time: now() },
      { id: agentMsgId, role: 'agent', content: '', agentName: '라우팅 중..', time: now() },
    ])
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, teamModels, teamEnabled, mcpEnabled, mcpTeams }),
      })
      if (!res.ok || !res.body) throw new Error()
      const reader = res.body.getReader(); const decoder = new TextDecoder()
      let buf = '', finalAgentId = 'router', finalAgentName = '총괄실장', fullContent = '', finalModel = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim(); if (raw === '[DONE]') { setActiveAgentId(null); break }
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
                agentId: finalAgentId, agentName: finalAgentName, modelName: finalModel,
                result: fullContent, createdAt: new Date().toISOString(),
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

  const TeamSidebar = ({ logList, filter, setFilter, onNew }: {
    logList: ExtChatLog[]; filter: string | null
    setFilter: (v: string | null) => void; onNew?: () => void
  }) => {
    const counts = getTeamCounts(logList)
    const teamsWithLogs = allTeamIds.filter(id => counts[id])
    const total = logList.length
    return (
      <div className="w-[160px] flex-shrink-0 flex flex-col overflow-hidden"
        style={{ background: 'var(--card)', borderRight: '1px solid var(--border)' }}>
        <div className="px-3 py-3 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>대화 목록</span>
          {onNew && <button onClick={onNew}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-[14px]"
            style={{ background: 'var(--blush)', color: '#fff' }}>＋</button>}
        </div>
        <button onClick={() => setFilter(null)} className="flex items-center gap-2 px-3 py-2.5 text-left transition-all"
          style={{ background: filter===null?'var(--blush-l)':'transparent', borderLeft:`3px solid ${filter===null?'var(--blush)':'transparent'}` }}>
          <span style={{ fontSize:14 }}>💬</span>
          <span className="text-[12px] flex-1" style={{ color:filter===null?'var(--blush)':'var(--text2)',fontWeight:filter===null?600:400 }}>전체</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background:'var(--bg2)',color:'var(--muted)' }}>{total}</span>
        </button>
        <div className="mx-3 h-px my-1" style={{ background: 'var(--border)' }} />
        <div className="flex-1 overflow-y-auto">
          {teamsWithLogs.length === 0
            ? <p className="text-[11px] text-center mt-4" style={{ color:'var(--muted)' }}>대화 없음</p>
            : teamsWithLogs.map(id => {
                const isSelected = filter === id
                return (
                  <button key={id} onClick={() => setFilter(id)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-all"
                    style={{ background:isSelected?'var(--blush-l)':'transparent', borderLeft:`3px solid ${isSelected?'var(--blush)':'transparent'}` }}>
                    <span style={{ fontSize:13 }}>{getIcon(id)}</span>
                    <span className="text-[11px] flex-1 truncate" style={{ color:isSelected?'var(--blush)':'var(--text2)',fontWeight:isSelected?600:400 }}>
                      {getAgentName(id)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background:isSelected?'var(--blush)':'var(--bg2)',color:isSelected?'#fff':'var(--muted)' }}>{counts[id]}</span>
                  </button>
                )
              })
          }
        </div>
      </div>
    )
  }

  const LogCard = ({ log, selectable }: { log: ExtChatLog; selectable?: boolean }) => {
    const isSelected = selectedIds.has(log.id)
    return (
      <div className="p-4 rounded-2xl transition-all"
        style={{ background:isSelected?'var(--blush-l)':'var(--card)', border:`1.5px solid ${isSelected?'var(--blush)':'var(--border)'}`, cursor:selectable?'pointer':'default' }}
        onClick={() => selectable && toggleSelect(log.id)}>
        <div className="flex items-center gap-2 mb-2">
          {selectable && (
            <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
              style={{ background:isSelected?'var(--blush)':'var(--bg2)', border:`1.5px solid ${isSelected?'var(--blush)':'var(--border)'}` }}>
              {isSelected && <span style={{ color:'#fff',fontSize:10 }}>✓</span>}
            </div>
          )}
          <span style={{ fontSize:14 }}>{getIcon(log.agentId)}</span>
          <span className="text-[13px] font-medium" style={{ color:'var(--text)' }}>{getAgentName(log.agentId, log.agentName)}</span>
          {log.modelName && <span className="text-[9px] px-1.5 py-0.5 rounded-full"
            style={{ background:'var(--blush-l)',color:'var(--blush)',border:'1px solid var(--blush-b)' }}>{shortModel(log.modelName)}</span>}
          <span className="text-[10px] ml-auto" style={{ color:'var(--muted)' }}>{new Date(log.createdAt).toLocaleString('ko-KR')}</span>
          <button onClick={e => { e.stopPropagation(); saveLog(log) }}
            className="text-[11px] px-2 py-1 rounded-lg"
            style={{ background:'var(--olive-l)',color:'var(--olive)',border:'1px solid var(--olive-b)' }}>⭐ 저장</button>
        </div>
        <p className="text-[12px] mb-2 px-3 py-2 rounded-xl" style={{ background:'var(--blush-l)',color:'var(--blush)' }}>나 {log.userText}</p>
        <p className="text-[12px] px-3 py-2 rounded-xl" style={{ background:'var(--bg2)',color:'var(--text2)',whiteSpace:'pre-wrap' }}>{cleanText(log.result)}</p>
      </div>
    )
  }

  if (syncing) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4" style={{ background:'var(--bg)' }}>
        <div className="text-4xl animate-bounce"><RabbitEmoji size={48} /></div>
        <p className="text-[14px]" style={{ color:'var(--muted)' }}>클라우드에서 데이터 불러오는 중...</p>
        <div className="flex gap-1">{[0,1,2].map(i =>
          <span key={i} className="w-2 h-2 rounded-full animate-bounce"
            style={{ background:'var(--blush)',animationDelay:`${i*0.15}s` }} />
        )}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center justify-center gap-2 py-2 flex-shrink-0 text-[12px] font-medium"
        style={{ background:'linear-gradient(90deg,#201018,#3d1020,#201018)',color:'#f5ede8',borderBottom:'1px solid var(--sidebar-b)' }}>
        <span style={{ color:'var(--blush)' }}>✦</span>{STUDIO_NAME}<span style={{ color:'var(--copper)' }}>✦</span>
      </div>

      <div className="flex flex-1 overflow-hidden" style={{ display:'grid',gridTemplateColumns:'210px 1fr 270px' }}>

        {/* ── 왼쪽 사이드바 ── */}
        <aside className="flex flex-col min-h-0 overflow-hidden" style={{ background:'var(--sidebar)',borderRight:'1px solid var(--sidebar-b)' }}>
          {/* 프로필 */}
          <div className="px-4 py-4 flex items-center gap-3 flex-shrink-0" style={{ borderBottom:'1px solid var(--sidebar-b)' }}>
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background:'var(--blush)',color:'#fff' }}>
              <RabbitEmoji size={24} />
            </div>
            <div>
              <p className="text-[13px] font-semibold" style={{ color:'#ffffff' }}>{USER_NAME}</p>
              <p className="text-[10px]" style={{ color:'var(--blush-b)' }}>김려은 AI 스튜디오</p>
            </div>
          </div>

          {/* 네비게이션 + AI 에이전트 — 하나의 스크롤 영역 */}
          <div className="flex-1 overflow-y-auto min-h-0">

            {/* 네비게이션 */}
            <nav className="py-2">
              {NAV.map(item => (
                <button key={item.id} onClick={() => setPage(item.id)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-[13px] transition-all"
                  style={{
                    background: page===item.id?'var(--sidebar-b)':'transparent',
                    color: page===item.id?'var(--blush)':'#ffffff',
                    borderLeft: `3px solid ${page===item.id?'var(--blush)':'transparent'}`,
                    fontWeight: page===item.id?700:400,
                  }}>
                  <span style={{ fontSize:14 }}>{item.icon}</span>{item.label}
                </button>
              ))}
            </nav>

            <div className="mx-4 my-2 h-px" style={{ background:'var(--sidebar-b)' }} />
            <div className="px-4 py-1 text-[10px] font-medium tracking-widest" style={{ color:'var(--blush-b)' }}>AI 에이전트</div>

            {/* ── 에이전트 목록 ── */}
            <div className="px-2 pb-2">
            {sortedAgents.flatMap(agent => {
              const isActive = activeAgentId === agent.id
              const color    = AGENT_ACCENT[agent.id] || 'var(--blush)'

              const agentItem = (
                <div
                  key={agent.id}
                  onClick={() => { setPage('office'); setActiveAgentId(agent.id) }}
                  className="px-3 py-2 flex items-center gap-2.5 cursor-pointer rounded-xl mb-0.5 text-[12px] transition-all"
                  style={{
                    background:  isActive ? 'var(--sidebar-b)' : 'transparent',
                    borderLeft: `2px solid ${isActive ? color : 'transparent'}`,
                    color: isActive ? color : '#ffffff',
                  }}
                >
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'animate-pulse' : ''}`}
                    style={{ background: isActive ? color : 'var(--blush-b)' }} />
                  <span style={{ fontSize:13, flexShrink:0 }}>{AGENT_ICONS[agent.id]}</span>
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{settings.agentNames[agent.id] || agent.name}</span>
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full" style={{
                    background: isActive ? color+'33' : 'transparent',
                    color: isActive ? color : 'var(--blush-b)',
                    fontWeight: isActive ? 700 : 400,
                    border: isActive ? `1px solid ${color}` : 'none',
                  }}>{isActive ? '⚡업무중' : '대기'}</span>
                </div>
              )

              // 콘텐츠팀장 아래에만 서브팀 3개 표기
              if (agent.id !== 'content') return [agentItem]

              const subItems = CONTENT_SUB_TEAMS.map(sub => (
                <div
                  key={`sub-${sub.name}`}
                  onClick={() => { setPage('office'); setActiveAgentId('content') }}
                  className="flex items-center gap-1.5 cursor-pointer rounded-lg mb-0.5 transition-all"
                  style={{
                    padding: '3px 8px 3px 26px',
                    color: isActive ? '#d85a30' : 'rgba(255,255,255,0.45)',
                    fontSize: 10,
                  }}
                >
                  <span style={{ color:'rgba(255,255,255,0.2)',fontSize:9,flexShrink:0 }}>└</span>
                  <span style={{ fontSize:11,flexShrink:0 }}>{sub.icon}</span>
                  <span style={{ flex:1 }}>{sub.name}</span>
                  <span style={{ fontSize:8,color:'rgba(255,255,255,0.2)' }}>{sub.desc}</span>
                </div>
              ))

              return [agentItem, ...subItems]
            })}

            {/* 커스텀 팀 */}
            {customTeams.map(team => {
              const isActive = activeAgentId === team.id
              const color    = 'var(--blush)'
              return (
                <div key={team.id}
                  onClick={() => { setPage('office'); setActiveAgentId(team.id as AgentId) }}
                  className="px-3 py-2 flex items-center gap-2.5 cursor-pointer rounded-xl mb-0.5 text-[12px] transition-all"
                  style={{ background:isActive?'var(--sidebar-b)':'transparent', borderLeft:`2px solid ${isActive?color:'transparent'}`, color:isActive?color:'#ffffff' }}>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive?'animate-pulse':''}`}
                    style={{ background:isActive?color:'var(--blush-b)' }} />
                  <span style={{ fontSize:13, flexShrink:0 }}>{team.icon}</span>
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{settings.agentNames[team.id] || team.name}</span>
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full" style={{ background:isActive?color+'33':'transparent',color:isActive?color:'var(--blush-b)',fontWeight:isActive?700:400,border:isActive?`1px solid ${color}`:'none' }}>
                    {isActive ? '⚡업무중' : '대기'}
                  </span>
                </div>
              )
            })}
          </div>
          </div>{/* 스크롤 영역 닫기 */}

          {/* 모델/상태 표시 */}
          <div className="px-3 py-3 flex-shrink-0" style={{ borderTop:'1px solid var(--sidebar-b)' }}>
            <div className="rounded-xl px-3 py-2 text-[10px]" style={{ background:'var(--sidebar-b)' }}>
              <div className="flex justify-between mb-1.5">
                <span style={{ color:'var(--blush-b)' }}>모델</span>
                <span style={{ color:'var(--blush)',fontWeight:500 }}>Sonnet</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color:'var(--blush-b)' }}>상태</span>
                <span style={{ color:activeAgentId?'var(--copper)':'var(--olive)',fontWeight:500 }}>
                  {activeAgentId ? '⚡ 작업중' : '● 정상'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* ── 메인 콘텐츠 ── */}
        <div className="flex flex-col min-w-0 overflow-hidden" style={{ background:'var(--bg2)' }}>
          <div className="px-5 py-3 flex items-center gap-3 flex-shrink-0"
            style={{ background:'var(--card)',borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:18 }}>{NAV.find(n => n.id === page)?.icon}</span>
            <span className="text-[15px] font-semibold" style={{ color:'var(--text)' }}>
              {page === 'office' ? PAGE_TITLE : NAV.find(n => n.id === page)?.label}
            </span>
            {activeAgentId && page === 'office' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full animate-pulse ml-1"
                style={{ background:'var(--blush-l)',color:'var(--blush)',border:'1px solid var(--blush-b)' }}>⚡ 작업 중..</span>
            )}
          </div>

          {page === 'office' && (
            <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
              <div className="rounded-2xl overflow-hidden" style={{ border:'1px solid var(--border)',boxShadow:'0 2px 12px rgba(32,16,24,0.08)' }}>
                <PixelOffice activeAgentId={activeAgentId} />
              </div>
            </div>
          )}
          {page === 'dashboard' && <Dashboard />}
          {page === 'tasks'     && <TaskManager />}
          {page === 'command'   && <CommandCenter />}
          {page === 'settings'  && <Settings />}

          {page === 'chat' && (
            <div className="flex flex-1 overflow-hidden">
              <TeamSidebar logList={logs} filter={chatFilter} setFilter={setChatFilter}
                onNew={() => { setMessages([]); setChatFilter(null) }} />
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[18px] font-semibold" style={{ color:'var(--text)' }}>
                      {chatFilter ? `${getIcon(chatFilter)} ${getAgentName(chatFilter)}` : '💬 전체 대화'}
                    </h2>
                    {chatFilter && <button onClick={() => setChatFilter(null)} className="text-[11px] px-2 py-1 rounded-lg"
                      style={{ background:'var(--bg2)',color:'var(--muted)',border:'1px solid var(--border)' }}>✕ 전체 보기</button>}
                  </div>
                  <div className="flex gap-2">
                    {selectedIds.size > 0 && <button onClick={deleteSelected} className="text-[12px] px-3 py-1.5 rounded-xl"
                      style={{ background:'var(--blush)',color:'#fff' }}>🗑️ 선택 삭제 ({selectedIds.size})</button>}
                    {logs.length > 0 && <button onClick={clearAllMessages} className="text-[12px] px-3 py-1.5 rounded-xl"
                      style={{ background:'var(--blush-l)',color:'var(--blush)',border:'1px solid var(--blush-b)' }}>전체 삭제</button>}
                  </div>
                </div>
                {(chatFilter ? logs.filter(l => l.agentId===chatFilter) : logs).length === 0 ? (
                  <div className="m-auto text-center py-20">
                    <div style={{ marginBottom:12 }}><RabbitEmoji size={48} /></div>
                    <p style={{ color:'var(--muted)',fontSize:14 }}>{chatFilter ? `${getAgentName(chatFilter)} 팀의 대화가 없어요` : '아직 대화 기록이 없어요'}</p>
                  </div>
                ) : (chatFilter ? logs.filter(l => l.agentId===chatFilter) : logs).slice().reverse().map(log =>
                    <LogCard key={log.id} log={log} selectable />
                  )}
              </div>
            </div>
          )}

          {page === 'saved' && (
            <div className="flex flex-1 overflow-hidden">
              <TeamSidebar logList={savedLogs} filter={savedFilter} setFilter={setSavedFilter} />
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <h2 className="text-[18px] font-semibold" style={{ color:'var(--text)' }}>
                    {savedFilter ? `${getIcon(savedFilter)} ${getAgentName(savedFilter)}` : '⭐ 전체 저장 자료'}
                  </h2>
                  {savedFilter && <button onClick={() => setSavedFilter(null)} className="text-[11px] px-2 py-1 rounded-lg"
                    style={{ background:'var(--bg2)',color:'var(--muted)',border:'1px solid var(--border)' }}>✕ 전체 보기</button>}
                </div>
                {(savedFilter ? savedLogs.filter(l => l.agentId===savedFilter) : savedLogs).length === 0 ? (
                  <div className="m-auto text-center py-20">
                    <div style={{ marginBottom:12 }}><RabbitEmoji size={48} /></div>
                    <p style={{ color:'var(--muted)',fontSize:14 }}>
                      {savedFilter ? `${getAgentName(savedFilter)} 팀의 저장 자료가 없어요` : '저장된 자료가 없어요'}
                    </p>
                    {!savedFilter && <p style={{ color:'var(--muted)',fontSize:12,marginTop:8 }}>팀 채팅에서 ⭐ 저장 버튼을 눌러보세요!</p>}
                  </div>
                ) : (savedFilter ? savedLogs.filter(l => l.agentId===savedFilter) : savedLogs).slice().reverse().map(log => (
                  <div key={log.id} className="p-4 rounded-2xl" style={{ background:'var(--card)',border:'1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ fontSize:14 }}>{getIcon(log.agentId)}</span>
                      <span className="text-[13px] font-medium" style={{ color:'var(--text)' }}>{getAgentName(log.agentId, log.agentName)}</span>
                      {log.modelName && <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                        style={{ background:'var(--blush-l)',color:'var(--blush)',border:'1px solid var(--blush-b)' }}>{shortModel(log.modelName)}</span>}
                      <span className="text-[10px] ml-auto" style={{ color:'var(--muted)' }}>{new Date(log.createdAt).toLocaleString('ko-KR')}</span>
                      <button onClick={() => deleteSaved(log.id)} className="text-[11px] px-2 py-1 rounded-lg"
                        style={{ background:'var(--blush-l)',color:'var(--blush)',border:'1px solid var(--blush-b)' }}>🗑️ 삭제</button>
                    </div>
                    <p className="text-[12px] mb-2 px-3 py-2 rounded-xl" style={{ background:'var(--blush-l)',color:'var(--blush)' }}>나 {log.userText}</p>
                    <p className="text-[12px] px-3 py-2 rounded-xl" style={{ background:'var(--bg2)',color:'var(--text2)',whiteSpace:'pre-wrap' }}>{cleanText(log.result)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-5 py-1.5 flex-shrink-0" style={{ background:'var(--card)',borderTop:'1px solid var(--border)' }}>
            <span className="text-[10px]" style={{ color:'var(--muted)' }}>✦ {STUDIO_NAME}</span>
          </div>
        </div>

        {/* ── 오른쪽 채팅 패널 ── */}
        <div className="flex flex-col overflow-hidden" style={{ background:'var(--blush-l)',borderLeft:'1px solid var(--blush-b)',height:'100%' }}>
          <div className="px-4 py-3.5 flex-shrink-0" style={{ background:'var(--sidebar)',borderBottom:'1px solid var(--sidebar-b)' }}>
            <div className="text-[14px] font-semibold" style={{ color:'#ffffff' }}>🎯 팀 커뮤니케이션</div>
            <div className="text-[11px] mt-0.5" style={{ color:'var(--blush-b)' }}>업무를 지시하고 결과를 확인해요</div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0">
            {messages.length === 0 && (
              <div className="m-auto text-center px-3">
                <div style={{ marginBottom:10 }}><RabbitEmoji size={40} /></div>
                <p className="text-[13px] font-medium mb-4" style={{ color:'var(--text)' }}>대표님, 무엇을 도와드릴까요? 🔥</p>
                {[
                  { e: '📊', t: '블로그 제목 5개 추천해줘' },
                  { e: '✍️', t: '@content 콘텐츠 기획해줘' },
                  { e: '📊', t: '@research AI 트렌드 분석해줘' },
                ].map((ex, i) => (
                  <button key={i} onClick={() => setInput(ex.t)}
                    className="w-full text-[12px] px-3 py-2.5 rounded-xl text-left mb-2"
                    style={{ background:'#fff',color:'var(--text2)',border:'1px solid var(--blush-b)' }}>{ex.e} {ex.t}</button>
                ))}
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id}>
                {msg.role === 'user' ? (
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-[10px]" style={{ color:'var(--muted)' }}>나 🔥 {msg.time}</div>
                    <div className="text-[13px] px-3.5 py-2.5 rounded-2xl rounded-tr-sm max-w-[90%] leading-relaxed"
                      style={{ background:'var(--blush)',color:'#fff' }}>{msg.text}</div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span style={{ fontSize:13 }}>{msg.agentId ? AGENT_ICONS[msg.agentId] : '⏳'}</span>
                      <span style={{ color:getAccent(msg.agentId),fontWeight:500 }}>{getAgentName(msg.agentId, msg.agentName)}</span>
                      {msg.modelName && <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                        style={{ background:'var(--blush-l)',color:'var(--blush)',border:'1px solid var(--blush-b)' }}>{shortModel(msg.modelName)}</span>}
                      <span className="ml-auto" style={{ color:'var(--muted)' }}>{msg.time}</span>
                    </div>
                    <div className="text-[13px] px-3.5 py-2.5 rounded-2xl rounded-tl-sm leading-relaxed"
                      style={{ background:'#fff',color:'var(--text)',border:`1.5px solid ${getAccent(msg.agentId)}40`,whiteSpace:'pre-wrap',wordBreak:'break-word' }}>
                      {msg.content ? cleanText(msg.content) : (
                        <span className="inline-flex gap-1 items-center">
                          {[0,1,2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{ background:'var(--blush-b)',animationDelay:`${i*0.15}s` }} />)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* @멘션 버튼 - 겉은 한국어, 채팅창엔 영문/한글 */}
          <div className="px-3 py-2 flex gap-1.5 flex-wrap flex-shrink-0"
            style={{ borderTop:'1px solid var(--blush-b)',background:'#fff' }}>
            {[
              { k: '@비서',       label: '@비서',       c: '#9060c0', bg:'rgba(144,96,192,0.1)', b:'rgba(144,96,192,0.3)' },
              { k: '@CoS',        label: '@총괄실장',   c: '#c06080', bg:'rgba(192,96,128,0.1)',  b:'rgba(192,96,128,0.3)' },
              { k: '@Strategy',   label: '@전략실장',   c: '#1d9e75', bg:'rgba(29,158,117,0.1)',  b:'rgba(29,158,117,0.3)' },
              { k: '@Content',    label: '@콘텐츠팀장', c: '#d85a30', bg:'rgba(216,90,48,0.1)',   b:'rgba(216,90,48,0.3)'  },
              { k: '@Revenue',    label: '@수익화팀장', c: '#ba7517', bg:'rgba(186,117,23,0.1)',  b:'rgba(186,117,23,0.3)' },
              { k: '@Automation', label: '@자동화팀장', c: '#378add', bg:'rgba(55,138,221,0.1)',  b:'rgba(55,138,221,0.3)' },
              { k: '@Data',       label: '@데이터팀장', c: '#3b6d11', bg:'rgba(59,109,17,0.1)',   b:'rgba(59,109,17,0.3)'  },
            ].map(({ k, label, c, bg, b }) => (
              <button key={k} onClick={() => setInput(v => v + k + ' ')}
                className="text-[10px] px-2.5 py-1 rounded-full"
                style={{ background:bg, color:c, border:`1px solid ${b}` }}>{label}</button>
            ))}
          </div>

          {/* 입력창 */}
          <div className="p-3 flex gap-2 flex-shrink-0" style={{ background:'#fff',borderTop:'1px solid var(--blush-b)' }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendMessage()}
              disabled={loading}
              placeholder={loading ? '⏳ 작업 중...' : '업무를 지시해보세요!'}
              className="flex-1 px-4 py-2.5 text-[13px] outline-none rounded-full"
              style={{ background:'var(--blush-l)',border:'1.5px solid var(--blush-b)',color:'var(--text)' }} />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full"
              style={{ background:loading||!input.trim()?'var(--bg2)':'var(--blush)',color:loading||!input.trim()?'var(--muted)':'#fff' }}>↑</button>
          </div>
        </div>

      </div>
    </div>
  )
}
