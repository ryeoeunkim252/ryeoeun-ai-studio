import Anthropic from '@anthropic-ai/sdk'
import { parsePipeline, injectContext } from '@/lib/pipeline'
import { AGENTS, ROUTER_SYSTEM_PROMPT, type AgentId } from '@/lib/agents'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ══════════════════════════════════════════
//  키워드 기반 사전 라우팅
// ══════════════════════════════════════════
const KEYWORD_ROUTES: Partial<Record<AgentId, string[]>> = {
  content:   ['인스타', '인스타그램', 'sns', '유튜브', '블로그', '콘텐츠', '릴스', '쇼츠',
               '썸네일', '카피', '포스팅', '채널', '피드', '스크립트', '카드뉴스', '마케팅글'],
  secretary: ['일정', '스케줄', '캘린더', '할일', '메모', '회의 잡', '리마인더'],
  ops:       ['자동화', 'n8n', 'api 연결', '워크플로우', '크론', '스케줄러'],
  web:       ['수익화', '쿠팡파트너스', '제휴 마케팅', '광고 운영', '매출', '세일즈'],
  research:  ['시장조사', '트렌드 분석', '경쟁사 분석', '상품 기획'],
  edu:       ['crm', '리텐션', '고객 분석', '데이터 분석', '이메일 자동화'],
}

function getKeywordTeam(message: string): AgentId | null {
  const lower = message.toLowerCase()
  for (const [teamId, keywords] of Object.entries(KEYWORD_ROUTES)) {
    if (keywords!.some(kw => lower.includes(kw.toLowerCase()))) {
      return teamId as AgentId
    }
  }
  return null
}

// ══════════════════════════════════════════
//  NOTION 도구
// ══════════════════════════════════════════
const NOTION_TOOLS: Anthropic.Tool[] = [
  {
    name: 'notion_create_page',
    description: 'Notion에 새 페이지를 생성합니다.',
    input_schema: {
      type: 'object',
      properties: {
        title:     { type: 'string', description: '페이지 제목' },
        content:   { type: 'string', description: '상세 내용' },
        team:      { type: 'string', description: '담당팀 이름' },
        task:      { type: 'string', description: '업무 내용 요약 (한 문장)' },
        summary:   { type: 'string', description: '전체 요약 (2~3문장)' },
        result:    { type: 'string', description: '결과 또는 산출물' },
        status:    { type: 'string', description: '상태: 완료 / 진행중 / 대기중' },
        next_step: { type: 'string', description: '다음 단계 또는 후속 조치' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'notion_search',
    description: 'Notion에서 페이지를 검색합니다.',
    input_schema: { type: 'object', properties: { query: { type: 'string', description: '검색어' } }, required: ['query'] },
  },
  {
    name: 'notion_append_to_page',
    description: '기존 Notion 페이지에 내용을 추가합니다.',
    input_schema: { type: 'object', properties: { page_id: { type: 'string', description: '페이지 ID' }, content: { type: 'string', description: '추가할 내용' } }, required: ['page_id', 'content'] },
  },
]

async function callNotionAPI(toolName: string, input: Record<string, string>): Promise<string> {
  const key = process.env.NOTION_API_KEY
  if (!key) return JSON.stringify({ error: 'NOTION_API_KEY가 설정되지 않았어요' })
  const headers: Record<string, string> = { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' }
  try {
    if (toolName === 'notion_create_page') {
      const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
      const blocks = [
        { object: 'block', type: 'divider', divider: {} },
        { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: '📅 날짜' } }] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: today } }] } },
        { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: '👥 담당팀' } }] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: input.team || '미정' } }] } },
        { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: '📋 업무 내용' } }] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: input.task || input.content } }] } },
        { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: '💡 요약' } }] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: input.summary || input.content.slice(0, 100) } }] } },
        { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: '📝 상세 내용' } }] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: input.content } }] } },
        { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: '✅ 결과' } }] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: input.result || '작성 중' } }] } },
        { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: '🔄 상태' } }] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: input.status || '진행중' } }] } },
        { object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: '🚀 다음 단계' } }] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: input.next_step || '미정' } }] } },
        { object: 'block', type: 'divider', divider: {} },
      ]
      const res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST', headers,
        body: JSON.stringify({ parent: { type: 'page_id', page_id: '33a9d3b60d6180cfb5cae8c1362b89cc' }, properties: { title: { title: [{ text: { content: input.title } }] } }, children: blocks }),
      })
      const data = await res.json()
      if (data.object === 'error') return JSON.stringify({ error: data.message })
      return JSON.stringify({ success: true, page_id: data.id, url: data.url, message: `✅ "${input.title}" 페이지가 Notion에 생성됐어요!` })
    }
    if (toolName === 'notion_search') {
      const res = await fetch('https://api.notion.com/v1/search', { method: 'POST', headers, body: JSON.stringify({ query: input.query, page_size: 5 }) })
      const data = await res.json()
      if (data.object === 'error') return JSON.stringify({ error: data.message })
      const results = data.results?.map((r: Record<string, unknown>) => { const props = r.properties as Record<string, { title?: { plain_text: string }[] }>; const titleArr = props?.title?.title; const title = Array.isArray(titleArr) ? titleArr[0]?.plain_text : '제목없음'; return { id: r.id, title, url: r.url } })
      return JSON.stringify({ results })
    }
    if (toolName === 'notion_append_to_page') {
      const res = await fetch(`https://api.notion.com/v1/blocks/${input.page_id}/children`, { method: 'PATCH', headers, body: JSON.stringify({ children: [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: input.content } }] } }] }) })
      const data = await res.json()
      if (data.object === 'error') return JSON.stringify({ error: data.message })
      return JSON.stringify({ success: true, message: '✅ Notion 페이지에 내용을 추가했어요!' })
    }
    return JSON.stringify({ error: '알 수 없는 도구' })
  } catch (err) { return JSON.stringify({ error: String(err) }) }
}

