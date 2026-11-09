'use strict';
const $ = id => document.getElementById(id);
const make = (tag, cls, content) => {const e=document.createElement(tag);if(cls)e.className=cls;if(content!==undefined)e.textContent=content;return e;};
let payload=null, audio=null, voices=[], stopTimer=null, requestId=0, audioFrame=0, playbackGeneration=0;
function stopAudio(){playbackGeneration++;cancelAnimationFrame(audioFrame);clearTimeout(stopTimer);voices.forEach(v=>{try{v.stop();}catch{}});voices=[];document.body.classList.remove('is-playing');document.querySelectorAll('.sounding').forEach(n=>n.classList.remove('sounding'));document.querySelectorAll('[data-playing]').forEach(b=>{b.textContent=b.dataset.label;if(b.dataset.ariaLabel)b.setAttribute('aria-label',b.dataset.ariaLabel);delete b.dataset.playing;});$('audio-status').textContent='';}
async function play(notes, button, label, toggle=true){
  if(toggle&&button.dataset.playing){stopAudio();return;}
  stopAudio();
  const generation=playbackGeneration;
  try{
    audio??=new (window.AudioContext||window.webkitAudioContext)();await audio.resume();
    if(generation!==playbackGeneration)return;
    button.dataset.label=button.textContent;button.dataset.ariaLabel=button.getAttribute('aria-label')||button.textContent;button.setAttribute('aria-label','Stop playback');button.dataset.playing='true';button.textContent='Stop';
    const start=audio.currentTime+.05;
    notes.forEach((chord,i)=>chord.forEach(pc=>{
      const osc=audio.createOscillator(), gain=audio.createGain(), t=start+i*.7;
      osc.type='triangle';osc.frequency.value=440*2**((48+pc-69)/12);
      gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.065,t+.04);gain.gain.exponentialRampToValueAtTime(.001,t+.65);
      osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.7);voices.push(osc);
    }));
    $('audio-status').textContent=`Playing ${label}`;
    document.body.classList.add('is-playing');
    let previous=-1;
    const highlight=()=>{
      const index=Math.floor((audio.currentTime-start)/.7);
      if(index!==previous){previous=index;const key=notes[index]?.join(',');document.querySelectorAll('.node').forEach(node=>node.classList.toggle('sounding',node.dataset.notes===key));}
      audioFrame=requestAnimationFrame(highlight);
    };
    audioFrame=requestAnimationFrame(highlight);
    stopTimer=setTimeout(stopAudio,(notes.length*.7+.15)*1000);
  }catch{stopAudio();$('audio-status').textContent='Audio is unavailable in this browser.';}
}
function chips(chords){const row=make('div','chord-strip');chords.forEach((name,i)=>{if(i)row.append(make('span','chord-arrow','→'));row.append(make('span','chord',name));});return row;}
function svgEl(tag,attrs,text){const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);if(text!==undefined)el.textContent=text;return el;}
const HEX_LAYOUT = [{"x":7,"y":0,"name":"Bbm"},{"x":9,"y":0,"name":"Bb"},{"x":4,"y":1,"name":"F#m"},{"x":6,"y":1,"name":"F#"},{"x":10,"y":1,"name":"Gm"},{"x":12,"y":1,"name":"G"},{"x":1,"y":2,"name":"Dm"},{"x":3,"y":2,"name":"D"},{"x":7,"y":2,"name":"Ebm"},{"x":9,"y":2,"name":"Eb"},{"x":13,"y":2,"name":"Em"},{"x":15,"y":2,"name":"E"},{"x":0,"y":3,"name":"Bb"},{"x":4,"y":3,"name":"Bm"},{"x":6,"y":3,"name":"B"},{"x":10,"y":3,"name":"Cm"},{"x":12,"y":3,"name":"C"},{"x":16,"y":3,"name":"C#m"},{"x":18,"y":3,"name":"C#"},{"x":1,"y":4,"name":"Gm"},{"x":3,"y":4,"name":"G"},{"x":7,"y":4,"name":"Abm"},{"x":9,"y":4,"name":"Ab"},{"x":13,"y":4,"name":"Am"},{"x":15,"y":4,"name":"A"},{"x":19,"y":4,"name":"Bbm"},{"x":4,"y":5,"name":"Em"},{"x":6,"y":5,"name":"E"},{"x":10,"y":5,"name":"Fm"},{"x":12,"y":5,"name":"F"},{"x":16,"y":5,"name":"F#m"},{"x":18,"y":5,"name":"F#"},{"x":7,"y":6,"name":"C#m"},{"x":9,"y":6,"name":"C#","label":"D♭"},{"x":13,"y":6,"name":"Dm"},{"x":15,"y":6,"name":"D"},{"x":10,"y":7,"name":"Bbm"},{"x":12,"y":7,"name":"Bb"}];
function drawGraph(data){
  const svg=$('graph');
  svg.replaceChildren(svgEl('title',{id:'graph-title'},'Hexagonal Tonnetz chord map'),svgEl('desc',{},'Major chords use uppercase names; minor chords use lowercase. Boundary chords repeat to show the hexagonal lattice. Repeated copies play the same triad. Each line is one real P, L, or R move. Brighter lines trace shortest routes between progression chords.'));
  const defs=svgEl('defs',{});
  const glass=svgEl('radialGradient',{id:'node-glass',cx:'28%',cy:'15%',r:'90%'});glass.append(svgEl('stop',{offset:'0%','stop-color':'#dfbfa5','stop-opacity':'.85'}),svgEl('stop',{offset:'50%','stop-color':'#be977c','stop-opacity':'.75'}),svgEl('stop',{offset:'100%','stop-color':'#75554c','stop-opacity':'.8'}));
  const selectedGlass=svgEl('radialGradient',{id:'selected-glass',cx:'30%',cy:'20%',r:'85%'});selectedGlass.append(svgEl('stop',{offset:'0%','stop-color':'#fff2de'}),svgEl('stop',{offset:'50%','stop-color':'#efbd94'}),svgEl('stop',{offset:'100%','stop-color':'#b47b63'}));defs.append(glass,selectedGlass);svg.append(defs);
  const selected=new Set(data.target.chords), routeEdges=new Set();
  data.target.transitions.forEach(route=>route.chords.slice(1).forEach((to,i)=>routeEdges.add([route.chords[i],to].sort().join('|'))));
  const byName=new Map(data.graph.nodes.map(node=>[node.name,node]));
  const relationships=new Map(data.graph.edges.map(edge=>[[data.graph.nodes.find(n=>n.id===edge.source).name,data.graph.nodes.find(n=>n.id===edge.target).name].sort().join('|'),edge.operation]));
  const vertices=HEX_LAYOUT.map(vertex=>({...vertex,px:42+vertex.x*57,py:46+vertex.y*85}));
  const labels=[];
  vertices.forEach((a,i)=>vertices.slice(i+1).forEach(b=>{
    const dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y);
    if(!((dx===2&&dy===0)||(dx===1&&dy===1)))return;
    const key=[a.name,b.name].sort().join('|'),operation=relationships.get(key);
    if(!operation)return;
    const reference=(a.name==='C'&&a.x===12&&a.y===3)||(b.name==='C'&&b.x===12&&b.y===3);
    const edge=svgEl('line',{x1:a.px,y1:a.py,x2:b.px,y2:b.py,class:'edge'+(routeEdges.has(key)?' path':'')+(reference?' reference-edge':''),'data-from':a.name,'data-to':b.name,'data-operation':operation});edge.append(svgEl('title',{},`${a.name} — ${operation} — ${b.name}`));svg.append(edge);
    if(reference)labels.push(svgEl('text',{x:(a.px+b.px)/2+(operation==='P'?0:operation==='L'?26:17),y:(a.py+b.py)/2+(operation==='L'?20:-12),class:'operation-label'},operation));
  }));
  labels.forEach(label=>svg.append(label));
  if(matchMedia('(max-width:650px)').matches)requestAnimationFrame(()=>{const wrap=svg.parentElement;wrap.scrollLeft=(wrap.scrollWidth-wrap.clientWidth)/2;});
  vertices.forEach(vertex=>{
    const node=byName.get(vertex.name);
    if(!node)return;
    const isMinor=node.quality==='minor';
    // The root B stays a letter; only a following b is a flat accidental.
    const display=vertex.label||(isMinor?node.name.slice(0,-1).toLowerCase():node.name).replace(/([A-Ga-g])b/g,'$1♭').replaceAll('#','♯');
    const g=svgEl('g',{class:'node'+(selected.has(node.name)?' selected':''),role:'button',tabindex:'0','data-notes':node.notes.join(','),'data-chord':node.name,'aria-label':`Hear ${node.name} ${node.quality} triad`,transform:`translate(${vertex.px} ${vertex.py})`});
    g.append(svgEl('circle',{r:22}),svgEl('text',{},display));
    const activate=()=>play([node.notes],$('listen'),node.name,false);
    g.addEventListener('click',activate);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});svg.append(g);
  });
}

