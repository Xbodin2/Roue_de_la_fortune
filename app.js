'use strict';
/* ============================================================
   LA ROUE DE LA FORTUNE — app.js v2.6
   Correctif : plus aucune consonne CACHÉE dans l'énigme =>
   LANCER désactivé (humain + IA), restent VOYELLE et SOLUTION
   ============================================================ */

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
const isLetter=ch=>/[A-Za-zÀ-ÿ]/.test(ch);

/* ================= AFFICHEUR D'ERREUR ================= */
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
 tick(){this.t(1200,.04,'square',.05)},
 click(){this.t(600,.06,'triangle',.12)},
 ding(){this.t(880,.12);this.t(1320,.25,'sine',.15,.09)},
 buzz(){this.t(160,.45,'sawtooth',.13)},
 gong(){this.t(110,.9,'triangle',.25);this.t(55,1.2,'sine',.2,.02)},
 fanfare(){[523,659,784,1046,1318].forEach((f,i)=>this.t(f,.28,'square',.11,i*.11))},
 jackpot(){[392,523,659,784,1046,1568].forEach((f,i)=>this.t(f,.4,'sawtooth',.09,i*.09))},
 jingleManche(){[392,494,587,784].forEach((f,i)=>this.t(f,.22,'triangle',.14,i*.09))},
 jingleFinale(){[523,659,784,1046,784,1046,1318,1568].forEach((f,i)=>this.t(f,.3,'square',.1,i*.12));this.applause(2)},
 applause(dur){if(!this.on||!this.ctx)return;try{
  const d=dur||1.4,sr=this.ctx.sampleRate,buf=this.ctx.createBuffer(1,Math.floor(sr*d),sr),ch=buf.getChannelData(0);
  for(let i=0;i<ch.length;i++)ch[i]=(Math.random()*2-1)*Math.pow(1-i/ch.length,1.6);
  const src=this.ctx.createBufferSource();src.buffer=buf;
  const f=this.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=1700;f.Q.value=.6;
  const g=this.ctx.createGain();g.gain.value=.5;
  src.connect(f);f.connect(g);g.connect(this.ctx.destination);src.start()}catch(e){}}};

/* ================= SAUVEGARDES ================= */
const mem={};
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return mem[k]||null}},
 set(k,v){try{localStorage.setItem(k,v)}catch(e){mem[k]=v}}};
const Store={
 get career(){return JSON.parse(LS.get('rdf_career')||'{"played":0,"wins":0,"gain":0,"jackpots":0,"finales":0,"best":0,"streak":0,"bestStreak":0}')},
 set career(v){LS.set('rdf_career',JSON.stringify(v))},
 get settings(){return JSON.parse(LS.get('rdf_set')||'{"sound":true,"diff":"moyen"}')},
 set settings(v){LS.set('rdf_set',JSON.stringify(v))}};

/* ================= ROUE : 24 SEGMENTS ================= */
const PAL=['#ff2d95','#7b2ff7','#ffd600','#ff7a00','#22dd44','#2979ff','#ff1744','#00e5ff'];
const SEG=(()=>{const def=[['cash',300],['cash',500],['cash',700],['banq',0],['cash',400],['cash',650],['cash',1000],['passe',0],
 ['cash',350],['cash',550],['cash',800],['jack',500],['cash',250],['cash',450],['cash',900],['banq',0],
 ['cash',150],['cash',600],['hold',0],['cash',500],['cash',750],['cash',1000],['cash',400],['cash',850]];
 let pi=0;return def.map(([t,v])=>{let c;
  if(t==='banq')c='#151515';else if(t==='passe')c='#f5f5f5';
  else if(t==='hold')c='#d7a86e';else if(t==='jack')c='#ffe93b';else c=PAL[pi++%8];
  return{t,v,c}})})();
const NSEG=SEG.length,SEGA=Math.PI*2/NSEG;
const segLabel=s=>s.t==='cash'?s.v+' €':s.t==='banq'?'BANQUEROUTE !':s.t==='passe'?'PASSE':s.t==='hold'?'HOLD-UP !':'JACKPOT !';

