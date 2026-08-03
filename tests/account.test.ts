import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EXPORTED_TABLES } from '../src/lib/account';

/**
 * The export is only meaningful if it is complete. A new user-owned table that
 * nobody remembered to add would leave people with a copy of their data that
 * quietly omits part of it, and a deletion story that no longer matches the
 * privacy notice.
 */
function userOwnedTables(): string[] {
  const dir = new URL('../supabase/migrations/', import.meta.url);
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(new URL(f, dir), 'utf8'))
    .join('\n');

  const found = new Set<string>();
  // Each `create table x ( … );` block, kept whole so the auth.users
  // reference is matched against the right table.
  for (const match of sql.matchAll(/create table (?:if not exists )?(\w+)\s*\(([\s\S]*?)\n\);/g)) {
    const [, name, body] = match;
    if (body.includes('auth.users')) found.add(name);
  }
  return [...found];
}

function allTables(): string[] {
  const dir = new URL('../supabase/migrations/', import.meta.url);
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(new URL(f, dir), 'utf8'))
    .join('\n');
  return [...sql.matchAll(/create table (?:if not exists )?(\w+)/g)].map(
    (m) => m[1]
  );
}

describe('account export', () => {
  it('covers every table that references auth.users', () => {
    const missing = userOwnedTables().filter(
      (t) => !(EXPORTED_TABLES as readonly string[]).includes(t)
    );
    expect(missing).toEqual([]);
  });

  it('found the schema at all', () => {
    // Guards the test itself: a regex that silently matches nothing would
    // make the check above pass forever.
    expect(userOwnedTables().length).toBeGreaterThan(5);
  });

  it('lists no table that does not exist', () => {
    // Against every table in the schema, not only the ones referencing
    // auth.users: chat_messages belongs to a person through its thread rather
    // than by its own column, and still has to be in the export.
    const all = allTables();
    const phantom = EXPORTED_TABLES.filter((t) => !all.includes(t));
    expect(phantom).toEqual([]);
  });
});
