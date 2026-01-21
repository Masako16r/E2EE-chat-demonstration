**Languages:** [English](README.md) | [Español](README.es.md)

---

# End-to-End Encrypted Chat (E2EE)

## Project Description

This is a **proof of concept** of a chat application with end-to-end encryption. It demonstrates how to implement message encryption so that **only the sender and receiver** can read the exchanged messages, using elliptic curve cryptography (**ECDH P-256**) to derive shared keys and **AES-GCM** to encrypt messages.

**Important Notice:** This project is an educational demonstration and **NOT intended for production use**. It has known security limitations detailed in this document.

---

## Main Features

- **User registration and login** with JWT authentication
- **Real-time chat** between registered users via Socket.io
- **Message encryption** with ECDH P-256 + AES-GCM
- **Automatic ECDH P-256 key generation** in the browser during registration
- **Public key storage** in database to derive shared keys
- **Secure message storage** (ciphertext + IV) in database
- **Automatic message decryption** upon receipt
- **User search** to start conversations
- **Health checks** and availability polling for Docker
- **API documentation** with Swagger

### Current Issues

- Private keys are stored **only in browser localStorage (unencrypted)**
- If you close the browser or switch to a **private/incognito session**, **you will lose access to your private key**
- You won't be able to read previous messages on other browsers or devices without access to your private key
- No backup, recovery, or key synchronization mechanism between devices
- Private keys remain stored in localStorage without additional protection

---

## How Encryption Works

### Fundamentals: ECDH + AES-GCM

This project uses:

- **ECDH P-256** (Elliptic Curve Diffie-Hellman): Cryptographic key agreement
- **AES-GCM** (Advanced Encryption Standard in Galois/Counter mode): Authenticated symmetric encryption

### Detailed Technical Flow

```
┌─────────────────────────────────────────────────────────────┐
│  KEY GENERATION (During Registration)                       │
└─────────────────────────────────────────────────────────────┘
  
  In User A's Browser:
  const keyPair = crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits", "deriveKey"]
  )
  
  Result:
  ├─ Private Key → browser localStorage
  │  └─ Should never leave, but unencrypted
  └─ Public Key → Sent to server in DB
     └─ Can be viewed by all

┌─────────────────────────────────────────────────────────────┐
│  SENDING ENCRYPTED MESSAGE (User A → User B)                │
└─────────────────────────────────────────────────────────────┘

Step 1: A obtains B from server
  GET /api/users/B → Returns B

Step 2: A derives shared key via ECDH
  sharedSecret = ECDH(A, B)
  chatKey = AES-GCM-key(sharedSecret)
  
Step 3: A encrypts the message
  IV = crypto.getRandomValues(12 bytes)
  ciphertext = AES-GCM.encrypt(message, chatKey, IV)
  
Step 4: A sends to server
  POST /api/messages/chat/{chatId}/send
  Body: { ciphertext: "...", iv: "..." }
  
Step 5: Server stores message entry in encrypted chat between corresponding users
  INSERT INTO Message (chatId, senderId, ciphertext, iv)

┌─────────────────────────────────────────────────────────────┐
│  RECEIVING AND DECRYPTION (User B receives from A)          │
└─────────────────────────────────────────────────────────────┘

Step 1: B obtains A from server
  GET /api/users/A → Returns A

Step 2: B derives the SAME shared key
  sharedSecret = ECDH(B, A)
  chatKey = AES-GCM-key(sharedSecret)
  
Step 3: B decrypts in browser
  message = AES-GCM.decrypt(ciphertext, chatKey, IV)
  
Step 4: Message appears in chat and can be understood
  Only A and B could read the message
```

### Key Model Diagram

```
BROWSER STORAGE (localStorage)
┌────────────────────────┐          ┌────────────────────────┐
│     User A             │          │     User B             │
│ ────────────────────── │          │ ────────────────────── │
│ (Private Key)          │          │ (Private Key)          │
│ Saved in Storage       │          │ Saved in Storage       │
│ Unencrypted            │          │ Unencrypted            │
└────────────────────────┘          └────────────────────────┘

SERVER STORAGE (PostgreSQL Database)
┌────────────────────────┐          ┌────────────────────────┐
│ Users Table            │          │ Users Table            │
│ ────────────────────── │          │ ────────────────────── │
│ publicKey: A (PEM)     │          │ publicKey: B (PEM)     │
│ Visible to all         │          │ Visible to all         │
└────────────────────────┘          └────────────────────────┘

MESSAGES IN DATABASE
┌────────────────────────────────┐
│ Messages Table                 │
│ ────────────────────────────── │
│ ciphertext: "A8B3C2D1..."      │
│ iv: "E4F5G6H7..."              │
│ Encrypted, unreadable          │
└────────────────────────────────┘
```

