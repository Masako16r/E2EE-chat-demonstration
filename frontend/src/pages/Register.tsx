import React, { useState} from "react";
import { useNavigate } from "react-router-dom";
import { generateKeyPair, exportPublicKey, exportPrivateKey } from "../crypto/keys";
import { savePrivateKey } from "../crypto/storage";
import { register } from "../api/auth";
import { Home } from 'lucide-react';
import '../styles/auth.css';



export const Register: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            // Generate key pair
            const keyPair = await generateKeyPair();
            
            // Export keys
            const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
            const privateKeyBase64 = await exportPrivateKey(keyPair.privateKey);

            // Save private key locally
            savePrivateKey(privateKeyBase64);

            // Asign data and public key to the user
            await register(email, password, publicKeyBase64);
            navigate('/login');
        } catch (e) {
            console.error(e);
            setError("Registration failed - could not generate keys");
        } finally {
            setLoading(false);
        }

    };

    return (
        <div className="auth-container">
            <button 
                className="home-button" 
                onClick={() => navigate('/welcome')}
                title="Vuelve a Inicio"
            >
                <Home size={24} />
                <span className="button-text">Volver</span>
            </button>
            <div className="auth-box">
                <h2>Register</h2>

                {error && <p className="error">{error}</p>}
                <form onSubmit={handleSubmit}>
                    <input 
                        type="email" 
                        placeholder="Email"
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        required 
                    />
                    <input 
                        type="password" 
                        placeholder="Password"
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        required 
                        minLength={6}
                    />
                    <div className="account-info">
                    ¿Ya tienes una cuenta? <button type="button" onClick={() => navigate('/login')} className="link-btn">Inicia sesión aquí</button>
                    </div>
                    <button type="submit" className="register-btn" disabled={loading}>
                        {loading ? "Generando claves..." : "Register"}
                    </button>
                </form>
            </div>
        </div>
    )
    
};
