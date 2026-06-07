
(function(){
  var root=document.documentElement;
  try{ if(localStorage.getItem('jagTheme')==='light') root.setAttribute('data-theme','light'); }catch(e){}
  window.__dark = root.getAttribute('data-theme')!=='light';
  function wire(){
    var b=document.getElementById('themeToggle'); if(!b) return;
    b.addEventListener('click',function(){
      var isLight=root.getAttribute('data-theme')==='light';
      if(isLight){ root.removeAttribute('data-theme'); window.__dark=true; }
      else { root.setAttribute('data-theme','light'); window.__dark=false; }
      try{ localStorage.setItem('jagTheme', window.__dark?'dark':'light'); }catch(e){}
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire); else wire();
})();

/* ══════════════════════════════════════════════════════════════
   CANVAS — chrome 3D objects (drift + mouse parallax) + minimal sparks
   The chrome objects are drawn as metallic shapes with radial
   gradients to fake the silver/chrome look from the reference.
══════════════════════════════════════════════════════════════ */
(function(){
  const cvs = document.getElementById('bg-canvas');
  let gl = null;
  try{ gl = cvs.getContext('webgl',{antialias:false,alpha:false,depth:false}) || cvs.getContext('experimental-webgl'); }catch(e){}
  if(!gl){
    const ctx=cvs.getContext('2d');
    function fb(){ cvs.width=innerWidth; cvs.height=innerHeight; ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,cvs.width,cvs.height); }
    fb(); addEventListener('resize',fb); return;
  }
  const M={x:.5,y:.5}, S={x:.5,y:.5};
  addEventListener('mousemove',e=>{ M.x=e.clientX/innerWidth; M.y=e.clientY/innerHeight; });

  const VS='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS=`precision highp float;
  uniform vec2 R;uniform float T;uniform vec2 MO;uniform float uDark;
  float hash(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float smin(float a,float b,float k){float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0);return mix(b,a,h)-k*h*(1.0-h);}
  float map(vec3 p){
    float t=T*0.16;
    float d=1e5;
    for(int i=0;i<5;i++){float fi=float(i);
      vec3 c=vec3(sin(t*0.9+fi*1.7)*1.05,cos(t*0.7+fi*2.3)*0.65,sin(t*0.6+fi*1.1)*0.7);
      float r=0.55+0.10*sin(t+fi*1.3);
      d=smin(d,length(p-c)-r,0.62);}
    return d;}
  vec3 calcN(vec3 p){vec2 e=vec2(0.0025,0.0);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}
  vec3 env(vec3 rd){
    float y=rd.y*0.5+0.5;
    vec3 silver=mix(vec3(0.03),vec3(0.66),pow(y,1.4));
    vec3 graphite=mix(vec3(0.015),vec3(0.30),pow(y,1.4));
    vec3 base=mix(graphite,silver,uDark);
    vec3 L1=normalize(vec3(-0.45,0.7,0.5));float s1=pow(max(dot(rd,L1),0.0),10.0);
    base+=vec3(0.85)*s1*1.1;
    vec3 L2=normalize(vec3(0.6,0.35,-0.6));float s2=pow(max(dot(rd,L2),0.0),26.0);
    base+=vec3(1.0)*s2*1.2;
    base+=vec3(0.34)*pow(1.0-abs(rd.y),6.0)*0.5;
    return base;}
  void main(){
    vec2 uv=(gl_FragCoord.xy*2.0-R.xy)/R.y;
    vec3 bgD=mix(vec3(0.039),vec3(0.022),clamp(length(uv)*0.5,0.0,1.0));
    vec3 bg=mix(vec3(0.902,0.941,0.039),bgD,uDark);
    vec2 mo=MO-0.5;
    vec3 ro=vec3(mo.x*0.35,-mo.y*0.22,4.3);
    vec3 rd=normalize(vec3(uv,-1.4));
    float t=0.0;vec3 p;bool hit=false;
    for(int i=0;i<88;i++){p=ro+rd*t;float d=map(p);if(d<0.0015){hit=true;break;}if(t>9.0)break;t+=d*0.85;}
    vec3 col=bg;
    if(hit){
      vec3 n=calcN(p);vec3 r=reflect(rd,n);vec3 refl=env(r);
      float fres=pow(1.0-max(dot(n,-rd),0.0),3.0);
      col=refl;
      col=mix(col,mix(vec3(0.10),vec3(0.95),uDark),fres*0.55);
      col*=mix(0.5,0.78,uDark);
    }
    float g=noise(vec3(gl_FragCoord.xy*2.4,T*30.0));
    col+=(g-0.5)*0.05;
    col*=1.0-clamp(length(uv)*0.12,0.0,0.55)*uDark;
    gl_FragColor=vec4(max(col,0.0),1.0);}`;

  function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s;}
  const prog=gl.createProgram();
  gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));
  gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));
  gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){ return; }
  gl.useProgram(prog);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const uR=gl.getUniformLocation(prog,'R'),uT=gl.getUniformLocation(prog,'T'),uMO=gl.getUniformLocation(prog,'MO'),uDk=gl.getUniformLocation(prog,'uDark');
  const SCALE=0.75;
  function resize(){const w=Math.max(2,Math.floor(innerWidth*SCALE)),h=Math.max(2,Math.floor(innerHeight*SCALE));cvs.width=w;cvs.height=h;gl.viewport(0,0,w,h);}
  resize();addEventListener('resize',resize);
  const start=performance.now();
  function frame(now){
    S.x+=(M.x-S.x)*0.03;S.y+=(M.y-S.y)*0.03;
    gl.uniform2f(uR,cvs.width,cvs.height);
    gl.uniform1f(uT,(now-start)/1000.0);
    gl.uniform2f(uMO,S.x,1.0-S.y);gl.uniform1f(uDk,(window.__dark===false)?0.0:1.0);
    gl.drawArrays(gl.TRIANGLES,0,3);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* ══════════════════════════════════════════════════════════════
   CLICK PULSE
══════════════════════════════════════════════════════════════ */
document.querySelectorAll('.pulse-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.body.classList.remove('pulse-flash');
    void document.body.offsetWidth;
    document.body.classList.add('pulse-flash');
    setTimeout(()=>document.body.classList.remove('pulse-flash'),600);
  });
});

/* ══════════════════════════════════════════════════════════════
   CURSOR
══════════════════════════════════════════════════════════════ */
const cur=document.getElementById('cur'),ring=document.getElementById('cur-ring');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;cur.style.left=mx+'px';cur.style.top=my+'px';});
(function raf(){rx+=(mx-rx)*.12;ry+=(my-ry)*.12;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(raf);})();

/* ══════════════════════════════════════════════════════════════
   NAV
══════════════════════════════════════════════════════════════ */
const siteNav=document.getElementById('siteNav');
const links=document.querySelectorAll('#navMenu a');
const line=document.getElementById('navLine');
const menu=document.getElementById('navMenu');
function nh(){return siteNav.offsetHeight}
function moveLine(a){if(!a){line.classList.remove('show');return;}var mr=menu.getBoundingClientRect(),ar=a.getBoundingClientRect();line.style.left=(ar.left-mr.left)+'px';line.style.width=ar.width+'px';line.classList.add('show');}
function curFile(){var p=location.pathname.split('/').pop().toLowerCase();return (p===''||p==='last.html')?'index.html':p;}
function setActive(){var f=curFile();var act=null;links.forEach(function(a){var href=(a.getAttribute('href')||'').toLowerCase();var on=(href===f);a.classList.toggle('active',on);if(on)act=a;});moveLine(act);}
window.addEventListener('scroll',function(){siteNav.classList.toggle('scrolled',window.scrollY>30||curFile()!=='index.html');},{passive:true});
siteNav.classList.toggle('scrolled',window.scrollY>30||curFile()!=='index.html');
var lt;
links.forEach(function(a){
  a.addEventListener('mouseenter',function(){clearTimeout(lt);moveLine(a);});
  a.addEventListener('mouseleave',function(){lt=setTimeout(function(){moveLine(document.querySelector('#navMenu a.active'));},100);});
});
window.addEventListener('resize',setActive);
requestAnimationFrame(function(){requestAnimationFrame(setActive);});

/* ══════════════════════════════════════════════════════════════
   ALBUM 3D CAROUSEL — mouse drives active card
══════════════════════════════════════════════════════════════ */
var DASH=String.fromCharCode(8212),MID=String.fromCharCode(183),TL=String.fromCharCode(8378);
function T(a){return a.map(function(t,i){return (i<9?'0':'')+(i+1)+' '+DASH+' '+t;}).join('\n');}

function createCarousel(o){
  var activeIdx=o.start||0,flipped=-1,stageRect;
  var track=o.track,navEl=o.nav,stage=o.stage,items=o.items;
  function measure(){stageRect=stage.getBoundingClientRect();}
  function updateNav(){[].slice.call(navEl.children).forEach(function(b,i){b.classList.toggle('active-album',i===activeIdx);});}
  function position(){
    var cards=[].slice.call(track.querySelectorAll('.album-card'));
    cards.forEach(function(card,i){
      var off=i-activeIdx,abs=Math.abs(off);
      var tx=off*200,tz=-abs*110,ry=-off*20,sc=1-abs*0.10,op=Math.max(0,1-abs*0.34),z=40-abs;
      var isA=(i===activeIdx);if(flipped===i){tz=90;sc=sc*1.18;}
      card.style.transform='translateX('+tx+'px) translateZ('+tz+'px) rotateY('+(flipped===i?ry+180:ry)+'deg) scale('+sc+')';
      card.style.opacity=op;card.style.zIndex=z;
      card.style.filter=isA?'brightness(1.1) drop-shadow(0 0 24px rgba(var(--card-tint),.35))':'brightness(.55)';
      card.style.pointerEvents=abs>2?'none':'auto';
    });
  }
  function build(){
    track.innerHTML='';navEl.innerHTML='';
    items.forEach(function(it,i){
      var card=document.createElement('div');card.className='album-card';card.dataset.idx=i;
      var front=document.createElement('div');front.className='card-front';front.innerHTML=o.front(it,i);
      var back=document.createElement('div');back.className='card-back';back.innerHTML=o.back(it,i);
      card.appendChild(front);card.appendChild(back);track.appendChild(card);
      card.addEventListener('click',function(){if(i===activeIdx){flipped=(flipped===i)?-1:i;position();}});
      var cb=back.querySelector('[data-close]');
      if(cb)cb.addEventListener('click',function(e){e.stopPropagation();flipped=-1;position();});
      var dot=document.createElement('button');dot.title=it.title;dot.setAttribute('aria-label',it.title);
      dot.classList.toggle('active-album',i===activeIdx);
      dot.addEventListener('click',function(){activeIdx=i;flipped=-1;position();updateNav();if(o.onChange)o.onChange(items[activeIdx],activeIdx);});
      navEl.appendChild(dot);
    });
    position();measure();
  }
  function go(d){activeIdx=(activeIdx+d+items.length)%items.length;flipped=-1;position();updateNav();if(o.onChange)o.onChange(items[activeIdx],activeIdx);}
  function mkArrow(dir){var b=document.createElement('button');b.type='button';b.className='car-arrow '+(dir<0?'car-prev':'car-next');b.setAttribute('aria-label',dir<0?'Previous':'Next');b.innerHTML=dir<0?'<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>':'<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>';b.addEventListener('click',function(e){e.stopPropagation();go(dir);});return b;}
  window.addEventListener('resize',measure);
  build();
  stage.appendChild(mkArrow(-1));stage.appendChild(mkArrow(1));
  if(o.onChange)o.onChange(items[activeIdx],activeIdx);
}

const albums=[
{title:'Transmission I',year:'2024',sub:'Debut EP',tracks:T(['Signal Init','Static Field','Circuit Hum','Noise Gate'])},
{title:'Transmission II',year:'2024',sub:'Extended Play',tracks:T(['Frequency','Oscillate','Phase Shift','Resonance'])},
{title:'Live at Studio 7',year:'2024',sub:'Live Recording',tracks:T(['Intro (Live)','Static (Live)','Circuit (Live)'])},
{title:'Collab Vol. 1',year:'2025',sub:'Collaboration',tracks:T(['Junction A','Junction B','Crossover','Sync'])},
{title:'Nightvision',year:'2025',sub:'Single Collection',tracks:T(['Nightvision','Dark Pulse','Under Neon','Fade Out'])},
{title:'SYSTEM.EXE',year:'2025',sub:'Concept Album',tracks:T(['Boot Sequence','Execute','Memory Leak','Core Dump','Reboot'])},
{title:'Frequencies',year:'2025',sub:'Ambient Series',tracks:T(['440 Hz','528 Hz','741 Hz','963 Hz'])},
{title:'Analog Dreams',year:'2025',sub:'EP',tracks:T(['Warm Tape','Drift','Slow Burn','Aurora'])},
{title:'Circuit City',year:'2025',sub:'LP',tracks:T(['Downtown','Grid','Skyline','Traffic','Midnight'])},
{title:'Neon Static',year:'2025',sub:'Single',tracks:T(['Neon Static','Reverb'])},
{title:'Dark Pulse',year:'2026',sub:'EP',tracks:T(['Pulse I','Pulse II','Throb','Echo'])},
{title:'Overdrive',year:'2026',sub:'LP',tracks:T(['Ignition','Redline','Nitro','Burnout','Finish'])},
{title:'Signal Lost',year:'2026',sub:'Single',tracks:T(['Signal Lost','Static Return'])},
{title:'Binary Soul',year:'2026',sub:'Concept Album',tracks:T(['Zero','One','Logic Gate','Runtime'])},
{title:'Echo Chamber',year:'2026',sub:'Live',tracks:T(['Intro','Reverberate','Feedback','Outro'])},
{title:'Voltage',year:'2026',sub:'EP',tracks:T(['Spark','Current','Surge','Ground'])},
{title:'Glitch Theory',year:'2026',sub:'LP',tracks:T(['Artifact','Datamosh','Corrupt','Render','Reboot'])},
{title:'Resonance',year:'2026',sub:'Single',tracks:T(['Resonance','Harmonic'])},
{title:'Aftermath',year:'2026',sub:'EP',tracks:T(['Dust','Silence','Rebuild','Dawn'])},
{title:'Anthology',year:'2026',sub:'Best Of',tracks:T(['Greatest I','Greatest II','Greatest III','Bonus'])}
];
function albCover(i){return (i===9)?'assets/albums/10.png':'assets/albums/'+(i<9?'0':'')+(i+1)+'.svg';}
function albumFront(al,i){return `<img src="${albCover(i)}" alt="${al.title}" loading="lazy" onerror="if(this.src.indexOf('.png')>-1){this.src=this.src.replace('.png','.svg');}else{this.style.opacity=0;}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"><div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:16px;background:linear-gradient(to top,rgba(0,0,0,.8),rgba(0,0,0,.05) 55%)"><div style="font-family:'Anton',sans-serif;font-size:18px;color:#fff;text-transform:uppercase;line-height:1.05" lang="en">${al.title}</div><div style="font-family:'Space Mono',monospace;font-size:9px;color:rgba(255,255,255,.72);margin-top:3px">${al.year} ${DASH} ${al.sub}</div></div>`;}
function albumBack(al){return `<div style="font-family:'Anton',sans-serif;font-size:18px;color:var(--white);text-transform:uppercase;margin-bottom:2px" lang="en">${al.title}</div><div style="font-family:'Space Mono',monospace;font-size:9px;color:var(--muted);margin-bottom:14px">${al.year} ${DASH} ${al.sub}</div><div style="font-family:'Space Mono',monospace;font-size:10px;color:var(--off);line-height:2;white-space:pre-line;text-align:left">${al.tracks}</div><button class="btn-o pulse-btn" data-close style="font-size:8px;padding:7px 16px;margin-top:14px;cursor:none">Close</button>`;}

var SOON='Product details coming soon.';
const merch=[
{title:'JAG Tee '+DASH+' Classic',sub:'Unisex '+MID+' S-XXL',price:TL+' TBA',img:'assets/merch/tee.svg'},
{title:'JAG Hoodie '+DASH+' Heavyweight',sub:'Unisex '+MID+' S-XXL',price:TL+' TBA',img:'assets/merch/hoodie.svg'},
{title:'Tote Bag',sub:'Canvas '+MID+' Natural',price:TL+' TBA',img:'assets/merch/tote.svg'},
{title:'Vinyl Coaster',sub:'4-Piece Set',price:TL+' TBA',img:'assets/merch/coaster.svg'},
{title:'Enamel Pin',sub:'Metal '+MID+' 32mm',price:TL+' TBA',img:'assets/merch/pin.svg'},
{title:'Snapback Cap',sub:'One Size',price:TL+' TBA',img:'assets/merch/cap.svg'},
{title:'Sticker Pack',sub:'10 Pack',price:TL+' TBA',img:'assets/merch/sticker.svg'},
{title:'All Access Pass',sub:'Lanyard',price:TL+' TBA',img:'assets/merch/pass.svg'},
{title:'Beanie',sub:'One Size',price:TL+' TBA',img:'assets/merch/beanie.svg'},
{title:'Vinyl LP '+DASH+' Transmission',sub:'180g '+MID+' Black',price:TL+' TBA',img:'assets/merch/vinyl.svg'}
];
function merchFront(m){return `<div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(var(--card-tint),.16),var(--surface))"></div><img src="${m.img}" alt="${m.title}" loading="lazy" onerror="this.style.opacity=0" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:28px 28px 80px;filter:drop-shadow(0 8px 18px rgba(0,0,0,.4))"><div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:16px;background:linear-gradient(to top,rgba(0,0,0,.82),rgba(0,0,0,.05) 52%)"><div style="font-family:'Anton',sans-serif;font-size:17px;color:#fff;text-transform:uppercase;line-height:1.05" lang="en">${m.title}</div><div style="font-family:'Space Mono',monospace;font-size:9px;color:rgba(255,255,255,.72);margin-top:3px">${m.sub} - ${m.price}</div></div>`;}
function merchBack(m){return `<div style="font-family:'Anton',sans-serif;font-size:18px;color:var(--white);text-transform:uppercase;margin-bottom:6px" lang="en">${m.title}</div><div style="font-family:'Space Mono',monospace;font-size:9px;color:var(--muted);margin-bottom:12px">${m.sub}</div><div style="font-family:'Inter',sans-serif;font-size:12px;color:var(--off);line-height:1.7">${SOON}</div><div style="font-family:'Anton',sans-serif;font-size:18px;color:var(--purple);margin-top:12px">${m.price}</div><button class="btn-o pulse-btn" data-close style="font-size:8px;padding:7px 16px;margin-top:12px;cursor:none">Close</button>`;}

if(document.getElementById('albumStage'))createCarousel({stage:document.getElementById('albumStage'),track:document.getElementById('albumTrack'),nav:document.getElementById('albumNav'),items:albums,start:9,front:albumFront,back:albumBack,onChange:function(it,i){var bg=document.getElementById('albumBg');if(bg){bg.style.backgroundImage='url('+albCover(i)+')';bg.classList.add('show');}}});
if(document.getElementById('merchStage'))createCarousel({stage:document.getElementById('merchStage'),track:document.getElementById('merchTrack'),nav:document.getElementById('merchNav'),items:merch,start:5,front:merchFront,back:merchBack});

/* ══════════════════════════════════════════════════════════════
   SCROLL REVEAL
══════════════════════════════════════════════════════════════ */
document.querySelectorAll('.artists-grid .artist-card,.merch-grid .merch-card').forEach((el,i)=>{el.style.transitionDelay=(i*.08)+'s';});
const revs=document.querySelectorAll('.reveal');
const inObs=new IntersectionObserver(es=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.remove('out');requestAnimationFrame(()=>e.target.classList.add('in'));}});},{threshold:0,rootMargin:'0px 0px -55px 0px'});
const outObs=new IntersectionObserver(es=>{es.forEach(e=>{if(!e.isIntersecting&&e.boundingClientRect.top<0){e.target.classList.remove('in');e.target.classList.add('out');}});},{threshold:0,rootMargin:'-12% 0px 0px 0px'});
revs.forEach(el=>{inObs.observe(el);outObs.observe(el);});


