const API_URL = "http://localhost:4000/api";

export async function getOrCreateChat(userId: string) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/messages/chat/${userId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to get or create chat");
  }
  return res.json();
}

export async function sendMessage(chatId: string, encrypted: { ciphertext: string; iv: string }) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/messages/chat/${chatId}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(encrypted),
  });
  if (!res.ok) {
    throw new Error("Failed to send message");
  }
  return res.json();
}

export async function getMessages(chatId: string, since?: Date) {
  const token = localStorage.getItem("token");
  let url = `${API_URL}/messages/chat/${chatId}/messages`;
  
  if (since) {
    url += `?since=${since.toISOString()}`;
  }
  
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch messages");
  }
  return res.json();
}

export async function getUserPublicKey(userId: string) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/messages/user/${userId}/key`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch user public key");
  }
  return res.json();
}
