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
const { calendarStages } = require("../src/lib/reminderSchedule.ts");
const {
  notificationText,
} = require("../supabase/functions/_shared/telegram.ts");

test("calendar D-7..D-1 at 21:00 Vietnam; no backfill, leap day and cross-year", () => {
  const due = new Date("2026-10-20T10:00:00+07:00");
  const stages = calendarStages(due, new Date("2026-10-01T00:00:00Z"));
  assert.equal(stages.length, 7);
  assert.equal(stages[0].toISOString(), "2026-10-13T14:00:00.000Z");
  assert.equal(stages[6].toISOString(), "2026-10-19T14:00:00.000Z");
  assert.equal(
    calendarStages(due, new Date("2026-10-19T22:00:00+07:00")).length,
    0,
  );
  assert.equal(
    calendarStages(
      new Date("2028-03-01T08:00:00+07:00"),
      new Date("2028-02-20"),
    )
      .at(-1)
      .toISOString(),
    "2028-02-29T14:00:00.000Z",
  );
  assert.equal(
    calendarStages(
      new Date("2027-01-01T08:00:00+07:00"),
      new Date("2026-12-01"),
    )[0].toISOString(),
    "2026-12-25T14:00:00.000Z",
  );
  assert.equal(calendarStages(new Date("invalid")).length, 0);
  assert.match(
    notificationText("acknowledged"),
    /chưa phải xác nhận hoàn thành/,
  );
  assert.match(notificationText("calendar", due.toISOString()), /20\/10\/2026/);
});

