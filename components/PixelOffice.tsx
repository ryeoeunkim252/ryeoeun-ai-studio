'use client'
import { useEffect, useRef } from 'react'
import type { AgentId } from '@/lib/agents'
import { loadData, DEFAULT_SETTINGS, type AppSettings } from '@/lib/store'

interface Props { activeAgentId?: AgentId | null }

type CharDef = { gender:'M'|'F'; hair:string; skin:string; top:string; bottom:string; shoe:string; hairStyle:string; acc:string; accent:string; label:string }

const CHARS: Record<string, CharDef> = {
  router:  {gender:'M',hair:'#b8b8c0',hairStyle:'side',  skin:'#f4c890',top:'#1e3a5f',bottom:'#111828',shoe:'#080810',acc:'tie',  accent:'#e08888',label:'총괄실장'},
  web:     {gender:'F',hair:'#18a8c0',hairStyle:'bob',   skin:'#f4c080',top:'#f8d838',bottom:'#4050a8',shoe:'#202860',acc:'none', accent:'#f8d838',label:'웹 팀'},
  content: {gender:'F',hair:'#482010',hairStyle:'long',  skin:'#f8d090',top:'#e05080',bottom:'#281020',shoe:'#140808',acc:'ear',  accent:'#e05080',label:'콘텐츠 팀'},
  edu:     {gender:'F',hair:'#141414',hairStyle:'pony',  skin:'#f4c080',top:'#488038',bottom:'#202818',shoe:'#101210',acc:'none', accent:'#58a048',label:'교육 팀'},
  research:{gender:'M',hair:'#302010',hairStyle:'messy', skin:'#f4c080',top:'#e0e0e0',bottom:'#284060',shoe:'#182030',acc:'glass',accent:'#4888d0',label:'연구 팀'},
  ops:     {gender:'M',hair:'#0a0a0a',hairStyle:'short', skin:'#c88858',top:'#286828',bottom:'#181a18',shoe:'#060806',acc:'head', accent:'#48a048',label:'운영 팀'},
}
const CUSTOM_PAL: Omit<CharDef,'label'>[] = [
  {gender:'F',hair:'#c838a8',hairStyle:'bob',   skin:'#f4c080',top:'#4040c0',bottom:'#282050',shoe:'#181030',acc:'ear',  accent:'#6060e0'},
  {gender:'M',hair:'#408858',hairStyle:'messy', skin:'#c88858',top:'#b83028',bottom:'#281818',shoe:'#100808',acc:'none', accent:'#d04838'},
  {gender:'F',hair:'#d08820',hairStyle:'long',  skin:'#f8d090',top:'#208858',bottom:'#182018',shoe:'#081008',acc:'none', accent:'#28b068'},
  {gender:'M',hair:'#4060b8',hairStyle:'side',  skin:'#f4c890',top:'#786020',bottom:'#181408',shoe:'#080808',acc:'glass',accent:'#c09028'},
]
const getCustomChar=(id:string)=>({...CUSTOM_PAL[id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%CUSTOM_PAL.length],label:''})
type CT={id:string;icon:string;name:string;role:string;desc:string}

type AgSt={x:number;y:number;sx:number;sy:number;state:'sitting'|'walking';frame:number;walkTimer:number;tx:number;ty:number;walksLeft:number}

const C={
  bg:'#0d0d1a',
  fl0:'#c4c0b4',fl1:'#b4b0a4',flg:'rgba(0,0,0,0.08)',
  wl:'#a09880',wlL:'#b8a888',wlD:'#807868',wlT:'#c8b080',
  brd:'#3a2a18',
  sf:'#7c5828',sfL:'#9c7038',sfD:'#5c3818',
  bks:['#e83030','#3880f0','#38a838','#e8a028','#9830e8','#f05880','#30a8c0','#f07030'],
  dk:'#c89040',dkL:'#e0a850',dkD:'#a07030',dkF:'#785018',
  mn:'#1a1828',mnG:'#38c880',
  so:'#b82858',soL:'#d84070',soD:'#782038',
  mt:'#6a4818',mtL:'#9a6828',mtD:'#4a2e08',
  wb:'#f0f0e8',wbB:'#807868',
  pt:'#c05828',ptL:'#e07040',ptD:'#902810',
  g0:'#50c050',g1:'#308030',g2:'#186018',
}

