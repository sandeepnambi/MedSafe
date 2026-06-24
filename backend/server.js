import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Import local database controllers
import { connectDB, getModel, getDBType } from './config/db.js';
import './models/Schemas.js'; // Ensure models are registered on Mongoose

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'medsafe_ultra_secure_secret_key_2026';

// Middleware
app.use(cors());
app.use(express.json());

// Helper for JWT authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access Token Required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or Expired Token' });
    req.user = user;
    next();
  });
};

// Check if user has specific role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized Access: Insufficient Privileges' });
    }
    next();
  };
};

// Write an audit log
const logAuditAction = async (actorId, actorName, actorRole, action, targetId, details) => {
  try {
    const AuditLog = getModel('AuditLog');
    await AuditLog.create({
      actorId,
      actorName,
      actorRole,
      action,
      targetId,
      details,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Audit Log writing failed:', error);
  }
};

// Calculate dynamic trust score based on warnings, pending disputes, and inventory sync status
const calculateDynamicTrustScore = async (store) => {
  const Complaint = getModel('Complaint');
  const Inventory = getModel('Inventory');

  let score = 100;

  // Warning Points: Each warning deducts 20 points
  score -= (store.warningsCount || 0) * 20;

  // Active/Pending Disputes: Each active pending dispute deducts 10 points
  const pendingCount = await Complaint.countDocuments({
    pharmacyId: String(store._id),
    status: 'Pending'
  });
  score -= pendingCount * 10;

  // Inventory Sync Compliance:
  // If store is Approved & Verified, it must have active products.
  // If it has 0 items synced, deduct 15 points.
  // If it has > 0 and < 5 items, deduct 5 points.
  if (store.status === 'Approved & Verified' || store.isLaunched) {
    const inventoryCount = await Inventory.countDocuments({
      pharmacyId: String(store._id)
    });
    if (inventoryCount === 0) {
      score -= 15;
    } else if (inventoryCount < 5) {
      score -= 5;
    }
  }

  return Math.max(0, Math.min(100, score));
};

const enrichPharmacyWithDynamicFields = async (store) => {
  if (!store) return null;
  const storeObj = store.toObject ? store.toObject() : store;
  storeObj.trustScore = await calculateDynamicTrustScore(storeObj);
  return storeObj;
};

const enrichPharmacyList = async (list) => {
  if (!list || !Array.isArray(list)) return [];
  return await Promise.all(list.map(store => enrichPharmacyWithDynamicFields(store)));
};

// ----------------- Auth API -----------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const User = getModel('User');

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'customer'
    });

    await logAuditAction(newUser._id, newUser.name, newUser.role, 'USER_REGISTERED', newUser._id, `New ${newUser.role} registered: ${newUser.email}`);

    res.status(201).json({ message: 'User registered successfully!', userId: newUser._id });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const User = getModel('User');

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const User = getModel('User');
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Profile retrieval failed', error: error.message });
  }
});

