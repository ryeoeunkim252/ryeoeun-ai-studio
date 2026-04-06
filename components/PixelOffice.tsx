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

// ── Tile Types ──────────────────────────────
const TL = {
  F:1, W:2, SH:3, SK:4, DK:5, MN:6, CH:7, PL:8, CP:9, DV:10,
  WB:11, MT:12, ME:13, SF:14, SA:15, FR:16, WT:17,
} as const

// ── Tile Colors ─────────────────────────────
const C = {
  fl:'#c8c4ae', fl2:'#b8b49e',
  wl:'#9a8c76', wlT:'#c0a870', wlD:'#6a5c48',
  sf_wood:'#8a6030', sf_woodL:'#aa7840', sf_woodD:'#6a4020',
  bk:['#e04040','#3880e8','#38a038','#e89828','#9828e8','#e85878','#28a8c0'],
  dk:'#c49040', dkL:'#e0a848', dkD:'#9a7028', dkF:'#785018',
  mn:'#141428', mnS:'#0c1020', mnG:'#30c878',
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

// ── Agent Definitions ───────────────────────
const AGENT_DEF = [
  {id:'router',  name:'총괄실장', bodyColor:'#1e3a5f', headColor:'#f4c890', hatColor:'#c0392b', accessory:'tie',   accent:'#e74c3c', seat:{tc:2, tr:5}},
  {id:'web',     name:'웹 팀',   bodyColor:'#2980b9', headColor:'#fde3a7', hatColor:'#f39c12', accessory:'crown', accent:'#f1c40f', seat:{tc:6, tr:5}},
  {id:'content', name:'콘텐츠 팀',bodyColor:'#8e44ad', headColor:'#fad7a0', hatColor:'#e91e63', accessory:'bow',   accent:'#e91e63', seat:{tc:10,tr:5}},
  {id:'research',name:'연구 팀',  bodyColor:'#27ae60', headColor:'#f0c896', hatColor:'#1abc9c', accessory:'glass', accent:'#2ecc71', seat:{tc:2, tr:11}},
  {id:'edu',     name:'교육 팀',  bodyColor:'#d35400', headColor:'#fdebd0', hatColor:'#e67e22', accessory:'cap',   accent:'#f39c12', seat:{tc:6, tr:11}},
  {id:'ops',     name:'운영 팀',  bodyColor:'#2c3e50', headColor:'#c8956c', hatColor:'#16a085', accessory:'none',  accent:'#1abc9c', seat:{tc:10,tr:11}},
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
  def: AgDef
  x: number; y: number
  sx: number; sy: number
  tx: number; ty: number
  state: 'sit'|'walk'|'return'
  dir: 'u'|'d'|'l'|'r'
  frame: number
  timer: number
  walksLeft: number
}

type PlayerState = {
  x: number; y: number
  dir: 'u'|'d'|'l'|'r'
  frame: number
  moving: boolean
}

// ── 로블록스 스타일 캐릭터 크기 ─────────────
const RW = 20   // character width
const RH = 28   // character height

export default function PixelOffice({ activeAgentId }: Props) {
  const cvRef   = useRef<HTMLCanvasElement>(null)
  const tick    = useRef(0)
  const actRef  = useRef<AgentId|null|undefined>(null)
  const setRef  = useRef<AppSettings>(DEFAULT_SETTINGS)
  const ctRef   = useRef<CT[]>([])
  const agRef   = useRef<AgState[]>([])
  const mapRef  = useRef<number[][]>(BASE_MAP.map(r => [...r]))
  const playerRef = useRef<PlayerState>({ x: 2+8*TS+RW/2, y: 2+8*TS+RH, dir:'d', frame:0, moving:false })
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
    ctRef.current  = loadData<CT[]>('nk_custom_teams', [])
    agRef.current  = AGENT_DEF.map(def => {
      const sx = 2 + def.seat.tc * TS + RW/2
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

    // ── Tile renderers ──────────────────────
    const TILE_RENDER: Record<number,(x:number,y:number,tc:number,tr:number)=>void> = {
      [TL.F]: (x,y,tc,tr) => {
        r(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.fl2)
        ctx.strokeStyle='rgba(0,0,0,0.06)'; ctx.lineWidth=0.5; ctx.strokeRect(x+.5,y+.5,TS-1,TS-1)
      },
      [TL.CP]: (x,y) => {
        r(x,y,TS,TS,C.cp); r(x+3,y+3,TS-6,TS-6,C.cpL)
      },
      [TL.W]: (x,y) => {
        r(x,y,TS,TS,C.wl); r(x,y,TS,4,C.wlT); r(x,y+TS-3,TS,3,'rgba(0,0,0,0.25)')
      },
      [TL.WT]: (x,y) => { r(x,y,TS,TS,C.wlD) },
      [TL.SH]: (x,y,tc) => {
        r(x,y,TS,TS,C.wl)
        r(x,y+4,TS,TS-4,C.sf_wood); r(x,y+4,TS,4,C.sf_woodL); r(x,y+TS-4,TS,4,C.sf_woodD)
        let bx=x+2
        for(let b=0;b<4;b++){
          const bh=10+(b%3)*3,bw=6
          r(bx,y+6,bw,bh,C.bk[(tc+b)%C.bk.length])
          bx+=bw+2
        }
      },
      [TL.SK]: (x,y) => {
        r(x,y,TS,TS,C.wl); r(x+6,y+5,TS-12,TS-10,'#1e1808')
        ctx.fillStyle='#f0ecda'; ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,11,0,Math.PI*2); ctx.fill()
        ctx.strokeStyle='#a09070'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,11,0,Math.PI*2); ctx.stroke()
        const t=tick.current
        ctx.strokeStyle='#181008'; ctx.lineWidth=1.5; ctx.lineCap='round'
        const ma=t*0.012-Math.PI/2
        ctx.beginPath(); ctx.moveTo(x+TS/2,y+TS/2); ctx.lineTo(x+TS/2+Math.cos(ma)*7,y+TS/2+Math.sin(ma)*7); ctx.stroke()
        ctx.strokeStyle='#c02828'; ctx.lineWidth=1
        const sa=t*0.7-Math.PI/2
        ctx.beginPath(); ctx.moveTo(x+TS/2,y+TS/2); ctx.lineTo(x+TS/2+Math.cos(sa)*9,y+TS/2+Math.sin(sa)*9); ctx.stroke()
      },
      [TL.DK]: (x,y) => {
        r(x,y,TS,TS,C.dk); r(x,y,TS,3,C.dkL); r(x,y,3,TS,C.dkL)
        r(x+TS-3,y,3,TS,C.dkD); r(x,y+TS-4,TS,4,C.dkF)
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
        r(x+3,y+1,TS-6,5,cc); r(x+3,y+6,TS-6,16,cc)
        r(x+4,y+22,5,10,'#706060'); r(x+TS-9,y+22,5,10,'#706060')
      },
      [TL.PL]: (x,y,tc,tr) => {
        r(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.fl2)
        r(x+8,y+18,16,12,C.pot); r(x+8,y+18,16,3,C.potL)
        r(x+TS/2-1,y+8,3,12,'#286018')
        r(x+2,y+2,12,10,C.pl2); r(x+14,y-1,12,12,C.pl2)
      },
      [TL.DV]: (x,y) => {
        r(x,y,TS,TS,C.wlD); r(x+TS/2-3,y,6,TS,C.sf_wood)
      },
      [TL.WB]: (x,y) => {
        r(x,y,TS,TS,C.wl); r(x+1,y+3,TS-2,TS-6,C.wbB); r(x+2,y+4,TS-4,TS-8,C.wb)
        const bars=[9,15,7,12,18,6]; bars.forEach((bh,i)=>{ r(x+3+i*4,y+4+TS-12-bh,3,bh,C.bk[(x/TS|0+i)%C.bk.length]) })
      },
      [TL.MT]: (x,y) => {
        r(x,y,TS,TS,C.mt); r(x,y,TS,2,C.mtL)
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
        ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=1.5; ctx.strokeRect(x+4,y+4,TS-8,TS-8)
      },
    }

    // ── 🎮 로블록스 스타일 캐릭터 그리기 ────
    const drawRobloxChar = (
      px: number, py: number,
      bodyColor: string, headColor: string, hatColor: string,
      accessory: string, accent: string,
      dir: 'u'|'d'|'l'|'r', frame: number, sitting: boolean,
      isPlayer: boolean, isActive: boolean
    ) => {
      const t = tick.current

      // 걷기 애니메이션 - 다리/팔 흔들기
      const legSwing = sitting ? 0 : Math.sin(frame * 1.2) * 4
      const armSwing = sitting ? 0 : Math.sin(frame * 1.2 + Math.PI) * 3

      // ── 그림자 ──
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(px + RW/2, py + RH + 2, sitting ? 9 : 8, 3, 0, 0, Math.PI*2)
      ctx.fill()

      // ── 다리 (앞/뒤/옆 방향별) ──
      const legColor = isPlayer ? '#303060' : bodyColor
      const darkLeg = isPlayer ? '#1a1a40' : darken(bodyColor, 40)

      if (dir === 'd' || dir === 'u') {
        if (sitting) {
          // 앉은 자세
          r(px+2, py+RH-8, 6, 8, legColor)
          r(px+RW-8, py+RH-8, 6, 8, legColor)
        } else {
          r(px+2, py+RH-10+legSwing, 6, 10, legColor)
          r(px+RW-8, py+RH-10-legSwing, 6, 10, darkLeg)
        }
      } else {
        // 옆에서 볼 때 다리 2개 겹쳐서
        r(px+4, py+RH-10+legSwing, 6, 10, legColor)
        r(px+8, py+RH-10-legSwing, 6, 10, darkLeg)
      }

      // ── 신발 ──
      const shoeColor = isPlayer ? '#181818' : '#1a1a1a'
      if (sitting) {
        r(px+1, py+RH-1, 8, 4, shoeColor)
        r(px+RW-9, py+RH-1, 8, 4, shoeColor)
      } else {
        r(px+1, py+RH-1+legSwing, 8, 4, shoeColor)
        r(px+RW-9, py+RH-1-legSwing, 8, 4, shoeColor)
      }

      // ── 몸통 (박스 형태) ──
      const bodyMain = isPlayer ? '#c03030' : bodyColor
      const bodySide = darken(bodyMain, 30)
      const bodyTop  = lighten(bodyMain, 20)

      r(px+1, py+RH-20, RW-2, 12, bodyMain)
      // 3D 효과 - 오른쪽 면
      r(px+RW-3, py+RH-20, 2, 12, bodySide)
      // 3D 효과 - 위쪽 면
      r(px+1, py+RH-20, RW-2, 2, bodyTop)

      // ── 팔 ──
      if (dir === 'd' || dir === 'u') {
        r(px-3, py+RH-19+armSwing, 4, 8, bodyMain)
        r(px+RW-1, py+RH-19-armSwing, 4, 8, bodySide)
        // 손
        r(px-3, py+RH-11+armSwing, 4, 4, headColor)
        r(px+RW-1, py+RH-11-armSwing, 4, 4, headColor)
      } else {
        r(px-2, py+RH-19+armSwing, 4, 8, bodyMain)
        r(px-2, py+RH-11+armSwing, 4, 4, headColor)
      }

      // ── 넥타이/악세서리 (몸통 위) ──
      if (accessory === 'tie') {
        r(px+RW/2-1, py+RH-18, 3, 8, accent)
        r(px+RW/2-2, py+RH-10, 4, 4, accent)
      }

      // ── 머리 (큰 네모 = 로블록스 특징!) ──
      const headW = RW + 4
      const headH = 14
      const hx = px - 2
      const hy = py + RH - 32

      // 머리 본체
      r(hx, hy, headW, headH, headColor)
      // 3D 효과
      r(hx+headW-3, hy, 3, headH, darken(headColor, 20))
      r(hx, hy, headW, 2, lighten(headColor, 15))

      // ── 얼굴 ──
      if (dir === 'd' || dir === 'l' || dir === 'r') {
        // 눈 (동그란 큰 눈 = 로블록스!)
        ctx.fillStyle = '#1a0a2e'
        ctx.beginPath(); ctx.arc(hx+6, hy+5, 2.5, 0, Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.arc(hx+headW-6, hy+5, 2.5, 0, Math.PI*2); ctx.fill()
        // 눈 하이라이트
        ctx.fillStyle = '#ffffff'
        ctx.beginPath(); ctx.arc(hx+7, hy+4, 1, 0, Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.arc(hx+headW-5, hy+4, 1, 0, Math.PI*2); ctx.fill()

        // 입 (활짝 웃는 미소)
        if (isActive) {
          // 업무중 = 입 크게 벌림
          ctx.fillStyle = '#c0304a'
          ctx.beginPath(); ctx.arc(hx+headW/2, hy+9, 3, 0, Math.PI); ctx.fill()
        } else {
          ctx.strokeStyle = '#9b4a5a'
          ctx.lineWidth = 1.5; ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.arc(hx+headW/2, hy+7, 3, 0.2, Math.PI-0.2)
          ctx.stroke()
        }

        // 볼 홍조
        ctx.fillStyle = 'rgba(255,120,120,0.35)'
        ctx.beginPath(); ctx.ellipse(hx+4, hy+7, 2.5, 1.5, 0, 0, Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.ellipse(hx+headW-4, hy+7, 2.5, 1.5, 0, 0, Math.PI*2); ctx.fill()
      } else {
        // 뒤에서 볼 때 = 뒷머리만
        ctx.fillStyle = darken(headColor, 10)
        r(hx, hy, headW, headH, darken(headColor, 10))
      }

      // ── 모자/악세서리 ──
      if (accessory === 'crown') {
        // 왕관
        r(hx+2, hy-5, headW-4, 5, hatColor)
        r(hx+2, hy-8, 3, 3, hatColor); r(hx+headW/2-1, hy-9, 4, 4, hatColor); r(hx+headW-7, hy-8, 3, 3, hatColor)
        ctx.fillStyle = '#ffe030'
        ctx.beginPath(); ctx.arc(hx+headW/2+1, hy-8, 2, 0, Math.PI*2); ctx.fill()
      } else if (accessory === 'cap') {
        // 야구 모자
        r(hx, hy-5, headW, 6, hatColor)
        r(hx-4, hy-2, headW+8, 3, darken(hatColor, 20))
      } else if (accessory === 'bow') {
        // 리본
        ctx.fillStyle = accent
        ctx.beginPath(); ctx.moveTo(hx+headW/2, hy-2)
        ctx.lineTo(hx+headW/2-8, hy-8); ctx.lineTo(hx+headW/2, hy-5)
        ctx.lineTo(hx+headW/2+8, hy-8); ctx.closePath(); ctx.fill()
        r(hx+headW/2-2, hy-5, 4, 4, lighten(accent, 20))
      } else if (accessory === 'glass') {
        // 안경
        ctx.strokeStyle = '#2c2c4a'; ctx.lineWidth = 1.5
        ctx.strokeRect(hx+2, hy+2, 7, 7)
        ctx.strokeRect(hx+headW-9, hy+2, 7, 7)
        ctx.beginPath(); ctx.moveTo(hx+9, hy+5); ctx.lineTo(hx+headW-9, hy+5); ctx.stroke()
      } else if (accessory === 'hat') {
        r(hx+2, hy-8, headW-4, 8, hatColor)
        r(hx-2, hy-2, headW+4, 3, darken(hatColor, 20))
      }

      // ── 플레이어 별 마크 ──
      if (isPlayer) {
        const bob = Math.sin(t * 3) * 1.5
        ctx.fillStyle = '#ffe030'
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('⭐', px + RW/2, hy - 10 + bob)
        ctx.textAlign = 'left'
      }

      // ── 활성 에이전트 빛나는 효과 ──
      if (isActive) {
        const glow = Math.sin(t * 4) * 0.3 + 0.7
        ctx.strokeStyle = accent
        ctx.lineWidth = 2
        ctx.globalAlpha = glow
        ctx.strokeRect(hx-1, hy-1, headW+2, headH+2)
        ctx.globalAlpha = 1
      }
    }

    // 색상 유틸리티
    function darken(hex: string, amount: number): string {
      const num = parseInt(hex.slice(1), 16)
      const r = Math.max(0, (num >> 16) - amount)
      const g = Math.max(0, ((num >> 8) & 0xff) - amount)
      const b = Math.max(0, (num & 0xff) - amount)
      return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
    }
    function lighten(hex: string, amount: number): string {
      const num = parseInt(hex.slice(1), 16)
      const r = Math.min(255, (num >> 16) + amount)
      const g = Math.min(255, ((num >> 8) & 0xff) + amount)
      const b = Math.min(255, (num & 0xff) + amount)
      return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
    }

    // ── 이름표 ──
    const drawLabel = (px:number,py:number,name:string,active:boolean,accent:string) => {
      const hy = py + RH - 32
      ctx.font = 'bold 10px "Jua",monospace'
      const tw = ctx.measureText(name).width + 12
      const lx = px + RW/2 - tw/2, ly = hy - 18
      ctx.fillStyle = active ? accent : 'rgba(20,10,50,0.9)'
      ctx.strokeStyle = active ? '#fff' : 'rgba(160,140,220,0.5)'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.roundRect(lx, ly, tw, 14, 3); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'
      ctx.fillText(name, px + RW/2, ly + 10); ctx.textAlign = 'left'
    }

    // ── 말풍선 ──
    const BUBBLES: Record<string,string> = {
      router:'업무 배분!', web:'코딩 중!', content:'작성 중!', research:'분석 중!', edu:'강의 중!', ops:'배포 중!'
    }
    const drawBubble = (px:number,py:number,text:string,accent:string) => {
      const bob = Math.sin(tick.current * 3) * 1.5
      const hy = py + RH - 32
      ctx.font = '9px "Jua",monospace'
      const tw = ctx.measureText(text).width + 12
      const bx = px + RW/2 - tw/2, by = hy - 36 + bob
      ctx.fillStyle = 'rgba(255,255,255,0.97)'; ctx.strokeStyle = accent; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.roundRect(bx, by, tw, 16, 4); ctx.fill(); ctx.stroke()
      // 꼬리
      ctx.fillStyle = 'rgba(255,255,255,0.97)'; ctx.beginPath()
      ctx.moveTo(px+RW/2-4, by+16); ctx.lineTo(px+RW/2+4, by+16); ctx.lineTo(px+RW/2, by+22); ctx.fill()
      ctx.fillStyle = '#100828'; ctx.font = 'bold 9px "Jua",monospace'
      ctx.textAlign = 'center'; ctx.fillText(text, px+RW/2, by+11); ctx.textAlign = 'left'
    }

    // ── HUD ──
    const drawHUD = (isDecorate:boolean, nearAgName:string|null) => {
      const modeText = isDecorate ? '🎨 꾸미기 모드 (F로 전환)' : '🕹️ 이동 모드 (F로 꾸미기)'
      ctx.fillStyle = isDecorate ? 'rgba(255,160,0,0.9)' : 'rgba(20,10,50,0.85)'
      ctx.strokeStyle = isDecorate ? '#ffb020' : 'rgba(160,140,220,0.6)'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.roundRect(8, CANVAS_H-32, 220, 24, 6); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px "Jua",monospace'
      ctx.fillText(modeText, 16, CANVAS_H-15)

      if (!isDecorate) {
        ctx.fillStyle = 'rgba(20,10,50,0.7)'
        ctx.beginPath(); ctx.roundRect(CANVAS_W-130, CANVAS_H-32, 122, 24, 6); ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '10px monospace'
        ctx.fillText('WASD / 방향키 이동', CANVAS_W-122, CANVAS_H-15)
      }

      if (nearAgName && !isDecorate) {
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.strokeStyle = '#8860f0'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.roundRect(CANVAS_W/2-90, CANVAS_H-60, 180, 28, 8); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#300850'; ctx.font = 'bold 11px "Jua",monospace'; ctx.textAlign = 'center'
        ctx.fillText(`👋 ${nearAgName}에게 인사!`, CANVAS_W/2, CANVAS_H-41)
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
      const t = tick.current
      const s = setRef.current
      const cts = loadData<CT[]>('nk_custom_teams', [])
      const isDecorate = modeRef.current === 'decorate'

      // ── 플레이어 이동 ──
      if (!isDecorate) {
        const pl = playerRef.current
        const spd = 2
        let dx=0, dy=0
        const k = keysRef.current
        if(k.has('arrowup')   ||k.has('w')) dy=-spd
        if(k.has('arrowdown') ||k.has('s')) dy= spd
        if(k.has('arrowleft') ||k.has('a')) dx=-spd
        if(k.has('arrowright')||k.has('d')) dx= spd
        pl.moving = dx!==0||dy!==0
        if (pl.moving) {
          const nx=pl.x+dx, ny=pl.y+dy
          if(canWalk(nx,ny)){ pl.x=nx; pl.y=ny }
          else if(canWalk(pl.x+dx, pl.y)){ pl.x+=dx }
          else if(canWalk(pl.x, pl.y+dy)){ pl.y+=dy }
          pl.frame = (pl.frame + 0.3) % (Math.PI * 2)
          if(Math.abs(dx)>Math.abs(dy)) pl.dir=dx>0?'r':'l'
          else pl.dir=dy>0?'d':'u'
        }

        let nearest:string|null=null, nearDist=50
        agRef.current.forEach(ag=>{
          const d=Math.hypot(ag.x-pl.x, ag.y-pl.y)
          if(d<nearDist){ nearDist=d; nearest=ag.def.name }
        })
        setNearAgent(nearest)
      }

      // ── 배경 ──
      ctx.fillStyle = '#0a0a16'; ctx.fillRect(0, 0, cv.width, cv.height)

      // ── 타일 렌더 ──
      for(let tr=0;tr<ROWS;tr++){
        for(let tc=0;tc<COLS;tc++){
          const tile=mapRef.current[tr]?.[tc]; if(!tile) continue
          const x=tpx(tc), y=tpy(tr)
          const fn=TILE_RENDER[tile]
          if(fn) fn(x,y,tc,tr)
          else { r(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.fl2) }
        }
      }

      // 꾸미기 모드 하이라이트
      if (isDecorate) {
        const tc=Math.floor((mouseX-2)/TS), tr=Math.floor((mouseY-2)/TS)
        if(tc>=0&&tc<COLS&&tr>=0&&tr<ROWS){
          ctx.strokeStyle='#ffe030'; ctx.lineWidth=2
          ctx.strokeRect(tpx(tc), tpy(tr), TS, TS)
          ctx.fillStyle='rgba(255,224,48,0.15)'
          ctx.fillRect(tpx(tc), tpy(tr), TS, TS)
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
            } else { ag.timer=15+Math.random()*25 }
          }
        } else if(ag.state==='walk'){
          const dx=ag.tx-ag.x, dy=ag.ty-ag.y, dist=Math.hypot(dx,dy)
          if(dist>2){
            const nx=ag.x+dx/dist*1.2, ny=ag.y+dy/dist*1.2
            if(canWalk(nx,ny)){ag.x=nx;ag.y=ny} else {ag.state='return';ag.tx=ag.sx;ag.ty=ag.sy}
            ag.frame=(ag.frame+0.25)%(Math.PI*2)
            if(Math.abs(dx)>Math.abs(dy)) ag.dir=dx>0?'r':'l'
            else ag.dir=dy>0?'d':'u'
          } else {
            ag.walksLeft--
            if(ag.walksLeft<=0||ag.timer<=0){ ag.state='return'; ag.tx=ag.sx; ag.ty=ag.sy }
            else { const tgt=walkTarget(); ag.tx=tgt.tx; ag.ty=tgt.ty }
          }
        } else {
          const dx=ag.tx-ag.x, dy=ag.ty-ag.y, dist=Math.hypot(dx,dy)
          if(dist>3){
            const nx=ag.x+dx/dist*1.3, ny=ag.y+dy/dist*1.3
            if(canWalk(nx,ny)){ag.x=nx;ag.y=ny}
            ag.frame=(ag.frame+0.25)%(Math.PI*2)
            if(Math.abs(dx)>Math.abs(dy)) ag.dir=dx>0?'r':'l'
            else ag.dir=dy>0?'d':'u'
          } else {
            ag.x=ag.sx; ag.y=ag.sy; ag.state='sit'
            ag.dir='u'; ag.frame=0; ag.timer=15+Math.random()*20
          }
        }
      })

      // ── Y정렬 후 스프라이트 렌더 ──
      const pl = playerRef.current
      type Sprite = { y:number; draw:()=>void }
      const sprites: Sprite[] = []

      agRef.current.forEach(ag=>{
        sprites.push({ y:ag.y, draw:()=>{
          const isAct = actRef.current === ag.def.id
          const nm = s.agentNames?.[ag.def.id] || ag.def.name
          const sitting = ag.state === 'sit'
          const px = Math.round(ag.x-RW/2), py = Math.round(ag.y-RH)
          drawRobloxChar(px, py, ag.def.bodyColor, ag.def.headColor, ag.def.hatColor,
            ag.def.accessory, ag.def.accent, ag.dir, ag.frame, sitting, false, isAct)
          drawLabel(px, py, nm, isAct, ag.def.accent)
          if (isAct) drawBubble(px, py, BUBBLES[ag.def.id]||'업무 중!', ag.def.accent)
        }})
      })

      // 커스텀 팀 스프라이트
      cts.slice(0,6).forEach((ct,i)=>{
        const col=i%3, row=Math.floor(i/3)
        const tc=2+col*4, tr2=13+row*2
        const ax=tpx(tc)+TS/2, ay=tpy(tr2)+TS
        const colors = [
          {body:'#4040a0',head:'#f4c080',hat:'#6060e8',acc:'none',accent:'#8080ff'},
          {body:'#902018',head:'#fde3a7',hat:'#e74c3c',acc:'bow',accent:'#ff6060'},
          {body:'#208848',head:'#f0c896',hat:'#27ae60',acc:'none',accent:'#50e870'},
        ]
        const col3 = colors[i%3]
        const nm = s.agentNames?.[ct.id] || ct.name
        const px = Math.round(ax-RW/2), py = Math.round(ay-RH)
        sprites.push({ y:ay, draw:()=>{
          drawRobloxChar(px, py, col3.body, col3.head, col3.hat, col3.acc, col3.accent, 'u', 0, true, false, actRef.current===ct.id)
          drawLabel(px, py, nm, actRef.current===ct.id, col3.accent)
        }})
      })

      // 플레이어 스프라이트
      if (!isDecorate) {
        sprites.push({ y:pl.y, draw:()=>{
          const px=Math.round(pl.x-RW/2), py=Math.round(pl.y-RH)
          drawRobloxChar(px, py, '#c03030', '#f4c890', '#ffe030', 'none', '#ffe030', pl.dir, pl.frame, false, true, false)
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
          borderRadius:10, padding:'6px 12px', display:'flex', gap:8, zIndex:10,
          boxShadow:'0 2px 12px rgba(255,160,0,0.3)'
        }}>
          {FURNITURE_ITEMS.map(item=>(
            <button key={item.key} onClick={()=>setSelectedTile(item.tile)} title={item.label}
              style={{
                background: selectedTile===item.tile ? '#ffb020' : 'rgba(255,255,255,0.1)',
                border: selectedTile===item.tile ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.3)',
                borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:18,
                color:'#fff', fontWeight:'bold', transition:'all 0.15s'
              }}>
              {item.icon}
              <div style={{fontSize:9,marginTop:1,opacity:0.8}}>{item.label}</div>
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
