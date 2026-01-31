import type { Request, Response } from 'express';
import { 
    createOrder, 
    getOrderById, 
    getAllOrders, 
    getAllOrdersNoPagination,
    getOrdersByUser, 
    sendOrderQuote, 
    confirmDepositPaid, 
    updateOrderStatus,
    createManualOrder
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
            inspirationFileId: body.inspirationFileId,
            inspirationPublicId: body.inspirationPublicId,
            inspirationPhoto: typeof body.inspirationPhoto === 'string' ? body.inspirationPhoto : undefined,
            termsAccepted: body.termsAccepted === 'true' || body.termsAccepted === true,
            revisionPolicyAccepted: body.revisionPolicyAccepted === 'true' || body.revisionPolicyAccepted === true
        } as IFormSubmission;
    }
    
    // Sanitize inspirationPhoto to prevent cast errors
    if (submission.inspirationPhoto && typeof submission.inspirationPhoto !== 'string') {
        submission.inspirationPhoto = undefined;
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

export const createAdminOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const submission = req.body as IFormSubmission;
        if (!submission.phoneNumber || !submission.fullName || !submission.orderType) {
             res.status(400).json({ success: false, message: 'Name, Phone, and Order Type are required' });
             return;
        }
        
        // Ensure defaults
        submission.measurements = submission.measurements || { bust: 0, waist: 0, hips: 0, shoulderWidth: 0, dressLength: 0, armLength: 0, height: 0 };
        submission.termsAccepted = true; // Admin entry implies consent
        submission.revisionPolicyAccepted = true;

        const order = await createManualOrder(submission);
        res.status(201).json({ success: true, data: order });
    } catch (error: any) {
        console.error('Create Admin Order Error:', error);
        res.status(500).json({ success: false, message: error.message });
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
    const status = req.query.status as string;
    const rush = req.query.rush as string;

    const filter: any = {};
    if (status === 'Pending') {
        filter.status = 'form_submitted';
    } else if (status === 'Completed') {
        filter.status = { $in: ['delivered'] };
    }
    
    if (rush === 'true') {
        filter.rushMultiplier = { $gt: 1 };
    }
    
    const result = await getAllOrders(page, limit, filter);
    
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

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const orders = await getAllOrdersNoPagination();
        
        // Calculate stats based on actual order statuses
        // Active orders = all except 'delivered'
        const activeOrdersCount = orders.filter((o: any) => 
            o.status !== 'delivered'
        ).length;
        
        // Pending quotes = orders waiting for bill to be sent
        const pendingQuotesCount = orders.filter((o: any) => 
            o.status === 'form_submitted'
        ).length;
        
        // Rush orders
        const rushOrdersCount = orders.filter((o: any) => 
            o.rushMultiplier && o.rushMultiplier > 1
        ).length;

        // Ready to ship orders
        const readyOrdersCount = orders.filter((o: any) => 
            o.status === 'ready'
        ).length;
        
        // Calculate revenue
        const totalRevenue = orders.reduce((acc: number, o: any) => 
            acc + (o.totalPrice || 0), 0
        );
        
        // Balance due = total - deposits paid
        const balanceDue = orders.reduce((acc: number, o: any) => {
            if (!o.totalPrice) return acc;
            // If status is 'paid', 'in_progress', 'ready', or 'delivered', deposit has been paid
            const depositPaid = ['paid', 'in_progress', 'ready', 'delivered'].includes(o.status);
            const depositAmount = depositPaid ? (o.depositAmount || o.totalPrice * 0.3) : 0;
            return acc + (o.totalPrice - depositAmount);
        }, 0);
        
        res.status(200).json({
            success: true,
            data: {
                activeOrdersCount,
                pendingQuotesCount,
                rushOrdersCount,
                readyOrdersCount,
                totalRevenue,
                balanceDue,
                totalOrders: orders.length
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

