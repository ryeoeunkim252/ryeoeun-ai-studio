'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { AgentId } from '@/lib/agents'
import { loadData, DEFAULT_SETTINGS, type AppSettings } from '@/lib/store'

interface Props { activeAgentId?: AgentId | null }

const TS   = 32
const COLS = 28
const ROWS = 16
const CANVAS_W = 898
const CANVAS_H = 518

// ── 픽셀 1개의 실제 크기 (2px = 작은 픽셀아트) ──
const PX = 2

// ── 캐릭터 스프라이트 정의 (16x24 픽셀 그리드) ──
// 0=투명, H=머리색, S=피부색, B=몸통색, L=다리색, E=눈, M=입, K=신발, A=악세서리, T=어두운몸통, D=어두운다리
// 스프라이트는 아래방향(d) 기준
const SPRITE_D = [
  '  0HHHHHHHH0   ',
  ' 0HHHHHHHHHH0  ',
  ' 0HSSSSSSSH0   ',
  ' 0SE00SS00ES0  ',
  ' 0SSESSSSE0S0  ',
  ' 0SSSSMSSSS0   ',
  ' 0HHHHHHHHHH0  ',
  ' BBBBBBBBBB    ',
  'TBBBBBBBBBBBT  ',
  'TBBBBBBBBBBBT  ',
  'TBBBBBBBBBBBT  ',
  ' BBBBBBBBBB    ',
  ' LLLL  LLLL    ',
  ' LLLL  LLLL    ',
  ' LLLL  LLLL    ',
  ' KKKK  KKKK    ',
]

const SPRITE_U = [
  '  0HHHHHHHH0   ',
  ' 0HHHHHHHHHH0  ',
  ' 0HHHHHHHHHH0  ',
  ' 0HHHHHHHHHH0  ',
  ' 0HHHHHHHHHH0  ',
  ' 0HHHHHHHHHH0  ',
  ' 0HHHHHHHHHH0  ',
  ' BBBBBBBBBB    ',
  'TBBBBBBBBBBBT  ',
  'TBBBBBBBBBBBT  ',
  'TBBBBBBBBBBBT  ',
  ' BBBBBBBBBB    ',
  ' LLLL  LLLL    ',
  ' LLLL  LLLL    ',
  ' LLLL  LLLL    ',
  ' KKKK  KKKK    ',
]

const SPRITE_R = [
  '  0HHHHHHHH0   ',
  ' 0HHHHHHHHHH0  ',
  ' 0HSSSSSSH00   ',
  ' 0SE0SSSSH0    ',
  ' 0SSESSSH0     ',
  ' 0SSSMSSH0     ',
  ' 0HHHHHHHH0    ',
  '  BBBBBBBBT    ',
  'TBBBBBBBBBT    ',
  'TBBBBBBBBBT    ',
  'TBBBBBBBBBT    ',
  '  BBBBBBBBT    ',
  '  LLLLLLL      ',
  '  LLLLLLL      ',
  '   LLLLL       ',
  '   KKKKK       ',
]

const SPRITE_L = [
  '   0HHHHHHHH0  ',
  '  0HHHHHHHHHH0 ',
  '   00HSSSSSS0  ',
  '    0HSSSS0E0  ',
  '     0HSSSE0   ',
  '     0HSSM0    ',
  '    0HHHHHH0   ',
  '    TBBBBBBBB  ',
  '    TBBBBBBBT  ',
  '    TBBBBBBBT  ',
  '    TBBBBBBBT  ',
  '    TBBBBBBBB  ',
  '      LLLLLLL  ',
  '      LLLLLLL  ',
  '       LLLLL   ',
  '       KKKKK   ',
]

// 걷기 애니메이션 - 다리 흔들림 변형
const WALK_FRAME1_D = [
  '  0HHHHHHHH0   ',
  ' 0HHHHHHHHHH0  ',
  ' 0HSSSSSSSH0   ',
  ' 0SE00SS00ES0  ',
  ' 0SSESSSSE0S0  ',
  ' 0SSSSMSSSS0   ',
  ' 0HHHHHHHHHH0  ',
  ' BBBBBBBBBB    ',
  'TBBBBBBBBBBBT  ',
  'TBBBBBBBBBBBT  ',
  'TBBBBBBBBBBBT  ',
  ' BBBBBBBBBB    ',
  ' LLLLL LLLL    ',
  '  LLLL  LLL    ',
  '  LLLL  LLL    ',
  '  KKKK  KKK    ',
]

const WALK_FRAME2_D = [
  '  0HHHHHHHH0   ',
  ' 0HHHHHHHHHH0  ',
  ' 0HSSSSSSSH0   ',
  ' 0SE00SS00ES0  ',
  ' 0SSESSSSE0S0  ',
  ' 0SSSSMSSSS0   ',
  ' 0HHHHHHHHHH0  ',
  ' BBBBBBBBBB    ',
  'TBBBBBBBBBBBT  ',
  'TBBBBBBBBBBBT  ',
  'TBBBBBBBBBBBT  ',
  ' BBBBBBBBBB    ',
  ' LLLL LLLLL    ',
  ' LLL  LLLL     ',
  ' LLL  LLLL     ',
  ' KKK  KKKK     ',
]

