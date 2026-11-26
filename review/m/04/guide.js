(() => {
  'use strict';
  const layers=[['overview','車站總覽'],['experience','站內體驗'],['walk','遊客動線'],['itinerary','建議遊程'],['service','到訪與服務']];
  const states=Object.fromEntries(window.HUTOUPI_PLAN.stations.map(s=>[s.code.toLowerCase(),s]));
  const guide=window.HUTOUPI_GUIDE, visuals=window.HUTOUPI_VISUALS, photoCards=window.HUTOUPI_CARD_ASSETS;
  const root=document.getElementById('guide'), el=id=>document.getElementById('guide-'+id);
  const node=(tag,cl,t)=>{const e=document.createElement(tag);if(cl)e.className=cl;if(t)e.textContent=t;return e;};
  const url=(station,layer)=>'#guide/'+station+'/'+layer;
  const link=(t,href,cl,current=false)=>{const a=node('a',cl,t);a.href=href;if(current)a.setAttribute('aria-current','page');return a;};
  function read(){
    const match=/^#guide\/(t[1-4])\/(overview|experience|walk|itinerary|service)$/.exec(location.hash);
    return match?[match[1],match[2]]:null;
  }
  function img(src,alt,cl){
    const result=node('img',cl);result.src=src;result.alt=alt;result.decoding='async';result.loading='lazy';return result;
  }
  function symbols(names,station,theme,mini=false){
    const box=node('span','guide-art guide-art-'+theme+(mini?' guide-art-mini':''));
    box.setAttribute('aria-hidden','true');
    ['paper','accent','ink'].forEach((key,i)=>box.style.setProperty('--visual-'+key,visuals.palettes[station][i]));
    const inner=node('span','guide-art-symbols');
    names.split(' ').forEach((name,i)=>{
      if(i){inner.append(node('span','guide-art-connector'));}
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 64 64');svg.setAttribute('focusable','false');svg.innerHTML=visuals.marks[name];inner.append(svg);
    });
    box.append(inner);return box;
  }
  function layerArt(station,layer,compact=false){
    if(layer==='overview'||layer==='experience'){
      const src=layer==='overview'?states[station].image:'assets/guide/'+visuals.data[station].experience[1];
      return img(src,'',compact?'guide-key-photo guide-key-photo-small':'guide-key-photo');
    }
    const names=layer==='walk'?visuals.data[station].walk[1][0][2]:
      layer==='itinerary'?visuals.data[station].itinerary[1][1][2]:
      visuals.data[station].service[1].map(r=>r[2]).slice(0,2).join(' ');
    return symbols(names,station,layer,compact);
  }
  function smallLink(label,href,cl,station,layer,cur=false){
    const anchor=link('',href,cl,cur);
    anchor.append(layerArt(station,layer,true),node('span','guide-key-label',label));
    return anchor;
  }
  function detail(station,layer,entry,index){
    const [title,text]=entry;
    let art;
    const item=layer==='experience'?photoCards[station].experience[index]:visuals.data[station][layer][1][index];
    const photo=layer==='experience'?item.slice(1):photoCards[station][layer]?.[index];
    if(photo?.length){
      art=node('figure','guide-card-image');
      art.append(img('assets/guide/'+photo[0],photo[1]),node('figcaption','',photo[1]+'｜實景模擬'));
    }else{
      art=symbols(layer==='experience'?item[0]:item[2],station,layer);
    }
    const box=node('li','guide-detail-card guide-paired-card');
    box.append(art);
    const copy=node('div','guide-card-copy');box.append(copy);
    const h=node('h4','',title);copy.append(h);
    if(layer==='walk'||layer==='itinerary'){
      const list=node('ol','visual-steps guide-card-steps');
      for(const place of item[1].split('/'))list.append(node('li','',place));
      copy.append(list);
    }
    copy.append(node('p','',text));return box;
  }
  function render(station,layer,focus=false){
    const s=states[station], data=guide[station], n=layers.findIndex(v=>v[0]===layer);
    const [title,desc,entries,related]=data[layer];
    el('stations').replaceChildren(...Object.entries(states).map(([k,v])=>smallLink(v.name,url(k,'overview'),'guide-station',k,'overview',k===station)));
    const routeLink=link('','#route','guide-crumb-link');routeLink.append(symbols('sign',station,'walk',true),node('span','','四站總覽'));
    el('crumb').replaceChildren(routeLink,node('span','','›'),smallLink(s.name,url(station,'overview'),'guide-crumb-link',station,'overview'),node('span','','›'),node('span','',layers[n][1]));
    const head=node('div','guide-intro'), h=node('h3','',title);
    h.id='guide-active-title';h.tabIndex=-1;
    head.append(node('p','kicker',s.code+'・'+s.name),h,node('p','guide-description',desc));
    el('header').replaceChildren(head);
    el('depth').replaceChildren(...layers.map(([k,t],i)=>{
      const a=link('',url(station,k),'guide-level',k===layer);
      a.append(layerArt(station,k),node('span','guide-key-label',(i+1)+'　'+t));return a;
    }));
    const panel=el('content');
    if(layer==='overview'){
      const figure=node('figure','guide-figure guide-overview-hero');
      figure.append(img(s.image,s.name+'實景模擬','guide-image'),node('figcaption','','實景模擬，非現場照片'));
      const choices=node('div','guide-choices guide-paired-choices');
      layers.slice(1).forEach(([k,t])=>{
        const a=link('',url(station,k),'guide-choice');
        const label=node('span','guide-choice-copy');label.append(node('strong','',t),node('span','',data[k][0]));
        a.append(layerArt(station,k),label);choices.append(a);
      });
      panel.replaceChildren(figure,choices);
    }else{
      const list=node('ul','guide-details guide-paired-details guide-paired-'+layer);
      for(const [i,entry] of entries.entries())list.append(detail(station,layer,entry,i));
      const label=layer==='experience'?'具備模擬圖的場景已標註，其餘為體驗插圖。':
        ({walk:'動線示意，非比例地圖。',itinerary:'遊程示意，不代表已開放。',service:'行前服務圖解，實際服務以公告為準。'})[layer];
      panel.replaceChildren(list,node('p','guide-paired-caption',label));
      const relatedBox=node('div','guide-related-box');
      if(related)relatedBox.append(smallLink(related[1],url(related[0],'overview'),'guide-related',related[0],'overview'));
      if(layer==='service')relatedBox.append(smallLink('看全線到訪與票務','#visit','guide-related',station,'service'));
      if(relatedBox.childElementCount)panel.append(relatedBox);
    }
    const move=el('move');
    const previous=n?smallLink('上一層：'+layers[n-1][1],url(station,layers[n-1][0]),'guide-back',station,layers[n-1][0]):link('','#route','guide-back');
    if(!n)previous.append(symbols('sign',station,'walk',true),node('span','','返回四站總覽'));
    const next=n<layers.length-1?smallLink('下一層：'+layers[n+1][1],url(station,layers[n+1][0]),'guide-next',station,layers[n+1][0]):smallLink('回本站總覽',url(station,'overview'),'guide-next',station,'overview');
    move.replaceChildren(previous,next);
    if(focus){root.scrollIntoView({block:'start'});h.focus({preventScroll:true});}
  }
  const initial=read();if(initial)render(...initial,true);else render('t1','overview');
  window.addEventListener('hashchange',()=>{const key=read();if(key)render(...key,true);});
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href^="#guide/"]');
    if(a&&a.getAttribute('href')===location.hash){const key=read();if(key){e.preventDefault();render(...key,true);}}
  });
})();
