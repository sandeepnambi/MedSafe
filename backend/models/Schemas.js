import mongoose from 'mongoose';

const { Schema } = mongoose;

// 1. User Schema
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['customer', 'pharmacy', 'executive', 'admin'], 
    default: 'customer' 
  }
}, { timestamps: true });

// 2. Pharmacy Schema
const PharmacySchema = new Schema({
  name: { type: String, required: true },
  ownerName: { type: String, required: true },
  ownerId: { type: String, required: true },
  address: { type: String, required: true },
  contact: { type: String, required: true },
  drugLicense: { type: String, required: true },
  gstNumber: { type: String, required: true },
  certifications: [String],
  storeImages: [String],
  billingSoftware: { type: String, default: 'None' },
  status: {
    type: String,
    enum: [
      'Pending Registration',
      'Pending Verification Request',
      'Verification Requested',
      'Executive Assigned',
      'Verification In Progress',
      'Setup In Progress',
      'Under Admin Review',
      'Approved & Verified',
      'Needs Corrections',
      'Rejected',
      'Suspended'
    ],
    default: 'Pending Verification Request'
  },
  // Verification Schedule
  preferredVisitDate: { type: String },
  storeTimings: { type: String },
  barcodeSystemAvailable: { type: Boolean, default: false },
  billingSoftwareAvailable: { type: Boolean, default: false },
  debitCreditAvailable: { type: Boolean, default: false },
  setupAssistanceRequirements: { type: String },
  adminComments: { type: String, default: '' },
  
  // Executive assignment
  assignedExecutiveId: { type: String, default: null },
  assignedExecutiveName: { type: String, default: null },
  visitScheduleDate: { type: String, default: null },

  isLaunched: { type: Boolean, default: false },

  // Trust System
  trustScore: { type: Number, default: 100 },
  warningsCount: { type: Number, default: 0 },
  inventoryUpdateFrequency: { type: String, default: 'Never' },
  priceAccuracy: { type: Number, default: 100 }
}, { timestamps: true });

// 3. Medicine & Inventory Schema
const MedicineSchema = new Schema({
  name: { type: String, required: true },
  brandName: { type: String },
  genericName: { type: String },
  saltComposition: { type: String },
  category: { type: String },
  barcode: { type: String },
  alternatives: [String]
}, { timestamps: true });

// Inventory sub-schema or collection for actual stock entries
const InventorySchema = new Schema({
  pharmacyId: { type: String, required: true },
  medicineId: { type: String, required: true },
  medicineName: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

// 4. Verification Report Schema
const VerificationReportSchema = new Schema({
  pharmacyId: { type: String, required: true },
  executiveId: { type: String, required: true },
  executiveName: { type: String },
  certificationStatus: { type: String, enum: ['Pass', 'Fail'], default: 'Pass' },
  medicineQualityStatus: { type: String, enum: ['Pass', 'Fail'], default: 'Pass' },
  inventorySetupStatus: { type: String, enum: ['Completed', 'Pending'], default: 'Completed' },
  complianceNotes: { type: String },
  riskFlags: [String],
  images: [String],
  recommendation: { type: String, enum: ['Approved', 'Needs Corrections', 'Rejected'], default: 'Approved' }
}, { timestamps: true });

// 5. Complaint Schema
const ComplaintSchema = new Schema({
  pharmacyId: { type: String, required: true },
  pharmacyName: { type: String, required: true },
  customerId: { type: String, required: true },
  customerName: { type: String, required: true },
  type: { type: String, enum: ['Price Mismatch', 'Fake Medicine', 'Other'], required: true },
  description: { type: String, required: true },
  billImage: { type: String },
  disputeImage: { type: String },
  status: { type: String, enum: ['Pending', 'Resolved', 'Dismissed'], default: 'Pending' },
  responseFromPharmacy: { type: String, default: '' },
  penaltyApplied: { type: Boolean, default: false }
}, { timestamps: true });

// 6. Audit Log Schema
const AuditLogSchema = new Schema({
  actorId: { type: String, required: true },
  actorName: { type: String, required: true },
  actorRole: { type: String, required: true },
  action: { type: String, required: true },
  targetId: { type: String },
  details: { type: String },
  timestamp: { type: Date, default: Date.now }
});

// 7. Notification Schema
const NotificationSchema = new Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false }
}, { timestamps: true });

// Register models on mongoose if not already registered
const registerModels = () => {
  if (mongoose.models.User) return;
  mongoose.model('User', UserSchema);
  mongoose.model('Pharmacy', PharmacySchema);
  mongoose.model('Medicine', MedicineSchema);
  mongoose.model('Inventory', InventorySchema);
  mongoose.model('VerificationReport', VerificationReportSchema);
  mongoose.model('Complaint', ComplaintSchema);
  mongoose.model('AuditLog', AuditLogSchema);
  mongoose.model('Notification', NotificationSchema);
};

try {
  registerModels();
} catch (e) {
  // Silent catch for dev server reloading issues
}
