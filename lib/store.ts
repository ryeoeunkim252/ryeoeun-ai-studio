import { createClient } from '@supabase/supabase-js'

// ── Supabase 클라이언트 ──────────────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// ── 클라우드 저장 (어떤 PC에서든 공유) ─────────────────
export async function saveData<T>(key: string, data: T): Promise<void> {
  // localStorage에도 저장 (빠른 로딩용)
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(key, JSON.stringify(data)) } catch { }
  }
  // Supabase에 저장 (PC 간 공유용)
  try {
    await supabase.from('nk_store').upsert({
      id: key,
      data: data,
      updated_at: new Date().toISOString()
    })
  } catch { }
}

// ── 클라우드에서 불러오기 ────────────────────────────
export async function loadDataAsync<T>(key: string, fallback: T): Promise<T> {
  try {
    const { data, error } = await supabase
      .from('nk_store')
      .select('data')
      .eq('id', key)
      .single()
    if (error || !data) return fallback
    return data.data as T
  } catch {
    return fallback
  }
}

// ── 동기 버전 (기존 코드 호환용 - localStorage만) ──────
export function loadData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

// ── 초기 로딩: 클라우드 → localStorage 동기화 ──────────
export async function syncFromCloud(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const { data, error } = await supabase
      .from('nk_store')
      .select('id, data')
    if (error || !data) return
    data.forEach(row => {
      try {
        localStorage.setItem(row.id, JSON.stringify(row.data))
      } catch { }
    })
  } catch { }
}

// ── 타입 정의 ────────────────────────────────────────
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

export const STUDIO_NAME = '김려은의 AI 사무실'
export const PAGE_TITLE  = 'NOVERRA AI STUDIO'
export const USER_NAME   = 'RYEO EUN KIM'

export const DEFAULT_SETTINGS: AppSettings = {
  agentNames: {
    router: '총괄실장', web: '웹 팀', content: '콘텐츠 팀',
    edu: '교육 팀', research: '연구 팀', ops: '운영 팀',
  },
  agentColors: {
    router: '#a0c4ff', web: '#b5ead7', content: '#ffc8d8',
    edu: '#ffdac1', research: '#e2b4ff', ops: '#ff9eb5',
  },
  apiModel: 'claude-sonnet-4-5',
}
