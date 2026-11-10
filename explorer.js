"use strict";
const $ = id => document.getElementById(id);
const make = (tag, className, content) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined) element.textContent = content;
  return element;
};
let payload = null, audio = null, activeButton = null;
let highlightTimer = 0, stopTimer = 0, playbackGeneration = 0;
let requestId = 0, requestController = null;
let graphSignature = '', soundingKey = null;
const voices = new Set(), resultCache = new Map();
const graphNoteGroups = new Map(), graphChordGroups = new Map();
let graphEdges = [], chordInfo = new Map();

function setSounding(key) {
  if (key === soundingKey) return;
  for (const node of graphNoteGroups.get(soundingKey) || []) node.classList.remove('sounding');
  for (const node of graphNoteGroups.get(key) || []) node.classList.add('sounding');
  soundingKey = key;
}
function stopAudio() {
  playbackGeneration++;
  clearTimeout(highlightTimer);
  clearTimeout(stopTimer);
  for (const voice of voices) {
    try { voice.osc.stop(); } catch {}
    voice.osc.disconnect();
    voice.gain.disconnect();
  }
  voices.clear();
  setSounding(null);
  if (activeButton) {
    activeButton.textContent = activeButton.dataset.label;
    activeButton.setAttribute('aria-label', activeButton.dataset.ariaLabel);
    delete activeButton.dataset.playing;
    activeButton = null;
  }
  $('audio-status').textContent = '';
  if (audio?.state === 'running') void audio.suspend().catch(() => {});
}
async function play(notes, button, label, toggle = true) {
  if (toggle && button === activeButton) { stopAudio(); return; }
  stopAudio();
  const generation = playbackGeneration;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    await audio.resume();
    if (generation !== playbackGeneration) return;
    activeButton = button;
    button.dataset.label = button.textContent;
    button.dataset.ariaLabel = button.getAttribute('aria-label') || button.textContent;
    button.dataset.playing = 'true';
    button.textContent = 'Stop';
    button.setAttribute('aria-label', 'Stop playback');
    const start = audio.currentTime + .05;
    notes.forEach((chord, index) => chord.forEach(pc => {
      const osc = audio.createOscillator(), gain = audio.createGain();
      const time = start + index * .7, voice = {osc, gain};
      osc.type = 'triangle';
      osc.frequency.value = 440 * 2 ** ((48 + pc - 69) / 12);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(.065, time + .04);
      gain.gain.exponentialRampToValueAtTime(.001, time + .65);
      osc.connect(gain);
      gain.connect(audio.destination);
      voices.add(voice);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); voices.delete(voice); };
      osc.start(time);
      osc.stop(time + .7);
    }));
    $('audio-status').textContent = `Playing ${label}`;
    // Wake at chord boundaries, then use the audio clock to catch up after delays.
    function highlight() {
      if (generation !== playbackGeneration) return;
      const index = Math.floor((audio.currentTime - start) / .7);
      setSounding(notes[index]?.join(',') ?? null);
      if (index < notes.length) {
        const nextBoundary = start + (index + 1) * .7;
        highlightTimer = setTimeout(highlight, Math.max(16, (nextBoundary - audio.currentTime) * 1000));
      }
    }
    highlight();
    stopTimer = setTimeout(() => {
      if (generation === playbackGeneration) stopAudio();
    }, (notes.length * .7 + .15) * 1000);
  } catch {
    if (generation !== playbackGeneration) return;
    stopAudio();
    $('audio-status').textContent = 'Audio is unavailable in this browser.';
  }
}
function chips(chords) {
  const row = make('div', 'chord-strip');
  chords.forEach((name, index) => {
    if (index) row.append(make('span', 'chord-arrow', '→'));
    row.append(make('span', 'chord', name));
  });
  return row;
}
function svgEl(tag, attributes, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}
const HEX_LAYOUT = [{"x":7,"y":0,"name":"Bbm"},{"x":9,"y":0,"name":"Bb"},{"x":4,"y":1,"name":"F#m"},{"x":6,"y":1,"name":"F#"},{"x":10,"y":1,"name":"Gm"},{"x":12,"y":1,"name":"G"},{"x":1,"y":2,"name":"Dm"},{"x":3,"y":2,"name":"D"},{"x":7,"y":2,"name":"Ebm"},{"x":9,"y":2,"name":"Eb"},{"x":13,"y":2,"name":"Em"},{"x":15,"y":2,"name":"E"},{"x":0,"y":3,"name":"Bb"},{"x":4,"y":3,"name":"Bm"},{"x":6,"y":3,"name":"B"},{"x":10,"y":3,"name":"Cm"},{"x":12,"y":3,"name":"C"},{"x":16,"y":3,"name":"C#m"},{"x":18,"y":3,"name":"C#"},{"x":1,"y":4,"name":"Gm"},{"x":3,"y":4,"name":"G"},{"x":7,"y":4,"name":"Abm"},{"x":9,"y":4,"name":"Ab"},{"x":13,"y":4,"name":"Am"},{"x":15,"y":4,"name":"A"},{"x":19,"y":4,"name":"Bbm"},{"x":4,"y":5,"name":"Em"},{"x":6,"y":5,"name":"E"},{"x":10,"y":5,"name":"Fm"},{"x":12,"y":5,"name":"F"},{"x":16,"y":5,"name":"F#m"},{"x":18,"y":5,"name":"F#"},{"x":7,"y":6,"name":"C#m"},{"x":9,"y":6,"name":"C#","label":"D♭"},{"x":13,"y":6,"name":"Dm"},{"x":15,"y":6,"name":"D"},{"x":10,"y":7,"name":"Bbm"},{"x":12,"y":7,"name":"Bb"}];
function updateGraph(data) {
  const selected = new Set(data.target.chords), routes = new Set();
  for (const route of data.target.transitions) {
    route.chords.slice(1).forEach((to, index) => routes.add([route.chords[index], to].sort().join('|')));
  }
  for (const [name, nodes] of graphChordGroups) {
    for (const node of nodes) node.classList.toggle('selected', selected.has(name));
  }
  for (const {node, key} of graphEdges) node.classList.toggle('path', routes.has(key));
}
function drawGraph(data) {
  const signature = JSON.stringify(data.graph);
  if (signature === graphSignature) { updateGraph(data); return; }
  setSounding(null);
  graphNoteGroups.clear();
  graphChordGroups.clear();
  graphEdges = [];
  chordInfo = new Map(data.graph.nodes.map(node => [node.name, node]));
  const byId = new Map(data.graph.nodes.map(node => [node.id, node]));
  const relationships = new Map(data.graph.edges.map(edge => [
    [byId.get(edge.source).name, byId.get(edge.target).name].sort().join('|'), edge.operation
  ]));
  const fragment = document.createDocumentFragment();
  fragment.append(svgEl('title', {id:'graph-title'}, 'Hexagonal Tonnetz chord map'),
    svgEl('desc', {}, 'Uppercase names are major; lowercase names are minor. Boundary copies play the same triad. Each edge is a real P/L/R move. Brighter lines trace shortest routes between your chords.'));
  const defs = svgEl('defs', {});
  const glass = svgEl('radialGradient', {id:'node-glass', cx:'28%', cy:'15%', r:'90%'});
  glass.append(svgEl('stop', {offset:'0%', 'stop-color':'#dfbfa5', 'stop-opacity':'.85'}),
    svgEl('stop', {offset:'50%', 'stop-color':'#be977c', 'stop-opacity':'.75'}),
    svgEl('stop', {offset:'100%', 'stop-color':'#75554c', 'stop-opacity':'.8'}));
  const selectedGlass = svgEl('radialGradient', {id:'selected-glass', cx:'30%', cy:'20%', r:'85%'});
  selectedGlass.append(svgEl('stop', {offset:'0%', 'stop-color':'#fff2de'}),
    svgEl('stop', {offset:'50%', 'stop-color':'#efbd94'}), svgEl('stop', {offset:'100%', 'stop-color':'#b47b63'}));
  defs.append(glass, selectedGlass);
  fragment.append(defs);
  const vertices = HEX_LAYOUT.map(vertex => ({...vertex, px:42 + vertex.x * 57, py:46 + vertex.y * 85}));
  const labels = [];
  vertices.forEach((a, index) => vertices.slice(index + 1).forEach(b => {
    const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y);
    if (!((dx === 2 && dy === 0) || (dx === 1 && dy === 1))) return;
    const key = [a.name, b.name].sort().join('|'), operation = relationships.get(key);
    if (!operation) return;
    const reference = (a.name === 'C' && a.x === 12 && a.y === 3) || (b.name === 'C' && b.x === 12 && b.y === 3);
    const edge = svgEl('line', {x1:a.px, y1:a.py, x2:b.px, y2:b.py,
      class:'edge' + (reference ? ' reference-edge' : ''), 'data-from':a.name, 'data-to':b.name, 'data-operation':operation});
    edge.append(svgEl('title', {}, `${a.name} — ${operation} — ${b.name}`));
    fragment.append(edge);
    graphEdges.push({node:edge, key});
    if (reference) labels.push(svgEl('text', {
      x:(a.px + b.px) / 2 + (operation === 'P' ? 0 : operation === 'L' ? 26 : 17),
      y:(a.py + b.py) / 2 + (operation === 'L' ? 20 : -12), class:'operation-label'
    }, operation));
  }));
  fragment.append(...labels);
  for (const vertex of vertices) {
    const node = chordInfo.get(vertex.name);
    if (!node) continue;
    const root = node.quality === 'minor' ? node.name.slice(0, -1).toLowerCase() : node.name;
    const display = vertex.label || root.replace(/([A-Ga-g])b/g, '$1♭').replaceAll('#', '♯');
    const notesKey = node.notes.join(',');
    const group = svgEl('g', {class:'node', role:'button', tabindex:'0', 'data-notes':notesKey,
      'data-chord':node.name, 'aria-label':`Hear ${node.name} ${node.quality} triad`,
      transform:`translate(${vertex.px} ${vertex.py})`});
    group.append(svgEl('circle', {r:22}), svgEl('text', {}, display));
    fragment.append(group);
    if (!graphNoteGroups.has(notesKey)) graphNoteGroups.set(notesKey, []);
    graphNoteGroups.get(notesKey).push(group);
    if (!graphChordGroups.has(node.name)) graphChordGroups.set(node.name, []);
    graphChordGroups.get(node.name).push(group);
  }
  $('graph').replaceChildren(fragment);
  graphSignature = signature;
  updateGraph(data);
  if (matchMedia('(max-width:650px)').matches) {
    requestAnimationFrame(() => { const wrap = $('graph').parentElement; wrap.scrollLeft = (wrap.scrollWidth - wrap.clientWidth) / 2; });
  }
}
function activateChord(event) {
  if (event.type === 'keydown' && (!['Enter', ' '].includes(event.key) || event.repeat)) return;
  const vertex = event.target.closest('.node');
  if (!vertex) return;
  if (event.type === 'keydown') event.preventDefault();
  const node = chordInfo.get(vertex.dataset.chord);
  if (node) void play([node.notes], $('listen'), node.name, false);
}
$('graph').addEventListener('click', activateChord);
$('graph').addEventListener('keydown', activateChord);