/* ================= IA (v2.5 équilibrée) ================= */
const PROF={
 prudent:{name:'Béatrice',icon:'🛡️',lbl:'🛡️ Béatrice (prudente)',seuil:.60,floorMod:.05,skill:.03,attempt:.95,voy:.8},
 flambe:{name:'Enzo',icon:'🔥',lbl:'🔥 Enzo (flambeur)',seuil:.92,floorMod:0,skill:0,attempt:.35,voy:.15},
 erudit:{name:'Professeur',icon:'🎓',lbl:'🎓 Professeur (érudit)',seuil:.15,floorMod:-.10,skill:.08,attempt:.90,voy:.4}};
const DIFF={
 facile:{solve:.18,letter:.45,floor:.55},
 moyen:{solve:.42,letter:.70,floor:.40},
 expert:{solve:.60,letter:.90,floor:.30}};
const solveThreshold=()=>{const d=DIFF[S.diff],pr=player().ai;return Math.max(d.floor+pr.floorMod,pr.seuil)};
const solveChance=r=>{const d=DIFF[S.diff],pr=player().ai;
 return Math.min(.95,Math.max(.05,d.solve+pr.skill+Math.max(0,r-solveThreshold())*.8))};

/* ================= ÉTAT ================= */
let S=null,LASTCFG=null,deck=[],finDeck=[];
const P=()=>S.players,player=()=>S.players[S.cur];
const solLetters=()=>key(S.sol).split('');
const ratio=()=>{const L=solLetters();return L.length?L.filter(c=>S.revealed.has(c)).length/L.length:1};
const count=L=>solLetters().filter(c=>c===L).length;
const consoLeft=()=>CONS.filter(L=>!S.calledC.has(L)&&!S.revealed.has(L));
const voyLeft=()=>VOY.filter(L=>!S.calledV.has(L)&&!S.revealed.has(L));
const noConsoLeft=()=>consoLeft().length===0;
/* v2.6 : condition clé — plus aucune consonne CACHÉE dans l'énigme */
const noConsoHidden=()=>!solLetters().some(c=>CONS.includes(c)&&!S.revealed.has(c));
const canSolve=()=>S.consoOk||noConsoHidden();

/* ================= AFFICHAGE ================= */
function log(m){const l=$('#log');if(!l)return;const d=document.createElement('div');d.textContent=m;l.prepend(d);while(l.children.length>4)l.lastChild.remove()}
function flash(txt,col='#ffd600'){const f=$('#flash');if(!f)return;f.textContent=txt;f.style.color=col;f.classList.remove('show');void f.offsetWidth;f.classList.add('show')}
function confetti(){for(let i=0;i<110;i++){const s=document.createElement('span');s.style.left=Math.random()*100+'vw';
 s.style.background=pick(PAL);s.style.animationDelay=(Math.random()*.8)+'s';$('#fx').appendChild(s);setTimeout(()=>s.remove(),3600)}}
function setSeg(txt,col){const d=$('#segDisplay');if(!d)return;d.textContent=txt;d.style.color=col||'#ffd600'}
function renderJack(){$('#jackVal').textContent=S.jackpot.toLocaleString('fr-FR')+' €'}
function renderRound(){$('#roundStars').textContent='★'.repeat(Math.min(S.round,3));$('#roundLbl').textContent=S.sudden?'MORT SUBITE':'MANCHE '+S.round}
function renderBoard(){const b=$('#board');b.innerHTML='';S.sol.split(' ').forEach(w=>{const wd=document.createElement('div');wd.className='word';
 [...w].forEach(ch=>{const t=document.createElement('span');
  if(!isLetter(ch)){t.className='tile free';t.textContent=ch}else{const n=norm(ch);const rv=S.revealed.has(n);
   t.className='tile'+(rv?' rev':'');t.textContent=rv?ch.toUpperCase():''}wd.appendChild(t)});b.appendChild(wd)})}
function renderScores(){$('#scores').innerHTML=P().map((p,i)=>`<div class="plq${i===S.cur?' cur':''}">
 <span class="nm">${p.ai?p.ai.icon+' ':''}${p.name}</span><span class="k">${p.kitty.toLocaleString('fr-FR')} €</span><span class="d">✔ ${p.def.toLocaleString('fr-FR')} €</span></div>`).join('')}
/* v2.6 : LANCER coupé dès qu'aucune consonne cachée ne subsiste */
function setActions(on){$('#btnSpin').disabled=!on||noConsoHidden();
 $('#btnVowel').disabled=!on||player().kitty<250||!(S.vowelGate||noConsoHidden());
 $('#btnSolve').disabled=!on||!canSolve()}

