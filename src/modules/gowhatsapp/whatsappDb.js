// Seed Data & localStorage database interface for GO WhatsApp
import { db } from '../../firebase';
import { doc, setDoc, deleteDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';

// ─── Old mock document IDs from the original mockData.js that must be cleaned up ───
// These are safe to delete permanently — real campaigns use camp-{timestamp} IDs,
// real contact lists use list-{timestamp} IDs. These old IDs can never re-appear.
const STALE_CAMPAIGN_IDS = ['camp-001', 'camp-002', 'camp-003', 'camp-1', 'camp-2', 'camp-3'];
const STALE_LIST_IDS     = ['list-001', 'list-002', 'list-1', 'list-2'];

const SEED_CAMPAIGNS = [];

// Templates are fetched from the real Meta WhatsApp Business API
// via the getWhatsAppTemplates Cloud Function — no local seeds needed.
const SEED_TEMPLATES = [];

const SEED_CONTACT_LISTS = [];

const SEED_CONTACTS = {};

const SEED_RECIPIENTS = {};

const SEED_CHATBOT = {
  customReplies: [
    {
      id: 'r1',
      trigger: 'Courses Offered',
      responseType: 'Buttons',
      preview: 'We currently offer courses in 2 learning tracks. Which track would you like to explore?',
      buttons: ['Regular Track', 'Fast Track', 'Back To Menu']
    },
    {
      id: 'r2',
      trigger: 'regulartrack_pte',
      responseType: 'Text',
      preview: 'PTE Duration 6months'
    },
    {
      id: 'r3',
      trigger: 'fasttrack_ielts',
      responseType: 'Text',
      preview: 'Fee 9,00,000'
    },
    {
      id: 'r4',
      trigger: 'fasttrack_gre',
      responseType: 'Buttons',
      preview: 'Fast track GRE fee 60,000/- only with duration 2 months only.',
      buttons: ['Enroll Now', 'Talk to Counselor']
    },
    {
      id: 'r5',
      trigger: 'GRE Brochure',
      responseType: 'Document',
      preview: 'Hello! Thanks for Downloading'
    },
    {
      id: 'r6',
      trigger: 'Back To Menu',
      responseType: 'Template',
      preview: '[Template: welcome_template]'
    },
    {
      id: 'r7',
      trigger: 'Talk to Counselor',
      responseType: 'Text',
      preview: 'Please contact 9705454789'
    }
  ],
  mediaFiles: [
    { id: 'm1', name: 'GRE_Brochure_2026.pdf', size: '2.4 MB', date: 'Oct 12, 2026' }
  ],
  metaCostRate: '0.80'
};

// API status is always fetched live from Meta — no hardcoded defaults
const SEED_API_STATUS = {};

const SEED_CONVERSATIONS = [];

const SEED_MESSAGES = {};

let listenersInitialized = false;
let staleDataPurged = false;

// One-time cleanup: delete stale mock documents from Firestore by their old IDs.
// Safe for production — real campaigns/lists use timestamp-based IDs (camp-1750123456789)
// so these hardcoded old IDs (camp-001, list-001) can never belong to real data.
function purgeStaleDataFromFirestore() {
  if (staleDataPurged) return;
  staleDataPurged = true;

  // Delete by exact old IDs from Firestore
  STALE_CAMPAIGN_IDS.forEach(id => {
    deleteDoc(doc(db, 'whatsapp_campaigns', id)).catch(() => {});
    deleteDoc(doc(db, 'whatsapp_recipients', id)).catch(() => {});
  });
  STALE_LIST_IDS.forEach(id => {
    deleteDoc(doc(db, 'whatsapp_contact_lists', id)).catch(() => {});
    deleteDoc(doc(db, 'whatsapp_contacts', id)).catch(() => {});
  });

  // Clean same stale IDs from localStorage
  try {
    const camps = JSON.parse(localStorage.getItem('gowha_campaigns') || '[]');
    const clean = camps.filter(c => !STALE_CAMPAIGN_IDS.includes(c.id));
    if (clean.length !== camps.length) localStorage.setItem('gowha_campaigns', JSON.stringify(clean));
  } catch (e) { console.error(e); }

  try {
    const lists = JSON.parse(localStorage.getItem('gowha_contact_lists') || '[]');
    const clean = lists.filter(l => !STALE_LIST_IDS.includes(l.id));
    if (clean.length !== lists.length) {
      localStorage.setItem('gowha_contact_lists', JSON.stringify(clean));
      const contacts = JSON.parse(localStorage.getItem('gowha_contacts') || '{}');
      STALE_LIST_IDS.forEach(id => delete contacts[id]);
      localStorage.setItem('gowha_contacts', JSON.stringify(contacts));
    }
  } catch (e) { console.error(e); }
}

// Database Init
export function initWhatsappDb() {
  // Purge stale old mock IDs from Firestore (safe — never affects real data)
  purgeStaleDataFromFirestore();

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
      let updated = false;
      if (settings.counselorPhone === '+91 98765 43210') {
        settings.counselorPhone = '';
        updated = true;
      }
      if (!settings.customReplies || settings.customReplies.length === 0) {
        settings.customReplies = SEED_CHATBOT.customReplies;
        updated = true;
      }
      if (!settings.mediaFiles || settings.mediaFiles.length === 0) {
        settings.mediaFiles = SEED_CHATBOT.mediaFiles;
        updated = true;
      }
      if (updated) {
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
      }
    });

    // Listen to Templates — sync from Firestore only (no re-seeding on empty)
    onSnapshot(collection(db, 'whatsapp_templates'), (snapshot) => {
      if (!snapshot.empty) {
        const templates = snapshot.docs.map(doc => doc.data());
        localStorage.setItem('gowha_templates', JSON.stringify(templates));
      }
    });

    // Listen to Contact Lists — sync from Firestore only (no re-seeding on empty)
    onSnapshot(collection(db, 'whatsapp_contact_lists'), (snapshot) => {
      const lists = snapshot.docs
        .filter(d => !STALE_LIST_IDS.includes(d.id))
        .map(d => d.data());
      localStorage.setItem('gowha_contact_lists', JSON.stringify(lists));
    });

    // Listen to Campaigns — sync from Firestore only (no re-seeding on empty)
    onSnapshot(collection(db, 'whatsapp_campaigns'), (snapshot) => {
      const campaigns = snapshot.docs
        .filter(d => !STALE_CAMPAIGN_IDS.includes(d.id))
        .map(d => d.data());
      localStorage.setItem('gowha_campaigns', JSON.stringify(campaigns));
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
    // Trigger auto-repair for any leads that were overwritten by previous WhatsApp campaigns
    autoRepairOverwrittenLeads();
  } catch (error) {
    console.error("Failed to initialize Firestore WhatsApp listeners:", error);
  }
}

