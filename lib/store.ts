export function saveData<T>(key: string, data: T) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, JSON.stringify(data)) } catch { }
}

export function loadData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

export interface Task {
  id: string; text: string; agentId: string; agentName: string
  done: boolean; createdAt: string; result?: string
}

export interface ChatLog {
  id: string; userText: string; agentName: string
  agentId: string; result: string; createdAt: string
}

export interface AppSettings {
  agentNames: Record<string, string>
  agentColors: Record<string, string>
  apiModel: string
}

// ✏️ 이름 바꾸려면 여기만 수정하세요!
export const STUDIO_NAME = '김려은의 AI 사무실'  // 🔵 상단 배너 (가운데)
export const PAGE_TITLE  = 'NOVERRA AI STUDIO'            // 🟡 탑바 제목 (왼쪽)
export const USER_NAME   = 'RYEO EUN KIM'         // 👤 사이드바 이름

export const DEFAULT_SETTINGS: AppSettings = {
  agentNames: {
    router: '라우터', web: '웹 팀', content: '콘텐츠 팀',
    edu: '교육 팀', research: '연구 팀', ops: '운영 팀',
  },
  agentColors: {
    router: '#a0c4ff', web: '#b5ead7', content: '#ffc8d8',
    edu: '#ffdac1', research: '#e2b4ff', ops: '#ff9eb5',
  },
  apiModel: 'claude-sonnet-4-5',
}