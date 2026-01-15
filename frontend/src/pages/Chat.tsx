import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { getAvailableUsers, getCurrentUser } from '../api/auth';
import { getOrCreateChat, sendMessage, getMessages, getUserPublicKey } from '../api/messages';
import { loadPrivateKey } from '../crypto/storage';
import { deriveChatKey, encryptMessage, decryptMessage } from '../crypto/encryption';
import { Home } from 'lucide-react';
import '../styles/chat.css';

interface User {
  id: string;
  email: string;
  createdAt: string;
  publicKey?: string;
}

interface CurrentUser {
  id: string;
  email: string;
}

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderEmail: string;
  createdAt: string;
}

interface ChatSession {
  chatId: string;
  userId: string;
  chatKey?: CryptoKey;
}

export const Chat = () => {
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFirstTimeChat, setIsFirstTimeChat] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showCreateChatModal, setShowCreateChatModal] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [showE2EEBanner, setShowE2EEBanner] = useState(false);
  const [isRemoteUserTyping, setIsRemoteUserTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Verificar si hay clave privada al iniciar
    const privateKeyBase64 = loadPrivateKey();
    if (!privateKeyBase64) {
      setError('Clave privada no encontrada. Por favor, inicia sesión nuevamente.');
      return;
    }

    const fetchCurrentUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('email');
        navigate('/login');
      }
    };

    fetchCurrentUser();
    fetchUsers();

    // Initialize WebSocket connection
    const socket = io('http://localhost:4000', {
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [navigate]);

  // Setup typing listeners when chatSession changes
  useEffect(() => {
    if (!socketRef.current || !chatSession) {
      return;
    }

    const handleUserTyping = (data: any) => {
      console.log('Received user-typing event', data, 'current chatId:', chatSession.chatId);
      if (data.chatId === chatSession.chatId) {
        setIsRemoteUserTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setIsRemoteUserTyping(false);
        }, 3000);
      }
    };

    const handleUserStopTyping = (data: any) => {
      if (data.chatId === chatSession.chatId) {
        setIsRemoteUserTyping(false);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    };

    socketRef.current.off('user-typing');
    socketRef.current.off('user-stop-typing');
    socketRef.current.on('user-typing', handleUserTyping);
    socketRef.current.on('user-stop-typing', handleUserStopTyping);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('user-typing', handleUserTyping);
        socketRef.current.off('user-stop-typing', handleUserStopTyping);
      }
    };
  }, [chatSession]);

  // Update socket listener when chatSession changes
  useEffect(() => {
    if (!socketRef.current || !chatSession) {
      return;
    }

    const handleNewMessage = (message: any) => {
      console.log('New message received via WebSocket:', message);
      // Decrypt the message if it's for the current chat
      if (message.chatId === chatSession.chatId && chatSession.chatKey) {
        decryptMessage(chatSession.chatKey, { ciphertext: message.ciphertext, iv: message.iv }).then(decrypted => {
          if (decrypted) {
            setMessages(prev => [...prev, {
              id: message.id,
              content: decrypted,
              senderId: message.senderId,
              senderEmail: message.sender.email,
              createdAt: message.createdAt
            }]);
          }
        });
      }
    };

    // Remove old listener if it exists and add new one
    socketRef.current.off('new-message');
    socketRef.current.on('new-message', handleNewMessage);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('new-message', handleNewMessage);
      }
    };
  }, [chatSession]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const availableUsers = await getAvailableUsers();
      setUsers(availableUsers);
      setFilteredUsers(availableUsers);
    } catch (err) {
      setError('No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const filtered = users.filter(user =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  // Polling para actualizar usuarios en tiempo real
  useEffect(() => {
    let isActive = true;

    const pollUsers = async () => {
      try {
        const availableUsers = await getAvailableUsers();
        
        if (!isActive) return;

        // Solo actualizar si hay cambios en la lista
        if (JSON.stringify(users) !== JSON.stringify(availableUsers)) {
          setUsers(availableUsers);
        }
      } catch (err) {
        if (isActive) {
          console.error('Error polling users:', err);
        }
      }
    };

    // Polling cada 5 segundos
    const interval = setInterval(pollUsers, 5000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [users]);

  // Load initial messages when chat is opened
  useEffect(() => {
    if (!showChat || !chatSession?.chatKey) {
      return;
    }

    let isActive = true;

    const loadInitialMessages = async () => {
      try {
        const fetchedMessages = await getMessages(chatSession.chatId) as any[];
        
        if (!isActive) return;

        const decryptedMessages: ChatMessage[] = [];
        const chatKey = chatSession.chatKey!;

        for (const msg of fetchedMessages) {
          if (msg.ciphertext && msg.iv) {
            const decrypted = await decryptMessage(chatKey, { ciphertext: msg.ciphertext, iv: msg.iv });
            
            if (decrypted) {
              decryptedMessages.push({
                id: msg.id,
                content: decrypted,
                senderId: msg.senderId,
                senderEmail: msg.sender.email,
                createdAt: msg.createdAt
              });
            }
          }
        }

        setMessages(decryptedMessages);
      } catch (err) {
        if (isActive) {
          console.error('Error loading initial messages:', err);
        }
      }
    };

    loadInitialMessages();

    return () => {
      isActive = false;
    };
  }, [showChat, chatSession?.chatId, chatSession?.chatKey]);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setMessages([]);
    setShowChat(false);
    if (isFirstTimeChat) {
      setIsFirstTimeChat(false);
    }
    setTimeout(() => {
      setShowChat(true);
    }, 100);
    
    // Load chat session and messages
    loadChatSession(user.id);
  };

  const loadChatSession = async (userId: string) => {
    try {
      const privateKeyBase64 = loadPrivateKey();
      if (!privateKeyBase64) {
        setError('Clave privada no encontrada');
        return;
      }

      const chat = await getOrCreateChat(userId);
      
      // Get other user's public key
      const otherUserData = await getUserPublicKey(userId);
      const otherPublicKey = otherUserData.publicKey;

      // Derive chat key
      const chatKey = await deriveChatKey(privateKeyBase64, otherPublicKey);
      
      setChatSession({ chatId: chat.id, userId, chatKey });
      await loadMessages(chat.id, chatKey);
      setShowCreateChatModal(false);
      
      // Mostrar banner E2EE temporalmente
      setShowE2EEBanner(true);
      const timer = setTimeout(() => setShowE2EEBanner(false), 4000);
      return () => clearTimeout(timer);
    } catch (err) {
      console.error('Failed to load chat session:', err);
      // If chat doesn't exist, show modal to create it
      if (err instanceof Error && err.message.includes('404')) {
        setShowCreateChatModal(true);
      } else {
        setError('No se pudo cargar la sesión de chat');
      }
    }
  };

  const loadMessages = async (chatId: string, chatKey: CryptoKey) => {
    try {
      const fetchedMessages = await getMessages(chatId);
      const decryptedMessages: ChatMessage[] = [];

      for (const msg of fetchedMessages) {
        if (msg.ciphertext && msg.iv) {
          const decrypted = await decryptMessage(chatKey, { ciphertext: msg.ciphertext, iv: msg.iv });
          
          if (decrypted) {
            decryptedMessages.push({
              id: msg.id,
              content: decrypted,
              senderId: msg.senderId,
              senderEmail: msg.sender.email,
              createdAt: msg.createdAt
            });
          }
        }
      }

      setMessages(decryptedMessages);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleCreateChat = async () => {
    if (!selectedUser) return;
    
    setIsCreatingChat(true);
    try {
      await loadChatSession(selectedUser.id);
    } catch (err) {
      console.error('Failed to create chat:', err);
      setError('No se pudo crear el chat');
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !chatSession || !selectedUser || !chatSession.chatKey || !socketRef.current) {
      return;
    }

    setSendingMessage(true);
    try {
      // Encrypt message with derived chat key
      const encrypted = await encryptMessage(chatSession.chatKey, messageInput);

      // Send message via WebSocket
      socketRef.current.emit('send-message', {
        toUserId: selectedUser.id,
        chatId: chatSession.chatId,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv
      });

      // Add message to local state optimistically
      setMessages([
        ...messages,
        {
          id: Date.now().toString(), // Temporary ID
          content: messageInput,
          senderId: currentUser!.id,
          senderEmail: currentUser!.email,
          createdAt: new Date().toISOString()
        }
      ]);

      setMessageInput('');
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('No se pudo enviar el mensaje');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleBackToList = () => {
    setShowChat(false);
    setTimeout(() => {
      setSelectedUser(null);
      setSearchTerm('');
    }, 500);
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    navigate('/welcome');
  };

  return (
    <div className={`chat-wrapper ${selectedUser ? 'selected' : ''}`}>
      <button 
        className="home-button" 
        onClick={() => navigate('/welcome')}
        title="Go to Home"
      >
        <Home size={24} />
        <span className="button-text">Volver</span>
      </button>
      {!selectedUser ? (
        <div className="chat-list-view">
          <div className="chat-list-header">
            <h1>E2EE Chat</h1>
          </div>

          <div className="chat-search">
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="chat-list">
            {loading ? (
              <p className="loading">Cargando usuarios...</p>
            ) : error ? (
              <p className="error-message">{error}</p>
            ) : filteredUsers.length === 0 ? (
              <p className="no-users">
                {searchTerm ? 'No se han encontrado usuarios' : 'No hay usuarios disponibles'}
              </p>
            ) : (
              filteredUsers.map(user => (
                <div
                  key={user.id}
                  className="chat-list-item"
                  onClick={() => handleSelectUser(user)}
                >
                  <div className="user-avatar">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-details">
                    <p className="user-email">{user.email}</p>
                    <p className="user-preview">Selecciona para hablar</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="chat-footer-signout">
            <button onClick={handleSignOut} className="btn-signout">Cerrar sesión</button>
          </div>
        </div>
      ) : (
        <div className={`chat-split-view ${showChat ? 'visible' : ''} ${!isFirstTimeChat ? 'no-animation' : ''}`}>
          <div className="sidebar-contacts">
            <div className="user-session-info">
              <div className="user-session-avatar" onClick={() => setShowUserMenu(!showUserMenu)}>
                {currentUser?.email.charAt(0).toUpperCase()}
              </div>
              <div className="user-session-email">{currentUser?.email}</div>
              {showUserMenu && (
                <div className="user-menu">
                  <button className="menu-btn sign-out" onClick={handleSignOut}>
                    Cerrar sesión
                  </button>
                  <button className="menu-btn close" onClick={() => setShowUserMenu(false)}>
                    Cerrar
                  </button>
                </div>
              )}
            </div>

            <div className="chat-search">
              <input
                type="text"
                placeholder="Buscar usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="contacts-list">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  className={`contact-item ${selectedUser.id === user.id ? 'active' : ''}`}
                  onClick={() => handleSelectUser(user)}
                >
                  <div className="contact-avatar">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="contact-details">
                    <p className="contact-email">{user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="chat-main">
            <div className="chat-header-active">
              <button className="btn-back" onClick={handleBackToList}>
                ←
              </button>
              <h2>{selectedUser.email}</h2>
            </div>

            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="empty-state">
                  <p>Comienza una conversación con {selectedUser.email}</p>
                  <p style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.5rem' }}>
                    Todo lo que escribas aquí estará protegido con cifrado E2EE
                  </p>
                </div>
              ) : (
                <div className="messages-list">
                  {messages.map(msg => (
                    <div key={msg.id} className={`message ${msg.senderId === currentUser?.id ? 'sent' : 'received'}`}>
                      <div className="message-content">{msg.content}</div>
                      <div className="message-time">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                  {isRemoteUserTyping && (
                    <div className="message received typing-indicator">
                      <div className="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="chat-input-area">
              <input
                type="text"
                placeholder={`Mensaje para ${selectedUser.email}...`}
                className="chat-input"
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  // Enviar evento de typing
                  if (socketRef.current && chatSession) {
                    console.log('Emitting typing event', { toUserId: selectedUser.id, chatId: chatSession.chatId });
                    socketRef.current.emit('typing', {
                      toUserId: selectedUser.id,
                      chatId: chatSession.chatId
                    });
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !sendingMessage) {
                    // Enviar stop-typing antes de enviar el mensaje
                    if (socketRef.current && chatSession) {
                      socketRef.current.emit('stop-typing', {
                        toUserId: selectedUser.id,
                        chatId: chatSession.chatId
                      });
                    }
                    handleSendMessage();
                  }
                }}
                disabled={sendingMessage}
              />
              <button 
                className="send-btn" 
                onClick={() => {
                  if (socketRef.current && chatSession) {
                    socketRef.current.emit('stop-typing', {
                      toUserId: selectedUser.id,
                      chatId: chatSession.chatId
                    });
                  }
                  handleSendMessage();
                }}
                disabled={sendingMessage || !messageInput.trim()}
              >
                {sendingMessage ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>

          <div className="sidebar-profile">
            <div className="profile-header">
              <div className="profile-avatar">
                {selectedUser.email.charAt(0).toUpperCase()}
              </div>
              <h3>{selectedUser.email}</h3>
            </div>
            <div className="profile-info">
              <div className="info-item">
                <span className="info-label">Usuario desde</span>
                <span className="info-value">{new Date(selectedUser.createdAt).toLocaleDateString('es-ES', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateChatModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowCreateChatModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Crear Chat</h3>
            <p>¿Deseas iniciar una conversación con <strong>{selectedUser.email}</strong>?</p>
            <div className="modal-buttons">
              <button 
                className="btn-create-chat" 
                onClick={handleCreateChat}
                disabled={isCreatingChat}
              >
                {isCreatingChat ? 'Creando...' : 'Crear Chat'}
              </button>
              <button 
                className="btn-cancel" 
                onClick={() => {
                  setShowCreateChatModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

