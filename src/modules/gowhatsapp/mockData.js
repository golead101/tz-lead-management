// Seed Data & localStorage database interface for GO WhatsApp mockup

const SEED_CAMPAIGNS = [
  {
    id: 'camp-1',
    name: 'March Promo Drive',
    status: 'completed',
    totalRecipients: 150,
    sent: 142,
    failed: 8,
    delivered: 120,
    read: 95,
    replied: 12,
    type: 'template',
    templateName: 'welcome_brochure',
    languageCode: 'en_US',
    createdAt: { _seconds: Math.floor((Date.now() - 5 * 24 * 60 * 60 * 1000) / 1000) },
    completedAt: { _seconds: Math.floor((Date.now() - 5 * 24 * 60 * 60 * 1000 + 3600) / 1000) },
    contactListId: 'list-1',
    message: 'Hi {{1}}! Thanks for enrolling. Here is the program overview brochure. Let us know if you have any questions.',
  },
  {
    id: 'camp-2',
    name: 'Weekend Seminar Invite',
    status: 'completed',
    totalRecipients: 85,
    sent: 80,
    failed: 5,
    delivered: 72,
    read: 58,
    replied: 8,
    type: 'text',
    message: 'Hello! You are invited to our free Web Development Seminar this Sunday at 11 AM. Don\'t miss out!',
    createdAt: { _seconds: Math.floor((Date.now() - 2 * 24 * 60 * 60 * 1000) / 1000) },
    completedAt: { _seconds: Math.floor((Date.now() - 2 * 24 * 60 * 60 * 1000 + 1800) / 1000) },
    contactListId: 'list-2'
  },
  {
    id: 'camp-3',
    name: 'Demo Class Reminder',
    status: 'completed',
    totalRecipients: 30,
    sent: 30,
    failed: 0,
    delivered: 30,
    read: 28,
    replied: 4,
    type: 'template',
    templateName: 'fee_reminder',
    languageCode: 'en_US',
    createdAt: { _seconds: Math.floor((Date.now() - 1 * 24 * 60 * 60 * 1000) / 1000) },
    completedAt: { _seconds: Math.floor((Date.now() - 1 * 24 * 60 * 60 * 1000 + 600) / 1000) },
    contactListId: 'list-1',
    message: 'Hi {{1}}, this is a friendly reminder that your payment of {{2}} for the {{3}} course is due on {{4}}.'
  }
];

const SEED_TEMPLATES = [
  {
    name: 'hello_world',
    status: 'APPROVED',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      { type: 'HEADER', format: 'TEXT', text: 'Welcome to TechZone!' },
      { type: 'BODY', text: 'Hello {{1}}, welcome to our WhatsApp channel! This is a test message. We are excited to have you here.' },
      { type: 'FOOTER', text: 'Reply STOP to opt out.' },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Learn More' },
          { type: 'URL', text: 'Visit Website', url: 'https://techzone.academy' }
        ]
      }
    ]
  },
  {
    name: 'welcome_brochure',
    status: 'APPROVED',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      { type: 'HEADER', format: 'DOCUMENT' },
      { type: 'BODY', text: 'Hi {{1}}! Thanks for enrolling. Here is the program overview brochure. Let us know if you have any questions.' },
      { type: 'FOOTER', text: 'TechZone Academy' },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Contact Counselor' }
        ]
      }
    ]
  },
  {
    name: 'fee_reminder',
    status: 'APPROVED',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      { type: 'HEADER', format: 'TEXT', text: 'Payment Reminder' },
      { type: 'BODY', text: 'Hi {{1}}, this is a friendly reminder that your payment of {{2}} for the {{3}} course is due on {{4}}.' },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'URL', text: 'Pay Fees Online', url: 'https://techzone.academy/pay' }
        ]
      }
    ]
  }
];

