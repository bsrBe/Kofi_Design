import type { Request, Response } from 'express';
import { createRevision, getRevisionsByOrderId, getRevisionById, updateRevisionStatus, getAllRevisions, getPendingRevisions, getRevisionsByUser } from '../services/revisions.service.js';
import { CloudinaryService } from '../services/cloudinary.service.js';
import type { IRevision } from '../models/types.js';
import { getOrderById } from '../services/order.service.js';

export const createRevisionWrapper = async (req: Request, res: Response): Promise<void> => {
  try {
    const {...revisionData } = req.body;
    const {orderId} = req.params

    if (!orderId || typeof orderId !== 'string') {
        res.status(400).json({ success: false, message: 'Order ID is required' });
        return;
    }
    const order = await getOrderById(orderId); 
    if (order?.telegramId !== req.user?.id) throw new Error('Order does not belong to user');

    const file = req.file;
    if (file) {
        const result = await CloudinaryService.uploadImage(file.buffer, 'revisions');
        revisionData.inspirationFileId = result.url;
        revisionData.inspirationPublicId = result.publicId;
    }

    const revision = await createRevision(orderId, revisionData as Partial<IRevision>);
    
    res.status(201).json({
      success: true,
      data: revision
    });

  } catch (error: any) {
    console.error('Error creating revision:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal Server Error' 
    });
  }
};

export const getRevision = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id || typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Valid Revision ID is required' });
        return;
    }

    const revision = await getRevisionById(id);
    
    if (!revision) {
      res.status(404).json({ success: false, message: 'Revision not found' });
      return;
    }

    res.status(200).json({ success: true, data: revision });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrderRevisions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
     
    if (!orderId || typeof orderId !== 'string') {
        res.status(400).json({ success: false, message: 'Valid Order ID is required' });
        return;
    }

    const revisions = await getRevisionsByOrderId(orderId);
    
    res.status(200).json({ success: true, data: revisions });
  } catch (error: any) {
     res.status(500).json({ success: false, message: error.message });
  }
};

export const updateRevisionStatusWrapper = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    const id = req.params.id as string;
    
    if (!id || !status) {
        res.status(400).json({ success: false, message: 'Revision ID and status are required' });
        return;
    }

    const revision = await updateRevisionStatus(id, status, req.user?.id);
    
    res.status(200).json({
      success: true,
      data: revision
    });

  } catch (error: any) {
    console.error('Error updating revision status:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal Server Error' 
    });
  }
};

export const getAllRevisionsWrapper = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const revisions = await getAllRevisions(Number(page), Number(limit));
    
    res.status(200).json({
      success: true,
      data: revisions
    });

  } catch (error: any) {
    console.error('Error getting all revisions:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal Server Error' 
    });
  }
};

export const getPendingRevisionsWrapper = async (req: Request, res: Response): Promise<void> => {
  try {
    const revisions = await getPendingRevisions();
    
    res.status(200).json({
      success: true,
      data: revisions
    });

  } catch (error: any) {
    console.error('Error getting pending revisions:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal Server Error' 
    });
  }
};

export const getRevisionsByUserWrapper = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    if (!userId || typeof userId !== 'string') {
        res.status(400).json({ success: false, message: 'Valid User ID is required' });
        return;
    }

    //get the revisions for a single user
    const revisions = await getRevisionsByUser(userId);
    
    res.status(200).json({
      success: true,
      data: revisions
    });

  } catch (error: any) {
    console.error('Error getting revisions by user:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal Server Error' 
    });
  }
};

