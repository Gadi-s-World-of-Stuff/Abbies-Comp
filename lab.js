'use strict';
const $ = id => document.getElementById(id);
const el = (tag, text, cls) => { const n = document.createElement(tag); if(text !== undefined)n.textContent=text; if(cls)n.className=cls; return n; };
let catalog=[], selected=new Set(), study, currentPair, stepIndex=0, revision=0;
const colors=['#b85749','#3b9a7e','#8261a3','#368daa','#a58337'];
async function post(url,data){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const body=await r.json();if(!r.ok)throw Error(body.error);return body;}
function dirty(){ revision++; $('report').hidden=true;$('empty').hidden=false;$('count').textContent=`${selected.size} of 5 selected`;$('analyze').disabled=selected.size<2||selected.size>5;$('status').textContent=''; }
function renderCatalog(){ $('catalog').replaceChildren();catalog.forEach((s,i)=>{const label=el('label',undefined,'song'),input=el('input');input.type='checkbox';input.checked=selected.has(i);input.disabled=selected.size>=5&&!input.checked;input.addEventListener('change',()=>{input.checked?selected.add(i):selected.delete(i);dirty();$('catalog').querySelectorAll('input').forEach(box=>{box.disabled=selected.size>=5&&!box.checked;});});const copy=el('span');copy.append(el('strong',s.title),el('small',`${s.catalog_id?'Song excerpt':s.custom?'Your song':'Example'} · ${s.chords.join(' → ')}`));label.append(input,copy);$('catalog').append(label);});}
$('transpose').addEventListener('change',dirty);
$('analyze').addEventListener('click',analyze);
async function analyze(){ const requestRevision=++revision; $('analyze').disabled=true;$('status').textContent='Calculating shortest routes and DTW alignments…';try{const result=await post('/api/analyze',{songs:[...selected].map(i=>({title:catalog[i].title,progression:catalog[i].chords.join(' '),...(catalog[i].catalog_id?{catalog_id:catalog[i].catalog_id}:{})})),transpose:$('transpose').checked});if(requestRevision!==revision)return;study=result;renderStudy();$('status').textContent=`Study complete · ${study.songs.length} songs · ${study.comparisons.length} directed comparisons`;}catch(e){if(requestRevision===revision)$('status').textContent=e.message;}finally{if(requestRevision===revision)$('analyze').disabled=selected.size<2||selected.size>5;}}
$('add-song').addEventListener('submit',async e=>{e.preventDefault();const title=$('song-title').value.trim(),progression=$('song-chords').value.trim();if(!title)return;try{const valid=await post('/api/recommend',{progression,transpose:false});catalog.push({title,chords:valid.target.chords,custom:true});if(selected.size<5)selected.add(catalog.length-1);try{localStorage.setItem('tonnetz-lab-songs',JSON.stringify(catalog.filter(s=>s.custom)));}catch{}dirty();renderCatalog();$('add-song').reset();$('add-status').textContent='Added. Select your study set and analyze.';}catch(err){$('add-status').textContent=err.message;}});
function renderStudy(){ $('export-status').textContent=''; $('report').hidden=false;$('empty').hidden=true;const s=study.summary;$('metrics').replaceChildren();[[s.mean_distance.toFixed(3),'Mean directed DTW cost'],[s.shared_chords.length,'Shared triads in common frame'],[`${s.exact_pairs} / ${s.pair_count}`,'Pairs with zero cost both ways']].forEach(([value,label])=>{const n=el('div',undefined,'metric');n.append(el('strong',value),el('span',label));$('metrics').append(n);});$('findings').textContent=`Using “${s.anchor}” as the common frame, the selected progressions share ${s.shared_chords.length?s.shared_chords.join(', '):'no triads across every song'}. The lowest directed cost connects “${study.songs[s.closest[0]].title}” to “${study.songs[s.closest[1]].title}”.`;
 $('networks').replaceChildren();study.songs.forEach(drawNetwork);$('inspector').textContent='Select a vertex to inspect its pitch classes and neighbors.';renderMatrix();$('pair').replaceChildren();study.comparisons.forEach((p,i)=>{const o=el('option',`${study.songs[p.reference].title} → ${study.songs[p.candidate].title}`);o.value=i;$('pair').append(o);});$('limitations').replaceChildren(...study.limitations.map(x=>el('li',x)));choosePair(0);}
