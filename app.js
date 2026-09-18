'use strict';
/* ================= UTILS ================= */
const $=s=>document.querySelector(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rnd=(a,b)=>a+Math.random()*(b-a);
const ri=(a,b)=>Math.floor(rnd(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(p=>p[1]);
const norm=s=>s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const key=s=>norm(s).replace(/[^A-Z0-9]/g,'');
const VOY=['A','E','I','O','U','Y'];
const CONS=['B','C','D','F','G','H','J','K','L','M','N','P','Q','R','S','T','V','W','X','Z'];
const FREQ=['S','N','R','L','T','D','M','C','P','V','G','B','F','H','J','Q','X','Z','K','W'];
const AZ=['AZERTYUIOP','QSDFGHJKLM','WXCVBN'];
const show=id=>{const e=$(id);if(e)e.classList.remove('hidden')};
const hide=id=>{const e=$(id);if(e)e.classList.add('hidden')};

/* ================= AFFICHEUR D'ERREUR (diagnostic visible) ================= */
function showErr(m){let d=document.getElementById('errBanner');
 if(!d){d=document.createElement('div');d.id='errBanner';
  d.style.cssText='position:fixed;left:0;right:0;top:0;background:#b71c1c;color:#fff;z-index:300;font:12px/1.4 monospace;padding:6px;white-space:pre-wrap';
  document.body.appendChild(d)}
 d.textContent='⚠ ERREUR JS : '+m;console.error(m)}
window.addEventListener('error',e=>showErr(e.message+' — ligne '+e.lineno));

/* ================= AUDIO ================= */
const Sound={ctx:null,on:true,
 init(){if(!this.ctx){try{this.ctx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}
  if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume().catch(()=>{})},
 t(f,d,type='sine',g=.16,dl=0){if(!this.on||!this.ctx)return;try{
  const o=this.ctx.createOscillator(),v=this.ctx.createGain();
  o.type=type;o.frequency.value=f;v.gain.setValueAtTime(g,this.ctx.currentTime+dl);
  v.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+dl+d);
  o.connect(v);v.connect(this.ctx.destination);o.start(this.ctx.currentTime+dl);o.stop(this.ctx.currentTime+dl+d+.02)}catch(e){}},
 tick(){this.t(1200,.04,'square',.05)},click(){this.t(600,.06,'triangle',.12)},
 ding(){this.t(880,.12);this.t(1320,.25,'sine',.15,.09)},
 buzz(){this.t(160,.45,'sawtooth',.13)},
 gong(){this.t(110,.9,'triangle',.25);this.t(55,1.2,'sine',.2,.02)},
 fanfare(){[523,659,784,1046,1318].forEach((f,i)=>this.t(f,.28,'square',.11,i*.11))},
 jackpot(){[392,523,659,784,1046,1568].forEach((f,i)=>this.t(f,.4,'sawtooth',.09,i*.09))}};

/* ================= SAUVEGARDES (protégées) ================= */
const mem={};
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return mem[k]||null}},
 set(k,v){try{localStorage.setItem(k,v)}catch(e){mem[k]=v}}};
const Store={
 get career(){return JSON.parse(LS.get('rdf_career')||'{"played":0,"wins":0,"gain":0,"jackpots":0,"finales":0,"best":0,"streak":0,"bestStreak":0}')},
 set career(v){LS.set('rdf_career',JSON.stringify(v))},
 get settings(){return JSON.parse(LS.get('rdf_set')||'{"sound":true,"diff":"moyen"}')},
 set settings(v){LS.set('rdf_set',JSON.stringify(v))}};

/* ================= ROUE : 24 segments ================= */
const PAL=['#ff2d95','#7b2ff7','#ffd600','#ff7a00','#22dd44','#2979ff','#ff1744','#00e5ff'];
const SEG=(()=>{const def=[['cash',300],['cash',500],['cash',700],['banq',0],['cash',400],['cash',650],['cash',1000],['passe',0],
 ['cash',350],['cash',550],['cash',800],['jack',500],['cash',250],['cash',450],['cash',900],['banq',0],
 ['cash',150],['cash',600],['hold',0],['cash',500],['cash',750],['cash',1000],['cash',400],['cash',850]];
 let pi=0;return def.map(([t,v])=>{let c;if(t==='banq')c='#151515';else if(t==='passe')c='#f5f5f5';
  else if(t==='hold')c='#d7a86e';else if(t==='jack')c='#ffe93b';else c=PAL[pi++%8];return{t,v,c}})})();
