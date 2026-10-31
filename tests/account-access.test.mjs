import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {signupOutcome} from '../src/lib/account-access.ts';
import {setupAccountAccess} from '../src/scripts/account-access.ts';

const source=readFileSync(new URL('../src/pages/index.astro',import.meta.url),'utf8');
const html=source.slice(source.indexOf('<!doctype'));
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('signup distinguishes duplicate, new confirmation, auto-confirmed and failed responses',()=>{
  assert.equal(signupOutcome({user:{identities:[]},session:null},null),'existing');
  assert.equal(signupOutcome({user:null,session:null},{code:'user_already_exists'}),'existing');
  assert.equal(signupOutcome({user:{identities:[{}]},session:null},null),'confirmation');
  assert.equal(signupOutcome({user:{identities:[{}]},session:{}},null),'signed-in');
  assert.equal(signupOutcome({user:null,session:null},null),'error');
  assert.equal(signupOutcome({user:null,session:null},{code:'unexpected_failure'}),'error');
});

test('duplicate signup offers login and recovery without creating or announcing another account',async()=>{
  const dom=new JSDOM(html,{url:'https://diario.palavrasdouniverso.com/'});
  globalThis.window=dom.window;globalThis.document=dom.window.document;
  const $=selector=>document.querySelector(selector);
  let calls=0;let recoveryRequest;
  setupAccountAccess({auth:{
    signUp:async()=>{calls++;return {data:{user:{identities:[]},session:null},error:null};},
    resetPasswordForEmail:async(email,options)=>{recoveryRequest={email,options};return {error:null};},
  }});
  $('#auth-panel').hidden=false;
  $('#auth-email').value='existing@example.test';$('#auth-password').value='test-password';
  $('#signup').click();await tick();
  assert.match($('#auth-notice').textContent,/já possui uma conta/);
  assert.doesNotMatch($('#auth-notice').textContent,/Conta criada/);
  assert.equal($('#existing-account').hidden,false);
  assert.equal($('#auth-password').value,'');
  assert.equal($('#signup').disabled,true);
  $('#signup').click();await tick();assert.equal(calls,1);
  $('#recover-password').click();await tick();
  assert.equal(recoveryRequest.email,'existing@example.test');
  assert.equal(recoveryRequest.options.redirectTo,'https://diario.palavrasdouniverso.com/');
  assert.match($('#auth-notice').textContent,/receberá um link/);
  assert.equal($('#recover-password').disabled,true);
  $('#auth-email').value='other@example.test';$('#auth-email').dispatchEvent(new window.Event('input'));
  assert.equal($('#signup').disabled,false);
  assert.equal($('#existing-account').hidden,true);
  dom.window.close();
});

test('recovery validates matching passwords, checks user and accepts only a recovery session',async()=>{
  const dom=new JSDOM(html,{url:'http://localhost/'});
  globalThis.window=dom.window;globalThis.document=dom.window.document;
  const $=selector=>document.querySelector(selector);
  let writes=0;let newValue;let fail=true;
  const access=setupAccountAccess({auth:{
    getUser:async()=>({data:{user:{id:'owner'}},error:null}),
    updateUser:async value=>{writes++;newValue=value;if(fail)return {error:{code:'weak_password'}};return {error:null};},
  }});
  const submit=()=>$('#password-recovery-form').dispatchEvent(new window.Event('submit',{cancelable:true}));
  $('#new-password').value='new-test-password';$('#confirm-password').value='new-test-password';
  submit();await tick();assert.equal(writes,0,'normal signed-in session does not activate the reset form');
  access.handleSession('PASSWORD_RECOVERY','owner');
  assert.equal($('#password-recovery-form').hidden,false);
  assert.equal($('#auth-form').hidden,true);
  assert.equal($('.signed-in').hidden,true);
  $('#new-password').value='new-test-password';$('#confirm-password').value='different-test-password';
  submit();await tick();assert.equal(writes,0);
  $('#confirm-password').value='new-test-password';$('#confirm-password').dispatchEvent(new window.Event('input'));
  submit();await tick();assert.equal(writes,1);assert.match($('#password-recovery-notice').textContent,/forte/);
  assert.equal($('#password-recovery-save').disabled,false);
  assert.equal($('#new-password').value,'new-test-password');
  access.handleSession('TOKEN_REFRESHED','owner');
  assert.equal($('.signed-in').hidden,true);
  fail=false;submit();await tick();
  assert.equal(newValue.password,'new-test-password');
  assert.equal($('#password-recovery-form').hidden,true);
  assert.equal($('#new-password').value,'');
  assert.match($('#auth-notice').textContent,/Senha atualizada/);
  access.handleSession('PASSWORD_RECOVERY','owner');
  $('#new-password').value='private-test-draft';
  access.handleSession('SIGNED_OUT',null);
  assert.equal($('#password-recovery-form').hidden,true);
  assert.equal($('#new-password').value,'');
  dom.window.close();
});

test('recovery failures restore buttons and expired links offer a new request',async()=>{
  const dom=new JSDOM(html,{url:'http://localhost/#error=access_denied&error_code=otp_expired'});
  globalThis.window=dom.window;globalThis.document=dom.window.document;
  const $=selector=>document.querySelector(selector);
  setupAccountAccess({auth:{resetPasswordForEmail:async()=>({error:{code:'over_email_send_rate_limit'}})}});
  assert.equal($('#auth-panel').hidden,false);
  assert.match($('#auth-notice').textContent,/expirou/);
  $('#recover-password').click();assert.equal(document.activeElement.id,'auth-email');
  $('#auth-email').value='qa@example.test';$('#recover-password').click();await tick();
  assert.match($('#auth-notice').textContent,/Aguarde/);
  assert.equal($('#recover-password').disabled,false);
  assert.equal($('#auth-email').disabled,false);
  dom.window.close();
});
