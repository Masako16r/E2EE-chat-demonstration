function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";

    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return window.btoa(binary);
}

export async function exportPublicKey(publicKey: CryptoKey){
    const exported = await window.crypto.subtle.exportKey("spki", publicKey);
    return arrayBufferToBase64(exported);
}

export async function exportPrivateKey(privateKey: CryptoKey){
    const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
    return arrayBufferToBase64(exported);
}           