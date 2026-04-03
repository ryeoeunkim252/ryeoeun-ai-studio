import Anthropic from '@anthropic-ai/sdk'
import { parsePipeline, injectContext } from '@/lib/pipeline'
import { AGENTS, ROUTER_SYSTEM_PROMPT, type AgentId } from '@/lib/agents'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ✅ MCP 서버 URL 매핑 (실제 연결 주소)
const MCP_SERVERS: Record<string, { url: string; name: string }> = {
  'gmail':           { url: 'https://gmail.mcp.claude.com/mcp',    name: 'gmail-mcp' },
  'google-drive':    { url: 'https://drive.mcp.claude.com/mcp',    name: 'gdrive-mcp' },
  'google-calendar': { url: 'https://calendar.mcp.claude.com/mcp', name: 'gcal-mcp' },
  'github':          { url: 'https://github.mcp.claude.com/mcp',   name: 'github-mcp' },
  'slack':           { url: 'https://slack.mcp.claude.com/mcp',    name: 'slack-mcp' },
  'notion':          { url: 'https://notion.mcp.claude.com/mcp',   name: 'notion-mcp' },
  'figma':           { url: 'https://figma.mcp.claude.com/mcp',    name: 'figma-mcp' },
  'jira':            { url: 'https://jira.mcp.claude.com/mcp',     name: 'jira-mcp' },
}

export async function POST(req: Request) {
  const {
    message,
    teamModels = {},
    teamEnabled = {},
    mcpEnabled = {},   // ✅ MCP ON/OFF 상태
    mcpTeams = {},     // ✅ MCP별 담당 팀
  } = await req.json()

  if (!message?.trim()) return new Response('메시지가 없습니다', { status: 400 })

  const { steps, isPipeline } = parsePipeline(message)
  const encoder = new TextEncoder()

  const workingAgentIds = AGENTS
    .map(a => a.id)
    .filter(id => id !== 'router' && teamEnabled[id] !== false)

  // ✅ 특정 팀에 연결된 MCP 서버 목록 가져오기
  const getMcpServersForTeam = (teamId: string) => {
    const servers = []
    for (const [mcpId, enabled] of Object.entries(mcpEnabled)) {
      if (!enabled) continue
      const assignedTeams: string[] = mcpTeams[mcpId] || []
      if (assignedTeams.includes(teamId) && MCP_SERVERS[mcpId]) {
        servers.push({
          type: 'url' as const,
          url: MCP_SERVERS[mcpId].url,
          name: MCP_SERVERS[mcpId].name,
        })
      }
    }
    return servers
  }

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
                ? suggested
                : (workingAgentIds[0] as AgentId ?? 'content')
            } catch {
              targetAgentId = workingAgentIds[0] as AgentId ?? 'content'
            }
          }

          if (teamEnabled[targetAgentId] === false) {
            targetAgentId = workingAgentIds[0] as AgentId ?? 'content'
          }

          const agent = AGENTS.find(a => a.id === targetAgentId) ?? AGENTS[1]
          const model = step.model ?? teamModels[targetAgentId] ?? agent.model

          // ✅ 이 팀에 연결된 MCP 서버 목록
          const mcpServers = getMcpServersForTeam(targetAgentId)
          const mcpNames = mcpServers.map(s => s.name).join(', ')

          send({
            type: 'agent',
            agentId: agent.id,
            agentName: agent.name,
            modelName: model,
            reason: routerReason,
            step: i + 1,
            mcpTools: mcpNames || null,  // ✅ 사용 중인 MCP 도구 이름
          })

          const taskWithContext = injectContext(step, prevResult)

          // ✅ MCP 서버가 있으면 연결해서 호출
          const streamParams: Parameters<typeof anthropic.messages.stream>[0] = {
            model,
            max_tokens: 4096,
            system: agent.systemPrompt,
            messages: [{ role: 'user', content: taskWithContext }],
            ...(mcpServers.length > 0 && { mcp_servers: mcpServers }),
          }

          const stream = await anthropic.messages.stream(streamParams)

          let fullText = ''
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              fullText += chunk.delta.text
              send({ type: 'text', text: chunk.delta.text, step: i + 1 })
            }
          }

          prevResult = fullText

          if (step.verify && isLast) {
            send({ type: 'verify_start' })
            const verifyRes = await anthropic.messages.create({
              model: teamModels['router'] ?? 'claude-haiku-4-5-20251001',
              max_tokens: 300,
              system: '당신은 검토 에이전트입니다. 결과물의 완성도를 평가하고 개선점을 제안해요. 3가지 bullet point로 정리해줘요.',
              messages: [{ role: 'user', content: `다음 결과물을 검토해줘요\n\n${fullText}` }],
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
