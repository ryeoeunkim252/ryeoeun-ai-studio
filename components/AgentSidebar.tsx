'use client'

import { AGENTS, type AgentId } from '@/lib/agents'

interface AgentSidebarProps {
  activeAgentId?: AgentId | null
  onSelectAgent: (id: AgentId) => void
}

const NAV_ITEMS = [
  { icon: '🏠', label: '대시보드' },
  { icon: '🏢', label: 'AI 오피스', active: true },
  { icon: '📋', label: '작업 관리' },
  { icon: '💬', label: '팀 채팅' },
  { icon: '⚙️', label: '설정' },
]

const AGENT_ICONS: Record<string, string> = {
  router: '🔀', web: '🌐', content: '✍️', edu: '📚', research: '🔬', ops: '🚀'
}

export default function AgentSidebar({ activeAgentId, onSelectAgent }: AgentSidebarProps) {
  return (
    <aside className="flex flex-col overflow-hidden" style={{
      background: '#1a1030',
      borderRight: '2px solid #3d2458',
      fontFamily: "'Jua', sans-serif"
    }}>
      {/* 로고 */}
      <div className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
        style={{ background: '#2a1845', borderBottom: '2px solid #3d2458' }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
          style={{ background: 'linear-gradient(135deg, #ff9eb5, #c9a0dc)' }}>🐰</div>
        <span className="text-[11px]" style={{ color: '#f0c4ff' }}>NK AI Studio</span>
      </div>

      {/* 네비게이션 */}
      <nav className="py-2 flex-shrink-0">
        {NAV_ITEMS.map(item => (
          <div key={item.label}
            className="px-3 py-2 flex items-center gap-2 cursor-pointer transition-all text-[10px] mx-2 rounded-xl mb-0.5"
            style={{
              background: item.active ? 'linear-gradient(90deg, #4a1d6a22, #c9a0dc22)' : 'transparent',
              color: item.active ? '#e0aaff' : '#7a5a9a',
              border: item.active ? '1.5px solid #6d3d88' : '1.5px solid transparent',
            }}>
            <span>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>

      {/* 구분선 */}
      <div className="mx-3 my-1 h-px rounded" style={{ background: '#3d2458' }} />

      {/* AI 에이전트 목록 */}
      <div className="px-3 py-1 text-[8px] tracking-widest" style={{ color: '#6d4d8a' }}>
        🤖 AI 에이전트
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {AGENTS.map(agent => {
          const isActive = activeAgentId === agent.id
          return (
            <div key={agent.id} onClick={() => onSelectAgent(agent.id)}
              className="px-3 py-2 flex items-center gap-2 cursor-pointer transition-all rounded-xl mb-1 text-[10px]"
              style={{
                background: isActive ? `${agent.color}22` : 'transparent',
                border: isActive ? `1.5px solid ${agent.color}88` : '1.5px solid transparent',
                color: isActive ? '#f0d4ff' : '#8a6aaa',
              }}>
              {/* 아이콘 */}
              <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0"
                style={{ background: isActive ? `${agent.color}44` : '#2a1845' }}>
                {AGENT_ICONS[agent.id]}
              </div>
              <span>{agent.name}</span>
              {/* 상태 점 */}
              <div className="ml-auto flex items-center gap-1">
                {isActive && <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: agent.color }} />}
                <span className="text-[7px]" style={{ color: isActive ? '#a0e0a0' : '#4a3a5a' }}>
                  {isActive ? '작업중' : '대기'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 하단 상태 */}
      <div className="px-3 py-2 flex-shrink-0" style={{ borderTop: '2px solid #3d2458' }}>
        <div className="rounded-xl px-3 py-2 text-[8px]" style={{ background: '#2a1845', color: '#8a6aaa' }}>
          <div className="flex justify-between mb-1">
            <span>🤖 모델</span>
            <span style={{ color: '#c9a0dc' }}>claude-sonnet</span>
          </div>
          <div className="flex justify-between">
            <span>💚 상태</span>
            <span style={{ color: '#a0e0a0' }}>정상</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
