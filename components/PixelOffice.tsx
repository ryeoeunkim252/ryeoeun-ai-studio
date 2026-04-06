'use client'
import { useEffect, useRef, useState } from 'react'
import type { AgentId } from '@/lib/agents'
import { loadData, DEFAULT_SETTINGS, type AppSettings } from '@/lib/store'

interface Props { activeAgentId?: AgentId | null }

// ═══════════════════════════════════════════
//  상수
// ═══════════════════════════════════════════
const TS = 32          // 타일 크기
const COLS = 28
const ROWS = 16
const CW = 898
const CH = 518
const CP = 3           // 캐릭터 픽셀 1개 = 3 캔버스 픽셀
const CG_W = 9         // 캐릭터 그리드 가로
const CG_H = 18        // 캐릭터 그리드 세로
const CHAR_W = CG_W * CP  // = 27
const CHAR_H = CG_H * CP  // = 54

// ═══════════════════════════════════════════
//  타일 타입
// ═══════════════════════════════════════════
const T = {
  F:1, W:2, SH:3, SK:4, DK:5, MN:6, CH:7, PL:8, CP:9, DV:10,
  WB:11, MT:12, ME:13, SF:14, SA:15, FR:16, WT:17, RG:18, MT2:19,
} as const

// ═══════════════════════════════════════════
//  기본 에이전트 (디자인팀 추가)
// ═══════════════════════════════════════════
const DEFAULT_AGENTS = [
  { id:'router',  name:'총괄실장', hair:'#2a1a5a', skin:'#f4c890', shirt:'#1e3a5f', pants:'#0f1e30', shoes:'#080810', accent:'#e74c3c', hatStyle:'suit'   },
  { id:'web',     name:'웹 팀',   hair:'#18a8c0', skin:'#fde3a7', shirt:'#2980b9', pants:'#1a4060', shoes:'#101020', accent:'#f1c40f', hatStyle:'none'   },
  { id:'content', name:'콘텐츠팀', hair:'#c0508a', skin:'#fad7a0', shirt:'#8e44ad', pants:'#3d1a5e', shoes:'#180818', accent:'#e91e63', hatStyle:'bow'    },
  { id:'research',name:'연구 팀',  hair:'#304010', skin:'#f0c896', shirt:'#27ae60', pants:'#0f5230', shoes:'#081008', accent:'#2ecc71', hatStyle:'glass'  },
  { id:'edu',     name:'교육 팀',  hair:'#0a0a0a', skin:'#fdebd0', shirt:'#d35400', pants:'#5a2200', shoes:'#180808', accent:'#f39c12', hatStyle:'cap'    },
  { id:'ops',     name:'운영 팀',  hair:'#0a0a0a', skin:'#c8956c', shirt:'#2c3e50', pants:'#101820', shoes:'#060808', accent:'#1abc9c', hatStyle:'none'   },
  { id:'design',  name:'디자인팀', hair:'#e8c050', skin:'#f8d8b0', shirt:'#c0392b', pants:'#280a18', shoes:'#100808', accent:'#ff6b6b', hatStyle:'beret'  },
]
type AgDef = typeof DEFAULT_AGENTS[0] & { seat: {tc:number;tr:number} }
type CT = {id:string;icon:string;name:string}

// ═══════════════════════════════════════════
//  책상 배치 (중요도 순, 자동 확장)
// ═══════════════════════════════════════════
// 각 팀 좌석: [col, row] (책상 위치 기준)
const SEAT_POSITIONS = [
  { tc:2,  tr:3  },  // router   - 총괄 (맨 앞 중앙)
  { tc:7,  tr:3  },  // web
  { tc:12, tr:3  },  // content
  { tc:2,  tr:8  },  // research
  { tc:7,  tr:8  },  // edu
  { tc:12, tr:8  },  // ops
  { tc:2,  tr:12 },  // design
  // 커스텀 팀 (자동)
  { tc:7,  tr:12 },
  { tc:12, tr:12 },
  { tc:2,  tr:14 },
  { tc:7,  tr:14 },
  { tc:12, tr:14 },
]

// ═══════════════════════════════════════════
//  회의실 좌석 위치 (col 19-26, row 1-7)
// ═══════════════════════════════════════════
const MEETING_SEATS = [
  {tc:21,tr:3},{tc:22,tr:3},{tc:23,tr:3},{tc:24,tr:3},
  {tc:21,tr:6},{tc:22,tr:6},{tc:23,tr:6},{tc:24,tr:6},
]

// ═══════════════════════════════════════════
//  기본 맵 생성 함수
// ═══════════════════════════════════════════
const {F,W,SH,SK,DK,MN,CH,PL,CP:CP_T,DV,WB,MT,ME,SF,SA,FR,WT,RG,MT2} = T

