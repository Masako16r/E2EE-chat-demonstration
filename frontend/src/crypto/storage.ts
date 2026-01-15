// crypto/storage.ts

const PRIVATE_KEY = "e2ee_private_key";

export function savePrivateKey(base64: string) {
  localStorage.setItem(PRIVATE_KEY, base64);
}

export function loadPrivateKey(): string | null {
  return localStorage.getItem(PRIVATE_KEY);
}
