import express from 'express';
import { UserValidation } from '../middleware/auth.middleware.js';
import { prisma } from '../db.js';


const router = express.Router();

// Get all users (public endpoint for demonstration)
router.get('/all', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                createdAt: true
            },
            orderBy: {
                email: 'asc'
            }
        });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/me', UserValidation, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                email: true,
                publicKey: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/available', UserValidation, async (req, res) => {
    try {
        const currentUserId = req.user.userId;
        const users = await prisma.user.findMany({
            where: {
                id: {
                    not: currentUserId
                }
            },
            select: {
                id: true,
                email: true,
                createdAt: true
            },
            orderBy: {
                email: 'asc'
            }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/search', UserValidation, async (req, res) => {
    try {
        const { email } = req.query;
        
        if (!email) {
            return res.status(400).json({ message: 'Email parameter is required' });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;

