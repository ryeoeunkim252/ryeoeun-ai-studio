import { createClient } from '@supabase/supabase-js'

// ── Supabase 클라이언트 (lazy 초기화로 SSR 충돌 방지) ─────────
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// ── 클라우드 저장 ──────────────────────────────────────────────
export async function saveData<T>(key: string, data: T): Promise<void> {
  // localStorage에도 저장 (빠른 로딩용)
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(key, JSON.stringify(data)) } catch (_) { }
  }
  // Supabase에 저장 (PC 간 공유용)
  try {
    const supabase = getSupabase()
    if (!supabase) return
    await supabase.from('nk_store').upsert({
      id: key,
      data: data as unknown,
      updated_at: new Date().toISOString(),
    })
  } catch (_) { }
}

// ── 클라우드에서 불러오기 ─────────────────────────────────────
export async function loadDataAsync<T>(key: string, fallback: T): Promise<T> {
  try {
    const supabase = getSupabase()
    if (!supabase) return fallback
    const { data, error } = await supabase
      .from('nk_store')
      .select('data')
      .eq('id', key)
      .single()
    if (error || !data) return fallback
    return (data as { data: T }).data
  } catch (_) { return fallback }
}

// ── 동기 버전 (localStorage만, 기존 코드 호환) ─────────────────
export function loadData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch (_) { return fallback }
}

// ── 초기 로딩: 클라우드 → localStorage 동기화 ─────────────────
export async function syncFromCloud(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const supabase = getSupabase()
    if (!supabase) return
    const { data, error } = await supabase
      .from('nk_store')
      .select('id, data')
    if (error || !data) return
    for (const row of data) {
      try {
        localStorage.setItem(row.id as string, JSON.stringify(row.data))
      } catch (_) { }
    }
  } catch (_) { }
}

// ── 타입 정의 ─────────────────────────────────────────────────
export interface Task {
  id: string
  text: string
  agentId: string
  agentName: string
  done: boolean
  createdAt: string
  result?: string
}

export interface ChatLog {
  id: string
  userText: string
  agentName: string
  agentId: string
  result: string
  createdAt: string
}

export interface AppSettings {
  agentNames: Record<string, string>
  agentColors: Record<string, string>
  apiModel: string
}

// ── 스튜디오 상수 ──────────────────────────────────────────────
export const STUDIO_NAME = '김려은의 AI 사무실'
export const PAGE_TITLE  = 'NOVERRA AI STUDIO'
export const USER_NAME   = 'RYEO EUN KIM'

// ── 기본 설정 (새 조직도 반영) ─────────────────────────────────
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