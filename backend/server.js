import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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
    res.json(store);
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
    res.json(store);
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

    res.json(updated);
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
    res.json(list);
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
    res.json(list);
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

    res.json(updated);
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

    res.json(updated);
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
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pharmacies', error: error.message });
  }
});

// Geolocation-Based & Price-Comparing Search (Customer Feature)
app.get('/api/customer/search', async (req, res) => {
  try {
    const { query } = req.query; // search drug name, compositions, etc.
    const Pharmacy = getModel('Pharmacy');
    const Inventory = getModel('Inventory');
    const Medicine = getModel('Medicine');

    // Only search within verified and launched pharmacies
    const verifiedStores = await Pharmacy.find({ status: 'Approved & Verified', isLaunched: true });
    const verifiedStoreIds = verifiedStores.map(store => store._id);

    // Find matching medicines (name, generic name, salt composition)
    let medicineQuery = {};
    if (query) {
      medicineQuery = {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { genericName: { $regex: query, $options: 'i' } },
          { saltComposition: { $regex: query, $options: 'i' } },
          { category: { $regex: query, $options: 'i' } }
        ]
      };
    }

    const matchedMeds = await Medicine.find(medicineQuery);
    const matchedMedIds = matchedMeds.map(med => med._id);

    // Fetch matching stock listings inside verified pharmacies
    const inventoryListings = await Inventory.find({
      pharmacyId: { $in: verifiedStoreIds },
      medicineId: { $in: matchedMedIds },
      isAvailable: true
    });

    // Compile comparisons
    const results = inventoryListings.map(listing => {
      const store = verifiedStores.find(s => s._id.toString() === listing.pharmacyId.toString());
      const med = matchedMeds.find(m => m._id.toString() === listing.medicineId.toString());

      return {
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
      };
    });

    // Order by price ascending
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
    const { pharmacyId, type, description, mockInvoiceText } = req.body;
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
      description: ocrPriceAlert ? `${description} [AUTO-FLAGGED] ${priceMismatchDetails}` : description,
      billImage: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=400&q=80',
      status: 'Pending'
    });

    await logAuditAction(req.user.id, req.user.name, req.user.role, 'COMPLAINT_LODGED', pharmacyId, `Complaint lodged (${type}). OCR Flagged: ${ocrPriceAlert}`);

    res.status(201).json({ complaint, ocrPriceAlert });
  } catch (error) {
    res.status(500).json({ message: 'Complaint logging failed', error: error.message });
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

// Seed data route helper
app.post('/api/admin/seed', async (req, res) => {
  try {
    await seedDatabase();
    res.json({ message: 'Seeding successful!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

// ----------------- Database Seeding Engine -----------------
const seedDatabase = async () => {
  const User = getModel('User');
  const Medicine = getModel('Medicine');
  const Pharmacy = getModel('Pharmacy');
  const Inventory = getModel('Inventory');
  const Complaint = getModel('Complaint');
  const AuditLog = getModel('AuditLog');

  // Clear collections for fresh seeding
  await User.deleteMany({});
  await Medicine.deleteMany({});
  await Pharmacy.deleteMany({});
  await Inventory.deleteMany({});
  await Complaint.deleteMany({});
  await AuditLog.deleteMany({});

  // Create user accounts
  const p123456 = await bcrypt.hash('123456', 10);
  const pDefault = await bcrypt.hash('password123', 10);

  // Seed gmail.com users
  const custGmail = await User.create({ name: 'Gmail Customer', email: 'customer@gmail.com', password: p123456, role: 'customer' });
  const adminGmail = await User.create({ name: 'Gmail Admin', email: 'admin@gmail.com', password: p123456, role: 'admin' });
  const execGmail = await User.create({ name: 'Inspector Dan', email: 'executive@gmail.com', password: p123456, role: 'executive' });

  // Seed store owner accounts with gmail.com (all password: 123456, role: pharmacy)
  const ownerSunil = await User.create({ name: 'Sunil Mehta', email: 'sunil@gmail.com', password: p123456, role: 'pharmacy' });
  const ownerRajesh = await User.create({ name: 'Rajesh Sharma', email: 'rajesh@gmail.com', password: p123456, role: 'pharmacy' });
  const ownerAnil = await User.create({ name: 'Anil Deshmukh', email: 'anil@gmail.com', password: p123456, role: 'pharmacy' });
  const ownerAster = await User.create({ name: 'Sunil Mehta (Aster)', email: 'aster@gmail.com', password: p123456, role: 'pharmacy' });
  const ownerGuardian = await User.create({ name: 'Devin Patel (Guardian)', email: 'guardian@gmail.com', password: p123456, role: 'pharmacy' });
  const pharmacyGmail = await User.create({ name: 'Devin Patel (LifeCare)', email: 'pharmacy@gmail.com', password: p123456, role: 'pharmacy' });
  const ownerMetro = await User.create({ name: 'Rajesh Sharma (Metro)', email: 'metro@gmail.com', password: p123456, role: 'pharmacy' });

  // Seed medsafe.com users (for fast switch buttons in UI) and more inspectors
  const custMed = await User.create({ name: 'Rahul Sharma', email: 'customer@medsafe.com', password: pDefault, role: 'customer' });
  const adminMed = await User.create({ name: 'SuperAdmin', email: 'admin@medsafe.com', password: pDefault, role: 'admin' });
  const execMed = await User.create({ name: 'Inspector Vikram', email: 'executive@medsafe.com', password: pDefault, role: 'executive' });
  const pharmacyMed = await User.create({ name: 'Devin Patel', email: 'pharmacy@medsafe.com', password: pDefault, role: 'pharmacy' });

  // Additional verification executives/inspectors (total of 5)
  await User.create({ name: 'Inspector Rohan', email: 'inspector.rohan@medsafe.com', password: pDefault, role: 'executive' });
  await User.create({ name: 'Inspector Priya', email: 'inspector.priya@medsafe.com', password: pDefault, role: 'executive' });
  await User.create({ name: 'Inspector Amit', email: 'inspector.amit@medsafe.com', password: pDefault, role: 'executive' });

  // Seed essential medicines
  const meds = [
    {
      name: 'Paracetamol 650mg',
      brandName: 'Calpol 650',
      genericName: 'Acetaminophen',
      saltComposition: 'Paracetamol IP 650mg',
      category: 'Painkiller',
      barcode: '8901138814013',
      alternatives: ['Crocin 650', 'Dolo 650', 'Pyrigesic 650']
    },
    {
      name: 'Amoxicillin 500mg',
      brandName: 'Mox 500',
      genericName: 'Amoxicillin Trihydrate',
      saltComposition: 'Amoxicillin 500mg',
      category: 'Antibiotic',
      barcode: '8901235123512',
      alternatives: ['Amoxil 500', 'Novamox 500', 'Cipmox 500']
    },
    {
      name: 'Metformin 500mg',
      brandName: 'Glycomet 500',
      genericName: 'Metformin Hydrochloride',
      saltComposition: 'Metformin IP 500mg',
      category: 'Antihyperglycemic',
      barcode: '8902526312451',
      alternatives: ['Obimet 500', 'Metformin generic', 'Riomet 500']
    },
    {
      name: 'Atorvastatin 10mg',
      brandName: 'Lipvas 10',
      genericName: 'Atorvastatin Calcium',
      saltComposition: 'Atorvastatin 10mg',
      category: 'Statin',
      barcode: '8901509124239',
      alternatives: ['Lipitor 10', 'Atorva 10', 'Tonact 10']
    },
    {
      name: 'Cetirizine 10mg',
      brandName: 'Okacet 10',
      genericName: 'Cetirizine Dihydrochloride',
      saltComposition: 'Cetirizine 10mg',
      category: 'Antihistamine',
      barcode: '8901043004561',
      alternatives: ['Zyrtec 10', 'Cetzine 10', 'Alerid 10']
    },
    {
      name: 'Ibuprofen 400mg',
      brandName: 'Combiflam',
      genericName: 'Ibuprofen IP 400mg',
      saltComposition: 'Ibuprofen 400mg',
      category: 'Painkiller',
      barcode: '8901234567890',
      alternatives: ['Brufen 400', 'Ibugesic 400', 'Flanzen 400']
    },
    {
      name: 'Pantoprazole 40mg',
      brandName: 'Pan 40',
      genericName: 'Pantoprazole Sodium',
      saltComposition: 'Pantoprazole 40mg',
      category: 'Antacid',
      barcode: '8909876543210',
      alternatives: ['Pantocid 40', 'Pantodac 40', 'Nupenta 40']
    },
    {
      name: 'Azithromycin 500mg',
      brandName: 'Azithral 500',
      genericName: 'Azithromycin Dihydrate',
      saltComposition: 'Azithromycin 500mg',
      category: 'Antibiotic',
      barcode: '8904561237890',
      alternatives: ['Azee 500', 'Azibact 500', 'Azithro 500']
    },
    {
      name: 'Montelukast 10mg',
      brandName: 'Montair 10',
      genericName: 'Montelukast Sodium',
      saltComposition: 'Montelukast Sodium IP 10mg',
      category: 'Antiasthmatic',
      barcode: '8906000000001',
      alternatives: ['Telekast 10', 'Singulair 10', 'Montus 10']
    },
    {
      name: 'Loratadine 10mg',
      brandName: 'Claritin 10',
      genericName: 'Loratadine',
      saltComposition: 'Loratadine USP 10mg',
      category: 'Antihistamine',
      barcode: '8907000000002',
      alternatives: ['Lorasyn 10', 'Alavert 10', 'Lupilor 10']
    }
  ];

  const createdMeds = [];
  for (const m of meds) {
    const created = await Medicine.create(m);
    createdMeds.push(created);
  }

  // Seed verified pharmacy 1
  const store1 = await Pharmacy.create({
    name: 'Wellness Forever Pharmacy',
    ownerName: 'Sunil Mehta',
    ownerId: String(ownerSunil._id),
    address: 'Shop 12, Highstreet Mall, MG Road, Pune',
    contact: '+91 9823456789',
    drugLicense: 'DL-2035-MH2049',
    gstNumber: '27AAAAA1111A1Z1',
    certifications: ['GST_CERTIFICATE_UPLOADED', 'DRUG_LICENSE_UPLOADED', 'ISO_9001_COMPLIANT'],
    storeImages: ['https://images.unsplash.com/photo-1607619056574-7b8f304b3c8c?auto=format&fit=crop&w=800&q=80'],
    billingSoftware: 'MedSafe-Link Integrator',
    status: 'Approved & Verified',
    preferredVisitDate: '2026-05-30',
    storeTimings: '8 AM - 11 PM',
    barcodeSystemAvailable: true,
    billingSoftwareAvailable: true,
    debitCreditAvailable: true,
    assignedExecutiveId: String(execMed._id),
    assignedExecutiveName: 'Inspector Vikram',
    trustScore: 98,
    inventoryUpdateFrequency: 'Real-time Integrator',
    isLaunched: true
  });

  // Seed verified pharmacy 2
  const store2 = await Pharmacy.create({
    name: 'Apollo Pharmacy Prime',
    ownerName: 'Rajesh Sharma',
    ownerId: String(ownerRajesh._id),
    address: 'Shop 4, Gold Plaza, Main Street, Pune',
    contact: '+91 9765432100',
    drugLicense: 'DL-4021-MH2051',
    gstNumber: '27CCCCC3333C3Z3',
    certifications: ['GST_CERTIFICATE_UPLOADED', 'DRUG_LICENSE_UPLOADED'],
    storeImages: ['https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=800&q=80'],
    billingSoftware: 'Apollo-Sync Billing v4',
    status: 'Approved & Verified',
    preferredVisitDate: '2026-05-28',
    storeTimings: '24 Hours Open',
    barcodeSystemAvailable: true,
    billingSoftwareAvailable: true,
    debitCreditAvailable: true,
    assignedExecutiveId: String(execMed._id),
    assignedExecutiveName: 'Inspector Vikram',
    trustScore: 95,
    inventoryUpdateFrequency: 'Real-time Integrator',
    isLaunched: true
  });

  // Seed verified pharmacy 3
  const store3 = await Pharmacy.create({
    name: 'MedPlus SuperChemists',
    ownerName: 'Anil Deshmukh',
    ownerId: String(ownerAnil._id),
    address: 'Sector 5, Kasturba Gandhi Road, Pune',
    contact: '+91 9123456780',
    drugLicense: 'DL-5032-MH2055',
    gstNumber: '27DDDDD4444D4Z4',
    certifications: ['GST_CERTIFICATE_UPLOADED', 'DRUG_LICENSE_UPLOADED'],
    storeImages: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80'],
    billingSoftware: 'MedPlus-Pos System',
    status: 'Approved & Verified',
    preferredVisitDate: '2026-05-29',
    storeTimings: '9 AM - 10 PM',
    barcodeSystemAvailable: true,
    billingSoftwareAvailable: true,
    debitCreditAvailable: true,
    assignedExecutiveId: String(execMed._id),
    assignedExecutiveName: 'Inspector Vikram',
    trustScore: 92,
    inventoryUpdateFrequency: 'Daily',
    isLaunched: true
  });

  // Seed verified pharmacy 4
  const store4 = await Pharmacy.create({
    name: 'Aster Pharmacy',
    ownerName: 'Sunil Mehta',
    ownerId: String(ownerAster._id),
    address: 'Shop 8, Hiranandani Estate, Thane, Mumbai',
    contact: '+91 8888777766',
    drugLicense: 'DL-6028-MH3050',
    gstNumber: '27EEEEE5555E5Z5',
    certifications: ['GST_CERTIFICATE_UPLOADED', 'DRUG_LICENSE_UPLOADED'],
    storeImages: ['https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80'],
    billingSoftware: 'Aster-Sync POS v2',
    status: 'Approved & Verified',
    preferredVisitDate: '2026-05-30',
    storeTimings: '8 AM - 10 PM',
    barcodeSystemAvailable: true,
    billingSoftwareAvailable: true,
    debitCreditAvailable: true,
    assignedExecutiveId: String(execMed._id),
    assignedExecutiveName: 'Inspector Vikram',
    trustScore: 96,
    inventoryUpdateFrequency: 'Real-time Integrator',
    isLaunched: true
  });

  // Seed verified pharmacy 5
  const store5 = await Pharmacy.create({
    name: 'Guardian Healthcare',
    ownerName: 'Devin Patel',
    ownerId: String(ownerGuardian._id),
    address: 'Block B, Niti Marg, Chanakyapuri, New Delhi',
    contact: '+91 7777666655',
    drugLicense: 'DL-7039-MH3060',
    gstNumber: '27FFFFF6666F6Z6',
    certifications: ['GST_CERTIFICATE_UPLOADED', 'DRUG_LICENSE_UPLOADED'],
    storeImages: ['https://images.unsplash.com/photo-1607619056574-7b8f304b3c8c?auto=format&fit=crop&w=800&q=80'],
    billingSoftware: 'Guardian-Cloud Billing',
    status: 'Approved & Verified',
    preferredVisitDate: '2026-05-28',
    storeTimings: '9 AM - 9 PM',
    barcodeSystemAvailable: true,
    billingSoftwareAvailable: true,
    debitCreditAvailable: true,
    assignedExecutiveId: String(execMed._id),
    assignedExecutiveName: 'Inspector Vikram',
    trustScore: 94,
    inventoryUpdateFrequency: 'Daily',
    isLaunched: true
  });

  // Seed inventories for verified pharmacies (1 to 5)
  const storeList = [store1, store2, store3, store4, store5];
  const priceSets = [
    [15, 45, 12, 55, 8, 10, 18, 30, 22, 14],
    [13, 48, 10, 58, 9, 8, 20, 28, 24, 12],
    [16, 42, 14, 52, 7, 11, 17, 32, 20, 15],
    [14, 46, 11, 56, 8, 9, 19, 29, 21, 13],
    [15, 44, 13, 54, 8, 10, 18, 31, 23, 14]
  ];

  for (let sIdx = 0; sIdx < storeList.length; sIdx++) {
    const store = storeList[sIdx];
    const prices = priceSets[sIdx];
    for (let i = 0; i < createdMeds.length; i++) {
      await Inventory.create({
        pharmacyId: String(store._id),
        medicineId: String(createdMeds[i]._id),
        medicineName: createdMeds[i].name,
        price: prices[i] || 15,
        stock: Math.floor(Math.random() * 50) + 30,
        isAvailable: true
      });
    }
  }

  // Seed pharmacy 6 (Pending verification request, Devin Patel / pharmacyGmail._id)
  await Pharmacy.create({
    name: 'LifeCare Chemist & Druggist',
    ownerName: 'Devin Patel',
    ownerId: String(pharmacyGmail._id),
    address: 'Ground Floor, Tulip Plaza, Sector 4, Mumbai',
    contact: '+91 9998887776',
    drugLicense: 'DL-9041-MH3011',
    gstNumber: '27BBBBB2222B2Z2',
    certifications: ['GST_CERTIFICATE_UPLOADED', 'DRUG_LICENSE_UPLOADED'],
    storeImages: ['https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=800&q=80'],
    billingSoftware: 'None',
    status: 'Pending Verification Request',
    preferredVisitDate: '2026-06-20',
    storeTimings: '9 AM - 10 PM',
    barcodeSystemAvailable: false,
    billingSoftwareAvailable: false,
    debitCreditAvailable: false,
    setupAssistanceRequirements: 'Need guidance setting up automated inventory sync API.',
    trustScore: 100
  });

  // Seed pharmacy 7 (Verification Requested, Metro Medicos)
  await Pharmacy.create({
    name: 'Metro Medicos & Healthcare',
    ownerName: 'Rajesh Sharma',
    ownerId: String(ownerMetro._id),
    address: 'Shop 2, Metro Station Plaza, Sector 15, Noida',
    contact: '+91 9555443322',
    drugLicense: 'DL-8032-UP3022',
    gstNumber: '09AAAAA2222A2Z2',
    certifications: ['GST_CERTIFICATE_UPLOADED', 'DRUG_LICENSE_UPLOADED'],
    storeImages: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80'],
    billingSoftware: 'None',
    status: 'Verification Requested',
    preferredVisitDate: '2026-06-25',
    storeTimings: '9 AM - 9 PM',
    barcodeSystemAvailable: true,
    billingSoftwareAvailable: false,
    debitCreditAvailable: true,
    setupAssistanceRequirements: 'Need support linking Marg POS system.',
    trustScore: 100
  });

  console.log('💚 Database Seeding Completed Successfully!');
};

// Initiate database connection
connectDB().then(async () => {
  try {
    const User = getModel('User');
    const hasAmit = await User.findOne({ email: 'inspector.amit@medsafe.com' });
    if (!hasAmit) {
      console.log('Seed inspectors not found. Seeding initial database data...');
      await seedDatabase();
    } else {
      console.log('Database already contains records. Skipping auto-seeding to protect data.');
    }
  } catch (err) {
    console.error('Database count/seeding check failed:', err);
  }
});

// Start Express Listener
app.listen(PORT, () => {
  console.log(`🚀 MedSafe API Server running on port ${PORT}`);
  console.log(`🚀 Database System Mode: [${getDBType()}]`);
});
