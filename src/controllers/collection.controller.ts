import type { Request, Response } from 'express';
import { createCollectionItem, getAllCollections, deleteCollectionItem, updateCollectionItem } from '../services/collection.service.js';

export const addCollectionItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, tags } = req.body;
        const file = req.file;

        if (!title || !file) {
            res.status(400).json({ success: false, message: 'Title and photo are required' });
            return;
        }

        const tagList = typeof tags === 'string' ? JSON.parse(tags) : tags;
        const item = await createCollectionItem(title, file.buffer, tagList || []);

        res.status(201).json({
            success: true,
            message: 'Collection item added successfully',
            data: item
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getCollections = async (req: Request, res: Response): Promise<void> => {
    try {
        const items = await getAllCollections();
        res.status(200).json({
            success: true,
            data: items
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const editCollectionItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, tags } = req.body;
        const file = req.file;

        if (!id) {
            res.status(400).json({ success: false, message: 'ID is required' });
            return;
        }

        const tagList = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : undefined;
        const item = await updateCollectionItem(id as string, { title, tags: tagList }, file?.buffer);

        if (!item) {
            res.status(404).json({ success: false, message: 'Item not found' });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Collection item updated successfully',
            data: item
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const removeCollectionItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ success: false, message: 'ID is required' });
            return;
        }
        const success = await deleteCollectionItem(id as string);
        
        if (!success) {
            res.status(404).json({ success: false, message: 'Item not found' });
            return;
        }

        res.status(200).json({ success: true, message: 'Item removed successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
