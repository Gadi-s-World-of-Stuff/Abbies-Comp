/* Each cluster is the same real 24-triad graph in an illustrative layout.
 * Shape is for readability, not a metric embedding or reconstructed source figure. */
(() => {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('harmony-network');
  const stage = document.querySelector('.network-stage');
  const status = document.getElementById('network-status');
  const motion = document.getElementById('motion');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches, data = null, clusters = [], playback = null, frame = 0, activeName = '';
  let narrow = stage.clientWidth < 520;
  const colors = [
    {line:'#bd453d',fill:'#d98473',dark:'#ad2420',pale:'#f5e8c9'},
    {line:'#4b9982',fill:'#8bcdb8',dark:'#227b5d',pale:'#e1efe1'},
    {line:'#9272ac',fill:'#bca6d1',dark:'#724686',pale:'#ede6f0'},
    {line:'#4592ae',fill:'#8bc8d5',dark:'#236f90',pale:'#e2efd9'}
  ];
  const el = (tag, attributes, text) => {
    const node = document.createElementNS(ns, tag);
    for (const [key,value] of Object.entries(attributes || {})) node.setAttribute(key,value);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function positions(kind) {
    return Array.from({length:24},(_,index)=>{
      const col = Math.floor(index/4), row=index%4, t=col/5;
      const jitterX=Math.sin(index*6.13)*10, jitterY=Math.cos(index*4.7)*9;
      if(kind===0) return {x:34+285*t+(row-1.5)*17+jitterX,y:215-162*Math.sin(t*1.5)+(row-1.5)*21+jitterY};
      if(kind===1) return {x:45+255*t+(row-1.5)*20+jitterX,y:170-85*Math.sin(t*2.2)+(row-1.5)*30+jitterY};
      if(kind===2){const angle=index*2.39996, radius=25+78*Math.sqrt(index/23);return {x:190+Math.cos(angle)*radius*1.15,y:135+Math.sin(angle)*radius+jitterY*.4};}
      return {x:34+282*t+(row-1.5)*16+jitterX,y:54+144*t+(row-1.5)*24+jitterY};
    });
  }
  function draw(payload) {
    data=payload; clusters=[];
    svg.replaceChildren(el('title',{id:'network-title'},'Four chord relationship networks'),
      el('desc',{id:'network-description'},'Your progression and three matches on the same 24-chord P/L/R graph. Larger nodes occur in each progression. Fine colored lines join direct neighbors; faint lines join chords two moves apart. Cluster shape is illustrative, not musical distance. Select a node to hear its chord.'));
    if(!data.graph){status.textContent='Restart the mixtape launcher to load the chord networks.';return;}
    const selected = [data.target,...data.results.slice(0,3).map(match=>({...match.aligned,sourceTitle:match.title}))];
    const nameToId = new Map(data.graph.nodes.map(n=>[n.name,n.id]));
    const adjacent = new Map(data.graph.nodes.map(n=>[n.id,new Set()]));
    data.graph.edges.forEach(e=>{adjacent.get(e.source).add(e.target);adjacent.get(e.target).add(e.source)});
    const context=[];
    data.graph.nodes.forEach(a=>data.graph.nodes.forEach(b=>{
      if(a.id<b.id&&!adjacent.get(a.id).has(b.id)&&[...adjacent.get(a.id)].some(n=>adjacent.get(n).has(b.id))) context.push({source:a.id,target:b.id});
    }));
    svg.setAttribute('viewBox',narrow?'0 0 410 1200':'0 0 820 610');
    const origins=narrow?[[12,30],[12,320],[12,610],[12,900]]:[[12,30],[410,28],[410,310],[12,310]];
    selected.forEach((song,k)=>{
      const color=colors[k], points=positions(k), counts=new Map();
      song.chords.forEach(name=>counts.set(name,(counts.get(name)||0)+1));
      // Place frequently visited chords toward the middle of each cluster, but keep
      // graph identity and all edge endpoints tied to engine IDs.
      const order=[...data.graph.nodes].sort((a,b)=>(counts.get(b.name)||0)-(counts.get(a.name)||0)||a.id-b.id);
      const slots=[10,13,9,14,6,17,5,18,2,21,1,22,0,3,4,7,8,11,12,15,16,19,20,23];
      const coordinates=new Map(order.map((node,i)=>[node.id,points[slots[i]]]));
      const group=el('g',{'transform':`translate(${origins[k][0]},${origins[k][1]})`,'data-network':k});
      group.append(el('text',{x:18,y:8,class:'network-letter',fill:color.dark},`(${String.fromCharCode(97+k)})`),
        el('text',{x:50,y:7,class:'network-caption'},k===0?'Your progression':song.sourceTitle),
        el('text',{x:50,y:23,class:'network-subtitle'},song.chords.join(' → ')));
      const addEdge=(edge,faint)=>{const a=coordinates.get(edge.source),b=coordinates.get(edge.target);const line=el('line',{x1:a.x,y1:a.y+20,x2:b.x,y2:b.y+20,stroke:color.line,class:'network-edge'+(faint?' context':'')});if(!faint)line.append(el('title',{},`${data.graph.nodes.find(n=>n.id===edge.source).name} ↔ ${data.graph.nodes.find(n=>n.id===edge.target).name}: ${edge.operation}`));group.append(line)};
      context.forEach(edge=>addEdge(edge,true));data.graph.edges.forEach(edge=>addEdge(edge,false));
      const nodes=new Map();
      data.graph.nodes.forEach(node=>{
        const point=coordinates.get(node.id), visits=counts.get(node.name)||0, radius=visits?9+Math.min(visits,3)*2:3.5;
        const g=el('g',{transform:`translate(${point.x},${point.y+20})`,class:'network-node'+(visits?' is-selected':''),role:'button',tabindex:'0','aria-label':`Play ${node.name}, ${node.quality} chord, ${k===0?'your progression':song.sourceTitle}${visits?`, occurs ${visits} times`:''}`,'data-chord':node.name});
        g.append(el('circle',{r:radius+5,stroke:color.dark,class:'node-halo'}),el('circle',{r:radius,fill:visits?color.pale:color.fill,stroke:color.dark,class:'node-disc'}),el('title',{},`${node.name} · ${visits?'in this progression':'P/L/R neighbor network'}`));
        if(visits)g.append(el('text',{'text-anchor':'middle',y:3},node.name));
        const play=()=>{
          window.dispatchEvent(new CustomEvent('mixtape:play-chord',{detail:{title:node.name,chords:[node.name],notes:[node.notes]}}));
        };
        g.addEventListener('click',play);g.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();play()}});
        group.append(g);nodes.set(node.name,g);
      });
      svg.append(group);clusters.push({song,nodes,nameToId});
    });
    status.textContent='Select a node to hear its chord. Larger nodes belong to that progression.';
    activeName='';syncPlayback();
  }
  function syncPlayback(){
    cancelAnimationFrame(frame);frame=0;
    if(!playback){clusters.forEach(cluster=>cluster.nodes.forEach(node=>node.classList.remove('is-playing')));activeName='';return;}
    const index=Math.floor((playback.context.currentTime-playback.start)/playback.step);
    if(index>=0&&index<playback.song.chords.length){const name=playback.song.chords[index];if(activeName!==`${index}:${name}`){clusters.forEach(cluster=>{cluster.nodes.forEach(node=>node.classList.remove('is-playing'));cluster.nodes.get(name)?.classList.add('is-playing')});status.textContent=`Now playing ${name} · chord ${index+1} of ${playback.song.chords.length}`;activeName=`${index}:${name}`;}}
    if(!document.hidden)frame=requestAnimationFrame(syncPlayback);
  }
  function setMotion(){stage.classList.toggle('motion-paused',paused);motion.setAttribute('aria-pressed',String(paused));motion.textContent=paused?'Resume motion':'Pause motion'}
  motion.addEventListener('click',()=>{paused=!paused;setMotion()});reduced.addEventListener('change',e=>{paused=e.matches;setMotion()});
  window.addEventListener('mixtape:results',e=>draw(e.detail));
  window.addEventListener('mixtape:playback',e=>{playback=e.detail;activeName='';syncPlayback();if(!playback&&data)status.textContent='Select a node to hear its chord. Larger nodes belong to that progression.'});
  new ResizeObserver(()=>{const next=stage.clientWidth<520;if(next!==narrow){narrow=next;if(data)draw(data)}}).observe(stage);
  document.addEventListener('visibilitychange',()=>syncPlayback());setMotion();
})();
