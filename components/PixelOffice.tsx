'use client'
import { useEffect, useRef } from 'react'
import type { AgentId } from '@/lib/agents'
import { loadData, DEFAULT_SETTINGS, type AppSettings } from '@/lib/store'

interface Props { activeAgentId?: AgentId | null }

type CharDef = {
  gender:'M'|'F'; hair:string; skin:string; top:string; bottom:string
  shoe:string; hairStyle:string; acc:string; accent:string; label:string
}
const CHARS: Record<string, CharDef> = {
  router:  {gender:'M',hair:'#b0b0b8',hairStyle:'side',  skin:'#f5cfa0',top:'#2a4060',bottom:'#151e30',shoe:'#0a0a18',acc:'tie',  accent:'#e09090',label:'총괄실장'},
  web:     {gender:'F',hair:'#22b8cc',hairStyle:'bob',   skin:'#f5cc90',top:'#fce050',bottom:'#4a5ab0',shoe:'#2a3470',acc:'none', accent:'#fce050',label:'웹 팀'},
  content: {gender:'F',hair:'#5a2010',hairStyle:'long',  skin:'#fcd8a0',top:'#f06090',bottom:'#2a1a2a',shoe:'#160a0a',acc:'ear',  accent:'#f06090',label:'콘텐츠 팀'},
  edu:     {gender:'F',hair:'#181818',hairStyle:'pony',  skin:'#f5cc90',top:'#5a9050',bottom:'#2a3028',shoe:'#161816',acc:'none', accent:'#70b060',label:'교육 팀'},
  research:{gender:'M',hair:'#3a2010',hairStyle:'messy', skin:'#f5cc90',top:'#ececec',bottom:'#2a4870',shoe:'#182038',acc:'glass',accent:'#58a0e0',label:'연구 팀'},
  ops:     {gender:'M',hair:'#0c0c0c',hairStyle:'short', skin:'#d0a078',top:'#2e5030',bottom:'#181c18',shoe:'#080808',acc:'head', accent:'#58b058',label:'운영 팀'},
}
const CUSTOM_PAL: Omit<CharDef,'label'>[] = [
  {gender:'F',hair:'#d848b8',hairStyle:'bob',   skin:'#f5cc90',top:'#5050d0',bottom:'#282860',shoe:'#181840',acc:'ear',  accent:'#7070f0'},
  {gender:'M',hair:'#50a070',hairStyle:'messy', skin:'#d0a078',top:'#c84030',bottom:'#281818',shoe:'#140a0a',acc:'none', accent:'#e05848'},
  {gender:'F',hair:'#e09028',hairStyle:'long',  skin:'#fcd8a0',top:'#289070',bottom:'#182820',shoe:'#0a1410',acc:'none', accent:'#38c090'},
  {gender:'M',hair:'#4870d0',hairStyle:'side',  skin:'#f5cfa0',top:'#907028',bottom:'#1e1808',shoe:'#0a0808',acc:'glass',accent:'#d0a838'},
]
const getCustomChar=(id:string)=>({...CUSTOM_PAL[id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)%CUSTOM_PAL.length],label:''})

type CT={id:string;icon:string;name:string;role:string;desc:string}

// 색상 팔레트
const P={
  bg:'#12121e',
  // 바닥 (따뜻한 나무 색)
  wd0:'#c8a870',wd1:'#b89860',wd2:'#a88850',wdL:'#d8b878',wdD:'rgba(80,40,0,0.12)',
  // 벽
  wl:'#9a8c78',wlL:'#b0a088',wlD:'#787060',wlT:'#d0b888',
  // 테두리/기둥
  brd:'#4a3820',
  // 책상
  dk:'#c89848',dkL:'#e0b858',dkD:'#a07828',dkF:'#806018',
  // 의자
  ch0:'#7868a8',ch1:'#5858a0',ch2:'#9878a0',
  // 모니터
  mn:'#1c1c2c',mnS:'#141828',mnG:'#40d090',
  // 책장
  sf:'#8c6030',sfL:'#ac7840',sfD:'#6c4820',
  bks:['#e84040','#4088f0','#40b040','#e8a828','#a040e8','#f06090','#38b0d0','#f07030'],
  // 화분
  pt:'#c86030',ptL:'#e07848',ptD:'#a04820',
  g0:'#58c858',g1:'#38a038',g2:'#206020',
  // 회의 테이블
  mt:'#7a5020',mtL:'#a87030',mtD:'#503010',
  // 화이트보드
  wb:'#f0f0e8',wbB:'#8c8070',
  // 소파
  so:'#c03060',soL:'#e04878',soD:'#801840',soA:'#501030',
  // 러그
  rg:'#5040a0',rgL:'#6050b8',
  // 시계
  ck:'#f5eeda',
}

