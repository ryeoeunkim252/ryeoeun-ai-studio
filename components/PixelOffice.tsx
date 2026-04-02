'use client'
import { useEffect, useRef } from 'react'
import type { AgentId } from '@/lib/agents'
import { loadData, DEFAULT_SETTINGS, type AppSettings } from '@/lib/store'

interface Props { activeAgentId?: AgentId | null }

// ── 타일 상수 ────────────────────────────────────────────────
const TS = 32  // 타일 크기

const T = {
  VOID:0, FLOOR:1, WALL:2, WALL_DARK:3,
  SHELF:4, DESK:5, DESK_SIDE:6,
  MONITOR:7, CHAIR:8, PLANT:9,
  CARPET:10, DIVIDER:11,
  MTABLE:12, MTABLE_EDGE:13,
  SOFA:14, SOFA_SIDE:15,
  WHITEBOARD:16, CLOCK:17,
  FRAME:18, DOOR:19,
} as const

type TileType = typeof T[keyof typeof T]

// ── 색상 팔레트 ──────────────────────────────────────────────
const CLR = {
  bg: '#0a0a16',
  floor1: '#ccc8b0', floor2: '#beba9e',
  wall: '#908468', wallTop: '#b89c70', wallDark: '#706050',
  shelf: '#7a5020', shelfL: '#9a6830', shelfD: '#5a3210',
  desk: '#c89040', deskL: '#e0a850', deskD: '#a07030', deskF: '#785018',
  mon: '#14142a', monSc: '#102238', monG: '#30c870',
  chair: ['#786898','#5878a0','#987858','#788848','#806858','#607068'],
  plant1: '#50b850', plant2: '#308030', plant3: '#186020',
  pot: '#b85828', potL: '#d87040',
  carpet: '#484090', carpetL: '#585098', carpetD: '#302860',
  div: '#3a2a18',
  mt: '#6a4018', mtL: '#9a6028', mtD: '#4a2808',
  sofa: '#b82858', sofaL: '#d84070', sofaD: '#782038', sofaArm: '#501028',
  wb: '#f0f0e8', wbB: '#808070',
  frame: ['#c08030','#8040a0','#4070b0'],
  books: ['#e83030','#3880f0','#38a838','#e8a028','#9830e8','#f05878','#30a8c0'],
}

// ── 에이전트 정의 ────────────────────────────────────────────
const AGENTS_DEF = [
  {id:'router',  name:'총괄실장',color:'#2848a8',hairCol:'#c0c0c8',skinCol:'#f4c890',shirtCol:'#1e3a5f',acc:'tie',  accent:'#e08888'},
  {id:'web',     name:'웹 팀',   color:'#f8d838',hairCol:'#18a8c0',skinCol:'#f4c080',shirtCol:'#f8d838',acc:'none', accent:'#f8d838'},
  {id:'content', name:'콘텐츠',  color:'#e05080',hairCol:'#482010',skinCol:'#f8d090',shirtCol:'#e05080',acc:'ear',  accent:'#e05080'},
  {id:'research',name:'연구 팀', color:'#4888d0',hairCol:'#302010',skinCol:'#f4c080',shirtCol:'#e0e0e0',acc:'glass',accent:'#4888d0'},
  {id:'edu',     name:'교육 팀', color:'#58a048',hairCol:'#141414',skinCol:'#f4c080',shirtCol:'#488038',acc:'none', accent:'#58a048'},
  {id:'ops',     name:'운영 팀', color:'#48a048',hairCol:'#0a0a0a',skinCol:'#c88858',shirtCol:'#286828',acc:'head', accent:'#48a048'},
]

type AgentDef = typeof AGENTS_DEF[0]
type CT = {id:string;icon:string;name:string}
type AgentState = {
  x:number; y:number; tx:number; ty:number
  sx:number; sy:number  // 기본 자리
  state:'sit'|'walk'|'idle'
  frame:number; dir:'d'|'u'|'l'|'r'
  timer:number; walksLeft:number
  def: AgentDef
}

// ── 타일 맵 (28 x 16) ────────────────────────────────────────
// 0=void, 특수값은 T 상수 사용
const W=T.WALL, f=T.FLOOR, S=T.SHELF, D=T.DESK, d=T.DESK_SIDE
const M=T.MONITOR, C=T.CHAIR, P=T.PLANT, R=T.CARPET
const I=T.DIVIDER, B=T.WHITEBOARD, K=T.CLOCK
const e=T.MTABLE_EDGE, m=T.MTABLE, O=T.SOFA, o=T.SOFA_SIDE
const F=T.FRAME, G=T.WALL_DARK