### Why Is It Secure?

```
To read a message from A to B, you need:

Option 1: A's private key
  ├─ It's in A's browser localStorage
  └─ Protected only by OS access to browser

Option 2: B's private key
  ├─ It's in B's browser localStorage
  └─ Protected only by OS access to browser

Without A or B:
  Cannot derive shared key
  Cannot decrypt message
  Server has only ciphertext 
```

---

## Installation and Configuration

### Prerequisites

- **Node.js** v20
- **npm** included with Node.js
- **Docker** and **Docker Compose** for database and quick setup process
- **Git** (optional, for cloning)

### Step 1: Clone the Repository

```bash
git clone <https://github.com/Masako16r/E2EE-chat-demonstration.git>
cd E2EE-chat-demonstration
```

### Step 2: Configure Environment Variables

**Create `backend/.env`:**

```env
# Database
DATABASE_URL="postgresql://postgres:1234@localhost:5432/e2ee_chat_db"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="1h"

# Server
NODE_ENV="development"
PORT="4000"
```

**Create `frontend/.env`:**

```env
VITE_API_URL="http://localhost:4000"
```

### Step 3: Start Docker Compose

From the project root with the program previously installed:

```bash
docker-compose up --build
```

This executes a series of files, including docker-compose.yml
It allows complete configuration and will raise the following services:

- **PostgreSQL 15** on port 5432
- **Backend** on port 4000
- **Frontend** on port 3000

Access `http://localhost:5173`

These are the default ports, so they don't necessarily have to be in use by another service where the project is running. However, they can be modified in docker-compose.yml.

---

## How to Use the Application

### 1. Create an Account

1. Access the **Welcome** page; by default, the user is redirected to this when starting the frontend
2. Watch the introduction video
3. Enter an email and password (min. 6 characters) for testing; in this case, use the start button
4. Click **Register**
5. In the backend:
   - An ECDH P-256 key pair is generated
   - The private key is saved in localStorage
   - The public key is sent to the server
   - The user is created in the database

### 2. Log In

1. Go to **Login**
2. Enter your credentials
3. A JWT token valid for 1 hour is generated
4. Your private key is loaded from localStorage if found

### 3. Search Users

1. On the chat page, there is a user search function
2. Type the email of the user you want to chat with
3. Click to start a conversation

### 4. Send Encrypted Messages

1. Open a conversation with another user
2. Type your message
3. When you click **Send**:
   - The receiver's public key is obtained
   - The shared ECDH key is derived
   - Encrypted with AES-GCM
   - Only `ciphertext` and `iv` are sent to the server

### 5. Receive and Read Messages

1. The encrypted message arrives via Socket.io in real-time
2. Your browser:
   - Gets the sender's public key
   - Derives the shared key with your private key
   - Automatically decrypts
   - Displays the message on screen

---

## Database Management

### View the Database

**Option 1: Prisma Studio (Recommended)**
```bash
cd backend
npx prisma studio
```

**Option 2: Access PostgreSQL directly**
```bash
# With Docker
docker exec -it e2ee_chat_db psql -U postgres -d e2ee_chat_db

# Useful queries
\dt                           # List tables
SELECT * FROM "User";         # View users
SELECT * FROM "Message";      # View encrypted messages
```

### Reset Database Completely

**Option 1: With Prisma**
```bash
cd backend
npx prisma migrate reset
# This:
# 1. Undoes all migrations
# 2. Deletes the database
# 3. Recreates and applies migrations
```

**Option 2: With Docker Compose**
```bash
# Stop and remove data volume
docker-compose down -v

# Start again (will recreate everything clean)
docker-compose up -d
```

### Create a New Migration

If you change `schema.prisma`:

```bash
cd backend
npx prisma migrate dev --name name
```

Example:
```bash
npx prisma migrate dev --name add_message_reactions
```

---

## Limitations and Security Issues

### Problem 1: Loss of Access on Other Browsers/Devices

**Symptom:** You register in Chrome, close the browser, open Firefox and cannot read old messages.

**Cause:** Private keys are in `localStorage` which is specific to each browser/session.

```
Chrome (User A)             Firefox (User A)
├─ in localStorage          ├─ Does NOT exist
├─ Reads messages           └─ Cannot read
└─ localStorage isolated     separate localStorage
```

**Impact:**
- You permanently lose access to old messages
- No way to recover the private key
- Each browser is effectively a "new" user

### Problem 2: Unencrypted Private Key Storage

**Symptom:** Anyone with access to your computer can read your localStorage.

**Cause:** localStorage is accessible in plain text from DevTools or scripts.

```javascript
// Anyone on the machine can do this:
const privateKey = localStorage.getItem('e2ee_private_key');
console.log(privateKey); // Key exposed!
```

