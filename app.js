(function(){
'use strict';
/* ================= utils ================= */
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function hash(s){var h=2166136261;s=String(s);for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function uid(){return Math.random().toString(36).slice(2,9)}
function clean(s){return String(s==null?'':s).replace(/\s+/g,' ').trim()}
function cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1):s}
function normKey(s){var k=s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[^\p{L}\p{N}\s]/gu,'').replace(/\s+/g,' ').trim();k=k.replace(/^(a|an|the|my|his)\s+/,'');if(k.length>4&&/[^s]s$/.test(k))k=k.slice(0,-1);return k||s.toLowerCase()}
function lum(hex){var m=/^#?([0-9a-f]{6})$/i.exec(hex||'');if(!m)return 0;var n=parseInt(m[1],16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;return(0.2126*r+0.7152*g+0.0722*b)/255}
function onColor(hex){return lum(hex)>0.55?'#0B0B14':'#FFFFFF'}
function debounce(fn,ms){var t;return function(){var a=arguments;clearTimeout(t);t=setTimeout(function(){fn.apply(null,a)},ms)}}
function blobUrl(id){var B=window.RT_BACKEND;return B&&B.photoUrl?B.photoUrl(id):'/_blob/'+id}
function safeId(s){return String(s).replace(/[^A-Za-z0-9_\-.~:@+]/g,'_')}
var toastT;
function toast(m){var t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){t.hidden=true},3200)}
var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms)})};

