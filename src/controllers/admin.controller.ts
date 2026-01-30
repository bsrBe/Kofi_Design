import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Admin from '../models/admin.model.js';
import type { IAdmin } from '../models/types.js';

// Login Admin
export const loginAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    // 1. Find Admin
    const admin = await Admin.findOne({ email });
    if (!admin) {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
        return;
    }
    
    // 2. Verify Password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
         res.status(401).json({ success: false, message: 'Invalid credentials' });
         return;
    }

    // 3. Generate JWT Token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment');
    }

    const token = jwt.sign(
        { id: admin._id, email: admin.email, role: admin.role },
        secret,
        { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role
      }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create Admin (Registration)
export const createAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { fullName, email, phoneNumber, password } = req.body;
        
        // 1. Check if exists
        const existing = await Admin.findOne({ email });
        if (existing) {
             res.status(400).json({ success: false, message: 'Admin already exists' });
             return;
        }

        // 2. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Create Admin
        const admin = new Admin({
            fullName,
            email,
            phoneNumber,
            password: hashedPassword,
            role: 'admin'
        });

        await admin.save();
        
        res.status(201).json({ success: true, message: 'Admin created successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = await Admin.findById(req.user?.id);
        if (!admin) {
            res.status(404).json({ success: false, message: 'Admin not found' });
            return;
        }
        res.status(200).json({ success: true, admin });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};