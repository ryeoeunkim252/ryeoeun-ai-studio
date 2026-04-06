import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { TEAM_CONFIG, TeamId } from '@/lib/tasks'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getKSTDateTime(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().replace('T', ' ').slice(0, 19) + ' KST'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, description, team, priority } = body as {
      title: string; description: string; team: TeamId; priority: string
    }

    if (!title || !description || !team) {
      return NextResponse.json({ error: '업무 제목, 내용, 팀을 모두 입력해주세요.' }, { status: 400 })
    }

    const teamConfig = TEAM_CONFIG[team]
    if (!teamConfig) {
      return NextResponse.json({ error: '존재하지 않는 팀입니다.' }, { status: 400 })
    }

    const userMessage = `[CEO 업무 지시서]
━━━━━━━━━━━━━━━━━━━━━━━━
📌 업무명: ${title}
⚡ 우선순위: ${priority}
🕐 지시 시각: ${getKSTDateTime()}
━━━━━━━━━━━━━━━━━━━━━━━━

📋 업무 내용:
${description}

━━━━━━━━━━━━━━━━━━━━━━━━
위 업무를 수행하고 결과를 보고해주세요.
결과는 다음 형식으로 작성해주세요:

✅ 완료 보고서
- 수행한 작업:
- 결과물/산출물:
- 다음 단계 (있다면):
- 특이사항 (있다면):`

    const response = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: teamConfig.systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const resultText = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('\n')

    const tokenUsed = response.usage.input_tokens + response.usage.output_tokens

    return NextResponse.json({
      success: true,
      result: resultText,
      tokenUsed,
      agentName: teamConfig.agentName,
      completedAt: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    return NextResponse.json({ error: `업무 실행 중 오류: ${message}` }, { status: 500 })
  }
}