app.post('/api/auth/profile/update', authenticateToken, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const User = getModel('User');

    // Find active user
    const userObj = await User.findById(req.user.id);
    if (!userObj) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if new email is already taken by another user
    if (email && email !== userObj.email) {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ message: 'Email address is already in use by another account' });
      }
      userObj.email = email;
    }

    if (name) {
      userObj.name = name;
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      userObj.password = hashedPassword;
    }

    await userObj.save();

    // Generate a fresh JWT with updated info
    const token = jwt.sign(
      { id: userObj._id, name: userObj.name, email: userObj.email, role: userObj.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logAuditAction(
      userObj._id,
      userObj.name,
      userObj.role,
      'USER_PROFILE_UPDATED',
      userObj._id,
      `User profile updated: ${userObj.email}`
    );

    res.status(200).json({
      message: 'Profile updated successfully!',
      user: {
        id: userObj._id,
        name: userObj.name,
        email: userObj.email,
        role: userObj.role
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Profile update failed', error: error.message });
  }
});

// ----------------- Pharmacy Profile API -----------------

// Create Pharmacy profile (Step 1 Onboarding)
app.post('/api/pharmacies', authenticateToken, requireRole(['pharmacy']), async (req, res) => {
  try {
    const { name, ownerName, address, contact, drugLicense, gstNumber, billingSoftware, storeTimings } = req.body;
    const Pharmacy = getModel('Pharmacy');

    // Check if store already registered for this owner
    const existing = await Pharmacy.findOne({ ownerId: req.user.id });
    if (existing) {
      return res.status(400).json({ message: 'You have already registered a pharmacy profile' });
    }

    const newPharmacy = await Pharmacy.create({
      name,
      ownerName,
      ownerId: req.user.id,
      address,
      contact,
      drugLicense,
      gstNumber,
      billingSoftware: billingSoftware || 'None',
      status: 'Pending Verification Request',
      certifications: ['GST_CERTIFICATE_UPLOADED', 'DRUG_LICENSE_UPLOADED'],
      storeImages: ['https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=800&q=80'],
      storeTimings: storeTimings || '9 AM - 9 PM',
      trustScore: 100
    });

    await logAuditAction(req.user.id, req.user.name, req.user.role, 'PHARMACY_REGISTERED', newPharmacy._id, `Pharmacy registered: ${newPharmacy.name}`);

    res.status(201).json(newPharmacy);
  } catch (error) {
    res.status(500).json({ message: 'Pharmacy profile creation failed', error: error.message });
  }
});

app.get('/api/pharmacies/my-store', authenticateToken, requireRole(['pharmacy']), async (req, res) => {
  try {
    const Pharmacy = getModel('Pharmacy');
    const store = await Pharmacy.findOne({ ownerId: req.user.id });
    if (!store) return res.status(404).json({ message: 'No store found for this user.' });
    res.json(await enrichPharmacyWithDynamicFields(store));
  } catch (error) {
    res.status(500).json({ message: 'Retrieval failed', error: error.message });
  }
});

app.get('/api/medicines', authenticateToken, async (req, res) => {
  try {
    const Medicine = getModel('Medicine');
    const list = await Medicine.find({});
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch medicines', error: error.message });
  }
});

app.post('/api/pharmacies/launch', authenticateToken, requireRole(['pharmacy']), async (req, res) => {
  try {
    const Pharmacy = getModel('Pharmacy');
    const store = await Pharmacy.findOne({ ownerId: req.user.id });
    if (!store) return res.status(404).json({ message: 'Store not found.' });
    if (store.status !== 'Approved & Verified') {
      return res.status(400).json({ message: 'Only approved and verified stores can be launched.' });
    }
    store.isLaunched = true;
    await store.save();

    await logAuditAction(req.user.id, req.user.name, req.user.role, 'STORE_LAUNCHED', store._id, `Store launched live: ${store.name}`);
    res.json(await enrichPharmacyWithDynamicFields(store));
  } catch (error) {
    res.status(500).json({ message: 'Launch failed', error: error.message });
  }
});

// Request Onboarding Setup visit (Step 2 Onboarding)
app.post('/api/pharmacies/request-verification', authenticateToken, requireRole(['pharmacy']), async (req, res) => {
  try {
    const { preferredVisitDate, storeTimings, barcodeSystemAvailable, billingSoftwareAvailable, setupAssistanceRequirements } = req.body;
    const Pharmacy = getModel('Pharmacy');

    const store = await Pharmacy.findOne({ ownerId: req.user.id });
    if (!store) return res.status(404).json({ message: 'Pharmacy profile not found. Register first.' });

    const updated = await Pharmacy.findByIdAndUpdate(store._id, {
      $set: {
        status: 'Verification Requested',
        preferredVisitDate,
        storeTimings,
        barcodeSystemAvailable: !!barcodeSystemAvailable,
        billingSoftwareAvailable: !!billingSoftwareAvailable,
        setupAssistanceRequirements: setupAssistanceRequirements || 'None'
      }
    }, { new: true });

    await logAuditAction(req.user.id, req.user.name, req.user.role, 'VERIFICATION_REQUESTED', store._id, `Requested executive setup for: ${store.name}`);

    res.json(await enrichPharmacyWithDynamicFields(updated));
  } catch (error) {
    res.status(500).json({ message: 'Verification request failed', error: error.message });
  }
});

// ----------------- Medicine & Inventory API -----------------

// Get inventory list of specific pharmacy
app.get('/api/pharmacies/inventory', authenticateToken, async (req, res) => {
  try {
    const { pharmacyId } = req.query;
    const Inventory = getModel('Inventory');
    const list = await Inventory.find({ pharmacyId });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Inventory fetch failed', error: error.message });
  }
});

// Manage Inventory (CRUD)
app.post('/api/pharmacies/inventory/manage', authenticateToken, requireRole(['pharmacy', 'executive']), async (req, res) => {
  try {
    const { pharmacyId, medicineId, medicineName, price, stock, isAvailable } = req.body;
    const Inventory = getModel('Inventory');

    // Validate that the request matches ownership
    if (req.user.role === 'pharmacy') {
      const Pharmacy = getModel('Pharmacy');
      const store = await Pharmacy.findOne({ ownerId: req.user.id });
      if (!store || store._id.toString() !== pharmacyId.toString()) {
        return res.status(403).json({ message: 'Forbidden: You do not own this pharmacy' });
      }
    }

    // Check if item already exists in this pharmacy inventory
    const existing = await Inventory.findOne({
      pharmacyId: String(pharmacyId),
      medicineId: String(medicineId)
    });

    let result;
    if (existing) {
      result = await Inventory.findByIdAndUpdate(existing._id, {
        $set: { price: Number(price), stock: Number(stock), isAvailable: !!isAvailable }
      }, { new: true });
    } else {
      result = await Inventory.create({
        pharmacyId: String(pharmacyId),
        medicineId: String(medicineId),
        medicineName,
        price: Number(price),
        stock: Number(stock),
        isAvailable: isAvailable !== undefined ? !!isAvailable : true
      });
    }

    // Update inventory update timestamp on the pharmacy to dynamically raise trust scores
    const Pharmacy = getModel('Pharmacy');
    await Pharmacy.findByIdAndUpdate(pharmacyId, {
      $set: { inventoryUpdateFrequency: 'Daily' }
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Inventory update failed', error: error.message });
  }
});

// Import inventory from local billing software (technical sync simulation)
app.post('/api/pharmacies/inventory/sync-billing', authenticateToken, requireRole(['pharmacy', 'executive']), async (req, res) => {
  try {
    const { pharmacyId, billingSystem } = req.body;
    const Pharmacy = getModel('Pharmacy');
    const Inventory = getModel('Inventory');
    const Medicine = getModel('Medicine');

    const store = await Pharmacy.findById(pharmacyId);
    if (!store) return res.status(404).json({ message: 'Pharmacy not found' });

    // Fetch all global medicines to populate mock stock
    const medicinesList = await Medicine.find({});

    // Bulk create/update mock syncing from Excel/XML billing file
    const syncedItems = [];
    for (const med of medicinesList) {
      const randomStock = Math.floor(Math.random() * 80) + 10;
      const basePrice = Math.floor(Math.random() * 100) + 20;

      const existing = await Inventory.findOne({
        pharmacyId: String(pharmacyId),
        medicineId: String(med._id)
      });
      let item;
      if (existing) {
        item = await Inventory.findByIdAndUpdate(existing._id, {
          $set: { stock: randomStock, price: basePrice, isAvailable: true }
        });
      } else {
        item = await Inventory.create({
          pharmacyId: String(pharmacyId),
          medicineId: String(med._id),
          medicineName: med.name,
          price: basePrice,
          stock: randomStock,
          isAvailable: true
        });
      }
      syncedItems.push(item);
    }

    await Pharmacy.findByIdAndUpdate(pharmacyId, {
      $set: {
        inventoryUpdateFrequency: 'Real-time Integrator',
        billingSoftware: billingSystem || 'MedSafe-Link v2'
      }
    });

    await logAuditAction(req.user.id, req.user.name, req.user.role, 'BILLING_SOFTWARE_SYNCED', pharmacyId, `Real-time billing software synced: ${billingSystem}`);

    res.json({ message: 'Successfully synced billing system!', count: syncedItems.length });
  } catch (error) {
    res.status(500).json({ message: 'Billing software sync failed', error: error.message });
  }
});

// ----------------- Verification Executive API -----------------

// List assignments
app.get('/api/executive/assignments', authenticateToken, requireRole(['executive', 'admin']), async (req, res) => {
  try {
    const Pharmacy = getModel('Pharmacy');
    // Filter by assigned executive ID or return all in-progress if admin
    const filter = req.user.role === 'admin' ? { status: 'Verification In Progress' } : { assignedExecutiveId: req.user.id };
    const list = await Pharmacy.find(filter);
    res.json(await enrichPharmacyList(list));
  } catch (error) {
    res.status(500).json({ message: 'Assignments retrieval failed', error: error.message });
  }
});

// Submit Physical Onboarding Checklist & Report (Step 5 Onboarding)
app.post('/api/executive/submit-report', authenticateToken, requireRole(['executive']), async (req, res) => {
  try {
    const { pharmacyId, certificationStatus, medicineQualityStatus, inventorySetupStatus, complianceNotes, riskFlags, recommendation } = req.body;

    const Pharmacy = getModel('Pharmacy');
    const VerificationReport = getModel('VerificationReport');

    const store = await Pharmacy.findById(pharmacyId);
    if (!store) return res.status(404).json({ message: 'Pharmacy not found' });

    // Create detailed verification report
    const newReport = await VerificationReport.create({
      pharmacyId,
      executiveId: req.user.id,
      executiveName: req.user.name,
      certificationStatus: certificationStatus || 'Pass',
      medicineQualityStatus: medicineQualityStatus || 'Pass',
      inventorySetupStatus: inventorySetupStatus || 'Completed',
      complianceNotes: complianceNotes || '',
      riskFlags: riskFlags || [],
      images: ['https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80'],
      recommendation: recommendation || 'Approved'
    });

    // Update Pharmacy status to Under Admin Review
    const updatedPharmacy = await Pharmacy.findByIdAndUpdate(pharmacyId, {
      $set: { status: 'Under Admin Review' }
    }, { new: true });

    await logAuditAction(req.user.id, req.user.name, req.user.role, 'REPORT_SUBMITTED', pharmacyId, `Physical inspection report submitted: Recommendation: ${recommendation}`);

    res.status(201).json({ report: newReport, pharmacy: updatedPharmacy });
  } catch (error) {
    res.status(500).json({ message: 'Report submission failed', error: error.message });
  }
});

// List reports submitted by the logged-in executive
app.get('/api/executive/reports', authenticateToken, requireRole(['executive']), async (req, res) => {
  try {
    const VerificationReport = getModel('VerificationReport');
    const list = await VerificationReport.find({ executiveId: req.user.id });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Reports retrieval failed', error: error.message });
  }
});

// ----------------- Admin Console API -----------------

// List all stores
app.get('/api/admin/pharmacies', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const Pharmacy = getModel('Pharmacy');
    const list = await Pharmacy.find({});
    res.json(await enrichPharmacyList(list));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pharmacies', error: error.message });
  }
});

// List all verification executives/inspectors
app.get('/api/admin/executives', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const User = getModel('User');
    const list = await User.find({ role: 'executive' }, '_id name email');
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch executives', error: error.message });
  }
});

