'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { AgentId } from '@/lib/agents'
import { loadData, DEFAULT_SETTINGS, type AppSettings } from '@/lib/store'

interface Props { activeAgentId?: AgentId | null }

// ═══════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════
const TS   = 32
const SPW  = 16
const SPH  = 24
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
  pl1:'#48b848', pl2:'#288028', pl3:'#185818',
  pot:'#b85028', potL:'#d87040',
  cp:'#403888', cpL:'#504898',
  mt:'#6a4018', mtL:'#9a6028', mtD:'#4a2a08',
  so:'#b82858', soL:'#d84070', soD:'#782038', soA:'#501028',
  wb:'#f0f0e8', wbB:'#787060',
  fr:['#c07830','#8038a0','#3868b0'],
  // Player colors
  pl_hair:'#2a1a0a', pl_skin:'#f4c890', pl_top:'#c03030', pl_bot:'#303060', pl_shoe:'#181818',
}

// ── Map ──────────────────────────────────────
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
  {id:'router',  name:'총괄실장',hair:'#b0b0b8',skin:'#f4c890',top:'#1e3a5f',bot:'#101828',shoe:'#080810',acc:'tie',   accent:'#e08888',seat:{tc:2,tr:5}},
  {id:'web',     name:'웹 팀',   hair:'#18a8c0',skin:'#f4c080',top:'#f8d838',bot:'#4050a8',shoe:'#202860',acc:'none',  accent:'#f8d838',seat:{tc:6,tr:5}},
  {id:'content', name:'콘텐츠 팀',hair:'#482010',skin:'#f8d090',top:'#e05080',bot:'#281020',shoe:'#140808',acc:'ear',   accent:'#e05080',seat:{tc:10,tr:5}},
  {id:'research',name:'연구 팀', hair:'#302010',skin:'#f4c080',top:'#e0e0e0',bot:'#284060',shoe:'#182030',acc:'glass', accent:'#4888d0',seat:{tc:2, tr:11}},
  {id:'edu',     name:'교육 팀', hair:'#141414',skin:'#f4c080',top:'#488038',bot:'#202818',shoe:'#101210',acc:'none',  accent:'#58a048',seat:{tc:6, tr:11}},
  {id:'ops',     name:'운영 팀', hair:'#0a0a0a',skin:'#c88858',top:'#286828',bot:'#181a18',shoe:'#060806',acc:'head',  accent:'#48a048',seat:{tc:10,tr:11}},
]
type AgDef = typeof AGENT_DEF[0]
type CT = {id:string;icon:string;name:string}

// ── Furniture inventory ──────────────────────
const FURNITURE_ITEMS = [
  { key:'desk',   label:'책상',  tile:DK, icon:'🖥️' },
  { key:'chair',  label:'의자',  tile:CH, icon:'🪑' },
  { key:'plant',  label:'화분',  tile:PL, icon:'🪴' },
  { key:'carpet', label:'카펫',  tile:CP, icon:'🟪' },
  { key:'sofa',   label:'소파',  tile:SF, icon:'🛋️' },
  { key:'shelf',  label:'책장',  tile:SH, icon:'📚' },
]

// ═══════════════════════════════════════════
//  AGENT STATE TYPE
// ═══════════════════════════════════════════
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

// ── Player State ─────────────────────────────
type PlayerState = {
  x: number; y: number
  dir: 'u'|'d'|'l'|'r'
  frame: number
  moving: boolean
}

