// JavaScript / game.js / Node.js 24+ and browser / AimRush demo rules
export const RULES=Object.freeze({duration:30000,count:30,interval:1000,lifetime:950,entry:100,hit:6,miss:4,error:2,width:1000,height:600});
export function createGame(seed){let rng=seed>>>0;const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};return {targets:Array.from({length:RULES.count},(_,id)=>({id,x:70+random()*860,y:65+random()*470,r:25+random()*9,at:id*RULES.interval})),resolved:[],errors:[],hits:0,misses:0,streak:0,bestStreak:0,reward:0,penalty:0,reactionTotal:0};}
export function advance(g,elapsed){for(const t of g.targets)if(!g.resolved.includes(t.id)&&elapsed>=t.at+RULES.lifetime){g.resolved.push(t.id);g.misses++;g.streak=0;g.penalty+=RULES.miss;}return g;}
export function shoot(g,elapsed,id,x,y){
 if(!Number.isInteger(id)||id<0||id>=RULES.count||!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>RULES.width||y<0||y>RULES.height)throw Error('Invalid shot.');
 const t=g.targets[id];if(elapsed<t.at||elapsed>=t.at+RULES.lifetime||g.resolved.includes(id))throw Error('Target is no longer available.');
 const hit=(x-t.x)**2+(y-t.y)**2<=t.r**2;
 if(hit){g.resolved.push(id);g.hits++;g.streak++;g.bestStreak=Math.max(g.bestStreak,g.streak);const bonus=Math.min(10,Math.floor(g.streak/5)*2);g.reward+=RULES.hit+bonus;g.reactionTotal+=elapsed-t.at;return {hit:true,credits:RULES.hit+bonus,streak:g.streak};}
 if(g.errors.includes(id))throw Error('Only one miss penalty per target.');g.errors.push(id);g.penalty+=RULES.error;g.streak=0;return {hit:false,credits:-RULES.error,streak:0};
}
export function result(g){return {payout:Math.max(0,RULES.entry+g.reward-g.penalty),net:Math.max(-RULES.entry,g.reward-g.penalty),accuracy:g.hits+g.errors.length?Math.round(g.hits/(g.hits+g.errors.length)*100):0,coverage:Math.round(g.hits/RULES.count*100),reaction:g.hits?Math.round(g.reactionTotal/g.hits):0};}
