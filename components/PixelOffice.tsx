'use client'
import { useEffect, useRef, useState } from 'react'
import type { AgentId } from '@/lib/agents'

// ── Props ──────────────────────────────────────────────────
interface PixelOfficeProps {
  activeAgentId: AgentId | null
  onAgentClick?: (id: string) => void
}

// ── 사무실 크기 ────────────────────────────────────────────
const W = 1380
const H = 760

// ── 팀 색상 ────────────────────────────────────────────────
const COLORS: Record<string, string> = {
  router:          '#c06080',
  research:        '#1d9e75',
  content:         '#d85a30',
  content_plan:    '#e07840',
  content_design:  '#e07840',
  content_channel: '#e07840',
  web:             '#ba7517',
  ops:             '#378add',
  edu:             '#3b6d11',
}

// ── 콘텐츠 존 (파티션 구역) ────────────────────────────────
const CONTENT_ZONE = { x: 430, y: 195, w: 370, h: 330 }

// ── 에이전트 & 서브팀 정의 ─────────────────────────────────
const AGENTS = [
  // 총괄실장 (상단 중앙 - 프리미엄 자리)
  { id: 'router',          label: '총괄실장',    emoji: '🔀', x: 690,  y: 95  },
  // 전략기획실 (왼쪽)
  { id: 'research',        label: '전략기획실',  emoji: '📊', x: 185,  y: 285 },
  // ── 콘텐츠 존 (4명) ────────────────────────────────────
  { id: 'content',         label: '콘텐츠팀장',  emoji: '✍️', x: 498,  y: 258 },
  { id: 'content_plan',    label: '기획팀',      emoji: '📝', x: 670,  y: 258 },
  { id: 'content_design',  label: '디자인팀',    emoji: '🎨', x: 498,  y: 418 },
  { id: 'content_channel', label: '채널운영팀',  emoji: '📱', x: 670,  y: 418 },
  // 수익화팀 (오른쪽 상단)
  { id: 'web',             label: '수익화팀',    emoji: '💰', x: 980,  y: 220 },
  // 자동화팀 (오른쪽 하단 왼)
  { id: 'ops',             label: '자동화팀',    emoji: '⚙️', x: 870,  y: 490 },
  // 데이터팀 (오른쪽 하단 우)
  { id: 'edu',             label: '데이터팀',    emoji: '📂', x: 1130, y: 490 },
]

// ── 책상 그리기 ────────────────────────────────────────────
function Desk({ x, y, color, isLarge = false }: { x: number; y: number; color: string; isLarge?: boolean }) {
  const dw = isLarge ? 110 : 88
  const dd = isLarge ? 58 : 46  // 책상 깊이
  const ch = isLarge ? 28 : 22  // 의자 높이

  return (
    <g>
      {/* 의자 */}
      <ellipse cx={x} cy={y + dd / 2 + ch + 8} rx={isLarge ? 18 : 14} ry={isLarge ? 10 : 8}
        fill={color} opacity={0.4} />
      <rect x={x - (isLarge ? 13 : 10)} y={y + dd / 2 + 4} width={isLarge ? 26 : 20} height={ch}
        rx={5} fill={color} opacity={0.55} />

      {/* 책상 측면 (아랫면) */}
      <rect x={x - dw / 2} y={y + dd / 2} width={dw} height={10}
        rx={2} fill={color} opacity={0.25} />

      {/* 책상 상판 */}
      <rect x={x - dw / 2} y={y - dd / 2} width={dw} height={dd}
        rx={6} fill="white" opacity={0.92} stroke={color} strokeWidth={1.5} />

      {/* 모니터 */}
      <rect x={x - (isLarge ? 20 : 16)} y={y - dd / 2 - (isLarge ? 24 : 18)} width={isLarge ? 40 : 32} height={isLarge ? 22 : 17}
        rx={3} fill="#2a1820" stroke={color} strokeWidth={1} opacity={0.9} />
      <rect x={x - (isLarge ? 6 : 4)} y={y - dd / 2 - 2} width={isLarge ? 12 : 8} height={isLarge ? 5 : 4}
        rx={1} fill={color} opacity={0.5} />

      {/* 모니터 화면 - 빛나는 효과 */}
      <rect x={x - (isLarge ? 17 : 13)} y={y - dd / 2 - (isLarge ? 21 : 15)} width={isLarge ? 34 : 26} height={isLarge ? 14 : 11}
        rx={2} fill={color} opacity={0.3} />

      {/* 키보드 */}
      <rect x={x - (isLarge ? 16 : 12)} y={y - dd / 2 + dd - (isLarge ? 14 : 11)} width={isLarge ? 32 : 24} height={isLarge ? 8 : 7}
        rx={2} fill={color} opacity={0.18} stroke={color} strokeWidth={0.5} />
    </g>
  )
}