const svgEl=(tag,attrs={})=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n;};
// Shared, deterministic illustrative embedding: fifths determine angular order.
function position(id){const root=Math.floor(id/2),minor=id%2,t=((root*7)%12)/12*Math.PI*2;const radius=minor?71:112;return [160+Math.cos(t)*radius,142+Math.sin(t)*radius*.9];}
function drawNetwork(song,index){const color=colors[index],card=el('article',undefined,'network');card.append(el('h3',`${String.fromCharCode(97+index)} / ${song.title}`),el('p',song.chords.join(' → ')));const svg=svgEl('svg',{viewBox:'0 0 320 285',role:'group','aria-label':`${song.title} Tonnetz triad graph`});const used=new Set(song.aligned.chords),routes=new Set();song.transitions.forEach(r=>r.chords.slice(1).forEach((b,i)=>routes.add([r.chords[i],b].sort().join('|'))));study.graph.edges.forEach(edge=>{const a=study.graph.nodes[edge.source],b=study.graph.nodes[edge.target],[x1,y1]=position(a.id),[x2,y2]=position(b.id);const active=routes.has([a.name,b.name].sort().join('|'));const line=svgEl('line',{x1,y1,x2,y2,stroke:color,'stroke-width':active?2.5:1,'stroke-opacity':active?.9:.22});const title=svgEl('title');title.textContent=`${a.name} ↔ ${b.name}: ${edge.operation}`;line.append(title);svg.append(line);});study.graph.nodes.forEach(n=>{const [x,y]=position(n.id),active=used.has(n.name),g=svgEl('g',{role:'button',tabindex:n.id===0?0:-1,'data-node-id':n.id,'aria-describedby':'graph-keyboard-help','aria-label':`Inspect ${n.name}`,transform:`translate(${x},${y})`});g.append(svgEl('circle',{r:active?12:5,fill:active?'#e4f1e7':color,stroke:color,'stroke-width':1.7}));const txt=svgEl('text',{y:active?4:-10,'text-anchor':'middle','font-size':active?9:8,fill:'#263c35'});txt.textContent=n.name;g.append(txt);svg.append(g);});bindGraphKeyboard(svg);card.append(svg,el('p',`Common frame (+${song.shift} semitones): ${song.aligned.chords.join(' → ')}`),el('p',`Path movement: ${song.movement} edges · Mean per transition: ${song.mean_movement.toFixed(2)}`));$('networks').append(card);}
function inspect(node){const box=$('inspector');box.replaceChildren(el('strong',`${node.name} · ${node.quality} triad`),el('p',`Pitch classes: {${node.notes.join(', ')}} in ℤ₁₂. Each neighbor below is one edge away and preserves two pitches.`));study.graph.edges.filter(e=>e.source===node.id||e.target===node.id).forEach(e=>{const other=study.graph.nodes[e.source===node.id?e.target:e.source],b=el('button',`${e.operation} → ${other.name} · shared {${node.notes.filter(n=>other.notes.includes(n)).join(', ')}}`);b.addEventListener('click',()=>inspect(other));box.append(b);});}
function renderMatrix(){const table=el('table',undefined,'matrix'),head=el('tr');head.append(el('th','Reference ↓ / Candidate →'));study.songs.forEach(s=>head.append(el('th',s.title)));table.append(head);study.songs.forEach((song,i)=>{const row=el('tr');row.append(el('th',song.title));study.songs.forEach((s,j)=>{const td=el('td');if(i===j)td.textContent='—';else{const p=study.comparisons.findIndex(p=>p.reference===i&&p.candidate===j),b=el('button',study.distances[i][j].toFixed(3));b.dataset.pair=p;b.setAttribute('aria-label',`Compare ${song.title} to ${s.title}`);b.addEventListener('click',()=>choosePair(p));td.style.setProperty('--shade',`rgba(62,141,104,${.04+.18/(1+study.distances[i][j])})`);td.append(b);}row.append(td);});table.append(row);});$('matrix').replaceChildren(table);}
function choosePair(index){currentPair=study.comparisons[Number(index)];stepIndex=0;$('pair').value=index;document.querySelectorAll('[data-pair]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.pair)===Number(index))));$('pair-description').textContent=`Reference: ${study.songs[currentPair.reference].title}. Candidate: ${study.songs[currentPair.candidate].title}, shifted +${currentPair.shift} semitones ${study.transpose?'after comparing all 12 transpositions':'(original pitches)'}.`;renderAlignment();}
$('pair').addEventListener('change',()=>choosePair($('pair').value));$('cumulative').addEventListener('change',renderAlignment);$('previous').addEventListener('click',()=>{stepIndex--;renderAlignment();});$('next').addEventListener('click',()=>{stepIndex++;renderAlignment();});
function renderAlignment(){const p=currentPair;if(!p)return;const table=el('table',undefined,'dtw'),head=el('tr');head.append(el('th','Reference ↓ / Candidate →'));p.candidate_chords.forEach((c,j)=>head.append(el('th',`${j+1}: ${c}`)));table.append(head);const grid=$('cumulative').checked?p.cumulative:p.costs;grid.forEach((values,i)=>{const row=el('tr');row.append(el('th',`${i+1}: ${p.reference_chords[i]}`));values.forEach((v,j)=>{const pathIndex=p.path.findIndex(([a,b])=>a===i&&b===j),td=el('td',undefined,pathIndex>=0?'path':'');if(pathIndex===stepIndex)td.classList.add('current');const b=el('button',String(v));b.setAttribute('aria-label',`Row ${i+1} ${p.reference_chords[i]}, column ${j+1} ${p.candidate_chords[j]}, cost ${v}`);b.addEventListener('click',()=>{if(pathIndex>=0){stepIndex=pathIndex;renderAlignment();}else{$('step').textContent=`Outside the chosen alignment: ${p.reference_chords[i]} to ${p.candidate_chords[j]} has local graph cost ${p.costs[i][j]} and cumulative cost ${p.cumulative[i][j]}. Use Next or Previous to continue the path.`;}});td.append(b);row.append(td);});table.append(row);});$('alignment-grid').replaceChildren(table);const a=p.alignment[stepIndex];$('step-count').textContent=`Step ${stepIndex+1} / ${p.path_length}`;$('previous').disabled=stepIndex===0;$('next').disabled=stepIndex===p.path_length-1;$('step').replaceChildren(el('strong',`Position ${a.i+1} (${a.from}) ↔ position ${a.j+1} (${a.to})`),el('p',a.distance===0?'Same triad: cost 0.':`${a.chords.join(' → ')} · operations ${a.operations.join(' then ')} · ${a.distance} graph edge${a.distance===1?'':'s'}`));$('calculation').textContent=`Total cost = ${p.total_cost}; path length = ${p.path_length}\nDistance = ${p.total_cost} / ${p.path_length} = ${p.distance.toFixed(4)}\nSimilarity = 1 / (1 + ${p.distance.toFixed(4)}) = ${p.similarity.toFixed(4)}`;$('calculation').style.whiteSpace='pre-wrap';}
async function init(){try{const r=await fetch('/api/songs');if(!r.ok)throw Error('Could not load the catalog.');catalog=await r.json();const curatedResponse=await fetch('/api/catalog');if(!curatedResponse.ok)throw Error('Could not load song excerpts.');const curated=await curatedResponse.json();catalog=[...curated.map(s=>({...s,title:s.title+' — '+s.artist,catalog_id:s.id})),...catalog];renderSources(curated);try{const saved=JSON.parse(localStorage.getItem('tonnetz-lab-songs')||'[]');if(Array.isArray(saved))catalog.push(...saved.filter(s=>s&&typeof s.title==='string'&&s.title.length<=100&&Array.isArray(s.chords)&&s.chords.length<=32&&s.chords.every(c=>typeof c==='string')).slice(0,100).map(s=>({...s,custom:true})));}catch{}selected=new Set(curated.length>=2?[0,1]:[0,1,2]);dirty();renderCatalog();await analyze();}catch(e){$('status').textContent=e.message;}}
init();

// Export the completed report, never a changed but unanalyzed selection.
$('export-study').addEventListener('click', () => {
  if (!study || $('report').hidden) return;
  const artifact = {...study, exported_at: new Date().toISOString()};
  const blob = new Blob([JSON.stringify(artifact, null, 2) + '\n'], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const link = el('a');
  link.href = url;
  link.download = `tonnetz-study-${study.reproducibility.input_sha256.slice(0, 12)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  $('export-status').textContent = 'Study download requested. Re-run its inputs with /api/analyze to reproduce the calculations.';
});


function bindGraphKeyboard(svg) {
  const buttons = [...svg.querySelectorAll('[data-node-id]')];
  function activate(button, moveFocus) {
    buttons.forEach(b => b.setAttribute('tabindex', b === button ? '0' : '-1'));
    if (moveFocus) button.focus();
    inspect(study.graph.nodes[Number(button.dataset.nodeId)]);
  }
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => activate(button, true));
    button.addEventListener('keydown', event => {
      let next;
      const key = event.key.toLowerCase();
      if (key === 'arrowright' || key === 'arrowdown') next = (index + 1) % buttons.length;
      else if (key === 'arrowleft' || key === 'arrowup') next = (index + buttons.length - 1) % buttons.length;
      else if (key === 'home') next = 0;
      else if (key === 'end') next = buttons.length - 1;
      else if (key === 'enter' || key === ' ') next = index;
      else if (['p', 'l', 'r'].includes(key) && !event.ctrlKey && !event.altKey && !event.metaKey) {
        const id = Number(button.dataset.nodeId);
        const edge = study.graph.edges.find(e => e.operation === key.toUpperCase() && (e.source === id || e.target === id));
        if (edge) next = buttons.findIndex(b => Number(b.dataset.nodeId) === (edge.source === id ? edge.target : edge.source));
      }
      if (next !== undefined && next >= 0) {
        event.preventDefault();
        activate(buttons[next], true);
      }
    });
  });
}


function renderSources(songs) {
  const box = $('catalog-sources');
  box.replaceChildren();
  songs.forEach(song => {
    const details = el('details');
    details.append(el('summary', `${song.title} — ${song.artist}`));
    details.append(el('p', song.excerpt));
    details.append(el('p', `Source symbols: ${song.original_chords.join(' → ')}`));
    details.append(el('p', `Analyzed triads: ${song.chords.join(' → ')}`));
    const changes = [...new Set(song.reductions.flatMap(r => r.changes.map(c => `${r.original}: ${c}`)))];
    details.append(el('p', changes.length ? changes.join('; ') : 'No pitch-class reductions.'));
    details.append(el('p', `${song.attribution} · ${song.license} · record ${song.source_record_id} · revision ${song.source_revision}`));
    [['Chord source',song.source_url],['Linked recording',song.title_source_url]].forEach(([label,url]) => {
      const a=el('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';details.append(a,document.createTextNode(' · '));
    });
    box.append(details);
  });
}


$('study-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  const message = $('import-status');
  const requestRevision = ++revision; // invalidate any in-flight analysis
  message.textContent = 'Validating and recalculating the saved study…';
  try {
    if (file.size > 2000000) throw Error('Choose a study file no larger than 2 MB.');
    const saved = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
    const result = await post('/api/import-study', saved);
    if (requestRevision !== revision) {
      message.textContent = 'Selection changed during import. Choose the file again to reopen it.';
      return;
    }
    const restored = new Set();
    result.study.inputs.songs.forEach(entry => {
      let index = catalog.findIndex(s => s.title === entry.title && s.chords.join(' ') === entry.progression && (s.catalog_id || null) === (entry.catalog_id || null));
      if (index < 0) {
        index = catalog.length;
        catalog.push({title: entry.title, chords: entry.progression.split(' '), custom: true, ...(entry.catalog_id ? {catalog_id: entry.catalog_id} : {})});
      }
      restored.add(index);
    });
    selected = restored;
    $('transpose').checked = result.study.transpose;
    dirty();
    renderCatalog();
    study = result.study;
    renderStudy();
    const v = result.verification;
    const differences = [];
    if (!v.inputs_match) differences.push('input fingerprint');
    if (!v.source_matches) differences.push('analysis code or catalog version');
    if (!v.results_match) differences.push(`saved fields: ${v.different_fields.join(', ')}`);
    message.textContent = differences.length ? `Reopened and recalculated. Differences detected in ${differences.join('; ')}. The report shows current calculations.` : 'Study reopened. Inputs, source fingerprints, and all calculations match.';
    $('status').textContent = `Imported study · ${study.songs.length} songs. See import verification below.`;
  } catch (error) {
    message.textContent = `Study not opened: ${error.message}`;
  } finally {
    event.target.value = '';
  }
});


$('export-report').addEventListener('click', async () => {
  if (!study || $('report').hidden) return;
  const button = $('export-report');
  const snapshot = study;
  button.disabled = true;
  try {
    const result = await post('/api/report', snapshot.inputs);
    const url = URL.createObjectURL(new Blob([result.html], {type:'text/html;charset=utf-8'}));
    const link = el('a');
    link.href = url;
    link.download = `tonnetz-report-${snapshot.reproducibility.input_sha256.slice(0,12)}.html`;
    document.body.append(link);link.click();link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    $('export-status').textContent = 'Readable report download requested. Open the HTML file in a browser to read or print it; save the JSON alongside it for replay.';
  } catch (error) {
    $('export-status').textContent = `Report could not be exported: ${error.message}`;
  } finally { button.disabled = false; }
});
