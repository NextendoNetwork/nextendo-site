const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/jd22-counts.js'), 'utf8');
const jd = '0100ea6014bb8000', gba = '010012f017576000', nes = '0100d870045b6000';

async function probe(jdStats, classics, fail = false) {
  const base = { counts: { other: 7, [gba]: 99 }, availability: {}, jeux: [] };
  const before = JSON.stringify(base);
  const window = { nxOnlineCounts: async () => base };
  vm.runInNewContext(source, { window, fetch: async url => {
    if (fail) throw new Error('network');
    return { ok: true, json: async () => url.includes('justdance22') ? jdStats : classics };
  }});
  const result = await window.nxOnlineCounts();
  assert.equal(JSON.stringify(base), before, 'shared cached base must stay unchanged');
  assert.equal(result.counts.other, 7);
  return result;
}

(async () => {
  const healthy = { game: 'Just Dance 2022', titleId: jd, online: true, connected: 2 };
  let data = await probe(healthy, { counts: { [gba]: 4, [nes]: 0 } });
  assert.equal(data.counts[jd], 2);
  assert.equal(data.counts[gba], 4);
  assert.equal(data.availability[nes], true, 'healthy empty server is operational');
  assert.equal(data.jeux.filter(g => g.titres.includes(gba)).length, 1);
  for (const invalid of [-1, 1.5, true, '4', Number.MAX_SAFE_INTEGER + 1, null]) {
    data = await probe({ ...healthy, connected: invalid }, { counts: { [gba]: invalid } });
    assert.equal(data.counts[jd], undefined);
    assert.equal(data.counts[gba], undefined);
    assert.equal(data.availability[gba], false);
  }
  data = await probe({ ...healthy, online: false }, { counts: {} });
  assert.equal(data.availability[jd], false);
  assert.equal(data.counts[gba], undefined, 'stale account count must not mask a failed probe');
  data = await probe(healthy, { counts: {} }, true);
  assert.equal(data.availability[jd], false);
  assert.equal(data.availability[gba], false);
  console.log('PASS: real zero, four-player counts, invalid data, outages and cache isolation');
})().catch(error => { console.error(error); process.exitCode = 1; });
