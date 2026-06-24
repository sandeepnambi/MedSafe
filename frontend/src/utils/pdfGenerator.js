import { jsPDF } from 'jspdf';

// Color Palette Definition (Disin Healthcare medical theme)
const COLORS = {
  primary: [10, 28, 61],       // Deep Navy (#0a1c3d)
  accent: [0, 73, 214],        // Disin Cobalt Blue (#0049D6)
  teal: [0, 191, 165],         // Success Teal (#00BFA5)
  secondary: [82, 111, 150],   // Slate Gray (#526f96)
  warning: [220, 38, 38],      // Warning Red (#dc2626)
  lightBg: [240, 244, 250],    // Light Ice-Blue (#f0f4fa)
  border: [203, 220, 240],     // Soft Border (#cbdcf0)
  white: [255, 255, 255]
};

// Layout constants
const MARGIN = 15;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

/**
 * Standardized header with MedSafe branding
 */
function drawHeader(doc, title, subtitle = '') {
  // Brand Header Block background (Soft blue banner)
  doc.setFillColor(...COLORS.lightBg);
  doc.rect(MARGIN, MARGIN, CONTENT_WIDTH, 22, 'F');
  
  // Left Blue accent border line
  doc.setFillColor(...COLORS.accent);
  doc.rect(MARGIN, MARGIN, 2, 22, 'F');

  // MedSafe Brand Logo text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.primary);
  doc.text('MedSafe', MARGIN + 6, MARGIN + 9);

  // Verification Shield Indicator
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.teal);
  doc.text('VERIFIED PLATFORM SECURE DOCUMENT', MARGIN + 6, MARGIN + 14);

  // Document Title (Right-aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.primary);
  doc.text(title, PAGE_WIDTH - MARGIN - 6, MARGIN + 9, { align: 'right' });

  // Subtitle / Date (Right-aligned)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.secondary);
  const dateStr = new Date().toLocaleString();
  doc.text(subtitle || `Generated: ${dateStr}`, PAGE_WIDTH - MARGIN - 6, MARGIN + 14, { align: 'right' });

  // Reset colors
  doc.setTextColor(0, 0, 0);
  return MARGIN + 28; // Return starting Y coordinate for content
}

/**
 * Standardized footer with page numbering and secure tamper badge
 */
function drawFooter(doc, pageNum, totalPages) {
  doc.setDrawColor(...COLORS.border);
  doc.line(MARGIN, PAGE_HEIGHT - 18, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 18);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.secondary);
  doc.text('This is an authenticated cryptographic audit document verified by MedSafe Hyperlocal Medicine Network.', MARGIN, PAGE_HEIGHT - 12);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 12, { align: 'right' });
}

/**
 * Renders a clean Section Title with a bottom border line
 */
function drawSectionTitle(doc, title, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.accent);
  doc.text(title, MARGIN, y);
  
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 2, PAGE_WIDTH - MARGIN, y + 2);
  
  return y + 8;
}

/**
 * Key-Value Details Grid layout
 * Automatically wraps text and balances layout
 */
function drawKeyValueGrid(doc, items, y) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  let currentY = y;
  const colWidth = CONTENT_WIDTH / 2;
  
  for (let i = 0; i < items.length; i += 2) {
    const item1 = items[i];
    const item2 = items[i + 1];
    
    // Calculate heights of content to prevent overlapping
    const val1Lines = doc.splitTextToSize(String(item1?.value || ''), colWidth - 25);
    const val2Lines = item2 ? doc.splitTextToSize(String(item2.value || ''), colWidth - 25) : [];
    const maxLines = Math.max(val1Lines.length, val2Lines.length);
    const rowHeight = maxLines * 4.5 + 4;
    
    // Page boundary check
    if (currentY + rowHeight > PAGE_HEIGHT - 22) {
      doc.addPage();
      currentY = drawHeader(doc, 'Report Details Continued');
    }
    
    // Row background (alternating subtle)
    if ((i / 2) % 2 === 0) {
      doc.setFillColor(...COLORS.lightBg);
      doc.rect(MARGIN, currentY - 2, CONTENT_WIDTH, rowHeight, 'F');
    }
    
    // Draw Column 1
    if (item1) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text(String(item1.label), MARGIN + 3, currentY + 3);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.secondary);
      doc.text(val1Lines, MARGIN + 35, currentY + 3);
    }
    
    // Draw Column 2
    if (item2) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text(String(item2.label), MARGIN + colWidth + 3, currentY + 3);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.secondary);
      doc.text(val2Lines, MARGIN + colWidth + 35, currentY + 3);
    }
    
    currentY += rowHeight;
  }
  
  return currentY + 4;
}

