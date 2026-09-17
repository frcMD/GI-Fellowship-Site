const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const script = fs.readFileSync(require('node:path').join(__dirname, '..', 'hero-video.js'),'utf8');
function scenario({reduced=false,saveData=false,type='4g',downlink=10,mobile=false,connectionAvailable=true,playResult=()=>Promise.resolve()}={}) {
  class E {
    constructor(){this.events={};this.attributes={}}
    addEventListener(t,f){(this.events[t]??=[]).push(f)}
    emit(t,detail={}){for(const f of this.events[t]||[])f({type:t,...detail})}
    setAttribute(k,v){this.attributes[k]=v}
  }
  const classes=new Set();
  const video=Object.assign(new E(),{
    src:'',currentTime:0,readyState:0,paused:true,
    dataset:{desktopSrc:'assets/hero-drone-720.mp4',mobileSrc:'assets/hero-drone-360.mp4'},
    classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v)},
    playCalls:0,pauseCalls:0,loadCalls:0,
    play(){this.playCalls++;this.paused=false;return playResult()},
    pause(){this.pauseCalls++;this.paused=true},
    load(){this.loadCalls++;this.currentTime=0;this.readyState=0},
    removeAttribute(k){if(k==='src')this.src=''}
  });
  const control=Object.assign(new E(),{hidden:true,textContent:''});
  const hero={};const motion=Object.assign(new E(),{matches:reduced});
  const connection=Object.assign(new E(),{saveData,effectiveType:type,downlink});
  let intersection;
  const document=Object.assign(new E(),{hidden:false,readyState:'complete',querySelector:s=>({'.hero':hero,'.hero-video':video,'.hero-video-toggle':control})[s]});
  const window=Object.assign(new E(),{matchMedia:q=>q.includes('reduced-motion')?motion:{matches:mobile},IntersectionObserver:class{constructor(f){intersection=f}observe(){}}});
  const timers=new Map();let id=0,now=0;
  vm.runInNewContext(script,{document,window,navigator:{connection:connectionAvailable?connection:undefined},IntersectionObserver:window.IntersectionObserver,setTimeout:(f,delay)=>{timers.set(++id,{f,at:now+delay});return id},clearTimeout:n=>timers.delete(n)});
  const tick=ms=>{const end=now+ms;while(true){const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].f()}now=end};
  return {video,control,document,motion,connection,classes,timers,tick,
    playing(){video.readyState=4;video.paused=false;video.emit('playing')},
    waiting(){video.readyState=2;video.emit('waiting')},
    intersect:v=>intersection([{isIntersecting:v}])};
}

