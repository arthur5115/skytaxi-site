// Logic/DOM integration, not a real-browser visual test.
const fs=require('fs'),vm=require('vm'),path=require('path');
class Element{constructor(id=''){this.id=id;this.value='';this.textContent='';this.className='';this.children=[];this.handlers={};this.attrs={}}set value(v){this._value=String(v)}get value(){return this._value}setAttribute(k,v){this.attrs[k]=v}append(...n){this.children.push(...n)}replaceChildren(...n){this.children=n}get lastChild(){return this.children.at(-1)}addEventListener(k,f){this.handlers[k]=f}click(){if(this.onclick)this.onclick();if(this.handlers.click)this.handlers.click()}}
const root=__dirname,html=fs.readFileSync(path.join(root,'虎頭埤_五跨互動計算模型_R1.html'),'utf8'),els=new Map();
for(const m of html.matchAll(/\bid="([^"]+)"/g))els.set(m[1],new Element(m[1]));
const doc={getElementById:id=>{if(!els.has(id))throw Error('Missing element '+id);return els.get(id)},createElementNS:()=>new Element(),createElement:()=>new Element()};
const downloads=[];const ctx={document:doc,window:{},structuredClone,console,Blob,URL:{createObjectURL:b=>{downloads.push(b);return'blob:test'},revokeObjectURL:()=>{}},setTimeout:fn=>fn()};
vm.createContext(ctx);vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
const api=ctx.window.Hutoupi,snap=()=>ctx.window.modelSnapshot,assert=(v,m)=>{if(!v)throw Error(m)},close=(a,b)=>Math.abs(a-b)<1e-8;
const set=(id,v)=>{els.get(id).value=String(v);els.get(id).handlers.input()};
const switchSpan=i=>{els.get('span').value=i;els.get('span').handlers.change()};
const imported=text=>els.get('import').onchange({target:{files:[{text:async()=>text}],value:''}});
(async()=>{
 assert(close(snap().controls[0].margin,0),'first-span boundary');assert(els.get('plot').children.length>20,'SVG created');set('d',1);assert(close(snap().controls[0].margin,-1),'d sensitivity');
 switchSpan(1);assert(snap().controls.length===0&&els.get('margin').textContent==='未計算','unknown controls not zero');assert(snap().params.a===175,'second-span midpoint');
 switchSpan(0);assert(snap().params.d===1,'independent state retained');els.get('reset').click();assert(snap().params.d===0,'reset');
 const samples=[];
 for(let i=0;i<5;i++){switchSpan(i);const s=api.params(),sp=JSON.parse(fs.readFileSync(path.join(root,'baseline.json'),'utf8')).spans[i];for(const x of [0,sp.length_m/4,sp.length_m/2,sp.length_m])samples.push({spanId:sp.id,...api.val(x,s)});assert(close(api.val(sp.length_m,s).CH,sp.end.CH_m),'global chainage');assert(!els.get('error').textContent,'valid state');const csv=api.makeCSV(s).split('\n');assert(csv.at(-1).split(',')[2]===String(sp.end.CH_m),'CSV endpoint');if([1,3,4].includes(i))assert(csv.slice(1).every(r=>r.split(',')[10]===''),'missing margins left blank')}
 switchSpan(2);assert(close(snap().controls[0].margin,-.06350658262571329),'hill3 comparison');assert(snap().controls[0].CH===967.5,'hill3 chainage');
 switchSpan(4);set('w',0);set('P',0);assert(close(snap().actualMin.x,402)&&close(snap().actualMin.actual,66),'descending zero-load minimum');set('H',0);assert(els.get('error').textContent.includes('H須大於0'),'invalid H');els.get('reset').click();
 await imported('x_m,ground_el_m,control_el_m\n201,,80\n');assert(snap().controls.length===1&&snap().controls[0].margin<0,'import custom control');assert(snap().controls[0].CH===1746,'import local coordinate');
 els.get('export').click();assert((await downloads.at(-1).text()).includes('P4-T4,201,1746'),'export imported control');
 await imported('x_m,ground_el_m,control_el_m\n201,,80\n201,,80');assert(els.get('error').textContent.includes('重複'),'duplicate rejection');await imported('x_m,ground_el_m,control_el_m\n403,,80');assert(els.get('error').textContent.includes('超出'),'outside-span rejection');
 els.get('clear').click();assert(snap().controls.length===0,'clear controls');els.get('reset').click();els.get('savejson').click();assert(JSON.parse(await downloads.at(-1).text()).span_states.length===5,'JSON exports five spans');
 const result={passed:true,method:'Node VM with minimal DOM; no real-browser layout test',checks:['five-span switching','state retained by span','reset','SVG rendering','global/local chainage','unknown margins blank','hill1 boundary','hill3 comparison','descending zero-load minimum','invalid H','CSV import/export','duplicate and out-of-range rejection','clear controls','five-span JSON'],python_parity_samples:samples};
 fs.writeFileSync(path.join(root,'interface_validation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({passed:result.passed,checks:result.checks}));
})();
