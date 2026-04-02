'use client'
import { useEffect, useRef } from 'react'
import type { AgentId } from '@/lib/agents'
import { loadData, DEFAULT_SETTINGS, type AppSettings } from '@/lib/store'

interface Props { activeAgentId?: AgentId | null }

// ═══════════════════════════════════════════
//  GAME ENGINE CONSTANTS
// ═══════════════════════════════════════════
const TS  = 32   // tile size
const SPW = 16   // sprite width
const SPH = 24   // sprite height
const COLS = 28
const ROWS = 16

// ── Tile Types ──────────────────────────────
const TL = {
  F:1,   // floor
  W:2,   // wall
  SH:3,  // shelf
  SK:4,  // clock (wall)
  DK:5,  // desk top
  MN:6,  // monitor
  CH:7,  // chair
  PL:8,  // plant
  CP:9,  // carpet
  DV:10, // divider
  WB:11, // whiteboard
  MT:12, // meeting table
  ME:13, // meeting edge
  SF:14, // sofa
  SA:15, // sofa arm
  FR:16, // picture frame
  WT:17, // wall_top
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
}

// ── Tile Map ────────────────────────────────
// prettier-ignore
const {F,W,SH,SK,DK,MN,CH,PL,CP,DV,WB,MT,ME,SF,SA,FR,WT} = TL
const MAP: number[][] = [
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
  {id:'router',  name:'총괄실장',hair:'#b0b0b8',skin:'#f4c890',top:'#1e3a5f',bot:'#101828',shoe:'#080810',acc:'tie',  accent:'#e08888',seat:{tc:2,tr:5}},
  {id:'web',     name:'웹 팀',   hair:'#18a8c0',skin:'#f4c080',top:'#f8d838',bot:'#4050a8',shoe:'#202860',acc:'none', accent:'#f8d838',seat:{tc:6,tr:5}},
  {id:'content', name:'콘텐츠 팀',hair:'#482010',skin:'#f8d090',top:'#e05080',bot:'#281020',shoe:'#140808',acc:'ear',  accent:'#e05080',seat:{tc:10,tr:5}},
  {id:'research',name:'연구 팀', hair:'#302010',skin:'#f4c080',top:'#e0e0e0',bot:'#284060',shoe:'#182030',acc:'glass',accent:'#4888d0',seat:{tc:2, tr:11}},
  {id:'edu',     name:'교육 팀', hair:'#141414',skin:'#f4c080',top:'#488038',bot:'#202818',shoe:'#101210',acc:'none', accent:'#58a048',seat:{tc:6, tr:11}},
  {id:'ops',     name:'운영 팀', hair:'#0a0a0a',skin:'#c88858',top:'#286828',bot:'#181a18',shoe:'#060806',acc:'head', accent:'#48a048',seat:{tc:10,tr:11}},
]
type AgDef = typeof AGENT_DEF[0]
type CT = {id:string;icon:string;name:string}

// ── Agent State ─────────────────────────────
type AgState = {
  def: AgDef
  x: number; y: number
  sx: number; sy: number  // home seat pixel pos
  tx: number; ty: number  // walk target
  state: 'sit'|'walk'|'return'
  dir: 'u'|'d'|'l'|'r'
  frame: number
  timer: number
  walksLeft: number
}

