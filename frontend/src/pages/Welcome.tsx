import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Zap, ArrowRight, Eye } from 'lucide-react';
import '../styles/welcome.css';

export const Welcome = () => {
  const navigate = useNavigate();

  const handleStartClick = () => {
    navigate('/register');
  };

  return (
    <div className="welcome-container">
      <div className="welcome-content-wrapper">
        <div className="video-section">
          <button className="nav-button nav-button-start" onClick={handleStartClick} title="Empezar">
            <ArrowRight size={20} />
            <span className="button-text">Empezar</span>
          </button>
          <button 
            className="nav-button nav-button-demo" 
            onClick={() => navigate('/demonstration')}
            title="Ver Demostración"
          >
            <Eye size={20} />
            <span className="button-text">Ver Demostración E2EE</span>
          </button>
          <iframe
            width="100%"
            height="100%"
            src="https://www.youtube.com/watch?v=5dQb3y3ovd8"
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ borderRadius: '12px' }}
          ></iframe>
        </div>
      </div>
    </div>
  );
};
