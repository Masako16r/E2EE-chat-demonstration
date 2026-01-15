//Encrypt and decrypt messages using ECDH P-256 + AES-GCM

import { importPrivateKey, importPublicKey } from './keys';

// Derive shared secret from private key and recipient's public key
async function deriveSharedSecret(privateKey: CryptoKey, publicKeyBase64: string) {
  const publicKey = await importPublicKey(publicKeyBase64);
  
  return await crypto.subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256
  );
}

// Derive encryption key from shared secret
async function deriveEncryptionKey(sharedSecret: ArrayBuffer) {
  return await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
}

// Derive chat key from two users' keys
export async function deriveChatKey(myPrivateKeyBase64: string, otherPublicKeyBase64: string) {
  const myPrivateKey = await importPrivateKey(myPrivateKeyBase64);
  const sharedSecret = await deriveSharedSecret(myPrivateKey, otherPublicKeyBase64);
  return await deriveEncryptionKey(sharedSecret);
}

// Encrypt message with derived chat key
export async function encryptMessage(
  chatKey: CryptoKey,
  message: string
) {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder().encode(message);

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      chatKey,
      encoder
    );

    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipherBuffer))),
      iv: btoa(String.fromCharCode(...iv))
    };
  } catch (err) {
    console.error('Failed to encrypt message:', err);
    throw err;
  }
}

// Decrypt message with derived chat key
export async function decryptMessage(
  chatKey: CryptoKey,
  encrypted: { ciphertext: string; iv: string }
) {
  try {
    const cipherBuffer = Uint8Array.from(atob(encrypted.ciphertext), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));

    const plainBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      chatKey,
      cipherBuffer
    );

    return new TextDecoder().decode(plainBuffer);
  } catch (err) {
    console.error('Failed to decrypt message:', err);
    return null;
  }
}