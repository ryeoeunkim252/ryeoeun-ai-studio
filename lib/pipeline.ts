import type { AgentId } from './agents'

export interface PipelineStep {
  raw: string
  agentId?: AgentId
  model?: string
  verify?: boolean
  task: string
}

export interface ParsedPipeline {
  steps: PipelineStep[]
  isPipeline: boolean
}

const AGENT_KEYWORDS: Record<string, AgentId> = {
  // ── 비서 ──────────────────────────────────────────────────
  '@비서':      'secretary',

  // ── 기존 키워드 (호환성 유지) ──────────────────────
  '@web':      'web',
  '@웹':       'web',
  '@content':  'content',
  '@콘텐츠':  'content',
  '@edu':      'edu',
  '@교육':     'edu',
  '@research': 'research',
  '@연구':     'research',
  '@ops':      'ops',
  '@운영':     'ops',
  '@router':   'router',
  '@라우터':   'router',

  // ── 새 조직도 영문 @멘션 (이미지 기준) ─────────────
  '@cos':        'router',   // CoS = 총괄실장 (Chief of Staff)
  '@strategy':   'research', // Strategy = 전략실장
  // @content 이미 위에 있음 ✅
  '@revenue':    'web',      // Revenue = 수익화팀장
  '@automation': 'ops',      // Automation = 자동화팀장
  '@data':       'edu',      // Data = 데이터팀장
}

const MODEL_KEYWORDS: Record<string, string> = {
  '@opus':   'claude-opus-4-5',
  '@sonnet': 'claude-sonnet-4-5',
  '@haiku':  'claude-haiku-4-5-20251001',
  '@gemini': 'gemini-pro',
}

export function parsePipeline(input: string): ParsedPipeline {
  const rawSteps = input.split('>>').map(s => s.trim()).filter(Boolean)
  if (rawSteps.length <= 1) {
    return { steps: [parseStep(input)], isPipeline: false }
  }
  return { steps: rawSteps.map(parseStep), isPipeline: true }
}

function parseStep(raw: string): PipelineStep {
  let task = raw
  let agentId: AgentId | undefined
  let model: string | undefined
  let verify = false

  if (task.includes('!verify')) {
    verify = true
    task = task.replace('!verify', '').trim()
  }

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

export function injectContext(step: PipelineStep, prevResult: string): string {
  if (!prevResult) return step.task
  return `이전 단계 결과:\n---\n${prevResult}\n---\n\n현재 작업: ${step.task}`
}