**Impact:**
- Complete compromise if the machine is accessible or has any type of vulnerability and is accessible by a third party
- No OS-level protection at the application level

### Problem 3: No Identity Verification

**Symptom:** There is no way to verify that a public key really belongs to the user who claims to be.

**Cause:** Keys are sent without signing or certification.

```
How do I know that B really is "user@example.com"?
└─ There is no cryptographic mechanism to verify it
└─ An attacker could replace B with their own key
```

**Impact:**
- Vulnerable to man-in-the-middle (MITM) attacks
- A server admin could replace keys

### Problem 4: No Key Recovery

**Symptom:** If you accidentally clear localStorage, the private key is lost forever.

**Cause:** There is no backup or way to recover keys.

**Impact:**
- Impossible to read previous messages
- Impossible to recover from the error

---

## Project Architecture

### Folder Structure

```
E2EE-chat-demonstration/
│
├── docker-compose.yml          # Service definition (backend, frontend, DB)
├── README.md                    # This file
│
├── backend/                     # Node.js + Express Server
│   ├── dockerfile              # Backend Docker image
│   ├── package.json            # Backend dependencies
│   ├── prisma.config.ts        # Prisma configuration
│   ├── swagger.json            # API documentation (OpenAPI)
│   │
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema (Models)
│   │   ├── migrations/         # Versioned database migrations
│   │   │   └── 0_init/
│   │   │       └── migration.sql
│   │   └── generated/          # Auto-generated Prisma client
│   │       └── main/
│   │           ├── client.ts
│   │           ├── models.ts
│   │           └── ...
│   │
│   └── src/
│       ├── index.js            # Entry point (Express + Socket.io)
│       ├── db.js               # Prisma configuration
│       ├── health.js           # Health checks for Docker
│       │
│       ├── controllers/        # Business logic
│       │   └── auth.controller.js    # Registration, login
│       │
│       ├── routes/             # Endpoint definition
│       │   ├── auth.routes.js  # POST /api/auth/{register,login}
│       │   ├── user.js         # GET /api/users
│       │   └── messages.js     # POST/GET /api/messages/*
│       │
│       ├── middleware/         # Middleware functions
│       │   ├── auth.middleware.js      # JWT validation
│       │   ├── error.middleware.js     # Error handling
│       │   └── validation.middleware.js # Input validation
│       │
│       └── generated/          # Types generated from Prisma
│           └── prisma/
│
├── frontend/                    # React + TypeScript + Vite
│   ├── dockerfile              # Frontend Docker image
│   ├── package.json            # Frontend dependencies
│   ├── vite.config.ts          # Vite configuration
│   ├── index.html              # Root HTML
│   │
│   └── src/
│       ├── main.tsx            # React entry point
│       ├── App.tsx             # Root component
│       ├── App.css             # Global styles
│       │
│       ├── api/                # HTTP calls to backend
│       │   ├── auth.ts         # POST register, login
│       │   └── messages.ts     # Chat and message management
│       │
│       ├── crypto/             # Cryptographic logic
│       │   ├── encryption.ts   # ECDH + AES-GCM
│       │   ├── keys.ts         # Key generation and import
│       │   ├── session.ts      # Cryptographic session management
│       │   └── storage.ts      # localStorage for private keys
│       │
│       ├── pages/              # Page components
│       │   ├── Welcome.tsx     # Landing page
│       │   ├── Register.tsx    # Registration form
│       │   ├── Login.tsx       # Login form
│       │   ├── Chat.tsx        # Main chat page
│       │   ├── Home.tsx        # Dashboard
│       │   └── Demonstration.tsx # Demo page
│       │
│       └── styles/             # CSS styles
│           ├── auth.css
│           ├── chat.css
│           ├── palette.css
│           └── ...
```

### Data Flow

```
┌─────────────┐                      ┌──────────────┐
│   Browser   │                      │   Backend    │
│  (Frontend) │                      │  (Node.js)   │
└─────────────┘                      └──────────────┘
      │                                     │
      │  1. Register                        │
      │  (email, password, publicKey)       │
      │────────────────────────────────────→│
      │                                     │
      │  2. Check DB + Hash password        │
      │     + Store user                    │
      │                                     │
      │  3. JWT Token                       │
      │←────────────────────────────────────│
      │                                     │
      │  4. Store Token in localStorage     │
      │                                     │
      │  5. Connect Socket.io (auth token)  │
      │────────────────────────────────────→│
      │                                     │
      │  6. Fetch user list                 │
      │────────────────────────────────────→│
      │                                     │
      │  7. User list (with public keys)    │
      │←────────────────────────────────────│
      │                                     │
      │  8. User selects recipient          │
      │  9. Get recipient's public key      │
      │ 10. Derive shared key (ECDH)        │
      │ 11. Encrypt message (AES-GCM)       │
      │ 12. Send encrypted (ciphertext, iv) │
      │────────────────────────────────────→│
      │                                     │
      │ 13. Store in DB (encrypted)         │
      │ 14. Emit via Socket.io              │
      │←────────────────────────────────────│
      │                                     │
      │ 15. Receive encrypted message       │
      │ 16. Derive shared key (ECDH)        │
      │ 17. Decrypt (AES-GCM)               │
      │ 18. Display in chat                 │
      │
```

