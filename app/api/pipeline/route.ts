import Anthropic from '@anthropic-ai/sdk'
import { parsePipeline, injectContext } from '@/lib/pipeline'
import { AGENTS, ROUTER_SYSTEM_PROMPT, type AgentId } from '@/lib/agents'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const { message } = await req.json()
  if (!message?.trim()) return new Response('입력이 없습니다', { status: 400 })

  const { steps, isPipeline } = parsePipeline(message)
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      const send = (obj: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

      try {
        let prevResult = ''

        for (let i = 0; i < steps.length; i++) {
          const step = steps[i]
          const isLast = i === steps.length - 1

          // 파이프라인 진행 상황 전송
          if (isPipeline) {
            send({ type: 'pipeline_step', step: i + 1, total: steps.length, task: step.task })
          }

          // 에이전트 자동 선택 (명시 안 된 경우)
          let targetAgentId: AgentId = step.agentId ?? 'router'
          let routerReason = ''

          if (!step.agentId) {
            try {
              const routerRes = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 150,
                system: ROUTER_SYSTEM_PROMPT,
                messages: [{ role: 'user', content: step.task }],
              })
              const raw = routerRes.content[0].type === 'text' ? routerRes.content[0].text : ''
              const parsed = JSON.parse(raw)
              targetAgentId = parsed.team as AgentId
              routerReason = parsed.reason ?? ''
            } catch { /* 라우팅 실패 시 router 사용 */ }
          }

          const agent = AGENTS.find(a => a.id === targetAgentId) ?? AGENTS[0]
          const model = step.model ?? agent.model

          send({ type: 'agent', agentId: agent.id, agentName: agent.name, reason: routerReason, step: i + 1 })

          // 이전 결과를 컨텍스트에 주입
          const taskWithContext = injectContext(step, prevResult)

          // 스트리밍 응답
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

          // !verify: 품질 검증 단계
          if (step.verify && isLast) {
            send({ type: 'verify_start' })
            const verifyRes = await anthropic.messages.create({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 300,
              system: '당신은 품질 검증 에이전트입니다. 결과물의 완성도, 정확성, 개선점을 간략하게 평가하세요. 3가지 bullet point로 정리하세요.',
              messages: [
                { role: 'user', content: `다음 결과를 검증해주세요:\n\n${fullText}` }
              ],
            })
            const verifyText = verifyRes.content[0].type === 'text' ? verifyRes.content[0].text : ''
            send({ type: 'verify_result', text: verifyText })
          }

          // 파이프라인 단계 완료
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
