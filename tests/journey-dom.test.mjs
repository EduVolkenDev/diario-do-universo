import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createJourneyView } from '../src/scripts/journey.ts';

const source = readFileSync(new URL('../src/components/DiaryPage.astro', import.meta.url), 'utf8');
const html = source.slice(source.indexOf('<!doctype'));
const entry = {id:'entry-1',title:'Um sonho <img src=x onerror=alert(1)>',body:'Sonhei com uma árvore.',entry_type:'dream',occurred_at:'2026-10-25T12:00:00Z'};
const initial = {ownerId:'owner',entries:[entry],reflections:[],loading:false,entriesError:'',reflectionsError:''};
const tick = () => new Promise(resolve => setImmediate(resolve));

test('revisit opens a contextual history, saves a reflection and clears private content on sign-out', async () => {
  const dom = new JSDOM(html, {url:'http://localhost/'});
  globalThis.document=dom.window.document;
  globalThis.window=dom.window;
  dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  const $=selector=>document.querySelector(selector);
  const old={...entry,created_at:'2020-01-01T12:00:00Z',updated_at:'2020-01-01T12:00:00Z'};
  let state={...initial,entries:[old,{...old,id:'another',title:'Outro sinal'}],reflections:[]};
  let saved;
  const view=createJourneyView({
    save:async draft=>({...draft,position:1,created_at:new Date().toISOString()}),
    saved:reflection=>{saved=reflection;state={...state,reflections:[reflection]};view.update(state);},
    remove:async()=>{},retry:()=>{},
  });
  view.update(state);
  assert.equal($('#revisit').hidden,false);
  assert.equal($('#revisit-content img'),null);
  const selected=$('[data-revisit-entry]').dataset.revisitEntry;
  $('[data-next-revisit]').click();
  assert.notEqual($('[data-revisit-entry]').dataset.revisitEntry,selected);
  const chosen=$('[data-revisit-entry]').dataset.revisitEntry;
  $('[data-revisit-entry]').click();
  assert.equal($('#journey-dialog').open,true);
  assert.equal($('#revisit-question').hidden,false);
  assert.match($('#revisit-prompt').textContent,/percebe hoje/);
  $('#revisit-write').click();
  assert.equal(document.activeElement.id,'reflection-body');
  $('#reflection-body').value='Hoje compreendo melhor.';
  $('#reflection-form').dispatchEvent(new window.Event('submit',{cancelable:true}));
  await tick();
  assert.equal(saved.entry_id,chosen);
  assert.equal(saved.kind,'evolution');
  assert.match($('#revisit-content').textContent,/Hoje compreendo melhor/,'acknowledges the saved perspective before another invitation');
  assert.equal($('[data-revisit-entry]'),null);
  $('[data-revisit-done]').click();
  assert.notEqual($('[data-revisit-entry]').dataset.revisitEntry,chosen,'recent reflection rests from invitations');
  $('#journey-close').click();
  view.open(selected);
  assert.equal($('#revisit-question').hidden,true,'ordinary history does not retain a previous invitation');
  view.update({...initial,ownerId:null,entries:[]});
  assert.equal($('#revisit').hidden,true);
  assert.equal($('#revisit-content').textContent,'');
  assert.equal($('#revisit-prompt').textContent,'');
  dom.window.close();
});