/* ================= constants ================= */
var FONT_PAIRS={
  stage:{name:'Stage: Bricolage + DM Sans',d:'Bricolage Grotesque',dw:800,dq:'Bricolage+Grotesque:wght@700;800',b:'DM Sans',bq:'DM+Sans:wght@400;500;700'},
  gala:{name:'Gala: Playfair + Lato',d:'Playfair Display',dw:800,dq:'Playfair+Display:wght@700;800',b:'Lato',bq:'Lato:wght@400;700'},
  poster:{name:'Poster: Archivo Black + Archivo',d:'Archivo Black',dw:400,dq:'Archivo+Black',b:'Archivo',bq:'Archivo:wght@400;500;700'},
  arcade:{name:'Arcade: Bungee + Nunito',d:'Bungee',dw:400,dq:'Bungee',b:'Nunito',bq:'Nunito:wght@400;600;700'},
  friendly:{name:'Friendly: Baloo 2 + Nunito',d:'Baloo 2',dw:800,dq:'Baloo+2:wght@700;800',b:'Nunito',bq:'Nunito:wght@400;600;700'},
  edgy:{name:'Edgy: Syne + Manrope',d:'Syne',dw:800,dq:'Syne:wght@700;800',b:'Manrope',bq:'Manrope:wght@400;500;700'}
};
var PRESETS={
  stage:{name:'Stage Night',bg:'#0E0F1F',surface:'#1A1C33',line:'#2C2F55',text:'#F5F4FF',muted:'#A8ABD0',a1:'#FF5C7A',a2:'#FFC947',a3:'#35E0C0',font:'stage',pattern:'rings'},
  daylight:{name:'Daylight',bg:'#F3F5FB',surface:'#FFFFFF',line:'#D5DAEC',text:'#14162B',muted:'#555B7E',a1:'#D81B60',a2:'#2455F5',a3:'#00897B',font:'friendly',pattern:'dots'},
  neon:{name:'Neon Arcade',bg:'#07060F',surface:'#120F24',line:'#2D2552',text:'#F2EEFF',muted:'#A59BD1',a1:'#FF2E93',a2:'#00E5FF',a3:'#C6FF3D',font:'arcade',pattern:'grid'},
  bollywood:{name:'Bollywood Night',bg:'#2A0A12',surface:'#3F1220',line:'#6B2336',text:'#FFF1DC',muted:'#E2B9A0',a1:'#FF8A00',a2:'#FFD23F',a3:'#FF4D6D',font:'gala',pattern:'dots'},
  emerald:{name:'Emerald Gala',bg:'#06231D',surface:'#0C3329',line:'#1D5A49',text:'#EAFBF4',muted:'#9ED0BE',a1:'#F4B942',a2:'#5EEAD4',a3:'#FF7A59',font:'gala',pattern:'rings'},
  mono:{name:'Black Tie',bg:'#0A0A0A',surface:'#161616',line:'#333333',text:'#FAFAFA',muted:'#A3A3A3',a1:'#FFFFFF',a2:'#D4D4D4',a3:'#8A8A8A',font:'poster',pattern:'none'}
};
var DEFAULT_CFG={title:'Roast & Toast',tagline:'[Name] turns 50. Tonight, you get to tell him exactly what you think.',finale:"Glasses up. Here's to [Name] at 50.",baseUrl:'',spotlightSecs:6,theme:{preset:'stage',radius:18,align:'left',scale:1}};
var KINDS=[['text','Short text answer'],['choice','Multiple choice (text)'],['photochoice','Multiple choice (photos)']];
var DISPLAYS={text:[['cloud','Animated word cloud'],['wall','Caption wall'],['spotlight','Spotlight, one at a time'],['bars','Bars (top answers)']],choice:[['bars','Bars']],photochoice:[['photos','Photo tiles'],['bars','Bars']]};
var SAMPLE_SHORT=['Legend','Dad jokes','Always late','Heart of gold','Stubborn','Loyal','Snack lord','Chaos','Big hugs','Nap champion','Golden retriever','Bear','Sloth'];
var SAMPLE_SHORT_W=[9,7,5,5,4,4,3,3,2,2,2,1,1];
var SAMPLE_LONG=['May contain dad jokes. Cannot be removed.','Will explain it again, slower, even if you were right.','Keep away from karaoke machines.','Handle with hugs. He will insist.','Do not feed after midnight. Or before.','Not responsible for unsolicited advice.','Naps are non-negotiable after 2 pm.','Warning: tells the long version.','Always right. Ask him.'];
function loadedFontLink(id,q1,q2){if(document.getElementById('font-'+id))return;var l=document.createElement('link');l.id='font-'+id;l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family='+q1+'&family='+q2+'&display=swap';document.head.appendChild(l)}

/* ================= store ================= */
var DB=null,ASSETS=null,B=null;
var S={config:null,state:{qid:null,phase:'lobby',locked:false},qs:[],guests:[],answers:[],mod:{hidden:[],featured:null},gid:null,canEdit:false,route:'home',loaded:{cfg:false,state:false,qs:false}};
var subs={answers:null,mod:null};
var view=null;
function curQ(){return S.qs.find(function(q){return q.id===S.state.qid})||null}
function qIndex(){return S.qs.findIndex(function(q){return q.id===S.state.qid})}
function cfg(){return Object.assign({},DEFAULT_CFG,S.config||{})}
function theme(){var b=PRESETS.stage;return Object.assign({radius:18,align:'left',scale:1},{bg:b.bg,surface:b.surface,line:b.line,text:b.text,muted:b.muted,a1:b.a1,a2:b.a2,a3:b.a3,font:b.font,pattern:b.pattern},(S.config&&S.config.theme)||{})}
function baseUrl(){var c=cfg();if(c.baseUrl)return c.baseUrl;try{return location.href.split('#')[0]}catch(e){return ''}}
function joinUrl(){return baseUrl()+'#play'}
function tick(){if(tick.p)return;tick.p=requestAnimationFrame(function(){tick.p=0;if(view&&view.update)try{view.update()}catch(e){console.error(e)}})}

function applyTheme(){
  var t=theme(),r=document.documentElement.style,fp=FONT_PAIRS[t.font]||FONT_PAIRS.stage;
  function set(k,v){r.setProperty(k,v)}
  set('--bg',t.bg);set('--surface',t.surface);set('--line',t.line);set('--text',t.text);set('--muted',t.muted);
  set('--a1',t.a1);set('--a2',t.a2);set('--a3',t.a3);set('--on1',onColor(t.a1));set('--on2',onColor(t.a2));set('--on3',onColor(t.a3));
  set('--radius',(t.radius==null?18:t.radius)+'px');set('--fd',"'"+fp.d+"',system-ui,sans-serif");set('--fb',"'"+fp.b+"',system-ui,sans-serif");set('--fdw',fp.dw);set('--scale',t.scale||1);
  r.colorScheme=lum(t.bg)>0.5?'light':'dark';
  loadedFontLink(t.font,fp.dq,fp.bq);
}
function subAnswers(){
  if(subs.answers){subs.answers();subs.answers=null}
  if(subs.mod){subs.mod();subs.mod=null}
  S.answers=[];S.mod={hidden:[],featured:null};
  var qid=S.state.qid;if(!qid){tick();return}
  subs.answers=DB.collection('answers').where('q','==',qid).onSnapshot(function(s){S.answers=s.docs.map(function(d){return Object.assign({id:d.id},d.data())});tick()},function(e){console.warn('answers',e)});
  subs.mod=DB.doc('mod/'+qid).onSnapshot(function(s){var d=s.exists?s.data():{};S.mod={hidden:d.hidden||[],featured:d.featured||null};tick()},function(e){console.warn('mod',e)});
}
function subscribeAll(){
  DB.doc('config/main').onSnapshot(function(s){S.config=s.exists?s.data():null;S.loaded.cfg=true;applyTheme();tick()},function(e){console.warn(e)});
  DB.doc('game/state').onSnapshot(function(s){var d=s.exists?s.data():{qid:null,phase:'lobby',locked:false};var ch=d.qid!==S.state.qid;S.state=d;S.loaded.state=true;if(ch)subAnswers();tick()},function(e){console.warn(e)});
  DB.collection('questions').onSnapshot(function(s){S.qs=s.docs.map(function(d){return Object.assign({id:d.id},d.data())}).sort(function(a,b){return (a.n||0)-(b.n||0)});S.loaded.qs=true;tick()},function(e){console.warn(e)});
  DB.collection('guests').onSnapshot(function(s){S.guests=s.docs.map(function(d){return d.id});tick()},function(e){console.warn(e)});
  subAnswers();
}

/* ================= aggregation ================= */
function displayFor(q){var l=DISPLAYS[q.kind]||DISPLAYS.text;return l.some(function(x){return x[0]===q.display})?q.display:l[0][0]}
function agg(ctx){
  var q=ctx.q,hid=new Set((ctx.mod&&ctx.mod.hidden)||[]);
  var list=ctx.answers.filter(function(a){return !hid.has(a.id)});
  if(q.kind==='text'){
    var merge=q.merge!==false,m=new Map();
    list.forEach(function(a){
      var raw=clean(a.v);if(!raw)return;
      var key=merge?normKey(raw):raw.toLowerCase();var e=m.get(key);
      if(!e){e={key:key,labels:new Map(),count:0,t:0,ids:[]};m.set(key,e)}
      e.count++;e.t=Math.max(e.t,a.t||0);e.ids.push(a.id);e.labels.set(raw,(e.labels.get(raw)||0)+1);
    });
    return Array.from(m.values()).map(function(e){var best=Array.from(e.labels.entries()).sort(function(a,b){return b[1]-a[1]})[0][0];return {key:e.key,label:cap(best),count:e.count,t:e.t,ids:e.ids}});
  }
  var counts=new Map();list.forEach(function(a){counts.set(a.v,(counts.get(a.v)||0)+1)});
  return (q.options||[]).map(function(o){return {key:o.id,label:o.label,photo:o.photo,count:counts.get(o.id)||0,t:0,ids:[]}});
}
function sampleAnswers(q){
  var out=[],n=0;
  if(q.kind==='text'){
    var long=displayFor(q)==='wall'||displayFor(q)==='spotlight';
    if(long){SAMPLE_LONG.forEach(function(w,i){out.push({id:'s'+n,g:'s'+n,q:q.id,v:w,t:n++});if(i<2)out.push({id:'s'+n,g:'s'+n,q:q.id,v:w,t:n++})})}
    else SAMPLE_SHORT.forEach(function(w,i){for(var k=0;k<SAMPLE_SHORT_W[i];k++)out.push({id:'s'+n,g:'s'+n,q:q.id,v:w,t:n++})});
  }else{var ws=[14,9,6,4,3,2];(q.options||[]).forEach(function(o,i){for(var k=0;k<(ws[i]||2);k++)out.push({id:'s'+n,g:'s'+n,q:q.id,v:o.id,t:n++})})}
  return out;
}

/* ================= display modules ================= */
function emptyNote(el){return '<div class="empty">Waiting for answers…</div>'}
function cloudModule(el){
  el.innerHTML='<div class="cloud"></div>';
  var box=el.firstChild,nodes=new Map(),g=document.createElement('canvas').getContext('2d'),items=[];
  var onFonts=function(){draw()};
  if(document.fonts&&document.fonts.addEventListener)document.fonts.addEventListener('loadingdone',onFonts);
  function fam(){var fp=FONT_PAIRS[theme().font]||FONT_PAIRS.stage;return {f:"'"+fp.d+"'",w:fp.dw}}
  function layout(W,H){
    var F=fam(),max=items[0]?items[0].count:1,min=items[items.length-1]?items[items.length-1].count:1;
    var maxFs=Math.min(H*0.34,140),scale=1,out=[];
    for(var attempt=0;attempt<12;attempt++){
      var placed=[];out=[];var ok=true;
      for(var i=0;i<items.length;i++){
        var it=items[i];
        var t=max===min?(items.length<4?1:0.5):(Math.sqrt(it.count)-Math.sqrt(min))/(Math.sqrt(max)-Math.sqrt(min));
        var fs=Math.round((28+t*(maxFs-28))*scale);
        g.font=F.w+' '+fs+'px '+F.f+', sans-serif';
        var w=g.measureText(it.label).width+14,h=fs*1.1,pos=null;
        for(var k=0;k<3600;k++){
          var a=k*0.2,r=0.75*a,x=W/2+Math.cos(a)*r*1.8,y=H/2+Math.sin(a)*r;
          if(x-w/2<4||x+w/2>W-4||y-h/2<4||y+h/2>H-4)continue;
          var hit=false;
          for(var j=0;j<placed.length;j++){var p=placed[j];if(Math.abs(x-p.x)<(w+p.w)/2+8&&Math.abs(y-p.y)<(h+p.h)/2+4){hit=true;break}}
          if(!hit){pos={x:x,y:y,w:w,h:h};break}
        }
        if(!pos){ok=false;break}
        placed.push(pos);out.push({it:it,x:pos.x,y:pos.y,fs:fs});
      }
      if(ok)break;scale*=0.88;
    }
    return out;
  }
  function draw(){
    if(!items.length){box.innerHTML=emptyNote();nodes.clear();return}
    if(box.querySelector('.empty')){box.innerHTML='';nodes.clear()}
    var W=box.clientWidth||900,H=box.clientHeight||380,out=layout(W,H),keep=new Set();
    out.forEach(function(o,i){
      keep.add(o.it.key);var n=nodes.get(o.it.key);
      if(!n){n=document.createElement('div');n.className='w c'+(i===0?0:hash(o.it.key)%5);n.innerHTML='<span class="wi"></span>';n.firstChild.style.setProperty('--d',(-(hash(o.it.key)%60)/10)+'s');n.style.left=o.x+'px';n.style.top=o.y+'px';n.style.fontSize=o.fs+'px';box.appendChild(n);nodes.set(o.it.key,n)}
      else{n.className=n.className.replace(/\bc\d\b/,'c'+(i===0?0:hash(o.it.key)%5))}
      n.firstChild.textContent=o.it.label;n.style.left=o.x+'px';n.style.top=o.y+'px';n.style.fontSize=o.fs+'px';
    });
    nodes.forEach(function(n,k){if(!keep.has(k)){n.remove();nodes.delete(k)}});
  }
  return {update:function(c){items=agg(c).filter(function(i){return i.count>0}).sort(function(a,b){return b.count-a.count||b.t-a.t}).slice(0,48);draw()},destroy:function(){if(document.fonts&&document.fonts.removeEventListener)document.fonts.removeEventListener('loadingdone',onFonts)}};
}
function barsModule(el){
  el.innerHTML='<div class="bars"></div>';var box=el.firstChild,sig='';
  return {update:function(c){
    var q=c.q,items=agg(c);
    if(q.kind==='text')items=items.filter(function(i){return i.count>0}).sort(function(a,b){return b.count-a.count||b.t-a.t}).slice(0,8);
    if(!items.length){box.innerHTML=emptyNote();sig='';return}
    var total=items.reduce(function(s,i){return s+i.count},0)||1,max=Math.max.apply(null,items.map(function(i){return i.count}))||1;
    var s=items.map(function(i){return i.key}).join('|'),rh=items.length>6?40:52;
    if(s!==sig){sig=s;box.innerHTML=items.map(function(i,ix){return '<div class="brow" style="--h:'+rh+'px"><div class="blabel">'+esc(i.label)+'</div><div class="bwrap"><div class="bfill k'+(ix%4)+'"></div></div><div class="bpct"></div><div class="bvotes"></div></div>'}).join('');void box.offsetWidth}
    $$('.brow',box).forEach(function(row,ix){var i=items[ix];row.classList.toggle('win',max>0&&i.count===max&&i.count>0);$('.bfill',row).style.width=(max?i.count/max*100:0)+'%';$('.bpct',row).textContent=Math.round(i.count/total*100)+'%';$('.bvotes',row).textContent=i.count+(i.count===1?' vote':' votes')});
  }};
}
function photosModule(el){
  el.innerHTML='<div class="ptiles" style="height:100%"></div>';var box=el.firstChild,sig='';
  return {update:function(c){
    var items=agg(c),n=items.length;
    if(!n){box.innerHTML=emptyNote();return}
    var total=items.reduce(function(s,i){return s+i.count},0)||1,max=Math.max.apply(null,items.map(function(i){return i.count}));
    var s=items.map(function(i){return i.key+i.photo+i.label}).join('|');
    if(s!==sig){sig=s;box.style.gridTemplateColumns='repeat('+(n<=4?n:3)+',minmax(0,1fr))';box.innerHTML=items.map(function(i,ix){return '<div class="ptile"><div class="pimg'+(i.photo?'':' ph')+'" '+(i.photo?'style="background-image:url('+blobUrl(i.photo)+')"':'')+'></div><div class="pfill"></div><span class="pcrown">WINNER</span><div class="pcap"><div><div class="plabel">'+String.fromCharCode(65+ix)+(i.label?' · '+esc(i.label):'')+'</div><div class="pv" style="font-size:14px;opacity:.9"></div></div><div class="ppct"></div></div></div>'}).join('');void box.offsetWidth}
    $$('.ptile',box).forEach(function(t,ix){var i=items[ix];t.classList.toggle('win',max>0&&i.count===max);$('.pfill',t).style.height=(i.count/total*100)+'%';$('.ppct',t).textContent=Math.round(i.count/total*100)+'%';$('.pv',t).textContent=i.count+(i.count===1?' vote':' votes')});
  }};
}
function wallModule(el){
  el.innerHTML='<div class="wall"></div>';var box=el.firstChild,seen=new Set(),sig='';
  return {update:function(c){
    var items=agg(c).filter(function(i){return i.count>0}).sort(function(a,b){return b.t-a.t});
    if(!items.length){box.innerHTML=emptyNote();sig='';seen.clear();return}
    var two=el.clientWidth<800;box.classList.toggle('two',two);
    var feat=null,fid=c.mod&&c.mod.featured;
    if(fid){feat=items.find(function(i){return i.ids.indexOf(fid)>-1})||null}
    var max=two?6:9,rest=items.filter(function(i){return i!==feat});
    var show=(feat?[feat]:[]).concat(rest.slice(0,max-(feat?2:0)));
    var s=show.map(function(i){return i.key+i.count+(i===feat?'F':'')}).join('|');
    if(s===sig)return;sig=s;
    box.innerHTML=show.map(function(i){
      var f=i===feat,len=i.label.length,fs=f?(len<60?38:28):(len<40?26:len<90?22:18),rot=((hash(i.key)%9)-4)*0.25,tcls=f?'feat':['','t1','','t2'][hash(i.key)%4];
      var isNew=!seen.has(i.key);
      return '<div class="card '+tcls+'" style="font-size:'+fs+'px;transform:rotate('+rot+'deg);'+(isNew?'':'animation:none')+'">'+(f?'<span class="tag">HOST\'S PICK</span>':'')+esc(i.label)+(i.count>1?'<span class="x">×'+i.count+'</span>':'')+'</div>';
    }).join('');
    show.forEach(function(i){seen.add(i.key)});
  }};
}
function spotModule(el,c0){
  el.innerHTML='<div class="spot"><div class="spot-mark" aria-hidden="true">“</div><div class="spot-text"></div><div class="spot-meta"></div></div>';
  var tx=$('.spot-text',el),meta=$('.spot-meta',el),list=[],idx=0,sig='',timer=null,secs=(c0&&c0.cfg&&c0.cfg.spotlightSecs)||6;
  function show(){
    if(!list.length){tx.textContent='Waiting for answers…';tx.style.fontSize='34px';meta.textContent='';return}
    var it=list[idx%list.length],len=it.label.length;tx.style.animation='none';void tx.offsetWidth;tx.style.animation='';
    tx.textContent=it.label;tx.style.fontSize=(len<30?76:len<70?58:len<120?44:34)+'px';meta.textContent=(idx%list.length+1)+' of '+list.length;
  }
  return {update:function(c){
    secs=c.cfg.spotlightSecs||6;var items=agg(c).filter(function(i){return i.count>0});
    items.sort(function(a,b){return hash(a.key)-hash(b.key)});
    var fid=c.mod&&c.mod.featured,fi=items.findIndex(function(i){return i.ids.indexOf(fid)>-1});
    if(fi>0){var f=items.splice(fi,1)[0];items.unshift(f)}
    var s=items.map(function(i){return i.key}).join('|');
    var first=!sig&&s;list=items;
    if(s!==sig){sig=s;if(first||!timer){idx=0}show()}
    if(!timer){timer=setInterval(function(){if(list.length>1){idx++;show()}},secs*1000)}
  },destroy:function(){clearInterval(timer);timer=null}};
}
function makeModule(kind,el,ctx){
  return ({cloud:cloudModule,bars:barsModule,photos:photosModule,wall:wallModule,spotlight:spotModule}[kind]||cloudModule)(el,ctx);
}

/* ================= TV ================= */
function fancyTitle(t){
  var parts=esc(t).split(/\s*&amp;\s*/);
  if(parts.length>1)return esc(parts[0].trim())+'<br><span style="color:var(--a1)">&amp;</span> <span style="color:var(--a2)">'+parts.slice(1).join(' &amp; ')+'</span>';
  var w=esc(t).split(' ');if(w.length>1){var last=w.pop();return w.join(' ')+' <span style="color:var(--a2)">'+last+'</span>'}return esc(t);
}
function liveCtx(){
  var q=curQ();
  return {cfg:cfg(),th:theme(),q:q,idx:qIndex(),total:S.qs.length,phase:S.state.phase,locked:S.state.locked,answers:S.answers,mod:S.mod,guestsCount:S.guests.length,joinUrl:joinUrl()};
}
function qrInto(el,text,size,dark){
  el.innerHTML='';if(typeof QRCode==='undefined'){el.textContent='QR unavailable';el.style.lineHeight='1.2';return}
  try{new QRCode(el,{text:text,width:size,height:size,colorDark:dark||'#0B0B14',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M})}catch(e){el.textContent='QR unavailable'}
}
function headHTML(ctx){
  var q=ctx.q,ac=q.accent||1,dots='';
  for(var i=0;i<ctx.total;i++)dots+='<i class="'+(i<=ctx.idx?'on':'')+'"></i>';
  return '<div class="tv-head" style="--ac:var(--a'+ac+')"><span class="pill" style="background:var(--a'+ac+');color:var(--on'+ac+')">'+esc(q.round||'')+'</span><div class="prog"><span>Question '+(ctx.idx+1)+' of '+ctx.total+'</span>'+dots+'</div></div>';
}
function photoPanel(q){
  if(!q.photo)return '';
  return '<div class="polaroid"><div class="pic"><div class="pimg" style="background-image:url('+blobUrl(q.photo)+')"></div></div><div class="cap">'+esc(q.photoCaption||'')+'</div></div>';
}
function createTV(root){
  root.classList.add('tv-root');
  root.innerHTML='<div class="tv-fit"><div class="stage"></div></div>';
  var fit=root.firstChild,stage=fit.firstChild,sig='',mod=null,phase='lobby';
  function size(){var w=root.clientWidth,h=root.clientHeight;if(!w||!h)return;var s=Math.min(w/1280,h/720);stage.style.transform='scale('+s+')';fit.style.width=1280*s+'px';fit.style.height=720*s+'px'}
  var ro=new ResizeObserver(size);ro.observe(root);size();
  function killMod(){if(mod&&mod.destroy)mod.destroy();mod=null}
  function build(ctx){
    var t=ctx.th,q=ctx.q,c=ctx.cfg;killMod();
    stage.className='stage pat-'+(t.pattern||'none')+(t.align==='center'?' al-center':'');
    var rings=(t.pattern==='rings')?'<i class="ring r1"></i><i class="ring r2"></i><i class="ring r3"></i>':'';
    var sc=t.scale||1;
    if(phase==='lobby'){
      stage.innerHTML=rings+'<div class="lobby"><div class="lobby-l"><div><span class="pill" style="background:var(--a1);color:var(--on1)">Live party game</span></div><h1>'+fancyTitle(c.title)+'</h1><p>'+esc(c.tagline)+'</p><div class="steps"><div><b>1</b>Scan the code with your phone camera</div><div><b>2</b>No app, no sign-up. Just type or tap.</div><div><b>3</b>Answers are anonymous. Be funny, be kind.</div></div></div><div class="lobby-r"><div class="qr-card" data-k="qr"></div><div class="joinurl">'+esc(ctx.joinUrl)+'</div><div class="chip"><i></i><span data-k="guests"></span></div></div></div>';
      qrInto($('[data-k=qr]',stage),ctx.joinUrl,280);
    }else if(phase==='end'){
      stage.innerHTML=rings+'<div class="end"><div class="pill" style="background:var(--a3);color:var(--on3)">'+esc(c.title)+'</div><svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="var(--a2)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12l-1 8a5 5 0 0 1-10 0z"/><path d="M12 16v5M8 21h8"/></svg><h1>'+esc(c.finale)+'</h1></div>';
    }else if(phase==='collect'){
      var len=q.text.length,fs=(len<40?88:len<70?70:len<110?56:46)*sc,kick=q.kind==='text'?(q.exactWords?'Type your answer · exactly '+q.exactWords+' word'+(q.exactWords>1?'s':''):'Type your answer on your phone'):q.kind==='choice'?'Pick one on your phone':'Tap your pick on your phone';
      var extra='';
      if(q.kind==='choice')extra='<div class="opt-row">'+(q.options||[]).map(function(o,i){return '<span class="opt-chip"><b>'+String.fromCharCode(65+i)+'</b>'+esc(o.label)+'</span>'}).join('')+'</div>';
      if(q.kind==='photochoice'){var n=(q.options||[]).length;extra='<div class="ptiles" style="grid-template-columns:repeat('+(n<=4?Math.max(n,1):3)+',minmax(0,1fr));height:250px">'+(q.options||[]).map(function(o,i){return '<div class="ptile"><div class="pimg'+(o.photo?'':' ph')+'" '+(o.photo?'style="background-image:url('+blobUrl(o.photo)+')"':'')+'></div><div class="pcap"><span class="plabel">'+String.fromCharCode(65+i)+(o.label?' · '+esc(o.label):'')+'</span></div></div>'}).join('')+'</div>'}
      stage.innerHTML=rings+headHTML(ctx)+'<div class="c-body">'+photoPanel(q)+'<div class="c-main"><div class="kicker">'+esc(kick)+'</div><h1 class="q-h" style="font-size:'+(q.kind==='photochoice'?Math.min(fs,56):fs)+'px">'+esc(q.text)+'</h1>'+extra+'</div></div><div class="c-foot"><div class="count"><div class="big"><b data-k="ans">0</b><span>of <span data-k="tot">0</span> guests have answered</span></div><div class="dots" data-k="dots"></div></div><div style="display:flex;gap:18px;align-items:center"><div class="minqr"><div class="qrbox" data-k="mqr"></div><span>Late? Scan to join</span></div><span class="chip" data-k="lock"></span></div></div>';
      qrInto($('[data-k=mqr]',stage),ctx.joinUrl,76);
    }else{
      var kind=displayFor(q);
      stage.innerHTML=rings+headHTML(ctx)+'<h2 class="q-h q-s" style="font-size:'+(44*sc)+'px">'+esc(q.text)+'</h2><div class="r-body">'+photoPanel(q)+'<div class="r-disp" data-k="disp"></div></div><div class="r-foot"><span class="chip" data-k="total"></span><span style="color:var(--muted);font-size:17px" data-k="hint"></span></div>';
      mod=makeModule(kind,$('[data-k=disp]',stage),ctx);
    }
  }
  function update(ctx){
    var q=ctx.q;phase=ctx.phase;if(!q&&phase!=='end')phase='lobby';if(phase==='lobby'||phase==='end'){}
    var t=ctx.th,c=ctx.cfg;
    var s=[phase,t.font,t.pattern,t.align,t.scale,t.radius,c.title,c.tagline,c.finale,ctx.joinUrl,q?JSON.stringify([q.id,q.text,q.round,q.accent,q.display,q.kind,q.photo,q.photoCaption,q.options,q.exactWords]):'',ctx.idx,ctx.total].join('§');
    if(s!==sig){sig=s;build(ctx)}
    var answered=new Set(ctx.answers.map(function(a){return a.g})).size,total=Math.max(ctx.guestsCount,answered);
    if(phase==='lobby'){var gl=$('[data-k=guests]',stage);if(gl)gl.textContent=ctx.guestsCount+(ctx.guestsCount===1?' guest joined':' guests joined')}
    if(phase==='collect'){
      $('[data-k=ans]',stage).textContent=answered;$('[data-k=tot]',stage).textContent=total;
      var d=$('[data-k=dots]',stage),cap=Math.min(total,90),h='';for(var i=0;i<cap;i++)h+='<i class="'+(i<answered?'on':'')+'"></i>';if(d.dataset.h!==h){d.innerHTML=h;d.dataset.h=h}
      $('[data-k=lock]',stage).textContent=ctx.locked?'Submissions closed':'Answers hidden until reveal';
    }
    if(phase==='reveal'){
      var visible=ctx.answers.filter(function(a){return !((ctx.mod&&ctx.mod.hidden)||[]).includes(a.id)}).length;
      $('[data-k=total]',stage).textContent=visible+(visible===1?' answer':' answers');
      $('[data-k=hint]',stage).textContent=(q.kind==='text'&&q.merge!==false)?'Similar answers merged. Bigger means more people said it.':'';
      if(mod&&mod.update)mod.update(ctx);
    }
  }
  return {update:update,destroy:function(){killMod();ro.disconnect()}};
}

/* ================= Guest phone ================= */
function createPlay(root,opts){
  opts=opts||{};var preview=!!opts.preview,sig='',draft='',selected=null,editing=false,lastQ=null,err='';
  root.innerHTML='<div class="phone"></div>';var ph=root.firstChild;
  function pctx(){if(opts.ctx)return opts.ctx();return {q:curQ(),phase:S.state.phase,locked:S.state.locked}}
  function mine(q){return preview?[]:S.answers.filter(function(a){return a.g===S.gid&&a.q===q.id})}
  function label(q,v){if(q.kind==='text')return v;var o=(q.options||[]).find(function(x){return x.id===v});return o?o.label||('Option '+(1+q.options.indexOf(o))):v}
  function head(c){var t=cfg();return '<div class="brand"><span>'+esc(t.title)+'</span>'+(c.q&&c.phase!=='lobby'?'<small>'+(S.qs.indexOf(c.q)+1)+' of '+S.qs.length+'</small>':'')+'</div>'}
  async function submit(q,val){
    if(preview)return;
    var m=mine(q),id;
    if(q.kind!=='text'||(q.maxPerGuest||1)<=1||editing){id=q.id+'__'+safeId(S.gid)}
    else{var used=new Set(m.map(function(a){return a.id}));for(var i=1;i<=(q.maxPerGuest||1);i++){if(!used.has(q.id+'__'+safeId(S.gid)+'__'+i)){id=q.id+'__'+safeId(S.gid)+'__'+i;break}}if(!id)return}
    try{await DB.doc('answers/'+id).set({q:q.id,g:S.gid,v:val,t:Date.now()});editing=false;draft='';selected=null;err='';sig='';tick()}catch(e){err='Could not send. Check your connection and try again.';render(true)}
  }
  function render(force){
    var c=pctx(),q=c.q,m=q?mine(q):[];
    if(q&&q.id!==lastQ){lastQ=q.id;draft='';selected=null;editing=false;err=''}
    var s=[c.phase,c.locked,q?JSON.stringify([q.id,q.text,q.kind,q.options,q.photo,q.maxLen,q.hint,q.exactWords,q.maxPerGuest,q.round,q.accent]):'',m.map(function(a){return a.id+a.v}).join(','),editing,theme().font,S.state.qid,cfg().title,cfg().finale,S.qs.length].join('§');
    if(!force&&s===sig)return;sig=s;
    var h=head(c);
    if(!q||c.phase==='lobby'){
      h+='<div class="grow"></div><span class="badge" style="background:var(--a3);color:var(--on3)">You\'re in</span><h2>'+esc(cfg().tagline)+'</h2><p>Questions pop up here when the host starts each one. Keep an eye on the big screen too.</p><div class="grow"></div><div class="status"><i></i>Waiting for the host…</div>';
    }else if(c.phase==='end'){
      h+='<div class="grow"></div><div class="bigtick" aria-hidden="true"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l-1 8a5 5 0 0 1-10 0z"/><path d="M12 16v5M8 21h8"/></svg></div><h2>'+esc(cfg().finale)+'</h2><div class="grow"></div>';
    }else{
      var ac=q.accent||1;
      h+='<span class="badge" style="background:var(--a'+ac+');color:var(--on'+ac+')">'+esc(q.round||'')+'</span>';
      if(q.photo)h+='<div class="qphoto"><div class="pimg" style="background-image:url('+blobUrl(q.photo)+')"></div></div>';
      h+='<h2>'+esc(q.text)+'</h2>';
      var maxK=q.kind==='text'?(q.maxPerGuest||1):1,canAnswer=c.phase==='collect'&&!c.locked&&(m.length<maxK||editing);
      if(m.length&&!editing){h+='<div class="mine"><small style="display:block;color:var(--muted);font-size:13px;font-weight:700;letter-spacing:.08em;margin-bottom:4px">YOUR ANSWER'+(m.length>1?'S':'')+'</small>'+m.map(function(a){return esc(label(q,a.v))}).join('<br>')+'</div>'}
      if(canAnswer){
        if(q.kind==='text'){
          var ml=q.maxLen||80;
          h+='<div style="display:flex;flex-direction:column;gap:8px"><label class="l" for="ans">'+(m.length?'Add another answer ('+m.length+' of '+maxK+' used)':'Your answer')+'</label><textarea id="ans" maxlength="'+ml+'" placeholder="'+esc(q.hint||'Type here…')+'">'+esc(draft)+'</textarea><div class="meta"><span>Anonymous. Nobody sees your name.</span><span id="cnt">'+draft.length+'/'+ml+'</span></div><div class="err" id="err">'+esc(err)+'</div></div><div class="grow"></div><button class="pbtn" id="send" type="button">Send it</button>';
        }else if(q.kind==='choice'){
          h+='<div class="opts">'+(q.options||[]).map(function(o,i){return '<button type="button" class="opt'+(selected===o.id?' sel':'')+'" data-o="'+esc(o.id)+'" aria-pressed="'+(selected===o.id)+'">'+esc(o.label||('Option '+(i+1)))+'</button>'}).join('')+'</div><div class="grow"></div><button class="pbtn" id="send" type="button"'+(selected?'':' disabled')+'>Lock in my vote</button>';
        }else{
          h+='<div class="popts">'+(q.options||[]).map(function(o,i){return '<button type="button" class="popt'+(selected===o.id?' sel':'')+'" data-o="'+esc(o.id)+'" aria-pressed="'+(selected===o.id)+'" aria-label="Photo '+String.fromCharCode(65+i)+(o.label?', '+esc(o.label):'')+'"><div class="pimg'+(o.photo?'':' ph')+'" '+(o.photo?'style="background-image:url('+blobUrl(o.photo)+')"':'')+'></div><span class="tick">✓</span><div class="cap">'+String.fromCharCode(65+i)+(o.label?' · '+esc(o.label):'')+'</div></button>'}).join('')+'</div><div class="grow"></div><button class="pbtn" id="send" type="button"'+(selected?'':' disabled')+'>Lock in my pick</button>';
        }
      }else if(c.phase==='collect'&&c.locked){
        h+='<div class="grow"></div><div class="status"><i></i>Submissions are closed.</div>';
      }else if(c.phase==='reveal'){
        h+='<div class="grow"></div><div class="status"><i></i>Eyes up. Results are on the big screen.</div>';
      }else if(m.length&&c.phase==='collect'&&!editing){
        h+='<div class="grow"></div><div class="status"><i></i>Locked in. Waiting for the reveal.</div>';
      }
      if(c.phase==='collect'&&!c.locked&&m.length&&!editing&&maxK===1)h+='<button class="pbtn ghost" id="chg" type="button">Change my answer</button>';
    }
    ph.innerHTML=h;
    var ta=$('#ans',ph);
    if(ta){ta.addEventListener('input',function(){draft=ta.value;$('#cnt',ph).textContent=draft.length+'/'+(q.maxLen||80)});if(editing&&!draft){var cur=m[0];if(cur){draft=cur.v;ta.value=draft}}}
    $$('[data-o]',ph).forEach(function(b){b.addEventListener('click',function(){selected=b.getAttribute('data-o');render(true)})});
    var send=$('#send',ph);
    if(send)send.addEventListener('click',function(){
      if(q.kind==='text'){
        var v=clean(draft);if(!v){err='Type an answer first.';render(true);return}
        if(q.exactWords){var n=v.split(' ').length;if(n!==q.exactWords){err='Exactly '+q.exactWords+' word'+(q.exactWords>1?'s':'')+', please. You have '+n+'.';render(true);return}}
        submit(q,v);
      }else if(selected)submit(q,selected);
    });
    var chg=$('#chg',ph);if(chg)chg.addEventListener('click',function(){editing=true;var cur=m[0];if(q.kind==='text')draft=cur?cur.v:'';else selected=cur?cur.v:null;render(true)});
  }
  if(!preview&&DB&&S.gid){DB.doc('guests/'+safeId(S.gid)).set({t:Date.now()}).catch(function(){})}
  return {update:function(){render(false)},destroy:function(){}};
}

/* ================= Host console ================= */
async function setState(patch){
  var s=Object.assign({qid:null,phase:'lobby',locked:false},S.state,patch,{t:Date.now()});
  var ch=s.qid!==S.state.qid;S.state=s;if(ch)subAnswers();tick();
  try{await DB.doc('game/state').set(s)}catch(e){toast('Could not update the game state.')}
}
async function saveQ(id,patch){
  var i=S.qs.findIndex(function(q){return q.id===id});if(i>-1)S.qs[i]=Object.assign({},S.qs[i],patch);tick();
  try{await DB.doc('questions/'+id).update(patch)}catch(e){toast('Could not save that change.')}
}
async function saveCfg(patch){
  var cur=S.config||Object.assign({},DEFAULT_CFG);
  var next=Object.assign({},cur,patch);if(patch.theme)next.theme=Object.assign({},cur.theme||{},patch.theme);
  S.config=next;applyTheme();tick();
  try{await DB.doc('config/main').set(next)}catch(e){toast('Could not save settings.')}
}
async function saveMod(patch){
  var qid=S.state.qid;if(!qid)return;S.mod=Object.assign({},S.mod,patch);tick();
  try{await DB.doc('mod/'+qid).set({hidden:S.mod.hidden||[],featured:S.mod.featured||null})}catch(e){toast('Could not save.')}
}
function pickFile(){return new Promise(function(res){var i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=function(){res(i.files&&i.files[0]||null)};i.click()})}
async function prepImage(file,max){
  max=max||1600;
  try{var bmp=await createImageBitmap(file);var s=Math.min(1,max/Math.max(bmp.width,bmp.height));var c=document.createElement('canvas');c.width=Math.round(bmp.width*s);c.height=Math.round(bmp.height*s);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);return await new Promise(function(r){c.toBlob(r,'image/jpeg',0.86)})}catch(e){return file}
}
async function uploadPhoto(){
  if(!ASSETS){toast('Photo upload needs edit access to this page.');return null}
  var f=await pickFile();if(!f)return null;
  toast('Uploading photo…');
  try{var b=await prepImage(f);var r=await ASSETS.upload(b,{type:b.type||'image/jpeg'});toast('Photo added.');return r.id}catch(e){toast('Upload failed'+(e&&e.code?' ('+e.code+')':'')+'.');return null}
}
function newQuestion(extra){
  var n=S.qs.length?Math.max.apply(null,S.qs.map(function(q){return q.n||0}))+1:1,last=S.qs[S.qs.length-1];
  return Object.assign({n:n,round:last?last.round:'The Roast',accent:last?last.accent:1,text:'New question',kind:'text',display:'cloud',photo:null,photoCaption:'',options:[],maxLen:60,exactWords:0,maxPerGuest:1,merge:true,hint:'',cue:''},extra||{});
}
function confirmBtn(btn,label,fn){
  var armed=false,orig=btn.textContent,t;
  btn.addEventListener('click',function(){if(!armed){armed=true;btn.textContent='Click again to confirm';t=setTimeout(function(){armed=false;btn.textContent=orig},3500)}else{clearTimeout(t);armed=false;btn.textContent=orig;fn()}});
}
async function deleteAnswers(filter){
  var snap=await DB.collection('answers').get(),ds=snap.docs.filter(function(d){return filter(d.data(),d.id)});
  for(var i=0;i<ds.length;i+=8){await Promise.all(ds.slice(i,i+8).map(function(d){return DB.doc('answers/'+d.id).delete()}));await sleep(80)}
  return ds.length;
}
async function simulate(n){
  var q=curQ();if(!q){toast('Go live on a question first.');return}
  var vals=[];
  if(q.kind==='text'){
    if(!vals.length){var pool=displayFor(q)==='wall'||displayFor(q)==='spotlight'?SAMPLE_LONG:SAMPLE_SHORT;for(var i=0;i<n;i++)vals.push(pool[Math.floor(Math.pow(Math.random(),1.6)*pool.length)])}
  }else{var o=q.options||[];if(!o.length){toast('Add options first.');return}for(var j=0;j<n;j++)vals.push(o[Math.floor(Math.pow(Math.random(),1.5)*o.length)].id)}
  var stamp=Date.now()%100000;
  for(var k=0;k<n;k++){
    var gid='sim'+stamp+'-'+k,v=vals[k%vals.length];
    await Promise.all([DB.doc('answers/'+q.id+'__'+gid).set({q:q.id,g:gid,v:v,t:Date.now()+k}),DB.doc('guests/'+gid).set({t:Date.now()})]);
    if(k%5===4)await sleep(120);
  }
  toast('Added '+n+' sample answers.');
}
async function removeSim(){
  var n=await deleteAnswers(function(d){return String(d.g).indexOf('sim')===0});
  var g=await DB.collection('guests').get();var sg=g.docs.filter(function(d){return d.id.indexOf('sim')===0});
  for(var i=0;i<sg.length;i+=8){await Promise.all(sg.slice(i,i+8).map(function(d){return DB.doc('guests/'+d.id).delete()}));await sleep(80)}
  toast('Removed '+n+' sample answers.');
}

