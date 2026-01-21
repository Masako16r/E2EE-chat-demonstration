**Idiomas:** [English](README.md) | [Español](README.es.md)

---

# Chat con Encriptación End-to-End (E2EE)

## Descripción del Proyecto

Este es un **proof of concept** (prueba de concepto) de una aplicación de chat con encriptación end-to-end. Demuestra cómo implementar cifrado de mensajes de forma que **solo el remitente y el receptor** puedan leer los mensajes intercambiados, utilizando criptografía de curva elíptica (**ECDH P-256**) para derivar claves compartidas y **AES-GCM** para cifrar los mensajes.

**Aviso Importante:** Este proyecto es una demostración educativa y **NO está pensado para ser utilizado en producción**. Tiene limitaciones de seguridad conocidas que se detallan en este documento.

---

## Características Principales

- **Registro e inicio de sesión** de usuarios con autenticación JWT
- **Chat en tiempo real** entre usuarios registrados via Socket.io
- **Encriptación de mensajes** con ECDH P-256 + AES-GCM
- **Generación automática de claves** ECDH P-256 en el navegador al registrarse
- **Almacenamiento de claves públicas** en base de datos para derivar claves compartidas
- **Almacenamiento seguro** de mensajes cifrados (ciphertext + IV) en base de datos
- **Desencriptación automática** de mensajes al recibirlos
- **Búsqueda de usuarios** para iniciar conversaciones
- **Health checks** y sondeos de disponibilidad para Docker
- **Documentación API** con Swagger

### Problemas actuales

- Las claves privadas se almacenan **solo en localStorage del navegador (sin cifrar)**
- Si cierras el navegador o cambias a una **sesión privada/incógnito**, **perderás acceso a tu clave privada**
- No podrás leer mensajes anteriores en otros navegadores o dispositivos sin acceso a tu clave privada
- Sin mecanismo de respaldo, recuperación o sincronización de claves entre dispositivos
- Las claves privadas quedan almacenadas en localStorage sin protección adicional

---

## Cómo Funciona la Encriptación

### Fundamentos: ECDH + AES-GCM

Este proyecto utiliza:

- **ECDH P-256** (Elliptic Curve Diffie-Hellman): Acuerdo de claves criptográficas
- **AES-GCM** (Advanced Encryption Standard en modo Galois/Counter): Cifrado simétrico autenticado

### Flujo Técnico Detallado

```
┌─────────────────────────────────────────────────────────────┐
│  GENERACIÓN DE CLAVES (Al registrarse)                      │
└─────────────────────────────────────────────────────────────┘
  
  En el navegador del Usuario A:
  const keyPair = crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits", "deriveKey"]
  )
  
  Resultado:
  ├─ Clave Privada → localStorage del navegador
  │  └─ Nunca debe salir, pero sin cifrar
  └─ Clave Pública → Enviada al servidor en BD
     └─ Puede ser vista por todos

┌─────────────────────────────────────────────────────────────┐
│  ENVÍO DE MENSAJE CIFRADO (Usuario A → Usuario B)           │
└─────────────────────────────────────────────────────────────┘

Paso 1: A obtiene B desde servidor
  GET /api/users/B → Retorna B

Paso 2: A deriva clave compartida mediante ECDH
  sharedSecret = ECDH(A, B)
  chatKey = AES-GCM-key(sharedSecret)
  
Paso 3: A cifra el mensaje
  IV = crypto.getRandomValues(12 bytes)
  ciphertext = AES-GCM.encrypt(mensaje, chatKey, IV)
  
Paso 4: A envía al servidor
  POST /api/messages/chat/{chatId}/send
  Body: { ciphertext: "...", iv: "..." }
  
Paso 5: Servidor almacena la entrada del mensaje en un chat de forma encriptada entre los usuarios correspodientes
  INSERT INTO Message (chatId, senderId, ciphertext, iv)

┌─────────────────────────────────────────────────────────────┐
│  RECEPCIÓN Y DESENCRIPTACIÓN (Usuario B recibe de A)        │
└─────────────────────────────────────────────────────────────┘

Paso 1: B obtiene A desde servidor
  GET /api/users/A → Retorna A

Paso 2: B deriva la MISMA clave compartida
  sharedSecret = ECDH(B, A)
  chatKey = AES-GCM-key(sharedSecret)
  
Paso 3: B desencripta en el navegador
  mensaje = AES-GCM.decrypt(ciphertext, chatKey, IV)
  
Paso 4: Mensaje aparece en el chat y puede entenderse
  Solo A y B pudieron leer el mensaje
```

