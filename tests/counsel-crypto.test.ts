import { describe, expect, it } from 'vitest';
import { decryptTranscript, encryptTranscript } from '../src/lib/counsel/crypto';

/**
 * The privacy notice says the server cannot read a saved counsel transcript.
 * That claim rests entirely on this module, so it is worth testing directly.
 */
describe('counsel transcript encryption', () => {
  const transcript = JSON.stringify({
    turns: [{ role: 'user', text: 'something I would not say out loud' }]
  });

  it('round-trips', async () => {
    const blob = await encryptTranscript(transcript, 'a good passphrase');
    expect(await decryptTranscript(blob, 'a good passphrase')).toBe(transcript);
  });

  it('refuses a wrong passphrase without throwing', async () => {
    const blob = await encryptTranscript(transcript, 'a good passphrase');
    expect(await decryptTranscript(blob, 'a good passphrasf')).toBeNull();
  });

  it('does not leak the plaintext into the blob', async () => {
    const blob = await encryptTranscript(transcript, 'a good passphrase');
    expect(blob).not.toContain('would not say');
    expect(atob(blob)).not.toContain('would not say');
  });

  it('produces a different blob every time', async () => {
    // A fresh salt and IV per save; identical ciphertext for identical input
    // would tell an observer that two transcripts are the same.
    const a = await encryptTranscript(transcript, 'a good passphrase');
    const b = await encryptTranscript(transcript, 'a good passphrase');
    expect(a).not.toBe(b);
  });

  it('rejects a corrupted blob', async () => {
    const blob = await encryptTranscript(transcript, 'a good passphrase');
    const bytes = atob(blob).split('');
    bytes[bytes.length - 1] = String.fromCharCode(
      bytes[bytes.length - 1].charCodeAt(0) ^ 0xff
    );
    expect(await decryptTranscript(btoa(bytes.join('')), 'a good passphrase')).toBeNull();
  });

  it('rejects an unknown format version', async () => {
    const blob = await encryptTranscript(transcript, 'a good passphrase');
    const bytes = atob(blob).split('');
    bytes[0] = String.fromCharCode(9);
    expect(await decryptTranscript(btoa(bytes.join('')), 'a good passphrase')).toBeNull();
  });
});
