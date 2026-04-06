'use client'
import { useEffect, useRef } from 'react'
import type { AgentId } from '@/lib/agents'
import { loadData, DEFAULT_SETTINGS, type AppSettings } from '@/lib/store'

interface Props { activeAgentId?: AgentId | null }

// ════════════════════════════════════════════
//  상수
// ════════════════════════════════════════════
const CW = 900
const CH = 520
const TS = 36          // 타일 크기
const COLS = 25
const ROWS = 14
const PX = 3           // 캐릭터 픽셀 1개 = 3 캔버스픽셀
const FONT = "'Pretendard', 'Noto Sans KR', sans-serif"

// ════════════════════════════════════════════
//  컬러 팔레트 (모던 오피스)
// ════════════════════════════════════════════
const PAL = {
  // 바닥
  floor1: '#f0ece4',   // 밝은 나무 바닥
  floor2: '#e8e2d8',
  floorLine: 'rgba(180,165,145,0.35)',
  // 벽
  wall: '#e8e0f0',
  wallTop: '#d0c8e0',
  wallBase: '#c0b8d0',
  // 창문/구분
  div: '#9090b0',
  divLight: '#b0b0d0',
  // 카펫
  carpet1: '#c8d8f0',
  carpet2: '#b8c8e4',
  // 책상
  desk: '#d4aa6a',
  deskTop: '#e0bc7a',
  deskSide: '#b08840',
  deskLeg: '#8a6828',
  // 의자
  chairBack: '#5a6a8a',
  chairSeat: '#6a7a9a',
  chairLeg: '#3a4460',
  // 모니터
  monBorder: '#2a2a3a',
  monScreen: '#1a1a28',
  // 회의 테이블
  meetTable: '#8a6030',
  meetTableTop: '#a07040',
  // 식물
  pot: '#c06040',
  potLight: '#d87858',
  leaf1: '#2a8830',
  leaf2: '#38a840',
  leaf3: '#1a6820',
  // 소파
  sofa: '#c84060',
  sofaLight: '#e05878',
  sofaDark: '#8a2040',
  // 책꽂이
  shelf: '#7a5020',
  shelfLight: '#9a6830',
  // 벽장식
  frame1: '#c87830',
  frame2: '#8838a0',
  frame3: '#3868b0',
  // 화이트보드
  wbFrame: '#505060',
  wbSurface: '#f8f8f4',
}

// ════════════════════════════════════════════
//  타일 타입
// ════════════════════════════════════════════
enum TL {
  EMPTY=0, FLOOR=1, WALL=2, SHELF=3, CLOCK=4,
  DESK=5, MONITOR=6, CHAIR=7, PLANT=8, CARPET=9,
  DIVIDER=10, WHITEBOARD=11, MTABLE=12, SOFA=13,
  SOFA_ARM=14, FRAME=15, WINDOW=16, DARKWALL=17,
}

// ════════════════════════════════════════════
//  에이전트 정의
// ════════════════════════════════════════════
interface AgDef {
  id: string; name: string
  hair: string; skin: string
  shirt: string; pants: string; shoes: string
  accent: string
  seat: { tc: number; tr: number }
}

const DEFAULT_AGENTS: Omit<AgDef,'seat'>[] = [
  { id:'router',   name:'총괄실장', hair:'#1a1035', skin:'#f4c890', shirt:'#1e3a6a', pants:'#0e1a34', shoes:'#080810', accent:'#ff6060' },
  { id:'web',      name:'웹팀',    hair:'#0890a8', skin:'#fde3a7', shirt:'#1a70c0', pants:'#102040', shoes:'#101828', accent:'#60c0ff' },
  { id:'content',  name:'콘텐츠팀', hair:'#b83878', skin:'#fad7a0', shirt:'#7830a8', pants:'#38104a', shoes:'#200820', accent:'#ff70b8' },
  { id:'research', name:'연구팀',   hair:'#283818', skin:'#f0c896', shirt:'#207840', pants:'#0e3818', shoes:'#081008', accent:'#60e880' },
  { id:'edu',      name:'교육팀',   hair:'#0a0808', skin:'#fde8d0', shirt:'#c04820', pants:'#481808', shoes:'#180808', accent:'#ffb060' },
  { id:'ops',      name:'운영팀',   hair:'#080808', skin:'#c07848', shirt:'#203848', pants:'#101820', shoes:'#060808', accent:'#60e0e0' },
  { id:'design',   name:'디자인팀', hair:'#e0c048', skin:'#f8d8b0', shirt:'#b82830', pants:'#280810', shoes:'#100808', accent:'#ff9060' },
]

// 좌석 배치 (중요도 순)
const SEATS = [
  {tc:2,  tr:2 }, // router  - 총괄 (왼쪽 맨 앞)
  {tc:7,  tr:2 }, // web
  {tc:12, tr:2 }, // content
  {tc:2,  tr:7 }, // research
  {tc:7,  tr:7 }, // edu
  {tc:12, tr:7 }, // ops
  {tc:2,  tr:11}, // design
  // 커스텀
  {tc:7,  tr:11},
  {tc:12, tr:11},
]

// 회의 좌석 (오른쪽 회의실 안)
const MEET_POS = [
  {tc:19,tr:3},{tc:20,tr:3},{tc:21,tr:3},{tc:22,tr:3},
  {tc:19,tr:6},{tc:20,tr:6},{tc:21,tr:6},{tc:22,tr:6},
]

// ════════════════════════════════════════════
//  말풍선 내용
// ════════════════════════════════════════════
const WORK_SAY: Record<string,string[]> = {
  router:   ['전략 수립 중','업무 배분 중','보고서 검토','일정 조율 중'],
  web:      ['코딩 중...','버그 수정 중','UI 작업 중','API 연동 중'],
  content:  ['글 작성 중','SNS 기획 중','카피 작성 중','콘텐츠 편집'],
  research: ['데이터 분석','시장 조사 중','보고서 작성','트렌드 탐색'],
  edu:      ['강의 준비 중','교안 작성 중','자료 정리 중','커리큘럼 설계'],
  ops:      ['서버 점검 중','배포 준비 중','자동화 설정','모니터링 중'],
  design:   ['UI 디자인 중','Figma 작업','아이콘 제작','화면 설계 중'],
}
const MEET_SAY = ['회의 중...','좋은 아이디어!','검토해볼게요','그렇군요!','진행합시다','동의합니다']

