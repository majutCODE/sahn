/**
 * Client-side encryption for saved counsel transcripts.
 *
 * The schema comment says the server never holds plaintext, and this is what
 * makes that true rather than aspirational. The key is derived in the browser
 * from a passphrase the user chooses; only ciphertext is ever sent.
 *
 * The consequence is real and must be stated plainly in the interface: a
 * forgotten passphrase means the transcript is unrecoverable. Nobody can
 * reset it, because nobody else has ever had it. For this particular content
 * that is the correct trade.
 */

const ITERATIONS = 310_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

/**
 * PBKDF2 rather than a raw hash: the whole point is to make guessing a weak
 * passphrase expensive. The iteration count follows current OWASP guidance
 * for PBKDF2-HMAC-SHA256.
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts to a single self-describing blob: version, salt, IV, ciphertext.
 *
 * Storing the salt and IV alongside the ciphertext is standard and safe —
 * neither is secret — and it means a transcript can be decrypted years later
 * without a separate record of how it was made.
 */
export async function encryptTranscript(
  plaintext: string,
  passphrase: string
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      new TextEncoder().encode(plaintext)
    )
  );

  const blob = new Uint8Array(1 + SALT_BYTES + IV_BYTES + ciphertext.length);
  blob[0] = 1; // format version
  blob.set(salt, 1);
  blob.set(iv, 1 + SALT_BYTES);
  blob.set(ciphertext, 1 + SALT_BYTES + IV_BYTES);

  return toBase64(blob);
}

/** Returns null on a wrong passphrase or a corrupt blob — never throws at the UI. */
export async function decryptTranscript(
  encoded: string,
  passphrase: string
): Promise<string | null> {
  try {
    const blob = fromBase64(encoded);
    if (blob[0] !== 1) return null;

    const salt = blob.slice(1, 1 + SALT_BYTES);
    const iv = blob.slice(1 + SALT_BYTES, 1 + SALT_BYTES + IV_BYTES);
    const ciphertext = blob.slice(1 + SALT_BYTES + IV_BYTES);
    const key = await deriveKey(passphrase, salt);

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    // AES-GCM authentication failing is exactly what a wrong passphrase looks
    // like, and it is indistinguishable from tampering. Both mean "no".
    return null;
  }
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fromBase64(encoded: string): Uint8Array {
  const binary = atob(encoded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