// ═══════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════
export default function PixelOffice({activeAgentId}: Props) {
  const cvRef = useRef<HTMLCanvasElement>(null)
  const tick  = useRef(0)
  const actRef= useRef<AgentId|null|undefined>(null)
  const setRef= useRef<AppSettings>(DEFAULT_SETTINGS)
  const ctRef = useRef<CT[]>([])
  const agRef = useRef<AgState[]>([])

  useEffect(()=>{ actRef.current = activeAgentId },[activeAgentId])
  useEffect(()=>{
    setRef.current = loadData<AppSettings>('nk_settings', DEFAULT_SETTINGS)
    ctRef.current  = loadData<CT[]>('nk_custom_teams', [])
    // init agents
    agRef.current = AGENT_DEF.map(def => {
      const sx = 2 + def.seat.tc * TS + SPW/2
      const sy = 2 + def.seat.tr * TS + TS
      return { def, x:sx, y:sy, sx, sy, tx:sx, ty:sy, state:'sit', dir:'u', frame:0, timer:20+Math.random()*20, walksLeft:0 }
    })
  },[])

  useEffect(()=>{
    const cv = cvRef.current; if(!cv) return
    const ctx = cv.getContext('2d')!

    // ── draw helpers ──────────────────────────
    const r = (x:number,y:number,w:number,h:number,c:string) => {
      if(w<=0||h<=0) return
      ctx.fillStyle=c; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))
    }
    const tpx = (tc:number) => 2 + tc * TS  // tile col → pixel x
    const tpy = (tr:number) => 2 + tr * TS  // tile row → pixel y

    // ═══════════════════════════════════════
    //  TILE RENDERERS
    // ═══════════════════════════════════════
    const TILE_RENDER: Record<number,(x:number,y:number,tc:number,tr:number)=>void> = {

      // Floor
      [TL.F]: (x,y,tc,tr) => {
        r(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.fl2)
        ctx.strokeStyle='rgba(0,0,0,0.06)'; ctx.lineWidth=0.5; ctx.strokeRect(x+.5,y+.5,TS-1,TS-1)
      },
      // Carpet
      [TL.CP]: (x,y) => {
        r(x,y,TS,TS,C.cp); r(x+3,y+3,TS-6,TS-6,C.cpL)
        ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=0.8; ctx.strokeRect(x+5,y+5,TS-10,TS-10)
      },
      // Wall
      [TL.W]: (x,y) => {
        r(x,y,TS,TS,C.wl); r(x,y,TS,4,C.wlT); r(x,y+TS-3,TS,3,'rgba(0,0,0,0.25)')
        ctx.strokeStyle='rgba(0,0,0,0.1)'; ctx.lineWidth=0.5; ctx.strokeRect(x,y,TS,TS)
      },
      // Wall top strip
      [TL.WT]: (x,y) => { r(x,y,TS,TS,C.wlD) },
      // Wall dark
      [TL.SH]: (x,y,tc) => {
        r(x,y,TS,TS,C.wl)
        r(x,y+4,TS,TS-4,C.sf_wood); r(x,y+4,TS,4,C.sf_woodL); r(x,y+TS-4,TS,4,C.sf_woodD)
        let bx=x+2
        for(let b=0;b<4;b++){
          const bh=10+(b%3)*3,bw=6
          r(bx,y+6,bw,bh,C.bk[(tc+b)%C.bk.length])
          r(bx,y+6,1,bh,'rgba(255,255,255,0.3)'); r(bx+5,y+6,1,bh,'rgba(0,0,0,0.15)')
          bx+=bw+2
        }
      },
      // Clock
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
      // Desk
      [TL.DK]: (x,y) => {
        r(x,y,TS,TS,C.dk); r(x,y,TS,3,C.dkL); r(x,y,3,TS,C.dkL)
        r(x+TS-3,y,3,TS,C.dkD); r(x,y+TS-4,TS,4,C.dkF)
        r(x,y+TS,TS,6,C.dkD); r(x+4,y+TS+6,7,14,C.dkD); r(x+TS-11,y+TS+6,7,14,C.dkD)
      },
      // Monitor (on top of desk tile)
      [TL.MN]: (x,y) => {
        // Floor beneath
        r(x,y,TS,TS,(Math.round(x/TS)+Math.round(y/TS))%2===0?C.fl:C.fl2)
        const p=0.5+Math.sin(tick.current+x*0.05)*0.25
        r(x+4,y+6,TS-8,TS-12,C.mn); r(x+5,y+7,TS-10,TS-14,C.mnS)
        ctx.globalAlpha=p*0.9
        r(x+6,y+8,10,2,C.mnG); r(x+6,y+12,TS-14,2,'#70b0d8'); r(x+6,y+16,8,2,C.mnG)
        ctx.globalAlpha=1
        ctx.fillStyle='rgba(255,255,255,0.04)'; ctx.fillRect(x+5,y+7,TS-10,6)
        r(x+TS/2-4,y+TS-8,8,4,C.mn); r(x+TS/2-8,y+TS-4,16,3,'#0e0e1a')
      },
      // Chair
      [TL.CH]: (x,y,tc,tr) => {
        r(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.fl2)
        const cc=C.ch[(tc/5|0+tr)%C.ch.length]
        r(x+3,y+1,TS-6,5,cc); r(x+4,y+2,TS-8,3,cc+'dd')
        r(x+3,y+6,4,16,cc); r(x+TS-7,y+6,4,16,cc); r(x+3,y+6,TS-6,16,cc)
        r(x+5,y+8,TS-10,5,cc+'ee')
        r(x+4,y+22,5,10,'#706060'); r(x+TS-9,y+22,5,10,'#706060')
        r(x+4,y+30,TS-8,3,'#605050')
        ctx.fillStyle='rgba(0,0,0,0.12)'; ctx.fillRect(x+3,y+31,TS-6,3)
      },
      // Plant
      [TL.PL]: (x,y,tc,tr) => {
        r(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.fl2)
        ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(x+TS/2,y+TS-3,9,3,0,0,Math.PI*2); ctx.fill()
        r(x+8,y+18,16,12,C.pot); r(x+8,y+18,16,3,C.potL); r(x+10,y+18,12,3,'rgba(255,200,150,0.15)')
        r(x+9,y+21,14,4,'#1c0e05')
        r(x+TS/2-1,y+8,3,12,'#286018')
        r(x+2,y+2,12,10,C.pl2); r(x+2,y+2,10,7,C.pl1)
        r(x+14,y-1,12,12,C.pl2); r(x+14,y-1,10,8,C.pl1)
        r(x+6,y-4,10,14,C.pl1); r(x+7,y-4,8,6,'#80e880')
        r(x+2,y+12,8,6,C.pl3); r(x+14,y+10,7,5,C.pl3)
      },
      // Divider
      [TL.DV]: (x,y) => {
        r(x,y,TS,TS,C.wlD); r(x+TS/2-3,y,6,TS,C.sf_wood); r(x+TS/2-2,y,4,TS,'rgba(0,0,0,0.3)')
      },
      // Whiteboard
      [TL.WB]: (x,y) => {
        r(x,y,TS,TS,C.wl); r(x+1,y+3,TS-2,TS-6,C.wbB); r(x+2,y+4,TS-4,TS-8,C.wb)
        const bars=[9,15,7,12,18,6]; bars.forEach((bh,i)=>{ r(x+3+i*4,y+4+TS-12-bh,3,bh,C.bk[(x/TS|0+i)%C.bk.length]) })
        r(x,y+TS,TS,4,C.wbB)
      },
      // Meeting table
      [TL.MT]: (x,y) => {
        r(x,y,TS,TS,C.mt); r(x,y,TS,2,C.mtL); r(x,y,2,TS,C.mtL)
        r(x+TS-2,y,2,TS,C.mtD); r(x,y+TS-2,TS,2,C.mtD)
        ctx.strokeStyle=C.mtD; ctx.lineWidth=0.5; ctx.beginPath(); ctx.moveTo(x,y+TS/2); ctx.lineTo(x+TS,y+TS/2); ctx.stroke()
      },
      // Meeting edge (chairs drawn)
      [TL.ME]: (x,y,tc,tr) => {
        r(x,y,TS,TS,C.mtL); r(x+4,y+4,TS-8,TS-8,C.ch[(tc+tr)%C.ch.length])
        r(x+6,y+6,TS-12,TS-12,C.ch[(tc+tr)%C.ch.length]+'88')
      },
      // Sofa
      [TL.SF]: (x,y) => {
        r(x,y,TS,TS,C.so); r(x+1,y+1,TS-2,TS-2,C.so)
        r(x+2,y+2,TS-4,TS/2-2,C.soL); r(x+1,y+1,4,TS-2,'rgba(255,255,255,0.07)')
      },
      // Sofa arm
      [TL.SA]: (x,y) => {
        r(x,y,TS,TS,C.soA); r(x+2,y+2,TS-4,TS-4,C.soD)
      },
      // Frame
      [TL.FR]: (x,y,tc) => {
        r(x,y,TS,TS,(tc%2===0?C.fl:C.fl2))
        r(x+4,y+4,TS-8,TS-8,C.fr[tc%3]); r(x+6,y+6,TS-12,TS-12,'rgba(255,255,255,0.12)')
        ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.lineWidth=1.5; ctx.strokeRect(x+4,y+4,TS-8,TS-8)
      },
    }

    // ═══════════════════════════════════════
    //  SPRITE RENDERERS
    // ═══════════════════════════════════════

    // Hair draw helper
    const drawHair = (px:number,py:number,hair:string,style:string,dir:string) => {
      if(dir==='u'){ // back of head
        r(px+1,py-2,SPW-2,6,hair)
        r(px,   py+2, 3,  8,hair); r(px+SPW-3,py+2,3,8,hair)
        if(style==='long') r(px+1,py+8,SPW-2,10,hair)
        if(style==='pony'){ r(px+SPW-3,py+8,5,14,hair); r(px+SPW-4,py+18,3,5,'#d08888') }
      } else if(dir==='d'){ // front of head
        if(style==='side'){   r(px+1,py-2,SPW-2,6,hair); r(px,py+2,4,10,hair); r(px+SPW-4,py+2,4,10,hair) }
        else if(style==='bob'){ r(px+1,py-2,SPW-2,8,hair); r(px,py+6,4,12,hair); r(px+SPW-4,py+6,4,12,hair) }
        else if(style==='long'){ r(px+1,py-2,SPW-2,8,hair); r(px,py+6,3,20,hair); r(px+SPW-3,py+6,3,20,hair) }
        else if(style==='pony'){ r(px+1,py-2,SPW-2,7,hair); r(px+SPW-3,py+5,5,8,hair); r(px+SPW-2,py+10,7,16,hair) }
        else if(style==='messy'){ r(px,py-4,SPW,10,hair); r(px-2,py-4,6,7,hair); r(px+SPW-4,py-4,7,6,hair) }
        else { r(px+1,py-2,SPW-2,6,hair); r(px+1,py+4,4,5,hair); r(px+SPW-5,py+4,4,5,hair) }
      } else { // side
        r(px+1,py-2,SPW-2,6,hair)
        r(dir==='l'?px+SPW-4:px, py+2, 4, 10, hair)
        if(style==='long'){ r(px+1,py+8,SPW-2,10,hair) }
      }
    }

    // Main sprite draw (RPG style)
    const drawSprite = (px:number,py:number,def:AgDef,dir:'u'|'d'|'l'|'r',frame:number,sitting:boolean) => {
      const lOff = sitting?0:[0,3,0,-3][frame%4]
      const rOff = sitting?0:[0,-3,0,3][frame%4]

      // Shadow
      ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(px+SPW/2,py+SPH-1,8,3,0,0,Math.PI*2); ctx.fill()

      if(dir==='u'){ // ── BACK VIEW (sitting at desk, walking up) ──
        // Shoes
        r(px+2,py+SPH-4+lOff,5,4,def.shoe); r(px+9,py+SPH-4+rOff,5,4,def.shoe)
        // Legs
        r(px+3,py+14+lOff,4,8,def.bot); r(px+9,py+14+rOff,4,8,def.bot)
        // Body back
        r(px+1,py+7,SPW-2,8,def.top)
        r(px+2,py+7,SPW-4,3,def.top+'cc') // collar
        // Arms
        r(px-1,py+8,3,8,def.top); r(px+SPW-2,py+8,3,8,def.top)
        r(px-1,py+14,4,4,def.skin); r(px+SPW-3,py+14,4,4,def.skin)
        // Head (back)
        r(px+2,py,SPW-4,8,def.skin)
        // Neck
        r(px+5,py+6,6,3,def.skin)
        // Hair back
        drawHair(px,py,def.hair,def.acc==='pony'?'pony':def.acc==='ear'?'long':'side','u')
        // Accessories visible from back
        if(def.acc==='tie') r(px+6,py+8,4,6,def.accent)
        if(def.acc==='head'){
          ctx.strokeStyle='#181818'; ctx.lineWidth=1.5
          ctx.beginPath(); ctx.arc(px+SPW/2,py+5,7,Math.PI,0); ctx.stroke()
        }

      } else if(dir==='d'){ // ── FRONT VIEW ──
        // Shoes
        r(px+2,py+SPH-4+lOff,5,4,def.shoe); r(px+9,py+SPH-4+rOff,5,4,def.shoe)
        // Legs
        r(px+3,py+14+lOff,4,8,def.bot); r(px+9,py+14+rOff,4,8,def.bot)
        // Body
        r(px+1,py+7,SPW-2,8,def.top); r(px+2,py+7,SPW-4,3,def.top+'ee')
        // Arms
        r(px-1,py+8,3,8,def.top); r(px+SPW-2,py+8,3,8,def.top)
        r(px-1,py+14,4,4,def.skin); r(px+SPW-3,py+14,4,4,def.skin)
        // Head
        r(px+2,py,SPW-4,9,def.skin)
        // Face
        r(px+4,py+3,3,3,'#18102a'); r(px+9,py+3,3,3,'#18102a')
        r(px+5,py+4,1,1,'#fff'); r(px+10,py+4,1,1,'#fff')
        r(px+5,py+7,6,2,'#c05870')
        // Blush (female)
        if(def.acc==='ear'||def.acc==='none'&&def.hair.includes('a8')){
          ctx.globalAlpha=0.25; ctx.fillStyle='#ff8888'; ctx.fillRect(px+2,py+5,3,2); ctx.fillRect(px+11,py+5,3,2); ctx.globalAlpha=1
        }
        // Hair front
        drawHair(px,py,def.hair,def.acc,dir)
        // Accessories
        if(def.acc==='glass'){
          ctx.strokeStyle='#282848'; ctx.lineWidth=1.2
          ctx.strokeRect(px+3,py+2,5,5); ctx.strokeRect(px+8,py+2,5,5)
          ctx.beginPath(); ctx.moveTo(px+8,py+4); ctx.lineTo(px+8,py+4); ctx.stroke()
        }
        if(def.acc==='tie'){ r(px+6,py+8,4,8,def.accent) }
        if(def.acc==='ear'){ r(px,py+3,2,4,'#f8d020'); r(px+SPW-2,py+3,2,4,'#f8d020') }
        if(def.acc==='head'){
          ctx.strokeStyle='#181818'; ctx.lineWidth=1.5
          ctx.beginPath(); ctx.arc(px+SPW/2,py+4,7,Math.PI,0); ctx.stroke()
        }

      } else { // ── SIDE VIEW ──
        const fx = dir==='l'?1:0
        // Shoes
        r(px+2,py+SPH-4+lOff,5,4,def.shoe); r(px+9,py+SPH-4+rOff,5,4,def.shoe)
        // Legs
        r(px+3,py+14+lOff,4,8,def.bot); r(px+9,py+14+rOff,4,8,def.bot)
        // Body
        r(px+1,py+7,SPW-2,8,def.top); r(px+1,py+7,SPW-2,3,def.top+'ee')
        // Arms
        r(dir==='l'?px-1:px+SPW-2,py+8,3,10,def.top)
        r(dir==='l'?px-1:px+SPW-2,py+16,4,4,def.skin)
        // Head
        r(px+2,py,SPW-4,9,def.skin)
        // Eye (one side)
        const ex = dir==='l'?px+3:px+8
        r(ex,py+3,3,3,'#18102a'); r(ex+1,py+4,1,1,'#fff')
        r(px+5,py+7,6,2,'#c05870')
        // Hair side
        drawHair(px,py,def.hair,def.acc,dir)
      }
    }

    // Name label
    const drawLabel = (px:number,py:number,name:string,active:boolean,accent:string) => {
      ctx.font='bold 11px "Jua",monospace'
      const tw=ctx.measureText(name).width+14
      const lx=px+SPW/2-tw/2, ly=py-22
      // Shadow/outline
      ctx.fillStyle='#000'; ctx.strokeStyle='#000'; ctx.lineWidth=4
      ctx.beginPath(); ctx.roundRect(lx,ly,tw,15,3); ctx.fill(); ctx.stroke()
      // BG
      ctx.fillStyle=active?accent:'rgba(12,8,30,0.96)'
      ctx.strokeStyle=active?'rgba(255,255,255,0.9)':'rgba(160,140,220,0.6)'
      ctx.lineWidth=1.5
      ctx.beginPath(); ctx.roundRect(lx,ly,tw,15,3); ctx.fill(); ctx.stroke()
      ctx.fillStyle='#fff'; ctx.textAlign='center'
      ctx.fillText(name,px+SPW/2,ly+11); ctx.textAlign='left'
    }

    // Speech bubble
    const drawBubble = (px:number,py:number,text:string,accent:string) => {
      const bob=Math.sin(tick.current*3)*1.5
      ctx.font='9px "Jua",monospace'
      const tw=ctx.measureText(text).width+12
      const bx=px+SPW/2-tw/2, by=py+bob-40
      ctx.fillStyle='rgba(255,255,255,0.97)'; ctx.strokeStyle=accent; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.roundRect(bx,by,tw,16,4); ctx.fill(); ctx.stroke()
      ctx.fillStyle='rgba(255,255,255,0.97)'; ctx.beginPath()
      ctx.moveTo(px+SPW/2-4,by+16); ctx.lineTo(px+SPW/2+4,by+16); ctx.lineTo(px+SPW/2,by+23); ctx.fill()
      ctx.strokeStyle=accent; ctx.beginPath(); ctx.moveTo(px+SPW/2-4,by+16); ctx.lineTo(px+SPW/2,by+23); ctx.lineTo(px+SPW/2+4,by+16); ctx.stroke()
      ctx.fillStyle='#100828'; ctx.font='bold 9px "Jua",monospace'
      ctx.textAlign='center'; ctx.fillText(text,px+SPW/2,by+12); ctx.textAlign='left'
    }

    // ── Walkable tile check ──────────────────
    const canWalk = (wx:number,wy:number):boolean => {
      const tc=Math.floor((wx-2)/TS), tr=Math.floor((wy-2)/TS)
      if(tc<1||tc>15||tr<2||tr>14) return false
      const t=MAP[tr]?.[tc]
      return t===TL.F||t===TL.CP
    }

    const walkTarget = ():{tx:number,ty:number} => {
      for(let i=0;i<30;i++){
        const tc=1+Math.floor(Math.random()*14)
        const tr=2+Math.floor(Math.random()*12)
        if(MAP[tr]?.[tc]===TL.F||MAP[tr]?.[tc]===TL.CP)
          return {tx:tpx(tc)+TS/2, ty:tpy(tr)+TS/2}
      }
      return {tx:tpx(8)+TS/2, ty:tpy(8)+TS/2}
    }

    // ═══════════════════════════════════════
    //  MAIN GAME LOOP
    // ═══════════════════════════════════════
    const BUBBLES:Record<string,string> = {
      router:'업무 배분!',web:'코딩 중!',content:'작성 중!',research:'분석 중!',edu:'교육 자료!',ops:'서버 점검!'
    }

    let animId:number
    const loop = () => {
      tick.current += 0.04
      const t = tick.current
      const s = setRef.current
      // ✅ 매 프레임마다 최신 커스텀 팀 읽기
      const cts = loadData<CT[]>('nk_custom_teams', [])

      // Clear
      ctx.fillStyle='#0a0a16'; ctx.fillRect(0,0,cv.width,cv.height)

      // ── 1. RENDER TILES ────────────────────
      for(let tr=0;tr<ROWS;tr++){
        for(let tc=0;tc<COLS;tc++){
          const tile=MAP[tr]?.[tc]; if(!tile) continue
          const x=tpx(tc), y=tpy(tr)
          const renderer=TILE_RENDER[tile]
          if(renderer) renderer(x,y,tc,tr)
          else { // fallback floor
            r(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.fl2)
          }
        }
      }

      // ── 2. UPDATE + RENDER AGENTS ──────────
      // Update states
      agRef.current.forEach((ag,i) => {
        ag.timer -= 0.04
        if(ag.state==='sit'){
          if(ag.timer<=0){
            if(Math.random()<0.3){
              const tgt=walkTarget()
              ag.state='walk'; ag.tx=tgt.tx; ag.ty=tgt.ty
              ag.walksLeft=1+Math.floor(Math.random()*2)
              ag.timer=8+Math.random()*8; ag.dir='d'
            } else {
              ag.timer=15+Math.random()*25
            }
          }
        } else if(ag.state==='walk'){
          const dx=ag.tx-ag.x, dy=ag.ty-ag.y, dist=Math.sqrt(dx*dx+dy*dy)
          if(dist>2){
            const spd=1.2
            const nx=ag.x+dx/dist*spd, ny=ag.y+dy/dist*spd
            if(canWalk(nx,ny)){ag.x=nx;ag.y=ny} else {ag.state='return';ag.tx=ag.sx;ag.ty=ag.sy}
            ag.frame=Math.floor(t*5)%4
            // direction
            if(Math.abs(dx)>Math.abs(dy)) ag.dir=dx>0?'r':'l'
            else ag.dir=dy>0?'d':'u'
          } else {
            ag.walksLeft--
            if(ag.walksLeft<=0||ag.timer<=0){
              ag.state='return'; ag.tx=ag.sx; ag.ty=ag.sy
            } else {
              const tgt=walkTarget(); ag.tx=tgt.tx; ag.ty=tgt.ty
            }
          }
          ag.timer-=0.04
        } else { // return
          const dx=ag.tx-ag.x, dy=ag.ty-ag.y, dist=Math.sqrt(dx*dx+dy*dy)
          if(dist>3){
            const spd=1.3
            const nx=ag.x+dx/dist*spd, ny=ag.y+dy/dist*spd
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

      // Sort by Y for depth (back-to-front)
      const sorted=[...agRef.current].sort((a,b)=>a.y-b.y)

      sorted.forEach(ag => {
        const isAct=actRef.current===ag.def.id
        const nm=s.agentNames?.[ag.def.id]||ag.def.name
        const def={...ag.def,name:nm}
        const sitting=ag.state==='sit'
        const px=Math.round(ag.x-SPW/2), py=Math.round(ag.y-SPH)

        drawSprite(px,py,def,ag.dir,ag.frame,sitting)
        drawLabel(px,py,nm,isAct,def.accent)
        if(isAct) drawBubble(px,py,BUBBLES[def.id]||'작업 중!',def.accent)
      })

      // Custom teams (2열 최대 6팀)
      cts.slice(0,6).forEach((ct,i)=>{
        const col = i % 3
        const row = Math.floor(i / 3)
        const tc = 2 + col * 4
        const tr = 13 + row * 2
        const ax = tpx(tc)+TS/2, ay = tpy(tr)+TS
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
        drawSprite(px,py,customDef,'u',0,true)
        drawLabel(px,py,nm,actRef.current===ct.id,customDef.accent)
      })

      animId=requestAnimationFrame(loop)
    }
    animId=requestAnimationFrame(loop)
    return()=>cancelAnimationFrame(animId)
  },[])

  return(
    <canvas ref={cvRef} width={898} height={518}
      style={{imageRendering:'pixelated',display:'block',maxWidth:'100%',
        borderRadius:'10px',border:'1.5px solid #ccc0b0',
        boxShadow:'0 4px 28px rgba(8,4,16,0.4)'}}
    />
  )
}
