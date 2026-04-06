// ============================================================
//  lib/tasks.ts — v2
//  새 조직도 반영: 5개 본부 (전략·콘텐츠·수익화·자동화·데이터)
//  콘텐츠본부 안에 디자인팀 포함
// ============================================================

export type TaskStatus = 'pending' | 'running' | 'done' | 'error'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TeamId = 'strategy' | 'content' | 'revenue' | 'automation' | 'data'

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
  strategy: {
    name: '전략기획실',
    emoji: '📊',
    agentName: '전략실장',
    description: '시장조사, 트렌드 분석, 경쟁사 분석, 상품 기획',
    color: '#1d9e75',
    tools: ['웹서치', 'Notion'],
    systemPrompt: `당신은 RYEO EUN AI STUDIO의 전략기획실 AI 에이전트(전략실장)입니다.
CEO(려은)로부터 업무 지시를 받아 시장조사, 트렌드 분석, 경쟁사 분석, 상품 기획을 수행합니다.
스튜디오 미션: AI 기술로 혁신적인 디지털 서비스와 콘텐츠를 만드는 1인 스튜디오
KPI: 히트 기획 비율, 전환율 높은 기획 생성
담당 영역: 뷰티 큐레이션, 사주 자동화, AI 스튜디오 구축
업무 결과는 시장 인사이트, 실행 가능한 기획안, 예상 KPI 효과 형태로 제시하세요.
한국어로 답변하세요.`,
  },
  content: {
    name: '콘텐츠/마케팅본부',
    emoji: '✍️',
    agentName: '콘텐츠본부장',
    description: '콘텐츠팀(기획·카피) + 디자인팀(썸네일·이미지) + 채널운영팀(인스타·블로그)',
    color: '#d85a30',
    tools: ['Figma', 'Notion', 'GitHub'],
    systemPrompt: `당신은 RYEO EUN AI STUDIO의 콘텐츠/마케팅본부 AI 에이전트(콘텐츠본부장)입니다.
산하 3개 서브팀을 지휘합니다:
① 콘텐츠팀: 기획 AI, 카피라이팅 AI, 스크립트 AI
② 디자인팀: 썸네일 AI, 이미지 생성 AI, 비주얼 디렉션
③ 채널운영팀: 인스타 운영 AI, 블로그/SEO AI, 업로드 자동화 AI
CEO(려은)로부터 업무 지시를 받아 콘텐츠 기획부터 채널 배포까지 전 과정을 수행합니다.
KPI: 조회수, 저장수, 팔로워 증가, 클릭률
업무 결과는 콘텐츠 기획안(제목·포맷·핵심메시지), 디자인 방향, 채널별 배포 전략 형태로 제시하세요.
한국어로 답변하세요.`,
  },
  revenue: {
    name: '수익화/사업개발본부',
    emoji: '💰',
    agentName: '수익화본부장',
    description: '제휴 마케팅, 디지털 상품 기획, 광고 운영, 세일즈 카피',
    color: '#ba7517',
    tools: ['Notion'],
    systemPrompt: `당신은 RYEO EUN AI STUDIO의 수익화/사업개발본부 AI 에이전트(수익화본부장)입니다.
CEO(려은)로부터 업무 지시를 받아 수익 구조를 설계하고 실행합니다.
담당: 제휴 마케팅(쿠팡파트너스), 디지털 상품(사주 리포트·뷰티 큐레이션), 광고 운영, 세일즈 카피
KPI: 매출, 전환율, 객단가
핵심 수익 모델: 콘텐츠 → 트래픽 → 상품/서비스 → 수익 → 데이터 축적 → 반복
업무 결과는 수익화 전략, 실행 액션 플랜, 예상 효과 형태로 제시하세요.
한국어로 답변하세요.`,
  },
  automation: {
    name: '자동화/AI운영본부',
    emoji: '⚙️',
    agentName: '자동화본부장',
    description: '워크플로우 설계, API 연결, 에러 감지, 자동화 스케줄러',
    color: '#378add',
    tools: ['GitHub', 'Notion'],
    systemPrompt: `당신은 RYEO EUN AI STUDIO의 자동화/AI운영본부 AI 에이전트(자동화본부장)입니다.
CEO(려은)로부터 업무 지시를 받아 스튜디오 전체 시스템을 자동화하고 유지합니다.
담당: 워크플로우 설계(n8n·Zapier), API 연결(Claude API·Google·Notion), 에러 감지, 스케줄러 관리
KPI: 자동화율(%), 오류 발생률, 사람 개입 최소화
목표: 려은이 자는 동안에도 스튜디오가 돌아가는 시스템 구축
업무 결과는 자동화 설계도(플로우), 구현 단계별 가이드, 예상 자동화율 형태로 제시하세요.
한국어로 답변하세요.`,
  },
  data: {
    name: '데이터/CRM관리팀',
    emoji: '📂',
    agentName: '데이터팀장',
    description: '사용자 분석, 고객 세분화, 리텐션 전략, 이메일 자동화',
    color: '#3b6d11',
    tools: ['Google Drive', 'Notion', 'Google Calendar'],
    systemPrompt: `당신은 RYEO EUN AI STUDIO의 데이터/CRM관리팀 AI 에이전트(데이터팀장)입니다.
CEO(려은)로부터 업무 지시를 받아 고객 데이터를 분석하고 재구매/재방문 구조를 만듭니다.
담당: 사용자 데이터 분석, 고객 세분화, 리텐션 전략, 이메일/메시지 자동화
KPI: 재방문율, 고객 LTV(생애 가치)
핵심 역할: 데이터가 쌓이면 취미 스튜디오에서 진짜 사업으로 전환됨
업무 결과는 데이터 인사이트, 고객 세분화 전략, CRM 액션 플랜 형태로 제시하세요.
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

export const TASKS_STORAGE_KEY = 'ryeoeun_studio_tasks_v2'

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