// ══════════════════════════════════════════
//  FIGMA 도구
// ══════════════════════════════════════════
const FIGMA_TOOLS: Anthropic.Tool[] = [
  { name: 'figma_get_file', description: 'Figma 파일 정보를 가져옵니다.', input_schema: { type: 'object', properties: { file_key: { type: 'string', description: 'Figma 파일 키' } }, required: ['file_key'] } },
  { name: 'figma_get_comments', description: 'Figma 댓글 목록을 가져옵니다.', input_schema: { type: 'object', properties: { file_key: { type: 'string', description: 'Figma 파일 키' } }, required: ['file_key'] } },
  { name: 'figma_post_comment', description: 'Figma에 댓글을 추가합니다.', input_schema: { type: 'object', properties: { file_key: { type: 'string', description: 'Figma 파일 키' }, message: { type: 'string', description: '댓글 내용' } }, required: ['file_key', 'message'] } },
  { name: 'figma_list_files', description: 'Figma 계정 정보를 확인합니다.', input_schema: { type: 'object', properties: {}, required: [] } },
]

async function callFigmaAPI(toolName: string, input: Record<string, string>): Promise<string> {
  const token = process.env.FIGMA_ACCESS_TOKEN
  if (!token) return JSON.stringify({ error: 'FIGMA_ACCESS_TOKEN이 설정되지 않았어요' })
  const headers: Record<string, string> = { 'X-Figma-Token': token, 'Content-Type': 'application/json' }
  try {
    if (toolName === 'figma_get_file') { const res = await fetch(`https://api.figma.com/v1/files/${input.file_key}`, { headers }); const data = await res.json(); if (data.err) return JSON.stringify({ error: data.err }); return JSON.stringify({ success: true, name: data.name, message: `✅ Figma 파일 "${data.name}" 정보를 가져왔어요!` }) }
    if (toolName === 'figma_get_comments') { const res = await fetch(`https://api.figma.com/v1/files/${input.file_key}/comments`, { headers }); const data = await res.json(); if (data.err) return JSON.stringify({ error: data.err }); return JSON.stringify({ success: true, comments: data.comments?.slice(0, 10).map((c: {id:string;message:string;user:{handle:string}}) => ({ id: c.id, message: c.message, author: c.user?.handle })) }) }
    if (toolName === 'figma_post_comment') { const res = await fetch(`https://api.figma.com/v1/files/${input.file_key}/comments`, { method: 'POST', headers, body: JSON.stringify({ message: input.message }) }); const data = await res.json(); if (data.err) return JSON.stringify({ error: data.err }); return JSON.stringify({ success: true, message: `✅ Figma에 댓글을 달았어요: "${input.message}"` }) }
    if (toolName === 'figma_list_files') { const res = await fetch('https://api.figma.com/v1/me', { headers }); const me = await res.json(); return JSON.stringify({ success: true, message: `✅ Figma 계정 (${me.email}) 연결 확인됐어요!` }) }
    return JSON.stringify({ error: '알 수 없는 도구' })
  } catch (err) { return JSON.stringify({ error: String(err) }) }
}

