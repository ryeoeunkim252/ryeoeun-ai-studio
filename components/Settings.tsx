'use client'
import { useEffect, useState } from 'react'
import { loadData, saveData, DEFAULT_SETTINGS, type AppSettings } from '@/lib/store'

const AIDS = ['router', 'web', 'content', 'edu', 'research', 'ops']
const AICONS: Record<string, string> = { router: '🔀', web: '🌐', content: '✍️', edu: '📚', research: '🔬', ops: '🚀' }
const AROLES: Record<string, string> = { router: '총괄 조정', web: '웹 개발/디자인', content: '콘텐츠 제작', edu: '교육 프로그램', research: '시장 조사/분석', ops: '인프라/운영' }
const ADESC: Record<string, string> = {
  router: '각 팀에 작업을 배분하고 전체 흐름을 조율해요',
  web: 'Next.js · Tailwind · Figma로 웹을 만들어요',
  content: '블로그·SNS·마케팅 글을 작성해요',
  edu: '교육 자료와 커리큘럼을 설계해요',
  research: '시장 트렌드와 경쟁사를 분석해요',
  ops: 'Vercel 배포·서버·자동화를 담당해요',
}

const MODELS = [
  { id: 'claude-opus-4-5', label: 'Claude Opus', desc: '최고 성능. 복잡한 분석, 전략 수립, 긴 문서 작성', color: '#b45309' },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet', desc: '균형잡힌 성능. 카피라이팅, 커리큘럼, 문서 작성', color: '#6d28d9' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku', desc: '빠른 응답. 분류, 요약, 간단한 작업', color: '#065f46' },
  { id: 'gemini-pro', label: 'Gemini Pro', desc: '대량 데이터 처리, 멀티모달 분석', color: '#1d4ed8' },
  { id: 'grok', label: 'Grok', desc: '실시간 트렌드, 소셜 미디어 분석', color: '#0369a1' },
]