// ── 캐릭터 그리기 ──────────────────────────────────────────
function Character({ x, y, color, emoji, label, isActive, isSubTeam = false }:
  { x: number; y: number; color: string; emoji: string; label: string; isActive: boolean; isSubTeam?: boolean }) {

  const scale  = isSubTeam ? 0.82 : 1
  const bw     = 22 * scale   // 몸 너비
  const bh     = 26 * scale   // 몸 높이
  const headR  = 12 * scale   // 머리 반지름
  const fy     = y - 46 * scale  // 캐릭터 Y 오프셋

  return (
    <g>
      {/* 활성 글로우 */}
      {isActive && (
        <circle cx={x} cy={fy + bh / 2 - headR * 2} r={headR * 2.8}
          fill={color} opacity={0.18}>
          <animate attributeName="r" values={`${headR * 2.5};${headR * 3.2};${headR * 2.5}`}
            dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.18;0.32;0.18"
            dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* 몸 */}
      <rect x={x - bw / 2} y={fy} width={bw} height={bh}
        rx={5 * scale} fill={color} opacity={isActive ? 1 : 0.85} />

      {/* 머리 */}
      <circle cx={x} cy={fy - headR} r={headR} fill="#f5d5c0"
        stroke={color} strokeWidth={1.5} />

      {/* 이모지 얼굴 */}
      <text x={x} y={fy - headR + 5 * scale} textAnchor="middle"
        fontSize={isSubTeam ? 10 : 11} dominantBaseline="middle">{emoji}</text>

      {/* 이름 태그 */}
      <rect x={x - 34 * scale} y={fy + bh + 4 * scale} width={68 * scale} height={16 * scale}
        rx={4 * scale}
        fill={isActive ? color : 'rgba(40,15,25,0.75)'}
        stroke={color} strokeWidth={1} />
      <text x={x} y={fy + bh + 12 * scale + 1} textAnchor="middle"
        fill="white" fontSize={isSubTeam ? 8.5 : 9.5} fontWeight="600"
        fontFamily="Pretendard, sans-serif">{label}</text>

      {/* 활성 뱃지 */}
      {isActive && (
        <text x={x} y={fy - headR * 2 - 4} textAnchor="middle" fontSize={10}>⚡</text>
      )}
    </g>
  )
}

// ── 파티션 벽 그리기 ───────────────────────────────────────
function Partition({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line x1={x1} y1={y1} x2={x2} y2={y2}
      stroke="#d85a30" strokeWidth={5} strokeLinecap="round" opacity={0.55}
      strokeDasharray="8 4" />
  )
}

// ── 식물 장식 ──────────────────────────────────────────────
function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 12} rx={10} ry={6} fill="#5a3a1a" opacity={0.6} />
      <circle cx={x} cy={y} r={13} fill="#2d7a3a" opacity={0.75} />
      <circle cx={x - 7} cy={y + 4} r={9} fill="#3a9048" opacity={0.65} />
      <circle cx={x + 7} cy={y + 4} r={9} fill="#3a9048" opacity={0.65} />
      <text x={x} y={y + 5} textAnchor="middle" fontSize={13}>🌿</text>
    </g>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────
