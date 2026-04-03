import Anthropic from '@anthropic-ai/sdk'
import { parsePipeline, injectContext } from '@/lib/pipeline'
import { AGENTS, ROUTER_SYSTEM_PROMPT, type AgentId } from '@/lib/agents'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ✅ Notion REST API 도구 정의
const NOTION_TOOLS: Anthropic.Tool[] = [
  {
    name: 'notion_create_page',
    description: 'Notion 워크스페이스에 새 페이지를 생성합니다. 업무 기록, 보고서, 메모 등을 저장할 때 사용하세요.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '페이지 제목' },
        content: { type: 'string', description: '페이지 내용' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'notion_search',
    description: 'Notion에서 페이지를 검색합니다.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '검색어' },
      },
      required: ['query'],
    },
  },
  {
    name: 'notion_append_to_page',
    description: '기존 Notion 페이지에 내용을 추가합니다.',
    input_schema: {
      type: 'object',
      properties: {
        page_id: { type: 'string', description: '페이지 ID' },
        content: { type: 'string', description: '추가할 내용' },
      },
      required: ['page_id', 'content'],
    },
  },
]

// ✅ Notion API 실제 호출
async function callNotionAPI(toolName: string, input: Record<string, string>): Promise<string> {
  const key = process.env.NOTION_API_KEY
  if (!key) return JSON.stringify({ error: 'NOTION_API_KEY가 설정되지 않았어요' })

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  }

  try {
    if (toolName === 'notion_create_page') {
      const res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST', headers,
        body: JSON.stringify({
          parent: { type: 'page_id', page_id: '3379d3b60d6180d1a64bc5c9e3f00fa9' },
          properties: { title: { title: [{ text: { content: input.title } }] } },
          children: [{
            object: 'block', type: 'paragraph',
            paragraph: { rich_text: [{ type: 'text', text: { content: input.content } }] }
          }]
        }),
      })
      const data = await res.json()
      if (data.object === 'error') return JSON.stringify({ error: data.message })
      return JSON.stringify({ success: true, page_id: data.id, url: data.url, message: `✅ "${input.title}" 페이지가 Notion에 생성됐어요! 링크: ${data.url}` })
    }

    if (toolName === 'notion_search') {
      const res = await fetch('https://api.notion.com/v1/search', {
        method: 'POST', headers,
        body: JSON.stringify({ query: input.query, page_size: 5 }),
      })
      const data = await res.json()
      if (data.object === 'error') return JSON.stringify({ error: data.message })
      const results = data.results?.map((r: Record<string, unknown>) => {
        const props = r.properties as Record<string, { title?: { plain_text: string }[] }>
        const titleArr = props?.title?.title
        const title = Array.isArray(titleArr) ? titleArr[0]?.plain_text : '제목없음'
        return { id: r.id, title, url: r.url }
      })
      return JSON.stringify({ results })
    }

    if (toolName === 'notion_append_to_page') {
      const res = await fetch(`https://api.notion.com/v1/blocks/${input.page_id}/children`, {
        method: 'PATCH', headers,
        body: JSON.stringify({
          children: [{
            object: 'block', type: 'paragraph',
            paragraph: { rich_text: [{ type: 'text', text: { content: input.content } }] }
          }]
        }),
      })
      const data = await res.json()
      if (data.object === 'error') return JSON.stringify({ error: data.message })
      return JSON.stringify({ success: true, message: '✅ Notion 페이지에 내용을 추가했어요!' })
    }

    return JSON.stringify({ error: '알 수 없는 도구' })
  } catch (err) {
    return JSON.stringify({ error: String(err) })
  }
}

function hasNotionForTeam(teamId: string, mcpEnabled: Record<string, boolean>, mcpTeams: Record<string, string[]>): boolean {
  if (!mcpEnabled['notion']) return false
  const teams = mcpTeams['notion'] || []
  return teams.includes(teamId)
}

