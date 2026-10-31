import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revisitCandidates, dailyRevisit } from '../src/lib/revisit.ts';

const now = new Date('2026-10-29T12:00:00Z');
const entry = (id, created_at = '2026-10-01T12:00:00Z') => ({id, created_at, updated_at:created_at, occurred_at:created_at, title:id, body:'Texto', entry_type:'symbol'});
const reflection = (entry_id,kind,created_at='2026-10-10T12:00:00Z') => ({id:'r',entry_id,kind,position:1,body:'Reflexão',created_at});

test('revisit excludes recent, backdated, invalid and future activity', () => {
  const old=entry('old');
  const recent=entry('recent','2026-10-28T12:00:00Z');
  recent.occurred_at='2020-01-01T12:00:00Z';
  const result=revisitCandidates([old,recent,entry('invalid','wrong'),entry('future','2027-01-01T12:00:00Z'),entry('active')],[reflection('active','evolution','2026-10-28T12:00:00Z')],now);
  assert.deepEqual(result.map(item=>item.entry.id),['old']);
  assert.equal(result[0].daysSince,28);
  assert.equal(revisitCandidates([entry('seven','2026-10-22T12:00:00Z')],[],now).length,1);
});

test('daily invitation is stable and prioritizes open subjects, with contextual questions', () => {
  const entries=[entry('learned'),entry('concluded'),entry('open'),entry('evolved')];
  const history=[reflection('learned','learning'),reflection('concluded','conclusion'),reflection('evolved','evolution')];
  const candidates=revisitCandidates(entries,history,now);
  assert.equal(candidates[0].status,'open');
  const selected=dailyRevisit(candidates,'2026-10-29');
  assert.equal(selected.status,'open');
  assert.equal(dailyRevisit(candidates,'2026-10-29').entry.id,selected.entry.id);
  assert.match(candidates.find(item=>item.entry.id==='learned').prompt,/aprendizado/);
  assert.match(candidates.find(item=>item.entry.id==='evolved').prompt,/última reflexão/);
  assert.equal(dailyRevisit([],'2026-10-29'),undefined);
});