export default function PixelOffice({ activeAgentId, onAgentClick }: PixelOfficeProps) {
  const svgRef  = useRef<SVGSVGElement>(null)
  const [scale, setScale] = useState(1)

  // 반응형 스케일
  useEffect(() => {
    const resize = () => {
      if (!svgRef.current?.parentElement) return
      const pw = svgRef.current.parentElement.clientWidth
      setScale(Math.min(1, (pw - 16) / W))
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const isActive = (id: string) =>
    activeAgentId === id ||
    (id.startsWith('content_') && activeAgentId === 'content')

  return (
    <div style={{
      width: '100%', overflowX: 'auto',
      background: 'var(--bg2)',
      borderRadius: 16,
      padding: 8,
    }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width={W * scale}
        height={H * scale}
        style={{ display: 'block', margin: '0 auto' }}
      >
        {/* ── 배경 그라디언트 ─────────────────────────── */}
        <defs>
          <radialGradient id="bgGrad" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#faf4f0" />
            <stop offset="100%" stopColor="#f0e6e0" />
          </radialGradient>
          <radialGradient id="contentZoneGrad" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#fff3ec" />
            <stop offset="100%" stopColor="#fde8da" />
          </radialGradient>
          <pattern id="floorTile" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="none" />
            <rect width="39" height="39" rx="1" fill="white" opacity="0.35" />
          </pattern>
          <pattern id="contentTile" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="none" />
            <rect width="39" height="39" rx="1" fill="#d85a30" opacity="0.07" />
          </pattern>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.12" />
          </filter>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── 바닥 ───────────────────────────────────── */}
        <rect x={0} y={0} width={W} height={H} fill="url(#bgGrad)" />
        <rect x={20} y={20} width={W - 40} height={H - 40} fill="url(#floorTile)" rx={12} />

        {/* ── 벽 테두리 ──────────────────────────────── */}
        <rect x={20} y={20} width={W - 40} height={H - 40} rx={12}
          fill="none" stroke="#c8a090" strokeWidth={2} opacity={0.4} />

        {/* ── 콘텐츠 존 바닥 (주황 타일) ─────────────── */}
        <rect
          x={CONTENT_ZONE.x} y={CONTENT_ZONE.y}
          width={CONTENT_ZONE.w} height={CONTENT_ZONE.h}
          rx={10}
          fill="url(#contentTile)"
        />
        <rect
          x={CONTENT_ZONE.x} y={CONTENT_ZONE.y}
          width={CONTENT_ZONE.w} height={CONTENT_ZONE.h}
          rx={10}
          fill="none" stroke="#d85a30" strokeWidth={2.5} strokeDasharray="10 6" opacity={0.4}
        />

        {/* 콘텐츠 존 라벨 */}
        <rect x={CONTENT_ZONE.x + 8} y={CONTENT_ZONE.y - 14} width={130} height={22} rx={6}
          fill="#d85a30" opacity={0.85} />
        <text x={CONTENT_ZONE.x + 73} y={CONTENT_ZONE.y - 2}
          textAnchor="middle" fill="white" fontSize={11} fontWeight="700"
          fontFamily="Pretendard, sans-serif">✍️ 콘텐츠 본부</text>

        {/* ── 파티션 (콘텐츠 존 내부 구분선) ─────────── */}
        {/* 세로 중앙 구분선 */}
        <Partition
          x1={CONTENT_ZONE.x + CONTENT_ZONE.w / 2}
          y1={CONTENT_ZONE.y + 10}
          x2={CONTENT_ZONE.x + CONTENT_ZONE.w / 2}
          y2={CONTENT_ZONE.y + CONTENT_ZONE.h - 10}
        />
        {/* 가로 중앙 구분선 */}
        <Partition
          x1={CONTENT_ZONE.x + 10}
          y1={CONTENT_ZONE.y + CONTENT_ZONE.h / 2}
          x2={CONTENT_ZONE.x + CONTENT_ZONE.w - 10}
          y2={CONTENT_ZONE.y + CONTENT_ZONE.h / 2}
        />

        {/* ── 구역 라벨 (배경 영역) ─────────────────── */}
        {/* 전략기획실 존 */}
        <rect x={90} y={185} width={195} height={210} rx={8}
          fill="#1d9e75" fillOpacity={0.05}
          stroke="#1d9e75" strokeOpacity={0.25}
          strokeWidth={1.5} strokeDasharray="8 5" />

        {/* 수익화팀 존 */}
        <rect x={885} y={135} width={195} height={185} rx={8}
          fill="#ba7517" fillOpacity={0.05}
          stroke="#ba7517" strokeOpacity={0.25}
          strokeWidth={1.5} strokeDasharray="8 5" />

        {/* 자동화팀 + 데이터팀 하단 존 */}
        <rect x={770} y={415} width={400} height={210} rx={8}
          fill="#1a2a3a" fillOpacity={0.04}
          stroke="#378add" strokeOpacity={0.2}
          strokeWidth={1.5} strokeDasharray="8 5" />

        {/* ── 총괄실장 자리 (특별 구역) ─────────────── */}
        <rect x={575} y={38} width={230} height={140} rx={10}
          fill="#c06080" fillOpacity={0.06}
          stroke="#c06080" strokeOpacity={0.25} strokeWidth={2} />
        <text x={690} y={54} textAnchor="middle" fill="#c06080" fontSize={10} fontWeight="600"
          fontFamily="Pretendard, sans-serif" opacity={0.7}>👑 CEO 직속</text>

        {/* ── 장식 (식물) ───────────────────────────── */}
        <Plant x={60}  y={60} />
        <Plant x={W - 60} y={60} />
        <Plant x={60}  y={H - 60} />
        <Plant x={W - 60} y={H - 60} />
        <Plant x={310} y={550} />
        <Plant x={840} y={350} />

        {/* ── 책상들 ─────────────────────────────────── */}
        {AGENTS.map(agent => (
          <Desk
            key={`desk-${agent.id}`}
            x={agent.x}
            y={agent.y}
            color={COLORS[agent.id] ?? '#888'}
            isLarge={agent.id === 'router'}
          />
        ))}

        {/* ── 캐릭터들 ──────────────────────────────── */}
        {AGENTS.map(agent => (
          <g key={`char-${agent.id}`}
            onClick={() => {
              const realId = agent.id.startsWith('content_') ? 'content' : agent.id
              onAgentClick?.(realId as AgentId)
            }}
            style={{ cursor: 'pointer' }}>
            <Character
              x={agent.x}
              y={agent.y}
              color={COLORS[agent.id] ?? '#888'}
              emoji={agent.emoji}
              label={agent.label}
              isActive={isActive(agent.id)}
              isSubTeam={agent.id.startsWith('content_')}
            />
          </g>
        ))}

        {/* ── 입구 표시 ─────────────────────────────── */}
        <rect x={W / 2 - 45} y={H - 32} width={90} height={24} rx={6}
          fill="#2a1820" opacity={0.5} />
        <text x={W / 2} y={H - 17} textAnchor="middle"
          fill="white" fontSize={10} fontWeight="600"
          fontFamily="Pretendard, sans-serif" opacity={0.8}>🚪 입구</text>

        {/* ── 오피스 이름 ────────────────────────────── */}
        <text x={W / 2} y={H - 8} textAnchor="middle"
          fill="#c06080" fontSize={9} fontWeight="700"
          fontFamily="Pretendard, sans-serif" opacity={0.5}
          letterSpacing="3">RYEO EUN AI STUDIO</text>
      </svg>
    </div>
  )
}
