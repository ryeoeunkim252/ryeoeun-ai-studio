'use client'
import { useEffect, useRef } from 'react'
import type { AgentId } from '@/lib/agents'
import { loadData, DEFAULT_SETTINGS, type AppSettings } from '@/lib/store'

interface Props { activeAgentId?: AgentId | null }

// ══════════════════════════════════════════
//  상수
// ══════════════════════════════════════════
const CW = 900, CH = 520
const TS = 36
const COLS = 25, ROWS = 14
const FONT = "'Pretendard','Noto Sans KR',sans-serif"

// 캐릭터 크기 (로블록스 스타일)
const CHAR_W = 34   // 캐릭터 총 너비 (팔 포함)
const CHAR_H = 60   // 캐릭터 총 높이

// ══════════════════════════════════════════
//  타일 타입
// ══════════════════════════════════════════
const TL = {
  F:1, W:2, SH:3, CLK:4, DK:5, MN:6, CH:7, PL:8, CP:9,
  DIV:10, WB:11, MT:12, SF:13, SF_A:14, FR:15, TV:16, DOOR:17,
} as const
type TileT = typeof TL[keyof typeof TL]
const WALKABLE = new Set<TileT>([TL.F, TL.CP, TL.DOOR, TL.CH])

// ══════════════════════════════════════════
//  팔레트
// ══════════════════════════════════════════
const P = {
  fl:'#f0ebe0', flD:'#e4ddd0', flLine:'rgba(170,150,120,0.15)',
  wl:'#eae5f5', wlT:'#dad4ec', wlB:'#c8c0e0',
  dkTop:'#c89858', dkFace:'#9a7030', dkEdge:'#7a5020', dkLeg:'#5a3810',
  chBack:'#4a7090', chSeat:'#5a82a8', chFace:'#384f68', chLeg:'#283848',
  mtTop:'#6a3818', mtFace:'#4a2408', mtEdge:'#8a4c20',
  shWood:'#b87830', shDark:'#7a4e18',
  ptClay:'#c05030', ptLight:'#d87050', ptSoil:'#3a1a08',
  lf1:'#38a030', lf2:'#2a8820', lf3:'#1a6810',
  sfGreen:'#3a6848', sfLight:'#4a8058', sfDark:'#284838', sfArm:'#1e3428',
  cpBlue:'#b8c8e0', cpBorder:'#8898b8',
  wbBd:'#404858', wbSurf:'#f6f6f2',
  frG:'#c89040', frP:'#7a3898', frB:'#2858a8',
  divBar:'#8890b8',
  mnBd:'#1a1830', mnScr:'#080818',
  tvBd:'#1e1c2c', tvScr:'#0e0c1c',
}

// ══════════════════════════════════════════
//  에이전트 정의
// ══════════════════════════════════════════
interface AgDef {
  id:string; name:string
  hair:string; skin:string; shirt:string; pants:string; shoes:string
  accent:string; seat:{tc:number;tr:number}
}
const BASE = [
  {id:'router',  name:'총괄실장', hair:'#18103a',skin:'#f4c890',shirt:'#1e3a6a',pants:'#0f1f38',shoes:'#08080e',accent:'#ff7070'},
  {id:'web',     name:'웹팀',    hair:'#0a90b0',skin:'#fde3a7',shirt:'#1a70c0',pants:'#112248',shoes:'#0e1826',accent:'#60bfff'},
  {id:'content', name:'콘텐츠팀',hair:'#b03878',skin:'#fad7a0',shirt:'#7830a8',pants:'#3a1048',shoes:'#1e0818',accent:'#ff70b8'},
  {id:'research',name:'연구팀',  hair:'#283818',skin:'#f0c896',shirt:'#207840',pants:'#0e3a18',shoes:'#081008',accent:'#60e880'},
  {id:'edu',     name:'교육팀',  hair:'#080808',skin:'#fde8d0',shirt:'#c04820',pants:'#481808',shoes:'#180808',accent:'#ffb060'},
  {id:'ops',     name:'운영팀',  hair:'#080808',skin:'#c07848',shirt:'#1e3848',pants:'#101820',shoes:'#060808',accent:'#60e0e0'},
  {id:'design',  name:'디자인팀',hair:'#e0c048',skin:'#f8d8b0',shirt:'#b82830',pants:'#280810',shoes:'#100808',accent:'#ff9060'},
]
const SEATS = [
  {tc:1,tr:2},{tc:5,tr:2},{tc:9,tr:2},{tc:13,tr:2},
  {tc:1,tr:8},{tc:5,tr:8},{tc:9,tr:8},{tc:13,tr:8},
  {tc:1,tr:11},{tc:5,tr:11},
]

// 회의 좌석 (의자 타일 위치)
// 세로형 테이블: 왼쪽 열(col19)과 오른쪽 열(col22)
const MEET_SEATS = [
  {tc:19,tr:3,side:'l'},{tc:19,tr:4,side:'l'},{tc:19,tr:5,side:'l'},
  {tc:22,tr:3,side:'r'},{tc:22,tr:4,side:'r'},{tc:22,tr:5,side:'r'},
]