const SEED_CONTACT_LISTS = [
  {
    id: 'list-1',
    name: 'VIP Tech Leads',
    contactCount: 5,
    columns: ['name', 'phone', 'course'],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'list-2',
    name: 'Seminar Attendees',
    contactCount: 3,
    columns: ['name', 'phone'],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const SEED_CONTACTS = {
  'list-1': [
    { id: 'c-1', name: 'Aarav Sharma', phone: '919876543210', course: 'Full-Stack Web Development' },
    { id: 'c-2', name: 'Ananya Sen', phone: '918765432109', course: 'Data Science & AI' },
    { id: 'c-3', name: 'Rohan Das', phone: '917654321098', course: 'Cloud & DevOps' },
    { id: 'c-4', name: 'Priya Patel', phone: '916543210987', course: 'Cyber Security' },
    { id: 'c-5', name: 'Kabir Singh', phone: '915432109876', course: 'UI/UX Design' }
  ],
  'list-2': [
    { id: 'c-6', name: 'Nisha Gupta', phone: '919988776655' },
    { id: 'c-7', name: 'Arjun Verma', phone: '918877665544' },
    { id: 'c-8', name: 'Diya Malhotra', phone: '917766554433' }
  ]
};

const SEED_RECIPIENTS = {
  'camp-1': [
    { id: 'r-1', phone: '919876543210', name: 'Aarav Sharma', status: 'read', error: null, errorCode: null, messageId: 'wa-msg-001', deliveredAt: Date.now() - 4 * 24 * 3600 * 1000, readAt: Date.now() - 4 * 24 * 3600 * 1000 + 300, replied: true },
    { id: 'r-2', phone: '918765432109', name: 'Ananya Sen', status: 'read', error: null, errorCode: null, messageId: 'wa-msg-002', deliveredAt: Date.now() - 4 * 24 * 3600 * 1000, readAt: Date.now() - 4 * 24 * 3600 * 1000 + 600, replied: true },
    { id: 'r-3', phone: '917654321098', name: 'Rohan Das', status: 'delivered', error: null, errorCode: null, messageId: 'wa-msg-003', deliveredAt: Date.now() - 4 * 24 * 3600 * 1000, readAt: null },
    { id: 'r-4', phone: '916543210987', name: 'Priya Patel', status: 'failed', error: 'Inactive WhatsApp account', errorCode: '131026', messageId: null, deliveredAt: null, readAt: null }
  ]
};

const SEED_CHATBOT = {
  welcomeTemplate: 'welcome_brochure',
  coursesText: 'We offer the following programs:\n1. Full-Stack Web Development (6 Months)\n2. Data Science & AI (8 Months)\n3. Cloud & DevOps Engineering (5 Months)\n4. Cyber Security (6 Months)\n5. UI/UX Product Design (4 Months)\n\nReply with the course number to get fee details!',
  feeDetails: 'Our program fee structures are:\n- Web Development: ₹75,000\n- Data Science & AI: ₹95,000\n- Cloud & DevOps: ₹80,000\n- Cyber Security: ₹85,000\n- UI/UX Design: ₹60,000\n\nScholarships and monthly installment plans (EMIs starting at ₹5,000/month) are available. Let us know if you want to speak to a counselor.',
  counselorPhone: '+91 98765 43210',
  brochureUrl: 'https://firebasestorage.googleapis.com/v0/b/leads-management-tz/o/brochures%2Ftechzone-brochure.pdf?alt=media'
};

const SEED_API_STATUS = {
  ok: true,
  configured: true,
  businessAccountId: '564738291029384',
  phoneNumbers: [
    { id: 'phone-1', display_phone_number: '+91 98765 43210', quality_rating: 'GREEN', messaging_limit_tier: 'TIER_10K', status: 'CONNECTED', verifiedName: 'TechZone Academy' }
  ]
};

const SEED_CONVERSATIONS = [
  {
    id: '919876543210',
    phone: '919876543210',
    contactName: 'Aarav Sharma',
    lastMessage: 'Can you share the batch timings?',
    lastMessageAt: { _seconds: Math.floor((Date.now() - 5 * 60 * 1000) / 1000) },
    lastDirection: 'inbound',
    unreadCount: 2,
    repliedToCampaign: true,
    lastCampaignId: 'camp-1',
    lastCampaignName: 'March Promo Drive'
  },
  {
    id: '918765432109',
    phone: '918765432109',
    contactName: 'Ananya Sen',
    lastMessage: 'Thanks, brochure downloaded.',
    lastMessageAt: { _seconds: Math.floor((Date.now() - 2 * 60 * 60 * 1000) / 1000) },
    lastDirection: 'inbound',
    unreadCount: 0,
    repliedToCampaign: true,
    lastCampaignId: 'camp-1',
    lastCampaignName: 'March Promo Drive'
  },
  {
    id: '917654321098',
    phone: '917654321098',
    contactName: 'Rohan Das',
    lastMessage: 'Payment completed. Please verify.',
    lastMessageAt: { _seconds: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000) },
    lastDirection: 'inbound',
    unreadCount: 0
  }
];

const SEED_MESSAGES = {
  '919876543210': [
    { id: 'm-1', waMessageId: 'wam-1', direction: 'outbound', phone: '919876543210', type: 'text', text: 'Hi Aarav! Thanks for contacting TechZone Academy. Here is the brochure.', timestamp: { _seconds: Math.floor((Date.now() - 120 * 60 * 1000) / 1000) }, status: 'read', read: true },
    { id: 'm-2', waMessageId: 'wam-2', direction: 'inbound', phone: '919876543210', type: 'text', text: 'Hello! I am interested in the Web Dev course.', timestamp: { _seconds: Math.floor((Date.now() - 90 * 60 * 1000) / 1000) }, status: 'read', read: true },
    { id: 'm-3', waMessageId: 'wam-3', direction: 'outbound', phone: '919876543210', type: 'text', text: 'Great! We have a new batch starting next Monday.', timestamp: { _seconds: Math.floor((Date.now() - 30 * 60 * 1000) / 1000) }, status: 'read', read: true },
    { id: 'm-4', waMessageId: 'wam-4', direction: 'inbound', phone: '919876543210', type: 'text', text: 'Is there a weekend batch also available?', timestamp: { _seconds: Math.floor((Date.now() - 10 * 60 * 1000) / 1000) }, status: 'delivered', read: false },
    { id: 'm-5', waMessageId: 'wam-5', direction: 'inbound', phone: '919876543210', type: 'text', text: 'Can you share the batch timings?', timestamp: { _seconds: Math.floor((Date.now() - 5 * 60 * 1000) / 1000) }, status: 'delivered', read: false }
  ],
  '918765432109': [
    { id: 'm-6', waMessageId: 'wam-6', direction: 'outbound', phone: '918765432109', type: 'text', text: 'Hi Ananya! Thanks for enrolling. Here is the program overview brochure.', timestamp: { _seconds: Math.floor((Date.now() - 180 * 60 * 1000) / 1000) }, status: 'read', read: true },
    { id: 'm-7', waMessageId: 'wam-7', direction: 'inbound', phone: '918765432109', type: 'text', text: 'Thanks, brochure downloaded.', timestamp: { _seconds: Math.floor((Date.now() - 120 * 60 * 1000) / 1000) }, status: 'read', read: true }
  ],
  '917654321098': [
    { id: 'm-8', waMessageId: 'wam-8', direction: 'outbound', phone: '917654321098', type: 'text', text: 'Hi Rohan, your fee payment is pending.', timestamp: { _seconds: Math.floor((Date.now() - 2 * 24 * 60 * 60 * 1000) / 1000) }, status: 'read', read: true },
    { id: 'm-9', waMessageId: 'wam-9', direction: 'inbound', phone: '917654321098', type: 'text', text: 'Payment completed. Please verify.', timestamp: { _seconds: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000) }, status: 'read', read: true }
  ]
};

