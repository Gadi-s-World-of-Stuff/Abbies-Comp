"""Render a self-contained, printable academic report from engine results."""
from html import escape
from math import cos, sin, pi


def e(value):
    return escape(str(value), quote=True)


def table(headers, rows):
    return '<table><thead><tr>' + ''.join('<th scope="col">'+e(h)+'</th>' for h in headers) + '</tr></thead><tbody>' + ''.join(
        '<tr>'+''.join('<td>'+e(cell)+'</td>' for cell in row)+'</tr>' for row in rows) + '</tbody></table>'


def network_figure(study, song, index):
    """Match the lab's illustrative layout, using only actual graph edges."""
    color = ['#aa5549', '#328969', '#438da7', '#86589c', '#a27835'][index]
    def position(node_id):
        angle = ((node_id // 2 * 7) % 12) / 12 * 2 * pi
        radius = 71 if node_id % 2 else 112
        return 160 + cos(angle) * radius, 142 + sin(angle) * radius * .9
    used = set(song['aligned']['chords'])
    routes = {tuple(sorted((a, b))) for route in song['transitions']
              for a, b in zip(route['chords'], route['chords'][1:])}
    parts = [f'<figure><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 285" role="img" aria-labelledby="graph-title-{index} graph-desc-{index}">',
             f'<title id="graph-title-{index}">{e(song["title"])}: triad graph</title>',
             f'<desc id="graph-desc-{index}">24 triads and 36 P/L/R edges. Large outlined nodes are progression triads; thick edges trace shortest transition routes. Layout is illustrative.</desc>']
    nodes = {n['id']: n for n in study['graph']['nodes']}
    for edge in study['graph']['edges']:
        a, b = nodes[edge['source']], nodes[edge['target']]
        x1, y1 = position(a['id']); x2, y2 = position(b['id'])
        active = tuple(sorted((a['name'], b['name']))) in routes
        parts.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{color}" stroke-width="{2.5 if active else 1}" stroke-opacity="{.9 if active else .22}"><title>{e(a["name"])} ↔ {e(b["name"])}: {edge["operation"]}</title></line>')
    for node in nodes.values():
        x, y = position(node['id']); active = node['name'] in used
        fill = '#e4f1e7' if active else color
        parts.append(f'<g transform="translate({x:.2f},{y:.2f})"><circle r="{12 if active else 5}" fill="{fill}" stroke="{color}" stroke-width="1.7"/><text y="{4 if active else -10}" text-anchor="middle" font-size="{9 if active else 8}" fill="#263c35">{e(node["name"])}</text></g>')
    parts.append(f'</svg><figcaption>Input {index+1}: common frame +{song["shift"]} semitones. Larger nodes mark progression triads; thick edges mark shortest transition routes. Coordinates are illustrative, not distances.</figcaption></figure>')
    parts.append(table(['Consecutive chords', 'Shortest route', 'P/L/R moves', 'Cost'],
                       [[r['from']+' → '+r['to'], ' → '.join(r['chords']), ' → '.join(r['operations']) or 'same triad', r['distance']] for r in song['transitions']]))
    return ''.join(parts)


def render_report(study):
    parts = ['''<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tonnetz Lab — Study report</title><style>
body{font:15px/1.65 Georgia,serif;color:#223b34;background:#fff;max-width:1000px;margin:40px auto;padding:0 25px}
a{color:#27634f}a:focus-visible{outline:3px solid #27634f;outline-offset:3px}nav{border:1px solid #cad8ce;padding:16px}nav a{overflow-wrap:anywhere}h2,h3{scroll-margin-top:16px}h1,h2,h3{overflow-wrap:anywhere}h1{font-size:38px}h2{border-bottom:1px solid #cad8ce;padding-bottom:8px;margin-top:36px}h3{margin-top:28px}
figure{margin:20px 0;break-inside:avoid}figure svg{display:block;width:100%;max-width:460px;margin:auto}figcaption{font:12px/1.5 Arial,sans-serif}
table{border-collapse:collapse;width:100%;font:12px/1.5 Arial,sans-serif;margin:18px 0;overflow-wrap:anywhere}
td,th{border:1px solid #d5dfd7;padding:8px;text-align:left}th{background:#edf3ed}
code{overflow-wrap:anywhere;font-size:12px}p,li{overflow-wrap:anywhere}.note{border-left:3px solid #709b85;padding-left:15px}
@media print{body{margin:0;max-width:none;font-size:11pt}h2,h3{break-after:avoid}tr{break-inside:avoid}thead{display:table-header-group}}
</style></head><body><h1 id="top" tabindex="-1">Tonnetz Lab</h1><p>Harmonic structure study · Mathematics × Computer Science</p>
<p class="note">This report describes harmonic similarities in selected progressions. It does not establish why a listener likes them. Use the companion JSON export for reproducible machine-readable results.</p>''']
    sections = [('inputs', 'Study inputs'), ('distances', 'Pairwise distances'),
                ('model', 'Model and equations'), ('alignments', 'Alignment calculations'),
                ('limitations', 'Interpretation and limitations'), ('reproducibility', 'Reproducibility')]
    parts.append('<nav aria-label="Report contents"><strong>Report contents</strong><ul>')
    parts.extend(f'<li><a href="#{key}">{label}</a></li>' for key, label in sections)
    parts.append('</ul><details><summary>Jump to a song or directed comparison</summary><ul>')
    parts.extend(f'<li><a href="#input-{i}">Input {i}: {e(song["title"])}</a></li>' for i, song in enumerate(study['songs'], 1))
    parts.extend(f'<li><a href="#pair-{pair["reference"]+1}-{pair["candidate"]+1}">Input {pair["reference"]+1} → input {pair["candidate"]+1}</a></li>' for pair in study['comparisons'])
    parts.append('</ul></details></nav>')
    parts.append('<h2 id="inputs" tabindex="-1">Study inputs</h2><p>Compare across musical keys: '+('yes — all 12 candidate transpositions' if study['transpose'] else 'no — original pitches')+'</p>')
    for index, song in enumerate(study['songs'], 1):
        parts.append(f'<h3 id="input-{index}" tabindex="-1">{index}. {e(song["title"])}</h3><p>Input: {e(" → ".join(song["chords"]))}</p>')
        parts.append(f'<p>Common frame (+{song["shift"]} semitones): {e(" → ".join(song["aligned"]["chords"]))}. Internal path movement: {song["movement"]} graph edges.</p>')
        parts.append(network_figure(study, song, index-1))
        provenance = song.get('provenance')
        if provenance:
            parts.append('<p>'+e(provenance['excerpt'])+'</p><p>Original symbols: '+e(' → '.join(provenance['original_chords']))+'</p>')
            changes = list(dict.fromkeys(r['original']+': '+c for r in provenance['reductions'] for c in r['changes']))
            parts.append('<p>Normalization/reductions: '+e('; '.join(changes) or 'None')+'</p>')
            for key in ('attribution', 'license', 'source_url', 'source_record_id', 'source_revision', 'title_source_url'):
                parts.append('<p>'+e(key.replace('_', ' '))+': '+e(provenance[key])+'</p>')
            parts.append('<p>Dataset-linked identities verified; chord accuracy not independently audio-validated.</p>')
        else:
            parts.append('<p>Example or user-supplied progression; no verified song-source attribution attached.</p>')
    parts.append('<h2 id="distances" tabindex="-1">Pairwise distances</h2><p>Rows are reference progressions; columns are candidates. Indices refer to the inputs above. Lower is closer. Scores may differ by direction when optimal paths tie.</p>')
    parts.append(table(['Reference / candidate']+list(range(1,len(study['songs'])+1)),
                       [[i+1]+[f'{v:.6f}' if i != j else '—' for j,v in enumerate(row)] for i,row in enumerate(study['distances'])]))
    parts.append('<p>Shared triads in the first input’s common frame: '+e(', '.join(study['summary']['shared_chords']) or 'none')+'. Mean directed cost: '+f'{study["summary"]["mean_distance"]:.6f}.</p>')
    parts.append('''<h2 id="model" tabindex="-1">Model and equations</h2><p>Pitch classes live in ℤ₁₂. Major triads are {r,r+4,r+7}; minor triads are {r,r+3,r+7}, modulo 12. The graph has 24 triad vertices and 36 undirected P/L/R edges.</p>
<p>d<sub>G</sub>(a,b) is shortest-path edge count. c(i,j)=d<sub>G</sub>(aᵢ,Tₖ(bⱼ)).</p>
<p>D(i,j)=c(i,j)+min{D(i−1,j),D(i,j−1),D(i−1,j−1)}. D(0,0)=0; positive-index boundary cells D(i,0) and D(0,j) are infinite.</p>
<p>The engine minimizes total path cost, then divides by its chosen path length. Across-key mode selects the transposition with lowest resulting average. Similarity=1/(1+distance), a structural score, not a probability.</p>''')
    parts.append(table(['Operation','Major (r,+) →','Minor (r,−) →'],[['P','(r,−)','(r,+)'],['L','(r+4,−)','(r+8,+)'],['R','(r+9,−)','(r+3,+)']]))
    parts.append('<h2 id="alignments" tabindex="-1">Alignment calculations</h2>')
    for pair in study['comparisons']:
        parts.append(f'<h3 id="pair-{pair["reference"]+1}-{pair["candidate"]+1}" tabindex="-1">Input {pair["reference"]+1} → input {pair["candidate"]+1}</h3><p>Candidate transposition: +{pair["shift"]} semitones. Distance = {pair["total_cost"]}/{pair["path_length"]} = {pair["distance"]:.6f}. Similarity = {pair["similarity"]:.6f}.</p>')
        parts.append(table(['Reference position','Candidate position','Shortest route','P/L/R moves','Cost'],
                           [[a['i']+1,a['j']+1,' → '.join(a['chords']),' → '.join(a['operations']) or 'same triad',a['distance']] for a in pair['alignment']]))
    parts.append('<h2 id="limitations" tabindex="-1">Interpretation and limitations</h2><ul>'+''.join('<li>'+e(x)+'</li>' for x in study['limitations'])+'</ul>')
    parts.append('<h2 id="reproducibility" tabindex="-1">Reproducibility</h2><p>Input SHA-256: <code>'+e(study['reproducibility']['input_sha256'])+'</code></p>')
    parts.extend('<p>'+e(name)+': <code>'+e(value)+'</code></p>' for name,value in study['reproducibility']['source_sha256'].items())
    parts.append('<p><a href="#top">Back to top</a></p></body></html>')
    return ''.join(parts)
