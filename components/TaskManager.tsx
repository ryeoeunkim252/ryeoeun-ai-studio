'use client'
import { useEffect, useState } from 'react'
import { loadData, saveData, type Task } from '@/lib/store'

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState<'all'|'todo'|'done'>('all')
  useEffect(()=>{ setTasks(loadData<Task[]>('nk_tasks',[])) },[])
  const save=(u:Task[])=>{ setTasks(u); saveData('nk_tasks',u) }
  const add=()=>{ if(!input.trim())return; save([{id:crypto.randomUUID(),text:input.trim(),agentId:'router',agentName:'미배정',done:false,createdAt:new Date().toISOString()},...tasks]); setInput('') }
  const toggle=(id:string)=>save(tasks.map(t=>t.id===id?{...t,done:!t.done}:t))
  const del=(id:string)=>save(tasks.filter(t=>t.id!==id))
  const filtered=tasks.filter(t=>filter==='all'?true:filter==='done'?t.done:!t.done)
  const done=tasks.filter(t=>t.done).length

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-[22px] font-semibold mb-1" style={{color:'var(--text)'}}>📋 작업 관리</h2>
        <p className="text-[13px] mb-4" style={{color:'var(--muted)'}}>전체 {tasks.length}개 · 완료 {done}개 · 남은 {tasks.length-done}개</p>

        {tasks.length>0&&(
          <div className="h-2 rounded-full mb-5 overflow-hidden" style={{background:'var(--bg2)'}}>
            <div className="h-2 rounded-full" style={{width:`${tasks.length?Math.round(done/tasks.length*100):0}%`,background:'var(--blush)',transition:'width .4s'}} />
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()}
            placeholder="새 작업 입력..." className="flex-1 px-4 py-3 text-[13px] outline-none rounded-xl"
            style={{background:'var(--card)',border:'1.5px solid var(--border)',color:'var(--text)'}} />
          <button onClick={add} className="px-5 py-3 rounded-xl text-[13px] font-medium" style={{background:'var(--blush)',color:'#fff'}}>추가</button>
        </div>

        <div className="flex gap-2 mb-4">
          {(['all','todo','done'] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)} className="px-4 py-1.5 rounded-full text-[12px]"
              style={{background:filter===f?'var(--blush)':'var(--card)',color:filter===f?'#fff':'var(--muted)',border:filter===f?'none':'1px solid var(--border)'}}>
              {f==='all'?'🗂 전체':f==='todo'?'⏳ 진행중':'✅ 완료'}
            </button>
          ))}
        </div>

        {filtered.length===0?(
          <div className="text-center py-16" style={{color:'var(--muted)'}}>
            <div style={{fontSize:40,marginBottom:12}}>🐰</div>
            <p className="text-[13px]">작업을 추가해보세요!</p>
          </div>
        ):(
          <div className="flex flex-col gap-2">
            {filtered.map(task=>(
              <div key={task.id} className="flex items-center gap-3 p-4 rounded-2xl"
                style={{background:'var(--card)',border:'1.5px solid var(--border)',opacity:task.done?.7:1}}>
                <button onClick={()=>toggle(task.id)} className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{background:task.done?'var(--blush)':'transparent',border:`2px solid ${task.done?'var(--blush)':'var(--border2)'}`,color:'#fff'}}>
                  {task.done&&'✓'}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px]" style={{color:task.done?'var(--muted)':'var(--text)',textDecoration:task.done?'line-through':'none'}}>{task.text}</p>
                  <p className="text-[10px] mt-0.5" style={{color:'var(--muted)'}}>{new Date(task.createdAt).toLocaleString('ko-KR')}</p>
                </div>
                <button onClick={()=>del(task.id)} className="opacity-30 hover:opacity-60 transition-all" style={{fontSize:16}}>🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