### Technologies Used

**Backend:**
- **Node.js v20** - JavaScript runtime
- **Express.js** - Web framework
- **Prisma ORM** - Database access
- **PostgreSQL** - Relational database
- **Socket.io** - Real-time communication
- **JWT** - Token-based authentication
- **bcrypt** - Password hashing
- **Swagger/OpenAPI** - API documentation

**Frontend:**
- **React 18** - UI framework
- **TypeScript** - Static typing
- **Vite** - Build tool and dev server
- **React Router** - Navigation
- **Socket.io Client** - WebSocket client
- **Web Crypto API** - Native browser cryptography

**Infrastructure:**
- **Docker** - Containerization
- **Docker Compose** - Local orchestration
- **PostgreSQL 15 Alpine** - Database in container

---

## Data Model (Schema)

```
┌──────────────────────────────┐
│        User                  │
├──────────────────────────────┤
│ id (UUID) - PK               │
│ email (String) - UNIQUE      │
│ passwordHash (String)        │
│ publicKey (String) - PEM     │
│ createdAt (DateTime)         │
├──────────────────────────────┤
│ Relations:                   │
│ ├─ chats (ChatParticipant[]) │
│ └─ sentMessages (Message[])  │
└──────────────────────────────┘
           ▲
           │ (userId)
    ┌──────┴──────┐
    │             │
┌──────────────────────────────┐
│    ChatParticipant           │
├──────────────────────────────┤
│ chatId (String) - FK, PK     │
│ userId (String) - FK, PK     │
├──────────────────────────────┤
│ Relations:                   │
│ ├─ chat (Chat)               │
│ └─ user (User)               │
└──────────────────────────────┘
    │
    │ (chatId)
    │
┌──────────────────────────────┐
│        Chat                  │
├──────────────────────────────┤
│ id (UUID) - PK               │
│ createdAt (DateTime)         │
├──────────────────────────────┤
│ Relations:                   │
│ ├─ participants (ChatParticipant[])
│ └─ messages (Message[])      │
└──────────────────────────────┘
           ▲
           │ (chatId)
           │
┌──────────────────────────────┐
│        Message               │
├──────────────────────────────┤
│ id (UUID) - PK               │
│ chatId (String) - FK         │
│ senderId (String) - FK       │
│ ciphertext (String) - ENCR   │
│ iv (String) - Initialization │
│ createdAt (DateTime)         │
├──────────────────────────────┤
│ Relations:                   │
│ ├─ chat (Chat)               │
│ └─ sender (User)             │
└──────────────────────────────┘
```

---

## API Endpoints

All generated endpoints can be viewed through Swagger at **http://localhost:4000/api-docs/#/**

---

## Security Limitations and Known Issues

### 1. **Loss of Access on Other Browsers**

**Problem:** If you log in to another browser (even private mode), you won't be able to read old messages.

```
User in Chrome              User in Firefox (Private)
├── Private Key          ├── Private Key (Does not exist)
└── Reads messages       └── Can't do anything
```

**Why it happens:**
- Private keys are stored in the browser's `localStorage`
- Each browser/session has its own storage
- No synchronization between devices

### 2. **No Key Recovery**

- If you lose access to the browser, **you lose permanent access to your private key**
- There is no way to recover or reset keys

### 3. **Unsecure Client Storage**

- Browser localStorage is not encrypted
- Anyone with access to the computer can see private keys

---

## Suggested Solutions (Future Improvements)

These are approaches that could be implemented to solve access and security issues:

### Option 1: **QR Code for Key Transfer**

- When changing device/browser, scan a QR code in a section while you still have both keys
- The QR code contains the encrypted private key
- Can only be used once for security reasons, and is transferred to the new browser

```
Browser 1                    Browser 2
  ↓                              ↓
Generates QR                  Scans QR
  ↓                              ↓
Encrypted QR                  Receives private key
  ↓                              ↓
Read messages                 Read messages
```

### Option 2: **Multi-Factor Authentication (MFA)**

- Combine password + second factor (SMS, email, app)
- Server can securely deliver private keys

### Option 3: **Server Storage (Less Secure)**

- Private keys are stored encrypted on the server
- User provides a password to decrypt them
- Higher risk of compromise if server is exposed

---

## Important Notes

1. **Do not use in production** without implementing additional security measures
2. **Private keys should never leave the browser**

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
