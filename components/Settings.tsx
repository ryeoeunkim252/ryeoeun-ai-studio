'use client'
import { useEffect, useState } from 'react'
import { loadData, saveData, DEFAULT_SETTINGS, type AppSettings } from '@/lib/store'

const AIDS=['router','web','content','edu','research','ops']
const AICONS:Record<string,string>={router:'🔀',web:'🌐',content:'✍️',edu:'📚',research:'🔬',ops:'🚀'}
const AROLES:Record<string,string>={router:'총괄 조정',web:'웹 개발/디자인',content:'콘텐츠 제작',edu:'교육 프로그램',research:'시장 조사/분석',ops:'인프라/운영'}
const MODELS=[
  {id:'claude-opus-4-5',label:'Claude Opus',desc:'가장 똑똑해요'},
  {id:'claude-sonnet-4-5',label:'Claude Sonnet',desc:'균형잡힌 선택 (추천)'},
  {id:'claude-haiku-4-5-20251001',label:'Claude Haiku',desc:'빠르고 저렴해요'},
]
const MCPS=[
  {id:'figma',icon:'🎨',name:'Figma',desc:'디자인 작업, 컴포넌트 생성',teams:['웹 팀']},
  {id:'notion',icon:'📝',name:'Notion',desc:'문서 관리, 데이터베이스',teams:['교육 팀','운영 팀']},
  {id:'vercel',icon:'▲',name:'Vercel',desc:'배포, 도메인 관리',teams:['웹 팀','운영 팀']},
  {id:'github',icon:'🐙',name:'GitHub',desc:'코드 관리, PR 리뷰',teams:['웹 팀']},
  {id:'gmail',icon:'📧',name:'Gmail',desc:'이메일 발송',teams:['운영 팀']},
  {id:'n8n',icon:'⚡',name:'n8n',desc:'워크플로우 자동화',teams:['운영 팀']},
]

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [teamModels, setTeamModels] = useState<Record<string,string>>({})
  const [mcpEnabled, setMcpEnabled] = useState<Record<string,boolean>>({})
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<'api'|'team'|'mcp'>('api')

  useEffect(()=>{
    setSettings(loadData<AppSettings>('nk_settings',DEFAULT_SETTINGS))
    setApiKey(loadData<string>('nk_apikey',''))
    setTeamModels(loadData('nk_team_models',{router:'claude-haiku-4-5-20251001',web:'claude-opus-4-5',content:'claude-sonnet-4-5',edu:'claude-sonnet-4-5',research:'claude-sonnet-4-5',ops:'claude-sonnet-4-5'}))
    setMcpEnabled(loadData('nk_mcp',{}))
  },[])

  const updateName=(id:string,name:string)=>setSettings(prev=>({...prev,agentNames:{...prev.agentNames,[id]:name}}))
  const saveAll=()=>{
    saveData('nk_settings',settings); if(apiKey)saveData('nk_apikey',apiKey)
    saveData('nk_team_models',teamModels); saveData('nk_mcp',mcpEnabled)
    setSaved(true); setTimeout(()=>{ setSaved(false); window.location.reload() },1500)
  }

  const TABS=[{id:'api' as const,icon:'🔑',label:'API 키'},{id:'team' as const,icon:'👥',label:'팀 관리'},{id:'mcp' as const,icon:'🔧',label:'MCP 도구'}]

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-[22px] font-semibold mb-1" style={{color:'var(--text)'}}>⚙️ 설정</h2>
        <p className="text-[13px] mb-5" style={{color:'var(--muted)'}}>
          이름/제목 변경은 <code style={{background:'var(--bg2)',padding:'1px 6px',borderRadius:4,color:'var(--blush)',border:'1px solid var(--border)'}}>lib/store.ts</code> 에서 수정하세요
        </p>

        <div className="flex gap-2 mb-5">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px]"
              style={{background:tab===t.id?'var(--blush)':'var(--card)',color:tab===t.id?'#fff':'var(--muted)',border:tab===t.id?'none':'1px solid var(--border)'}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab==='api'&&(
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl p-5" style={{background:'var(--card)',border:'1px solid var(--border)'}}>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-[15px] font-semibold" style={{color:'var(--text)'}}>🤖 Anthropic (Claude)</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{background:'var(--olive-l)',color:'var(--olive)',border:'1px solid var(--olive-b)'}}>권장</span>
              </div>
              <p className="text-[12px] mb-3" style={{color:'var(--muted)'}}>Claude Opus, Sonnet, Haiku 모델 사용 가능</p>
              <div className="flex gap-2">
                <input value={showKey?apiKey:apiKey?'•'.repeat(20):''}
                  onChange={e=>showKey&&setApiKey(e.target.value)} placeholder="sk-ant-api03-..."
                  className="flex-1 px-3 py-2.5 rounded-xl text-[13px] outline-none"
                  style={{background:'var(--bg2)',border:'1.5px solid var(--border)',color:'var(--text)',fontFamily:'monospace'}} />
                <button onClick={()=>setShowKey(!showKey)} className="px-3 py-2 rounded-xl text-[12px]"
                  style={{background:'var(--bg2)',color:'var(--muted)',border:'1px solid var(--border)'}}>
                  {showKey?'숨기기':'보기'}
                </button>
              </div>
              <p className="text-[10px] mt-2" style={{color:'var(--muted)'}}>💡 console.anthropic.com 에서 발급</p>
            </div>

            <div className="rounded-2xl p-5" style={{background:'var(--card)',border:'1px solid var(--border)'}}>
              <h3 className="text-[15px] font-semibold mb-3" style={{color:'var(--text)'}}>🤖 팀별 AI 모델</h3>
              <div className="flex flex-col gap-2">
                {AIDS.map(id=>(
                  <div key={id} className="flex items-center gap-3 p-3 rounded-xl" style={{background:'var(--bg2)'}}>
                    <span style={{fontSize:16,width:24}}>{AICONS[id]}</span>
                    <div className="flex-1">
                      <p className="text-[13px] font-medium" style={{color:'var(--text)'}}>{settings.agentNames[id]||id}</p>
                      <p className="text-[10px]" style={{color:'var(--muted)'}}>{AROLES[id]}</p>
                    </div>
                    <select value={teamModels[id]||'claude-sonnet-4-5'}
                      onChange={e=>setTeamModels(prev=>({...prev,[id]:e.target.value}))}
                      className="px-3 py-1.5 rounded-xl text-[12px] outline-none"
                      style={{background:'var(--card)',border:'1px solid var(--border)',color:'var(--text)'}}>
                      {MODELS.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab==='team'&&(
          <div className="rounded-2xl p-5" style={{background:'var(--card)',border:'1px solid var(--border)'}}>
            <h3 className="text-[15px] font-semibold mb-3" style={{color:'var(--text)'}}>👥 팀 이름 수정</h3>
            <div className="flex flex-col gap-3">
              {AIDS.map(id=>(
                <div key={id} className="flex items-center gap-3 p-3 rounded-xl" style={{background:'var(--bg2)'}}>
                  <span style={{fontSize:16,width:24}}>{AICONS[id]}</span>
                  <div className="flex-1">
                    <p className="text-[10px] mb-1" style={{color:'var(--muted)'}}>{AROLES[id]}</p>
                    <input value={settings.agentNames[id]||id} onChange={e=>updateName(id,e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-[13px] outline-none"
                      style={{background:'var(--card)',border:'1.5px solid var(--border)',color:'var(--text)'}} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='mcp'&&(
          <div className="rounded-2xl p-5" style={{background:'var(--card)',border:'1px solid var(--border)'}}>
            <h3 className="text-[15px] font-semibold mb-1" style={{color:'var(--text)'}}>🔧 MCP 도구 연결</h3>
            <p className="text-[12px] mb-4" style={{color:'var(--muted)'}}>AI 팀이 사용할 외부 도구 · 토글로 ON/OFF</p>
            <div className="flex flex-col gap-3">
              {MCPS.map(tool=>(
                <div key={tool.id} className="flex items-center gap-3 p-3 rounded-xl" style={{background:'var(--bg2)'}}>
                  <span style={{fontSize:18,width:24}}>{tool.icon}</span>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium" style={{color:'var(--text)'}}>{tool.name}</p>
                    <p className="text-[11px]" style={{color:'var(--muted)'}}>{tool.desc}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {tool.teams.map(t=>(
                        <span key={t} className="text-[9px] px-2 py-0.5 rounded-full"
                          style={{background:'var(--blush-l)',color:'var(--blush)',border:'1px solid var(--blush-b)'}}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={()=>setMcpEnabled(prev=>({...prev,[tool.id]:!prev[tool.id]}))}
                    className="w-12 h-6 rounded-full relative flex-shrink-0"
                    style={{background:mcpEnabled[tool.id]?'var(--olive)':'var(--border)',transition:'background .2s'}}>
                    <div className="w-5 h-5 rounded-full absolute top-0.5 bg-white shadow-sm"
                      style={{left:mcpEnabled[tool.id]?'26px':'2px',transition:'left .2s'}} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={saveAll} className="w-full py-3.5 rounded-2xl text-[15px] font-medium mt-5"
          style={{background:saved?'var(--olive)':'var(--blush)',color:'#fff',transition:'background .3s'}}>
          {saved?'✅ 저장됐어요!':'💾 설정 저장'}
        </button>

        <div className="rounded-2xl p-4 mt-4" style={{background:'var(--blush-l)',border:'1px solid var(--blush-b)'}}>
          <h3 className="text-[14px] font-semibold mb-1" style={{color:'var(--blush)'}}>⚠️ 위험 구역</h3>
          <p className="text-[12px] mb-3" style={{color:'var(--muted)'}}>모든 데이터가 삭제돼요</p>
          <button onClick={()=>{if(confirm('초기화할까요?')){localStorage.clear();window.location.reload()}}}
            className="px-4 py-2 rounded-xl text-[12px]"
            style={{background:'#fff',color:'var(--blush)',border:'1px solid var(--blush-b)'}}>
            🗑️ 전체 초기화
          </button>
        </div>
      </div>
    </div>
  )
}
