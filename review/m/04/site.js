(() => {
  'use strict';
  const {stations} = window.HUTOUPI_PLAN;
  const track=document.getElementById('tabs'), holder=document.getElementById('station-panels');
  const tabs=[],panels=[];
  const make=(tag,cl,label)=>{const e=document.createElement(tag);if(cl)e.className=cl;if(label)e.textContent=label;return e;};
  function select(i,focus=false){
    tabs.forEach((b,j)=>{const v=i===j;b.setAttribute('aria-selected',String(v));b.tabIndex=v?0:-1;panels[j].hidden=!v;});
    if(focus)tabs[i].focus({preventScroll:true});
  }
  for(const [i,s] of stations.entries()){
    const b=make('button','route-btn');b.type='button';b.id='tab-'+s.code;b.setAttribute('role','tab');b.setAttribute('aria-controls','panel-'+s.code);b.append(make('b','',s.code),make('span','',s.name));
    b.addEventListener('click',()=>select(i));
    b.addEventListener('keydown',e=>{const to={ArrowRight:(i+1)%stations.length,ArrowLeft:(i+stations.length-1)%stations.length,Home:0,End:stations.length-1};if(Object.hasOwn(to,e.key)){e.preventDefault();select(to[e.key],true);}});
    track.append(b);tabs.push(b);
    const p=make('section','panel visitor-panel');p.id='panel-'+s.code;p.setAttribute('role','tabpanel');p.setAttribute('aria-labelledby',b.id);p.tabIndex=0;
    const f=make('figure','station-figure');const img=make('img');img.src=s.image;img.alt=s.name+'實景模擬';img.loading='lazy';img.decoding='async';f.append(img,make('figcaption','','實景模擬'));
    const c=make('div','station-copy');c.append(make('p','kicker',s.role),make('h3','',s.name),make('p','',s.summary));
    const l=make('ul','point-list');for(const [key,value] of s.points){const li=make('li');li.append(make('b','',key),make('span','',value));l.append(li);}c.append(l);const more=make('a','guide-cta','深入了解本站');more.href='#guide/'+s.code.toLowerCase()+'/overview';c.append(more);p.append(f,c);holder.append(p);panels.push(p);
  }
  select(0);
  document.querySelectorAll('.station-link').forEach(a=>a.addEventListener('click',()=>{const i=Number(a.dataset.station);select(i);requestAnimationFrame(()=>tabs[i].focus({preventScroll:true}));}));
})();