const MAP: TileType[][] = [
  [W,W,W,W,W,W,W,W,K,W,W,W,W,W,W,W,W, I, W,B,B,B,B,B,B,W,W,W],
  [W,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,W, I, G,f,f,f,f,f,f,G,f,G],
  [f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f, I, f,f,f,f,f,f,f,f,f,f],
  [f,f,D,D,f,f,f,D,D,f,f,f,D,D,f,f,f, I, f,f,e,e,e,e,e,e,f,f],
  [f,f,M,f,f,f,f,M,f,f,f,f,M,f,f,f,f, I, f,f,e,m,m,m,m,e,f,f],
  [f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f, I, f,f,e,m,m,m,m,e,f,f],
  [f,f,C,f,f,f,f,C,f,f,f,f,C,f,f,f,f, I, f,f,e,m,m,m,m,e,f,f],
  [f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f, I, f,f,e,e,e,e,e,e,f,f],
  [f,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,f, I, f,f,f,f,f,f,f,f,f,f],
  [f,f,D,D,f,f,f,D,D,f,f,f,D,D,f,f,f, I, f,o,O,O,O,O,O,O,o,f],
  [f,f,M,f,f,f,f,M,f,f,f,f,M,f,f,f,f, I, f,o,O,O,O,O,O,O,o,f],
  [f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f, I, f,f,f,f,f,f,f,f,f,f],
  [f,f,C,f,f,f,f,C,f,f,f,f,C,f,f,f,f, I, f,F,f,f,f,f,f,f,F,f],
  [f,P,f,f,f,f,f,f,f,f,f,f,f,f,f,P,f, I, f,P,f,f,f,f,f,f,P,f],
  [f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f, I, f,f,f,f,f,f,f,f,f,f],
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W, I, W,W,W,W,W,W,W,W,W,W],
]

// 에이전트 기본 자리 (타일 좌표 → 픽셀 중심)
const SEAT_TILES = [
  {tid:'router',   tc:2,  tr:3, deskCol:2},
  {tid:'web',      tc:7,  tr:3, deskCol:7},
  {tid:'content',  tc:12, tr:3, deskCol:12},
  {tid:'research', tc:2,  tr:9, deskCol:2},
  {tid:'edu',      tc:7,  tr:9, deskCol:7},
  {tid:'ops',      tc:12, tr:9, deskCol:12},
]

// 맵 원점 오프셋 (화면 중앙 정렬)
const MX = 2, MY = 4  // 픽셀 오프셋

