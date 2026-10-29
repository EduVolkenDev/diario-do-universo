import { test } from 'node:test';
import assert from 'node:assert/strict';
import { journeyOf, normalizeSearch, validateReflection, friendlyDataError } from '../src/lib/journey.ts';
import { addReflection, listReflections } from '../src/lib/reflections.ts';
import { deleteEntry, listEntries } from '../src/lib/entries.ts';

const reflection = (position, kind) => ({ id: `r-${position}`, entry_id: 'entry', position, kind, body: 'Uma reflexão', created_at: '2026-10-27T12:00:00Z' });

test('journey preserves original order, closes, learns and reopens without losing history', () => {
  const history = [reflection(5, 'reopened'), reflection(2, 'conclusion'), reflection(1, 'evolution'), reflection(4, 'evolution'), reflection(3, 'learning')];
  assert.equal(journeyOf([]).status, 'open');
  assert.equal(journeyOf(history.filter(r => r.position <= 2)).status, 'concluded');
  assert.equal(journeyOf(history.filter(r => r.position <= 4)).status, 'learned');
  assert.equal(journeyOf(history.filter(r => r.position <= 4)).resolution.position, 3);
  assert.deepEqual(journeyOf(history).timeline.map(r => r.position), [1,2,3,4,5]);
  assert.equal(journeyOf(history).status, 'open');
  assert.equal(journeyOf(history).resolution, undefined);
  assert.equal(history[0].position, 5);
});

test('validates reflections and normalizes accented search', () => {
  assert.equal(validateReflection('learning', ' Aprendi algo. '), null);
  assert.ok(validateReflection('unknown', 'texto'));
  assert.ok(validateReflection('evolution', ' \n '));
  assert.ok(validateReflection('conclusion', 'x'.repeat(10001)));
  assert.equal(normalizeSearch('CONCLUSÃO • Símbolo'), 'conclusao • simbolo');
});

test('reports unavailable storage without exposing raw server messages', () => {
  assert.match(friendlyDataError({code:'PGRST205'}, 'fallback'), /ativado/);
  assert.match(friendlyDataError({code:'42501'}, 'fallback'), /autorizar/);
  assert.equal(friendlyDataError({message:'sensitive internals'}, 'Seguro'), 'Seguro');
});

test('retry after an accepted write returns the same reflection, not a duplicate', async () => {
  const draft = {id:'same-id',entry_id:'entry',kind:'learning',body:'Aprendi.'};
  let requestedId;
  const client = { from: () => ({
    insert: () => ({select: () => ({single: async () => ({error:{code:'23505'}})})}),
    select: () => ({eq: (_, id) => { requestedId = id; return {single: async () => ({data:{...draft, position:1},error:null})}; }}),
  }) };
  assert.equal((await addReflection(client, draft)).id, draft.id);
  assert.equal(requestedId, draft.id);
});

test('conflicting retries are rejected instead of accepting different text', async () => {
  const client = { from: () => ({
    insert: () => ({select: () => ({single: async () => ({error:{code:'23505'}})})}),
    select: () => ({eq: () => ({single: async () => ({data:{entry_id:'other',body:'Other'},error:null})})}),
  }) };
  await assert.rejects(addReflection(client,{id:'id',entry_id:'entry',kind:'evolution',body:'Text'}));
});

test('all pages of entries and reflections are fetched, not just the first API page', async () => {
  const data = Array.from({length: 1003}, (_, id) => ({id:String(id)}));
  let calls = 0;
  const chain = {select: () => chain, order: () => chain, range: async (from,to) => { calls++; return {data:data.slice(from,to+1),error:null}; }};
  assert.equal((await listEntries({from:()=>chain})).length,1003);
  assert.equal(calls,3);
  calls=0;
  assert.equal((await listReflections({from:()=>chain})).length,1003);
  assert.equal(calls,3);
});

test('delete must confirm a row was actually removed', async () => {
  const client={from:()=>({delete:()=>({eq:()=>({select:()=>({single:async()=>({data:null,error:null})})})})})};
  await assert.rejects(deleteEntry(client,'id'));
});
