(() => {
 'use strict';
 const by=id=>document.getElementById('ride-'+id), stations=window.HUTOUPI_PLAN.stations;
 const points=[95,438,567,905], gap=[796,299.2,779.4];
 const play=by('play'), reset=by('reset'), direction=by('direction'), range=by('range');
 const car=by('car'), status=by('status'), phase=by('phase'), next=by('next'), guide=by('guide'), spot=by('stops');
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let dir=1, origin=0, elapsed=0, playing=false, finished=false, raf=0, last=0;
 let parts=[], total=0, currentKey='';
 const stopButtons=stations.map((s,i)=>{
  const b=document.createElement('button');b.type='button';b.className='ride-stop';
  const image=document.createElement('img');image.src=s.image;image.alt='';image.width=120;image.height=74;image.loading='lazy';
  const label=document.createElement('span'), tag=document.createElement('small'), name=document.createElement('strong');
  tag.textContent=s.code;name.textContent=s.name;label.append(tag,name);b.append(image,label);
  b.setAttribute('aria-label','從'+s.name+'起程');
  b.onclick=()=>setOrigin(i,true);spot.append(b);return b;
 });
 function plan(){
  total=0;parts=[];
  for(let i=origin;;i+=dir){
   const j=i+dir;
   if(j<0||j>3)break;
   if(i!==origin){parts.push({from:i,to:i,start:total,end:total+1500});total+=1500;}
   const duration=gap[Math.min(i,j)]*13;
   parts.push({from:i,to:j,start:total,end:total+duration});total+=duration;
  }
 }
 function name(i){return stations[i].name;}
 function setOrigin(i,user=false){
  halt();elapsed=0;finished=false;origin=i;
  if(user&&((i===0&&dir===-1)||(i===3&&dir===1)))dir=-dir;
  plan();draw();
 }
 function halt(){playing=false;last=0;cancelAnimationFrame(raf);}
 function announce(state,station,dest) {
  const key=[state,station,dest].join('/');
  if(key===currentKey)return;
  currentKey=key;phase.textContent=state;
  status.textContent=state==='行進中'?name(station)+' 至 '+name(dest):name(station);
  next.textContent=state==='到達終點'?'本趟結束，可選另一站或切換方向。':
    state==='行進中'?'下一站：'+name(dest):name(dest)?'下一站：'+name(dest):'已在此方向的終點。';
  const view=state==='行進中'?dest:station;
  guide.href='#guide/'+stations[view].code.toLowerCase()+'/overview';
  guide.querySelector('img').src=stations[view].image;
  guide.querySelector('span').textContent='看'+name(view)+'導覽';
 }
 function draw(){
  const end=dir===1?3:0;
  let display=origin,x=points[origin];
  if(elapsed>=total&&finished){display=end;x=points[end];announce('到達終點',end,null);}
  else if(elapsed<=0){announce(playing?'準備出發':'等待播放',origin,origin+dir);}
  else {
   const p=parts.find(piece=>elapsed<piece.end) || parts.at(-1);
   if(p){
    const fraction=Math.min(1,(elapsed-p.start)/(p.end-p.start));
    const eased=motion.matches?(fraction>=.5?1:0):fraction*fraction*(3-2*fraction);
    x=points[p.from]+(points[p.to]-points[p.from])*eased;
    display=p.from;
    announce(p.from===p.to?'停站片刻':'行進中',p.from,p.from===p.to?p.from+dir:p.to);
   }
  }
  car.setAttribute('transform','translate('+x.toFixed(2)+' 220)');
  stopButtons.forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===origin));b.classList.toggle('ride-is-current',i===display);});
  by('markers').querySelectorAll(':scope > g').forEach((g,i)=>g.classList.toggle('is-current',display===i));
  const pct=total?elapsed/total:0, steps=Math.round(pct*1000), value=Math.round(pct*100)+'%';
  if(Number(range.value)!==steps)range.value=String(steps);
  if(by('percent').value!==value){by('percent').value=value;range.setAttribute('aria-valuetext',value);}
  const label=playing?'暫停行程':finished?'再次播放':elapsed>0?'繼續播放':'播放行程';
  if(play.querySelector('span').textContent!==label){
   play.querySelector('span').textContent=label;
   by('play-icon').setAttribute('d',playing?'M8 5v14m8-14v14':'M8 5l12 7-12 7z');
  }
  direction.querySelector('span').textContent=dir===1?'往林場｜切換方向':'往新化｜切換方向';
 }
 function tick(now){
  if(!playing)return;
  elapsed=Math.min(total,elapsed+(last?Math.min(80,now-last):0));last=now;
  if(elapsed>=total){finished=true;halt();}
  draw();if(playing)raf=requestAnimationFrame(tick);
 }
 play.onclick=()=>{
  if(playing){halt();draw();return;}
  if(finished){elapsed=0;finished=false;}
  playing=true;last=0;draw();raf=requestAnimationFrame(tick);
 };
 reset.onclick=()=>setOrigin(origin);
 direction.onclick=()=>{dir=-dir;const end=dir===1?3:0;setOrigin(origin===end?(dir===1?0:3):origin);};
 range.oninput=()=>{halt();elapsed=Number(range.value)/1000*total;finished=elapsed>=total;draw();};
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){halt();draw();}});
 [play,reset,direction,range].forEach(e=>e.disabled=false);
 plan();draw();
})();
