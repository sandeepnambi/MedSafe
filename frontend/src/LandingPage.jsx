import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ArrowRight, Users, Activity, Scan, ShieldAlert,
  User, Store, ClipboardCheck, Shield, CheckCircle2, MapPin, 
  Search, AlertTriangle, GitCommit, Check, Clock, 
  WifiOff, Database, Cloud, RefreshCw, UserCheck, Heart 
} from 'lucide-react';
import './LandingPage.css';

export default function LandingPage({ onLogin, onRegister, onRegisterPharmacy }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileActive, setMobileActive] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);

    // SVG Trust Score Ring Scroll Animation (IntersectionObserver)
    const trustSection = document.getElementById('trust-engine');
    const totalCircumference = 628.32;
    const targetTrustScore = 94; // Target Percentage

    const animateTrustRing = () => {
      let currentScore = 0;
      const duration = 1500; // ms
      const intervalTime = 20; // ms
      const step = targetTrustScore / (duration / intervalTime);
      
      const timer = setInterval(() => {
        currentScore += step;
        if (currentScore >= targetTrustScore) {
          currentScore = targetTrustScore;
          clearInterval(timer);
        }
        
        const textEl = document.getElementById('trustText');
        const circleEl = document.getElementById('trustCircle');
        if (textEl) textEl.textContent = Math.round(currentScore) + '%';
        if (circleEl) {
          const progressOffset = totalCircumference - (totalCircumference * (currentScore / 100));
          circleEl.style.strokeDashoffset = progressOffset;
        }
      }, intervalTime);
    };

    const trustObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateTrustRing();
          trustObserver.unobserve(entry.target); // Animate only once
        }
      });
    }, { threshold: 0.4 });

    if (trustSection) {
      trustObserver.observe(trustSection);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (trustSection) trustObserver.unobserve(trustSection);
    };
  }, []);

  const toggleMobileMenu = () => {
    setMobileActive(!mobileActive);
  };

  const handleScrollTo = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page-body">
      {/* Sticky Navbar */}
      <header className={`navbar ${scrolled ? 'scrolled' : ''} ${mobileActive ? 'mobile-active' : ''}`} id="navbar">
        <div className="container nav-container">
          <a href="#" className="logo">
            <span className="logo-icon">
              <ShieldCheck className="w-7 h-7 text-[#00BFA5]" />
            </span>
            <span className="logo-text">MedSafe</span>
          </a>
          
          <ul className="nav-links">
            <li><a href="#features" onClick={(e) => handleScrollTo(e, 'features')}>Features</a></li>
            <li><a href="#portals" onClick={(e) => handleScrollTo(e, 'portals')}>Portals</a></li>
            <li><a href="#how-it-works" onClick={(e) => handleScrollTo(e, 'how-it-works')}>How It Works</a></li>
            <li><a href="#trust-engine" onClick={(e) => handleScrollTo(e, 'trust-engine')}>Trust Engine</a></li>
          </ul>

          <div className="nav-actions">
            <button onClick={onLogin} className="btn btn-outlined-blue">Login</button>
            <button onClick={onRegister} className="btn btn-filled-blue">Register</button>
          </div>

          <button className={`hamburger ${mobileActive ? 'active' : ''}`} onClick={toggleMobileMenu} aria-label="Toggle menu">
            <span style={mobileActive ? { transform: 'translateY(8px) rotate(45deg)' } : {}}></span>
            <span style={mobileActive ? { opacity: 0 } : {}}></span>
            <span style={mobileActive ? { transform: 'translateY(-8px) rotate(-45deg)' } : {}}></span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      <div className={`mobile-menu ${mobileActive ? 'active' : ''}`} id="mobileMenu">
        <ul className="mobile-links">
          <li><a href="#features" onClick={(e) => { toggleMobileMenu(); handleScrollTo(e, 'features'); }}>Features</a></li>
          <li><a href="#portals" onClick={(e) => { toggleMobileMenu(); handleScrollTo(e, 'portals'); }}>Portals</a></li>
          <li><a href="#how-it-works" onClick={(e) => { toggleMobileMenu(); handleScrollTo(e, 'how-it-works'); }}>How It Works</a></li>
          <li><a href="#trust-engine" onClick={(e) => { toggleMobileMenu(); handleScrollTo(e, 'trust-engine'); }}>Trust Engine</a></li>
        </ul>
        <div className="mobile-actions">
          <button onClick={() => { toggleMobileMenu(); onLogin(); }} className="btn btn-outlined-blue">Login</button>
          <button onClick={() => { toggleMobileMenu(); onRegister(); }} className="btn btn-filled-blue">Register</button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="hero" id="hero">
        <div className="hero-bg-shapes">
          <div className="float-hex hex-1"></div>
          <div className="float-hex hex-2"></div>
          <div className="float-hex hex-3"></div>
          <div className="float-hex hex-4"></div>
        </div>
        
        <div className="container" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 2 }}>
          <div className="hero-content">
            <h1>Fighting Fake Medicine.<br /><span>Protecting Every Patient.</span></h1>
            <p className="hero-subtext">India's first hyperlocal verification and price audit network. Ensure medicine authenticity and stop price inflation at your local chemist.</p>
            <div className="hero-ctas">
              <a href="#features" className="btn btn-filled-blue">Find a Medicine <ArrowRight className="w-4 h-4" /></a>
              <a href="#trust-engine" className="btn btn-ghost">Verify a Pharmacy</a>
            </div>
          </div>

          {/* Hero Stats Pills */}
          <div className="hero-stats-row">
            <div className="stat-pill">
              <div className="stat-icon"><Users className="w-5 h-5" /></div>
              <h3>4 Integrated Portals</h3>
              <p>Connecting the ecosystem</p>
            </div>
            <div className="stat-pill">
              <div className="stat-icon"><Activity className="w-5 h-5" /></div>
              <h3>Real-time Disputes</h3>
              <p>Instant pricing alerts</p>
            </div>
            <div className="stat-pill">
              <div className="stat-icon"><Scan className="w-5 h-5" /></div>
              <h3>OCR Invoice Sync</h3>
              <p>Receipt verification</p>
            </div>
            <div className="stat-pill">
              <div className="stat-icon"><ShieldAlert className="w-5 h-5" /></div>
              <h3>Trust Score Engine</h3>
              <p>Transparent audits</p>
            </div>
          </div>
        </div>
      </section>

      {/* Portals Section */}
      <section className="portals-section section-padding" id="portals">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">A Unified Trust Architecture</h2>
            <p className="section-subtitle">MedSafe links patients, pharmacy owners, field inspectors, and administrators through a synchronized security backend.</p>
          </div>

          <div className="portals-grid">
            {/* Patient Card */}
            <div className="portal-card portal-patient">
              <div className="portal-top">
                <span className="portal-badge">For Patients</span>
                <div className="portal-card-icon"><User className="w-6 h-6" /></div>
              </div>
              <h3>Patient Portal</h3>
              <p className="portal-desc">Empowering customers to make informed, safe, and cost-effective healthcare decisions.</p>
              <ul className="portal-bullets">
                <li><CheckCircle2 className="w-4 h-4" /> Hyperlocal stock & price discovery</li>
                <li><CheckCircle2 className="w-4 h-4" /> Compare live costs in nearby areas</li>
                <li><CheckCircle2 className="w-4 h-4" /> Discover lower-cost generic alternatives</li>
                <li><CheckCircle2 className="w-4 h-4" /> Upload invoices for automated fraud detection</li>
              </ul>
            </div>

            {/* Pharmacy Card */}
            <div className="portal-card portal-pharmacy">
              <div className="portal-top">
                <span className="portal-badge">For Pharmacies</span>
                <div className="portal-card-icon"><Store className="w-6 h-6" /></div>
              </div>
              <h3>Pharmacy Portal</h3>
              <p className="portal-desc">Helping local chemists verify credentials, showcase compliance, and unlock digital sales.</p>
              <ul className="portal-bullets">
                <li><CheckCircle2 className="w-4 h-4" /> Step-by-step onboarding (Licenses & GST)</li>
                <li><CheckCircle2 className="w-4 h-4" /> Gated inventory visible only after validation</li>
                <li><CheckCircle2 className="w-4 h-4" /> Direct API sync with POS billing systems</li>
                <li><CheckCircle2 className="w-4 h-4" /> Dispute resolution center for compliance disputes</li>
              </ul>
            </div>

            {/* Inspector Card */}
            <div className="portal-card portal-inspector">
              <div className="portal-top">
                <span className="portal-badge">For Inspectors</span>
                <div className="portal-card-icon"><ClipboardCheck className="w-6 h-6" /></div>
              </div>
              <h3>Inspector Portal</h3>
              <p className="portal-desc">Empowering physical auditors to verify pharmacy claims directly on the field.</p>
              <ul className="portal-bullets">
                <li><CheckCircle2 className="w-4 h-4" /> Automated task assignments based on geolocation</li>
                <li><CheckCircle2 className="w-4 h-4" /> On-site compliance audits (Drug Licenses, GST)</li>
                <li><CheckCircle2 className="w-4 h-4" /> Temperature-controlled cold chain checks</li>
                <li><CheckCircle2 className="w-4 h-4" /> Submit locked compliance audits back to SuperAdmin</li>
              </ul>
            </div>

            {/* Admin Card */}
            <div className="portal-card portal-admin">
              <div className="portal-top">
                <span className="portal-badge">For SuperAdmin</span>
                <div className="portal-card-icon"><Shield className="w-6 h-6" /></div>
              </div>
              <h3>Admin Console</h3>
              <p className="portal-desc">Command hub for adjudicating fraud, verifying audit logs, and dispatching inspectors.</p>
              <ul className="portal-bullets">
                <li><CheckCircle2 className="w-4 h-4" /> Schedule field inspector dispatches</li>
                <li><CheckCircle2 className="w-4 h-4" /> Approve, request changes, or block stores</li>
                <li><CheckCircle2 className="w-4 h-4" /> Live OCR-flagged pricing mismatch resolution</li>
                <li><CheckCircle2 className="w-4 h-4" /> Secure immutable transaction audit trail</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep-Dive Section */}
      <section className="features-section section-padding" id="features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Everything You Need to Trust Medicine</h2>
            <p className="section-subtitle">We build tools that combine localized market insights with physical validation protocols.</p>
          </div>

          {/* Feature 1: Hyperlocal Price Comparison */}
          <div className="feature-row">
            <div className="feature-info">
              <div className="feature-info-icon"><MapPin className="w-6 h-6" /></div>
              <h3>Hyperlocal Price Comparison</h3>
              <p>No more guessing the fair price. Search for critical medications and see live catalog pricing from nearby licensed pharmacies, automatically sorted to highlight the lowest rate. View active drug store trust scores before you visit.</p>
            </div>
            <div className="feature-mockup">
              <div className="mock-compare">
                <div className="mock-search">
                  <Search className="w-3.5 h-3.5" />
                  <span>Paracetamol 650mg</span>
                </div>
                <div className="mock-pharmacy-item lowest">
                  <div className="mock-pharm-info">
                    <span className="mock-pharm-name">Apex Care Pharmacy <span className="mock-badge-verified">Verified</span></span>
                    <span className="mock-pharm-distance">0.8 km away • Trust Score: 98%</span>
                  </div>
                  <div className="mock-pharm-price">
                    <span className="mock-price-value">₹15.00</span>
                    <div className="mock-price-lbl">Lowest</div>
                  </div>
                </div>
                <div className="mock-pharmacy-item">
                  <div className="mock-pharm-info">
                    <span className="mock-pharm-name">MediLife Wellness <span className="mock-badge-verified">Verified</span></span>
                    <span className="mock-pharm-distance">1.2 km away • Trust Score: 94%</span>
                  </div>
                  <div className="mock-pharm-price">
                    <span className="mock-price-value">₹18.50</span>
                  </div>
                </div>
                <div className="mock-pharmacy-item">
                  <div className="mock-pharm-info">
                    <span className="mock-pharm-name">City Druggists</span>
                    <span className="mock-pharm-distance">1.5 km away • Trust Score: 80%</span>
                  </div>
                  <div className="mock-pharm-price">
                    <span className="mock-price-value">₹22.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2: OCR Invoice Scanning */}
          <div className="feature-row">
            <div className="feature-info">
              <div className="feature-info-icon"><Scan className="w-6 h-6" /></div>
              <h3>OCR Invoice Verification</h3>
              <p>Scan your medical receipt directly inside the app. Our OCR parser reads the items, counts, and prices, matching them against the pharmacy's official registered inventory. Discrepancies and price inflations trigger instant compliance flags.</p>
            </div>
            <div className="feature-mockup">
              <div className="mock-ocr-bill">
                <div className="mock-ocr-laser"></div>
                <div className="mock-bill-header">
                  <div className="mock-bill-title">METRO DRUG STORE RECEIPT</div>
                  <div className="mock-bill-date">Invoice Ref: INV-2026-908</div>
                </div>
                <div className="mock-bill-row">
                  <span>Amoxicillin 500mg (x10)</span>
                  <span>₹120.00</span>
                </div>
                <div className="mock-bill-row warning">
                  <span>Atorvastatin 10mg (x15)</span>
                  <span>₹340.00</span>
                </div>
                <div className="mock-bill-row">
                  <span>Subtotal</span>
                  <span>₹460.00</span>
                </div>
                <div className="mock-alert-pills">
                  <div className="ocr-danger-pill">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>PRICE INFLATION: Atorvastatin marked up +35%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3: Dispute Lifecycle Tracker */}
          <div className="feature-row">
            <div className="feature-info">
              <div className="feature-info-icon"><GitCommit className="w-6 h-6" /></div>
              <h3>Dispute Lifecycle Tracker</h3>
              <p>When an invoice mismatch is discovered, it is logged instantly on the blockchain backend. The dispute transitions transparently from customer filing, through pharmacy response/appeals, up to final SuperAdmin audit reviews.</p>
            </div>
            <div className="feature-mockup">
              <div className="mock-lifecycle">
                <div className="lifecycle-steps">
                  <div className="lifecycle-step completed">
                    <div className="step-indicator"><Check className="w-3.5 h-3.5" /></div>
                    <div className="step-details">
                      <span className="step-title">Dispute Lodged</span>
                      <span className="step-desc">Invoice OCR mismatch identified by patient</span>
                      <span className="step-time">Jun 24, 09:30 AM</span>
                    </div>
                  </div>
                  <div className="lifecycle-step active">
                    <div className="step-indicator"><Clock className="w-3.5 h-3.5" /></div>
                    <div className="step-details">
                      <span className="step-title">Awaiting Store Response</span>
                      <span className="step-desc">Pharmacy notified; 48 hours to submit invoice appeal</span>
                      <span className="step-time">In Progress</span>
                    </div>
                  </div>
                  <div className="lifecycle-step">
                    <div className="step-indicator"><ShieldAlert className="w-3.5 h-3.5" /></div>
                    <div className="step-details">
                      <span className="step-title">SuperAdmin Adjudication</span>
                      <span className="step-desc">Auditor validates claim against billing records</span>
                      <span className="step-time">Pending</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 4: Offline Fallback Engine */}
          <div className="feature-row">
            <div className="feature-info">
              <div className="feature-info-icon"><WifiOff className="w-6 h-6" /></div>
              <h3>Offline-First Sync Engine</h3>
              <p>Connectivity should never block medicine safety checks. MedSafe uses a local storage fallback cache on client devices, letting patients query stored directory databases offline. All local audits queue and sync seamlessly when the network returns.</p>
            </div>
            <div className="feature-mockup">
              <div className="mock-offline">
                <div className="offline-node node-local">
                  <div className="node-status"></div>
                  <div className="node-details">
                    <span className="node-title">Local Storage Database <Database className="w-3 h-3" /></span>
                    <span className="node-subtitle">Active Client Cache</span>
                  </div>
                  <div className="node-data">98 SKUs Cache</div>
                </div>
                <div className="sync-bridge">
                  <div className="sync-line"></div>
                  <div className="sync-arrow"><RefreshCw className="w-3 h-3 animate-spin" /></div>
                </div>
                <div className="offline-node node-cloud">
                  <div className="node-status"></div>
                  <div className="node-details">
                    <span className="node-title">Cloud Database Endpoint <Cloud className="w-3 h-3" /></span>
                    <span className="node-subtitle">Reconnecting...</span>
                  </div>
                  <div className="node-data">Sync Queue (3)</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Trust Score Engine Section */}
      <section className="trust-engine-section section-padding" id="trust-engine">
        <div className="container trust-engine-container">
          <div className="trust-left">
            <div className="trust-ring-wrapper">
              <svg width="240" height="240" viewBox="0 0 240 240">
                {/* Background track */}
                <circle className="trust-circle-bg" cx="120" cy="120" r="100" strokeWidth="14" fill="none" />
                {/* Active stroke progress */}
                <circle className="trust-circle-progress" id="trustCircle" cx="120" cy="120" r="100" strokeWidth="14" fill="none"
                        strokeDasharray="628.32" strokeDashoffset="628.32" />
              </svg>
              <div className="trust-ring-text">
                <span className="trust-percentage-num" id="trustText">0%</span>
                <span className="trust-label">Trust Index</span>
              </div>
            </div>
          </div>
          
          <div className="trust-right">
            <h2>How Trust Scores Are Computed</h2>
            <p>Pharmacy trust ratings are dynamic, objective, and calculated on-the-fly based on real-time operational and compliance metrics. No paid boosts, no fake reviews.</p>
            
            <div className="calc-list">
              <div className="calc-row">
                <div className="calc-left">
                  <span className="dot dot-teal"></span>
                  <span>Base Onboarding Score</span>
                </div>
                <span className="calc-val plus">+100%</span>
              </div>
              
              <div className="calc-row">
                <div className="calc-left">
                  <span className="dot dot-orange"></span>
                  <span>Per Verified Audit Warning</span>
                </div>
                <span className="calc-val minus">-20%</span>
              </div>
              
              <div className="calc-row">
                <div className="calc-left">
                  <span className="dot dot-orange"></span>
                  <span>Per Active Dispute Under Review</span>
                </div>
                <span className="calc-val minus">-10%</span>
              </div>
              
              <div className="calc-row">
                <div className="calc-left">
                  <span className="dot dot-orange"></span>
                  <span>Empty Inventory Flag (Approved Stores)</span>
                </div>
                <span className="calc-val minus">-15%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section section-padding" id="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How MedSafe Restores Trust</h2>
            <p className="section-subtitle">A simple process designed to lock out counterfeit operations and ensure pricing fairness.</p>
          </div>

          <div className="steps-container">
            <div className="steps-connector"></div>
            
            {/* Step 1 */}
            <div className="step-card active">
              <div className="step-num-badge">
                <Store className="w-8 h-8" />
              </div>
              <h3>1. Onboard & Verify</h3>
              <p>Pharmacies register and upload drug licenses and GST numbers. Their inventory features remain locked until physical inspection is complete.</p>
            </div>

            {/* Step 2 */}
            <div className="step-card active">
              <div className="step-num-badge">
                <UserCheck className="w-8 h-8" />
              </div>
              <h3>2. On-Site Audit</h3>
              <p>Field Inspectors visit the physical pharmacy to confirm operating standards, cross-verify credentials, and inspect storage conditions.</p>
            </div>

            {/* Step 3 */}
            <div className="step-card active">
              <div className="step-num-badge">
                <Search className="w-8 h-8" />
              </div>
              <h3>3. Safe Discovery</h3>
              <p>Patients access the verified hyperlocal directory to compare prices safely. Any pricing discrepancies can be reported instantly with an invoice scan.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="cta-banner" id="cta">
        <div className="container cta-content">
          <h2>Join the MedSafe Network</h2>
          <p>Secure your medicine supply chain, verify pricing, and support ethical pharmacy practices in your city.</p>
          <div className="cta-buttons">
            <button onClick={onRegister} className="btn btn-filled-teal">Register as Patient</button>
            <button onClick={onRegisterPharmacy} className="btn btn-ghost">Register Pharmacy Store</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <a href="#" className="logo">
                <span className="logo-icon">
                  <ShieldCheck className="w-6 h-6 text-[#00BFA5]" />
                </span>
                <span className="logo-text">MedSafe</span>
              </a>
              <p>An integrated hyperlocal security framework combating counterfeit drugs and ensuring price integrity across India.</p>
            </div>
            
            <div className="footer-col">
              <h4>Platform</h4>
              <ul className="footer-links">
                <li><a href="#features">Features</a></li>
                <li><a href="#trust-engine">Trust Score</a></li>
                <li><a href="#how-it-works">How It Works</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Ecosystem</h4>
              <ul className="footer-links">
                <li><a href="#portals">Patient Portal</a></li>
                <li><a href="#portals">Pharmacy Desk</a></li>
                <li><a href="#portals">Auditor App</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Legal & Safety</h4>
              <ul className="footer-links">
                <li><a href="#">HIPAA Compliance</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© 2026 MedSafe Health Platforms. All rights reserved.</span>
            <span>Built with <Heart className="w-3.5 h-3.5 inline fill-[#FF6B35] text-[#FF6B35]" /> for safer healthcare in India</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