const NSEG=SEG.length,SEGA=Math.PI*2/NSEG;

/* ================= IA (avec nom + icône corrigés) ================= */
const PROF={prudent:{name:'Béatrice',icon:'🛡️',lbl:'🛡️ Béatrice (prudente)',seuil:.6,voy:.8,bonus:0},
 flambe:{name:'Enzo',icon:'🔥',lbl:'🔥 Enzo (flambeur)',seuil:.92,voy:.15,bonus:0},
 erudit:{name:'Professeur',icon:'🎓',lbl:'🎓 Professeur (érudit)',seuil:.3,voy:.4,bonus:.25}};
const DIFF={facile:{solve:.30,letter:.45},moyen:{solve:.52,letter:.70},expert:{solve:.75,letter:.90}};

/* ================= ÉTAT ================= */
let S=null,LASTCFG=null,deck=[],finDeck=[];
const P=()=>S.players,player=()=>S.players[S.cur];
const solLetters=()=>key(S.sol).split('');
const ratio=()=>{const L=solLetters();return L.length?L.filter(c=>S.revealed.has(c)).length/L.length:1};
const count=L=>solLetters().filter(c=>c===L).length;

/* ================= AFFICHAGE ================= */
function log(m){const l=$('#log');if(!l)return;const d=document.createElement('div');d.textContent=m;l.prepend(d);while(l.children.length>4)l.lastChild.remove()}
function flash(txt,col='#ffd600'){const f=$('#flash');if(!f)return;f.textContent=txt;f.style.color=col;f.classList.remove('show');void f.offsetWidth;f.classList.add('show')}
function confetti(){for(let i=0;i<110;i++){const s=document.createElement('span');s.style.left=Math.random()*100+'vw';
 s.style.background=pick(PAL);s.style.animationDelay=(Math.random()*.8)+'s';$('#fx').appendChild(s);setTimeout(()=>s.remove(),3600)}}
function renderJack(){$('#jackVal').textContent=S.jackpot.toLocaleString('fr-FR')+' €'}
function renderRound(){$('#roundStars').textContent='★'.repeat(S.round);$('#roundLbl').textContent=S.sudden?'MORT SUBITE':'MANCHE '+S.round}
function renderBoard(){const b=$('#board');b.innerHTML='';S.sol.split(' ').forEach(w=>{const wd=document.createElement('div');wd.className='word';
 [...w].forEach(ch=>{const t=document.createElement('span');const isL=/[A-Za-zÀ-ÿ]/.test(ch);
  if(!isL){t.className='tile free';t.textContent=ch}else{const n=norm(ch);const rv=S.revealed.has(n);
   t.className='tile'+(rv?' rev':'');t.textContent=rv?ch.toUpperCase():''}wd.appendChild(t)});b.appendChild(wd)})}
function renderScores(){$('#scores').innerHTML=P().map((p,i)=>`<div class="plq${i===S.cur?' cur':''}">
 <span>${p.ai?p.ai.icon+' ':''}${p.name}</span><span class="k">${p.kitty.toLocaleString('fr-FR')} €</span><span class="d">✔ ${p.def.toLocaleString('fr-FR')} €</span></div>`).join('')}
function setActions(on){$('#btnSpin').disabled=!on;$('#btnVowel').disabled=!on||player().kitty<250;$('#btnSolve').disabled=!on}

