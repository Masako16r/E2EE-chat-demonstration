const API_URL = "http://localhost:4000/api";

export async function register(email: string, password: string, publicKey: string) {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, publicKey }),
    });
    if (!res.ok) {
        throw new Error("Registration failed");
    }
    return res.json();

}

export async function login(email: string, password: string) {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Error desconocido" }));
        throw new Error(errorData.message || "Error en el login");
    }
    return res.json();
}

export async function getAvailableUsers() {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/users/available`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
    });
    if (!res.ok) {
        throw new Error("Failed to fetch users");
    }
    return res.json();
}

export async function searchUserByEmail(email: string) {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/users/search?email=${encodeURIComponent(email)}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
    });
    if (!res.ok) {
        throw new Error("Failed to search user");
    }
    return res.json();
}

export async function getCurrentUser() {
    const token = localStorage.getItem("token");
    if (!token) {
        throw new Error("No authentication token");
    }
    const res = await fetch(`${API_URL}/users/me`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
    });
    if (!res.ok) {
        throw new Error("Failed to fetch current user");
    }
    return res.json();

}
