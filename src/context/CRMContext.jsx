import React, { createContext, useContext, useState, useEffect } from 'react';

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
  { id: 'st-followup', name: 'Follow-up Pending', color: '--color-followup', description: 'Awaiting callback' },
  { id: 'st-notinterest', name: 'Not Interested', color: '--color-not-interested', description: 'Declined enrollment' },
  { id: 'st-converted', name: 'Converted', color: '--color-converted', description: 'Successfully enrolled' },
  { id: 'st-closed', name: 'Closed', color: '--color-closed', description: 'No further action' }
];

const DEFAULT_CUSTOM_FIELDS = [
  { id: 'cf-blood', name: 'Blood Group', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: false },
  { id: 'cf-transport', name: 'Transport Required', type: 'select', options: ['Yes', 'No'], required: false },
  { id: 'cf-prior-coding', name: 'Prior Coding Experience', type: 'select', options: ['None', 'Basic', 'Intermediate', 'Professional'], required: false }
];

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
    enabled: true,
    status: 'Connected',
    appId: '1249581023849102',
    systemToken: 'EAAGy7A_meta_token_secure_xyz',
    pageId: '109283471029',
    webhookVerifyToken: 'techzone_secret_verify_2026',
    simulatedLeadsCount: 1247
  },
  google: {
    enabled: false,
    status: 'Setup Required',
    developerToken: '',
    customerId: '',
    clientId: '',
    clientSecret: '',
    webhookPasskey: 'google_ad_passkey_987',
    simulatedLeadsCount: 892
  },
  whatsapp: {
    enabled: true,
    status: 'Connected',
    phoneNumberId: '102938471',
    businessAccountId: '982734912',
    systemToken: 'EAAGy7B_whatsapp_token_secure_987',
    simulatedLeadsCount: 645
  },
  webhooks: {
    enabled: true,
    status: 'Connected',
    securitySecret: 'whsec_tz_83749281',
    webhookUrlSlug: 'inst_aarav_mumbai_786',
    simulatedLeadsCount: 612
  }
};

const DEFAULT_COUNSELORS = [
  { id: 'coun-elena', name: 'Elena Gilbert', email: 'elena@academy.com', role: 'Counselor' },
  { id: 'coun-damon', name: 'Damon Salvatore', email: 'damon@academy.com', role: 'Counselor' },
  { id: 'coun-stefan', name: 'Stefan Salvatore', email: 'stefan@academy.com', role: 'Counselor' }
];

