// Node-only DOM integration check (not a browser layout test).
const fs=require('fs'),vm=require('vm'),path=require('path');
class Element{constructor(id=''){this.id=id;this.value='';this.textContent='';this.className='';this.children=[];this.handlers={};this.attrs={}}set value(v){this._value=String(v)}get value(){return this._value}setAttribute(k,v){this.attrs[k]=v}append(...n){this.children.push(...n)}replaceChildren(...n){this.children=n}get lastChild(){return this.children.at(-1)}addEventListener(k,f){this.handlers[k]=f}click(){if(this.onclick)this.onclick();if(this.handlers.click)this.handlers.click()}}
const root=__dirname,html=fs.readFileSync(path.join(root,'T1-P2_446m_互動計算模型_R1.html'),'utf8'),els=new Map();
for(const m of html.matchAll(/\bid="([^"]+)"/g))els.set(m[1],new Element(m[1]));
for(const id of ['H','P','d','a'])els.get(id).value=({H:'1000',P:'5.88',d:'0',a:'70'})[id];
const doc={getElementById:id=>{if(!els.has(id))throw Error('Missing element '+id);return els.get(id)},createElementNS:()=>new Element(),createElement:()=>new Element()};
const downloads=[];const ctx={document:doc,window:{},structuredClone,console,Blob,URL:{createObjectURL:b=>{downloads.push(b);return 'blob:test'},revokeObjectURL:()=>{}},setTimeout:fn=>fn()};
vm.createContext(ctx);vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
const snap=()=>ctx.window.modelSnapshot,assert=(v,m)=>{if(!v)throw Error(m)},close=(a,b)=>Math.abs(a-b)<1e-8;
const set=(id,v)=>{els.get(id).value=String(v);els.get(id).handlers.input()};
(async()=>{
 assert(close(snap().controls[0].margin,0),'baseline');assert(els.get('plot').children.length>20,'SVG render');
 set('d',1);assert(close(snap().controls[0].margin,-1),'d margin');
 els.get('mid').click();assert(snap().params.a===223,'midpoint');
 set('H',0);assert(els.get('error').textContent.includes('H須大於0'),'invalid H');
 els.get('reset').click();assert(close(snap().controls[0].margin,0),'reset');
 await els.get('import').onchange({target:{files:[{text:async()=> 'chainage_m,ground_el_m,control_el_m\n70,40,50\n223,40,50\n'}],value:''}});
 assert(snap().controls.length===2,'import');assert(snap().controls[1].margin<0,'negative margin');
 els.get('export').click();const csv=await downloads.at(-1).text();assert(csv.split('\n').length===448,'CSV row count');
 const lines=csv.split('\n');assert(lines[224].includes('49.823863'),'CSV values');
 await els.get('import').onchange({target:{files:[{text:async()=> 'chainage_m,ground_el_m,control_el_m\n70,40,50\n70,40,50'}],value:''}});
 assert(els.get('error').textContent.includes('重複'),'duplicates');
 els.get('reset').click();const samples=[0,70,140.5,223,446].map(x=>ctx.window.T1P2.val(x,ctx.window.T1P2.params()));
 const result={passed:true,method:'Node VM and minimal DOM integration; no browser layout test',checks:['initial SVG','boundary reconstruction','d sensitivity','midpoint','invalid parameters','reset','CSV import','CSV export','duplicate rejection'],python_parity_samples:samples};
 fs.writeFileSync(path.join(root,'interface_validation.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})();