// ════════════════════════════════════════════
//  맵 빌더
// ════════════════════════════════════════════
function buildMap(agents: AgDef[]): number[][] {
  const m: number[][] = Array.from({length:ROWS}, ()=>Array(COLS).fill(TL.FLOOR))

  // 외벽
  for(let c=0;c<COLS;c++) { m[0][c]=TL.WALL; m[ROWS-1][c]=TL.WALL }
  for(let r=0;r<ROWS;r++) { m[r][0]=TL.WALL; m[r][COLS-1]=TL.WALL }

  // 칸막이 (좌측 업무공간 / 우측 회의실)
  for(let r=0;r<ROWS;r++) m[r][17]=TL.DIVIDER

  // 상단 책장 (좌측)
  for(let c=1;c<17;c++) m[1][c]=TL.SHELF
  // 시계
  m[0][8]=TL.CLOCK
  // 화이트보드 (회의실)
  m[1][18]=TL.WHITEBOARD

  // 카펫 (복도)
  for(let c=1;c<17;c++) { m[6][c]=TL.CARPET; m[10][c]=TL.CARPET }

  // 팀 책상 자동 배치
  agents.forEach((ag,i) => {
    const s = SEATS[i]; if(!s) return
    if(s.tr>=ROWS-1) return
    m[s.tr][s.tc]   = TL.DESK
    m[s.tr][s.tc+1] = TL.MONITOR
    if(s.tr+1<ROWS-1) m[s.tr+1][s.tc] = TL.CHAIR
    // 화분 (3번째마다)
    if(i%3===2 && s.tc+3<17) m[s.tr][s.tc+3]=TL.PLANT
  })

  // 회의실 테이블 + 의자
  for(let c=19;c<=23;c++) { m[4][c]=TL.MTABLE; m[5][c]=TL.MTABLE }
  for(let c=19;c<=23;c++) { m[3][c]=TL.CHAIR; m[6][c]=TL.CHAIR }
  m[4][18]=TL.CHAIR; m[5][18]=TL.CHAIR
  m[4][24]=TL.CHAIR; m[5][24]=TL.CHAIR

  // 휴게 소파 (우측 하단)
  m[9][19]=TL.SOFA_ARM; m[9][20]=TL.SOFA; m[9][21]=TL.SOFA; m[9][22]=TL.SOFA_ARM
  m[9][24]=TL.PLANT; m[10][24]=TL.PLANT

  // 액자
  m[0][3]=TL.FRAME; m[0][10]=TL.FRAME; m[0][14]=TL.FRAME
  m[0][20]=TL.FRAME; m[0][23]=TL.FRAME

  // 바닥 화분 (하단)
  m[ROWS-2][1]=TL.PLANT; m[ROWS-2][5]=TL.PLANT
  m[ROWS-2][9]=TL.PLANT; m[ROWS-2][13]=TL.PLANT
  m[ROWS-2][20]=TL.PLANT; m[ROWS-2][23]=TL.PLANT

  return m
}

// ════════════════════════════════════════════
//  에이전트 상태
// ════════════════════════════════════════════
type AgMode = 'sit'|'roam'|'ret'|'toMeet'|'inMeet'|'fromMeet'
interface AgState {
  def: AgDef
  x: number; y: number
  sx: number; sy: number
  tx: number; ty: number
  mode: AgMode
  dir: 'u'|'d'|'l'|'r'
  walkFrame: number
  timer: number
  walksLeft: number
  bubble: string
  bubbleTimer: number
  meetIdx: number
  atMeetSeat: boolean
}

