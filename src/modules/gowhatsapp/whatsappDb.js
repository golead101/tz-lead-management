// Seed Data & localStorage database interface for GO WhatsApp
import { db } from '../../firebase';
import { doc, setDoc, deleteDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';

const SEED_CAMPAIGNS = [];

const SEED_TEMPLATES = [
  {
    name: 'welcome_brochure',
    status: 'APPROVED',
    category: 'MARKETING',
    language: 'en_US',
    components: [
      { type: 'HEADER', format: 'DOCUMENT' },
      { type: 'BODY', text: 'Hi {{1}}! Thanks for enrolling in the {{2}} course. Here is the program overview brochure. Let us know if you have any questions.' },
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
      { type: 'BODY', text: 'Hi {{1}}, this is a friendly reminder that your payment of {{2}} for the {{3}} course is due.' },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'URL', text: 'Pay Fees Online', url: 'https://techzone.academy/pay' }
        ]
      }
    ]
  },
  {
    name: 'lead_followup_',
    status: 'APPROVED',
    category: 'UTILITY',
    language: 'en',
    components: [
      { type: 'BODY', text: 'Hello {{1}}, Thank you for your interest in {{2}} at Ambrits Training Hub. Our counselor will assist you shortly to discuss the course details. If you have any urgent queries, feel free to call. Regards, Ambrits Training Hub' }
    ]
  }
];

const SEED_CONTACT_LISTS = [];

const SEED_CONTACTS = {};

const SEED_RECIPIENTS = {};