export async function POST(req: Request) {
  const {
    message,
    teamModels = {},
    teamEnabled = {},
    mcpEnabled = {},
    mcpTeams = {},
  } = await req.json()

  if (!message?.trim()) return new Response('메시지가 없습니다', { status: 400 })

  const { steps, isPipeline } = parsePipeline(message)
  const encoder = new TextEncoder()

  const workingAgentIds = AGENTS
    .map(a => a.id)
    .filter(id => id !== 'router' && teamEnabled[id] !== false)

  const readable = new ReadableStream({
    async start(controller) {
      const send = (obj: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

      try {
        let prevResult = ''

        for (let i = 0; i < steps.length; i++) {
          const step = steps[i]
          const isLast = i === steps.length - 1

          if (isPipeline) {
            send({ type: 'pipeline_step', step: i + 1, total: steps.length, task: step.task })
          }

          let targetAgentId: AgentId = step.agentId ?? 'content'
          let routerReason = ''

          if (!step.agentId) {
            const teamList = workingAgentIds.join(', ')
            const dynamicRouterPrompt = ROUTER_SYSTEM_PROMPT +
              `\n\n반드시 다음 목록에서만 팀을 선택하세요(router 제외): ${teamList}\n총괄실장(router)은 절대 선택하지 말고, 항상 다른 팀으로 라우팅하세요.`

            try {
              const routerRes = await anthropic.messages.create({
                model: teamModels['router'] ?? 'claude-haiku-4-5-20251001',
                max_tokens: 150,
                system: dynamicRouterPrompt,
                messages: [{ role: 'user', content: step.task }],
              })
              const raw = routerRes.content[0].type === 'text' ? routerRes.content[0].text : ''
              const parsed = JSON.parse(raw)
              const suggested = parsed.team as AgentId
              routerReason = parsed.reason ?? ''
              targetAgentId = (suggested && suggested !== 'router' && workingAgentIds.includes(suggested))
                ? suggested : (workingAgentIds[0] as AgentId ?? 'content')
            } catch {
              targetAgentId = workingAgentIds[0] as AgentId ?? 'content'
            }
          }

          if (teamEnabled[targetAgentId] === false) {
            targetAgentId = workingAgentIds[0] as AgentId ?? 'content'
          }

          const agent = AGENTS.find(a => a.id === targetAgentId) ?? AGENTS[1]
          const model = step.model ?? teamModels[targetAgentId] ?? agent.model
          const useNotion = hasNotionForTeam(targetAgentId, mcpEnabled, mcpTeams)
          const tools = useNotion ? NOTION_TOOLS : []

          send({
            type: 'agent', agentId: agent.id, agentName: agent.name,
            modelName: model, reason: routerReason, step: i + 1,
            mcpTools: useNotion ? 'Notion' : null,
          })

          const taskWithContext = injectContext(step, prevResult)

          if (tools.length > 0) {
            // ✅ Notion 도구 사용 - tool_use 루프
            const messages: Anthropic.MessageParam[] = [
              { role: 'user', content: taskWithContext }
            ]
            let fullText = ''
            let continueLoop = true

            while (continueLoop) {
              const res = await anthropic.messages.create({
                model, max_tokens: 4096,
                system: agent.systemPrompt,
                tools, messages,
              })

              for (const block of res.content) {
                if (block.type === 'text') {
                  fullText += block.text
                  send({ type: 'text', text: block.text, step: i + 1 })
                }
              }

              if (res.stop_reason === 'tool_use') {
                const toolResults: Anthropic.ToolResultBlockParam[] = []
                for (const block of res.content) {
                  if (block.type !== 'tool_use') continue
                  send({ type: 'text', text: `\n🔧 Notion ${block.name} 실행 중...\n`, step: i + 1 })
                  const result = await callNotionAPI(block.name, block.input as Record<string, string>)
                  const parsed = JSON.parse(result)
                  if (parsed.message) {
                    send({ type: 'text', text: parsed.message + '\n', step: i + 1 })
                    fullText += parsed.message + '\n'
                  }
                  toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
                }
                messages.push({ role: 'assistant', content: res.content })
                messages.push({ role: 'user', content: toolResults })
              } else {
                continueLoop = false
              }
            }
            prevResult = fullText

          } else {
            // ✅ 일반 스트리밍
            const stream = await anthropic.messages.stream({
              model, max_tokens: 4096,
              system: agent.systemPrompt,
              messages: [{ role: 'user', content: taskWithContext }],
            })
            let fullText = ''
            for await (const chunk of stream) {
              if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                fullText += chunk.delta.text
                send({ type: 'text', text: chunk.delta.text, step: i + 1 })
              }
            }
            prevResult = fullText
          }

          if (step.verify && isLast) {
            send({ type: 'verify_start' })
            const verifyRes = await anthropic.messages.create({
              model: teamModels['router'] ?? 'claude-haiku-4-5-20251001',
              max_tokens: 300,
              system: '검토 에이전트입니다. 결과물의 완성도를 평가하고 개선점을 3가지 bullet point로 정리해줘요.',
              messages: [{ role: 'user', content: `다음 결과물을 검토해줘요\n\n${prevResult}` }],
            })
            const verifyText = verifyRes.content[0].type === 'text' ? verifyRes.content[0].text : ''
            send({ type: 'verify_result', text: verifyText })
          }

          if (isPipeline && !isLast) {
            send({ type: 'step_done', step: i + 1 })
          }
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
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
