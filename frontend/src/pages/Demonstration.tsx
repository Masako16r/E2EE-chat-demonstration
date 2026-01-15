import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Key, MessageCircle, ShieldOff, Lock, Home } from 'lucide-react';
import '../styles/Demonstration.css'; 

interface DemoUser {
  id: string;
  email: string;
}

interface EncryptedMessage {
  senderId: string;
  ciphertext: string;
}

interface DemoMessage {
  senderId: string;
  ciphertext: string;
}

interface DemoChat {
  id: string;
  participants: Array<{
    id: string;
    email: string;
  }>;
}

export const Demonstration = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [user1, setUser1] = useState<string>('');
  const [user2, setUser2] = useState<string>('');
  const [demoMessages, setDemoMessages] = useState<DemoMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentSlide, setCurrentSlide] = useState(0);

  const explanationItems = [
    {
      title: 'Generación de Claves',
      description: 'Cada usuario genera un par de claves criptográficas ECDH P-256: Clave Pública (compartida) y Clave Privada (segura en el dispositivo).',
      icon: Key
    },
    {
      title: 'Envío de Mensajes',
      description: 'Los mensajes se cifran con AES-GCM usando la clave pública del destinatario. Solo el destinatario puede descifrarlo con su clave privada.',
      icon: MessageCircle
    },
    {
      title: 'Sin Acceso del Administrador',
      description: 'Los administradores NO pueden leer los mensajes: datos cifrados en BD, sin acceso a claves privadas, descifrado solo en dispositivo del usuario.',
      icon: ShieldOff
    },
    {
      title: 'Privacidad Total',
      description: 'Incluso con acceso a la BD: mensajes permanecen cifrados, sin claves privadas no hay forma de descifrar, privacidad garantizada.',
      icon: Lock
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % explanationItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch('http://localhost:4000/api/users/all');
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const usersList = await response.json();
        setUsers(usersList);
        setError('');
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(`Failed to load users: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [demoMessages]);

  // Initialize WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Token not found. Please login first.');
      return;
    }

    // Connect to WebSocket
    const socket = io('http://localhost:4000', {
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('new-message', (message: EncryptedMessage) => {
      console.log('New message received:', message);
      setDemoMessages(prev => [...prev, message]);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  // Load messages when users are selected
  useEffect(() => {
    if (!user1 || !user2 || user1 === user2) {
      setDemoMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        setMessagesLoading(true);
        
        const messagesResponse = await fetch(`http://localhost:4000/api/messages/between?user1Id=${user1}&user2Id=${user2}`);
        if (!messagesResponse.ok) throw new Error('Failed to fetch messages');
        const messages: EncryptedMessage[] = await messagesResponse.json();

        setDemoMessages(messages);
        setError('');
      } catch (err) {
        console.error('Error loading messages:', err);
        setError(`Failed to load messages: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();
  }, [user1, user2]);

  return (
    <div className="demo-container">
      <button 
        className="home-button" 
        onClick={() => navigate('/welcome')}
        title="Go to Home"
      >
        <Home size={24} />
        <span className="button-text">Volver</span>
      </button>
      <div className="demo-content-wrapper">
        <div className="demo-carousel-section">
          <div className="demo-user-selection-top">
            <label className="demo-user-selection-label">
              Selecciona dos usuarios:
            </label>
            
            {loading ? (
              <p className="demo-loading-text">Cargando usuarios...</p>
            ) : users.length < 2 ? (
              <p className="demo-loading-text">Se necesitan al menos 2 usuarios</p>
            ) : (
              <div className="demo-users-grid">
                <div className="demo-user-item">
                  <label className="demo-user-label">
                    Usuario 1:
                  </label>
                  <div className="demo-user-input-wrapper">
                    <input
                      type="text"
                      placeholder="Buscar usuario..."
                      value={user1 ? users.find(u => u.id === user1)?.email || '' : ''}
                      readOnly
                      className="demo-user-input"
                      onClick={() => {
                        const dropdown = document.getElementById('user1-dropdown') as HTMLDivElement;
                        if (dropdown) {
                          dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                        }
                      }}
                    />
                  </div>
                  <div
                    id="user1-dropdown"
                    className="demo-dropdown"
                  >
                    <div className="demo-dropdown-search">
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    {users
                      .filter(u => u.id !== user2 && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(user => (
                        <div
                          key={user.id}
                          onClick={() => {
                            setUser1(user.id);
                            setSearchTerm('');
                            const dropdown = document.getElementById('user1-dropdown') as HTMLDivElement;
                            if (dropdown) dropdown.style.display = 'none';
                          }}
                          className={`demo-dropdown-item ${user1 === user.id ? 'selected' : ''}`}
                        >
                          {user.email}
                        </div>
                      ))}
                  </div>
                  {user1 && (
                    <button
                      onClick={() => setUser1('')}
                      className="demo-clear-btn"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <div className="demo-user-item">
                  <label className="demo-user-label">
                    Usuario 2:
                  </label>
                  <div className="demo-user-input-wrapper">
                    <input
                      type="text"
                      placeholder="Buscar usuario..."
                      value={user2 ? users.find(u => u.id === user2)?.email || '' : ''}
                      readOnly
                      className="demo-user-input"
                      onClick={() => {
                        const dropdown = document.getElementById('user2-dropdown') as HTMLDivElement;
                        if (dropdown) {
                          dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                        }
                      }}
                    />
                  </div>
                  <div
                    id="user2-dropdown"
                    className="demo-dropdown"
                  >
                    <div className="demo-dropdown-search">
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    {users
                      .filter(u => u.id !== user1 && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(user => (
                        <div
                          key={user.id}
                          onClick={() => {
                            setUser2(user.id);
                            setSearchTerm('');
                            const dropdown = document.getElementById('user2-dropdown') as HTMLDivElement;
                            if (dropdown) dropdown.style.display = 'none';
                          }}
                          className={`demo-dropdown-item ${user2 === user.id ? 'selected' : ''}`}
                        >
                          {user.email}
                        </div>
                      ))}
                  </div>
                  {user2 && (
                    <button
                      onClick={() => setUser2('')}
                      className="demo-clear-btn"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
            )}

            {user1 && user2 && user1 !== user2 && (
              <button
                onClick={() => {
                }}
                className="demo-view-chat-btn"
              >
                Ver Chat Cifrado
              </button>
            )}
          </div>

          <div className="demo-carousel-content">
            <div className="demo-carousel-item" key={currentSlide}>
              {(() => {
                const IconComponent = explanationItems[currentSlide].icon;
                return <IconComponent size={64} color="#007bff" style={{ marginBottom: '1rem' }} />;
              })()}
              <h2 className="demo-carousel-title">{explanationItems[currentSlide].title}</h2>
              <p className="demo-carousel-description">{explanationItems[currentSlide].description}</p>
            </div>
          </div>
          <div className="demo-carousel-indicator">
            <div className="demo-indicator-dots">
              {explanationItems.map((_, index) => (
                <div
                  key={index}
                  className={`demo-dot ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                ></div>
              ))}
            </div>
          </div>
        </div>

        <div className="demo-right-section">
          {error && (
            <div className="demo-error">
              {error}
            </div>
          )}

          <div className="demo-messages-grid">
            <div className="demo-chat-box">
              <div className="demo-chat-header">
                <h2>Vista del Administrador</h2>
                <p>Datos en la Base de Datos</p>
              </div>
              
              <div className="demo-messages-area">
                <div className="demo-messages-content">
                  {loading || messagesLoading ? (
                    <div className="demo-loading-text">Cargando mensajes...</div>
                  ) : !user1 || !user2 || user1 === user2 ? (
                    <div className="demo-loading-text">Selecciona dos usuarios para ver datos</div>
                  ) : demoMessages.length === 0 ? (
                    <div className="demo-loading-text">Este chat no tiene mensajes</div>
                  ) : (
                    <>
                      {demoMessages.map((msg, index) => (
                        <div key={index} className="demo-message-item">
                          <div className="demo-message-key">message[{index}] {`{`}</div>
                          <div className="demo-message-body">
                            <div>senderId: "{msg.senderId}",</div>
                            <div className="demo-message-cipher">ciphertext: "{msg.ciphertext.substring(0, 40)}..."</div>
                          </div>
                          <div className="demo-message-close">{`}`},</div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
