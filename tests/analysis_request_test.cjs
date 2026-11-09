// Exercise the shipped handler with controlled, out-of-order network responses.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('lab.js', 'utf8');
const handler = source.slice(source.indexOf('async function analyze(){'), source.indexOf("\n$('add-song')"));
const controls = {analyze: {}, status: {}, transpose: {checked: true}};
const pending = [];
const context = vm.createContext({
  $: id => controls[id], revision: 0, selected: new Set([0, 1]),
  catalog: [{title: 'A', chords: ['C']}, {title: 'B', chords: ['G']}],
  post: () => new Promise((resolve, reject) => pending.push({resolve, reject})),
  renderStudy: () => {},
});
vm.runInContext(handler, context);
(async () => {
  const older = context.analyze();
  const newer = context.analyze();
  pending[0].reject(Error('Old request failed'));
  await older;
  assert.equal(controls.analyze.disabled, true);
  assert.match(controls.status.textContent, /Calculating/);
  pending[1].resolve({songs: [1, 2], comparisons: [1, 2]});
  await newer;
  assert.equal(controls.analyze.disabled, false);
  assert.match(controls.status.textContent, /Study complete/);
  const changed = context.analyze();
  context.revision++;
  controls.status.textContent = '';
  controls.analyze.disabled = true; // selection now below the minimum
  pending[2].reject(Error('Obsolete failure'));
  await changed;
  assert.equal(controls.status.textContent, '');
  assert.equal(controls.analyze.disabled, true);
  const current = context.analyze();
  pending[3].reject(Error('Current failure'));
  await current;
  assert.equal(controls.status.textContent, 'Current failure');
  assert.equal(controls.analyze.disabled, false);
  console.log('Analysis request ordering checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
