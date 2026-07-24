import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, writeBatch, getDoc, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
const CRMContext = createContext();

// Default configurations
const DEFAULT_COURSES = [
  { id: 'c-1', name: 'Full-Stack Web Development', code: 'FSWD', duration: '6 Months', fee: '₹75,000', description: 'HTML, CSS, JS, React, Node.js, Express & MongoDB' },
  { id: 'c-2', name: 'Data Science & Artificial Intelligence', code: 'DSAI', duration: '8 Months', fee: '₹95,000', description: 'Python, R, SQL, Machine Learning, Deep Learning, NLP' },
  { id: 'c-3', name: 'Cloud & DevOps Engineering', code: 'CDE', duration: '5 Months', fee: '₹80,000', description: 'AWS, Azure, Docker, Kubernetes, CI/CD, Terraform' },
  { id: 'c-4', name: 'Cyber Security & Ethical Hacking', code: 'CSEH', duration: '6 Months', fee: '₹85,000', description: 'Network Security, Pentesting, OWASP, Linux, Cryptography' },
  { id: 'c-5', name: 'UI/UX Product Design', code: 'UIUX', duration: '4 Months', fee: '₹60,000', description: 'User Research, Wireframing, Prototyping, Figma, Adobe XD' }
];

const DEFAULT_STAGES = [
  { id: 'st-new', name: 'New Lead', color: '--color-new', description: 'Fresh inquiry captured' },
  { id: 'st-contact', name: 'Contacted', color: '--color-contacted', description: 'Counselor reached out' },
  { id: 'st-interest', name: 'Interested', color: '--color-interested', description: 'Expressed core interest' },
  { id: 'st-demosched', name: 'Demo Scheduled', color: '--color-demo-sched', description: 'Class scheduled' },
  { id: 'st-demoattend', name: 'Demo Attended', color: '--color-demo-attend', description: 'Attended the demo' },
  { id: 'st-followup', name: 'Follow-up', color: '--color-followup', description: 'Awaiting callback' },
  { id: 'st-notinterest', name: 'Not Interested', color: '--color-not-interested', description: 'Declined enrollment' },
  { id: 'st-converted', name: 'Converted', color: '--color-converted', description: 'Successfully enrolled' },
  { id: 'st-closed', name: 'Closed', color: '--color-closed', description: 'No further action' }
];

const DEFAULT_CUSTOM_FIELDS = [];

const DEFAULT_BRANDING = {
  instituteName: 'TechZone Academy',
  logoUrl: '',
  
  // Custom sidebar appearance properties
  sidebarBg: '#0A1E44',
  sidebarText: '#ffffff',
  sidebarActiveBg: '#2F6BFF',
  sidebarHoverBg: '#173B7A',
  sidebarBorder: '#1E2A4D',
  sidebarFont: 'Inter',
  sidebarRadius: 8,
  sidebarWidth: 'default',
  
  // Legacy color systems
  primaryHue: 0,
  primarySat: '95%',
  primaryLight: '50%',
  secondaryHue: 0,
  secondarySat: '0%',
  secondaryLight: '100%'
};

const DEFAULT_INTEGRATIONS = {
  meta: {
    enabled: false,
    status: 'Setup Required',
    appId: import.meta.env.META_APP_ID || '',
    appSecret: import.meta.env.META_APP_SECRET || '',
    webhookVerifyToken: import.meta.env.META_WEBHOOK_VERIFY_TOKEN || '',
    verifyToken: import.meta.env.VERIFY_TOKEN || '',
    redirectUri: import.meta.env.META_REDIRECT_URI || '',
    simulatedLeadsCount: 1247
  },
  google: {
    enabled: false,
    status: 'Setup Required',
    developerToken: '',
    customerId: '',
    managerCustomerId: '',
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    webhookPasskey: '',
    simulatedLeadsCount: 892
  },
  whatsapp: {
    enabled: true,
    status: 'Connected',
    phoneNumberId: import.meta.env.WHATSAPP_PHONE_NUMBER_ID || '',
    businessAccountId: import.meta.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    systemToken: import.meta.env.WHATSAPP_ACCESS_TOKEN || '',
    accessToken: import.meta.env.WHATSAPP_ACCESS_TOKEN || '',
    apiVersion: import.meta.env.WHATSAPP_API_VERSION || 'v20.0',
    webhookVerifyToken: import.meta.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
    simulatedLeadsCount: 645
  },
  webhooks: {
    enabled: false,
    status: 'Setup Required',
    securitySecret: '',
    webhookUrlSlug: '',
    simulatedLeadsCount: 612
  }
};

// Rich Seed Data of 12 Leads (Cleaned/Removed)
const SEED_LEADS = [];

