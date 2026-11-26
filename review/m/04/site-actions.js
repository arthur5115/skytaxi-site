(() => {
  'use strict';
  const ns='http://www.w3.org/2000/svg';
  const paths={
    ride:'M3 6h18M6 10h12c2 0 3 2 3 4v2c0 2-1 3-3 3H6c-2 0-3-1-3-3v-2c0-2 1-4 3-4Zm0 4h12M8 6v4m8-4v4',
    route:'M6 5h9a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h9 M6 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z M18 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
    guide:'M12 7c-3-2-6-2-9-1v13c3-1 6-1 9 1 3-2 6-2 9-1V6c-3-1-6-1-9 1Zm0 0v13M6 10h3m-3 4h3m6-4h3m-3 4h3',
    trips:'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15',
    ticket:'M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6Zm13 1v2m0 2v2m0 2v2',
    gate:'M3 20h18M5 20V10m14 10V10M3 10h18L12 4 3 10Zm6 10v-5a3 3 0 0 1 6 0v5',
    bed:'M3 18V6m0 10h18m0 2v-7a2 2 0 0 0-2-2h-8v7M3 12h8M5 9h3',
    gathering:'M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM3 15v-1a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1m2 0v-1a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v1M3 16h18m-15 0v4m12-4v4',
    forest:'M8 3 3 10h3l-4 6h12l-4-6h3L8 3Zm0 13v5m9-17 4 6h-3l4 6h-6m1 0v5',
    shop:'M4 10v10h16V10M3 10l2-6h14l2 6c-1 3-4 3-5 0-1 3-4 3-5 0-1 3-4 3-5 0-1 2-3 1-3 0Zm6 10v-5h6v5',
    waypoint:'M12 21c-4-4-7-7-7-11a7 7 0 1 1 14 0c0 4-3 7-7 11Zm0-14a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    accessible:'M14 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm-1 2-1 6h5l3 5m-7-9h4m-7 2a5 5 0 1 0 6 6',
    calendar:'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2-2v4m10-4v4M3 10h18m-13 6 2 2 5-5',
    park:'M5 15 9 6l4 7 3-4 4 6M3 17c3-2 5 2 8 0s5 2 10 0M3 21c3-2 5 2 8 0s5 2 10 0',
    top:'M4 4h16m-8 16V8m-5 5 5-5 5 5',
    skip:'M3 5v8h15m-5-5 5 5-5 5m7-10v10'
  };
  function icon(key) {
    const svg=document.createElementNS(ns,'svg');
    svg.setAttribute('class','visitor-action-icon');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    svg.setAttribute('viewBox','0 0 24 24');
    svg.setAttribute('fill','none');
    svg.setAttribute('stroke','currentColor');
    svg.setAttribute('stroke-width','1.7');
    svg.setAttribute('stroke-linecap','round');
    svg.setAttribute('stroke-linejoin','round');
    const line=document.createElementNS(ns,'path');
    line.setAttribute('d',paths[key]);
    svg.append(line);
    return svg;
  }
  function add(element,key,slot=element) {
    if(!element || !slot || element.classList.contains('visitor-has-action-icon')) return;
    slot.prepend(icon(key));
    element.classList.add('visitor-has-action-icon');
  }
  const first=(sel,key)=>add(document.querySelector(sel),key);
  first('body > .skip','skip');
  first('.bar nav a[href="#route"]','route');
  first('.bar nav a[href="#ride"]','ride');
  first('.bar nav a[href="#guide/t1/overview"]','guide');
  first('.bar nav a[href="#trips"]','trips');
  first('.bar nav a[href="#visit"]','ticket');
  first('.hero .actions a[href="#route"]','route');
  first('.hero .actions a[href="#ride"]','ride');
  first('.hero .actions a[href="#visit"]','ticket');
  first('#visit .park-banner a','park');
  first('footer a[href="#top"]','top');
  const stations=['gate','bed','gathering','forest'];
  const tripThemes=['shop','bed','gathering','forest'];
  document.querySelectorAll('#trips .station-link').forEach(a=>add(a,tripThemes[Number(a.dataset.station)]));
  const questions=['ticket','waypoint','accessible','calendar'];
  document.querySelectorAll('#visit .visitor-faq summary').forEach((el,i)=>add(el,questions[i%questions.length]));
  function updateRoute() {
    document.querySelectorAll('#tabs .route-btn').forEach((b,i)=>add(b,stations[i%stations.length],b.querySelector('span')));
    document.querySelectorAll('#station-panels .guide-cta').forEach(a=>add(a,'guide'));
  }
  updateRoute();
  // Only the route and route panels use runtime-generated controls here.
  for(const id of ['tabs','station-panels']) {
    const root=document.getElementById(id);
    if(root) new MutationObserver(updateRoute).observe(root,{childList:true});
  }
})();