const MCPS = [
  { id: 'figma', icon: '🎨', name: 'Figma', desc: '디자인 작업, 컴포넌트 생성', teams: ['웹 팀'] },
  { id: 'notion', icon: '📝', name: 'Notion', desc: '문서 관리, 데이터베이스', teams: ['교육 팀', '운영 팀'] },
  { id: 'vercel', icon: '▲', name: 'Vercel', desc: '배포, 도메인 관리', teams: ['웹 팀', '운영 팀'] },
  { id: 'github', icon: '🐙', name: 'GitHub', desc: '코드 관리, PR 리뷰', teams: ['웹 팀'] },
  { id: 'gmail', icon: '📧', name: 'Gmail', desc: '이메일 발송 및 관리', teams: ['운영 팀'] },
  { id: 'n8n', icon: '⚡', name: 'n8n', desc: '워크플로우 자동화', teams: ['운영 팀'] },
  { id: 'slack', icon: '💬', name: 'Slack', desc: '팀 메시지, 알림 전송', teams: ['운영 팀', '총괄'] },
  { id: 'google-drive', icon: '📁', name: 'Google Drive', desc: '파일 저장, 공유, 문서 관리', teams: ['교육 팀', '콘텐츠 팀'] },
  { id: 'google-calendar', icon: '📅', name: 'Google Calendar', desc: '일정 관리, 미팅 예약', teams: ['운영 팀'] },
  { id: 'jira', icon: '🎯', name: 'Jira', desc: '프로젝트 이슈, 스프린트 관리', teams: ['웹 팀', '운영 팀'] },
  { id: 'airtable', icon: '🗄️', name: 'Airtable', desc: '데이터 정리, 스프레드시트 자동화', teams: ['연구 팀'] },
  { id: 'zapier', icon: '🔗', name: 'Zapier', desc: '앱 연동, 자동화 트리거', teams: ['운영 팀'] },
  { id: 'hubspot', icon: '🏢', name: 'HubSpot', desc: 'CRM, 마케팅 자동화', teams: ['콘텐츠 팀', '운영 팀'] },
  { id: 'youtube', icon: '▶️', name: 'YouTube', desc: '영상 분석, 트렌드 리서치', teams: ['연구 팀', '콘텐츠 팀'] },
]

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [teamModels, setTeamModels] = useState<Record<string, string>>({})
  const [teamEnabled, setTeamEnabled] = useState<Record<string, boolean>>({})
  const [mcpEnabled, setMcpEnabled] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState(false)
  const [showAddMcp, setShowAddMcp] = useState(false)
  const [newMcpName, setNewMcpName] = useState('')
  const [newMcpUrl, setNewMcpUrl] = useState('')

  useEffect(() => {
    setSettings(loadData<AppSettings>('nk_settings', DEFAULT_SETTINGS))
    setApiKey(loadData<string>('nk_apikey', ''))
    setTeamModels(loadData('nk_team_models', { router: 'claude-haiku-4-5-20251001', web: 'claude-opus-4-5', content: 'claude-sonnet-4-5', edu: 'claude-sonnet-4-5', research: 'claude-sonnet-4-5', ops: 'claude-sonnet-4-5' }))
    setTeamEnabled(loadData('nk_team_enabled', { router: true, web: true, content: true, edu: true, research: true, ops: true }))
    setMcpEnabled(loadData('nk_mcp', {}))
  }, [])

  const updateName = (id: string, name: string) => setSettings(prev => ({ ...prev, agentNames: { ...prev.agentNames, [id]: name } }))
  const saveAll = () => {
    saveData('nk_settings', settings)
    if (apiKey) saveData('nk_apikey', apiKey)
    saveData('nk_team_models', teamModels)
    saveData('nk_team_enabled', teamEnabled)
    saveData('nk_mcp', mcpEnabled)
    setSaved(true)
    setTimeout(() => { setSaved(false); window.location.reload() }, 1500)
  }

  const activeTeams = AIDS.filter(id => teamEnabled[id]).length

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <div>
          <h2 className="text-[22px] font-semibold mb-1" style={{ color: 'var(--text)' }}>⚙️ 설정</h2>
          <p className="text-[13px]" style={{ color: 'var(--muted)' }}>AI 팀 구성과 도구 연결을 관리하세요</p>
        </div>

        {/* ── API 키 ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>🔑 Anthropic API 키</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ background: 'var(--olive-l)', color: 'var(--olive)', border: '1px solid var(--olive-b)' }}>권장</span>
          </div>
          <p className="text-[12px] mb-3" style={{ color: 'var(--muted)' }}>Claude Opus · Sonnet · Haiku 모델 사용 가능</p>
          <div className="flex gap-2">
            <input value={showKey ? apiKey : apiKey ? '•'.repeat(20) : ''}
              onChange={e => showKey && setApiKey(e.target.value)} placeholder="sk-ant-api03-..."
              className="flex-1 px-3 py-2.5 rounded-xl text-[13px] outline-none"
              style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', color: 'var(--text)', fontFamily: 'monospace' }} />
            <button onClick={() => setShowKey(!showKey)} className="px-3 py-2 rounded-xl text-[12px]"
              style={{ background: 'var(--bg2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
              {showKey ? '숨기기' : '보기'}
            </button>
          </div>
          <p className="text-[10px] mt-2" style={{ color: 'var(--muted)' }}>💡 console.anthropic.com 에서 발급</p>
        </div>

        {/* ── 팀별 AI 모델 설정 ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>⚙️ 팀별 AI 모델 설정</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg2)', color: 'var(--muted)' }}>
              {activeTeams}/{AIDS.length} 활성
            </span>
          </div>
          <p className="text-[12px] mb-4" style={{ color: 'var(--muted)' }}>
            각 팀이 자동으로 사용할 AI 모델을 선택하세요. 채팅에서 @opus, @sonnet 등으로 수동 지정도 가능합니다.
          </p>

          {/* 모델 범례 */}
          <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl" style={{ background: 'var(--bg2)' }}>
            {MODELS.map(m => (
              <div key={m.id} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{m.label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {AIDS.map(id => {
              const currentModel = MODELS.find(m => m.id === (teamModels[id] || 'claude-sonnet-4-5'))
              return (
                <div key={id} className="rounded-xl p-3" style={{ background: 'var(--bg2)', opacity: teamEnabled[id] === false ? 0.5 : 1, transition: 'opacity .2s' }}>
                  <div className="flex items-center gap-3">
                    {/* 토글 */}
                    <button onClick={() => setTeamEnabled(prev => ({ ...prev, [id]: !prev[id] }))}
                      className="w-10 h-5 rounded-full relative flex-shrink-0"
                      style={{ background: teamEnabled[id] !== false ? 'var(--olive)' : 'var(--border)', transition: 'background .2s' }}>
                      <div className="w-4 h-4 rounded-full absolute top-0.5 bg-white shadow-sm"
                        style={{ left: teamEnabled[id] !== false ? '22px' : '2px', transition: 'left .2s' }} />
                    </button>
                    <span style={{ fontSize: 16, width: 22 }}>{AICONS[id]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{settings.agentNames[id] || id}</p>
                      <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{ADESC[id]}</p>
                    </div>
                    {/* 모델 선택 */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="w-2 h-2 rounded-full" style={{ background: currentModel?.color || '#888' }} />
                      <select value={teamModels[id] || 'claude-sonnet-4-5'}
                        onChange={e => setTeamModels(prev => ({ ...prev, [id]: e.target.value }))}
                        disabled={teamEnabled[id] === false}
                        className="px-2 py-1.5 rounded-xl text-[11px] outline-none"
                        style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', maxWidth: 130 }}>
                        {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* 선택된 모델 설명 */}
                  {teamEnabled[id] !== false && currentModel && (
                    <p className="text-[10px] mt-1.5 ml-[68px]" style={{ color: 'var(--muted)' }}>💡 {currentModel.desc}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── MCP 도구 연결 ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>🔧 MCP 도구 연결</h3>
            <button onClick={() => setShowAddMcp(!showAddMcp)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px]"
              style={{ background: 'var(--blush)', color: '#fff' }}>
              ＋ 서버 추가
            </button>
          </div>
          <p className="text-[12px] mb-4" style={{ color: 'var(--muted)' }}>AI 팀이 사용할 외부 도구 · 토글로 ON/OFF</p>

          {/* 서버 추가 폼 */}
          {showAddMcp && (
            <div className="rounded-xl p-4 mb-4 flex flex-col gap-2" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
              <p className="text-[12px] font-medium" style={{ color: 'var(--text)' }}>새 MCP 서버 추가</p>
              <input value={newMcpName} onChange={e => setNewMcpName(e.target.value)}
                placeholder="서버 이름 (예: My Tool)"
                className="px-3 py-2 rounded-xl text-[12px] outline-none"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              <input value={newMcpUrl} onChange={e => setNewMcpUrl(e.target.value)}
                placeholder="서버 URL (예: https://mcp.example.com/sse)"
                className="px-3 py-2 rounded-xl text-[12px] outline-none"
                style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'monospace' }} />
              <div className="flex gap-2">
                <button onClick={() => { setShowAddMcp(false); setNewMcpName(''); setNewMcpUrl('') }}
                  className="flex-1 py-2 rounded-xl text-[12px]"
                  style={{ background: 'var(--border)', color: 'var(--muted)' }}>취소</button>
                <button onClick={() => { setShowAddMcp(false); setNewMcpName(''); setNewMcpUrl('') }}
                  className="flex-1 py-2 rounded-xl text-[12px]"
                  style={{ background: 'var(--blush)', color: '#fff' }}>추가</button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {MCPS.map(tool => (
              <div key={tool.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg2)' }}>
                <span style={{ fontSize: 18, width: 24 }}>{tool.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{tool.name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--muted)' }}>{tool.desc}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {tool.teams.map(t => (
                      <span key={t} className="text-[9px] px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--blush-l)', color: 'var(--blush)', border: '1px solid var(--blush-b)' }}>{t}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => setMcpEnabled(prev => ({ ...prev, [tool.id]: !prev[tool.id] }))}
                  className="w-12 h-6 rounded-full relative flex-shrink-0"
                  style={{ background: mcpEnabled[tool.id] ? 'var(--olive)' : 'var(--border)', transition: 'background .2s' }}>
                  <div className="w-5 h-5 rounded-full absolute top-0.5 bg-white shadow-sm"
                    style={{ left: mcpEnabled[tool.id] ? '26px' : '2px', transition: 'left .2s' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── 팀 이름 수정 ── */}
        <div className="rounded-2xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h3 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--text)' }}>👥 팀 이름 수정</h3>
          <div className="flex flex-col gap-3">
            {AIDS.map(id => (
              <div key={id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg2)' }}>
                <span style={{ fontSize: 16, width: 24 }}>{AICONS[id]}</span>
                <div className="flex-1">
                  <p className="text-[10px] mb-1" style={{ color: 'var(--muted)' }}>{AROLES[id]}</p>
                  <input value={settings.agentNames[id] || id} onChange={e => updateName(id, e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                    style={{ background: 'var(--card)', border: '1.5px solid var(--border)', color: 'var(--text)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 저장 버튼 ── */}
        <button onClick={saveAll} className="w-full py-3.5 rounded-2xl text-[15px] font-medium"
          style={{ background: saved ? 'var(--olive)' : 'var(--blush)', color: '#fff', transition: 'background .3s' }}>
          {saved ? '✅ 저장됐어요!' : '💾 설정 저장'}
        </button>

        {/* ── 위험 구역 ── */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--blush-l)', border: '1px solid var(--blush-b)' }}>
          <h3 className="text-[14px] font-semibold mb-1" style={{ color: 'var(--blush)' }}>⚠️ 위험 구역</h3>
          <p className="text-[12px] mb-3" style={{ color: 'var(--muted)' }}>모든 데이터가 삭제돼요</p>
          <button onClick={() => { if (confirm('초기화할까요?')) { localStorage.clear(); window.location.reload() } }}
            className="px-4 py-2 rounded-xl text-[12px]"
            style={{ background: '#fff', color: 'var(--blush)', border: '1px solid var(--blush-b)' }}>
            🗑️ 전체 초기화
          </button>
        </div>
      </div>
    </div>
  )
}
