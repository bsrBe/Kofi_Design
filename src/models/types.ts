import { Types } from "mongoose";

// ========== User Types ==========
export interface IUser {
  _id: string | Types.ObjectId;

  telegramId: string;
  fullName: string;
  phoneNumber: string;
  city: string;
  instagramHandle?: string;
  totalOrders: number;
  createdAt: Date;
  updatedAt: Date;
}

// ========== Admin Types ==========
export type AdminRole = 'admin' | 'super_admin';

export interface IAdmin {
  _id: string | Types.ObjectId;
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  secretQuestion?: string;
  secretAnswer?: string; // Hashed
  role: AdminRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ========== Order Types ==========
export type OrderType = 'custom_event_dress' | 'signature_dress' | 'top' | 'dress' | 'pants' | 'jacket';
export type OccasionType = 'wedding' | 'party' | 'graduation' | 'other';
export type OrderStatus = 'form_submitted' | 'bill_sent' | 'paid' | 'in_progress' | 'ready' | 'delivered' | 'revision_requested';

export interface IMeasurements {
  [key: string]: number;
}

export interface IClientProfile {
  fullName: string;
  phoneNumber: string;
  city: string;
  instagramHandle?: string;
}

export interface IOrder {
  _id: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  telegramId: string;
  collectionId?: string | Types.ObjectId;
  
  // Section 1: Client Profile
  clientProfile: IClientProfile;
  
  // Section 2: Order Categorization
  orderType: OrderType;
  occasion: OccasionType;
  fabricPreference?: string;
  
  // Section 3: Scheduling
  eventDate: Date;
  preferredDeliveryDate: Date;
  isRushOrder: boolean;
  rushMultiplier: number;
  daysUntilDelivery?: number;
  
  // Section 4: Measurements
  measurements: IMeasurements;
  
  // Section 5: Visual Inspiration
  bodyConcerns?: string;
  inspirationFileId?: string;
  inspirationPublicId?: string;
  inspirationPhoto?: string;
  colorPreference?: string;
  
  // Section 6: Agreement
  termsAccepted: boolean;
  termsAcceptedAt?: Date;
  revisionPolicyAccepted: boolean;
  
  // Order Management
  status: OrderStatus;
  revisionCount: number;
  
  // Pricing
  basePrice: number;
  totalPrice: number;
  depositAmount: number;
  depositPaid: boolean;
  depositPaidAt?: Date;
  finalPaymentPaid: boolean;
  finalPaymentPaidAt?: Date;
  
  // Audit Trail
  history: string[]; // Array of Revision IDs
  
  // Admin
  adminNotes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ========== Revision Types ==========
export type RevisionStatus = 'pending' | 'approved' | 'rejected' | 'applied';

export interface IRevision {
  _id: string | Types.ObjectId;
  orderId: string | Types.ObjectId;
  
  // Measurement Snapshot
  measurements: IMeasurements;
  
  // Visual Elements
  inspirationFileId?: string | File | undefined;
  inspirationPublicId?: string | undefined;
  inspirationPhoto?: string | undefined;
  bodyConcerns?: string | undefined;
  colorPreference?: string | undefined;
  
  // Revision Tracking
  revisionNumber: number;
  isFree: boolean;
  revisionReason?: string;
  
  // Status & Payment
  status: RevisionStatus;
  revisionFee: number;
  revisionFeePaid: boolean;
  
  // Admin Actions
  approvedBy?: string;
  approvedAt?: Date;
  adminNotes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ========== Form Submission Types ==========
export interface IFormSubmission {
  // Section 1: Client Profile
  fullName: string;
  phoneNumber: string;
  city: string;
  instagramHandle?: string;
  
  // Section 2: Order Categorization
  orderType: OrderType;
  occasion: OccasionType;
  collectionId?: string | Types.ObjectId;

  
  // Section 3: Scheduling
  eventDate: string | Date;
  preferredDeliveryDate: string | Date;
  
  // Section 4: Measurements
  measurements: IMeasurements;
  
  // Section 5: Visual Inspiration
  bodyConcerns?: string | undefined;
  inspirationPhoto?: string | undefined; // Cloudinary URL
  inspirationFileId?: string | undefined; // Telegram File ID
  inspirationPublicId?: string | undefined; // Cloudinary Public ID
  colorPreference?: string | undefined;
  fabricPreference?: string | undefined;
  
  // Section 6: Agreement
  termsAccepted: boolean;
  revisionPolicyAccepted: boolean;
}

// ========== Rush Order Calculation ==========
export interface IRushOrderCalculation {
  daysUntilDelivery: number;
  isRushOrder: boolean;
  rushMultiplier: number;
  rushMessage?: string;
}

// ========== API Response Types ==========
export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface IOrderResponse extends IApiResponse {
  data?: {
    order: IOrder;
    rushInfo?: IRushOrderCalculation;
  };
}

export interface IRevisionResponse extends IApiResponse {
  data?: {
    revision: IRevision;
    canRequestRevision: boolean;
    revisionCount: number;
  };
}
// ========== Collection Types ==========
export interface ICollection {
  _id: string | Types.ObjectId;
  title: string;
  image: string; // Storing the fileId or URL
  cloudinaryPublicId?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICollectionResponse extends IApiResponse {
  data?: ICollection | ICollection[];
}
