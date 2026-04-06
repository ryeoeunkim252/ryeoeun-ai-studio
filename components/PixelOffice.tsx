'use client'
import { useEffect, useRef } from 'react'
import type { AgentId } from '@/lib/agents'
import { loadData, DEFAULT_SETTINGS, type AppSettings } from '@/lib/store'

interface Props { activeAgentId?: AgentId | null }

// ══════════════════════════════════════════
//  기본 상수
// ══════════════════════════════════════════
const CW = 900, CH = 520
const TS = 36
const COLS = 25, ROWS = 14
const FONT = "'Pretendard', 'Noto Sans KR', sans-serif"
const CP = 3          // 캐릭터 1픽셀 = 3캔버스픽셀
const CW_ = 12*CP     // 캐릭터 총 너비 = 36
const CH_ = 20*CP     // 캐릭터 총 높이 = 60

// ══════════════════════════════════════════
//  컬러 팔레트
// ══════════════════════════════════════════
const C = {
  // 바닥
  fl:'#f0ebe0', flD:'#e4ddd0', flLine:'rgba(170,150,120,0.18)',
  // 벽
  wl:'#eae5f5', wlT:'#dad4ec', wlB:'#c8c0e0',
  // 책상 (월넛)
  dkTop:'#c89858', dkFace:'#9a7030', dkEdge:'#7a5020', dkLeg:'#5a3810',
  // 의자 (스카이블루)
  chBack:'#4a7090', chSeat:'#5a82a8', chFace:'#384f68', chLeg:'#283848',
  // 회의 테이블 (다크 마호가니)
  mtTop:'#6a3818', mtFace:'#4a2408', mtEdge:'#8a4c20', mtLeg:'#3a1808',
  // 책장
  shWood:'#b87830', shDark:'#7a4e18',
  // 식물
  ptClay:'#c05030', ptLight:'#d87050', ptSoil:'#3a1a08',
  lf1:'#38a030', lf2:'#2a8820', lf3:'#1a6810',
  // 라운지 소파 (딥 그린)
  sfGreen:'#3a6848', sfLight:'#4a8058', sfDark:'#284838', sfArm:'#1e3428',
  // 카펫
  cp:'#b8c8e0', cpD:'#a8b8d4', cpBorder:'#8898b8',
  // 화이트보드
  wbBd:'#404858', wbSurf:'#f6f6f2',
  // 액자
  frGold:'#c89040', frGold2:'#7a3898', frGold3:'#2858a8',
  // 유리 칸막이
  div:'rgba(180,190,220,0.35)', divBar:'#8890b8',
  // 모니터
  mnBd:'#1a1830', mnScr:'#080818',
  // TV 스크린
  tvBd:'#1e1c2c', tvScr:'#0e0c1c',
}

// ══════════════════════════════════════════
//  타일 타입
// ══════════════════════════════════════════
type TileT = 0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18
const TL = {
  EMPTY:0 as TileT, FLOOR:1 as TileT, WALL:2 as TileT, SHELF:3 as TileT,
  CLOCK:4 as TileT, DESK:5 as TileT, MONITOR:6 as TileT, CHAIR:7 as TileT,
  PLANT:8 as TileT, CARPET:9 as TileT, DIV:10 as TileT, WB:11 as TileT,
  MTABLE:12 as TileT, SOFA:13 as TileT, SOFA_ARM:14 as TileT,
  FRAME:15 as TileT, TV:16 as TileT, DARKWALL:17 as TileT, DOOR:18 as TileT,
}
const WALKABLE = new Set([TL.FLOOR, TL.CARPET, TL.DOOR])

// ══════════════════════════════════════════
//  에이전트 정의 (디자인팀 포함)
// ══════════════════════════════════════════
interface AgDef {
  id:string; name:string
  hair:string; skin:string; shirt:string; pants:string; shoes:string
  accent:string; seat:{tc:number;tr:number}
}
const BASE_AGENTS = [
  {id:'router',  name:'총괄실장', hair:'#18103a', skin:'#f4c890', shirt:'#1e3a6a', pants:'#0f1f38', shoes:'#08080e', accent:'#ff7070'},
  {id:'web',     name:'웹팀',    hair:'#0a90b0', skin:'#fde3a7', shirt:'#1a70c0', pants:'#112248', shoes:'#0e1826', accent:'#60bfff'},
  {id:'content', name:'콘텐츠팀', hair:'#b03878', skin:'#fad7a0', shirt:'#7830a8', pants:'#3a1048', shoes:'#1e0818', accent:'#ff70b8'},
  {id:'research',name:'연구팀',   hair:'#283818', skin:'#f0c896', shirt:'#207840', pants:'#0e3a18', shoes:'#081008', accent:'#60e880'},
  {id:'edu',     name:'교육팀',   hair:'#080808', skin:'#fde8d0', shirt:'#c04820', pants:'#481808', shoes:'#180808', accent:'#ffb060'},
  {id:'ops',     name:'운영팀',   hair:'#080808', skin:'#c07848', shirt:'#1e3848', pants:'#101820', shoes:'#060808', accent:'#60e0e0'},
  {id:'design',  name:'디자인팀', hair:'#e0c048', skin:'#f8d8b0', shirt:'#b82830', pants:'#280810', shoes:'#100808', accent:'#ff9060'},
]

// 좌석 (책상 위치)
const SEATS = [
  {tc:1,tr:2},{tc:5,tr:2},{tc:9,tr:2},{tc:13,tr:2},
  {tc:1,tr:8},{tc:5,tr:8},{tc:9,tr:8},{tc:13,tr:8},
  {tc:1,tr:11},{tc:5,tr:11},{tc:9,tr:11},
]

// 회의실 도착 목표 (바닥 타일 기준)
const MEET_ARRIVE = [
  {tc:19,tr:7},{tc:20,tr:7},{tc:21,tr:7},{tc:22,tr:7},
  {tc:19,tr:2},{tc:20,tr:2},{tc:21,tr:2},{tc:22,tr:2},
]

