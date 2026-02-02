import { Order, User, Revision } from '../models/index.js';
import { NotificationService } from './telegram.service.js';
import { UserTemplates, AdminTemplates } from '../utils/messageTemplates.js';
import type { IFormSubmission, IOrder } from '../models/types.js';

/**
 * Creates a new order with atomic user updates and initial revision tracking.
 * Optimized for high concurrency and data integrity.
 */
export const createOrder = async (submission: IFormSubmission, telegramId: string): Promise<IOrder> => {
  
  // 1. Atomic User Upsert (Information only, no increment yet)
  const user = await User.findOneAndUpdate(
    { telegramId },
    {
      $set: {
        fullName: submission.fullName,
        phoneNumber: submission.phoneNumber,
        city: submission.city,
        instagramHandle: submission.instagramHandle || "",
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 2. Initialize Order Object
  const order = new Order({
    userId: user._id,
    telegramId,
    clientProfile: {
      fullName: submission.fullName,
      phoneNumber: submission.phoneNumber,
      city: submission.city,
      instagramHandle: submission.instagramHandle || ""
    },
    orderType: submission.orderType,
    occasion: submission.occasion,
    collectionId: submission.collectionId,
    fabricPreference: submission.fabricPreference || "",
    eventDate: new Date(submission.eventDate),
    preferredDeliveryDate: new Date(submission.preferredDeliveryDate),
    measurements: submission.measurements,
    bodyConcerns: submission.bodyConcerns || "",
    inspirationFileId: submission.inspirationFileId, // Telegram File ID (if any)
    inspirationPublicId: submission.inspirationPublicId, // Cloudinary public ID
    inspirationPhoto: submission.inspirationPhoto, // Cloudinary URL
    colorPreference: submission.colorPreference || "",
    termsAccepted: submission.termsAccepted,
    termsAcceptedAt: new Date(),
    revisionPolicyAccepted: submission.revisionPolicyAccepted,
    status: 'form_submitted',
    revisionCount: 0 
  });

  // 3. Save Order (Triggers Mongoose Pre-save hook for Rush Logic)
  // If this fails, the user count won't be incremented.
  await order.save();

  // 4. Increment User Order Count only after successful save
  await User.findByIdAndUpdate(user._id, { $inc: { totalOrders: 1 } });

  // 4. Create Initial Revision Entry
  const initialRevision = await Revision.create({
    orderId: order._id,
    measurements: submission.measurements,
    inspirationFileId: submission.inspirationFileId,
    inspirationPhoto: submission.inspirationPhoto,
    inspirationPublicId: submission.inspirationPublicId,
    isFree: true,
    status: 'approved',
    adminNotes: 'Initial measurement set from order creation'
  } as any);

  // 5. Link revision to order history and save
  order.history.push(initialRevision._id as any);
  await order.save();

  // 5. Asynchronous Notification Flow
  const adminNotification = AdminTemplates.NEW_ORDER(
      submission.fullName,
      submission.orderType,
      submission.occasion,
      new Date(submission.preferredDeliveryDate).toDateString(),
      order.rushMultiplier || 1,
      (order._id as string)
  );

  // Notify User
  NotificationService.sendUpdate(telegramId, UserTemplates.ORDER_RECEIVED(submission.fullName))
    .catch(err => console.error("User Notification Error:", err));

  // Notify Admin/Storage Channel
  NotificationService.notifyAdmins(adminNotification)
    .catch(err => console.error("Admin Notification Error:", err));

  return order.toObject();
};

/**
 * Manually create an order for a walk-in client or via Admin.
 * Resolves Telegram ID via Phone Number or generates a placeholder.
 */
export const createManualOrder = async (submission: IFormSubmission): Promise<IOrder> => {
    const existingUser = await User.findOne({ phoneNumber: submission.phoneNumber });
    // Use existing ID or generate walkin ID
    const telegramId = existingUser ? existingUser.telegramId : `walkin_${submission.phoneNumber.replace(/\D/g, '')}`;
    
    return await createOrder(submission, telegramId);
};

export const getOrderById = async (orderId: string): Promise<IOrder | null> => {
  const order = await Order.findById(orderId)
    .populate('userId', 'fullName phoneNumber telegramId')
    .populate('collectionId')
    .lean();
  return order;
};

export const updateOrderStatus = async (orderId: string, status: string, adminId?: string): Promise<IOrder | null> => {
  const order = await Order.findByIdAndUpdate(
    orderId,
    { status, ...(adminId && { adminId }) },
    { new: true }
  );

  if (order) {
    let message: string;
    
    if (status === 'ready') {
      const balanceDue = order.totalPrice - (order.depositPaid ? order.depositAmount : 0);
      message = UserTemplates.ORDER_READY(balanceDue);
    } else if (status === 'delivered') {
      message = UserTemplates.ORDER_DELIVERED();
    } else {
      message = UserTemplates.GENERIC_STATUS_UPDATE(status);
    }

    NotificationService.sendUpdate(order.telegramId, message)
      .catch(err => console.error("Status Update Notification Error:", err));
    
    return order.toObject();
  }
  
  return null;
};

/**
 * Sends a manual quote to the user and updates the order pricing.
 */
export const sendOrderQuote = async (orderId: string, basePrice: number, preferredDeliveryDate?: Date): Promise<IOrder | null> => {
    const order = await Order.findById(orderId);
    if (!order) return null;

    order.basePrice = basePrice;
    if (preferredDeliveryDate) {
        order.preferredDeliveryDate = preferredDeliveryDate;
    }
    
    const today = new Date();
    const delivery = new Date(order.preferredDeliveryDate);
    const daysUntil = Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let multiplier = 1.0;
    if (daysUntil < 7) multiplier = 1.4;
    else if (daysUntil < 14) multiplier = 1.2;

    order.rushMultiplier = multiplier;
    order.totalPrice = Math.round(basePrice * multiplier);
    order.status = 'bill_sent';

    await order.save();

    const rushFee = order.totalPrice - basePrice;
    const quoteMessage = UserTemplates.ORDER_QUOTE(
        order.totalPrice,
        new Date(order.preferredDeliveryDate).toDateString(),
        rushFee
    );

    NotificationService.sendUpdate(order.telegramId, quoteMessage)
        .catch(err => console.error("Quote Notification Error:", err));

    return order.toObject();
};

/**
 * Confirms the 30% deposit has been paid.
 */
export const confirmDepositPaid = async (orderId: string): Promise<IOrder | null> => {
    const order = await Order.findByIdAndUpdate(
        orderId,
        { 
            depositPaid: true, 
            depositPaidAt: new Date(),
            status: 'paid'
        },
        { new: true }
    );

    if (order) {
        const confirmationMessage = UserTemplates.ORDER_CONFIRMED(
            order.orderType,
            new Date(order.preferredDeliveryDate).toDateString()
        );

        NotificationService.sendUpdate(order.telegramId, confirmationMessage)
            .catch(err => console.error("Deposit Confirmation Error:", err));
        
        return order.toObject();
    }
    return null;
};


export const getOrdersByUser = async (telegramId: string, page: number = 1, limit: number = 10): Promise<{ orders: IOrder[]; total: number }> => {
  const skip = (page - 1) * limit;
  const orders = await Order.find({ telegramId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'fullName phoneNumber telegramId')
    .lean();
  const total = await Order.countDocuments({ telegramId });
  return { orders, total };
};

export const getAllOrders = async (page: number = 1, limit: number = 10, filter: any = {}): Promise<{ orders: IOrder[]; total: number }> => {
  const skip = (page - 1) * limit;
  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('userId', 'fullName phoneNumber telegramId')
    .populate('collectionId')
    .lean();
  const total = await Order.countDocuments(filter);
  return { orders, total };
};

export const getAllOrdersNoPagination = async (): Promise<IOrder[]> => {
    return await Order.find().lean();
};

export const getPendingOrders = async (): Promise<IOrder[]> => {
  return await Order.find({ status: 'form_submitted' }).lean();
};

/**
 * Updates an existing order if it's still in 'form_submitted' status.
 */
export const updateUserOrder = async (orderId: string, telegramId: string, updates: Partial<IFormSubmission>): Promise<IOrder | null> => {
    const order = await Order.findOne({ _id: orderId, telegramId });
    if (!order) return null;
    
    if (order.status !== 'form_submitted') {
        throw new Error('Order can only be edited while in pending status.');
    }

    // Update Client Profile (within order)
    if (updates.fullName) order.clientProfile.fullName = updates.fullName;
    if (updates.phoneNumber) order.clientProfile.phoneNumber = updates.phoneNumber;
    if (updates.city) order.clientProfile.city = updates.city;
    if (updates.instagramHandle) order.clientProfile.instagramHandle = updates.instagramHandle;

    // Update Order Details
    if (updates.orderType) order.orderType = updates.orderType;
    if (updates.occasion) order.occasion = updates.occasion;
    if (updates.collectionId) order.collectionId = updates.collectionId as any;
    if (updates.fabricPreference) order.fabricPreference = updates.fabricPreference;
    if (updates.eventDate) order.eventDate = new Date(updates.eventDate);
    if (updates.preferredDeliveryDate) order.preferredDeliveryDate = new Date(updates.preferredDeliveryDate);
    if (updates.measurements) order.measurements = updates.measurements;
    if (updates.bodyConcerns) order.bodyConcerns = updates.bodyConcerns;
    if (updates.colorPreference) order.colorPreference = updates.colorPreference;
    
    // Physical Inspiration
    if (updates.inspirationPhoto) order.inspirationPhoto = updates.inspirationPhoto;
    if (updates.inspirationPublicId) order.inspirationPublicId = updates.inspirationPublicId;
    if (updates.inspirationFileId) order.inspirationFileId = updates.inspirationFileId;

    await order.save(); // Triggers pre-save hooks (rush logic recalculation)

    // Sync with the initial revision
    if (order.history && order.history.length > 0) {
        await Revision.findByIdAndUpdate(order.history[0], {
            measurements: order.measurements,
            inspirationPhoto: order.inspirationPhoto,
            inspirationPublicId: order.inspirationPublicId,
            inspirationFileId: order.inspirationFileId
        });
    }

    return order.toObject();
};