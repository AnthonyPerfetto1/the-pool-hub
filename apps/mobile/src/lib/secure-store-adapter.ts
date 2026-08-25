import * as SecureStore from "expo-secure-store";

// expo-secure-store caps each item at ~2048 bytes on iOS Keychain, but a
// Supabase session (access token + refresh token + user object) can exceed
// that. Values are split across numbered chunk keys; SecureStore itself
// still provides the encryption, chunking only works around the size cap.
const CHUNK_SIZE = 1800;

function chunkKey(key: string, index: number): string {
  return `${key}_chunk_${index}`;
}

function chunkCountKey(key: string): string {
  return `${key}_chunk_count`;
}

async function getChunkCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(chunkCountKey(key));
  return raw ? Number(raw) : 0;
}

export const secureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const count = await getChunkCount(key);
    if (count === 0) {
      return null;
    }

    const parts: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part === null) {
        return null;
      }
      parts.push(part);
    }
    return parts.join("");
  },

  async setItem(key: string, value: string): Promise<void> {
    const previousCount = await getChunkCount(key);
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }

    await Promise.all(
      chunks.map((chunk, i) => SecureStore.setItemAsync(chunkKey(key, i), chunk)),
    );

    for (let i = chunks.length; i < previousCount; i += 1) {
      await SecureStore.deleteItemAsync(chunkKey(key, i));
    }

    await SecureStore.setItemAsync(chunkCountKey(key), String(chunks.length));
  },

  async removeItem(key: string): Promise<void> {
    const count = await getChunkCount(key);
    await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(chunkKey(key, i))),
    );
    await SecureStore.deleteItemAsync(chunkCountKey(key));
  },
};
