import mongoose from "mongoose";
import type { IRevision } from "./types.js";
/**
 * Revision Model - Measurement History & Audit Trail
 * Tracks all measurement changes throughout the order lifecycle
 */
const RevisionSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', 
    required: true,
    index: true
  },
  // ========== Measurement Snapshot ==========
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
  
  // ========== Visual Elements ==========
  inspirationFileId: {
    type: String,
    required: false
  }, // Telegram File ID
  inspirationPublicId: {
    type: String,
    required: false
  }, // Cloudinary Public ID
  inspirationPhoto: {
    type: String,
    required: false
  }, // Cloudinary URL
  bodyConcerns: {
    type: String,
    default: ""
  },
  colorPreference: {
    type: String,
    default: ""
  },
  
  // ========== Revision Tracking ==========
  revisionNumber: {
    type: Number,
    required: true,
    default: 0 // 0 = original submission, 1 = first revision
  },
  isFree: {
    type: Boolean, 
    default: true 
  },
  revisionReason: {
    type: String,
    default: ""
  },
  
  // ========== Status & Payment ==========
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'applied'],
    default: 'pending'
  },
  revisionFee: {
    type: Number,
    default: 0
  },
  revisionFeePaid: {
    type: Boolean,
    default: false
  },
  
  // ========== Admin Actions ==========
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: {
    type: Date
  },
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

// ========== Indexes ==========
RevisionSchema.index({ orderId: 1, revisionNumber: 1 });
RevisionSchema.index({ status: 1 });

// ========== Pre-save Hook: Enforce Free Revision Logic ==========
RevisionSchema.pre('save', async function() {
  if (this.isNew) {
    // Check if this is the first revision (free) or paid
    const Order = mongoose.model('Order');
    const order = await Order.findById(this.orderId);
    
    if (order) {
      this.revisionNumber = order.revisionCount;
      
      // First revision is free
      if (order.revisionCount === 0) {
        this.isFree = true;
        this.revisionFee = 0;
      } else {
        this.isFree = false;
        // Revision fee logic can be added here
      }
    }
  }
});

const Revision = mongoose.model<IRevision>('Revision', RevisionSchema);
export default Revision;