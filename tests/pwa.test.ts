import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import manifest from '../src/app/manifest';

const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

describe('web app manifest', () => {
  const m = manifest();

  it('opens straight into a locale', () => {
    // Installing an app that cold-starts into a redirect shows a blank frame
    // first, which reads as a slow app.
    expect(m.start_url).toMatch(/^\/(en|ar)$/);
  });

  it('is installable', () => {
    // The minimum a browser requires before it will offer to install.
    expect(m.display).toBe('standalone');
    expect(m.name).toBeTruthy();
    expect(m.icons?.length).toBeGreaterThan(0);
  });

  it('ships a maskable icon', () => {
    // Without one, Android launchers crop the girih star to fit their shape.
    expect(m.icons?.some((i) => i.purpose === 'maskable')).toBe(true);
  });
});

describe('service worker scope', () => {
  /**
   * These are the rules that keep the worker from being a liability. A stale
   * answer to a religious question, or a cached page carrying a dead session,
   * would each be worse than having no offline support at all.
   */
  it('never caches the API, auth, counsel or saved chats', () => {
    for (const path of ['/api/', '/auth/', '/sign-in', '/counsel', '/c/']) {
      expect(sw, `${path} must be excluded`).toContain(path);
    }
  });

  it('serves pages network-first, not cache-first', () => {
    // Cache-first on HTML would pin readers to yesterday's content while
    // perfectly online.
    const fetchFirst = sw.indexOf('fetch(request)');
    const cacheFallback = sw.indexOf('caches.match(request)');
    expect(fetchFirst).toBeGreaterThan(-1);
    expect(cacheFallback).toBeGreaterThan(fetchFirst);
  });

  it('precaches the tools that work without a network', () => {
    for (const path of ['/en/prayer', '/ar/prayer', '/en/calendar']) {
      expect(sw).toContain(path);
    }
  });

  it('drops caches from older versions on activate', () => {
    expect(sw).toContain('caches.delete');
  });

  it('only intercepts navigations', () => {
    // Handling every same-origin GET meant a failed chunk request was answered
    // with an HTML document, which the browser then tried to parse as
    // JavaScript. It broke the site for returning visitors only, and looked
    // perfect in a fresh browser.
    expect(sw).toContain("request.mode !== 'navigate'");
  });
});