// Rich Seed Data of 15 Leads
const SEED_LEADS = [
  {
    id: 'lead-1',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@gmail.com',
    phone: '+91 98765 43210',
    location: 'Mumbai',
    education: 'Final Year B.Tech',
    course: 'Full-Stack Web Development',
    source: 'Meta Ads',
    counselor: 'Elena Gilbert',
    stage: 'New Lead',
    priority: 'Hot',
    createdDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    lastContacted: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    customFields: { 'cf-blood': 'O+', 'cf-transport': 'Yes', 'cf-prior-coding': 'None' },
    timeline: [
      { id: 'log-1-1', type: 'system', title: 'Lead Captured', content: 'Lead created automatically via Facebook Lead Ads webhook.', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), user: 'System' }
    ],
    whatsappMessages: [
      { id: 'msg-1-1', sender: 'lead', text: 'Hi, I saw your ad on Instagram. Can I get details on the Full Stack course?', time: '10:00 AM' }
    ]
  },
  {
    id: 'lead-2',
    name: 'Neha Patel',
    email: 'neha.patel@yahoo.com',
    phone: '+91 98123 45678',
    location: 'Ahmedabad',
    education: 'Graduate (B.Sc Computer Science)',
    course: 'Data Science & Artificial Intelligence',
    source: 'Google Search',
    counselor: 'Damon Salvatore',
    stage: 'New Lead',
    priority: 'Warm',
    createdDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    lastContacted: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    customFields: { 'cf-blood': 'A+', 'cf-transport': 'No', 'cf-prior-coding': 'Basic' },
    timeline: [
      { id: 'log-2-1', type: 'system', title: 'Lead Captured', content: 'Form submission completed via website contact page.', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), user: 'System' },
      { id: 'log-2-2', type: 'call', title: 'Outbound Call - Connected', content: 'Spoke with Neha. She wants to shift careers from general science to AI. Sent details and course brochure to her email.', timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), user: 'Damon Salvatore' }
    ],
    whatsappMessages: [
      { id: 'msg-2-1', sender: 'counselor', text: 'Hello Neha! Thank you for inquiring about our Data Science & AI program. Here is our detailed brochure.', time: '02:30 PM' },
      { id: 'msg-2-2', sender: 'lead', text: 'Thank you! Can you tell me what the total fee is?', time: '02:40 PM' }
    ]
  },
  {
    id: 'lead-3',
    name: 'Rahul Verma',
    email: 'rahul.verma@outlook.com',
    phone: '+91 91234 56789',
    location: 'Delhi',
    education: 'Working Professional (Sales)',
    course: 'UI/UX Product Design',
    source: 'Website Form',
    counselor: 'Elena Gilbert',
    stage: 'New Lead',
    priority: 'Hot',
    createdDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    lastContacted: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    customFields: { 'cf-blood': 'B+', 'cf-transport': 'No', 'cf-prior-coding': 'None' },
    timeline: [
      { id: 'log-3-1', type: 'system', title: 'Lead Captured', content: 'Google Landing Page form inquiry received.', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), user: 'System' },
      { id: 'log-3-2', type: 'call', title: 'Intro Call - Interested', content: 'Highly enthusiastic about UI/UX. Currently in digital sales, wants to shift to design. Discussed fees and batches.', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), user: 'Elena Gilbert' },
      { id: 'log-3-3', type: 'whatsapp', title: 'WhatsApp Sent', content: 'Sent Figma syllabus presentation link via WhatsApp.', timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), user: 'Elena Gilbert' }
    ],
    whatsappMessages: [
      { id: 'msg-3-1', sender: 'counselor', text: 'Hey Rahul, as discussed on call, here is the syllabus layout for UI/UX. Let me know what you think!', time: '11:15 AM' },
      { id: 'msg-3-2', sender: 'lead', text: 'This looks fantastic! Do you have weekend batches available?', time: '11:20 AM' },
      { id: 'msg-3-3', sender: 'counselor', text: 'Yes, we have a specialized weekend batch starting this Saturday from 10 AM to 2 PM.', time: '11:22 AM' }
    ]
  },
  {
    id: 'lead-4',
    name: 'Sneha Reddy',
    email: 'sneha.reddy@gmail.com',
    phone: '+91 88888 77777',
    location: 'Bangalore',
    education: '12th Standard Completed',
    course: 'Full-Stack Web Development',
    source: 'Walk-in',
    counselor: 'Stefan Salvatore',
    stage: 'New Lead',
    priority: 'Hot',
    createdDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    lastContacted: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    customFields: { 'cf-blood': 'O-', 'cf-transport': 'Yes', 'cf-prior-coding': 'Basic' },
    timeline: [
      { id: 'log-4-1', type: 'system', title: 'Walk-In Profile Created', content: 'Sneha visited the institute location with her parents.', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), user: 'Stefan Salvatore' },
      { id: 'log-4-2', type: 'demo', title: 'Demo Classroom Scheduled', content: 'Scheduled demo session for Web Dev on Tuesday at 4:00 PM.', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), user: 'Stefan Salvatore' }
    ],
    whatsappMessages: []
  },
  {
    id: 'lead-5',
    name: 'Aditya Nair',
    email: 'aditya.nair@gmail.com',
    phone: '+91 99000 88000',
    location: 'Kochi',
    education: 'BBA Completed',
    course: 'Digital Marketing',
    source: 'Student Referral',
    counselor: 'Elena Gilbert',
    stage: 'New Lead',
    priority: 'Warm',
    createdDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    lastContacted: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    customFields: { 'cf-blood': 'AB+', 'cf-transport': 'No', 'cf-prior-coding': 'None' },
    timeline: [
      { id: 'log-5-1', type: 'system', title: 'Referred Lead Logged', content: 'Referred by active student Rohan Malhotra.', timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), user: 'System' },
      { id: 'log-5-2', type: 'demo', title: 'Demo Classroom Attended', content: 'Attended the Digital Marketing SEO overview class. Feedback was excellent.', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), user: 'Elena Gilbert' }
    ],
    whatsappMessages: []
  },
  {
    id: 'lead-6',
    name: 'Ananya Sen',
    email: 'ananya.sen@gmail.com',
    phone: '+91 77776 66655',
    location: 'Kolkata',
    education: 'Final Year BCA',
    course: 'Cyber Security & Ethical Hacking',
    source: 'Google Search',
    counselor: 'Damon Salvatore',
    stage: 'New Lead',
    priority: 'Warm',
    createdDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    lastContacted: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    customFields: { 'cf-blood': 'A-', 'cf-transport': 'No', 'cf-prior-coding': 'Intermediate' },
    timeline: [
      { id: 'log-6-1', type: 'system', title: 'Lead Captured', content: 'Form submission completed via website contact page.', timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), user: 'System' },
      { id: 'log-6-2', type: 'call', title: 'Intro Call - Connected', content: 'Discussed Ethical Hacking career path. Ananya wants to enroll but has exams until the end of the month. Requested a call back next Monday.', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), user: 'Damon Salvatore' }
    ],
    whatsappMessages: [],
    followupDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago (OVERDUE!)
    followupReason: 'Call back to schedule batch seat after her BCA exams.'
  },
  {
    id: 'lead-7',
    name: 'Vikram Malhotra',
    email: 'vikram.m@gmail.com',
    phone: '+91 99999 88888',
    location: 'Pune',
    education: 'B.Tech Graduate',
    course: 'Cloud & DevOps Engineering',
    source: 'Meta Ads',
    counselor: 'Stefan Salvatore',
    stage: 'Converted',
    priority: 'Hot',
    createdDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    lastContacted: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    customFields: { 'cf-blood': 'B-', 'cf-transport': 'No', 'cf-prior-coding': 'Intermediate' },
    timeline: [
      { id: 'log-7-1', type: 'system', title: 'Lead Captured', content: 'Instagram Lead Form inquiry.', timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), user: 'System' },
      { id: 'log-7-2', type: 'call', title: 'Discussed AWS Path', content: 'Highly focused on AWS/Kubernetes. Eager to join immediate batch.', timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), user: 'Stefan Salvatore' },
      { id: 'log-7-3', type: 'demo', title: 'Demo Classroom Attended', content: 'Attended the Docker live seminar.', timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), user: 'Stefan Salvatore' },
      { id: 'log-7-4', type: 'system', title: 'Fees Paid - Converted', content: 'Paid booking amount of ₹25,000. Registration generated.', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), user: 'System' }
    ],
    whatsappMessages: []
  },
  {
    id: 'lead-8',
    name: 'Pooja Gupta',
    email: 'pooja.gupta@yahoo.co.in',
    phone: '+91 88998 89988',
    location: 'Mumbai',
    education: 'B.Com Completed',
    course: 'Digital Marketing',
    source: 'Walk-in',
    counselor: 'Elena Gilbert',
    stage: 'Not Interested',
    priority: 'Cold',
    createdDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    lastContacted: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    customFields: { 'cf-blood': 'O+', 'cf-transport': 'No', 'cf-prior-coding': 'None' },
    timeline: [
      { id: 'log-8-1', type: 'system', title: 'In-person Entry Created', content: 'Manual Walk-In card logged.', timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), user: 'Elena Gilbert' },
      { id: 'log-8-2', type: 'call', title: 'Follow-up Call - Declined', content: 'She decided to pursue an MBA in marketing instead of a diploma course. Marked as Not Interested.', timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(), user: 'Elena Gilbert' }
    ],
    whatsappMessages: []
  },
  {
    id: 'lead-9',
    name: 'Karan Johar',
    email: 'karan.j@gmail.com',
    phone: '+91 95432 10987',
    location: 'Mumbai',
    education: 'Working Professional (HR)',
    course: 'UI/UX Product Design',
    source: 'Meta Ads',
    counselor: 'Damon Salvatore',
    stage: 'Interested',
    priority: 'Warm',
    createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    lastContacted: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    customFields: { 'cf-blood': 'AB-', 'cf-transport': 'No', 'cf-prior-coding': 'None' },
    timeline: [
      { id: 'log-9-1', type: 'system', title: 'Lead Captured', content: 'Facebook inquiry details synced.', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), user: 'System' },
      { id: 'log-9-2', type: 'call', title: 'Call Connected', content: 'Karan is curious about shifting to UX research. Sent curriculum link.', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), user: 'Damon Salvatore' }
    ],
    whatsappMessages: []
  },
  {
    id: 'lead-10',
    name: 'Riya Sen',
    email: 'riya.sen@outlook.com',
    phone: '+91 82345 67890',
    location: 'Pune',
    education: 'B.Sc Graduate',
    course: 'Data Science & Artificial Intelligence',
    source: 'Website Form',
    counselor: 'Stefan Salvatore',
    stage: 'Demo Scheduled',
    priority: 'Hot',
    createdDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    lastContacted: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    customFields: { 'cf-blood': 'O+', 'cf-transport': 'Yes', 'cf-prior-coding': 'None' },
    timeline: [
      { id: 'log-10-1', type: 'system', title: 'Lead Captured', content: 'Landing Page submission.', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), user: 'System' },
      { id: 'log-10-2', type: 'demo', title: 'Demo Classroom Scheduled', content: 'Demo scheduled for today at 5:30 PM.', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), user: 'Stefan Salvatore' }
    ],
    whatsappMessages: []
  },
  {
    id: 'lead-11',
    name: 'Amit Trivedi',
    email: 'amit.t@gmail.com',
    phone: '+91 93333 44444',
    location: 'Ahmedabad',
    education: 'Working Professional (Admin)',
    course: 'Cyber Security & Ethical Hacking',
    source: 'Student Referral',
    counselor: 'Elena Gilbert',
    stage: 'Follow-up Pending',
    priority: 'Hot',
    createdDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    lastContacted: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    customFields: { 'cf-blood': 'B+', 'cf-transport': 'No', 'cf-prior-coding': 'Basic' },
    timeline: [
      { id: 'log-11-1', type: 'system', title: 'Lead Captured', content: 'Logged as referral.', timestamp: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), user: 'System' }
    ],
    whatsappMessages: [],
    followupDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours in the future
    followupReason: 'Verify brochure reading and schedule demo batch.'
  },
  {
    id: 'lead-12',
    name: 'Tanvi Shah',
    email: 'tanvi.shah@gmail.com',
    phone: '+91 95555 44444',
    location: 'Baroda',
    education: 'Final Year B.Tech IT',
    course: 'Full-Stack Web Development',
    source: 'Google Search',
    counselor: 'Stefan Salvatore',
    stage: 'Converted',
    priority: 'Hot',
    createdDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    lastContacted: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    customFields: { 'cf-blood': 'A+', 'cf-transport': 'No', 'cf-prior-coding': 'Intermediate' },
    timeline: [
      { id: 'log-12-1', type: 'system', title: 'Lead Created', content: 'Search lead.', timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), user: 'System' },
      { id: 'log-12-2', type: 'system', title: 'Full Fees Paid', content: 'Paid full admission amount ₹75,000. Registration completed.', timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), user: 'System' }
    ],
    whatsappMessages: []
  }
];

