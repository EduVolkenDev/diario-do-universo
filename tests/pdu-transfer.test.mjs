import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {parsePduReading,trustedPduOrigins,isTransferMessage} from '../src/lib/pdu-transfer.ts';
import {importPduReading} from '../src/lib/pdu-import.ts';
import {setupPduImport} from '../src/scripts/pdu-import.ts';

const reading={version:1,app:'pdu',readingId:'test-reading',occurredAt:'2026-10-01T12:00:00Z',timezone:'Europe/London',locale:'pt-BR',question:'Uma pergunta <img src=x>',spreadLabel:'Três cartas',interpretation:'Uma leitura para lembrar.',cards:[{name:'A Estrela',position:'Caminho',reversed:false}]};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const html=readFileSync(new URL('../src/components/DiaryPage.astro',import.meta.url),'utf8');
function page(url='https://diario.palavrasdouniverso.com/importar/#pdu=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'){
  const dom=new JSDOM(html.slice(html.indexOf('<!doctype')),{url});
  globalThis.window=dom.window;globalThis.document=dom.window.document;
  return dom;
}

test('transfer validator bounds content, strips unrecognized fields and rejects bad dates and timezones',()=>{
  assert.deepEqual(parsePduReading({...reading,access_token:'must-not-transfer'}),reading);
  for(const invalid of [{...reading,cards:[]},{...reading,interpretation:'x'.repeat(20001)},{...reading,timezone:'nonsense'},{...reading,occurredAt:'yesterday'},{...reading,readingId:'../../id'},{...reading,cards:[{name:'Card',position:'Position',reversed:'yes'}]}]) assert.equal(parsePduReading(invalid),null);
});

test('handshake requires exact origin, opener and random nonce',()=>{
  const opener={};const nonce='a'.repeat(32);const origins=trustedPduOrigins();
  const event={source:opener,origin:origins[0],data:{type:'du:pdu-reading',nonce}};
  assert.equal(isTransferMessage(event,opener,nonce,origins),true);
  assert.equal(isTransferMessage({...event,origin:'https://palavrasdouniverso.com.evil.test'},opener,nonce,origins),false);
  assert.equal(isTransferMessage({...event,source:{}},opener,nonce,origins),false);
  assert.equal(isTransferMessage(event,opener,'b'.repeat(32),origins),false);
  assert.equal(trustedPduOrigins('http://localhost:3000',false).length,2);
  assert.equal(trustedPduOrigins('http://localhost:3000',true).length,3);
});

test('preview requires consent and sign-in; persists across reload and clears after successful import',async()=>{
  const dom=page();const $=s=>document.querySelector(s);
  const opener={postMessage:()=>{}};window.opener=opener;
  let auth=0;let writes=0;let saved;
  const client={auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null})},from:()=>({insert:draft=>{writes++;return {select:()=>({single:async()=>({data:{...draft,id:'entry-id',created_at:new Date().toISOString(),updated_at:new Date().toISOString()},error:null})})};}})};
  const view=setupPduImport({client,openAuth:()=>auth++,saved:e=>saved=e});
  window.dispatchEvent(new window.MessageEvent('message',{origin:'https://evil.test',source:opener,data:{type:'du:pdu-reading',nonce:'a'.repeat(32),reading}}));
  assert.equal($('#pdu-import-preview').hidden,true);
  window.dispatchEvent(new window.MessageEvent('message',{origin:'https://palavrasdouniverso.com',source:opener,data:{type:'du:pdu-reading',nonce:'a'.repeat(32),reading}}));
  assert.equal($('#pdu-import-preview').hidden,false);
  assert.equal($('#pdu-import-preview img'),null);
  assert.equal(writes,0);
  $('#pdu-import-save').click();assert.equal(auth,1);assert.equal(writes,0);
  $('#pdu-import-note').value='Meu olhar';$('#pdu-import-note').dispatchEvent(new window.Event('input'));
  assert.match(window.sessionStorage.getItem('du:pdu-preview:v1'),/Meu olhar/);
  view.handleOwner('owner');assert.equal(writes,0,'signing in must not automatically save');
  $('#pdu-import-save').click();await tick();
  assert.equal(writes,1);assert.equal(saved.source.readingId,reading.readingId);
  assert.match(saved.body,/Meu olhar/);assert.equal(window.sessionStorage.getItem('du:pdu-preview:v1'),null);
  assert.equal($('#pdu-import-open').hidden,false);dom.window.close();
});

