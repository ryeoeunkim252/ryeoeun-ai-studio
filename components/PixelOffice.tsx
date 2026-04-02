'use client'
import { useEffect, useRef } from 'react'
import type { AgentId } from '@/lib/agents'
import { loadData, DEFAULT_SETTINGS, type AppSettings } from '@/lib/store'

interface Props { activeAgentId?: AgentId | null }

const CHARS: Record<string, {
  gender:'M'|'F', hair:string, skin:string,
  top:string, bottom:string, shoe:string,
  hairStyle:string, acc:string, accent:string, label:string
}> = {
  router:  {gender:'M',hair:'#909098',hairStyle:'side',  skin:'#f4c890',top:'#1e3050',bottom:'#121828',shoe:'#0a0a14',acc:'tie',  accent:'#d08888',label:'라우터'},
  web:     {gender:'F',hair:'#1a9aaa',hairStyle:'bob',   skin:'#f4c080',top:'#f8d840',bottom:'#4858a8',shoe:'#283068',acc:'none', accent:'#f8d840',label:'웹 팀'},
  content: {gender:'F',hair:'#3a1808',hairStyle:'long',  skin:'#f8d090',top:'#e85888',bottom:'#281828',shoe:'#140a0a',acc:'ear',  accent:'#e85888',label:'콘텐츠 팀'},
  edu:     {gender:'F',hair:'#141414',hairStyle:'pony',  skin:'#f4c080',top:'#4a8040',bottom:'#283028',shoe:'#141414',acc:'none', accent:'#60a050',label:'교육 팀'},
  research:{gender:'M',hair:'#281808',hairStyle:'messy', skin:'#f4c080',top:'#e8e8e8',bottom:'#284868',shoe:'#182038',acc:'glass',accent:'#4890d8',label:'연구 팀'},
  ops:     {gender:'M',hair:'#0a0a0a',hairStyle:'short', skin:'#c89068',top:'#284828',bottom:'#181e18',shoe:'#080808',acc:'head', accent:'#4a9a4a',label:'운영 팀'},
}

// 색상 팔레트 - 따뜻하고 아늑한 카페/방꾸미기 감성
const C = {
  bg: '#0d0d1a',
  // 바닥 타일 (연한 회색 - 레퍼런스 기반)
  fl1:'#c0c0b8', fl2:'#b0b0a8', flg:'#d0d0c8',
  // 벽
  wall:'#a09880', wallD:'#888070', wallT:'#c0b090',
  // 나무 책상 (따뜻한 갈색)
  dsk:'#d4aa60', dskD:'#b08840', dskF:'#886420', dskH:'#f0cc80',
  // 의자
  ch1:'#8878a8', ch2:'#786898', ch3:'#987890',
  // 소파 (딥 레드)
  sf:'#c03060', sfL:'#e04878', sfD:'#882040', sfA:'#601030',
  // 책장
  shf:'#784828', shfL:'#986040', shfD:'#583018',
  // 화분
  plt1:'#50cc50', plt2:'#308830', plt3:'#186018',
  pot:'#d06838', potD:'#a04820', potR:'#f09060',
  // 책 색상
  books:['#e83030','#3080e8','#38b038','#e8a020','#9830e8','#e86080','#30a8c8','#e87030'],
  // 모니터
  mon:'#202030', monS:'#182040', monG:'#38cc88',
  // 커피 테이블
  ct:'#c89850', ctD:'#a07030',
  // 액자
  fr:'#d4a030', frD:'#a07820',
  // 아이템 (책상 위 소품)
  cup:'#e88060', cupH:'#f0a080',
  book1:'#e84040', book2:'#4080e0',
}

