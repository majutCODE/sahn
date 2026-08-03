import { notFound } from 'next/navigation';

/**
 * Catches any path inside a locale that no route claims, so the 404 renders
 * through the locale layout — with the right `lang`, `dir` and translated copy.
 * Without this, Next falls back to its own English-only 404 outside the shell.
 */
export default function CatchAll() {
  notFound();
}