### Diagrama de Modelo de Claves

```
ALMACENAMIENTO EN NAVEGADOR (localStorage)
┌────────────────────────┐          ┌────────────────────────┐
│     Usuario A          │          │     Usuario B          │
│ ────────────────────── │          │ ────────────────────── │
│ (Clave Privada)        │          │ B (Clave Privada)      │
│ Guardada en Storage    │          │ Guardada en Storage    │
│ Sin cifrar             │          │ Sin cifrar             │
└────────────────────────┘          └────────────────────────┘

ALMACENAMIENTO EN SERVIDOR (Base de Datos PostgreSQL)
┌────────────────────────┐          ┌────────────────────────┐
│ Tabla Users            │          │ Tabla Users            │
│ ────────────────────── │          │ ────────────────────── │
│ publicKey: A (PEM)     │          │ publicKey: B (PEM)     │
│ Visible para todos     │          │ Visible para todos     │
└────────────────────────┘          └────────────────────────┘

MENSAJES EN BASE DE DATOS
┌────────────────────────────────┐
│ Tabla Messages                 │
│ ────────────────────────────── │
│ ciphertext: "A8B3C2D1..."      │
│ iv: "E4F5G6H7..."              │
│ Cifrado, ilegible              │
└────────────────────────────────┘
```

### ¿Por qué es seguro?

```
Para leer un mensaje de A a B, necesitas:

Opción 1: La clave privada de A
  ├─ Está en localStorage del navegador de A
  └─ Protegida solo por acceso del SO al navegador

Opción 2: La clave privada de B
  ├─ Está en localStorage del navegador de B
  └─ Protegida solo por acceso del SO al navegador

Sin A o B:
  No se puede derivar la clave compartida
  No se puede desencriptar el mensaje
  El servidor tiene unicamente ciphertext 
```

---

## Instalación y Configuración
### Requisitos Previos

- **Node.js** v20
- **npm** incluido con Node.js
- **Docker** y **Docker Compose** para base de datos y un proceso de configuración rápido
- **Git** (opcional, para clonar)

### Paso 1: Clonar el Repositorio

```bash
git clone <https://github.com/Masako16r/E2EE-chat-demonstration.git>
cd E2EE-chat-demonstration
```

### Paso 2: Configurar Variables de Entorno

**Crea `backend/.env`:**

```env
# Base de Datos
DATABASE_URL="postgresql://postgres:1234@localhost:5432/e2ee_chat_db"

# JWT
JWT_SECRET="tu-clave-secreta"
JWT_EXPIRES_IN="1h"

# Servidor
NODE_ENV="development"
PORT="4000"
```

**Crea `frontend/.env`**:

```env
VITE_API_URL="http://localhost:4000"
```

### Paso 4: Iniciar Docker Compose

Desde la raíz del proyecto con el programa instalado previamente:

```bash
docker-compose up --build
```
Esto ejecuta una serie de archivos, entre ellos docker-compose.yml
Permite realizar una configuracion completa y levatará los siguientes servicios:

- **PostgreSQL 15** en puerto 5432
- **Backend** en puerto 4000
- **Frontend** en puerto 3000


Accede a `http://localhost:5173` 
Estos puertos son los predeterminados, por lo que necesariamente no tienen que estar en uso
por otro servicio donde se encuentre el proyecto ejecutandose. No obstante pueden modificarse
en el docker-compose.yml.

