const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    f,
  );
const { coalescedTask } = require("../src/lib/syncRunner.ts");
const { assertPushAccepted } = require("../src/lib/pushResult.ts");
const {
  pushPayload,
  retryAt,
  permanentPushError,
} = require("../supabase/functions/_shared/pushPolicy.ts");
test("a message written during a sync always runs a trailing sync, without overlap", async () => {
  let release,
    calls = 0,
    active = 0,
    max = 0;
  const run = coalescedTask(async () => {
    calls++;
    active++;
    max = Math.max(max, active);
    if (calls === 1) await new Promise((r) => (release = r));
    active--;
  });
  const first = run();
  await Promise.resolve();
  const second = run();
  run();
  release();
  await Promise.all([first, second]);
  assert.equal(calls, 2);
  assert.equal(max, 1);
  await run();
  assert.equal(calls, 3);
});
test("zero recipients and partial acceptance are not delivery success; durable queue needs job ID", () => {
  for (const value of [
    null,
    {},
    { target_devices: 0, accepted_by_expo: 0 },
    { target_devices: 2, accepted_by_expo: 1 },
    { managed_by_server: true },
  ])
    assert.throws(() => assertPushAccepted(value));
  assert.doesNotThrow(() =>
    assertPushAccepted({ target_devices: 1, accepted_by_expo: 1 }),
  );
  assert.doesNotThrow(() =>
    assertPushAccepted({ managed_by_server: true, job_id: "job" }),
  );
});
test("chat pushes use alerts/high priority and event-level collapse, not a shared collapse ID", () => {
  const job = {
    id: "event1",
    kind: "message",
    message_id: "msg",
    family_id: "family",
    expires_at: "2026-10-10T00:00:00Z",
  };
  const payload = pushPayload(job, "test-token", {
    created_by_name: "Ba",
    body: "Hello",
  });
  assert.equal(payload.priority, "high");
  assert.equal(payload.sound, "default");
  assert.equal(payload.data.route, "/family/message");
  assert.notEqual(
    payload.collapseId,
    pushPayload({ ...job, id: "event2" }, "test-token").collapseId,
  );
  assert.equal(permanentPushError("InvalidCredentials"), true);
  assert.equal(permanentPushError("ExpoHTTP503"), false);
  assert.ok(Date.parse(retryAt(2, 0)) > Date.parse(retryAt(1, 0)));
  assert.ok(Date.parse(retryAt(50, 0)) <= 3600000);
});
test("server chat push migration is atomic, idempotent per message, leased, private and family-scoped", async () => {
  const { PGlite } = require("@electric-sql/pglite");
  const pg = new PGlite();
  await pg.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
    grant usage on schema public,auth,storage to authenticated,service_role;create publication supabase_realtime;`);
  for (const file of [
    "0001_family_core.sql",
    "0002_family_social.sql",
    "0003_family_chat.sql",
    "0004_reliable_chat_push.sql",
  ])
    await pg.exec(
      fs
        .readFileSync("supabase/migrations/" + file, "utf8")
        .replace("create extension if not exists pgcrypto;", ""),
    );
  const a = "00000000-0000-0000-0000-000000000001",
    b = "00000000-0000-0000-0000-000000000002",
    outsider = "00000000-0000-0000-0000-000000000003",
    f = "10000000-0000-0000-0000-000000000001";
  await pg.exec(
    `insert into auth.users values('${a}'),('${b}'),('${outsider}');insert into public.families(id,name,invite_code,owner_id) values('${f}','Test','ABCDEFGH','${a}');insert into public.family_members(family_id,user_id,display_name) values('${f}','${a}','A'),('${f}','${b}','B');grant select,insert,update on public.family_messages to authenticated;`,
  );
  const asUser = async (id) =>
    pg.exec(
      `reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`,
    );
  await asUser(a);
  const write = () =>
    pg.query(
      "insert into public.family_messages(id,family_id,created_by,created_by_name,body) values('msg',$1,$2,'A','Hello') on conflict(id) do update set body=excluded.body",
      [f, a],
    );
  await pg.exec("begin");
  await write();
  await pg.exec("rollback;reset role");
  assert.equal(
    (await pg.query("select * from public.chat_push_jobs")).rows.length,
    0,
  );
  await asUser(a);
  await write();
  await write();
  await assert.rejects(() => pg.query("select * from public.chat_push_jobs"));
  await assert.rejects(() =>
    pg.query("select * from public.claim_chat_push()"),
  );
  const health = (
    await pg.query("select public.family_push_health($1) as health", [f])
  ).rows[0].health;
  assert.equal(health.pending, 1);
  assert.equal(health.partner_devices, 0);
  await asUser(outsider);
  await assert.rejects(() =>
    pg.query("select public.family_push_health($1)", [f]),
  );
  await pg.exec("reset role;set role service_role");
  const claimed = (await pg.query("select * from public.claim_chat_push()"))
    .rows;
  assert.equal(claimed.length, 1);
  assert.equal(claimed[0].attempts, 1);
  assert.ok(claimed[0].lease_id);
  assert.equal(
    (await pg.query("select * from public.claim_chat_push()")).rows.length,
    0,
  );
  await pg.exec(
    "update public.chat_push_jobs set lease_until=now()-interval '1 second'",
  );
  const recovered = (await pg.query("select * from public.claim_chat_push()"))
    .rows[0];
  assert.equal(recovered.attempts, 2);
  assert.notEqual(recovered.lease_id, claimed[0].lease_id);
  await pg.exec(
    "update public.chat_push_jobs set expires_at=now()-interval '1 second'",
  );
  assert.equal(
    (await pg.query("select * from public.claim_chat_push()")).rows.length,
    0,
  );
  assert.equal(
    (await pg.query("select state from public.chat_push_jobs")).rows[0].state,
    "expired",
  );
  await pg.close();
});
