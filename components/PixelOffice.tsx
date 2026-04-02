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
  router:  {gender:'M',hair:'#909098',hairStyle:'side',  skin:'#f4c890',top:'#1e3050',bottom:'#121828',shoe:'#0a0a14',acc:'tie',  accent:'#d08888',label:'총괄실장'},
  web:     {gender:'F',hair:'#1a9aaa',hairStyle:'bob',   skin:'#f4c080',top:'#f8d840',bottom:'#4858a8',shoe:'#283068',acc:'none', accent:'#f8d840',label:'웹 팀'},
  content: {gender:'F',hair:'#3a1808',hairStyle:'long',  skin:'#f8d090',top:'#e85888',bottom:'#281828',shoe:'#140a0a',acc:'ear',  accent:'#e85888',label:'콘텐츠 팀'},
  edu:     {gender:'F',hair:'#141414',hairStyle:'pony',  skin:'#f4c080',top:'#4a8040',bottom:'#283028',shoe:'#141414',acc:'none', accent:'#60a050',label:'교육 팀'},
  research:{gender:'M',hair:'#281808',hairStyle:'messy', skin:'#f4c080',top:'#e8e8e8',bottom:'#284868',shoe:'#182038',acc:'glass',accent:'#4890d8',label:'연구 팀'},
  ops:     {gender:'M',hair:'#0a0a0a',hairStyle:'short', skin:'#c89068',top:'#284828',bottom:'#181e18',shoe:'#080808',acc:'head', accent:'#4a9a4a',label:'운영 팀'},
}

const CUSTOM_PALETTES = [
  {gender:'F' as const,hair:'#d040a0',hairStyle:'bob',   skin:'#f4c080',top:'#4040c8',bottom:'#282858',shoe:'#181838',acc:'ear',   accent:'#6060e8'},
  {gender:'M' as const,hair:'#408060',hairStyle:'messy', skin:'#c89068',top:'#c04030',bottom:'#281818',shoe:'#140a0a',acc:'none',  accent:'#e05040'},
  {gender:'F' as const,hair:'#e08020',hairStyle:'long',  skin:'#f8d090',top:'#208060',bottom:'#1a2a1a',shoe:'#0a140a',acc:'none',  accent:'#30a878'},
  {gender:'M' as const,hair:'#4060c0',hairStyle:'side',  skin:'#f4c890',top:'#806020',bottom:'#1e1808',shoe:'#0a0a08',acc:'glass', accent:'#c09030'},
  {gender:'F' as const,hair:'#a020a0',hairStyle:'pony',  skin:'#f4c080',top:'#e04080',bottom:'#281828',shoe:'#140a14',acc:'ear',   accent:'#e84090'},
  {gender:'M' as const,hair:'#202020',hairStyle:'short', skin:'#f8c870',top:'#206080',bottom:'#182028',shoe:'#081018',acc:'none',  accent:'#3090c0'},
]

const getCustomChar = (teamId: string) => {
  const idx = teamId.split('').reduce((a,c)=>a+c.charCodeAt(0),0) % CUSTOM_PALETTES.length
  return { ...CUSTOM_PALETTES[idx], label:'' }
}

const C = {
  bg:'#0d0d1a',
  fl1:'#c0c0b8',fl2:'#b0b0a8',flg:'#d0d0c8',
  wall:'#a09880',wallD:'#888070',wallT:'#c0b090',
  dsk:'#d4aa60',dskD:'#b08840',dskF:'#886420',dskH:'#f0cc80',
  sf:'#c03060',sfL:'#e04878',sfD:'#882040',sfA:'#601030',
  shf:'#784828',shfL:'#986040',shfD:'#583018',
  plt1:'#50cc50',plt2:'#308830',plt3:'#186018',
  pot:'#d06838',potD:'#a04820',potR:'#f09060',
  books:['#e83030','#3080e8','#38b038','#e8a020','#9830e8','#e86080','#30a8c8','#e87030'],
  mon:'#202030',monS:'#182040',monG:'#38cc88',
  ct:'#c89850',ctD:'#a07030',
  fr:'#d4a030',frD:'#a07820',
  cup:'#e88060',cupH:'#f0a080',
  book1:'#e84040',book2:'#4080e0',
  // 회의실 전용
  mtbl:'#8b5e2a',mtblL:'#c08840',mtblD:'#5a3a10',
  wb:'#f0f0e8',wbF:'#d0d0c0',wbD:'#808070',
  mch:'#6858a8',mchL:'#8878c8',mchD:'#483878',
}