// Database Init
export function initMockDb() {
  if (!localStorage.getItem('gowha_campaigns')) {
    localStorage.setItem('gowha_campaigns', JSON.stringify(SEED_CAMPAIGNS));
  }
  if (!localStorage.getItem('gowha_templates')) {
    localStorage.setItem('gowha_templates', JSON.stringify(SEED_TEMPLATES));
  }
  if (!localStorage.getItem('gowha_contact_lists')) {
    localStorage.setItem('gowha_contact_lists', JSON.stringify(SEED_CONTACT_LISTS));
  }
  if (!localStorage.getItem('gowha_contacts')) {
    localStorage.setItem('gowha_contacts', JSON.stringify(SEED_CONTACTS));
  }
  if (!localStorage.getItem('gowha_recipients')) {
    localStorage.setItem('gowha_recipients', JSON.stringify(SEED_RECIPIENTS));
  }
  if (!localStorage.getItem('gowha_chatbot')) {
    localStorage.setItem('gowha_chatbot', JSON.stringify(SEED_CHATBOT));
  }
  if (!localStorage.getItem('gowha_api_status')) {
    localStorage.setItem('gowha_api_status', JSON.stringify(SEED_API_STATUS));
  }
  if (!localStorage.getItem('gowha_conversations')) {
    localStorage.setItem('gowha_conversations', JSON.stringify(SEED_CONVERSATIONS));
  }
  if (!localStorage.getItem('gowha_messages')) {
    localStorage.setItem('gowha_messages', JSON.stringify(SEED_MESSAGES));
  }
}

