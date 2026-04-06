export type TaskStatus = 'pending' | 'running' | 'done' | 'error'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TeamId = 'design' | 'edu' | 'ops' | 'marketing'

export interface Task {
  id: string
  title: string
  description: string
  team: TeamId
  priority: TaskPriority
  status: TaskStatus
  createdAt: string
  startedAt?: string
  completedAt?: string
  result?: string
  error?: string
  tokenUsed?: number
}

export const TEAM_CONFIG: Record<TeamId, {
  name: string
  emoji: string
  agentName: string
  description: string
  color: string
  tools: string[]
  systemPrompt: string
}> = {
  design: {
    name: 'Design Team',
    emoji: '🎨',
    agentName: 'Pixel',
    description: 'UI/UX 디자인, 픽셀아트, 브랜드 에셋',
    color: 'var(--blush)',
    tools: ['Figma', 'GitHub'],
    systemPrompt: `당신은 RYEO EUN AI STUDIO의 디자인 팀 AI 에이전트 Pixel입니다.
CEO(려은)로부터 업무 지시를 받아 UI/UX 디자인, 픽셀아트, 브랜드 에셋 작업을 수행합니다.
연결된 도구: Figma, GitHub
업무 결과는 구체적이고 실행 가능하게 제시하세요.
한국어로 답변하세요.`,
  },
  edu: {
    name: 'Edu Team',
    emoji: '💻',
    agentName: 'Code',
    description: '개발, 코드 리뷰, 학습 콘텐츠',
    color: 'var(--olive)',
    tools: ['GitHub', 'Google Drive'],
    systemPrompt: `당신은 RYEO EUN AI STUDIO의 개발 팀 AI 에이전트 Code입니다.
CEO(려은)로부터 업무 지시를 받아 개발, 코드 리뷰, 학습 콘텐츠 작업을 수행합니다.
연결된 도구: GitHub, Google Drive
업무 결과는 구체적이고 실행 가능하게 제시하세요.
한국어로 답변하세요.`,
  },
  ops: {
    name: 'Ops Team',
    emoji: '⚙️',
    agentName: 'Ops',
    description: '일정 관리, 운영, 자동화',
    color: 'var(--copper)',
    tools: ['Google Calendar', 'Notion'],
    systemPrompt: `당신은 RYEO EUN AI STUDIO의 운영 팀 AI 에이전트 Ops입니다.
CEO(려은)로부터 업무 지시를 받아 일정 관리, 운영, 자동화 작업을 수행합니다.
연결된 도구: Google Calendar, Notion
업무 결과는 구체적이고 실행 가능하게 제시하세요.
한국어로 답변하세요.`,
  },
  marketing: {
    name: 'Marketing Team',
    emoji: '📣',
    agentName: 'Brand',
    description: '콘텐츠, 마케팅, 브랜딩',
    color: 'var(--eggplant)',
    tools: ['Notion'],
    systemPrompt: `당신은 RYEO EUN AI STUDIO의 마케팅 팀 AI 에이전트 Brand입니다.
CEO(려은)로부터 업무 지시를 받아 콘텐츠 기획, 마케팅, 브랜딩 작업을 수행합니다.
연결된 도구: Notion
업무 결과는 구체적이고 실행 가능하게 제시하세요.
한국어로 답변하세요.`,
  },
}

export const PRIORITY_CONFIG: Record<TaskPriority, {
  label: string
  color: string
  bgColor: string
}> = {
  urgent: { label: '🔴 긴급', color: '#ef4444', bgColor: 'rgba(239,68,68,0.12)' },
  high:   { label: '🟠 높음', color: '#f97316', bgColor: 'rgba(249,115,22,0.12)' },
  normal: { label: '🟡 보통', color: '#eab308', bgColor: 'rgba(234,179,8,0.12)'  },
  low:    { label: '🟢 낮음', color: '#22c55e', bgColor: 'rgba(34,197,94,0.12)'  },
}

export const TASKS_STORAGE_KEY = 'ryeoeun_studio_tasks'

export function loadTasks(): Task[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveTasks(tasks: Task[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks))
}

export function createTask(
  title: string,
  description: string,
  team: TeamId,
  priority: TaskPriority
): Task {
  return {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title, description, team, priority,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
}