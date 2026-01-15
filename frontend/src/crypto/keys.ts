export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveBits", "deriveKey"]
  );

  return keyPair;
}

export async function exportPublicKey(publicKey: CryptoKey) {
  const raw = await crypto.subtle.exportKey("raw", publicKey);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function exportPrivateKey(privateKey: CryptoKey) {
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey);
  return btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
}

export async function importPublicKey(publicKeyBase64: string) {
  const binaryString = atob(publicKeyBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return await crypto.subtle.importKey(
    "raw",
    bytes.buffer,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

export async function importPrivateKey(privateKeyBase64: string) {
  const binaryString = atob(privateKeyBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return await crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits", "deriveKey"]
  );
}