// List all registered platform users
app.get('/api/admin/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const User = getModel('User');
    const list = await User.find({}, '_id name email role createdAt');
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

// Assign Verification Executive (Step 3 Onboarding)
app.post('/api/admin/assign-executive', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { pharmacyId, executiveId, visitDate } = req.body;
    const Pharmacy = getModel('Pharmacy');
    const User = getModel('User');

    const execUser = await User.findById(executiveId);
    if (!execUser || execUser.role !== 'executive') {
      return res.status(400).json({ message: 'Valid Verification Executive account required' });
    }

    const updated = await Pharmacy.findByIdAndUpdate(pharmacyId, {
      $set: {
        status: 'Executive Assigned',
        assignedExecutiveId: executiveId,
        assignedExecutiveName: execUser.name,
        visitScheduleDate: visitDate || new Date().toISOString().split('T')[0]
      }
    }, { new: true });

    await logAuditAction(req.user.id, req.user.name, req.user.role, 'EXECUTIVE_ASSIGNED', pharmacyId, `Assigned Verification Executive ${execUser.name} to visit on ${visitDate}`);

    res.json(await enrichPharmacyWithDynamicFields(updated));
  } catch (error) {
    res.status(500).json({ message: 'Assignment failed', error: error.message });
  }
});

// Review and Approve Pharmacy (Step 6 Onboarding - Final Approval)
app.post('/api/admin/approve-pharmacy', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { pharmacyId, decision, comments } = req.body; // decision: 'approve', 'correct', 'reject'
    const Pharmacy = getModel('Pharmacy');

    let targetStatus;
    if (decision === 'approve') targetStatus = 'Approved & Verified';
    else if (decision === 'correct') targetStatus = 'Needs Corrections';
    else targetStatus = 'Rejected';

    const updated = await Pharmacy.findByIdAndUpdate(pharmacyId, {
      $set: {
        status: targetStatus,
        adminComments: comments || 'None',
        // Start trust score high on approval
        trustScore: decision === 'approve' ? 100 : 50
      }
    }, { new: true });

    await logAuditAction(req.user.id, req.user.name, req.user.role, 'PHARMACY_STATUS_DECISION', pharmacyId, `Pharmacy ${updated.name} decision: ${targetStatus}. Comments: ${comments || 'None'}`);

    res.json(await enrichPharmacyWithDynamicFields(updated));
  } catch (error) {
    res.status(500).json({ message: 'Approval review process failed', error: error.message });
  }
});

