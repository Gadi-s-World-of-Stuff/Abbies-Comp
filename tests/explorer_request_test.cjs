// Verify the shipped request handler with out-of-order responses and input edits.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('explorer.js', 'utf8');
const handler = source.slice(source.indexOf('function setPending('), source.indexOf("$('composer-form').addEventListener"));
const controls = {
  find: {}, error: {}, status: {}, progression: {value:'C Em F G'},
  transpose: {checked:true}, 'analysis-area': {setAttribute() {}}
};
const pending = [], rendered = [];
const context = vm.createContext({
  $: id => controls[id], requestId:0, requestController:null,
  resultCache:new Map(), AbortController, stopAudio() {},
  document:{body:{classList:{toggle() {}}}},
  render: data => rendered.push(data),
  fetch: (url, options) => new Promise((resolve, reject) => pending.push({resolve, reject, options})),
});
vm.runInContext(handler, context);
const ok = data => ({ok:true, json:async () => data});
(async () => {
  const older = context.recommend();
  controls.progression.value = 'Dm G C Am';
  const newer = context.recommend();
  assert.equal(pending[0].options.signal.aborted, true);
  pending[1].resolve(ok({id:'new'}));
  await newer;
  pending[0].reject(Error('Obsolete failure'));
  await older;
  assert.deepEqual(rendered, [{id:'new'}]);
  assert.equal(controls.error.textContent, '');
  assert.equal(controls.find.disabled, false);

  controls.progression.value = 'F C G';
  const changed = context.recommend();
  controls.progression.value = 'C Am';
  context.invalidateRequest();
  pending[2].resolve(ok({id:'obsolete-success'}));
  await changed;
  assert.equal(rendered.length, 1);
  assert.equal(controls.status.textContent, 'Press Compare to update.');
  assert.equal(controls.find.disabled, false);

  controls.progression.value = 'Dm G C Am';
  await context.recommend();
  assert.equal(pending.length, 3, 'A repeated comparison should reuse its response');
  assert.equal(rendered.at(-1).id, 'new');

  controls.progression.value = 'Csus4';
  const invalid = context.recommend();
  pending[3].resolve({ok:false, json:async () => ({error:'Use major/minor triads.'})});
  await invalid;
  assert.equal(controls.error.textContent, 'Use major/minor triads.');
  assert.equal(controls.find.disabled, false);
  console.log('Explorer request cancellation, stale-response, cache, and recovery checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
