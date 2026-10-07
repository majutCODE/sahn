/**
 * The X bot's command line, for looking rather than posting.
 *
 *   node scripts/post-to-x.mjs --plan=30     print a month of the schedule
 *   node scripts/post-to-x.mjs --dry-run     what would go out this hour
 *
 * The posting itself lives in the Cloudflare Worker at workers/post-to-x. This
 * exists so the schedule can be inspected without deploying anything, and it
 * imports the same module the Worker does, so what it prints is what the Worker
 * will do rather than a second implementation that agrees by coincidence.
 */

import { readFileSync } from 'node:fs';
import { compose, planFor } from './lib/social-schedule.mjs';

const args = process.argv.slice(2);
const PLAN_DAYS = Number(args.find((a) => a.startsWith('--plan='))?.split('=')[1] ?? 0);

const pool = JSON.parse(
  readFileSync(new URL('../content/social-posts.json', import.meta.url), 'utf8')
);

if (PLAN_DAYS > 0) {
  const start = new Date();
  let total = 0;
  for (let i = 0; i < PLAN_DAYS; i += 1) {
    const date = new Date(start.getTime() + i * 86_400_000);
    const plan = planFor(date, pool.posts);
    total += plan.length;
    const label = date.toISOString().slice(0, 10);
    if (plan.length === 0) {
      console.log(`${label}  -`);
      continue;
    }
    for (const slot of plan) {
      console.log(
        `${label}  ${String(slot.hour).padStart(2, '0')}:00  ` +
          `${slot.post.lang} ${slot.post.tone.padEnd(10)} ${slot.withLink ? '+link' : '     '}  ` +
          slot.post.text.slice(0, 58)
      );
    }
  }
  console.log(`\n  ${total} posts over ${PLAN_DAYS} days, ${(total / PLAN_DAYS).toFixed(1)} a day`);
  process.exit(0);
}

const now = new Date();
const slot = planFor(now, pool.posts).find((s) => s.hour === now.getUTCHours());

if (!slot) {
  console.log(`Nothing scheduled for ${now.toISOString().slice(0, 13)}:00 UTC.`);
  process.exit(0);
}

console.log(`--- would post now (${slot.post.lang}, ${slot.post.keyword}) ---\n`);
console.log(compose(slot, pool.link));