export const CRMProvider = ({ children }) => {
  // Database States
  const [leads, setLeads] = useState(() => {
    const hasResetSeeds = localStorage.getItem('crm_leads_seed_reset_v8');
    if (!hasResetSeeds) {
      localStorage.setItem('crm_leads_seed_reset_v8', 'true');
      localStorage.setItem('crm_leads', JSON.stringify(SEED_LEADS));
      return SEED_LEADS;
    }
    const local = localStorage.getItem('crm_leads');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        return parsed.map(lead => ({
          email: '',
          course: '',
          education: '',
          source: 'WhatsApp Inbound',
          stage: lead.stage === 'Follow-up Pending' ? 'Follow-up' : (lead.stage || 'New Lead'),
          counselor: 'Unassigned',
          lastContacted: lead.createdDate || new Date().toISOString(),
          timeline: [],
          customFields: {},
          ...lead
        }));
      } catch (e) {
        console.error(e);
      }
    }
    return SEED_LEADS;
  });

  const [courses, setCourses] = useState(() => {
    const local = localStorage.getItem('crm_courses');
    return local ? JSON.parse(local) : DEFAULT_COURSES;
  });

  const [pipelineStages, setPipelineStages] = useState(() => {
    const local = localStorage.getItem('crm_stages');
    let stages = local ? JSON.parse(local) : DEFAULT_STAGES;
    
    // Migration for Follow-up name change
    let migrated = false;
    stages = stages.map(st => {
      if (st.name === 'Follow-up Pending') {
        migrated = true;
        return { ...st, name: 'Follow-up' };
      }
      return st;
    });
    
    if (migrated) {
      localStorage.setItem('crm_stages', JSON.stringify(stages));
    }
    
    return stages;
  });

  const [customFields, setCustomFields] = useState(() => {
    const local = localStorage.getItem('crm_custom_fields_v2');
    return local ? JSON.parse(local) : DEFAULT_CUSTOM_FIELDS;
  });

  const [branding, setBranding] = useState(() => {
    const local = localStorage.getItem('crm_branding');
    if (local) {
      const parsed = JSON.parse(local);
      return { ...DEFAULT_BRANDING, ...parsed };
    }
    return DEFAULT_BRANDING;
  });

  useEffect(() => {
    let migrated = false;
    const newStages = pipelineStages.map(st => {
      if (st.name === 'Follow-up Pending') {
        migrated = true;
        return { ...st, name: 'Follow-up' };
      }
      return st;
    });
    if (migrated) {
      setPipelineStages(newStages);
    }
  }, [pipelineStages]);

  const [integrations, setIntegrations] = useState(() => {
    const hasReset = localStorage.getItem('crm_integrations_seed_reset_v3');
    if (!hasReset) {
      localStorage.setItem('crm_integrations_seed_reset_v3', 'true');
      const local = localStorage.getItem('crm_integrations');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          const merged = {
            meta: { ...DEFAULT_INTEGRATIONS.meta, ...parsed.meta },
            google: { ...DEFAULT_INTEGRATIONS.google, ...parsed.google },
            whatsapp: { ...DEFAULT_INTEGRATIONS.whatsapp, ...parsed.whatsapp },
            webhooks: { ...DEFAULT_INTEGRATIONS.webhooks, ...parsed.webhooks }
          };
          localStorage.setItem('crm_integrations', JSON.stringify(merged));
          return merged;
        } catch (e) {
          console.error("Error merging integrations state:", e);
        }
      }
      localStorage.setItem('crm_integrations', JSON.stringify(DEFAULT_INTEGRATIONS));
      return DEFAULT_INTEGRATIONS;
    }
    const local = localStorage.getItem('crm_integrations');
    return local ? JSON.parse(local) : DEFAULT_INTEGRATIONS;
  });

  const [counselors, setCounselors] = useState([]);

  // Global Session Roles
  const [activeRole, setActiveRole] = useState(() => {
    const local = localStorage.getItem('crm_active_role');
    return local ? JSON.parse(local) : 'Admin'; // Admin, Manager, Counselor
  });

  const [activeUser, setActiveUser] = useState(() => {
    const local = localStorage.getItem('crm_active_user');
    const parsed = local ? JSON.parse(local) : 'Maha';
    if (parsed === 'Elena Gilbert' || parsed === 'Damon Salvatore') {
      return 'Maha';
    }
    return parsed;
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const local = localStorage.getItem('crm_logged_in');
    return local === 'true';
  });

  const [isFirebaseEnabled, setIsFirebaseEnabled] = useState(false);

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Let onAuthStateChanged handle the role/name state setting
      return { success: true };
    } catch (err) {
      console.error("Firebase Login Error:", err);
      return { success: false, reason: 'invalid', message: err.message };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      setActiveRole(null);
      setActiveUser(null);
      showToastMsg('Logged out successfully.', 'info');
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        localStorage.setItem('crm_logged_in', 'true');
        // Fetch user document from Firestore to get Role and Name
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.status === 'Inactive' || data.status === 'Deactivated') {
            await signOut(auth);
            setIsLoggedIn(false);
            showToastMsg('This account has been deactivated. Please contact an Admin.', 'error');
            return;
          }
          setActiveRole(data.role || 'Counselor');
          setActiveUser(data.name || user.email);
          localStorage.setItem('crm_active_role', JSON.stringify(data.role));
          localStorage.setItem('crm_active_user', JSON.stringify(data.name));
        }
      } else {
        setIsLoggedIn(false);
        setActiveRole(null);
        setActiveUser(null);
        localStorage.setItem('crm_logged_in', 'false');
        localStorage.removeItem('crm_active_role');
        localStorage.removeItem('crm_active_user');
      }
    });
    return () => unsubscribe();
  }, []);

  // Simulated Alert Notifications
  const [notifications, setNotifications] = useState([
    { id: 'notif-1', title: 'New Lead Assigned', content: 'Aarav Sharma has been assigned to you.', timestamp: new Date().toISOString(), read: false },
    { id: 'notif-2', title: 'Overdue Follow-up Alert', content: 'Ananya Sen follow-up was due 1 hour ago!', timestamp: new Date(Date.now() - 60*60*1000).toISOString(), read: false }
  ]);

  // SPA Router State
  const [activeView, setActiveView] = useState(() => {
    const local = localStorage.getItem('crm_active_view');
    return local ? JSON.parse(local) : 'dashboard';
  });

  const [whatsappSubView, setWhatsappSubView] = useState(() => {
    return sessionStorage.getItem('gowha_subview') || 'dashboard';
  });

  const [prefilledCampaignLeads, setPrefilledCampaignLeads] = useState(null);

  const changeWhatsappSubView = (view) => {
    sessionStorage.setItem('gowha_subview', view);
    setWhatsappSubView(view);
  };

  const [selectedLeadId, setSelectedLeadId] = useState(() => {
    const local = localStorage.getItem('crm_selected_lead_id');
    return local ? JSON.parse(local) : null;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Global Toast State
  const [toast, setToast] = useState(null);

  // Firestore Sync Effect
  useEffect(() => {
    if (!isLoggedIn) {
      // Clean up local states when logged out
      setLeads([]);
      setCourses([]);
      setPipelineStages([]);
      setCounselors([]);
      return;
    }

    let active = true;
    let leadsUnsub = null;
    let iframeUnsub = null;
    let coursesUnsub = null;
    let stagesUnsub = null;
    let customFieldsUnsub = null;
    let counselorsUnsub = null;
    let brandingUnsub = null;
    let integrationsUnsub = null;

    try {
      let mainLeads = [];
      let iframeLeads = [];

      const updateLeads = () => {
        const combined = [...mainLeads, ...iframeLeads];
        const uniqueLeadsMap = new Map();
        combined.forEach(lead => {
            uniqueLeadsMap.set(lead.id, lead);
        });
        
        // Filter out WhatsApp Campaign leads from showing in the CRM list
        const uniqueLeads = Array.from(uniqueLeadsMap.values()).filter(lead => lead.source !== 'WhatsApp Campaign');
        
        uniqueLeads.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
        setLeads(uniqueLeads);
      };

      // 1. Leads
      leadsUnsub = onSnapshot(collection(db, 'leads'), (snapshot) => {
        if (!active) return;
        if (snapshot.empty) {
          console.log("Firestore leads collection is empty. Starting fresh with no data.");
          mainLeads = [];
          updateLeads();
          setIsFirebaseEnabled(true);
        } else {
          mainLeads = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              email: '',
              course: '',
              education: '',
              source: 'WhatsApp Inbound',
              stage: 'New Lead',
              counselor: 'Unassigned',
              lastContacted: data.createdDate || new Date().toISOString(),
              timeline: [],
              customFields: {},
              id: doc.id,
              ...data
            };
          });
          updateLeads();
          setIsFirebaseEnabled(true);
        }
      }, (err) => {
        console.error("Firestore leads subscription error:", err);
        setIsFirebaseEnabled(false);
      });

      // 1b. i-frame Leads
      iframeUnsub = onSnapshot(collection(db, 'i-frame'), (snapshot) => {
        if (!active) return;
        if (!snapshot.empty) {
          iframeLeads = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              email: '',
              course: '',
              education: '',
              source: 'Website Embedded Form',
              stage: 'New Lead',
              counselor: 'Unassigned',
              lastContacted: data.createdDate || new Date().toISOString(),
              timeline: [],
              customFields: {},
              id: doc.id,
              ...data
            };
          });
          updateLeads();
        }
      }, (err) => {
        console.error("Firestore iframe subscription error:", err);
      });

      // 2. Courses
      coursesUnsub = onSnapshot(collection(db, 'courses'), (snapshot) => {
        if (!active) return;
        if (snapshot.empty) {
          console.log("Firestore courses collection is empty. Seeding with DEFAULT courses...");
          const batch = writeBatch(db);
          DEFAULT_COURSES.forEach((course) => {
            batch.set(doc(db, 'courses', course.id), course);
          });
          batch.commit().catch(err => console.error("Firestore seeding courses failed:", err));
        } else {
          const coursesData = snapshot.docs.map(doc => doc.data());
          setCourses(coursesData);
        }
      }, (err) => {
        console.error("Firestore courses subscription error:", err);
      });

      // 3. Pipeline Stages
      stagesUnsub = onSnapshot(collection(db, 'pipelineStages'), (snapshot) => {
        if (!active) return;
        if (snapshot.empty) {
          console.log("Firestore stages collection is empty. Seeding with DEFAULT stages...");
          const batch = writeBatch(db);
          DEFAULT_STAGES.forEach((stage, idx) => {
            batch.set(doc(db, 'pipelineStages', stage.id), { ...stage, order: idx });
          });
          batch.commit().catch(err => console.error("Firestore seeding stages failed:", err));
        } else {
          const orderMap = {
            'st-new': 0, 'st-contact': 1, 'st-interest': 2, 'st-demosched': 3,
            'st-demoattend': 4, 'st-followup': 5, 'st-notinterest': 6,
            'st-converted': 7, 'st-closed': 8
          };
          const stagesData = snapshot.docs.map(doc => doc.data());
          stagesData.sort((a, b) => {
            const aIndex = a.order !== undefined ? a.order : (orderMap[a.id] !== undefined ? orderMap[a.id] : 999);
            const bIndex = b.order !== undefined ? b.order : (orderMap[b.id] !== undefined ? orderMap[b.id] : 999);
            return aIndex - bIndex;
          });
          setPipelineStages(stagesData);
        }
      }, (err) => {
        console.error("Firestore stages subscription error:", err);
      });

      // 4. Custom Fields
      customFieldsUnsub = onSnapshot(collection(db, 'customFields'), (snapshot) => {
        if (!active) return;
        const fieldsData = snapshot.docs.map(doc => doc.data());
        setCustomFields(fieldsData);
      }, (err) => {
        console.error("Firestore customFields subscription error:", err);
      });

      // 5. Users
      counselorsUnsub = onSnapshot(collection(db, 'users'), (snapshot) => {
        if (!active) return;
        if (!snapshot.empty) {
          const counselorsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return { status: 'Active', ...data };
          });
          setCounselors(counselorsData);
        }
      }, (err) => {
        console.error("Firestore users subscription error:", err);
      });

      // 6. Branding
      brandingUnsub = onSnapshot(doc(db, 'settings', 'branding'), (snapshot) => {
        if (!active) return;
        if (snapshot.exists()) {
          setBranding(snapshot.data());
        } else {
          setDoc(doc(db, 'settings', 'branding'), DEFAULT_BRANDING)
            .catch(err => console.error("Firestore settings/branding initialization failed:", err));
        }
      }, (err) => {
        console.error("Firestore branding subscription error:", err);
      });

      // 7. Integrations
      integrationsUnsub = onSnapshot(doc(db, 'settings', 'integrations'), (snapshot) => {
        if (!active) return;
        if (snapshot.exists()) {
          const data = snapshot.data();
          const whatsappData = data.whatsapp || {};
          const metaData = data.meta || {};
          // We simply use the data from Firestore, allowing the user to update it via the UI
          // without hardcoded .env variables overriding and causing infinite encryption loops.
          setIntegrations(data);
        } else {
          setDoc(doc(db, 'settings', 'integrations'), DEFAULT_INTEGRATIONS)
            .catch(err => console.error("Firestore settings/integrations initialization failed:", err));
        }
      }, (err) => {
        console.error("Firestore integrations subscription error:", err);
      });

    } catch (e) {
      console.error("Firestore subscription setup error:", e);
      setIsFirebaseEnabled(false);
    }

    return () => {
      active = false;
      if (leadsUnsub) leadsUnsub();
      if (iframeUnsub) iframeUnsub();
      if (coursesUnsub) coursesUnsub();
      if (stagesUnsub) stagesUnsub();
      if (customFieldsUnsub) customFieldsUnsub();
      if (counselorsUnsub) counselorsUnsub();
      if (brandingUnsub) brandingUnsub();
      if (integrationsUnsub) integrationsUnsub();
    };
  }, [isLoggedIn]);

  // Persistence hooks
  useEffect(() => {
    localStorage.setItem('crm_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('crm_courses', JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem('crm_stages', JSON.stringify(pipelineStages));
  }, [pipelineStages]);

  useEffect(() => {
    localStorage.setItem('crm_custom_fields_v2', JSON.stringify(customFields));
  }, [customFields]);

  useEffect(() => {
    localStorage.setItem('crm_branding', JSON.stringify(branding));
    applyThemeBranding(branding);
  }, [branding]);

  useEffect(() => {
    localStorage.setItem('crm_integrations', JSON.stringify(integrations));
  }, [integrations]);

  useEffect(() => {
    localStorage.setItem('crm_counselors', JSON.stringify(counselors));
  }, [counselors]);

  useEffect(() => {
    localStorage.setItem('crm_active_role', JSON.stringify(activeRole));
  }, [activeRole]);

  useEffect(() => {
    localStorage.setItem('crm_active_user', JSON.stringify(activeUser));
  }, [activeUser]);

  useEffect(() => {
    localStorage.setItem('crm_active_view', JSON.stringify(activeView));
  }, [activeView]);

  useEffect(() => {
    localStorage.setItem('crm_selected_lead_id', JSON.stringify(selectedLeadId));
  }, [selectedLeadId]);

  // Helper to trigger branding updates dynamically in styling sheet
  const applyThemeBranding = (brand) => {
    const root = document.documentElement;
    root.style.setProperty('--primary-h', brand.primaryHue || 0);
    root.style.setProperty('--primary-s', `${brand.primarySat || '95%'}`);
    root.style.setProperty('--primary-l', `${brand.primaryLight || '50%'}`);
    root.style.setProperty('--secondary-h', brand.secondaryHue || 0);
    root.style.setProperty('--secondary-s', `${brand.secondarySat || '0%'}`);
    root.style.setProperty('--secondary-l', `${brand.secondaryLight || '100%'}`);
    
    // Modern SaaS Sidebar style variables
    root.style.setProperty('--sidebar-bg', brand.sidebarBg || '#0A1E44');
    root.style.setProperty('--sidebar-text', brand.sidebarText || '#ffffff');
    root.style.setProperty('--sidebar-active-bg', brand.sidebarActiveBg || '#2F6BFF');
    root.style.setProperty('--sidebar-hover-bg', brand.sidebarHoverBg || '#173B7A');
    root.style.setProperty('--sidebar-border', brand.sidebarBorder || '#1E2A4D');
    root.style.setProperty('--sidebar-font', brand.sidebarFont || 'Inter');
    root.style.setProperty('--sidebar-radius', `${brand.sidebarRadius !== undefined ? brand.sidebarRadius : 8}px`);
    root.style.setProperty('--sidebar-width', brand.sidebarWidth === 'compact' ? '80px' : brand.sidebarWidth === 'wide' ? '280px' : '250px');
    root.style.setProperty('--brand-text-size', `${brand.brandTextSize !== undefined ? brand.brandTextSize : 19}px`);
    root.style.setProperty('--brand-logo-size', `${brand.brandLogoSize !== undefined ? brand.brandLogoSize : 32}px`);

    // Dynamically apply sidebar color scheme variables globally to align the entire CRM workspace!
    const activeColor = brand.sidebarActiveBg || '#2F6BFF';
    root.style.setProperty('--primary', activeColor);
    root.style.setProperty('--primary-glow', `${activeColor}14`); // 8% opacity overlay in hex
    root.style.setProperty('--primary-light', activeColor);
    root.style.setProperty('--primary-dark', brand.sidebarHoverBg || '#173B7A');
    root.style.setProperty('--border-color-active', activeColor);

    // Apply custom font-families to root body if set
    if (brand.sidebarFont) {
      root.style.setProperty('--font-heading', `'${brand.sidebarFont}', 'Outfit', 'Inter', sans-serif`);
      root.style.setProperty('--font-body', `'${brand.sidebarFont}', 'Inter', sans-serif`);
    }

    // Apply general border radius globally if customized!
    if (brand.sidebarRadius !== undefined) {
      root.style.setProperty('--radius-sm', `${Math.max(4, brand.sidebarRadius - 2)}px`);
      root.style.setProperty('--radius-md', `${brand.sidebarRadius}px`);
      root.style.setProperty('--radius-lg', `${Math.min(18, brand.sidebarRadius + 8)}px`);
    }
  };

  // Triggers alert messages
  const showToastMsg = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // ==========================================================================
  // ACTION CONTROLLERS (MUTATORS)
  // ==========================================================================

  // Adding a brand new inquiry
  const addLead = (leadData) => {
    const cleanPhone = leadData.phone ? String(leadData.phone).replace(/\D/g, '') : '';
    
    // Check if lead already exists by phone
    if (cleanPhone) {
      const existingLead = leads.find(l => {
        const lPhone = l.phone ? String(l.phone).replace(/\D/g, '') : '';
        return lPhone === cleanPhone;
      });
      
      if (existingLead) {
        // Append to existing lead instead of creating a new one
        const reinquiryLog = {
          id: `log-${Date.now()}`,
          type: 'system',
          title: 'Re-inquiry Captured',
          content: `User submitted another inquiry for course: ${leadData.course || 'Unknown'} via ${leadData.source || 'Website Form'}`,
          timestamp: new Date().toISOString(),
          user: 'System'
        };
        
        const updatedLead = {
          ...existingLead,
          stage: 'New Lead', // Bring them back to New Lead stage to ensure they get attention
          lastContacted: new Date().toISOString(),
          timeline: [...(existingLead.timeline || []), reinquiryLog]
        };
        
        if (isFirebaseEnabled) {
          setDoc(doc(db, 'leads', existingLead.id), updatedLead).catch(console.error);
        }
        setLeads(prev => prev.map(l => l.id === existingLead.id ? updatedLead : l));
        showToastMsg(`Existing lead found. Inquiry added to timeline!`);
        return updatedLead;
      }
    }

    // New Lead Creation
    const newLeadId = cleanPhone ? cleanPhone : `lead-${Date.now()}`;
    const newLead = {
      id: newLeadId,
      name: leadData.name || 'Anonymous Inquiry',
      email: leadData.email || '',
      phone: leadData.phone || '',
      location: leadData.location || 'Website Source',
      education: leadData.education || 'Not Provided',
      course: leadData.course || (courses[0] ? courses[0].name : ''),
      source: leadData.source || 'Website Form',
      subSource: leadData.subSource || '',
      counselor: leadData.counselor || activeUser,
      stage: leadData.stage || 'New Lead',
      temperature: leadData.temperature || 'Warm',
      createdDate: new Date().toISOString(),
      lastContacted: new Date().toISOString(),
      customFields: leadData.customFields || {},
      timeline: [
        {
          id: `log-${Date.now()}`,
          type: 'system',
          title: 'Lead Captured',
          content: `Inquiry successfully entered system via ${leadData.source === 'Walk-in' && leadData.subSource ? `Walk-in (${leadData.subSource})` : (leadData.source || 'Website Form')}.`,
          timestamp: new Date().toISOString(),
          user: 'System'
        }
      ],
      whatsappMessages: []
    };

    if (isFirebaseEnabled) {
      setDoc(doc(db, 'leads', newLead.id), newLead)
        .catch(err => {
          console.error("Firestore addLead failed, falling back to local update:", err);
          setLeads(prev => [newLead, ...prev]);
        });
    } else {
      setLeads(prev => [newLead, ...prev]);
    }

    // Create dynamic in-app notification if assigned to active user
    if (newLead.counselor === activeUser) {
      setNotifications(prev => [
        {
          id: `notif-${Date.now()}`,
          title: 'New Lead Auto-Assigned',
          content: `${newLead.name} has been placed in your counselor queue.`,
          timestamp: new Date().toISOString(),
          read: false
        },
        ...prev
      ]);
    }

    showToastMsg(`Lead ${newLead.name} successfully captured!`);
    return newLead;
  };

  const addBulkLeads = (leadsArray) => {
    if (!leadsArray || leadsArray.length === 0) return [];
    
    const newLeads = leadsArray.map((leadData, index) => {
      const cleanPhone = leadData.phone ? String(leadData.phone).replace(/\D/g, '') : '';
      return {
      id: cleanPhone ? cleanPhone : `lead-${Date.now()}-${index}`,
      name: leadData.name || 'Anonymous Inquiry',
      email: leadData.email || '',
      phone: leadData.phone || '',
      location: leadData.location || 'Campaign Upload',
      education: leadData.education || 'Not Provided',
      course: leadData.course || (courses[0] ? courses[0].name : ''),
      source: leadData.source || 'Campaign Upload',
      subSource: leadData.subSource || '',
      counselor: leadData.counselor || activeUser,
      stage: leadData.stage || 'New Lead',
      createdDate: new Date().toISOString(),
      lastContacted: new Date().toISOString(),
      customFields: leadData.customFields || {},
      timeline: [
        {
          id: `log-${Date.now()}-${index}`,
          type: 'system',
          title: 'Lead Captured',
          content: 'Inquiry successfully entered system via Campaign Upload.',
          timestamp: new Date().toISOString(),
          user: 'System'
        }
      ],
      whatsappMessages: []
    };
    });

    if (isFirebaseEnabled) {
      // Firestore batch size limit is 500
      const CHUNK_SIZE = 450;
      const processBatches = async () => {
        try {
          for (let i = 0; i < newLeads.length; i += CHUNK_SIZE) {
            const chunk = newLeads.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            chunk.forEach(lead => {
              batch.set(doc(db, 'leads', lead.id), lead);
            });
            await batch.commit();
          }
        } catch (err) {
          console.error("Firestore addBulkLeads batch failed, falling back to local update:", err);
          setLeads(prev => [...newLeads, ...prev]);
        }
      };
      processBatches();
    } else {
      setLeads(prev => [...newLeads, ...prev]);
    }

    showToastMsg(`${newLeads.length} leads successfully imported!`);
    return newLeads;
  };

  // Editing lead variables
  const updateLead = (leadId, updatedFields) => {
    let updatedLead = null;
    const nextLeads = leads.map(lead => {
      if (lead.id === leadId) {
        // Generate an audit log entry for changes
        const auditLogs = [];
        Object.keys(updatedFields).forEach(key => {
          if (lead[key] !== undefined && lead[key] !== updatedFields[key] && key !== 'timeline' && key !== 'whatsappMessages') {
            auditLogs.push({
              id: `log-${Date.now()}-${Math.random()}`,
              type: 'system',
              title: `${key.toUpperCase()} Modified`,
              content: `Changed from "${lead[key]}" to "${updatedFields[key]}"`,
              timestamp: new Date().toISOString(),
              user: activeUser
            });
          }
        });

        updatedLead = {
          ...lead,
          ...updatedFields,
          lastContacted: new Date().toISOString(),
          timeline: [...(lead.timeline || []), ...auditLogs]
        };
        return updatedLead;
      }
      return lead;
    });

    if (isFirebaseEnabled && updatedLead) {
      setDoc(doc(db, 'leads', leadId), updatedLead)
        .catch(err => {
          console.error("Firestore updateLead failed, falling back to local update:", err);
          setLeads(nextLeads);
        });
    } else {
      setLeads(nextLeads);
    }
    showToastMsg('Student profile successfully updated.');
  };

  // Delete Lead
  const deleteLead = (leadId) => {
    if (isFirebaseEnabled) {
      deleteDoc(doc(db, 'leads', leadId)).catch(err => {
        console.error("Firestore deleteLead from 'leads' failed:", err);
      });
      deleteDoc(doc(db, 'i-frame', leadId)).catch(err => {
        console.error("Firestore deleteLead from 'i-frame' failed:", err);
      });
      setLeads(prev => prev.filter(l => l.id !== leadId));
    } else {
      setLeads(prev => prev.filter(l => l.id !== leadId));
    }
    showToastMsg('Inquiry removed from CRM database.', 'error');
    if (selectedLeadId === leadId) {
      setSelectedLeadId(null);
      setActiveView('dashboard');
    }
  };

  // Direct Lead Stage update (Kanban Drag and Drop outcome)
  const updateLeadStage = (leadId, nextStage, stageChangeNote = '') => {
    let updatedLead = null;
    const nextLeads = leads.map(lead => {
      if (lead.id === leadId) {
        if (lead.stage === nextStage) return lead;
        
        const logs = [...(lead.timeline || [])];
        logs.push({
          id: `log-${Date.now()}`,
          type: 'system',
          title: 'Stage Shifted',
          content: `Pipeline stage moved from "${lead.stage}" to "${nextStage}". ${stageChangeNote ? `Note: ${stageChangeNote}` : ''}`,
          timestamp: new Date().toISOString(),
          user: activeUser
        });

        // Trigger automatic webhook simulations depending on stage
        let autoMsg = null;
        let whatsappHistory = [...(lead.whatsappMessages || [])];
        
        if (nextStage === 'Demo Scheduled') {
          autoMsg = `Hi ${lead.name}, your online demo session has been scheduled successfully! Click here to join: meet.google.com/abc-defg-hij`;
        } else if (nextStage === 'Converted') {
          autoMsg = `Congratulations ${lead.name}! Welcome to the institute family. We have successfully registered you in the database.`;
        }

        if (autoMsg) {
          whatsappHistory.push({
            id: `msg-auto-${Date.now()}`,
            sender: 'counselor',
            text: autoMsg,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
          logs.push({
            id: `log-auto-${Date.now()}`,
            type: 'whatsapp',
            title: 'Automated WhatsApp Dispatched',
            content: `Triggered message: "${autoMsg}"`,
            timestamp: new Date().toISOString(),
            user: 'Automation Server'
          });

          // Dispatch to real WhatsApp API if integration is active
          if (integrations.whatsapp.enabled && lead.phone) {
            const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'leads-management-tz';
            const url = `https://us-central1-${projectId}.cloudfunctions.net/sendWhatsAppMessage`;
            // Normalize to E.164: remove all non-digits, then prepend single '+'
            const normalizedPhone1 = `+${lead.phone.replace(/\D/g, '')}`;
            fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                leadId: leadId,
                recipientPhone: normalizedPhone1,
                messageText: autoMsg,
                counselorName: 'Automation Server'
              })
            })
            .then(async (res) => {
              const data = await res.json();
              if (res.ok && data.success) {
                console.log('Automated WhatsApp message delivered in real-time!');
              } else {
                console.error('Automated WhatsApp API failed:', data.error || data.details);
              }
            })
            .catch((err) => {
              console.error('Error dispatching automated WhatsApp to Cloud Function:', err);
            });
          }
        }

        updatedLead = {
          ...lead,
          stage: nextStage,
          lastContacted: new Date().toISOString(),
          timeline: logs,
          whatsappMessages: whatsappHistory
        };
        return updatedLead;
      }
      return lead;
    });

    if (isFirebaseEnabled && updatedLead) {
      setDoc(doc(db, 'leads', leadId), updatedLead)
        .catch(err => {
          console.error("Firestore updateLeadStage failed, falling back to local update:", err);
          setLeads(nextLeads);
        });
    } else {
      setLeads(nextLeads);
    }
    showToastMsg(`Lead status updated to ${nextStage}`);
  };

  // Logging interaction call logs
  const logCall = (leadId, callDetails) => {
    let updatedLead = null;
    const nextLeads = leads.map(lead => {
      if (lead.id === leadId) {
        const callLog = {
          id: `log-call-${Date.now()}`,
          type: 'call',
          title: `Call Logged: ${callDetails.status}`,
          content: `Call Outcome: ${callDetails.status}${callDetails.notes ? `\nNotes: ${callDetails.notes}` : ''}${callDetails.scheduleFollowup && callDetails.followupDate ? `\nFollow-up: Scheduled for ${new Date(callDetails.followupDate).toLocaleString()} - Reason: ${callDetails.followupReason || callDetails.notes || 'Scheduled callback'}` : ''}`,
          timestamp: new Date().toISOString(),
          user: activeUser
        };
        const nextTimeline = [...(lead.timeline || []), callLog];
        let nextStage = lead.stage;
        let nextFollowupDate = lead.followupDate || null;
        let nextFollowupReason = lead.followupReason || null;
        let whatsappHistory = [...(lead.whatsappMessages || [])];

        // Determine if outcome maps to a pipeline stage shift
        let targetStage = callDetails.updateStage;
        if (!targetStage || targetStage === '') {
          if (callDetails.status === 'Converted') {
            targetStage = 'Converted';
          } else if (callDetails.status === 'Not Interested') {
            targetStage = 'Not Interested';
          } else if (callDetails.status === 'Interested') {
            targetStage = 'Interested';
          } else if (callDetails.status === 'Call Later') {
            targetStage = 'Follow-up';
          }
        }

        // Apply stage change and log it
        if (targetStage && targetStage !== '' && targetStage !== lead.stage) {
          nextStage = targetStage;
          nextTimeline.push({
            id: `log-stage-${Date.now()}`,
            type: 'system',
            title: 'Stage Shifted',
            content: `Changed dynamically via call outcome logging to "${nextStage}"`,
            timestamp: new Date().toISOString(),
            user: activeUser
          });

          // Trigger automated simulated WhatsApp messages if applicable
          let autoMsg = null;
          if (nextStage === 'Demo Scheduled') {
            autoMsg = `Hi ${lead.name}, your online demo session has been scheduled successfully! Click here to join: meet.google.com/abc-defg-hij`;
          } else if (nextStage === 'Converted') {
            autoMsg = `Congratulations ${lead.name}! Welcome to the institute family. We have successfully registered you in the database.`;
          }

          if (autoMsg) {
            whatsappHistory.push({
              id: `msg-auto-${Date.now()}`,
              sender: 'counselor',
              text: autoMsg,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            nextTimeline.push({
              id: `log-auto-${Date.now()}`,
              type: 'whatsapp',
              title: 'Automated WhatsApp Dispatched',
              content: `Triggered message: "${autoMsg}"`,
              timestamp: new Date().toISOString(),
              user: 'Automation Server'
            });

            // Dispatch to real WhatsApp API if integration is active
            if (integrations.whatsapp.enabled && lead.phone) {
              const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'leads-management-tz';
              const url = `https://us-central1-${projectId}.cloudfunctions.net/sendWhatsAppMessage`;
              // Normalize to E.164: remove all non-digits, then prepend single '+'
              const normalizedPhone2 = `+${lead.phone.replace(/\D/g, '')}`;
              fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  leadId: leadId,
                  recipientPhone: normalizedPhone2,
                  messageText: autoMsg,
                  counselorName: 'Automation Server'
                })
              })
              .then(async (res) => {
                const data = await res.json();
                if (res.ok && data.success) {
                  console.log('Automated WhatsApp message delivered in real-time!');
                } else {
                  console.error('Automated WhatsApp API failed:', data.error || data.details);
                }
              })
              .catch((err) => {
                console.error('Error dispatching automated WhatsApp to Cloud Function:', err);
              });
            }
          }
        }

        // Setup dynamic follow-up inside lead profile if scheduled
        if (callDetails.scheduleFollowup && callDetails.followupDate) {
          nextFollowupDate = new Date(callDetails.scheduleFollowup && callDetails.followupDate).toISOString();
          nextFollowupReason = callDetails.followupReason || 'Scheduled callback';
          // Removed the duplicate nextTimeline.push here to avoid double entries
        }

        updatedLead = {
          ...lead,
          stage: nextStage,
          followupDate: nextFollowupDate,
          followupReason: nextFollowupReason,
          lastContacted: new Date().toISOString(),
          timeline: nextTimeline,
          whatsappMessages: whatsappHistory
        };
        return updatedLead;
      }
      return lead;
    });

    if (isFirebaseEnabled && updatedLead) {
      setDoc(doc(db, 'leads', leadId), updatedLead)
        .catch(err => {
          console.error("Firestore logCall failed, falling back to local update:", err);
          setLeads(nextLeads);
        });
    } else {
      setLeads(nextLeads);
    }
    showToastMsg('Call history logged successfully.');
  };

  // Logging custom interaction notes
  const logNote = (leadId, noteText) => {
    let updatedLead = null;
    const nextLeads = leads.map(lead => {
      if (lead.id === leadId) {
        const noteLog = {
          id: `log-note-${Date.now()}`,
          type: 'call',
          title: 'Interaction Note',
          content: noteText,
          timestamp: new Date().toISOString(),
          user: activeUser
        };
        updatedLead = {
          ...lead,
          lastContacted: new Date().toISOString(),
          timeline: [...(lead.timeline || []), noteLog]
        };
        return updatedLead;
      }
      return lead;
    });

    if (isFirebaseEnabled && updatedLead) {
      setDoc(doc(db, 'leads', leadId), updatedLead)
        .catch(err => {
          console.error("Firestore logNote failed, falling back to local update:", err);
          setLeads(nextLeads);
        });
    } else {
      setLeads(nextLeads);
    }
  };

  // Directly schedule/postpone a follow-up date
  const scheduleFollowup = (leadId, dateStr, reason) => {
    const schedDate = new Date(dateStr).toISOString();
    let updatedLead = null;
    const nextLeads = leads.map(lead => {
      if (lead.id === leadId) {
        updatedLead = {
          ...lead,
          followupDate: schedDate,
          followupReason: reason,
          lastContacted: new Date().toISOString(),
          timeline: [
            ...(lead.timeline || []),
            {
              id: `log-fup-${Date.now()}`,
              type: 'followup',
              title: 'Follow-up Scheduled / Rescheduled',
              content: `Next callback: ${new Date(schedDate).toLocaleString()}. Detail: ${reason}`,
              timestamp: new Date().toISOString(),
              user: activeUser
            }
          ]
        };
        return updatedLead;
      }
      return lead;
    });

    if (isFirebaseEnabled && updatedLead) {
      setDoc(doc(db, 'leads', leadId), updatedLead)
        .catch(err => {
          console.error("Firestore scheduleFollowup failed:", err);
          setLeads(nextLeads);
        });
    } else {
      setLeads(nextLeads);
    }
    showToastMsg('Follow-up scheduled.');
  };

  // Completed follow-up callback clearing
  const completeFollowup = (leadId) => {
    let updatedLead = null;
    const nextLeads = leads.map(lead => {
      if (lead.id === leadId) {
        updatedLead = {
          ...lead,
          followupDate: null,
          followupReason: null,
          timeline: [
            ...(lead.timeline || []),
            {
              id: `log-cf-${Date.now()}`,
              type: 'followup',
              title: 'Follow-up Cleared',
              content: 'Follow-up completed successfully.',
              timestamp: new Date().toISOString(),
              user: activeUser
            }
          ]
        };
        return updatedLead;
      }
      return lead;
    });

    if (isFirebaseEnabled && updatedLead) {
      setDoc(doc(db, 'leads', leadId), updatedLead)
        .catch(err => {
          console.error("Firestore completeFollowup failed:", err);
          setLeads(nextLeads);
        });
    } else {
      setLeads(nextLeads);
    }
    showToastMsg('Follow-up task marked completed.');
  };

  // Directly schedule a demo
  const scheduleDemo = (leadId, demoDetails) => {
    const demoDate = new Date(`${demoDetails.date}T${demoDetails.time}`).toISOString();
    let updatedLead = null;
    const nextLeads = leads.map(lead => {
      if (lead.id === leadId) {
        const title = `Demo Scheduled (${demoDetails.mode})`;
        const desc = `Trainer: ${demoDetails.trainer}. Class link/room: ${demoDetails.locationLink}. Timings: ${new Date(demoDate).toLocaleString()}`;
        updatedLead = {
          ...lead,
          stage: 'Demo Scheduled',
          demoInfo: {
            date: demoDate,
            trainer: demoDetails.trainer,
            mode: demoDetails.mode,
            locationLink: demoDetails.locationLink
          },
          lastContacted: new Date().toISOString(),
          timeline: [
            ...(lead.timeline || []),
            {
              id: `log-demo-${Date.now()}`,
              type: 'demo',
              title: title,
              content: desc,
              timestamp: new Date().toISOString(),
              user: activeUser
            }
          ]
        };
        return updatedLead;
      }
      return lead;
    });

    if (isFirebaseEnabled && updatedLead) {
      setDoc(doc(db, 'leads', leadId), updatedLead)
        .catch(err => {
          console.error("Firestore scheduleDemo failed:", err);
          setLeads(nextLeads);
        });
    } else {
      setLeads(nextLeads);
    }
    showToastMsg('Class/Demo scheduled successfully.');
  };

  // Mark Demo Attendance
  const logDemoAttendance = (leadId, attendanceStatus) => {
    let updatedLead = null;
    const nextLeads = leads.map(lead => {
      if (lead.id === leadId) {
        const nextStage = attendanceStatus === 'Attended' ? 'Demo Attended' : lead.stage;
        updatedLead = {
          ...lead,
          stage: nextStage,
          demoInfo: {
            ...(lead.demoInfo || {}),
            attendance: attendanceStatus
          },
          timeline: [
            ...(lead.timeline || []),
            {
              id: `log-att-${Date.now()}`,
              type: 'demo',
              title: `Demo Attendance: ${attendanceStatus}`,
              content: `Marked student status: ${attendanceStatus}. ${attendanceStatus === 'Attended' ? 'Lead stage auto-promoted to Demo Attended.' : ''}`,
              timestamp: new Date().toISOString(),
              user: activeUser
            }
          ]
        };
        return updatedLead;
      }
      return lead;
    });

    if (isFirebaseEnabled && updatedLead) {
      setDoc(doc(db, 'leads', leadId), updatedLead)
        .catch(err => {
          console.error("Firestore logDemoAttendance failed:", err);
          setLeads(nextLeads);
        });
    } else {
      setLeads(nextLeads);
    }
    showToastMsg(`Attendance logged: ${attendanceStatus}`);
  };

  // Sending custom WhatsApp logs & triggering bot automated simulated reply
  const sendWhatsAppMsg = async (leadId, messageText, templateData = null) => {
    if (!messageText.trim() && !templateData) return false;

    // 1. Optimistic UI Update - Show immediately in the chat interface
    const outgoingMsg = {
      id: `msg-sent-${Date.now()}`,
      sender: 'counselor',
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    let updatedLead = null;
    let activeLead = null;
    const nextLeads = leads.map(lead => {
      if (lead.id === leadId) {
        activeLead = lead;
        const updatedChat = [...(lead.whatsappMessages || []), outgoingMsg];
        const nextTimeline = [...(lead.timeline || []), {
          id: `log-wa-${Date.now()}`,
          type: 'whatsapp',
          title: 'WhatsApp Dispatched',
          content: messageText,
          timestamp: new Date().toISOString(),
          user: activeUser
        }];
        updatedLead = { ...lead, whatsappMessages: updatedChat, timeline: nextTimeline };
        return updatedLead;
      }
      return lead;
    });

    // We only update local state here. The actual Firestore write happens in the sendWhatsAppMessage Cloud Function!
    // This prevents the message from being duplicated in the UI when the Cloud Function also appends it.
    // Always update local state for immediate feedback
    // Always update local state for immediate feedback
    setLeads(nextLeads);

    // 2. Attempt Real Network Dispatch to Meta WhatsApp API
    let apiSuccess = false;
    if (activeLead && activeLead.phone) {
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'leads-management-tz';
      const url = `https://us-central1-${projectId}.cloudfunctions.net/sendWhatsAppMessage`;

      const rawPhone = activeLead.phone;
      const digitsOnly = rawPhone.replace(/\D/g, '');
      const normalizedPhone = digitsOnly ? `+${digitsOnly}` : rawPhone;

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: leadId,
            recipientPhone: normalizedPhone,
            messageText: messageText,
            counselorName: activeUser,
            templateData: templateData
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToastMsg('WhatsApp message delivered in real-time!', 'success');
          apiSuccess = true;
        } else {
          console.error('WhatsApp API failed:', data.error, data.details);
        }
      } catch (err) {
        console.error('Error dispatching WhatsApp to Cloud Function:', err);
      }
    }

    // 3. Fallback / Mock Behavior
    // If the API failed (e.g. not configured yet), trigger the simulated bot response so the UI still feels alive.
    if (!apiSuccess) {
      setTimeout(() => {
        triggerSimulatedBotReply(leadId, updatedLead?.name || 'Student', messageText);
      }, 3000);
    }

    return true;
  };

  const triggerSimulatedBotReply = (leadId, studentName, outgoingText) => {
    let coursesText = 'We offer the following programs:\n1. Full-Stack Web Development (6 Months)\n2. Data Science & AI (8 Months)\n3. Cloud & DevOps Engineering (5 Months)\n4. Cyber Security (6 Months)\n5. UI/UX Product Design (4 Months)\n\nReply with the course number to get fee details!';
    let feeDetails = 'Our program fee structures are:\n- Web Development: ₹75,000\n- Data Science & AI: ₹95,000\n- Cloud & DevOps: ₹80,000\n- Cyber Security: ₹85,000\n- UI/UX Design: ₹60,000\n\nScholarships and monthly installment plans (EMIs starting at ₹5,000/month) are available. Let us know if you want to speak to a counselor.';
    
    try {
      const storedSettings = localStorage.getItem('gowha_chatbot');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        if (parsed.coursesText) coursesText = parsed.coursesText;
        if (parsed.feeDetails) feeDetails = parsed.feeDetails;
      }
    } catch (e) {
      console.error("Failed to parse chatbot settings:", e);
    }

    let reply = `Thanks for sending that over! I am checking it out now. Let me know when is the best time to speak.`;
    
    const lowerText = outgoingText.toLowerCase();
    if (lowerText.includes('syllabus') || lowerText.includes('brochure') || lowerText.includes('pdf')) {
      reply = `Got the syllabus details, thank you! The module outline look really exhaustive. Can you tell me if there are internship placements after graduation?`;
    } else if (lowerText.includes('demo') || lowerText.includes('join') || lowerText.includes('zoom')) {
      reply = `Yes, I have noted down the time. I will definitely attend the demo session. Thanks!`;
    } else if (lowerText.includes('fees') || lowerText.includes('fee') || lowerText.includes('payment') || lowerText.includes('cost') || lowerText.includes('price')) {
      reply = feeDetails;
    } else if (lowerText.includes('course') || lowerText.includes('program') || lowerText.includes('learn') || lowerText.includes('study')) {
      reply = coursesText;
    }

    const inboundMsg = {
      id: `msg-recv-${Date.now()}`,
      sender: 'lead',
      text: reply,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setLeads(prevLeads => {
      return prevLeads.map(lead => {
        if (lead.id === leadId) {
          const updatedChat = [...(lead.whatsappMessages || []), inboundMsg];
          const nextTimeline = [
            ...(lead.timeline || []),
            {
              id: `log-wa-in-${Date.now()}`,
              type: 'whatsapp',
              title: 'WhatsApp Received',
              content: reply,
              timestamp: new Date().toISOString(),
              user: 'System'
            }
          ];

          const updatedLead = {
            ...lead,
            whatsappMessages: updatedChat,
            timeline: nextTimeline
          };

          if (isFirebaseEnabled) {
            setDoc(doc(db, 'leads', leadId), updatedLead).catch(err => {
              console.error("Firestore triggerSimulatedBotReply failed:", err);
            });
          }

          return updatedLead;
        }
        return lead;
      });
    });

    // Trigger local alert
    setNotifications(prev => [
      {
        id: `notif-${Date.now()}`,
        title: `WhatsApp Inbound: ${studentName}`,
        content: reply,
        timestamp: new Date().toISOString(),
        read: false
      },
      ...prev
    ]);
  };

  // Bulk Reassignment of leads to another counselor
  const bulkReassignLeads = (leadIds, newCounselor) => {
    const nextLeads = leads.map(lead => {
      if (leadIds.includes(lead.id)) {
        return {
          ...lead,
          counselor: newCounselor,
          timeline: [
            ...(lead.timeline || []),
            {
              id: `log-re-${Date.now()}`,
              type: 'system',
              title: 'Lead Reassigned',
              content: `Lead ownership transferred bulk to ${newCounselor}`,
              timestamp: new Date().toISOString(),
              user: activeUser
            }
          ]
        };
      }
      return lead;
    });

    if (isFirebaseEnabled) {
      const batch = writeBatch(db);
      nextLeads.forEach(lead => {
        if (leadIds.includes(lead.id)) {
          batch.set(doc(db, 'leads', lead.id), lead);
        }
      });
      batch.commit().catch(err => {
        console.error("Firestore bulkReassignLeads failed, falling back to local update:", err);
        setLeads(nextLeads);
      });
    } else {
      setLeads(nextLeads);
    }
    showToastMsg(`Bulk reassigned ${leadIds.length} inquiries to ${newCounselor}`);
  };

  // Bulk Stage shift
  const bulkUpdateStage = (leadIds, nextStage) => {
    const nextLeads = leads.map(lead => {
      if (leadIds.includes(lead.id)) {
        return {
          ...lead,
          stage: nextStage,
          timeline: [
            ...(lead.timeline || []),
            {
              id: `log-bulk-st-${Date.now()}`,
              type: 'system',
              title: 'Bulk Stage Shift',
              content: `Moved status collectively to "${nextStage}"`,
              timestamp: new Date().toISOString(),
              user: activeUser
            }
          ]
        };
      }
      return lead;
    });

    if (isFirebaseEnabled) {
      const batch = writeBatch(db);
      nextLeads.forEach(lead => {
        if (leadIds.includes(lead.id)) {
          batch.set(doc(db, 'leads', lead.id), lead);
        }
      });
      batch.commit().catch(err => {
        console.error("Firestore bulkUpdateStage failed, falling back to local update:", err);
        setLeads(nextLeads);
      });
    } else {
      setLeads(nextLeads);
    }
    showToastMsg(`Bulk shifted ${leadIds.length} inquiries to ${nextStage}`);
  };

  // Bulk Delete
  const bulkDeleteLeads = (leadIds) => {
    if (isFirebaseEnabled) {
      const batch = writeBatch(db);
      leadIds.forEach(id => {
        batch.delete(doc(db, 'leads', id));
      });
      batch.commit().catch(err => {
        console.error("Firestore bulkDeleteLeads failed, falling back to local update:", err);
      });
    }
    setLeads(prev => prev.filter(l => !leadIds.includes(l.id)));
    showToastMsg(`Bulk deleted ${leadIds.length} leads successfully`);
  };

  // Custom Field Adder
  const addCustomField = (field) => {
    const newField = {
      id: `cf-${Date.now()}`,
      name: field.name,
      type: field.type,
      options: field.options || [],
      required: field.required || false
    };

    if (isFirebaseEnabled) {
      setDoc(doc(db, 'customFields', newField.id), newField)
        .catch(err => {
          console.error("Firestore addCustomField failed:", err);
          setCustomFields(prev => [...prev, newField]);
        });
    } else {
      setCustomFields(prev => [...prev, newField]);
    }
    showToastMsg(`Custom field "${field.name}" added successfully.`);
  };

  // Course Adder
  const addCourse = (courseData) => {
    const newCourse = {
      id: `c-${Date.now()}`,
      name: courseData.name,
      code: courseData.code,
      duration: courseData.duration,
      fee: courseData.fee,
      description: courseData.description || ''
    };

    if (isFirebaseEnabled) {
      setDoc(doc(db, 'courses', newCourse.id), newCourse)
        .catch(err => {
          console.error("Firestore addCourse failed:", err);
          setCourses(prev => [...prev, newCourse]);
        });
    } else {
      setCourses(prev => [...prev, newCourse]);
    }
    showToastMsg(`Course "${courseData.name}" added to list.`);
  };

  // Course Remover
  const removeCourse = (courseId) => {
    if (isFirebaseEnabled) {
      deleteDoc(doc(db, 'courses', courseId))
        .catch(err => {
          console.error("Firestore removeCourse failed, falling back to local delete:", err);
          setCourses(prev => prev.filter(c => c.id !== courseId));
        });
    } else {
      setCourses(prev => prev.filter(c => c.id !== courseId));
    }
    showToastMsg('Course removed successfully.', 'error');
  };

  // Stage Adder
  const addStage = (stageData) => {
    const nextVal = `st-${Date.now()}`;
    const colors = ['--color-new', '--color-contacted', '--color-interested', '--color-demo-sched', '--color-demo-attend', '--color-followup', '--color-converted'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newStage = {
      id: nextVal,
      name: stageData.name,
      color: randomColor,
      description: stageData.description || '',
      order: pipelineStages.length
    };

    if (isFirebaseEnabled) {
      setDoc(doc(db, 'pipelineStages', newStage.id), newStage)
        .catch(err => {
          console.error("Firestore addStage failed:", err);
          setPipelineStages(prev => [...prev, newStage]);
        });
    } else {
      setPipelineStages(prev => [...prev, newStage]);
    }
    showToastMsg(`Pipeline stage "${stageData.name}" created!`);
  };

  // Counselor/User Adder
  const addCounselor = (counselorData) => {
    const name = counselorData.name.trim();
    const email = counselorData.email ? counselorData.email.trim() : `${name.toLowerCase().replace(/ /g, '.')}@academy.com`;
    const password = counselorData.password ? counselorData.password.trim() : 'counselor';
    const role = counselorData.role || 'Counselor';
    const status = counselorData.status || 'Active';
    const newCounselor = {
      id: `coun-${Date.now()}`,
      name: name,
      email: email,
      password: password,
      role: role,
      status: status
    };

    if (isFirebaseEnabled) {
      setDoc(doc(db, 'users', newCounselor.id), newCounselor)
        .catch(err => {
          console.error("Firestore addCounselor failed:", err);
          setCounselors(prev => [...prev, newCounselor]);
        });
    } else {
      setCounselors(prev => [...prev, newCounselor]);
    }
    showToastMsg(`User "${name}" added successfully.`);
  };

  // Counselor Remover
  const removeCounselor = (counselorId) => {
    if (isFirebaseEnabled) {
      deleteDoc(doc(db, 'users', counselorId))
        .catch(err => {
          console.error("Firestore removeCounselor failed:", err);
          setCounselors(prev => prev.filter(c => c.id !== counselorId));
        });
    } else {
      setCounselors(prev => prev.filter(c => c.id !== counselorId));
    }
    showToastMsg('User removed successfully.', 'error');
  };

  const updateCounselorStatus = (counselorId, status) => {
    const nextCounselors = counselors.map(c => {
      if (c.id === counselorId) {
        return { ...c, status };
      }
      return c;
    });

    if (isFirebaseEnabled) {
      setDoc(doc(db, 'users', counselorId), { status }, { merge: true })
        .catch(err => {
          console.error("Firestore updateCounselorStatus failed, falling back to local update:", err);
          setCounselors(nextCounselors);
        });
    } else {
      setCounselors(nextCounselors);
    }
    showToastMsg(`User status updated to ${status}.`);
  };

  // Clear Notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Dynamic branding visual updates
  const changeBrandingColors = (brandingProps) => {
    const nextBranding = {
      ...branding,
      ...brandingProps
    };

    if (isFirebaseEnabled) {
      setDoc(doc(db, 'settings', 'branding'), nextBranding)
        .catch(err => {
          console.error("Firestore save branding failed:", err);
          setBranding(nextBranding);
        });
    } else {
      setBranding(nextBranding);
    }
    showToastMsg('Visual customization saved successfully.');
  };

  const updateIntegration = (platform, configFields, silent = false) => {
    const nextIntegrations = {
      ...integrations,
      [platform]: {
        ...integrations[platform],
        ...configFields
      }
    };

    if (isFirebaseEnabled) {
      setDoc(doc(db, 'settings', 'integrations'), nextIntegrations)
        .catch(err => {
          console.error("Firestore save integrations failed:", err);
          setIntegrations(nextIntegrations);
        });
    } else {
      setIntegrations(nextIntegrations);
    }

    if (!silent) {
      showToastMsg(`${platform.toUpperCase()} configuration successfully updated!`);
    }
  };

  return (
    <CRMContext.Provider value={{
      leads,
      courses,
      pipelineStages,
      customFields,
      branding,
      integrations,
      activeRole,
      activeUser,
      isLoggedIn,
      isFirebaseEnabled,
      notifications,
      activeView,
      whatsappSubView,
      setWhatsappSubView: changeWhatsappSubView,
      selectedLeadId,
      searchQuery,
      showDetailModal,
      toast,
      counselors,
      addCounselor,
      removeCounselor,
      removeCourse,
      updateCounselorStatus,
      
      login,
      logout,
      setActiveRole,
      setActiveUser,
      setActiveView,
      setSelectedLeadId,
      setSearchQuery,
      setShowDetailModal,
      addLead,
      addBulkLeads,
      updateLead,
      deleteLead,
      prefilledCampaignLeads,
      setPrefilledCampaignLeads,
      updateLeadStage,
      logCall,
      logNote,
      scheduleFollowup,
      completeFollowup,
      scheduleDemo,
      logDemoAttendance,
      sendWhatsAppMsg,
      bulkReassignLeads,
      bulkUpdateStage,
      bulkDeleteLeads,
      addCustomField,
      addCourse,
      addStage,
      clearNotifications,
      changeBrandingColors,
      showToastMsg,
      updateIntegration
    }}>
      {children}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}>
            {toast.type === 'error' ? (
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            ) : (
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </CRMContext.Provider>
  );
};

export const useCRM = () => useContext(CRMContext);