// ══════════════════════════════════════════
//  맵 생성 (문 포함, 걸어다닐 수 있는 경로)
// ══════════════════════════════════════════
function buildMap(agents: AgDef[]): TileT[][] {
  const m: TileT[][] = Array.from({length:ROWS}, ()=>Array(COLS).fill(TL.FLOOR) as TileT[])

  // 외벽
  for(let c=0;c<COLS;c++){ m[0][c]=TL.WALL; m[ROWS-1][c]=TL.WALL }
  for(let r=0;r<ROWS;r++){ m[r][0]=TL.WALL; m[r][COLS-1]=TL.WALL }

  // 칸막이 (문 포함: row 6,7)
  for(let r=1;r<ROWS-1;r++){
    if(r===6||r===7) m[r][17]=TL.DOOR  // 문
    else m[r][17]=TL.DIV
  }

  // 왼쪽 책장
  for(let c=1;c<17;c++) m[1][c]=TL.SHELF
  // 시계
  m[0][8]=TL.CLOCK

  // 카펫 (복도)
  for(let c=1;c<17;c++){ m[5][c]=TL.CARPET; m[10][c]=TL.CARPET }

  // 팀 책상 자동 배치
  agents.forEach((ag,i)=>{
    const s=SEATS[i]; if(!s||s.tr>=ROWS-2) return
    m[s.tr][s.tc]=TL.DESK
    if(s.tc+1<17) m[s.tr][s.tc+1]=TL.MONITOR
    if(s.tr+1<ROWS-2) m[s.tr+1][s.tc]=TL.CHAIR
    if(i%4===3 && s.tc+3<17) m[s.tr][s.tc+3]=TL.PLANT
  })

  // 화분 (벽 근처)
  m[ROWS-2][1]=TL.PLANT; m[ROWS-2][5]=TL.PLANT
  m[ROWS-2][9]=TL.PLANT; m[ROWS-2][13]=TL.PLANT

  // ─── 회의실 ───
  // 회의실 명판은 렌더 단계에서 텍스트로 표시
  // TV 스크린 (왼쪽 벽)
  m[1][18]=TL.TV; m[1][19]=TL.TV
  // 회의 테이블 (중앙)
  for(let c=19;c<=23;c++){ m[3][c]=TL.MTABLE; m[4][c]=TL.MTABLE; m[5][c]=TL.MTABLE }
  // 회의 의자 (테이블 주변 - 바닥에 붙여서)
  m[2][19]=TL.CHAIR; m[2][21]=TL.CHAIR; m[2][23]=TL.CHAIR
  m[6][19]=TL.CHAIR; m[6][21]=TL.CHAIR; m[6][23]=TL.CHAIR
  m[3][18]=TL.CHAIR; m[4][18]=TL.CHAIR; m[5][18]=TL.CHAIR
  m[3][24]=TL.CHAIR; m[4][24]=TL.CHAIR; m[5][24]=TL.CHAIR

  // ─── 라운지 (오른쪽 하단) ───
  m[9][18]=TL.SOFA_ARM; m[9][19]=TL.SOFA; m[9][20]=TL.SOFA
  m[9][21]=TL.SOFA; m[9][22]=TL.SOFA_ARM
  m[9][24]=TL.PLANT; m[ROWS-2][20]=TL.PLANT; m[ROWS-2][23]=TL.PLANT

  // 액자
  m[0][3]=TL.FRAME; m[0][10]=TL.FRAME; m[0][14]=TL.FRAME
  m[0][20]=TL.FRAME; m[0][23]=TL.FRAME

  return m
}

// ══════════════════════════════════════════
//  말풍선 텍스트
// ══════════════════════════════════════════
const WORK_SAY:Record<string,string[]> = {
  router:  ['전략 수립 중','업무 배분 중','보고서 검토','일정 조율 중'],
  web:     ['코딩 중...','버그 수정 중','UI 작업 중','API 연동 중'],
  content: ['글 작성 중','SNS 기획 중','카피 작성 중','콘텐츠 편집'],
  research:['데이터 분석','시장 조사 중','보고서 작성','트렌드 탐색'],
  edu:     ['강의 준비 중','교안 작성 중','자료 정리 중','커리큘럼 설계'],
  ops:     ['서버 점검 중','배포 준비 중','자동화 설정','모니터링 중'],
  design:  ['UI 디자인 중','Figma 작업','아이콘 제작','화면 설계 중'],
}
const MEET_SAY=['회의 중...','좋은 아이디어!','검토해볼게요','그렇군요!','진행합시다','동의합니다','재미있네요!']

// ══════════════════════════════════════════
//  에이전트 상태
// ══════════════════════════════════════════
type AgMode='sit'|'roam'|'ret'|'toMeet'|'inMeet'|'fromMeet'
interface AgState {
  def:AgDef; x:number; y:number; sx:number; sy:number
  tx:number; ty:number; mode:AgMode
  dir:'u'|'d'|'l'|'r'; walkFrame:number
  timer:number; walksLeft:number
  bubble:string; bubbleTimer:number
  meetIdx:number; atMeet:boolean
}