function buildMap(agents: AgDef[]): number[][] {
  const map: number[][] = Array.from({length:ROWS}, () => Array(COLS).fill(F))

  // 외벽
  for(let c=0;c<COLS;c++) { map[0][c]=W; map[ROWS-1][c]=W }
  for(let r=0;r<ROWS;r++) { map[r][0]=W }

  // 칸막이 (구역 구분)
  for(let r=0;r<ROWS;r++) map[r][17]=DV

  // 책장 (상단 벽)
  for(let c=1;c<17;c++) map[1][c]=SH

  // 시계
  map[0][8]=SK

  // ── 팀 책상/의자 자동 배치 ──
  agents.forEach((ag, i) => {
    const s = SEAT_POSITIONS[i]
    if (!s || s.tr >= ROWS-1) return
    // 책상 2칸
    if(s.tc+1 < 17) {
      map[s.tr][s.tc]   = DK
      map[s.tr][s.tc+1] = MN  // 모니터는 DK 위
    }
    // 의자
    if(s.tr+1 < ROWS-1) map[s.tr+1][s.tc] = CH
    // 화분 (가끔)
    if(i % 3 === 2 && s.tc+3 < 17) map[s.tr][s.tc+3] = PL
  })

  // ── 회의실 (오른쪽) ──
  // 회의실 경계
  for(let r=1;r<8;r++) {
    map[r][18]=WT; map[r][27]=WT
  }
  map[1][18]=WB  // 화이트보드
  // 회의 테이블
  for(let c=20;c<=25;c++) {
    map[3][c]=MT; map[4][c]=MT; map[5][c]=MT
  }
  // 회의 의자
  for(let c=20;c<=25;c++) { map[2][c]=CH; map[6][c]=CH }
  map[3][19]=CH; map[4][19]=CH; map[3][26]=CH; map[4][26]=CH

  // ── 휴게실 (오른쪽 하단) ──
  map[9][19]=SA; map[9][20]=SF; map[9][21]=SF; map[9][22]=SA
  map[10][19]=SA; map[10][20]=SF; map[10][21]=SF; map[10][22]=SA
  map[9][24]=PL; map[9][26]=PL
  map[11][24]=FR; map[11][25]=FR

  // 바닥 카펫 (복도)
  for(let c=1;c<17;c++) {
    map[7][c]=CP_T
    map[11][c]=CP_T
  }

  // 화분 (벽 근처)
  map[14][1]=PL; map[14][5]=PL; map[14][9]=PL; map[14][13]=PL; map[14][16]=PL
  map[14][20]=PL; map[14][24]=PL

  return map
}

// ═══════════════════════════════════════════
//  에이전트 상태 타입
// ═══════════════════════════════════════════
type AgMode = 'sit'|'walk'|'return'|'meeting'|'meetReturn'|'roam'
type AgState = {
  def: AgDef
  x: number; y: number
  sx: number; sy: number   // 원래 좌석
  tx: number; ty: number   // 목표
  mode: AgMode
  dir: 'u'|'d'|'l'|'r'
  frame: number
  timer: number
  walksLeft: number
  meetSeat: number         // 회의 좌석 인덱스
  bubble: string
  bubbleTimer: number
}

const WORK_BUBBLES: Record<string, string[]> = {
  router:  ['업무 배분중','회의 소집!','전략 수립','보고 검토'],
  web:     ['코딩중...','버그 수정','PR 리뷰','배포 준비'],
  content: ['글 작성중','SNS 기획','영상 편집','카피 작성'],
  research:['데이터 분석','시장 조사','보고서 작성','트렌드 탐색'],
  edu:     ['강의 준비','교안 작성','학습 설계','자료 정리'],
  ops:     ['서버 점검','자동화 설정','모니터링','배포 중'],
  design:  ['UI 디자인','피그마 작업','아이콘 제작','화면 설계'],
}
const MEET_BUBBLES = ['회의중...','아이디어!','좋은데요?','그렇군요','검토해봐요','진행합시다']