// ══════════════════════════════════════════
//  GITHUB 도구
// ══════════════════════════════════════════
const GITHUB_TOOLS: Anthropic.Tool[] = [
  { name: 'github_list_repos', description: 'GitHub 저장소 목록을 가져옵니다.', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'github_list_issues', description: 'GitHub 이슈 목록을 가져옵니다.', input_schema: { type: 'object', properties: { repo: { type: 'string', description: '저장소 이름' } }, required: ['repo'] } },
  { name: 'github_create_issue', description: 'GitHub 이슈를 생성합니다.', input_schema: { type: 'object', properties: { repo: { type: 'string', description: '저장소 이름' }, title: { type: 'string', description: '이슈 제목' }, body: { type: 'string', description: '이슈 내용' } }, required: ['repo', 'title', 'body'] } },
  { name: 'github_list_commits', description: 'GitHub 최근 커밋 목록을 가져옵니다.', input_schema: { type: 'object', properties: { repo: { type: 'string', description: '저장소 이름' } }, required: ['repo'] } },
]

async function callGitHubAPI(toolName: string, input: Record<string, string>): Promise<string> {
  const token = process.env.GITHUB_TOKEN
  if (!token) return JSON.stringify({ error: 'GITHUB_TOKEN이 설정되지 않았어요' })
  const headers: Record<string, string> = { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' }
  try {
    const meRes = await fetch('https://api.github.com/user', { headers }); const me = await meRes.json(); const owner = me.login
    if (toolName === 'github_list_repos') { const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=10', { headers }); const data = await res.json(); return JSON.stringify({ success: true, repos: data.map((r: {name:string;description:string;updated_at:string}) => ({ name: r.name, description: r.description, updated: r.updated_at })), message: `✅ GitHub 저장소 ${data.length}개를 가져왔어요!` }) }
    if (toolName === 'github_list_issues') { const res = await fetch(`https://api.github.com/repos/${owner}/${input.repo}/issues?state=open&per_page=10`, { headers }); const data = await res.json(); if (data.message) return JSON.stringify({ error: data.message }); return JSON.stringify({ success: true, issues: data.map((i: {number:number;title:string;state:string;created_at:string}) => ({ number: i.number, title: i.title, state: i.state, created: i.created_at })), message: `✅ 이슈 ${data.length}개를 가져왔어요!` }) }
    if (toolName === 'github_create_issue') { const res = await fetch(`https://api.github.com/repos/${owner}/${input.repo}/issues`, { method: 'POST', headers, body: JSON.stringify({ title: input.title, body: input.body }) }); const data = await res.json(); if (data.message) return JSON.stringify({ error: data.message }); return JSON.stringify({ success: true, url: data.html_url, message: `✅ 이슈 #${data.number} "${input.title}"이 생성됐어요!` }) }
    if (toolName === 'github_list_commits') { const res = await fetch(`https://api.github.com/repos/${owner}/${input.repo}/commits?per_page=10`, { headers }); const data = await res.json(); if (data.message) return JSON.stringify({ error: data.message }); return JSON.stringify({ success: true, commits: data.map((c: {sha:string;commit:{message:string;author:{date:string}}}) => ({ sha: c.sha.slice(0,7), message: c.commit.message, date: c.commit.author.date })), message: `✅ 최근 커밋 ${data.length}개를 가져왔어요!` }) }
    return JSON.stringify({ error: '알 수 없는 도구' })
  } catch (err) { return JSON.stringify({ error: String(err) }) }
}

// ══════════════════════════════════════════
//  GOOGLE DRIVE / CALENDAR 도구
// ══════════════════════════════════════════
const GDRIVE_TOOLS: Anthropic.Tool[] = [
  { name: 'gdrive_list_files', description: 'Google Drive 파일 목록을 가져옵니다.', input_schema: { type: 'object', properties: { query: { type: 'string', description: '검색어 (선택사항)' } }, required: [] } },
  { name: 'gdrive_create_file', description: 'Google Drive에 새 파일을 생성합니다.', input_schema: { type: 'object', properties: { name: { type: 'string', description: '파일 이름' }, content: { type: 'string', description: '파일 내용' } }, required: ['name', 'content'] } },
  { name: 'gdrive_search_files', description: 'Google Drive에서 파일을 검색합니다.', input_schema: { type: 'object', properties: { query: { type: 'string', description: '검색어' } }, required: ['query'] } },
]
const GCAL_TOOLS: Anthropic.Tool[] = [
  { name: 'gcal_list_events', description: 'Google Calendar 일정을 가져옵니다.', input_schema: { type: 'object', properties: { days: { type: 'string', description: '며칠치 일정' } }, required: [] } },
  { name: 'gcal_create_event', description: 'Google Calendar에 일정을 추가합니다.', input_schema: { type: 'object', properties: { title: { type: 'string', description: '일정 제목' }, start_time: { type: 'string', description: '시작 시간' }, end_time: { type: 'string', description: '종료 시간' }, description: { type: 'string', description: '일정 설명' } }, required: ['title', 'start_time', 'end_time'] } },
]

async function getGoogleAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, refresh_token: process.env.GOOGLE_REFRESH_TOKEN!, grant_type: 'refresh_token' }) })
  const data = await res.json(); return data.access_token
}