---

## Cómo Usar la Aplicación

### 1. Crear una Cuenta

1. Accede a la página de **Welcome**, por defecto al iniciar el frontend el usuario es redirigido a esta.
2. Visualiza el video de introducción,
3. Introduce un correo y contraseña (mín. 6 caracteres) para realizar la prueba, en este caso utiliza el boton de empezar
3. Haz clic en **Register** 
4. En el backend:
   - Se genera un par de claves ECDH P-256
   - La clave privada se guarda en localStorage
   - La clave pública se envía al servidor
   - Se crea el usuario en la BD

### 2. Iniciar Sesión

1. Ve a **Login**
2. Introduce tus credenciales
3. Se genera un JWT token válido por 1 hora
4. Tu clave privada se carga desde localStorage en caso de encontrarla

### 3. Buscar Usuarios

1. En la página de chat, hay un buscador de usuarios
2. Escribe el email del usuario con el que quieres chatear
3. Haz clic para iniciar conversación

### 4. Enviar Mensajes Cifrados

1. Abre una conversación con otro usuario
2. Escribe tu mensaje
3. Al hacer clic en **Enviar**:
   - Se obtiene la clave pública del receptor
   - Se deriva la clave compartida ECDH
   - Se encripta con AES-GCM
   - Se envía solo el `ciphertext` e `iv` al servidor

### 5. Recibir y Leer Mensajes

1. El mensaje cifrado llega via Socket.io en tiempo real
2. Tu navegador:
   - Obtiene la clave pública del remitente
   - Deriva la clave compartida con tu clave privada
   - Desencripta automáticamente
   - Muestra el mensaje en pantalla
---

## Administración de la Base de Datos

### Ver la Base de Datos

**Opción 1: Prisma Studio (Recomendado)**
```bash
cd backend
npx prisma studio
```

**Opción 2: Acceder a PostgreSQL directamente**
```bash
# Con Docker
docker exec -it e2ee_chat_db psql -U postgres -d e2ee_chat_db

# Consultas útiles
\dt                           # Listar tablas
SELECT * FROM "User";         # Ver usuarios
SELECT * FROM "Message";      # Ver mensajes cifrados
```

### Restablecer la Base de Datos Completamente

**Opción 1: Con Prisma**
```bash
cd backend
npx prisma migrate reset
# Esto:
# 1. Deshace todas las migraciones
# 2. Borra la BD
# 3. Vuelve a crear y aplica migraciones
```

**Opción 2: Con Docker Compose**
```bash
# Detener y eliminar volumen de datos
docker-compose down -v

# Volver a levantarlo (recreará todo limpio)
docker-compose up -d
```

### Crear una Nueva Migración

Si cambias el `schema.prisma`:

```bash
cd backend
npx prisma migrate dev --name nombre
```

Ejemplo:
```bash
npx prisma migrate dev --name add_message_reactions
```

---

## Limitaciones y Problemas de Seguridad

### Problema 1: Pérdida de Acceso en Otros Navegadores/Dispositivos

**Síntoma:** Te registras en Chrome, cierras navegador, abres Firefox y no puedes leer mensajes antiguos.

**Causa:** Las claves privadas están en `localStorage` que es específico de cada navegador/sesión.

```
Chrome (Usuario A)          Firefox (Usuario A)
├─ en localStorage          ├─ NO existe
├─ Lee mensajes             └─ No puede leer
└─ localStorage isolado      localStorage separado
```

**Impacto:** 
- Pierdes acceso permanentemente a mensajes antiguos
- No hay forma de recuperar la clave privada
- Cada navegador es efectivamente un usuario "nuevo"

### Problema 2: Almacenamiento de Clave Privada Sin Cifrar

**Síntoma:** Alguien con acceso a tu computadora puede leer tu localStorage.

**Causa:** localStorage es accesible en texto plano desde DevTools o scripts.

