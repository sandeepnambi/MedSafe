const API_BASE = 'http://localhost:5000/api';

// Check if server is running
let isServerOnline = false;

// Mock local storage database structure for fallback
const initLocalStorageDB = () => {
  if (!localStorage.getItem('medsafe_users')) {
    localStorage.setItem('medsafe_users', JSON.stringify([]));
  }
  
  if (!localStorage.getItem('medsafe_medicines')) {
    localStorage.setItem('medsafe_medicines', JSON.stringify([
      {
        _id: 'm1',
        name: 'Paracetamol 650mg',
        brandName: 'Calpol 650',
        genericName: 'Acetaminophen',
        saltComposition: 'Paracetamol IP 650mg',
        category: 'Painkiller',
        barcode: '8901138814013',
        alternatives: ['Crocin 650', 'Dolo 650', 'Pyrigesic 650']
      },
      {
        _id: 'm2',
        name: 'Amoxicillin 500mg',
        brandName: 'Mox 500',
        genericName: 'Amoxicillin Trihydrate',
        saltComposition: 'Amoxicillin 500mg',
        category: 'Antibiotic',
        barcode: '8901235123512',
        alternatives: ['Amoxil 500', 'Novamox 500', 'Cipmox 500']
      },
      {
        _id: 'm3',
        name: 'Metformin 500mg',
        brandName: 'Glycomet 500',
        genericName: 'Metformin Hydrochloride',
        saltComposition: 'Metformin IP 500mg',
        category: 'Antihyperglycemic',
        barcode: '8902526312451',
        alternatives: ['Obimet 500', 'Metformin generic', 'Riomet 500']
      },
      {
        _id: 'm4',
        name: 'Atorvastatin 10mg',
        brandName: 'Lipvas 10',
        genericName: 'Atorvastatin Calcium',
        saltComposition: 'Atorvastatin 10mg',
        category: 'Statin',
        barcode: '8901509124239',
        alternatives: ['Lipitor 10', 'Atorva 10', 'Tonact 10']
      },
      {
        _id: 'm5',
        name: 'Cetirizine 10mg',
        brandName: 'Okacet 10',
        genericName: 'Cetirizine Dihydrochloride',
        saltComposition: 'Cetirizine 10mg',
        category: 'Antihihistamine',
        barcode: '8901043004561',
        alternatives: ['Zyrtec 10', 'Cetzine 10', 'Alerid 10']
      }
    ]));
  }

  if (!localStorage.getItem('medsafe_pharmacies')) {
    localStorage.setItem('medsafe_pharmacies', JSON.stringify([
      {
        _id: 'p1',
        name: 'Wellness Forever Pharmacy',
        ownerName: 'Sunil Mehta',
        ownerId: 'mock_sunil_mehta',
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
        assignedExecutiveName: 'Inspector Vikram',
        trustScore: 98,
        warningsCount: 0,
        inventoryUpdateFrequency: 'Real-time Integrator',
        priceAccuracy: 100,
        isLaunched: true
      },
      {
        _id: 'p2',
        name: 'LifeCare Chemist & Druggist',
        ownerName: 'Devin Patel',
        ownerId: '000000000000000000000002',
        address: 'Ground Floor, Tulip Plaza, Sector 4, Mumbai',
        contact: '+91 9998887776',
        drugLicense: 'DL-9041-MH3011',
        gstNumber: '27BBBBB2222B2Z2',
        certifications: ['GST_CERTIFICATE_UPLOADED', 'DRUG_LICENSE_UPLOADED'],
        storeImages: ['https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=800&q=80'],
        billingSoftware: 'None',
        status: 'Pending Verification Request',
        storeTimings: '9 AM - 10 PM',
        trustScore: 100,
        warningsCount: 0,
        inventoryUpdateFrequency: 'Never',
        priceAccuracy: 100,
        isLaunched: false
      }
    ]));
  }

  if (!localStorage.getItem('medsafe_inventory')) {
    localStorage.setItem('medsafe_inventory', JSON.stringify([
      { _id: 'i1', pharmacyId: 'p1', medicineId: 'm1', medicineName: 'Paracetamol 650mg', price: 15, stock: 45, isAvailable: true },
      { _id: 'i2', pharmacyId: 'p1', medicineId: 'm2', medicineName: 'Amoxicillin 500mg', price: 45, stock: 24, isAvailable: true },
      { _id: 'i3', pharmacyId: 'p1', medicineId: 'm3', medicineName: 'Metformin 500mg', price: 12, stock: 32, isAvailable: true },
      { _id: 'i4', pharmacyId: 'p1', medicineId: 'm4', medicineName: 'Atorvastatin 10mg', price: 55, stock: 18, isAvailable: true },
      { _id: 'i5', pharmacyId: 'p1', medicineId: 'm5', medicineName: 'Cetirizine 10mg', price: 8, stock: 40, isAvailable: true }
    ]));
  }

  if (!localStorage.getItem('medsafe_complaints')) {
    localStorage.setItem('medsafe_complaints', []);
  }

  if (!localStorage.getItem('medsafe_reports')) {
    localStorage.setItem('medsafe_reports', []);
  }

  if (!localStorage.getItem('medsafe_audit')) {
    localStorage.setItem('medsafe_audit', JSON.stringify([
      { actorName: 'System', actorRole: 'admin', action: 'DATABASE_INITIALIZED', details: 'MedSafe in-memory database configuration complete.', timestamp: new Date().toISOString() }
    ]));
  }
};