// ═══════════════════════════════════════════
//  메인 컴포넌트
// ═══════════════════════════════════════════
export default function PixelOffice({ activeAgentId }: Props) {
  const cvRef  = useRef<HTMLCanvasElement>(null)
  const tick   = useRef(0)
  const actRef = useRef<AgentId|null|undefined>(null)
  const setRef = useRef<AppSettings>(DEFAULT_SETTINGS)
  const agRef  = useRef<AgState[]>([])
  const mapRef = useRef<number[][]>([])
  const meetRef = useRef<{active:boolean; timer:number; count:number}>({active:false,timer:600,count:0})

  useEffect(() => { actRef.current = activeAgentId }, [activeAgentId])

  useEffect(() => {
    const s = loadData<AppSettings>('nk_settings', DEFAULT_SETTINGS)
    const cts = loadData<CT[]>('nk_custom_teams', [])
    setRef.current = s

    // 모든 에이전트 (기본 + 커스텀)
    const customColors = [
      {hair:'#c0c0c8',skin:'#f4c080',shirt:'#4040a0',pants:'#202060',shoes:'#080810',accent:'#8080ff',hatStyle:'none'},
      {hair:'#482010',skin:'#fde3a7',shirt:'#902018',pants:'#400808',shoes:'#180808',accent:'#ff6060',hatStyle:'bow'},
      {hair:'#104830',skin:'#f0c896',shirt:'#208848',pants:'#083018',shoes:'#081008',accent:'#50e870',hatStyle:'none'},
      {hair:'#503008',skin:'#f8d090',shirt:'#806020',pants:'#403010',shoes:'#181008',accent:'#ffa030',hatStyle:'cap'},
    ]

    const allAgents: AgDef[] = [
      ...DEFAULT_AGENTS.map((d, i) => ({...d, seat: SEAT_POSITIONS[i]})),
      ...cts.slice(0, 4).map((ct, i) => ({
        id: ct.id, name: ct.name, seat: SEAT_POSITIONS[DEFAULT_AGENTS.length + i],
        ...customColors[i % customColors.length],
      }))
    ]

    // 맵 생성
    mapRef.current = buildMap(allAgents)

    // 에이전트 초기화
    agRef.current = allAgents.map((def, i) => {
      const s = SEAT_POSITIONS[i]
      const sx = 2 + s.tc * TS + CHAR_W/2
      const sy = 2 + (s.tr+1) * TS + TS/2
      const bubbles = WORK_BUBBLES[def.id] || WORK_BUBBLES.ops
      return {
        def, x:sx, y:sy, sx, sy, tx:sx, ty:sy,
        mode:'sit' as AgMode, dir:'u', frame:0,
        timer: 60 + Math.random()*120,
        walksLeft:0, meetSeat: i % MEETING_SEATS.length,
        bubble: bubbles[Math.floor(Math.random()*bubbles.length)],
        bubbleTimer: 80 + Math.random()*80,
      }
    })
  }, [])

  // ═══════════════════════════════════════════
  //  게임 루프
  // ═══════════════════════════════════════════
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return
    const ctx = cv.getContext('2d')!
    ctx.imageSmoothingEnabled = false

    const px = (x:number,y:number,w:number,h:number,c:string) => {
      if(w<=0||h<=0) return
      ctx.fillStyle=c; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))
    }
    const tpx = (tc:number) => 2+tc*TS
    const tpy = (tr:number) => 2+tr*TS

    const canWalk = (wx:number,wy:number) => {
      const tc=Math.floor((wx-2)/TS), tr=Math.floor((wy-2)/TS)
      if(tc<0||tc>=COLS||tr<0||tr>=ROWS) return false
      const t=mapRef.current[tr]?.[tc]
      return t===T.F||t===T.CP
    }

    const randTarget = (leftSide=true):{tx:number,ty:number} => {
      for(let i=0;i<40;i++){
        const tc = leftSide ? 1+Math.floor(Math.random()*15) : 19+Math.floor(Math.random()*7)
        const tr = 2+Math.floor(Math.random()*11)
        if(mapRef.current[tr]?.[tc]===T.F||mapRef.current[tr]?.[tc]===T.CP)
          return {tx:tpx(tc)+TS/2, ty:tpy(tr)+TS/2}
      }
      return {tx:tpx(5)+TS/2, ty:tpy(7)+TS/2}
    }

    // ──────────────────────────────────────────
    //  픽셀 캐릭터 그리기 (9×18 그리드, 3px/셀)
    // ──────────────────────────────────────────
    const drawChar = (
      ox: number, oy: number,
      def: AgDef,
      dir: 'u'|'d'|'l'|'r',
      frame: number,
      isActive: boolean,
      isPlayer = false
    ) => {
      const hair  = isPlayer ? '#2a1a5a' : def.hair
      const skin  = isPlayer ? '#f4c890' : def.skin
      const shirt = isPlayer ? '#c03030' : def.shirt
      const pants = isPlayer ? '#303060' : def.pants
      const shoes = isPlayer ? '#181818' : def.shoes
      const skinD = shadeColor(skin, -30)
      const shirtD= shadeColor(shirt, -30)

      // 걷기 진동
      const legA = Math.sin(frame * 1.5) * 1  // 다리 흔들기 픽셀 오프셋
      const t = tick.current

      // 그리드 픽셀 그리기 헬퍼
      const g = (col:number, row:number, color:string, extraX=0, extraY=0) => {
        px(ox + col*CP + extraX, oy + row*CP + extraY, CP, CP, color)
      }

      // ── 그림자 ──
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.beginPath()
      ctx.ellipse(ox+CHAR_W/2, oy+CHAR_H+2, 10, 3, 0, 0, Math.PI*2)
      ctx.fill()

      if (dir === 'u') {
        // 뒷모습 ──────────────────────────────
        // 머리카락 (전체)
        for(let c=1;c<8;c++) g(c,0,hair)
        for(let c=0;c<9;c++) g(c,1,hair)
        for(let c=0;c<9;c++) g(c,2,hair)
        for(let c=0;c<9;c++) g(c,3,hair)
        for(let c=0;c<9;c++) g(c,4,hair)
        for(let c=0;c<9;c++) g(c,5,hair)
        // 목
        g(3,6,skin); g(4,6,skin); g(5,6,skin)
        // 몸통
        for(let r=7;r<13;r++) for(let c=1;c<8;c++) g(c,r, r%2===0 ? shirt : shirtD)
        // 팔
        g(0,8,shirt); g(0,9,shirt); g(0,10,shirt); g(0,11,shirt)
        g(8,8,shirt); g(8,9,shirt); g(8,10,shirt); g(8,11,shirt)
        // 손
        g(0,12,skin); g(8,12,skin)
        // 다리
        const lo = Math.round(legA)
        g(2,13,pants,0, lo); g(3,13,pants,0, lo)
        g(5,13,pants,0,-lo); g(6,13,pants,0,-lo)
        g(2,14,pants,0, lo); g(3,14,pants,0, lo)
        g(5,14,pants,0,-lo); g(6,14,pants,0,-lo)
        g(2,15,pants,0, lo); g(3,15,pants,0, lo)
        g(5,15,pants,0,-lo); g(6,15,pants,0,-lo)
        // 신발
        g(1,16,shoes,0, lo); g(2,16,shoes,0, lo); g(3,16,shoes,0, lo)
        g(5,16,shoes,0,-lo); g(6,16,shoes,0,-lo); g(7,16,shoes,0,-lo)

      } else if (dir === 'd') {
        // 앞모습 ──────────────────────────────
        // 머리카락 상단
        for(let c=1;c<8;c++) g(c,0,hair)
        // 머리
        for(let c=0;c<9;c++) g(c,1,hair)
        // 얼굴 (row 2-6)
        g(0,2,hair); for(let c=1;c<8;c++) g(c,2,skin); g(8,2,hair)
        g(0,3,hair); for(let c=1;c<8;c++) g(c,3,skin); g(8,3,hair)
        // 눈 (row 3)
        g(2,3,'#fff'); g(3,3,'#fff')  // 왼쪽 흰자
        g(6,3,'#fff'); g(7,3,'#fff')  // 오른쪽 흰자
        g(2,3,'#1a0a2e'); g(3,3,'#1a0a2e')
        g(6,3,'#1a0a2e'); g(7,3,'#1a0a2e')
        // 눈동자 (작은 밝은 점)
        px(ox+2*CP+1, oy+3*CP+1, 2, 2, '#fff')
        px(ox+6*CP+1, oy+3*CP+1, 2, 2, '#fff')
        px(ox+2*CP, oy+3*CP, CP, CP, '#3a1a6e')  // 눈 색
        px(ox+6*CP, oy+3*CP, CP, CP, '#3a1a6e')
        // 코 (row 4)
        g(0,4,hair); for(let c=1;c<8;c++) g(c,4,skin); g(8,4,hair)
        px(ox+4*CP, oy+4*CP+1, CP, 2, skinD)  // 코 그림자
        // 입 (row 5)
        g(0,5,hair); for(let c=1;c<8;c++) g(c,5,skin); g(8,5,hair)
        // 입 모양
        const smileColor = isActive ? '#e05070' : '#c04060'
        px(ox+2*CP+1, oy+5*CP+1, CP+2, 2, smileColor)   // 입술
        px(ox+5*CP-1, oy+5*CP+1, CP+2, 2, smileColor)
        px(ox+3*CP+1, oy+5*CP+2, CP*2, 2, '#e08090')     // 이빨/입안
        // 턱
        g(0,6,hair); for(let c=1;c<8;c++) g(c,6,skin); g(8,6,hair)
        // 목
        g(3,7,skin); g(4,7,skin); g(5,7,skin)
        // 모자/악세서리
        drawHatPixel(ctx,ox,oy,def.hatStyle, def.accent, hair, dir)
        // 몸통
        for(let r=8;r<13;r++) for(let c=1;c<8;c++) g(c,r,shirt)
        for(let r=8;r<13;r++) g(8,r,shirtD)  // 오른쪽 음영
        // 팔
        g(0,9,shirt); g(0,10,shirt); g(0,11,shirt)
        g(8,9,shirtD); g(8,10,shirtD); g(8,11,shirtD)
        // 손
        g(0,12,skin); g(8,12,skin)
        // 다리
        const lo = Math.round(legA)
        g(2,13,pants,0, lo); g(3,13,pants,0, lo)
        g(5,13,pants,0,-lo); g(6,13,pants,0,-lo)
        g(2,14,pants,0, lo); g(3,14,pants,0, lo)
        g(5,14,pants,0,-lo); g(6,14,pants,0,-lo)
        g(2,15,pants,0, lo); g(3,15,pants,0, lo)
        g(5,15,pants,0,-lo); g(6,15,pants,0,-lo)
        // 신발
        g(1,16,shoes,0, lo); g(2,16,shoes,0, lo); g(3,16,shoes,0, lo)
        g(5,16,shoes,0,-lo); g(6,16,shoes,0,-lo); g(7,16,shoes,0,-lo)

      } else {
        // 옆모습 (l/r) ────────────────────────
        const flip = dir === 'l' ? 1 : -1
        const fx = (c:number) => dir==='r' ? 8-c : c

        // 머리
        for(let c=1;c<8;c++) g(fx(c),0,hair)
        for(let c=1;c<8;c++) g(fx(c),1,hair)
        // 얼굴
        for(let r=2;r<7;r++) {
          g(fx(0),r,hair)
          for(let c=1;c<7;c++) g(fx(c),r,skin)
          g(fx(7),r,hair)
          g(fx(8),r,hair)
        }
        // 눈 (한쪽만)
        const eyeX = dir==='l' ? 2 : 6
        g(eyeX,3,'#fff'); g(eyeX,3,'#1a0a2e')
        px(ox+eyeX*CP+1, oy+3*CP+1, 2, 2, '#fff')
        // 코
        px(ox+(dir==='l'?1:7)*CP, oy+4*CP, CP, CP, skinD)
        // 입
        px(ox+(dir==='l'?2:5)*CP, oy+5*CP+1, CP, 2, '#c04060')
        // 목
        g(dir==='l'?3:5,7,skin)
        // 뒷머리
        for(let r=1;r<7;r++) g(dir==='l'?8:0,r,hair)
        // 모자
        drawHatPixel(ctx,ox,oy,def.hatStyle,def.accent,hair,dir)
        // 몸통
        for(let r=8;r<13;r++) for(let c=1;c<8;c++) g(c,r,shirt)
        // 한쪽 팔만
        const armC = dir==='l' ? 8 : 0
        g(armC,9,shirt); g(armC,10,shirt); g(armC,11,shirt); g(armC,12,skin)
        // 다리
        const lo = Math.round(legA*flip)
        g(3,13,pants,0, lo); g(4,13,pants,0,-lo)
        g(3,14,pants,0, lo); g(4,14,pants,0,-lo)
        g(3,15,pants,0, lo); g(4,15,pants,0,-lo)
        g(2,16,shoes,0, lo); g(3,16,shoes,0, lo)
        g(4,16,shoes,0,-lo); g(5,16,shoes,0,-lo)
      }

      // 활성 에이전트 글로우
      if (isActive) {
        const glow = Math.sin(t*5)*0.4+0.6
        ctx.strokeStyle = def.accent
        ctx.lineWidth = 1.5
        ctx.globalAlpha = glow
        ctx.strokeRect(ox-1, oy-1, CHAR_W+2, CHAR_H+2)
        ctx.globalAlpha = 1
      }
    }

    // 모자/악세서리 그리기
    const drawHatPixel = (
      ctx: CanvasRenderingContext2D,
      ox:number, oy:number,
      style:string, accent:string, hair:string,
      dir:'u'|'d'|'l'|'r'
    ) => {
      const g = (col:number,row:number,color:string) =>
        px(ox+col*CP, oy+row*CP, CP, CP, color)
      if(style==='suit') {
        // 정장 넥타이
        g(4,8,accent); g(4,9,accent); g(4,10,accent)
        g(3,11,accent); g(4,11,accent); g(5,11,accent)
      } else if(style==='bow') {
        // 머리 리본
        if(dir==='d'||dir==='u') {
          g(2,-1,accent); g(3,-1,accent); g(4,-1,accent)
          g(5,-1,accent); g(6,-1,accent)
          g(3,-2,accent); g(4,0,accent); g(5,-2,accent)
        }
      } else if(style==='glass') {
        // 안경
        if(dir==='d') {
          ctx.strokeStyle='#303050'; ctx.lineWidth=1
          ctx.strokeRect(ox+CP*1+1, oy+CP*3+1, CP*2+1, CP*2+1)
          ctx.strokeRect(ox+CP*5, oy+CP*3+1, CP*2+1, CP*2+1)
          px(ox+CP*4, oy+CP*4, CP, 1, '#303050')
        }
      } else if(style==='cap') {
        // 야구 모자
        if(dir==='d'||dir==='u') {
          for(let c=1;c<8;c++) g(c,-1,accent)
          g(0,0,accent); g(8,0,accent)
          for(let c=0;c<10;c++) px(ox+c*CP-CP, oy, CP, 2, shadeColor(accent,-20))
        }
      } else if(style==='beret') {
        // 베레모
        if(dir==='d'||dir==='u') {
          for(let c=0;c<9;c++) g(c,-1,accent)
          for(let c=1;c<8;c++) g(c,-2,accent)
          g(6,-3,shadeColor(accent,-20))
        }
      }
    }

    // ── 이름표 ──
    const drawLabel = (ox:number,oy:number,name:string,active:boolean,accent:string) => {
      ctx.font = 'bold 9px "Jua",monospace'
      const tw = ctx.measureText(name).width + 8
      const lx = ox+CHAR_W/2-tw/2, ly = oy-14
      // 픽셀 스타일 그림자
      px(lx+1,ly+1,tw,12,'rgba(0,0,0,0.8)')
      ctx.fillStyle = active ? accent : 'rgba(20,10,50,0.92)'
      ctx.fillRect(Math.round(lx),Math.round(ly),Math.round(tw),12)
      ctx.strokeStyle = active ? '#fff' : 'rgba(180,160,240,0.5)'
      ctx.lineWidth = 1
      ctx.strokeRect(Math.round(lx),Math.round(ly),Math.round(tw),12)
      ctx.fillStyle='#fff'; ctx.textAlign='center'
      ctx.fillText(name,ox+CHAR_W/2,ly+9); ctx.textAlign='left'
    }

    // ── 말풍선 ──
    const drawBubble = (ox:number,oy:number,text:string,accent:string,isMeet=false) => {
      const bob = Math.sin(tick.current*3)*1.5
      ctx.font = '8px "Jua",monospace'
      const tw = ctx.measureText(text).width + 8
      const bx = ox+CHAR_W/2-tw/2, by = oy-32+bob
      // 그림자
      px(bx+1,by+1,tw,14,'rgba(0,0,0,0.5)')
      ctx.fillStyle = isMeet ? '#fffbe8' : '#fff'
      ctx.fillRect(Math.round(bx),Math.round(by),Math.round(tw),14)
      ctx.strokeStyle = accent; ctx.lineWidth = 1.5
      ctx.strokeRect(Math.round(bx),Math.round(by),Math.round(tw),14)
      // 꼬리 (픽셀)
      px(ox+CHAR_W/2-2,by+14,5,3,'#fff')
      px(ox+CHAR_W/2-1,by+17,3,2,'#fff')
      ctx.fillStyle = isMeet ? '#705000' : '#100828'
      ctx.font = 'bold 8px "Jua",monospace'
      ctx.textAlign='center'; ctx.fillText(text,ox+CHAR_W/2,by+10); ctx.textAlign='left'
    }

    // ═══════════════════════════════════════
    //  타일 렌더러 (실사 느낌)
    // ═══════════════════════════════════════
    const drawTile = (tile:number, x:number, y:number, tc:number, tr:number) => {
      const t2 = tick.current
      switch(tile) {
        case T.F: {
          // 바닥 - 나무 패턴
          const c1='#c8c0a8', c2='#b8b098'
          px(x,y,TS,TS,(tc+tr)%2===0?c1:c2)
          // 나무 결 선
          ctx.strokeStyle='rgba(0,0,0,0.04)'; ctx.lineWidth=0.5
          for(let i=0;i<4;i++) {
            ctx.beginPath(); ctx.moveTo(x,y+i*8); ctx.lineTo(x+TS,y+i*8+4); ctx.stroke()
          }
          break
        }
        case T.CP: {
          // 카펫 - 패턴 있는
          px(x,y,TS,TS,'#3a3080')
          px(x+2,y+2,TS-4,TS-4,'#484898')
          for(let i=0;i<3;i++) for(let j=0;j<3;j++)
            px(x+4+i*8,y+4+j*8,4,4,'rgba(120,100,200,0.4)')
          ctx.strokeStyle='rgba(200,180,255,0.15)'; ctx.lineWidth=1
          ctx.strokeRect(x+4,y+4,TS-8,TS-8)
          break
        }
        case T.W: {
          // 벽 - 벽돌 질감
          px(x,y,TS,TS,'#9a8c76')
          px(x,y,TS,3,'#c0a870')   // 몰딩
          px(x,y+TS-2,TS,2,'rgba(0,0,0,0.2)')
          // 벽돌 선
          ctx.strokeStyle='rgba(0,0,0,0.07)'; ctx.lineWidth=0.5
          ctx.strokeRect(x,y,TS,TS)
          if(tc%2===0) px(x,y+TS/2,TS,1,'rgba(0,0,0,0.08)')
          break
        }
        case T.WT: px(x,y,TS,TS,'#6a5c48'); break
        case T.SH: {
          // 책장 - 나무 + 책들
          px(x,y,TS,TS,'#7a5020')
          px(x,y,TS,2,'#aa6830')
          px(x,y+TS-3,TS,3,'#4a2808')
          px(x+1,y+3,TS-2,TS-6,'#6a4010')
          // 책 (픽셀로)
          const bookColors=['#e04040','#3880e8','#38a038','#e89828','#9828e8','#28a8c0']
          let bx=x+2
          for(let b=0;b<4;b++){
            const bh=8+((tc*3+b*7)%6), bc=bookColors[(tc+tr+b)%bookColors.length]
            px(bx,y+4,5,bh,bc)
            px(bx,y+4,1,bh,'rgba(255,255,255,0.2)')
            px(bx+4,y+4,1,bh,'rgba(0,0,0,0.2)')
            bx+=7
          }
          break
        }
        case T.SK: {
          // 시계 - 아날로그
          px(x,y,TS,TS,'#9a8c76')
          ctx.fillStyle='#f5f0e0'
          ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,12,0,Math.PI*2); ctx.fill()
          ctx.strokeStyle='#8a7060'; ctx.lineWidth=1.5
          ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,12,0,Math.PI*2); ctx.stroke()
          // 시침
          ctx.strokeStyle='#1a1010'; ctx.lineWidth=2; ctx.lineCap='round'
          const ha=t2*0.008-Math.PI/2
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+TS/2)
          ctx.lineTo(x+TS/2+Math.cos(ha)*7,y+TS/2+Math.sin(ha)*7); ctx.stroke()
          // 분침
          ctx.strokeStyle='#c02020'; ctx.lineWidth=1
          const ma=t2*0.5-Math.PI/2
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+TS/2)
          ctx.lineTo(x+TS/2+Math.cos(ma)*10,y+TS/2+Math.sin(ma)*10); ctx.stroke()
          // 중심 점
          ctx.fillStyle='#c02020'
          ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,1.5,0,Math.PI*2); ctx.fill()
          break
        }
        case T.DK: {
          // 책상 - 나무 질감 실사
          px(x,y,TS,TS,'#c49040')
          // 상판 하이라이트
          px(x,y,TS,2,'#e0a848')
          px(x,y,2,TS,'#d8984c')
          px(x+TS-2,y,2,TS,'#9a7028')
          px(x,y+TS-3,TS,3,'#785018')
          // 나무 결
          ctx.strokeStyle='rgba(120,80,0,0.1)'; ctx.lineWidth=0.5
          for(let i=2;i<TS;i+=6) {
            ctx.beginPath(); ctx.moveTo(x+i,y); ctx.lineTo(x+i+2,y+TS); ctx.stroke()
          }
          // 책상 위 물건 (픽셀 느낌)
          px(x+3,y+3,8,5,'#e8e0d0')   // 서류
          px(x+3,y+3,8,1,'#d0c8b8')
          px(x+14,y+4,6,4,'#2a6abf')  // 파일
          break
        }
        case T.MN: {
          // 모니터 - 실사 느낌
          px(x,y,TS,TS,(tc+tr)%2===0?'#c8c0a8':'#b8b098')
          // 모니터 프레임
          px(x+3,y+4,TS-6,TS-10,'#1a1828')
          px(x+4,y+5,TS-8,TS-13,'#0e1020')
          // 화면 (스크롤되는 코드 느낌)
          const scroll = Math.floor(t2*0.5)%12
          const lineColors=['#30c878','#70b0d8','#30c878','#c87030']
          for(let ln=0;ln<4;ln++) {
            const lw = 4+((tc*7+ln*5+scroll)%8)
            px(x+5,y+7+ln*3,lw,1,lineColors[(ln+Math.floor(t2*0.3))%4])
          }
          // 스크린 글로우
          ctx.globalAlpha=0.08+Math.sin(t2*0.5)*0.04
          ctx.fillStyle='#30c878'
          ctx.fillRect(x+4,y+5,TS-8,TS-13)
          ctx.globalAlpha=1
          // 스탠드
          px(x+TS/2-2,y+TS-6,4,3,'#1a1828')
          px(x+TS/2-5,y+TS-3,10,2,'#141420')
          break
        }
        case T.CH: {
          // 의자 - 실사
          px(x,y,TS,TS,(tc+tr)%2===0?'#c8c0a8':'#b8b098')
          const cc=['#5a5080','#405878','#784040','#487840','#586040'][(tc/4|0+tr)%5]
          const ccD=shadeColor(cc,-30)
          // 등받이
          px(x+3,y+1,TS-6,4,cc); px(x+3,y+5,TS-6,12,cc)
          // 쿠션 하이라이트
          px(x+4,y+2,TS-10,3,shadeColor(cc,20))
          // 측면 음영
          px(x+TS-5,y+1,2,16,ccD)
          // 다리
          px(x+4,y+TS-10,4,10,'#604020')
          px(x+TS-8,y+TS-10,4,10,'#604020')
          // 발판
          px(x+2,y+TS-3,TS-4,2,'#503010')
          break
        }
        case T.PL: {
          // 화분 - 실사
          px(x,y,TS,TS,(tc+tr)%2===0?'#c8c0a8':'#b8b098')
          // 그림자
          ctx.fillStyle='rgba(0,0,0,0.1)'
          ctx.beginPath(); ctx.ellipse(x+TS/2,y+TS-1,10,3,0,0,Math.PI*2); ctx.fill()
          // 화분
          px(x+7,y+18,18,12,'#b85028')
          px(x+7,y+18,18,3,'#d87040')
          px(x+8,y+27,16,3,'#8a3818')
          // 줄기
          px(x+TS/2-1,y+8,3,12,'#286018')
          // 잎 (여러 방향)
          px(x+2,y+3,12,9,'#288020')
          px(x+2,y+3,10,7,'#38a030')
          px(x+14,y+1,12,10,'#288020')
          px(x+15,y+1,10,8,'#38a030')
          px(x+6,y-2,10,12,'#208018')
          px(x+7,y-2,8,10,'#30a028')
          break
        }
        case T.DV: {
          // 칸막이
          px(x,y,TS,TS,'#6a5c48')
          px(x+TS/2-3,y,6,TS,'#8a6030')
          px(x+TS/2-2,y,4,TS,'#aa7840')
          break
        }
        case T.WB: {
          // 화이트보드 - 실사
          px(x,y,TS,TS,'#9a8c76')
          px(x+1,y+2,TS-2,TS-4,'#606860')
          px(x+2,y+3,TS-4,TS-7,'#f5f5f0')
          // 마커로 쓴 내용 (픽셀)
          const textColors=['#e04040','#3060c0','#208040']
          for(let ln=0;ln<3;ln++) {
            const lw=4+((tc+ln*5)%8)
            px(x+4,y+5+ln*5,lw,1,textColors[ln])
          }
          // 보드 테두리
          ctx.strokeStyle='#484840'; ctx.lineWidth=1
          ctx.strokeRect(x+2,y+3,TS-4,TS-7)
          break
        }
        case T.MT: case T.MT2: {
          // 회의 테이블 - 실사 고급
          px(x,y,TS,TS,'#8a5a20')
          px(x,y,TS,2,'#b07830')
          px(x,y,2,TS,'#b07830')
          px(x+TS-2,y,2,TS,'#5a3808')
          px(x,y+TS-2,TS,2,'#5a3808')
          // 나무 결
          ctx.strokeStyle='rgba(60,30,0,0.12)'; ctx.lineWidth=0.8
          for(let i=4;i<TS;i+=8) {
            ctx.beginPath(); ctx.moveTo(x+i,y+1); ctx.lineTo(x+i+1,y+TS-1); ctx.stroke()
          }
          // 테이블 위 컵/노트
          if((tc+tr)%3===0) {
            px(x+8,y+6,8,8,'#e0e8f0'); px(x+9,y+7,6,6,'#f0f8ff')
            px(x+8,y+14,8,2,'#c0c8d0')
          }
          break
        }
        case T.ME: {
          // 회의실 벽
          px(x,y,TS,TS,'#b0a090')
          px(x+4,y+4,TS-8,TS-8,['#7060a0','#5070a0','#906050','#708848'][(tc+tr)%4])
          break
        }
        case T.SF: {
          // 소파 - 실사
          px(x,y,TS,TS,'#c8c0a8')
          px(x,y,TS,TS,'#b82858')
          px(x+1,y+1,TS-2,TS/2,'#d84070')
          px(x+2,y+2,TS-4,TS/2-2,'#e05080')
          px(x+TS-4,y,4,TS,'#901840')
          // 쿠션 선
          ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+2); ctx.lineTo(x+TS/2,y+TS/2); ctx.stroke()
          break
        }
        case T.SA: {
          // 소파 팔걸이
          px(x,y,TS,TS,'#501028')
          px(x+2,y+2,TS-4,TS-4,'#782038')
          break
        }
        case T.FR: {
          // 액자/그림
          px(x,y,TS,TS,(tc%2===0?'#c8c0a8':'#b8b098'))
          const frameC=['#c07830','#8038a0','#3868b0'][(tc+tr)%3]
          px(x+3,y+3,TS-6,TS-6,frameC)
          px(x+5,y+5,TS-10,TS-10,'#e8e0d0')
          // 그림 내용
          if((tc+tr)%3===0) {
            // 산 그림
            ctx.fillStyle='#88b8d8'; ctx.fillRect(x+5,y+5,TS-10,TS-10)
            ctx.fillStyle='#3870a0'; ctx.beginPath()
            ctx.moveTo(x+10,y+TS-7); ctx.lineTo(x+TS/2,y+8); ctx.lineTo(x+TS-10,y+TS-7); ctx.fill()
            ctx.fillStyle='#f0f0f8'; ctx.beginPath()
            ctx.moveTo(x+TS/2,y+8); ctx.lineTo(x+TS/2-5,y+16); ctx.lineTo(x+TS/2+5,y+16); ctx.fill()
          } else {
            // 추상화
            const colors=['#e84030','#3060d0','#30a030']
            colors.forEach((c,i)=>px(x+6+i*5,y+6,4,TS-12,c))
          }
          // 액자 테두리
          ctx.strokeStyle=shadeColor(frameC,-30); ctx.lineWidth=1.5
          ctx.strokeRect(x+3,y+3,TS-6,TS-6)
          break
        }
        default:
          px(x,y,TS,TS,(tc+tr)%2===0?'#c8c0a8':'#b8b098')
      }
    }

    // ─── 색상 유틸 ───────────────────────────
    function shadeColor(hex:string, amount:number):string {
      const n=parseInt(hex.replace('#',''),16)
      const r=Math.max(0,Math.min(255,(n>>16)+amount))
      const g=Math.max(0,Math.min(255,((n>>8)&0xff)+amount))
      const b=Math.max(0,Math.min(255,(n&0xff)+amount))
      return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
    }

    // ═══════════════════════════════════════
    //  메인 루프
    // ═══════════════════════════════════════
    let animId: number
    const loop = () => {
      tick.current += 0.04
      const s = setRef.current

      // ── 회의 이벤트 ──
      const mt = meetRef.current
      mt.timer -= 1
      if (mt.timer <= 0 && !mt.active) {
        mt.active = true
        mt.timer = 300 + Math.random()*200  // 회의 지속 시간
        mt.count++
        // 랜덤으로 2~4명 회의 참석
        const participants = [...agRef.current]
          .sort(()=>Math.random()-0.5)
          .slice(0, 2+Math.floor(Math.random()*3))
        participants.forEach((ag, i) => {
          const ms = MEETING_SEATS[i % MEETING_SEATS.length]
          ag.tx = 2 + ms.tc * TS + CHAR_W/2
          ag.ty = 2 + (ms.tr+1) * TS + TS/2
          ag.mode = 'meeting'
          ag.bubble = MEET_BUBBLES[Math.floor(Math.random()*MEET_BUBBLES.length)]
          ag.bubbleTimer = 60 + Math.random()*60
        })
      } else if (mt.active && mt.timer <= 0) {
        mt.active = false
        mt.timer = 400 + Math.random()*400  // 다음 회의까지
        agRef.current.forEach(ag => {
          if (ag.mode === 'meeting' || ag.mode === 'meetReturn') {
            ag.mode = 'meetReturn'
            ag.tx = ag.sx; ag.ty = ag.sy
          }
        })
      }

      // ── 에이전트 AI ──
      agRef.current.forEach(ag => {
        // 말풍선 타이머
        ag.bubbleTimer -= 1
        if (ag.bubbleTimer <= 0) {
          const bubbles = ag.mode==='meeting' ? MEET_BUBBLES
            : (WORK_BUBBLES[ag.def.id] || WORK_BUBBLES.ops)
          ag.bubble = bubbles[Math.floor(Math.random()*bubbles.length)]
          ag.bubbleTimer = 60 + Math.random()*80
        }

        ag.timer -= 0.04
        const moveTo = (tx:number, ty:number, speed=1.4) => {
          const dx=tx-ag.x, dy=ty-ag.y, dist=Math.hypot(dx,dy)
          if(dist>3){
            const nx=ag.x+dx/dist*speed, ny=ag.y+dy/dist*speed
            if(canWalk(nx,ny)){ag.x=nx;ag.y=ny}
            else if(canWalk(ag.x+dx/dist*speed,ag.y)){ag.x+=dx/dist*speed}
            else if(canWalk(ag.x,ag.y+dy/dist*speed)){ag.y+=dy/dist*speed}
            ag.frame=(ag.frame+0.15)%4
            if(Math.abs(dx)>Math.abs(dy)) ag.dir=dx>0?'r':'l'
            else ag.dir=dy>0?'d':'u'
            return false
          }
          return true  // arrived
        }

        if (ag.mode === 'sit') {
          if (ag.timer <= 0) {
            if (Math.random() < 0.25 && !mt.active) {
              // 자유 산책
              const tgt = randTarget(true)
              ag.tx=tgt.tx; ag.ty=tgt.ty; ag.mode='roam'
              ag.walksLeft=1+Math.floor(Math.random()*2)
              ag.timer=10+Math.random()*10
            } else {
              ag.timer=20+Math.random()*40
            }
          }
        } else if (ag.mode === 'roam') {
          if (moveTo(ag.tx, ag.ty)) {
            ag.walksLeft--
            if (ag.walksLeft<=0||ag.timer<=0) {
              ag.mode='return'; ag.tx=ag.sx; ag.ty=ag.sy
            } else {
              const tgt=randTarget(true); ag.tx=tgt.tx; ag.ty=tgt.ty
            }
          }
        } else if (ag.mode === 'return' || ag.mode === 'meetReturn') {
          if (moveTo(ag.tx, ag.ty, 1.6)) {
            ag.x=ag.sx; ag.y=ag.sy; ag.mode='sit'
            ag.dir='u'; ag.frame=0; ag.timer=20+Math.random()*30
          }
        } else if (ag.mode === 'meeting') {
          moveTo(ag.tx, ag.ty, 1.6)
        }
      })

      // ── 렌더링 ──
      ctx.fillStyle='#0a0a16'; ctx.fillRect(0,0,CW,CH)

      // 타일
      for(let tr=0;tr<ROWS;tr++) for(let tc=0;tc<COLS;tc++){
        const tile=mapRef.current[tr]?.[tc]
        if(tile) drawTile(tile, 2+tc*TS, 2+tr*TS, tc, tr)
      }

      // 회의실 표시
      if (mt.active) {
        ctx.fillStyle='rgba(255,200,50,0.06)'
        ctx.fillRect(2+18*TS, 2+TS, 9*TS, 7*TS)
      }

      // 스프라이트 Y정렬
      type Sprite={y:number;draw:()=>void}
      const sprites:Sprite[]=[]

      agRef.current.forEach(ag=>{
        const isAct = actRef.current===ag.def.id
        const nm = s.agentNames?.[ag.def.id]||ag.def.name
        const ox=Math.round(ag.x-CHAR_W/2), oy=Math.round(ag.y-CHAR_H)
        const inMeeting = ag.mode==='meeting'
        sprites.push({y:ag.y, draw:()=>{
          drawChar(ox,oy,ag.def,ag.dir,ag.frame,isAct,false)
          drawLabel(ox,oy,nm,isAct,ag.def.accent)
          // 말풍선: 일하는 중이거나 회의 중일 때
          if(isAct || inMeeting || ag.mode==='sit') {
            const showBubble = isAct || inMeeting || (ag.mode==='sit' && Math.sin(tick.current*0.5+ag.def.id.length)*0.5+0.5>0.6)
            if(showBubble) drawBubble(ox,oy,ag.bubble,ag.def.accent,inMeeting)
          }
        }})
      })

      sprites.sort((a,b)=>a.y-b.y).forEach(sp=>sp.draw())

      // ── HUD 간소화 ──
      // 회의중 표시
      if (mt.active) {
        ctx.fillStyle='rgba(255,200,0,0.9)'
        ctx.fillRect(CW-130, 8, 122, 20)
        ctx.strokeStyle='#e0a000'; ctx.lineWidth=1
        ctx.strokeRect(CW-130, 8, 122, 20)
        ctx.fillStyle='#300800'; ctx.font='bold 10px "Jua",monospace'; ctx.textAlign='center'
        ctx.fillText('📊 팀 회의 진행중!', CW-69, 22)
        ctx.textAlign='left'
      }

      // WASD 힌트 (작게)
      ctx.fillStyle='rgba(20,10,50,0.6)'
      ctx.fillRect(8, CH-24, 130, 16)
      ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='8px monospace'
      ctx.fillText('AI 오피스 · 자동 시뮬레이션', 12, CH-12)

      animId=requestAnimationFrame(loop)
    }
    animId=requestAnimationFrame(loop)
    return()=>cancelAnimationFrame(animId)
  }, [])

  return (
    <canvas
      ref={cvRef}
      width={CW}
      height={CH}
      style={{
        imageRendering:'pixelated', display:'block', maxWidth:'100%',
        borderRadius:10, border:'1.5px solid #ccc0b0',
        boxShadow:'0 4px 28px rgba(8,4,16,0.4)',
      }}
    />
  )
}