export default function PixelOffice({ activeAgentId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tickRef = useRef(0)
  const activeRef = useRef<AgentId|null|undefined>(null)
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS)

  useEffect(()=>{ activeRef.current = activeAgentId },[activeAgentId])
  useEffect(()=>{ settingsRef.current = loadData<AppSettings>('nk_settings',DEFAULT_SETTINGS) },[])

  useEffect(()=>{
    const cv = canvasRef.current; if(!cv) return
    const ctx = cv.getContext('2d')!
    const r = (x:number,y:number,w:number,h:number,c:string) => {
      ctx.fillStyle=c; ctx.fillRect(x,y,w,h)
    }
    const rl = (x1:number,y1:number,x2:number,y2:number,c:string,lw=1) => {
      ctx.strokeStyle=c; ctx.lineWidth=lw; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke()
    }

    /* ─── 바닥 타일 ─── */
    const drawFloor = (fx:number,fy:number,fw:number,fh:number) => {
      const T=28
      for(let row=0; row*T<fh+T; row++) for(let col=0; col*T<fw+T; col++){
        const tx=fx+col*T, ty=fy+row*T
        const tw=Math.min(T,fx+fw-tx), th=Math.min(T,fy+fh-ty)
        if(tw>0&&th>0) r(tx,ty,tw,th,(row+col)%2===0?C.fl1:C.fl2)
      }
      ctx.strokeStyle=C.flg; ctx.lineWidth=0.7
      for(let i=0;i*T<=fw;i++) rl(fx+i*T,fy,fx+i*T,fy+fh,C.flg,0.7)
      for(let i=0;i*T<=fh;i++) rl(fx,fy+i*T,fx+fw,fy+i*T,C.flg,0.7)
    }

    /* ─── 방 ─── */
    const drawRoom = (rx:number,ry:number,rw:number,rh:number) => {
      // 외벽
      r(rx-5,ry-5,rw+10,rh+10,'#383028')
      // 뒷벽 (따뜻한 베이지)
      r(rx,ry,rw,56,C.wall)
      // 벽 몰딩
      r(rx,ry,rw,6,C.wallT)
      r(rx,ry+50,rw,6,C.wallD)
      // 측벽
      r(rx,ry+56,12,rh-56,C.wallD)
      r(rx+rw-12,ry+56,12,rh-56,C.wallD)
      // 바닥
      drawFloor(rx+12,ry+56,rw-24,rh-56)
      // 바닥-벽 그림자
      const g=ctx.createLinearGradient(0,ry+56,0,ry+82)
      g.addColorStop(0,'rgba(0,0,0,0.35)'); g.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle=g; ctx.fillRect(rx+12,ry+56,rw-24,26)
    }

    /* ─── 책장 ─── */
    const drawShelf = (x:number,y:number,w:number) => {
      r(x,y,w,34,C.shf)
      r(x,y,w,5,C.shfL)
      r(x,y+29,w,5,C.shfD)
      r(x,y,4,34,C.shfD)
      r(x+w-4,y,4,34,C.shfD)
      let bx=x+5, bi=0
      while(bx+9<x+w-5){
        const bh=16+(bi%4)*2
        r(bx,y+6,8,bh,C.books[bi%C.books.length])
        r(bx,y+6,1,bh,'rgba(255,255,255,0.3)')
        r(bx+7,y+6,1,bh,'rgba(0,0,0,0.15)')
        bx+=9; bi++
      }
    }

    /* ─── 시계 ─── */
    const drawClock = (x:number,y:number,t:number) => {
      ctx.fillStyle='#f5f0e0'; ctx.beginPath(); ctx.arc(x,y,13,0,Math.PI*2); ctx.fill()
      ctx.strokeStyle='#888070'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x,y,13,0,Math.PI*2); ctx.stroke()
      const m=t*0.013, s=t*0.8
      ctx.strokeStyle='#222'; ctx.lineWidth=2; ctx.lineCap='round'
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+Math.cos(m-Math.PI/2)*9,y+Math.sin(m-Math.PI/2)*9); ctx.stroke()
      ctx.strokeStyle='#c03030'; ctx.lineWidth=1
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+Math.cos(s-Math.PI/2)*11,y+Math.sin(s-Math.PI/2)*11); ctx.stroke()
    }

    /* ─── 책상 (그림자+입체감) ─── */
    const drawDesk = (x:number,y:number,w=66,h=38) => {
      // 그림자
      ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.fillRect(x+5,y+h+4,w-2,6)
      // 상판
      r(x,y,w,h,C.dsk)
      r(x,y,w,4,C.dskH)    // 하이라이트
      r(x,y,3,h,C.dskH)    // 왼쪽 하이라이트
      r(x,y+h-4,w,4,C.dskF) // 앞면 그림자
      r(x,y,3,h,C.dskH)
      r(x+w-3,y,3,h,C.dskD)
      r(x,y,w,3,C.dskH)
      // 앞면 두께
      r(x,y+h,w,8,C.dskD)
      r(x,y+h,w,3,C.dskF)
      // 다리
      r(x+6,y+h+8,6,16,C.dskD); r(x+w-12,y+h+8,6,16,C.dskD)
      r(x+6,y+h+22,w-12,4,C.dskD)
    }

    /* ─── 모니터 ─── */
    const drawMonitor = (x:number,y:number,t:number) => {
      const p=0.5+Math.sin(t)*0.15
      // 본체
      r(x,y,32,24,C.mon)
      r(x+2,y+2,28,20,'#14182a')
      // 화면
      r(x+3,y+3,26,16,C.monS)
      ctx.globalAlpha=p*0.85
      r(x+4,y+4,12,3,C.monG)
      r(x+4,y+9,22,2,'#88c0e0')
      r(x+4,y+13,16,2,C.monG)
      ctx.globalAlpha=1
      // 받침
      r(x+12,y+24,8,6,C.mon)
      r(x+8,y+30,16,3,'#14182a')
    }

    /* ─── 의자 (입체감) ─── */
    const drawChair = (x:number,y:number,col:string) => {
      const bright = col + 'cc'
      // 그림자
      ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.fillRect(x+3,y+34,22,5)
      // 등받이
      r(x,y,28,6,col); r(x+2,y+2,24,4,bright)
      r(x,y+6,4,20,col); r(x+24,y+6,4,20,col)
      // 시트
      r(x,y+6,28,20,col)
      r(x+2,y+8,24,5,bright)
      // 다리
      r(x+4,y+26,5,14,'#706060'); r(x+19,y+26,5,14,'#706060')
      r(x+4,y+38,19,4,'#605050')
    }

    /* ─── 화분 (크고 귀엽게) ─── */
    const drawPlant = (x:number,y:number,big=false) => {
      const s = big ? 1.5 : 1.0
      const pw=Math.round(22*s), ph=Math.round(20*s)
      const px2=x+Math.round(3*s), py2=y+Math.round(28*s)
      ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.fillRect(x-2,y+Math.round(48*s),Math.round(30*s),6)
      r(px2,py2,pw,ph,C.pot)
      r(px2,py2,pw,4,C.potR)
      r(px2,py2+ph-5,pw,5,C.potD)
      r(px2+2,py2+2,pw-4,4,'rgba(255,200,160,0.2)')
      // 흙
      r(px2+2,py2+3,pw-4,5,'#2a1808')
      // 줄기
      r(px2+Math.round(8*s),y+Math.round(10*s),4,Math.round(20*s),'#286020')
      // 잎 (풍성하게)
      r(x,y,Math.round(20*s),Math.round(16*s),C.plt2)
      r(x,y,Math.round(17*s),Math.round(10*s),C.plt1)
      r(x+Math.round(10*s),y-Math.round(5*s),Math.round(18*s),Math.round(18*s),C.plt2)
      r(x+Math.round(11*s),y-Math.round(5*s),Math.round(15*s),Math.round(11*s),C.plt1)
      r(x+Math.round(4*s),y-Math.round(8*s),Math.round(14*s),Math.round(20*s),C.plt1)
      r(x+Math.round(5*s),y-Math.round(8*s),Math.round(12*s),Math.round(9*s),'#70e070')
      r(x+Math.round(2*s),y+Math.round(18*s),Math.round(10*s),Math.round(8*s),C.plt3)
      r(x+Math.round(14*s),y+Math.round(15*s),Math.round(8*s),Math.round(6*s),C.plt3)
    }

    /* ─── 소파 (입체감) ─── */
    const drawSofa = (x:number,y:number,w=72) => {
      ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.fillRect(x+5,y+48,w-6,7)
      r(x,y,w,10,C.sfA)    // 등받이 어두운
      r(x+3,y+2,w-6,6,C.sfD)
      r(x,y+10,w,34,C.sf)  // 시트
      r(x+3,y+12,w-6,8,C.sfL) // 하이라이트
      r(x,y+44,w,10,C.sfA) // 앞 받침
      r(x,y+10,10,34,C.sfD)  // 왼팔
      r(x+w-10,y+10,10,34,C.sfD) // 오른팔
      r(x+1,y+11,4,30,'rgba(255,255,255,0.1)') // 광택
    }

    const drawCoffeeTable = (x:number,y:number,w=62,h=40) => {
      ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.fillRect(x+5,y+h+5,w-6,7)
      r(x,y,w,h,C.ct)
      r(x,y,w,4,C.ctD.replace('#','#').slice(0,7)+'ff') // 테두리
      r(x+3,y+3,w-6,6,'rgba(255,220,120,0.3)')
      r(x,y,3,h,C.ctD); r(x+w-3,y,3,h,C.ctD)
      r(x,y+h,w,8,C.ctD)
      r(x+10,y+h+8,8,14,C.ctD); r(x+w-18,y+h+8,8,14,C.ctD)
    }

    /* ─── 액자 ─── */
    const drawFrame = (x:number,y:number,ci:number) => {
      const arts=['#3060b8','#a02040','#206040','#907030']
      r(x,y,32,24,C.fr)
      r(x+3,y+3,26,18,C.frD)
      r(x+4,y+4,24,16,arts[ci%arts.length])
      r(x+5,y+5,10,6,'rgba(255,255,255,0.2)')
    }

    /* ─── 책상 위 소품 ─── */
    const drawDeskItems = (x:number,y:number,type:number) => {
      if(type===0){ // 커피컵
        r(x,y+2,10,10,C.cup)
        r(x+1,y+2,8,3,C.cupH)
        r(x+10,y+4,3,4,'rgba(255,255,255,0.3)')
        // 커피 내용물
        r(x+2,y+3,6,3,'#3a1a08')
      } else if(type===1){ // 책 2권
        r(x,y,5,12,C.book1); r(x+6,y+2,5,10,C.book2)
        r(x,y,1,12,'rgba(255,255,255,0.25)')
      } else if(type===2){ // 화분 미니
        r(x+2,y+6,8,8,'#d06030')
        r(x+5,y,5,8,'#40a040')
        r(x+3,y+1,3,6,'#50c050')
      }
    }

    /* ─── 캐릭터 (더 크고 귀엽게, 방꾸미기 감성) ─── */
    const drawChar = (
      px:number, py:number, charId:string,
      walking:boolean, frame:number,
      highlight:boolean, name:string,
      showBubble:boolean, bubbleText:string,
      sitting=false
    ) => {
      const ch = CHARS[charId]||CHARS.router
      const iF = ch.gender==='F'

      if(highlight){
        ctx.fillStyle=ch.accent+'55'
        ctx.beginPath(); ctx.arc(px+14,py+22,20,0,Math.PI*2); ctx.fill()
      }
      // 그림자
      ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.fillRect(px+2,py+52,22,5)

      // ── 머리카락 ──
      const drawH=()=>{
        if(ch.hairStyle==='side'){
          r(px+3,py,20,7,ch.hair); r(px+2,py+3,5,10,ch.hair); r(px+21,py+3,4,10,ch.hair)
        } else if(ch.hairStyle==='bob'){
          r(px+2,py,22,9,ch.hair); r(px+2,py+7,5,16,ch.hair); r(px+19,py+7,5,16,ch.hair)
          r(px+3,py,20,4,ch.hair)
        } else if(ch.hairStyle==='long'){
          r(px+2,py,22,8,ch.hair); r(px+2,py+7,5,28,ch.hair); r(px+19,py+7,5,28,ch.hair)
          r(px+3,py+32,4,10,ch.hair); r(px+19,py+32,4,10,ch.hair)
        } else if(ch.hairStyle==='pony'){
          r(px+3,py,20,8,ch.hair); r(px+19,py+7,5,10,ch.hair); r(px+2,py+7,5,8,ch.hair)
          r(px+22,py+12,9,22,ch.hair); r(px+22,py+12,3,3,'#d08888')
        } else if(ch.hairStyle==='messy'){
          r(px+2,py-3,22,12,ch.hair); r(px+1,py-5,8,8,ch.hair); r(px+17,py-4,9,7,ch.hair)
          r(px+2,py+7,4,10,ch.hair); r(px+20,py+7,4,10,ch.hair)
        } else { // short
          r(px+3,py,20,7,ch.hair); r(px+3,py+5,4,6,ch.hair); r(px+19,py+5,4,6,ch.hair)
        }
      }
      drawH()

      // ── 얼굴 (더 크게: 22×20px) ──
      r(px+3,py+7,22,20,ch.skin)
      // 눈
      if(iF){
        r(px+7,py+13,5,5,'#181020'); r(px+16,py+13,5,5,'#181020')
        r(px+6,py+12,7,3,'#181020') // 속눈썹
        r(px+15,py+12,7,3,'#181020')
        r(px+8,py+15,2,1,'#fff'); r(px+17,py+15,2,1,'#fff')
        // 볼터치
        ctx.globalAlpha=0.35; ctx.fillStyle='#ffaaaa'
        ctx.fillRect(px+4,py+18,5,4); ctx.fillRect(px+19,py+18,5,4); ctx.globalAlpha=1
        // 입술
        r(px+10,py+22,8,3,'#d85878'); r(px+11,py+23,6,2,'#f070a0')
      } else {
        r(px+7,py+13,5,5,'#181828'); r(px+16,py+13,5,5,'#181828')
        r(px+8,py+15,2,1,'#fff'); r(px+17,py+15,2,1,'#fff')
        r(px+10,py+22,8,2,ch.skin.replace('f4','d8').replace('f8','d8'))
      }
      // 코
      r(px+13,py+19,2,2,ch.skin.replace('f4','c8').replace('f8','c8'))

      // 안경
      if(ch.acc==='glass'){
        ctx.strokeStyle='#303048'; ctx.lineWidth=1.2
        ctx.strokeRect(px+6,py+12,7,7); ctx.strokeRect(px+15,py+12,7,7)
        ctx.beginPath(); ctx.moveTo(px+13,py+15); ctx.lineTo(px+15,py+15); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(px+5,py+14); ctx.lineTo(px+5,py+12); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(px+22,py+14); ctx.lineTo(px+24,py+12); ctx.stroke()
      }
      // 헤드셋
      if(ch.acc==='head'){
        ctx.strokeStyle='#202020'; ctx.lineWidth=2
        ctx.beginPath(); ctx.arc(px+14,py+10,12,Math.PI,0,false); ctx.stroke()
        r(px+1,py+8,4,8,'#2a2a2a'); r(px+23,py+8,4,8,'#2a2a2a')
        r(px+1,py+14,5,6,'#383838')
      }
      // 귀걸이
      if(ch.acc==='ear'){
        r(px+1,py+17,3,3,'#f8d020'); r(px+1,py+20,3,6,'#f8d020')
        r(px+24,py+17,3,3,'#f8d020'); r(px+24,py+20,3,6,'#f8d020')
      }
      // 넥타이
      if(ch.acc==='tie'){
        r(px+12,py+30,5,16,ch.accent); r(px+11,py+30,7,4,ch.accent)
        r(px+13,py+28,3,4,'rgba(255,255,255,0.3)')
      }

      // 몸/상의
      r(px+3,py+27,22,16,ch.top)
      if(iF){
        r(px+4,py+27,20,3,'rgba(255,255,255,0.25)')
      } else {
        r(px+3,py+27,3,16,ch.top); r(px+22,py+27,3,16,ch.top)
      }

      if(sitting){
        r(px+4,py+43,20,14,ch.bottom)
        drawLabel(px+14,py,name,highlight,ch.accent)
        if(showBubble) drawBubble(px+14,py,bubbleText,ch.accent)
        return
      }

      // 다리 (걸음 애니메이션)
      const lo=walking?(frame===1?4:frame===3?-4:0):0
      r(px+4,py+43,9,14,ch.bottom); r(px+15,py+43-lo,9,14,ch.bottom)
      r(px+4,py+57,9,6,ch.shoe); r(px+15,py+57-lo,9,6,ch.shoe)
      // 팔
      if(walking){
        r(px+0,py+29,4,12,ch.top); r(px+24,py+29,4,12,ch.top)
      } else {
        r(px+0,py+29,4,10,ch.top); r(px+24,py+29,4,10,ch.top)
      }
      drawLabel(px+14,py,name,highlight,ch.accent)
      if(showBubble) drawBubble(px+14,py,bubbleText,ch.accent)
    }

    /* ─── 이름표 (크고 선명하게!) ─── */
    const drawLabel = (cx2:number,cy:number,name:string,active:boolean,color:string) => {
      const bob=Math.sin(tickRef.current*2)*2, by=cy+bob-28
      ctx.font='bold 11px "Jua", monospace'
      const tw=ctx.measureText(name).width+14
      // 배경
      ctx.fillStyle=active?color:'rgba(20,14,40,0.92)'
      ctx.strokeStyle=active?'#ffffff':'rgba(255,255,255,0.5)'
      ctx.lineWidth=1.5
      ctx.beginPath(); ctx.roundRect(cx2-tw/2,by,tw,16,5); ctx.fill(); ctx.stroke()
      // 텍스트
      ctx.fillStyle='#ffffff'
      ctx.font='bold 11px "Jua", monospace'
      ctx.textAlign='center'
      ctx.fillText(name,cx2,by+12)
      ctx.textAlign='left'
    }

    /* ─── 말풍선 ─── */
    const drawBubble = (bx:number,by:number,text:string,color:string) => {
      const bob=Math.sin(tickRef.current*2.5)*2, finalY=by+bob-50
      ctx.font='10px "Jua", monospace'
      const tw=ctx.measureText(text).width+16
      ctx.fillStyle='rgba(255,255,255,0.96)'; ctx.strokeStyle=color; ctx.lineWidth=1.5
      ctx.beginPath(); ctx.roundRect(bx-tw/2,finalY,tw,20,6); ctx.fill(); ctx.stroke()
      ctx.fillStyle='rgba(255,255,255,0.96)'; ctx.beginPath()
      ctx.moveTo(bx-5,finalY+20); ctx.lineTo(bx+5,finalY+20); ctx.lineTo(bx,finalY+28); ctx.fill()
      ctx.fillStyle='#1a1030'
      ctx.font='bold 10px "Jua", monospace'
      ctx.textAlign='center'; ctx.fillText(text,bx,finalY+14); ctx.textAlign='left'
    }

    // 걸어다니는 캐릭터
    type Dir = 'front'|'left'|'right'
    const walkers:[number,number,number,number,string,number,number,Dir][] = [
      [80,250,220,290,'research',0,0.85,'front'],
      [320,270,90,240,'ops',0,0.95,'front'],
    ]

    const BUBBLE:Record<string,string> = {
      router:'업무 배분 중',  web:'디자인 작업 ✏',
      content:'콘텐츠 작성',  edu:'교육 준비 📚',
      research:'데이터 분석', ops:'시스템 점검',
    }

    const CHAIR_COLORS=['#7868a8','#688898','#988870','#809870']

    const SEATS = [
      {x:46, y:240,charId:'router', dw:68},
      {x:165,y:228,charId:'web',    dw:68},
      {x:46, y:318,charId:'content',dw:68},
      {x:165,y:318,charId:'edu',    dw:68},
    ]

    let animId:number

    const loop = () => {
      tickRef.current += 0.04
      const t = tickRef.current
      const active = activeRef.current
      const s = settingsRef.current

      ctx.fillStyle=C.bg; ctx.fillRect(0,0,cv.width,cv.height)

      /* ─── 방1: 오피스 ─── */
      const R1 = {x:4,y:4,w:366,h:388}
      drawRoom(R1.x,R1.y,R1.w,R1.h)
      drawShelf(R1.x+14,R1.y+8,162)
      drawShelf(R1.x+188,R1.y+8,162)
      drawClock(R1.x+R1.w/2-1,R1.y+28,t)
      drawPlant(R1.x+12,R1.y+60,true)
      drawPlant(R1.x+R1.w-48,R1.y+60,false)

      // 앉은 캐릭터 + 책상
      SEATS.forEach(({x,y,charId,dw},i)=>{
        const isActive = active===charId
        const name = s.agentNames?.[charId]||CHARS[charId].label
        drawChair(x+dw+5,y-2,CHAIR_COLORS[i])
        drawDesk(x,y,dw,38)
        drawMonitor(x+dw/2-4,y-34,t*(1.1+i*0.13))
        drawDeskItems(x+4,y+4,i%3)
        const bob=Math.sin(t*1.7+i*0.9)*0.8
        drawChar(x+dw/2-14,y-5+bob,charId,false,0,isActive,name,isActive,BUBBLE[charId],true)
      })

      // 걷는 캐릭터 (research, ops)
      walkers.forEach((w,i)=>{
        const [, ,tx,ty,charId] = w
        let [wx,wy,,,,frame,spd] = w
        const dx=tx-wx, dy=ty-wy, dist=Math.sqrt(dx*dx+dy*dy)
        if(dist>2){
          w[0]+=dx/dist*(spd as number); w[1]+=dy/dist*(spd as number)*0.65
          w[5]=Math.floor(t*5)%4
        } else {
          w[2]=R1.x+20+Math.random()*300; w[3]=R1.y+70+Math.random()*270; w[5]=0
        }
        const isActive = active===charId
        const name = s.agentNames?.[charId]||CHARS[charId].label
        drawChar(Math.round(w[0]),Math.round(w[1]),charId,true,w[5],isActive,name,isActive,BUBBLE[charId])
      })

      /* ─── 방2: 미팅룸 ─── */
      const R2 = {x:376,y:4,w:238,h:388}
      drawRoom(R2.x,R2.y,R2.w,R2.h)
      drawFrame(R2.x+18,R2.y+12,0)
      drawFrame(R2.x+110,R2.y+12,1)
      drawFrame(R2.x+186,R2.y+12,2)
      drawPlant(R2.x+12,R2.y+62,true)
      drawPlant(R2.x+R2.w-46,R2.y+62,false)
      // 소파 배치
      drawSofa(R2.x+14,R2.y+84,84)
      drawSofa(R2.x+118,R2.y+84,84)
      drawSofa(R2.x+60,R2.y+270,100)
      drawCoffeeTable(R2.x+76,R2.y+160)
      // ops 미팅룸 앉음
      {
        const isActive=active==='ops'
        const name=s.agentNames?.ops||CHARS.ops.label
        const bob=Math.sin(t*1.4)*0.7
        drawChar(R2.x+68,R2.y+110+bob,'ops',false,0,isActive,name,isActive,BUBBLE.ops)
      }

      animId=requestAnimationFrame(loop)
    }
    animId=requestAnimationFrame(loop)
    return ()=>cancelAnimationFrame(animId)
  },[])

  return (
    <canvas ref={canvasRef} width={618} height={396}
      style={{
        imageRendering:'pixelated', display:'block', maxWidth:'100%',
        borderRadius:'10px', border:'1px solid #ede5e0',
        boxShadow:'0 4px 20px rgba(32,16,24,0.15)'
      }}
    />
  )
}