// ═══════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════
export default function PixelOffice({ activeAgentId }: Props) {
  const cvRef   = useRef<HTMLCanvasElement>(null)
  const tick    = useRef(0)
  const actRef  = useRef<AgentId|null|undefined>(null)
  const setRef  = useRef<AppSettings>(DEFAULT_SETTINGS)
  const ctRef   = useRef<CT[]>([])
  const agRef   = useRef<AgState[]>([])
  const mapRef  = useRef<number[][]>(BASE_MAP.map(r => [...r]))
  const playerRef = useRef<PlayerState>({ x: 2+8*TS+SPW/2, y: 2+8*TS+SPH, dir:'d', frame:0, moving:false })
  const keysRef = useRef<Set<string>>(new Set())

  // UI state
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
      const sx = 2 + def.seat.tc * TS + SPW/2
      const sy = 2 + def.seat.tr * TS + TS
      return { def, x:sx, y:sy, sx, sy, tx:sx, ty:sy, state:'sit', dir:'u', frame:0, timer:20+Math.random()*20, walksLeft:0 }
    })
  }, [])

  // ── Keyboard input ───────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
      if (e.key === 'f' || e.key === 'F') {
        setMode(m => m === 'play' ? 'decorate' : 'play')
      }
    }
    const up = (e: KeyboardEvent) => { keysRef.current.delete(e.key.toLowerCase()) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // ── Canvas click for decorate mode ───────
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (modeRef.current !== 'decorate') return
    const cv = cvRef.current; if (!cv) return
    const rect = cv.getBoundingClientRect()
    const scaleX = CANVAS_W / rect.width
    const scaleY = CANVAS_H / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY
    const tc = Math.floor((mx - 2) / TS)
    const tr = Math.floor((my - 2) / TS)
    if (tc >= 0 && tc < COLS && tr >= 0 && tr < ROWS) {
      const t = mapRef.current[tr]?.[tc]
      if (t === TL.F || t === TL.CP || t === TL.CH || t === TL.PL || t === TL.FR) {
        mapRef.current[tr][tc] = selTileRef.current
      }
    }
  }, [])

  // ═══════════════════════════════════════
  //  GAME LOOP
  // ═══════════════════════════════════════
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return
    const ctx = cv.getContext('2d')!

    // ── helpers ───────────────────────────
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

    // ── tile renderers ────────────────────
    const TILE_RENDER: Record<number,(x:number,y:number,tc:number,tr:number)=>void> = {
      [TL.F]: (x,y,tc,tr) => {
        r(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.fl2)
        ctx.strokeStyle='rgba(0,0,0,0.06)'; ctx.lineWidth=0.5; ctx.strokeRect(x+.5,y+.5,TS-1,TS-1)
      },
      [TL.CP]: (x,y) => {
        r(x,y,TS,TS,C.cp); r(x+3,y+3,TS-6,TS-6,C.cpL)
        ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=0.8; ctx.strokeRect(x+5,y+5,TS-10,TS-10)
      },
      [TL.W]: (x,y) => {
        r(x,y,TS,TS,C.wl); r(x,y,TS,4,C.wlT); r(x,y+TS-3,TS,3,'rgba(0,0,0,0.25)')
        ctx.strokeStyle='rgba(0,0,0,0.1)'; ctx.lineWidth=0.5; ctx.strokeRect(x,y,TS,TS)
      },
      [TL.WT]: (x,y) => { r(x,y,TS,TS,C.wlD) },
      [TL.SH]: (x,y,tc) => {
        r(x,y,TS,TS,C.wl)
        r(x,y+4,TS,TS-4,C.sf_wood); r(x,y+4,TS,4,C.sf_woodL); r(x,y+TS-4,TS,4,C.sf_woodD)
        let bx=x+2
        for(let b=0;b<4;b++){
          const bh=10+(b%3)*3,bw=6
          r(bx,y+6,bw,bh,C.bk[(tc+b)%C.bk.length])
          r(bx,y+6,1,bh,'rgba(255,255,255,0.3)')
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
        r(x,y+TS,TS,6,C.dkD); r(x+4,y+TS+6,7,14,C.dkD); r(x+TS-11,y+TS+6,7,14,C.dkD)
      },
      [TL.MN]: (x,y) => {
        r(x,y,TS,TS,(Math.round(x/TS)+Math.round(y/TS))%2===0?C.fl:C.fl2)
        const p=0.5+Math.sin(tick.current+x*0.05)*0.25
        r(x+4,y+6,TS-8,TS-12,C.mn); r(x+5,y+7,TS-10,TS-14,C.mnS)
        ctx.globalAlpha=p*0.9
        r(x+6,y+8,10,2,C.mnG); r(x+6,y+12,TS-14,2,'#70b0d8'); r(x+6,y+16,8,2,C.mnG)
        ctx.globalAlpha=1
        r(x+TS/2-4,y+TS-8,8,4,C.mn); r(x+TS/2-8,y+TS-4,16,3,'#0e0e1a')
      },
      [TL.CH]: (x,y,tc,tr) => {
        r(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.fl2)
        const cc=C.ch[(tc/5|0+tr)%C.ch.length]
        r(x+3,y+1,TS-6,5,cc); r(x+3,y+6,TS-6,16,cc); r(x+5,y+8,TS-10,5,cc+'ee')
        r(x+4,y+22,5,10,'#706060'); r(x+TS-9,y+22,5,10,'#706060')
        r(x+4,y+30,TS-8,3,'#605050')
      },
      [TL.PL]: (x,y,tc,tr) => {
        r(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.fl2)
        ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(x+TS/2,y+TS-3,9,3,0,0,Math.PI*2); ctx.fill()
        r(x+8,y+18,16,12,C.pot); r(x+8,y+18,16,3,C.potL)
        r(x+TS/2-1,y+8,3,12,'#286018')
        r(x+2,y+2,12,10,C.pl2); r(x+2,y+2,10,7,C.pl1)
        r(x+14,y-1,12,12,C.pl2); r(x+6,y-4,10,14,C.pl1)
      },
      [TL.DV]: (x,y) => {
        r(x,y,TS,TS,C.wlD); r(x+TS/2-3,y,6,TS,C.sf_wood)
      },
      [TL.WB]: (x,y) => {
        r(x,y,TS,TS,C.wl); r(x+1,y+3,TS-2,TS-6,C.wbB); r(x+2,y+4,TS-4,TS-8,C.wb)
        const bars=[9,15,7,12,18,6]; bars.forEach((bh,i)=>{ r(x+3+i*4,y+4+TS-12-bh,3,bh,C.bk[(x/TS|0+i)%C.bk.length]) })
      },
      [TL.MT]: (x,y) => {
        r(x,y,TS,TS,C.mt); r(x,y,TS,2,C.mtL); r(x,y,2,TS,C.mtL)
        r(x+TS-2,y,2,TS,C.mtD); r(x,y+TS-2,TS,2,C.mtD)
      },
      [TL.ME]: (x,y,tc,tr) => {
        r(x,y,TS,TS,C.mtL); r(x+4,y+4,TS-8,TS-8,C.ch[(tc+tr)%C.ch.length])
      },
      [TL.SF]: (x,y) => {
        r(x,y,TS,TS,C.so); r(x+2,y+2,TS-4,TS/2-2,C.soL)
        r(x+1,y+1,4,TS-2,'rgba(255,255,255,0.07)')
      },
      [TL.SA]: (x,y) => {
        r(x,y,TS,TS,C.soA); r(x+2,y+2,TS-4,TS-4,C.soD)
      },
      [TL.FR]: (x,y,tc) => {
        r(x,y,TS,TS,(tc%2===0?C.fl:C.fl2))
        r(x+4,y+4,TS-8,TS-8,C.fr[tc%3]); r(x+6,y+6,TS-12,TS-12,'rgba(255,255,255,0.12)')
        ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=1.5; ctx.strokeRect(x+4,y+4,TS-8,TS-8)
      },
    }

    // ── sprite renderers ──────────────────
    const drawHair = (px:number,py:number,hair:string,style:string,dir:string) => {
      if(dir==='u'){
        r(px+1,py-2,SPW-2,6,hair); r(px,py+2,3,8,hair); r(px+SPW-3,py+2,3,8,hair)
        if(style==='long') r(px+1,py+8,SPW-2,10,hair)
      } else if(dir==='d'){
        if(style==='long'){ r(px+1,py-2,SPW-2,8,hair); r(px,py+6,3,20,hair); r(px+SPW-3,py+6,3,20,hair) }
        else { r(px+1,py-2,SPW-2,6,hair); r(px+1,py+4,4,5,hair); r(px+SPW-5,py+4,4,5,hair) }
      } else {
        r(px+1,py-2,SPW-2,6,hair)
        r(dir==='l'?px+SPW-4:px, py+2, 4, 10, hair)
      }
    }

    const drawSprite = (px:number,py:number,def:AgDef|null,dir:'u'|'d'|'l'|'r',frame:number,sitting:boolean,isPlayer=false) => {
      const hair  = isPlayer ? C.pl_hair  : def!.hair
      const skin  = isPlayer ? C.pl_skin  : def!.skin
      const top   = isPlayer ? C.pl_top   : def!.top
      const bot   = isPlayer ? C.pl_bot   : def!.bot
      const shoe  = isPlayer ? C.pl_shoe  : def!.shoe
      const acc   = isPlayer ? 'none'     : def!.acc
      const accent= isPlayer ? C.pl_top   : def!.accent

      const lOff = sitting?0:[0,3,0,-3][frame%4]
      const rOff = sitting?0:[0,-3,0,3][frame%4]

      ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(px+SPW/2,py+SPH-1,8,3,0,0,Math.PI*2); ctx.fill()

      // Shoes & legs
      r(px+2,py+SPH-4+lOff,5,4,shoe); r(px+9,py+SPH-4+rOff,5,4,shoe)
      r(px+3,py+14+lOff,4,8,bot); r(px+9,py+14+rOff,4,8,bot)

      // Body
      r(px+1,py+7,SPW-2,8,top)

      if(dir==='d'){
        // Front arms
        r(px-1,py+8,3,8,top); r(px+SPW-2,py+8,3,8,top)
        r(px-1,py+14,4,4,skin); r(px+SPW-3,py+14,4,4,skin)
        // Head
        r(px+2,py,SPW-4,9,skin)
        // Face
        r(px+4,py+3,3,3,'#18102a'); r(px+9,py+3,3,3,'#18102a')
        r(px+5,py+4,1,1,'#fff'); r(px+10,py+4,1,1,'#fff')
        r(px+5,py+7,6,2,'#c05870')
        drawHair(px,py,hair,acc,dir)
        if(acc==='glass'){
          ctx.strokeStyle='#282848'; ctx.lineWidth=1.2
          ctx.strokeRect(px+3,py+2,5,5); ctx.strokeRect(px+8,py+2,5,5)
        }
        if(acc==='tie') r(px+6,py+8,4,8,accent)
        if(acc==='ear'){ r(px,py+3,2,4,'#f8d020'); r(px+SPW-2,py+3,2,4,'#f8d020') }
        // Player star
        if(isPlayer){
          ctx.fillStyle='#ffe030'; ctx.font='bold 10px sans-serif'; ctx.textAlign='center'
          ctx.fillText('★',px+SPW/2,py-2); ctx.textAlign='left'
        }
      } else if(dir==='u'){
        r(px-1,py+8,3,8,top); r(px+SPW-2,py+8,3,8,top)
        r(px-1,py+14,4,4,skin); r(px+SPW-3,py+14,4,4,skin)
        r(px+2,py,SPW-4,8,skin)
        drawHair(px,py,hair,acc,dir)
        if(acc==='tie') r(px+6,py+8,4,6,accent)
        if(isPlayer){
          ctx.fillStyle='#ffe030'; ctx.font='bold 10px sans-serif'; ctx.textAlign='center'
          ctx.fillText('★',px+SPW/2,py-2); ctx.textAlign='left'
        }
      } else {
        r(dir==='l'?px-1:px+SPW-2,py+8,3,10,top)
        r(dir==='l'?px-1:px+SPW-2,py+16,4,4,skin)
        r(px+2,py,SPW-4,9,skin)
        const ex = dir==='l'?px+3:px+8
        r(ex,py+3,3,3,'#18102a'); r(ex+1,py+4,1,1,'#fff')
        drawHair(px,py,hair,acc,dir)
        if(isPlayer){
          ctx.fillStyle='#ffe030'; ctx.font='bold 10px sans-serif'; ctx.textAlign='center'
          ctx.fillText('★',px+SPW/2,py-2); ctx.textAlign='left'
        }
      }
    }

    const drawLabel = (px:number,py:number,name:string,active:boolean,accent:string) => {
      ctx.font='bold 11px "Jua",monospace'
      const tw=ctx.measureText(name).width+14
      const lx=px+SPW/2-tw/2, ly=py-22
      ctx.fillStyle='#000'; ctx.strokeStyle='#000'; ctx.lineWidth=4
      ctx.beginPath(); ctx.roundRect(lx,ly,tw,15,3); ctx.fill(); ctx.stroke()
      ctx.fillStyle=active?accent:'rgba(12,8,30,0.96)'
      ctx.strokeStyle=active?'rgba(255,255,255,0.9)':'rgba(160,140,220,0.6)'
      ctx.lineWidth=1.5
      ctx.beginPath(); ctx.roundRect(lx,ly,tw,15,3); ctx.fill(); ctx.stroke()
      ctx.fillStyle='#fff'; ctx.textAlign='center'
      ctx.fillText(name,px+SPW/2,ly+11); ctx.textAlign='left'
    }

    const drawBubble = (px:number,py:number,text:string,accent:string) => {
      const bob=Math.sin(tick.current*3)*1.5
      ctx.font='9px "Jua",monospace'
      const tw=ctx.measureText(text).width+12
      const bx=px+SPW/2-tw/2, by=py+bob-42
      ctx.fillStyle='rgba(255,255,255,0.97)'; ctx.strokeStyle=accent; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.roundRect(bx,by,tw,16,4); ctx.fill(); ctx.stroke()
      ctx.fillStyle='rgba(255,255,255,0.97)'; ctx.beginPath()
      ctx.moveTo(px+SPW/2-4,by+16); ctx.lineTo(px+SPW/2+4,by+16); ctx.lineTo(px+SPW/2,by+23); ctx.fill()
      ctx.fillStyle='#100828'; ctx.font='bold 9px "Jua",monospace'
      ctx.textAlign='center'; ctx.fillText(text,px+SPW/2,by+12); ctx.textAlign='left'
    }

    // ── Highlight tile (decorate mode) ────
    const drawTileHighlight = (mx:number,my:number) => {
      const tc=Math.floor((mx-2)/TS), tr=Math.floor((my-2)/TS)
      if(tc<0||tc>=COLS||tr<0||tr>=ROWS) return
      const x=tpx(tc), y=tpy(tr)
      ctx.strokeStyle='#ffe030'; ctx.lineWidth=2
      ctx.strokeRect(x,y,TS,TS)
      ctx.fillStyle='rgba(255,224,48,0.15)'
      ctx.fillRect(x,y,TS,TS)
    }

    // ── HUD overlay ───────────────────────
    const drawHUD = (isDecorate:boolean, nearAgName:string|null) => {
      // Mode badge
      const modeText = isDecorate ? '🛠️ 꾸미기 모드 (F로 나가기)' : '🎮 이동 모드 (F로 꾸미기)'
      ctx.fillStyle = isDecorate ? 'rgba(255,160,0,0.9)' : 'rgba(20,10,50,0.85)'
      ctx.strokeStyle = isDecorate ? '#ffb020' : 'rgba(160,140,220,0.6)'
      ctx.lineWidth=1.5
      ctx.beginPath(); ctx.roundRect(8, CANVAS_H-32, 260, 24, 6); ctx.fill(); ctx.stroke()
      ctx.fillStyle='#fff'; ctx.font='bold 11px "Jua",monospace'
      ctx.fillText(modeText, 16, CANVAS_H-15)

      // WASD hint
      if(!isDecorate){
        ctx.fillStyle='rgba(20,10,50,0.7)'
        ctx.beginPath(); ctx.roundRect(CANVAS_W-120, CANVAS_H-32, 112, 24, 6); ctx.fill()
        ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='10px monospace'
        ctx.fillText('WASD / ↑↓←→ 이동', CANVAS_W-114, CANVAS_H-15)
      }

      // Near agent popup
      if(nearAgName && !isDecorate){
        ctx.fillStyle='rgba(255,255,255,0.95)'; ctx.strokeStyle='#8860f0'; ctx.lineWidth=2
        ctx.beginPath(); ctx.roundRect(CANVAS_W/2-80, CANVAS_H-60, 160, 28, 8); ctx.fill(); ctx.stroke()
        ctx.fillStyle='#300850'; ctx.font='bold 11px "Jua",monospace'; ctx.textAlign='center'
        ctx.fillText(`💬 ${nearAgName}에게 말 걸기`, CANVAS_W/2, CANVAS_H-41)
        ctx.textAlign='left'
      }
    }

    // ── main loop ────────────────────────────
    const BUBBLES: Record<string,string> = {
      router:'업무 배분!',web:'코딩 중!',content:'작성 중!',research:'분석 중!',edu:'교육 자료!',ops:'서버 점검!'
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

      // ── Player movement ────────────────
      if(!isDecorate){
        const pl = playerRef.current
        const spd = 2
        let dx=0, dy=0
        const k = keysRef.current
        if(k.has('arrowup')   ||k.has('w')) dy=-spd
        if(k.has('arrowdown') ||k.has('s')) dy= spd
        if(k.has('arrowleft') ||k.has('a')) dx=-spd
        if(k.has('arrowright')||k.has('d')) dx= spd
        pl.moving = dx!==0||dy!==0
        if(pl.moving){
          const nx=pl.x+dx, ny=pl.y+dy
          if(canWalk(nx,ny)){ pl.x=nx; pl.y=ny }
          else if(canWalk(pl.x+dx, pl.y)){ pl.x+=dx }
          else if(canWalk(pl.x, pl.y+dy)){ pl.y+=dy }
          pl.frame=Math.floor(t*5)%4
          if(Math.abs(dx)>Math.abs(dy)) pl.dir=dx>0?'r':'l'
          else pl.dir=dy>0?'d':'u'
        }

        // Check near agent
        let nearest:string|null=null, nearDist=48
        agRef.current.forEach(ag=>{
          const d=Math.hypot(ag.x-pl.x, ag.y-pl.y)
          if(d<nearDist){ nearDist=d; nearest=ag.def.name }
        })
        setNearAgent(nearest)
      }

      // ── Clear ──────────────────────────
      ctx.fillStyle='#0a0a16'; ctx.fillRect(0,0,cv.width,cv.height)

      // ── Tiles ──────────────────────────
      for(let tr=0;tr<ROWS;tr++){
        for(let tc=0;tc<COLS;tc++){
          const tile=mapRef.current[tr]?.[tc]; if(!tile) continue
          const x=tpx(tc), y=tpy(tr)
          const fn=TILE_RENDER[tile]
          if(fn) fn(x,y,tc,tr)
          else { r(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.fl2) }
        }
      }

      // Decorate mode: tile hover highlight
      if(isDecorate) drawTileHighlight(mouseX, mouseY)

      // ── Agents ─────────────────────────
      agRef.current.forEach(ag=>{
        ag.timer-=0.04
        if(ag.state==='sit'){
          if(ag.timer<=0){
            if(Math.random()<0.3){
              const tgt=walkTarget()
              ag.state='walk'; ag.tx=tgt.tx; ag.ty=tgt.ty
              ag.walksLeft=1+Math.floor(Math.random()*2)
              ag.timer=8+Math.random()*8; ag.dir='d'
            } else { ag.timer=15+Math.random()*25 }
          }
        } else if(ag.state==='walk'){
          const dx=ag.tx-ag.x, dy=ag.ty-ag.y, dist=Math.hypot(dx,dy)
          if(dist>2){
            const nx=ag.x+dx/dist*1.2, ny=ag.y+dy/dist*1.2
            if(canWalk(nx,ny)){ag.x=nx;ag.y=ny} else {ag.state='return';ag.tx=ag.sx;ag.ty=ag.sy}
            ag.frame=Math.floor(t*5)%4
            if(Math.abs(dx)>Math.abs(dy)) ag.dir=dx>0?'r':'l'
            else ag.dir=dy>0?'d':'u'
          } else {
            ag.walksLeft--
            if(ag.walksLeft<=0||ag.timer<=0){ ag.state='return'; ag.tx=ag.sx; ag.ty=ag.sy }
            else { const tgt=walkTarget(); ag.tx=tgt.tx; ag.ty=tgt.ty }
          }
          ag.timer-=0.04
        } else {
          const dx=ag.tx-ag.x, dy=ag.ty-ag.y, dist=Math.hypot(dx,dy)
          if(dist>3){
            const nx=ag.x+dx/dist*1.3, ny=ag.y+dy/dist*1.3
            if(canWalk(nx,ny)){ag.x=nx;ag.y=ny}
            ag.frame=Math.floor(t*5)%4
            if(Math.abs(dx)>Math.abs(dy)) ag.dir=dx>0?'r':'l'
            else ag.dir=dy>0?'d':'u'
          } else {
            ag.x=ag.sx; ag.y=ag.sy; ag.state='sit'
            ag.dir='u'; ag.frame=0; ag.timer=15+Math.random()*20
          }
        }
      })

      // Sort by Y
      const pl = playerRef.current
      type Sprite = { y:number; draw:()=>void }
      const sprites: Sprite[] = []

      agRef.current.forEach(ag=>{
        sprites.push({ y: ag.y, draw:()=>{
          const isAct=actRef.current===ag.def.id
          const nm=s.agentNames?.[ag.def.id]||ag.def.name
          const def={...ag.def,name:nm}
          const sitting=ag.state==='sit'
          const px=Math.round(ag.x-SPW/2), py=Math.round(ag.y-SPH)
          drawSprite(px,py,def,ag.dir,ag.frame,sitting,false)
          drawLabel(px,py,nm,isAct,def.accent)
          if(isAct) drawBubble(px,py,BUBBLES[def.id]||'작업 중!',def.accent)
        }})
      })

      // Custom teams
      cts.slice(0,6).forEach((ct,i)=>{
        const col=i%3, row=Math.floor(i/3)
        const tc=2+col*4, tr=13+row*2
        const ax=tpx(tc)+TS/2, ay=tpy(tr)+TS
        const customDef: AgDef = {
          id:ct.id, name:ct.name,
          hair:'#c0c0c8', skin:'#f4c080',
          top:['#4040a0','#902018','#208848'][i%3],
          bot:'#202028', shoe:'#100808',
          acc:'none', accent:['#6060e8','#d03020','#30b860'][i%3],
          seat:{tc,tr}
        }
        const nm=s.agentNames?.[ct.id]||ct.name
        const px=Math.round(ax-SPW/2), py=Math.round(ay-SPH)
        sprites.push({ y:ay, draw:()=>{
          drawSprite(px,py,customDef,'u',0,true,false)
          drawLabel(px,py,nm,actRef.current===ct.id,customDef.accent)
        }})
      })

      // Player sprite
      if(!isDecorate){
        sprites.push({ y: pl.y, draw:()=>{
          const px=Math.round(pl.x-SPW/2), py=Math.round(pl.y-SPH)
          drawSprite(px,py,null,pl.dir,pl.frame,false,true)
          drawLabel(px,py,'나',false,'#ffe030')
        }})
      }

      sprites.sort((a,b)=>a.y-b.y).forEach(s=>s.draw())

      // HUD
      drawHUD(isDecorate, nearAgent)

      animId=requestAnimationFrame(loop)
    }
    animId=requestAnimationFrame(loop)
    return()=>{ cancelAnimationFrame(animId); cv.removeEventListener('mousemove',onMove) }
  }, [nearAgent])

  return (
    <div style={{ position:'relative', display:'inline-block' }}>
      {/* 가구 팔레트 (꾸미기 모드) */}
      {mode==='decorate' && (
        <div style={{
          position:'absolute', top:8, left:'50%', transform:'translateX(-50%)',
          background:'rgba(10,8,30,0.92)', border:'1.5px solid #ffb020',
          borderRadius:10, padding:'6px 12px', display:'flex', gap:8, zIndex:10,
          boxShadow:'0 2px 12px rgba(255,160,0,0.3)'
        }}>
          {FURNITURE_ITEMS.map(item=>(
            <button
              key={item.key}
              onClick={()=>setSelectedTile(item.tile)}
              title={item.label}
              style={{
                background: selectedTile===item.tile ? '#ffb020' : 'rgba(255,255,255,0.1)',
                border: selectedTile===item.tile ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.3)',
                borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:18,
                color:'#fff', fontWeight:'bold', transition:'all 0.15s'
              }}
            >
              {item.icon}
              <div style={{fontSize:9,marginTop:1,opacity:0.8}}>{item.label}</div>
            </button>
          ))}
        </div>
      )}

      <canvas
        ref={cvRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onClick={handleClick}
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