```javascript
// Cualquiera en la máquina puede hacer esto:
const privateKey = localStorage.getItem('e2ee_private_key');
console.log(privateKey); // ¡Clave expuesta!
```

**Impacto:**
- Compromiso completo si la máquina es accesible o tiene algún tipo de vulnerabilidad y es accesible por un tercero.
- No hay protección de SO a nivel de aplicación

### Problema 3: Sin Verificación de Identidad

**Síntoma:** No hay forma de verificar que una clave pública pertenece realmente al usuario que dice ser.

**Causa:** Las claves se envían sin firmar o certificar.

```
¿Cómo sé que B realmente es de "usuario@example.com"?
└─ No hay mecanismo criptográfico para verificarlo
└─ Un atacante podría sustituir B por su propia clave
```

**Impacto:** 
- Vulnerable a ataques de intermediario (MITM)
- Un admin del servidor podría sustituir claves

### Problema 4: Sin Recuperación de Claves

**Síntoma:** Si accidentalmente limpias localStorage, la clave privada se pierde para siempre.

**Causa:** No hay respaldo ni forma de recuperar claves.

**Impacto:**
- Imposible leer mensajes anteriores
- Imposible recuperarse del error

---

## Arquitectura del Proyecto

### Estructura de Carpetas

```
E2EE-chat-demonstration/
│
├── docker-compose.yml          # Definición de servicios (backend, frontend, DB)
├── README.md                    # Este archivo
│
├── backend/                     # Servidor Node.js + Express
│   ├── dockerfile              # Imagen Docker del backend
│   ├── package.json            # Dependencias backend
│   ├── prisma.config.ts        # Configuración de Prisma
│   ├── swagger.json            # Documentación API (OpenAPI)
│   │
│   ├── prisma/
│   │   ├── schema.prisma       # Esquema de base de datos (Modelos)
│   │   ├── migrations/         # Migraciones de BD versionadas
│   │   │   └── 0_init/
│   │   │       └── migration.sql
│   │   └── generated/          # Cliente Prisma autogenerado
│   │       └── main/
│   │           ├── client.ts
│   │           ├── models.ts
│   │           └── ...
│   │
│   └── src/
│       ├── index.js            # Punto de entrada (Express + Socket.io)
│       ├── db.js               # Configuración de Prisma
│       ├── health.js           # Health checks para Docker
│       │
│       ├── controllers/        # Lógica de negocio
│       │   └── auth.controller.js    # Registro, login
│       │
│       ├── routes/             # Definición de endpoints
│       │   ├── auth.routes.js  # POST /api/auth/{register,login}
│       │   ├── user.js         # GET /api/users
│       │   └── messages.js     # POST/GET /api/messages/*
│       │
│       ├── middleware/         # Funciones intermedias
│       │   ├── auth.middleware.js      # Validación de JWT
│       │   ├── error.middleware.js     # Manejo de errores
│       │   └── validation.middleware.js # Validación de entrada
│       │
│       └── generated/          # Tipos generados desde Prisma
│           └── prisma/
│
├── frontend/                    # React + TypeScript + Vite
│   ├── dockerfile              # Imagen Docker del frontend
│   ├── package.json            # Dependencias frontend
│   ├── vite.config.ts          # Configuración de Vite
│   ├── index.html              # HTML raíz
│   │
│   └── src/
│       ├── main.tsx            # Punto de entrada React
│       ├── App.tsx             # Componente raíz
│       ├── App.css             # Estilos globales
│       │
│       ├── api/                # Llamadas HTTP a backend
│       │   ├── auth.ts         # POST register, login
│       │   └── messages.ts     # Gestión de chats y mensajes
│       │
│       ├── crypto/             # Lógica criptográfica
│       │   ├── encryption.ts   # ECDH + AES-GCM
│       │   ├── keys.ts         # Generación e importación de claves
│       │   ├── session.ts      # Gestión de sesión criptográfica
│       │   └── storage.ts      # localStorage de claves privadas
│       │
│       ├── pages/              # Componentes de páginas
│       │   ├── Welcome.tsx     # Página de inicio
│       │   ├── Register.tsx    # Formulario de registro
│       │   ├── Login.tsx       # Formulario de login
│       │   ├── Chat.tsx        # Página de chat principal
│       │   ├── Home.tsx        # Dashboard
│       │   └── Demonstration.tsx # Página de demostración
│       │
│       └── styles/             # Estilos CSS
│           ├── auth.css
│           ├── chat.css
│           ├── palette.css
│           └── ...
```

