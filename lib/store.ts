import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function saveData<T>(key: string, data: T): Promise<void> {
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(key, JSON.stringify(data)) } catch { }
  }
  try {
    await supabase.from('nk_store').upsert({
      id: key, data: data, updated_at: new Date().toISOString()
    })
  } catch { }
}

export async function loadDataAsync<T>(key: string, fallback: T): Promise<T> {
  try {
    const { data, error } = await supabase
      .from('nk_store').select('data').eq('id', key).single()
    if (error || !data) return fallback
    return data.data as T
  } catch { return fallback }
}

export function loadData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

export async function syncFromCloud(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const { data, error } = await supabase.from('nk_store').select('id, data')
    if (error || !data) return
    data.forEach(row => {
      try { localStorage.setItem(row.id, JSON.stringify(row.data)) } catch { }
    })
  } catch { }
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

export const STUDIO_NAME = '김려은의 AI 사무실'
export const PAGE_TITLE = 'NOVERRA AI STUDIO'
export const USER_NAME = 'RYEO EUN KIM'

// ── 새 조직도 반영 ──────────────────────────────────────────
export const DEFAULT_SETTINGS: AppSettings = {
  agentNames: {
    router:   '총괄실장',
    content:  '콘텐츠팀장',
    research: '전략실장',
    ops:      '자동화팀장',
    web:      '수익화팀장',
    edu:      '데이터팀장',
  },
  agentColors: {
    router:   '#c06080',
    content:  '#d85a30',
    research: '#1d9e75',
    ops:      '#378add',
    web:      '#ba7517',
    edu:      '#3b6d11',
  },
  apiModel: 'claude-sonnet-4-5',
}