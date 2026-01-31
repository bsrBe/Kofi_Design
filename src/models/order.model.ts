import mongoose from "mongoose";
import type { IOrder } from "./types.js";
/**
 * Order Model - Complete 6-Section Progressive Form
 * Captures all data from the intake process and manages order lifecycle
 */
const orderSchema = new mongoose.Schema({
  // Reference to User
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  telegramId: {
    type: String,
    required: true
  },

  // ========== SECTION 1: Client Profile (Embedded for quick access) ==========
  clientProfile: {
    fullName: {
      type: String,
      required: true
    },
    phoneNumber: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    instagramHandle: {
      type: String,
      default: ""
    }
  },

  // ========== SECTION 2: Order Categorization ==========
  orderType: {
    type: String,
    enum: ['custom_event_dress', 'signature_dress'],
    required: true
  },
  occasion: {
    type: String,
    enum: ['wedding', 'party', 'graduation', 'other'],
    required: true
  },
  fabricPreference: {
    type: String,
    default: ""
  },

  // ========== SECTION 3: Scheduling & Rush Logic ==========
  eventDate: {
    type: Date,
    required: true
  },
  preferredDeliveryDate: {
    type: Date,
    required: true
  },
  isRushOrder: {
    type: Boolean,
    default: false
  },
  rushMultiplier: {
    type: Number,
    default: 1.0,
    min: 1.0,
    max: 1.4
  },
  daysUntilDelivery: {
    type: Number
  },

  // ========== SECTION 4: Precision Measurements (Current) ==========
  measurements: {
    bust: {
      type: Number,
      required: true
    },
    waist: {
      type: Number,
      required: true
    },
    hips: {
      type: Number,
      required: true
    },
    shoulderWidth: {
      type: Number,
      required: true
    },
    dressLength: {
      type: Number,
      required: true
    },
    armLength: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    }
  },

  // ========== SECTION 5: Visual Inspiration ==========
  bodyConcerns: {
    type: String,
    default: ""
  },
  inspirationFileId: {
    type: String,
    required: false
  }, // Telegram File ID for the uploaded photo
  inspirationPublicId: {
    type: String,
    required: false
  }, // Cloudinary Public ID
  inspirationPhoto: {
    type: String,
    required: false
  }, // Cloudinary URL for the inspiration photo
  colorPreference: {
    type: String,
    default: ""
  },

  // ========== SECTION 6: Agreement & Submission ==========
  termsAccepted: {
    type: Boolean,
    required: true,
    default: false
  },
  termsAcceptedAt: {
    type: Date
  },
  revisionPolicyAccepted: {
    type: Boolean,
    required: true,
    default: false
  },

  // ========== Order Management ==========
  status: {
    type: String,
    enum: ['form_submitted', 'bill_sent', 'paid', 'in_progress', 'ready', 'delivered', 'revision_requested'],
    default: "form_submitted"
  },
  revisionCount: {
    type: Number,
    default: 0
  },
  
  // ========== Pricing ==========
  basePrice: {
    type: Number,
    default: 0
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  depositAmount: {
    type: Number,
    default: 0
  },
  depositPaid: {
    type: Boolean,
    default: false
  },
  depositPaidAt: {
    type: Date
  },
  finalPaymentPaid: {
    type: Boolean,
    default: false
  },
  finalPaymentPaidAt: {
    type: Date
  },

  // ========== Audit Trail ==========
  history: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Revision'
  }], // Array of previous measurement revisions

  // ========== Admin Notes ==========
  adminNotes: {
    type: String,
    default: ""
  },

  // ========== Timestamps ==========
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// ========== Indexes for Performance ==========
orderSchema.index({ telegramId: 1, status: 1 });
orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ preferredDeliveryDate: 1 });

// ========== Pre-save Hook: Calculate Rush Order ==========
orderSchema.pre('save', function() {
  if (this.isNew || this.isModified('preferredDeliveryDate')) {
    const today = new Date();
    const deliveryDate = new Date(this.preferredDeliveryDate);
    const daysUntil = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    this.daysUntilDelivery = daysUntil;
    
    // Rush order logic
    if (daysUntil < 7) {
      this.isRushOrder = true;
      this.rushMultiplier = 1.4; // +40%
    } else if (daysUntil < 14) {
      this.isRushOrder = true;
      this.rushMultiplier = 1.2; // +20%
    } else {
      this.isRushOrder = false;
      this.rushMultiplier = 1.0;
    }
  }
  
  // Calculate deposit (30% of total)
  if (this.isModified('totalPrice')) {
    this.depositAmount = Math.round(this.totalPrice * 0.3);
  }
});


const Order = mongoose.model<IOrder>("Order", orderSchema);

export default Order;