/* ================= ROUE : rendu + physique ================= */
const cv=$('#wheel'),cx=cv?cv.getContext('2d'):null;
const wheel={angle:0,vel:0,spinning:false,lastIdx:-1};
let stopResolve=null;
const normA=a=>((a%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
const curIdx=()=>Math.floor(normA(-Math.PI/2-wheel.angle)/SEGA)%NSEG;
function drawWheel(){if(!cx)return;const R=360,C=360;cx.clearRect(0,0,720,720);
 for(let i=0;i<NSEG;i++){const a0=wheel.angle+i*SEGA;cx.beginPath();cx.moveTo(C,C);cx.arc(C,C,R-8,a0,a0+SEGA);cx.closePath();
  cx.fillStyle=SEG[i].c;cx.fill();cx.strokeStyle='#fff';cx.lineWidth=4;cx.stroke();
  cx.save();cx.translate(C,C);cx.rotate(a0+SEGA/2);
  const lb=segLabel(SEG[i]).replace(' !','');
  cx.font='900 '+(lb.length<=4?56:lb.length<=6?44:lb.length<=8?36:28)+'px "Arial Black",Arial';
  cx.textAlign='center';cx.strokeStyle='#000';cx.lineWidth=8;cx.strokeText(lb,R*.6,12);
  cx.fillStyle='#fff';cx.fillText(lb,R*.6,12);cx.restore()}
 cx.beginPath();cx.arc(C,C,62,0,7);cx.fillStyle='#fff';cx.fill();
 cx.beginPath();cx.arc(C,C,42,0,7);cx.fillStyle='#7b2ff7';cx.fill();
 cx.fillStyle='#ffd600';cx.font='900 34px Arial';cx.textAlign='center';cx.fillText('€',C,C+11)}
function fitWheel(){const st=$('#stage'),wr=$('#wheelWrap'),sd=$('#segDisplay');if(!st||!wr)return;
 let H=st.clientHeight;if(H<10)H=Math.floor(window.innerHeight*0.38);
 const h=H-(sd?sd.offsetHeight:0)-16,w=st.clientWidth*0.92;
 const size=Math.max(140,Math.min(w,h,500));wr.style.width=size+'px';if(sd)sd.style.width=size+'px'}
window.addEventListener('resize',fitWheel);
window.addEventListener('orientationchange',()=>setTimeout(fitWheel,250));
let lastT=0;
function loop(t){const dt=Math.min(.05,(t-lastT)/1000||0);lastT=t;
 if(wheel.spinning){wheel.angle=normA(wheel.angle+wheel.vel*dt);wheel.vel-=wheel.vel*1.15*dt;
  const i=curIdx();if(i!==wheel.lastIdx){wheel.lastIdx=i;Sound.tick()}
  if(wheel.vel<.18){wheel.spinning=false;const f=stopResolve;stopResolve=null;if(f)f();onSegment(SEG[curIdx()])}}
 drawWheel();requestAnimationFrame(loop)}
const waitStop=()=>wheel.spinning?new Promise(r=>stopResolve=r):Promise.resolve();
function launchSpin(pw){if(wheel.spinning||!S||S.phase!=='action'||noConsoHidden())return;
 wheel.spinning=true;wheel.vel=pw;S.phase='spin';
 S.consoDone=false;S.vowelGate=false;
 setActions(false);setSeg('LA ROUE TOURNE…','#00e5ff');Sound.click()}
let hist=[],down=false;
const angAt=e=>{const r=cv.getBoundingClientRect();return Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2))};
if(cv){
cv.addEventListener('pointerdown',e=>{Sound.init();down=true;hist=[{a:angAt(e),t:performance.now()}];cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{if(!down)return;hist.push({a:angAt(e),t:performance.now()});if(hist.length>8)hist.shift()});
cv.addEventListener('pointerup',()=>{if(!down)return;down=false;
 if(!S||S.phase!=='action'||player().ai)return;
 if(hist.length<2)return;const a=hist[hist.length-1],b=hist[Math.max(0,hist.length-4)];
 const dt=(a.t-b.t)/1000;if(dt<=0)return;const v=(a.a-b.a)/dt;
 if(Math.abs(v)<4){flash('GLISSEZ PLUS FORT !','#00e5ff');return}
 launchSpin(Math.min(28,Math.max(7,Math.abs(v))))});}

/* ================= ZONE ALTERNANTE + CLAVIER (saisie masquée) ================= */
function showStage(m){const st=$('#stage');st.classList.toggle('mode-kb',m==='kb');if(m==='wheel')setTimeout(fitWheel,320)}
let kbResolve=null,kbMode=null,kbTyped=[],kbHidden=[];
const kbChars=()=>[...S.sol];
function kbFieldDisplay(){let k=0;const str=kbChars().map(ch=>{
  if(!isLetter(ch))return ch;
  if(S.revealed.has(norm(ch)))return ch.toUpperCase();
  return kbTyped[k++]||'_'}).join('');
 $('#kbField').textContent=str}
function kbCandidate(){let k=0;return kbChars().map(ch=>{
  if(!isLetter(ch))return ch;
  if(S.revealed.has(norm(ch)))return ch;
  return kbTyped[k++]||''}).join('')}
function kbRefreshOK(){$('#kbOK').disabled=!(kbTyped.length===kbHidden.length)}
function openKB(mode,timer){return new Promise(res=>{kbResolve=res;kbMode=mode;kbTyped=[];kbHidden=[];
 $('#kbTitle').textContent=mode==='cons'?'PROPOSEZ UNE CONSONNE':mode==='voy'?'ACHETER UNE VOYELLE (250 €)':'VOTRE SOLUTION — COMPLÉTEZ LES CASES MANQUANTES';
 $('#kbField').classList.toggle('hidden',mode!=='sol');
 $('#kbTimer').classList.add('hidden');
 $('#kbOK').classList.toggle('hidden',mode!=='sol');
 $('#kbCancel').classList.toggle('hidden',mode==='cons');
 const k=$('#kbKeys');k.innerHTML='';
 let rows;
 if(mode==='cons'){const rest=consoLeft();rows=[rest.length?rest:CONS.filter(L=>!S.calledC.has(L))]}
 else if(mode==='voy'){const rest=voyLeft();rows=[rest.length?rest:VOY.filter(L=>!S.calledV.has(L))]}
 else{
  kbChars().forEach((ch,i)=>{if(isLetter(ch)&&!S.revealed.has(norm(ch)))kbHidden.push(i)});
  rows=AZ.map(r=>[...r]);rows[2].push('⌫');
  kbFieldDisplay();kbRefreshOK()}
 rows.forEach(r=>{const d=document.createElement('div');d.className='krow';
  r.forEach(L=>{const b=document.createElement('button');b.className='key';b.textContent=L;
   b.onclick=()=>{Sound.click();
    if(mode==='sol'){
     if(L==='⌫')kbTyped.pop();
     else if(kbTyped.length<kbHidden.length)kbTyped.push(L);
     kbFieldDisplay();kbRefreshOK()}
    else closeKB(L)};
   d.appendChild(b)});k.appendChild(d)});
 showStage('kb');
 if(timer){const tb=$('#kbTimer');tb.classList.remove('hidden');const bar=tb.querySelector('i');bar.style.transition='none';bar.style.width='100%';
  requestAnimationFrame(()=>{bar.style.transition='width '+timer+'s linear';bar.style.width='0%'});
  setTimeout(()=>{if(kbResolve)closeKB(null)},timer*1000)}})}
function closeKB(v){showStage('wheel');const f=kbResolve;kbResolve=null;if(f)f(v)}

/* ================= GÉNÉRIQUE & TRANSITIONS ================= */
let genSkip=null,transSkip=null;
function genPlay(short){return new Promise(res=>{const ov=$('#ovGen');ov.classList.toggle('short',!!short);show('#ovGen');
 if(short)Sound.fanfare();else Sound.jingleFinale();
 const done=()=>{ov.onclick=null;hide('#ovGen');if(genSkip){clearTimeout(genSkip);genSkip=null}res()};
 ov.onclick=done;genSkip=setTimeout(done,short?2600:6000)})}
function transPlay(title,html,ms,fin){return new Promise(res=>{const ov=$('#ovTrans');ov.classList.toggle('fin',!!fin);
 $('#transTitle').textContent=title;$('#transBody').innerHTML=html;show('#ovTrans');
 if(fin){Sound.jingleFinale();confetti()}else Sound.jingleManche();
 const done=()=>{ov.onclick=null;hide('#ovTrans');if(transSkip){clearTimeout(transSkip);transSkip=null}res()};
 ov.onclick=done;transSkip=setTimeout(done,ms)})}
const recapHTML=()=>P().slice().sort((a,b)=>b.def-a.def).map(p=>`<b>${p.ai?p.ai.icon+' ':''}${p.name}</b> : ${p.def.toLocaleString('fr-FR')} €`).join('<br>');

/* ================= DÉROULEMENT ================= */
function startGame(cfg){LASTCFG=cfg;hide('#ovMenu');hide('#ovEnd');hide('#ovFin');
 S={mode:cfg.mode,diff:cfg.diff,players:cfg.players,round:1,jackpot:23000,cur:0,phase:'idle',
  sol:'',cat:'',revealed:new Set(),calledC:new Set(),calledV:new Set(),turns:0,jackArmed:false,
  sudden:false,tied:[],finQual:-1,roundOver:false,over:false,curSeg:null,segAsk:null,
  consoDone:false,vowelGate:false,consoOk:false};
 deck=shuffle(PUZZLES.slice());finDeck=shuffle(FINALE.slice());
 $('#log').innerHTML='';renderJack();
 genPlay(true).then(()=>startRound())}
async function startRound(){const p=S.sudden?deck.pop()||pick(PUZZLES):deck.pop();
 S.sol=p[1];S.cat=p[0];S.revealed=new Set();S.calledC=new Set();S.calledV=new Set();S.turns=0;S.roundOver=false;S.segAsk=null;
 S.consoDone=false;S.vowelGate=false;S.consoOk=false;
 P().forEach(j=>j.kitty=0);
 S.cur=S.sudden?S.tied[0]:(S.round-1)%P().length;
 $('#cat').textContent='CATÉGORIE : '+S.cat;renderBoard();renderRound();renderScores();renderJack();
 showStage('wheel');setSeg('Glissez sur la roue ou appuyez sur LANCER','#bdb2ff');fitWheel();
 if(S.round>1||S.sudden)await transPlay(S.sudden?'⚡ MORT SUBITE':'MANCHE '+S.round,
  (S.sudden?'Égalité parfaite ! Première bonne solution qualifiée pour la finale.<br>':'Nouvelle énigme, catégorie : <b>'+S.cat+'</b><br>')+recapHTML(),3200,false);
 else flash('MANCHE 1 : '+S.cat,'#00e5ff');
 beginTurn()}
function beginTurn(){if(S.over||S.roundOver)return;S.turns++;S.jackArmed=false;
 S.consoDone=false;S.consoOk=false;S.vowelGate=false;
 if(S.turns>60)return endRound(null,true);
 renderScores();log('▶ Tour de '+player().name);
 if(player().ai){S.phase='action';setActions(false);aiTurn()}
 else if(S.mode==='pass'){$('#handTxt').textContent='📱 Au tour de '+player().name+' !';show('#ovHand')}
 else humanTurn()}
function humanTurn(){S.phase='action';showStage('wheel');setActions(true);
 if(noConsoHidden())setSeg('PLUS AUCUNE CONSONNE À DÉCOUVRIR : VOYELLE OU SOLUTION','#ff7a00');
 else if(!canSolve())setSeg('VALIDEZ UNE CONSONNE POUR PROPOSER UNE SOLUTION','#bdb2ff');
 else setSeg('Glissez sur la roue ou appuyez sur LANCER','#bdb2ff')}
function keepHand(){renderScores();if(player().ai)aiTurn();else humanTurn()}
function nextTurn(){if(S.over||S.roundOver)return;S.segAsk=null;
 do{S.cur=(S.cur+1)%P().length}while(P()[S.cur].elim);beginTurn()}

async function onSegment(seg){S.phase='seg';
 setSeg(segLabel(seg),seg.t==='banq'?'#ff1744':seg.t==='jack'?'#ffe93b':'#ffd600');await sleep(350);
 if(seg.t==='banq'){player().kitty=0;Sound.gong();flash('BANQUEROUTE !','#ff1744');log(player().name+' perd toute sa cagnotte !');renderScores();await sleep(1300);return nextTurn()}
 if(seg.t==='passe'){Sound.buzz();flash('PASSE','#ffffff');log(player().name+' passe son tour');await sleep(900);return nextTurn()}
 if(seg.t==='hold')return holdUp();
 if(seg.t==='jack'){S.jackArmed=true;Sound.jackpot();flash('JACKPOT ARMÉ !','#ffe93b');log('Résolvez l\'énigme maintenant pour gagner le jackpot !')}
 S.curSeg=seg;S.segAsk='C';
 if(!player().ai){
  if(noConsoHidden()){
   S.segAsk=null;S.vowelGate=true;flash('PLUS AUCUNE CONSONNE !','#ff7a00');
   setSeg('VOYELLE OU SOLUTION','#ff7a00');keepHand()}
  else openKB('cons').then(L=>{if(L)callConsonant(L)})}}
async function callConsonant(L){if(S.consoDone)return;S.consoDone=true;S.segAsk=null;S.calledC.add(L);const occ=count(L);
 if(occ>0){S.revealed.add(L);const g=(S.curSeg.v||0)*occ;player().kitty+=g;
  S.vowelGate=true;S.consoOk=true;
  Sound.ding();flash('+'+g.toLocaleString('fr-FR')+' €','#22dd44');log(player().name+' : '+L+' ×'+occ+' = +'+g+' €');
  renderBoard();keepHand()}
 else{Sound.buzz();flash(L+' : ABSENTE','#ff7a00');log(L+' absente');nextTurn()}}
async function buyVowel(v){S.calledV.add(v);player().kitty-=250;const occ=count(v);
 if(occ>0){S.revealed.add(v);Sound.ding();flash(v+' RÉVÉLÉE','#22dd44');log(player().name+' achète '+v);renderBoard();keepHand()}
 else{Sound.buzz();flash(v+' : ABSENTE','#ff7a00');log(v+' absente');nextTurn()}}
async function propose(txt){if(!txt)return;
 const good=key(txt)===key(S.sol);
 log(player().name+' propose : « '+txt+' »');
 if(good){
  [...new Set(solLetters())].forEach(L=>S.revealed.add(L));renderBoard();
  Sound.fanfare();Sound.applause();
  flash('« '+txt+' » ✔','#22dd44');await sleep(1700);
  return endRound(S.cur,false)}
 if(S.sudden){player().elim=true;Sound.gong();flash('« '+txt+' » ✗ ÉLIMINÉ','#ff1744');
  const alive=S.tied.filter(i=>!P()[i].elim);
  if(alive.length===0){S.finQual=pick(S.tied);return finale()}
  if(alive.length===1){S.finQual=alive[0];return finale()}
  await sleep(1200);return nextTurn()}
 player().kitty=Math.max(0,player().kitty-500);Sound.buzz();
 flash('« '+txt+' » ✗ −500 €','#ff1744');await sleep(1300);nextTurn()}
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
  flash('MANCHE REMPORTÉE !','#ffd600');confetti();Sound.applause();log(msg);renderScores();renderJack();await sleep(1800)}
 else{P().forEach(j=>j.kitty=0);flash(cancel?'MANCHE ANNULÉE':'MANCHE SANS VAINQUEUR','#ffffff');await sleep(1200)}
 if(S.sudden){if(S.finQual<0)S.finQual=winner!==null&&winner!==undefined?winner:pick(S.tied);return finale()}
 if(S.round<3){S.round++;return startRound()}
 const mx=Math.max(...P().map(p=>p.def));const tied=P().map((p,i)=>p.def===mx?i:-1).filter(i=>i>=0);
 if(tied.length===1){S.finQual=tied[0];return finale()}
 flash('ÉGALITÉ !','#ff2d95');await sleep(1200);
 S.sudden=true;S.tied=tied;P().forEach((p,i)=>p.elim=!tied.includes(i));startRound()}