export const CRMProvider = ({ children }) => {
  // Database States
  const [leads, setLeads] = useState(() => {
    const hasResetSeeds = localStorage.getItem('crm_leads_seed_reset_v4');
    if (!hasResetSeeds) {
      localStorage.setItem('crm_leads_seed_reset_v4', 'true');
      localStorage.setItem('crm_leads', JSON.stringify(SEED_LEADS));
      return SEED_LEADS;
    }
    const local = localStorage.getItem('crm_leads');
    return local ? JSON.parse(local) : SEED_LEADS;
  });

  const [courses, setCourses] = useState(() => {
    const local = localStorage.getItem('crm_courses');
    return local ? JSON.parse(local) : DEFAULT_COURSES;
  });

  const [pipelineStages, setPipelineStages] = useState(() => {
    const local = localStorage.getItem('crm_stages');
    return local ? JSON.parse(local) : DEFAULT_STAGES;
  });

  const [customFields, setCustomFields] = useState(() => {
    const local = localStorage.getItem('crm_custom_fields');
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

  const [integrations, setIntegrations] = useState(() => {
    const local = localStorage.getItem('crm_integrations');
    return local ? JSON.parse(local) : DEFAULT_INTEGRATIONS;
  });

  // Global Session Roles
  const [activeRole, setActiveRole] = useState(() => {
    const local = localStorage.getItem('crm_active_role');
    return local ? JSON.parse(local) : 'Admin'; // Admin, Manager, Counselor
  });

  const [activeUser, setActiveUser] = useState(() => {
    const local = localStorage.getItem('crm_active_user');
    return local ? JSON.parse(local) : 'Elena Gilbert'; // Matches seed counselor
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const local = localStorage.getItem('crm_logged_in');
    return local === 'true';
  });

  const login = (email, password) => {
    const formattedEmail = email.toLowerCase().trim();
    if (formattedEmail === 'admin' || formattedEmail === 'stefan@academy.com') {
      if (password === 'admin' || password === 'stefan123') {
        setActiveRole('Admin');
        setActiveUser('Stefan Salvatore');
        setIsLoggedIn(true);
        showToastMsg('Logged in as Admin: Stefan Salvatore', 'success');
        return true;
      }
    } else if (formattedEmail === 'manager' || formattedEmail === 'damon@academy.com') {
      if (password === 'manager' || password === 'damon123') {
        setActiveRole('Manager');
        setActiveUser('Damon Salvatore');
        setIsLoggedIn(true);
        showToastMsg('Logged in as Manager: Damon Salvatore', 'success');
        return true;
      }
    } else if (formattedEmail === 'counselor' || formattedEmail === 'elena@academy.com') {
      if (password === 'counselor' || password === 'elena123') {
        setActiveRole('Counselor');
        setActiveUser('Elena Gilbert');
        setIsLoggedIn(true);
        showToastMsg('Logged in as Counselor: Elena Gilbert', 'success');
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    setIsLoggedIn(false);
    showToastMsg('Logged out successfully.', 'info');
  };

  useEffect(() => {
    localStorage.setItem('crm_logged_in', isLoggedIn ? 'true' : 'false');
  }, [isLoggedIn]);

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

  const [selectedLeadId, setSelectedLeadId] = useState(() => {
    const local = localStorage.getItem('crm_selected_lead_id');
    return local ? JSON.parse(local) : null;
  });

  const [searchQuery, setSearchQuery] = useState('');

  // Global Toast State
  const [toast, setToast] = useState(null);

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
    localStorage.setItem('crm_custom_fields', JSON.stringify(customFields));
  }, [customFields]);

  useEffect(() => {
    localStorage.setItem('crm_branding', JSON.stringify(branding));
    applyThemeBranding(branding);
  }, [branding]);

  useEffect(() => {
    localStorage.setItem('crm_integrations', JSON.stringify(integrations));
  }, [integrations]);

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
    const newLead = {
      id: `lead-${Date.now()}`,
      name: leadData.name || 'Anonymous Inquiry',
      email: leadData.email || '',
      phone: leadData.phone || '',
      location: leadData.location || 'Website Source',
      education: leadData.education || 'Not Provided',
      course: leadData.course || (courses[0] ? courses[0].name : ''),
      source: leadData.source || 'Website Form',
      counselor: leadData.counselor || activeUser,
      stage: leadData.stage || 'New Lead',
      priority: leadData.priority || 'Warm',
      createdDate: new Date().toISOString(),
      lastContacted: new Date().toISOString(),
      customFields: leadData.customFields || {},
      timeline: [
        {
          id: `log-${Date.now()}`,
          type: 'system',
          title: 'Lead Captured',
          content: `Inquiry successfully entered system via ${leadData.source || 'Website Form'}.`,
          timestamp: new Date().toISOString(),
          user: 'System'
        }
      ],
      whatsappMessages: []
    };

    setLeads(prev => [newLead, ...prev]);

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

  // Editing lead variables
  const updateLead = (leadId, updatedFields) => {
    setLeads(prev => prev.map(lead => {
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

        return {
          ...lead,
          ...updatedFields,
          lastContacted: new Date().toISOString(),
          timeline: [...(lead.timeline || []), ...auditLogs]
        };
      }
      return lead;
    }));
    showToastMsg('Student profile successfully updated.');
  };

  // Delete Lead
  const deleteLead = (leadId) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
    showToastMsg('Inquiry removed from CRM database.', 'error');
    if (selectedLeadId === leadId) {
      setSelectedLeadId(null);
      setActiveView('dashboard');
    }
  };

  // Direct Lead Stage update (Kanban Drag and Drop outcome)
  const updateLeadStage = (leadId, nextStage, stageChangeNote = '') => {
    setLeads(prev => prev.map(lead => {
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
        }

        return {
          ...lead,
          stage: nextStage,
          lastContacted: new Date().toISOString(),
          timeline: logs,
          whatsappMessages: whatsappHistory
        };
      }
      return lead;
    }));
    showToastMsg(`Lead status updated to ${nextStage}`);
  };

  // Logging interaction call logs
  const logCall = (leadId, callDetails) => {
    const callLog = {
      id: `log-call-${Date.now()}`,
      type: 'call',
      title: `Call Logged: ${callDetails.status}`,
      content: `Interest Level: ${callDetails.interest}. outcome: ${callDetails.notes}. Questions asked: ${callDetails.questions.length ? callDetails.questions.join(', ') : 'None'}.`,
      timestamp: new Date().toISOString(),
      user: activeUser
    };

    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        const nextTimeline = [...(lead.timeline || []), callLog];
        let nextStage = lead.stage;
        let nextFollowupDate = lead.followupDate;
        let nextFollowupReason = lead.followupReason;

        // If outcome requires status change
        if (callDetails.updateStage && callDetails.updateStage !== '') {
          nextStage = callDetails.updateStage;
          nextTimeline.push({
            id: `log-stage-${Date.now()}`,
            type: 'system',
            title: 'Stage Shifted',
            content: `Changed dynamically via call outcome logging to "${callDetails.updateStage}"`,
            timestamp: new Date().toISOString(),
            user: activeUser
          });
        }

        // Setup dynamic follow-up inside lead profile if scheduled
        if (callDetails.scheduleFollowup && callDetails.followupDate) {
          nextFollowupDate = new Date(callDetails.followupDate).toISOString();
          nextFollowupReason = callDetails.followupReason || 'Scheduled callback';
          nextTimeline.push({
            id: `log-sched-${Date.now()}`,
            type: 'followup',
            title: 'Follow-up Scheduled',
            content: `Scheduled for ${new Date(callDetails.followupDate).toLocaleString()} - Reason: ${nextFollowupReason}`,
            timestamp: new Date().toISOString(),
            user: activeUser
          });
        }

        return {
          ...lead,
          stage: nextStage,
          followupDate: nextFollowupDate,
          followupReason: nextFollowupReason,
          lastContacted: new Date().toISOString(),
          timeline: nextTimeline
        };
      }
      return lead;
    }));

    showToastMsg('Call history logged successfully.');
  };

  // Directly schedule/postpone a follow-up date
  const scheduleFollowup = (leadId, dateStr, reason) => {
    const schedDate = new Date(dateStr).toISOString();
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        return {
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
      }
      return lead;
    }));
    showToastMsg('Follow-up scheduled.');
  };

  // Completed follow-up callback clearing
  const completeFollowup = (leadId) => {
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        return {
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
      }
      return lead;
    }));
    showToastMsg('Follow-up task marked completed.');
  };

  // Directly schedule a demo
  const scheduleDemo = (leadId, demoDetails) => {
    const demoDate = new Date(`${demoDetails.date}T${demoDetails.time}`).toISOString();
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        const title = `Demo Scheduled (${demoDetails.mode})`;
        const desc = `Trainer: ${demoDetails.trainer}. Class link/room: ${demoDetails.locationLink}. Timings: ${new Date(demoDate).toLocaleString()}`;
        return {
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
      }
      return lead;
    }));
    showToastMsg('Class/Demo scheduled successfully.');
  };

  // Mark Demo Attendance
  const logDemoAttendance = (leadId, attendanceStatus) => {
    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        const nextStage = attendanceStatus === 'Attended' ? 'Demo Attended' : lead.stage;
        return {
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
      }
      return lead;
    }));
    showToastMsg(`Attendance logged: ${attendanceStatus}`);
  };

  // Sending custom WhatsApp logs & triggering bot automated simulated reply
  const sendWhatsAppMsg = (leadId, messageText) => {
    if (!messageText.trim()) return;

    const outgoingMsg = {
      id: `msg-sent-${Date.now()}`,
      sender: 'counselor',
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        const updatedChat = [...(lead.whatsappMessages || []), outgoingMsg];
        const nextTimeline = [...(lead.timeline || []), {
          id: `log-wa-${Date.now()}`,
          type: 'whatsapp',
          title: 'WhatsApp Dispatched',
          content: messageText,
          timestamp: new Date().toISOString(),
          user: activeUser
        }];

        // Simulate a smart automated inbound response after 3 seconds!
        setTimeout(() => {
          triggerSimulatedBotReply(leadId, lead.name, messageText);
        }, 3000);

        return {
          ...lead,
          whatsappMessages: updatedChat,
          timeline: nextTimeline
        };
      }
      return lead;
    }));
  };

  const triggerSimulatedBotReply = (leadId, studentName, outgoingText) => {
    let reply = `Thanks for sending that over! I am checking it out now. Let me know when is the best time to speak.`;
    
    if (outgoingText.includes('syllabus') || outgoingText.includes('brochure') || outgoingText.toLowerCase().includes('pdf')) {
      reply = `Got the syllabus details, thank you! The module outline look really exhaustive. Can you tell me if there are internship placements after graduation?`;
    } else if (outgoingText.includes('demo') || outgoingText.includes('join') || outgoingText.includes('Zoom')) {
      reply = `Yes, I have noted down the time. I will definitely attend the demo session. Thanks!`;
    } else if (outgoingText.includes('fees') || outgoingText.includes('fee') || outgoingText.includes('payment')) {
      reply = `Okay, the fees structure is clear. Do you offer monthly EMI payments or a student loan option?`;
    }

    const inboundMsg = {
      id: `msg-recv-${Date.now()}`,
      sender: 'lead',
      text: reply,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setLeads(prev => prev.map(lead => {
      if (lead.id === leadId) {
        return {
          ...lead,
          whatsappMessages: [...(lead.whatsappMessages || []), inboundMsg],
          timeline: [
            ...(lead.timeline || []),
            {
              id: `log-wa-in-${Date.now()}`,
              type: 'whatsapp',
              title: 'WhatsApp Received',
              content: reply,
              timestamp: new Date().toISOString(),
              user: 'System'
            }
          ]
        };
      }
      return lead;
    }));

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
    setLeads(prev => prev.map(lead => {
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
    }));
    showToastMsg(`Bulk reassigned ${leadIds.length} inquiries to ${newCounselor}`);
  };

  // Bulk Stage shift
  const bulkUpdateStage = (leadIds, nextStage) => {
    setLeads(prev => prev.map(lead => {
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
    }));
    showToastMsg(`Bulk shifted ${leadIds.length} inquiries to ${nextStage}`);
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
    setCustomFields(prev => [...prev, newField]);
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
    setCourses(prev => [...prev, newCourse]);
    showToastMsg(`Course "${courseData.name}" added to list.`);
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
      description: stageData.description || ''
    };

    setPipelineStages(prev => [...prev, newStage]);
    showToastMsg(`Pipeline stage "${stageData.name}" created!`);
  };

  // Clear Notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Dynamic branding visual updates
  const changeBrandingColors = (brandingProps) => {
    setBranding(prev => ({
      ...prev,
      ...brandingProps
    }));
    showToastMsg('Visual customization saved successfully.');
  };

  const updateIntegration = (platform, configFields) => {
    setIntegrations(prev => {
      const updated = {
        ...prev,
        [platform]: {
          ...prev[platform],
          ...configFields
        }
      };
      return updated;
    });
    showToastMsg(`${platform.toUpperCase()} configuration successfully updated!`);
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
      notifications,
      activeView,
      selectedLeadId,
      searchQuery,
      toast,
      counselors: DEFAULT_COUNSELORS,
      
      login,
      logout,
      setActiveRole,
      setActiveUser,
      setActiveView,
      setSelectedLeadId,
      setSearchQuery,
      addLead,
      updateLead,
      deleteLead,
      updateLeadStage,
      logCall,
      scheduleFollowup,
      completeFollowup,
      scheduleDemo,
      logDemoAttendance,
      sendWhatsAppMsg,
      bulkReassignLeads,
      bulkUpdateStage,
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
