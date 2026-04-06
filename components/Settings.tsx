'use client'
import { useEffect, useState } from 'react'
import { loadData, saveData, DEFAULT_SETTINGS, type AppSettings } from '@/lib/store'

const DEFAULT_AIDS = ['router', 'web', 'content', 'edu', 'research', 'ops']
const DEFAULT_ICONS: Record<string, string> = { router: '🔀', web: '🌐', content: '✍️', edu: '📚', research: '🔬', ops: '🚀' }
const DEFAULT_ROLES: Record<string, string> = { router: '총괄 조정', web: '웹 개발/디자인', content: '콘텐츠 제작', edu: '교육 프로그램', research: '시장 조사/분석', ops: '인프라/운영' }
const DEFAULT_DESC: Record<string, string> = { router: '업무를 자동으로 배분하고 전체 흐름을 관리해요', web: 'Next.js · Tailwind · Figma로 웹을 만들어요', content: '블로그·SNS·이메일 콘텐츠를 제작해요', edu: '교육 자료와 학습 프로그램을 만들어요', research: '시장 분석과 데이터 조사를 수행해요', ops: 'Vercel 배포·서버·자동화를 담당해요' }
const ICON_OPTIONS = ['🎨','🌐','✍️','📚','🔬','🚀','🤖','🎯','📊','⭐','🔧','💡','🏆','⏳','🎪','🌟','🦄','🐙']
const MODELS = [
  { id: 'claude-opus-4-5', label: 'Claude Opus', desc: '최고 성능. 복잡한 분석, 창의적 작업', color: '#b45309' },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet', desc: '균형잡힌 성능. 일반 업무, 문서 작성', color: '#6d28d9' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku', desc: '빠른 응답. 간단한 질문, 분류', color: '#065f46' },
  { id: 'gemini-pro', label: 'Gemini Pro', desc: '구글 데이터 처리, 멀티모달 분석', color: '#1d4ed8' },
  { id: 'grok', label: 'Grok', desc: '최신 정보 분석, 실시간 트렌드', color: '#0369a1' },
]
const MCPS = [
  { id: 'figma', icon: '🎨', name: 'Figma', desc: '디자인 작업, 컴포넌트 생성', defaultTeams: ['web'] },
  { id: 'notion', icon: '📝', name: 'Notion', desc: '문서 관리, 데이터베이스', defaultTeams: ['edu', 'ops'] },
  { id: 'vercel', icon: '▲', name: 'Vercel', desc: '배포, 도메인 관리', defaultTeams: ['web', 'ops'] },
  { id: 'github', icon: '🐙', name: 'GitHub', desc: '코드 관리, PR 리뷰', defaultTeams: ['web'] },
  { id: 'gmail', icon: '📧', name: 'Gmail', desc: '이메일 발송 및 관리', defaultTeams: ['ops'] },
  { id: 'n8n', icon: '⚡', name: 'n8n', desc: '워크플로우 자동화', defaultTeams: ['ops'] },
  { id: 'slack', icon: '💬', name: 'Slack', desc: '팀 메시지, 알림 전송', defaultTeams: ['ops', 'router'] },
  { id: 'google-drive', icon: '📁', name: 'Google Drive', desc: '파일 저장·공유, 문서 관리', defaultTeams: ['edu', 'content'] },
  { id: 'google-calendar', icon: '📅', name: 'Google Calendar', desc: '일정 관리, 미팅 예약', defaultTeams: ['ops'] },
  { id: 'jira', icon: '🎯', name: 'Jira', desc: '프로젝트 관리, 스프린트 관리', defaultTeams: ['web', 'ops'] },
  { id: 'airtable', icon: '📊', name: 'Airtable', desc: '데이터 관리, 스프레드시트 자동화', defaultTeams: ['research'] },
  { id: 'zapier', icon: '🔗', name: 'Zapier', desc: '앱 연동, 자동화 워크플로우', defaultTeams: ['ops'] },
  { id: 'hubspot', icon: '🏢', name: 'HubSpot', desc: 'CRM, 마케팅 자동화', defaultTeams: ['content', 'ops'] },
  { id: 'youtube', icon: '▶️', name: 'YouTube', desc: '영상 분석, 트렌드 리서치', defaultTeams: ['research', 'content'] },
]