// Database Getters & Setters
export const mockDb = {
  getCampaigns: () => {
    initMockDb();
    return JSON.parse(localStorage.getItem('gowha_campaigns') || '[]');
  },
  saveCampaigns: (campaigns) => {
    localStorage.setItem('gowha_campaigns', JSON.stringify(campaigns));
  },
  getTemplates: () => {
    initMockDb();
    return JSON.parse(localStorage.getItem('gowha_templates') || '[]');
  },
  saveTemplates: (templates) => {
    localStorage.setItem('gowha_templates', JSON.stringify(templates));
  },
  getContactLists: () => {
    initMockDb();
    return JSON.parse(localStorage.getItem('gowha_contact_lists') || '[]');
  },
  saveContactLists: (lists) => {
    localStorage.setItem('gowha_contact_lists', JSON.stringify(lists));
  },
  getContacts: () => {
    initMockDb();
    return JSON.parse(localStorage.getItem('gowha_contacts') || '{}');
  },
  saveContacts: (contacts) => {
    localStorage.setItem('gowha_contacts', JSON.stringify(contacts));
  },
  getRecipients: () => {
    initMockDb();
    return JSON.parse(localStorage.getItem('gowha_recipients') || '{}');
  },
  saveRecipients: (recipients) => {
    localStorage.setItem('gowha_recipients', JSON.stringify(recipients));
  },
  getChatbotSettings: () => {
    initMockDb();
    return JSON.parse(localStorage.getItem('gowha_chatbot') || '{}');
  },
  saveChatbotSettings: (settings) => {
    localStorage.setItem('gowha_chatbot', JSON.stringify(settings));
  },
  getApiStatus: () => {
    initMockDb();
    return JSON.parse(localStorage.getItem('gowha_api_status') || '{}');
  },
  saveApiStatus: (status) => {
    localStorage.setItem('gowha_api_status', JSON.stringify(status));
  },
  getConversations: () => {
    initMockDb();
    return JSON.parse(localStorage.getItem('gowha_conversations') || '[]');
  },
  saveConversations: (convos) => {
    localStorage.setItem('gowha_conversations', JSON.stringify(convos));
  },
  getMessages: () => {
    initMockDb();
    return JSON.parse(localStorage.getItem('gowha_messages') || '{}');
  },
  saveMessages: (messages) => {
    localStorage.setItem('gowha_messages', JSON.stringify(messages));
  }
};