export default function PixelOffice({activeAgentId}:Props) {
  const cvRef = useRef<HTMLCanvasElement>(null)
  const tick  = useRef(0)
  const actRef= useRef<AgentId|null|undefined>(null)
  const setRef= useRef<AppSettings>(DEFAULT_SETTINGS)
  const ctRef = useRef<CT[]>([])
  const agRef = useRef<AgentState[]>([])

  useEffect(()=>{ actRef.current = activeAgentId },[activeAgentId])
  useEffect(()=>{
    setRef.current = loadData<AppSettings>('nk_settings', DEFAULT_SETTINGS)
    ctRef.current  = loadData<CT[]>('nk_custom_teams', [])
  },[])

  useEffect(()=>{
    const cv = cvRef.current; if(!cv) return
    const ctx = cv.getContext('2d')!

    // ── 헬퍼 ──────────────────────────────────────
    const px = (tc:number) => MX + tc * TS  // 타일→픽셀 X
    const py = (tr:number) => MY + tr * TS  // 타일→픽셀 Y
    const r  = (x:number,y:number,w:number,h:number,c:string)=>{
      if(w<=0||h<=0) return; ctx.fillStyle=c; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))
    }
    const ln = (x1:number,y1:number,x2:number,y2:number,c:string,lw=1)=>{
      ctx.strokeStyle=c; ctx.lineWidth=lw; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke()
    }

    // ── 타일 렌더러 ────────────────────────────────
    const drawTile = (tc:number, tr:number, t:TileType, tick_:number) => {
      const x=px(tc), y=py(tr), s=TS
      switch(t) {
        // 바닥
        case T.FLOOR: {
          const c=(tc+tr)%2===0?CLR.floor1:CLR.floor2
          r(x,y,s,s,c)
          // 타일 경계
          ctx.strokeStyle='rgba(0,0,0,0.06)'; ctx.lineWidth=0.5
          ctx.strokeRect(x+0.5,y+0.5,s-1,s-1)
          break
        }
        // 카펫
        case T.CARPET: {
          r(x,y,s,s,CLR.carpet)
          r(x+2,y+2,s-4,s-4,CLR.carpetL)
          ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=0.7
          ctx.strokeRect(x+4,y+4,s-8,s-8)
          break
        }
        // 벽
        case T.WALL: {
          r(x,y,s,s,CLR.wall)
          r(x,y,s,4,CLR.wallTop)
          r(x,y+s-3,s,3,'rgba(0,0,0,0.25)')
          ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=0.5
          ctx.strokeRect(x,y,s,s)
          break
        }
        case T.WALL_DARK: {
          r(x,y,s,s,CLR.wallDark)
          break
        }
        // 책장
        case T.SHELF: {
          r(x,y,s,s,CLR.wall)  // 벽 배경
          r(x,y+4,s,s-4,CLR.shelf)
          r(x,y+4,s,4,CLR.shelfL)
          r(x,y+s-4,s,4,CLR.shelfD)
          // 책들
          let bx=x+2
          for(let b=0;b<4;b++){
            const bh=10+b*2, bw=6
            r(bx,y+6,bw,bh,CLR.books[(tc*4+b)%CLR.books.length])
            r(bx,y+6,1,bh,'rgba(255,255,255,0.25)')
            bx+=bw+1
          }
          break
        }
        // 시계
        case T.CLOCK: {
          r(x,y,s,s,CLR.wall)
          r(x+6,y+4,s-12,s-8,'#282010')
          ctx.fillStyle=CLR.wb; ctx.beginPath(); ctx.arc(x+s/2,y+s/2,10,0,Math.PI*2); ctx.fill()
          ctx.strokeStyle='#908070'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(x+s/2,y+s/2,10,0,Math.PI*2); ctx.stroke()
          const a=tick_*0.012-Math.PI/2
          ctx.strokeStyle='#181008'; ctx.lineWidth=1.5; ctx.lineCap='round'
          ctx.beginPath(); ctx.moveTo(x+s/2,y+s/2); ctx.lineTo(x+s/2+Math.cos(a)*7,y+s/2+Math.sin(a)*7); ctx.stroke()
          ctx.strokeStyle='#c02828'; ctx.lineWidth=1
          ctx.beginPath(); ctx.moveTo(x+s/2,y+s/2); ctx.lineTo(x+s/2+Math.cos(tick_*0.7-Math.PI/2)*9,y+s/2+Math.sin(tick_*0.7-Math.PI/2)*9); ctx.stroke()
          break
        }
        // 화이트보드
        case T.WHITEBOARD: {
          r(x,y,s,s,CLR.wall)
          r(x+1,y+3,s-2,s-6,CLR.wbB)
          r(x+2,y+4,s-4,s-8,CLR.wb)
          // 차트 미니
          const bars=[8,13,6,11,15,5]
          bars.forEach((bh,i)=>{
            r(x+3+i*4,y+4+s-12-bh,3,bh,CLR.books[(tc+i)%CLR.books.length])
          })
          break
        }
        // 책상 (상단)
        case T.DESK: {
          r(x,y,s,s,CLR.desk)
          r(x,y,s,3,CLR.deskL)
          r(x,y,3,s,CLR.deskL)
          r(x+s-3,y,3,s,CLR.deskD)
          r(x,y+s-4,s,4,CLR.deskF)
          ln(x+s/2,y+4,x+s/2,y+s-5,CLR.deskD,0.7)
          // 컵/책
          r(x+4,y+6,8,8,'#d07058'); r(x+5,y+6,6,2,'#e08868'); r(x+6,y+7,4,3,'#3a1a08')
          break
        }
        // 책상 측면
        case T.DESK_SIDE: {
          r(x,y,s,s,CLR.desk)
          r(x,y,s,3,CLR.deskL)
          r(x,y+s-4,s,4,CLR.deskF)
          r(x,y+s,s,5,CLR.deskD)
          r(x+4,y+s+5,6,10,CLR.deskD); r(x+s-10,y+s+5,6,10,CLR.deskD)
          break
        }
        // 모니터
        case T.MONITOR: {
          r(x,y,s,s,(tc+tr)%2===0?CLR.floor1:CLR.floor2)  // 바닥
          const p=0.5+Math.sin(tick_+tc*0.7)*0.2
          r(x+1,y+2,s-2,s-8,CLR.mon)
          r(x+3,y+4,s-6,s-13,CLR.monSc)
          ctx.globalAlpha=p*0.9
          r(x+4,y+5,10,2,CLR.monG); r(x+4,y+9,s-10,2,'#70b0d8'); r(x+4,y+13,8,2,CLR.monG)
          ctx.globalAlpha=1
          ctx.fillStyle='rgba(255,255,255,0.05)'; ctx.fillRect(x+3,y+4,s-6,6)
          r(x+s/2-4,y+s-9,8,4,CLR.mon)
          break
        }
        // 의자
        case T.CHAIR: {
          r(x,y,s,s,(tc+tr)%2===0?CLR.floor1:CLR.floor2)
          const cc=CLR.chair[(tc/5|0+tr)%CLR.chair.length]
          r(x+4,y+2,s-8,5,cc); r(x+5,y+3,s-10,3,cc+'dd')
          r(x+4,y+7,3,14,cc); r(x+s-7,y+7,3,14,cc)
          r(x+4,y+7,s-8,14,cc); r(x+6,y+9,s-12,4,cc+'ee')
          r(x+5,y+21,5,9,'#706060'); r(x+s-10,y+21,5,9,'#706060')
          r(x+5,y+28,s-10,3,'#605050')
          ctx.fillStyle='rgba(0,0,0,0.12)'; ctx.fillRect(x+3,y+30,s-6,3)
          break
        }
        // 화분
        case T.PLANT: {
          r(x,y,s,s,(tc+tr)%2===0?CLR.floor1:CLR.floor2)
          // 그림자
          ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(x+s/2,y+s-3,9,3,0,0,Math.PI*2); ctx.fill()
          // 화분
          r(x+8,y+18,16,12,CLR.pot); r(x+8,y+18,16,3,CLR.potL); r(x+10,y+18,12,3,'rgba(255,200,150,0.2)')
          r(x+9,y+21,14,4,'#1c0e05')
          // 줄기
          r(x+s/2-1,y+8,3,12,'#286018')
          // 잎
          r(x+2,y+2,12,10,CLR.plant2); r(x+2,y+2,10,7,CLR.plant1)
          r(x+14,y-1,12,12,CLR.plant2); r(x+14,y-1,10,8,CLR.plant1)
          r(x+6,y-4,10,14,CLR.plant1); r(x+7,y-4,8,6,'#80e880')
          r(x+2,y+12,8,6,CLR.plant3); r(x+14,y+10,7,5,CLR.plant3)
          break
        }
        // 구분 벽
        case T.DIVIDER: {
          r(x,y,s,s,CLR.div)
          r(x+s/2-3,y,6,s,CLR.wallDark)
          r(x+s/2-2,y,4,s,'rgba(0,0,0,0.3)')
          break
        }
        // 회의 테이블
        case T.MTABLE: {
          r(x,y,s,s,CLR.mt)
          r(x,y,s,2,CLR.mtL)
          r(x,y,2,s,CLR.mtL)
          r(x+s-2,y,2,s,CLR.mtD)
          r(x,y+s-2,s,2,CLR.mtD)
          ln(x+2,y+s/2,x+s-2,y+s/2,CLR.mtD,0.7)
          break
        }
        // 회의 테이블 가장자리
        case T.MTABLE_EDGE: {
          r(x,y,s,s,CLR.mtL)
          r(x,y,s,3,CLR.mtL)
          r(x+s-3,y,3,s,CLR.mtD)
          r(x,y+s-3,s,3,CLR.mtD)
          // 의자들 (작은 표시)
          r(x+4,y+4,s-8,s-8,CLR.mch||(CLR.chair[2]))
          r(x+6,y+6,s-12,s-12,CLR.chair[2]+'88')
          break
        }
        // 소파
        case T.SOFA: {
          r(x,y,s,s,CLR.sofaArm)
          r(x+1,y+1,s-2,s-2,CLR.sofa)
          r(x+2,y+2,s-4,s/2-2,CLR.sofaL)
          r(x+2,y+2,s-4,4,CLR.sofaL)
          r(x+1,y+1,4,s-2,'rgba(255,255,255,0.06)')
          break
        }
        // 소파 측면
        case T.SOFA_SIDE: {
          r(x,y,s,s,CLR.sofaArm)
          r(x,y,4,s,CLR.sofaD)
          r(x+4,y,s-4,4,CLR.sofaArm)
          break
        }
        // 액자
        case T.FRAME: {
          r(x,y,s,s,CLR.wall)
          r(x+3,y+4,s-6,s-8,CLR.frame[tc%3])
          r(x+5,y+6,s-10,s-12,'rgba(255,255,255,0.15)')
          r(x+3,y+4,s-6,3,'rgba(255,255,255,0.2)')
          break
        }
      }
    }

    // ── 에이전트 렌더러 (RPG 픽셀 캐릭터) ──────────
    const drawAgent = (ax:number, ay:number, def:AgentDef, frame:number, sitting:boolean, active:boolean) => {
      const S=20  // 캐릭터 크기
      const cx=ax-S/2, cy=ay-S

      // 그림자
      ctx.fillStyle='rgba(0,0,0,0.2)'
      ctx.beginPath(); ctx.ellipse(ax,ay+2,9,3.5,0,0,Math.PI*2); ctx.fill()

      if(!sitting){
        // 발
        const lOff=[0,3,0,-3][frame%4], rOff=[0,-3,0,3][frame%4]
        r(cx+2,cy+S-5+lOff,5,5,'#181010'); r(cx+S-7,cy+S-5+rOff,5,5,'#181010')
        // 다리
        r(cx+3,cy+S-12+lOff,5,8,def.shirtCol.replace('#','').length===6?'#283050':'#283050')
        r(cx+S-8,cy+S-12+rOff,5,8,'#283050')
      } else {
        r(cx+2,cy+S-8,S-4,8,'#283050')
      }

      // 몸통
      r(cx+2,cy+S/2-1,S-4,9,def.shirtCol)
      r(cx+3,cy+S/2-1,S-6,3,def.shirtCol+'ee')
      // 팔
      r(cx,cy+S/2,3,7,def.shirtCol); r(cx+S-3,cy+S/2,3,7,def.shirtCol)
      r(cx-1,cy+S/2+5,4,4,def.skinCol); r(cx+S-3,cy+S/2+5,4,4,def.skinCol)

      // 머리
      r(cx+3,cy,S-6,S/2+2,def.skinCol)

      // 눈
      r(cx+5,cy+4,3,3,'#18102a'); r(cx+S-8,cy+4,3,3,'#18102a')
      r(cx+6,cy+5,1,1,'#fff'); r(cx+S-7,cy+5,1,1,'#fff')
      // 입
      r(cx+6,cy+9,7,2,def.skinCol.includes('c88')? '#a06040':'#c05870')

      // 머리카락 (위에 그리기)
      r(cx+2,cy-1,S-4,5,def.hairCol)
      r(cx+2,cy+4,3,6,def.hairCol)
      r(cx+S-5,cy+4,3,6,def.hairCol)

      // 특수 액세서리
      if(def.acc==='glass'){
        ctx.strokeStyle='#282840'; ctx.lineWidth=1.2
        ctx.strokeRect(cx+4,cy+2,5,5); ctx.strokeRect(cx+S-9,cy+2,5,5)
        ctx.beginPath(); ctx.moveTo(cx+9,cy+4); ctx.lineTo(cx+S-9,cy+4); ctx.stroke()
      }
      if(def.acc==='tie'){ r(cx+9,cy+S/2+5,3,8,def.accent); r(cx+8,cy+S/2+5,5,3,def.accent) }
      if(def.acc==='ear'){ r(cx+1,cy+4,2,4,'#f8d020'); r(cx+S-3,cy+4,2,4,'#f8d020') }
      if(def.acc==='head'){
        ctx.strokeStyle='#181818'; ctx.lineWidth=1.5
        ctx.beginPath(); ctx.arc(cx+S/2,cy+5,9,Math.PI,0); ctx.stroke()
        r(cx+1,cy+4,3,6,'#1e1e1e'); r(cx+S-4,cy+4,3,6,'#1e1e1e')
      }

      // ── 이름표 (매우 선명하게) ────────────────────
      const name = def.name
      ctx.font = 'bold 11px "Jua",monospace'
      const tw = ctx.measureText(name).width + 14
      const lx = ax - tw/2, ly = cy - 22
      // 검정 외곽선
      ctx.fillStyle = '#000'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4
      ctx.beginPath(); ctx.roundRect(lx,ly,tw,16,4); ctx.fill(); ctx.stroke()
      // 배경
      ctx.fillStyle = active ? def.accent : 'rgba(14,10,36,0.97)'
      ctx.strokeStyle = active ? '#fff' : 'rgba(180,160,255,0.7)'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.roundRect(lx,ly,tw,16,4); ctx.fill(); ctx.stroke()
      // 텍스트
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px "Jua",monospace'
      ctx.textAlign = 'center'; ctx.fillText(name, ax, ly+12); ctx.textAlign = 'left'

      // 말풍선 (활성)
      if(active){
        const bubbles: Record<string,string> = {
          router:'업무 배분!',web:'코딩 중!',content:'작성 중!',
          research:'분석 중!',edu:'자료 준비!',ops:'서버 점검!'
        }
        const bt = bubbles[def.id]||'작업 중!'
        ctx.font = '9px "Jua",monospace'
        const bw = ctx.measureText(bt).width + 12
        const bx = ax-bw/2, bby = ly-22
        ctx.fillStyle='rgba(255,255,255,0.97)'; ctx.strokeStyle=def.accent; ctx.lineWidth=1.5
        ctx.beginPath(); ctx.roundRect(bx,bby,bw,16,5); ctx.fill(); ctx.stroke()
        ctx.fillStyle='rgba(255,255,255,0.97)'; ctx.beginPath()
        ctx.moveTo(ax-4,bby+16); ctx.lineTo(ax+4,bby+16); ctx.lineTo(ax,bby+23); ctx.fill()
        ctx.fillStyle='#100828'; ctx.font='bold 9px "Jua",monospace'
        ctx.textAlign='center'; ctx.fillText(bt,ax,bby+12); ctx.textAlign='left'
      }
    }

    // ── 에이전트 초기화 ────────────────────────────
    if(agRef.current.length===0){
      SEAT_TILES.forEach((st, i)=>{
        const def = AGENTS_DEF[i]
        const sx = px(st.tc)+TS/2, sy = py(st.tr)+TS
        agRef.current.push({
          x:sx, y:sy, tx:sx, ty:sy, sx, sy,
          state:'sit', frame:0, dir:'d',
          timer: 20 + Math.random()*15,
          walksLeft:0, def
        })
      })
    }

    // ── 걸을 수 있는 영역 체크 ──────────────────────
    const canWalk = (wx:number, wy:number): boolean => {
      const tc = Math.floor((wx-MX)/TS), tr = Math.floor((wy-MY)/TS)
      if(tc<0||tc>=28||tr<0||tr>=16) return false
      const t = MAP[tr]?.[tc]
      return t===T.FLOOR || t===T.CARPET
    }

    const getWalkTarget = (agIdx:number): {tx:number,ty:number} => {
      // 왼쪽 사무실 내 랜덤 위치
      for(let attempt=0;attempt<20;attempt++){
        const tc = 1 + Math.floor(Math.random()*15)
        const tr = 2 + Math.floor(Math.random()*12)
        if(MAP[tr]?.[tc]===T.FLOOR||MAP[tr]?.[tc]===T.CARPET){
          return {tx:px(tc)+TS/2, ty:py(tr)+TS/2}
        }
      }
      return {tx:px(8)+TS/2, ty:py(8)+TS/2}
    }

    // ── 메인 루프 ──────────────────────────────────
    let animId:number

    const loop = () => {
      tick.current += 0.04
      const t = tick.current
      const active = actRef.current
      const s = setRef.current

      ctx.fillStyle = CLR.bg; ctx.fillRect(0,0,cv.width,cv.height)

      // 1. 타일 렌더 (하위층)
      for(let tr=0;tr<16;tr++){
        for(let tc=0;tc<28;tc++){
          const tile = MAP[tr]?.[tc]
          if(tile===undefined) continue
          if(tile===T.VOID) continue

          // 빈 타일(0)은 일단 FLOOR로
          if(tile===0){
            drawTile(tc,tr,T.FLOOR,t); continue
          }

          // MONITOR / CHAIR / PLANT / CARPET는 바닥 위에 그리기
          if(tile===T.MONITOR||tile===T.CHAIR||tile===T.PLANT){
            drawTile(tc,tr,T.FLOOR,t)
            drawTile(tc,tr,tile,t)
          } else if(tile===T.CARPET){
            drawTile(tc,tr,T.CARPET,t)
          } else {
            drawTile(tc,tr,tile,t)
          }
        }
      }

      // 2. 에이전트 AI 업데이트 + 렌더 (Y순 정렬)
      agRef.current.forEach((ag, i) => {
        ag.timer -= 0.04

        if(ag.state==='sit'){
          // 가끔 일어서기
          if(ag.timer<=0){
            if(Math.random()<0.3){
              const tgt = getWalkTarget(i)
              ag.state='walk'; ag.tx=tgt.tx; ag.ty=tgt.ty
              ag.walksLeft=1+Math.floor(Math.random()*2)
              ag.timer=8+Math.random()*8
            } else {
              ag.timer=15+Math.random()*20
            }
          }
        } else if(ag.state==='walk'){
          const dx=ag.tx-ag.x, dy=ag.ty-ag.y, dist=Math.sqrt(dx*dx+dy*dy)
          if(dist>2){
            const spd=1.3
            const nx=ag.x+dx/dist*spd, ny=ag.y+dy/dist*spd
            if(canWalk(nx,ny)){ ag.x=nx; ag.y=ny }
            else { ag.tx=ag.sx; ag.ty=ag.sy; ag.walksLeft=0 }
            ag.frame=Math.floor(t*5)%4
            // 방향
            if(Math.abs(dx)>Math.abs(dy)) ag.dir=dx>0?'r':'l'
            else ag.dir=dy>0?'d':'u'
          } else {
            ag.walksLeft--
            if(ag.walksLeft<=0||ag.timer<=0){
              ag.tx=ag.sx; ag.ty=ag.sy
              if(Math.sqrt((ag.x-ag.sx)**2+(ag.y-ag.sy)**2)<4){
                ag.state='sit'; ag.x=ag.sx; ag.y=ag.sy
                ag.frame=0; ag.timer=15+Math.random()*20
              }
            } else {
              const tgt=getWalkTarget(i); ag.tx=tgt.tx; ag.ty=tgt.ty
            }
          }
        }
      })

      // Y좌표 순 정렬 후 렌더 (앞에 있는 캐릭터가 위에 그려짐)
      const sorted=[...agRef.current].sort((a,b)=>a.y-b.y)
      sorted.forEach(ag=>{
        const isActive = actRef.current===ag.def.id
        const nm = s.agentNames?.[ag.def.id]||ag.def.name
        const defWithName = {...ag.def, name:nm}
        drawAgent(ag.x,ag.y,defWithName,ag.frame,ag.state==='sit',isActive)
      })

      // 커스텀 팀 (하단 추가)
      ctRef.current.slice(0,3).forEach((ct,i)=>{
        const tc=3+i*5, tr=13
        const ax=px(tc)+TS/2, ay=py(tr)+TS
        const def: AgentDef = {
          id:ct.id, name:ct.name,
          color:'#888888', hairCol:'#c8c8c8',
          skinCol:'#f4c080', shirtCol:['#404898','#884020','#208858'][i%3],
          acc:'none', accent:['#6868d8','#c86030','#30b870'][i%3]
        }
        const nm = setRef.current.agentNames?.[ct.id]||ct.name
        drawAgent(ax, ay, {...def,name:nm}, Math.floor(t*4+i)%4, true, actRef.current===ct.id)
      })

      animId=requestAnimationFrame(loop)
    }
    animId=requestAnimationFrame(loop)
    return()=>cancelAnimationFrame(animId)
  },[])

  return (
    <canvas ref={cvRef} width={898} height={518}
      style={{
        imageRendering:'pixelated', display:'block', maxWidth:'100%',
        borderRadius:'10px', border:'1.5px solid #d8c8b8',
        boxShadow:'0 4px 28px rgba(10,6,20,0.35)'
      }}
    />
  )
}