// Fetch Audit Logs
app.get('/api/admin/logs', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const AuditLog = getModel('AuditLog');
    const logs = await AuditLog.find({});
    // Return logs ordered newest first
    res.json(logs.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Logs fetch failed', error: error.message });
  }
});

// Fetch Verification Reports
app.get('/api/admin/reports', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const VerificationReport = getModel('VerificationReport');
    const reports = await VerificationReport.find({});
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Verification reports fetch failed', error: error.message });
  }
});

// Fetch All Complaints (Admin Hub)
app.get('/api/admin/complaints', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const Complaint = getModel('Complaint');
    const list = await Complaint.find({});
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Complaints fetch failed', error: error.message });
  }
});

// Adjudicate Complaint (Anti-Fraud Penalty System)
app.post('/api/admin/complaints/adjudicate', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { complaintId, action } = req.body; // action: 'penalize', 'dismiss'
    const Complaint = getModel('Complaint');
    const Pharmacy = getModel('Pharmacy');

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    if (!complaint.responseFromPharmacy) {
      return res.status(400).json({ message: 'Cannot adjudicate complaint before store owner has submitted a response/appeal' });
    }

    if (action === 'penalize') {
      const store = await Pharmacy.findById(complaint.pharmacyId);
      if (!store) return res.status(404).json({ message: 'Associated pharmacy not found' });

      const newWarningsCount = (store.warningsCount || 0) + 1;
      let newTrustScore = store.trustScore - 20; // Reduce trust score by 20 points
      if (newTrustScore < 0) newTrustScore = 0;

      let nextStatus = store.status;

      // Strict Fraud Policy Workflow:
      // 1st warning -> Issue warning warning alert
      // 2nd warning -> Trust rating penalty drop
      // 3rd warning -> Platform suspension
      if (newWarningsCount >= 3) {
        nextStatus = 'Suspended';
      }

      const updatedStore = await Pharmacy.findByIdAndUpdate(complaint.pharmacyId, {
        $set: {
          warningsCount: newWarningsCount,
          trustScore: newTrustScore,
          status: nextStatus
        }
      }, { new: true });

      await Complaint.findByIdAndUpdate(complaintId, {
        $set: { status: 'Resolved', penaltyApplied: true }
      });

      await logAuditAction(req.user.id, req.user.name, req.user.role, 'FRAUD_PENALTY_APPLIED', store._id, `Complaint penalized. Warning #${newWarningsCount} issued. Trust Score drops to ${newTrustScore}. Pharmacy Status: ${nextStatus}`);

      return res.json({ message: 'Pharmacy penalized successfully', pharmacy: updatedStore });
    } else {
      // Dismiss complaint
      await Complaint.findByIdAndUpdate(complaintId, { $set: { status: 'Dismissed' } });

      await logAuditAction(req.user.id, req.user.name, req.user.role, 'COMPLAINT_DISMISSED', complaint.pharmacyId, `Complaint dismissed by Admin`);

      return res.json({ message: 'Complaint dismissed successfully' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Adjudication failed', error: error.message });
  }
});

// Fetch complaints/disputes against own pharmacy
app.get('/api/pharmacies/my-complaints', authenticateToken, requireRole(['pharmacy']), async (req, res) => {
  try {
    const Pharmacy = getModel('Pharmacy');
    const Complaint = getModel('Complaint');
    const store = await Pharmacy.findOne({ ownerId: req.user.id });
    if (!store) return res.status(404).json({ message: 'Pharmacy store not found' });
    const list = await Complaint.find({ pharmacyId: String(store._id) });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch complaints', error: error.message });
  }
});

// ----------------- Pharmacy Respond Complaint API -----------------
app.post('/api/pharmacies/respond-complaint', authenticateToken, requireRole(['pharmacy']), async (req, res) => {
  try {
    const { complaintId, response } = req.body;
    const Complaint = getModel('Complaint');

    const updated = await Complaint.findByIdAndUpdate(complaintId, {
      $set: { responseFromPharmacy: response }
    }, { new: true });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit response', error: error.message });
  }
});

// ----------------- Customer Pharmacy API -----------------

// List all approved & verified pharmacies
app.get('/api/customer/pharmacies', authenticateToken, requireRole(['customer', 'admin']), async (req, res) => {
  try {
    const Pharmacy = getModel('Pharmacy');
    const list = await Pharmacy.find({ status: 'Approved & Verified' });
    res.json(await enrichPharmacyList(list));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pharmacies', error: error.message });
  }
});

// List all medicines stocked in at least one verified & launched pharmacy with stock >= 1
app.get('/api/customer/medicines', authenticateToken, requireRole(['customer', 'admin']), async (req, res) => {
  try {
    const Pharmacy = getModel('Pharmacy');
    const Inventory = getModel('Inventory');
    const Medicine = getModel('Medicine');

    // 1. Get all verified & launched store IDs
    const activeStores = await Pharmacy.find({ status: 'Approved & Verified', isLaunched: true });
    const activeStoreIds = activeStores.map(s => s._id.toString());

    // 2. Find matching inventory listings with stock >= 1
    const inventoryListings = await Inventory.find({
      pharmacyId: { $in: activeStoreIds },
      stock: { $gt: 0 },
      isAvailable: true
    });

    // 3. Get unique medicine IDs from those inventory listings
    const stockedMedIds = [...new Set(inventoryListings.map(l => l.medicineId.toString()))];

    // 4. Fetch the medicines matching those IDs
    const list = await Medicine.find({ _id: { $in: stockedMedIds } });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch customer medicines', error: error.message });
  }
});

// Geolocation-Based & Price-Comparing Search (Customer Feature)
app.get('/api/customer/search', async (req, res) => {
  try {
    const { query, medicineId } = req.query; // search drug name, compositions, etc., or specific medicine ID
    const Pharmacy = getModel('Pharmacy');
    const Inventory = getModel('Inventory');
    const Medicine = getModel('Medicine');

    // 1. Find matching medicines (either by direct medicineId or name query)
    let medicineQuery = {};
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(medicineId || '');

    if (medicineId && isValidObjectId) {
      medicineQuery = { _id: medicineId };
    } else if (query) {
      medicineQuery = {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { genericName: { $regex: query, $options: 'i' } },
          { saltComposition: { $regex: query, $options: 'i' } },
          { category: { $regex: query, $options: 'i' } }
        ]
      };
    } else {
      return res.json([]);
    }

    const matchedMeds = await Medicine.find(medicineQuery);
    const matchedMedIds = matchedMeds.map(med => med._id.toString());

    // 2. Fetch matching stock listings inside any pharmacy
    const inventoryListings = await Inventory.find({
      medicineId: { $in: matchedMedIds },
      isAvailable: true
    });

    if (inventoryListings.length === 0) {
      return res.json([]);
    }

    // 3. Deduplicate inventory listings by (pharmacyId + medicineId), keeping the lowest price
    const uniqueListingsMap = {};
    for (const listing of inventoryListings) {
      const key = `${listing.pharmacyId}_${listing.medicineId}`;
      if (!uniqueListingsMap[key] || listing.price < uniqueListingsMap[key].price) {
        uniqueListingsMap[key] = listing;
      }
    }
    const filteredListings = Object.values(uniqueListingsMap);

    // 4. Extract unique pharmacy IDs from matching filtered listings
    const candidatePharmacyIds = [...new Set(filteredListings.map(l => l.pharmacyId))];

    // 5. Fetch and enrich ONLY the verified & launched pharmacies that actually have the stock
    const verifiedStoresRaw = await Pharmacy.find({
      _id: { $in: candidatePharmacyIds },
      status: 'Approved & Verified',
      isLaunched: true
    });
    const verifiedStores = await enrichPharmacyList(verifiedStoresRaw);
    const verifiedStoreMap = {};
    verifiedStores.forEach(store => {
      verifiedStoreMap[store._id.toString()] = store;
    });

    // 6. Compile comparisons, filtering out any listing where the pharmacy is not verified/launched
    const results = [];
    for (const listing of filteredListings) {
      const store = verifiedStoreMap[listing.pharmacyId.toString()];
      if (!store) continue; // Skip if pharmacy is not verified or is not launched

      const med = matchedMeds.find(m => m._id.toString() === listing.medicineId.toString());

      results.push({
        _id: listing._id,
        price: listing.price,
        stock: listing.stock,
        medicine: med,
        pharmacy: {
          _id: store._id,
          name: store.name,
          address: store.address,
          contact: store.contact,
          trustScore: store.trustScore,
          warningsCount: store.warningsCount,
          inventoryUpdateFrequency: store.inventoryUpdateFrequency
        }
      });
    }

    // 7. Order by price ascending
    results.sort((a, b) => a.price - b.price);

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Search failed', error: error.message });
  }
});