/* ==============================================================
   LIVE RADIO PLAYER
============================================================== */
(function(){
  function initRadio(){
  var R=document.getElementById('radio'); if(!R) return;
  var audio=document.getElementById('rpAudio');
  var tab=document.getElementById('rpTab');
  var closeBtn=document.getElementById('rpClose');
  var playBtn=document.getElementById('rpPlay');
  var playIcon=document.getElementById('rpPlayIcon');
  var vol=document.getElementById('rpVol');
  var listEl=document.getElementById('rpList');
  var elGenre=document.getElementById('rpGenre');
  var elStation=document.getElementById('rpStation');
  var elStatus=document.getElementById('rpStatus');
  var DOT=String.fromCharCode(9679)+' ';
  var ICON_PLAY='M8 5v14l11-7z';
  var ICON_PAUSE='M6 5h4v14H6zM14 5h4v14h-4z';
  var EM=String.fromCharCode(8212), ELL=String.fromCharCode(8230), gG=String.fromCharCode(286), sS=String.fromCharCode(350);
  var TXT_CONN=DOT+'CONNECTING'+ELL, TXT_FAIL=DOT+'UNAVAILABLE';
  var stations=[
    {name:'Metal Detector',genre:'Hard Rock / Metal',url:'https://ice1.somafm.com/metal-128-mp3'},
    {name:'Radio Paradise '+EM+' Rock',genre:'Rock',url:'https://stream.radioparadise.com/rock-128'},
    {name:'KEXP 90.3 Seattle',genre:'Indie',url:'https://kexp.streamguys1.com/kexp128.mp3'},
    {name:'Indie Pop Rocks!',genre:'Indie Pop',url:'https://ice1.somafm.com/indiepop-128-mp3'},
    {name:'Beat Blender',genre:'Techno / Deep House',url:'https://ice1.somafm.com/beatblender-128-mp3'},
    {name:'DEF CON Radio',genre:'Techno / Electro',url:'https://ice1.somafm.com/defcon-128-mp3'},
    {name:'Groove Salad',genre:'Trip-Hop / Downtempo',url:'https://ice1.somafm.com/groovesalad-128-mp3'},
    {name:'Secret Agent',genre:'Trip-Hop / Lounge',url:'https://ice1.somafm.com/secretagent-128-mp3'},
    {name:'FIP Jazz',genre:'Jazz',url:'https://icecast.radiofrance.fr/fipjazz-midfi.mp3'},
    {name:'Sonic Universe',genre:'Jazz / Avant',url:'https://ice1.somafm.com/sonicuniverse-128-mp3'},
    {name:'FIP Rock',genre:'Rock / Eclectic',url:'https://icecast.radiofrance.fr/fiprock-midfi.mp3'}
  ];
  var idx=0;
  function buildList(){ listEl.innerHTML=''; stations.forEach(function(s,i){
    var item=document.createElement('div'); item.className='rp-station-item';
    var num=(i+1<10?'0':'')+(i+1);
    item.innerHTML='<div class="rp-si-idx">'+num+'</div><div class="rp-si-body"><div class="rp-si-name">'+s.name+'</div><div class="rp-si-genre">'+s.genre+'</div></div><div class="rp-si-bars"><span></span><span></span><span></span></div>';
    item.addEventListener('click',function(){ select(i,true); });
    listEl.appendChild(item); s.el=item;
  }); }
  buildList();
  (function(){
    var defs=[['Techno','techno'],['Metal','metal'],['Rock','rock'],['Indie','indie'],['Trip-Hop','trip-hop'],['Jazz','jazz']];
    var base='https://de1.api.radio-browser.info/json/stations/bytagexact/';
    var acc=[],done=0;
    defs.forEach(function(g){
      fetch(base+encodeURIComponent(g[1])+'?limit=4&order=clickcount&reverse=true&hidebroken=true').then(function(r){return r.json();}).then(function(arr){
        (arr||[]).forEach(function(st){ if(st&&st.url_resolved){ acc.push({name:(st.name||'').replace(/\s+/g,' ').trim().slice(0,42),genre:g[0],url:st.url_resolved}); } });
      }).catch(function(){}).then(function(){ done++; if(done===defs.length && acc.length>=6){ stations=acc; idx=0; buildList(); select(0,false); } });
    });
  })();
  function setActive(){ stations.forEach(function(s,i){ s.el.classList.toggle('active',i===idx); }); }
  function clearPlaying(){ stations.forEach(function(s){ s.el.classList.remove('playing'); }); }
  function select(i,autoplay){
    idx=i; var s=stations[i];
    elGenre.textContent=s.genre.toUpperCase();
    elStation.textContent=s.name;
    setActive();
    audio.src=s.url;
    if(autoplay) play();
  }
  function play(){
    elStatus.textContent=TXT_CONN;
    var pr=audio.play();
    if(pr&&pr.catch) pr.catch(function(){ elStatus.textContent=TXT_FAIL; });
  }
  function stop(){ audio.pause(); }
  playBtn.addEventListener('click',function(){
    if(!audio.src){ select(idx,true); }
    else if(audio.paused){ play(); }
    else { stop(); }
  });
  vol.addEventListener('input',function(){ audio.volume=vol.value/100; });
  audio.volume=vol.value/100;
  audio.addEventListener('playing',function(){
    elStatus.textContent=DOT+'LIVE';
    playIcon.setAttribute('d',ICON_PAUSE);
    R.classList.add('playing');
    clearPlaying(); if(stations[idx].el) stations[idx].el.classList.add('playing');
  });
  audio.addEventListener('pause',function(){
    elStatus.textContent=DOT+'PAUSED';
    playIcon.setAttribute('d',ICON_PLAY);
    R.classList.remove('playing'); clearPlaying();
  });
  audio.addEventListener('waiting',function(){ elStatus.textContent=TXT_CONN; });
  audio.addEventListener('error',function(){ elStatus.textContent=TXT_FAIL; R.classList.remove('playing'); clearPlaying(); });
  tab.addEventListener('click',function(){ R.classList.toggle('open'); });
  closeBtn.addEventListener('click',function(e){ e.stopPropagation(); R.classList.remove('open'); });
  setActive();
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initRadio);}else{initRadio();}
})();

