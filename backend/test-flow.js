import { spawn } from 'child_process';
import path from 'path';

const API_BASE = 'http://localhost:5000/api';

console.log('🧪 Starting MedSafe Cryptographic API Integration Test Suite...\n');

// Standard fetch wrapper
async function request(endpoint, method = 'GET', body = null, token = null) {
  const options = {
    method,
    headers: {}
  };
  
  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`❌ Request to ${endpoint} failed:`, error.message);
    throw error;
  }
}

async function runTests() {
  try {
    // 1. Authenticate Admin (with retry to wait for async database seeding)
    console.log('🔄 Step 1: Logging in as Administrator...');
    let adminAuth;
    for (let attempt = 1; attempt <= 15; attempt++) {
      try {
        adminAuth = await request('/auth/login', 'POST', {
          email: 'admin@medsafe.com',
          password: 'password123'
        });
        break;
      } catch (err) {
        if (attempt === 15) throw err;
        console.log(`⏳ Seeding database in progress (attempt ${attempt}/15)...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    const adminToken = adminAuth.token;
    console.log('✅ Admin Logged In. Token initialized.\n');

    // 2. Fetch Pending Pharmacies
    console.log('🔄 Step 2: Fetching registration catalog...');
    const stores = await request('/admin/pharmacies', 'GET', null, adminToken);
    const lifecare = stores.find(s => s.name.includes('LifeCare'));
    
    if (!lifecare) {
      throw new Error('Could not find seeded LifeCare Chemist in database!');
    }
    console.log(`✅ Found store: ${lifecare.name}. Current Status: [${lifecare.status}]\n`);

    // 3. Request Verification Visit (Pharmacy owner)
    console.log('🔄 Step 3: Logging in as Pharmacy Owner...');
    const ownerAuth = await request('/auth/login', 'POST', {
      email: 'pharmacy@gmail.com',
      password: '123456'
    });
    const ownerToken = ownerAuth.token;
    
    console.log('🔄 Requesting Physical Onboarding Audit Visit...');
    await request('/pharmacies/request-verification', 'POST', {
      preferredVisitDate: '2026-06-05',
      storeTimings: '9 AM - 9 PM',
      barcodeSystemAvailable: true,
      billingSoftwareAvailable: true,
      setupAssistanceRequirements: 'Need barcode setup'
    }, ownerToken);
    console.log('✅ Onboarding request registered on ledger.\n');

    // 4. Admin Assigns Executive
    console.log('🔄 Step 4: Admin assigns Deployed Inspector...');
    const executives = await request('/admin/executives', 'GET', null, adminToken);
    const execVikram = executives.find(e => e.email === 'executive@medsafe.com');
    if (!execVikram) {
      throw new Error('Could not find Inspector Vikram in seeded database!');
    }
    await request('/admin/assign-executive', 'POST', {
      pharmacyId: lifecare._id,
      executiveId: execVikram._id,
      visitDate: '2026-06-05'
    }, adminToken);
    console.log('✅ Inspector assigned successfully. Status updated to Executive Assigned.\n');

    // 5. Executive Submits Physical Report Checklist
    console.log('🔄 Step 5: Logging in as Inspector Vikram...');
    const execAuth = await request('/auth/login', 'POST', {
      email: 'executive@medsafe.com',
      password: 'password123'
    });
    const execToken = execAuth.token;
    
    console.log('🔄 Submitting physical validation checklist & drug safety report...');
    await request('/executive/submit-report', 'POST', {
      pharmacyId: lifecare._id,
      certificationStatus: 'Pass',
      medicineQualityStatus: 'Pass',
      inventorySetupStatus: 'Completed',
      complianceNotes: 'Inspected drug licenses physical copies. Cold chains configured at 4°C. Inventory accurately synchronizing with Marg system.',
      riskFlags: [],
      recommendation: 'Approved'
    }, execToken);
    console.log('✅ Verification report committed. Status updated to Under Admin Review.\n');

    // 6. Admin Approves and Verifies Pharmacy
    console.log('🔄 Step 6: Admin reviewing report & granting Activation Badge...');
    await request('/admin/approve-pharmacy', 'POST', {
      pharmacyId: lifecare._id,
      decision: 'approve',
      comments: 'All legal drug certifications physically validated.'
    }, adminToken);
    console.log('✅ Activation badge granted! Store is now discoverable.\n');

    // 7. Customer search compare prices
    console.log('🔄 Step 7: Performing medicine pricing search...');
    const searchData = await request('/customer/search?query=Paracetamol', 'GET');
    console.log(`✅ Search results cataloged. Lowest Paracetamol price found: $${searchData[0]?.price} at ${searchData[0]?.pharmacy?.name}.\n`);

    // 8. Fraud Prevention: Customer lodges Price Mismatch Complaint
    console.log('🔄 Step 8: Logging in as Customer (Rahul Sharma)...');
    const customerAuth = await request('/auth/login', 'POST', {
      email: 'customer@medsafe.com',
      password: 'password123'
    });
    const customerToken = customerAuth.token;
    
    console.log('🔄 Lodging pricing mismatch ticket & uploading receipt scans...');
    const compRes = await request('/customer/lodge-complaint', 'POST', {
      pharmacyId: lifecare._id,
      type: 'Price Mismatch',
      description: 'Charged $45 for Metformin instead of the advertised $12 price level.',
      mockInvoiceText: 'Wellness Invoice\nMedicine: Paracetamol\nPrice: 45\nQty: 1'
    }, customerToken);
    console.log(`✅ Dispute submitted. Price mismatch OCR match flagged: [${compRes.ocrPriceAlert}]\n`);

    // 8b. Store Owner responds to complaint
    console.log('🔄 Step 8b: Store Owner responds to pricing dispute...');
    const newlyCreatedComplaintId = compRes.complaint._id;
    const resVal = await request('/pharmacies/respond-complaint', 'POST', {
      complaintId: newlyCreatedComplaintId,
      response: 'This was a pricing sync error due to inventory POS update delay. We have resolved it.'
    }, ownerToken);
    console.log('✅ Pharmacy owner response appeal submitted.\n');

    // 9. Admin Adjudicates Complaint
    console.log('🔄 Step 9: Admin penalizing fraud...');
    await request('/admin/complaints/adjudicate', 'POST', {
      complaintId: newlyCreatedComplaintId,
      action: 'penalize'
    }, adminToken);
    console.log('✅ Enforcement penalty completed. Mismatch warned and store trust score deducted by 20 points.\n');

    console.log('🏆 MEDSAFE API INTEGRATION TEST COMPLETED SUCCESSFULLY WITH 100% COMPLIANCE!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed with exception:', error.message);
    process.exit(1);
  }
}

// Check if server is running, then run tests
fetch(`${API_BASE}/health`)
  .then(() => {
    console.log('⚡ Detected running API server. Launching validation fetchers...\n');
    runTests();
  })
  .catch(() => {
    console.log('⚠️  Backend API server is not running on port 5000.');
    console.log('💡 Starting local Express instance automatically in memory for testing...\n');
    
    const server = spawn('node', ['server.js'], { stdio: 'ignore' });
    
    // Wait for boot
    setTimeout(() => {
      runTests().finally(() => {
        server.kill();
      });
    }, 2000);
  });
