import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('Postgres migrations: ownership, append-only history, validation and deletion cascade', async () => {
  const db=new PGlite();
  try {
    // Minimal Supabase Auth contract. All fixtures exist only in this in-memory DB.
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
      grant usage on schema public, auth to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      insert into auth.users values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
    `);
    for(const name of ['20261020000100_create_diario_entries.sql','20261027043408_add_entry_reflections.sql','20261031034638_add_pdu_reading_source.sql']) {
      await db.exec(readFileSync(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8'));
    }
    await db.exec(`set role authenticated; set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';`);
    await db.query(`insert into public.entries(id,owner_user_id,entry_type,body) values ($1,$2,'dream','Fixture')`,['10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001']);
    const source={app:'pdu',version:1,readingId:'reading-one',interpretation:'Fixture reading',cards:[{name:'A Estrela',position:'Caminho',reversed:false}]};
    await db.query(`update public.entries set source=$1, source_key='pdu:reading-one' where id=$2`,[JSON.stringify(source),'10000000-0000-4000-8000-000000000001']);
    await assert.rejects(db.query(`insert into public.entries(owner_user_id,entry_type,body,source,source_key) values($1,'symbol','Duplicate',$2,'pdu:reading-one')`,['00000000-0000-4000-8000-000000000001',JSON.stringify(source)]),/duplicate key/);
    await assert.rejects(db.exec(`update public.entries set source_key='pdu:other'`),/check constraint/);
    await assert.rejects(db.exec(`update public.entries set source='{}',source_key='pdu:invalid'`),/check constraint/);
    await db.query(`insert into public.entry_reflections(id,entry_id,kind,body) values ($1,$2,'learning','Fixture learning')`,['20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001']);
    assert.equal((await db.query('select * from public.entry_reflections')).rows.length,1);
    await assert.rejects(db.exec(`update public.entry_reflections set body='changed'`),/permission denied/);
    await assert.rejects(db.exec(`delete from public.entry_reflections`),/permission denied/);
    await assert.rejects(db.exec(`insert into public.entry_reflections(id,entry_id,kind,body,created_at) values(gen_random_uuid(),'10000000-0000-4000-8000-000000000001','learning','Forged time',now())`),/permission denied/);
    await assert.rejects(db.exec(`insert into public.entry_reflections(id,entry_id,kind,body) values(gen_random_uuid(),'10000000-0000-4000-8000-000000000001','invalid','Text')`),/check constraint/);
    await assert.rejects(db.exec(`insert into public.entry_reflections(id,entry_id,kind,body) values(gen_random_uuid(),'10000000-0000-4000-8000-000000000001','learning',' ')`),/check constraint/);
    await assert.rejects(db.exec(`insert into public.entry_reflections(id,entry_id,kind,body) values(gen_random_uuid(),'10000000-0000-4000-8000-000000000001','learning',repeat('x',10001))`),/check constraint/);
    await db.exec(`set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002'`);
    assert.equal((await db.query('select * from public.entries')).rows.length,0);
    assert.equal((await db.query('select * from public.entry_reflections')).rows.length,0);
    await db.query(`insert into public.entries(owner_user_id,entry_type,body,source,source_key) values($1,'symbol','Independent owner',$2,'pdu:reading-one')`,['00000000-0000-4000-8000-000000000002',JSON.stringify(source)]);
    assert.equal((await db.query('select * from public.entries')).rows.length,1,'the same source is allowed in a different independent account');
    await assert.rejects(db.exec(`insert into public.entry_reflections(id,entry_id,kind,body) values(gen_random_uuid(),'10000000-0000-4000-8000-000000000001','learning','Intrusion')`),/row-level security/);
    assert.equal((await db.query(`delete from public.entries where id='10000000-0000-4000-8000-000000000001' returning id`)).rows.length,0);
    await db.exec(`reset role; set role anon;`);
    await assert.rejects(db.query('select * from public.entries'),/permission denied/);
    await assert.rejects(db.query('select * from public.entry_reflections'),/permission denied/);
    await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001'`);
    await db.exec(`delete from public.entries where id='10000000-0000-4000-8000-000000000001'`);
    await db.exec('reset role');
    assert.equal((await db.query('select * from public.entry_reflections')).rows.length,0,'parent deletion erases private history');
  } finally {await db.close();}
});
