import type { Request, Response } from 'express';
import { 
    createOrder, 
    getOrderById, 
    getAllOrders, 
    getOrdersByUser, 
    sendOrderQuote, 
    confirmDepositPaid, 
    updateOrderStatus 
} from '../services/order.service.js';
import { NotificationService } from '../services/telegram.service.js';
import { CloudinaryService } from '../services/cloudinary.service.js';
import type { IFormSubmission } from '../models/types.js';

export const submitOrderWrapper = async (req: Request, res: Response): Promise<void> => {
  try {
    const { body, file } = req;
    let submission: IFormSubmission;

    if (body.data) {
        submission = JSON.parse(body.data);
    } else {
        // Construct from flat fields (generic fallback)
        submission = {
            fullName: body.fullName,
            phoneNumber: body.phoneNumber,
            city: body.city,
            instagramHandle: body.instagramHandle,
            orderType: body.orderType,
            occasion: body.occasion,
            eventDate: body.eventDate,
            preferredDeliveryDate: body.preferredDeliveryDate,
            measurements: typeof body.measurements === 'string' ? JSON.parse(body.measurements) : body.measurements,
            bodyConcerns: body.bodyConcerns,
            colorPreference: body.colorPreference,
            fabricPreference: body.fabricPreference,
            termsAccepted: body.termsAccepted === 'true' || body.termsAccepted === true,
            revisionPolicyAccepted: body.revisionPolicyAccepted === 'true' || body.revisionPolicyAccepted === true
        } as IFormSubmission;
    }

    // Handle File Upload to Cloudinary
    let inspirationUrl: string | undefined;
    let inspirationPublicId: string | undefined;

    if (file) {
      try {
        const result = await CloudinaryService.uploadImage(file.buffer, 'orders');
        inspirationUrl = result.url;
        inspirationPublicId = result.publicId;
      } catch (uploadError) {
        res.status(503).json({ 
          success: false, 
          message: 'Failed to upload photo to our secure storage. Please try again in 1 minute.' 
        });
        return;
      }
    }

    if (inspirationUrl) {
        submission.inspirationPhoto = inspirationUrl;
        (submission as any).inspirationPublicId = inspirationPublicId;
    }
    // Users must be identified by a Telegram ID from the Auth Middleware
    const telegramId = req.user?.id;
    
    if (!telegramId) {
        res.status(401).json({ success: false, message: 'Unauthorized: Valid Telegram ID required' });
        return;
    }

    const order = await createOrder(submission, telegramId);
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });

  } catch (error: any) {
    console.error('Error submitting order:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal Server Error' 
    });
  }
};

export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id || typeof id !== 'string') {
        res.status(400).json({ success: false, message: 'Valid Order ID is required' });
        return;
    }

    const order = await getOrderById(id);
    
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    res.status(200).json({ success: true, data: order });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const result = await getAllOrders(page, limit);
    
    res.status(200).json({ 
      success: true, 
      data: result.orders,
      meta: {
        total: result.total,
        page,
        limit
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const telegramId = req.user?.id;
    if (!telegramId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const result = await getOrdersByUser(telegramId, page, limit);
    
    res.status(200).json({ 
      success: true, 
      data: result.orders,
      meta: {
        total: result.total,
        page,
        limit
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendQuote = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { basePrice, preferredDeliveryDate } = req.body;
        
        if (!basePrice) {
            res.status(400).json({ success: false, message: 'Base price is required' });
            return;
        }

        const order = await sendOrderQuote(id, Number(basePrice), preferredDeliveryDate ? new Date(preferredDeliveryDate) : undefined);
        
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }

        res.status(200).json({ success: true, data: order });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const confirmDeposit = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const order = await confirmDepositPaid(id);
        
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }

        res.status(200).json({ success: true, data: order });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const { status } = req.body;
        
        if (!status) {
            res.status(400).json({ success: false, message: 'Status is required' });
            return;
        }

        const order = await updateOrderStatus(id, status, req.user?.id);
        
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }

        res.status(200).json({ success: true, data: order });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