// AI Medicine Alternative & Demand Prediction Engine
app.get('/api/customer/recommendations', async (req, res) => {
  try {
    const { query } = req.query;
    const Medicine = getModel('Medicine');

    const match = await Medicine.findOne({ name: { $regex: query || 'Paracetamol', $options: 'i' } });
    if (!match) return res.json({ alternatives: [], demandForecast: 'Stable' });

    // Fetch other generic medicines in same category
    const alternatives = await Medicine.find({
      category: match.category,
      _id: { $ne: match._id }
    });

    // Smart Analytics Demand prediction
    const seasons = {
      Painkiller: 'Elevated during sports seasons, stable baseline.',
      Antibiotic: 'High demand during weather change (monsoon/winter).',
      Antihyperglycemic: 'Chronic essential - highly predictable and constant.',
      Statin: 'Chronic cardiovascular - high demand curve.',
      Antihistamine: 'Spikes strongly during spring allergy months.'
    };

    res.json({
      targetMedicine: match,
      alternatives,
      demandForecast: seasons[match.category] || 'Moderate, stable seasonal fluctuation.',
      alternativePriceSavings: 'Save up to 45% by opting for generic alternative salts.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Fetch recommendations failed', error: error.message });
  }
});

// OCR Price Matching & Dispute Logging
app.post('/api/customer/lodge-complaint', authenticateToken, requireRole(['customer']), async (req, res) => {
  try {
    const { pharmacyId, type, description, mockInvoiceText, disputeImage } = req.body;
    const Pharmacy = getModel('Pharmacy');
    const Complaint = getModel('Complaint');
    const Inventory = getModel('Inventory');

    const store = await Pharmacy.findById(pharmacyId);
    if (!store) return res.status(404).json({ message: 'Pharmacy not found' });

    // Simulated Google Cloud Vision OCR Processing
    let ocrPriceAlert = false;
    let priceMismatchDetails = '';

    if (type === 'Price Mismatch' && mockInvoiceText) {
      // Find numbers in simulated receipt
      const match = mockInvoiceText.match(/price[:\s]*(\d+)/i);
      const parsedPrice = match ? Number(match[1]) : 0;

      // Fetch inventory price
      const listings = await Inventory.find({ pharmacyId });
      if (listings.length > 0 && parsedPrice > 0) {
        const averagePrice = listings[0].price;
        // If parsed invoice price is greater than our record price by over 5% -> Flags Fraud!
        if (parsedPrice > averagePrice * 1.05) {
          ocrPriceAlert = true;
          priceMismatchDetails = `OCR Bill scanning flagged price inflation! Customer paid $${parsedPrice} vs Listed database price of $${averagePrice}.`;
        }
      }
    }

    const complaint = await Complaint.create({
      pharmacyId,
      pharmacyName: store.name,
      customerId: req.user.id,
      customerName: req.user.name,
      type,
      description,
      billImage: mockInvoiceText || '',
      disputeImage: disputeImage || '',
      status: 'Pending'
    });

    await logAuditAction(req.user.id, req.user.name, req.user.role, 'COMPLAINT_LODGED', pharmacyId, `Complaint lodged (${type}). OCR Flagged: ${ocrPriceAlert}`);

    res.status(201).json({ complaint, ocrPriceAlert });
  } catch (error) {
    res.status(500).json({ message: 'Complaint logging failed', error: error.message });
  }
});