export default function PixelOffice({activeAgentId}:Props){
  const cvRef=useRef<HTMLCanvasElement>(null)
  const tick=useRef(0)
  const actRef=useRef<AgentId|null|undefined>(null)
  const setRef=useRef<AppSettings>(DEFAULT_SETTINGS)
  const ctRef=useRef<CT[]>([])
  const stRef=useRef<Record<string,AgSt>>({})

  useEffect(()=>{actRef.current=activeAgentId},[activeAgentId])
  useEffect(()=>{
    setRef.current=loadData<AppSettings>('nk_settings',DEFAULT_SETTINGS)
    ctRef.current=loadData<CT[]>('nk_custom_teams',[])
  },[])

  useEffect(()=>{
    const canvas=cvRef.current;if(!canvas)return
    const ctx=canvas.getContext('2d')!

    const r=(x:number,y:number,w:number,h:number,c:string)=>{if(w>0&&h>0){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}}
    const ln=(x1:number,y1:number,x2:number,y2:number,c:string,lw=1)=>{ctx.strokeStyle=c;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}

    // ── 타일 바닥 (참고 이미지 스타일) ──────────────
    const drawTileFloor=(fx:number,fy:number,fw:number,fh:number)=>{
      const T=22
      for(let row=0;row*T<fh+T;row++)for(let col=0;col*T<fw+T;col++){
        const tx=fx+col*T,ty=fy+row*T
        const tw=Math.min(T,fx+fw-tx),th=Math.min(T,fy+fh-ty)
        if(tw>0&&th>0) r(tx,ty,tw,th,(row+col)%2===0?C.fl0:C.fl1)
      }
      ctx.strokeStyle=C.flg;ctx.lineWidth=0.6
      for(let i=0;i*(T)<fw+T;i++) ln(fx+i*T,fy,fx+i*T,fy+fh,C.flg,0.6)
      for(let i=0;i*(T)<fh+T;i++) ln(fx,fy+i*T,fx+fw,fy+i*T,C.flg,0.6)
    }

    // ── 방 ──────────────────────────────────────────
    const drawRoom=(rx:number,ry:number,rw:number,rh:number)=>{
      r(rx-5,ry-5,rw+10,rh+10,C.brd)
      r(rx,ry,rw,50,C.wl);r(rx,ry,rw,5,C.wlT);r(rx,ry+44,rw,6,C.wlD)
      r(rx,ry+50,12,rh-50,C.wlD);r(rx+rw-12,ry+50,12,rh-50,C.wlD)
      drawTileFloor(rx+12,ry+50,rw-24,rh-50)
      const g=ctx.createLinearGradient(0,ry+50,0,ry+72)
      g.addColorStop(0,'rgba(0,0,0,0.28)');g.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle=g;ctx.fillRect(rx+12,ry+50,rw-24,22)
    }

    // ── 책장 ────────────────────────────────────────
    const drawShelf=(x:number,y:number,w:number)=>{
      r(x,y,w,32,C.sf);r(x,y,w,4,C.sfL);r(x,y+28,w,4,C.sfD)
      r(x,y,4,32,C.sfD);r(x+w-4,y,4,32,C.sfD)
      let bx=x+5,bi=0
      while(bx+8<x+w-5){
        const bh=12+(bi%5)*3
        r(bx,y+4,7,bh,C.bks[bi%C.bks.length])
        r(bx,y+4,1,bh,'rgba(255,255,255,0.3)');r(bx+6,y+4,1,bh,'rgba(0,0,0,0.2)')
        bx+=8;bi++
      }
    }

    // ── 시계 ────────────────────────────────────────
    const drawClock=(x:number,y:number,t:number)=>{
      r(x-16,y-16,32,32,'#302818')
      ctx.fillStyle=C.wb;ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.fill()
      ctx.strokeStyle='#a09070';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.stroke()
      ctx.strokeStyle='#1a1008';ctx.lineWidth=1.8;ctx.lineCap='round'
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(t*0.012-Math.PI/2)*8,y+Math.sin(t*0.012-Math.PI/2)*8);ctx.stroke()
      ctx.strokeStyle='#c02828';ctx.lineWidth=1
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(t*0.72-Math.PI/2)*11,y+Math.sin(t*0.72-Math.PI/2)*11);ctx.stroke()
    }

    // ── 책상 ────────────────────────────────────────
    const drawDesk=(x:number,y:number,w=68,h=38)=>{
      ctx.fillStyle='rgba(0,0,0,0.18)';ctx.fillRect(x+4,y+h+3,w,7)
      r(x,y,w,h,C.dk);r(x,y,w,3,C.dkL);r(x,y,3,h,C.dkL)
      r(x+w-3,y,3,h,C.dkD);r(x,y+h-4,w,4,C.dkF)
      r(x,y+h,w,7,C.dkD);r(x+5,y+h+7,6,14,C.dkD);r(x+w-11,y+h+7,6,14,C.dkD)
      ln(x+w/2,y+4,x+w/2,y+h-5,C.dkD,0.7)
    }

    // ── 의자 ────────────────────────────────────────
    const drawChair=(x:number,y:number,col:string)=>{
      ctx.fillStyle='rgba(0,0,0,0.14)';ctx.fillRect(x+2,y+32,24,4)
      r(x,y,28,5,col);r(x+2,y+1,24,3,col+'dd')
      r(x,y+5,3,18,col);r(x+25,y+5,3,18,col)
      r(x,y+5,28,18,col);r(x+2,y+7,24,5,col+'ee')
      r(x+3,y+23,5,12,'#686060');r(x+20,y+23,5,12,'#686060')
      r(x+3,y+33,22,3,'#585050')
    }

    // ── 모니터 ──────────────────────────────────────
    const drawMonitor=(x:number,y:number,t:number,i:number)=>{
      const p=0.55+Math.sin(t+i*0.7)*0.18
      r(x+11,y+24,12,5,C.mn);r(x+8,y+29,18,3,'#0e0e1a')
      r(x,y,32,26,C.mn);r(x+2,y+2,28,22,'#0e0e1a')
      r(x+3,y+3,26,18,C.mn)
      ctx.globalAlpha=p*0.88;r(x+4,y+4,12,3,C.mnG);r(x+4,y+9,22,2,'#78b8e0');r(x+4,y+13,16,2,C.mnG);ctx.globalAlpha=1
      ctx.fillStyle='rgba(255,255,255,0.04)';ctx.fillRect(x+3,y+3,26,8)
    }

    // ── 화분 ────────────────────────────────────────
    const drawPlant=(x:number,y:number,s=1.0)=>{
      const sc=(n:number)=>Math.round(n*s)
      ctx.fillStyle='rgba(0,0,0,0.18)';ctx.fillRect(x,y+sc(44),sc(26),5)
      const px2=x+sc(3),py2=y+sc(26)
      r(px2,py2,sc(20),sc(18),C.pt);r(px2,py2,sc(20),4,C.ptL);r(px2,py2+sc(14),sc(20),4,C.ptD)
      r(px2+2,py2+3,sc(16),5,'#1e1005')
      r(px2+sc(7),y+sc(10),3,sc(18),'#246014')
      r(x,y,sc(18),sc(14),C.g1);r(x,y,sc(15),sc(9),C.g0)
      r(x+sc(9),y-sc(5),sc(16),sc(16),C.g1);r(x+sc(10),y-sc(5),sc(13),sc(10),C.g0)
      r(x+sc(3),y-sc(8),sc(12),sc(18),C.g0);r(x+sc(4),y-sc(8),sc(10),sc(8),'#78e078')
    }

    // ── 캐릭터 (개선된 RPG 스타일) ──────────────────
    const drawHair=(px:number,py:number,ch:CharDef)=>{
      const hw=ch.hair
      if(ch.hairStyle==='side'){
        r(px+2,py-1,18,6,hw);r(px+1,py+2,4,9,hw);r(px+18,py+2,4,9,hw);r(px+2,py-1,8,3,'rgba(255,255,255,0.15)')
      } else if(ch.hairStyle==='bob'){
        r(px+2,py-1,18,8,hw);r(px+1,py+6,5,13,hw);r(px+16,py+6,5,13,hw);r(px+3,py-1,14,4,hw)
      } else if(ch.hairStyle==='long'){
        r(px+2,py-1,18,7,hw);r(px+1,py+6,4,24,hw);r(px+17,py+6,4,24,hw)
        r(px+2,py+28,4,8,hw);r(px+16,py+28,4,8,hw)
      } else if(ch.hairStyle==='pony'){
        r(px+2,py-1,18,7,hw);r(px+17,py+5,5,9,hw);r(px+2,py+5,4,7,hw)
        r(px+20,py+10,7,18,hw);r(px+22,py+15,4,5,'#d08880')
      } else if(ch.hairStyle==='messy'){
        r(px+2,py-3,18,10,hw);r(px,py-5,7,7,hw);r(px+15,py-4,8,6,hw)
        r(px+2,py+6,3,9,hw);r(px+17,py+6,3,9,hw);r(px+22,py-2,4,5,hw)
      } else {
        r(px+2,py-1,18,6,hw);r(px+2,py+4,4,5,hw);r(px+16,py+4,4,5,hw)
      }
    }

    const drawCharSprite=(px:number,py:number,ch:CharDef,frame:number,sitting:boolean)=>{
      const iF=ch.gender==='F'
      // 그림자
      ctx.fillStyle='rgba(0,0,0,0.2)';ctx.beginPath();ctx.ellipse(px+11,py+(sitting?30:28),9,3.5,0,0,Math.PI*2);ctx.fill()
      if(!sitting){
        // 발 (걷기 애니메이션)
        const lOff=[0,3,0,-3][frame%4], rOff=[0,-3,0,3][frame%4]
        r(px+3,py+23+lOff,6,5,ch.shoe);r(px+3,py+23+lOff,6,2,'rgba(255,255,255,0.1)')
        r(px+13,py+23+rOff,6,5,ch.shoe);r(px+13,py+23+rOff,6,2,'rgba(255,255,255,0.1)')
        // 다리
        r(px+4,py+15+lOff,5,10,ch.bottom);r(px+13,py+15+rOff,5,10,ch.bottom)
      } else {
        r(px+3,py+22,16,8,ch.bottom)
      }
      // 몸
      r(px+2,py+7,18,10,ch.top);r(px+3,py+7,16,3,ch.top+'ee')
      // 팔
      r(px,py+8,3,8,ch.top);r(px+19,py+8,3,8,ch.top)
      r(px-1,py+15,4,4,ch.skin);r(px+19,py+15,4,4,ch.skin)
      // 넥타이
      if(ch.acc==='tie'){r(px+10,py+17,4,10,ch.accent);r(px+9,py+17,6,3,ch.accent)}
      // 머리
      r(px+2,py,18,12,ch.skin)
      // 얼굴
      if(iF){
        r(px+5,py+3,4,4,'#181028');r(px+13,py+3,4,4,'#181028')
        r(px+5,py+2,5,2,'#181028');r(px+13,py+2,5,2,'#181028')  // 속눈썹
        r(px+6,py+4,1,1,'#fff');r(px+14,py+4,1,1,'#fff')
        ctx.globalAlpha=0.3;ctx.fillStyle='#ff8888';ctx.fillRect(px+3,py+7,4,3);ctx.fillRect(px+15,py+7,4,3);ctx.globalAlpha=1
        r(px+7,py+9,8,2,'#c05870');r(px+8,py+10,6,1,'#e070a0')
      } else {
        r(px+5,py+3,4,4,'#18182a');r(px+13,py+3,4,4,'#18182a')
        r(px+6,py+4,1,1,'#fff');r(px+14,py+4,1,1,'#fff')
        r(px+7,py+9,7,2,ch.skin.replace('f4','d0').replace('f8','d4'))
      }
      r(px+11,py+7,2,2,ch.skin.replace('f4','cc').replace('f8','d0'))
      // 안경
      if(ch.acc==='glass'){
        ctx.strokeStyle='#2a2840';ctx.lineWidth=1.2
        ctx.strokeRect(px+4,py+2,6,6);ctx.strokeRect(px+12,py+2,6,6)
        ctx.beginPath();ctx.moveTo(px+10,py+5);ctx.lineTo(px+12,py+5);ctx.stroke()
        ctx.beginPath();ctx.moveTo(px+3,py+4);ctx.lineTo(px+2,py+2);ctx.stroke()
        ctx.beginPath();ctx.moveTo(px+18,py+4);ctx.lineTo(px+20,py+2);ctx.stroke()
      }
      if(ch.acc==='head'){
        ctx.strokeStyle='#181818';ctx.lineWidth=1.8
        ctx.beginPath();ctx.arc(px+11,py+8,10,Math.PI,0);ctx.stroke()
        r(px+1,py+6,3,7,'#1e1e1e');r(px+18,py+6,3,7,'#1e1e1e')
      }
      if(ch.acc==='ear'){r(px+1,py+5,2,5,'#f8d020');r(px+19,py+5,2,5,'#f8d020')}
      // 머리카락
      drawHair(px,py,ch)
    }

    // ── 이름표 (더 크고 선명하게) ──────────────────
    const drawLabel=(cx:number,cy:number,name:string,active:boolean,color:string)=>{
      const bob=active?Math.sin(tick.current*2.5)*2:0
      const ly=cy+bob-32
      ctx.font='bold 12px "Jua",monospace'
      const tw=ctx.measureText(name).width+16
      // 외곽선 (더 두껍게)
      ctx.fillStyle='rgba(0,0,0,0.95)';ctx.strokeStyle='rgba(0,0,0,0.95)';ctx.lineWidth=3
      ctx.beginPath();ctx.roundRect(cx-tw/2,ly,tw,17,4);ctx.fill();ctx.stroke()
      // 배경
      ctx.fillStyle=active?color:'rgba(20,14,40,0.98)'
      ctx.strokeStyle=active?'rgba(255,255,255,0.9)':'rgba(200,180,255,0.5)'
      ctx.lineWidth=1.5
      ctx.beginPath();ctx.roundRect(cx-tw/2,ly,tw,17,4);ctx.fill();ctx.stroke()
      // 텍스트
      ctx.fillStyle='#ffffff';ctx.font='bold 12px "Jua",monospace'
      ctx.textAlign='center';ctx.fillText(name,cx,ly+13);ctx.textAlign='left'
    }

    // ── 말풍선 ──────────────────────────────────────
    const drawBubble=(cx:number,cy:number,text:string,color:string)=>{
      const bob=Math.sin(tick.current*3)*1.5,by=cy+bob-52
      ctx.font='9px "Jua",monospace'
      const tw=ctx.measureText(text).width+14
      ctx.fillStyle='rgba(255,255,255,0.97)';ctx.strokeStyle=color;ctx.lineWidth=1.5
      ctx.beginPath();ctx.roundRect(cx-tw/2,by,tw,18,5);ctx.fill();ctx.stroke()
      ctx.fillStyle='rgba(255,255,255,0.97)';ctx.beginPath()
      ctx.moveTo(cx-4,by+18);ctx.lineTo(cx+4,by+18);ctx.lineTo(cx,by+25);ctx.fill()
      ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(cx-4,by+18);ctx.lineTo(cx,by+25);ctx.lineTo(cx+4,by+18);ctx.stroke()
      ctx.fillStyle='#100828';ctx.font='bold 9px "Jua",monospace'
      ctx.textAlign='center';ctx.fillText(text,cx,by+13);ctx.textAlign='left'
    }

    // ── 회의 테이블 ─────────────────────────────────
    const drawMeetingTable=(x:number,y:number,w:number,h:number)=>{
      ctx.fillStyle='rgba(0,0,0,0.22)';ctx.fillRect(x+5,y+h+5,w-8,8)
      r(x,y,w,h,C.mt);r(x,y,w,4,C.mtL);r(x+3,y+3,w-6,7,'rgba(255,190,90,0.2)')
      r(x,y,4,h,C.mtL);r(x+w-4,y,4,h,C.mtD);r(x,y+h-4,w,4,C.mtD)
      for(let i=1;i<4;i++) ln(x+i*w/4,y+6,x+i*w/4,y+h-8,C.mtD,0.7)
      // 테이블 아이템
      r(x+18,y+10,10,10,'#d07858');r(x+19,y+10,8,3,'#e09878')
      r(x+w-28,y+10,10,10,'#d07858');r(x+w-27,y+10,8,3,'#e09878')
      ctx.fillStyle='rgba(255,230,100,0.35)';ctx.beginPath();ctx.arc(x+w/2,y+h/2,16,0,Math.PI*2);ctx.fill()
      ctx.strokeStyle='rgba(180,130,30,0.5)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x+w/2,y+h/2,16,0,Math.PI*2);ctx.stroke()
    }

    // ── 회의실 의자 ─────────────────────────────────
    const drawMChair=(x:number,y:number,w:number,h:number,col:string)=>{
      ctx.fillStyle='rgba(0,0,0,0.14)';ctx.fillRect(x+2,y+h+2,w-2,4)
      r(x,y,w,4,col+'cc');r(x,y+4,w,h-4,col);r(x+2,y+6,w-4,3,col+'ee')
    }

    // ── 화이트보드 ──────────────────────────────────
    const drawWhiteboard=(x:number,y:number,w:number,h:number)=>{
      r(x-3,y-3,w+6,h+6,C.wbB);r(x,y,w,h,C.wb);r(x+3,y+3,w-6,h-6,'#f4f4ec')
      const bars=[14,22,10,18,26,8,20]
      bars.forEach((bh,bi)=>{
        const bx=x+6+bi*12,by=y+h-bh-5
        r(bx,by,9,bh,['#4070e8','#d04030','#38a038','#e09028','#8030c8','#28a8b8','#d86030'][bi])
        r(bx,by,9,2,'rgba(255,255,255,0.3)')
      })
      ctx.strokeStyle='rgba(180,60,60,0.6)';ctx.lineWidth=1.5;ctx.beginPath()
      [[x+6,y+h-18],[x+18,y+h-26],[x+30,y+h-16],[x+42,y+h-32],[x+54,y+h-22],[x+66,y+h-36],[x+78,y+h-28]].forEach(([px2,py2],i)=>{
        i===0?ctx.moveTo(px2,py2):ctx.lineTo(px2,py2)
      });ctx.stroke()
      ctx.fillStyle='rgba(0,0,60,0.4)';ctx.font='6px monospace'
      ctx.fillText('Q1  Q2  Q3  Q4',x+6,y+8)
      r(x,y+h,w,5,C.wbB);r(x+3,y+h+1,8,3,'#c03030');r(x+14,y+h+1,8,3,'#808080')
    }

    // ── 소파 ────────────────────────────────────────
    const drawSofa=(x:number,y:number,w:number)=>{
      ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(x+4,y+47,w-6,6)
      r(x,y,w,9,C.soD);r(x+2,y,w-4,7,C.so)
      r(x,y+9,w,32,C.so);r(x+2,y+11,w-4,9,C.soL)
      r(x,y+41,w,9,C.soD)
      r(x,y+9,10,32,C.soD);r(x+w-10,y+9,10,32,C.soD)
      r(x+1,y+10,4,28,'rgba(255,255,255,0.07)')
    }

    const BUBBLE:Record<string,string>={
      router:'업무 배분 중',web:'코드 작성 중',content:'글 쓰는 중',
      edu:'교육 자료 중',research:'분석 중',ops:'서버 점검 중',
    }
    const CHAIR_COLS=['#786898','#607888','#907860','#788858','#806850','#607078']

    // 방 레이아웃
    const R1={x:4,y:4,w:548,h:512}
    const R2={x:558,y:4,w:338,h:512}

    // 책상 위치 (3열 2행)
    const SEAT_DEFS=[
      {x:90, y:155,charId:'router',  dw:72},
      {x:238,y:155,charId:'web',     dw:72},
      {x:386,y:155,charId:'content', dw:72},
      {x:90, y:308,charId:'research',dw:72},
      {x:238,y:308,charId:'edu',     dw:72},
      {x:386,y:308,charId:'ops',     dw:72},
    ]

    // ── 에이전트 상태 초기화 ──────────────────────────
    SEAT_DEFS.forEach(({x,y,charId,dw})=>{
      if(!stRef.current[charId]){
        stRef.current[charId]={
          x:x+dw/2-11, y:y-8, sx:x+dw/2-11, sy:y-8,
          state:'sitting', frame:0,
          walkTimer:15+Math.random()*20, tx:0, ty:0, walksLeft:0
        }
      }
    })

    let animId:number
    const loop=()=>{
      tick.current+=0.04
      const t=tick.current
      const active=actRef.current
      const s=setRef.current
      const cts=ctRef.current

      ctx.fillStyle=C.bg;ctx.fillRect(0,0,canvas.width,canvas.height)

      // ── Room 1: 사무실 ──────────────────────────
      drawRoom(R1.x,R1.y,R1.w,R1.h)
      drawShelf(R1.x+16,R1.y+6,196);drawShelf(R1.x+230,R1.y+6,196)
      drawClock(R1.x+R1.w/2,R1.y+26,t)
      drawPlant(R1.x+14,R1.y+54,1.5);drawPlant(R1.x+R1.w-50,R1.y+54,1.3)
      drawPlant(R1.x+14,R1.y+R1.h-75,0.9);drawPlant(R1.x+R1.w-46,R1.y+R1.h-75,0.9)

      // 책상과 에이전트 렌더 (앉아있는 것 먼저)
      SEAT_DEFS.forEach(({x,y,charId,dw},i)=>{
        drawChair(x+dw+4,y-2,CHAIR_COLS[i])
        drawDesk(x,y,dw,38)
        drawMonitor(x+dw/2-5,y-36,t*(1.0+i*0.11),i)
      })

      // 에이전트 상태 업데이트 & 그리기
      const drawOrder=[...SEAT_DEFS.map(s=>s.charId)]
      // 걷는 캐릭터 나중에 그리기 (위에 표시되도록)
      const sitting:string[]=[], walking:string[]=[]
      drawOrder.forEach(charId=>{
        const st=stRef.current[charId];if(!st)return
        st.walkTimer-=0.04
        if(st.state==='sitting'){
          if(st.walkTimer<=0){
            if(Math.random()<0.35){
              st.state='walking'
              st.tx=R1.x+50+Math.random()*(R1.w-100)
              st.ty=R1.y+70+Math.random()*(R1.h-100)
              st.walkTimer=6+Math.random()*8
              st.walksLeft=1+Math.floor(Math.random()*2)
            } else {
              st.walkTimer=12+Math.random()*18
            }
          }
          sitting.push(charId)
        } else {
          const dx=st.tx-st.x,dy=st.ty-st.y,dist=Math.sqrt(dx*dx+dy*dy)
          if(dist>2){
            const spd=1.4
            st.x+=dx/dist*spd;st.y+=dy/dist*spd*0.75
            st.frame=Math.floor(t*6)%4
          } else {
            st.walksLeft--
            if(st.walksLeft<=0||st.walkTimer<=0){
              // 자리로 복귀
              st.tx=st.sx;st.ty=st.sy
              if(dist<3){st.state='sitting';st.x=st.sx;st.y=st.sy;st.walkTimer=15+Math.random()*20;st.frame=0}
            } else {
              st.tx=R1.x+50+Math.random()*(R1.w-100);st.ty=R1.y+70+Math.random()*(R1.h-100)
            }
          }
          walking.push(charId)
        }
      })

      // 앉아있는 캐릭터
      sitting.forEach(charId=>{
        const st=stRef.current[charId];if(!st)return
        const sd=SEAT_DEFS.find(s=>s.charId===charId);if(!sd)return
        const isAct=active===charId
        const nm=s.agentNames?.[charId]||CHARS[charId].label
        const bob=Math.sin(t*1.8+SEAT_DEFS.findIndex(s=>s.charId===charId)*0.7)*0.6
        drawCharSprite(Math.round(st.x),Math.round(st.y+bob),CHARS[charId],0,true)
        drawLabel(Math.round(st.x)+11,Math.round(st.y+bob),nm,isAct,CHARS[charId].accent)
        if(isAct) drawBubble(Math.round(st.x)+11,Math.round(st.y+bob),BUBBLE[charId]||'작업 중',CHARS[charId].accent)
      })

      // 걷는 캐릭터 (맨 위에)
      walking.forEach(charId=>{
        const st=stRef.current[charId];if(!st)return
        const isAct=active===charId
        const nm=s.agentNames?.[charId]||CHARS[charId].label
        drawCharSprite(Math.round(st.x),Math.round(st.y),CHARS[charId],st.frame,false)
        drawLabel(Math.round(st.x)+11,Math.round(st.y),nm,isAct,CHARS[charId].accent)
        if(isAct) drawBubble(Math.round(st.x)+11,Math.round(st.y),BUBBLE[charId]||'걷는 중',CHARS[charId].accent)
      })

      // 커스텀 팀
      cts.slice(0,3).forEach((ct,i)=>{
        const cx=90+i*148,cy=448,dw=72
        const id=ct.id as AgentId
        if(!stRef.current[id]){
          stRef.current[id]={x:cx+dw/2-11,y:cy-8,sx:cx+dw/2-11,sy:cy-8,state:'sitting',frame:0,walkTimer:15+Math.random()*20,tx:0,ty:0,walksLeft:0}
        }
        drawChair(cx+dw+4,cy-2,CHAIR_COLS[(i+3)%CHAIR_COLS.length])
        drawDesk(cx,cy,dw,38)
        drawMonitor(cx+dw/2-5,cy-36,t*(1.1+i*0.14),i+6)
        const isAct=active===id,nm=s.agentNames?.[id]||ct.name
        const cd={...getCustomChar(id),label:ct.name}
        const bob=Math.sin(t*1.5+i*0.9)*0.6
        drawCharSprite(cx+dw/2-11,cy-8+bob,cd,0,true)
        drawLabel(cx+dw/2,cy-8+bob,nm,isAct,cd.accent)
      })

      // ── Room 2: 회의실 ──────────────────────────
      drawRoom(R2.x,R2.y,R2.w,R2.h)
      drawPlant(R2.x+14,R2.y+54,1.3);drawPlant(R2.x+R2.w-48,R2.y+54,1.3)
      drawPlant(R2.x+14,R2.y+R2.h-75,0.9);drawPlant(R2.x+R2.w-46,R2.y+R2.h-75,0.9)
      // 회의실 표지
      drawLabel(R2.x+R2.w/2,R2.y+12,'🏢 회의실',false,'#8878a8')
      // 화이트보드
      drawWhiteboard(R2.x+50,R2.y+6,R2.w-100,62)
      // 프레임
      r(R2.x+16,R2.y+78,28,20,C.mt);r(R2.x+19,R2.y+81,22,14,'#406080')
      r(R2.x+R2.w-44,R2.y+78,28,20,C.mt);r(R2.x+R2.w-41,R2.y+81,22,14,'#804040')
      // 회의 테이블
      const tx=R2.x+32,ty=R2.y+120,tw=274,th=118
      drawMeetingTable(tx,ty,tw,th)
      // 테이블 의자들
      const mcc=['#7068a8','#6080a0','#908060','#788050','#786880','#607068']
      for(let i=0;i<4;i++) drawMChair(tx+14+i*62,ty-22,54,20,mcc[i%mcc.length])
      for(let i=0;i<4;i++) drawMChair(tx+14+i*62,ty+th+7,54,20,mcc[(i+2)%mcc.length])
      drawMChair(tx-24,ty+18,20,50,mcc[0]);drawMChair(tx-24,ty+74,20,50,mcc[1])
      drawMChair(tx+tw+4,ty+18,20,50,mcc[2]);drawMChair(tx+tw+4,ty+74,20,50,mcc[3])
      // 소파
      drawSofa(R2.x+44,R2.y+300,250)
      r(R2.x+120,R2.y+285,100,16,C.mt);r(R2.x+120,R2.y+285,100,3,C.mtL)
      r(R2.x+130,R2.y+296,9,10,C.mtD);r(R2.x+201,R2.y+296,9,10,C.mtD)

      animId=requestAnimationFrame(loop)
    }
    animId=requestAnimationFrame(loop)
    return()=>cancelAnimationFrame(animId)
  },[])

  return(
    <canvas ref={cvRef} width={900} height={520}
      style={{imageRendering:'pixelated',display:'block',maxWidth:'100%',
        borderRadius:'10px',border:'1px solid #ede0d8',
        boxShadow:'0 4px 24px rgba(16,8,24,0.2)'}}
    />
  )
}