test("Telegram migration: private links, atomic outbox, guarded acknowledgement, revisions, calendar window and leases", async () => {
  const { PGlite } = require("@electric-sql/pglite");
  const pg = new PGlite();
  try {
    await pg.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
      grant usage on schema public,auth,storage to authenticated,service_role;
      create publication supabase_realtime;
    `);
    for (const name of [
      "0001_family_core.sql",
      "0002_family_social.sql",
      "0003_family_chat.sql",
      "0004_reliable_chat_push.sql",
      "0005_telegram_reminders.sql",
    ])
      await pg.exec(
        fs
          .readFileSync("supabase/migrations/" + name, "utf8")
          .replace("create extension if not exists pgcrypto;", ""),
      );
    await pg.exec(
      "grant select on public.reminders, public.family_members to authenticated;",
    );
    const a = "00000000-0000-0000-0000-000000000001",
      b = "00000000-0000-0000-0000-000000000002",
      c = "00000000-0000-0000-0000-000000000003",
      f = "10000000-0000-0000-0000-000000000001";
    await pg.exec(`insert into auth.users values('${a}'),('${b}'),('${c}');
      insert into families(id,name,invite_code,owner_id) values('${f}','Family','ABCDEFGH','${a}');
      insert into family_members(family_id,user_id,display_name) values('${f}','${a}','Dad'),('${f}','${b}','Mom');
      insert into telegram_links(user_id,chat_id,telegram_user_id,display_name,confirmed_at,enabled) values('${a}','11','11','A',now(),true),('${b}','22','22','B',now(),true);
    `);
    const as = async (id) =>
      pg.exec(
        `reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`,
      );
    const admin = async () =>
      pg.exec(
        "reset role; select set_config('request.jwt.claim.sub','',false);",
      );
    await as(a);
    await pg.query(
      "insert into reminders(id,family_id,title,due_at,created_by,created_by_name) values('r1',$1,'Private appointment',now()+interval '3 days',$2,'Dad')",
      [f, a],
    );
    await assert.rejects(() =>
      pg.exec("update reminders set acknowledged_at=now() where id='r1'"),
    );
    await assert.rejects(() => pg.exec("select * from telegram_links"));
    await assert.rejects(() => pg.exec("select * from telegram_jobs"));
    await assert.rejects(() =>
      pg.query("select acknowledge_family_reminder('r1',$1,1)", [b]),
    );
    await admin();
    assert.equal(
      (await pg.query("select recipient_id from telegram_jobs")).rows[0]
        .recipient_id,
      b,
    );
    for (const actor of [a, c, null])
      await assert.rejects(() =>
        pg.query("select acknowledge_family_reminder('r1',$1,1)", [actor]),
      );
    await assert.rejects(() =>
      pg.query("select acknowledge_family_reminder('r1',$1,null)", [b]),
    );
    await pg.query("select acknowledge_family_reminder('r1',$1,1)", [b]);
    await pg.query("select acknowledge_family_reminder('r1',$1,1)", [b]);
    assert.equal(
      (
        await pg.query(
          "select count(*)::int n from telegram_jobs where kind='acknowledged'",
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (await pg.query("select completed_at from reminders where id='r1'"))
        .rows[0].completed_at,
      null,
    );
    await as(a);
    await pg.exec(
      "update reminders set due_at=due_at+interval '1 day' where id='r1'",
    );
    await admin();
    assert.equal(
      (await pg.query("select schedule_version from reminders where id='r1'"))
        .rows[0].schedule_version,
      2,
    );
    assert.equal(
      (await pg.query("select acknowledged_at from reminders where id='r1'"))
        .rows[0].acknowledged_at,
      null,
    );
    await assert.rejects(() =>
      pg.query("select acknowledge_family_reminder('r1',$1,1)", [b]),
    );
    await pg.query("select acknowledge_family_reminder('r1',$1,2)", [b]);
    assert.equal(
      (
        await pg.query(
          "select count(*)::int n from telegram_jobs where kind='acknowledged'",
        )
      ).rows[0].n,
      2,
    );

    // Link code is one-use, and consuming it disables delivery until in-app confirmation.
    await pg.query(
      "insert into telegram_link_codes values($1,'digest',now()+interval '10 minutes')",
      [b],
    );
    assert.equal(
      (
        await pg.query(
          "select consume_telegram_link('digest','22','22','Mom') ok",
        )
      ).rows[0].ok,
      true,
    );
    assert.equal(
      (
        await pg.query(
          "select consume_telegram_link('digest','22','22','Mom') ok",
        )
      ).rows[0].ok,
      false,
    );
    assert.equal(
      (
        await pg.query("select enabled from telegram_links where user_id=$1", [
          b,
        ])
      ).rows[0].enabled,
      false,
    );
    await pg.query(
      "update telegram_links set confirmed_at=now(),enabled=true where user_id=$1",
      [b],
    );

    // 7 calendar days, not a rolling 168-hour window; no eighth-day or event-day reminder.
    await pg.exec(
      "update reminders set due_at='2026-10-20T10:00:00+07:00' where id='r1'",
    );
    await pg.exec(
      "select enqueue_telegram_calendar('2026-10-12T21:00:00+07:00'); select enqueue_telegram_calendar('2026-10-13T20:59:00+07:00');",
    );
    assert.equal(
      (
        await pg.query(
          "select count(*)::int n from telegram_jobs where kind='calendar'",
        )
      ).rows[0].n,
      0,
    );
    for (let day = 13; day <= 20; day++)
      await pg.query("select enqueue_telegram_calendar($1)", [
        `2026-10-${day}T21:00:00+07:00`,
      ]);
    await pg.exec(
      "select enqueue_telegram_calendar('2026-10-19T21:00:00+07:00')",
    );
    assert.equal(
      (
        await pg.query(
          "select count(*)::int n from telegram_jobs where kind='calendar'",
        )
      ).rows[0].n,
      14,
    );
    // Immediate attention idempotent, rate limited, not allowed through normal client insert.
    await pg.query("select create_attention_reminder($1,$2)", [
      a,
      "attention_testrequest01",
    ]);
    await pg.query("select create_attention_reminder($1,$2)", [
      a,
      "attention_testrequest01",
    ]);
    await assert.rejects(() =>
      pg.query("select create_attention_reminder($1,$2)", [
        a,
        "attention_testrequest02",
      ]),
    );
    await as(a);
    await assert.rejects(() =>
      pg.query(
        "insert into reminders(id,family_id,title,due_at,created_by,created_by_name,reminder_kind) values('bypass',$1,'x',now(),$2,'a','attention')",
        [f, a],
      ),
    );
    await admin();
    const first = (await pg.query("select * from claim_telegram_jobs()")).rows;
    const second = (await pg.query("select * from claim_telegram_jobs()")).rows;
    assert.ok(first.length > 0);
    assert.ok(first.every((x) => x.lease_id));
    assert.ok(second.every((x) => !first.some((y) => y.id === x.id)));
    // Transaction rollback also rolls back a queued post notification.
    const before = (await pg.query("select count(*)::int n from telegram_jobs"))
      .rows[0].n;
    await pg.exec("begin");
    await pg.query(
      "insert into family_posts(family_id,author_id,body) values($1,$2,'Never committed')",
      [f, a],
    );
    await pg.exec("rollback");
    assert.equal(
      (await pg.query("select count(*)::int n from telegram_jobs")).rows[0].n,
      before,
    );
    // Run production wake/Cron SQL against inert network stubs: zero-row insert
    // must not recurse into another worker; duplicate installs keep one job.
    await pg.exec(`create schema vault;
      create table vault.decrypted_secrets(name text primary key,decrypted_secret text);
      insert into vault.decrypted_secrets values('an_nam_project_url','https://example.supabase.co'),('an_nam_telegram_worker_secret','test');
      create schema net; create table net.calls(id bigserial);
      create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint language plpgsql as $$ declare n bigint; begin insert into net.calls default values returning id into n; return n; end $$;
      create schema cron; create table cron.job(jobid bigserial primary key,jobname text,schedule text);
      create function cron.unschedule(bigint) returns boolean language sql as $$ delete from cron.job where jobid=$1 returning true $$;
      create function cron.schedule(text,text,text) returns bigint language sql as $$ insert into cron.job(jobname,schedule) values($1,$2) returning jobid $$;
    `);
    const setup = fs.readFileSync(
      "supabase/setup/telegram_dispatch.sql",
      "utf8",
    );
    await pg.exec(setup);
    await pg.exec(setup);
    assert.equal(
      (await pg.query("select count(*)::int n from cron.job")).rows[0].n,
      1,
    );
    await pg.exec(
      "insert into telegram_jobs select * from telegram_jobs limit 1 on conflict do nothing",
    );
    assert.equal(
      (await pg.query("select count(*)::int n from net.calls")).rows[0].n,
      0,
    );
    await pg.query(
      "insert into family_posts(family_id,author_id,body) values($1,$2,'Wake once')",
      [f, a],
    );
    assert.equal(
      (await pg.query("select count(*)::int n from net.calls")).rows[0].n,
      1,
    );
  } finally {
    await pg.close();
  }
});