function createHost(root){
  if(!S.canEdit)return createLogin(root);
  var H={tab:'edit',edit:null,pv:'live',tv:null,ph:null,pend:{}};
  root.innerHTML='<div class="host"><header class="h-bar"><div class="h-brand">Roast &amp; Toast <span class="muted" style="font-weight:500;font-size:14px;font-family:DM Sans,sans-serif">host console</span></div><div class="h-chips" id="chips"></div></header><div class="h-grid"><section class="h-col" id="col-l"><div class="h-title"><span>Run of show</span><span id="runlen"></span></div><div id="qlist" style="display:flex;flex-direction:column;gap:4px"></div><button class="hbtn" id="addq" type="button">+ Add question</button></section><section class="h-col" id="col-m"><div class="h-pv"><div class="pv-tv"><div class="seg" role="group" aria-label="Screen preview"><button type="button" data-pv="live">Live screen</button><button type="button" data-pv="collect">Selected: collecting</button><button type="button" data-pv="results">Selected: results</button></div><div class="pv-box" id="pvtv"></div></div><div class="pv-phone"><div class="seg" style="visibility:hidden"><button>x</button></div><div class="pv-ph"><div class="scaler" id="pvph"></div></div></div></div><div class="h-ctl" id="ctl"></div><div class="cue" id="cue" hidden></div><div><div class="h-title" style="margin-bottom:8px"><span>Answers on the live question</span><span id="mcount"></span></div><div class="mlist" id="modlist"></div></div></section><section class="h-col" id="col-r"><div class="tabs" role="tablist"><button type="button" data-tab="edit" role="tab">Question</button><button type="button" data-tab="look" role="tab">Look &amp; feel</button><button type="button" data-tab="share" role="tab">Share &amp; tools</button></div><div id="panel" style="display:flex;flex-direction:column;gap:14px"></div></section></div></div>';
  var $r=function(s){return $(s,root)};
  H.tv=createTV($r('#pvtv'));
  H.ph=createPlay($r('#pvph'),{preview:true,ctx:function(){
    if(H.pv==='live')return {q:curQ(),phase:S.state.phase,locked:S.state.locked};
    var q=S.qs.find(function(x){return x.id===H.edit});return {q:q||null,phase:q?'collect':'lobby',locked:false};
  }});
  function selQ(){return S.qs.find(function(x){return x.id===H.edit})||null}
  function pvCtx(){
    var q=selQ();
    if(H.pv==='live'||!q)return liveCtx();
    var base={cfg:cfg(),th:theme(),q:q,idx:S.qs.indexOf(q),total:S.qs.length,locked:false,mod:{hidden:[],featured:null},joinUrl:joinUrl()};
    if(H.pv==='collect')return Object.assign(base,{phase:'collect',answers:sampleAnswers(q).slice(0,32),guestsCount:56});
    return Object.assign(base,{phase:'reveal',answers:sampleAnswers(q),guestsCount:56});
  }
  /* --- top chips --- */
  function updChips(){
    var u=baseUrl();
    $r('#chips').innerHTML='<span class="hc"><b>'+S.guests.length+'</b> guests joined</span><span class="hc"><b>'+S.qs.length+'</b> questions</span><button class="hbtn sm" type="button" data-copy="'+esc(u+'#tv')+'">Copy TV link</button><button class="hbtn sm" type="button" data-copy="'+esc(u+'#play')+'">Copy guest link</button><button class="hbtn sm" type="button" data-signout="1">Sign out</button>';
    $r('#runlen').textContent=S.qs.length+' slides';
  }
  /* --- list --- */
  function updList(){
    var h='';
    S.qs.forEach(function(q,i){
      var live=q.id===S.state.qid&&S.state.phase!=='lobby';
      h+='<div class="qrow'+(q.id===H.edit?' sel':'')+(live?' live':'')+'" data-q="'+q.id+'" role="button" tabindex="0" aria-label="Edit question '+(i+1)+'"><span class="no">'+(i+1)+'</span><span class="tx"><b>'+esc(q.text)+'</b><small>'+esc(q.round||'')+' · '+({text:'text',choice:'choice',photochoice:'photo choice'}[q.kind]||'')+' · '+esc(displayFor(q))+'</small></span>'+(live?'<span class="livebadge">LIVE</span>':'<button class="golive" type="button" data-go="'+q.id+'">Go live</button>')+'<span class="mv"><button class="ib" type="button" data-mv="-1" data-id="'+q.id+'" aria-label="Move up">▲</button><button class="ib" type="button" data-mv="1" data-id="'+q.id+'" aria-label="Move down">▼</button></span></div>';
    });
    if(!S.qs.length)h='<p class="muted">No questions yet. Add one to begin.</p>';
    if($r('#qlist').dataset.h!==h){$r('#qlist').innerHTML=h;$r('#qlist').dataset.h=h}
  }
  /* --- controls --- */
  function updCtl(){
    var q=curQ(),i=qIndex(),ph=S.state.phase,answered=new Set(S.answers.map(function(a){return a.g})).size,tot=Math.max(S.guests.length,answered);
    var st,pri='',sec='';
    if(ph==='lobby'||!q){st='<b>Lobby</b><span class="muted">Guests are joining. '+S.guests.length+' in.</span>';pri='<button class="hbtn pri" type="button" data-act="start0"'+(S.qs.length?'':' disabled')+'>Start game: question 1</button>'}
    else if(ph==='collect'){st='<b>Q'+(i+1)+' · collecting</b><span class="muted">'+answered+' of '+tot+' answered'+(S.state.locked?' · closed':'')+'</span>';pri='<button class="hbtn pri" type="button" data-act="reveal">Reveal answers</button><button class="hbtn" type="button" data-act="lock">'+(S.state.locked?'Reopen submissions':'Close submissions')+'</button>'}
    else if(ph==='reveal'){st='<b>Q'+(i+1)+' · results on screen</b><span class="muted">'+answered+' answered</span>';pri='<button class="hbtn pri" type="button" data-act="next">'+(i+1<S.qs.length?'Next question →':'Finale →')+'</button><button class="hbtn" type="button" data-act="reopen">Reopen collecting</button>'}
    else{st='<b>Finale</b><span class="muted">Final toast screen is up.</span>';pri='<button class="hbtn pri" type="button" data-act="lobby">Back to lobby</button>'}
    sec='<button class="hbtn sm" type="button" data-act="prev"'+(i>0?'':' disabled')+'>← Previous</button><button class="hbtn sm" type="button" data-act="lobby">Lobby</button><button class="hbtn sm" type="button" data-act="finale">Finale screen</button>';
    var h='<div class="st">'+st+'</div><div class="btns">'+pri+'</div><div class="btns">'+sec+'</div><small class="muted">Keyboard: → or Space advances, ← goes back.</small>';
    if($r('#ctl').dataset.h!==h){$r('#ctl').innerHTML=h;$r('#ctl').dataset.h=h}
    var cue=$r('#cue');if(q&&q.cue&&ph!=='lobby'){cue.hidden=false;cue.innerHTML='<b>HOST CUE</b>'+esc(q.cue)}else cue.hidden=true;
  }
  function updMod(){
    var q=curQ(),box=$r('#modlist');
    if(!q||q.kind!=='text'){box.innerHTML='<p class="muted" style="margin:0">'+(q?'Votes show as bars. Nothing to moderate.':'Go live on a question to see answers here.')+'</p>';$r('#mcount').textContent='';return}
    var hid=new Set(S.mod.hidden||[]),rows=S.answers.slice().sort(function(a,b){return (b.t||0)-(a.t||0)}).slice(0,120);
    $r('#mcount').textContent=S.answers.length+' answers';
    var h=rows.map(function(a){return '<div class="mrow'+(hid.has(a.id)?' hid':'')+(S.mod.featured===a.id?' feat':'')+'"><span>'+esc(a.v)+'</span><button class="ib" style="width:auto;padding:0 8px" type="button" data-feat="'+esc(a.id)+'" aria-label="Feature this answer">'+(S.mod.featured===a.id?'★ Picked':'☆ Pick')+'</button><button class="ib" style="width:auto;padding:0 8px" type="button" data-hide="'+esc(a.id)+'" aria-label="Hide or show this answer">'+(hid.has(a.id)?'Show':'Hide')+'</button></div>'}).join('')||'<p class="muted" style="margin:0">No answers yet.</p>';
    if(box.dataset.h!==h){box.innerHTML=h;box.dataset.h=h}
  }
  function updSeg(){$$('[data-pv]',root).forEach(function(b){b.classList.toggle('on',b.dataset.pv===H.pv)});$$('[data-tab]',root).forEach(function(b){b.classList.toggle('on',b.dataset.tab===H.tab);b.setAttribute('aria-selected',b.dataset.tab===H.tab)})}

  /* --- question editor --- */
  function optRows(q){
    var ph=q.kind==='photochoice';
    return (q.options||[]).map(function(o,i){return '<div class="orow">'+(ph?'<button type="button" class="thumb" data-optphoto="'+i+'" style="'+(o.photo?'background-image:url('+blobUrl(o.photo)+')':'')+'" aria-label="Upload photo for option '+(i+1)+'">'+(o.photo?'':'Add photo')+'</button>':'')+'<input type="text" data-opt="'+i+'" value="'+esc(o.label)+'" placeholder="'+(ph?'Caption (optional)':'Option '+(i+1))+'" aria-label="Option '+(i+1)+' label"><button type="button" class="ib" data-optdel="'+i+'" aria-label="Remove option">✕</button></div>'}).join('');
  }
  function buildEditor(){
    var q=selQ(),p=$r('#panel');
    if(!q){p.innerHTML='<p class="muted">Pick a question from the run of show, or add a new one.</p>';return}
    var isText=q.kind==='text',ph=q.kind==='photochoice';
    var sw=[1,2,3].map(function(n){return '<button type="button" class="'+(q.accent===n?'on':'')+'" data-acc="'+n+'" style="background:var(--a'+n+')" aria-label="Round color '+n+'"></button>'}).join('');
    p.innerHTML=
    '<div class="f"><label for="f-round">Round name</label><input id="f-round" type="text" data-f="round" value="'+esc(q.round)+'"></div>'+
    '<div class="f"><span class="lbl">Round color</span><div class="sw">'+sw+'</div></div>'+
    '<div class="f"><label for="f-text">Question</label><textarea id="f-text" data-f="text" rows="3">'+esc(q.text)+'</textarea></div>'+
    '<div class="frow"><div class="f"><label for="f-kind">Guests answer by</label><select id="f-kind" data-f="kind">'+KINDS.map(function(k){return '<option value="'+k[0]+'"'+(k[0]===q.kind?' selected':'')+'>'+k[1]+'</option>'}).join('')+'</select></div><div class="f"><label for="f-display">Results shown as</label><select id="f-display" data-f="display">'+(DISPLAYS[q.kind]||[]).map(function(k){return '<option value="'+k[0]+'"'+(k[0]===displayFor(q)?' selected':'')+'>'+k[1]+'</option>'}).join('')+'</select></div></div>'+
    (isText?'':'<div class="f"><span class="lbl">'+(ph?'Photo choices (2 to 6)':'Choices (2 to 8)')+'</span><div id="opts" style="display:flex;flex-direction:column;gap:8px">'+optRows(q)+'</div><button type="button" class="hbtn sm" id="addopt" style="align-self:flex-start">+ Add choice</button>'+(ph?'<small>Upload one photo per choice. Guests see them as a 2-column grid on their phone.</small>':'')+'</div>')+
    (isText?'<div class="frow"><div class="f"><label for="f-max">Max characters</label><input id="f-max" type="number" min="5" max="200" data-f="maxLen" value="'+(q.maxLen||60)+'"></div><div class="f"><label for="f-words">Exact word count</label><input id="f-words" type="number" min="0" max="10" data-f="exactWords" value="'+(q.exactWords||0)+'"><small>0 means any length.</small></div></div><div class="frow"><div class="f"><label for="f-per">Answers per guest</label><input id="f-per" type="number" min="1" max="5" data-f="maxPerGuest" value="'+(q.maxPerGuest||1)+'"></div><div class="f"><label for="f-hint">Placeholder</label><input id="f-hint" type="text" data-f="hint" value="'+esc(q.hint||'')+'"></div></div><label class="chk"><input type="checkbox" data-f="merge"'+(q.merge!==false?' checked':'')+'> Merge similar answers (capitals, plurals, "the")</label>':'')+
    '<div class="hr"></div><div class="f"><span class="lbl">Photo shown with the question</span><div class="orow"><button type="button" class="thumb" data-qphoto="1" style="width:72px;height:72px;'+(q.photo?'background-image:url('+blobUrl(q.photo)+')':'')+'" aria-label="Upload question photo">'+(q.photo?'':'Add photo')+'</button><div style="display:flex;flex-direction:column;gap:6px;flex:1"><input type="text" data-f="photoCaption" value="'+esc(q.photoCaption||'')+'" placeholder="Caption, e.g. Exhibit A" aria-label="Photo caption">'+(q.photo?'<button type="button" class="hbtn sm" data-qphoto-del="1" style="align-self:flex-start">Remove photo</button>':'')+'</div></div></div>'+
    '<div class="f"><label for="f-cue">Host cue (only you see it)</label><textarea id="f-cue" data-f="cue" rows="2">'+esc(q.cue||'')+'</textarea></div>'+
    '<div class="frow"><button class="hbtn" type="button" id="dup">Duplicate</button><button class="hbtn dng" type="button" id="del">Delete</button></div>';
    var d=$r('#del');if(d)confirmBtn(d,'Delete',async function(){var id=q.id;H.edit=null;try{await DB.doc('questions/'+id).delete()}catch(e){toast('Could not delete.')}if(S.state.qid===id)setState({qid:null,phase:'lobby'});buildEditor()});
  }
  var flush=debounce(function(){var id=H.edit;if(!id)return;var pat=H.pend;H.pend={};if(Object.keys(pat).length)saveQ(id,pat)},400);
  function editPatch(patch,now){
    var id=H.edit;if(!id)return;
    if(now){saveQ(id,patch)}else{H.pend=Object.assign(H.pend,patch);var i=S.qs.findIndex(function(q){return q.id===id});if(i>-1)S.qs[i]=Object.assign({},S.qs[i],patch);tick();flush()}
  }
  /* --- theme panel --- */
  function buildLook(){
    var t=theme(),p=$r('#panel');
    var cols=[['bg','Background'],['surface','Cards'],['line','Lines'],['text','Text'],['muted','Soft text'],['a1','Accent 1'],['a2','Accent 2'],['a3','Accent 3']];
    p.innerHTML='<div class="f"><span class="lbl">Presets</span><div class="presets">'+Object.keys(PRESETS).map(function(k){var s=PRESETS[k];return '<button type="button" class="preset'+(t.preset===k?' on':'')+'" data-preset="'+k+'"><div class="st">'+[s.bg,s.surface,s.a1,s.a2,s.a3].map(function(c){return '<i style="background:'+c+'"></i>'}).join('')+'</div>'+esc(s.name)+'</button>'}).join('')+'</div></div><div class="hr"></div><div class="cols">'+cols.map(function(c){return '<div class="f"><label for="c-'+c[0]+'">'+c[1]+'</label><input id="c-'+c[0]+'" type="color" data-color="'+c[0]+'" value="'+t[c[0]]+'"></div>'}).join('')+'</div><div class="hr"></div>'+
    '<div class="f"><label for="t-font">Type pairing</label><select id="t-font" data-th="font">'+Object.keys(FONT_PAIRS).map(function(k){return '<option value="'+k+'"'+(t.font===k?' selected':'')+'>'+FONT_PAIRS[k].name+'</option>'}).join('')+'</select></div>'+
    '<div class="frow"><div class="f"><label for="t-pat">Background</label><select id="t-pat" data-th="pattern">'+[['none','Plain'],['dots','Dots'],['grid','Grid'],['rings','Rings']].map(function(k){return '<option value="'+k[0]+'"'+(t.pattern===k[0]?' selected':'')+'>'+k[1]+'</option>'}).join('')+'</select></div><div class="f"><label for="t-al">Question alignment</label><select id="t-al" data-th="align"><option value="left"'+(t.align==='left'?' selected':'')+'>Left</option><option value="center"'+(t.align==='center'?' selected':'')+'>Centered</option></select></div></div>'+
    '<div class="f"><label for="t-rad">Corner roundness: <span id="rv">'+t.radius+'</span>px</label><input id="t-rad" type="range" min="0" max="36" value="'+t.radius+'" data-thn="radius"></div>'+
    '<div class="f"><label for="t-sc">Question text size: <span id="sv">'+Math.round((t.scale||1)*100)+'</span>%</label><input id="t-sc" type="range" min="70" max="130" value="'+Math.round((t.scale||1)*100)+'" data-thn="scale"></div>'+
    '<div class="f"><label for="t-spot">Spotlight seconds per answer</label><input id="t-spot" type="number" min="3" max="20" value="'+(cfg().spotlightSecs||6)+'" data-cfgn="spotlightSecs"></div>';
  }
  /* --- share panel --- */
  function buildShare(){
    var c=cfg(),u=baseUrl(),p=$r('#panel');
    p.innerHTML='<div class="f"><label for="g-title">Game title</label><input id="g-title" type="text" data-cfg="title" value="'+esc(c.title)+'"></div><div class="f"><label for="g-tag">Welcome line</label><textarea id="g-tag" rows="2" data-cfg="tagline">'+esc(c.tagline)+'</textarea></div><div class="f"><label for="g-fin">Finale message</label><textarea id="g-fin" rows="2" data-cfg="finale">'+esc(c.finale)+'</textarea></div><div class="hr"></div>'+
    '<div class="f"><label for="g-base">Page address</label><input id="g-base" type="url" data-cfg="baseUrl" value="'+esc(c.baseUrl||'')+'" placeholder="'+esc(u)+'"><small>The page address guests open. Links and the QR code are built from it.</small></div>'+
    '<div class="f"><span class="lbl">Guest link</span><div class="linkbox"><input type="text" readonly value="'+esc(u+'#play')+'" aria-label="Guest link"><button class="hbtn sm" type="button" data-copy="'+esc(u+'#play')+'">Copy</button></div></div>'+
    '<div class="f"><span class="lbl">TV link (open on the big screen)</span><div class="linkbox"><input type="text" readonly value="'+esc(u+'#tv')+'" aria-label="TV link"><button class="hbtn sm" type="button" data-copy="'+esc(u+'#tv')+'">Copy</button></div></div>'+
    '<div class="hqr" id="hqr"></div>'+
    '<div class="note">Guests only need the guest link. No account or sign-in. Use the same address for the TV link, with #tv on the end.</div><div class="hr"></div>'+
    '<div class="h-title"><span>Rehearse</span></div><div class="frow"><button class="hbtn sm" type="button" data-sim="12">Add 12 sample answers</button><button class="hbtn sm" type="button" data-sim="30">Add 30</button></div><button class="hbtn sm" type="button" id="rmsim">Remove all sample guests</button>'+
    '<div class="hr"></div><div class="h-title"><span>Reset</span></div><button class="hbtn sm dng" type="button" id="clrq">Clear answers on live question</button><button class="hbtn sm dng" type="button" id="clrall">Clear all answers and return to lobby</button>';
    qrInto($r('#hqr'),u+'#play',150);
    confirmBtn($r('#clrq'),'',async function(){var q=curQ();if(!q)return;var n=await deleteAnswers(function(d){return d.q===q.id});toast('Cleared '+n+' answers.')});
    confirmBtn($r('#clrall'),'',async function(){var n=await deleteAnswers(function(){return true});await setState({qid:null,phase:'lobby',locked:false});toast('Cleared '+n+' answers.')});
  }
  function showTab(t){H.tab=t;updSeg();if(t==='edit'){if(!H.edit&&S.qs.length)H.edit=(curQ()||S.qs[0]).id;buildEditor()}else if(t==='look')buildLook();else buildShare()}
  /* --- actions --- */
  function goto(i){if(i<0||i>=S.qs.length)return;return setState({qid:S.qs[i].id,phase:'collect',locked:false})}
  function act(a){
    var i=qIndex();
    if(a==='start0')goto(0);
    else if(a==='reveal')setState({phase:'reveal',locked:true});
    else if(a==='lock')setState({locked:!S.state.locked});
    else if(a==='reopen')setState({phase:'collect',locked:false});
    else if(a==='next'){if(i+1<S.qs.length)goto(i+1);else setState({phase:'end'})}
    else if(a==='prev'){if(i>0)goto(i-1)}
    else if(a==='lobby')setState({qid:null,phase:'lobby',locked:false});
    else if(a==='finale')setState({phase:'end'});
  }
  function primary(){var ph=S.state.phase;if(ph==='lobby'||!curQ())act('start0');else if(ph==='collect')act('reveal');else if(ph==='reveal')act('next');else act('lobby')}
  /* --- events --- */
  root.addEventListener('click',async function(e){
    var el=e.target.closest('button,[data-q]');if(!el)return;
    if(el.dataset.copy!=null){try{await navigator.clipboard.writeText(el.dataset.copy);toast('Copied.')}catch(x){toast('Copy failed. Select the text and copy it.')}return}
    if(el.dataset.signout){B.auth.signOut();return}
    if(el.dataset.pv){H.pv=el.dataset.pv;updSeg();tick();return}
    if(el.dataset.tab){showTab(el.dataset.tab);return}
    if(el.dataset.act){act(el.dataset.act);return}
    if(el.dataset.go){var ix=S.qs.findIndex(function(q){return q.id===el.dataset.go});goto(ix);return}
    if(el.dataset.mv){var id=el.dataset.id,d=+el.dataset.mv,k=S.qs.findIndex(function(q){return q.id===id}),o=S.qs[k+d];if(!o)return;var a=S.qs[k];var an=a.n,on=o.n;await Promise.all([saveQ(a.id,{n:on}),saveQ(o.id,{n:an})]);S.qs.sort(function(x,y){return x.n-y.n});tick();return}
    if(el.id==='addq'){var nq=newQuestion(),id2='q'+uid();S.qs.push(Object.assign({id:id2},nq));H.edit=id2;try{await DB.doc('questions/'+id2).set(nq)}catch(x){toast('Could not add.')}showTab('edit');tick();return}
    if(el.dataset.feat){saveMod({featured:S.mod.featured===el.dataset.feat?null:el.dataset.feat});return}
    if(el.dataset.hide){var hs=new Set(S.mod.hidden||[]);if(hs.has(el.dataset.hide))hs.delete(el.dataset.hide);else hs.add(el.dataset.hide);saveMod({hidden:Array.from(hs)});return}
    if(el.dataset.acc){editPatch({accent:+el.dataset.acc},true);buildEditor();return}
    if(el.id==='addopt'){var q=selQ();var opts=(q.options||[]).concat([{id:'o'+uid(),label:'',photo:null}]);editPatch({options:opts},true);buildEditor();return}
    if(el.dataset.optdel!=null){var q2=selQ(),o2=(q2.options||[]).slice();o2.splice(+el.dataset.optdel,1);editPatch({options:o2},true);buildEditor();return}
    if(el.dataset.optphoto!=null){var q3=selQ(),idn=await uploadPhoto();if(idn){var o3=(q3.options||[]).map(function(x,j){return j===+el.dataset.optphoto?Object.assign({},x,{photo:idn}):x});editPatch({options:o3},true);buildEditor()}return}
    if(el.dataset.qphoto){var idq=await uploadPhoto();if(idq){editPatch({photo:idq},true);buildEditor()}return}
    if(el.dataset.qphotoDel){editPatch({photo:null},true);buildEditor();return}
    if(el.id==='dup'){var q4=selQ();var cp=Object.assign({},q4);delete cp.id;cp.n=(q4.n||0)+0.5;cp.options=(q4.options||[]).map(function(x){return Object.assign({},x,{id:'o'+uid()})});var nid='q'+uid();S.qs.push(Object.assign({id:nid},cp));S.qs.sort(function(x,y){return x.n-y.n});H.edit=nid;try{await DB.doc('questions/'+nid).set(cp)}catch(x){toast('Could not duplicate.')}buildEditor();tick();return}
    if(el.dataset.preset){var pr=PRESETS[el.dataset.preset];saveCfg({theme:{preset:el.dataset.preset,bg:pr.bg,surface:pr.surface,line:pr.line,text:pr.text,muted:pr.muted,a1:pr.a1,a2:pr.a2,a3:pr.a3,font:pr.font,pattern:pr.pattern}});buildLook();return}
    if(el.dataset.sim){await simulate(+el.dataset.sim);return}
    if(el.id==='rmsim'){await removeSim();return}
    var row=e.target.closest('[data-q]');if(row){H.edit=row.dataset.q;if(H.tab!=='edit')H.tab='edit';showTab('edit');tick()}
  });
  root.addEventListener('keydown',function(e){var row=e.target.closest&&e.target.closest('[data-q]');if(row&&e.target===row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();H.edit=row.dataset.q;showTab('edit');tick()}});
  root.addEventListener('input',function(e){
    var t=e.target;
    if(t.dataset.f){var f=t.dataset.f,v=t.value;if(['maxLen','exactWords','maxPerGuest'].indexOf(f)>-1){v=parseInt(v,10);if(isNaN(v))return;if(f==='maxLen')v=Math.max(5,Math.min(200,v));if(f==='exactWords')v=Math.max(0,Math.min(10,v));if(f==='maxPerGuest')v=Math.max(1,Math.min(5,v))}var o={};o[f]=v;if(f!=='kind'&&f!=='display'&&f!=='merge')editPatch(o)}
    else if(t.dataset.opt!=null){var q=selQ();var opts=(q.options||[]).map(function(x,j){return j===+t.dataset.opt?Object.assign({},x,{label:t.value}):x});editPatch({options:opts})}
    else if(t.dataset.color){var tt={};tt[t.dataset.color]=t.value;tt.preset='custom';saveCfgDeb({theme:tt})}
    else if(t.dataset.thn){var v2=+t.value;if(t.dataset.thn==='scale'){v2=v2/100;$r('#sv').textContent=Math.round(v2*100)}else $r('#rv').textContent=v2;var o2={};o2[t.dataset.thn]=v2;saveCfgDeb({theme:o2})}
    else if(t.dataset.cfg){var oc={};oc[t.dataset.cfg]=t.value;saveCfgDeb(oc)}
  });
  root.addEventListener('change',function(e){
    var t=e.target;
    if(t.dataset.f==='kind'){var q=selQ(),k=t.value,pat={kind:k,display:DISPLAYS[k][0][0]};if(k!=='text'&&(!q.options||q.options.length<2)){pat.options=[{id:'o'+uid(),label:'',photo:null},{id:'o'+uid(),label:'',photo:null}]}editPatch(pat,true);buildEditor()}
    else if(t.dataset.f==='display'){editPatch({display:t.value},true)}
    else if(t.dataset.f==='merge'){editPatch({merge:t.checked},true)}
    else if(t.dataset.th){var o={};o[t.dataset.th]=t.value;if(t.dataset.th==='font'||t.dataset.th==='pattern')o.preset='custom';saveCfg({theme:o})}
    else if(t.dataset.cfgn){saveCfg({spotlightSecs:Math.max(3,Math.min(20,+t.value||6))})}
    else if(t.dataset.cfg==='baseUrl'){saveCfg({baseUrl:t.value.trim()});buildShare()}
  });
  var saveCfgDeb=(function(){var pend={};var go=debounce(function(){var p=pend;pend={};saveCfg(p)},350);return function(patch){if(patch.theme){pend.theme=Object.assign(pend.theme||{},patch.theme)}Object.keys(patch).forEach(function(k){if(k!=='theme')pend[k]=patch[k]});var cur=S.config||Object.assign({},DEFAULT_CFG);S.config=Object.assign({},cur,patch.theme?{theme:Object.assign({},cur.theme||{},patch.theme)}:{},Object.keys(patch).reduce(function(o,k){if(k!=='theme')o[k]=patch[k];return o},{}));applyTheme();tick();go()}})();
  var onKey=function(e){
    var tg=e.target;if(tg&&(/INPUT|TEXTAREA|SELECT/.test(tg.tagName)||tg.isContentEditable))return;
    if(e.key==='ArrowRight'||(e.key===' '&&tg&&tg.tagName!=='BUTTON')){e.preventDefault();primary()}
    else if(e.key==='ArrowLeft'){act('prev')}
  };
  window.addEventListener('keydown',onKey);
  var first=true;
  function update(){
    if(first&&S.loaded.qs){first=false;if(!H.edit&&S.qs.length)H.edit=(curQ()||S.qs[0]).id;showTab(H.tab)}
    if(H.edit&&!selQ()&&S.loaded.qs){H.edit=S.qs[0]?S.qs[0].id:null;if(H.tab==='edit')buildEditor()}
    updChips();updList();updCtl();updMod();updSeg();
    H.tv.update(pvCtx());H.ph.update();
  }
  return {update:update,destroy:function(){window.removeEventListener('keydown',onKey);H.tv.destroy()}};
}

