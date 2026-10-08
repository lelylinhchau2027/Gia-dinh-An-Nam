const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
// Run with PGLITE_TEST_MODULE=/path/to/@electric-sql/pglite node --test tests/security.test.cjs
test("migrations execute and enforce family isolation for posts, likes, comments and photos", async () => {
  const { PGlite } = require(
    process.env.PGLITE_TEST_MODULE || "@electric-sql/pglite",
  );
  const pg = new PGlite();
  await pg.exec(`
    create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;
    grant usage on schema public, auth, storage to authenticated;
    grant select,insert,delete on storage.objects to authenticated;
    create publication supabase_realtime;
  `);
  // PGlite provides gen_random_uuid in core but does not package pgcrypto.
  await pg.exec(
    fs
      .readFileSync("supabase/migrations/0001_family_core.sql", "utf8")
      .replace("create extension if not exists pgcrypto;", ""),
  );
  await pg.exec(
    fs.readFileSync("supabase/migrations/0002_family_social.sql", "utf8"),
  );
  await pg.exec(
    "grant select,insert,update,delete on public.family_members, public.families, public.children, public.care_entries to authenticated",
  );
  const a = "00000000-0000-0000-0000-000000000001",
    b = "00000000-0000-0000-0000-000000000002",
    outsider = "00000000-0000-0000-0000-000000000003";
  const f = "10000000-0000-0000-0000-000000000001",
    other = "10000000-0000-0000-0000-000000000002";
  await pg.exec(`insert into auth.users values ('${a}'),('${b}'),('${outsider}');
    insert into public.families(id,name,invite_code,owner_id) values ('${f}','Nhà mình','ABCDEFGH','${a}'),('${other}','Nhà khác','IJKLMNOP','${outsider}');
    insert into public.family_members(family_id,user_id,display_name) values ('${f}','${a}','Ba'),('${f}','${b}','Mẹ'),('${other}','${outsider}','Khác');
    insert into public.children(id,family_id,name) values ('baby','${f}','Bé'),('other-baby','${other}','Khác');
  `);
  const asUser = async (id) => {
    await pg.exec(
      `reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`,
    );
  };
  await asUser(a);
  const post = (
    await pg.query(
      `insert into public.family_posts(family_id,author_id,body) values ($1,$2,'Một ngày vui') returning id`,
      [f, a],
    )
  ).rows[0].id;
  await assert.rejects(() =>
    pg.query(
      `insert into public.family_posts(family_id,author_id,body) values ($1,$2,'Giả mạo')`,
      [f, b],
    ),
  );
  await pg.query(
    `insert into storage.objects(bucket_id,name) values ('family-media',$1)`,
    [`${f}/${a}/photo.jpg`],
  );
  await asUser(b);
  assert.equal(
    (await pg.query("select * from public.family_posts")).rows.length,
    1,
  );
  assert.equal(
    (await pg.query("select * from storage.objects")).rows.length,
    1,
  );
  await pg.query(
    "insert into public.post_comments(post_id,family_id,author_id,body) values ($1,$2,$3,$4)",
    [post, f, b, "Dễ thương"],
  );
  await pg.query(
    "insert into public.post_likes(post_id,family_id,user_id) values ($1,$2,$3)",
    [post, f, b],
  );
  await pg.query("delete from public.family_posts where id=$1", [post]);
  assert.equal(
    (await pg.query("select * from public.family_posts")).rows.length,
    1,
    "partner cannot delete author post",
  );
  await assert.rejects(() =>
    pg.query(
      `insert into public.care_entries(id,family_id,child_id,kind,occurred_at,created_by,created_by_name) values ('bad',$1,'other-baby','milk',now(),$2,'Mẹ')`,
      [f, b],
    ),
  );
  await asUser(outsider);
  for (const table of [
    "public.family_posts",
    "public.post_comments",
    "public.post_likes",
    "storage.objects",
  ])
    assert.equal(
      (await pg.query(`select * from ${table}`)).rows.length,
      0,
      table,
    );
  await assert.rejects(() =>
    pg.query(
      "insert into public.post_comments(post_id,family_id,author_id,body) values ($1,$2,$3,$4)",
      [post, other, outsider, "Sai gia đình"],
    ),
  );
  await assert.rejects(() =>
    pg.query(
      `insert into storage.objects(bucket_id,name) values ('family-media',$1)`,
      [`${f}/${outsider}/photo.jpg`],
    ),
  );
  await asUser(a);
  await pg.query("delete from public.family_posts where id=$1", [post]);
  assert.equal(
    (await pg.query("select * from public.post_comments")).rows.length,
    0,
  );
  assert.equal(
    (await pg.query("select * from public.post_likes")).rows.length,
    0,
  );
  await pg.close();
});
