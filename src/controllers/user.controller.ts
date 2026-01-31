import type { Request, Response } from 'express';
import { User } from '../models/index.js';

export const getMe = async (req: Request, res: Response) => {
    try {
        const telegramId = (req as any).user?.id;

        if (!telegramId) {
            res.status(401).json({ message: 'Unauthorized: No Telegram ID' });
            return;
        }

        const user = await User.findOne({ telegramId }).select('fullName phoneNumber city instagramHandle');

        if (!user) {
            // It's okay if user not found, just return null profile
            res.status(200).json({ profile: null });
            return;
        }

        res.status(200).json({ 
            profile: {
                fullName: user.fullName,
                phoneNumber: user.phoneNumber,
                city: user.city,
                instagramHandle: user.instagramHandle
            }
        });
    } catch (error) {
        console.error('Get Me Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('telegramId fullName phoneNumber city instagramHandle totalOrders createdAt'),
            User.countDocuments()
        ]);

        res.status(200).json({
            success: true,
            data: users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get All Users Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