/* ================= Home + router ================= */
function createHome(root){
  var c=cfg();
  root.innerHTML='<div class="home"><h1>'+fancyTitle(c.title)+'</h1><p>'+esc(c.tagline)+'</p><button class="big" type="button" data-go="play">Join the game</button><div class="row"><button class="sm" type="button" data-go="tv">Open TV screen</button>'+'<button class="sm" type="button" data-go="host">Host login</button>'+'</div></div>';
  root.addEventListener('click',function(e){var b=e.target.closest('[data-go]');if(b)go(b.dataset.go)});
  return {update:function(){},destroy:function(){}};
}
function go(r){S.route=r;try{location.hash=r==='home'?'':r}catch(e){}mount()}
function mount(){
  if(view&&view.destroy)try{view.destroy()}catch(e){}
  view=null;var app=$('#app');app.innerHTML='';app.className='';
  document.body.className='r-'+S.route;
  if(!DB){app.innerHTML='<div class="msg"><h1>'+(B&&!B.configured?'Backend not set up yet':'Could not reach the game server')+'</h1><p>'+(B&&!B.configured?'Add your Supabase project URL and anon key to config.js (see README), then reload.':'Check your connection and reload the page.')+'</p></div>';return}
  if(S.route==='tv'){var tvv=createTV(app);view={update:function(){tvv.update(liveCtx())},destroy:function(){tvv.destroy()}}}
  else if(S.route==='play')view=createPlay(app);
  else if(S.route==='host')view=createHost(app);
  else view=createHome(app);
  tick();
}
function createLogin(root){
  var busy=false,msg='';
  function draw(signedIn){
    root.innerHTML='<div class="msg host" style="max-width:420px;text-align:left"><h1 style="font-family:var(--fd)">Host sign-in</h1>'+(signedIn?'<p class="muted">You are signed in as '+esc(signedIn)+', but that account is not on the host list. Ask the person who set up the game to add it, or sign in with another account.</p><button class="hbtn" type="button" id="lo">Sign out</button>':'<p class="muted">Sign in to run the game and edit questions.</p><form id="lf" class="f" style="gap:12px"><div class="f"><label for="le">Email</label><input id="le" type="email" autocomplete="username" required></div><div class="f"><label for="lp">Password</label><input id="lp" type="password" autocomplete="current-password"></div><button class="hbtn pri" type="submit">Sign in</button><button class="hbtn" type="button" id="lm">Email me a sign-in link instead</button></form>')+'<div class="muted" id="lmsg" role="status">'+esc(msg)+'</div></div>';
    var f=$('#lf',root);
    if(f)f.addEventListener('submit',async function(e){e.preventDefault();if(busy)return;busy=true;msg='Signing in…';$('#lmsg',root).textContent=msg;try{await B.auth.signIn($('#le',root).value.trim(),$('#lp',root).value);msg=''}catch(x){msg=(x&&x.message)||'Could not sign in.';draw(false)}busy=false});
    var lm=$('#lm',root);if(lm)lm.addEventListener('click',async function(){var em=$('#le',root).value.trim();if(!em){$('#lmsg',root).textContent='Enter your email first.';return}try{await B.auth.magic(em);msg='Check your email for the sign-in link.'}catch(x){msg=(x&&x.message)||'Could not send the link.'}$('#lmsg',root).textContent=msg});
    var lo=$('#lo',root);if(lo)lo.addEventListener('click',function(){B.auth.signOut()});
  }
  draw(false);
  B.auth.session().then(function(se){if(se&&se.user&&se.user.email)draw(se.user.email)});
  return {update:function(){},destroy:function(){}};
}
async function refreshAuth(){
  try{S.canEdit=B&&B.isHost?await B.isHost():false}catch(e){S.canEdit=false}
  ASSETS=S.canEdit&&B.assets?B.assets:null;
}
async function init(){
  var m=(location.hash||'').replace('#','').toLowerCase();S.route=['host','tv','play'].indexOf(m)>-1?m:'home';
  applyTheme();
  $('#app').innerHTML='<div class="msg"><p class="muted" style="color:var(--muted)">Connecting…</p></div>';
  B=window.RT_BACKEND||null;
  var ok=false;try{ok=B?await B.init():false}catch(e){console.error(e)}
  DB=ok?B.db:null;
  if(ok){await refreshAuth();B.auth.onChange(async function(){var was=S.canEdit;await refreshAuth();if(S.route==='host'&&was!==S.canEdit)mount()})}
  var g=null;try{g=localStorage.getItem('rt_gid');if(!g){g='g'+uid()+uid();localStorage.setItem('rt_gid',g)}}catch(e){g=g||('g'+uid()+uid())}
  S.gid=g;
  if(DB)subscribeAll();
  mount();
  window.addEventListener('hashchange',function(){var h=(location.hash||'').replace('#','').toLowerCase(),r=['host','tv','play'].indexOf(h)>-1?h:'home';if(r!==S.route){S.route=r;mount()}});
}
init();
})();