const SEED_CHATBOT = {
  welcomeTemplate: 'welcome_brochure',
  coursesText: 'We offer the following programs:\n1. Full-Stack Web Development (6 Months)\n2. Data Science & AI (8 Months)\n3. Cloud & DevOps Engineering (5 Months)\n4. Cyber Security (6 Months)\n5. UI/UX Product Design (4 Months)\n\nReply with the course number to get fee details!',
  feeDetails: 'Our program fee structures are:\n- Web Development: ₹75,000\n- Data Science & AI: ₹95,000\n- Cloud & DevOps: ₹80,000\n- Cyber Security: ₹85,000\n- UI/UX Design: ₹60,000\n\nScholarships and monthly installment plans (EMIs starting at ₹5,000/month) are available. Let us know if you want to speak to a counselor.',
  counselorPhone: '',
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

const SEED_CONVERSATIONS = [];

const SEED_MESSAGES = {};

let listenersInitialized = false;

// Database Init
export function initWhatsappDb() {
  if (!localStorage.getItem('gowha_campaigns')) {
    localStorage.setItem('gowha_campaigns', JSON.stringify(SEED_CAMPAIGNS));
  }
  if (!localStorage.getItem('gowha_templates')) {
    localStorage.setItem('gowha_templates', JSON.stringify(SEED_TEMPLATES));
  } else {
    // Clean up dummy templates if they exist in localStorage and add lead_followup_ if missing
    try {
      const templates = JSON.parse(localStorage.getItem('gowha_templates') || '[]');
      const filtered = templates.filter(t => t.name !== 'hello_world');
      const hasFollowup = filtered.some(t => t.name === 'lead_followup_');
      if (!hasFollowup) {
        const followupTmpl = SEED_TEMPLATES.find(t => t.name === 'lead_followup_');
        if (followupTmpl) filtered.push(followupTmpl);
      }
      localStorage.setItem('gowha_templates', JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to sanitize templates local storage:', e);
    }
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
  } else {
    // Clean up dummy counselor phone if it is set to the default dummy value
    try {
      const settings = JSON.parse(localStorage.getItem('gowha_chatbot') || '{}');
      if (settings.counselorPhone === '+91 98765 43210') {
        settings.counselorPhone = '';
        localStorage.setItem('gowha_chatbot', JSON.stringify(settings));
      }
    } catch (e) {
      console.error('Failed to sanitize chatbot settings local storage:', e);
    }
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

  // Setup Firestore Real-time Listeners
  if (listenersInitialized) return;
  listenersInitialized = true;

  try {
    // Listen to Chatbot Settings
    onSnapshot(doc(db, 'settings', 'whatsapp_chatbot'), (snapshot) => {
      if (snapshot.exists()) {
        localStorage.setItem('gowha_chatbot', JSON.stringify(snapshot.data()));
      } else {
        const initial = JSON.parse(localStorage.getItem('gowha_chatbot') || '{}');
        setDoc(doc(db, 'settings', 'whatsapp_chatbot'), initial).catch(console.error);
      }
    });

    // Listen to Templates
    onSnapshot(collection(db, 'whatsapp_templates'), (snapshot) => {
      if (!snapshot.empty) {
        const templates = snapshot.docs.map(doc => doc.data());
        
        // Auto-upgrade welcome_brochure in Firestore to have exactly 2 variables
        const welcomeBrochure = templates.find(t => t.name === 'welcome_brochure');
        if (welcomeBrochure) {
          const bodyComp = welcomeBrochure.components?.find(c => c.type === 'BODY');
          if (bodyComp && (!bodyComp.text.includes('{{2}}') || bodyComp.text.includes('{{3}}'))) {
            const updatedBrochure = {
              ...welcomeBrochure,
              components: welcomeBrochure.components.map(c => 
                c.type === 'BODY' 
                  ? { ...c, text: 'Hi {{1}}! Thanks for enrolling in the {{2}} course. Here is the program overview brochure. Let us know if you have any questions.' }
                  : c
              )
            };
            setDoc(doc(db, 'whatsapp_templates', 'welcome_brochure'), updatedBrochure).catch(console.error);
          }
        }

        // Auto-upgrade fee_reminder in Firestore to have exactly 3 variables
        const feeReminder = templates.find(t => t.name === 'fee_reminder');
        if (feeReminder) {
          const bodyComp = feeReminder.components?.find(c => c.type === 'BODY');
          if (bodyComp && bodyComp.text.includes('{{4}}')) {
            const updatedFee = {
              ...feeReminder,
              components: feeReminder.components.map(c => 
                c.type === 'BODY' 
                  ? { ...c, text: 'Hi {{1}}, this is a friendly reminder that your payment of {{2}} for the {{3}} course is due.' }
                  : c
              )
            };
            setDoc(doc(db, 'whatsapp_templates', 'fee_reminder'), updatedFee).catch(console.error);
          }
        }

        localStorage.setItem('gowha_templates', JSON.stringify(templates));
      } else {
        const initial = JSON.parse(localStorage.getItem('gowha_templates') || '[]');
        initial.forEach(tpl => {
          setDoc(doc(db, 'whatsapp_templates', tpl.name), tpl).catch(console.error);
        });
      }
    });

    // Listen to Contact Lists
    onSnapshot(collection(db, 'whatsapp_contact_lists'), (snapshot) => {
      if (!snapshot.empty) {
        const lists = snapshot.docs.map(doc => doc.data());
        localStorage.setItem('gowha_contact_lists', JSON.stringify(lists));
      } else {
        const initial = JSON.parse(localStorage.getItem('gowha_contact_lists') || '[]');
        initial.forEach(list => {
          setDoc(doc(db, 'whatsapp_contact_lists', list.id), list).catch(console.error);
        });
      }
    });

    // Listen to Campaigns
    onSnapshot(collection(db, 'whatsapp_campaigns'), (snapshot) => {
      if (!snapshot.empty) {
        const campaigns = snapshot.docs.map(doc => doc.data());
        localStorage.setItem('gowha_campaigns', JSON.stringify(campaigns));
      } else {
        const initial = JSON.parse(localStorage.getItem('gowha_campaigns') || '[]');
        initial.forEach(camp => {
          setDoc(doc(db, 'whatsapp_campaigns', camp.id), camp).catch(console.error);
        });
      }
    });

    // Listen to Contacts
    onSnapshot(collection(db, 'whatsapp_contacts'), (snapshot) => {
      if (!snapshot.empty) {
        const contactsObj = {};
        snapshot.docs.forEach(docSnap => {
          contactsObj[docSnap.id] = docSnap.data().contacts || [];
        });
        localStorage.setItem('gowha_contacts', JSON.stringify(contactsObj));
      }
    });

    // Listen to Recipients
    onSnapshot(collection(db, 'whatsapp_recipients'), (snapshot) => {
      if (!snapshot.empty) {
        const recipientsObj = {};
        snapshot.docs.forEach(docSnap => {
          recipientsObj[docSnap.id] = docSnap.data().recipients || [];
        });
        localStorage.setItem('gowha_recipients', JSON.stringify(recipientsObj));
      }
    });
  } catch (error) {
    console.error("Failed to initialize Firestore WhatsApp listeners:", error);
  }
}

// Database Getters & Setters
export const whatsappDb = {
  getCampaigns: () => {
    initWhatsappDb();
    return JSON.parse(localStorage.getItem('gowha_campaigns') || '[]');
  },
  saveCampaigns: async (campaigns) => {
    localStorage.setItem('gowha_campaigns', JSON.stringify(campaigns));
    campaigns.forEach(camp => {
      setDoc(doc(db, 'whatsapp_campaigns', camp.id), camp).catch(console.error);
    });
    try {
      const snapshot = await getDocs(collection(db, 'whatsapp_campaigns'));
      snapshot.docs.forEach(docSnap => {
        const exists = campaigns.some(c => c.id === docSnap.id);
        if (!exists) {
          deleteDoc(doc(db, 'whatsapp_campaigns', docSnap.id)).catch(console.error);
        }
      });
    } catch (e) {
      console.error(e);
    }
  },
  getTemplates: () => {
    initWhatsappDb();
    return JSON.parse(localStorage.getItem('gowha_templates') || '[]');
  },
  saveTemplates: async (templates) => {
    localStorage.setItem('gowha_templates', JSON.stringify(templates));
    templates.forEach(tpl => {
      setDoc(doc(db, 'whatsapp_templates', tpl.name), tpl).catch(console.error);
    });
    try {
      const snapshot = await getDocs(collection(db, 'whatsapp_templates'));
      snapshot.docs.forEach(docSnap => {
        const exists = templates.some(t => t.name === docSnap.id);
        if (!exists) {
          deleteDoc(doc(db, 'whatsapp_templates', docSnap.id)).catch(console.error);
        }
      });
    } catch (e) {
      console.error(e);
    }
  },
  getContactLists: () => {
    initWhatsappDb();
    return JSON.parse(localStorage.getItem('gowha_contact_lists') || '[]');
  },
  saveContactLists: async (lists) => {
    localStorage.setItem('gowha_contact_lists', JSON.stringify(lists));
    lists.forEach(list => {
      setDoc(doc(db, 'whatsapp_contact_lists', list.id), list).catch(console.error);
    });
    try {
      const snapshot = await getDocs(collection(db, 'whatsapp_contact_lists'));
      snapshot.docs.forEach(docSnap => {
        const exists = lists.some(l => l.id === docSnap.id);
        if (!exists) {
          deleteDoc(doc(db, 'whatsapp_contact_lists', docSnap.id)).catch(console.error);
        }
      });
    } catch (e) {
      console.error(e);
    }
  },
  getContacts: () => {
    initWhatsappDb();
    return JSON.parse(localStorage.getItem('gowha_contacts') || '{}');
  },
  saveContacts: (contacts) => {
    localStorage.setItem('gowha_contacts', JSON.stringify(contacts));
    Object.entries(contacts).forEach(([listId, listContacts]) => {
      setDoc(doc(db, 'whatsapp_contacts', listId), { contacts: listContacts }).catch(console.error);
    });
  },
  getRecipients: () => {
    initWhatsappDb();
    return JSON.parse(localStorage.getItem('gowha_recipients') || '{}');
  },
  saveRecipients: (recipients) => {
    localStorage.setItem('gowha_recipients', JSON.stringify(recipients));
    Object.entries(recipients).forEach(([campId, campRecipients]) => {
      setDoc(doc(db, 'whatsapp_recipients', campId), { recipients: campRecipients }).catch(console.error);
    });
  },
  getChatbotSettings: () => {
    initWhatsappDb();
    return JSON.parse(localStorage.getItem('gowha_chatbot') || '{}');
  },
  saveChatbotSettings: (settings) => {
    localStorage.setItem('gowha_chatbot', JSON.stringify(settings));
    setDoc(doc(db, 'settings', 'whatsapp_chatbot'), settings).catch(console.error);
  },
  getApiStatus: () => {
    initWhatsappDb();
    return JSON.parse(localStorage.getItem('gowha_api_status') || '{}');
  },
  saveApiStatus: (status) => {
    localStorage.setItem('gowha_api_status', JSON.stringify(status));
  },
  getConversations: () => {
    initWhatsappDb();
    return JSON.parse(localStorage.getItem('gowha_conversations') || '[]');
  },
  saveConversations: (convos) => {
    localStorage.setItem('gowha_conversations', JSON.stringify(convos));
  },
  getMessages: () => {
    initWhatsappDb();
    return JSON.parse(localStorage.getItem('gowha_messages') || '{}');
  },
  saveMessages: (messages) => {
    localStorage.setItem('gowha_messages', JSON.stringify(messages));
  }
};
