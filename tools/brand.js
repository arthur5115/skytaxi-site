(function(){
  var top=document.querySelector('.top'),b=document.querySelector('.burger');
  function onS(){top.classList.toggle('solid',window.scrollY>window.innerHeight*0.6);}
  window.addEventListener('scroll',onS,{passive:true});onS();
  function shut(){document.body.classList.remove('menu-open');b.setAttribute('aria-expanded','false');}
  b.addEventListener('click',function(){var o=document.body.classList.toggle('menu-open');b.setAttribute('aria-expanded',o);});
  document.querySelectorAll('.menu a').forEach(function(a){a.addEventListener('click',shut);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.body.classList.contains('menu-open')){shut();b.focus();}});
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelectorAll('.rv').forEach(function(x){x.classList.add('in');});return;}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -10% 0px'});
  document.querySelectorAll('.rv').forEach(function(x){io.observe(x);});
})();