export async function autoRepairOverwrittenLeads() {
  try {
    const leadsSnap = await getDocs(collection(db, 'leads'));
    if (leadsSnap.empty) return;

    // Get recipient snapshots from whatsapp_recipients
    const recipientsSnap = await getDocs(collection(db, 'whatsapp_recipients'));
    const savedRecipientsMap = new Map();
    recipientsSnap.docs.forEach(docSnap => {
      const recs = docSnap.data().recipients || [];
      recs.forEach(r => {
        const phone = r.phone || r.Phone || '';
        let cleanPhone = String(phone).replace(/[^0-9]/g, '').trim();
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
        if (cleanPhone) {
          savedRecipientsMap.set(cleanPhone, r);
          if (cleanPhone.slice(-10)) savedRecipientsMap.set(cleanPhone.slice(-10), r);
        }
      });
    });

    const updates = [];
    leadsSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      const phone = data.phone || '';
      let cleanPhone = String(phone).replace(/[^0-9]/g, '').trim();
      const phone10 = cleanPhone.slice(-10);
      const timeline = data.timeline || [];
      const repairData = {};

      const originalRecipient = savedRecipientsMap.get(cleanPhone) || savedRecipientsMap.get(phone10) || savedRecipientsMap.get(docSnap.id);

      // 1. RESTORE SOURCE ONLY IF CORRUPTED TO "WhatsApp Campaign"
      if (data.source === 'WhatsApp Campaign' || !data.source) {
        let detectedSource = null;
        for (const item of timeline) {
          const text = `${item.title || ''} ${item.content || ''}`.toLowerCase();
          if (text.includes('meta') || text.includes('facebook') || text.includes('instagram')) {
            detectedSource = 'Meta Ads';
            break;
          } else if (text.includes('website')) {
            detectedSource = 'Website Form';
            break;
          } else if (text.includes('walk-in') || text.includes('qr')) {
            detectedSource = 'Walk-in';
            break;
          } else if (text.includes('google')) {
            detectedSource = 'Google Ads';
            break;
          }
        }
        if (detectedSource || (originalRecipient && originalRecipient.source)) {
          repairData.source = detectedSource || originalRecipient.source;
        }
      }

      // 2. RESTORE COUNSELOR ONLY IF CORRUPTED TO GENERIC "Counselor" (Preserve genuine values like Syeda, Maaha, Admin, System)
      if (data.counselor === 'Counselor') {
        let detectedCounselor = null;
        for (const item of timeline) {
          if (item.title && item.title.includes('COUNSELOR Modified') && item.content) {
            const match = item.content.match(/Changed from "([^"]+)"/i);
            if (match && match[1] && match[1] !== 'Counselor') {
              detectedCounselor = match[1];
              break;
            }
          }
          if (item.user && item.user !== 'Counselor') {
            detectedCounselor = item.user;
          }
        }
        if (detectedCounselor || (originalRecipient && originalRecipient.counselor)) {
          repairData.counselor = detectedCounselor || originalRecipient.counselor;
        }
      }

      // 3. RESTORE COURSE (Fix mismatched courses for Meta Ads leads)
      const currentCampaignText = `${data.campaign || ''} ${data.campaignName || ''} ${data.subSource || ''}`.toLowerCase();
      const isDigitalMarketingCampaign = currentCampaignText.includes('digital') || currentCampaignText.includes('102') || (originalRecipient && String(originalRecipient.course).toLowerCase().includes('digital'));
      
      if (!data.course || data.course === '' || (isDigitalMarketingCampaign && data.course.toLowerCase().includes('data science'))) {
        repairData.course = 'Digital Marketing';
      } else if (!data.course) {
        let detectedCourse = (originalRecipient && originalRecipient.course);
        if (!detectedCourse) {
          for (const item of timeline) {
            const text = `${item.title || ''} ${item.content || ''}`;
            const match = text.match(/course:\s*([A-Za-z\s]+?)(?:via|\.|$)/i) || text.match(/for\s+([A-Za-z\s]+?)\s+via/i);
            if (match && match[1] && match[1].trim()) {
              detectedCourse = match[1].trim();
              break;
            }
            if (text.toLowerCase().includes('digital marketing')) {
              detectedCourse = 'Digital Marketing';
              break;
            }
          }
        }
        if (detectedCourse) {
          repairData.course = detectedCourse;
        }
      }

      // 4. RESTORE STAGE ONLY IF WIPED TO "New" / "New Lead" AND AN AUDIT LOG EXISTS (Never guess or change existing stages like Follow-up, Busy, Interested)
      if (data.stage === 'New' || data.stage === 'New Lead') {
        let detectedStage = null;
        for (const item of timeline) {
          if (item.title && item.title.includes('STAGE Modified') && item.content) {
            const match = item.content.match(/Changed from "([^"]+)"/i);
            if (match && match[1] && match[1] !== 'New' && match[1] !== 'New Lead') {
              detectedStage = match[1];
              break;
            }
          }
        }
        if (detectedStage || (originalRecipient && originalRecipient.stage)) {
          repairData.stage = detectedStage || originalRecipient.stage;
        }
      }

      // 5. RESTORE CREATED DATE ONLY IF MISSING OR INVALID
      if (!data.createdDate || data.createdDate === 'Invalid Date') {
        let earliestTimestamp = null;
        if (timeline.length > 0) {
          const timestamps = timeline.map(t => t.timestamp).filter(Boolean);
          if (timestamps.length > 0) {
            timestamps.sort();
            earliestTimestamp = timestamps[0];
          }
        }
        if (earliestTimestamp || (originalRecipient && (originalRecipient.createdDate || originalRecipient.createdAt))) {
          repairData.createdDate = earliestTimestamp || originalRecipient.createdDate || originalRecipient.createdAt;
        }
      }

      // 6. RESTORE CAMPAIGN NAME ONLY IF DYNAMICALLY PRESENT IN RECIPIENT DATA OR TIMELINE
      const currentCamp = data.campaign || data.campaignName || '';

      if (currentCamp.includes('Digital_Marketing_102') || currentCamp.includes('Bulk Campaign')) {
        let detectedCampaign = null;
        if (originalRecipient && originalRecipient.campaign && !originalRecipient.campaign.includes('Digital_Marketing_102') && !originalRecipient.campaign.includes('Bulk Campaign')) {
          detectedCampaign = originalRecipient.campaign;
        }
        if (!detectedCampaign) {
          for (const item of timeline) {
            const text = `${item.title || ''} ${item.content || ''}`;
            const match = text.match(/campaign:\s*([A-Za-z0-9_\-\s]+?)(?:via|\.|$)/i);
            if (match && match[1] && !match[1].includes('Digital_Marketing_102') && !match[1].includes('WhatsApp') && !match[1].includes('Bulk Campaign')) {
              detectedCampaign = match[1].trim();
              break;
            }
          }
        }

        repairData.campaign = detectedCampaign || '';
        repairData.campaignName = detectedCampaign || '';
        repairData.subSource = detectedCampaign || '';
      }

      // 7. RESTORE LEAD NAME ONLY IF WIPED TO "Campaign Contact" OR MISSING
      if (!data.name || data.name === 'Campaign Contact' || data.name === 'WhatsApp Student') {
        let detectedName = null;
        if (originalRecipient && originalRecipient.name && originalRecipient.name !== 'Campaign Contact' && originalRecipient.name !== 'WhatsApp Student') {
          detectedName = originalRecipient.name;
        }
        if (!detectedName) {
          for (const item of timeline) {
            if (item.title && item.title.includes('NAME Modified') && item.content) {
              const match = item.content.match(/Changed from "([^"]+)"/i);
              if (match && match[1] && match[1] !== 'Campaign Contact' && match[1] !== 'WhatsApp Student') {
                detectedName = match[1];
                break;
              }
            }
            const text = `${item.title || ''} ${item.content || ''}`;
            const matchName = text.match(/Name:\s*([A-Za-z\s]+?)(?:Phone|Email|Course|via|\.|$)/i) || text.match(/Inquiry submitted by\s*([A-Za-z\s]+?)(?:for|via|\.|$)/i);
            if (matchName && matchName[1] && matchName[1].trim() && matchName[1].trim() !== 'Campaign Contact' && matchName[1].trim() !== 'WhatsApp Student') {
              detectedName = matchName[1].trim();
              break;
            }
          }
        }
        if (detectedName) {
          repairData.name = detectedName;
        }
      }

      if (Object.keys(repairData).length > 0) {
        updates.push(setDoc(doc(db, 'leads', docSnap.id), repairData, { merge: true }));
      }
    });

    if (updates.length > 0) {
      await Promise.all(updates);
      console.log(`[autoRepair] Successfully restored metadata for ${updates.length} leads in Firestore.`);
    }
  } catch (err) {
    console.error('Failed to auto-repair overwritten leads:', err);
  }
}

