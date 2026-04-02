import type { AgentId } from './agents'

export interface PipelineStep {
  raw: string           // 원본 텍스트
  agentId?: AgentId     // 명시된 에이전트 (@web, @research 등)
  model?: string        // 명시된 모델 (@opus, @sonnet 등)
  verify?: boolean      // !verify 키워드
  task: string          // 실제 작업 내용
}

export interface ParsedPipeline {
  steps: PipelineStep[]
  isPipeline: boolean
}

const AGENT_KEYWORDS: Record<string, AgentId> = {
  '@web': 'web',
  '@웹': 'web',
  '@content': 'content',
  '@콘텐츠': 'content',
  '@edu': 'edu',
  '@교육': 'edu',
  '@research': 'research',
  '@연구': 'research',
  '@ops': 'ops',
  '@운영': 'ops',
  '@router': 'router',
  '@라우터': 'router',
}

const MODEL_KEYWORDS: Record<string, string> = {
  '@opus': 'claude-opus-4-5',
  '@sonnet': 'claude-sonnet-4-5',
  '@haiku': 'claude-haiku-4-5-20251001',
  '@gemini': 'gemini-pro',  // 향후 확장
}

export function parsePipeline(input: string): ParsedPipeline {
  // >> 로 분리
  const rawSteps = input.split('>>').map(s => s.trim()).filter(Boolean)

  if (rawSteps.length <= 1) {
    // 단일 명령 — 파이프라인 아님
    return { steps: [parseStep(input)], isPipeline: false }
  }

  return {
    steps: rawSteps.map(parseStep),
    isPipeline: true,
  }
}

function parseStep(raw: string): PipelineStep {
  let task = raw
  let agentId: AgentId | undefined
  let model: string | undefined
  let verify = false

  // !verify 추출
  if (task.includes('!verify')) {
    verify = true
    task = task.replace('!verify', '').trim()
  }

  // @키워드 추출
  const words = task.split(' ')
  const remaining: string[] = []

  for (const word of words) {
    const lower = word.toLowerCase()
    if (AGENT_KEYWORDS[lower]) {
      agentId = AGENT_KEYWORDS[lower]
    } else if (MODEL_KEYWORDS[lower]) {
      model = MODEL_KEYWORDS[lower]
    } else {
      remaining.push(word)
    }
  }

  task = remaining.join(' ').trim()

  return { raw, agentId, model, verify, task }
}

// 파이프라인 결과를 다음 단계에 주입
export function injectContext(step: PipelineStep, prevResult: string): string {
  if (!prevResult) return step.task
  return `이전 단계 결과:\n---\n${prevResult}\n---\n\n현재 작업: ${step.task}`
}