/* ================= IA (v2.6 : ne spinne jamais sans consonne cachée) ================= */
async function aiTurn(){if(!S||S.over||S.roundOver)return;
 S.phase='action';
 const p=player(),d=DIFF[S.diff],pr=p.ai,r=ratio();
 await sleep(ri(900,1700));if(S.roundOver)return;
 if(canSolve()&&r>=solveThreshold()&&Math.random()<pr.attempt)return aiSolve(r,d,pr);
 /* v2.6 : plus aucune consonne cachée => voyelle (si possible) ou solution, JAMAIS de spin */
 if(noConsoHidden()){
  if(p.kitty>=250&&voyLeft().length&&Math.random()<pr.voy)return buyVowel(pick(voyLeft()));
  return aiSolve(r,d,pr)}
 if(p.kitty>=250&&(S.vowelGate||noConsoHidden())&&Math.random()<pr.voy){const v=aiPick(voyLeft(),d,false);if(v)return buyVowel(v)}
 launchSpin(rnd(9,22));await waitStop();await sleep(600);
 if(S.segAsk==='C'){await sleep(600);const L=aiPick(consoLeft(),d,true);
  if(L)callConsonant(L);
  else{
   if(p.kitty>=250&&voyLeft().length){S.consoDone=true;S.vowelGate=true;buyVowel(pick(voyLeft()))}
   else aiSolve(r,d,pr)}}}
