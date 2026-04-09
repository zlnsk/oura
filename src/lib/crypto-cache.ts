// ---------------------------------------------------------------------------
// Encrypted localStorage cache using Web Crypto API.
// Derives a key from the user's session identifier so cached health data
// is only readable during an active session.
// ---------------------------------------------------------------------------

const ALGO = "AES-GCM";
const KEY_STORAGE = "oura_cache_key";

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getOrCreateKey(): Promise<CryptoKey> {
  try {
    // Try to load existing key material
    const stored = sessionStorage.getItem(KEY_STORAGE);
    if (stored) {
      const raw = base64ToUint8(stored);
      return crypto.subtle.importKey("raw", raw.buffer as ArrayBuffer, ALGO, false, ["encrypt", "decrypt"]);
    }

    // Generate a new key
    const key = await crypto.subtle.generateKey({ name: ALGO, length: 256 }, true, [
      "encrypt",
      "decrypt",
    ]);

    // Export and store in sessionStorage (cleared on tab close)
    const exported = await crypto.subtle.exportKey("raw", key);
    sessionStorage.setItem(KEY_STORAGE, uint8ToBase64(new Uint8Array(exported)));

    return key;
  } catch {
    throw new Error("Web Crypto not available");
  }
}

export async function encryptAndStore(storageKey: string, data: unknown): Promise<void> {
  try {
    const key = await getOrCreateKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, encoded.buffer as ArrayBuffer);

    // Store IV + ciphertext as base64
    const ctBytes = new Uint8Array(ciphertext);
    const combined = new Uint8Array(iv.length + ctBytes.length);
    combined.set(iv);
    combined.set(ctBytes, iv.length);

    localStorage.setItem(storageKey, uint8ToBase64(combined));
  } catch {
    // If encryption fails, skip caching rather than storing unencrypted health data
    console.warn("Crypto cache: encryption unavailable, skipping cache write");
  }
}

export async function decryptFromStore<T>(storageKey: string): Promise<T | null> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const key = await getOrCreateKey();
    const combined = base64ToUint8(raw);
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext.buffer as ArrayBuffer);
    const text = new TextDecoder().decode(decrypted);
    return JSON.parse(text) as T;
  } catch {
    // If decryption fails (key mismatch, corruption), clear and return null
    localStorage.removeItem(storageKey);
    return null;
  }
}

/**
 * Clear encryption key on logout.
 */
