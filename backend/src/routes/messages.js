import express from 'express';
import { UserValidation } from '../middleware/auth.middleware.js';
import { prisma } from '../db.js';

const router = express.Router();

// Get or create chat between two users
router.post('/chat/:userId', UserValidation, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const otherUserId = req.params.userId;

    if (currentUserId === otherUserId) {
      return res.status(400).json({ message: 'Cannot chat with yourself' });
    }

    // Check if other user exists
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId }
    });

    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find existing chat or create new one
    let chat = await prisma.chat.findFirst({
      where: {
        AND: [
          {
            participants: {
              some: { userId: currentUserId }
            }
          },
          {
            participants: {
              some: { userId: otherUserId }
            }
          }
        ]
      },
      include: {
        participants: true
      }
    });

    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          participants: {
            createMany: {
              data: [
                { userId: currentUserId },
                { userId: otherUserId }
              ]
            }
          }
        },
        include: {
          participants: true
        }
      });
    }

    res.json(chat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send encrypted message
router.post('/chat/:chatId/send', UserValidation, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { ciphertext, iv } = req.body;
    const currentUserId = req.user.userId;

    if (!ciphertext || !iv) {
      return res.status(400).json({ message: 'Missing ciphertext or iv' });
    }

    // Verify user is part of this chat
    const chatParticipant = await prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId: currentUserId
        }
      }
    });

    if (!chatParticipant) {
      return res.status(403).json({ message: 'Not a participant in this chat' });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: currentUserId,
        ciphertext,
        iv
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            publicKey: true
          }
        }
      }
    });

    res.json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get messages for a chat
router.get('/chat/:chatId/messages', UserValidation, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { since } = req.query;
    const currentUserId = req.user.userId;

    // Verify user is part of this chat
    const chatParticipant = await prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId: currentUserId
        }
      }
    });

    if (!chatParticipant) {
      return res.status(403).json({ message: 'Not a participant in this chat' });
    }

    // Build query filter
    const whereClause = { chatId };
    if (since) {
      whereClause.createdAt = { gt: new Date(since) };
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            publicKey: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's public key
router.get('/user/:userId/key', UserValidation, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        publicKey: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get chat between two users (public endpoint for demonstration)
router.get('/chats/between', async (req, res) => {
  try {
    const { user1Id, user2Id } = req.query;

    if (!user1Id || !user2Id) {
      return res.status(400).json({ message: 'Missing user1Id or user2Id' });
    }

    if (user1Id === user2Id) {
      return res.status(400).json({ message: 'Users must be different' });
    }

    // Find chat between these two users
    const chat = await prisma.chat.findFirst({
      where: {
        AND: [
          {
            participants: {
              some: { userId: user1Id }
            }
          },
          {
            participants: {
              some: { userId: user2Id }
            }
          }
        ]
      },
      include: {
        participants: {
          select: {
            userId: true,
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Transform response to match expected format
    const formattedChat = {
      id: chat.id,
      participants: chat.participants.map(p => ({
        id: p.user.id,
        email: p.user.email
      }))
    };

    res.json(formattedChat);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get encrypted messages from a chat (public endpoint for demonstration)
router.get('/public', async (req, res) => {
  try {
    const { chatId } = req.query;

    if (!chatId) {
      return res.status(400).json({ message: 'Missing chatId' });
    }

    // Get messages from chat
    const messages = await prisma.message.findMany({
      where: {
        chatId
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get encrypted messages between two users (public endpoint for demonstration)
router.get('/between', async (req, res) => {
  try {
    const { user1Id, user2Id } = req.query;

    if (!user1Id || !user2Id) {
      return res.status(400).json({ message: 'Missing user1Id or user2Id' });
    }

    if (user1Id === user2Id) {
      return res.status(400).json({ message: 'Users must be different' });
    }

    // Find all chats that contain both users
    const chats = await prisma.chat.findMany({
      where: {
        AND: [
          {
            participants: {
              some: { userId: user1Id }
            }
          },
          {
            participants: {
              some: { userId: user2Id }
            }
          }
        ]
      }
    });

    // If no chat exists, return empty messages array
    if (chats.length === 0) {
      return res.json([]);
    }

    // Get all messages from all chats between these users
    const messages = await prisma.message.findMany({
      where: {
        chatId: {
          in: chats.map(chat => chat.id)
        }
      },
      select: {
        senderId: true,
        ciphertext: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