function aiPick(pool,d,wantPresent){if(!pool.length)return null;
 const present=pool.filter(L=>count(L)>0);
 if(wantPresent&&present.length&&Math.random()<d.letter)return FREQ.find(f=>present.includes(f))||pick(present);
 if(!wantPresent&&present.length&&Math.random()<d.letter)return pick(present);
 return pick(pool)}
async function aiSolve(r,d,pr){const p=solveChance(r);
 if(Math.random()<p){return propose(S.sol)}
 const wrong=S.sol.replace(/[A-Za-zÀ-ÿ]/g,c=>Math.random()<.15?pick('ABCDEFGHIJKLMNOPQRSTUVWXYZ'):c);
 return propose(wrong)}

/* ================= ACTIONS HUMAIN ================= */
function bindGame(){
 $('#kbOK').onclick=()=>{if(kbMode==='sol'){if(kbTyped.length===kbHidden.length)closeKB(kbCandidate())}};
 $('#kbCancel').onclick=()=>closeKB(null);
 $('#handReady').onclick=()=>{Sound.init();Sound.click();hide('#ovHand');humanTurn()};
 $('#btnSpin').onclick=()=>{Sound.init();if(S&&S.phase==='action'&&!player().ai&&!noConsoHidden())launchSpin(rnd(9,20))};
 $('#btnVowel').onclick=async()=>{Sound.init();if(!S||S.phase!=='action'||player().ai)return;setActions(false);
  const v=await openKB('voy');if(v&&S&&!S.roundOver)await buyVowel(v);else if(S&&!S.roundOver)humanTurn()};
 $('#btnSolve').onclick=async()=>{Sound.init();if(!S||S.phase!=='action'||player().ai||!canSolve())return;setActions(false);
  const t=await openKB('sol');if(t)await propose(t);else if(S&&!S.roundOver)humanTurn()};
 $('#endReplay').onclick=()=>{hide('#ovEnd');startGame(LASTCFG)};
 $('#endMenu').onclick=()=>{hide('#ovEnd');S=null;show('#ovMenu')}}