;(function(){var c=document.getElementById('footerLogo');if(!c)return;var src=document.querySelector('.nav-logo .jag-logo-svg');if(src){var s=src.cloneNode(true);s.removeAttribute('width');s.removeAttribute('height');c.appendChild(s);}})();
;(function(){var f=document.getElementById('contactForm');if(!f)return;f.addEventListener('submit',function(e){e.preventDefault();function v(id){var el=document.getElementById(id);return el?el.value.trim():'';}var n=v('cfName'),em=v('cfEmail'),s=v('cfSubject')||'Mesaj',m=v('cfMsg');var nl=String.fromCharCode(10);var body='Ad: '+n+nl+'E-posta: '+em+nl+nl+m;location.href='mailto:info@jagrecords.com?subject='+encodeURIComponent('[JAG] '+s)+'&body='+encodeURIComponent(body);});})();
/* ===== LIVE NEWS (Vercel api/news -> fallback proxy; home grid + full page) ===== */
(function(){
  var grid=document.getElementById('newsGrid'); var full=document.getElementById('newsFull');
  var target=full||grid; if(!target) return; var rich=!!full; var shown=false;
  function esc(s){var d=document.createElement('div');d.textContent=s||'';return d.innerHTML;}
  function card(n){
    var a=document.createElement('a');a.className='news-card'+(rich?' news-card-rich':'');a.href=n.link||'#';a.target='_blank';a.rel='noopener';
    var dt=n.date?new Date(n.date):null;var d=(dt&&!isNaN(dt.getTime()))?dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'';
    var html='';
    if(rich&&n.image){ html+='<div class="news-thumb" style="background-image:url('+JSON.stringify(n.image)+')"></div>'; }
    html+='<div class="news-body"><div class="news-src">'+esc(n.src)+(d?' &#183; '+d:'')+'</div><div class="news-title">'+esc(n.title)+'</div>';
    if(rich&&n.excerpt){ html+='<div class="news-excerpt">'+esc(n.excerpt)+'</div>'; }
    html+='</div>'; a.innerHTML=html; return a;
  }
  function paint(items){
    if(shown) return; shown=true;
    if(!items||!items.length){ target.innerHTML='<div class="news-loading">Could not load news right now &#8212; please try again later.</div>'; return; }
    target.innerHTML=''; items.slice(0,rich?18:9).forEach(function(n){ target.appendChild(card(n)); });
  }
  fetch('/api/news').then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(j){ paint(j.items); }).catch(function(){ fallback(); });
  function fallback(){
    var feeds=[['Loudwire','https://loudwire.com/feed/'],['NME','https://www.nme.com/news/music/feed'],['Stereogum','https://www.stereogum.com/feed/'],['Metal Injection','https://metalinjection.net/feed/'],['Consequence','https://consequence.net/feed/']];
    var prox='https://api.allorigins.win/raw?url=',items=[],done=0;
    feeds.forEach(function(f){
      fetch(prox+encodeURIComponent(f[1])).then(function(r){return r.text();}).then(function(xml){
        var doc=new DOMParser().parseFromString(xml,'text/xml');var its=doc.querySelectorAll('item');
        for(var i=0;i<its.length&&i<4;i++){var it=its[i];var t=(it.querySelector('title')||{}).textContent||'';if(t)items.push({title:t,link:(it.querySelector('link')||{}).textContent||'#',date:(it.querySelector('pubDate')||{}).textContent||'',src:f[0],excerpt:'',image:''});}
      }).catch(function(){}).then(function(){done++;if(done>=feeds.length){items.sort(function(a,b){return new Date(b.date)-new Date(a.date);});paint(items);}});
    });
    setTimeout(function(){ if(!shown) paint(items); },9000);
  }
})();
/* ===== EVENTS (data-driven via assets/events.json) ===== */
(function(){
  var el=document.getElementById('eventsList'); if(!el) return;
  function esc(s){var d=document.createElement('div');d.textContent=s||'';return d.innerHTML;}
  fetch('assets/events.json').then(function(r){return r.json();}).then(function(evs){
    if(!evs||!evs.length){ el.innerHTML='<div class="news-loading">No upcoming events.</div>'; return; }
    el.innerHTML='';
    evs.forEach(function(e){
      var p=(e.date||'').split(' '); var dm=((p[0]||'')+' '+(p[1]||'')).trim();
      var row=document.createElement('div'); row.className='event-row';
      row.innerHTML='<div class="event-date">'+esc(dm)+'</div><div class="event-main"><div class="event-artist" lang="en">'+esc(e.artist)+'</div><div class="event-venue">'+esc(e.venue)+' &#183; '+esc(e.city)+'</div></div><a href="'+esc(e.tickets||'#')+'" class="event-cta">Tickets</a>';
      el.appendChild(row);
    });
  }).catch(function(){ el.innerHTML='<div class="news-loading">No upcoming events.</div>'; });
})();