function routeList(parent, routes) {
  if (!routes.length) { parent.append(make('p', 'route', 'Single chord — no transitions.')); return; }
  for (const route of routes) {
    const line = make('p', 'route', route.chords.map((chord, index) => index ? ` —${route.operations[index - 1]}→ ${chord}` : chord).join(''));
    line.append(make('small', '', `  · ${route.distance} move${route.distance === 1 ? '' : 's'}`));
    parent.append(line);
  }
}
function fillDetails(details, match, target) {
  const fragment = document.createDocumentFragment();
  fragment.append(make('p', 'explanation', match.explanation),
    make('p', 'detail-label', `Aligned candidate · +${match.shift} semitones`), chips(match.aligned.chords));
  const shared = [...new Set(target.chords.filter(chord => match.aligned.chords.includes(chord)))];
  fragment.append(make('p', 'explanation', `Shared triads after alignment: ${shared.join(', ') || 'none'}. Average P/L/R cost: ${match.distance.toFixed(3)}.`));
  const scroll = make('div', 'table-scroll'), table = make('table', 'alignment');
  const head = make('thead'), header = make('tr'), body = make('tbody');
  ['Your chord', 'Aligned match', 'P/L/R route'].forEach(text => header.append(make('th', '', text)));
  head.append(header);
  for (const pair of match.alignment) {
    const row = make('tr');
    row.append(make('td', '', pair.from), make('td', '', pair.to), make('td', '', pair.operations.join(' → ') || 'Identical'));
    body.append(row);
  }
  table.append(head, body); scroll.append(table); fragment.append(scroll);
  fragment.append(make('p', 'detail-label', 'Your progression · shortest paths'));
  routeList(fragment, target.transitions);
  fragment.append(make('p', 'detail-label', 'Aligned candidate · shortest paths'));
  routeList(fragment, match.transitions);
  details.append(fragment);
}
function render(data) {
  payload = data;
  $('listen').disabled = false;
  $('current-chords').replaceChildren(chips(data.target.chords));
  drawGraph(data);
  const matches = data.results.slice(0, 5), fragment = document.createDocumentFragment();
  $('result-count').textContent = `${matches.length} of ${data.results.length} examples`;
  matches.forEach((match, index) => {
    const card = make('article', 'match'), summary = make('div', 'match-summary'), body = make('div');
    body.append(make('h3', '', match.title), make('p', 'match-sub', match.chords.join('  ·  ')));
    const score = make('div', 'score'), percent = (match.similarity * 100).toFixed(1);
    const track = make('div', 'score-track'), fill = make('div', 'score-fill');
    fill.style.setProperty('--score', `${percent}%`); track.append(fill);
    score.setAttribute('aria-label', `${percent}% harmonic similarity`);
    score.append(make('strong', '', `${percent}%`), make('small', '', 'similarity'), track);
    summary.append(make('span', 'rank', String(index + 1).padStart(2, '0')), body, score);
    const tools = make('div', 'match-tools'), details = make('details');
    details.append(make('summary', '', 'Details'));
    details.addEventListener('toggle', () => {
      if (details.open && !details.dataset.loaded) {
        fillDetails(details, match, data.target);
        details.dataset.loaded = 'true';
      }
    });
    const listen = make('button', 'quiet', '▷ Play');
    listen.type = 'button';
    listen.setAttribute('aria-label', `Listen to ${match.title} in the aligned key`);
    listen.onclick = () => play(match.aligned.notes, listen, `${match.title}, aligned key`);
    tools.append(details, listen); card.append(summary, tools); fragment.append(card);
  });
  $('results').replaceChildren(fragment);
}
function setPending(pending) {
  $('find').disabled = pending;
  $('find').textContent = pending ? 'Comparing…' : 'Compare →';
  document.body.classList.toggle('loading', pending);
  $('analysis-area').setAttribute('aria-busy', String(pending));
}
function invalidateRequest() {
  requestId++;
  requestController?.abort();
  setPending(false);
  stopAudio();
  $('status').textContent = 'Press Compare to update.';
}
async function recommend() {
  const id = ++requestId;
  requestController?.abort();
  requestController = new AbortController();
  const controller = requestController;
  stopAudio();
  $('error').textContent = '';
  setPending(true);
  const progression = $('progression').value.trim().replace(/\s+/g, ' ');
  const transpose = $('transpose').checked, key = JSON.stringify([progression, transpose]);
  try {
    let data = resultCache.get(key);
    if (!data) {
      const response = await fetch('/api/recommend', {method:'POST', headers:{'Content-Type':'application/json'},
        signal:controller.signal, body:JSON.stringify({progression, transpose})});
      data = await response.json();
      if (id !== requestId) return;
      if (!response.ok) throw new Error(data.error || 'Could not compare these chords.');
      resultCache.set(key, data);
      if (resultCache.size > 16) resultCache.delete(resultCache.keys().next().value);
    }
    if (id !== requestId) return;
    render(data);
    $('status').textContent = 'Matches updated.';
  } catch (error) {
    if (id !== requestId || error.name === 'AbortError') return;
    $('error').textContent = error.message;
    $('status').textContent = 'Check your chords and try again.';
  } finally {
    if (id === requestId) setPending(false);
  }
}
$('composer-form').addEventListener('submit', event => { event.preventDefault(); void recommend(); });
$('progression').addEventListener('input', () => {
  document.querySelectorAll('.sample').forEach(button => button.setAttribute('aria-pressed', 'false'));
  invalidateRequest();
});
$('transpose').addEventListener('change', invalidateRequest);
$('listen').onclick = () => { if (payload) void play(payload.target.notes, $('listen'), 'your progression'); };
window.addEventListener('pagehide', () => { invalidateRequest(); void audio?.close().catch(() => {}); audio = null; });
$('about-open').onclick = () => $('about').showModal();
$('about-close').onclick = () => $('about').close();
$('about').addEventListener('click', event => {
  if (event.target !== $('about')) return;
  const box = $('about').getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) $('about').close();
});
async function loadSongs() {
  try {
    const response = await fetch('/api/songs');
    if (!response.ok) throw new Error();
    const songs = await response.json(), fragment = document.createDocumentFragment();
    for (const song of songs) {
      const button = make('button', 'sample'), text = song.chords.join(' ');
      button.type = 'button';
      button.setAttribute('aria-pressed', String(text === $('progression').value.trim()));
      button.append(make('strong', '', song.title), make('small', '', song.chords.join(' · ')));
      button.onclick = () => {
        $('progression').value = text;
        document.querySelectorAll('.sample').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
        void recommend();
      };
      fragment.append(button);
    }
    $('samples').replaceChildren(fragment);
  } catch { $('error').textContent = 'Could not load examples. You can still enter your own chords.'; }
}
void loadSongs();
void recommend();
