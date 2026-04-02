import Anthropic from '@anthropic-ai/sdk'
import { AGENTS, ROUTER_SYSTEM_PROMPT, type AgentId } from '@/lib/agents'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { message, agentId } = await req.json()

    if (!message?.trim()) {
      return new Response('메시지를 입력해주세요', { status: 400 })
    }

    // Step 1: 에이전트 ID가 없으면 라우터가 자동 선택
    let targetAgentId: AgentId = agentId
    let routerReason = ''

    if (!agentId || agentId === 'auto') {
      const routerRes = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        system: ROUTER_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: message }],
      })
      try {
        const raw = routerRes.content[0].type === 'text' ? routerRes.content[0].text : ''
        const parsed = JSON.parse(raw)
        targetAgentId = parsed.team as AgentId
        routerReason = parsed.reason ?? ''
      } catch {
        targetAgentId = 'router'
      }
    }

    const agent = AGENTS.find(a => a.id === targetAgentId) ?? AGENTS[0]

    // Step 2: 선택된 에이전트가 스트리밍으로 응답
    const stream = await anthropic.messages.stream({
      model: agent.model,
      max_tokens: 1024,
      system: agent.systemPrompt,
      messages: [{ role: 'user', content: message }],
    })

    // Step 3: SSE (Server-Sent Events) 스트림 반환
    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        // 어떤 팀이 담당하는지 먼저 전송
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'agent', agentId: agent.id, agentName: agent.name, reason: routerReason })}\n\n`
          )
        )

        // 텍스트 스트리밍
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'text', text: chunk.delta.text })}\n\n`
              )
            )
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('Agent API error:', err)
    return new Response('에이전트 응답 오류가 발생했습니다', { status: 500 })
  }
}