// ── 타일 타입 ───────────────────────────────
const TL = {
  F:1, W:2, SH:3, SK:4, DK:5, MN:6, CH:7, PL:8, CP:9, DV:10,
  WB:11, MT:12, ME:13, SF:14, SA:15, FR:16, WT:17,
} as const

const C = {
  fl:'#c8c4ae', fl2:'#b8b49e',
  wl:'#9a8c76', wlT:'#c0a870', wlD:'#6a5c48',
  sf_wood:'#8a6030', sf_woodL:'#aa7840', sf_woodD:'#6a4020',
  bk:['#e04040','#3880e8','#38a038','#e89828','#9828e8','#e85878','#28a8c0'],
  dk:'#c49040', dkL:'#e0a848', dkD:'#9a7028', dkF:'#785018',
  mn:'#141428', mnG:'#30c878',
  ch:['#7060a0','#5070a0','#906050','#708848','#806050','#507068'],
  pl1:'#48b848', pl2:'#288028',
  pot:'#b85028', potL:'#d87040',
  cp:'#403888', cpL:'#504898',
  mt:'#6a4018', mtL:'#9a6028', mtD:'#4a2a08',
  so:'#b82858', soL:'#d84070', soD:'#782038', soA:'#501028',
  wb:'#f0f0e8', wbB:'#787060',
  fr:['#c07830','#8038a0','#3868b0'],
}

const {F,W,SH,SK,DK,MN,CH,PL,CP,DV,WB,MT,ME,SF,SA,FR,WT} = TL
const BASE_MAP: number[][] = [
  [W, W, W, W, W, W, W, W,SK, W, W, W, W, W, W, W, W,DV, W,WB,WB,WB,WB,WB,WB, W, W, W],
  [W,SH,SH,SH,SH,SH,SH,SH,SH,SH,SH,SH,SH,SH,SH,SH, W,DV,WT, F, F, F, F, F, F,WT, F,WT],
  [F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F,DV, F, F, F, F, F, F, F, F, F, F],
  [F, F,MN, F, F, F,MN, F, F, F,MN, F, F, F, F, F, F,DV, F, F,ME,ME,ME,ME,ME, F, F, F],
  [F, F,DK,DK, F, F,DK,DK, F, F,DK,DK, F, F, F, F, F,DV, F, F,ME,MT,MT,MT,ME, F, F, F],
  [F, F,CH, F, F, F,CH, F, F, F,CH, F, F, F, F, F, F,DV, F, F,ME,MT,MT,MT,ME, F, F, F],
  [F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F,DV, F, F,ME,MT,MT,MT,ME, F, F, F],
  [F,CP,CP,CP,CP,CP,CP,CP,CP,CP,CP,CP,CP,CP,CP, F, F,DV, F, F,ME,ME,ME,ME,ME, F, F, F],
  [F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F,DV, F, F, F, F, F, F, F, F, F, F],
  [F, F,MN, F, F, F,MN, F, F, F,MN, F, F, F, F, F, F,DV, F,SA,SF,SF,SF,SF,SF,SF,SA, F],
  [F, F,DK,DK, F, F,DK,DK, F, F,DK,DK, F, F, F, F, F,DV, F,SA,SF,SF,SF,SF,SF,SF,SA, F],
  [F, F,CH, F, F, F,CH, F, F, F,CH, F, F, F, F, F, F,DV, F, F, F, F, F, F, F, F, F, F],
  [F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F,DV, F,FR, F, F, F, F, F,FR, F, F],
  [F,PL, F, F, F, F, F, F, F, F, F, F, F, F, F,PL, F,DV, F,PL, F, F, F, F, F,PL, F, F],
  [F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F,DV, F, F, F, F, F, F, F, F, F, F],
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W,DV, W, W, W, W, W, W, W, W, W, W],
]

