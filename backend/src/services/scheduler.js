const PRIORITY={urgent:4,high:3,medium:2,low:1};
const mins=(iso)=>Math.floor(new Date(iso).getTime()/60000);
const iso=(m)=>new Date(m*60000).toISOString();
function overlaps(a,b,c,d){return a<d && c<b;}
function normalizeRanges(ranges){return (ranges||[]).map(r=>({start:mins(r.start),end:mins(r.end)})).filter(r=>Number.isFinite(r.start)&&Number.isFinite(r.end)&&r.end>r.start).sort((a,b)=>a.start-b.start);}
/** Deterministic earliest-deadline/priority scheduler. Input timestamps must include timezone. */
export function generateTimetable({tasks=[],availability=[],existingSessions=[],preferences={}}){
 const sessionLength=Math.max(15,Math.min(240,Number(preferences.sessionMinutes)||50));
 const shortBreak=Math.max(0,Math.min(60,Number(preferences.shortBreakMinutes??10)));
 const maxDaily=Math.max(30,Number(preferences.maxDailyMinutes)||240);
 const horizon=normalizeRanges(availability);
 const locked=existingSessions.filter(s=>s.is_locked).map(s=>({start:mins(s.start_at),end:mins(s.end_at)}));
 const occupied=[...locked,...existingSessions.filter(s=>!s.is_locked).map(s=>({start:mins(s.start_at),end:mins(s.end_at)}))];
 const dailyUsed=new Map(); for(const session of existingSessions){const day=new Date(session.start_at).toISOString().slice(0,10);const duration=Number(session.duration_minutes)||Math.max(0,mins(session.end_at)-mins(session.start_at));dailyUsed.set(day,(dailyUsed.get(day)||0)+duration);} const output=[]; const warnings=[];
 const queue=tasks.map(t=>({...t,remaining:Math.max(0,Number(t.remaining_minutes??t.estimated_minutes??0)),deadline: t.deadline?mins(t.deadline):Infinity,score:PRIORITY[t.priority]||1})).filter(t=>t.remaining>0).sort((a,b)=>a.deadline-b.deadline||b.score-a.score||String(a.id).localeCompare(String(b.id)));
 for(const task of queue){ let remaining=task.remaining; const ranges=horizon.filter(r=>r.start<task.deadline);
   for(const range of ranges){ if(!remaining) break; let cursor=range.start;
     while(cursor<range.end && remaining>0){ const day=new Date(cursor*60000).toISOString().slice(0,10); const used=dailyUsed.get(day)||0; if(used>=maxDaily) break;
       const next=occupied.filter(x=>x.end>cursor&&x.start<range.end).sort((a,b)=>a.start-b.start)[0];
       if(next && next.start<=cursor){cursor=Math.max(cursor,next.end)+shortBreak;continue;}
       const gapEnd=Math.min(range.end,next?.start??range.end); const capacity=Math.min(gapEnd-cursor,maxDaily-used,remaining,sessionLength);
       if(capacity>=15){const end=cursor+capacity; const reason=`${task.priority||'normal'} priority · ${task.deadline===Infinity?'flexible deadline':'deadline-aware allocation'} · ${task.subject_name||'General study'}`; output.push({task_id:task.id||null,subject_id:task.subject_id||null,title:task.title||task.name||'Study session',start_at:iso(cursor),end_at:iso(end),duration_minutes:capacity,is_locked:false,reason}); occupied.push({start:cursor,end}); occupied.sort((a,b)=>a.start-b.start); dailyUsed.set(day,used+capacity); remaining-=capacity; cursor=end+shortBreak;
       } else {cursor=next?Math.max(cursor+1,next.end+shortBreak):range.end;}
     }
   }
   if(remaining>0) warnings.push({task_id:task.id||null,title:task.title||task.name||'Untitled task',unallocated_minutes:remaining,message:'Not enough available study time before this task deadline.'});
 }
 return {sessions:output,warnings,summary:{scheduled_minutes:output.reduce((s,x)=>s+x.duration_minutes,0),unscheduled_tasks:warnings.length,session_count:output.length}};
}
