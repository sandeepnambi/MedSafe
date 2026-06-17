import React, { useState, useEffect } from 'react';
import { 
  Search, ShieldCheck, MapPin, AlertTriangle, AlertCircle, 
  Settings, Award, RefreshCw, Barcode, ClipboardList, CheckCircle2, 
  XCircle, Truck, TrendingUp, HelpCircle, User, Store, 
  Lock, Eye, Plus, Trash2, FileText, Check, AlertOctagon, RefreshCcw,
  Heart, History
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { api, checkServerHealth } from './utils/api';

export default function App() {
  // Beautify username helper (e.g., SANDEEP.NAMBIO8 -> Sandeep)
  const beautifyName = (fullName) => {
    if (!fullName) return '';
    const parts = fullName.split(/[\s\._\-]/);
    let firstName = parts[0] || '';
    firstName = firstName.replace(/\d+/g, '');
    if (!firstName) return fullName;
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  };

  // Global States
  const [activeRole, setActiveRole] = useState('customer'); // customer, pharmacy, executive, admin
  const [currentUser, setCurrentUser] = useState(null);
  const [serverOnline, setServerOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Auth Form States
  const [isRegister, setIsRegister] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authRole, setAuthRole] = useState('customer');
  const [authAddress, setAuthAddress] = useState('');
  const [authContact, setAuthContact] = useState('');
  const [authDrugLicense, setAuthDrugLicense] = useState('');
  const [authGSTNumber, setAuthGSTNumber] = useState('');

  // Customer Portal States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [recommendations, setRecommendations] = useState(null);
  const [selectedResults, setSelectedResults] = useState([]);
  const [myComplaints, setMyComplaints] = useState([]);
  const [complaintPharmacyId, setComplaintPharmacyId] = useState('');
  const [complaintType, setComplaintType] = useState('Price Mismatch');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [mockInvoiceText, setMockInvoiceText] = useState('Bill No: 9941\nMedicine: Paracetamol\nPrice: 45\nQty: 1');
  const [complaintStatus, setComplaintStatus] = useState('');

  // Recommended Medicines Seeding (clinical images from professional stock)
  const recommendedMedicines = [
    {
      _id: 'm1',
      name: 'Paracetamol 650mg',
      brandName: 'Calpol 650',
      genericName: 'Acetaminophen',
      saltComposition: 'Paracetamol IP 650mg',
      category: 'Painkiller',
      desc: 'Fever and acute headache pain management',
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80'
    },
    {
      _id: 'm2',
      name: 'Amoxicillin 500mg',
      brandName: 'Mox 500',
      genericName: 'Amoxicillin Trihydrate',
      saltComposition: 'Amoxicillin 500mg',
      category: 'Antibiotic',
      desc: 'Broad spectrum anti-bacterial prescription',
      image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=400&q=80'
    },
    {
      _id: 'm3',
      name: 'Metformin 500mg',
      brandName: 'Glycomet 500',
      genericName: 'Metformin Hydrochloride',
      saltComposition: 'Metformin IP 500mg',
      category: 'Antihyperglycemic',
      desc: 'Chronic blood glucose and diabetes regulator',
      image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=400&q=80'
    },
    {
      _id: 'm4',
      name: 'Atorvastatin 10mg',
      brandName: 'Lipvas 10',
      genericName: 'Atorvastatin Calcium',
      saltComposition: 'Atorvastatin 10mg',
      category: 'Statin',
      desc: 'Cardiovascular control and lipid stabilizer',
      image: 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=400&q=80'
    },
    {
      _id: 'm5',
      name: 'Montelukast 10mg',
      brandName: 'Montair 10',
      genericName: 'Montelukast Sodium',
      saltComposition: 'Montelukast Sodium IP 10mg',
      category: 'Antiasthmatic',
      desc: 'Chronic asthma prevention and seasonal allergy relief',
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80'
    },
    {
      _id: 'm6',
      name: 'Loratadine 10mg',
      brandName: 'Claritin 10',
      genericName: 'Loratadine',
      saltComposition: 'Loratadine USP 10mg',
      category: 'Antihistamine',
      desc: '24-hour non-drowsy relief from seasonal allergy symptoms',
      image: 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=400&q=80'
    }
  ];

  // Widescreen Customer Profile states
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('medsafe_favorites');
    return saved ? JSON.parse(saved) : ['m1']; // Paracetamol seeded as fav
  });

  const [recentQueries, setRecentQueries] = useState(() => {
    const saved = localStorage.getItem('medsafe_recent_queries');
    return saved ? JSON.parse(saved) : ['Paracetamol', 'Metformin'];
  });

  const [showMap, setShowMap] = useState(false);
  const [customerTab, setCustomerTab] = useState('discovery'); // discovery, complaints, dashboard

  const toggleFavorite = (medId) => {
    const updated = favorites.includes(medId)
      ? favorites.filter(id => id !== medId)
      : [...favorites, medId];
    setFavorites(updated);
    localStorage.setItem('medsafe_favorites', JSON.stringify(updated));
    triggerNotification(favorites.includes(medId) ? 'Removed from favorites' : 'Saved to favorite medicines!');
  };

  // Pharmacy Portal States
  const [myPharmacy, setMyPharmacy] = useState(null);
  const [regForm, setRegForm] = useState({
    name: 'LifeCare Chemist & Druggist',
    ownerName: 'Devin Patel',
    address: 'Ground Floor, Tulip Plaza, Sector 4, Mumbai',
    contact: '+91 9998887776',
    drugLicense: 'DL-9041-MH3011',
    gstNumber: '27BBBBB2222B2Z2',
    storeTimings: '9 AM - 10 PM'
  });
  const [scheduleForm, setScheduleForm] = useState({
    preferredVisitDate: '2026-06-01',
    storeTimings: '9 AM - 10 PM',
    barcodeSystemAvailable: true,
    billingSoftwareAvailable: true,
    setupAssistanceRequirements: 'Need assistance setting up barcode scanner integration'
  });
  const [pharmacyInventory, setPharmacyInventory] = useState([]);
  const [newInvItem, setNewInvItem] = useState({ medicineId: '', price: '', stock: '' });
  const [allMedicines, setAllMedicines] = useState([]);
  const [billingSoftwareName, setBillingSoftwareName] = useState('MedSafe-Link v2');

  // Executive Panel States
  const [executiveAssignments, setExecutiveAssignments] = useState([]);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [checklist, setChecklist] = useState({
    licenceVerified: false,
    gstVerified: false,
    qualityChecked: false,
    noExpiredStock: false,
    barcodeConfigured: false,
    billingSynced: false,
    staffTrained: false
  });
  const [executiveNotes, setExecutiveNotes] = useState('');
  const [executiveRecommendation, setExecutiveRecommendation] = useState('Approved');

  // Admin Portal States
  const [adminPharmacies, setAdminPharmacies] = useState([]);
  const [adminComplaints, setAdminComplaints] = useState([]);
  const [adminReports, setAdminReports] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [assigningStoreId, setAssigningStoreId] = useState('');
  const [assigningExecId, setAssigningExecId] = useState('u3'); // default mock exec
  const [assigningDate, setAssigningDate] = useState('2026-05-30');

  // Simulated Mobile App States
  const [mobileScreen, setMobileScreen] = useState('home'); // home, search, barcode, scan_bill, checklist_step
  const [simulatedBarcode, setSimulatedBarcode] = useState('');
  const [scannedMedicine, setScannedMedicine] = useState(null);

  // Trigger Notifications
  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Sync / Load backend environment variables & health
  const syncServerStatus = async () => {
    const isOnline = await checkServerHealth();
    setServerOnline(isOnline);
  };

  // Initialize Data on Boot
  useEffect(() => {
    syncServerStatus();
    const saved = localStorage.getItem('medsafe_current_user');
    if (saved) {
      const user = JSON.parse(saved);
      setCurrentUser(user);
      setActiveRole(user.role);
      if (user.role === 'customer') {
        handleCustomerSearch('');
        loadCustomerComplaints();
      }
      else if (user.role === 'pharmacy') loadPharmacyData();
      else if (user.role === 'executive') loadExecutiveAssignments();
      else if (user.role === 'admin') loadAdminData();
    }
  }, []);

  const loadRoleUser = async (role) => {
    setLoading(true);
    try {
      let email = 'customer@medsafe.com';
      if (role === 'admin') email = 'admin@medsafe.com';
      if (role === 'pharmacy') email = 'pharmacy@medsafe.com';
      if (role === 'executive') email = 'executive@medsafe.com';

      const authData = await api.post('/auth/login', { email, password: 'password123' });
      if (authData && authData.user) {
        setCurrentUser(authData.user);
        setActiveRole(role);
        
        if (role === 'customer') {
          handleCustomerSearch('');
        } else if (role === 'pharmacy') {
          loadPharmacyData();
        } else if (role === 'executive') {
          loadExecutiveAssignments();
        } else if (role === 'admin') {
          loadAdminData();
        }
      }
    } catch (e) {
      triggerNotification('Authorization Sync Failed: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!authEmail || !authPassword) {
      triggerNotification('Please enter email and password.', 'warning');
      return;
    }
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email: authEmail, password: authPassword });
      if (data && data.user) {
        localStorage.setItem('medsafe_token', data.token);
        localStorage.setItem('medsafe_current_user', JSON.stringify(data.user));
        setCurrentUser(data.user);
        setActiveRole(data.user.role);
        triggerNotification(`Welcome back, ${beautifyName(data.user.name)}!`);
        
        if (data.user.role === 'customer') {
          handleCustomerSearch('');
        } else if (data.user.role === 'pharmacy') {
          loadPharmacyData();
        } else if (data.user.role === 'executive') {
          loadExecutiveAssignments();
        } else if (data.user.role === 'admin') {
          loadAdminData();
        }
      }
    } catch (err) {
      const isConnectionErr = err.message && err.message.toLowerCase().includes('connection');
      triggerNotification(isConnectionErr ? err.message : 'Invalid credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!authEmail || !authPassword || !authName) {
      triggerNotification('Please fill in name, email, and password.', 'warning');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', {
        name: authName,
        email: authEmail,
        password: authPassword,
        role: authRole
      });
      
      triggerNotification('Account registered successfully! Logging in...');
      
      const loginRes = await api.post('/auth/login', {
        email: authEmail,
        password: authPassword
      });
      
      if (loginRes && loginRes.user) {
        localStorage.setItem('medsafe_token', loginRes.token);
        localStorage.setItem('medsafe_current_user', JSON.stringify(loginRes.user));
        
        if (authRole === 'pharmacy') {
          await api.post('/pharmacies', {
            name: authName + ' Pharmacy Store',
            ownerName: authName,
            address: authAddress || 'Pending Address Entry',
            contact: authContact || 'Pending Contact Entry',
            drugLicense: authDrugLicense || 'DL-PENDING-ACTIVATION',
            gstNumber: authGSTNumber || 'GST-PENDING-ACTIVATION',
            storeTimings: '9 AM - 9 PM'
          });
        }
        
        setCurrentUser(loginRes.user);
        setActiveRole(loginRes.user.role);
        
        if (loginRes.user.role === 'customer') {
          handleCustomerSearch('');
        } else if (loginRes.user.role === 'pharmacy') {
          loadPharmacyData();
        } else if (loginRes.user.role === 'executive') {
          loadExecutiveAssignments();
        } else if (loginRes.user.role === 'admin') {
          loadAdminData();
        }
      }
    } catch (err) {
      triggerNotification(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('medsafe_token');
    localStorage.removeItem('medsafe_current_user');
    setCurrentUser(null);
    setMyPharmacy(null);
    setPharmacyInventory([]);
    setSearchResults([]);
    setSelectedMedicine(null);
    setRecommendations(null);
    triggerNotification('Successfully signed out.');
  };

  const handleDemoAutofill = async (demo) => {
    setAuthEmail(demo.email);
    setAuthPassword(demo.password);
    setAuthRole(demo.role);
    
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email: demo.email, password: demo.password });
      if (data && data.user) {
        setCurrentUser(data.user);
        setActiveRole(data.user.role);
        triggerNotification(`Demo Sign In: ${beautifyName(data.user.name)} (${data.user.role.toUpperCase()})`);
        
        if (data.user.role === 'customer') {
          handleCustomerSearch('');
        } else if (data.user.role === 'pharmacy') {
          loadPharmacyData();
        } else if (data.user.role === 'executive') {
          loadExecutiveAssignments();
        } else if (data.user.role === 'admin') {
          loadAdminData();
        }
      }
    } catch (err) {
      triggerNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerComplaints = async () => {
    try {
      const data = await api.get('/customer/my-complaints');
      setMyComplaints(data || []);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    }
  };

  useEffect(() => {
    if (currentUser && activeRole === 'customer') {
      loadCustomerComplaints();
    }
  }, [customerTab, activeRole]);

  // Load customer lists
  const handleCustomerSearch = async (val) => {
    try {
      const data = await api.get(`/customer/search?query=${val || ''}`);
      setSearchResults(data || []);
      
      // Do not auto-select any store listing on search. Let the user manually select.
      setSelectedResults([]);
      
      setShowMap(false); // Reset map toggle on fresh searches

      if (val) {
        const reco = await api.get(`/customer/recommendations?query=${val}`);
        setRecommendations(reco);
        
        // Log to recent query history array
        setRecentQueries(prev => {
          if (prev.includes(val)) return prev;
          const updated = [val, ...prev.slice(0, 4)];
          localStorage.setItem('medsafe_recent_queries', JSON.stringify(updated));
          return updated;
        });
      } else {
        setRecommendations(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch store pricing comparisons for a selected medicine catalog item
  const handleSelectMedicineForComparison = async (med) => {
    if (!med) return;
    setSelectedMedicine(med);
    setLoading(true);
    try {
      const data = await api.get(`/customer/search?query=${med.name}`);
      setSearchResults(data || []);
      setSelectedResults([]);
      setShowMap(false);

      const reco = await api.get(`/customer/recommendations?query=${med.name}`);
      setRecommendations(reco);
      
      // Log to recent query history
      setRecentQueries(prev => {
        if (prev.includes(med.name)) return prev;
        const updated = [med.name, ...prev.slice(0, 4)];
        localStorage.setItem('medsafe_recent_queries', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error(err);
      triggerNotification('Failed to fetch store price comparisons.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Synchronize profile form inputs with active user session
  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || '');
      setProfileEmail(currentUser.email || '');
    }
  }, [currentUser]);

  // Handle profile changes and update database details securely
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileName || !profileEmail) {
      triggerNotification('Name and email are required.', 'warning');
      return;
    }
    setLoading(true);
    try {
      const data = await api.post('/auth/profile/update', {
        name: profileName,
        email: profileEmail,
        password: profilePassword || undefined
      });
      if (data && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('medsafe_current_user', JSON.stringify(data.user));
        if (data.token) {
          localStorage.setItem('medsafe_token', data.token);
        }
        setProfilePassword(''); // Clear password field
        triggerNotification('Profile details updated successfully!');
      }
    } catch (err) {
      triggerNotification(err.message || 'Profile update failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load pharmacy metrics
  const loadPharmacyData = async () => {
    try {
      const store = await api.get('/pharmacies/my-store');
      setMyPharmacy(store);
      if (store) {
        const inv = await api.get(`/pharmacies/inventory?pharmacyId=${store._id}`);
        setPharmacyInventory(inv || []);
        
        // Fetch all global medicines
        const allMeds = JSON.parse(localStorage.getItem('medsafe_medicines') || '[]');
        setAllMedicines(allMeds);
      }
    } catch (err) {
      setMyPharmacy(null);
    }
  };

  // Onboard pharmacy registration (Step 1)
  const handlePharmacyRegistration = async (e) => {
    e.preventDefault();
    try {
      const store = await api.post('/pharmacies', regForm);
      setMyPharmacy(store);
      triggerNotification('Pharmacy Profile Registered Successfully! Status: Pending Verification');
      loadPharmacyData();
    } catch (err) {
      triggerNotification(err.message, 'error');
    }
  };

  // Request physical verification setup (Step 2)
  const handleRequestVerification = async (e) => {
    e.preventDefault();
    try {
      const updated = await api.post('/pharmacies/request-verification', scheduleForm);
      setMyPharmacy(updated);
      triggerNotification('Setup and Onboarding Request Submitted successfully!');
    } catch (err) {
      triggerNotification(err.message, 'error');
    }
  };

  // Add Inventory manually
  const handleAddInventory = async (e) => {
    e.preventDefault();
    if (!newInvItem.medicineId || !newInvItem.price || !newInvItem.stock) {
      triggerNotification('Please fill all fields', 'warning');
      return;
    }
    try {
      const medObj = allMedicines.find(m => m._id === newInvItem.medicineId);
      await api.post('/pharmacies/inventory/manage', {
        pharmacyId: myPharmacy._id,
        medicineId: newInvItem.medicineId,
        medicineName: medObj ? medObj.name : 'Unknown',
        price: newInvItem.price,
        stock: newInvItem.stock,
        isAvailable: true
      });
      triggerNotification('Inventory updated successfully!');
      setNewInvItem({ medicineId: '', price: '', stock: '' });
      loadPharmacyData();
    } catch (err) {
      triggerNotification(err.message, 'error');
    }
  };

  // Technical Sync simulation (Technical setup step 4-D)
  const handleSyncBillingSystem = async () => {
    try {
      await api.post('/pharmacies/inventory/sync-billing', {
        pharmacyId: myPharmacy._id,
        billingSystem: billingSoftwareName
      });
      triggerNotification('Billing software successfully connected and synchronized!');
      loadPharmacyData();
    } catch (err) {
      triggerNotification(err.message, 'error');
    }
  };

  // Customer Lodge Price Mismatch Dispute (Anti-Fraud Complaint Logging)
  const handleLodgeComplaint = async (e) => {
    e.preventDefault();
    if (!complaintPharmacyId || !complaintDesc) {
      triggerNotification('Please choose pharmacy and fill details', 'warning');
      return;
    }
    try {
      const res = await api.post('/customer/lodge-complaint', {
        pharmacyId: complaintPharmacyId,
        type: complaintType,
        description: complaintDesc,
        mockInvoiceText: complaintType === 'Price Mismatch' ? mockInvoiceText : ''
      });
      if (res.ocrPriceAlert) {
        triggerNotification('⚠️ Price mismatch detected on invoice! This issue has been logged for immediate audit review.', 'error');
      } else {
        triggerNotification('Dispute uploaded successfully. Audit reference initialized.');
      }
      setComplaintDesc('');
      setComplaintStatus('submitted');
      handleCustomerSearch(searchQuery);
    } catch (err) {
      triggerNotification(err.message, 'error');
    }
  };

  // Verification Executive assignments list
  const loadExecutiveAssignments = async () => {
    try {
      const list = await api.get('/executive/assignments');
      setExecutiveAssignments(list || []);
      if (list && list.length > 0) {
        setActiveAssignment(list[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Inspector checklist report (Step 5 Verification)
  const handleExecReportSubmit = async (e) => {
    e.preventDefault();
    if (!activeAssignment) return;
    try {
      await api.post('/executive/submit-report', {
        pharmacyId: activeAssignment._id,
        certificationStatus: checklist.licenceVerified && checklist.gstVerified ? 'Pass' : 'Fail',
        medicineQualityStatus: checklist.qualityChecked && checklist.noExpiredStock ? 'Pass' : 'Fail',
        inventorySetupStatus: checklist.barcodeConfigured && checklist.billingSynced ? 'Completed' : 'Pending',
        complianceNotes: executiveNotes,
        riskFlags: checklist.noExpiredStock ? [] : ['SUSPICIOUS_EXPIRED_STOCK'],
        recommendation: executiveRecommendation
      });
      triggerNotification('Physical Audit & Onboarding Report submitted to SuperAdmin Command.');
      setChecklist({
        licenceVerified: false,
        gstVerified: false,
        qualityChecked: false,
        noExpiredStock: false,
        barcodeConfigured: false,
        billingSynced: false,
        staffTrained: false
      });
      setExecutiveNotes('');
      loadExecutiveAssignments();
    } catch (err) {
      triggerNotification(err.message, 'error');
    }
  };

  // Load Admin metrics
  const loadAdminData = async () => {
    try {
      const stores = await api.get('/admin/pharmacies');
      setAdminPharmacies(stores || []);
      const comps = await api.get('/admin/complaints');
      setAdminComplaints(comps || []);
      const reps = await api.get('/admin/reports');
      setAdminReports(reps || []);
      const logs = await api.get('/admin/logs');
      setAdminLogs(logs || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Admin Allocates Verification executive (Step 3)
  const handleAssignExecutive = async (e) => {
    e.preventDefault();
    if (!assigningStoreId) return;
    try {
      await api.post('/admin/assign-executive', {
        pharmacyId: assigningStoreId,
        executiveId: assigningExecId,
        visitDate: assigningDate
      });
      triggerNotification('Verification Inspector dispatched to visit local pharmacy!');
      setAssigningStoreId('');
      loadAdminData();
    } catch (err) {
      triggerNotification(err.message, 'error');
    }
  };

  // Admin Grants final Onboard Approval (Step 6)
  const handleAdminApprovePharmacy = async (id, decision) => {
    try {
      await api.post('/admin/approve-pharmacy', {
        pharmacyId: id,
        decision,
        comments: 'Verified by Inspector on physical drug licensing authenticity check.'
      });
      triggerNotification(`Pharmacy review completed: ${decision.toUpperCase()}`);
      loadAdminData();
    } catch (err) {
      triggerNotification(err.message, 'error');
    }
  };

  // Admin Adjudicates dispute with warning penalty (Fraud Prevention)
  const handleAdjudicateComplaint = async (id, action) => {
    try {
      await api.post('/admin/complaints/adjudicate', {
        complaintId: id,
        action
      });
      triggerNotification(`Dispute processed: ${action === 'penalize' ? 'Store warnings escalated + Trust penalty applied' : 'Dispute dismissed'}`);
      loadAdminData();
    } catch (err) {
      triggerNotification(err.message, 'error');
    }
  };

  // Mobile App - Simulating barcode check
  const handleSimulateBarcodeScan = () => {
    const meds = JSON.parse(localStorage.getItem('medsafe_medicines') || '[]');
    const match = meds.find(m => m.barcode === simulatedBarcode);
    if (match) {
      setScannedMedicine(match);
      triggerNotification(`Barcode Scanned: [${match.brandName}] verified in Global Index.`);
    } else {
      setScannedMedicine(null);
      triggerNotification('Unknown Barcode. Non-compliant drug warning flagged!', 'error');
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
        {/* Toast Alert Notification */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg border shadow-2xl flex items-center gap-3 transition-all duration-300 ${
            notification.type === 'error' ? 'bg-red-950/80 border-red-500 text-red-200' :
            notification.type === 'warning' ? 'bg-yellow-950/80 border-yellow-500 text-yellow-200' :
            'bg-teal-950/80 border-teal-500 text-teal-200'
          }`}>
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        )}

        {/* Auth Screen Header */}
        <header className="glass border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal-500/10 p-2.5 rounded-xl border border-teal-500/25 relative glow-verified">
              <ShieldCheck className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-1.5">
                MedSafe <span className="text-xs px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/25">Medicine Platform</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">HYPERLOCAL MEDICINE SECURITY & TRANSPARENCY</p>
            </div>
          </div>
        </header>

        {/* Main Auth Container */}
        <div className="flex-1 flex items-center justify-center p-6 my-8">
          <div className="w-full max-w-lg glass border border-slate-800 rounded-3xl p-8 flex flex-col gap-6 shadow-2xl">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-100">
                {isRegister ? 'Create Secure Account' : 'Sign In to MedSafe'}
              </h2>
              <p className="text-xs text-slate-400 mt-1.5">
                {isRegister ? 'Register your role to begin compliance verification' : 'Please select your role and access credentials'}
              </p>
            </div>

            {/* Login / Register Toggle */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
              <button
                type="button"
                onClick={() => { setIsRegister(false); triggerNotification('Swapped to Sign In Panel'); }}
                className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition ${
                  !isRegister ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); triggerNotification('Swapped to Register Panel'); }}
                className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition ${
                  isRegister ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={isRegister ? handleRegisterSubmit : handleLoginSubmit} className="flex flex-col gap-4">
              
              {isRegister && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-mono">Full Legal Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="Enter full name"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-mono">Email Address</label>
                <input 
                  type="email"
                  required
                  placeholder="name@medsafe.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 transition font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-mono">Secret Password</label>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 transition"
                />
              </div>

              {isRegister && (
                <div className="flex flex-col gap-4 border-t border-slate-800 pt-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-400 font-mono">Target Platform Role</label>
                    <select
                      value={authRole}
                      onChange={(e) => setAuthRole(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none"
                    >
                      <option value="customer">Customer (Price Compare, Discover Stores)</option>
                      <option value="pharmacy">Pharmacy Store Owner (Register Profile, Sync Stocks)</option>
                      <option value="executive">Verification Deployed Inspector (Verification team)</option>
                      <option value="admin">SuperAdmin Control Panel (Platform Audit)</option>
                    </select>
                  </div>

                  {authRole === 'pharmacy' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-teal-500/5 rounded-xl border border-teal-500/10 animate-fade-in">
                      <span className="md:col-span-2 text-[10px] text-teal-400 font-mono uppercase tracking-wider block">Store Initial Setup Details</span>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 font-mono">Drug License Registration</label>
                        <input 
                          type="text" 
                          placeholder="e.g. DL-9041-MH3011"
                          value={authDrugLicense} 
                          onChange={(e) => setAuthDrugLicense(e.target.value)}
                          className="bg-slate-900 border border-slate-800 p-2 text-xs rounded text-white font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 font-mono">GST Registration</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 27BBBBB2222B2Z2"
                          value={authGSTNumber} 
                          onChange={(e) => setAuthGSTNumber(e.target.value)}
                          className="bg-slate-900 border border-slate-800 p-2 text-xs rounded text-white font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1 md:col-span-2">
                        <label className="text-[10px] text-slate-500 font-mono">Store Physical Address</label>
                        <input 
                          type="text" 
                          placeholder="Store address, zip-code"
                          value={authAddress} 
                          onChange={(e) => setAuthAddress(e.target.value)}
                          className="bg-slate-900 border border-slate-800 p-2 text-xs rounded text-white"
                        />
                      </div>
                      <div className="flex flex-col gap-1 md:col-span-2">
                        <label className="text-[10px] text-slate-500 font-mono">Store Direct Contact Phone</label>
                        <input 
                          type="text" 
                          placeholder="+91 XXXXXXXXXX"
                          value={authContact} 
                          onChange={(e) => setAuthContact(e.target.value)}
                          className="bg-slate-900 border border-slate-800 p-2 text-xs rounded text-white font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-slate-950 font-black text-xs py-3 rounded-xl transition hover:opacity-95 shadow-xl mt-2 flex items-center justify-center gap-1.5"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                {isRegister ? 'Create Secure Profile' : 'Authorize Secure Session'}
              </button>
            </form>

          </div>
        </div>

        {/* Footer */}
        <footer className="glass border-t border-slate-800 py-6 px-6 flex justify-between items-center text-[10px] text-slate-500">
          <span>© 2026 MedSafe Health Platforms. Distributed Hyperlocal Pricing Integrity System.</span>
          <span className="font-mono text-teal-600">HIPAA COMPLIANT SECURE NETWORK</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Toast Alert Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg border shadow-2xl flex items-center gap-3 transition-all duration-300 ${
          notification.type === 'error' ? 'bg-red-950/80 border-red-500 text-red-200' :
          notification.type === 'warning' ? 'bg-yellow-950/80 border-yellow-500 text-yellow-200' :
          'bg-teal-950/80 border-teal-500 text-teal-200'
        }`}>
          {notification.type === 'error' ? <AlertOctagon className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Main Premium Blur Header */}
      <header className="sticky top-0 z-40 glass border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-teal-500/10 p-2.5 rounded-xl border border-teal-500/25 relative glow-verified">
            <ShieldCheck className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-1.5">
              MedSafe
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">HYPERLOCAL DRUG SECURITY ECOSYSTEM</p>
          </div>
        </div>

      {/* User Profile & Logout Gate */}
      <div className="flex items-center gap-4">
        {currentUser && (
          <div className="flex items-center gap-3 bg-slate-950 px-4 py-1.5 rounded-xl border border-slate-800 animate-fade-in">
            <div 
              onClick={() => {
                if (currentUser.role === 'customer') {
                  setCustomerTab('dashboard');
                }
              }}
              className="flex flex-col text-right cursor-pointer hover:opacity-80 transition"
              title="View Health Profile Dashboard"
            >
              <span className="text-xs font-bold text-slate-100 leading-none border-b border-dashed border-teal-500/30 pb-0.5">{beautifyName(currentUser.name)}</span>
              <span className="text-[9px] font-mono text-teal-400 capitalize mt-0.5">{currentUser.role === 'executive' ? 'Verification Deployed Inspector' : currentUser.role}</span>
            </div>
            <div 
              onClick={() => {
                if (currentUser.role === 'customer') {
                  setCustomerTab('dashboard');
                }
              }}
              className="bg-teal-500/10 p-1.5 rounded-lg border border-teal-500/25 cursor-pointer hover:bg-teal-500/20 transition"
              title="View Health Profile Dashboard"
            >
              <User className="w-4 h-4 text-teal-400" />
            </div>
            <button 
              onClick={handleLogout}
              className="text-[10px] bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500 hover:text-white text-rose-400 px-3 py-1.5 rounded-lg transition font-mono"
            >
              Log Out
            </button>
          </div>
        )}
      </div>
      </header>

      {/* Main Dashboards Section */}
      <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-8">
        
        {/* Loading Overlay */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-teal-400 gap-3 font-mono">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>SYNCING PLATFORM ROLES...</span>
          </div>
        )}

        {!loading && (
          <div className="w-full flex flex-col gap-8">
              
              {/* ==================== 1. CUSTOMER DASHBOARD ==================== */}
              {activeRole === 'customer' && (
                <div className="w-full flex flex-col gap-6 relative">
                  
                  {/* Main Discovery and Workspace Area */}
                  <div className="w-full flex flex-col gap-6">
                    
                    {/* Customer Sub-navigation Tabs */}
                    <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1 w-full max-w-xl">
                      <button
                        onClick={() => {
                          setCustomerTab('discovery');
                        }}
                        className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          customerTab === 'discovery' 
                            ? 'bg-teal-500 text-slate-950 shadow-md font-extrabold' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Search className="w-3.5 h-3.5" />
                        Discover Medicines
                      </button>
                      <button
                        onClick={() => {
                          setCustomerTab('complaints');
                        }}
                        className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          customerTab === 'complaints' 
                            ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <AlertOctagon className="w-3.5 h-3.5" />
                        Dispute Center
                      </button>
                      <button
                        onClick={() => {
                          setCustomerTab('dashboard');
                        }}
                        className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          customerTab === 'dashboard' 
                            ? 'bg-sky-500 text-slate-950 shadow-md font-extrabold' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        Patient Dashboard
                      </button>
                    </div>

                    {customerTab === 'discovery' && (
                      <div className="flex flex-col gap-6 animate-fade-in">
                        {/* Search Section */}
                        <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
                          <div>
                            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                              <Search className="w-5 h-5 text-teal-400" /> Hyperlocal Drug Security Discovery
                            </h2>
                            <p className="text-xs text-slate-400">Search verified pharmacy listings nearby to compare live inventory pricing</p>
                          </div>
                          <div className="relative">
                            <Search className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
                            <input
                              type="text"
                              placeholder="Search medicines by name, category, or generic salt composition... (Press Enter to instantly compare)"
                              value={searchQuery}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSearchQuery(val);
                                if (val.trim() === '') {
                                  setSelectedMedicine(null);
                                  setSearchResults([]);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (selectedMedicine) {
                                    // Switch back to catalog page with the active filtered results
                                    setSelectedMedicine(null);
                                    setSearchResults([]);
                                  } else {
                                    const q = searchQuery.toLowerCase().trim();
                                    if (q) {
                                      const matched = recommendedMedicines.find(med => 
                                        med.name.toLowerCase().includes(q) ||
                                        med.brandName.toLowerCase().includes(q) ||
                                        med.genericName.toLowerCase().includes(q) ||
                                        med.saltComposition?.toLowerCase().includes(q) ||
                                        med.category.toLowerCase().includes(q)
                                      );
                                      if (matched) {
                                        handleSelectMedicineForComparison(matched);
                                      }
                                    }
                                  }
                                }
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-teal-500 text-white placeholder-slate-500 font-mono transition"
                            />
                            {searchQuery && (
                              <button
                                onClick={() => {
                                  setSearchQuery('');
                                  setSelectedMedicine(null);
                                  setSearchResults([]);
                                }}
                                className="absolute right-4 top-3.5 text-[10px] uppercase font-mono tracking-wider bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 px-2 py-1 rounded transition"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Search Results / Recommended Disclosures */}
                        {!selectedMedicine ? (
                          /* Mode A: Medicine Catalog Grid */
                          <div className="flex flex-col gap-5">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                                ⭐ {searchQuery.trim() ? 'Matching Catalog Medicines' : 'Recommended Clinical Essentials'}
                              </h3>
                              <span className="text-[10px] text-slate-500 font-mono">VERIFIED STOCK CATALOG</span>
                            </div>

                            {recommendedMedicines.filter(med => {
                              const q = searchQuery.toLowerCase().trim();
                              if (!q) return true;
                              return (
                                med.name.toLowerCase().includes(q) ||
                                med.brandName.toLowerCase().includes(q) ||
                                med.genericName.toLowerCase().includes(q) ||
                                med.saltComposition?.toLowerCase().includes(q) ||
                                med.category.toLowerCase().includes(q)
                              );
                            }).length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {recommendedMedicines
                                  .filter(med => {
                                    const q = searchQuery.toLowerCase().trim();
                                    if (!q) return true;
                                    return (
                                      med.name.toLowerCase().includes(q) ||
                                      med.brandName.toLowerCase().includes(q) ||
                                      med.genericName.toLowerCase().includes(q) ||
                                      med.saltComposition?.toLowerCase().includes(q) ||
                                      med.category.toLowerCase().includes(q)
                                    );
                                  })
                                  .map((med) => {
                                    const isFav = favorites.includes(med._id);
                                    return (
                                      <div
                                        key={med._id}
                                        className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all duration-300 flex flex-col group relative"
                                      >
                                        {/* Medicine Stock Image with Favorite Overlay */}
                                        <div className="h-44 relative overflow-hidden bg-slate-900">
                                          <img
                                            src={med.image}
                                            alt={med.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                          />
                                          
                                          {/* Favorite toggle overlay button */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleFavorite(med._id);
                                            }}
                                            className={`absolute top-3 right-3 p-2.5 rounded-full border transition duration-200 ${
                                              isFav
                                                ? 'bg-rose-500/20 border-rose-500 text-rose-500 glow-verified'
                                                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-400/50'
                                            }`}
                                            title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                                          >
                                            <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                                          </button>

                                          <span className="absolute bottom-3 left-4 px-2 py-0.5 rounded text-[10px] bg-teal-500/90 text-slate-950 font-bold uppercase tracking-wider font-mono">
                                            {med.category}
                                          </span>
                                        </div>

                                        {/* Body Info */}
                                        <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                                          <div>
                                            <h4 className="text-sm font-bold text-slate-100 group-hover:text-teal-400 transition">
                                              {med.name}
                                            </h4>
                                            <p className="text-xs text-slate-400 font-semibold font-mono mt-0.5">
                                              {med.brandName} • <span className="text-slate-500 font-normal">{med.genericName}</span>
                                            </p>
                                            <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                                              {med.desc}
                                            </p>
                                          </div>

                                          <button
                                            onClick={() => {
                                              setSearchQuery(med.name);
                                              handleSelectMedicineForComparison(med);
                                            }}
                                            className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-slate-950 font-black text-xs py-2.5 rounded-xl transition hover:opacity-95 shadow-md flex items-center justify-center gap-1.5"
                                          >
                                            Compare Pharmacy Prices
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            ) : (
                              <div className="text-center py-12 border border-slate-800 border-dashed rounded-2xl bg-slate-950/40 text-slate-500 leading-relaxed">
                                <Search className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                                <span className="text-sm font-bold text-slate-400 block mb-1">No Matching Medicines Found</span>
                                <span className="text-xs">No clinical medicines matching "{searchQuery}" were found in our verified catalog.</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Mode B: Live Store comparisons listed in a clinical table, then optimal savings best price */
                          <div className="flex flex-col gap-6 animate-fade-in">
                            <button
                              onClick={() => {
                                setSelectedMedicine(null);
                                setSearchQuery('');
                                setSearchResults([]);
                              }}
                              className="flex items-center gap-2 text-xs text-teal-400 hover:text-teal-300 font-bold font-mono transition bg-slate-950 border border-slate-800 hover:border-slate-700 px-4 py-2.5 rounded-xl self-start mb-1"
                            >
                              ← Back to Medicine Catalog
                            </button>

                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                              <span className="text-xs font-mono text-teal-400 uppercase tracking-wider">
                                {searchResults.length} Verified Drug Listings Found for <strong className="text-slate-100 text-xs font-sans font-bold">{selectedMedicine?.name}</strong>
                              </span>
                              <span className="text-xs text-slate-500">Sorted by price (lowest first)</span>
                            </div>

                            {searchResults.length > 0 ? (
                              <div className="flex flex-col gap-6">
                                
                                {/* 🏆 HIGHTLIGHTED OPTIMAL SAVINGS / BEST PRICE CARD */}
                                <div className="bg-slate-950 p-5 rounded-2xl border-2 border-teal-500 shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
                                  <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl"></div>
                                  <div className="flex items-start gap-3">
                                    <div className="bg-teal-500/10 p-2.5 rounded-xl border border-teal-500/20 text-teal-500">
                                      <Award className="w-6 h-6 text-teal-500" />
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-teal-500 font-mono uppercase tracking-wider block font-bold">🏆 Best Price Optimal Savings Match</span>
                                      <h4 className="text-sm font-bold text-slate-100 mt-0.5">
                                        {searchResults[0].pharmacy?.name}
                                      </h4>
                                      <p className="text-xs text-slate-600 mt-1">
                                        Optimal Rate: <strong className="text-teal-500 text-sm font-mono">${searchResults[0].price}</strong> per unit (Stock: {searchResults[0].stock} left)
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const bestResult = searchResults[0];
                                      const isBestSelected = selectedResults.some(r => r._id === bestResult._id);
                                      if (isBestSelected) {
                                        setSelectedResults(selectedResults.filter(r => r._id !== bestResult._id));
                                        triggerNotification(`${bestResult.pharmacy?.name} unselected.`);
                                      } else {
                                        setSelectedResults([...selectedResults, bestResult]);
                                        triggerNotification(`Selected Best Price of $${bestResult.price} at ${bestResult.pharmacy?.name}!`);
                                      }
                                    }}
                                    className={`font-black text-xs py-2.5 px-4 rounded-xl transition shadow-md self-end sm:self-center ${
                                      selectedResults.some(r => r._id === searchResults[0]._id)
                                        ? 'bg-rose-500/20 border border-rose-500 text-rose-400 hover:bg-rose-500 hover:text-white'
                                        : 'bg-teal-500 hover:bg-teal-400 text-slate-950 font-black'
                                    }`}
                                  >
                                    {selectedResults.some(r => r._id === searchResults[0]._id) ? 'Unselect Store' : 'Select Best Price'}
                                  </button>
                                </div>

                                {/* 📊 CLINICAL PRICE COMPARISON TABLE */}
                                <div className="overflow-x-auto bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl">
                                  <table className="w-full text-xs text-left text-slate-400 border-collapse">
                                    <thead className="text-[10px] uppercase bg-slate-900/60 text-slate-500 font-mono border-b border-slate-800">
                                      <tr>
                                        <th className="py-3.5 px-5">Pharmacy Store</th>
                                        <th className="py-3.5 px-5">Trust rating</th>
                                        <th className="py-3.5 px-5 text-center">Stock level</th>
                                        <th className="py-3.5 px-5 text-right">Price</th>
                                        <th className="py-3.5 px-5 text-center">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {searchResults.map((result) => {
                                        const isSelected = selectedResults.some(r => r._id === result._id);
                                        const isBestPrice = result._id === searchResults[0]._id;
                                        return (
                                          <tr 
                                            key={result._id} 
                                            onClick={() => {
                                              if (isSelected) {
                                                setSelectedResults(selectedResults.filter(r => r._id !== result._id));
                                                triggerNotification(`${result.pharmacy?.name} unselected.`);
                                              } else {
                                                setSelectedResults([...selectedResults, result]);
                                                triggerNotification(`${result.pharmacy?.name} selected.`);
                                              }
                                            }}
                                            className={`border-b border-slate-900/80 hover:bg-slate-900/40 transition cursor-pointer ${
                                              isSelected ? 'bg-teal-950/10 border-l-2 border-l-teal-500' : ''
                                            }`}
                                          >
                                            <td className="py-4 px-5">
                                              <div className="flex flex-col gap-0.5">
                                                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                                                  {result.pharmacy?.name}
                                                  {isBestPrice && (
                                                    <span className="text-[8px] bg-teal-500/15 text-teal-400 border border-teal-500/25 px-1.5 py-0.2 rounded font-mono font-bold">
                                                      BEST PRICE
                                                    </span>
                                                  )}
                                                </span>
                                                <span className="text-[10px] text-slate-500 truncate max-w-[200px]">
                                                  📍 {result.pharmacy?.address}
                                                </span>
                                              </div>
                                            </td>
                                            <td className="py-4 px-5">
                                              <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                                result.pharmacy?.trustScore > 85 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' :
                                                'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                                              }`}>
                                                {result.pharmacy?.trustScore}%
                                              </span>
                                            </td>
                                            <td className="py-4 px-5 text-center font-mono">
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                result.stock > 10 ? 'bg-slate-900 text-slate-300' : 'bg-rose-500/10 text-rose-400'
                                              }`}>
                                                {result.stock} units left
                                              </span>
                                            </td>
                                            <td className="py-4 px-5 text-right text-teal-400 font-extrabold font-mono text-sm">
                                              ${result.price}
                                            </td>
                                            <td className="py-4 px-5 text-center">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (isSelected) {
                                                    setSelectedResults(selectedResults.filter(r => r._id !== result._id));
                                                    triggerNotification(`${result.pharmacy?.name} unselected.`);
                                                  } else {
                                                    setSelectedResults([...selectedResults, result]);
                                                    triggerNotification(`${result.pharmacy?.name} selected.`);
                                                  }
                                                }}
                                                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition ${
                                                  isSelected 
                                                    ? 'bg-rose-500/20 border border-rose-500 text-rose-400 hover:bg-rose-500 hover:text-white' 
                                                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                                                }`}
                                              >
                                                {isSelected ? 'Unselect' : 'Select'}
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Progressive Map disclosure trigger */}
                                {selectedResults.length > 0 && (
                                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col gap-4">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-900 pb-3">
                                      <div>
                                        <h4 className="text-xs font-bold text-slate-100 font-mono flex items-center gap-2">
                                          🗺️ Dynamic Route Map ({selectedResults.length} Selected)
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                          {selectedResults.map(result => (
                                            <span 
                                              key={result._id}
                                              className="text-[9px] font-mono bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-md px-2 py-0.5 flex items-center gap-1.5 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 cursor-pointer transition"
                                              onClick={() => {
                                                setSelectedResults(selectedResults.filter(r => r._id !== result._id));
                                                triggerNotification(`${result.pharmacy?.name} unselected.`);
                                              }}
                                              title="Click to remove from map"
                                            >
                                              {result.pharmacy?.name}
                                              <span className="font-bold text-rose-400">×</span>
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => setShowMap(!showMap)}
                                        className={`py-2.5 px-4 rounded-xl text-xs font-bold font-mono transition flex items-center justify-center gap-2 ${
                                          showMap
                                            ? 'bg-rose-500/10 border border-rose-500/25 text-rose-400 hover:bg-rose-500 hover:text-white shadow-md shadow-rose-500/5'
                                            : 'bg-teal-500/10 border border-teal-500/25 text-teal-400 hover:bg-teal-500 hover:text-slate-950 shadow-md shadow-teal-500/5'
                                        }`}
                                      >
                                        <MapPin className="w-4 h-4" />
                                        {showMap ? 'Hide Route Map' : '🗺️ View Store Location & Map Routing'}
                                      </button>
                                    </div>

                                    {/* Custom SVG road map, conditional showing */}
                                    {showMap && (
                                      <div className="h-64 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden flex items-center justify-center animate-fade-in">
                                        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
                                          <defs>
                                            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                                              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                                            </pattern>
                                          </defs>
                                          <rect width="100%" height="100%" fill="url(#grid)" />
                                        </svg>
                                        
                                        {/* Radial roads simulation */}
                                        <div className="absolute w-28 h-28 border border-slate-700/20 rounded-full"></div>
                                        <div className="absolute w-56 h-56 border border-slate-700/20 rounded-full"></div>
                                        <div className="absolute h-[1px] w-full bg-slate-700/20"></div>
                                        <div className="absolute w-[1px] h-full bg-slate-700/20"></div>

                                        {/* Dynamic Route Lines to all selected pharmacies */}
                                        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                                          {selectedResults.map((result, idx) => {
                                            const storeCoords = {
                                              'Wellness Forever Pharmacy': { x: 30, y: 35 },
                                              'Apollo Pharmacy Prime': { x: 75, y: 25 },
                                              'MedPlus SuperChemists': { x: 25, y: 75 },
                                              'Aster Pharmacy': { x: 80, y: 65 },
                                              'Guardian Healthcare': { x: 45, y: 20 },
                                              'LifeCare Chemist & Druggist': { x: 60, y: 80 }
                                            };
                                            const coords = storeCoords[result.pharmacy?.name] || { x: 30, y: 40 };
                                            return (
                                              <line 
                                                key={idx}
                                                x1="50" 
                                                y1="50" 
                                                x2={coords.x} 
                                                y2={coords.y} 
                                                stroke="#0ea5e9" 
                                                strokeWidth="0.8" 
                                                strokeDasharray="1.5,1.5" 
                                                className="animate-pulse" 
                                              />
                                            );
                                          })}
                                        </svg>

                                        {/* Customer pin (Center) */}
                                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                                          <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white animate-pulse"></div>
                                          <span className="text-[9px] text-slate-100 font-mono mt-1">Your Location</span>
                                        </div>

                                        {/* Dynamic Pharmacy pins mapping */}
                                        {selectedResults.map((result, idx) => {
                                          const storeCoords = {
                                            'Wellness Forever Pharmacy': { x: 30, y: 35 },
                                            'Apollo Pharmacy Prime': { x: 75, y: 25 },
                                            'MedPlus SuperChemists': { x: 25, y: 75 },
                                            'Aster Pharmacy': { x: 80, y: 65 },
                                            'Guardian Healthcare': { x: 45, y: 20 },
                                            'LifeCare Chemist & Druggist': { x: 60, y: 80 }
                                          };
                                          const coords = storeCoords[result.pharmacy?.name] || { x: 30, y: 40 };
                                          return (
                                            <div 
                                              key={idx}
                                              className="absolute z-10 flex flex-col items-center cursor-pointer transition duration-300 scale-105 hover:scale-110"
                                              style={{
                                                left: `${coords.x}%`,
                                                top: `${coords.y}%`,
                                                transform: 'translate(-50%, -50%)'
                                              }}
                                              onClick={() => {
                                                setSelectedResults(selectedResults.filter(r => r._id !== result._id));
                                                triggerNotification(`${result.pharmacy?.name} unselected.`);
                                              }}
                                              title="Click to remove from map"
                                            >
                                              <MapPin className="w-5 h-5 text-teal-400 fill-teal-950/50 filter drop-shadow-md glow-verified rounded-full" />
                                              <span className="text-[8px] bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-teal-300 mt-1 font-mono whitespace-nowrap">
                                                {result.pharmacy?.name}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Generic Alternatives Recommendations */}
                                {recommendations && recommendations.targetMedicine && (
                                  <div className="bg-white p-6 rounded-2xl border border-blue-200 shadow-sm flex flex-col gap-4">
                                    <div className="flex items-center gap-2 text-blue-700">
                                      <TrendingUp className="w-5 h-5" />
                                      <h3 className="text-[10px] text-teal-500 font-mono uppercase tracking-wider block font-bold">AI Generic Savings Advisory Engine</h3>
                                    </div>
                                    
                                    <div className="text-sm font-bold text-slate-100 mt-0.5">
                                      You searched for <strong className="text-blue-700">{recommendations.targetMedicine.brandName}</strong>. 
                                      Its active compound is <strong className="text-blue-700">{recommendations.targetMedicine.genericName}</strong>.
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2">
                                      <span className="text-[10px] text-slate-500 font-mono uppercase">Generic Alternatives Available Nearby:</span>
                                      {recommendations.alternatives && recommendations.alternatives.length > 0 ? (
                                        <div className="flex flex-col gap-1.5">
                                          {recommendations.alternatives.map((alt, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs">
                                              <span className="text-[10px] text-teal-500 font-mono uppercase tracking-wider block font-bold">{alt.name}</span>
                                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-mono border border-emerald-200">
                                                Save up to 45%
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-slate-600 text-xs">This salt composition is the most cost-effective generic variant listed in this zip-code.</span>
                                      )}
                                    </div>

                                    <div className="text-xs text-slate-600 font-mono">
                                      📊 <strong>Demand Forecast:</strong> {recommendations.demandForecast}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="py-12 border border-slate-800 border-dashed rounded-2xl text-center text-slate-400 flex flex-col items-center gap-2">
                                <HelpCircle className="w-10 h-10 text-slate-600" />
                                <p className="text-sm">No medicines matching your query.</p>
                                <p className="text-xs text-slate-500">Type "Paracetamol" or "Metformin" to discover verified stores.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {customerTab === 'complaints' && (
                      <div className="flex flex-col gap-6 animate-fade-in">
                        <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl">
                          <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                            <AlertOctagon className="w-5 h-5 text-amber-600" /> Anti-Fraud Price Mismatch Center
                          </h3>
                          <p className="text-xs text-amber-800 mt-1">
                            If a pharmacy charged you a higher price than declared on MedSafe, lodge a pricing dispute ticket below. 
                            Our verification system will review the submitted invoice to verify the pricing discrepancy and resolve the issue.
                          </p>
                        </div>

                        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                          <form onSubmit={handleLodgeComplaint} className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-slate-400">Select Store Involved</label>
                                <select 
                                  value={complaintPharmacyId}
                                  onChange={(e) => setComplaintPharmacyId(e.target.value)}
                                  className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs focus:outline-none text-white font-sans"
                                >
                                  <option value="">-- Choose Pharmacy --</option>
                                  <option value="p1">Wellness Forever Pharmacy</option>
                                  <option value="p2">LifeCare Chemist & Druggist</option>
                                </select>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-slate-400">Report Category</label>
                                <select
                                  value={complaintType}
                                  onChange={(e) => { setCustomerTab('discovery'); setComplaintType(e.target.value); }}
                                  className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs focus:outline-none text-white font-sans"
                                >
                                  <option value="Price Mismatch">Price Mismatch</option>
                                  <option value="Fake Medicine">Suspicious Medicine Packaging / Fake Medicine</option>
                                  <option value="Other">Non-compliant behavior / Expired Stock</option>
                                </select>
                              </div>
                            </div>

                            {complaintType === 'Price Mismatch' && (
                              <div className="flex flex-col gap-2 p-4 bg-slate-900 rounded-xl border border-slate-800">
                                <span className="text-xs font-mono text-amber-400 flex items-center gap-1.5">
                                  <Barcode className="w-4 h-4" /> Invoice Bill Simulator
                                </span>
                                <p className="text-[10px] text-slate-500">Edit this simulated invoice text to test the anti-fraud analyzer. If invoice price exceeds the listed price ($15), it flags mismatch fraud.</p>
                                <textarea
                                  value={mockInvoiceText}
                                  onChange={(e) => setMockInvoiceText(e.target.value)}
                                  rows="4"
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-teal-400 font-mono focus:outline-none"
                                />
                              </div>
                            )}

                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs text-slate-400">Description of Violation</label>
                              <textarea
                                placeholder="Describe details of the mismatch, packaging inconsistencies, or compliance breaches..."
                                value={complaintDesc}
                                onChange={(e) => setComplaintDesc(e.target.value)}
                                rows="3"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs focus:outline-none text-white"
                              />
                            </div>

                            <button
                              type="submit"
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-3 px-5 rounded-xl transition self-end shadow-md"
                            >
                              Submit Fraud Dispute Ticket & Parse Invoice
                            </button>
                          </form>
                        </div>
                      </div>
                    )}

                    {customerTab === 'dashboard' && (
                      <div className="flex flex-col gap-6 animate-fade-in">
                        {/* Title header */}
                        <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl"></div>
                          <div className="flex items-center gap-3">
                            <div className="bg-sky-500/10 p-3 rounded-xl border border-sky-500/20 text-sky-400">
                              <User className="w-6 h-6" />
                            </div>
                            <div>
                              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                Patient Health Profile & Security Desk
                              </h2>
                              <p className="text-xs text-slate-400">Manage your security profile, saved favorite medicines, and active price disputes.</p>
                            </div>
                          </div>
                        </div>

                        {/* Widescreen stats rows */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 flex flex-col gap-1 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl"></div>
                            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">HIPAA PROTECTION LEVEL</span>
                            <span className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5 font-mono">
                              <ShieldCheck className="w-4 h-4 text-emerald-400" /> SECURE & COMPLIANT
                            </span>
                            <p className="text-[10px] text-slate-500 mt-1">Your personal and medical information is fully protected.</p>
                          </div>
                          
                          <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 flex flex-col gap-1 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-sky-500/5 rounded-full blur-xl"></div>
                            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">PATIENT UNIQUE ID</span>
                            <span className="text-xs font-semibold text-slate-300 truncate mt-1.5 font-mono">
                              MS-PAT-{currentUser.id?.toUpperCase() || 'MOCK_ID'}
                            </span>
                            <p className="text-[10px] text-slate-500 mt-1">Your unique patient identifier for secure checkouts.</p>
                          </div>

                          <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 flex flex-col gap-1 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl"></div>
                            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block">ACTIVE DISPUTES</span>
                            <span className="text-sm font-bold text-slate-100 mt-1 font-mono">
                              {myComplaints.length} Lodged Tickets
                            </span>
                            <p className="text-[10px] text-slate-500 mt-1">Track and resolve reported pharmacy pricing mismatches.</p>
                          </div>
                        </div>

                        {/* Split Dashboard Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                          
                          {/* Secure Favorites Shelf */}
                          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                              <h3 className="text-sm font-extrabold font-mono uppercase text-slate-300 flex items-center gap-1.5">
                                <Heart className="w-4 h-4 text-rose-500 fill-current" /> Clinical Essentials Favorites Shelf
                              </h3>
                              <span className="text-xs font-mono text-slate-500">{favorites.length} Saved Essentials</span>
                            </div>

                            {favorites.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {recommendedMedicines
                                  .filter(med => favorites.includes(med._id))
                                  .map(med => (
                                    <div 
                                      key={med._id}
                                      className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 flex justify-between items-start gap-4 hover:border-slate-700 transition"
                                    >
                                      <div className="flex flex-col gap-1">
                                        <span className="text-xs font-bold text-slate-100 font-mono">{med.name}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">{med.brandName} • <span className="text-slate-500">{med.genericName}</span></span>
                                        <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{med.desc}</p>
                                        
                                        <button
                                          onClick={() => {
                                            setSearchQuery(med.name);
                                            handleSelectMedicineForComparison(med);
                                            setCustomerTab('discovery');
                                            triggerNotification(`Searching prices for ${med.name}`);
                                          }}
                                          className="text-[10px] font-bold text-teal-400 hover:text-teal-300 font-mono mt-3 self-start border border-teal-500/20 px-3 py-1 rounded bg-teal-500/5 hover:bg-teal-500/10 transition"
                                        >
                                          Compare Store Prices →
                                        </button>
                                      </div>
                                      <button
                                        onClick={() => toggleFavorite(med._id)}
                                        className="text-rose-500 hover:text-slate-500 p-2 rounded-lg bg-rose-500/5 hover:bg-slate-800 border border-rose-500/10 hover:border-transparent transition"
                                        title="Unfavorite"
                                      >
                                        <Heart className="w-4 h-4 fill-current" />
                                      </button>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="py-10 text-center border border-slate-900 border-dashed rounded-xl text-xs text-slate-500">
                                No favorite medicines saved. Heart a medicine card in the catalog to pin it here.
                              </div>
                            )}
                          </div>

                          {/* Profile Details Edit Card */}
                          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
                            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                              <h3 className="text-sm font-extrabold font-mono uppercase text-slate-300 flex items-center gap-1.5 font-bold">
                                <Settings className="w-4 h-4 text-teal-400" /> Security Profile Settings
                              </h3>
                              <span className="text-xs font-mono text-slate-500">Edit Credentials</span>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4 mt-2">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-slate-400 font-mono">Full Legal Name</label>
                                <input 
                                  type="text"
                                  required
                                  value={profileName}
                                  onChange={(e) => setProfileName(e.target.value)}
                                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:border-teal-500 transition font-sans"
                                  placeholder="Enter legal name"
                                />
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-slate-400 font-mono">Secure Email Address</label>
                                <input 
                                  type="email"
                                  required
                                  value={profileEmail}
                                  onChange={(e) => setProfileEmail(e.target.value)}
                                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:border-teal-500 transition font-mono"
                                  placeholder="name@email.com"
                                />
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-slate-400 font-mono">New Secret Password (leave blank to keep current)</label>
                                <input 
                                  type="password"
                                  value={profilePassword}
                                  onChange={(e) => setProfilePassword(e.target.value)}
                                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-650 focus:outline-none focus:border-teal-500 transition"
                                  placeholder="••••••••"
                                />
                              </div>

                              <button
                                type="submit"
                                className="bg-gradient-to-r from-teal-500 to-teal-600 text-slate-950 font-black text-xs py-3 rounded-xl transition hover:opacity-95 shadow-md mt-2 flex items-center justify-center gap-1.5"
                              >
                                Save Profile Changes
                              </button>
                            </form>
                          </div>
                        </div>

                        {/* Lodged Mismatches Resolution tracking */}
                        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
                          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                            <h3 className="text-sm font-extrabold font-mono uppercase text-slate-300 flex items-center gap-1.5">
                              <AlertOctagon className="w-4 h-4 text-amber-500" /> Lodged Pricing Disputes & Violations Audit Trail
                            </h3>
                            <span className="text-xs font-mono text-slate-500">{myComplaints.length} Tickets Lodged</span>
                          </div>

                          {myComplaints.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left text-slate-400 border-collapse">
                                <thead className="text-[10px] uppercase bg-slate-900/60 text-slate-500 font-mono border-b border-slate-800">
                                  <tr>
                                    <th className="py-3 px-4">Accused Store</th>
                                    <th className="py-3 px-4">Violation Type</th>
                                    <th className="py-3 px-4">Dispute details</th>
                                    <th className="py-3 px-4 text-center">Ticket Status</th>
                                    <th className="py-3 px-4 text-right">Action / Response</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {myComplaints.map(comp => (
                                    <tr key={comp._id} className="border-b border-slate-900 last:border-0 hover:bg-slate-900/30 transition">
                                      <td className="py-3.5 px-4 font-bold text-slate-200">{comp.pharmacyName}</td>
                                      <td className="py-3.5 px-4">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                                          comp.type === 'Price Mismatch' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-slate-900 text-slate-400'
                                        }`}>
                                          {comp.type}
                                        </span>
                                      </td>
                                      <td className="py-3.5 px-4 max-w-[200px] truncate text-slate-400 font-mono text-[11px]" title={comp.description}>
                                        {comp.description}
                                      </td>
                                      <td className="py-3.5 px-4 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                          comp.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400' :
                                          comp.status === 'Dismissed' ? 'bg-slate-800 text-slate-400' :
                                          'bg-amber-500/10 text-amber-400 animate-pulse'
                                        }`}>
                                          {comp.status}
                                        </span>
                                      </td>
                                      <td className="py-3.5 px-4 text-right font-mono text-[10px] text-slate-500">
                                        {comp.responseFromPharmacy ? (
                                          <div className="flex flex-col gap-0.5 max-w-[150px] ml-auto text-left">
                                            <span className="text-[8px] text-teal-400 font-bold uppercase">Pharmacy Response:</span>
                                            <span className="text-[10px] text-slate-300 italic truncate" title={comp.responseFromPharmacy}>
                                              "{comp.responseFromPharmacy}"
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="italic">Awaiting review</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="py-8 text-center text-slate-500 text-xs border border-slate-900 border-dashed rounded-xl leading-relaxed">
                              No disputes lodged yet. If you are overcharged at any store, file a ticket in the <strong className="text-amber-500 cursor-pointer" onClick={() => setCustomerTab('complaints')}>Dispute Center</strong> tab.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>



                </div>
              )}

              {/* ==================== 2. PHARMACY DESK PORTAL ==================== */}
              {activeRole === 'pharmacy' && (
                <div className="flex flex-col gap-8">
                  
                  {/* Status Banner */}
                  {myPharmacy ? (
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-mono text-slate-500">PHARMACY ONBOARDING ID: {myPharmacy._id}</span>
                          <h2 className="text-base font-bold text-slate-100 mt-1">{myPharmacy.name}</h2>
                          <p className="text-xs text-slate-400">{myPharmacy.address}</p>
                        </div>
                        
                        {/* Onboarding Stage Badging */}
                        <div className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                          myPharmacy.status === 'Approved & Verified' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 glow-verified' :
                          myPharmacy.status === 'Verification Requested' ? 'bg-blue-500/10 border-blue-500 text-blue-400' :
                          myPharmacy.status === 'Executive Assigned' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 animate-pulse' :
                          'bg-amber-500/10 border-amber-500 text-amber-400'
                        }`}>
                          {myPharmacy.status}
                        </div>
                      </div>

                      {/* Onboarding Workflow Pipeline tracker */}
                      <div className="mt-4">
                        <h3 className="text-xs font-bold font-mono text-slate-400 mb-6 uppercase tracking-wider">Pharmacy Activation Timeline</h3>
                        
                        {/* Stepper Timeline */}
                        <div className="grid grid-cols-4 gap-2 relative">
                          <div className="absolute top-3 left-6 right-6 h-[2px] bg-slate-800 -z-10"></div>
                          
                          {[
                            { step: 'Register', active: true, desc: 'Store details & licenses uploaded' },
                            { step: 'Setup Request', active: ['Verification Requested', 'Executive Assigned', 'Verification In Progress', 'Under Admin Review', 'Approved & Verified'].includes(myPharmacy.status), desc: 'Booked physical audit' },
                            { step: 'Physical Audit', active: ['Executive Assigned', 'Verification In Progress', 'Under Admin Review', 'Approved & Verified'].includes(myPharmacy.status), desc: 'Inspector checklist sync' },
                            { step: 'Verified Badge', active: myPharmacy.status === 'Approved & Verified', desc: 'Public pricing live' }
                          ].map((s, idx) => (
                            <div key={idx} className="flex flex-col items-center text-center px-1">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border font-mono text-xs font-bold transition duration-300 ${
                                s.active ? 'bg-teal-500 border-teal-500 text-white shadow-lg shadow-teal-500/20' : 'bg-slate-900 border-slate-800 text-slate-500'
                              }`}>
                                {s.active ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                              </div>
                              <span className={`text-xs mt-1.5 font-bold transition ${s.active ? 'text-slate-100' : 'text-slate-500'}`}>{s.step}</span>
                              <span className="text-[8px] text-slate-500 mt-1 hidden md:block">{s.desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* If pending request, let store initiate Verification Request */}
                      {myPharmacy.status === 'Pending Verification Request' && (
                        <div className="mt-6 border-t border-slate-800 pt-6 flex flex-col gap-4">
                          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 p-4 rounded-xl text-xs text-amber-200">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400" />
                            <div>
                              <strong className="block text-amber-300 font-bold mb-1">Step 2 Required: Setup Assistance & Onboarding Request</strong>
                              Your pharmacy profile is registered offline, but cannot sell or be discovered until an official app-side Verification Executive physically visits your store to perform compliance checks, document verification, and configure barcode scanner systems.
                            </div>
                          </div>

                          <form onSubmit={handleRequestVerification} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-slate-400 font-mono">Preferred Visit Date</label>
                              <input 
                                type="date" 
                                value={scheduleForm.preferredVisitDate}
                                onChange={(e) => setScheduleForm({ ...scheduleForm, preferredVisitDate: e.target.value })}
                                className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-slate-400 font-mono">Store Operational Timings</label>
                              <input 
                                type="text"
                                placeholder="e.g. 9 AM - 10 PM"
                                value={scheduleForm.storeTimings}
                                onChange={(e) => setScheduleForm({ ...scheduleForm, storeTimings: e.target.value })}
                                className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                              />
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={scheduleForm.barcodeSystemAvailable}
                                  onChange={(e) => setScheduleForm({ ...scheduleForm, barcodeSystemAvailable: e.target.checked })}
                                  className="accent-teal-500"
                                />
                                Barcode Scanner Available
                              </label>
                              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={scheduleForm.billingSoftwareAvailable}
                                  onChange={(e) => setScheduleForm({ ...scheduleForm, billingSoftwareAvailable: e.target.checked })}
                                  className="accent-teal-500"
                                />
                                Billing Software Installed
                              </label>
                            </div>
                            <div className="md:col-span-2 flex flex-col gap-1">
                              <label className="text-[10px] text-slate-400 font-mono">Setup Assistance Requirements</label>
                              <textarea
                                placeholder="Describe any technical assistance, training or barcode integrations required..."
                                value={scheduleForm.setupAssistanceRequirements}
                                onChange={(e) => setScheduleForm({ ...scheduleForm, setupAssistanceRequirements: e.target.value })}
                                rows="2"
                                className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                              />
                            </div>
                            <button
                              type="submit"
                              className="md:col-span-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs py-3 rounded-lg transition"
                            >
                              Request Physical Verification Visit
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Step 1: Register Profile form */
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col gap-6">
                      <div>
                        <h2 className="text-xl font-bold text-slate-100">Join MedSafe Trusted Pharmacy Platform</h2>
                        <p className="text-xs text-slate-400 mt-1">Register your pharmacy profile to start physical verification onboarding. Verified drug licenses are legally required.</p>
                      </div>

                      <form onSubmit={handlePharmacyRegistration} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-400">Registered Pharmacy/Store Name</label>
                          <input 
                            type="text" 
                            required
                            value={regForm.name}
                            onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-400">Pharmacist/Owner Full Name</label>
                          <input 
                            type="text" 
                            required
                            value={regForm.ownerName}
                            onChange={(e) => setRegForm({ ...regForm, ownerName: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-400">Drug License Registration No (DL No.)</label>
                          <input 
                            type="text" 
                            required
                            value={regForm.drugLicense}
                            onChange={(e) => setRegForm({ ...regForm, drugLicense: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-400">GST Registration Number</label>
                          <input 
                            type="text" 
                            required
                            value={regForm.gstNumber}
                            onChange={(e) => setRegForm({ ...regForm, gstNumber: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono"
                          />
                        </div>
                        <div className="md:col-span-2 flex flex-col gap-1">
                          <label className="text-xs text-slate-400">Physical Store Address</label>
                          <input 
                            type="text" 
                            required
                            value={regForm.address}
                            onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-400">Direct Store Phone Contact</label>
                          <input 
                            type="text" 
                            required
                            value={regForm.contact}
                            onChange={(e) => setRegForm({ ...regForm, contact: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-400">Store Timings</label>
                          <input 
                            type="text" 
                            value={regForm.storeTimings}
                            onChange={(e) => setRegForm({ ...regForm, storeTimings: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white"
                          />
                        </div>
                        <button
                          type="submit"
                          className="md:col-span-2 bg-gradient-to-r from-teal-500 to-teal-600 text-slate-950 font-extrabold text-xs py-3 rounded-xl transition hover:opacity-90 shadow-xl mt-3"
                        >
                          Step 1: Create Pharmacy Profile
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Real-time Inventory management desk (If profile exists, even if unverified) */}
                  {myPharmacy && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      
                      {/* Inventory Sync Card */}
                      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-mono">
                          <RefreshCw className="w-4 h-4 text-teal-400" /> Automated Billing Sync (Step 4-D)
                        </h3>
                        <p className="text-xs text-slate-400">Connect your local retail pharmacy billing system (Tally, Marg, Medilite) to automatically synchronize catalog price levels and real-time stocks.</p>
                        
                        <div className="flex flex-col gap-3 mt-2">
                          <div className="flex items-center gap-2">
                            <input 
                              type="text" 
                              value={billingSoftwareName}
                              onChange={(e) => setBillingSoftwareName(e.target.value)}
                              className="bg-slate-900 border border-slate-800 p-2 text-xs rounded-lg flex-1 text-white font-mono"
                            />
                            <button
                              onClick={handleSyncBillingSystem}
                              className="bg-slate-800 hover:bg-slate-700 text-teal-400 border border-teal-500/30 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1"
                            >
                              Sync System
                            </button>
                          </div>
                          
                          <div className="text-[10px] text-slate-500 font-mono">
                            Sync Status: <strong>{myPharmacy.inventoryUpdateFrequency === 'Real-time Integrator' ? 'LINKED (Real-time)' : 'DISCONNECTED'}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Manual Medicine Entry */}
                      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-mono">
                          <Plus className="w-4 h-4 text-teal-400" /> Manual Stock Override
                        </h3>

                        <form onSubmit={handleAddInventory} className="flex flex-col gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-slate-500 font-mono">Select Medicine</label>
                            <select
                              value={newInvItem.medicineId}
                              onChange={(e) => setNewInvItem({ ...newInvItem, medicineId: e.target.value })}
                              className="bg-slate-900 border border-slate-800 rounded p-2 text-xs text-slate-200"
                            >
                              <option value="">-- Choose Medicine --</option>
                              {allMedicines.map(m => (
                                <option key={m._id} value={m._id}>{m.name} ({m.genericName})</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-slate-500 font-mono">Price ($)</label>
                              <input 
                                type="number" 
                                placeholder="Price"
                                value={newInvItem.price}
                                onChange={(e) => setNewInvItem({ ...newInvItem, price: e.target.value })}
                                className="bg-slate-900 border border-slate-800 p-2 text-xs rounded text-white"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-slate-500 font-mono">Stock Quantity</label>
                              <input 
                                type="number" 
                                placeholder="Stock count"
                                value={newInvItem.stock}
                                onChange={(e) => setNewInvItem({ ...newInvItem, stock: e.target.value })}
                                className="bg-slate-900 border border-slate-800 p-2 text-xs rounded text-white"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2 px-4 rounded mt-1"
                          >
                            Update Stock Entry
                          </button>
                        </form>
                      </div>

                      {/* Display Current Live Inventory */}
                      <div className="md:col-span-2 bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-teal-400" /> Current Store Inventory Stock List
                          </h3>
                          <span className="text-[10px] font-mono text-slate-500">{pharmacyInventory.length} Active SKUs</span>
                        </div>

                        {pharmacyInventory.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left text-slate-400">
                              <thead className="text-[10px] uppercase bg-slate-900 text-slate-500 font-mono border-b border-slate-800">
                                <tr>
                                  <th className="py-3 px-4">Medicine name</th>
                                  <th className="py-3 px-4">Listed Price</th>
                                  <th className="py-3 px-4">Current Stock</th>
                                  <th className="py-3 px-4">Availability</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pharmacyInventory.map(item => (
                                  <tr key={item._id} className="border-b border-slate-800 hover:bg-slate-900/50">
                                    <td className="py-3 px-4 font-bold text-slate-200">{item.medicineName}</td>
                                    <td className="py-3 px-4 text-teal-400 font-bold font-mono">${item.price}</td>
                                    <td className="py-3 px-4 font-mono">{item.stock} units</td>
                                    <td className="py-3 px-4">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                        item.isAvailable ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                      }`}>
                                        {item.isAvailable ? 'IN STOCK' : 'OUT OF STOCK'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="py-8 text-center text-slate-500 text-xs border border-slate-900 border-dashed rounded-xl">
                            Inventory is empty. Sync billing software above to populate medicines.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ==================== 3. VERIFICATION EXECUTIVE PANE ==================== */}
              {activeRole === 'executive' && (
                <div className="flex flex-col gap-6">
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-500/15 rounded-xl border border-indigo-500/25">
                        <ClipboardList className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-100">Verification Inspector Dashboard</h2>
                        <p className="text-xs text-slate-400">Perform physical onboarding checks and medicine verification audits</p>
                      </div>
                    </div>
                  </div>

                  {executiveAssignments.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                      
                      {/* Left: Active Selection List */}
                      <div className="flex flex-col gap-4">
                        <span className="text-xs font-mono uppercase text-slate-500 tracking-wider">Dispatched Visit Assignments</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {executiveAssignments.map(store => (
                            <div
                              key={store._id}
                              onClick={() => {
                                setActiveAssignment(store);
                                setChecklist({
                                  licenceVerified: false,
                                  gstVerified: false,
                                  qualityChecked: false,
                                  noExpiredStock: false,
                                  barcodeConfigured: false,
                                  billingSynced: false,
                                  staffTrained: false
                                });
                              }}
                              className={`p-4 rounded-xl border cursor-pointer transition ${
                                activeAssignment?._id === store._id 
                                  ? 'border-indigo-500 bg-indigo-950/10' 
                                  : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-bold text-slate-200">{store.name}</h4>
                                  <p className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">{store.address}</p>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[8px] bg-slate-900 border border-slate-800 text-indigo-300 font-mono uppercase">
                                  {store.status}
                                </span>
                              </div>
                              <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-400">
                                <span>Owner: {store.ownerName}</span>
                                <span className="text-indigo-400">Schedule: {store.visitScheduleDate || 'Today'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Checklist Report Submitter */}
                      {activeAssignment && (
                        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col gap-6">
                          <div>
                            <span className="text-[9px] font-mono text-slate-500 uppercase">PHYSICAL INSPECTION PROTOCOL</span>
                            <h3 className="text-sm font-bold text-slate-100 mt-1">Audit Questionnaire: {activeAssignment.name}</h3>
                            <p className="text-xs text-slate-400">Complete legal, clinical, and technical parameters during store inspection.</p>
                          </div>

                          <form onSubmit={handleExecReportSubmit} className="flex flex-col gap-6">
                            
                            {/* Certification Audit */}
                            <div className="flex flex-col gap-3">
                              <span className="text-xs font-bold text-teal-400 font-mono border-b border-slate-800 pb-1.5">A. Certification & Legal Verification (Step 4-A)</span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-300 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={checklist.licenceVerified}
                                    onChange={(e) => setChecklist({ ...checklist, licenceVerified: e.target.checked })}
                                    className="w-4 h-4 accent-indigo-500 rounded"
                                  />
                                  <span>Drug License DL Authenticity Verified</span>
                                </label>
                                <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-300 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={checklist.gstVerified}
                                    onChange={(e) => setChecklist({ ...checklist, gstVerified: e.target.checked })}
                                    className="w-4 h-4 accent-indigo-500 rounded"
                                  />
                                  <span>GST Certificate matches state records</span>
                                </label>
                              </div>
                            </div>

                            {/* Medicine Quality Audit */}
                            <div className="flex flex-col gap-3">
                              <span className="text-xs font-bold text-teal-400 font-mono border-b border-slate-800 pb-1.5">B. Medicine Quality & Safety Verification (Step 4-B)</span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-300 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={checklist.qualityChecked}
                                    onChange={(e) => setChecklist({ ...checklist, qualityChecked: e.target.checked })}
                                    className="w-4 h-4 accent-indigo-500 rounded"
                                  />
                                  <span>Storage temperature check passed (2-8°C/Cold Chain)</span>
                                </label>
                                <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-300 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={checklist.noExpiredStock}
                                    onChange={(e) => setChecklist({ ...checklist, noExpiredStock: e.target.checked })}
                                    className="w-4 h-4 accent-indigo-500 rounded"
                                  />
                                  <span>Inspected drug shelves (Zero Expired SKU found)</span>
                                </label>
                              </div>
                            </div>

                            {/* Technical Audit */}
                            <div className="flex flex-col gap-3">
                              <span className="text-xs font-bold text-teal-400 font-mono border-b border-slate-800 pb-1.5">C. Technical & Inventory Setup (Step 4-C/D)</span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-300 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={checklist.barcodeConfigured}
                                    onChange={(e) => setChecklist({ ...checklist, barcodeConfigured: e.target.checked })}
                                    className="w-4 h-4 accent-indigo-500 rounded"
                                  />
                                  <span>MedSafe barcode scanner calibrated</span>
                                </label>
                                <label className="flex items-center gap-3 p-3 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-300 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={checklist.billingSynced}
                                    onChange={(e) => setChecklist({ ...checklist, billingSynced: e.target.checked })}
                                    className="w-4 h-4 accent-indigo-500 rounded"
                                  />
                                  <span>Billing Sync API integrator successfully linked</span>
                                </label>
                              </div>
                            </div>

                            {/* Verification Recommendation */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-slate-400 font-medium">Final Audit Recommendation (Step 5)</label>
                                <select
                                  value={executiveRecommendation}
                                  onChange={(e) => setExecutiveRecommendation(e.target.value)}
                                  className="bg-slate-900 border border-slate-700 p-3 text-xs rounded-xl focus:outline-none text-white font-mono"
                                >
                                  <option value="Approved">Approved (Certifications Authentic, Inventory Accurate)</option>
                                  <option value="Needs Corrections">Needs Corrections (Fix expired stock, update labels)</option>
                                  <option value="Rejected">Rejected (Fraudulent license, high risk factors)</option>
                                </select>
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-slate-400 font-medium">Verification Executive Assessment Notes</label>
                                <input 
                                  type="text" 
                                  placeholder="Type notes on drug legitimacy, storage conditions..."
                                  value={executiveNotes}
                                  onChange={(e) => setExecutiveNotes(e.target.value)}
                                  className="bg-slate-900 border border-slate-700 p-3 text-xs rounded-xl focus:outline-none text-white"
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 px-6 rounded-xl transition self-end"
                            >
                              Submit Audit Report to Admin Panel
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-12 border border-slate-800 border-dashed rounded-2xl text-center text-slate-500 text-xs">
                      No visit assignments dispatched. Go to Command Center (Admin) to assign this Inspector.
                    </div>
                  )}
                </div>
              )}

              {/* ==================== 4. SUPERADMIN COMMAND CENTER ==================== */}
              {activeRole === 'admin' && (
                <div className="flex flex-col gap-8">
                  
                  {/* KPI Statistics Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Verified Pharmacies', val: adminPharmacies.filter(p => p.status === 'Approved & Verified').length, sub: 'Publicly live', icon: ShieldCheck, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                      { label: 'Pending Visits', val: adminPharmacies.filter(p => p.status === 'Verification Requested').length, sub: 'Needs inspector', icon: ClipboardList, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                      { label: 'Active Disputes', val: adminComplaints.filter(c => c.status === 'Pending').length, sub: 'Awaiting review', icon: AlertOctagon, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
                      { label: 'Trust Integrity', val: '98.6%', sub: 'Platform average', icon: Award, color: 'text-teal-400 bg-teal-500/10 border-teal-500/20' }
                    ].map((kpi, idx) => {
                      const Icon = kpi.icon;
                      return (
                        <div key={idx} className={`p-4 rounded-xl border bg-slate-950 flex flex-col gap-2 ${kpi.color.split(' ')[2]}`}>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{kpi.label}</span>
                            <div className={`p-1.5 rounded-lg border ${kpi.color.split(' ').slice(0,2).join(' ')}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                          </div>
                          <span className="text-sm font-bold text-slate-100 font-mono mt-1">{kpi.val}</span>
                          <span className="text-[9px] text-slate-500">{kpi.sub}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Assign Verification Executive (Step 3 Workspace) */}
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-indigo-400" /> Executive Deployment Hub (Step 3)
                    </h3>
                    <p className="text-xs text-slate-400">Admin assigns physically closest inspector to visit pharmacies that submitted onboarding requests.</p>

                    <form onSubmit={handleAssignExecutive} className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
                      <div className="flex flex-col gap-1 md:col-span-2">
                        <label className="text-[10px] text-slate-500 font-mono">Pending Pharmacy Request</label>
                        <select
                          required
                          value={assigningStoreId}
                          onChange={(e) => setAssigningStoreId(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded p-2.5 text-xs text-slate-100"
                        >
                          <option value="">-- Choose Store --</option>
                          {adminPharmacies.filter(p => p.status === 'Verification Requested').map(store => (
                            <option key={store._id} value={store._id}>{store.name} ({store.address})</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-500 font-mono">Assign Inspector</label>
                        <select
                          value={assigningExecId}
                          onChange={(e) => setAssigningExecId(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded p-2.5 text-xs text-slate-100"
                        >
                          <option value="u3">Inspector Vikram (Active)</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-lg md:self-end"
                      >
                        Deploy Inspector
                      </button>
                    </form>
                  </div>

                  {/* Pending Audits Approval desk (Step 6 Workspace) */}
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" /> Physical Audit Approvals Workspace (Step 6)
                    </h3>
                    <p className="text-xs text-slate-400">Review physical verification reports uploaded by deployed Inspectors and grant the trusted verified badge.</p>

                    {adminPharmacies.filter(p => p.status === 'Under Admin Review').length > 0 ? (
                      <div className="flex flex-col gap-4 mt-2">
                        {adminPharmacies.filter(p => p.status === 'Under Admin Review').map(store => {
                          // Find corresponding report if any
                          const rep = adminReports.find(r => r.pharmacyId === store._id);
                          return (
                            <div key={store._id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-sm font-bold text-slate-100">{store.name}</h4>
                                  <p className="text-xs text-slate-400">{store.address}</p>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[8px] bg-slate-950 border border-slate-800 text-amber-300 font-mono uppercase">
                                  {store.status}
                                </span>
                              </div>

                              {rep && (
                                <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-2 text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold font-mono text-[10px] text-slate-400">INSPECTION REPORT BY: {rep.executiveName}</span>
                                    <span className="font-bold text-emerald-400 font-mono text-[10px]">RECOMMENDATION: {rep.recommendation}</span>
                                  </div>
                                  <p className="text-slate-300 font-mono text-[11px]">"{rep.complianceNotes || 'Inspection complete, certificates validated successfully. Storage temperature within constraints.'}"</p>
                                </div>
                              )}

                              <div className="flex gap-2 self-end">
                                <button
                                  onClick={() => handleAdminApprovePharmacy(store._id, 'correct')}
                                  className="px-3 py-1.5 rounded border border-slate-850 hover:bg-slate-800 text-xs text-slate-400 transition"
                                >
                                  Request Corrections
                                </button>
                                <button
                                  onClick={() => handleAdminApprovePharmacy(store._id, 'approve')}
                                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white transition flex items-center gap-1.5"
                                >
                                  <Check className="w-3.5 h-3.5" /> Approve & Verify Store
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-6 border border-slate-900 border-dashed rounded-xl text-center text-slate-500 text-xs font-mono">
                        Zero reports awaiting SuperAdmin review.
                      </div>
                    )}
                  </div>

                  {/* Anti-Fraud Price disputes Center */}
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <AlertOctagon className="w-5 h-5 text-rose-500" /> Active Mismatch Pricing Disputes
                    </h3>
                    <p className="text-xs text-slate-400">Real-time listing of customer-reported violations. If an invoice scan matches inflated rates, penalize the pharmacy instantly. (3 Warnings results in automated Platform Bans!)</p>

                    {adminComplaints.filter(c => c.status === 'Pending').length > 0 ? (
                      <div className="flex flex-col gap-4 mt-2">
                        {adminComplaints.filter(c => c.status === 'Pending').map(comp => (
                          <div key={comp._id} className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex flex-col gap-3">
                            <div className="flex justify-between items-start text-xs">
                              <div>
                                <span className="text-[10px] text-slate-500 font-mono">DISPUTE ID: {comp._id}</span>
                                <h4 className="text-sm font-bold text-slate-100 mt-0.5">Accused: {comp.pharmacyName}</h4>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[9px] bg-red-500/10 text-red-400 font-mono font-bold uppercase border border-red-500/25">
                                {comp.type}
                              </span>
                            </div>

                            <p className="text-xs text-slate-300 font-mono bg-slate-950 p-2.5 rounded border border-slate-850">
                              "{comp.description}"
                            </p>

                            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                              <span>Reported By: {comp.customerName}</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAdjudicateComplaint(comp._id, 'dismiss')}
                                  className="px-2.5 py-1 rounded bg-slate-850 hover:bg-slate-800 text-slate-400 transition"
                                >
                                  Dismiss Dispute
                                </button>
                                <button
                                  onClick={() => handleAdjudicateComplaint(comp._id, 'penalize')}
                                  className="px-3 py-1 rounded bg-gradient-to-r from-amber-600 to-rose-600 text-white font-bold transition flex items-center gap-1"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" /> Enforce Penalty Alert
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 border border-slate-900 border-dashed rounded-xl text-center text-slate-500 text-xs font-mono">
                        Zero active pricing mismatches flagged.
                      </div>
                    )}
                  </div>

                  {/* Audit Logs Workspace Viewer */}
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" /> Platform Compliance Security Audit Trail
                    </h3>
                    <p className="text-xs text-slate-400">Strict tamper-proof log trail recording pharmacy registrations, executive audit reports, and billing sync actions.</p>

                    <div className="h-48 overflow-y-auto border border-slate-800 bg-slate-900 rounded-xl p-3.5 flex flex-col gap-2 font-mono text-[10px]">
                      {adminLogs.map((log, i) => (
                        <div key={i} className="border-b border-slate-800 pb-1.5 last:border-b-0">
                          <span className="text-slate-500">[{log.timestamp?.split('T')[1]?.slice(0,8) || 'Time'}]</span>{' '}
                          <span className="text-teal-400 uppercase">({log.actorRole})</span>{' '}
                          <span className="text-sm font-bold text-slate-100 font-bold">{log.actorName}</span>{' '}
                          <span className="text-slate-400">{log.action}:</span>{' '}
                          <span className="text-slate-300 font-sans">{log.details}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}
      </main>

      {/* Styled Footer */}
      <footer className="mt-auto glass border-t border-slate-800 py-6 px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-500" />
          <span>© 2026 MedSafe Health Platforms. Distributed Hyperlocal Pricing Integrity System.</span>
        </div>
        <div className="flex gap-4">
          <span className="hover:text-slate-300 cursor-pointer">Transparency Protocol</span>
          <span>•</span>
          <span className="hover:text-slate-300 cursor-pointer">Anti-Fraud Agreement</span>
        </div>
      </footer>
    </div>
  );
}