// ── 에이전트 정의 ───────────────────────────
const AGENT_DEF = [
  {id:'router',  name:'총괄실장', body:'#1e3a5f', bodyD:'#0f1e30', skin:'#f4c890', hat:'#c0392b', leg:'#0f1e30', shoe:'#080808', accent:'#e74c3c', seat:{tc:2, tr:5}},
  {id:'web',     name:'웹 팀',   body:'#2980b9', bodyD:'#1a5f8a', skin:'#fde3a7', hat:'#f39c12', leg:'#1a4060', shoe:'#101020', accent:'#f1c40f', seat:{tc:6, tr:5}},
  {id:'content', name:'콘텐츠 팀',body:'#8e44ad', bodyD:'#5e2d7a', skin:'#fad7a0', hat:'#e91e63', leg:'#3d1a5e', shoe:'#180818', accent:'#e91e63', seat:{tc:10,tr:5}},
  {id:'research',name:'연구 팀',  body:'#27ae60', bodyD:'#1a7a40', skin:'#f0c896', hat:'#1abc9c', leg:'#0f5230', shoe:'#081008', accent:'#2ecc71', seat:{tc:2, tr:11}},
  {id:'edu',     name:'교육 팀',  body:'#d35400', bodyD:'#8a3800', skin:'#fdebd0', hat:'#e67e22', leg:'#5a2200', shoe:'#180808', accent:'#f39c12', seat:{tc:6, tr:11}},
  {id:'ops',     name:'운영 팀',  body:'#2c3e50', bodyD:'#1a2530', skin:'#c8956c', hat:'#16a085', leg:'#101820', shoe:'#060808', accent:'#1abc9c', seat:{tc:10,tr:11}},
]
type AgDef = typeof AGENT_DEF[0]
type CT = {id:string;icon:string;name:string}

const FURNITURE_ITEMS = [
  { key:'desk',   label:'책상', tile:DK, icon:'🪑' },
  { key:'chair',  label:'의자', tile:CH, icon:'💺' },
  { key:'plant',  label:'화분', tile:PL, icon:'🌿' },
  { key:'carpet', label:'카펫', tile:CP, icon:'🟪' },
  { key:'sofa',   label:'소파', tile:SF, icon:'🛋️' },
  { key:'shelf',  label:'책장', tile:SH, icon:'📚' },
]

type AgState = {
  def: AgDef; x: number; y: number; sx: number; sy: number
  tx: number; ty: number; state: 'sit'|'walk'|'return'
  dir: 'u'|'d'|'l'|'r'; frame: number; timer: number; walksLeft: number
}
type PlayerState = {
  x: number; y: number; dir: 'u'|'d'|'l'|'r'; frame: number; moving: boolean
}

// 캐릭터 픽셀 크기 (스프라이트 1픽셀 = PX*PX 캔버스픽셀)
const SPW = 16 * PX  // 스프라이트 너비
const SPH = 16 * PX  // 스프라이트 높이

