import { describe, expect, it } from 'vitest';
import { absoluteAudioUrl } from '../src/lib/quran/audio-url';

/**
 * The API returns three URL shapes and does not say which. Getting this wrong
 * fails silently: a relative path resolves against our own origin, 404s, and
 * the audio element simply never plays. The default reciter happens to be the
 * one shape that works without help, which is exactly why this needs a test
 * rather than a spot check.
 */
describe('recitation URLs', () => {
  it('leaves absolute URLs alone', () => {
    const url = 'https://mirrors.quranicaudio.com/everyayah/x/112001.mp3';
    expect(absoluteAudioUrl(url)).toBe(url);
  });

  it('gives protocol-relative URLs https, never http', () => {
    expect(absoluteAudioUrl('//mirrors.quranicaudio.com/a.mp3')).toBe(
      'https://mirrors.quranicaudio.com/a.mp3'
    );
  });

  it('resolves a bare relative path against the audio origin', () => {
    expect(absoluteAudioUrl('Alafasy/mp3/112001.mp3')).toBe(
      'https://verses.quran.com/Alafasy/mp3/112001.mp3'
    );
  });

  it('does not double the slash on a rooted path', () => {
    expect(absoluteAudioUrl('/Sudais/mp3/112001.mp3')).toBe(
      'https://verses.quran.com/Sudais/mp3/112001.mp3'
    );
  });

  it('never returns something the page would resolve against itself', () => {
    for (const url of [
      'Alafasy/mp3/112001.mp3',
      '/AbdulBaset/Murattal/mp3/112001.mp3',
      '//mirrors.quranicaudio.com/a.mp3',
      'https://verses.quran.com/a.mp3'
    ]) {
      expect(absoluteAudioUrl(url)).toMatch(/^https:\/\//);
    }
  });
});