type CustomTeam = { id: string; icon: string; name: string; role: string; desc: string }

export default function PixelOffice({ activeAgentId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tickRef = useRef(0)
  const activeRef = useRef<AgentId|null|undefined>(null)
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS)
  const customTeamsRef = useRef<CustomTeam[]>([])

  useEffect(()=>{ activeRef.current = activeAgentId },[activeAgentId])
  useEffect(()=>{
    settingsRef.current = loadData<AppSettings>('nk_settings', DEFAULT_SETTINGS)
    customTeamsRef.current = loadData<CustomTeam[]>('nk_custom_teams', [])
  },[])

  useEffect(()=>{
    const cv = canvasRef.current; if(!cv) return
    const ctx = cv.getContext('2d')!

    const r=(x:number,y:number,w:number,h:number,c:string)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}
    const rl=(x1:number,y1:number,x2:number,y2:number,c:string,lw=1)=>{ctx.strokeStyle=c;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}

    const drawFloor=(fx:number,fy:number,fw:number,fh:number)=>{
      const T=32
      for(let row=0;row*T<fh+T;row++) for(let col=0;col*T<fw+T;col++){
        const tx=fx+col*T,ty=fy+row*T,tw=Math.min(T,fx+fw-tx),th=Math.min(T,fy+fh-ty)
        if(tw>0&&th>0) r(tx,ty,tw,th,(row+col)%2===0?C.fl1:C.fl2)
      }
      ctx.strokeStyle=C.flg;ctx.lineWidth=0.7
      for(let i=0;i*T<=fw;i++) rl(fx+i*T,fy,fx+i*T,fy+fh,C.flg,0.7)
      for(let i=0;i*T<=fh;i++) rl(fx,fy+i*T,fx+fw,fy+i*T,C.flg,0.7)
    }

    const drawRoom=(rx:number,ry:number,rw:number,rh:number)=>{
      r(rx-5,ry-5,rw+10,rh+10,'#383028')
      r(rx,ry,rw,56,C.wall);r(rx,ry,rw,6,C.wallT);r(rx,ry+50,rw,6,C.wallD)
      r(rx,ry+56,12,rh-56,C.wallD);r(rx+rw-12,ry+56,12,rh-56,C.wallD)
      drawFloor(rx+12,ry+56,rw-24,rh-56)
      const g=ctx.createLinearGradient(0,ry+56,0,ry+82)
      g.addColorStop(0,'rgba(0,0,0,0.35)');g.addColorStop(1,'rgba(0,0,0,0)')
      ctx.fillStyle=g;ctx.fillRect(rx+12,ry+56,rw-24,26)
    }

    const drawShelf=(x:number,y:number,w:number)=>{
      r(x,y,w,34,C.shf);r(x,y,w,5,C.shfL);r(x,y+29,w,5,C.shfD)
      r(x,y,4,34,C.shfD);r(x+w-4,y,4,34,C.shfD)
      let bx=x+5,bi=0
      while(bx+9<x+w-5){
        const bh=16+(bi%4)*2
        r(bx,y+6,8,bh,C.books[bi%C.books.length])
        r(bx,y+6,1,bh,'rgba(255,255,255,0.3)');r(bx+7,y+6,1,bh,'rgba(0,0,0,0.15)')
        bx+=9;bi++
      }
    }

    const drawClock=(x:number,y:number,t:number)=>{
      ctx.fillStyle='#f5f0e0';ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);ctx.fill()
      ctx.strokeStyle='#888070';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);ctx.stroke()
      const m=t*0.013,s=t*0.8
      ctx.strokeStyle='#222';ctx.lineWidth=2;ctx.lineCap='round'
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(m-Math.PI/2)*10,y+Math.sin(m-Math.PI/2)*10);ctx.stroke()
      ctx.strokeStyle='#c03030';ctx.lineWidth=1
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(s-Math.PI/2)*12,y+Math.sin(s-Math.PI/2)*12);ctx.stroke()
    }

    const drawDesk=(x:number,y:number,w=72,h=38)=>{
      ctx.fillStyle='rgba(0,0,0,0.18)';ctx.fillRect(x+5,y+h+4,w-2,6)
      r(x,y,w,h,C.dsk);r(x,y,w,4,C.dskH);r(x,y,3,h,C.dskH)
      r(x,y+h-4,w,4,C.dskF);r(x+w-3,y,3,h,C.dskD);r(x,y,w,3,C.dskH)
      r(x,y+h,w,8,C.dskD);r(x,y+h,w,3,C.dskF)
      r(x+6,y+h+8,6,16,C.dskD);r(x+w-12,y+h+8,6,16,C.dskD)
      r(x+6,y+h+22,w-12,4,C.dskD)
    }

    const drawMonitor=(x:number,y:number,t:number)=>{
      const p=0.5+Math.sin(t)*0.15
      r(x,y,34,26,C.mon);r(x+2,y+2,30,22,'#14182a')
      r(x+3,y+3,28,18,C.monS)
      ctx.globalAlpha=p*0.85
      r(x+4,y+4,14,3,C.monG);r(x+4,y+9,24,2,'#88c0e0');r(x+4,y+13,18,2,C.monG)
      ctx.globalAlpha=1
      r(x+13,y+26,8,6,C.mon);r(x+9,y+32,16,3,'#14182a')
    }

    const drawChair=(x:number,y:number,col:string)=>{
      const bright=col+'cc'
      ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(x+3,y+34,22,5)
      r(x,y,28,6,col);r(x+2,y+2,24,4,bright)
      r(x,y+6,4,20,col);r(x+24,y+6,4,20,col)
      r(x,y+6,28,20,col);r(x+2,y+8,24,5,bright)
      r(x+4,y+26,5,14,'#706060');r(x+19,y+26,5,14,'#706060')
      r(x+4,y+38,19,4,'#605050')
    }

    const drawPlant=(x:number,y:number,big=false)=>{
      const s=big?1.5:1.0
      const pw=Math.round(22*s),ph=Math.round(20*s)
      const px2=x+Math.round(3*s),py2=y+Math.round(28*s)
      ctx.fillStyle='rgba(0,0,0,0.18)';ctx.fillRect(x-2,y+Math.round(48*s),Math.round(30*s),6)
      r(px2,py2,pw,ph,C.pot);r(px2,py2,pw,4,C.potR);r(px2,py2+ph-5,pw,5,C.potD)
      r(px2+2,py2+3,pw-4,5,'#2a1808')
      r(px2+Math.round(8*s),y+Math.round(10*s),4,Math.round(20*s),'#286020')
      r(x,y,Math.round(20*s),Math.round(16*s),C.plt2)
      r(x,y,Math.round(17*s),Math.round(10*s),C.plt1)
      r(x+Math.round(10*s),y-Math.round(5*s),Math.round(18*s),Math.round(18*s),C.plt2)
      r(x+Math.round(11*s),y-Math.round(5*s),Math.round(15*s),Math.round(11*s),C.plt1)
      r(x+Math.round(4*s),y-Math.round(8*s),Math.round(14*s),Math.round(20*s),C.plt1)
      r(x+Math.round(5*s),y-Math.round(8*s),Math.round(12*s),Math.round(9*s),'#70e070')
      r(x+Math.round(2*s),y+Math.round(18*s),Math.round(10*s),Math.round(8*s),C.plt3)
      r(x+Math.round(14*s),y+Math.round(15*s),Math.round(8*s),Math.round(6*s),C.plt3)
    }

    const drawFrame=(x:number,y:number,ci:number)=>{
      const arts=['#3060b8','#a02040','#206040','#907030']
      r(x,y,36,28,C.fr);r(x+3,y+3,30,22,C.frD)
      r(x+4,y+4,28,20,arts[ci%arts.length]);r(x+5,y+5,12,7,'rgba(255,255,255,0.2)')
    }

    const drawDeskItems=(x:number,y:number,type:number)=>{
      if(type===0){
        r(x,y+2,10,10,C.cup);r(x+1,y+2,8,3,C.cupH);r(x+2,y+3,6,3,'#3a1a08')
      } else if(type===1){
        r(x,y,5,12,C.book1);r(x+6,y+2,5,10,C.book2);r(x,y,1,12,'rgba(255,255,255,0.25)')
      } else {
        r(x+2,y+6,8,8,'#d06030');r(x+5,y,5,8,'#40a040');r(x+3,y+1,3,6,'#50c050')
      }
    }

    // ✅ 회의실 회의 테이블
    const drawConferenceTable=(x:number,y:number,w:number,h:number)=>{
      ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(x+6,y+h+6,w-8,8)
      r(x,y,w,h,C.mtbl)
      r(x,y,w,5,C.mtblL)
      r(x+3,y+3,w-6,8,'rgba(255,220,140,0.25)')
      r(x,y,4,h,C.mtblL);r(x+w-4,y,4,h,C.mtblD)
      r(x,y+h-4,w,4,C.mtblD)
      // 테이블 위 아이템들
      r(x+w/2-20,y+8,8,8,C.cup);r(x+w/2-20+1,y+8,6,3,C.cupH)
      r(x+w/2+5,y+8,8,8,C.cup);r(x+w/2+5+1,y+8,6,3,C.cupH)
      r(x+w/2-8,y+6,16,4,'#e0e8f0');r(x+w/2-6,y+12,12,3,'#c0c8d0')
      // 중앙 장식
      ctx.fillStyle='rgba(255,220,100,0.4)';ctx.beginPath()
      ctx.arc(x+w/2,y+h/2,18,0,Math.PI*2);ctx.fill()
      ctx.strokeStyle='rgba(200,160,60,0.6)';ctx.lineWidth=1.5
      ctx.beginPath();ctx.arc(x+w/2,y+h/2,18,0,Math.PI*2);ctx.stroke()
    }

    // ✅ 회의실 의자 (테이블 주변)
    const drawMeetingChair=(x:number,y:number,w=22,h=18,col='#6858a8')=>{
      ctx.fillStyle='rgba(0,0,0,0.12)';ctx.fillRect(x+2,y+h+2,w-2,4)
      r(x,y,w,5,col+'cc')
      r(x,y+5,w,h-5,col)
      r(x+2,y+7,w-4,4,col+'ee')
    }

    // ✅ 화이트보드
    const drawWhiteboard=(x:number,y:number,w:number,h:number)=>{
      r(x-3,y-3,w+6,h+6,C.wbD)
      r(x,y,w,h,C.wb)
      r(x+4,y+4,w-8,h-8,C.wbF)
      // 화이트보드 내용 (줄)
      ctx.strokeStyle='rgba(100,160,220,0.6)';ctx.lineWidth=1
      for(let i=0;i<4;i++) rl(x+8,y+12+i*12,x+w-8,y+12+i*12,'rgba(100,160,220,0.4)',1)
      // 차트 모양
      r(x+w-40,y+8,30,h-16,'rgba(200,240,200,0.4)')
      r(x+w-36,y+h-22,6,14,'#60b060');r(x+w-28,y+h-30,6,22,'#4090d0');r(x+w-20,y+h-18,6,10,'#e08040')
      // 트레이
      r(x,y+h,w,6,C.wbD);r(x+4,y+h+1,8,4,'#e04040');r(x+14,y+h+1,8,4,'#808080')
    }

    // ✅ 회의실 표지판
    const drawRoomSign=(x:number,y:number,text:string)=>{
      ctx.font='bold 11px "Jua", monospace'
      const tw=ctx.measureText(text).width+16
      ctx.fillStyle='rgba(30,20,60,0.92)';ctx.strokeStyle='rgba(200,160,80,0.8)';ctx.lineWidth=1.5
      ctx.beginPath();ctx.roundRect(x-tw/2,y,tw,18,4);ctx.fill();ctx.stroke()
      ctx.fillStyle='#f0d890';ctx.textAlign='center';ctx.fillText(text,x,y+13);ctx.textAlign='left'
    }

    const drawLabel=(cx2:number,cy:number,name:string,active:boolean,color:string)=>{
      const bob=Math.sin(tickRef.current*2)*2,by=cy+bob-28
      ctx.font='bold 11px "Jua", monospace'
      const tw=ctx.measureText(name).width+14
      ctx.fillStyle=active?color:'rgba(20,14,40,0.92)'
      ctx.strokeStyle=active?'#ffffff':'rgba(255,255,255,0.5)'
      ctx.lineWidth=1.5
      ctx.beginPath();ctx.roundRect(cx2-tw/2,by,tw,16,5);ctx.fill();ctx.stroke()
      ctx.fillStyle='#ffffff';ctx.font='bold 11px "Jua", monospace'
      ctx.textAlign='center';ctx.fillText(name,cx2,by+12);ctx.textAlign='left'
    }

    const drawBubble=(bx:number,by:number,text:string,color:string)=>{
      const bob=Math.sin(tickRef.current*2.5)*2,finalY=by+bob-50
      ctx.font='10px "Jua", monospace'
      const tw=ctx.measureText(text).width+16
      ctx.fillStyle='rgba(255,255,255,0.96)';ctx.strokeStyle=color;ctx.lineWidth=1.5
      ctx.beginPath();ctx.roundRect(bx-tw/2,finalY,tw,20,6);ctx.fill();ctx.stroke()
      ctx.fillStyle='rgba(255,255,255,0.96)';ctx.beginPath()
      ctx.moveTo(bx-5,finalY+20);ctx.lineTo(bx+5,finalY+20);ctx.lineTo(bx,finalY+28);ctx.fill()
      ctx.fillStyle='#1a1030';ctx.font='bold 10px "Jua", monospace'
      ctx.textAlign='center';ctx.fillText(text,bx,finalY+14);ctx.textAlign='left'
    }

    const drawChar=(
      px:number,py:number,charData:typeof CHARS[string],
      walking:boolean,frame:number,
      highlight:boolean,name:string,
      showBubble:boolean,bubbleText:string,
      sitting=false
    )=>{
      const ch=charData
      const iF=ch.gender==='F'
      if(highlight){
        ctx.fillStyle=ch.accent+'55'
        ctx.beginPath();ctx.arc(px+14,py+22,20,0,Math.PI*2);ctx.fill()
      }
      ctx.fillStyle='rgba(0,0,0,0.22)';ctx.fillRect(px+2,py+52,22,5)
      const drawH=()=>{
        if(ch.hairStyle==='side'){r(px+3,py,20,7,ch.hair);r(px+2,py+3,5,10,ch.hair);r(px+21,py+3,4,10,ch.hair)}
        else if(ch.hairStyle==='bob'){r(px+2,py,22,9,ch.hair);r(px+2,py+7,5,16,ch.hair);r(px+19,py+7,5,16,ch.hair);r(px+3,py,20,4,ch.hair)}
        else if(ch.hairStyle==='long'){r(px+2,py,22,8,ch.hair);r(px+2,py+7,5,28,ch.hair);r(px+19,py+7,5,28,ch.hair);r(px+3,py+32,4,10,ch.hair);r(px+19,py+32,4,10,ch.hair)}
        else if(ch.hairStyle==='pony'){r(px+3,py,20,8,ch.hair);r(px+19,py+7,5,10,ch.hair);r(px+2,py+7,5,8,ch.hair);r(px+22,py+12,9,22,ch.hair);r(px+22,py+12,3,3,'#d08888')}
        else if(ch.hairStyle==='messy'){r(px+2,py-3,22,12,ch.hair);r(px+1,py-5,8,8,ch.hair);r(px+17,py-4,9,7,ch.hair);r(px+2,py+7,4,10,ch.hair);r(px+20,py+7,4,10,ch.hair)}
        else{r(px+3,py,20,7,ch.hair);r(px+3,py+5,4,6,ch.hair);r(px+19,py+5,4,6,ch.hair)}
      }
      drawH()
      r(px+3,py+7,22,20,ch.skin)
      if(iF){
        r(px+7,py+13,5,5,'#181020');r(px+16,py+13,5,5,'#181020')
        r(px+6,py+12,7,3,'#181020');r(px+15,py+12,7,3,'#181020')
        r(px+8,py+15,2,1,'#fff');r(px+17,py+15,2,1,'#fff')
        ctx.globalAlpha=0.35;ctx.fillStyle='#ffaaaa'
        ctx.fillRect(px+4,py+18,5,4);ctx.fillRect(px+19,py+18,5,4);ctx.globalAlpha=1
        r(px+10,py+22,8,3,'#d85878');r(px+11,py+23,6,2,'#f070a0')
      } else {
        r(px+7,py+13,5,5,'#181828');r(px+16,py+13,5,5,'#181828')
        r(px+8,py+15,2,1,'#fff');r(px+17,py+15,2,1,'#fff')
        r(px+10,py+22,8,2,ch.skin.replace('f4','d8').replace('f8','d8'))
      }
      r(px+13,py+19,2,2,ch.skin.replace('f4','c8').replace('f8','c8'))
      if(ch.acc==='glass'){
        ctx.strokeStyle='#303048';ctx.lineWidth=1.2
        ctx.strokeRect(px+6,py+12,7,7);ctx.strokeRect(px+15,py+12,7,7)
        ctx.beginPath();ctx.moveTo(px+13,py+15);ctx.lineTo(px+15,py+15);ctx.stroke()
      }
      if(ch.acc==='head'){
        ctx.strokeStyle='#202020';ctx.lineWidth=2
        ctx.beginPath();ctx.arc(px+14,py+10,12,Math.PI,0,false);ctx.stroke()
        r(px+1,py+8,4,8,'#2a2a2a');r(px+23,py+8,4,8,'#2a2a2a');r(px+1,py+14,5,6,'#383838')
      }
      if(ch.acc==='ear'){r(px+1,py+17,3,3,'#f8d020');r(px+1,py+20,3,6,'#f8d020');r(px+24,py+17,3,3,'#f8d020');r(px+24,py+20,3,6,'#f8d020')}
      if(ch.acc==='tie'){r(px+12,py+30,5,16,ch.accent);r(px+11,py+30,7,4,ch.accent);r(px+13,py+28,3,4,'rgba(255,255,255,0.3)')}
      r(px+3,py+27,22,16,ch.top)
      if(iF){r(px+4,py+27,20,3,'rgba(255,255,255,0.25)')}
      else{r(px+3,py+27,3,16,ch.top);r(px+22,py+27,3,16,ch.top)}
      if(sitting){
        r(px+4,py+43,20,14,ch.bottom)
        drawLabel(px+14,py,name,highlight,ch.accent)
        if(showBubble) drawBubble(px+14,py,bubbleText,ch.accent)
        return
      }
      const lo=walking?(frame===1?4:frame===3?-4:0):0
      r(px+4,py+43,9,14,ch.bottom);r(px+15,py+43-lo,9,14,ch.bottom)
      r(px+4,py+57,9,6,ch.shoe);r(px+15,py+57-lo,9,6,ch.shoe)
      if(walking){r(px+0,py+29,4,12,ch.top);r(px+24,py+29,4,12,ch.top)}
      else{r(px+0,py+29,4,10,ch.top);r(px+24,py+29,4,10,ch.top)}
      drawLabel(px+14,py,name,highlight,ch.accent)
      if(showBubble) drawBubble(px+14,py,bubbleText,ch.accent)
    }

    const BUBBLE:Record<string,string>={
      router:'작업 배정 중',web:'코드 작성 중',content:'콘텐츠 제작',
      edu:'교육 자료',research:'데이터 분석',ops:'시스템 점검',
    }

    // ✅ 업무 중요도 순서로 재배치: 총괄→웹→콘텐츠 / 연구→교육→운영
    const CHAIR_COLORS=['#7868a8','#688898','#988870','#809870','#887060','#688070']

    // 캔버스 크기: 900x520
    // Room1: 4,4,548,512  Room2: 558,4,338,512
    const R1={x:4,y:4,w:548,h:512}
    const R2={x:558,y:4,w:338,h:512}

    // ✅ 6명 모두 책상 배치 (3열 2행)
    // col: 92, 240, 388 / row: 168, 318
    const SEATS=[
      {x:92, y:168, charId:'router',  dw:72},  // 총괄실장 (1순위)
      {x:240,y:168, charId:'web',     dw:72},  // 웹팀 (2순위)
      {x:388,y:168, charId:'content', dw:72},  // 콘텐츠팀 (3순위)
      {x:92, y:318, charId:'research',dw:72},  // 연구팀 (4순위)
      {x:240,y:318, charId:'edu',     dw:72},  // 교육팀 (5순위)
      {x:388,y:318, charId:'ops',     dw:72},  // 운영팀 (6순위)
    ]

    let animId:number
    const loop=()=>{
      tickRef.current+=0.04
      const t=tickRef.current
      const active=activeRef.current
      const s=settingsRef.current
      const customTeams=customTeamsRef.current

      ctx.fillStyle=C.bg;ctx.fillRect(0,0,cv.width,cv.height)

      /* ── Room 1: 사무실 ── */
      drawRoom(R1.x,R1.y,R1.w,R1.h)
      drawShelf(R1.x+14,R1.y+8,200)
      drawShelf(R1.x+230,R1.y+8,200)
      drawClock(R1.x+R1.w/2,R1.y+30,t)
      drawPlant(R1.x+12,R1.y+60,true)
      drawPlant(R1.x+R1.w-52,R1.y+60,true)

      // ✅ 6명 모두 책상+의자+모니터+캐릭터
      SEATS.forEach(({x,y,charId,dw},i)=>{
        const isActive=active===charId
        const name=s.agentNames?.[charId]||CHARS[charId].label
        const charData=CHARS[charId]
        drawChair(x+dw+5,y-2,CHAIR_COLORS[i])
        drawDesk(x,y,dw,38)
        drawMonitor(x+dw/2-5,y-36,t*(1.1+i*0.13))
        drawDeskItems(x+4,y+4,i%3)
        const bob=Math.sin(t*1.7+i*0.9)*0.8
        drawChar(x+dw/2-14,y-5+bob,charData,false,0,isActive,name,isActive,BUBBLE[charId]||'작업 중',true)
      })

      // ✅ 커스텀 팀 (3번째 행, 최대 3팀)
      if(customTeams.length>0){
        customTeams.slice(0,3).forEach((team,i)=>{
          const cx=92+i*148
          const cy=448
          const dw=72
          const isActive=active===(team.id as AgentId)
          const name=s.agentNames?.[team.id]||team.name
          const charData={...getCustomChar(team.id),label:team.name}
          drawChair(cx+dw+5,cy-2,CHAIR_COLORS[(i+3)%CHAIR_COLORS.length])
          drawDesk(cx,cy,dw,38)
          drawMonitor(cx+dw/2-5,cy-36,t*(1.2+i*0.15))
          drawDeskItems(cx+4,cy+4,i%3)
          const bob=Math.sin(t*1.5+i*1.2)*0.8
          drawChar(cx+dw/2-14,cy-5+bob,charData,false,0,isActive,name,isActive,'작업 중',true)
        })
      }

      /* ── Room 2: 회의실 ── */
      drawRoom(R2.x,R2.y,R2.w,R2.h)
      drawPlant(R2.x+12,R2.y+62,true)
      drawPlant(R2.x+R2.w-52,R2.y+62,true)

      // 회의실 표지판
      drawRoomSign(R2.x+R2.w/2,R2.y+10,'🏢 회의실')

      // 화이트보드 (벽에)
      drawWhiteboard(R2.x+65,R2.y+8,R2.w-130,68)

      // 회의 테이블 (중앙)
      const tx=R2.x+40,ty=R2.y+140,tw=258,th=110
      drawConferenceTable(tx,ty,tw,th)

      // 테이블 주변 의자들 (상단 4개)
      const chairCols=['#7868a8','#688898','#988870','#809870','#887060','#786888','#688060','#986870']
      for(let i=0;i<4;i++) drawMeetingChair(tx+16+i*60,ty-24,52,20,chairCols[i])
      // 하단 4개
      for(let i=0;i<4;i++) drawMeetingChair(tx+16+i*60,ty+th+8,52,20,chairCols[i+4])
      // 왼쪽 2개
      drawMeetingChair(tx-28,ty+20,20,48,chairCols[0])
      drawMeetingChair(tx-28,ty+76,20,48,chairCols[1])
      // 오른쪽 2개
      drawMeetingChair(tx+tw+8,ty+20,20,48,chairCols[2])
      drawMeetingChair(tx+tw+8,ty+76,20,48,chairCols[3])

      // 프레임/그림들
      drawFrame(R2.x+18,R2.y+88,0)
      drawFrame(R2.x+R2.w-56,R2.y+88,1)

      // 회의실 소파 (하단)
      r(R2.x+50,R2.y+310,238,12,C.sfA)
      r(R2.x+50,R2.y+322,238,50,C.sf);r(R2.x+53,R2.y+324,232,12,C.sfL)
      r(R2.x+50,R2.y+372,238,14,C.sfA)
      r(R2.x+50,R2.y+322,14,50,C.sfD);r(R2.x+274,R2.y+322,14,50,C.sfD)

      // 사이드 테이블
      r(R2.x+130,R2.y+295,78,18,C.mtbl);r(R2.x+130,R2.y+295,78,4,C.mtblL)
      r(R2.x+140,R2.y+307,8,10,C.mtblD);r(R2.x+192,R2.y+307,8,10,C.mtblD)

      animId=requestAnimationFrame(loop)
    }
    animId=requestAnimationFrame(loop)
    return()=>cancelAnimationFrame(animId)
  },[])

  return (
    <canvas ref={canvasRef} width={900} height={520}
      style={{
        imageRendering:'pixelated',display:'block',maxWidth:'100%',
        borderRadius:'12px',border:'1px solid #ede5e0',
        boxShadow:'0 4px 24px rgba(32,16,24,0.15)'
      }}
    />
  )
}
