import React, { useState} from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { Mail, Lock, Eye, EyeOff, LogIn, Home } from 'lucide-react';
import '../styles/auth.css';


export const Login: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
        const passwordInput = document.getElementById("password-input") as HTMLInputElement;
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
        } else {
            passwordInput.type = "password";
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const data = await login(email, password);
            localStorage.setItem("token", data.token);
            localStorage.setItem("userId", data.userId);
            localStorage.setItem("email", email);
            navigate('/chat');
        } catch (e) {
            console.error("Login error:", e);
            setError(e instanceof Error ? e.message : "Error en el login");
            setLoading(false);
        }

    };

    return (
        <div className="auth-container">
            <button 
                className="home-button" 
                onClick={() => navigate('/welcome')}
                title="Go to Home"
            >
                <Home size={24} />
                <span className="button-text">Volver</span>
            </button>
            <div className="auth-box">
                <h2>Login</h2>
                {error && <p className="error">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="input-wrapper" >
                        <Mail size={20} className="input-icon" />
                        <input 
                            type="email" 
                            placeholder="Email"
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            className="with-icons"
                            required 
                        />
                    </div>
                    <div className="input-wrapper">
                        <Lock size={20} className="input-icon" />
                        <input 
                            id="password-input"
                            type="password" 
                            placeholder="Password"
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            className="with-icons"
                            required 
                        />
                    </div>
                    <div className="account-info">
                        ¿No tienes una cuenta? <button type="button" onClick={() => navigate('/register')} className="link-btn">Regístrate aquí</button>
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? "Iniciando sesión..." : "Login"}
                    </button>
                </form>
            </div>
        </div>
    );
};