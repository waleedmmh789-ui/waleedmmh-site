(()=>{
const r=document.documentElement,b=document.getElementById('th');
if(b)b.onclick=()=>{const d=(r.dataset.theme||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'))==='dark'?'light':'dark';r.dataset.theme=d;try{localStorage.setItem('theme',d)}catch(e){}};
const q=document.getElementById('q'),cs=[...document.querySelectorAll('.chip')],cards=[...document.querySelectorAll('.app[data-name]')],none=document.getElementById('none');
let cat='';
const f=()=>{const t=(q?q.value:'').trim().toLowerCase();let n=0;cards.forEach(c=>{const ok=(!t||c.dataset.name.includes(t))&&(!cat||c.dataset.cat===cat);c.hidden=!ok;if(ok)n++});if(none)none.hidden=n>0};
if(q)q.oninput=f;
cs.forEach(c=>c.onclick=()=>{cat=c.dataset.cat;cs.forEach(x=>x.classList.toggle('on',x===c));f()});
})();
