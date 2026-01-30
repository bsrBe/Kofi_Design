import { Order, User, Revision } from '../models/index.js';
import { NotificationService } from './telegram.service.js';
import { UserTemplates, AdminTemplates } from '../utils/messageTemplates.js';
import type {IRevision } from '../models/types.js';

export const createRevision = async (orderId: string, revisionData: Partial<IRevision>): Promise<IRevision> => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  const revisionCount = await Revision.countDocuments({ orderId });
  const isFree = revisionCount === 0;
  const revisionFee = isFree ? 0 : order.basePrice * 0.1;

  // Merge measurements: if partial measurements are provided, merge with existing order measurements
  const mergedMeasurements = {
    ...order.measurements,
    ...(revisionData.measurements || {})
  };

  const revision = new Revision({
    orderId,
    measurements: mergedMeasurements,
    inspirationFileId: revisionData.inspirationFileId || order.inspirationFileId,
    bodyConcerns: revisionData.bodyConcerns || order.bodyConcerns,
    colorPreference: revisionData.colorPreference || order.colorPreference,
    status: 'pending',
    revisionFee: revisionFee,
    revisionFeePaid: false,
    revisionReason: revisionData.revisionReason || "",
    revisionNumber: revisionCount // 0 for initial, 1 for first revision, etc.
  });

  await revision.save();

  // Update order
  order.revisionCount += 1;
  order.totalPrice += revisionFee;
  order.status = 'revision_requested';
  await order.save();

  // Notify user
  await NotificationService.sendUpdate(order.telegramId, UserTemplates.REVISION_SUBMITTED(isFree, revisionFee));

  // Notify Admin
  const adminMsg = AdminTemplates.NEW_REVISION(
      (order._id as string),
      order.clientProfile.fullName,
      revisionData.revisionReason || 'Not specified',
      isFree,
      revisionFee,
      (revision._id as string)
  );
  
  NotificationService.sendUpdate(process.env.ADMIN_CHAT_ID!, adminMsg)
    .catch(err => console.error("Admin Revision Notification Error:", err));

  return revision.toObject();
};

export const getRevisionsByOrderId = async (orderId: string): Promise<IRevision[]> => {
  const revisions = await Revision.find({ orderId }).lean();
  return revisions;
};

export const updateRevisionStatus = async (revisionId: string, status: string, adminId?: string): Promise<IRevision | null> => {
  const revision = await Revision.findByIdAndUpdate(
    revisionId,
    { status, ...(adminId && { adminId }) },
    { new: true }
  ).populate('orderId');

  if (revision) {
    const order = revision.orderId as any; // Cast until we have better Mongoose populate types
    const message = status === 'approved' 
        ? UserTemplates.REVISION_APPROVED(order._id)
        : UserTemplates.REVISION_REJECTED(order._id, revision.adminNotes || 'Please contact support');

    NotificationService.sendUpdate(order.telegramId, message)
      .catch(err => console.error("Revision Status Notification Error:", err));

    return revision.toObject();
  }
  return null;
};

export const getRevisionById = async (revisionId: string): Promise<IRevision | null> => {
  const revision = await Revision.findById(revisionId).lean();
  return revision;
};

export const updateRevisionFeePaid = async (revisionId: string, paid: boolean): Promise<IRevision | null> => {
  const revision = await Revision.findByIdAndUpdate(
    revisionId,
    { revisionFeePaid: paid },
    { new: true }
  ).populate('orderId');

  if (revision && paid) {
    const order = revision.orderId as any;
    NotificationService.sendUpdate(order.telegramId, UserTemplates.PAYMENT_CONFIRMED(order._id))
      .catch(err => console.error("Revision Payment Notification Error:", err));
    
    return revision.toObject();
  }
  return revision ? revision.toObject() : null;
};


export const getAllRevisions = async (page: number = 1, limit: number = 10): Promise<{ revisions: IRevision[]; total: number }> => {
  const skip = (page - 1) * limit;
  const revisions = await Revision.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('orderId', 'fullName phoneNumber telegramId')
    .lean();
  const total = await Revision.countDocuments();
  return { revisions, total };
};

export const getPendingRevisions = async (): Promise<IRevision[]> => {
  const revisions = await Revision.find({ status: 'pending' }).lean();
  return revisions;
};

export const getRevisionsByUser = async (userId: string): Promise<IRevision[]> => {
  const revisions = await Revision.find({ telegramId: userId }).lean();
  return revisions;
};