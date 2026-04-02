import Anthropic from '@anthropic-ai/sdk'
import { parsePipeline, injectContext } from '@/lib/pipeline'
import { AGENTS, ROUTER_SYSTEM_PROMPT, type AgentId } from '@/lib/agents'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const { message, teamModels = {}, teamEnabled = {} } = await req.json()
  if (!message?.trim()) return new Response('입력이 없습니다', { status: 400 })

  const { steps, isPipeline } = parsePipeline(message)
  const encoder = new TextEncoder()

  // ✅ 활성화된 팀 목록 (꺼진 팀은 라우팅 제외)
  const enabledAgentIds = AGENTS
    .map(a => a.id)
    .filter(id => teamEnabled[id] !== false)

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

          let targetAgentId: AgentId = step.agentId ?? 'router'
          let routerReason = ''

          if (!step.agentId) {
            // ✅ 라우터 프롬프트에 활성화된 팀만 포함
            const enabledTeamList = enabledAgentIds.join(', ')
            const dynamicRouterPrompt = ROUTER_SYSTEM_PROMPT +
              `\n\n현재 활성화된 팀만 선택하세요: ${enabledTeamList}`

            try {
              const routerRes = await anthropic.messages.create({
                model: teamModels['router'] ?? 'claude-haiku-4-5-20251001',
                max_tokens: 150,
                system: dynamicRouterPrompt,
                messages: [{ role: 'user', content: step.task }],
              })
              const raw = routerRes.content[0].type === 'text' ? routerRes.content[0].text : ''
              const parsed = JSON.parse(raw)
              targetAgentId = parsed.team as AgentId
              routerReason = parsed.reason ?? ''
            } catch { /* 라우터 실패 시 router 사용 */ }
          }

          // ✅ 꺼진 팀이면 router로 fallback
          if (teamEnabled[targetAgentId] === false) {
            targetAgentId = enabledAgentIds[0] as AgentId ?? 'router'
          }

          const agent = AGENTS.find(a => a.id === targetAgentId) ?? AGENTS[0]

          // ✅ 설정된 모델 우선 사용, 없으면 step 지정 모델, 없으면 agents.ts 기본값
          const model = step.model ?? teamModels[targetAgentId] ?? agent.model

          send({ type: 'agent', agentId: agent.id, agentName: agent.name, reason: routerReason, step: i + 1 })

          const taskWithContext = injectContext(step, prevResult)

          const stream = await anthropic.messages.stream({
            model,
            max_tokens: 1024,
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
              messages: [
                { role: 'user', content: `다음 결과물을 검증해주세요:\n\n${fullText}` }
              ],
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