test('cached preview restores and is erased for a different account; root offers resume after OAuth',()=>{
  const dom=page();
  window.sessionStorage.setItem('du:pdu-preview:v1',JSON.stringify({reading,note:'Privado',receivedAt:Date.now(),owner:'owner'}));
  const view=setupPduImport({client:null,openAuth:()=>{},saved:()=>{}});
  assert.equal(document.querySelector('#pdu-import-note').value,'Privado');
  view.handleOwner('other');
  assert.equal(document.querySelector('#pdu-import-preview').hidden,true);
  assert.equal(window.sessionStorage.getItem('du:pdu-preview:v1'),null);
  document.querySelector('#pdu-import').remove();
  window.sessionStorage.setItem('du:pdu-preview:v1',JSON.stringify({reading,note:'',receivedAt:Date.now(),owner:'owner'}));
  const root=setupPduImport({client:null,openAuth:()=>{},saved:()=>{}});
  assert.equal(document.querySelector('#pdu-pending').hidden,false);
  root.handleOwner('other');assert.equal(document.querySelector('#pdu-pending').hidden,true);
  dom.window.close();
});

test('accepted duplicate uses original entry and does not overwrite notes',async()=>{
  const original={id:'original',body:'Original note',source:reading};
  let eqs=[];
  const chain={eq:(key,value)=>{eqs.push([key,value]);return chain;},single:async()=>({data:original,error:null})};
  const client={from:()=>({insert:()=>({select:()=>({single:async()=>({data:null,error:{code:'23505'}})})}),select:()=>chain})};
  const result=await importPduReading(client,'owner',reading,'Different note');
  assert.equal(result.duplicate,true);assert.equal(result.entry.body,'Original note');
  assert.deepEqual(eqs,[['owner_user_id','owner'],['source_key','pdu:test-reading']]);
});

test('failed save retains the preview and note for retry; cancellation prevents a late replay',async()=>{
  const dom=page();window.confirm=()=>true;
  const opener={postMessage:()=>{}};window.opener=opener;
  const client={auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null})},from:()=>({insert:()=>({select:()=>({single:async()=>({data:null,error:{code:'NETWORK'}})})})})};
  const view=setupPduImport({client,openAuth:()=>{},saved:()=>assert.fail('must not report saved')});
  const receive=()=>window.dispatchEvent(new window.MessageEvent('message',{origin:'https://palavrasdouniverso.com',source:opener,data:{type:'du:pdu-reading',nonce:'a'.repeat(32),reading}}));
  receive();view.handleOwner('owner');
  document.querySelector('#pdu-import-note').value='Meu olhar';
  document.querySelector('#pdu-import-note').dispatchEvent(new window.Event('input'));
  document.querySelector('#pdu-import-save').click();await tick();
  assert.equal(document.querySelector('#pdu-import-save').disabled,false);
  assert.equal(document.querySelector('#pdu-import-preview').hidden,false);
  assert.match(window.sessionStorage.getItem('du:pdu-preview:v1'),/Meu olhar/);
  document.querySelector('#pdu-import-cancel').click();receive();
  assert.equal(document.querySelector('#pdu-import-preview').hidden,true);
  assert.equal(window.sessionStorage.getItem('du:pdu-preview:v1'),null);
  dom.window.close();
});

test('expired previews are erased instead of restoring private content',()=>{
  const dom=page();
  window.sessionStorage.setItem('du:pdu-preview:v1',JSON.stringify({reading,note:'Expired',receivedAt:Date.now()-31*60*1000,owner:null}));
  setupPduImport({client:null,openAuth:()=>{},saved:()=>{}});
  assert.equal(document.querySelector('#pdu-import-preview').hidden,true);
  assert.equal(document.querySelector('#pdu-import-note').value,'');
  assert.equal(window.sessionStorage.getItem('du:pdu-preview:v1'),null);
  dom.window.close();
});

test('a duplicate never discards a newly written note or claims that note was saved',async()=>{
  const dom=page();
  window.sessionStorage.setItem('du:pdu-preview:v1',JSON.stringify({reading,note:'Uma nova percepção',receivedAt:Date.now(),owner:'owner'}));
  const chain={eq:()=>chain,single:async()=>({data:{id:'original',body:'Original',source:reading},error:null})};
  const client={auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null})},from:()=>({insert:()=>({select:()=>({single:async()=>({data:null,error:{code:'23505'}})})}),select:()=>chain})};
  const view=setupPduImport({client,openAuth:()=>{},saved:()=>{}});
  view.handleOwner('owner');
  document.querySelector('#pdu-import-save').click();await tick();
  assert.equal(document.querySelector('#pdu-import-note').value,'Uma nova percepção');
  assert.equal(document.querySelector('#pdu-import-preview').hidden,false);
  assert.equal(document.querySelector('#pdu-import-save').disabled,true);
  assert.match(document.querySelector('#pdu-import-status').textContent,/não foi adicionada/);
  assert.equal(document.querySelector('#pdu-import-open').hash,'#entry-original');
  assert.match(window.sessionStorage.getItem('du:pdu-preview:v1'),/Uma nova percepção/);
  dom.window.close();
});