// ── 네비게이션 메뉴 기본 정의 ──────────────────────────────────
const DEFAULT_NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: '대시보드' },
  { id: 'office',    icon: '🏢', label: 'AI 오피스' },
  { id: 'tasks',     icon: '📋', label: '작업 관리' },
  { id: 'chat',      icon: '💬', label: '팀 채팅' },
  { id: 'saved',     icon: '⭐', label: '저장 자료' },
  { id: 'settings',  icon: '⚙️', label: '설정' },
  { id: 'command',   icon: '👑', label: '본부' },
]

type CustomTeam = { id: string; icon: string; name: string; role: string; desc: string }

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [teamModels, setTeamModels] = useState<Record<string, string>>({})
  const [teamEnabled, setTeamEnabled] = useState<Record<string, boolean>>({})
  const [mcpEnabled, setMcpEnabled] = useState<Record<string, boolean>>({})
  const [mcpTeams, setMcpTeams] = useState<Record<string, string[]>>({})
  const [customTeams, setCustomTeams] = useState<CustomTeam[]>([])
  const [saved, setSaved] = useState(false)
  const [editingMcp, setEditingMcp] = useState<string | null>(null)
  const [teamRoles, setTeamRoles] = useState<Record<string, string>>({})
  const [teamDescs, setTeamDescs] = useState<Record<string, string>>({})
  const [teamOrder, setTeamOrder] = useState<string[]>([])
  const [editingTeam, setEditingTeam] = useState<string | null>(null)
  const [showAddMcp, setShowAddMcp] = useState(false)
  const [newMcpName, setNewMcpName] = useState('')
  const [newMcpUrl, setNewMcpUrl] = useState('')
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamRole, setNewTeamRole] = useState('')
  const [newTeamDesc, setNewTeamDesc] = useState('')
  const [newTeamIcon, setNewTeamIcon] = useState('🤖')
  const [newTeamModel, setNewTeamModel] = useState('claude-sonnet-4-5')

  // ── 네비게이션 순서 상태 ──────────────────────────────────────
  const [navOrder, setNavOrder] = useState<string[]>(DEFAULT_NAV_ITEMS.map(n => n.id))

  useEffect(() => {
    const s = loadData<AppSettings>('nk_settings', DEFAULT_SETTINGS)
    setSettings(s)
    setTeamModels(loadData('nk_team_models', { router: 'claude-haiku-4-5-20251001', web: 'claude-opus-4-5', content: 'claude-sonnet-4-5', edu: 'claude-sonnet-4-5', research: 'claude-sonnet-4-5', ops: 'claude-sonnet-4-5' }))
    setTeamEnabled(loadData('nk_team_enabled', { router: true, web: true, content: true, edu: true, research: true, ops: true }))
    setMcpEnabled(loadData('nk_mcp', {}))
    const savedMcpTeams = loadData<Record<string, string[]>>('nk_mcp_teams', {})
    const initMcp: Record<string, string[]> = {}
    MCPS.forEach(mcp => { initMcp[mcp.id] = savedMcpTeams[mcp.id] ?? mcp.defaultTeams })
    setMcpTeams(initMcp)
    const cts = loadData<CustomTeam[]>('nk_custom_teams', [])
    setCustomTeams(cts)
    setTeamRoles(loadData('nk_team_roles', {}))
    setTeamDescs(loadData('nk_team_descs', {}))
    const savedOrder = loadData<string[]>('nk_team_order', [])
    if (savedOrder.length > 0) setTeamOrder(savedOrder)
    else setTeamOrder([...DEFAULT_AIDS, ...cts.map(t => t.id)])

    // 네비게이션 순서 로드
    const savedNavOrder = loadData<string[]>('nk_nav_order', [])
    if (savedNavOrder.length > 0) {
      // 저장된 순서에 없는 새 항목(예: 나중에 추가된 메뉴)은 뒤에 붙이기
      const allNavIds = DEFAULT_NAV_ITEMS.map(n => n.id)
      const merged = [
        ...savedNavOrder.filter(id => allNavIds.includes(id)),
        ...allNavIds.filter(id => !savedNavOrder.includes(id)),
      ]
      setNavOrder(merged)
    }
  }, [])

  const allIds = teamOrder.length > 0
    ? teamOrder.filter(id => [...DEFAULT_AIDS, ...customTeams.map(t => t.id)].includes(id))
        .concat([...DEFAULT_AIDS, ...customTeams.map(t => t.id)].filter(id => !teamOrder.includes(id)))
    : [...DEFAULT_AIDS, ...customTeams.map(t => t.id)]

  const getIcon = (id: string) => DEFAULT_ICONS[id] || customTeams.find(t => t.id === id)?.icon || '🤖'
  const getName = (id: string) => settings.agentNames[id] || customTeams.find(t => t.id === id)?.name || id
  const getRole = (id: string) => teamRoles[id] || DEFAULT_ROLES[id] || customTeams.find(t => t.id === id)?.role || ''
  const getDesc = (id: string) => teamDescs[id] || DEFAULT_DESC[id] || customTeams.find(t => t.id === id)?.desc || ''
  const activeTeams = allIds.filter(id => teamEnabled[id] !== false).length

  const updateName = (id: string, name: string) => setSettings(prev => ({ ...prev, agentNames: { ...prev.agentNames, [id]: name } }))
  const updateRole = (id: string, role: string) => setTeamRoles(prev => ({ ...prev, [id]: role }))
  const updateDesc = (id: string, desc: string) => setTeamDescs(prev => ({ ...prev, [id]: desc }))

  // AI 팀 순서 변경
  const moveUp = (id: string) => {
    setTeamOrder(prev => { const arr = [...prev]; const i = arr.indexOf(id); if (i > 0) { [arr[i-1], arr[i]] = [arr[i], arr[i-1]] } return arr })
  }
  const moveDown = (id: string) => {
    setTeamOrder(prev => { const arr = [...prev]; const i = arr.indexOf(id); if (i < arr.length - 1) { [arr[i], arr[i+1]] = [arr[i+1], arr[i]] } return arr })
  }

  // ── 네비게이션 순서 변경 함수 ────────────────────────────────
  const moveNavUp = (id: string) => {
    setNavOrder(prev => {
      const arr = [...prev]
      const i = arr.indexOf(id)
      if (i > 0) { [arr[i-1], arr[i]] = [arr[i], arr[i-1]] }
      return arr
    })
  }
  const moveNavDown = (id: string) => {
    setNavOrder(prev => {
      const arr = [...prev]
      const i = arr.indexOf(id)
      if (i < arr.length - 1) { [arr[i], arr[i+1]] = [arr[i+1], arr[i]] }
      return arr
    })
  }
  const resetNavOrder = () => {
    setNavOrder(DEFAULT_NAV_ITEMS.map(n => n.id))
  }

  const toggleMcpTeam = (mcpId: string, teamId: string) => {
    setMcpTeams(prev => {
      const current = prev[mcpId] || []
      const updated = current.includes(teamId) ? current.filter(t => t !== teamId) : [...current, teamId]
      return { ...prev, [mcpId]: updated }
    })
  }

  const addTeam = () => {
    if (!newTeamName.trim()) return
    const id = 'custom_' + Date.now()
    const team: CustomTeam = { id, icon: newTeamIcon, name: newTeamName, role: newTeamRole || '커스텀 팀', desc: newTeamDesc }
    setCustomTeams(prev => [...prev, team])
    setTeamModels(prev => ({ ...prev, [id]: newTeamModel }))
    setTeamEnabled(prev => ({ ...prev, [id]: true }))
    setTeamOrder(prev => [...prev, id])
    setSettings(prev => ({ ...prev, agentNames: { ...prev.agentNames, [id]: newTeamName } }))
    setShowAddTeam(false); setNewTeamName(''); setNewTeamRole(''); setNewTeamDesc(''); setNewTeamIcon('🤖')
  }

  const removeCustomTeam = (id: string) => {
    setCustomTeams(prev => prev.filter(t => t.id !== id))
    setTeamModels(prev => { const n = { ...prev }; delete n[id]; return n })
    setTeamEnabled(prev => { const n = { ...prev }; delete n[id]; return n })
    setTeamOrder(prev => prev.filter(x => x !== id))
  }

  const saveAll = () => {
    saveData('nk_settings', settings)
    saveData('nk_team_models', teamModels)
    saveData('nk_team_enabled', teamEnabled)
    saveData('nk_mcp', mcpEnabled)
    saveData('nk_mcp_teams', mcpTeams)
    saveData('nk_custom_teams', customTeams)
    saveData('nk_team_roles', teamRoles)
    saveData('nk_team_descs', teamDescs)
    saveData('nk_team_order', allIds)
    saveData('nk_nav_order', navOrder)   // ← 네비게이션 순서 저장
    setSaved(true)
    setTimeout(() => { setSaved(false); window.location.reload() }, 1500)
  }

  // 현재 navOrder 기준으로 정렬된 nav 항목들
  const sortedNavItems = navOrder
    .map(id => DEFAULT_NAV_ITEMS.find(n => n.id === id))
    .filter(Boolean) as typeof DEFAULT_NAV_ITEMS

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <div>
          <h2 className="text-[22px] font-semibold mb-1" style={{ color: 'var(--text)' }}>⚙️ 설정</h2>
          <p className="text-[13px]" style={{ color: 'var(--muted)' }}>AI 팀 구성과 도구 연결을 관리해요</p>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* ✅ 네비게이션 메뉴 순서 섹션 (NEW)                       */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>📌 메뉴 순서 변경</h3>
            <button
              onClick={resetNavOrder}
              className="text-[11px] px-3 py-1 rounded-lg"
              style={{ background: 'var(--bg2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              초기화
            </button>
          </div>
          <p className="text-[12px] mb-4" style={{ color: 'var(--muted)' }}>
            왼쪽 사이드바 메뉴의 순서를 ↑↓ 버튼으로 바꿀 수 있어요
          </p>

          <div className="flex flex-col gap-2">
            {sortedNavItems.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
              >
                {/* 순서 번호 */}
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--blush)', color: '#fff',
                  fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {idx + 1}
                </span>

                {/* 아이콘 + 이름 */}
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                  {item.label}
                </span>

                {/* ↑↓ 버튼 */}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => moveNavUp(item.id)}
                    disabled={idx === 0}
                    style={{
                      width: 28, height: 28, borderRadius: 7, border: 'none',
                      background: idx === 0 ? 'var(--border)' : 'var(--blush)',
                      color: idx === 0 ? 'var(--muted)' : '#fff',
                      fontSize: 12, cursor: idx === 0 ? 'not-allowed' : 'pointer',
                      opacity: idx === 0 ? 0.4 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >▲</button>
                  <button
                    onClick={() => moveNavDown(item.id)}
                    disabled={idx === sortedNavItems.length - 1}
                    style={{
                      width: 28, height: 28, borderRadius: 7, border: 'none',
                      background: idx === sortedNavItems.length - 1 ? 'var(--border)' : 'var(--blush)',
                      color: idx === sortedNavItems.length - 1 ? 'var(--muted)' : '#fff',
                      fontSize: 12, cursor: idx === sortedNavItems.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: idx === sortedNavItems.length - 1 ? 0.4 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >▼</button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] mt-3 px-3 py-2 rounded-xl" style={{ background: 'var(--blush-l)', color: 'var(--blush)' }}>
            💡 변경 후 아래 저장 버튼을 누르면 사이드바 순서가 바뀌어요!
          </p>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* 팀별 AI 모델 설정 (기존)                                  */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>🤖 팀별 AI 모델 설정</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg2)', color: 'var(--muted)' }}>
              {activeTeams}/{allIds.length} 활성
            </span>
          </div>
          <p className="text-[12px] mb-2" style={{ color: 'var(--muted)' }}>
            팀 이름·역할·설명 수정 / ↑↓ 순서 변경 / AI 모델 선택
          </p>
          {/* 모델 범례 */}
          <div className="flex flex-col gap-1 mb-4 p-3 rounded-xl" style={{ background: 'var(--bg2)' }}>
            <p className="text-[11px] font-semibold mb-1" style={{ color: 'var(--muted)' }}>모델별 특징</p>
            {MODELS.map(m => (
              <div key={m.id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                <span className="text-[11px] font-medium flex-shrink-0" style={{ color: 'var(--text)', minWidth: 105 }}>{m.label}</span>
                <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{m.desc}</span>
              </div>
            ))}
          </div>
          {/* 팀 목록 */}
          <div className="flex flex-col gap-2">
            {allIds.map((id, idx) => {
              const currentModel = MODELS.find(m => m.id === (teamModels[id] || 'claude-sonnet-4-5'))
              const isCustom = id.startsWith('custom_')
              const isEditing = editingTeam === id
              return (
                <div key={id} className="rounded-xl p-3" style={{ background: 'var(--bg2)', opacity: teamEnabled[id] === false ? 0.45 : 1, transition: 'opacity .2s' }}>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTeamEnabled(prev => ({ ...prev, [id]: prev[id] === false }))}
                      className="w-9 h-5 rounded-full relative flex-shrink-0"
                      style={{ background: teamEnabled[id] !== false ? 'var(--olive)' : 'var(--border)', transition: 'background .2s' }}>
                      <div className="w-4 h-4 rounded-full absolute top-0.5 bg-white shadow-sm" style={{ left: teamEnabled[id] !== false ? '20px' : '2px', transition: 'left .2s' }} />
                    </button>
                    <span style={{ fontSize: 16, width: 22, flexShrink: 0 }}>{getIcon(id)}</span>
                    <div className="flex-1 min-w-0">
                      <input value={getName(id)} onChange={e => updateName(id, e.target.value)}
                        className="w-full px-2 py-1 rounded-lg text-[12px] font-medium outline-none"
                        style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                      <div className="mt-1 flex flex-col gap-0.5">
                        <input value={getRole(id)} onChange={e => updateRole(id, e.target.value)} placeholder="역할 (예: 웹 개발/디자인)"
                          className="w-full px-2 py-0.5 rounded text-[10px] font-medium outline-none"
                          style={{ background: 'transparent', border: '1px solid transparent', color: 'var(--blush)', borderColor: 'transparent' }}
                          onFocus={e => (e.target.style.borderColor = 'var(--blush)')} onBlur={e => (e.target.style.borderColor = 'transparent')} />
                        <input value={getDesc(id)} onChange={e => updateDesc(id, e.target.value)} placeholder="설명 (예: Next.js로 웹을 만들어요)"
                          className="w-full px-2 py-0.5 rounded text-[10px] outline-none"
                          style={{ background: 'transparent', border: '1px solid transparent', color: 'var(--muted)', borderColor: 'transparent' }}
                          onFocus={e => (e.target.style.borderColor = 'var(--border)')} onBlur={e => (e.target.style.borderColor = 'transparent')} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className="w-2 h-2 rounded-full" style={{ background: currentModel?.color || '#888' }} />
                      <select value={teamModels[id] || 'claude-sonnet-4-5'} onChange={e => setTeamModels(prev => ({ ...prev, [id]: e.target.value }))}
                        disabled={teamEnabled[id] === false}
                        className="px-2 py-1 rounded-lg text-[11px] outline-none"
                        style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', maxWidth: 120 }}>
                        {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button onClick={() => moveUp(id)} disabled={idx === 0}
                        className="w-5 h-4 rounded text-[9px] flex items-center justify-center leading-none"
                        style={{ background: idx===0?'var(--border)':'var(--blush)', color: idx===0?'var(--muted)':'#fff', opacity: idx===0?0.4:1 }}>▲</button>
                      <button onClick={() => moveDown(id)} disabled={idx === allIds.length - 1}
                        className="w-5 h-4 rounded text-[9px] flex items-center justify-center leading-none"
                        style={{ background: idx===allIds.length-1?'var(--border)':'var(--blush)', color: idx===allIds.length-1?'var(--muted)':'#fff', opacity: idx===allIds.length-1?0.4:1 }}>▼</button>
                    </div>
                    <button onClick={() => setEditingTeam(isEditing ? null : id)}
                      className="text-[11px] px-2 py-1 rounded-lg flex-shrink-0"
                      style={{ background: isEditing ? 'var(--blush)' : 'var(--border)', color: isEditing ? '#fff' : 'var(--muted)' }}>
                      {isEditing ? '✓ 완료' : '✏️'}
                    </button>
                    {isCustom && (
                      <button onClick={() => removeCustomTeam(id)} className="text-[16px] flex-shrink-0" style={{ color: 'var(--muted)' }}>×</button>
                    )}
                  </div>
                  {isEditing && (
                    <div className="mt-2 pt-2 flex flex-col gap-1.5" style={{ borderTop: '1px solid var(--border)' }}>
                      <p className="text-[10px] px-1" style={{ color: 'var(--muted)' }}>💡 위 역할·설명 칸을 클릭해서 바로 수정할 수 있어요!</p>
                      <div className="text-[10px] px-2 py-1.5 rounded-lg" style={{ background: 'var(--blush-l)', color: 'var(--blush)' }}>
                        👁️ <strong>{getName(id)}</strong> · {getRole(id)} — {getDesc(id)}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {/* 팀 추가 폼 */}
          {showAddTeam && (
            <div className="rounded-xl p-4 mt-3 flex flex-col gap-2" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
              <p className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>새 팀 추가</p>
              <div className="flex flex-wrap gap-1.5">
                {ICON_OPTIONS.map(ic => (
                  <button key={ic} onClick={() => setNewTeamIcon(ic)} className="w-8 h-8 rounded-lg text-[16px] flex items-center justify-center"
                    style={{ background: newTeamIcon === ic ? 'var(--blush)' : 'var(--card)', border: '1px solid var(--border)' }}>{ic}</button>
                ))}
              </div>
              <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="팀 이름 (예: 디자인 팀)"
                className="px-3 py-2 rounded-xl text-[12px] outline-none" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              <input value={newTeamRole} onChange={e => setNewTeamRole(e.target.value)} placeholder="역할 (예: UI/UX 디자인)"
                className="px-3 py-2 rounded-xl text-[12px] outline-none" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              <input value={newTeamDesc} onChange={e => setNewTeamDesc(e.target.value)} placeholder="팀 설명 (예: Figma로 디자인하고 코드로 구현해요)"
                className="px-3 py-2 rounded-xl text-[12px] outline-none" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              <select value={newTeamModel} onChange={e => setNewTeamModel(e.target.value)}
                className="px-3 py-2 rounded-xl text-[12px] outline-none" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                {MODELS.map(m => <option key={m.id} value={m.id}>{m.label} — {m.desc}</option>)}
              </select>
              <div className="flex gap-2 mt-1">
                <button onClick={() => { setShowAddTeam(false); setNewTeamName('') }} className="flex-1 py-2 rounded-xl text-[12px]" style={{ background: 'var(--border)', color: 'var(--muted)' }}>취소</button>
                <button onClick={addTeam} className="flex-1 py-2 rounded-xl text-[12px]" style={{ background: 'var(--blush)', color: '#fff' }}>+ 추가</button>
              </div>
            </div>
          )}
          {!showAddTeam && (
            <button onClick={() => setShowAddTeam(true)} className="w-full mt-3 py-2.5 rounded-xl text-[13px] flex items-center justify-center gap-2"
              style={{ background: 'var(--bg2)', color: 'var(--muted)', border: '1.5px dashed var(--border)' }}>
              + 새 팀 추가
            </button>
          )}
        </div>

        {/* MCP 도구 연결 */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>🔌 MCP 도구 연결</h3>
            <button onClick={() => setShowAddMcp(!showAddMcp)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px]" style={{ background: 'var(--blush)', color: '#fff' }}>+ 서버 추가</button>
          </div>
          <p className="text-[12px] mb-1" style={{ color: 'var(--muted)' }}>AI 팀이 사용할 외부 도구 · 토글로 ON/OFF</p>
          <p className="text-[11px] mb-4 px-3 py-2 rounded-xl" style={{ background: 'var(--blush-l)', color: 'var(--blush)' }}>
            💡 ✏️ 버튼을 클릭해서 각 도구의 담당 팀을 추가/제거할 수 있어요!
          </p>
          {showAddMcp && (
            <div className="rounded-xl p-4 mb-4 flex flex-col gap-2" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
              <p className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>새 MCP 서버 추가</p>
              <input value={newMcpName} onChange={e => setNewMcpName(e.target.value)} placeholder="서버 이름 (예: My Tool)"
                className="px-3 py-2 rounded-xl text-[12px] outline-none" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              <input value={newMcpUrl} onChange={e => setNewMcpUrl(e.target.value)} placeholder="서버 URL (예: https://mcp.example.com/sse)"
                className="px-3 py-2 rounded-xl text-[12px] outline-none" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'monospace' }} />
              <div className="flex gap-2">
                <button onClick={() => { setShowAddMcp(false); setNewMcpName(''); setNewMcpUrl('') }} className="flex-1 py-2 rounded-xl text-[12px]" style={{ background: 'var(--border)', color: 'var(--muted)' }}>취소</button>
                <button onClick={() => { setShowAddMcp(false); setNewMcpName(''); setNewMcpUrl('') }} className="flex-1 py-2 rounded-xl text-[12px]" style={{ background: 'var(--blush)', color: '#fff' }}>추가</button>
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {MCPS.map(tool => {
              const isOn = mcpEnabled[tool.id]
              const assignedTeams = mcpTeams[tool.id] || tool.defaultTeams
              const isEdit = editingMcp === tool.id
              return (
                <div key={tool.id} className="rounded-xl p-3 flex flex-col"
                  style={{ background: 'var(--bg2)', border: `1.5px solid ${isOn ? 'var(--olive-b, #86c068)' : 'var(--border)'}`, minHeight: 130 }}>
                  <div className="flex items-start justify-between mb-1.5">
                    <span style={{ fontSize: 22 }}>{tool.icon}</span>
                    <button onClick={() => setMcpEnabled(prev => ({ ...prev, [tool.id]: !prev[tool.id] }))}
                      className="w-9 h-5 rounded-full relative flex-shrink-0 mt-0.5"
                      style={{ background: isOn ? 'var(--olive)' : 'var(--border)', transition: 'background .2s' }}>
                      <div className="w-4 h-4 rounded-full absolute top-0.5 bg-white shadow-sm" style={{ left: isOn ? '18px' : '2px', transition: 'left .2s' }} />
                    </button>
                  </div>
                  <p className="text-[12px] font-semibold leading-tight" style={{ color: 'var(--text)' }}>{tool.name}</p>
                  <p className="text-[10px] mt-0.5 leading-tight flex-1" style={{ color: 'var(--muted)' }}>{tool.desc}</p>
                  <div className="mt-1.5">
                    {isEdit ? (
                      <div className="flex flex-col gap-1">
                        <p className="text-[9px]" style={{ color: 'var(--muted)' }}>담당 팀:</p>
                        <div className="flex flex-wrap gap-1">
                          {allIds.map(tid => {
                            const assigned = assignedTeams.includes(tid)
                            return (
                              <button key={tid} onClick={() => toggleMcpTeam(tool.id, tid)} className="text-[8px] px-1.5 py-0.5 rounded-full"
                                style={{ background: assigned ? 'var(--blush)' : 'var(--border)', color: assigned ? '#fff' : 'var(--muted)' }}>
                                {getName(tid)}
                              </button>
                            )
                          })}
                        </div>
                        <button onClick={() => setEditingMcp(null)} className="text-[9px] mt-0.5 py-0.5 rounded-lg w-full"
                          style={{ background: 'var(--olive-l, #e6f4dc)', color: 'var(--olive)' }}>✓ 완료</button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 items-center">
                        {assignedTeams.slice(0, 2).map(tid => (
                          <span key={tid} className="text-[8px] px-1.5 py-0.5 rounded-full"
                            style={{ background: 'var(--blush-l)', color: 'var(--blush)', border: '1px solid var(--blush-b, #f9a8cc)' }}>
                            {getName(tid)}
                          </span>
                        ))}
                        {assignedTeams.length > 2 && <span className="text-[8px]" style={{ color: 'var(--muted)' }}>+{assignedTeams.length - 2}</span>}
                        <button onClick={() => setEditingMcp(tool.id)} className="text-[9px] px-1 py-0.5 rounded ml-auto" style={{ color: 'var(--muted)' }}>✏️</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 저장 버튼 */}
        <button onClick={saveAll} className="w-full py-3.5 rounded-2xl text-[15px] font-medium"
          style={{ background: saved ? 'var(--olive)' : 'var(--blush)', color: '#fff', transition: 'background .3s' }}>
          {saved ? '✅ 저장됐어요!' : '💾 설정 저장'}
        </button>
      </div>
    </div>
  )
}