test('a stalled download does not remove video that can continue playing',()=>{
  const s=scenario();s.playing();s.video.emit('stalled');s.tick(1600);
  assert.ok(s.video.src);assert.ok(s.classes.has('is-playing'));assert.equal(s.video.loadCalls,0);
});
test('brief buffering holds the current frame and recovers',()=>{
  const s=scenario();s.playing();s.video.currentTime=20;s.waiting();s.tick(3000);
  assert.ok(s.video.src);assert.ok(s.classes.has('is-playing'));
  s.playing();s.tick(20000);assert.ok(s.classes.has('is-playing'));assert.equal(s.video.currentTime,20);
});
test('sustained buffering fades to photo without discarding source and recovers',()=>{
  const s=scenario();s.playing();s.video.currentTime=20;s.waiting();s.tick(10000);
  assert.equal(s.classes.has('is-playing'),false);assert.ok(s.video.src);assert.equal(s.video.loadCalls,0);
  s.video.currentTime=20.5;s.playing();assert.ok(s.classes.has('is-playing'));assert.equal(s.control.hidden,false);
});
test('playback progress cancels stale waiting timers, including across loop boundary',()=>{
  for(const nextTime of [21,0.1]){
    const s=scenario();s.playing();s.video.currentTime=53.9;s.waiting();s.tick(3000);
    s.video.currentTime=nextTime;s.video.emit('timeupdate');s.tick(12000);
    assert.ok(s.classes.has('is-playing'));assert.ok(s.video.src);
  }
});
test('fatal failure retains the frame until its fade has finished',()=>{
  const s=scenario();s.playing();s.video.emit('error');
  assert.equal(s.classes.has('is-playing'),false);assert.ok(s.video.src);assert.equal(s.video.loadCalls,0);
  s.tick(799);assert.ok(s.video.src);s.tick(101);assert.equal(s.video.src,'');assert.equal(s.video.loadCalls,1);
});
test('a fluctuating bandwidth estimate does not interrupt established playback',()=>{
  const s=scenario();s.playing();s.connection.effectiveType='3g';s.connection.downlink=0.9;s.connection.emit('change');s.tick(20000);
  assert.ok(s.classes.has('is-playing'));assert.ok(s.video.src);
});
test('normal connection starts muted and reveals video only on playback',()=>{
  const s=scenario();assert.equal(s.video.src,'assets/hero-drone-720.mp4');assert.equal(s.video.muted,true);
  assert.equal(s.control.hidden,true);assert.equal(s.classes.has('is-playing'),false);
  s.playing();assert.equal(s.control.hidden,false);assert.ok(s.classes.has('is-playing'));assert.equal(s.timers.size,0);
});
test('mobile and moderate connections choose compact video',()=>{
  for(const opts of [{mobile:true},{downlink:2}])assert.equal(scenario(opts).video.src,'assets/hero-drone-360.mp4');
});
test('reduced motion, data saving and slow connections never request video',()=>{
  for(const opts of [{reduced:true},{saveData:true},{type:'3g'},{type:'2g'},{type:'slow-2g'},{downlink:0.8}]){
    const s=scenario(opts);assert.equal(s.video.src,'');assert.equal(s.video.playCalls,0);
  }
});
test('startup has a longer but bounded deadline, including without connection API',()=>{
  for(const opts of [{},{connectionAvailable:false}]){
    const s=scenario(opts);s.tick(5000);assert.ok(s.video.src);s.tick(7000);assert.equal(s.video.src,'');assert.equal(s.control.hidden,true);
  }
});
test('manual pause and offscreen/hidden tabs preserve the frame and cancel waiting',()=>{
  const s=scenario();s.playing();s.waiting();s.control.emit('click');s.tick(20000);
  assert.ok(s.video.src);assert.ok(s.classes.has('is-playing'));assert.equal(s.control.attributes['aria-label'],'Play background video');
  const plays=s.video.playCalls;s.document.hidden=true;s.document.emit('visibilitychange');s.document.hidden=false;s.document.emit('visibilitychange');
  assert.equal(s.video.playCalls,plays);s.control.emit('click');assert.equal(s.video.playCalls,plays+1);
  s.playing();s.waiting();s.intersect(false);s.tick(20000);assert.ok(s.video.src);
  s.intersect(true);assert.equal(s.video.paused,false);
});
test('explicit saving and motion preferences still disable playback',()=>{
  for(const pref of ['motion','connection']){
    const s=scenario();s.playing();if(pref==='motion')s.motion.matches=true;else s.connection.saveData=true;
    s[pref].emit('change');s.tick(1000);assert.equal(s.video.src,'');assert.equal(s.control.hidden,true);
  }
});
test('a stale play rejection after rapid leave/return does not disable the new request',async()=>{
  let rejectFirst;let calls=0;
  const s=scenario({playResult:()=>++calls===1?new Promise((_,reject)=>{rejectFirst=reject}):Promise.resolve()});
  s.intersect(false);s.intersect(true);s.playing();rejectFirst(Object.assign(new Error('Interrupted'),{name:'AbortError'}));
  await Promise.resolve();await Promise.resolve();assert.ok(s.video.src);assert.ok(s.classes.has('is-playing'));
});
test('autoplay denial stays on the photo without an unhandled rejection',async()=>{
  const s=scenario({playResult:()=>Promise.reject(Object.assign(new Error('Blocked'),{name:'NotAllowedError'}))});
  await Promise.resolve();await Promise.resolve();assert.equal(s.video.src,'');assert.equal(s.control.hidden,true);
});