/* ================= ROUE : rendu + physique ================= */
const cv=$('#wheel'),cx=cv?cv.getContext('2d'):null;
const wheel={angle:0,vel:0,spinning:false,lastIdx:-1};
let stopResolve=null;
const normA=a=>((a%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
const curIdx=()=>Math.floor(normA(-Math.PI/2-wheel.angle)/SEGA)%NSEG;
function drawWheel(){if(!cx)return;const R=320,C=320;cx.clearRect(0,0,640,640);
 for(let i=0;i<NSEG;i++){const a0=wheel.angle+i*SEGA;cx.beginPath();cx.moveTo(C,C);cx.arc(C,C,R-6,a0,a0+SEGA);cx.closePath();
  cx.fillStyle=SEG[i].c;cx.fill();cx.strokeStyle='#fff';cx.lineWidth=3;cx.stroke();
  cx.save();cx.translate(C,C);cx.rotate(a0+SEGA/2);cx.fillStyle='#fff';cx.strokeStyle='#000';cx.lineWidth=4;
  cx.font='900 34px Arial';cx.textAlign='center';const lb=SEG[i].t==='cash'?SEG[i].v:SEG[i].t==='banq'?'BANQ.':SEG[i].t==='passe'?'PASSE':SEG[i].t==='hold'?'HOLD-UP':'JACKPOT';
  cx.strokeText(lb,R*.62,10);cx.fillText(lb,R*.62,10);cx.restore()}
 cx.beginPath();cx.arc(C,C,52,0,7);cx.fillStyle='#fff';cx.fill();
 cx.beginPath();cx.arc(C,C,34,0,7);cx.fillStyle='#7b2ff7';cx.fill();
 cx.fillStyle='#ffd600';cx.font='900 26px Arial';cx.textAlign='center';cx.fillText('€',C,C+9)}
let lastT=0;
function loop(t){const dt=Math.min(.05,(t-lastT)/1000||0);lastT=t;
 if(wheel.spinning){wheel.angle=normA(wheel.angle+wheel.vel*dt);wheel.vel-=wheel.vel*1.15*dt;
  const i=curIdx();if(i!==wheel.lastIdx){wheel.lastIdx=i;Sound.tick()}
  if(wheel.vel<.18){wheel.spinning=false;const f=stopResolve;stopResolve=null;if(f)f();onSegment(SEG[curIdx()])}}
 drawWheel();requestAnimationFrame(loop)}
const waitStop=()=>new Promise(r=>stopResolve=r);
function launchSpin(pw){if(wheel.spinning||!S||S.phase!=='action')return;wheel.spinning=true;wheel.vel=pw;S.phase='spin';setActions(false);Sound.click()}
let hist=[],down=false;
const angAt=e=>{const r=cv.getBoundingClientRect();return Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2))};
if(cv){
cv.addEventListener('pointerdown',e=>{Sound.init();down=true;hist=[{a:angAt(e),t:performance.now()}];cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{if(!down)return;hist.push({a:angAt(e),t:performance.now()});if(hist.length>8)hist.shift()});
cv.addEventListener('pointerup',e=>{if(!down)return;down=false;
 if(!S||S.phase!=='action'||player().ai)return;
 if(hist.length<2)return;const a=hist[hist.length-1],b=hist[Math.max(0,hist.length-4)];
 const dt=(a.t-b.t)/1000;if(dt<=0)return;const v=(a.a-b.a)/dt;
 if(Math.abs(v)<4){flash('GLISSEZ PLUS FORT !','#00e5ff');return}
 launchSpin(Math.min(28,Math.max(7,Math.abs(v))))});}

/* ================= CLAVIER VIRTUEL ================= */
let kbResolve=null,kbInput='';
function openKB(mode,timer){return new Promise(res=>{kbResolve=res;kbInput='';
 $('#kbTitle').textContent=mode==='cons'?'PROPOSEZ UNE CONSONNE':mode==='voy'?'ACHETER UNE VOYELLE (250 €)':'VOTRE SOLUTION';
 $('#kbField').classList.toggle('hidden',mode!=='sol');$('#kbField').textContent='';
 $('#kbTimer').classList.add('hidden');$('#kbOK').classList.toggle('hidden',mode!=='sol');
 $('#kbCancel').classList.toggle('hidden',mode==='cons');
 const k=$('#kbKeys');k.innerHTML='';
 const rows=mode==='cons'?[CONS]:mode==='voy'?[VOY]:[...AZ,['␣','\'','⌫']];
 rows.forEach(r=>{const d=document.createElement('div');d.className='krow';
  r.forEach(L=>{const b=document.createElement('button');b.className='key';b.textContent=L;
   if(mode==='cons'&&S.calledC.has(L))b.classList.add('off');
   if(mode==='voy'&&S.calledV.has(L))b.classList.add('off');
   b.onclick=()=>{Sound.click();
    if(mode==='sol'){if(L==='⌫')kbInput=kbInput.slice(0,-1);else if(L==='␣')kbInput+=' ';else if(L==='\'')kbInput+='\'';else kbInput+=L;
     $('#kbField').textContent=kbInput}else closeKB(L)};
   d.appendChild(b)});k.appendChild(d)});
 show('#ovKB');
 if(timer){const tb=$('#kbTimer');tb.classList.remove('hidden');const bar=tb.querySelector('i');bar.style.transition='none';bar.style.width='100%';
  requestAnimationFrame(()=>{bar.style.transition='width '+timer+'s linear';bar.style.width='0%'});
  setTimeout(()=>{if(kbResolve)closeKB(null)},timer*1000)}})}
function closeKB(v){hide('#ovKB');const f=kbResolve;kbResolve=null;if(f)f(v)}

/* ================= DÉROULEMENT ================= */
function startGame(cfg){LASTCFG=cfg;hide('#ovMenu');hide('#ovEnd');
 S={mode:cfg.mode,diff:cfg.diff,players:cfg.players,round:1,jackpot:23000,cur:0,phase:'idle',
  sol:'',cat:'',revealed:new Set(),calledC:new Set(),calledV:new Set(),turns:0,jackArmed:false,
  sudden:false,tied:[],finQual:-1,roundOver:false,over:false,curSeg:null,segAsk:null};
 deck=shuffle(PUZZLES.slice());finDeck=shuffle(FINALE.slice());
 $('#log').innerHTML='';renderJack();startRound()}
function startRound(){const p=S.sudden?deck.pop()||pick(PUZZLES):deck.pop();
 S.sol=p[1];S.cat=p[0];S.revealed=new Set();S.calledC=new Set();S.calledV=new Set();S.turns=0;S.roundOver=false;S.segAsk=null;
 P().forEach(j=>j.kitty=0);
 S.cur=S.sudden?S.tied[0]:(S.round-1)%P().length;
 $('#cat').textContent='CATÉGORIE : '+S.cat;renderBoard();renderRound();renderScores();renderJack();
 flash((S.sudden?'⚡ MORT SUBITE : ':'MANCHE '+S.round+' : ')+S.cat,'#00e5ff');beginTurn()}
function beginTurn(){if(S.over||S.roundOver)return;S.turns++;S.jackArmed=false;
 if(S.turns>60)return endRound(null,true);
 renderScores();log('▶ Tour de '+player().name);
 if(player().ai)aiTurn();
 else if(S.mode==='pass'){$('#handTxt').textContent='📱 Au tour de '+player().name+' !';show('#ovHand')}
 else humanTurn()}
function humanTurn(){S.phase='action';setActions(true)}
function keepHand(){renderScores();if(player().ai)aiTurn();else humanTurn()}
function nextTurn(){if(S.over||S.roundOver)return;S.segAsk=null;
 do{S.cur=(S.cur+1)%P().length}while(P()[S.cur].elim);beginTurn()}

async function onSegment(seg){S.phase='seg';await sleep(350);
 if(seg.t==='banq'){player().kitty=0;Sound.gong();flash('BANQUEROUTE !','#ff1744');log(player().name+' perd toute sa cagnotte !');renderScores();await sleep(1300);return nextTurn()}
 if(seg.t==='passe'){Sound.buzz();flash('PASSE','#ffffff');log(player().name+' passe son tour');await sleep(900);return nextTurn()}
 if(seg.t==='hold')return holdUp();
 if(seg.t==='jack'){S.jackArmed=true;Sound.jackpot();flash('JACKPOT ARMÉ !','#ffe93b');log('Résolvez l\'énigme maintenant pour gagner le jackpot !')}
 S.curSeg=seg;S.segAsk='C';
 if(!player().ai)openKB('cons').then(L=>{if(L)callConsonant(L)})}
async function callConsonant(L){S.segAsk=null;S.calledC.add(L);const occ=count(L);
 if(occ>0){S.revealed.add(L);const g=(S.curSeg.v||0)*occ;player().kitty+=g;Sound.ding();
  flash('+'+g.toLocaleString('fr-FR')+' €','#22dd44');log(player().name+' : '+L+' ×'+occ+' = +'+g+' €');
  renderBoard();keepHand()}
 else{Sound.buzz();flash(L+' : ABSENTE','#ff7a00');log(L+' absente');nextTurn()}}
async function buyVowel(v){S.calledV.add(v);player().kitty-=250;const occ=count(v);
 if(occ>0){S.revealed.add(v);Sound.ding();flash(v+' RÉVÉLÉE','#22dd44');log(player().name+' achète '+v);renderBoard();keepHand()}
 else{Sound.buzz();flash(v+' : ABSENTE','#ff7a00');log(v+' absente');nextTurn()}}
async function propose(txt){if(txt&&key(txt)===key(S.sol)){Sound.fanfare();flash('BRAVO !','#22dd44');return endRound(S.cur,false)}
 if(S.sudden){player().elim=true;Sound.gong();flash(player().name+' ÉLIMINÉ !','#ff1744');
  const alive=S.tied.filter(i=>!P()[i].elim);
  if(alive.length===0){S.finQual=pick(S.tied);return finale()}
  if(alive.length===1){S.finQual=alive[0];return finale()}
  return nextTurn()}
 player().kitty=Math.max(0,player().kitty-500);Sound.buzz();flash('MAUVAISE SOLUTION −500 €','#ff1744');
 log('Solution fausse : '+txt);renderScores();nextTurn()}
async function holdUp(){const me=S.cur;const targets=P().map((p,i)=>[p,i]).filter(([p,i])=>i!==me&&!p.elim);
 const rich=targets.filter(([p])=>p.kitty>0);
 if(!rich.length){flash('HOLD-UP : RIEN À VOLER','#ffffff');await sleep(900);return nextTurn()}
 if(player().ai){const t=rich.sort((a,b)=>b[0].kitty-a[0].kitty)[0];return doHold(t[1])}
 $('#holdList').innerHTML='';rich.forEach(([p,i])=>{const b=document.createElement('button');b.className='mb';
  b.textContent=p.name+' ('+p.kitty+' €)';b.onclick=()=>{hide('#ovHold');doHold(i)};$('#holdList').appendChild(b)});
 show('#ovHold')}
async function doHold(i){const v=P()[i].kitty;P()[i].kitty=0;player().kitty+=v;Sound.jackpot();
 flash('HOLD-UP ! +'+v+' €','#d7a86e');log(player().name+' vole '+v+' € à '+P()[i].name);renderScores();
 await sleep(1200);nextTurn()}

async function endRound(winner,cancel){S.roundOver=true;setActions(false);
 if(winner!==null&&winner!==undefined){const p=P()[winner];const g=p.kitty;p.def+=g;p.kitty=0;
  let msg=p.name+' remporte la manche ! +'+g.toLocaleString('fr-FR')+' €';
  if(S.jackArmed&&winner===S.cur){p.def+=S.jackpot;msg+=' + JACKPOT '+S.jackpot.toLocaleString('fr-FR')+' € !!';
   if(S.mode==='solo'&&winner===0){const c=Store.career;c.jackpots++;Store.career=c}S.jackpot=23000}
  else S.jackpot+=1000;
  P().forEach((j,i)=>{if(i!==winner)j.kitty=0});
  flash('MANCHE REMPORTÉE !','#ffd600');confetti();log(msg);renderScores();renderJack();await sleep(1800)}
 else{P().forEach(j=>j.kitty=0);flash(cancel?'MANCHE ANNULÉE':'MANCHE SANS VAINQUEUR','#ffffff');await sleep(1200)}
 if(S.sudden){if(S.finQual<0)S.finQual=winner!==null&&winner!==undefined?winner:pick(S.tied);return finale()}
 if(S.round<3){S.round++;return startRound()}
 const mx=Math.max(...P().map(p=>p.def));const tied=P().map((p,i)=>p.def===mx?i:-1).filter(i=>i>=0);
 if(tied.length===1){S.finQual=tied[0];return finale()}
 flash('ÉGALITÉ ! MORT SUBITE','#ff2d95');await sleep(1400);
 S.sudden=true;S.tied=tied;P().forEach((p,i)=>p.elim=!tied.includes(i));startRound()}

/* ================= IA ================= */
async function aiTurn(){if(!S||S.over||S.roundOver)return;const p=player(),d=DIFF[S.diff],pr=p.ai,r=ratio();
 await sleep(ri(900,1700));if(S.roundOver)return;
 if(r>=pr.seuil&&Math.random()<.9)return aiSolve(r,d,pr);
 if(pr===PROF.erudit&&r>=.2&&Math.random()<d.solve*.45)return aiSolve(r,d,pr);
 if(p.kitty>=250&&Math.random()<pr.voy){const v=aiPick(VOY,S.calledV,d,false);if(v)return buyVowel(v)}
 launchSpin(rnd(9,22));await waitStop();await sleep(600);
 if(S.segAsk==='C'){await sleep(600);callConsonant(aiPick(CONS,S.calledC,d,true))}}
function aiPick(pool,called,d,wantPresent){const free=pool.filter(L=>!called.has(L));if(!free.length)return null;
 const present=free.filter(L=>count(L)>0&&!S.revealed.has(L));
 if(wantPresent&&present.length&&Math.random()<d.letter)return FREQ.find(f=>present.includes(f))||pick(present);
 if(!wantPresent&&present.length&&Math.random()<d.letter)return pick(present);
 return pick(free)}
async function aiSolve(r,d,pr){const p=Math.min(.95,d.solve+r*.45+pr.bonus);
 if(Math.random()<p){log(player().name+' propose une solution…');return propose(S.sol)}
 const wrong=S.sol.replace(/[A-Za-zÀ-ÿ]/g,c=>Math.random()<.15?pick('ABCDEFGHIJKLMNOPQRSTUVWXYZ'):c);
 log(player().name+' tente une solution…');return propose(wrong)}

/* ================= ACTIONS HUMAIN ================= */
function bindGame(){
 $('#kbOK').onclick=()=>{if(kbInput.trim())closeKB(kbInput)};
 $('#kbCancel').onclick=()=>closeKB(null);
 $('#handReady').onclick=()=>{Sound.init();Sound.click();hide('#ovHand');humanTurn()};
 $('#btnSpin').onclick=()=>{Sound.init();if(S&&S.phase==='action'&&!player().ai)launchSpin(rnd(9,20))};
 $('#btnVowel').onclick=async()=>{Sound.init();if(!S||S.phase!=='action'||player().ai)return;setActions(false);
  const v=await openKB('voy');if(v&&S&&!S.roundOver)await buyVowel(v);else if(S&&!S.roundOver)humanTurn()};
 $('#btnSolve').onclick=async()=>{Sound.init();if(!S||S.phase!=='action'||player().ai)return;setActions(false);
  const t=await openKB('sol');if(t)await propose(t);else if(S&&!S.roundOver)humanTurn()};
 $('#endReplay').onclick=()=>{hide('#ovEnd');startGame(LASTCFG)};
 $('#endMenu').onclick=()=>{hide('#ovEnd');S=null;show('#ovMenu')}}

/* ================= GRANDE FINALE ================= */
async function finale(){const q=S.finQual,p=P()[q];
 const f=finDeck.pop()||pick(FINALE);const sol=f[1],rev=new Set();
 ['R','S','T','L','N','E'].forEach(L=>{if(key(sol).includes(L))rev.add(L)});
 const body=$('#finBody');show('#ovFin');Sound.fanfare();
 const boardHTML=()=>{let h='<div class="finBoard">';sol.split(' ').forEach(w=>{h+='<div class="word">';
  [...w].forEach(ch=>{const isL=/[A-Za-zÀ-ÿ]/.test(ch);
   if(!isL)h+='<span class="tile free">'+ch+'</span>';
   else{const n=norm(ch);h+='<span class="tile'+(rev.has(n)?' rev':'')+'">'+(rev.has(n)?ch.toUpperCase():'')+'</span>'}});
  h+='</div>'});return h+'</div>'};
 body.innerHTML='<p><b>'+p.name+'</b> se qualifie pour la Grande Finale !</p><p>Catégorie : <b>'+f[0]+'</b></p>'+boardHTML();
 await sleep(1600);
 if(!p.ai){
  const chosen={c:[],v:null};
  await new Promise(res=>{
   const mk=(list,cls,max)=>{const d=document.createElement('div');d.className='pick';
    list.forEach(L=>{const b=document.createElement('button');b.className='key';b.textContent=L;
     b.onclick=()=>{Sound.click();
      if(cls==='c'){if(chosen.c.includes(L)||chosen.c.length>=max)return;b.classList.add('sel');chosen.c.push(L)}
      else{d.querySelectorAll('.sel').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');chosen.v=L}
      ok.disabled=!(chosen.c.length===3&&chosen.v)};d.appendChild(b)});body.appendChild(d)};
   const t=document.createElement('p');t.innerHTML='Choisissez <b>3 consonnes</b> et <b>1 voyelle</b> :';body.appendChild(t);
   mk(CONS,'c',3);mk(VOY,'v',1);
   const ok=document.createElement('button');ok.className='mb';ok.textContent='✔ RÉVÉLER LES LETTRES';ok.disabled=true;
   ok.onclick=()=>{chosen.c.forEach(L=>rev.add(L));if(chosen.v)rev.add(chosen.v);res()};body.appendChild(ok)});
  body.innerHTML='<p>Catégorie : <b>'+f[0]+'</b></p>'+boardHTML()+'<p>⏱ 10 secondes pour taper la solution !</p>';
  const t=await openKB('sol',10);
  if(t&&key(t)===key(sol))return finWin(p,sol,body);
  return finLose(p,sol,body)}
 const presentC=[...new Set(key(sol).split(''))].filter(c=>!rev.has(c)&&CONS.includes(c));
 const presentV=[...new Set(key(sol).split(''))].filter(c=>!rev.has(c)&&VOY.includes(c));
 shuffle(presentC).slice(0,ri(1,3)).forEach(L=>rev.add(L));
 if(presentV.length&&Math.random()<.7)rev.add(pick(presentV));
 body.innerHTML='<p><b>'+p.name+'</b> choisit ses lettres…</p><p>Catégorie : <b>'+f[0]+'</b></p>'+boardHTML();
 await sleep(2200);
 const d=DIFF[S.diff];
 if(Math.random()<Math.min(.9,d.solve+.25+p.ai.bonus))return finWin(p,sol,body);
 return finLose(p,sol,body)}
async function finWin(p,sol,body){const env=pick([1000,5000,10000,25000]);p.def+=env;
 Sound.jackpot();confetti();
 body.innerHTML='<p class="env">🎉 SOLUTION : '+sol+'</p><p class="env">✉️ ENVELOPPE : <b>'+(env===25000?'SUPER LOT (25 000 €)':env.toLocaleString('fr-FR')+' €')+'</b></p><p><b>'+p.name+'</b> remporte la Grande Finale !</p>';
 await sleep(2600);endGame()}
async function finLose(p,sol,body){Sound.gong();
 body.innerHTML='<p class="env">❌ PERDU…</p><p>La solution était : <b>'+sol+'</b></p>';
 await sleep(2200);endGame()}

/* ================= FIN / CARRIÈRE ================= */
function endGame(){S.over=true;const rank=P().map((p,i)=>[p,i]).sort((a,b)=>b[0].def-a[0].def);
 $('#endTitle').textContent='🏆 '+rank[0][0].name+' GAGNE !';
 $('#endBody').innerHTML='<table class="st">'+rank.map(([p],r)=>'<tr><td>'+(r===0?'🥇':r===1?'🥈':'🥉')+' '+(p.ai?p.ai.icon+' ':'')+p.name+'</td><td><b>'+p.def.toLocaleString('fr-FR')+' €</b></td></tr>').join('')+'</table>';
 if(S.mode==='solo'){const c=Store.career;c.played++;if(rank[0][1]===0){c.wins++;c.streak++;c.bestStreak=Math.max(c.bestStreak,c.streak)}else c.streak=0;
  c.gain+=P()[0].def;c.best=Math.max(c.best,P()[0].def);if(S.finQual===0)c.finales++;Store.career=c}
 show('#ovEnd')}

/* ================= MENUS / CONFIG ================= */
let setupMode='solo';
function setupScreen(mode){setupMode=mode;show('#ovSetup');const b=$('#setupBody');
 if(mode==='solo'){$('#setupTitle').textContent='SOLO vs 2 IA';
  b.innerHTML='<p>Niveau des IA :</p><div class="row">'+['facile','moyen','expert'].map(d=>
   '<button class="mb small dif" data-d="'+d+'" style="'+(Store.settings.diff===d?'background:linear-gradient(180deg,#22dd44,#009922)':'')+'">'+d.toUpperCase()+'</button>').join('')+'</div>'+
   '<p style="margin-top:2vh">Vos adversaires (profils tirés au sort) :</p><p id="profPick"></p>';
  b.querySelectorAll('.dif').forEach(x=>x.onclick=()=>{const s=Store.settings;s.diff=x.dataset.d;Store.settings=s;setupScreen('solo')});
  $('#profPick').textContent=shuffle(Object.values(PROF)).slice(0,2).map(p=>p.lbl).join('  vs  ')}
 else{$('#setupTitle').textContent='PASS & PLAY';
  b.innerHTML='<div class="row"><button class="mb small pc" data-n="2">2 JOUEURS</button><button class="mb small pc" data-n="3">3 JOUEURS</button></div><div id="names"></div>';
  b.dataset.n='2';renderNames(2);
  b.querySelectorAll('.pc').forEach(x=>x.onclick=()=>{b.dataset.n=x.dataset.n;renderNames(+x.dataset.n)})}}
function renderNames(n){$('#names').innerHTML=Array.from({length:n},(_,i)=>'<input id="nm'+i+'" class="mb" style="text-align:center;color:#111" placeholder="Joueur '+(i+1)+'" maxlength="12">').join('')}
function soundBtn(){const s=Store.settings;$('#mSound').textContent=s.sound?'🔊 SON : ACTIVÉ':'🔇 SON : COUPÉ';Sound.on=s.sound}

/* ================= DÉMARRAGE SÉCURISÉ ================= */
function boot(){
 if(typeof PUZZLES==='undefined'||typeof FINALE==='undefined'){showErr('Fichier enigmes.js introuvable ou incomplet (vérifiez le nom et le dossier).');return}
 bindGame();
 $('#setupStart').onclick=()=>{Sound.init();Sound.click();hide('#ovSetup');
  if(setupMode==='solo'){const pr=shuffle(Object.keys(PROF)).slice(0,2);
   startGame({mode:'solo',diff:Store.settings.diff,players:[{name:'Vous',ai:null,kitty:0,def:0,elim:false}].concat(
    pr.map(k=>({name:PROF[k].name,ai:Object.assign({},PROF[k],{id:k}),kitty:0,def:0,elim:false})))})}
  else{const n=+($('#setupBody').dataset.n||2);
   const players=Array.from({length:n},(_,i)=>({name:(($('#nm'+i)||{}).value?$('#nm'+i).value.trim():'Joueur '+(i+1)),ai:null,kitty:0,def:0,elim:false}));
   startGame({mode:'pass',diff:Store.settings.diff,players})}};
 $('#setupBack').onclick=()=>{hide('#ovSetup');show('#ovMenu')};
 $('#mSolo').onclick=()=>{Sound.init();Sound.click();hide('#ovMenu');setupScreen('solo')};
 $('#mPass').onclick=()=>{Sound.init();Sound.click();hide('#ovMenu');setupScreen('pass')};
 $('#mRules').onclick=()=>{Sound.click();show('#ovRules')};
 $('#rulesClose').onclick=()=>hide('#ovRules');
 $('#mCareer').onclick=()=>{Sound.click();const c=Store.career;
  $('#careerBody').innerHTML='<p>Parties jouées : <b>'+c.played+'</b> — Victoires : <b>'+c.wins+'</b></p>'+
   '<p>Gain cumulé : <b>'+c.gain.toLocaleString('fr-FR')+' €</b> — Record : <b>'+c.best.toLocaleString('fr-FR')+' €</b></p>'+
   '<p>Finales jouées : <b>'+c.finales+'</b> — Jackpots : <b>'+c.jackpots+'</b></p>'+
   '<p>Série en cours : <b>'+c.streak+'</b> (meilleure : '+c.bestStreak+')</p>';show('#ovCareer')};
 $('#careerClose').onclick=()=>hide('#ovCareer');
 $('#mSound').onclick=()=>{const s=Store.settings;s.sound=!s.sound;Store.settings=s;soundBtn()};
 soundBtn();
 requestAnimationFrame(loop);
 show('#ovMenu')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
document.addEventListener('click',()=>Sound.init(),{once:true});
if(location.protocol.startsWith('http')&&'serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});