async function callGDriveAPI(toolName: string, input: Record<string, string>): Promise<string> {
  try {
    const token = await getGoogleAccessToken()
    const headers: Record<string, string> = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    if (toolName === 'gdrive_list_files' || toolName === 'gdrive_search_files') { const q = input.query ? `name contains '${input.query}'` : ''; const url = `https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name,mimeType,modifiedTime)${q ? `&q=${encodeURIComponent(q)}` : ''}`; const res = await fetch(url, { headers }); const data = await res.json(); return JSON.stringify({ success: true, files: data.files?.map((f: {id:string;name:string;mimeType:string;modifiedTime:string}) => ({ id: f.id, name: f.name, type: f.mimeType, modified: f.modifiedTime })), message: `✅ Google Drive 파일 ${data.files?.length || 0}개를 가져왔어요!` }) }
    if (toolName === 'gdrive_create_file') { const res = await fetch('https://www.googleapis.com/drive/v3/files', { method: 'POST', headers, body: JSON.stringify({ name: input.name, mimeType: 'application/vnd.google-apps.document' }) }); const data = await res.json(); return JSON.stringify({ success: true, file_id: data.id, message: `✅ Google Drive에 "${input.name}" 파일을 생성했어요!` }) }
    return JSON.stringify({ error: '알 수 없는 도구' })
  } catch (err) { return JSON.stringify({ error: String(err) }) }
}