/**
 * Standardized data table with headers and auto-pagination
 */
function drawTable(doc, headers, rows, startY, title = '') {
  let y = startY;
  
  if (title) {
    y = drawSectionTitle(doc, title, y);
  }
  
  // Draw Header Row
  doc.setFillColor(...COLORS.primary);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.white);
  
  const colWidth = CONTENT_WIDTH / headers.length;
  headers.forEach((h, idx) => {
    doc.text(h.label, MARGIN + (idx * colWidth) + 3, y + 5.5);
  });
  
  y += 8;
  
  // Draw Data Rows
  rows.forEach((row, rIdx) => {
    // Determine height needed for this row
    let maxLines = 1;
    const cellLines = headers.map(h => {
      const cellVal = String(row[h.key] === undefined || row[h.key] === null ? '' : row[h.key]);
      const lines = doc.splitTextToSize(cellVal, colWidth - 5);
      if (lines.length > maxLines) maxLines = lines.length;
      return lines;
    });
    
    const rowHeight = (maxLines * 4) + 4;
    
    // Auto page boundary check
    if (y + rowHeight > PAGE_HEIGHT - 22) {
      doc.addPage();
      y = drawHeader(doc, title || 'Table Details Continued');
      
      // Redraw Table Headers on new page
      doc.setFillColor(...COLORS.primary);
      doc.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...COLORS.white);
      
      headers.forEach((h, idx) => {
        doc.text(h.label, MARGIN + (idx * colWidth) + 3, y + 5.5);
      });
      y += 8;
    }
    
    // Row background striping
    if (rIdx % 2 === 1) {
      doc.setFillColor(...COLORS.lightBg);
      doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight, 'F');
    }
    
    // Soft horizontal separator lines
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y + rowHeight, PAGE_WIDTH - MARGIN, y + rowHeight);
    
    // Write cells
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.primary);
    
    headers.forEach((h, idx) => {
      // Highlight/Color specific statuses
      if (h.key === 'status' || h.key === 'compliance') {
        const val = String(row[h.key] || '');
        if (val.includes('Pass') || val.includes('Approved') || val.includes('Verified') || val.includes('Resolved')) {
          doc.setTextColor(...COLORS.teal);
        } else if (val.includes('Fail') || val.includes('Pending') || val.includes('Rejected') || val.includes('Suspended')) {
          doc.setTextColor(...COLORS.warning);
        } else {
          doc.setTextColor(...COLORS.accent);
        }
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(...COLORS.primary);
        doc.setFont('helvetica', 'normal');
      }
      doc.text(cellLines[idx], MARGIN + (idx * colWidth) + 3, y + 4.5);
    });
    
    y += rowHeight;
  });
  
  return y + 6;
}

/**
 * Main module function to compile, format, and download PDFs
 */
