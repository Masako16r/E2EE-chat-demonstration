import express from 'express';
import { UserValidation } from '../middleware/auth.middleware.js';
import { prisma } from '../db.js';


const router = express.Router();

router.get('/me', UserValidation, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
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