export default function PixelOffice({ activeAgentId }: Props) {
  const cvRef   = useRef<HTMLCanvasElement>(null)
  const tick    = useRef(0)
  const actRef  = useRef<AgentId|null|undefined>(null)
  const setRef  = useRef<AppSettings>(DEFAULT_SETTINGS)
  const agRef   = useRef<AgState[]>([])
  const mapRef  = useRef<number[][]>(BASE_MAP.map(r => [...r]))
  const playerRef = useRef<PlayerState>({ x: 2+8*TS+SPW/2, y: 2+8*TS+SPH, dir:'d', frame:0, moving:false })
  const keysRef = useRef<Set<string>>(new Set())

  const [mode, setMode] = useState<'play'|'decorate'>('play')
  const [selectedTile, setSelectedTile] = useState<number>(CP)
  const [nearAgent, setNearAgent] = useState<string|null>(null)
  const modeRef = useRef<'play'|'decorate'>('play')
  const selTileRef = useRef<number>(CP)

  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { selTileRef.current = selectedTile }, [selectedTile])
  useEffect(() => { actRef.current = activeAgentId }, [activeAgentId])

  useEffect(() => {
    setRef.current = loadData<AppSettings>('nk_settings', DEFAULT_SETTINGS)
    agRef.current = AGENT_DEF.map(def => {
      const sx = 2 + def.seat.tc * TS + SPW/2
      const sy = 2 + def.seat.tr * TS + TS
      return { def, x:sx, y:sy, sx, sy, tx:sx, ty:sy, state:'sit', dir:'u', frame:0, timer:20+Math.random()*20, walksLeft:0 }
    })
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
      if (e.key === 'f' || e.key === 'F') setMode(m => m === 'play' ? 'decorate' : 'play')
    }
    const up = (e: KeyboardEvent) => { keysRef.current.delete(e.key.toLowerCase()) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (modeRef.current !== 'decorate') return
    const cv = cvRef.current; if (!cv) return
    const rect = cv.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (CANVAS_W / rect.width)
    const my = (e.clientY - rect.top) * (CANVAS_H / rect.height)
    const tc = Math.floor((mx - 2) / TS)
    const tr = Math.floor((my - 2) / TS)
    if (tc >= 0 && tc < COLS && tr >= 0 && tr < ROWS) {
      const t = mapRef.current[tr]?.[tc]
      if (t === TL.F || t === TL.CP || t === TL.CH || t === TL.PL || t === TL.FR) {
        mapRef.current[tr][tc] = selTileRef.current
      }
    }
  }, [])

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return
    const ctx = cv.getContext('2d')!
    ctx.imageSmoothingEnabled = false

    const r = (x:number,y:number,w:number,h:number,c:string) => {
      if(w<=0||h<=0) return
      ctx.fillStyle=c; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))
    }
    const tpx = (tc:number) => 2 + tc*TS
    const tpy = (tr:number) => 2 + tr*TS

    const canWalk = (wx:number,wy:number):boolean => {
      const tc=Math.floor((wx-2)/TS), tr=Math.floor((wy-2)/TS)
      if(tc<0||tc>=COLS||tr<0||tr>=ROWS) return false
      const t=mapRef.current[tr]?.[tc]
      return t===TL.F||t===TL.CP
    }

    const walkTarget = ():{tx:number,ty:number} => {
      for(let i=0;i<30;i++){
        const tc=1+Math.floor(Math.random()*14)
        const tr=2+Math.floor(Math.random()*12)
        if(mapRef.current[tr]?.[tc]===TL.F||mapRef.current[tr]?.[tc]===TL.CP)
          return {tx:tpx(tc)+TS/2, ty:tpy(tr)+TS/2}
      }
      return {tx:tpx(8)+TS/2, ty:tpy(8)+TS/2}
    }

    // ── 픽셀 스프라이트 렌더러 ──────────────
    const drawPixelSprite = (
      px: number, py: number,
      grid: string[],
      def: AgDef | null,
      isPlayer: boolean
    ) => {
      const skin  = isPlayer ? '#f4c890' : def!.skin
      const body  = isPlayer ? '#c03030' : def!.body
      const bodyD = isPlayer ? '#8a1a1a' : def!.bodyD
      const hat   = isPlayer ? '#ffe030' : def!.hat
      const leg   = isPlayer ? '#303060' : def!.leg
      const shoe  = isPlayer ? '#181818' : def!.shoe

      for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
          const ch = grid[row][col]
          let color: string | null = null
          switch(ch) {
            case 'H': color = hat; break
            case 'S': color = skin; break
            case 'B': color = body; break
            case 'T': color = bodyD; break
            case 'L': color = leg; break
            case 'K': color = shoe; break
            case 'E': color = '#1a0a2e'; break   // 눈
            case 'M': color = '#c0304a'; break   // 입
            case '0': color = '#000000'; break   // 외곽선
            default: color = null
          }
          if (color) {
            r(px + col * PX, py + row * PX, PX, PX, color)
          }
        }
      }
    }

    // ── 타일 렌더러 ─────────────────────────
    const TILE_RENDER: Record<number,(x:number,y:number,tc:number,tr:number)=>void> = {
      [TL.F]: (x,y,tc,tr) => {
        r(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.fl2)
        ctx.strokeStyle='rgba(0,0,0,0.05)'; ctx.lineWidth=0.5; ctx.strokeRect(x,y,TS,TS)
      },
      [TL.CP]: (x,y) => {
        r(x,y,TS,TS,C.cp); r(x+3,y+3,TS-6,TS-6,C.cpL)
        // 카펫 픽셀 패턴
        for(let i=0;i<4;i++) for(let j=0;j<4;j++) {
          r(x+5+i*6,y+5+j*6,2,2,'rgba(255,255,255,0.15)')
        }
      },
      [TL.W]: (x,y) => {
        r(x,y,TS,TS,C.wl); r(x,y,TS,4,C.wlT); r(x,y+TS-3,TS,3,'rgba(0,0,0,0.25)')
        ctx.strokeStyle='rgba(0,0,0,0.08)'; ctx.lineWidth=0.5; ctx.strokeRect(x,y,TS,TS)
      },
      [TL.WT]: (x,y) => { r(x,y,TS,TS,C.wlD) },
      [TL.SH]: (x,y,tc) => {
        r(x,y,TS,TS,C.wl)
        r(x,y+4,TS,TS-4,'#8a6030'); r(x,y+4,TS,3,'#aa7840'); r(x,y+TS-4,TS,4,'#4a2808')
        let bx=x+2; for(let b=0;b<4;b++){
          r(bx,y+6,6,11,C.bk[(tc+b)%C.bk.length])
          r(bx,y+6,1,11,'rgba(255,255,255,0.3)'); bx+=8
        }
      },
      [TL.SK]: (x,y) => {
        r(x,y,TS,TS,C.wl); r(x+6,y+5,TS-12,TS-10,'#1e1808')
        ctx.fillStyle='#f0ecda'; ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,11,0,Math.PI*2); ctx.fill()
        ctx.strokeStyle='#a09070'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,11,0,Math.PI*2); ctx.stroke()
        const t=tick.current
        ctx.strokeStyle='#181008'; ctx.lineWidth=1.5; ctx.lineCap='round'
        ctx.beginPath(); ctx.moveTo(x+TS/2,y+TS/2); ctx.lineTo(x+TS/2+Math.cos(t*0.012-Math.PI/2)*7,y+TS/2+Math.sin(t*0.012-Math.PI/2)*7); ctx.stroke()
        ctx.strokeStyle='#c02828'; ctx.lineWidth=1
        ctx.beginPath(); ctx.moveTo(x+TS/2,y+TS/2); ctx.lineTo(x+TS/2+Math.cos(t*0.7-Math.PI/2)*9,y+TS/2+Math.sin(t*0.7-Math.PI/2)*9); ctx.stroke()
      },
      [TL.DK]: (x,y) => {
        r(x,y,TS,TS,C.dk); r(x,y,TS,2,C.dkL); r(x,y,2,TS,C.dkL)
        r(x+TS-2,y,2,TS,C.dkD); r(x,y+TS-3,TS,3,C.dkF)
        // 책상 위 물건 픽셀
        r(x+4,y+4,6,4,'#e8e0d0'); r(x+12,y+6,4,3,'#2060c0')
      },
      [TL.MN]: (x,y) => {
        r(x,y,TS,TS,(Math.round(x/TS)+Math.round(y/TS))%2===0?C.fl:C.fl2)
        const p=0.5+Math.sin(tick.current+x*0.05)*0.25
        r(x+4,y+6,TS-8,TS-12,C.mn)
        ctx.globalAlpha=p*0.9
        r(x+6,y+8,10,2,C.mnG); r(x+6,y+12,TS-14,2,'#70b0d8')
        ctx.globalAlpha=1
      },
      [TL.CH]: (x,y,tc,tr) => {
        r(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.fl2)
        const cc=C.ch[(tc/5|0+tr)%C.ch.length]
        r(x+3,y+2,TS-6,4,cc); r(x+3,y+6,TS-6,14,cc)
        r(x+4,y+20,5,8,'#504040'); r(x+TS-9,y+20,5,8,'#504040')
      },
      [TL.PL]: (x,y,tc,tr) => {
        r(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.fl2)
        r(x+8,y+18,16,12,C.pot); r(x+8,y+18,16,3,C.potL)
        r(x+TS/2-1,y+8,2,12,'#286018')
        r(x+2,y+2,12,10,C.pl2); r(x+14,y-1,12,12,C.pl2); r(x+4,y+4,8,6,C.pl1)
      },
      [TL.DV]: (x,y) => {
        r(x,y,TS,TS,C.wlD); r(x+TS/2-2,y,4,TS,'#8a6030')
      },
      [TL.WB]: (x,y) => {
        r(x,y,TS,TS,C.wl); r(x+1,y+3,TS-2,TS-6,C.wbB); r(x+2,y+4,TS-4,TS-8,C.wb)
        const bars=[9,15,7,12,18,6]; bars.forEach((bh,i)=>{ r(x+3+i*4,y+4+TS-12-bh,3,bh,C.bk[(x/TS|0+i)%C.bk.length]) })
      },
      [TL.MT]: (x,y) => {
        r(x,y,TS,TS,C.mt); r(x,y,TS,2,C.mtL); r(x,y,2,TS,C.mtL)
        r(x+TS-2,y,2,TS,C.mtD)
      },
      [TL.ME]: (x,y,tc,tr) => {
        r(x,y,TS,TS,C.mtL); r(x+4,y+4,TS-8,TS-8,C.ch[(tc+tr)%C.ch.length])
      },
      [TL.SF]: (x,y) => {
        r(x,y,TS,TS,C.so); r(x+2,y+2,TS-4,TS/2-2,C.soL)
      },
      [TL.SA]: (x,y) => {
        r(x,y,TS,TS,C.soA); r(x+2,y+2,TS-4,TS-4,C.soD)
      },
      [TL.FR]: (x,y,tc) => {
        r(x,y,TS,TS,(tc%2===0?C.fl:C.fl2))
        r(x+4,y+4,TS-8,TS-8,C.fr[tc%3])
        ctx.strokeStyle='rgba(0,0,0,0.4)'; ctx.lineWidth=1.5; ctx.strokeRect(x+4,y+4,TS-8,TS-8)
      },
    }

    // ── 픽셀 캐릭터 그리기 ─────────────────
    const drawChar = (
      px: number, py: number,
      def: AgDef | null,
      dir: 'u'|'d'|'l'|'r',
      frame: number,
      sitting: boolean,
      isPlayer: boolean
    ) => {
      // 방향/프레임에 따른 스프라이트 선택
      const walkPhase = Math.floor(frame * 2) % 2
      let grid: string[]
      if (dir === 'u') grid = SPRITE_U
      else if (dir === 'l') grid = SPRITE_L
      else if (dir === 'r') grid = SPRITE_R
      else {
        // 걷는 중이면 다리 흔들기
        if (!sitting && frame > 0) {
          grid = walkPhase === 0 ? WALK_FRAME1_D : WALK_FRAME2_D
        } else {
          grid = SPRITE_D
        }
      }

      // 앉은 자세 - 아래쪽 다리 압축
      const renderY = sitting ? py + 4 : py

      // 그림자
      ctx.fillStyle = 'rgba(0,0,0,0.2)'
      ctx.beginPath()
      ctx.ellipse(px + SPW/2, renderY + SPH + 2, sitting ? 10 : 8, 3, 0, 0, Math.PI*2)
      ctx.fill()

      // 픽셀 스프라이트 렌더
      drawPixelSprite(px, renderY, grid, def, isPlayer)

      // 활성 에이전트 빛나는 픽셀 테두리
      if (def && actRef.current === def.id) {
        const glow = Math.sin(tick.current * 4) * 0.5 + 0.5
        ctx.strokeStyle = def.accent
        ctx.lineWidth = 1.5
        ctx.globalAlpha = glow
        ctx.strokeRect(px - 1, renderY - 1, SPW + 2, SPH + 2)
        ctx.globalAlpha = 1
      }
    }

    // ── 이름표 (픽셀 스타일) ────────────────
    const drawLabel = (px:number,py:number,name:string,active:boolean,accent:string) => {
      ctx.font = 'bold 9px "Jua",monospace'
      const tw = ctx.measureText(name).width + 8
      const lx = px + SPW/2 - tw/2, ly = py - 13
      // 픽셀 느낌 - 1px 오프셋 그림자
      r(lx+1, ly+1, tw, 12, 'rgba(0,0,0,0.8)')
      ctx.fillStyle = active ? accent : 'rgba(20,10,50,0.9)'
      ctx.fillRect(Math.round(lx), Math.round(ly), Math.round(tw), 12)
      ctx.strokeStyle = active ? '#fff' : 'rgba(160,140,220,0.5)'
      ctx.lineWidth = 1
      ctx.strokeRect(Math.round(lx), Math.round(ly), Math.round(tw), 12)
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'
      ctx.fillText(name, px + SPW/2, ly + 9); ctx.textAlign = 'left'
    }

    // ── 말풍선 (픽셀 스타일) ────────────────
    const BUBBLES: Record<string,string> = {
      router:'배분중!', web:'코딩중!', content:'작성중!', research:'분석중!', edu:'강의중!', ops:'배포중!'
    }
    const drawBubble = (px:number,py:number,text:string,accent:string) => {
      const bob = Math.sin(tick.current * 3) * 1.5
      ctx.font = '8px "Jua",monospace'
      const tw = ctx.measureText(text).width + 8
      const bx = px + SPW/2 - tw/2, by = py - 26 + bob
      r(bx+1, by+1, tw, 14, 'rgba(0,0,0,0.6)')
      ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(bx), Math.round(by), Math.round(tw), 14)
      ctx.strokeStyle = accent; ctx.lineWidth = 1.5
      ctx.strokeRect(Math.round(bx), Math.round(by), Math.round(tw), 14)
      // 꼬리
      r(px+SPW/2-2, by+14, 4, 3, '#fff')
      r(px+SPW/2-1, by+17, 2, 2, '#fff')
      ctx.fillStyle = '#100828'; ctx.font = 'bold 8px "Jua",monospace'
      ctx.textAlign = 'center'; ctx.fillText(text, px+SPW/2, by+10); ctx.textAlign = 'left'
    }

    // ── HUD ─────────────────────────────────
    const drawHUD = (isDecorate:boolean, nearAgName:string|null) => {
      const modeText = isDecorate ? '🎨 꾸미기 (F전환)' : '🕹️ 이동 (F전환)'
      ctx.fillStyle = isDecorate ? 'rgba(255,160,0,0.9)' : 'rgba(20,10,50,0.85)'
      ctx.strokeStyle = isDecorate ? '#ffb020' : 'rgba(160,140,220,0.6)'
      ctx.lineWidth = 1
      ctx.fillRect(8, CANVAS_H-28, 160, 20)
      ctx.strokeRect(8, CANVAS_H-28, 160, 20)
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px "Jua",monospace'
      ctx.fillText(modeText, 14, CANVAS_H-13)

      if (!isDecorate) {
        ctx.fillStyle = 'rgba(20,10,50,0.7)'
        ctx.fillRect(CANVAS_W-115, CANVAS_H-28, 107, 20)
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '9px monospace'
        ctx.fillText('WASD/방향키 이동', CANVAS_W-110, CANVAS_H-13)
      }

      if (nearAgName && !isDecorate) {
        ctx.fillStyle = 'rgba(255,255,255,0.95)'
        ctx.fillRect(CANVAS_W/2-80, CANVAS_H-52, 160, 22)
        ctx.strokeStyle = '#8860f0'; ctx.lineWidth = 1.5
        ctx.strokeRect(CANVAS_W/2-80, CANVAS_H-52, 160, 22)
        ctx.fillStyle = '#300850'; ctx.font = 'bold 10px "Jua",monospace'; ctx.textAlign = 'center'
        ctx.fillText(`👋 ${nearAgName}에게 인사!`, CANVAS_W/2, CANVAS_H-36)
        ctx.textAlign = 'left'
      }
    }

    let mouseX=0, mouseY=0
    const onMove = (e: MouseEvent) => {
      const rect = cv.getBoundingClientRect()
      mouseX = (e.clientX-rect.left) * (CANVAS_W/rect.width)
      mouseY = (e.clientY-rect.top)  * (CANVAS_H/rect.height)
    }
    cv.addEventListener('mousemove', onMove)

    let animId: number
    const loop = () => {
      tick.current += 0.04
      const s = setRef.current
      const cts = loadData<CT[]>('nk_custom_teams', [])
      const isDecorate = modeRef.current === 'decorate'

      // ── 플레이어 이동 ──
      if (!isDecorate) {
        const pl = playerRef.current
        const spd = 2; let dx=0, dy=0
        const k = keysRef.current
        if(k.has('arrowup')   ||k.has('w')) dy=-spd
        if(k.has('arrowdown') ||k.has('s')) dy= spd
        if(k.has('arrowleft') ||k.has('a')) dx=-spd
        if(k.has('arrowright')||k.has('d')) dx= spd
        pl.moving = dx!==0||dy!==0
        if (pl.moving) {
          const nx=pl.x+dx, ny=pl.y+dy
          if(canWalk(nx,ny)){pl.x=nx;pl.y=ny}
          else if(canWalk(pl.x+dx,pl.y)){pl.x+=dx}
          else if(canWalk(pl.x,pl.y+dy)){pl.y+=dy}
          pl.frame = (pl.frame + 0.2) % 4
          if(Math.abs(dx)>Math.abs(dy)) pl.dir=dx>0?'r':'l'
          else pl.dir=dy>0?'d':'u'
        }
        let nearest:string|null=null, nearDist=50
        agRef.current.forEach(ag=>{
          const d=Math.hypot(ag.x-pl.x, ag.y-pl.y)
          if(d<nearDist){nearDist=d;nearest=ag.def.name}
        })
        setNearAgent(nearest)
      }

      // ── 배경 ──
      ctx.fillStyle = '#0a0a16'; ctx.fillRect(0, 0, cv.width, cv.height)

      // ── 타일 ──
      for(let tr=0;tr<ROWS;tr++) for(let tc=0;tc<COLS;tc++){
        const tile=mapRef.current[tr]?.[tc]; if(!tile) continue
        const x=tpx(tc), y=tpy(tr)
        const fn=TILE_RENDER[tile]
        if(fn) fn(x,y,tc,tr)
        else r(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.fl2)
      }

      // 꾸미기 모드 하이라이트
      if (isDecorate) {
        const tc=Math.floor((mouseX-2)/TS), tr=Math.floor((mouseY-2)/TS)
        if(tc>=0&&tc<COLS&&tr>=0&&tr<ROWS){
          ctx.strokeStyle='#ffe030'; ctx.lineWidth=2
          ctx.strokeRect(tpx(tc),tpy(tr),TS,TS)
          ctx.fillStyle='rgba(255,224,48,0.15)'
          ctx.fillRect(tpx(tc),tpy(tr),TS,TS)
        }
      }

      // ── 에이전트 AI 이동 ──
      agRef.current.forEach(ag=>{
        ag.timer-=0.04
        if(ag.state==='sit'){
          if(ag.timer<=0){
            if(Math.random()<0.3){
              const tgt=walkTarget()
              ag.state='walk'; ag.tx=tgt.tx; ag.ty=tgt.ty
              ag.walksLeft=1+Math.floor(Math.random()*2)
              ag.timer=8+Math.random()*8
            } else ag.timer=15+Math.random()*25
          }
        } else if(ag.state==='walk'){
          const dx=ag.tx-ag.x, dy=ag.ty-ag.y, dist=Math.hypot(dx,dy)
          if(dist>2){
            const nx=ag.x+dx/dist*1.2, ny=ag.y+dy/dist*1.2
            if(canWalk(nx,ny)){ag.x=nx;ag.y=ny} else {ag.state='return';ag.tx=ag.sx;ag.ty=ag.sy}
            ag.frame=(ag.frame+0.2)%4
            if(Math.abs(dx)>Math.abs(dy)) ag.dir=dx>0?'r':'l'
            else ag.dir=dy>0?'d':'u'
          } else {
            ag.walksLeft--
            if(ag.walksLeft<=0||ag.timer<=0){ag.state='return';ag.tx=ag.sx;ag.ty=ag.sy}
            else {const tgt=walkTarget();ag.tx=tgt.tx;ag.ty=tgt.ty}
          }
        } else {
          const dx=ag.tx-ag.x, dy=ag.ty-ag.y, dist=Math.hypot(dx,dy)
          if(dist>3){
            const nx=ag.x+dx/dist*1.3, ny=ag.y+dy/dist*1.3
            if(canWalk(nx,ny)){ag.x=nx;ag.y=ny}
            ag.frame=(ag.frame+0.2)%4
            if(Math.abs(dx)>Math.abs(dy)) ag.dir=dx>0?'r':'l'
            else ag.dir=dy>0?'d':'u'
          } else {
            ag.x=ag.sx;ag.y=ag.sy;ag.state='sit'
            ag.dir='u';ag.frame=0;ag.timer=15+Math.random()*20
          }
        }
      })

      // ── Y정렬 스프라이트 렌더 ──
      const pl = playerRef.current
      type Sprite = { y:number; draw:()=>void }
      const sprites: Sprite[] = []

      agRef.current.forEach(ag=>{
        sprites.push({y:ag.y, draw:()=>{
          const isAct = actRef.current===ag.def.id
          const nm = s.agentNames?.[ag.def.id]||ag.def.name
          const px=Math.round(ag.x-SPW/2), py=Math.round(ag.y-SPH)
          drawChar(px, py, ag.def, ag.dir, ag.frame, ag.state==='sit', false)
          drawLabel(px, py, nm, isAct, ag.def.accent)
          if(isAct) drawBubble(px, py, BUBBLES[ag.def.id]||'업무중!', ag.def.accent)
        }})
      })

      cts.slice(0,6).forEach((ct,i)=>{
        const col=i%3, row2=Math.floor(i/3)
        const tc=2+col*4, tr2=13+row2*2
        const ax=tpx(tc)+TS/2, ay=tpy(tr2)+TS
        const palettes=[
          {body:'#4040a0',bodyD:'#202060',skin:'#f4c080',hat:'#6060e8',leg:'#202060',shoe:'#080810',accent:'#8080ff'},
          {body:'#902018',bodyD:'#601008',skin:'#fde3a7',hat:'#e74c3c',leg:'#400808',shoe:'#180808',accent:'#ff6060'},
          {body:'#208848',bodyD:'#104828',skin:'#f0c896',hat:'#27ae60',leg:'#083018',shoe:'#081008',accent:'#50e870'},
        ]
        const pal = palettes[i%3]
        const nm = s.agentNames?.[ct.id]||ct.name
        const fakeDef = {...AGENT_DEF[0], ...pal, id:ct.id, name:ct.name, seat:{tc,tr:tr2}, accent:pal.accent}
        const px=Math.round(ax-SPW/2), py=Math.round(ay-SPH)
        sprites.push({y:ay, draw:()=>{
          drawChar(px, py, fakeDef, 'u', 0, true, false)
          drawLabel(px, py, nm, actRef.current===ct.id, pal.accent)
        }})
      })

      if (!isDecorate) {
        const playerDef = {...AGENT_DEF[0], body:'#c03030', bodyD:'#8a1a1a', skin:'#f4c890', hat:'#ffe030', leg:'#303060', shoe:'#181818', accent:'#ffe030'}
        sprites.push({y:pl.y, draw:()=>{
          const px=Math.round(pl.x-SPW/2), py=Math.round(pl.y-SPH)
          drawChar(px, py, playerDef, pl.dir, pl.frame, false, true)
          drawLabel(px, py, '나', false, '#ffe030')
        }})
      }

      sprites.sort((a,b)=>a.y-b.y).forEach(sp=>sp.draw())
      drawHUD(isDecorate, nearAgent)

      animId = requestAnimationFrame(loop)
    }
    animId = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(animId); cv.removeEventListener('mousemove', onMove) }
  }, [nearAgent])

  return (
    <div style={{ position:'relative', display:'inline-block' }}>
      {mode==='decorate' && (
        <div style={{
          position:'absolute', top:8, left:'50%', transform:'translateX(-50%)',
          background:'rgba(10,8,30,0.92)', border:'1.5px solid #ffb020',
          borderRadius:8, padding:'5px 10px', display:'flex', gap:6, zIndex:10,
        }}>
          {FURNITURE_ITEMS.map(item=>(
            <button key={item.key} onClick={()=>setSelectedTile(item.tile)} title={item.label}
              style={{
                background: selectedTile===item.tile ? '#ffb020' : 'rgba(255,255,255,0.1)',
                border: selectedTile===item.tile ? '1px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                borderRadius:4, padding:'3px 6px', cursor:'pointer', fontSize:16,
                color:'#fff', fontWeight:'bold',
              }}>
              {item.icon}
              <div style={{fontSize:8,marginTop:1,opacity:0.8}}>{item.label}</div>
            </button>
          ))}
        </div>
      )}
      <canvas ref={cvRef} width={CANVAS_W} height={CANVAS_H} onClick={handleClick}
        style={{
          imageRendering:'pixelated', display:'block', maxWidth:'100%',
          borderRadius:10, border:'1.5px solid #ccc0b0',
          boxShadow:'0 4px 28px rgba(8,4,16,0.4)',
          cursor: mode==='decorate' ? 'crosshair' : 'default'
        }}
      />
    </div>
  )
}