// ─── Direct delete helpers (bypass saveCampaigns/saveContactLists race condition) ───
export async function deleteCampaignById(id) {
  // Remove from localStorage immediately
  try {
    const camps = JSON.parse(localStorage.getItem('gowha_campaigns') || '[]');
    localStorage.setItem('gowha_campaigns', JSON.stringify(camps.filter(c => c.id !== id)));
  } catch (e) { /* ignore */ }
  // Remove recipients from localStorage
  try {
    const recipients = JSON.parse(localStorage.getItem('gowha_recipients') || '{}');
    delete recipients[id];
    localStorage.setItem('gowha_recipients', JSON.stringify(recipients));
  } catch (e) { /* ignore */ }
  // Delete from Firestore — throw on failure so caller sees the error
  try {
    await deleteDoc(doc(db, 'whatsapp_campaigns', id));
    await deleteDoc(doc(db, 'whatsapp_recipients', id)).catch(() => {}); // recipients doc may not exist
    console.log('[whatsappDb] Campaign deleted from Firestore:', id);
  } catch (err) {
    console.error('[whatsappDb] Firestore deleteCampaign FAILED:', err.code, err.message);
    alert('Delete failed: ' + (err.message || err.code || 'Unknown error') + '\n\nCheck console for details.');
    throw err;
  }
}

export async function deleteContactListById(id) {
  // Remove from localStorage immediately
  try {
    const lists = JSON.parse(localStorage.getItem('gowha_contact_lists') || '[]');
    localStorage.setItem('gowha_contact_lists', JSON.stringify(lists.filter(l => l.id !== id)));
  } catch (e) { /* ignore */ }
  // Remove contacts from localStorage
  try {
    const contacts = JSON.parse(localStorage.getItem('gowha_contacts') || '{}');
    delete contacts[id];
    localStorage.setItem('gowha_contacts', JSON.stringify(contacts));
  } catch (e) { /* ignore */ }
  // Delete from Firestore — throw on failure so caller sees the error
  try {
    await deleteDoc(doc(db, 'whatsapp_contact_lists', id));
    await deleteDoc(doc(db, 'whatsapp_contacts', id)).catch(() => {}); // contacts doc may not exist
    console.log('[whatsappDb] Contact list deleted from Firestore:', id);
  } catch (err) {
    console.error('[whatsappDb] Firestore deleteContactList FAILED:', err.code, err.message);
    alert('Delete failed: ' + (err.message || err.code || 'Unknown error') + '\n\nCheck console for details.');
    throw err;
  }
}

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