// ══════════════════════════════════════════
//  컴포넌트
// ══════════════════════════════════════════
export default function PixelOffice({activeAgentId}:Props) {
  const cvRef = useRef<HTMLCanvasElement>(null)
  const T     = useRef(0)
  const actRef= useRef<AgentId|null|undefined>(null)
  const setRef= useRef<AppSettings>(DEFAULT_SETTINGS)
  const agRef = useRef<AgState[]>([])
  const mapRef= useRef<TileT[][]>([])
  const meetR = useRef({active:false, cd:500+Math.random()*300})

  useEffect(()=>{ actRef.current=activeAgentId },[activeAgentId])

  useEffect(()=>{
    const s=loadData<AppSettings>('nk_settings',DEFAULT_SETTINGS)
    const cts=loadData<{id:string;icon:string;name:string}[]>('nk_custom_teams',[])
    setRef.current=s
    const customPalettes=[
      {hair:'#c0c0c8',skin:'#f4c080',shirt:'#4040a8',pants:'#202060',shoes:'#080810',accent:'#8888ff'},
      {hair:'#481808',skin:'#fde3a7',shirt:'#902018',pants:'#400808',shoes:'#180808',accent:'#ff7060'},
      {hair:'#104838',skin:'#f0c896',shirt:'#208848',pants:'#083018',shoes:'#081008',accent:'#50e880'},
      {hair:'#503010',skin:'#f8d090',shirt:'#806020',pants:'#402808',shoes:'#181008',accent:'#ffc060'},
    ]
    const allDefs:AgDef[]=[
      ...BASE_AGENTS.map((d,i)=>({...d,seat:SEATS[i]||SEATS[0]})),
      ...cts.slice(0,4).map((ct,i)=>({
        id:ct.id, name:ct.name, seat:SEATS[BASE_AGENTS.length+i]||SEATS[BASE_AGENTS.length-1],
        ...customPalettes[i%customPalettes.length],
      })),
    ]
    mapRef.current=buildMap(allDefs)
    const tpx=(tc:number)=>2+tc*TS+TS/2
    const tpy=(tr:number)=>2+(tr+1)*TS
    agRef.current=allDefs.map((def,i)=>{
      const seat=SEATS[i]||SEATS[0]
      const sx=tpx(seat.tc), sy=tpy(seat.tr+1)+4
      const pool=WORK_SAY[def.id]||WORK_SAY.ops
      return {
        def, x:sx, y:sy, sx, sy, tx:sx, ty:sy,
        mode:'sit' as AgMode, dir:'d',
        walkFrame:0, timer:40+i*15+Math.random()*80,
        walksLeft:0,
        bubble:pool[Math.floor(Math.random()*pool.length)],
        bubbleTimer:80+Math.random()*80,
        meetIdx:i%MEET_ARRIVE.length, atMeet:false,
      }
    })
  },[])

  useEffect(()=>{
    const cv=cvRef.current; if(!cv) return
    const ctx=cv.getContext('2d')!

    // ── 헬퍼 ──
    const fr=(x:number,y:number,w:number,h:number,c:string)=>{
      if(w<=0||h<=0) return
      ctx.fillStyle=c; ctx.fillRect(~~x,~~y,Math.max(1,~~w),Math.max(1,~~h))
    }
    const tp=(tc:number)=>2+tc*TS
    const tp2=(tr:number)=>2+tr*TS

    const canWalk=(wx:number,wy:number)=>{
      const tc=Math.floor((wx-2)/TS), tr=Math.floor((wy-2)/TS)
      if(tc<0||tc>=COLS||tr<0||tr>=ROWS) return false
      return WALKABLE.has(mapRef.current[tr]?.[tc])
    }

    const shade=(hex:string,amt:number)=>{
      const n=parseInt(hex.replace('#',''),16)
      const r=Math.max(0,Math.min(255,(n>>16)+amt))
      const g=Math.max(0,Math.min(255,((n>>8)&0xff)+amt))
      const b=Math.max(0,Math.min(255,(n&0xff)+amt))
      return`#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
    }

    const randFloor=(rightSide=false):{tx:number,ty:number}=>{
      for(let i=0;i<60;i++){
        const tc=rightSide?18+Math.floor(Math.random()*6):1+Math.floor(Math.random()*15)
        const tr=2+Math.floor(Math.random()*(ROWS-4))
        if(WALKABLE.has(mapRef.current[tr]?.[tc]))
          return{tx:tp(tc)+TS/2, ty:tp2(tr)+TS/2}
      }
      return{tx:tp(5)+TS/2, ty:tp2(6)+TS/2}
    }

    // ══════════════════════════════════════
    //  타일 렌더러 (3/4 시점 실사 가구)
    // ══════════════════════════════════════
    const drawTile=(tile:TileT, x:number, y:number, tc:number, tr:number)=>{
      const t=T.current
      const TOP=TS*0.58|0   // 상단면 높이
      const FACE=TS-TOP      // 전면 높이

      switch(tile){
        case TL.FLOOR:{
          fr(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.flD)
          ctx.strokeStyle=C.flLine; ctx.lineWidth=0.5; ctx.strokeRect(x,y,TS,TS)
          ctx.strokeStyle='rgba(180,160,130,0.06)'; ctx.lineWidth=0.4
          for(let i=5;i<TS;i+=11){
            ctx.beginPath(); ctx.moveTo(x+i,y+1); ctx.lineTo(x+i+2,y+TS-1); ctx.stroke()
          }
          break
        }
        case TL.CARPET:{
          fr(x,y,TS,TS,C.cp)
          // 카펫 패턴
          for(let i=0;i<3;i++) for(let j=0;j<3;j++)
            fr(x+5+i*10,y+5+j*10,5,5,'rgba(100,130,200,0.2)')
          fr(x,y,TS,2,C.cpBorder); fr(x,y+TS-2,TS,2,C.cpBorder)
          fr(x,y,2,TS,C.cpBorder); fr(x+TS-2,y,2,TS,C.cpBorder)
          break
        }
        case TL.WALL:{
          fr(x,y,TS,TS,C.wl)
          fr(x,y,TS,3,C.wlT)
          fr(x,y+TS-2,TS,2,C.wlB)
          ctx.strokeStyle='rgba(160,150,200,0.08)'; ctx.lineWidth=0.5; ctx.strokeRect(x,y,TS,TS)
          break
        }
        case TL.DARKWALL:{
          fr(x,y,TS,TS,'#383050')
          break
        }
        case TL.DIV:{
          // 유리 칸막이 - 살짝 투명 청록
          fr(x,y,TS,TS,C.div)
          fr(x+TS/2-2,y,4,TS,C.divBar)
          fr(x+TS/2-1,y,2,TS,'rgba(255,255,255,0.3)')
          break
        }
        case TL.DOOR:{
          // 문 = 바닥으로 처리 (그냥 바닥 타일)
          fr(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.flD)
          ctx.strokeStyle='rgba(140,150,200,0.3)'; ctx.lineWidth=1
          ctx.setLineDash([3,3]); ctx.strokeRect(x,y,TS,TS); ctx.setLineDash([])
          break
        }
        case TL.SHELF:{
          // 책장 (벽에 붙은 상단 선반)
          fr(x,y,TS,TS,C.wl)
          // 선반 전면 - 3/4 시점
          fr(x,y+4,TS,TOP-4,C.shWood)
          fr(x,y+TOP,TS,FACE,C.shDark)
          fr(x,y+4,TS,2,shade(C.shWood,20))
          // 책들
          const bk=['#d84040','#3880e8','#3aaa3a','#e8a020','#9828e8','#f05880']
          let bx=x+2
          for(let b=0;b<4;b++){
            const bh=10+((tc*4+b*6+tr)%7), bw=7
            const bc=bk[(tc+tr+b)%bk.length]
            fr(bx,y+6,bw,bh,bc)
            fr(bx,y+6,1,bh,shade(bc,35))
            fr(bx+bw-1,y+6,1,bh,shade(bc,-25))
            // 책 제목 선
            fr(bx+2,y+8,bw-4,2,shade(bc,50))
            bx+=bw+1
          }
          break
        }
        case TL.CLOCK:{
          fr(x,y,TS,TS,C.wl)
          // 시계 틀
          fr(x+3,y+3,TS-6,TS-6,'#282038')
          ctx.fillStyle='#f5f0e8'
          ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,13,0,Math.PI*2); ctx.fill()
          ctx.strokeStyle='#9888a8'; ctx.lineWidth=1.5
          ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,13,0,Math.PI*2); ctx.stroke()
          // 눈금
          for(let i=0;i<12;i++){
            const a=i*Math.PI/6
            ctx.strokeStyle='#8878a0'; ctx.lineWidth=i%3===0?2:1
            ctx.beginPath()
            ctx.moveTo(x+TS/2+Math.cos(a)*11,y+TS/2+Math.sin(a)*11)
            ctx.lineTo(x+TS/2+Math.cos(a)*13,y+TS/2+Math.sin(a)*13)
            ctx.stroke()
          }
          const ha=t*0.005-Math.PI/2
          ctx.strokeStyle='#181030'; ctx.lineWidth=2; ctx.lineCap='round'
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+TS/2)
          ctx.lineTo(x+TS/2+Math.cos(ha)*7,y+TS/2+Math.sin(ha)*7); ctx.stroke()
          const ma=t*0.06-Math.PI/2
          ctx.strokeStyle='#281840'; ctx.lineWidth=1.5
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+TS/2)
          ctx.lineTo(x+TS/2+Math.cos(ma)*10,y+TS/2+Math.sin(ma)*10); ctx.stroke()
          ctx.strokeStyle='#e03030'; ctx.lineWidth=1
          const sa=t*0.8-Math.PI/2
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+TS/2)
          ctx.lineTo(x+TS/2+Math.cos(sa)*11,y+TS/2+Math.sin(sa)*11); ctx.stroke()
          ctx.fillStyle='#e03030'; ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,1.5,0,Math.PI*2); ctx.fill()
          break
        }
        case TL.DESK:{
          // 책상 - 3/4 시점 (상판 + 전면 + 오른쪽 측면)
          // 바닥 먼저
          fr(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.flD)
          // 다리 (측면에서 살짝 보임)
          fr(x+3,y+TOP+2,4,FACE-2,C.dkLeg)
          fr(x+TS-7,y+TOP+2,4,FACE-2,C.dkLeg)
          // 전면 판
          fr(x+1,y+TOP,TS-2,FACE,C.dkFace)
          fr(x+1,y+TOP,TS-2,2,shade(C.dkFace,20))
          fr(x+TS-3,y+TOP,3,FACE,shade(C.dkFace,-20))
          // 상판 (나무 질감)
          fr(x,y,TS,TOP,C.dkTop)
          fr(x,y,TS,2,shade(C.dkTop,25))
          fr(x,y,2,TOP,shade(C.dkTop,15))
          fr(x+TS-3,y,3,TOP,C.dkEdge)
          // 나무 결
          ctx.strokeStyle='rgba(140,90,10,0.08)'; ctx.lineWidth=0.5
          for(let i=4;i<TS;i+=8){
            ctx.beginPath(); ctx.moveTo(x+i,y+2); ctx.lineTo(x+i+1,y+TOP-2); ctx.stroke()
          }
          // 서류/소품
          fr(x+3,y+5,9,7,'#ede8dc')
          fr(x+3,y+5,9,1,'#d8d0c0')
          fr(x+3,y+5,1,7,'rgba(0,0,0,0.05)')
          fr(x+14,y+6,5,5,'#3870b8')
          break
        }
        case TL.MONITOR:{
          // 모니터 - 3/4 시점
          fr(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.flD)
          // 스탠드
          fr(x+TS/2-2,y+TOP-2,4,4,C.mnBd)
          fr(x+TS/2-5,y+TOP+2,10,2,C.mnBd)
          // 모니터 본체 (상판 위에 세워져 있는 모습)
          const mh=TOP-6, mw=TS-6
          fr(x+3,y+3,mw,mh,C.mnBd)
          fr(x+4,y+4,mw-2,mh-2,C.mnScr)
          // 화면 빛 (glow)
          ctx.globalAlpha=0.07+Math.sin(t*0.4)*0.03
          ctx.fillStyle='#3080e0'; ctx.fillRect(x+4,y+4,mw-2,mh-2)
          ctx.globalAlpha=1
          // 코드 라인
          const lc=['#30c878','#60b0f0','#f0d060','#f08060','#a060f0']
          for(let ln=0;ln<4;ln++){
            const lw=3+((tc*5+ln*7+~~t)%9)
            fr(x+5,y+6+ln*4,lw,2,lc[(ln+~~(t*0.18))%lc.length])
          }
          break
        }
        case TL.CHAIR:{
          // 의자 - 3/4 시점 (등받이 + 쿠션 + 다리)
          fr(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.flD)
          const cc=['#4a7090','#3a6858','#685040','#406050','#544870'][(tr+tc)%5]
          const ccD=shade(cc,-30), ccL=shade(cc,25)
          // 다리 먼저 (뒤에 있음)
          fr(x+5,y+TS-12,4,12,C.chLeg)
          fr(x+TS-9,y+TS-12,4,12,C.chLeg)
          // 좌판 (3D 박스)
          fr(x+3,y+TS*0.45|0,TS-6,TS*0.22|0,cc)    // 좌판 상면
          fr(x+3,y+(TS*0.67)|0,TS-6,TS*0.1|0,ccD)  // 좌판 전면
          fr(x+TS-5,y+TS*0.45|0,2,TS*0.22|0,shade(cc,-15)) // 우측면
          fr(x+3,y+(TS*0.45)|0,TS-6,2,ccL)          // 상단 하이라이트
          // 등받이 (위쪽)
          fr(x+4,y+2,TS-8,TS*0.43|0,cc)
          fr(x+4,y+2,TS-8,2,ccL)
          fr(x+TS-6,y+2,2,TS*0.43|0,ccD)
          // 쿠션 스티치
          ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=0.8
          ctx.strokeRect(x+5,y+4,TS-10,TS*0.38|0)
          break
        }
        case TL.PLANT:{
          // 화분 + 식물 - 실사 (3/4 시점)
          fr(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.flD)
          // 그림자
          ctx.fillStyle='rgba(0,0,0,0.1)'
          ctx.beginPath(); ctx.ellipse(x+TS/2,y+TS-2,12,4,0,0,Math.PI*2); ctx.fill()
          // 화분 (테라코타 도기)
          // 화분 상단 테두리
          fr(x+7,y+18,18,2,shade(C.ptClay,10))
          // 화분 몸통
          fr(x+8,y+20,16,10,C.ptClay)
          fr(x+8,y+20,2,10,shade(C.ptClay,20))
          fr(x+22,y+20,2,10,shade(C.ptClay,-20))
          // 화분 전면 그라데이션
          fr(x+9,y+21,6,8,shade(C.ptClay,15))
          // 화분 하단
          fr(x+7,y+29,18,2,shade(C.ptClay,-25))
          // 흙
          fr(x+9,y+20,14,3,C.ptSoil)
          // 줄기들
          fr(x+TS/2-1,y+8,2,12,'#2a5e10')
          fr(x+TS/2,y+8,1,12,'#38781a')
          // 왼쪽 줄기
          ctx.strokeStyle='#2a6010'; ctx.lineWidth=2; ctx.lineCap='round'
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+15); ctx.quadraticCurveTo(x+5,y+10,x+4,y+6); ctx.stroke()
          // 오른쪽 줄기
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+13); ctx.quadraticCurveTo(x+TS-5,y+8,x+TS-4,y+4); ctx.stroke()
          // 잎사귀 (자연스러운 타원)
          const drawLeaf=(lx:number,ly:number,rx:number,ry:number,angle:number,lc:string)=>{
            ctx.fillStyle=lc; ctx.beginPath()
            ctx.ellipse(lx,ly,rx,ry,angle,0,Math.PI*2); ctx.fill()
            ctx.strokeStyle=shade(lc,-20); ctx.lineWidth=0.5
            ctx.beginPath(); ctx.ellipse(lx,ly,rx,ry,angle,0,Math.PI*2); ctx.stroke()
          }
          drawLeaf(x+4,y+7,8,4,Math.PI*0.25,C.lf3)
          drawLeaf(x+5,y+6,7,3,Math.PI*0.2,C.lf2)
          drawLeaf(x+5,y+5,5,2.5,Math.PI*0.18,C.lf1)
          drawLeaf(x+TS-4,y+5,8,4,-Math.PI*0.25,C.lf3)
          drawLeaf(x+TS-5,y+4,7,3,-Math.PI*0.2,C.lf2)
          drawLeaf(x+TS-5,y+3,5,2.5,-Math.PI*0.18,C.lf1)
          drawLeaf(x+TS/2,y+5,5,9,0,C.lf3)
          drawLeaf(x+TS/2,y+4,4,8,0,C.lf2)
          drawLeaf(x+TS/2,y+3,3,7,0,C.lf1)
          // 잎맥
          ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=0.7
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+10); ctx.lineTo(x+TS/2,y+2); ctx.stroke()
          break
        }
        case TL.WB:{
          // 화이트보드
          fr(x,y,TS,TS,C.wl)
          fr(x+1,y+2,TS-2,TS-4,C.wbBd)
          fr(x+2,y+3,TS-4,TS-7,C.wbSurf)
          const mc=['#d83030','#2860c8','#208038','#8830a0']
          for(let i=0;i<3;i++){
            const lw=3+((tc+i*5)%9)
            fr(x+4,y+5+i*6,lw,2,mc[(i+tc)%mc.length])
          }
          fr(x+4,y+TS-10,8,2,'#e03030')
          fr(x,y,TS,2,C.wbBd); fr(x,y+TS-2,TS,2,C.wbBd)
          fr(x,y,2,TS,C.wbBd); fr(x+TS-2,y,2,TS,C.wbBd)
          break
        }
        case TL.MTABLE:{
          // 회의 테이블 - 3/4 시점 고급 마호가니
          const isTop = tr===3, isBot = tr===5
          fr(x,y,TS,TS,C.fl)
          // 다리 (맨 아래 타일에서만)
          if(isBot){
            fr(x+4,y+TOP+2,5,FACE,C.mtLeg)
            fr(x+TS-9,y+TOP+2,5,FACE,C.mtLeg)
          }
          // 전면 판 (맨 아래 타일에서만)
          if(isBot){
            fr(x,y+TOP,TS,FACE,C.mtFace)
            fr(x,y+TOP,TS,2,shade(C.mtFace,20))
            fr(x+TS-3,y+TOP,3,FACE,shade(C.mtFace,-20))
          }
          // 상판 (항상)
          fr(x,y,TS,isBot?TOP:TS,C.mtTop)
          fr(x,y,TS,2,C.mtEdge)
          fr(x,y,2,isBot?TOP:TS,shade(C.mtTop,20))
          fr(x+TS-3,y,3,isBot?TOP:TS,shade(C.mtTop,-20))
          // 나무 결
          ctx.strokeStyle='rgba(80,30,0,0.1)'; ctx.lineWidth=0.6
          const endY=isBot?y+TOP:y+TS
          for(let i=4;i<TS;i+=9){
            ctx.beginPath(); ctx.moveTo(x+i,y+2); ctx.lineTo(x+i+1,endY-2); ctx.stroke()
          }
          // 테이블 위 소품 (맨 위 타일)
          if(isTop){
            ctx.fillStyle='rgba(255,255,255,0.5)'
            ctx.beginPath(); ctx.arc(x+TS/2,y+TOP/2,4,0,Math.PI*2); ctx.fill()
          }
          break
        }
        case TL.SOFA:{
          // 소파 - 딥 그린 (3/4 시점)
          fr(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.flD)
          // 다리
          fr(x+5,y+TS-6,4,5,shade(C.sfDark,-10))
          fr(x+TS-9,y+TS-6,4,5,shade(C.sfDark,-10))
          // 좌판 전면
          fr(x+1,y+TOP,TS-2,FACE,C.sfDark)
          fr(x+1,y+TOP,TS-2,2,shade(C.sfDark,20))
          // 좌판 상면
          fr(x+1,y+TOP-TS*0.2|0,TS-2,TS*0.2|0,C.sfGreen)
          fr(x+1,y+TOP-(TS*0.2|0),TS-2,2,C.sfLight)
          // 등받이
          fr(x+2,y+2,TS-4,TOP-(TS*0.2|0)-2,C.sfGreen)
          fr(x+2,y+2,TS-4,2,C.sfLight)
          fr(x+TS-4,y+2,2,TOP-(TS*0.2|0)-2,C.sfDark)
          // 쿠션 분리선
          ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+3); ctx.lineTo(x+TS/2,y+(TOP-(TS*0.2|0))-2); ctx.stroke()
          break
        }
        case TL.SOFA_ARM:{
          fr(x,y,TS,TS,(tc+tr)%2===0?C.fl:C.flD)
          fr(x+2,y+TOP,TS-4,FACE,C.sfArm)
          fr(x+2,y+TOP,TS-4,2,shade(C.sfArm,20))
          fr(x+2,y+2,TS-4,TS-FACE-4,C.sfArm)
          fr(x+2,y+2,TS-4,2,shade(C.sfArm,15))
          break
        }
        case TL.TV:{
          // TV 스크린 (회의실 벽)
          fr(x,y,TS,TS,C.wl)
          fr(x+1,y+2,TS-2,TS-4,C.tvBd)
          fr(x+2,y+3,TS-4,TS-7,C.tvScr)
          // 화면 내용 (프레젠테이션)
          const gA=0.1+Math.sin(t*0.3)*0.05
          ctx.globalAlpha=gA
          ctx.fillStyle='#4080ff'; ctx.fillRect(x+3,y+4,TS-6,TS-11)
          ctx.globalAlpha=1
          fr(x+4,y+5,TS-8,3,'rgba(255,255,255,0.7)')
          fr(x+4,y+10,8,2,'rgba(200,220,255,0.5)')
          fr(x+4,y+14,12,2,'rgba(200,220,255,0.5)')
          fr(x+4,y+18,6,2,'rgba(200,220,255,0.5)')
          // 테두리
          ctx.strokeStyle=shade(C.tvBd,-20); ctx.lineWidth=1
          ctx.strokeRect(x+1,y+2,TS-2,TS-4)
          break
        }
        case TL.FRAME:{
          // 액자 - 실사
          fr(x,y,TS,TS,C.wl)
          const fcs=[C.frGold, C.frGold2, C.frGold3][(tc+tr)%3]
          fr(x+2,y+2,TS-4,TS-4,fcs)
          fr(x+4,y+4,TS-8,TS-8,'#e8e0d8')
          if(tc%3===0){
            fr(x+4,y+4,TS-8,TS-8,'#b8d0e8')
            ctx.fillStyle='#4878a8'
            ctx.beginPath(); ctx.moveTo(x+6,y+TS-8); ctx.lineTo(x+TS/2,y+8); ctx.lineTo(x+TS-6,y+TS-8); ctx.fill()
            ctx.fillStyle='#e8f0f8'
            ctx.beginPath(); ctx.moveTo(x+TS/2,y+8); ctx.lineTo(x+TS/2-3,y+14); ctx.lineTo(x+TS/2+3,y+14); ctx.fill()
            fr(x+5,y+TS-10,TS-10,4,'#60a060')
          } else if(tc%3===1){
            fr(x+4,y+4,TS-8,TS-8,'#f0f0f8')
            ctx.fillStyle='#f0c040'
            ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,5,0,Math.PI*2); ctx.fill()
            const pc='#e84060'
            for(let i=0;i<6;i++){
              const pa=i*Math.PI/3
              ctx.fillStyle=pc
              ctx.beginPath(); ctx.ellipse(x+TS/2+Math.cos(pa)*7,y+TS/2+Math.sin(pa)*7,3,2,pa,0,Math.PI*2); ctx.fill()
            }
          } else {
            fr(x+4,y+4,TS-8,TS-8,'#e8f0e0')
            const ac=['#e84040','#3070d8','#30a830']
            ac.forEach((c,i)=>fr(x+5+i*6,y+5,5,TS-10,c))
          }
          ctx.strokeStyle=shade(fcs,-30); ctx.lineWidth=1.5; ctx.strokeRect(x+2,y+2,TS-4,TS-4)
          break
        }
      }
    }

    // ══════════════════════════════════════
    //  캐릭터 - 귀여운 아바타 스타일 얼굴
    // ══════════════════════════════════════
    const drawChar=(ox:number,oy:number,def:AgDef,dir:'u'|'d'|'l'|'r',wf:number,sitting:boolean,isAct:boolean)=>{
      const {skin,hair,shirt,pants,shoes}=def
      const skinD=shade(skin,-25)
      const shirtD=shade(shirt,-20)
      const pantsD=shade(pants,-15)

      // 픽셀 블록 헬퍼
      const g=(col:number,row:number,c:string,pw=CP,ph=CP)=>
        fr(ox+col*CP, oy+row*CP, pw, ph, c)

      // 다리 흔들기
      const swing=(!sitting&&wf>0)?Math.sin(wf*1.5)*CP:0

      // 그림자
      ctx.fillStyle='rgba(0,0,0,0.12)'
      ctx.beginPath(); ctx.ellipse(ox+CW_/2, oy+CH_+3, sitting?12:10, 4, 0, 0, Math.PI*2); ctx.fill()

      // ── 앞모습 (앉거나 앞을 볼 때) ────────
      if(dir==='d'||sitting){
        // 머리카락
        for(let c=2;c<10;c++) g(c,0,hair)
        for(let c=1;c<11;c++) g(c,1,hair)
        // 얼굴
        for(let r=2;r<8;r++){
          g(0,r,hair); for(let c=1;c<11;c++) g(c,r,skin); g(11,r,hair)
        }
        // 눈썹 (가는 선)
        fr(ox+3*CP,oy+2*CP+2,CP*2,2,shade(hair,10))
        fr(ox+7*CP,oy+2*CP+2,CP*2,2,shade(hair,10))
        // 눈 - 귀여운 동그란 눈 (크고 초롱초롱)
        ctx.fillStyle='#1a0838'
        ctx.beginPath(); ctx.arc(ox+4.5*CP, oy+4*CP, CP*1.1, 0, Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.arc(ox+7.5*CP, oy+4*CP, CP*1.1, 0, Math.PI*2); ctx.fill()
        // 눈 하이라이트 (귀여움 포인트)
        ctx.fillStyle='rgba(255,255,255,0.95)'
        ctx.beginPath(); ctx.arc(ox+4.5*CP-1.5, oy+4*CP-1.5, 1.5, 0, Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.arc(ox+7.5*CP-1.5, oy+4*CP-1.5, 1.5, 0, Math.PI*2); ctx.fill()
        // 눈 하이라이트 작은 점
        ctx.fillStyle='rgba(255,255,255,0.6)'
        ctx.beginPath(); ctx.arc(ox+4.5*CP+1, oy+4*CP+0.5, 0.7, 0, Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.arc(ox+7.5*CP+1, oy+4*CP+0.5, 0.7, 0, Math.PI*2); ctx.fill()
        // 코 (작고 귀엽게)
        ctx.fillStyle=skinD
        ctx.beginPath(); ctx.arc(ox+6*CP, oy+5.5*CP, 1.5, 0, Math.PI*2); ctx.fill()
        // 입 - 귀여운 스마일
        ctx.strokeStyle='#c04868'; ctx.lineWidth=2; ctx.lineCap='round'
        ctx.beginPath(); ctx.arc(ox+6*CP, oy+6.8*CP, CP*1.5, 0.3, Math.PI-0.3); ctx.stroke()
        // 볼 홍조 (귀여움!)
        ctx.fillStyle='rgba(255,140,140,0.35)'
        ctx.beginPath(); ctx.ellipse(ox+2.5*CP, oy+5.5*CP, CP*1.2, CP*0.7, 0, 0, Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.ellipse(ox+9.5*CP, oy+5.5*CP, CP*1.2, CP*0.7, 0, 0, Math.PI*2); ctx.fill()
        // 목
        g(4,8,skin); g(5,8,skin); g(6,8,skin); g(7,8,skin)
        // 몸통
        for(let r=9;r<15;r++){ for(let c=2;c<10;c++) g(c,r,shirt); g(11,r,shirtD) }
        // 팔
        g(1,9,shirt); g(1,10,shirt); g(1,11,shirt); g(1,12,shirt)
        g(11,9,shirtD); g(11,10,shirtD); g(11,11,shirtD); g(11,12,shirtD)
        g(0,12,skin); g(11,13,skin)
        // 다리/신발
        if(!sitting){
          for(let r=15;r<19;r++){
            fr(ox+3*CP, oy+r*CP+swing, CP*2, CP, pants)
            fr(ox+7*CP, oy+r*CP-swing, CP*2, CP, pantsD)
          }
          fr(ox+2*CP, oy+19*CP+swing, CP*3, CP, shoes)
          fr(ox+7*CP, oy+19*CP-swing, CP*3, CP, shoes)
        } else {
          // 앉은 다리
          for(let c=3;c<5;c++) g(c,15,pants); for(let c=7;c<9;c++) g(c,15,pantsD)
          for(let c=3;c<5;c++) g(c,16,pants); for(let c=7;c<9;c++) g(c,16,pantsD)
          for(let c=3;c<5;c++) g(c,17,shoes); for(let c=7;c<9;c++) g(c,17,shoes)
        }

      // ── 뒷모습 ─────────────────────────
      } else if(dir==='u'){
        for(let c=2;c<10;c++) g(c,0,hair)
        for(let r=1;r<8;r++) for(let c=0;c<12;c++) g(c,r,r<3?hair:skin)
        for(let r=2;r<8;r++){ g(0,r,hair); g(11,r,hair) }
        g(4,8,skin); g(5,8,skin); g(6,8,skin); g(7,8,skin)
        for(let r=9;r<15;r++){ for(let c=2;c<10;c++) g(c,r,shirt); g(11,r,shirtD) }
        g(1,9,shirt); g(1,10,shirt); g(1,11,shirt); g(1,12,shirt)
        g(11,9,shirtD); g(11,10,shirtD); g(11,11,shirtD); g(11,12,shirtD)
        g(0,12,skin); g(11,13,skin)
        for(let r=15;r<19;r++){
          fr(ox+3*CP, oy+r*CP+swing, CP*2, CP, pants)
          fr(ox+7*CP, oy+r*CP-swing, CP*2, CP, pantsD)
        }
        fr(ox+2*CP, oy+19*CP+swing, CP*3, CP, shoes)
        fr(ox+7*CP, oy+19*CP-swing, CP*3, CP, shoes)

      // ── 옆모습 ─────────────────────────
      } else {
        const fl=dir==='l'
        const fx=(c:number)=>fl?c:11-c
        for(let c=1;c<10;c++) g(fx(c),0,hair)
        for(let r=1;r<8;r++){
          g(fx(0),r,hair); g(fx(11),r,hair)
          for(let c=1;c<11;c++) g(fx(c),r,r<3?hair:skin)
        }
        // 옆 귀여운 눈 (한쪽)
        const eX=fl?3:8
        ctx.fillStyle='#1a0838'
        ctx.beginPath(); ctx.arc(ox+eX*CP, oy+4*CP, CP*1.0, 0, Math.PI*2); ctx.fill()
        ctx.fillStyle='rgba(255,255,255,0.9)'
        ctx.beginPath(); ctx.arc(ox+eX*CP-1, oy+4*CP-1, 1.2, 0, Math.PI*2); ctx.fill()
        // 옆 코
        ctx.fillStyle=skinD
        ctx.beginPath(); ctx.arc(ox+(fl?1.5:9.5)*CP, oy+5.5*CP, 1.2, 0, Math.PI*2); ctx.fill()
        // 옆 입
        ctx.strokeStyle='#c04868'; ctx.lineWidth=1.5; ctx.lineCap='round'
        ctx.beginPath(); ctx.arc(ox+(fl?2.5:8.5)*CP, oy+6.8*CP, CP, 0.3, Math.PI-0.3); ctx.stroke()
        g(fl?4:7,8,skin); g(fl?5:6,8,skin)
        for(let r=9;r<15;r++){ for(let c=2;c<10;c++) g(c,r,shirt); g(11,r,shirtD) }
        const aX=fl?11:0
        g(aX,9,fl?shirtD:shirt); g(aX,10,fl?shirtD:shirt)
        g(aX,11,fl?shirtD:shirt); g(aX,12,skin)
        for(let r=15;r<19;r++){
          fr(ox+4*CP, oy+r*CP+swing, CP*2, CP, pants)
          fr(ox+6*CP, oy+r*CP-swing, CP*2, CP, pantsD)
        }
        fr(ox+3*CP, oy+19*CP+swing, CP*3, CP, shoes)
        fr(ox+6*CP, oy+19*CP-swing, CP*3, CP, shoes)
      }

      // 활성 글로우
      if(isAct){
        const g2=0.5+Math.sin(T.current*5)*0.35
        ctx.strokeStyle=def.accent; ctx.lineWidth=2; ctx.globalAlpha=g2
        ctx.strokeRect(ox-2,oy-2,CW_+4,CH_+4); ctx.globalAlpha=1
      }
    }

    // ── 이름표 ──
    const drawLabel=(ox:number,oy:number,name:string,active:boolean,accent:string)=>{
      ctx.font=`bold 11px ${FONT}`
      const tw=ctx.measureText(name).width+12
      const lx=ox+CW_/2-tw/2, ly=oy-20
      fr(lx+1,ly+1,tw,14,'rgba(0,0,0,0.65)')
      ctx.fillStyle=active?accent:'rgba(16,8,40,0.9)'
      ctx.fillRect(~~lx,~~ly,~~tw,14)
      ctx.strokeStyle=active?'rgba(255,255,255,0.7)':'rgba(180,160,240,0.35)'
      ctx.lineWidth=1; ctx.strokeRect(~~lx,~~ly,~~tw,14)
      ctx.fillStyle='#fff'; ctx.textAlign='center'
      ctx.fillText(name,ox+CW_/2,ly+10); ctx.textAlign='left'
    }

    // ── 말풍선 ──
    const drawBubble=(ox:number,oy:number,text:string,accent:string,meet=false)=>{
      const bob=Math.sin(T.current*2.5)*1.5
      ctx.font=`bold 10px ${FONT}`
      const tw=ctx.measureText(text).width+14
      const bx=ox+CW_/2-tw/2, by=oy-44+bob
      fr(bx+1,by+1,tw,16,'rgba(0,0,0,0.45)')
      ctx.fillStyle=meet?'#fffce8':'#ffffff'
      ctx.fillRect(~~bx,~~by,~~tw,16)
      ctx.strokeStyle=accent; ctx.lineWidth=1.5; ctx.strokeRect(~~bx,~~by,~~tw,16)
      // 꼬리
      fr(ox+CW_/2-3,by+16,6,3,meet?'#fffce8':'#fff')
      fr(ox+CW_/2-2,by+19,4,2,meet?'#fffce8':'#fff')
      fr(ox+CW_/2-1,by+21,2,2,meet?'#fffce8':'#fff')
      ctx.fillStyle=meet?'#604000':'#100820'
      ctx.textAlign='center'; ctx.fillText(text,ox+CW_/2,by+12); ctx.textAlign='left'
    }

    // ══════════════════════════════════════
    //  메인 루프
    // ══════════════════════════════════════
    let animId:number
    const loop=()=>{
      T.current+=0.04
      const s=setRef.current

      // ── 회의 이벤트 ──
      const mt=meetR.current
      mt.cd-=1
      if(mt.cd<=0 && !mt.active){
        mt.active=true
        mt.cd=350+Math.random()*250
        const shuffled=[...agRef.current].sort(()=>Math.random()-0.5)
        const cnt=2+Math.floor(Math.random()*3)
        shuffled.slice(0,cnt).forEach((ag,i)=>{
          const mp=MEET_ARRIVE[i%MEET_ARRIVE.length]
          ag.tx=2+mp.tc*TS+TS/2
          ag.ty=2+(mp.tr+1)*TS+4
          ag.mode='toMeet'
          ag.atMeet=false
          ag.bubble=MEET_SAY[Math.floor(Math.random()*MEET_SAY.length)]
        })
      } else if(mt.active && mt.cd<=0){
        mt.active=false
        mt.cd=380+Math.random()*320
        agRef.current.forEach(ag=>{
          if(ag.mode==='inMeet'||ag.mode==='toMeet'){
            ag.mode='fromMeet'; ag.tx=ag.sx; ag.ty=ag.sy; ag.atMeet=false
          }
        })
      }

      // ── 에이전트 AI ──
      agRef.current.forEach(ag=>{
        ag.bubbleTimer-=1
        if(ag.bubbleTimer<=0){
          const pool=ag.atMeet?MEET_SAY:(WORK_SAY[ag.def.id]||WORK_SAY.ops)
          ag.bubble=pool[Math.floor(Math.random()*pool.length)]
          ag.bubbleTimer=70+Math.random()*70
        }

        const moveTo=(tx:number,ty:number,spd=1.6)=>{
          const dx=tx-ag.x, dy=ty-ag.y, d=Math.hypot(dx,dy)
          if(d>4){
            const nx=ag.x+dx/d*spd, ny=ag.y+dy/d*spd
            if(canWalk(nx,ny)){ag.x=nx;ag.y=ny}
            else if(canWalk(ag.x+dx/d*spd,ag.y)) ag.x+=dx/d*spd
            else if(canWalk(ag.x,ag.y+dy/d*spd)) ag.y+=dy/d*spd
            ag.walkFrame=(ag.walkFrame+0.15)%4
            if(Math.abs(dx)>Math.abs(dy)) ag.dir=dx>0?'r':'l'
            else ag.dir=dy>0?'d':'u'
            return false
          }
          return true
        }

        ag.timer-=0.04
        switch(ag.mode){
          case 'sit':
            ag.dir='d'  // 항상 앞을 보고 앉음
            if(ag.timer<=0 && !mt.active){
              if(Math.random()<0.28){
                const tgt=randFloor(false)
                ag.tx=tgt.tx; ag.ty=tgt.ty; ag.mode='roam'
                ag.walksLeft=1+Math.floor(Math.random()*2); ag.timer=8+Math.random()*10
              } else ag.timer=25+Math.random()*55
            }
            break
          case 'roam':
            if(moveTo(ag.tx,ag.ty)){
              ag.walksLeft--
              if(ag.walksLeft<=0||ag.timer<=0){ ag.mode='ret'; ag.tx=ag.sx; ag.ty=ag.sy }
              else { const t2=randFloor(false); ag.tx=t2.tx; ag.ty=t2.ty }
            }
            break
          case 'ret': case 'fromMeet':
            if(moveTo(ag.tx,ag.ty,1.8)){
              ag.x=ag.sx; ag.y=ag.sy; ag.mode='sit'
              ag.dir='d'; ag.walkFrame=0; ag.timer=20+Math.random()*35
            }
            break
          case 'toMeet':
            if(moveTo(ag.tx,ag.ty,1.8)){
              ag.mode='inMeet'; ag.atMeet=true; ag.dir='d'
              ag.bubble=MEET_SAY[Math.floor(Math.random()*MEET_SAY.length)]
              ag.bubbleTimer=60+Math.random()*60
            }
            break
          case 'inMeet':
            ag.dir='d'
            break
        }
      })

      // ── 렌더 ──
      ctx.fillStyle='#f0ebe0'; ctx.fillRect(0,0,CW,CH)

      // 타일
      for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
        const tile=mapRef.current[r]?.[c]
        if(tile) drawTile(tile,2+c*TS,2+r*TS,c,r)
      }

      // ── 회의실 명판 ──
      const mrX=2+18*TS, mrY=2+0*TS
      const mrW=7*TS
      // 명판 배경
      fr(mrX,mrY-1,mrW,22,'rgba(30,24,60,0.88)')
      ctx.strokeStyle='rgba(160,140,240,0.5)'; ctx.lineWidth=1.5
      ctx.strokeRect(mrX,mrY-1,mrW,22)
      // 텍스트
      ctx.font=`bold 13px ${FONT}`; ctx.textAlign='center'
      ctx.fillStyle='rgba(255,255,255,0.9)'
      ctx.fillText('🏢  CONFERENCE ROOM  |  회의실', mrX+mrW/2, mrY+15)
      ctx.textAlign='left'

      // 회의실 활성 표시 (글로우)
      if(mt.active && agRef.current.some(ag=>ag.atMeet)){
        ctx.fillStyle='rgba(255,210,80,0.04)'
        ctx.fillRect(mrX, mrY+TS, mrW, 7*TS)
      }

      // 스프라이트 (Y정렬)
      const sprites:{y:number;draw:()=>void}[]=[]
      agRef.current.forEach(ag=>{
        const isAct=actRef.current===ag.def.id
        const nm=s.agentNames?.[ag.def.id]||ag.def.name
        const ox=~~(ag.x-CW_/2), oy=~~(ag.y-CH_)
        sprites.push({y:ag.y, draw:()=>{
          drawChar(ox,oy,ag.def,ag.dir,ag.walkFrame,ag.mode==='sit'||ag.mode==='inMeet',isAct)
          drawLabel(ox,oy,nm,isAct,ag.def.accent)
          const showBubble=isAct||ag.atMeet||(ag.mode==='sit'&&(~~(T.current*0.4+ag.def.id.charCodeAt(0)*0.1))%4===0)
          if(showBubble) drawBubble(ox,oy,ag.bubble,ag.def.accent,ag.atMeet)
        }})
      })
      sprites.sort((a,b)=>a.y-b.y).forEach(sp=>sp.draw())

      // HUD
      if(mt.active && agRef.current.some(ag=>ag.atMeet)){
        fr(CW-160,10,152,24,'rgba(255,200,50,0.92)')
        ctx.strokeStyle='#c08000'; ctx.lineWidth=1; ctx.strokeRect(CW-160,10,152,24)
        ctx.fillStyle='#3a1800'; ctx.font=`bold 11px ${FONT}`; ctx.textAlign='center'
        ctx.fillText('📊 팀 회의 진행 중', CW-84, 26); ctx.textAlign='left'
      }

      animId=requestAnimationFrame(loop)
    }
    animId=requestAnimationFrame(loop)
    return()=>cancelAnimationFrame(animId)
  },[])

  return(
    <canvas ref={cvRef} width={CW} height={CH}
      style={{
        imageRendering:'pixelated', display:'block', maxWidth:'100%',
        borderRadius:12, border:'1px solid rgba(170,160,210,0.35)',
        boxShadow:'0 4px 32px rgba(16,8,48,0.16)',
      }}
    />
  )
}