// ══════════════════════════════════════════
//  맵 생성
// ══════════════════════════════════════════
function buildMap(agents:AgDef[]): TileT[][] {
  const m:TileT[][] = Array.from({length:ROWS},()=>Array(COLS).fill(TL.F) as TileT[])

  // 외벽
  for(let c=0;c<COLS;c++){m[0][c]=TL.W;m[ROWS-1][c]=TL.W}
  for(let r=0;r<ROWS;r++){m[r][0]=TL.W;m[r][COLS-1]=TL.W}

  // 칸막이 (문: row 6,7)
  for(let r=1;r<ROWS-1;r++) m[r][17]=r===6||r===7?TL.DOOR:TL.DIV

  // 왼쪽 책장
  for(let c=1;c<17;c++) m[1][c]=TL.SH
  m[0][8]=TL.CLK

  // 카펫 복도
  for(let c=1;c<17;c++){m[5][c]=TL.CP;m[10][c]=TL.CP}

  // 팀 책상 자동 배치
  agents.forEach((ag,i)=>{
    const s=SEATS[i]; if(!s||s.tr>=ROWS-2) return
    m[s.tr][s.tc]=TL.DK
    if(s.tc+1<17) m[s.tr][s.tc+1]=TL.MN
    if(s.tr+1<ROWS-2) m[s.tr+1][s.tc]=TL.CH
    if(i%4===3&&s.tc+3<17) m[s.tr][s.tc+3]=TL.PL
  })

  // 벽 화분
  m[ROWS-2][1]=TL.PL;m[ROWS-2][5]=TL.PL;m[ROWS-2][9]=TL.PL;m[ROWS-2][13]=TL.PL

  // ── 회의실 (오른쪽) ──────────────────────
  // TV (상단 벽)
  m[1][18]=TL.TV;m[1][19]=TL.TV

  // 세로형 회의 테이블: cols 20-21, rows 2-6
  for(let r=2;r<=6;r++){m[r][20]=TL.MT;m[r][21]=TL.MT}

  // 의자 배치:
  // 왼쪽 (col 19, rows 3-5) - 오른쪽 바라보며 앉음
  m[3][19]=TL.CH; m[4][19]=TL.CH; m[5][19]=TL.CH
  // 오른쪽 (col 22, rows 3-5) - 왼쪽 바라보며 앉음
  m[3][22]=TL.CH; m[4][22]=TL.CH; m[5][22]=TL.CH

  // 추가 의자 (테이블 상단, 하단)
  m[1][20]=TL.CH; m[1][21]=TL.CH   // 위쪽 의자
  m[7][20]=TL.CH; m[7][21]=TL.CH   // 아래쪽 의자

  // 걷기 통로 확보: col 18 (입구 통로), col 23 (오른쪽 통로)는 F
  // (이미 F로 채워져 있음)

  // 라운지 (오른쪽 하단)
  m[9][18]=TL.SF_A;m[9][19]=TL.SF;m[9][20]=TL.SF;m[9][21]=TL.SF;m[9][22]=TL.SF_A
  m[9][24]=TL.PL;m[ROWS-2][20]=TL.PL;m[ROWS-2][23]=TL.PL

  // 액자
  m[0][3]=TL.FR;m[0][10]=TL.FR;m[0][14]=TL.FR;m[0][20]=TL.FR;m[0][23]=TL.FR

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
const MEET_SAY=['회의 중...','좋은 아이디어!','검토해볼게요','그렇군요!','진행합시다','동의합니다']

// ══════════════════════════════════════════
//  에이전트 상태
// ══════════════════════════════════════════
type AgMode='sit'|'roam'|'ret'|'toMeet'|'inMeet'|'fromMeet'
interface AgState {
  def:AgDef; x:number; y:number; sx:number; sy:number
  tx:number; ty:number; mode:AgMode
  dir:'u'|'d'|'l'|'r'; wf:number
  timer:number; walksLeft:number
  bubble:string; bubbleT:number
  meetIdx:number; atMeet:boolean
}

// ══════════════════════════════════════════
//  컴포넌트
// ══════════════════════════════════════════
export default function PixelOffice({activeAgentId}:Props){
  const cvRef=useRef<HTMLCanvasElement>(null)
  const tick=useRef(0)
  const actRef=useRef<AgentId|null|undefined>(null)
  const setRef=useRef<AppSettings>(DEFAULT_SETTINGS)
  const agRef=useRef<AgState[]>([])
  const mapRef=useRef<TileT[][]>([])
  const meetR=useRef({active:false,cd:500+Math.random()*300})

  useEffect(()=>{actRef.current=activeAgentId},[activeAgentId])

  useEffect(()=>{
    const s=loadData<AppSettings>('nk_settings',DEFAULT_SETTINGS)
    const cts=loadData<{id:string;icon:string;name:string}[]>('nk_custom_teams',[])
    setRef.current=s
    const cPal=[
      {hair:'#c0c0c8',skin:'#f4c080',shirt:'#4040a8',pants:'#202060',shoes:'#080810',accent:'#8888ff'},
      {hair:'#481808',skin:'#fde3a7',shirt:'#902018',pants:'#400808',shoes:'#180808',accent:'#ff7060'},
      {hair:'#104838',skin:'#f0c896',shirt:'#208848',pants:'#083018',shoes:'#081008',accent:'#50e880'},
      {hair:'#503010',skin:'#f8d090',shirt:'#806020',pants:'#402808',shoes:'#181008',accent:'#ffc060'},
    ]
    const allDefs:AgDef[]=[
      ...BASE.map((d,i)=>({...d,seat:SEATS[i]||SEATS[0]})),
      ...cts.slice(0,4).map((ct,i)=>({
        id:ct.id,name:ct.name,seat:SEATS[BASE.length+i]||SEATS[BASE.length-1],
        ...cPal[i%cPal.length],
      })),
    ]
    mapRef.current=buildMap(allDefs)
    agRef.current=allDefs.map((def,i)=>{
      const seat=SEATS[i]||SEATS[0]
      const sx=2+seat.tc*TS+TS/2, sy=2+(seat.tr+1)*TS+TS/2+4
      const pool=WORK_SAY[def.id]||WORK_SAY.ops
      return{
        def,x:sx,y:sy,sx,sy,tx:sx,ty:sy,mode:'sit' as AgMode,dir:'d',
        wf:0,timer:40+i*12+Math.random()*80,walksLeft:0,
        bubble:pool[Math.floor(Math.random()*pool.length)],
        bubbleT:80+Math.random()*80,meetIdx:i%MEET_SEATS.length,atMeet:false,
      }
    })
  },[])

  useEffect(()=>{
    const cv=cvRef.current; if(!cv) return
    const ctx=cv.getContext('2d')!

    // ── 헬퍼 ──────────────────────────────
    const fr=(x:number,y:number,w:number,h:number,c:string)=>{
      if(w<=0||h<=0) return
      ctx.fillStyle=c; ctx.fillRect(~~x,~~y,Math.max(1,~~w),Math.max(1,~~h))
    }
    const rr=(x:number,y:number,w:number,h:number,r:number,c:string,stroke?:string)=>{
      if(w<=2||h<=2) return fr(x,y,w,h,c)
      ctx.fillStyle=c
      ctx.beginPath(); ctx.roundRect(~~x,~~y,~~w,~~h,r); ctx.fill()
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(~~x,~~y,~~w,~~h,r);ctx.stroke()}
    }
    const shade=(hex:string,amt:number)=>{
      const n=parseInt(hex.replace('#',''),16)
      const r=Math.max(0,Math.min(255,(n>>16)+amt))
      const g=Math.max(0,Math.min(255,((n>>8)&0xff)+amt))
      const b=Math.max(0,Math.min(255,(n&0xff)+amt))
      return`#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
    }
    const tpx=(tc:number)=>2+tc*TS, tpy=(tr:number)=>2+tr*TS

    const canWalk=(wx:number,wy:number)=>{
      const tc=Math.floor((wx-2)/TS), tr=Math.floor((wy-2)/TS)
      if(tc<0||tc>=COLS||tr<0||tr>=ROWS) return false
      return WALKABLE.has(mapRef.current[tr]?.[tc])
    }
    const randFloor=(right=false):{tx:number,ty:number}=>{
      for(let i=0;i<60;i++){
        const tc=right?18+Math.floor(Math.random()*5):1+Math.floor(Math.random()*15)
        const tr=2+Math.floor(Math.random()*(ROWS-4))
        if(WALKABLE.has(mapRef.current[tr]?.[tc]))
          return{tx:tpx(tc)+TS/2,ty:tpy(tr)+TS/2}
      }
      return{tx:tpx(5)+TS/2,ty:tpy(6)+TS/2}
    }

    // ══════════════════════════════════════
    //  🎮 로블록스 스타일 아바타
    // ══════════════════════════════════════
    const drawRoblox=(ox:number,oy:number,def:AgDef,dir:'u'|'d'|'l'|'r',wf:number,sitting:boolean,isAct:boolean)=>{
      const{skin,hair,shirt,pants,shoes,accent}=def
      const cx=ox+CHAR_W/2   // 중심 X
      const t=tick.current

      // 걷기 & 팔 흔들기
      const legSwing=(!sitting&&wf>0)?Math.sin(wf*1.5)*6:0
      const armSwing=(!sitting&&wf>0)?Math.sin(wf*1.5+Math.PI)*5:0

      // 그림자
      ctx.fillStyle='rgba(0,0,0,0.13)'
      ctx.beginPath()
      ctx.ellipse(cx,oy+CHAR_H+3,sitting?13:11,4,0,0,Math.PI*2)
      ctx.fill()

      // ── 다리 ──
      if(!sitting){
        // 오른쪽 다리 (뒤)
        rr(cx+2,oy+40-legSwing,8,14,3,shade(pants,-15))
        rr(cx+2,oy+52-legSwing,9,7,2,shade(shoes,-10))  // 오른쪽 신발
        // 왼쪽 다리 (앞)
        rr(cx-10,oy+40+legSwing,8,14,3,pants)
        rr(cx-11,oy+52+legSwing,9,7,2,shoes)  // 왼쪽 신발
      } else {
        // 앉은 자세 - 다리를 앞으로 내밈
        rr(cx-10,oy+44,8,5,2,pants)
        rr(cx+2,oy+44,8,5,2,shade(pants,-15))
        rr(cx-12,oy+44,4,8,2,shoes)
        rr(cx+10,oy+44,4,8,2,shade(shoes,-10))
      }

      // ── 팔 ──
      if(dir==='d'||dir==='u'||sitting){
        rr(cx-19,oy+20+armSwing,8,16,4,shirt)          // 왼팔
        rr(cx-19,oy+34+armSwing,8,6,3,shade(skin,-5))  // 왼손
        rr(cx+11,oy+20-armSwing,8,16,4,shade(shirt,-15)) // 오른팔
        rr(cx+11,oy+34-armSwing,8,6,3,shade(skin,-10)) // 오른손
      } else if(dir==='l'){
        rr(cx+5,oy+20+armSwing,8,16,4,shirt)
        rr(cx+5,oy+34+armSwing,8,6,3,shade(skin,-5))
      } else {
        rr(cx-13,oy+20+armSwing,8,16,4,shirt)
        rr(cx-13,oy+34+armSwing,8,6,3,shade(skin,-5))
      }

      // ── 몸통 (큰 블록) ──
      rr(cx-9,oy+18,18,24,4,shirt)
      rr(cx+6,oy+19,3,22,3,shade(shirt,-20))  // 우측 음영 (3D 느낌)
      rr(cx-9,oy+18,18,2,2,shade(shirt,20))   // 상단 하이라이트

      // ── 넥 ──
      rr(cx-4,oy+14,8,6,2,skin)

      // ── 머리 (로블록스 특징: 큰 정사각형!) ──
      const hw=24, hh=22
      rr(cx-hw/2,oy,hw,hh,5,skin)
      rr(cx+hw/2-4,oy+2,4,hh-3,3,shade(skin,-18))  // 우측 음영
      rr(cx-hw/2,oy,hw,2,3,shade(skin,18))           // 상단 하이라이트

      // ── 헤어 (머리 위 + 옆) ──
      rr(cx-hw/2-1,oy-5,hw+2,8,4,hair)   // 헤어 상단 블록
      if(dir!=='u'){
        rr(cx-hw/2-2,oy,4,hh/2,3,hair)   // 왼쪽 헤어
        rr(cx+hw/2-2,oy,4,hh/2,3,hair)   // 오른쪽 헤어
      }

      // ── 얼굴 (방향별) ──
      if(dir==='d'||sitting){
        // 앞모습
        // 눈썹
        ctx.fillStyle=shade(hair,20); ctx.lineWidth=2; ctx.lineCap='round'
        ctx.beginPath(); ctx.moveTo(cx-9,oy+5); ctx.lineTo(cx-4,oy+4); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx+4,oy+4); ctx.lineTo(cx+9,oy+5); ctx.stroke()

        // 눈 - 로블록스 스타일 (큰 원형)
        rr(cx-9,oy+7,8,8,3,'#ffffff')          // 흰자 왼쪽
        rr(cx+1,oy+7,8,8,3,'#ffffff')           // 흰자 오른쪽
        rr(cx-8,oy+8,6,6,3,'#1a0838')           // 홍채 왼쪽
        rr(cx+2,oy+8,6,6,3,'#1a0838')            // 홍채 오른쪽
        // 눈동자 하이라이트 (귀여움 필수!)
        fr(cx-6,oy+9,3,3,'rgba(255,255,255,0.9)')
        fr(cx+4,oy+9,3,3,'rgba(255,255,255,0.9)')
        fr(cx-5,oy+13,2,2,'rgba(255,255,255,0.5)')
        fr(cx+5,oy+13,2,2,'rgba(255,255,255,0.5)')

        // 코 (작은 삼각형 느낌)
        ctx.fillStyle=shade(skin,-20)
        ctx.beginPath(); ctx.moveTo(cx,oy+15); ctx.lineTo(cx-2,oy+18); ctx.lineTo(cx+2,oy+18); ctx.fill()

        // 입 - 로블록스 U자 스마일
        ctx.strokeStyle='#c04868'; ctx.lineWidth=2.5; ctx.lineCap='round'
        ctx.beginPath(); ctx.arc(cx,oy+20,5,0.2,Math.PI-0.2); ctx.stroke()
        // 볼 홍조
        ctx.fillStyle='rgba(255,130,130,0.3)'
        ctx.beginPath(); ctx.ellipse(cx-9,oy+17,4,2.5,0,0,Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.ellipse(cx+9,oy+17,4,2.5,0,0,Math.PI*2); ctx.fill()

        // 활성 글로우
        if(isAct){
          const g=0.5+Math.sin(t*5)*0.35
          ctx.strokeStyle=accent; ctx.lineWidth=2.5; ctx.globalAlpha=g
          ctx.beginPath(); ctx.roundRect(cx-hw/2-2,oy-7,hw+4,hh+9,6); ctx.stroke()
          ctx.globalAlpha=1
        }

      } else if(dir==='u'){
        // 뒷모습 - 헤어만 보임
        rr(cx-hw/2-1,oy-3,hw+2,hh+3,5,hair)  // 뒷머리 전체

      } else {
        // 옆모습
        const fl=dir==='l'
        // 눈 한쪽
        const eX=fl?cx-7:cx+1
        rr(eX,oy+7,7,7,3,'#ffffff')
        rr(fl?eX+1:eX,oy+8,5,5,3,'#1a0838')
        fr(fl?eX+2:eX+1,oy+9,2,2,'rgba(255,255,255,0.9)')
        // 코
        ctx.fillStyle=shade(skin,-20)
        ctx.beginPath()
        if(fl){ ctx.moveTo(cx-hw/2,oy+14); ctx.lineTo(cx-hw/2-3,oy+17); ctx.lineTo(cx-hw/2,oy+18) }
        else   { ctx.moveTo(cx+hw/2,oy+14); ctx.lineTo(cx+hw/2+3,oy+17); ctx.lineTo(cx+hw/2,oy+18) }
        ctx.fill()
        // 입
        ctx.strokeStyle='#c04868'; ctx.lineWidth=2; ctx.lineCap='round'
        ctx.beginPath()
        if(fl) ctx.arc(cx-4,oy+20,3,0.3,Math.PI-0.3)
        else   ctx.arc(cx+4,oy+20,3,0.3,Math.PI-0.3)
        ctx.stroke()
      }
    }

    // ── 이름표 ──
    const drawLabel=(ox:number,oy:number,name:string,active:boolean,accent:string)=>{
      ctx.font=`bold 11px ${FONT}`
      const tw=ctx.measureText(name).width+12
      const lx=ox+CHAR_W/2-tw/2, ly=oy-22
      fr(lx+1,ly+1,tw,14,'rgba(0,0,0,0.65)')
      ctx.fillStyle=active?accent:'rgba(16,8,40,0.9)'
      ctx.fillRect(~~lx,~~ly,~~tw,14)
      ctx.strokeStyle=active?'rgba(255,255,255,0.7)':'rgba(180,160,240,0.3)'
      ctx.lineWidth=1; ctx.strokeRect(~~lx,~~ly,~~tw,14)
      ctx.fillStyle='#fff'; ctx.textAlign='center'
      ctx.fillText(name,ox+CHAR_W/2,ly+10); ctx.textAlign='left'
    }

    // ── 말풍선 ──
    const drawBubble=(ox:number,oy:number,text:string,accent:string,meet=false)=>{
      const bob=Math.sin(tick.current*2.5)*1.5
      ctx.font=`bold 10px ${FONT}`
      const tw=ctx.measureText(text).width+14
      const bx=ox+CHAR_W/2-tw/2, by=oy-46+bob
      fr(bx+1,by+1,tw,16,'rgba(0,0,0,0.4)')
      ctx.fillStyle=meet?'#fffce8':'#ffffff'
      ctx.fillRect(~~bx,~~by,~~tw,16)
      ctx.strokeStyle=accent; ctx.lineWidth=1.5; ctx.strokeRect(~~bx,~~by,~~tw,16)
      fr(ox+CHAR_W/2-3,by+16,6,3,meet?'#fffce8':'#fff')
      fr(ox+CHAR_W/2-2,by+19,4,2,meet?'#fffce8':'#fff')
      fr(ox+CHAR_W/2-1,by+21,2,2,meet?'#fffce8':'#fff')
      ctx.fillStyle=meet?'#604000':'#100820'
      ctx.textAlign='center'; ctx.fillText(text,ox+CHAR_W/2,by+12); ctx.textAlign='left'
    }

    // ══════════════════════════════════════
    //  타일 렌더러 (3/4 시점 실사)
    // ══════════════════════════════════════
    const TOP=TS*0.58|0, FACE=TS-TOP
    const drawTile=(tile:TileT,x:number,y:number,tc:number,tr:number)=>{
      const t=tick.current
      switch(tile){
        case TL.F:{
          fr(x,y,TS,TS,(tc+tr)%2===0?P.fl:P.flD)
          ctx.strokeStyle=P.flLine; ctx.lineWidth=0.5; ctx.strokeRect(x,y,TS,TS)
          ctx.strokeStyle='rgba(180,160,130,0.06)'; ctx.lineWidth=0.4
          for(let i=5;i<TS;i+=11){ctx.beginPath();ctx.moveTo(x+i,y+1);ctx.lineTo(x+i+2,y+TS-1);ctx.stroke()}
          break}
        case TL.CP:{
          fr(x,y,TS,TS,P.cpBlue)
          for(let i=0;i<3;i++) for(let j=0;j<3;j++) fr(x+5+i*10,y+5+j*10,5,5,'rgba(100,130,200,0.2)')
          fr(x,y,TS,2,P.cpBorder);fr(x,y+TS-2,TS,2,P.cpBorder)
          fr(x,y,2,TS,P.cpBorder);fr(x+TS-2,y,2,TS,P.cpBorder)
          break}
        case TL.W:{
          fr(x,y,TS,TS,P.wl)
          fr(x,y,TS,3,P.wlT); fr(x,y+TS-2,TS,2,P.wlB)
          ctx.strokeStyle='rgba(160,150,200,0.08)'; ctx.lineWidth=0.5; ctx.strokeRect(x,y,TS,TS)
          break}
        case TL.DIV:{
          fr(x,y,TS,TS,'rgba(180,185,220,0.25)')
          fr(x+TS/2-2,y,4,TS,P.divBar)
          fr(x+TS/2-1,y,2,TS,'rgba(255,255,255,0.3)')
          break}
        case TL.DOOR:{
          fr(x,y,TS,TS,(tc+tr)%2===0?P.fl:P.flD)
          ctx.strokeStyle='rgba(140,150,200,0.25)'; ctx.lineWidth=1
          ctx.setLineDash([3,3]); ctx.strokeRect(x,y,TS,TS); ctx.setLineDash([])
          break}
        case TL.SH:{
          fr(x,y,TS,TS,P.wl)
          fr(x,y+4,TS,TOP-4,P.shWood)
          fr(x,y+TOP,TS,FACE,P.shDark)
          fr(x,y+4,TS,2,shade(P.shWood,20))
          const bk=['#d84040','#3880e8','#3aaa3a','#e8a020','#9828e8','#f05880']
          let bx=x+2; for(let b=0;b<4;b++){
            const bh=10+((tc*4+b*6+tr)%7),bw=7,bc=bk[(tc+tr+b)%bk.length]
            fr(bx,y+6,bw,bh,bc); fr(bx,y+6,1,bh,shade(bc,35)); fr(bx+bw-1,y+6,1,bh,shade(bc,-25))
            fr(bx+2,y+8,bw-4,2,shade(bc,50)); bx+=bw+1}
          break}
        case TL.CLK:{
          fr(x,y,TS,TS,P.wl); fr(x+3,y+3,TS-6,TS-6,'#282038')
          ctx.fillStyle='#f5f0e8'; ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,13,0,Math.PI*2); ctx.fill()
          ctx.strokeStyle='#9888a8'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,13,0,Math.PI*2); ctx.stroke()
          for(let i=0;i<12;i++){
            const a=i*Math.PI/6; ctx.strokeStyle='#8878a0'; ctx.lineWidth=i%3===0?2:1
            ctx.beginPath(); ctx.moveTo(x+TS/2+Math.cos(a)*11,y+TS/2+Math.sin(a)*11)
            ctx.lineTo(x+TS/2+Math.cos(a)*13,y+TS/2+Math.sin(a)*13); ctx.stroke()}
          const ha=t*0.005-Math.PI/2
          ctx.strokeStyle='#181030'; ctx.lineWidth=2; ctx.lineCap='round'
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+TS/2); ctx.lineTo(x+TS/2+Math.cos(ha)*7,y+TS/2+Math.sin(ha)*7); ctx.stroke()
          const ma=t*0.06-Math.PI/2
          ctx.strokeStyle='#281840'; ctx.lineWidth=1.5
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+TS/2); ctx.lineTo(x+TS/2+Math.cos(ma)*10,y+TS/2+Math.sin(ma)*10); ctx.stroke()
          ctx.strokeStyle='#e03030'; ctx.lineWidth=1
          const sa=t*0.8-Math.PI/2
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+TS/2); ctx.lineTo(x+TS/2+Math.cos(sa)*11,y+TS/2+Math.sin(sa)*11); ctx.stroke()
          ctx.fillStyle='#e03030'; ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,1.5,0,Math.PI*2); ctx.fill()
          break}
        case TL.DK:{
          fr(x,y,TS,TS,(tc+tr)%2===0?P.fl:P.flD)
          fr(x+3,y+TOP+2,4,FACE-2,P.dkLeg); fr(x+TS-7,y+TOP+2,4,FACE-2,P.dkLeg)
          fr(x+1,y+TOP,TS-2,FACE,P.dkFace)
          fr(x+1,y+TOP,TS-2,2,shade(P.dkFace,20)); fr(x+TS-3,y+TOP,3,FACE,shade(P.dkFace,-20))
          fr(x,y,TS,TOP,P.dkTop); fr(x,y,TS,2,shade(P.dkTop,25))
          fr(x,y,2,TOP,shade(P.dkTop,15)); fr(x+TS-3,y,3,TOP,P.dkEdge)
          ctx.strokeStyle='rgba(140,90,10,0.08)'; ctx.lineWidth=0.5
          for(let i=4;i<TS;i+=8){ctx.beginPath();ctx.moveTo(x+i,y+2);ctx.lineTo(x+i+1,y+TOP-2);ctx.stroke()}
          fr(x+3,y+5,9,7,'#ede8dc'); fr(x+3,y+5,9,1,'#d8d0c0'); fr(x+14,y+6,5,5,'#3870b8')
          break}
        case TL.MN:{
          fr(x,y,TS,TS,(tc+tr)%2===0?P.fl:P.flD)
          fr(x+TS/2-2,y+TOP-2,4,4,P.mnBd); fr(x+TS/2-5,y+TOP+2,10,2,P.mnBd)
          const mh=TOP-6,mw=TS-6
          fr(x+3,y+3,mw,mh,P.mnBd); fr(x+4,y+4,mw-2,mh-2,P.mnScr)
          ctx.globalAlpha=0.07+Math.sin(t*0.4)*0.03
          ctx.fillStyle='#3080e0'; ctx.fillRect(x+4,y+4,mw-2,mh-2); ctx.globalAlpha=1
          const lc=['#30c878','#60b0f0','#f0d060','#f08060','#a060f0']
          for(let ln=0;ln<4;ln++){const lw=3+((tc*5+ln*7+~~t)%9);fr(x+5,y+6+ln*4,lw,2,lc[(ln+~~(t*0.18))%lc.length])}
          break}
        case TL.CH:{
          fr(x,y,TS,TS,(tc+tr)%2===0?P.fl:P.flD)
          const cc=['#4a7090','#3a6858','#685040','#406050','#544870'][(tr+tc)%5]
          const ccD=shade(cc,-30),ccL=shade(cc,25)
          fr(x+5,y+TS-12,4,12,P.chLeg); fr(x+TS-9,y+TS-12,4,12,P.chLeg)
          fr(x+3,y+(TS*0.45|0),TS-6,TS*0.22|0,cc)
          fr(x+3,y+(TS*0.67|0),TS-6,TS*0.1|0,ccD)
          fr(x+TS-5,y+(TS*0.45|0),2,TS*0.22|0,shade(cc,-15))
          fr(x+3,y+(TS*0.45|0),TS-6,2,ccL)
          fr(x+4,y+2,TS-8,TS*0.43|0,cc)
          fr(x+4,y+2,TS-8,2,ccL); fr(x+TS-6,y+2,2,TS*0.43|0,ccD)
          ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=0.8; ctx.strokeRect(x+5,y+4,TS-10,TS*0.38|0)
          break}
        case TL.PL:{
          fr(x,y,TS,TS,(tc+tr)%2===0?P.fl:P.flD)
          ctx.fillStyle='rgba(0,0,0,0.1)'; ctx.beginPath(); ctx.ellipse(x+TS/2,y+TS-2,12,4,0,0,Math.PI*2); ctx.fill()
          fr(x+7,y+18,18,2,shade(P.ptClay,10)); fr(x+8,y+20,16,10,P.ptClay)
          fr(x+8,y+20,2,10,shade(P.ptClay,20)); fr(x+22,y+20,2,10,shade(P.ptClay,-20))
          fr(x+9,y+21,6,8,shade(P.ptClay,15)); fr(x+7,y+29,18,2,shade(P.ptClay,-25))
          fr(x+9,y+20,14,3,P.ptSoil)
          fr(x+TS/2-1,y+8,2,12,'#2a5e10'); fr(x+TS/2,y+8,1,12,'#38781a')
          ctx.strokeStyle='#2a6010'; ctx.lineWidth=2; ctx.lineCap='round'
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+15); ctx.quadraticCurveTo(x+5,y+10,x+4,y+6); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+13); ctx.quadraticCurveTo(x+TS-5,y+8,x+TS-4,y+4); ctx.stroke()
          const dL=(lx:number,ly:number,rx:number,ry:number,a:number,lc:string)=>{
            ctx.fillStyle=lc; ctx.beginPath(); ctx.ellipse(lx,ly,rx,ry,a,0,Math.PI*2); ctx.fill()
          }
          dL(x+4,y+7,8,4,Math.PI*0.25,P.lf3); dL(x+5,y+6,7,3,Math.PI*0.2,P.lf2); dL(x+5,y+5,5,2.5,Math.PI*0.18,P.lf1)
          dL(x+TS-4,y+5,8,4,-Math.PI*0.25,P.lf3); dL(x+TS-5,y+4,7,3,-Math.PI*0.2,P.lf2); dL(x+TS-5,y+3,5,2.5,-Math.PI*0.18,P.lf1)
          dL(x+TS/2,y+5,5,9,0,P.lf3); dL(x+TS/2,y+4,4,8,0,P.lf2); dL(x+TS/2,y+3,3,7,0,P.lf1)
          ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=0.7
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+10); ctx.lineTo(x+TS/2,y+2); ctx.stroke()
          break}
        case TL.WB:{
          fr(x,y,TS,TS,P.wl)
          fr(x+1,y+2,TS-2,TS-4,P.wbBd); fr(x+2,y+3,TS-4,TS-7,P.wbSurf)
          const mc=['#d83030','#2860c8','#208038','#8830a0']
          for(let i=0;i<3;i++){const lw=3+((tc+i*5)%9);fr(x+4,y+5+i*6,lw,2,mc[(i+tc)%mc.length])}
          fr(x+4,y+TS-10,8,2,'#e03030')
          fr(x,y,TS,2,P.wbBd);fr(x,y+TS-2,TS,2,P.wbBd);fr(x,y,2,TS,P.wbBd);fr(x+TS-2,y,2,TS,P.wbBd)
          break}
        case TL.MT:{
          // 세로형 회의 테이블 - 3/4 시점
          const isLastRow=(tr===6), isFirstRow=(tr===2)
          fr(x,y,TS,TS,(tc+tr)%2===0?P.fl:P.flD)
          if(isLastRow){
            fr(x+3,y+TOP+2,4,FACE,P.mtLeg||'#3a1808'); fr(x+TS-7,y+TOP+2,4,FACE,P.mtLeg||'#3a1808')
            fr(x,y+TOP,TS,FACE,P.mtFace)
            fr(x,y+TOP,TS,2,shade(P.mtFace,20)); fr(x+TS-3,y+TOP,3,FACE,shade(P.mtFace,-20))
          }
          fr(x,y,TS,isLastRow?TOP:TS,P.mtTop)
          fr(x,y,TS,2,P.mtEdge)
          fr(x,y,2,isLastRow?TOP:TS,shade(P.mtTop,20))
          fr(x+TS-3,y,3,isLastRow?TOP:TS,shade(P.mtTop,-20))
          ctx.strokeStyle='rgba(80,30,0,0.1)'; ctx.lineWidth=0.6
          const endY=isLastRow?y+TOP:y+TS
          for(let i=4;i<TS;i+=9){ctx.beginPath();ctx.moveTo(x+i,y+2);ctx.lineTo(x+i+1,endY-2);ctx.stroke()}
          if(isFirstRow){
            ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(x+TS/2,y+TOP/2,4,0,Math.PI*2); ctx.fill()
          }
          break}
        case TL.SF:{
          fr(x,y,TS,TS,(tc+tr)%2===0?P.fl:P.flD)
          fr(x+5,y+TS-6,4,5,shade(P.sfDark,-10)); fr(x+TS-9,y+TS-6,4,5,shade(P.sfDark,-10))
          fr(x+1,y+TOP,TS-2,FACE,P.sfDark); fr(x+1,y+TOP,TS-2,2,shade(P.sfDark,20))
          fr(x+1,y+(TOP-(TS*0.2|0)),TS-2,TS*0.2|0,P.sfGreen)
          fr(x+1,y+(TOP-(TS*0.2|0)),TS-2,2,P.sfLight)
          fr(x+2,y+2,TS-4,TOP-(TS*0.2|0)-2,P.sfGreen)
          fr(x+2,y+2,TS-4,2,P.sfLight); fr(x+TS-4,y+2,2,TOP-(TS*0.2|0)-2,P.sfDark)
          ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1
          ctx.beginPath(); ctx.moveTo(x+TS/2,y+3); ctx.lineTo(x+TS/2,y+(TOP-(TS*0.2|0))-2); ctx.stroke()
          break}
        case TL.SF_A:{
          fr(x,y,TS,TS,(tc+tr)%2===0?P.fl:P.flD)
          fr(x+2,y+TOP,TS-4,FACE,P.sfArm); fr(x+2,y+TOP,TS-4,2,shade(P.sfArm,20))
          fr(x+2,y+2,TS-4,TS-FACE-4,P.sfArm); fr(x+2,y+2,TS-4,2,shade(P.sfArm,15))
          break}
        case TL.TV:{
          fr(x,y,TS,TS,P.wl); fr(x+1,y+2,TS-2,TS-4,P.tvBd); fr(x+2,y+3,TS-4,TS-7,P.tvScr)
          ctx.globalAlpha=0.1+Math.sin(t*0.3)*0.05
          ctx.fillStyle='#4080ff'; ctx.fillRect(x+3,y+4,TS-6,TS-11); ctx.globalAlpha=1
          fr(x+4,y+5,TS-8,3,'rgba(255,255,255,0.7)')
          fr(x+4,y+10,8,2,'rgba(200,220,255,0.5)'); fr(x+4,y+14,12,2,'rgba(200,220,255,0.5)')
          fr(x+4,y+18,6,2,'rgba(200,220,255,0.5)')
          ctx.strokeStyle=shade(P.tvBd,-20); ctx.lineWidth=1; ctx.strokeRect(x+1,y+2,TS-2,TS-4)
          break}
        case TL.FR:{
          fr(x,y,TS,TS,P.wl)
          const fcs=[P.frG,P.frP,P.frB][(tc+tr)%3]
          fr(x+2,y+2,TS-4,TS-4,fcs); fr(x+4,y+4,TS-8,TS-8,'#e8e0d8')
          if(tc%3===0){
            fr(x+4,y+4,TS-8,TS-8,'#b8d0e8')
            ctx.fillStyle='#4878a8'; ctx.beginPath()
            ctx.moveTo(x+6,y+TS-8); ctx.lineTo(x+TS/2,y+8); ctx.lineTo(x+TS-6,y+TS-8); ctx.fill()
            ctx.fillStyle='#e8f0f8'; ctx.beginPath()
            ctx.moveTo(x+TS/2,y+8); ctx.lineTo(x+TS/2-3,y+14); ctx.lineTo(x+TS/2+3,y+14); ctx.fill()
            fr(x+5,y+TS-10,TS-10,4,'#60a060')
          } else if(tc%3===1){
            fr(x+4,y+4,TS-8,TS-8,'#f0f0f8')
            ctx.fillStyle='#f0c040'; ctx.beginPath(); ctx.arc(x+TS/2,y+TS/2,5,0,Math.PI*2); ctx.fill()
            for(let i=0;i<6;i++){
              const pa=i*Math.PI/3; ctx.fillStyle='#e84060'
              ctx.beginPath(); ctx.ellipse(x+TS/2+Math.cos(pa)*7,y+TS/2+Math.sin(pa)*7,3,2,pa,0,Math.PI*2); ctx.fill()
            }
          } else {
            fr(x+4,y+4,TS-8,TS-8,'#e8f0e0')
            const ac=['#e84040','#3070d8','#30a830']; ac.forEach((c,i)=>fr(x+5+i*6,y+5,5,TS-10,c))
          }
          ctx.strokeStyle=shade(fcs,-30); ctx.lineWidth=1.5; ctx.strokeRect(x+2,y+2,TS-4,TS-4)
          break}
      }
    }

    // ══════════════════════════════════════
    //  메인 루프
    // ══════════════════════════════════════
    let animId:number
    const loop=()=>{
      tick.current+=0.04
      const s=setRef.current

      // 회의 이벤트
      const mt=meetR.current
      mt.cd-=1
      if(mt.cd<=0&&!mt.active){
        mt.active=true; mt.cd=350+Math.random()*250
        const shuffled=[...agRef.current].sort(()=>Math.random()-0.5)
        const cnt=2+Math.floor(Math.random()*3)
        shuffled.slice(0,cnt).forEach((ag,i)=>{
          const ms=MEET_SEATS[i%MEET_SEATS.length]
          ag.tx=2+ms.tc*TS+TS/2; ag.ty=2+(ms.tr+1)*TS+4
          ag.mode='toMeet'; ag.atMeet=false
          // 방향: 왼쪽 의자면 오른쪽을 봄(r), 오른쪽 의자면 왼쪽을 봄(l)
        })
      } else if(mt.active&&mt.cd<=0){
        mt.active=false; mt.cd=400+Math.random()*300
        agRef.current.forEach(ag=>{
          if(ag.mode==='inMeet'||ag.mode==='toMeet'){ag.mode='fromMeet';ag.tx=ag.sx;ag.ty=ag.sy;ag.atMeet=false}
        })
      }

      // 에이전트 AI
      agRef.current.forEach(ag=>{
        ag.bubbleT-=1
        if(ag.bubbleT<=0){
          const pool=ag.atMeet?MEET_SAY:(WORK_SAY[ag.def.id]||WORK_SAY.ops)
          ag.bubble=pool[Math.floor(Math.random()*pool.length)]
          ag.bubbleT=70+Math.random()*70
        }
        const moveTo=(tx:number,ty:number,spd=1.6)=>{
          const dx=tx-ag.x,dy=ty-ag.y,d=Math.hypot(dx,dy)
          if(d>4){
            const nx=ag.x+dx/d*spd,ny=ag.y+dy/d*spd
            if(canWalk(nx,ny)){ag.x=nx;ag.y=ny}
            else if(canWalk(ag.x+dx/d*spd,ag.y)) ag.x+=dx/d*spd
            else if(canWalk(ag.x,ag.y+dy/d*spd)) ag.y+=dy/d*spd
            ag.wf=(ag.wf+0.15)%4
            if(Math.abs(dx)>Math.abs(dy)) ag.dir=dx>0?'r':'l'
            else ag.dir=dy>0?'d':'u'
            return false
          }
          return true
        }
        ag.timer-=0.04
        switch(ag.mode){
          case 'sit':
            ag.dir='d'
            if(ag.timer<=0&&!mt.active){
              if(Math.random()<0.28){
                const tgt=randFloor(false)
                ag.tx=tgt.tx;ag.ty=tgt.ty;ag.mode='roam'
                ag.walksLeft=1+Math.floor(Math.random()*2);ag.timer=8+Math.random()*10
              } else ag.timer=25+Math.random()*55
            }
            break
          case 'roam':
            if(moveTo(ag.tx,ag.ty)){
              ag.walksLeft--
              if(ag.walksLeft<=0||ag.timer<=0){ag.mode='ret';ag.tx=ag.sx;ag.ty=ag.sy}
              else{const t2=randFloor(false);ag.tx=t2.tx;ag.ty=t2.ty}
            }
            break
          case 'ret': case 'fromMeet':
            if(moveTo(ag.tx,ag.ty,1.8)){
              ag.x=ag.sx;ag.y=ag.sy;ag.mode='sit';ag.dir='d';ag.wf=0;ag.timer=20+Math.random()*35
            }
            break
          case 'toMeet':
            if(moveTo(ag.tx,ag.ty,1.8)){
              ag.mode='inMeet';ag.atMeet=true
              // 좌석 방향 결정 (왼쪽 의자: 오른쪽 바라봄, 오른쪽 의자: 왼쪽 바라봄)
              const ms=MEET_SEATS[ag.meetIdx%MEET_SEATS.length]
              ag.dir=ms.side==='l'?'r':'l'
              ag.bubble=MEET_SAY[Math.floor(Math.random()*MEET_SAY.length)];ag.bubbleT=60+Math.random()*60
            }
            break
          case 'inMeet':
            // 방향 유지 (서로 마주봄)
            break
        }
      })

      // 렌더
      ctx.fillStyle='#f0ebe0'; ctx.fillRect(0,0,CW,CH)
      for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
        const tile=mapRef.current[r]?.[c]; if(tile) drawTile(tile,2+c*TS,2+r*TS,c,r)
      }

      // 회의실 명판
      const mrX=2+18*TS, mrW=7*TS
      rr(mrX,1,mrW,24,4,'rgba(28,22,55,0.9)')
      ctx.strokeStyle='rgba(150,130,230,0.5)'; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.roundRect(mrX,1,mrW,24,4); ctx.stroke()
      ctx.font=`bold 12px ${FONT}`; ctx.textAlign='center'
      ctx.fillStyle='rgba(255,255,255,0.92)'
      ctx.fillText('🏢  회의실  ·  CONFERENCE ROOM',mrX+mrW/2,18)
      ctx.textAlign='left'

      // 스프라이트 Y정렬 렌더
      const sprites:{y:number;draw:()=>void}[]=[]
      agRef.current.forEach(ag=>{
        const isAct=actRef.current===ag.def.id
        const nm=s.agentNames?.[ag.def.id]||ag.def.name
        const ox=~~(ag.x-CHAR_W/2), oy=~~(ag.y-CHAR_H)
        sprites.push({y:ag.y,draw:()=>{
          drawRoblox(ox,oy,ag.def,ag.dir,ag.wf,ag.mode==='sit'||ag.mode==='inMeet',isAct)
          drawLabel(ox,oy,nm,isAct,ag.def.accent)
          const show=isAct||ag.atMeet||(ag.mode==='sit'&&(~~(tick.current*0.35+ag.def.id.charCodeAt(0)*0.08))%4===0)
          if(show) drawBubble(ox,oy,ag.bubble,ag.def.accent,ag.atMeet)
        }})
      })
      sprites.sort((a,b)=>a.y-b.y).forEach(sp=>sp.draw())

      // HUD
      if(mt.active&&agRef.current.some(ag=>ag.atMeet)){
        rr(CW-162,10,154,24,4,'rgba(255,200,50,0.92)')
        ctx.strokeStyle='#c08000'; ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(CW-162,10,154,24,4); ctx.stroke()
        ctx.fillStyle='#3a1800'; ctx.font=`bold 11px ${FONT}`; ctx.textAlign='center'
        ctx.fillText('📊 팀 회의 진행 중',CW-85,26); ctx.textAlign='left'
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
