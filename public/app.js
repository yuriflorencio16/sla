// JavaScript / public/app.js / modern browsers / AimRush demo client
import {RULES,advance,stake,scaled,maximumPayout} from '/game.js';
import {money,ledgerLabel,parseEntry} from '/format.js';
import {Soundtrack} from '/music.js';
const $=id=>document.getElementById(id),canvas=$('range'),ctx=canvas.getContext('2d');let state=null,busy=false,offset=0,sound=false,audio=null,flashUntil=0,lastEvent=null,cursor=null,lastPoll=0,finishing=false;
let selectedEntry=500,currentView='lobby',noticeTimer;
const soundtrack=new Soundtrack(updateMusic);
function showView(view){
 if(view==='lobby'&&active())view='game';
 if(!['lobby','game','wallet','ranking','rules','audio'].includes(view))return;
 currentView=view;
 document.querySelectorAll('[data-view]').forEach(el=>el.hidden=el.dataset.view!==view);
 document.querySelectorAll('.bottom-nav [data-open]').forEach(el=>{
  const selected=el.dataset.open===view||(el.dataset.open==='lobby'&&view==='game');
  el.classList.toggle('is-active',selected);if(selected)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
 });
 document.body.dataset.page=view;
 window.scrollTo(0,0);
}
function updateEntry(){
 const amount=parseEntry($('entryAmount').value);
 selectedEntry=amount;
 $('entryAmount').setAttribute('aria-invalid',String(amount===null));
 $('entryError').textContent=amount===null?'Informe um valor de R$ 1,00 a R$ 100,00.':'';
 document.querySelectorAll('[data-entry]').forEach(el=>{el.setAttribute('aria-pressed',String(Number(el.dataset.entry)===amount));el.disabled=active();});
 $('entryAmount').disabled=active();
 $('playLobby').disabled=amount===null||!state||busy;
 $('playLobby').textContent=active()?'Retomar partida':state&&amount!==null&&state.balance<amount?'Recarregar saldo virtual':'Jogar com saldo virtual →';
 $('maxPayout').textContent=amount===null?'—':money(maximumPayout(amount));
 const sample={entry:amount??500};
 $('hitReward').textContent=money(scaled(sample,RULES.hit),true);
 $('comboReward').textContent=money(scaled(sample,RULES.hit+2)-scaled(sample,RULES.hit),true);
 $('missPenalty').textContent=money(-scaled(sample,RULES.miss));
 $('errorPenalty').textContent=money(-scaled(sample,RULES.error));
}
function notify(text){$('notice').textContent=text;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,5500);}
async function beginRound(){
 if(busy)return;
 if(active())return showView('game');
 if(selectedEntry===null)return;
 lastEvent=null;$('start').disabled=true;
 const ok=await action('start',{entry:selectedEntry});
 if(!ok)$('start').disabled=false;
}
function updateMusic(){
 const playing=soundtrack.enabled&&soundtrack.context?.state==='running';
 $('music').textContent=soundtrack.enabled?'Pausar':'Tocar';
 $('music').setAttribute('aria-pressed',String(soundtrack.enabled));
 document.querySelector('.audio-card').classList.toggle('playing',Boolean(playing));
 $('audioStatus').textContent=soundtrack.enabled?(playing?'Música de fundo ativada.':'Música pausada enquanto a aba está em segundo plano.'):'A música começa quando você tocar em “Tocar”.';
}
try{const stored=localStorage.getItem('aimrush-music-volume');if(stored!==null&&Number.isFinite(Number(stored))){const value=Math.max(0,Math.min(100,Number(stored)));$('musicVolume').value=value;soundtrack.setVolume(value/100);$('volumeLabel').textContent=value+'%';}}catch{}
function active(){return state?.game?.status==='active';}
function elapsed(){return state?.game?Math.max(0,Date.now()+offset-state.game.started):0;}
function message(text){$('message').textContent=text;}
async function api(path,body){const before=Date.now(),r=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(data.error);offset=data.serverTime-(before+Date.now())/2;return data;}
function tone(hit){if(!sound)return;try{audio??=new AudioContext();audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);osc.frequency.value=hit?820:180;gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.08);osc.start();osc.stop(audio.currentTime+.09);}catch{}}
async function action(path,body={}){if(busy)return;busy=true;try{const previous=active();state=await api(path,body);if(state.event){lastEvent=state.event;flashUntil=performance.now()+450;tone(state.event.hit);}render(previous);if(path==='start')showView('game');if(path==='refill')notify('Saldo virtual completado até R$ 100,00.');return true;}catch(e){message(e.message);$('lobbyMessage').textContent=e.message;notify(e.message);return false;}finally{busy=false;updateEntry();}}
function render(previous=false){const g=state.game;if(active()){$('entryAmount').value=(stake(g)/100).toFixed(2).replace('.',',');}updateEntry();$('backLobby').hidden=active();$('gameEntry').textContent='ENTRADA '+money(g?stake(g):selectedEntry??500);$('balance').textContent=money(state.balance);$('heroBalance').textContent=money(state.balance);$('roundWallet').textContent=money(state.balance);$('projectedBalance').textContent=money(state.balance);$('phase').textContent=active()?'PARTIDA EM ANDAMENTO':g?'PARTIDA ENCERRADA':'PRONTO PARA JOGAR';$('overlay').hidden=active();$('finish').hidden=!active();$('start').disabled=false;finishing=false;
 if(g&&!active()){
  const r=g.result;
  $('overlayLabel').textContent='PARTIDA ENCERRADA · '+g.hits+' / 30 ALVOS';
  $('overlayTitle').textContent=r.net>0?'Sua mira fez a diferença.':g.hits?'A próxima é sua.':'Bora calibrar essa mira?';
  $('overlayResult').hidden=false;
  $('overlayResult').textContent=money(r.net,true);
  $('overlayResult').className='overlay-result'+(r.net<0?' negative':'');
  $('overlayText').textContent=`${r.accuracy}% de precisão · reação média ${r.reaction} ms · melhor combo ${g.bestStreak}×`;
  $('start').replaceChildren(document.createTextNode('Jogar novamente '));
  const span=document.createElement('span');span.textContent=money(selectedEntry??500)+' →';$('start').append(span);
  $('overlayFine').textContent=`Retorno virtual: ${money(g.paid)}. Entrada: ${money(stake(g))}.`;
  if(previous)message('Partida encerrada. Resultado e saldo virtual atualizados.');
 }else if(active())message('Acerte as bolinhas antes que desapareçam. Mantenha seu combo!');
 $('ledger').replaceChildren();state.ledger.forEach(t=>{const row=document.createElement('div');row.className='transaction';const label=document.createElement('span');label.textContent=ledgerLabel(t.label);const amount=document.createElement('b');amount.className=t.amount>=0?'positive':'negative';amount.textContent=money(t.amount,true);row.append(label,amount);$('ledger').append(row);});
 $('leaders').replaceChildren();if(!state.leaders.length){const p=document.createElement('p');p.className='empty';p.textContent='Conclua uma partida e marque seu lugar.';$('leaders').append(p);}state.leaders.forEach(l=>{const row=document.createElement('div');row.className='leader';const name=document.createElement('span'),rank=document.createElement('i'),score=document.createElement('b');rank.textContent=String(l.rank).padStart(2,'0');name.append(rank,document.createTextNode(l.name.replace(/^Player /,'Jogador ')+(l.you?' · VOCÊ':'')));score.textContent=l.hits+' / 30';row.append(name,score);$('leaders').append(row);});
}
function draw(now){const g=state?.game,e=elapsed(),live=active();if(live)advance(g,e);
 const bg=ctx.createLinearGradient(0,0,0,600);bg.addColorStop(0,'#071b38');bg.addColorStop(.65,'#0d2a47');bg.addColorStop(1,'#07152d');ctx.fillStyle=bg;ctx.fillRect(0,0,1000,600);
 ctx.lineWidth=1;ctx.strokeStyle='#6bbfff15';for(let x=0;x<=1000;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,420);ctx.stroke();}for(let y=20;y<=420;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1000,y);ctx.stroke();}
 ctx.strokeStyle='#5294cc27';ctx.beginPath();ctx.moveTo(0,420);ctx.lineTo(1000,420);ctx.stroke();for(let x=-1800;x<3000;x+=180){ctx.beginPath();ctx.moveTo(500+(x-500)*.18,420);ctx.lineTo(x,600);ctx.stroke();}for(const y of [440,468,506,552,598]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1000,y);ctx.stroke();}
 const glow=ctx.createRadialGradient(500,280,10,500,280,500);glow.addColorStop(0,'#268ae51f');glow.addColorStop(1,'#00000000');ctx.fillStyle=glow;ctx.fillRect(0,0,1000,600);
 const t=live?g.targets.find(t=>e>=t.at&&e<t.at+RULES.lifetime&&!g.resolved.includes(t.id)):null;
 if(t){const progress=(e-t.at)/RULES.lifetime;ctx.shadowColor='#26cfff60';ctx.shadowBlur=28;const sphere=ctx.createRadialGradient(t.x-t.r*.3,t.y-t.r*.35,1,t.x,t.y,t.r);sphere.addColorStop(0,'#ddfbff');sphere.addColorStop(.4,'#32dbff');sphere.addColorStop(1,'#075fb6');ctx.fillStyle=sphere;ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#69dfff70';ctx.lineWidth=2;ctx.beginPath();ctx.arc(t.x,t.y,t.r+9,-Math.PI/2,-Math.PI/2+(1-progress)*Math.PI*2);ctx.stroke();ctx.fillStyle='#eeffffb0';ctx.beginPath();ctx.arc(t.x-t.r*.25,t.y-t.r*.3,t.r*.12,0,Math.PI*2);ctx.fill();}
 if(live&&cursor){ctx.strokeStyle='#ffffffc0';ctx.lineWidth=1.5;const[x,y]=cursor;ctx.beginPath();for(const[a,b,c,d]of [[x-12,y,x-4,y],[x+4,y,x+12,y],[x,y-12,x,y-4],[x,y+4,x,y+12]]){ctx.moveTo(a,b);ctx.lineTo(c,d);}ctx.stroke();ctx.fillStyle='#fff';ctx.fillRect(x-1,y-1,2,2);}
 if(g){const net=Math.max(-stake(g),g.reward-g.penalty),accuracy=g.hits+g.errors.length?Math.round(g.hits/(g.hits+g.errors.length)*100):0;$('timer').textContent=(live?Math.max(0,(RULES.duration-e)/1000):0).toFixed(1).replace('.',',')+'s';$('hits').textContent=g.hits+' / 30';$('accuracy').textContent=accuracy+'%';$('streak').textContent=g.streak+'×';$('net').textContent=money(net,true);$('net').className=net<0?'negative':'positive';$('projectedBalance').textContent=money(live?state.balance+Math.max(0,stake(g)+g.reward-g.penalty):state.balance);$('targetCount').textContent=String(g.resolved.length).padStart(2,'0')+' / 30 ALVOS';const bonus=Math.min(10,Math.floor(g.streak/5)*2);$('bonus').textContent='+'+money(scaled(g,RULES.hit+bonus)-scaled(g,RULES.hit))+' / acerto';$('streakHint').textContent=bonus===10?'Bônus máximo liberado. Continue na sequência!':`${5-g.streak%5} acertos seguidos para aumentar seu bônus.`;document.querySelectorAll('.segments i').forEach((el,i)=>el.classList.toggle('on',bonus===10||i<g.streak%5));
 if(live&&e>=RULES.duration&&!finishing&&!busy){finishing=true;action('finish',{id:g.id});}
 }
 $('feedback').className='feedback'+(now<flashUntil?' visible':'')+(lastEvent&&!lastEvent.hit?' bad':'');if(lastEvent)$('feedback').textContent=lastEvent.hit?`${money(lastEvent.credits,true)}${lastEvent.streak>=5?' · COMBO '+lastEvent.streak+'×':''}`:money(lastEvent.credits)+' · ERRO';
 if(live&&Date.now()-lastPoll>1800&&!busy){lastPoll=Date.now();action('state',null);}
 requestAnimationFrame(draw);
}
function coordinates(event){const r=canvas.getBoundingClientRect();return [(event.clientX-r.left)*1000/r.width,(event.clientY-r.top)*600/r.height];}
canvas.addEventListener('pointermove',e=>{cursor=coordinates(e);});canvas.addEventListener('pointerleave',()=>cursor=null);canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!active()||busy)return;e.preventDefault();const[x,y]=coordinates(e),time=elapsed(),t=state.game.targets.find(t=>time>=t.at&&time<t.at+RULES.lifetime&&!state.game.resolved.includes(t.id));if(t)action('shot',{id:state.game.id,target:t.id,x,y});});
$('start').onclick=beginRound;
$('playLobby').onclick=()=>{if(state&&selectedEntry!==null&&state.balance<selectedEntry)showView('wallet');else beginRound();};
$('finish').onclick=()=>action('finish',{id:state.game.id});
$('refill').onclick=()=>action('refill');
$('walletButton').onclick=()=>showView('wallet');
$('backLobby').onclick=()=>showView('lobby');
$('entryAmount').oninput=updateEntry;
document.querySelectorAll('[data-entry]').forEach(button=>button.onclick=()=>{if(active())return;$('entryAmount').value=(Number(button.dataset.entry)/100).toFixed(2).replace('.',',');updateEntry();});
document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',e=>{e.preventDefault();showView(button.dataset.open);}));
$('sound').onclick=()=>{sound=!sound;$('sound').textContent='Efeitos sonoros: '+(sound?'ligados':'desligados');$('sound').setAttribute('aria-pressed',String(sound));tone(true);};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('canvasWrap').requestFullscreen();}catch{message('Tela cheia indisponível neste navegador.');}};
$('music').onclick=async()=>{
 $('music').disabled=true;
 try{if(soundtrack.enabled)soundtrack.stop();else await soundtrack.start();}
 catch(e){$('audioStatus').textContent=e.message;}
 finally{$('music').disabled=false;}
};
$('musicVolume').oninput=()=>{const value=Number($('musicVolume').value);soundtrack.setVolume(value/100);$('volumeLabel').textContent=value+'%';try{localStorage.setItem('aimrush-music-volume',String(value));}catch{}};
updateEntry();try{state=await api('state');render();if(active())showView('game');}catch(e){message('Falha de conexão: '+e.message);$('lobbyMessage').textContent='Falha de conexão. Recarregue a página para tentar novamente.';}requestAnimationFrame(draw);
