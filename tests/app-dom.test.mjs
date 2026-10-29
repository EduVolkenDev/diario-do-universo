import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

test('app integration: signed-out draft, save, garden, reflection, reload, failure and sign-out race', async () => {
  process.env.DIARY_TEST_AUTH='mock';
  const source=readFileSync(new URL('../src/pages/index.astro',import.meta.url),'utf8');
  const dom=new JSDOM(source.slice(source.indexOf('<!doctype')),{url:'http://localhost/'});
  globalThis.window=dom.window;
  globalThis.document=dom.window.document;
  dom.window.HTMLElement.prototype.scrollIntoView=function(){};
  dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  window.matchMedia=()=>({matches:true});
  window.confirm=()=>true;
  const $=selector=>document.querySelector(selector);
  const flush=()=>new Promise(resolve=>setTimeout(resolve,15));
  let authCallback;
  let user=null;
  const rows={entries:[],entry_reflections:[]};
  let requests=0;
  let failReads=false;
  let failWrites=false;
  let delayReads=false;
  let waiting=[];
  const resolveData=value=>delayReads?new Promise(resolve=>waiting.push(()=>resolve(value))):Promise.resolve(value);
  globalThis.diaryTestClient={
    auth:{
      onAuthStateChange: callback=>{authCallback=callback;},
      getUser:async()=>({data:{user}}),
      signOut:async()=>{user=null;authCallback('SIGNED_OUT',null);return {error:null};},
      signInWithPassword:async()=>{throw new Error('network');},
    },
    from:table=>{
      const query={
        action:'read',draft:null,match:null,
        select:()=>query, order:()=>query,
        insert:draft=>{query.action='insert';query.draft=draft;return query;},
        delete:()=>{query.action='delete';return query;},
        eq:(key,value)=>{query.match=[key,value];return query;},
        range:async(start,end)=>{
          requests++;
          if(failReads)return {data:null,error:{code:'PGRST205'}};
          const result={data:structuredClone(rows[table].slice(start,end+1)),error:null};
          return resolveData(result);
        },
        single:async()=>{
          if(failWrites)return {data:null,error:{code:'NETWORK'}};
          if(query.action==='insert'){
            const data={...query.draft,position:rows[table].length+1,created_at:'2026-10-27T12:00:00Z',updated_at:'2026-10-27T12:00:00Z'};
            rows[table].push(data);return {data,error:null};
          }
          return {data:null,error:{code:'NOT_FOUND'}};
        },
      };
      return query;
    },
  };
  await import('../src/scripts/app.ts');
  authCallback('INITIAL_SESSION',null);
  $('#body').value='Sonhei com uma árvore.';
  $('#body').dispatchEvent(new window.Event('input'));
  $('#save').click();
  assert.equal($('#auth-panel').hidden,false,'signed-out save opens login');
  assert.equal($('#body').value,'Sonhei com uma árvore.','draft survives opening login');
  user={id:'owner',email:'qa@example.test'};
  authCallback('SIGNED_IN',{user});
  await flush();
  assert.equal($('#auth-form').hidden,true);
  assert.equal($('.signed-in').hidden,false);
  $('#garden-start').click();
  assert.equal(document.activeElement.id,'body','garden CTA goes to composer while signed in');
  $('#save').click();
  await flush();
  assert.equal(rows.entries.length,1);
  assert.equal($('#body').value,'');
  assert.equal($('#entries').querySelectorAll('article').length,1);
  assert.equal($('#garden-stars').children.length,1);
  $('#garden-stars button').click();
  assert.equal($('#journey-dialog').open,true);
  $('#reflection-kind').value='conclusion';
  $('#reflection-body').value='Concluí que preciso fazer uma pausa.';
  $('#reflection-form').dispatchEvent(new window.Event('submit',{cancelable:true}));
  await flush();
  assert.equal(rows.entry_reflections.length,1);
  assert.match($('#learning-list').textContent,/preciso fazer uma pausa/);
  $('#journey-close').click();
  const beforeRefresh=requests;
  $('#entries-retry').dispatchEvent(new window.Event('click'));
  await flush();
  assert.equal(requests,beforeRefresh+2,'re-fetches records and reflections');
  assert.match($('#learning-list').textContent,/preciso fazer uma pausa/,'learning survives reload from persistence adapter');
  $('#body').value='Outro registro';
  $('#body').dispatchEvent(new window.Event('input'));
  failWrites=true;
  $('#save').click();
  await flush();
  assert.equal($('#body').value,'Outro registro');
  assert.match($('#notice').textContent,/Não foi possível guardar/);
  assert.equal($('#save').disabled,false);
  failWrites=false;
  failReads=true;
  $('#entries-retry').dispatchEvent(new window.Event('click'));
  await flush();
  assert.match($('#collection-notice').textContent,/ativado/);
  assert.equal($('#entries-retry').hidden,false);
  failReads=false;
  delayReads=true;
  $('#entries-retry').click();
  $('#signout').click();
  await flush();
  waiting.forEach(resolve=>resolve());
  await flush();
  assert.equal($('#entries').querySelectorAll('article').length,0);
  assert.equal($('#learning-list').textContent,'');
  assert.equal($('#body').value,'');
  assert.equal($('#signed-in-label').textContent,'');
  $('#auth-email').value='qa@example.test';
  $('#auth-password').value='test-only';
  $('#auth-form').dispatchEvent(new window.Event('submit',{cancelable:true}));
  await flush();
  assert.equal($('#auth-submit').disabled,false,'network error does not leave login stuck');
  assert.match($('#auth-notice').textContent,/Tente novamente/);
  dom.window.close();
  delete globalThis.diaryTestClient;
  delete process.env.DIARY_TEST_AUTH;
});