export default function PixelOffice({activeAgentId}:Props){
  const cv=useRef<HTMLCanvasElement>(null)
  const tick=useRef(0)
  const actRef=useRef<AgentId|null|undefined>(null)
  const setRef=useRef<AppSettings>(DEFAULT_SETTINGS)
  const ctRef=useRef<CT[]>([])

  useEffect(()=>{actRef.current=activeAgentId},[activeAgentId])
  useEffect(()=>{
    setRef.current=loadData<AppSettings>('nk_settings',DEFAULT_SETTINGS)
    ctRef.current=loadData<CT[]>('nk_custom_teams',[])
  },[])

  useEffect(()=>{
    const canvas=cv.current;if(!canvas)return
    const ctx=canvas.getContext('2d')!

    const r=(x:number,y:number,w:number,h:number,c:string)=>{if(w>0&&h>0){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}}
    const ln=(x1:number,y1:number,x2:number,y2:number,c:string,lw=1)=>{ctx.strokeStyle=c;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}

    // ── 나무 바닥 ──────────────────────────────────
    const drawWoodFloor=(fx:number,fy:number,fw:number,fh:number)=>{
      const PH=18,cols=[P.wd0,P.wd1,P.wd0,P.wd1]
      for(let row=0;row*PH<fh;row++){
        const ty=fy+row*PH,th=Math.min(PH,fy+fh-ty),clr=cols[row%cols.length]
        r(fx,ty,fw,th,clr)
        // 나무결
        const off=(row%2)*30
        for(let gx=fx+off;gx<fx+fw;gx+=80){
          ln(gx,ty+3,gx+50,ty+3,P.wdD,1);ln(gx+10,ty+9,gx+50,ty+9,P.wdD,0.8)
        }
        ln(fx,ty,fx+fw,ty,'rgba(80,40,0,0.1)',1)
      }
      // 광택
      ctx.fillStyle='rgba(255,255,200,0.04)';ctx.fillRect(fx,fy,fw,fh)
    }

    // ── 방 그리기 ──────────────────────────────────
    const drawRoom=(rx:number,ry:number,rw:number,rh:number,label?:string)=>{
      // 바깥 테두리
      r(rx-6,ry-6,rw+12,rh+12,P.brd)
      // 벽 (상단)
      r(rx,ry,rw,52,P.wl)
      r(rx,ry,rw,5,P.wlT);r(rx,ry+46,rw,6,P.wlD)
      // 측면 벽
      r(rx,ry+52,14,rh-52,P.wlD);r(rx+rw-14,ry+52,14,rh-52,P.wlD)
      // 바닥
      drawWoodFloor(rx+14,ry+52,rw-28,rh-52)
      // 그라데이션 그림자 (벽-바닥 경계)
      const g=ctx.createLinearGradient(0,ry+52,0,ry+78)
      g.addColorStop(0,'rgba(0,0,0,0.3)');g.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle=g;ctx.fillRect(rx+14,ry+52,rw-28,26)
      // 모서리 기둥
      r(rx,ry,14,rh,P.wlD);r(rx+rw-14,ry,14,rh,P.wlD)
      r(rx,ry,rw,6,P.wlT)
      if(label){
        ctx.font='bold 10px "Jua",monospace';ctx.fillStyle='rgba(255,240,200,0.9)'
        ctx.textAlign='center';ctx.fillText(label,rx+rw/2,ry+32);ctx.textAlign='left'
      }
    }

    // ── 책장 ──────────────────────────────────────
    const drawShelf=(x:number,y:number,w:number)=>{
      r(x,y,w,36,P.sf);r(x,y,w,5,P.sfL);r(x,y+31,w,5,P.sfD)
      r(x,y,5,36,P.sfD);r(x+w-5,y,5,36,P.sfD)
      let bx=x+6,bi=0
      while(bx+10<x+w-6){
        const bh=14+(bi%5)*3
        r(bx,y+6,9,bh,P.bks[bi%P.bks.length])
        r(bx,y+6,2,bh,'rgba(255,255,255,0.25)');r(bx+7,y+6,2,bh,'rgba(0,0,0,0.15)')
        bx+=10;bi++
      }
    }

    // ── 시계 ──────────────────────────────────────
    const drawClock=(x:number,y:number,t:number)=>{
      r(x-18,y-18,36,36,'#3a3020')
      ctx.fillStyle=P.ck;ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);ctx.fill()
      ctx.strokeStyle='#c8b888';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);ctx.stroke()
      // 숫자 점
      for(let h=0;h<12;h++){const a=h/12*Math.PI*2-Math.PI/2,d=h%3===0?10:11;ctx.fillStyle='#888070';ctx.beginPath();ctx.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,1,0,Math.PI*2);ctx.fill()}
      ctx.strokeStyle='#2a2010';ctx.lineWidth=2;ctx.lineCap='round'
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(t*0.013-Math.PI/2)*9,y+Math.sin(t*0.013-Math.PI/2)*9);ctx.stroke()
      ctx.strokeStyle='#d03028';ctx.lineWidth=1.5
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(t*0.8-Math.PI/2)*12,y+Math.sin(t*0.8-Math.PI/2)*12);ctx.stroke()
      r(x-1,y-1,3,3,'#d03028')
    }

    // ── 책상 (탑다운) ──────────────────────────────
    const drawDesk=(x:number,y:number,w=76,h=42)=>{
      // 그림자
      ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(x+4,y+h+3,w,8)
      // 다리
      r(x+4,y+h,8,18,P.dkD);r(x+w-12,y+h,8,18,P.dkD)
      r(x+4,y+h+14,w-8,4,P.dkD)
      // 상판
      r(x,y,w,h,P.dk)
      r(x,y,w,4,P.dkL)  // 상단 하이라이트
      r(x,y,3,h,P.dkL)  // 왼쪽 하이라이트
      r(x+w-3,y,3,h,P.dkD)  // 오른쪽 그림자
      r(x,y+h-4,w,4,P.dkF)  // 앞면
      // 서랍 라인
      ln(x+w/2,y+5,x+w/2,y+h-6,P.dkD,0.7)
      ln(x+w/2-4,y+(h/2),x+w/2+4,y+(h/2),P.dkD,0.7)
    }

    // ── 의자 (탑다운) ──────────────────────────────
    const drawChairBack=(x:number,y:number,col:string)=>{
      // 그림자
      ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(x+2,y+34,26,5)
      // 등받이
      r(x,y,30,7,col);r(x+1,y+1,28,4,col+'dd')
      r(x,y+5,5,22,col);r(x+25,y+5,5,22,col)
      // 방석
      r(x,y+7,30,20,col);r(x+2,y+9,26,6,col+'ee')
      // 다리
      r(x+3,y+27,6,14,'#706860');r(x+21,y+27,6,14,'#706860')
      r(x+3,y+38,24,4,'#605850')
    }

    // ── 화분 ──────────────────────────────────────
    const drawPlant=(x:number,y:number,s=1)=>{
      const sc=(n:number)=>Math.round(n*s)
      // 그림자
      ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(x-2,y+sc(44),sc(28),5)
      // 화분
      const px2=x+sc(2),py2=y+sc(26),pw=sc(20),ph=sc(20)
      r(px2,py2,pw,ph,P.pt);r(px2,py2,pw,4,P.ptL);r(px2,py2+ph-5,pw,5,P.ptD)
      r(px2+3,py2+3,pw-6,5,'rgba(255,180,120,0.2)')
      r(px2+2,py2+4,pw-4,6,'#2a1808')
      // 줄기
      r(px2+sc(7),y+sc(8),4,sc(20),'#2a6018')
      // 잎 (여러 방향)
      r(x,y,sc(18),sc(14),P.g1);r(x,y,sc(16),sc(9),P.g0)
      r(x+sc(9),y-sc(6),sc(16),sc(16),P.g1);r(x+sc(10),y-sc(6),sc(14),sc(10),P.g0)
      r(x+sc(3),y-sc(9),sc(12),sc(18),P.g0);r(x+sc(4),y-sc(9),sc(10),sc(8),'#80e080')
      r(x,y+sc(16),sc(9),sc(8),P.g2);r(x+sc(12),y+sc(14),sc(8),sc(6),P.g2)
    }

    // ── 모니터 ─────────────────────────────────────
    const drawMonitor=(x:number,y:number,t:number,i:number)=>{
      const p=0.6+Math.sin(t+i)*0.2
      // 받침대
      r(x+10,y+26,14,6,P.mn);r(x+7,y+32,20,3,'#101020')
      // 베젤
      r(x,y,34,28,P.mn);r(x+2,y+2,30,24,'#101828')
      // 화면
      r(x+3,y+3,28,20,P.mnS)
      ctx.globalAlpha=p*0.9
      r(x+4,y+4,14,3,P.mnG);r(x+4,y+9,24,2,'#80c0e8');r(x+4,y+13,18,2,P.mnG)
      r(x+4,y+17,8,3,'rgba(200,160,80,0.6)')
      ctx.globalAlpha=1
      // 반사광
      ctx.fillStyle='rgba(255,255,255,0.06)';ctx.fillRect(x+3,y+3,28,8)
    }

    // ── 책상 아이템 ────────────────────────────────
    const drawDeskItems=(x:number,y:number,t:number,i:number)=>{
      if(i%3===0){
        // 커피잔
        r(x,y+2,11,11,'#e09070');r(x+1,y+2,9,3,'#f0b090');r(x+2,y+4,7,3,'#3a1808')
        r(x+11,y+5,4,5,'rgba(255,255,255,0.3)')
        // 스팀 애니메이션
        ctx.globalAlpha=0.4+Math.sin(t*3)*0.2
        r(x+3,y-4+Math.round(Math.sin(t*2)*1),1,4,'rgba(200,200,200,0.8)')
        r(x+6,y-6+Math.round(Math.sin(t*2+1)*1),1,5,'rgba(200,200,200,0.8)')
        ctx.globalAlpha=1
      } else if(i%3===1){
        // 책 2권
        r(x,y,6,13,'#e04040');r(x+7,y+2,5,11,'#4080e8')
        r(x,y,1,13,'rgba(255,255,255,0.3)');r(x+7,y+2,1,11,'rgba(255,255,255,0.3)')
      } else {
        // 화분
        r(x+3,y+7,8,8,'#c05828');r(x+5,y,5,9,'#40a040');r(x+6,y+1,3,5,'#60c060')
      }
    }

    // ── 캐릭터 (개선된 탑다운 RPG) ────────────────
    const drawChar=(px:number,py:number,ch:CharDef,highlight:boolean,name:string,bubble:boolean,bubText:string,sitting=false)=>{
      const t=tick.current,iF=ch.gender==='F'
      // 빛 원
      if(highlight){
        ctx.fillStyle=ch.accent+'40'
        ctx.beginPath();ctx.arc(px+13,py+18,18,0,Math.PI*2);ctx.fill()
      }
      // 그림자
      ctx.fillStyle='rgba(0,0,0,0.18)'
      ctx.beginPath();ctx.ellipse(px+13,py+(sitting?32:30),10,4,0,0,Math.PI*2);ctx.fill()

      if(!sitting){
        // 발/신발
        r(px+3,py+23,7,6,ch.shoe);r(px+13,py+23,7,6,ch.shoe)
        r(px+3,py+23,7,2,ch.shoe+'cc');r(px+13,py+23,7,2,ch.shoe+'cc')
        // 다리
        r(px+4,py+16,6,9,ch.bottom);r(px+14,py+16,6,9,ch.bottom)
      }
      // 몸
      r(px+2,py+8,22,iF?10:11,ch.top)
      r(px+3,py+8,20,3,ch.top+'ee')  // 하이라이트
      // 팔
      r(px,py+9,3,9,ch.top);r(px+23,py+9,3,9,ch.top)
      // 손
      r(px-1,py+17,4,4,ch.skin);r(px+23,py+17,4,4,ch.skin)

      if(sitting){
        r(px+3,py+18,8,8,ch.bottom);r(px+15,py+18,8,8,ch.bottom)
        r(px+3,py+24,18,8,ch.bottom)
      }

      // 머리
      r(px+3,py,20,12,ch.skin)
      // 얼굴 디테일
      if(iF){
        // 눈 (여성: 더 크고 화장)
        r(px+6,py+4,4,4,'#1a1040');r(px+14,py+4,4,4,'#1a1040')
        r(px+6,py+3,5,2,'#1a1040')  // 속눈썹
        r(px+14,py+3,5,2,'#1a1040')
        r(px+7,py+5,2,1,'#fff');r(px+15,py+5,2,1,'#fff')  // 반짝임
        // 볼터치
        ctx.globalAlpha=0.35;ctx.fillStyle='#ff9090'
        ctx.fillRect(px+4,py+7,4,3);ctx.fillRect(px+17,py+7,4,3);ctx.globalAlpha=1
        // 입
        r(px+8,py+9,7,2,'#d06070');r(px+9,py+10,5,1,'#f08090')
      } else {
        // 눈 (남성)
        r(px+6,py+4,4,4,'#181828');r(px+14,py+4,4,4,'#181828')
        r(px+7,py+5,2,1,'#fff');r(px+15,py+5,2,1,'#fff')
        r(px+8,py+9,6,2,ch.skin.replace('f5','d8').replace('d0','b0'))
      }
      // 코
      r(px+12,py+7,2,2,ch.skin.replace('f5','d0').replace('d0','a8'))

      // 액세서리
      if(ch.acc==='glass'){
        ctx.strokeStyle='#303050';ctx.lineWidth=1.5
        ctx.strokeRect(px+5,py+3,6,6);ctx.strokeRect(px+14,py+3,6,6)
        ctx.beginPath();ctx.moveTo(px+11,py+6);ctx.lineTo(px+14,py+6);ctx.stroke()
      }
      if(ch.acc==='head'){
        ctx.strokeStyle='#181818';ctx.lineWidth=2
        ctx.beginPath();ctx.arc(px+13,py+8,11,Math.PI,0);ctx.stroke()
        r(px+1,py+6,4,8,'#222');r(px+21,py+6,4,8,'#222')
      }
      if(ch.acc==='ear'){
        r(px+1,py+6,3,5,'#f8d020');r(px+22,py+6,3,5,'#f8d020')
      }
      if(ch.acc==='tie'){
        r(px+11,py+18,5,12,ch.accent);r(px+10,py+18,7,4,ch.accent)
      }

      // 머리카락
      const hw=ch.hair
      if(ch.hairStyle==='side'){
        r(px+2,py-1,22,7,hw);r(px+1,py+2,5,11,hw);r(px+20,py+2,5,11,hw)
        r(px+2,py-1,10,3,hw+'cc')
      } else if(ch.hairStyle==='bob'){
        r(px+2,py-1,22,9,hw);r(px+1,py+7,6,14,hw);r(px+19,py+7,6,14,hw)
        r(px+3,py-2,18,5,hw)
      } else if(ch.hairStyle==='long'){
        r(px+2,py-1,22,8,hw);r(px+1,py+7,5,26,hw);r(px+20,py+7,5,26,hw)
        r(px+2,py+30,5,8,hw);r(px+19,py+30,5,8,hw)
        r(px+3,py-1,18,4,'rgba(255,255,255,0.15)')
      } else if(ch.hairStyle==='pony'){
        r(px+2,py-1,22,8,hw);r(px+20,py+6,5,8,hw);r(px+2,py+6,5,8,hw)
        r(px+22,py+11,8,20,hw);r(px+24,py+16,4,6,'#e0a090')
      } else if(ch.hairStyle==='messy'){
        r(px+2,py-3,22,10,hw);r(px+0,py-5,8,8,hw);r(px+17,py-4,9,7,hw)
        r(px+2,py+6,4,10,hw);r(px+20,py+6,4,10,hw);r(px+25,py-2,4,6,hw)
      } else {
        r(px+2,py-1,22,7,hw);r(px+2,py+5,4,5,hw);r(px+20,py+5,4,5,hw)
      }

      // 이름표
      const bob=Math.sin(t*2.2)*1.5,ly=py+bob-24
      ctx.font='bold 10px "Jua",monospace'
      const tw=ctx.measureText(name).width+12
      ctx.fillStyle=highlight?ch.accent:'rgba(14,10,32,0.9)'
      ctx.strokeStyle=highlight?'rgba(255,255,255,0.9)':'rgba(255,255,255,0.4)'
      ctx.lineWidth=1.5
      ctx.beginPath();ctx.roundRect(px+13-tw/2,ly,tw,15,4);ctx.fill();ctx.stroke()
      ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.fillText(name,px+13,ly+11);ctx.textAlign='left'

      // 말풍선
      if(bubble){
        const by=py+bob-46
        ctx.font='9px "Jua",monospace'
        const bw=ctx.measureText(bubText).width+14
        ctx.fillStyle='rgba(255,255,255,0.97)';ctx.strokeStyle=ch.accent;ctx.lineWidth=1.5
        ctx.beginPath();ctx.roundRect(px+13-bw/2,by,bw,18,5);ctx.fill();ctx.stroke()
        ctx.fillStyle='rgba(255,255,255,0.97)';ctx.beginPath()
        ctx.moveTo(px+9,by+18);ctx.lineTo(px+17,by+18);ctx.lineTo(px+13,by+26);ctx.fill()
        ctx.fillStyle='#18103a';ctx.font='bold 9px "Jua",monospace'
        ctx.textAlign='center';ctx.fillText(bubText,px+13,by+13);ctx.textAlign='left'
      }
    }

    // ── 회의 테이블 ────────────────────────────────
    const drawConfTable=(x:number,y:number,w:number,h:number)=>{
      ctx.fillStyle='rgba(0,0,0,0.22)';ctx.fillRect(x+6,y+h+5,w-8,9)
      r(x,y,w,h,P.mt)
      r(x,y,w,5,P.mtL);r(x+3,y+3,w-6,8,'rgba(255,200,100,0.2)')
      r(x,y,4,h,P.mtL);r(x+w-4,y,4,h,P.mtD);r(x,y+h-5,w,5,P.mtD)
      // 나무결
      for(let i=0;i<4;i++) ln(x+5+i*w/4,y+6,x+5+i*w/4,y+h-8,P.mtD,0.6)
      // 테이블 위 아이템
      r(x+w/2-22,y+10,12,12,P.pt);r(x+w/2-21,y+10,10,3,P.ptL)  // 화분
      r(x+w/2+10,y+10,12,12,P.pt);r(x+w/2+11,y+10,10,3,P.ptL)
      ctx.fillStyle='rgba(255,250,200,0.5)';ctx.beginPath();ctx.arc(x+w/2,y+h/2,20,0,Math.PI*2);ctx.fill()
      ctx.strokeStyle='rgba(180,130,30,0.5)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x+w/2,y+h/2,20,0,Math.PI*2);ctx.stroke()
      // 서류/노트북
      r(x+20,y+15,18,12,'#e8e0d0');r(x+22,y+17,14,8,'rgba(100,150,200,0.4)')
      r(x+w-38,y+15,18,12,'#1a1a2a');r(x+w-36,y+17,14,8,P.mnS)
    }

    // ── 회의실 의자 ────────────────────────────────
    const drawMChair=(x:number,y:number,w:number,h:number,col='#6858a8')=>{
      ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(x+2,y+h+2,w-2,4)
      r(x,y,w,5,col+'cc');r(x,y+5,w,h-5,col);r(x+2,y+7,w-4,4,col+'ee')
    }

    // ── 화이트보드 ─────────────────────────────────
    const drawWhiteboard=(x:number,y:number,w:number,h:number,t:number)=>{
      r(x-3,y-3,w+6,h+6,P.wbB)
      r(x,y,w,h,P.wb);r(x+4,y+4,w-8,h-8,'#f8f8f0')
      // 차트 (애니메이션)
      const bars=[14,22,10,18,26,8]
      bars.forEach((bh,bi)=>{
        const bx=x+8+bi*14,by=y+h-bh-8
        r(bx,by,10,bh,['#4080f0','#40b040','#f08040','#e04040','#9040e0','#40c0b0'][bi])
        r(bx,by,10,3,'rgba(255,255,255,0.3)')
      })
      // 라인 그래프
      ctx.strokeStyle='rgba(200,80,80,0.7)';ctx.lineWidth=1.5;ctx.beginPath()
      const pts=[[x+8,y+h-20],[x+22,y+h-28],[x+36,y+h-18],[x+50,y+h-35],[x+64,y+h-24],[x+78,y+h-38]]
      ctx.moveTo(pts[0][0],pts[0][1]);pts.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));ctx.stroke()
      // 텍스트
      ctx.fillStyle='rgba(0,0,80,0.5)';ctx.font='7px monospace'
      ctx.fillText('Q1  Q2  Q3  Q4',x+8,y+12)
      // 트레이
      r(x,y+h,w,6,P.wbB);r(x+4,y+h+1,9,4,'#e04040');r(x+16,y+h+1,9,4,'#808080')
    }

    // ── 러그 ──────────────────────────────────────
    const drawRug=(x:number,y:number,w:number,h:number)=>{
      r(x,y,w,h,P.rg);r(x+4,y+4,w-8,h-8,P.rgL)
      ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1
      ctx.strokeRect(x+8,y+8,w-16,h-16)
      // 패턴
      for(let i=0;i<3;i++){r(x+w/2-10+i*10,y+h/2-1,8,3,'rgba(255,255,255,0.1)')}
    }

    // ── 소파 ──────────────────────────────────────
    const drawSofa=(x:number,y:number,w:number)=>{
      ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(x+4,y+50,w-6,7)
      r(x,y,w,10,P.soA);r(x+3,y+1,w-6,7,P.soD)
      r(x,y+10,w,36,P.so);r(x+3,y+12,w-6,10,P.soL)
      r(x,y+46,w,10,P.soA)
      r(x,y+10,12,36,P.soD);r(x+w-12,y+10,12,36,P.soD)
      r(x+2,y+11,5,32,'rgba(255,255,255,0.08)')
    }

    const BUBBLE:Record<string,string>={
      router:'업무 배분 중',web:'코드 작성 중',content:'글 작성 중',
      edu:'교육 자료 중',research:'분석 중',ops:'운영 중',
    }
    const CHAIR_COLS=['#7868b0','#6888a0','#988868','#80a068','#887060','#686890']

    // 배치: 3열 2행 (중요도순)
    const R1={x:4,y:4,w:548,h:512}
    const R2={x:558,y:4,w:338,h:512}

    const SEATS=[
      {x:88, y:158,charId:'router',  dw:76},
      {x:236,y:158,charId:'web',     dw:76},
      {x:384,y:158,charId:'content', dw:76},
      {x:88, y:308,charId:'research',dw:76},
      {x:236,y:308,charId:'edu',     dw:76},
      {x:384,y:308,charId:'ops',     dw:76},
    ]

    let animId:number
    const loop=()=>{
      tick.current+=0.04
      const t=tick.current
      const active=actRef.current
      const s=setRef.current
      const cts=ctRef.current

      ctx.fillStyle=P.bg;ctx.fillRect(0,0,canvas.width,canvas.height)

      // ── Room 1: 사무실 ──
      drawRoom(R1.x,R1.y,R1.w,R1.h,'🏢 업무 공간')
      drawShelf(R1.x+16,R1.y+8,210);drawShelf(R1.x+240,R1.y+8,200)
      drawClock(R1.x+R1.w/2,R1.y+30,t)
      drawPlant(R1.x+16,R1.y+56,1.6);drawPlant(R1.x+R1.w-52,R1.y+56,1.4)
      drawPlant(R1.x+16,R1.y+R1.h-80,1.0);drawPlant(R1.x+R1.w-48,R1.y+R1.h-80,1.0)

      // 러그 (바닥 중앙)
      drawRug(R1.x+80,R1.y+240,386,100)

      SEATS.forEach(({x,y,charId,dw},i)=>{
        const isAct=active===charId
        const nm=s.agentNames?.[charId]||CHARS[charId].label
        drawChairBack(x+dw+6,y-2,CHAIR_COLS[i])
        drawDesk(x,y,dw,42)
        drawMonitor(x+dw/2-6,y-40,t*(1.0+i*0.12),i)
        drawDeskItems(x+6,y+6,t,i)
        const bob=Math.sin(t*1.6+i*0.8)*0.8
        drawChar(x+dw/2-13,y-6+bob,CHARS[charId],isAct,nm,isAct,BUBBLE[charId]||'작업 중',true)
      })

      // 커스텀 팀 (3행)
      cts.slice(0,3).forEach((ct,i)=>{
        const cx=88+i*148,cy=446,dw=76
        const isAct=active===(ct.id as AgentId)
        const nm=s.agentNames?.[ct.id]||ct.name
        const cd={...getCustomChar(ct.id),label:ct.name}
        drawChairBack(cx+dw+6,cy-2,CHAIR_COLS[(i+3)%CHAIR_COLS.length])
        drawDesk(cx,cy,dw,42)
        drawMonitor(cx+dw/2-6,cy-40,t*(1.1+i*0.15),i+6)
        drawDeskItems(cx+6,cy+6,t,i+6)
        const bob=Math.sin(t*1.5+i*1.1)*0.8
        drawChar(cx+dw/2-13,cy-6+bob,cd,isAct,nm,isAct,'작업 중',true)
      })

      // ── Room 2: 회의실 ──
      drawRoom(R2.x,R2.y,R2.w,R2.h,'🎯 회의실')
      drawPlant(R2.x+16,R2.y+56,1.4);drawPlant(R2.x+R2.w-52,R2.y+56,1.4)
      drawPlant(R2.x+16,R2.y+R2.h-80,1.0);drawPlant(R2.x+R2.w-48,R2.y+R2.h-80,1.0)

      // 화이트보드 (벽)
      drawWhiteboard(R2.x+50,R2.y+8,R2.w-100,65,t)

      // 프레임
      r(R2.x+16,R2.y+80,30,22,P.mt);r(R2.x+20,R2.y+84,22,14,'#406080')
      r(R2.x+R2.w-46,R2.y+80,30,22,P.mt);r(R2.x+R2.w-42,R2.y+84,22,14,'#804040')

      // 회의 테이블 + 의자
      const tx=R2.x+34,ty=R2.y+130,tw=270,th=120
      drawRug(tx-20,ty-20,tw+40,th+40)
      drawConfTable(tx,ty,tw,th)

      // 테이블 상단 의자 4개
      const mcc=['#7868b0','#6888a0','#988868','#808878','#787088','#686898','#908068','#607888']
      for(let i=0;i<4;i++) drawMChair(tx+16+i*62,ty-26,54,22,mcc[i])
      // 하단 4개
      for(let i=0;i<4;i++) drawMChair(tx+16+i*62,ty+th+8,54,22,mcc[i+4])
      // 양쪽 의자
      drawMChair(tx-28,ty+20,22,52,mcc[0]);drawMChair(tx-28,ty+78,22,52,mcc[1])
      drawMChair(tx+tw+6,ty+20,22,52,mcc[2]);drawMChair(tx+tw+6,ty+78,22,52,mcc[3])

      // 하단 소파 영역
      drawSofa(R2.x+46,R2.y+316,246)
      // 커피 테이블
      r(R2.x+118,R2.y+300,102,18,P.mt);r(R2.x+118,R2.y+300,102,4,P.mtL)
      r(R2.x+128,R2.y+312,10,12,P.mtD);r(R2.x+202,R2.y+312,10,12,P.mtD)
      // 커피잔 on 테이블
      r(R2.x+152,R2.y+302,10,10,'#e09070');r(R2.x+172,R2.y+302,10,10,'#e09070')

      animId=requestAnimationFrame(loop)
    }
    animId=requestAnimationFrame(loop)
    return()=>cancelAnimationFrame(animId)
  },[])

  return(
    <canvas ref={cv} width={900} height={520}
      style={{imageRendering:'pixelated',display:'block',maxWidth:'100%',
        borderRadius:'12px',border:'1.5px solid #d8c8b8',
        boxShadow:'0 6px 32px rgba(20,10,30,0.25)'}}
    />
  )
}