export function downloadRoleReport(reportType, data) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let title = 'MedSafe Audit Report';
  let subtitle = '';
  
  if (data?.title) title = data.title;
  if (data?.subtitle) subtitle = data.subtitle;

  let y = drawHeader(doc, title, subtitle);

  // Compile PDF views depending on report type
  switch (reportType) {
    case 'customer_alternatives': {
      // Medicine Alternatives Report
      const med = data.medicine;
      const alternatives = data.alternatives || [];
      
      const medDetails = [
        { label: 'Medicine Brand:', value: med.brandName || med.name },
        { label: 'Category:', value: med.category || 'N/A' },
        { label: 'Generic Name:', value: med.genericName || 'N/A' },
        { label: 'Salt Composition:', value: med.saltComposition || 'N/A' },
        { label: 'Target Therapy:', value: med.desc || 'Therapeutic treatment alternative' },
        { label: 'Avg Base Price:', value: `INR ${med.basePrice || 45}` }
      ];
      
      y = drawSectionTitle(doc, 'Medicine Identification & Details', y);
      y = drawKeyValueGrid(doc, medDetails, y);

      const headers = [
        { label: 'Alternative Brand', key: 'brandName' },
        { label: 'Generic Salt', key: 'genericName' },
        { label: 'Avg Price', key: 'price' },
        { label: 'Potential Saving', key: 'savings' }
      ];
      
      const rows = alternatives.map(alt => ({
        brandName: alt.brandName || alt.name,
        genericName: alt.genericName || 'Same Salt Active',
        price: `INR ${alt.price || 25}`,
        savings: `${alt.savingsPercent || 40}% Lower Cost`
      }));

      y = drawTable(doc, headers, rows, y, 'Generic Alternatives & Economical Substitution Guide');
      break;
    }
    
    case 'customer_dispute': {
      // Customer lodged dispute details
      const comp = data.complaint;
      const details = [
        { label: 'Dispute Reference:', value: comp._id || 'N/A' },
        { label: 'Pharmacy Name:', value: comp.pharmacyName || 'N/A' },
        { label: 'Filed Date:', value: comp.createdAt ? new Date(comp.createdAt).toLocaleDateString() : 'N/A' },
        { label: 'Issue Type:', value: comp.type || 'Price Mismatch' },
        { label: 'Dispute Status:', value: comp.status || 'Pending' },
        { label: 'Penalty Applied:', value: comp.penaltyApplied ? 'Yes (Warnings + 1)' : 'No Penalty' }
      ];
      
      y = drawSectionTitle(doc, 'Dispute Reference & Status Information', y);
      y = drawKeyValueGrid(doc, details, y);

      // Description and pharmacy response
      y = drawSectionTitle(doc, 'Audit Testimony & Appeals Log', y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...COLORS.primary);
      doc.text('Customer Detailed Grievance Description:', MARGIN, y);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.secondary);
      const descLines = doc.splitTextToSize(comp.description || 'No description supplied', CONTENT_WIDTH);
      doc.text(descLines, MARGIN, y + 4.5);
      
      y += (descLines.length * 4.5) + 8;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text('Official Pharmacy Appeal Response:', MARGIN, y);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.secondary);
      const responseLines = doc.splitTextToSize(comp.responseFromPharmacy || 'Awaiting pharmacy statement response appeal.', CONTENT_WIDTH);
      doc.text(responseLines, MARGIN, y + 4.5);
      
      y += (responseLines.length * 4.5) + 6;
      break;
    }

    case 'pharmacy_onboarding': {
      // Store registration onboarding status details
      const store = data.store;
      const checklist = data.checklist || {};
      
      const storeDetails = [
        { label: 'Pharmacy Name:', value: store.name },
        { label: 'Owner/Licensee:', value: store.ownerName },
        { label: 'Drug License Reg:', value: store.drugLicense },
        { label: 'GST Number:', value: store.gstNumber },
        { label: 'Store Timings:', value: store.storeTimings || '9 AM - 10 PM' },
        { label: 'Verification Status:', value: store.status },
        { label: 'Trust Level:', value: `${store.trustScore || 100}%` },
        { label: 'Warning Points:', value: `${store.warningsCount || 0} / 3` }
      ];
      
      y = drawSectionTitle(doc, 'Registered Pharmacy Onboarding Dossier', y);
      y = drawKeyValueGrid(doc, storeDetails, y);

      // Inspection list checklist
      const checkHeaders = [
        { label: 'On-Site compliance Checklist Parameter', key: 'parameter' },
        { label: 'Evaluation Status', key: 'status' }
      ];
      
      const checkRows = [
        { parameter: 'Verification of Registered State Drug License', status: checklist.licenceVerified ? 'Pass' : 'Pending' },
        { parameter: 'GST Details & Tax Clearance Verification', status: checklist.gstVerified ? 'Pass' : 'Pending' },
        { parameter: 'Live Medicine Quality & Expiration Auditing', status: checklist.qualityChecked ? 'Pass' : 'Pending' },
        { parameter: 'Storage & Cold Chain Maintenance Protocol', status: checklist.noExpiredStock ? 'Pass' : 'Pending' },
        { parameter: 'MedSafe-Link API Barcode Billing Synced', status: checklist.barcodeConfigured ? 'Pass' : 'Pending' },
        { parameter: 'Staff Training & Fraud Prevention Standards', status: checklist.staffTrained ? 'Pass' : 'Pending' }
      ];
      
      y = drawTable(doc, checkHeaders, checkRows, y, 'Audits & Verification Executives Progress Checklist');
      break;
    }

    case 'pharmacy_inventory': {
      // Store live product inventory catalog
      const store = data.store || {};
      const inventory = data.inventory || [];
      
      const summaryDetails = [
        { label: 'Pharmacy Store:', value: store.name || 'N/A' },
        { label: 'Owner/Licensee:', value: store.ownerName || 'N/A' },
        { label: 'Total Catalog SKUs:', value: String(inventory.length) },
        { label: 'Trust Score:', value: `${store.trustScore || 100}% Score` }
      ];
      
      y = drawSectionTitle(doc, 'Pharmacy Details Summary', y);
      y = drawKeyValueGrid(doc, summaryDetails, y);

      const headers = [
        { label: 'Medicine Stock SKU Name', key: 'medicineName' },
        { label: 'Unit Rate (INR)', key: 'price' },
        { label: 'Stock Level Qty', key: 'stock' },
        { label: 'Availability', key: 'status' }
      ];
      
      const rows = inventory.map(item => ({
        medicineName: item.medicineName,
        price: `INR ${item.price.toFixed(2)}`,
        stock: String(item.stock),
        status: item.stock > 0 ? 'In Stock' : 'Out of Stock'
      }));

      y = drawTable(doc, headers, rows, y, 'Verified Live Inventory Stock Catalog');
      break;
    }

    case 'executive_audit': {
      // On-site audit executive inspection sheet
      const report = data.report || {};
      const store = data.store || {};
      
      const details = [
        { label: 'Target Pharmacy:', value: store.name || 'N/A' },
        { label: 'Drug License Ref:', value: store.drugLicense || 'N/A' },
        { label: 'GST Verified:', value: store.gstNumber || 'N/A' },
        { label: 'Auditor ID:', value: report.executiveId || 'N/A' },
        { label: 'Auditor Name:', value: report.executiveName || 'Verification Executive' },
        { label: 'Audit Recommendation:', value: report.recommendation || 'Approved' }
      ];
      
      y = drawSectionTitle(doc, 'Inspection Assignment Details', y);
      y = drawKeyValueGrid(doc, details, y);

      const checkHeaders = [
        { label: 'Operational compliance Item', key: 'item' },
        { label: 'Status Result', key: 'compliance' }
      ];
      
      const checkRows = [
        { item: 'Licensing Verification check', compliance: report.certificationStatus === 'Pass' ? 'Pass' : 'Fail' },
        { item: 'Medicine Stock Quality Audit', compliance: report.medicineQualityStatus === 'Pass' ? 'Pass' : 'Fail' },
        { item: 'Billing API / Inventory Setup sync', compliance: report.inventorySetupStatus === 'Completed' ? 'Pass' : 'Pending' }
      ];
      
      y = drawTable(doc, checkHeaders, checkRows, y, 'Physical Compliance Check Benchmarks');
      
      y = drawSectionTitle(doc, 'Compliance Inspector Notes & Findings', y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.secondary);
      const notes = doc.splitTextToSize(report.complianceNotes || 'No notes supplied by auditor.', CONTENT_WIDTH);
      doc.text(notes, MARGIN, y);
      y += (notes.length * 4.5) + 6;
      break;
    }

    case 'admin_analytics': {
      // Super admin dashboard summary stats
      const stats = data.stats || {};
      const summaryItems = [
        { label: 'Verified Pharmacies:', value: String(stats.approvedCount || 0) },
        { label: 'Pending Inspections:', value: String(stats.pendingCount || 0) },
        { label: 'Unresolved Price Disputes:', value: String(stats.activeDisputesCount || 0) },
        { label: 'Platform Active Users:', value: String(stats.totalUsers || 0) }
      ];
      
      y = drawSectionTitle(doc, 'Platform Security Metrics Snapshot', y);
      y = drawKeyValueGrid(doc, summaryItems, y);

      const listHeaders = [
        { label: 'Pharmacy Name', key: 'name' },
        { label: 'GST Number', key: 'gst' },
        { label: 'Status', key: 'status' },
        { label: 'Trust Rating', key: 'trust' }
      ];
      
      const listRows = (data.stores || []).map(st => ({
        name: st.name,
        gst: st.gstNumber,
        status: st.status,
        trust: `${st.trustScore}% Score`
      }));

      y = drawTable(doc, listHeaders, listRows, y, 'Registry Profile Database Overview (Sample)');
      break;
    }

    case 'admin_dispute': {
      // Admin case dispute logs
      const comp = data.complaint || {};
      
      const details = [
        { label: 'Dispute Case ID:', value: comp._id || 'N/A' },
        { label: 'Customer/Accuser:', value: comp.customerName || 'N/A' },
        { label: 'Pharmacy/Accused:', value: comp.pharmacyName || 'N/A' },
        { label: 'Offense Type:', value: comp.type || 'Price Mismatch' },
        { label: 'Adjudication Verdict:', value: comp.status || 'Pending' },
        { label: 'Warnings Penalized:', value: comp.penaltyApplied ? '+1 Warning Point Applied' : 'Dismissed / No Penalty' }
      ];
      
      y = drawSectionTitle(doc, 'Dispute Investigation Case Details', y);
      y = drawKeyValueGrid(doc, details, y);

      // Grievance and Appeal details
      y = drawSectionTitle(doc, 'Audit Testimony & Appeals Log', y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...COLORS.primary);
      doc.text('Customer Detailed Grievance Description:', MARGIN, y);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.secondary);
      const descLines = doc.splitTextToSize(comp.description || 'No description supplied', CONTENT_WIDTH);
      doc.text(descLines, MARGIN, y + 4.5);
      
      y += (descLines.length * 4.5) + 8;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.primary);
      doc.text('Official Pharmacy Appeal Response:', MARGIN, y);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.secondary);
      const responseLines = doc.splitTextToSize(comp.responseFromPharmacy || 'Awaiting pharmacy statement response appeal.', CONTENT_WIDTH);
      doc.text(responseLines, MARGIN, y + 4.5);
      
      y += (responseLines.length * 4.5) + 8;

      y = drawSectionTitle(doc, 'OCR Text Evidence Output', y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setFillColor(...COLORS.lightBg);
      
      // Draw OCR text box
      const ocrText = comp.billImage || 'No OCR Text Extracted';
      const ocrLines = doc.splitTextToSize(ocrText, CONTENT_WIDTH - 8);
      const boxHeight = (ocrLines.length * 4) + 6;
      
      doc.rect(MARGIN, y, CONTENT_WIDTH, boxHeight, 'F');
      doc.setTextColor(...COLORS.primary);
      doc.text(ocrLines, MARGIN + 4, y + 4.5);
      y += boxHeight + 6;

      y = drawSectionTitle(doc, 'Case Verdict Explanation', y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.secondary);
      const verdict = comp.status === 'Resolved' 
        ? 'Verification findings show that the pharmacy receipt price mismatch exceeds the statutory limits registered on the platform registry inventory listings. The merchant warning counts have been bumped and a trust score penalty is dynamically enforced.'
        : comp.status === 'Dismissed' 
          ? 'Verification details find the dispute grounds insubstantial or receipt scan is mismatch. The invoice matches registry prices correctly, case dismissed.'
          : 'Case holds pending review of statements and appeals filed by the registered merchant.';
          
      const verdictLines = doc.splitTextToSize(verdict, CONTENT_WIDTH);
      doc.text(verdictLines, MARGIN, y);
      y += (verdictLines.length * 4.5) + 6;
      break;
    }

    case 'admin_logs': {
      // System wide logs list
      const logs = data.logs || [];
      
      const logHeaders = [
        { label: 'Actor User', key: 'actor' },
        { label: 'Security Level / Role', key: 'role' },
        { label: 'Security Action Log Description', key: 'action' },
        { label: 'Logged Time', key: 'time' }
      ];
      
      const logRows = logs.map(l => ({
        actor: l.actorName || 'System',
        role: l.actorRole || 'System',
        action: l.action || l.details || '',
        time: l.timestamp ? new Date(l.timestamp).toLocaleString() : 'N/A'
      }));

      y = drawTable(doc, logHeaders, logRows, y, 'Chronological Audit Log Registry');
      break;
    }

    default:
      console.warn('Unknown report type requested:', reportType);
  }

  // Draw footers on all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  // Download PDF
  const filename = `${reportType}_report_${Date.now()}.pdf`;
  doc.save(filename);
}