// Real Cloudinary Upload & OCR Space Parser Endpoint
app.post('/api/ocr/parse', authenticateToken, async (req, res) => {
  try {
    const { disputeImage } = req.body;
    if (!disputeImage) {
      return res.status(400).json({ message: 'No image data provided' });
    }

    // Upload base64 image data to Cloudinary
    const uploadRes = await cloudinary.uploader.upload(disputeImage, {
      folder: 'medsafe_receipts',
    });

    const imageUrl = uploadRes.secure_url;

    // Call OCR Space API
    const apiKey = process.env.OCR_SPACE_API_KEY || 'K84447493388957';
    
    const ocrParams = new URLSearchParams();
    ocrParams.append('apikey', apiKey);
    ocrParams.append('url', imageUrl);
    ocrParams.append('language', 'eng');
    ocrParams.append('isOverlayRequired', 'false');

    const ocrRes = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: ocrParams.toString(),
    });

    if (!ocrRes.ok) {
      throw new Error(`OCR Space API returned status ${ocrRes.status}`);
    }

    const ocrData = await ocrRes.json();
    
    let parsedText = '';
    if (ocrData.ParsedResults && ocrData.ParsedResults.length > 0) {
      parsedText = ocrData.ParsedResults[0].ParsedText;
    } else {
      parsedText = ocrData.ErrorMessage || 'No text could be parsed from the image.';
    }

    res.status(200).json({
      imageUrl,
      parsedText,
    });
  } catch (error) {
    console.error('OCR Parsing endpoint error:', error);
    res.status(500).json({ message: 'OCR parsing failed', error: error.message });
  }
});

// Secure customer complaints retrieval
app.get('/api/customer/my-complaints', authenticateToken, requireRole(['customer']), async (req, res) => {
  try {
    const Complaint = getModel('Complaint');
    const list = await Complaint.find({ customerId: req.user.id });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Complaints fetch failed', error: error.message });
  }
});

// Seed data route helper (disabled)
app.post('/api/admin/seed', async (req, res) => {
  res.status(403).json({ message: 'Database seeding has been permanently disabled to protect manual data.' });
});

// Global health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Healthy',
    service: 'MedSafe Backend API',
    databaseType: getDBType(),
    time: new Date()
  });
});

// ----------------- Database Seeding Engine (Removed) -----------------

// Initiate database connection
connectDB().then(async () => {
  console.log('💚 Database connection initialized. Seeding logic has been disabled.');
});

// Start Express Listener
app.listen(PORT, () => {
  console.log(`🚀 MedSafe API Server running on port ${PORT}`);
  console.log(`🚀 Database System Mode: [${getDBType()}]`);
});