function routeList(parent,routes){if(!routes.length){parent.append(make('p','route','Single chord — no transitions.'));return;}routes.forEach(r=>{const line=make('p','route',r.chords.map((c,i)=>i?` —${r.operations[i-1]}→ ${c}`:c).join(''));line.append(make('small','',`  · ${r.distance} move${r.distance===1?'':'s'}`));parent.append(line);});}
function render(data){
  payload=data;$('listen').disabled=false;$('current-title').textContent='Chord map';$('current-chords').replaceChildren(chips(data.target.chords));drawGraph(data);$('results').replaceChildren();
  const matches=data.results.slice(0,5);$('result-count').textContent=`${matches.length} of ${data.results.length} examples`;
  matches.forEach((match,index)=>{
    const card=make('article','match'),summary=make('div','match-summary'),body=make('div');
    body.append(make('h3','',match.title),make('p','match-sub',match.chords.join('  ·  ')));
    const score=make('div','score'),percent=(match.similarity*100).toFixed(1),track=make('div','score-track'),fill=make('div','score-fill');fill.style.setProperty('--score',`${percent}%`);track.append(fill);score.setAttribute('aria-label',`${percent}% harmonic similarity`);score.append(make('strong','',`${percent}%`),make('small','','similarity'),track);summary.append(make('span','rank',String(index+1).padStart(2,'0')),body,score);
    const tools=make('div','match-tools'),details=make('details'),toggle=make('summary','','Details');details.append(toggle,make('p','explanation',match.explanation),make('p','detail-label',`Aligned candidate · +${match.shift} semitones`),chips(match.aligned.chords));
    const shared=[...new Set(data.target.chords.filter(c=>match.aligned.chords.includes(c)))];details.append(make('p','explanation',`Shared triads after alignment: ${shared.join(', ')||'none'}. Average P/L/R cost: ${match.distance.toFixed(3)}.`));
    const scroll=make('div','table-scroll'),table=make('table','alignment'),head=make('thead'),tr=make('tr');['Your chord','Aligned match','P/L/R route'].forEach(t=>tr.append(make('th','',t)));head.append(tr);const tbody=make('tbody');match.alignment.forEach(pair=>{const row=make('tr');row.append(make('td','',pair.from),make('td','',pair.to),make('td','',pair.operations.join(' → ')||'Identical'));tbody.append(row);});table.append(head,tbody);scroll.append(table);details.append(scroll,make('p','detail-label','Your progression · shortest paths'));routeList(details,data.target.transitions);details.append(make('p','detail-label','Aligned candidate · shortest paths'));routeList(details,match.transitions);
    const listen=make('button','quiet','▷ Play');listen.type='button';listen.setAttribute('aria-label',`Listen to ${match.title} in the aligned key`);listen.onclick=()=>play(match.aligned.notes,listen,`${match.title}, aligned key`);tools.append(details,listen);card.append(summary,tools);$('results').append(card);
  });
}
async function recommend(){
  const id=++requestId;stopAudio();$('error').textContent='';$('find').disabled=true;$('find').textContent='Comparing…';document.body.classList.add('loading');$('analysis-area').setAttribute('aria-busy','true');
  try{const response=await fetch('/api/recommend',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({progression:$('progression').value,transpose:$('transpose').checked})});const data=await response.json();if(id!==requestId)return;if(!response.ok)throw new Error(data.error||'Could not compare these chords.');render(data);$('status').textContent='Matches updated.';}
  catch(error){if(id!==requestId)return;$('error').textContent=error.message;$('status').textContent='Check your chords and try again.';}
  finally{if(id===requestId){$('find').disabled=false;$('find').replaceChildren(document.createTextNode('Compare'),make('span','','→'));document.body.classList.remove('loading');$('analysis-area').setAttribute('aria-busy','false');}}
}
$('composer-form').addEventListener('submit',e=>{e.preventDefault();recommend();});
$('progression').addEventListener('input',()=>{document.querySelectorAll('.sample').forEach(b=>b.setAttribute('aria-pressed','false'));$('status').textContent='Press Compare to update.';});
$('transpose').addEventListener('change',()=>{$('status').textContent='Press Compare to update.';});
$('listen').onclick=()=>{if(payload)play(payload.target.notes,$('listen'),'your progression');};
window.addEventListener('pagehide',stopAudio);
async function init(){try{const response=await fetch('/api/songs');if(!response.ok)throw new Error();const songs=await response.json();songs.forEach((song,i)=>{const b=make('button','sample');b.type='button';b.setAttribute('aria-pressed',String(i===1));b.append(make('strong','',song.title),make('small','',song.chords.join(' · ')));b.onclick=()=>{$('progression').value=song.chords.join(' ');document.querySelectorAll('.sample').forEach(e=>e.setAttribute('aria-pressed',String(e===b)));recommend();};$('samples').append(b);});await recommend();}catch{$('error').textContent='The local engine is unavailable. Start python app.py, then reload this page.';}}
init();

$('about-open').onclick=()=>$('about').showModal();
$('about-close').onclick=()=>$('about').close();
$('about').addEventListener('click',event=>{if(event.target===$('about')){const box=$('about').getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)$('about').close();}});
const glassSurface=document.querySelector('.workspace');
if(matchMedia('(hover:hover) and (prefers-reduced-motion:no-preference)').matches){
  let glassFrame=0;
  glassSurface.addEventListener('pointermove',event=>{cancelAnimationFrame(glassFrame);glassFrame=requestAnimationFrame(()=>{const box=glassSurface.getBoundingClientRect();glassSurface.style.setProperty('--glass-x',`${(event.clientX-box.left)/box.width*100}%`);glassSurface.style.setProperty('--glass-y',`${(event.clientY-box.top)/box.height*100}%`);});});
  glassSurface.addEventListener('pointerleave',()=>{cancelAnimationFrame(glassFrame);glassSurface.style.removeProperty('--glass-x');glassSurface.style.removeProperty('--glass-y');});
}
const graphViewport=matchMedia('(max-width:650px)');
function fitGraph(){ $('graph').setAttribute('viewBox','0 0 1166 695'); }
graphViewport.addEventListener('change',fitGraph);
fitGraph();
