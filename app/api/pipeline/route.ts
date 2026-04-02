import Anthropic from '@anthropic-ai/sdk'
import { parsePipeline, injectContext } from '@/lib/pipeline'
import { AGENTS, ROUTER_SYSTEM_PROMPT, type AgentId } from '@/lib/agents'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const { message, teamModels = {}, teamEnabled = {} } = await req.json()
  if (!message?.trim()) return new Response('입력이 없습니다', { status: 400 })

  const { steps, isPipeline } = parsePipeline(message)
  const encoder = new TextEncoder()

  // ✅ 활성화된 팀 목록 — router 제외 (router는 직접 업무 안 함)
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
            // ✅ 라우터가 선택할 수 있는 팀: router 제외한 실무팀만
            const teamList = workingAgentIds.join(', ')
            const dynamicRouterPrompt = ROUTER_SYSTEM_PROMPT +
              `\n\n반드시 다음 실무팀 중 하나만 선택하세요 (router 선택 불가): ${teamList}\n총괄실장(router)은 절대 선택하지 마세요. 항상 실무팀에게 위임하세요.`

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

              // ✅ router가 선택됐으면 강제로 content팀으로 대체
              targetAgentId = (suggested && suggested !== 'router' && workingAgentIds.includes(suggested))
                ? suggested
                : (workingAgentIds[0] as AgentId ?? 'content')
            } catch {
              targetAgentId = workingAgentIds[0] as AgentId ?? 'content'
            }
          }

          // ✅ 꺼진 팀이면 첫 번째 활성 팀으로 대체
          if (teamEnabled[targetAgentId] === false) {
            targetAgentId = workingAgentIds[0] as AgentId ?? 'content'
          }

          const agent = AGENTS.find(a => a.id === targetAgentId) ?? AGENTS[1]
          const model = step.model ?? teamModels[targetAgentId] ?? agent.model

          send({ type: 'agent', agentId: agent.id, agentName: agent.name, modelName: model, reason: routerReason, step: i + 1 })

          const taskWithContext = injectContext(step, prevResult)

          const stream = await anthropic.messages.stream({
            model,
            max_tokens: 4096,
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

          if (step.verify && isLast) {
            send({ type: 'verify_start' })
            const verifyRes = await anthropic.messages.create({
              model: teamModels['router'] ?? 'claude-haiku-4-5-20251001',
              max_tokens: 300,
              system: '당신은 검증 에이전트입니다. 결과물의 품질을 평가하고 개선점을 알려주세요. 3가지 bullet point로 정리하세요.',
              messages: [{ role: 'user', content: `다음 결과물을 검증해주세요:\n\n${fullText}` }],
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