// ════════════════════════════════════════════
//  컴포넌트
// ════════════════════════════════════════════
export default function PixelOffice({ activeAgentId }: Props) {
  const cvRef  = useRef<HTMLCanvasElement>(null)
  const tickR  = useRef(0)
  const actRef = useRef<AgentId|null|undefined>(null)
  const setRef = useRef<AppSettings>(DEFAULT_SETTINGS)
  const agRef  = useRef<AgState[]>([])
  const mapRef = useRef<number[][]>([])
  const meetR  = useRef({active:false, cooldown:500+Math.random()*300})

  useEffect(()=>{ actRef.current=activeAgentId },[activeAgentId])

  useEffect(()=>{
    const s = loadData<AppSettings>('nk_settings', DEFAULT_SETTINGS)
    const cts = loadData<{id:string;icon:string;name:string}[]>('nk_custom_teams',[])
    setRef.current = s

    const customColors = [
      {hair:'#c0c0c8',skin:'#f4c080',shirt:'#4040a8',pants:'#202060',shoes:'#080810',accent:'#8888ff'},
      {hair:'#481808',skin:'#fde3a7',shirt:'#902018',pants:'#400808',shoes:'#180808',accent:'#ff7060'},
      {hair:'#104838',skin:'#f0c896',shirt:'#208848',pants:'#083018',shoes:'#081008',accent:'#50e880'},
      {hair:'#503010',skin:'#f8d090',shirt:'#806020',pants:'#402808',shoes:'#181008',accent:'#ffc060'},
    ]

    const allDefs: AgDef[] = [
      ...DEFAULT_AGENTS.map((d,i)=>({...d, seat:SEATS[i]})),
      ...cts.slice(0,4).map((ct,i)=>({
        id:ct.id, name:ct.name, seat:SEATS[DEFAULT_AGENTS.length+i],
        ...customColors[i%customColors.length],
      })),
    ]

    mapRef.current = buildMap(allDefs)

    agRef.current = allDefs.map((def,i)=>{
      const seat = SEATS[i] || SEATS[0]
      // 좌석 기준 좌표 - 의자 위치 (책상 바로 아래)
      const sx = 2 + seat.tc * TS + TS/2
      const sy = 2 + (seat.tr+1) * TS + TS*0.7
      const bubbArr = WORK_SAY[def.id] || WORK_SAY.ops
      return {
        def, x:sx, y:sy, sx, sy, tx:sx, ty:sy,
        mode:'sit' as AgMode,
        dir:'d',   // ✅ 항상 앞을 보고 앉음
        walkFrame:0,
        timer:60+Math.random()*120,
        walksLeft:0,
        bubble:bubbArr[Math.floor(Math.random()*bubbArr.length)],
        bubbleTimer:80+Math.random()*80,
        meetIdx: i % MEET_POS.length,
        atMeetSeat:false,
      }
    })
  },[])

  useEffect(()=>{
    const cv = cvRef.current; if(!cv) return
    const ctx = cv.getContext('2d')!
    ctx.imageSmoothingEnabled = false

    // ── 헬퍼 ──────────────────────────────
    const fr = (x:number,y:number,w:number,h:number,c:string)=>{
      if(w<=0||h<=0) return
      ctx.fillStyle=c; ctx.fillRect(~~x,~~y,~~w,~~h)
    }
    const tp = (tc:number)=> 2+tc*TS
    const tr_ = (tr:number)=> 2+tr*TS

    const canWalk=(wx:number,wy:number)=>{
      const tc=Math.floor((wx-2)/TS), tr=Math.floor((wy-2)/TS)
      if(tc<0||tc>=COLS||tr<0||tr>=ROWS) return false
      const t=mapRef.current[tr]?.[tc]
      return t===TL.FLOOR||t===TL.CARPET
    }

    const randTarget=(rightSide=false)=>{
      for(let i=0;i<40;i++){
        const tc = rightSide ? 18+Math.floor(Math.random()*6) : 1+Math.floor(Math.random()*15)
        const tr = 1+Math.floor(Math.random()*(ROWS-3))
        if(mapRef.current[tr]?.[tc]===TL.FLOOR||mapRef.current[tr]?.[tc]===TL.CARPET)
          return {tx:tp(tc)+TS/2, ty:tr_(tr)+TS/2}
      }
      return {tx:tp(5)+TS/2, ty:tr_(6)+TS/2}
    }

    const shade=(hex:string,a:number)=>{
      const n=parseInt(hex.replace('#',''),16)
      const r=Math.max(0,Math.min(255,(n>>16)+a))
      const g=Math.max(0,Math.min(255,((n>>8)&0xff)+a))
      const b=Math.max(0,Math.min(255,(n&0xff)+a))
      return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
    }

    // ════════════════════════════════════════
    //  캐릭터 그리기 (9×20 픽셀 그리드, 3px/cell)
    //  앞을 보고 앉은 자세 기준
    // ════════════════════════════════════════
    const drawCharacter=(
      ox:number, oy:number,
      def:AgDef,
      dir:'u'|'d'|'l'|'r',
      walkFrame:number,
      sitting:boolean,
      isActive:boolean
    )=>{
      const skin  = def.skin
      const hair  = def.hair
      const shirt = def.shirt
      const pants = def.pants
      const shoes = def.shoes
      const skinD = shade(skin,-30)
      const shirtD= shade(shirt,-25)
      const pantsD= shade(pants,-20)

      // 픽셀 그리기: col,row → 캔버스 좌표
      const g=(col:number,row:number,color:string,pw=PX,ph=PX)=>{
        fr(ox+col*PX, oy+row*PX, pw, ph, color)
      }

      // 다리 흔들기 (걷는 중일 때만)
      const leg1Y = (!sitting && (dir==='l'||dir==='r'||dir==='d'||dir==='u'))
        ? Math.sin(walkFrame*1.4)*PX : 0
      const leg2Y = -leg1Y

      // 그림자
      ctx.fillStyle='rgba(0,0,0,0.15)'
      ctx.beginPath()
      ctx.ellipse(ox+9*PX/2, oy+20*PX+2, sitting?11:9, 3, 0, 0, Math.PI*2)
      ctx.fill()

      // ── 앞모습 (d / 앉아있을 때) ──────────
      if(dir==='d' || sitting) {
        // 머리카락
        for(let c=2;c<7;c++) g(c,0,hair)
        for(let c=1;c<8;c++) g(c,1,hair)
        // 얼굴
        g(0,2,hair); for(let c=1;c<8;c++) g(c,2,skin); g(8,2,hair)
        g(0,3,hair); for(let c=1;c<8;c++) g(c,3,skin); g(8,3,hair)
        // 눈썹
        g(2,2,shade(hair,10)); g(3,2,shade(hair,10))
        g(5,2,shade(hair,10)); g(6,2,shade(hair,10))
        // 눈 흰자 (2x2)
        fr(ox+2*PX,   oy+3*PX, PX*2, PX*2, '#ffffff')
        fr(ox+5*PX,   oy+3*PX, PX*2, PX*2, '#ffffff')
        // 눈동자
        fr(ox+2*PX+2, oy+3*PX+1, PX, PX, '#1a0a3a')
        fr(ox+5*PX+2, oy+3*PX+1, PX, PX, '#1a0a3a')
        // 눈 하이라이트
        fr(ox+2*PX+1, oy+3*PX+1, 2, 2, '#ffffff')
        fr(ox+5*PX+1, oy+3*PX+1, 2, 2, '#ffffff')
        // 코
        g(0,4,hair); for(let c=1;c<8;c++) g(c,4,skin); g(8,4,hair)
        fr(ox+4*PX+1, oy+4*PX+2, 4, 3, skinD)  // 코 음영
        fr(ox+3*PX+1, oy+5*PX,   2, 2, skinD)   // 콧구멍
        fr(ox+5*PX+1, oy+5*PX,   2, 2, skinD)
        // 입 (row 5)
        g(0,5,hair); for(let c=1;c<8;c++) g(c,5,skin); g(8,5,hair)
        // 입술
        fr(ox+2*PX+2, oy+5*PX+3, PX*3, 3, '#d06070')   // 윗입술
        fr(ox+2*PX+1, oy+5*PX+5, PX*3+2, 3, '#e08090')  // 아랫입술
        fr(ox+2*PX+2, oy+5*PX+4, PX*3, 2, '#ffffff')    // 이빨
        // 볼 홍조
        fr(ox+1*PX+1, oy+4*PX+2, PX+2, PX, 'rgba(255,150,150,0.4)')
        fr(ox+6*PX-1, oy+4*PX+2, PX+2, PX, 'rgba(255,150,150,0.4)')
        // 턱/목
        g(0,6,hair); for(let c=1;c<8;c++) g(c,6,skin); g(8,6,hair)
        g(3,7,skin); g(4,7,skin); g(5,7,skin)
        // 몸통
        for(let r=8;r<13;r++) {
          for(let c=1;c<8;c++) g(c,r,shirt)
          g(8,r,shirtD)
        }
        // 팔
        g(0,8,shirt); g(0,9,shirt); g(0,10,shirt); g(0,11,shirt)
        g(8,8,shirtD); g(8,9,shirtD); g(8,10,shirtD); g(8,11,shirtD)
        // 손
        g(0,12,skin); g(8,12,skin)

        if(!sitting) {
          // 서있는 다리
          for(let r=13;r<17;r++) {
            fr(ox+2*PX, oy+r*PX+leg1Y, PX*2, PX, pants)
            fr(ox+5*PX, oy+r*PX+leg2Y, PX*2, PX, pantsD)
          }
          // 신발
          fr(ox+1*PX, oy+17*PX+leg1Y, PX*3, PX, shoes)
          fr(ox+5*PX, oy+17*PX+leg2Y, PX*3, PX, shoes)
        } else {
          // 앉은 자세 - 다리 내려가 있음
          for(let c=2;c<4;c++) g(c,13,pants)
          for(let c=5;c<7;c++) g(c,13,pantsD)
          for(let c=2;c<4;c++) g(c,14,pants)
          for(let c=5;c<7;c++) g(c,14,pantsD)
          for(let c=2;c<4;c++) g(c,15,shoes)
          for(let c=5;c<7;c++) g(c,15,shoes)
        }

      // ── 뒷모습 (u) ──────────────────────
      } else if(dir==='u') {
        for(let c=2;c<7;c++) g(c,0,hair)
        for(let r=1;r<7;r++) for(let c=0;c<9;c++) g(c,r,hair)
        g(3,7,skin); g(4,7,skin); g(5,7,skin)
        for(let r=8;r<13;r++) { for(let c=1;c<8;c++) g(c,r,shirt); g(8,r,shirtD) }
        g(0,8,shirt); g(0,9,shirt); g(0,10,shirt); g(0,11,shirt)
        g(8,8,shirtD); g(8,9,shirtD); g(8,10,shirtD); g(8,11,shirtD)
        g(0,12,skin); g(8,12,skin)
        for(let r=13;r<17;r++) {
          fr(ox+2*PX, oy+r*PX+leg1Y, PX*2, PX, pants)
          fr(ox+5*PX, oy+r*PX+leg2Y, PX*2, PX, pantsD)
        }
        fr(ox+PX, oy+17*PX+leg1Y, PX*3, PX, shoes)
        fr(ox+5*PX, oy+17*PX+leg2Y, PX*3, PX, shoes)

      // ── 옆모습 ──────────────────────────
      } else {
        const fl = dir==='l'
        const fx=(c:number)=> fl ? c : 8-c
        for(let c=1;c<8;c++) g(fx(c),0,hair)
        for(let c=1;c<8;c++) g(fx(c),1,hair)
        for(let r=2;r<7;r++) {
          g(fx(0),r,hair); g(fx(8),r,hair)
          for(let c=1;c<8;c++) g(fx(c),r,skin)
        }
        // 옆 눈
        const eC = fl ? 2 : 6
        fr(ox+eC*PX, oy+3*PX, PX*2, PX*2, '#ffffff')
        fr(ox+eC*PX+2, oy+3*PX+1, PX, PX, '#1a0a3a')
        fr(ox+eC*PX+1, oy+3*PX+1, 2, 2, '#ffffff')
        // 옆 코
        fr(ox+(fl?1:6)*PX, oy+4*PX+2, 3, 4, skinD)
        // 옆 입
        fr(ox+(fl?2:5)*PX, oy+5*PX+4, PX, 3, '#d06070')
        // 목
        g(fl?3:5,7,skin)
        for(let r=8;r<13;r++) { for(let c=1;c<8;c++) g(c,r,shirt); g(8,r,shirtD) }
        g(fl?0:8, 9, shirt); g(fl?0:8, 10, shirt); g(fl?0:8, 11, shirt)
        g(fl?0:8, 12, skin)
        for(let r=13;r<17;r++) {
          fr(ox+3*PX, oy+r*PX+leg1Y, PX*2, PX, pants)
          fr(ox+4*PX, oy+r*PX+leg2Y, PX*2, PX, pantsD)
        }
        fr(ox+2*PX, oy+17*PX+leg1Y, PX*3, PX, shoes)
        fr(ox+4*PX, oy+17*PX+leg2Y, PX*3, PX, shoes)
      }

      // 활성 에이전트 글로우
      if(isActive) {
        const glow=0.5+Math.sin(tickR.current*5)*0.35
        ctx.strokeStyle=def.accent
        ctx.lineWidth=2
        ctx.globalAlpha=glow
        ctx.strokeRect(ox-2, oy-2, 9*PX+4, 18*PX+4)
        ctx.globalAlpha=1
      }
    }

    // ════════════════════════════════════════
    //  이름표 + 말풍선
    // ════════════════════════════════════════
    const drawLabel=(ox:number,oy:number,name:string,active:boolean,accent:string)=>{
      ctx.font=`bold 11px ${FONT}`
      const tw=ctx.measureText(name).width+12
      const lx=ox+9*PX/2-tw/2, ly=oy-18
      fr(lx+1,ly+1,tw,14,'rgba(0,0,0,0.7)')
      ctx.fillStyle=active?accent:'rgba(16,8,40,0.92)'
      ctx.fillRect(~~lx,~~ly,~~tw,14)
      ctx.strokeStyle=active?'rgba(255,255,255,0.8)':'rgba(180,160,240,0.4)'
      ctx.lineWidth=1
      ctx.strokeRect(~~lx,~~ly,~~tw,14)
      ctx.fillStyle='#ffffff'
      ctx.textAlign='center'
      ctx.fillText(name, ox+9*PX/2, ly+10)
      ctx.textAlign='left'
    }

    const drawBubble=(ox:number,oy:number,text:string,accent:string,meeting=false)=>{
      const bob=Math.sin(tickR.current*2.5)*1.5
      ctx.font=`bold 10px ${FONT}`
      const tw=ctx.measureText(text).width+14
      const bx=ox+9*PX/2-tw/2, by=oy-40+bob
      fr(bx+1,by+1,tw,16,'rgba(0,0,0,0.5)')
      ctx.fillStyle=meeting?'#fffde8':'#ffffff'
      ctx.fillRect(~~bx,~~by,~~tw,16)
      ctx.strokeStyle=accent; ctx.lineWidth=1.5
      ctx.strokeRect(~~bx,~~by,~~tw,16)
      // 꼬리
      fr(ox+9*PX/2-3, by+16, 6, 3, meeting?'#fffde8':'#ffffff')
      fr(ox+9*PX/2-2, by+19, 4, 2, meeting?'#fffde8':'#ffffff')
      fr(ox+9*PX/2-1, by+21, 2, 2, meeting?'#fffde8':'#ffffff')
      ctx.fillStyle=meeting?'#604000':'#100820'
      ctx.textAlign='center'
      ctx.fillText(text, ox+9*PX/2, by+12)
      ctx.textAlign='left'
    }

    // ════════════════════════════════════════
    //  타일 렌더러 (실사 느낌 완전 리디자인)
    // ════════════════════════════════════════
    const drawTile=(tile:TL,x:number,y:number,tc:number,_tr:number)=>{
      const t=tickR.current
      switch(tile) {
        case TL.FLOOR: {
          // 밝은 원목 바닥
          const c=(tc+_tr)%2===0?PAL.floor1:PAL.floor2
          fr(x,y,TS,TS,c)
          ctx.strokeStyle=PAL.floorLine; ctx.lineWidth=0.5; ctx.strokeRect(x,y,TS,TS)
          // 나무 결
          ctx.strokeStyle='rgba(160,140,120,0.12)'; ctx.lineWidth=0.5
          for(let i=4;i<TS;i+=10){
            ctx.beginPath(); ctx.moveTo(x+i,y); ctx.lineTo(x+i+2,y+TS); ctx.stroke()
          }
          break
        }
        case TL.CARPET: {
          // 연한 파란 카펫
          fr(x,y,TS,TS,PAL.carpet1)
          // 카펫 테두리 장식
          fr(x,y,TS,2,PAL.carpet2); fr(x,y+TS-2,TS,2,PAL.carpet2)
          fr(x,y,2,TS,PAL.carpet2); fr(x+TS-2,y,2,TS,PAL.carpet2)
          // 카펫 패턴 도트
          for(let i=0;i<3;i++) for(let j=0;j<3;j++)
            fr(x+6+i*10,y+6+j*10,4,4,'rgba(100,130,200,0.25)')
          break
        }
        case TL.WALL: {
          // 현대적 벽 - 라벤더 계열
          fr(x,y,TS,TS,PAL.wall)
          fr(x,y,TS,3,PAL.wallTop)
          fr(x,y+TS-2,TS,2,PAL.wallBase)
          ctx.strokeStyle='rgba(160,150,200,0.1)'; ctx.lineWidth=0.5; ctx.strokeRect(x,y,TS,TS)
          break
        }
        case TL.DARKWALL: {
          fr(x,y,TS,TS,'#3a3850')
          break
        }
        case TL.SHELF: {
          // 책장 - 원목 + 컬러 책들
          fr(x,y,TS,TS,'#7a5020')
          fr(x,y,TS,2,'#a06830'); fr(x,y+TS-3,TS,3,'#4a2808')
          fr(x+1,y+3,TS-2,TS-5,'#6a4010')
          const bk=['#e84040','#3888f0','#40b848','#f0a820','#a038e0','#f05880','#38b8d0']
          let bx=x+2
          for(let b=0;b<4;b++){
            const bh=10+((tc*3+b*7)%6), bw=7
            const bc=bk[(tc+_tr+b)%bk.length]
            fr(bx,y+4,bw,bh,bc)
            fr(bx,y+4,1,bh,shade(bc,30))
            fr(bx+bw-1,y+4,1,bh,shade(bc,-30))
            bx+=bw+1
          }
          break
        }
        case TL.CLOCK: {
          // 아날로그 시계
          fr(x,y,TS,TS,PAL.wall)
          fr(x+3,y+3,TS-6,TS-6,'#2a2838')
          ctx.fillStyle='#f5f0ea'
          ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,13,0,Math.PI*2); ctx.fill()
          ctx.strokeStyle='#8a8098'; ctx.lineWidth=1.5
          ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,13,0,Math.PI*2); ctx.stroke()
          // 눈금
          for(let i=0;i<12;i++){
            const a=i*Math.PI/6, r1=11, r2=13
            ctx.strokeStyle='#8a8098'; ctx.lineWidth=i%3===0?2:1
            ctx.beginPath()
            ctx.moveTo(x+TS/2+Math.cos(a)*r1,y+TS/2+Math.sin(a)*r1)
            ctx.lineTo(x+TS/2+Math.cos(a)*r2,y+TS/2+Math.sin(a)*r2)
            ctx.stroke()
          }
          // 시침
          const ha=t*0.005-Math.PI/2
          ctx.strokeStyle='#2a1830'; ctx.lineWidth=2; ctx.lineCap='round'
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+TS/2)
          ctx.lineTo(x+TS/2+Math.cos(ha)*7,y+TS/2+Math.sin(ha)*7); ctx.stroke()
          // 분침
          const ma=t*0.06-Math.PI/2
          ctx.strokeStyle='#3a2840'; ctx.lineWidth=1.5
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+TS/2)
          ctx.lineTo(x+TS/2+Math.cos(ma)*10,y+TS/2+Math.sin(ma)*10); ctx.stroke()
          // 초침
          ctx.strokeStyle='#e04030'; ctx.lineWidth=1
          const sa=t*0.7-Math.PI/2
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+TS/2)
          ctx.lineTo(x+TS/2+Math.cos(sa)*11,y+TS/2+Math.sin(sa)*11); ctx.stroke()
          ctx.fillStyle='#e04030'
          ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,2,0,Math.PI*2); ctx.fill()
          break
        }
        case TL.DESK: {
          // 책상 - 원목 실사
          fr(x,y,TS,TS,PAL.desk)
          fr(x,y,TS,3,PAL.deskTop)
          fr(x,y,2,TS,shade(PAL.desk,15))
          fr(x+TS-3,y,3,TS,PAL.deskSide)
          fr(x,y+TS-4,TS,4,PAL.deskLeg)
          // 나무 결 (세밀)
          ctx.strokeStyle='rgba(150,100,20,0.08)'; ctx.lineWidth=0.5
          for(let i=3;i<TS;i+=7){
            ctx.beginPath(); ctx.moveTo(x+i,y+1); ctx.lineTo(x+i+1,y+TS-4); ctx.stroke()
          }
          // 책상 위 소품
          fr(x+4,y+4,9,6,'#e8e0d0')
          fr(x+4,y+4,9,1,'#d0c8b8')
          fr(x+4,y+4,1,6,'rgba(0,0,0,0.05)')
          fr(x+15,y+5,5,4,'#4080c0')
          break
        }
        case TL.MONITOR: {
          // 모니터 - 현대적 슬림 디자인
          fr(x,y,TS,TS,PAL.floor1)
          // 모니터 베젤
          fr(x+2,y+3,TS-4,TS-10,'#1e1a30')
          fr(x+3,y+4,TS-6,TS-13,'#0a0818')
          // 화면 글로우
          const glowA=0.08+Math.sin(t*0.4)*0.03
          ctx.fillStyle=`rgba(30,100,200,${glowA})`
          ctx.fillRect(x+3,y+4,TS-6,TS-13)
          // 코드 라인들
          const lc=['#30c878','#60b0f0','#f0d060','#f08060','#a060f0']
          for(let ln=0;ln<4;ln++){
            const lw=3+((tc*5+ln*7+~~t)%9)
            fr(x+4,y+6+ln*4,lw,2,lc[(ln+~~(t*0.2))%lc.length])
          }
          // 스탠드
          fr(x+TS/2-2,y+TS-6,4,3,'#1e1a30')
          fr(x+TS/2-5,y+TS-3,10,2,'#161428')
          break
        }
        case TL.CHAIR: {
          // 의자 - 인체공학 디자인
          const cc=['#4a5878','#3a6858','#684040','#406048','#544868'][(_tr+tc)%5]
          fr(x,y,TS,TS,(tc+_tr)%2===0?PAL.floor1:PAL.floor2)
          // 등받이
          fr(x+3,y+1,TS-6,5,cc)
          fr(x+3,y+6,TS-6,13,cc)
          fr(x+4,y+2,TS-10,4,shade(cc,20))
          // 쿠션 스티치
          ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=0.8
          ctx.strokeRect(x+5,y+7,TS-10,10)
          // 음영
          fr(x+TS-5,y+1,2,18,shade(cc,-25))
          // 다리
          fr(x+4,y+TS-12,4,12,'#5a3818')
          fr(x+TS-8,y+TS-12,4,12,'#5a3818')
          fr(x+2,y+TS-4,TS-4,3,'#3a2008')
          break
        }
        case TL.PLANT: {
          // 화분 + 식물 실사
          fr(x,y,TS,TS,(tc+_tr)%2===0?PAL.floor1:PAL.floor2)
          // 그림자
          ctx.fillStyle='rgba(0,0,0,0.1)'
          ctx.beginPath(); ctx.ellipse(x+TS/2,y+TS-2,11,3,0,0,Math.PI*2); ctx.fill()
          // 화분 - 테라코타
          fr(x+7,y+19,18,11,PAL.pot)
          fr(x+7,y+19,18,3,PAL.potLight)
          fr(x+8,y+27,16,3,shade(PAL.pot,-25))
          fr(x+6,y+29,20,2,shade(PAL.pot,-35))
          // 흙
          fr(x+8,y+20,16,3,'#4a2808')
          // 줄기
          fr(x+TS/2-1,y+10,3,11,'#2a6010')
          fr(x+TS/2,y+10,1,11,'#38801a')
          // 잎사귀들 (여러 겹)
          // 왼쪽 잎
          ctx.fillStyle=PAL.leaf3
          ctx.beginPath(); ctx.ellipse(x+5,y+8,8,5,Math.PI*0.3,0,Math.PI*2); ctx.fill()
          ctx.fillStyle=PAL.leaf2
          ctx.beginPath(); ctx.ellipse(x+6,y+7,7,4,Math.PI*0.25,0,Math.PI*2); ctx.fill()
          ctx.fillStyle=PAL.leaf1
          ctx.beginPath(); ctx.ellipse(x+7,y+6,5,3,Math.PI*0.2,0,Math.PI*2); ctx.fill()
          // 오른쪽 잎
          ctx.fillStyle=PAL.leaf3
          ctx.beginPath(); ctx.ellipse(x+TS-5,y+6,8,5,-Math.PI*0.3,0,Math.PI*2); ctx.fill()
          ctx.fillStyle=PAL.leaf2
          ctx.beginPath(); ctx.ellipse(x+TS-6,y+5,7,4,-Math.PI*0.25,0,Math.PI*2); ctx.fill()
          ctx.fillStyle=PAL.leaf1
          ctx.beginPath(); ctx.ellipse(x+TS-7,y+4,5,3,-Math.PI*0.2,0,Math.PI*2); ctx.fill()
          // 중앙 잎
          ctx.fillStyle=PAL.leaf3
          ctx.beginPath(); ctx.ellipse(x+TS/2,y+4,6,10,0,0,Math.PI*2); ctx.fill()
          ctx.fillStyle=PAL.leaf2
          ctx.beginPath(); ctx.ellipse(x+TS/2,y+3,5,9,0,0,Math.PI*2); ctx.fill()
          ctx.fillStyle=PAL.leaf1
          ctx.beginPath(); ctx.ellipse(x+TS/2,y+2,4,8,0,0,Math.PI*2); ctx.fill()
          // 잎맥
          ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=0.8
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+10); ctx.lineTo(x+TS/2,y+2); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(x+7,y+7); ctx.lineTo(x+4,y+5); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(x+TS-7,y+6); ctx.lineTo(x+TS-4,y+4); ctx.stroke()
          break
        }
        case TL.DIVIDER: {
          // 유리 칸막이 느낌
          fr(x,y,TS,TS,'rgba(180,185,220,0.3)')
          fr(x+TS/2-2,y,4,TS,'#b0b8d0')
          fr(x+TS/2-1,y,2,TS,'rgba(255,255,255,0.4)')
          break
        }
        case TL.WHITEBOARD: {
          // 화이트보드
          fr(x,y,TS,TS,'#f8f6f2')
          fr(x+1,y+2,TS-2,TS-4,PAL.wbSurface)
          fr(x+2,y+3,TS-4,TS-7,'#fcfcf8')
          // 마커 내용
          const colors=['#e04040','#2060d0','#208040','#8030a0']
          for(let ln=0;ln<3;ln++){
            const lw=3+((tc+ln*4)%8)
            fr(x+4,y+5+ln*6,lw,2,colors[(ln+tc)%colors.length])
          }
          fr(x+4,y+TS-8,8,2,'#e04040')
          // 테두리
          fr(x,y,TS,2,PAL.wbFrame); fr(x,y+TS-2,TS,2,PAL.wbFrame)
          fr(x,y,2,TS,PAL.wbFrame); fr(x+TS-2,y,2,TS,PAL.wbFrame)
          break
        }
        case TL.MTABLE: {
          // 회의 테이블 - 고급 원목
          fr(x,y,TS,TS,PAL.meetTable)
          fr(x,y,TS,2,PAL.meetTableTop)
          fr(x,y,2,TS,shade(PAL.meetTable,15))
          fr(x+TS-2,y,2,TS,shade(PAL.meetTable,-25))
          // 나무 결
          ctx.strokeStyle='rgba(80,40,0,0.1)'; ctx.lineWidth=0.7
          for(let i=4;i<TS;i+=9){
            ctx.beginPath(); ctx.moveTo(x+i,y+1); ctx.lineTo(x+i+1,y+TS-1); ctx.stroke()
          }
          // 테이블 위 소품
          if((tc+_tr)%4===0){
            ctx.fillStyle='rgba(255,255,255,0.6)'
            ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,5,0,Math.PI*2); ctx.fill()
          }
          break
        }
        case TL.SOFA: {
          // 소파
          fr(x,y,TS,TS,PAL.sofa)
          fr(x+1,y+1,TS-2,TS/2,PAL.sofaLight)
          fr(x+2,y+2,TS-4,TS/2-3,shade(PAL.sofaLight,15))
          fr(x+TS-4,y,4,TS,PAL.sofaDark)
          ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+2); ctx.lineTo(x+TS/2,y+TS/2); ctx.stroke()
          break
        }
        case TL.SOFA_ARM: {
          fr(x,y,TS,TS,PAL.sofaDark)
          fr(x+2,y+2,TS-4,TS-4,shade(PAL.sofaDark,20))
          break
        }
        case TL.FRAME: {
          // 액자 - 실사 그림
          fr(x,y,TS,TS,PAL.wall)
          const fClr=[PAL.frame1,PAL.frame2,PAL.frame3][(tc+_tr)%3]
          fr(x+2,y+2,TS-4,TS-4,fClr)
          fr(x+4,y+4,TS-8,TS-8,'#e8e0d8')
          // 그림 내용
          if(tc%3===0){
            // 풍경화
            fr(x+4,y+4,TS-8,TS-8,'#c8e0f8')
            ctx.fillStyle='#5890c0'
            ctx.beginPath(); ctx.moveTo(x+5,y+TS-6); ctx.lineTo(x+TS/2,y+8); ctx.lineTo(x+TS-5,y+TS-6); ctx.fill()
            ctx.fillStyle='#e8f0f8'
            ctx.beginPath(); ctx.moveTo(x+TS/2,y+8); ctx.lineTo(x+TS/2-4,y+14); ctx.lineTo(x+TS/2+4,y+14); ctx.fill()
            fr(x+5,y+TS-8,TS-10,4,'#70c070')
          } else if(tc%3===1){
            // 추상화
            const aClrs=['#e84040','#3070e0','#40b840']
            aClrs.forEach((c,i)=>fr(x+5+i*7,y+5,6,TS-10,c))
          } else {
            // 꽃
            fr(x+4,y+4,TS-8,TS-8,'#f0f8e0')
            ctx.fillStyle='#f0c040'
            ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,5,0,Math.PI*2); ctx.fill()
            const petalC='#e84060'
            for(let i=0;i<6;i++){
              const pa=i*Math.PI/3
              ctx.fillStyle=petalC
              ctx.beginPath(); ctx.ellipse(x+TS/2+Math.cos(pa)*7,y+TS/2+Math.sin(pa)*7,4,2,pa,0,Math.PI*2); ctx.fill()
            }
          }
          ctx.strokeStyle=shade(fClr,-30); ctx.lineWidth=1.5
          ctx.strokeRect(x+2,y+2,TS-4,TS-4)
          break
        }
        case TL.WINDOW: {
          fr(x,y,TS,TS,'#b0c8e8')
          fr(x+2,y+2,TS-4,TS-4,'#c8e0f0')
          ctx.strokeStyle='#8090a8'; ctx.lineWidth=1
          ctx.strokeRect(x+2,y+2,TS-4,TS-4)
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+2); ctx.lineTo(x+TS/2,y+TS-2); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(x+2,y+TS/2); ctx.lineTo(x+TS-2,y+TS/2); ctx.stroke()
          break
        }
      }
    }

    // ════════════════════════════════════════
    //  메인 루프
    // ════════════════════════════════════════
    let animId:number
    const loop=()=>{
      tickR.current+=0.04
      const s=setRef.current

      // ── 회의 이벤트 ──
      const mt=meetR.current
      mt.cooldown-=1
      if(mt.cooldown<=0 && !mt.active){
        mt.active=true
        mt.cooldown=350+Math.random()*250
        // 2~4명 선정
        const shuffled=[...agRef.current].sort(()=>Math.random()-0.5)
        const cnt=2+Math.floor(Math.random()*3)
        shuffled.slice(0,cnt).forEach((ag,i)=>{
          const ms=MEET_POS[i%MEET_POS.length]
          ag.tx=2+ms.tc*TS+TS/2
          ag.ty=2+ms.tr*TS+TS*0.7
          ag.mode='toMeet'
          ag.atMeetSeat=false
        })
      } else if(mt.active && mt.cooldown<=0){
        mt.active=false
        mt.cooldown=400+Math.random()*300
        agRef.current.forEach(ag=>{
          if(ag.mode==='inMeet'||ag.mode==='toMeet'){
            ag.mode='fromMeet'
            ag.tx=ag.sx; ag.ty=ag.sy
            ag.atMeetSeat=false
          }
        })
      }

      // ── 에이전트 AI ──
      agRef.current.forEach(ag=>{
        // 말풍선 교체
        ag.bubbleTimer-=1
        if(ag.bubbleTimer<=0){
          const pool=ag.atMeetSeat?MEET_SAY:(WORK_SAY[ag.def.id]||WORK_SAY.ops)
          ag.bubble=pool[Math.floor(Math.random()*pool.length)]
          ag.bubbleTimer=70+Math.random()*70
        }

        const moveTo=(tx:number,ty:number,spd=1.5)=>{
          const dx=tx-ag.x, dy=ty-ag.y, dist=Math.hypot(dx,dy)
          if(dist>4){
            const nx=ag.x+dx/dist*spd, ny=ag.y+dy/dist*spd
            if(canWalk(nx,ny)){ag.x=nx;ag.y=ny}
            else if(canWalk(ag.x+dx/dist*spd,ag.y)){ag.x+=dx/dist*spd}
            else if(canWalk(ag.x,ag.y+dy/dist*spd)){ag.y+=dy/dist*spd}
            ag.walkFrame=(ag.walkFrame+0.15)%4
            if(Math.abs(dx)>Math.abs(dy)) ag.dir=dx>0?'r':'l'
            else ag.dir=dy>0?'d':'u'
            return false
          }
          return true
        }

        ag.timer-=0.04
        switch(ag.mode){
          case 'sit': {
            ag.dir='d'  // ✅ 앉아서 항상 앞을 봄
            if(ag.timer<=0 && !mt.active){
              if(Math.random()<0.25){
                const tgt=randTarget(false)
                ag.tx=tgt.tx; ag.ty=tgt.ty; ag.mode='roam'
                ag.walksLeft=1+Math.floor(Math.random()*2)
                ag.timer=10+Math.random()*10
              } else ag.timer=25+Math.random()*50
            }
            break
          }
          case 'roam': {
            if(moveTo(ag.tx,ag.ty)){
              ag.walksLeft--
              if(ag.walksLeft<=0||ag.timer<=0){ag.mode='ret';ag.tx=ag.sx;ag.ty=ag.sy}
              else{const t2=randTarget(false);ag.tx=t2.tx;ag.ty=t2.ty}
            }
            break
          }
          case 'ret': case 'fromMeet': {
            if(moveTo(ag.tx,ag.ty,1.8)){
              ag.x=ag.sx;ag.y=ag.sy;ag.mode='sit'
              ag.dir='d';ag.walkFrame=0;ag.timer=20+Math.random()*30
            }
            break
          }
          case 'toMeet': {
            if(moveTo(ag.tx,ag.ty,1.8)){
              ag.mode='inMeet'
              ag.atMeetSeat=true  // ✅ 회의실 도착 후에만 회의 말풍선
              ag.dir='d'
              ag.bubble=MEET_SAY[Math.floor(Math.random()*MEET_SAY.length)]
              ag.bubbleTimer=60+Math.random()*60
            }
            break
          }
          case 'inMeet': {
            ag.dir='d'
            break
          }
        }
      })

      // ── 렌더링 ──
      // 배경
      ctx.fillStyle='#f0ece4'; ctx.fillRect(0,0,CW,CH)

      // 타일
      for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
        const tile=mapRef.current[r]?.[c]
        if(tile) drawTile(tile as TL, 2+c*TS, 2+r*TS, c, r)
      }

      // 회의실 활성 글로우
      if(mt.active){
        ctx.fillStyle='rgba(255,210,80,0.05)'
        ctx.fillRect(2+18*TS, 2+TS, 7*TS, 7*TS)
      }

      // 스프라이트 (Y정렬)
      const sprites:{y:number;draw:()=>void}[]=[]
      agRef.current.forEach(ag=>{
        const isAct=actRef.current===ag.def.id
        const nm=s.agentNames?.[ag.def.id]||ag.def.name
        const ox=~~(ag.x-9*PX/2), oy=~~(ag.y-18*PX)
        sprites.push({y:ag.y, draw:()=>{
          drawCharacter(ox,oy,ag.def,ag.dir,ag.walkFrame,ag.mode==='sit',isAct)
          drawLabel(ox,oy,nm,isAct,ag.def.accent)
          // 말풍선: 활성이거나, 회의실 도착했거나, 앉아서 일하는 중
          const showBubble=isAct||ag.atMeetSeat||(ag.mode==='sit'&&(~~(tickR.current*0.5+ag.def.id.length))%3===0)
          if(showBubble) drawBubble(ox,oy,ag.bubble,ag.def.accent,ag.atMeetSeat)
        }})
      })
      sprites.sort((a,b)=>a.y-b.y).forEach(sp=>sp.draw())

      // HUD
      if(mt.active){
        const hasArrived=agRef.current.some(ag=>ag.atMeetSeat)
        if(hasArrived){
          ctx.fillStyle='rgba(255,200,50,0.92)'
          ctx.fillRect(CW-148,8,140,22)
          ctx.strokeStyle='#c08000'; ctx.lineWidth=1
          ctx.strokeRect(CW-148,8,140,22)
          ctx.fillStyle='#3a1800'
          ctx.font=`bold 11px ${FONT}`; ctx.textAlign='center'
          ctx.fillText('📊 팀 회의 진행 중', CW-78, 23)
          ctx.textAlign='left'
        }
      }

      animId=requestAnimationFrame(loop)
    }
    animId=requestAnimationFrame(loop)
    return()=>cancelAnimationFrame(animId)
  },[])

  return (
    <canvas
      ref={cvRef}
      width={CW}
      height={CH}
      style={{
        imageRendering:'pixelated',
        display:'block',
        maxWidth:'100%',
        borderRadius:12,
        border:'1px solid rgba(180,170,210,0.4)',
        boxShadow:'0 4px 32px rgba(20,10,50,0.18)',
      }}
    />
  )
}
