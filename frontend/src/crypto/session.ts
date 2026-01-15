export async function importPublicKey(base64: string) {
  const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "ECDH", namedCurve: "X25519" },
    true,
    []
  );
}

export async function importPrivateKey(base64: string) {
  const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  return crypto.subtle.importKey(
    "pkcs8",
    raw,
    { name: "ECDH", namedCurve: "X25519" },
    true,
    ["deriveKey", "deriveBits"]
  );
}

export async function deriveChatKey(
  myPrivateKey: CryptoKey,
  otherPublicKey: CryptoKey
) {
  return crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: otherPublicKey,
    },
    myPrivateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}