### Flujo de Datos

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

### Tecnologías Utilizadas

**Backend:**
- **Node.js v20** - Runtime JavaScript
- **Express.js** - Framework web
- **Prisma ORM** - Acceso a base de datos
- **PostgreSQL** - Base de datos relacional
- **Socket.io** - Comunicación en tiempo real
- **JWT** - Autenticación con tokens
- **bcrypt** - Hash de contraseñas
- **Swagger/OpenAPI** - Documentación API

**Frontend:**
- **React 18** - UI framework
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **React Router** - Navegación
- **Socket.io Client** - Cliente para WebSockets
- **Web Crypto API** - Criptografía nativa del navegador

**Infraestructura:**
- **Docker** - Containerización
- **Docker Compose** - Orquestación local
- **PostgreSQL 15 Alpine** - BD en contenedor

---


## Modelo de Datos (Schema)

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

## Endpoints API

Todos los endpoints generados puede verse a través de Swagger, **http://localhost:4000/api-docs/#/**

---


## Limitaciones de Seguridad y Problemas Conocidos

### 1. **Pérdida de Acceso en Otros Navegadores**

**Problema:** Si inicias sesión en otro navegador (incluso privado), no podrás leer mensajes anteriores.

```
Usuario en Chrome          Usuario en Firefox (Incógnito)
├── Clave Privada       ├── Clave Privada (No existe)
└── Lee mensajes        └── No puede nada 
```

**Por qué sucede:**
- Las claves privadas se almacenan en `localStorage` del navegador
- Cada navegador/sesión tiene su propio almacenamiento
- No hay sincronización entre dispositivos

### 2. **Sin Recuperación de Claves**

- Si pierdes el acceso al navegador, **pierdes acceso permanente a tu clave privada**
- No hay forma de recuperar o restablecer claves

### 3. **Almacenamiento en Cliente No Seguro**

- El almacenamiento local del navegador no es cifrado
- Cualquiera con acceso a la computadora puede ver las claves privadas

---

## Soluciones Sugeridas (Futuras Mejoras)

Estos son enfoques que podrían implementarse para resolver los problemas de acceso y seguridad:

### Opción 1: **Código QR para Transferencia de Claves**

- Al cambiar de dispositivo/navegador, escanear un código QR en una seccion mientras todavía cuentas con ambas claves
- El código QR contiene la clave privada encriptada
- Solo se puede usar una vez por razones de seguridad, y es transferido al nuevo navegador

```
Navegador 1                    Navegador 2
  ↓                              ↓
Genera QR                      Escanea QR
  ↓                              ↓
QR encriptado                  Recibe clave privada
  ↓                              ↓
Leer mensajes                  Leer mensajes
```

### Opción 2: **Autenticación Multifactor (MFA)**

- Combinar contraseña + segundo factor (SMS, email, app)
- El servidor puede entregar claves privadas de forma segura

### Opción 3: **Almacenamiento en Servidor (Menos Seguro)**

- Las claves privadas se almacenan encriptadas en el servidor
- El usuario proporciona una contraseña para desencriptarlas
- Mayor riesgo de compromiso del servidor en caso de ser expuestas

---


## Notas Importantes

1. **No usar en producción** sin implementar medidas de seguridad adicionales
2. **Las claves privadas jamás deben salir del navegador**
---


## Licencia


Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.