test('DOM journey: timeline, failures, retry ID, learning, reopen, search and account clearing', async () => {
  const dom = new JSDOM(html, {url:'http://localhost/'});
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
  const $ = selector => document.querySelector(selector);
  // jsdom does not implement the browser's modal top layer. Test state + content;
  // native focus trapping and layout require real browser QA separately.
  dom.window.HTMLDialogElement.prototype.showModal = function() {this.open=true;};
  dom.window.HTMLDialogElement.prototype.close = function() {this.open=false;};
  window.confirm = () => true;
  let state = structuredClone(initial);
  let fail = true;
  let drafts = [];
  let pending;
  const view = createJourneyView({
    save: async draft => { drafts.push(draft); if(fail) throw new Error('offline'); return {...draft,position:drafts.length,created_at:'2026-10-27T12:00:00Z'}; },
    saved: r => {state.reflections.push(r);view.update(state);},
    remove: async()=>{}, retry:()=>{},
  });
  view.update(state);
  assert.equal($('#entries').querySelector('img'), null, 'text must not become HTML');
  $('#entries [data-open-entry]').click();
  assert.equal($('#journey-dialog').open,true);
  assert.equal($('#journey-title').textContent,entry.title);
  assert.equal($('#reflection-kind option[value=reopened]').disabled,true);
  $('#reflection-kind').value='learning';
  $('#reflection-kind').dispatchEvent(new window.Event('change'));
  $('#reflection-body').value='Aprendi a prestar atenção.';
  $('#reflection-body').dispatchEvent(new window.Event('input'));
  $('#reflection-form').dispatchEvent(new window.Event('submit',{cancelable:true}));
  await tick();
  assert.match($('#reflection-notice').textContent,/Não foi possível/);
  assert.equal($('#reflection-body').value,'Aprendi a prestar atenção.');
  fail=false;
  $('#reflection-form').dispatchEvent(new window.Event('submit',{cancelable:true}));
  await tick();
  assert.equal(drafts[0].id,drafts[1].id,'retry uses the same ID');
  assert.equal($('#reflection-body').value,'');
  assert.match($('#learning-list').textContent,/Aprendi a prestar atenção/);
  assert.equal($('#journey-content .journey-status').textContent,'Aprendizado');
  assert.equal($('#reflection-kind option[value=reopened]').disabled,false);
  $('#reflection-kind').value='reopened';
  $('#reflection-body').value='Outra perspectiva.';
  $('#reflection-form').dispatchEvent(new window.Event('submit',{cancelable:true}));
  await tick();
  assert.equal($('#journey-content .journey-status').textContent,'Em aberto');
  assert.equal($('#learning-list').children.length,0);
  assert.equal($('#journey-content ol').children.length,3);
  $('#journey-close').click();
  $('#entry-search').value='atencao';
  $('#entry-search').dispatchEvent(new window.Event('input'));
  assert.equal($('#entries').querySelectorAll('article').length,1,'search includes history without accents');
  $('#entry-status').value='learned';
  $('#entry-status').dispatchEvent(new window.Event('change'));
  assert.match($('#entries').textContent,/Nenhum sinal/);
  view.update({...state,reflectionsError:'Histórico indisponível'});
  assert.equal($('#entry-status').disabled,true);
  view.open(entry.id);
  assert.equal($('#reflection-form').hidden,true);
  view.update({...initial,ownerId:null,entries:[],reflections:[]});
  assert.equal($('#journey-dialog').open,false);
  assert.equal($('#journey-content').textContent,'');
  assert.equal($('#entry-search').value,'');
  assert.equal($('#learning-list').textContent,'');
  dom.window.close();
});

test('DOM rejects late save response after switching accounts', async () => {
  const dom = new JSDOM(html,{url:'http://localhost/'});
  globalThis.document=dom.window.document;
  globalThis.window=dom.window;
  dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  let resolve;
  let saved=0;
  const view=createJourneyView({save:()=>new Promise(r=>{resolve=r;}),saved:()=>{saved++;},remove:async()=>{},retry:()=>{}});
  view.update(initial);
  view.open(entry.id);
  document.querySelector('#reflection-body').value='Privado';
  document.querySelector('#reflection-form').dispatchEvent(new window.Event('submit',{cancelable:true}));
  view.update({...initial,ownerId:'other',entries:[]});
  resolve({id:'late',body:'Privado'});
  await tick();
  assert.equal(saved,0);
  assert.equal(document.querySelector('#reflection-body').value,'');
  assert.equal(document.querySelector('#journey-dialog').open,false);
  dom.window.close();
});