/* ================= GRANDE FINALE ================= */
async function finale(){const q=S.finQual,p=P()[q];
 await transPlay('GRANDE FINALE','<b>'+(p.ai?p.ai.icon+' ':'')+p.name+'</b> se qualifie pour la Grande Finale !<br>'+recapHTML(),3400,true);
 const f=finDeck.pop()||pick(FINALE);const sol=f[1];
 S.sol=sol;S.cat='FINALE : '+f[0];S.revealed=new Set();S.calledC=new Set();S.calledV=new Set();
 ['R','S','T','L','N','E'].forEach(L=>{if(key(sol).includes(L))S.revealed.add(L)});
 $('#cat').textContent='🌟 '+S.cat;renderBoard();renderRound();setActions(false);showStage('wheel');
 setSeg('GRANDE FINALE','#ff2d95');fitWheel();
 if(!p.ai){
  const chosen={c:[],v:null};
  await new Promise(res=>{const body=$('#finBody');
   body.innerHTML='<p><b>'+p.name+'</b>, choisissez <b>3 consonnes</b> et <b>1 voyelle</b> :</p>';
   const mk=(list,cls,max)=>{const d=document.createElement('div');d.className='pick';
    list.forEach(L=>{const b=document.createElement('button');b.className='key';b.textContent=L;
     b.onclick=()=>{Sound.click();
      if(cls==='c'){if(chosen.c.includes(L)||chosen.c.length>=max)return;b.classList.add('sel');chosen.c.push(L)}
      else{d.querySelectorAll('.sel').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');chosen.v=L}
      ok.disabled=!(chosen.c.length===3&&chosen.v)};d.appendChild(b)});body.appendChild(d)};
   mk(consoLeft(),'c',3);mk(voyLeft(),'v',1);
   const ok=document.createElement('button');ok.className='mb';ok.textContent='✔ RÉVÉLER LES LETTRES';ok.disabled=true;
   ok.onclick=()=>{chosen.c.forEach(L=>S.revealed.add(L));if(chosen.v)S.revealed.add(chosen.v);res()};body.appendChild(ok);
   show('#ovFin')});
  hide('#ovFin');renderBoard();
  const t=await openKB('sol',10);
  if(t){log(p.name+' propose : « '+t+' »');
   if(key(t)===key(sol)){[...new Set(key(sol).split(''))].forEach(L=>S.revealed.add(L));renderBoard();
    flash('« '+t+' » ✔','#22dd44');await sleep(1500);return finWin(p,sol)}}
  return finLose(p,sol)}
 const pc=consoLeft().filter(L=>count(L)>0),pv=voyLeft().filter(L=>count(L)>0);
 shuffle(pc).slice(0,ri(1,3)).forEach(L=>S.revealed.add(L));
 if(pv.length&&Math.random()<.7)S.revealed.add(pick(pv));
 flash('LETTRES DE '+p.name.toUpperCase(),'#00e5ff');renderBoard();await sleep(2200);
 const d=DIFF[S.diff];
 if(Math.random()<Math.min(.9,d.solve+.25+p.ai.skill)){
  [...new Set(key(sol).split(''))].forEach(L=>S.revealed.add(L));renderBoard();
  log(p.name+' propose : « '+sol+' »');flash('« '+sol+' » ✔','#22dd44');await sleep(1500);
  return finWin(p,sol)}
 return finLose(p,sol)}
async function finWin(p,sol){const env=pick([1000,5000,10000,25000]);p.def+=env;
 Sound.jackpot();Sound.applause(2);confetti();
 $('#finBody').innerHTML='<p class="env">🎉 SOLUTION : '+sol+'</p><p class="env">✉️ '+(env===25000?'SUPER LOT (25 000 €)':env.toLocaleString('fr-FR')+' €')+'</p><p><b>'+p.name+'</b> remporte la Grande Finale !</p>';
 show('#ovFin');await sleep(2800);hide('#ovFin');endGame()}
async function finLose(p,sol){Sound.gong();
 $('#finBody').innerHTML='<p class="env">❌ PERDU…</p><p>La solution était : <b>'+sol+'</b></p>';
 show('#ovFin');await sleep(2400);hide('#ovFin');endGame()}

/* ================= FIN / CARRIÈRE ================= */
function endGame(){S.over=true;const rank=P().map((p,i)=>[p,i]).sort((a,b)=>b[0].def-a[0].def);
 $('#endTitle').textContent='🏆 '+rank[0][0].name+' GAGNE !';
 $('#endBody').innerHTML='<table class="st">'+rank.map(([p],r)=>'<tr><td>'+(r===0?'🥇':r===1?'🥈':'')+' '+(p.ai?p.ai.icon+' ':'')+p.name+'</td><td><b>'+p.def.toLocaleString('fr-FR')+' €</b></td></tr>').join('')+'</table>';
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

/* ================= DÉMARRAGE ================= */
function boot(){
 if(typeof PUZZLES==='undefined'||typeof FINALE==='undefined'){showErr('Fichier enigmes.js introuvable ou incomplet.');return}
 bindGame();
 $('#setupStart').onclick=()=>{Sound.init();Sound.click();hide('#ovSetup');
  if(setupMode==='solo'){const pr=shuffle(Object.keys(PROF)).slice(0,2);
   startGame({mode:'solo',diff:Store.settings.diff,players:[{name:'Vous',ai:null,kitty:0,def:0,elim:false}].concat(
    pr.map(k=>({name:PROF[k].name,ai:Object.assign({},PROF[k],{id:k}),kitty:0,def:0,elim:false})))})}
  else{const n=+($('#setupBody').dataset.n||2);
   const players=Array.from({length:n},(_,i)=>{const inp=$('#nm'+i);return{name:inp&&inp.value.trim()?inp.value.trim():'Joueur '+(i+1),ai:null,kitty:0,def:0,elim:false}});
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
 soundBtn();fitWheel();requestAnimationFrame(loop);
 if(window.ResizeObserver){try{new ResizeObserver(()=>fitWheel()).observe($('#stage'))}catch(e){}}
 genPlay(false).then(()=>show('#ovMenu'))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
document.addEventListener('click',()=>Sound.init(),{once:true});
if(location.protocol.startsWith('http')&&'serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});