async function callGCalAPI(toolName: string, input: Record<string, string>): Promise<string> {
  try {
    const token = await getGoogleAccessToken()
    const headers: Record<string, string> = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    if (toolName === 'gcal_list_events') { const days = parseInt(input.days || '7'); const now = new Date().toISOString(); const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(); const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${future}&singleEvents=true&orderBy=startTime&maxResults=10`; const res = await fetch(url, { headers }); const data = await res.json(); return JSON.stringify({ success: true, events: data.items?.map((e: {summary:string;start:{dateTime?:string;date?:string};end:{dateTime?:string;date?:string}}) => ({ title: e.summary, start: e.start?.dateTime || e.start?.date, end: e.end?.dateTime || e.end?.date })), message: `✅ 앞으로 ${days}일간 일정 ${data.items?.length || 0}개를 가져왔어요!` }) }
    if (toolName === 'gcal_create_event') { const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', { method: 'POST', headers, body: JSON.stringify({ summary: input.title, description: input.description || '', start: { dateTime: input.start_time, timeZone: 'Asia/Seoul' }, end: { dateTime: input.end_time, timeZone: 'Asia/Seoul' } }) }); const data = await res.json(); return JSON.stringify({ success: true, event_id: data.id, link: data.htmlLink, message: `✅ "${input.title}" 일정이 Google Calendar에 추가됐어요!` }) }
    return JSON.stringify({ error: '알 수 없는 도구' })
  } catch (err) { return JSON.stringify({ error: String(err) }) }
}

function hasToolForTeam(toolId: string, teamId: string, mcpEnabled: Record<string, boolean>, mcpTeams: Record<string, string[]>): boolean {
  if (!mcpEnabled[toolId]) return false
  return (mcpTeams[toolId] || []).includes(teamId)
}

// ══════════════════════════════════════════
//  MAIN PIPELINE
// ══════════════════════════════════════════
export async function POST(req: Request) {
  const { message, teamModels = {}, teamEnabled = {}, mcpEnabled = {}, mcpTeams = {} } = await req.json()
  if (!message?.trim()) return new Response('메시지가 없습니다', { status: 400 })

  const { steps, isPipeline } = parsePipeline(message)
  const encoder = new TextEncoder()
  const workingAgentIds = AGENTS.map(a => a.id).filter(id => id !== 'router' && teamEnabled[id] !== false)

  const readable = new ReadableStream({
    async start(controller) {
      // ✅ send: SSE 이벤트 전송
      const send = (obj: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

      // ✅ flush: Vercel SSE 버퍼 강제 즉시 전송
      // Vercel edge runtime은 데이터를 버퍼에 쌓았다가 한꺼번에 보내는데,
      // 1KB 이상의 패딩 데이터를 추가하면 즉시 전송됨
      const flush = () => {
        const padding = ' '.repeat(1024)
        controller.enqueue(encoder.encode(`: ${padding}\n\n`))
      }

      try {
        let prevResult = ''

        for (let i = 0; i < steps.length; i++) {
          const step = steps[i]
          const isLast = i === steps.length - 1

          if (isPipeline) send({ type: 'pipeline_step', step: i + 1, total: steps.length, task: step.task })

          let targetAgentId: AgentId = step.agentId ?? 'content'
          let routerReason = ''
          let refinedTask = ''

          if (!step.agentId) {
            const keywordTeam = getKeywordTeam(step.task)

            if (keywordTeam && workingAgentIds.includes(keywordTeam)) {
              targetAgentId = keywordTeam
              routerReason = '키워드 기반 자동 배정'
              refinedTask = step.task
            } else {
              const teamList = workingAgentIds.join(', ')
              const dynamicRouterPrompt = ROUTER_SYSTEM_PROMPT + `\n\n반드시 다음 목록에서만 팀을 선택하세요: ${teamList}`
              try {
                const routerRes = await anthropic.messages.create({
                  model: teamModels['router'] ?? 'claude-haiku-4-5-20251001',
                  max_tokens: 300,
                  system: dynamicRouterPrompt,
                  messages: [{ role: 'user', content: step.task }],
                })
                const raw = routerRes.content[0].type === 'text' ? routerRes.content[0].text : ''
                const parsed = JSON.parse(raw)
                const suggested = parsed.team as AgentId
                routerReason = parsed.reason ?? ''
                refinedTask = parsed.refined_task ?? step.task
                targetAgentId = (suggested && suggested !== 'router' && workingAgentIds.includes(suggested))
                  ? suggested : (workingAgentIds[0] as AgentId ?? 'content')
              } catch {
                targetAgentId = workingAgentIds[0] as AgentId ?? 'content'
                refinedTask = step.task
              }
            }
          } else {
            refinedTask = step.task
          }

          if (teamEnabled[targetAgentId] === false) targetAgentId = workingAgentIds[0] as AgentId ?? 'content'

          const agent = AGENTS.find(a => a.id === targetAgentId) ?? AGENTS[1]
          const model = step.model ?? teamModels[targetAgentId] ?? agent.model

          // ✅ 총괄실장 보고 이벤트 전송
          send({
            type: 'router_report',
            teamId: agent.id,
            teamName: agent.name,
            refinedTask: refinedTask,
          })
          // ✅ Vercel 버퍼 강제 flush → 프론트가 즉시 받음
          flush()

          const useNotion  = hasToolForTeam('notion',          targetAgentId, mcpEnabled, mcpTeams)
          const useFigma   = hasToolForTeam('figma',           targetAgentId, mcpEnabled, mcpTeams)
          const useGitHub  = hasToolForTeam('github',          targetAgentId, mcpEnabled, mcpTeams)
          const useGDrive  = hasToolForTeam('google-drive',    targetAgentId, mcpEnabled, mcpTeams)
          const useGCal    = hasToolForTeam('google-calendar', targetAgentId, mcpEnabled, mcpTeams)

          const tools = [
            ...(useNotion ? NOTION_TOOLS : []),
            ...(useFigma  ? FIGMA_TOOLS  : []),
            ...(useGitHub ? GITHUB_TOOLS : []),
            ...(useGDrive ? GDRIVE_TOOLS : []),
            ...(useGCal   ? GCAL_TOOLS   : []),
          ]

          const mcpToolNames = [
            ...(useNotion ? ['Notion'] : []),
            ...(useFigma  ? ['Figma']  : []),
            ...(useGitHub ? ['GitHub'] : []),
            ...(useGDrive ? ['Google Drive']   : []),
            ...(useGCal   ? ['Google Calendar']: []),
          ].join(', ')

          send({ type: 'agent', agentId: agent.id, agentName: agent.name, modelName: model, reason: routerReason, step: i + 1, mcpTools: mcpToolNames || null })

          const now = new Date()
          const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
          const currentDateTime = kst.toISOString().replace('T', ' ').slice(0, 19)
          const datePrefix = `[현재 날짜/시간 KST: ${currentDateTime}]\n\n`
          const baseTask = refinedTask !== step.task
            ? `[총괄실장 업무 지시]\n${refinedTask}\n\n[CEO 원본 요청]\n${step.task}`
            : step.task
          const taskWithContext = datePrefix + injectContext({ ...step, task: baseTask }, prevResult)

          if (tools.length > 0) {
            const messages: Anthropic.MessageParam[] = [{ role: 'user', content: taskWithContext }]
            let fullText = ''
            let continueLoop = true
            while (continueLoop) {
              const res = await anthropic.messages.create({ model, max_tokens: 4096, system: agent.systemPrompt, tools, messages })
              for (const block of res.content) { if (block.type === 'text') { fullText += block.text; send({ type: 'text', text: block.text, step: i + 1 }) } }
              if (res.stop_reason === 'tool_use') {
                const toolResults: Anthropic.ToolResultBlockParam[] = []
                for (const block of res.content) {
                  if (block.type !== 'tool_use') continue
                  const isNotion = block.name.startsWith('notion_'); const isFigma = block.name.startsWith('figma_'); const isGitHub = block.name.startsWith('github_'); const isGDrive = block.name.startsWith('gdrive_'); const isGCal = block.name.startsWith('gcal_')
                  const label = isNotion ? 'Notion' : isFigma ? 'Figma' : isGitHub ? 'GitHub' : isGDrive ? 'Google Drive' : isGCal ? 'Google Calendar' : '도구'
                  send({ type: 'text', text: `\n🔧 ${label} ${block.name} 실행 중...\n`, step: i + 1 })
                  let result = ''
                  if (isNotion) result = await callNotionAPI(block.name, block.input as Record<string, string>)
                  else if (isFigma) result = await callFigmaAPI(block.name, block.input as Record<string, string>)
                  else if (isGitHub) result = await callGitHubAPI(block.name, block.input as Record<string, string>)
                  else if (isGDrive) result = await callGDriveAPI(block.name, block.input as Record<string, string>)
                  else if (isGCal) result = await callGCalAPI(block.name, block.input as Record<string, string>)
                  else result = JSON.stringify({ error: '알 수 없는 도구' })
                  const parsedResult = JSON.parse(result)
                  if (parsedResult.message) { send({ type: 'text', text: parsedResult.message + '\n', step: i + 1 }); fullText += parsedResult.message + '\n' }
                  toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
                }
                messages.push({ role: 'assistant', content: res.content })
                messages.push({ role: 'user', content: toolResults })
              } else { continueLoop = false }
            }
            prevResult = fullText
          } else {
            const stream = await anthropic.messages.stream({ model, max_tokens: 4096, system: agent.systemPrompt, messages: [{ role: 'user', content: taskWithContext }] })
            let fullText = ''
            for await (const chunk of stream) { if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') { fullText += chunk.delta.text; send({ type: 'text', text: chunk.delta.text, step: i + 1 }) } }
            prevResult = fullText
          }

          if (step.verify && isLast) {
            send({ type: 'verify_start' })
            const verifyRes = await anthropic.messages.create({ model: teamModels['router'] ?? 'claude-haiku-4-5-20251001', max_tokens: 300, system: '검토 에이전트입니다. 결과물의 완성도를 평가하고 개선점을 3가지 bullet point로 정리해줘요.', messages: [{ role: 'user', content: `다음 결과물을 검토해줘요\n\n${prevResult}` }] })
            const verifyText = verifyRes.content[0].type === 'text' ? verifyRes.content[0].text : ''
            send({ type: 'verify_result', text: verifyText })
          }

          if (isPipeline && !isLast) send({ type: 'step_done', step: i + 1 })
        }

        send({ type: 'done', isPipeline })
      } catch (err) {
        send({ type: 'error', message: String(err) })
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',        // nginx 버퍼링 비활성화
    },
  })
}