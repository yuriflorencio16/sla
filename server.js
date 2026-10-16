// JavaScript / server.js / Node.js 24+ / AimRush local demo server
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {RULES,createGame,advance,shoot,result} from './game.js';
const root=fileURLToPath(new URL('.',import.meta.url)),dataDir=process.env.DATA_DIR||root+'data';mkdirSync(dataDir,{recursive:true});
const db=new DatabaseSync(dataDir+'/aim.sqlite');
db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY,balance INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS rounds(id TEXT PRIMARY KEY,player TEXT NOT NULL,state TEXT NOT NULL,started INTEGER NOT NULL,status TEXT NOT NULL,paid INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS ledger(id INTEGER PRIMARY KEY,player TEXT NOT NULL,amount INTEGER NOT NULL,label TEXT NOT NULL,created INTEGER NOT NULL);`);
const run=(sql,...args)=>db.prepare(sql).run(...args),get=(sql,...args)=>db.prepare(sql).get(...args);
function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const v=fn();db.exec('COMMIT');return v;}catch(e){db.exec('ROLLBACK');throw e;}}
function entry(player,amount,label){run('UPDATE players SET balance=balance+? WHERE id=?',amount,player);run('INSERT INTO ledger(player,amount,label,created) VALUES(?,?,?,?)',player,amount,label,Date.now());}
function settle(row){if(row.status!=='active')return row;const g=JSON.parse(row.state);advance(g,RULES.duration);const paid=result(g).payout;entry(row.player,paid,`Round settled · ${g.hits}/${RULES.count} hits`);run("UPDATE rounds SET status='finished',paid=?,state=? WHERE id=?",paid,JSON.stringify(g),row.id);return {...row,state:JSON.stringify(g),status:'finished',paid};}
function view(row){if(!row)return null;const g=JSON.parse(row.state);return {id:row.id,...g,started:row.started,deadline:row.started+RULES.duration,status:row.status,paid:row.paid,result:result(g)};}
const files={'/':['public/index.html','text/html'],'/app.js':['public/app.js','text/javascript'],'/style.css':['public/style.css','text/css'],'/game.js':['game.js','text/javascript'],'/format.js':['public/format.js','text/javascript'],'/music.js':['public/music.js','text/javascript']};
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(req.method==='GET'&&files[path]){const [file,type]=files[path];res.writeHead(200,{'Content-Type':type});return res.end(readFileSync(root+file));}
 if(!path.startsWith('/api/'))return send(404,{error:'Não encontrado'});
 if(req.method!=='GET'&&req.headers['sec-fetch-site']==='cross-site')return send(403,{error:'Solicitação externa rejeitada'});
 let id=req.headers.cookie?.match(/(?:^|;\s*)aimplayer=([a-f0-9]{64})(?:;|$)/)?.[1];
 if(!id||!get('SELECT id FROM players WHERE id=?',id)){id=randomBytes(32).toString('hex');transaction(()=>{run('INSERT INTO players VALUES(?,0)',id);entry(id,1000,'Welcome demo credits');});res.setHeader('Set-Cookie',`aimplayer=${id}; HttpOnly; SameSite=Strict; Path=/`);}
 let body={};if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096)return send(413,{error:'Solicitação muito grande'});}try{body=JSON.parse(raw||'{}');}catch{return send(400,{error:'JSON inválido'});}}
 const output=transaction(()=>{
 let event=null,row=get("SELECT * FROM rounds WHERE player=? AND status='active' ORDER BY started DESC LIMIT 1",id);
 if(row){if(Date.now()>=row.started+RULES.duration)row=settle(row);else{const g=JSON.parse(row.state);advance(g,Date.now()-row.started);row={...row,state:JSON.stringify(g)};run('UPDATE rounds SET state=? WHERE id=?',row.state,row.id);}}
 if(req.method==='POST'&&path==='/api/start'){
 if(row?.status==='active')throw Error('Encerre a partida atual antes de começar outra.');
 const amount=body.entry===undefined?RULES.entry:body.entry;const game=createGame(randomBytes(4).readUInt32LE(),amount);
 if(get('SELECT balance FROM players WHERE id=?',id).balance<amount)throw Error('Saldo virtual insuficiente. Use a recarga gratuita.');
 const gid=randomUUID();entry(id,-amount,'Round entry · refundable stake');run('INSERT INTO rounds(id,player,state,started,status) VALUES(?,?,?,?,?)',gid,id,JSON.stringify(game),Date.now(),'active');row=get('SELECT * FROM rounds WHERE id=?',gid);
 }else if(req.method==='POST'&&path==='/api/shot'){
 if(!row||row.status!=='active'||body.id!==row.id)throw Error('Esta partida já terminou.');
 const g=JSON.parse(row.state);event=shoot(g,Date.now()-row.started,body.target,body.x,body.y);run('UPDATE rounds SET state=? WHERE id=?',JSON.stringify(g),row.id);row={...row,state:JSON.stringify(g)};
 }else if(req.method==='POST'&&path==='/api/finish'){
 if(row?.status==='active'&&body.id===row.id)row=settle(row);
 }else if(req.method==='POST'&&path==='/api/refill'){
 const balance=get('SELECT balance FROM players WHERE id=?',id).balance;if(balance>=10000)throw Error('Você já tem pelo menos R$ 100,00 de saldo virtual.');entry(id,10000-balance,'Free demo refill');
 }else if(!(req.method==='GET'&&path==='/api/state'))throw Error('Operação desconhecida.');
 if(!row)row=get('SELECT * FROM rounds WHERE player=? ORDER BY started DESC LIMIT 1',id);
 const leaders=db.prepare("SELECT player,MAX(json_extract(state,'$.hits')) AS hits FROM rounds WHERE status='finished' GROUP BY player ORDER BY hits DESC,player LIMIT 10").all().map((p,i)=>({rank:i+1,name:'Player '+p.player.slice(0,6).toUpperCase(),hits:p.hits,you:p.player===id}));
 return {balance:get('SELECT balance FROM players WHERE id=?',id).balance,serverTime:Date.now(),game:view(row),event,leaders,ledger:db.prepare('SELECT amount,label,created FROM ledger WHERE player=? ORDER BY id DESC LIMIT 10').all(id)};
 });send(200,output);
 }catch(e){send(400,{error:e.message});}
});
server.listen(Number(process.env.PORT||3100),process.env.HOST||'127.0.0.1',()=>console.log(`AimRush running on port ${process.env.PORT||3100}`));