initLocalStorageDB();

// Test server connectivity
export const checkServerHealth = async () => {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) {
      isServerOnline = true;
      return true;
    }
  } catch (e) {
    isServerOnline = false;
  }
  return false;
};

// Generic Fetch Wrapper with auto fallback
const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('medsafe_token');
  if (token) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }

  if (options.body && typeof options.body === 'object') {
    options.headers = {
      ...options.headers,
      'Content-Type': 'application/json'
    };
    options.body = JSON.stringify(options.body);
  }

  const isAuthEndpoint = endpoint.startsWith('/auth/');

  // Attempt server fetch
  if (isServerOnline || isAuthEndpoint) {
    let res;
    try {
      res = await fetch(`${API_BASE}${endpoint}`, options);
    } catch (networkError) {
      if (isAuthEndpoint) {
        throw new Error('Database server connection lost. MongoDB is strictly required for authentication.');
      }
      console.warn(`Server request failed for ${endpoint}. Falling back to Local DB.`, networkError);
    }

    if (res) {
      if (res.ok) return await res.json();
      const err = await res.json();
      throw new Error(err.message || 'API request failed');
    }
  }

  // Fallback to LocalStorage Engine
  return handleLocalStorageRequest(endpoint, options);
};

// Simulated LocalStorage Backend Router
const handleLocalStorageRequest = (endpoint, options = {}) => {
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : null;

  const users = JSON.parse(localStorage.getItem('medsafe_users') || '[]');
  const pharmacies = JSON.parse(localStorage.getItem('medsafe_pharmacies') || '[]');
  const medicines = JSON.parse(localStorage.getItem('medsafe_medicines') || '[]');
  const inventory = JSON.parse(localStorage.getItem('medsafe_inventory') || '[]');
  const complaints = JSON.parse(localStorage.getItem('medsafe_complaints') || '[]');
  const reports = JSON.parse(localStorage.getItem('medsafe_reports') || '[]');
  const audits = JSON.parse(localStorage.getItem('medsafe_audit') || '[]');

  const saveDB = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const getLoggedInUser = () => {
    const cur = localStorage.getItem('medsafe_current_user');
    return cur ? JSON.parse(cur) : null;
  };

  const logLocalAudit = (action, details) => {
    const user = getLoggedInUser() || { name: 'Anonymous', role: 'customer' };
    audits.push({
      actorName: user.name,
      actorRole: user.role,
      action,
      details,
      timestamp: new Date().toISOString()
    });
    saveDB('medsafe_audit', audits);
  };

  // Auth Routing
  if (endpoint === '/auth/login') {
    const { email } = body;
    let found = users.find(u => u.email === email);
    if (!found) {
      throw new Error('Invalid credentials: User not registered');
    }
    
    localStorage.setItem('medsafe_token', 'mock_jwt_token_' + found._id);
    localStorage.setItem('medsafe_current_user', JSON.stringify(found));
    logLocalAudit('USER_LOGIN', `Logged in via Local Offline Database`);
    return { token: 'mock_jwt_token_' + found._id, user: found };
  }

  if (endpoint === '/auth/register') {
    const { name, email, role } = body;
    const existing = users.find(u => u.email === email);
    if (existing) throw new Error('Email already registered');
    
    const newUser = { _id: 'u_' + Date.now(), name, email, role: role || 'customer' };
    users.push(newUser);
    saveDB('medsafe_users', users);
    
    return { message: 'Registration successful', userId: newUser._id };
  }

  // Pharmacy Router
  if (endpoint === '/pharmacies/my-store') {
    const user = getLoggedInUser();
    if (!user) throw new Error('Unauthorized');
    const store = pharmacies.find(p => p.ownerId === user._id);
    if (!store) throw new Error('Store not found');
    return store;
  }

  if (endpoint === '/pharmacies/my-complaints') {
    const user = getLoggedInUser();
    if (!user) throw new Error('Unauthorized');
    const store = pharmacies.find(p => p.ownerId === user._id);
    if (!store) return [];
    return complaints.filter(c => c.pharmacyId === store._id);
  }

  if (endpoint === '/pharmacies' && method === 'POST') {
    const user = getLoggedInUser();
    const newStore = {
      _id: 'p_' + Date.now(),
      ownerId: user._id,
      ownerName: user.name,
      status: 'Pending Verification Request',
      trustScore: 100,
      warningsCount: 0,
      inventoryUpdateFrequency: 'Never',
      priceAccuracy: 100,
      certifications: ['GST_CERTIFICATE_UPLOADED', 'DRUG_LICENSE_UPLOADED'],
      storeImages: ['https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=800&q=80'],
      ...body
    };
    pharmacies.push(newStore);
    saveDB('medsafe_pharmacies', pharmacies);
    logLocalAudit('PHARMACY_REGISTERED', `Offline store profile registered: ${newStore.name}`);
    return newStore;
  }

  if (endpoint === '/pharmacies/request-verification' && method === 'POST') {
    const user = getLoggedInUser();
    const idx = pharmacies.findIndex(p => p.ownerId === user._id);
    if (idx === -1) throw new Error('Store not found');
    
    pharmacies[idx] = {
      ...pharmacies[idx],
      status: 'Verification Requested',
      ...body
    };
    saveDB('medsafe_pharmacies', pharmacies);
    logLocalAudit('VERIFICATION_REQUESTED', `Physical audit requested for ${pharmacies[idx].name}`);
    return pharmacies[idx];
  }

  if (endpoint === '/pharmacies/launch' && method === 'POST') {
    const user = getLoggedInUser();
    const idx = pharmacies.findIndex(p => p.ownerId === (user?._id || user?.id));
    if (idx === -1) throw new Error('Store not found');
    if (pharmacies[idx].status !== 'Approved & Verified') {
      throw new Error('Only approved and verified stores can be launched.');
    }
    pharmacies[idx].isLaunched = true;
    saveDB('medsafe_pharmacies', pharmacies);
    logLocalAudit('STORE_LAUNCHED', `Store launched live: ${pharmacies[idx].name}`);
    return pharmacies[idx];
  }

  if (endpoint.startsWith('/pharmacies/inventory')) {
    if (endpoint.includes('sync-billing')) {
      const { pharmacyId, billingSystem } = body;
      // Populate full inventory from medicines
      const freshItems = medicines.map(m => ({
        _id: 'i_' + Math.random().toString(36).substr(2, 9),
        pharmacyId,
        medicineId: m._id,
        medicineName: m.name,
        price: Math.floor(Math.random() * 80) + 15,
        stock: Math.floor(Math.random() * 100) + 10,
        isAvailable: true
      }));

      // Filter out existing
      const filteredInv = inventory.filter(item => item.pharmacyId !== pharmacyId);
      const newInventory = [...filteredInv, ...freshItems];
      saveDB('medsafe_inventory', newInventory);

      // Update store updates freq
      const sIdx = pharmacies.findIndex(p => p._id === pharmacyId);
      if (sIdx !== -1) {
        pharmacies[sIdx].inventoryUpdateFrequency = 'Real-time Integrator';
        pharmacies[sIdx].billingSoftware = billingSystem;
        saveDB('medsafe_pharmacies', pharmacies);
      }

      logLocalAudit('BILLING_SOFTWARE_SYNCED', `Offline billing synced for store: ${pharmacyId}`);
      return { message: 'Synced', count: freshItems.length };
    }

    if (endpoint.includes('manage') && method === 'POST') {
      const { pharmacyId, medicineId, medicineName, price, stock, isAvailable } = body;
      const idx = inventory.findIndex(i => i.pharmacyId === pharmacyId && i.medicineId === medicineId);
      
      let res;
      if (idx !== -1) {
        inventory[idx] = { ...inventory[idx], price: Number(price), stock: Number(stock), isAvailable };
        res = inventory[idx];
      } else {
        res = { _id: 'i_' + Date.now(), pharmacyId, medicineId, medicineName, price: Number(price), stock: Number(stock), isAvailable };
        inventory.push(res);
      }
      saveDB('medsafe_inventory', inventory);
      
      const sIdx = pharmacies.findIndex(p => p._id === pharmacyId);
      if (sIdx !== -1) {
        pharmacies[sIdx].inventoryUpdateFrequency = 'Daily';
        saveDB('medsafe_pharmacies', pharmacies);
      }
      
      return res;
    }

    // Standard list get
    const urlParams = new URLSearchParams(endpoint.split('?')[1]);
    const pharmacyId = urlParams.get('pharmacyId');
    return inventory.filter(i => i.pharmacyId === pharmacyId);
  }

  if (endpoint === '/medicines') {
    return medicines;
  }

  // Admin Router
  if (endpoint === '/admin/pharmacies') {
    return pharmacies;
  }

  if (endpoint === '/admin/users') {
    return users;
  }

  if (endpoint === '/admin/assign-executive' && method === 'POST') {
    const { pharmacyId, executiveId, visitDate } = body;
    const idx = pharmacies.findIndex(p => p._id === pharmacyId);
    if (idx === -1) throw new Error('Pharmacy not found');

    const exec = users.find(u => u._id === executiveId);

    pharmacies[idx] = {
      ...pharmacies[idx],
      status: 'Executive Assigned',
      assignedExecutiveId: executiveId,
      assignedExecutiveName: exec ? exec.name : 'Vikram',
      visitScheduleDate: visitDate
    };
    saveDB('medsafe_pharmacies', pharmacies);
    logLocalAudit('EXECUTIVE_ASSIGNED', `Assigned Inspector ${exec ? exec.name : 'Vikram'} to visit store ${pharmacies[idx].name}`);
    return pharmacies[idx];
  }

  if (endpoint === '/admin/reports') {
    return reports;
  }

  if (endpoint === '/admin/logs') {
    return audits.reverse();
  }

  if (endpoint === '/admin/approve-pharmacy' && method === 'POST') {
    const { pharmacyId, decision, comments } = body;
    const idx = pharmacies.findIndex(p => p._id === pharmacyId);
    if (idx === -1) throw new Error('Pharmacy not found');

    const statusMap = { approve: 'Approved & Verified', correct: 'Needs Corrections', reject: 'Rejected' };
    pharmacies[idx].status = statusMap[decision] || 'Approved & Verified';
    if (decision === 'approve') pharmacies[idx].trustScore = 100;
    saveDB('medsafe_pharmacies', pharmacies);
    logLocalAudit('PHARMACY_STATUS_DECDECISION', `Admin approved status: ${pharmacies[idx].status} for ${pharmacies[idx].name}`);
    return pharmacies[idx];
  }

  // Executive Router
  if (endpoint === '/executive/assignments') {
    const user = getLoggedInUser();
    const userId = user?._id || user?.id;
    return pharmacies.filter(p => p.assignedExecutiveId === userId || p.status === 'Verification In Progress');
  }

  if (endpoint === '/executive/reports') {
    const user = getLoggedInUser();
    const userId = user?._id || user?.id;
    return reports.filter(r => r.executiveId === userId);
  }

  if (endpoint === '/executive/submit-report' && method === 'POST') {
    const { pharmacyId, recommendation, complianceNotes, certificationStatus, medicineQualityStatus, inventorySetupStatus } = body;
    const user = getLoggedInUser();
    const userId = user?._id || user?.id;
    
    const newReport = {
      _id: 'rep_' + Date.now(),
      pharmacyId,
      executiveId: userId || 'mock_exec',
      executiveName: user?.name || 'Vikram',
      recommendation,
      complianceNotes,
      certificationStatus: certificationStatus || 'Pass',
      medicineQualityStatus: medicineQualityStatus || 'Pass',
      inventorySetupStatus: inventorySetupStatus || 'Completed',
      createdAt: new Date().toISOString()
    };
    reports.push(newReport);
    saveDB('medsafe_reports', reports);

    const idx = pharmacies.findIndex(p => p._id === pharmacyId);
    if (idx !== -1) {
      pharmacies[idx].status = 'Under Admin Review';
      saveDB('medsafe_pharmacies', pharmacies);
    }
    
    logLocalAudit('REPORT_SUBMITTED', `Physical audit report submitted with recommendation: ${recommendation}`);
    return { report: newReport };
  }

  // Customer Router
  if (endpoint === '/customer/pharmacies') {
    return pharmacies.filter(p => p.status === 'Approved & Verified');
  }

  if (endpoint.startsWith('/customer/search')) {
    const urlParams = new URLSearchParams(endpoint.split('?')[1]);
    const query = urlParams.get('query') || '';
    
    const activeStores = pharmacies.filter(p => p.status === 'Approved & Verified' && p.isLaunched);
    const storeIds = activeStores.map(s => s._id);

    const matchedMeds = medicines.filter(m => 
      m.name.toLowerCase().includes(query.toLowerCase()) || 
      m.genericName.toLowerCase().includes(query.toLowerCase()) ||
      m.saltComposition.toLowerCase().includes(query.toLowerCase()) ||
      m.category.toLowerCase().includes(query.toLowerCase())
    );
    const matchedMedIds = matchedMeds.map(m => m._id);

    const listings = inventory.filter(i => 
      storeIds.includes(i.pharmacyId) && 
      matchedMedIds.includes(i.medicineId) && 
      i.isAvailable
    );

    const res = listings.map(l => {
      const store = activeStores.find(s => s._id === l.pharmacyId);
      const med = matchedMeds.find(m => m._id === l.medicineId);
      return {
        _id: l._id,
        price: l.price,
        stock: l.stock,
        medicine: med,
        pharmacy: store
      };
    });

    res.sort((a, b) => a.price - b.price);
    return res;
  }

  if (endpoint.startsWith('/customer/recommendations')) {
    const urlParams = new URLSearchParams(endpoint.split('?')[1]);
    const query = urlParams.get('query') || 'Paracetamol 650mg';
    
    const match = medicines.find(m => m.name.toLowerCase().includes(query.toLowerCase())) || medicines[0];
    const alts = medicines.filter(m => m.category === match.category && m._id !== match._id);

    const seasons = {
      Painkiller: 'Elevated during sports seasons, stable baseline.',
      Antibiotic: 'High demand during weather change (monsoon/winter).',
      Antihyperglycemic: 'Chronic essential - highly predictable and constant.',
      Statin: 'Chronic cardiovascular - high demand curve.',
      Antihistamine: 'Spikes strongly during spring allergy months.'
    };

    return {
      targetMedicine: match,
      alternatives: alts,
      demandForecast: seasons[match.category] || 'Moderate, stable seasonal fluctuation.',
      alternativePriceSavings: 'Save up to 45% by opting for generic alternative salts.'
    };
  }

  if (endpoint === '/customer/lodge-complaint' && method === 'POST') {
    const { pharmacyId, type, description, mockInvoiceText } = body;
    const user = getLoggedInUser();
    const store = pharmacies.find(p => p._id === pharmacyId);
    
    let ocrPriceAlert = false;
    let priceMismatchDetails = '';

    if (type === 'Price Mismatch' && mockInvoiceText) {
      const match = mockInvoiceText.match(/price[:\s]*(\d+)/i);
      const parsedPrice = match ? Number(match[1]) : 0;
      
      const listings = inventory.filter(i => i.pharmacyId === pharmacyId);
      if (listings.length > 0 && parsedPrice > 0) {
        const averagePrice = listings[0].price;
        if (parsedPrice > averagePrice * 1.05) {
          ocrPriceAlert = true;
          priceMismatchDetails = `OCR invoice scan flagged a price inflation of $${parsedPrice} vs listed database price of $${averagePrice}.`;
        }
      }
    }

    const complaint = {
      _id: 'comp_' + Date.now(),
      pharmacyId,
      pharmacyName: store ? store.name : 'Unknown Pharmacy',
      customerId: user?._id || 'mock_cust',
      customerName: user?.name || 'Rahul Sharma',
      type,
      description: ocrPriceAlert ? `${description} [AUTO-FLAGGED] ${priceMismatchDetails}` : description,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    complaints.push(complaint);
    saveDB('medsafe_complaints', complaints);
    logLocalAudit('COMPLAINT_LODGED', `Complaint logged against store ${complaint.pharmacyName}. OCR Alert: ${ocrPriceAlert}`);
    return { complaint, ocrPriceAlert };
  }

  if (endpoint === '/admin/complaints') {
    return complaints;
  }

  if (endpoint === '/admin/complaints/adjudicate' && method === 'POST') {
    const { complaintId, action } = body;
    const compIdx = complaints.findIndex(c => c._id === complaintId);
    if (compIdx === -1) throw new Error('Complaint not found');

    const comp = complaints[compIdx];

    if (action === 'penalize') {
      const sIdx = pharmacies.findIndex(p => p._id === comp.pharmacyId);
      if (sIdx !== -1) {
        const currentWarnings = (pharmacies[sIdx].warningsCount || 0) + 1;
        pharmacies[sIdx].warningsCount = currentWarnings;
        pharmacies[sIdx].trustScore = Math.max(0, pharmacies[sIdx].trustScore - 20);

        if (currentWarnings >= 3) {
          pharmacies[sIdx].status = 'Suspended';
        }
        saveDB('medsafe_pharmacies', pharmacies);
        logLocalAudit('FRAUD_PENALTY_APPLIED', `Warnings raised to ${currentWarnings} for store: ${pharmacies[sIdx].name}. Trust Score at ${pharmacies[sIdx].trustScore}.`);
      }
      
      complaints[compIdx].status = 'Resolved';
      saveDB('medsafe_complaints', complaints);
      return { message: 'Penalized store successfully' };
    } else {
      complaints[compIdx].status = 'Dismissed';
      saveDB('medsafe_complaints', complaints);
      logLocalAudit('COMPLAINT_DISMISSED', `Dismissed customer dispute #${complaintId}`);
      return { message: 'Dismissed successfully' };
    }
  }

  if (endpoint === '/pharmacies/respond-complaint' && method === 'POST') {
    const { complaintId, response } = body;
    const compIdx = complaints.findIndex(c => c._id === complaintId);
    if (compIdx !== -1) {
      complaints[compIdx].responseFromPharmacy = response;
      saveDB('medsafe_complaints', complaints);
    }
    return complaints[compIdx];
  }

  return null;
};

// Public API client exports
export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' })
};
