import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, FileSpreadsheet, Users, Eye, AlertCircle, CheckCircle, Image, Link, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { whatsappDb } from './whatsappDb';
import { useCRM } from '../../context/CRMContext';
import { storage } from '../../firebase';
import { ref, uploadBytesResumable, getDownloadURL, listAll } from 'firebase/storage';

const BRAND_BLUE = '#2563eb';

const autoDetectTemplateVariables = (tmplName, bodyText, columns) => {
  const mapping = {};
  if (!bodyText || !columns || columns.length === 0) return mapping;

  const vars = [...new Set(bodyText.match(/\{\{(\d+)\}\}/g) || [])].map(m => m.replace(/[{}]/g, ''));
  const colsLower = columns.map(c => c.toLowerCase());

  const findColumnIndex = (keywords) => {
    for (const kw of keywords) {
      const idx = colsLower.findIndex(c => c.includes(kw));
      if (idx !== -1) return columns[idx];
    }
    return null;
  };

  const nameCol = findColumnIndex(['name', 'first_name', 'fullname', 'firstname', 'client', 'lead_name']);
  const phoneCol = findColumnIndex(['phone', 'mobile', 'contact', 'number', 'tel']);
  const courseCol = findColumnIndex(['course', 'program', 'class', 'batch', 'subject']);
  const feeCol = findColumnIndex(['fee', 'amount', 'payment', 'price', 'cost', 'due']);
  const dateCol = findColumnIndex(['date', 'due_date', 'time', 'day', 'deadline', 'created_at']);

  vars.forEach(v => {
    const regex = new RegExp(`(?:\\b\\w+\\s+){0,3}\\{\\{${v}\\}\\}(?:\\s+\\w+){0,3}`, 'i');
    const match = bodyText.match(regex);
    const context = match ? match[0].toLowerCase() : '';

    if (/hi\s+\{\{|\bhello\s+\{\{|\bdear\s+\{\{|\bhey\s+\{\{|\bto:\s*\{\{/i.test(context)) {
      if (nameCol) {
        mapping[v] = nameCol;
        return;
      }
    }

    if (/\{\{\d+\}\}\s+course|\{\{\d+\}\}\s+program|enrolled\s+in\s+\{\{|\bfor\s+\{\{|\bclass\s+\{\{/i.test(context)) {
      if (courseCol) {
        mapping[v] = courseCol;
        return;
      }
    }

    if (/payment\s+of\s+\{\{|\bfee\s+of\s+\{\{|\bamount\s*\{\{|\brs\.*\s*\{\{|₹\s*\{\{|\$\s*\{\{|\bpay\s+\{\{|\bdue\s+of\s+\{\{/i.test(context)) {
      if (feeCol) {
        mapping[v] = feeCol;
        return;
      }
    }

    if (/due\s+on\s+\{\{|\bdate\s+\{\{|\bby\s+\{\{|\bon\s+\{\{|\bbefore\s+\{\{/i.test(context)) {
      if (dateCol) {
        mapping[v] = dateCol;
        return;
      }
    }

    // Fallbacks
    if (v === '1' && nameCol) {
      mapping[v] = nameCol;
    } else if (v === '2' && feeCol) {
      mapping[v] = feeCol;
    } else if (v === '3' && courseCol) {
      mapping[v] = courseCol;
    } else if (v === '4' && dateCol) {
      mapping[v] = dateCol;
    } else {
      if (v === '1' && nameCol) mapping[v] = nameCol;
      else mapping[v] = '';
    }
  });

  return mapping;
};

export default function NewCampaign({ setSubView }) {
  const fileInputRef = useRef(null);
  const headerMediaInputRef = useRef(null);

  // Steps: 1=Upload/Select contacts, 2=Compose message, 3=Preview & Send
  const [step, setStep] = useState(1);

  // Contacts
  const [existingLists, setExistingLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [uploadedContacts, setUploadedContacts] = useState([]);
  const [columns, setColumns] = useState([]);
  const [uploadName, setUploadName] = useState('');
  const [uploading, setUploading] = useState(false);

  // Message
  const [campaignName, setCampaignName] = useState('');
  const [messageType, setMessageType] = useState('text');
  const [messageText, setMessageText] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateLanguage, setTemplateLanguage] = useState('en_US');

  // Template variables mapping
  const [variableMapping, setVariableMapping] = useState({});
  const [manualVariables, setManualVariables] = useState({});
  const [variableMode, setVariableMode] = useState({});
  const [phoneColumn, setPhoneColumn] = useState('');

  // Header media
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [headerMediaMode, setHeaderMediaMode] = useState('upload');
  const [headerMediaUploading, setHeaderMediaUploading] = useState(false);
  const [headerMediaFileName, setHeaderMediaFileName] = useState('');
  const [availableMedia, setAvailableMedia] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Fetch available media on mount
  useEffect(() => {
    const fetchMedia = async () => {
      setLoadingMedia(true);
      try {
        const listRef = ref(storage, 'campaign_media');
        const res = await listAll(listRef);
        const mediaList = await Promise.all(res.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          return { name: itemRef.name, url };
        }));
        setAvailableMedia(mediaList);
      } catch (err) {
        console.error("Error fetching media from storage", err);
      }
      setLoadingMedia(false);
    };
    fetchMedia();
  }, []);

  // Preview / Send
  const [previewContacts, setPreviewContacts] = useState([]);
  const [sending, setSending] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [result, setResult] = useState(null);

  const { leads, courses, addLead, addBulkLeads, sendWhatsAppMsg, prefilledCampaignLeads, setPrefilledCampaignLeads } = useCRM();

  useEffect(() => {
    if (prefilledCampaignLeads && prefilledCampaignLeads.length > 0) {
      setUploadedContacts(prefilledCampaignLeads);
      setPreviewContacts(prefilledCampaignLeads.slice(0, 3));
      setSelectedListId('');
      setStep(2);
      setPrefilledCampaignLeads(null);
    }
  }, [prefilledCampaignLeads, setPrefilledCampaignLeads]);

  // Filters for CRM Leads
  const [campaignCourseFilter, setCampaignCourseFilter] = useState('');
  const [campaignStageFilter, setCampaignStageFilter] = useState('');
  const [campaignSourceFilter, setCampaignSourceFilter] = useState('');
  const [campaignNameFilter, setCampaignNameFilter] = useState('');

  const getBaseLeads = () => {
    if (!selectedListId || selectedListId === 'crm-leads-all') {
      return leads;
    }
    return whatsappDb.getContacts()[selectedListId] || [];
  };

  const getFilteredLeads = () => {
    return getBaseLeads().filter(lead => {
      const matchCourse = campaignCourseFilter ? lead.course === campaignCourseFilter : true;
      const matchStage = campaignStageFilter ? lead.stage === campaignStageFilter : true;
      const matchSource = campaignSourceFilter ? lead.source === campaignSourceFilter : true;
      const matchCampaign = campaignNameFilter && campaignSourceFilter.toLowerCase().includes('meta') 
        ? (lead.campaign === campaignNameFilter || lead.campaignName === campaignNameFilter) 
        : true;
      return matchCourse && matchStage && matchSource && matchCampaign;
    });
  };

  const baseLeads = getBaseLeads();
  const uniqueCourses = [...new Set(baseLeads.map(l => l.course).filter(Boolean))];
  const uniqueStages = [...new Set(baseLeads.map(l => l.stage).filter(Boolean))];
  const uniqueSources = [...new Set(baseLeads.map(l => l.source).filter(Boolean))];
  const uniqueCampaigns = [...new Set(baseLeads.filter(l => (l.source || '').toLowerCase().includes('meta')).map(l => l.campaign || l.campaignName).filter(Boolean))];

  useEffect(() => {
    if (selectedListId) {
      const filtered = getFilteredLeads();
      setPreviewContacts(filtered.slice(0, 3));
    }
  }, [selectedListId, campaignCourseFilter, campaignStageFilter, campaignSourceFilter, campaignNameFilter, leads]);

  useEffect(() => {
    loadExistingLists();
    loadTemplates();
  }, [leads.length]);

  // Real-time auto-detect mapping for template variables when template, columns, or templates load
  useEffect(() => {
    if (!selectedTemplate) return;
    const tmpl = templates.find(t => t.name === selectedTemplate);
    if (!tmpl) return;

    const bodyText = tmpl.components?.find(c => c.type === 'BODY')?.text || '';
    const detectedMapping = autoDetectTemplateVariables(selectedTemplate, bodyText, columns);

    setVariableMapping(prev => ({
      ...detectedMapping,
      // preserve manually mapped fields if they are still present in current columns
      ...Object.fromEntries(
        Object.entries(prev).filter(([v, col]) => columns.includes(col))
      )
    }));

    const vars = [...new Set(bodyText.match(/\{\{(\d+)\}\}/g) || [])].map(m => m.replace(/[{}]/g, ''));
    setVariableMode(prev => {
      const modes = { ...prev };
      vars.forEach(v => {
        if (!modes[v]) modes[v] = 'column';
      });
      return modes;
    });
  }, [selectedTemplate, columns, templates]);

  const loadExistingLists = () => {
    const lists = whatsappDb.getContactLists().filter(l => l.id !== 'crm-leads-all');
    const crmList = {
      id: 'crm-leads-all',
      name: 'Active CRM Leads (Live)',
      contactCount: leads.length,
      columns: ['name', 'phone', 'course', 'stage', 'counselor'],
      createdAt: new Date().toISOString(),
      isLive: true
    };
    setExistingLists([crmList, ...lists]);
  };

  const loadTemplates = () => {
    const tmpls = whatsappDb.getTemplates();
    setTemplates(tmpls);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhoneColumn('');
    setUploadName(file.name.replace(/\.[^.]+$/, ''));
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        if (jsonData.length === 0) {
          alert('The file is empty or has no valid data.');
          return;
        }

        const cols = Object.keys(jsonData[0]);
        setColumns(cols);
        setUploadedContacts(jsonData);
        setPreviewContacts(jsonData.slice(0, 3));
        setSelectedListId('');
      } catch (error) {
        alert('Failed to parse file. Please upload a valid CSV or Excel file.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleUploadToServer = () => {
    if (uploadedContacts.length === 0) return;
    setUploading(true);

    setTimeout(() => {
      const newListId = `list-${Date.now()}`;
      const newListName = uploadName || 'Uploaded Contacts';

      const newLists = [
        ...existingLists,
        {
          id: newListId,
          name: newListName,
          contactCount: uploadedContacts.length,
          columns,
          createdAt: new Date().toISOString()
        }
      ];

      const allContacts = whatsappDb.getContacts();
      const mappedContacts = uploadedContacts.map((c, i) => ({ id: `c-${Date.now()}-${i}`, ...c }));
      allContacts[newListId] = mappedContacts;

      whatsappDb.saveContactLists(newLists);
      whatsappDb.saveContacts(allContacts);

      // Sync uploaded contacts to global CRM Leads
      const leadsToImport = mappedContacts.map(c => {
        let phone = '';
        if (phoneColumn) {
          phone = String(c[phoneColumn] || '').trim();
        } else {
          const directMatch = c.phone || c.Phone || c.mobile || c.Mobile || c.number || c.Number;
          if (directMatch) {
            phone = String(directMatch).trim();
          } else {
            for (const key of Object.keys(c)) {
              const lowerKey = key.toLowerCase().replace(/[^a-z]/g, '');
              if (lowerKey.includes('phone') || lowerKey.includes('mobile') || lowerKey.includes('contactnumber')) {
                phone = String(c[key] || '').trim();
                break;
              }
            }
          }
        }
        
        let resolvedName = '';
        const nameKeys = ['name', 'Name', 'first_name', 'First Name', 'full_name', 'Full Name', 'contact_name', 'Contact Name', 'student_name', 'Student Name'];
        for (const key of nameKeys) {
          if (c[key]) {
            resolvedName = String(c[key]).trim();
            break;
          }
        }
        if (!resolvedName) {
          for (const key of Object.keys(c)) {
            if (key.toLowerCase().includes('name') && c[key]) {
              resolvedName = String(c[key]).trim();
              break;
            }
          }
        }
        if (!resolvedName) {
          resolvedName = 'Campaign Contact';
        }

        return {
          name: resolvedName,
          phone: phone,
          email: c.email || c.Email || '',
          course: c.course || c.Course || '',
          source: 'Campaign Upload'
        };
      });
      
      if (addBulkLeads && leadsToImport.length > 0) {
        addBulkLeads(leadsToImport);
      }

      setSelectedListId(newListId);
      setExistingLists(newLists);
      setUploading(false);
      alert('Contacts uploaded and saved successfully!');
    }, 1000);
  };

  const handleSelectExistingList = (listId) => {
    if (selectedListId === listId) {
      setSelectedListId('');
      setPreviewContacts([]);
      setColumns([]);
      return;
    }
    setSelectedListId(listId);
    setUploadedContacts([]);
    setPhoneColumn('');
    
    // Reset filters when changing lists
    setCampaignCourseFilter('');
    setCampaignStageFilter('');
    setCampaignSourceFilter('');
    setCampaignNameFilter('');
    
    if (listId === 'crm-leads-all') {
      setColumns(['name', 'phone', 'course', 'course_fee', 'stage', 'counselor']);
    } else {
      const targetList = existingLists.find(l => l.id === listId);
      setColumns(targetList ? targetList.columns : []);
    }
  };

  const getContactPhone = (contact) => {
    if (phoneColumn) return String(contact[phoneColumn] || '').trim();
    
    // Check standard hardcoded keys
    const directMatch = contact.phone || contact.Phone || contact.mobile || contact.Mobile || contact.number || contact.Number;
    if (directMatch) return String(directMatch).trim();
    
    // Search through all keys for a match
    for (const key of Object.keys(contact)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z]/g, '');
      if (lowerKey.includes('phone') || lowerKey.includes('mobile') || lowerKey.includes('contactnumber')) {
        return String(contact[key] || '').trim();
      }
    }
    
    return '';
  };

  const insertVariable = (col) => {
    setMessageText(prev => prev + `{${col}}`);
  };

  const getPreviewMessage = (contact) => {
    let msg = messageText;
    for (const [key, value] of Object.entries(contact)) {
      const regex = new RegExp(`\\{${key}\\}`, 'gi');
      msg = msg.replace(regex, String(value || ''));
    }
    return msg;
  };

  const getSelectedTemplateData = () => {
    return templates.find(t => t.name === selectedTemplate);
  };

  const getTemplateHeaderType = () => {
    const tmpl = getSelectedTemplateData();
    if (!tmpl) return null;
    const headerComp = tmpl.components?.find(c => c.type === 'HEADER');
    return headerComp ? headerComp.format : 'NONE';
  };

  const getTemplateVariables = () => {
    const tmpl = getSelectedTemplateData();
    if (!tmpl) return [];
    const bodyComp = tmpl.components?.find(c => c.type === 'BODY');
    if (!bodyComp?.text) return [];
    const matches = bodyComp.text.match(/\{\{(\d+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
  };

  const getTemplateBody = () => {
    const tmpl = getSelectedTemplateData();
    if (!tmpl) return '';
    const bodyComp = tmpl.components?.find(c => c.type === 'BODY');
    return bodyComp?.text || '';
  };

  const getTemplatePreview = (contact) => {
    let body = getTemplateBody();
    const vars = getTemplateVariables();
    for (const varNum of vars) {
      const mode = variableMode[varNum] || 'column';
      if (mode === 'manual' && manualVariables[varNum]) {
        body = body.replace(`{{${varNum}}}`, manualVariables[varNum]);
      } else if (mode === 'column' && variableMapping[varNum]) {
        const colName = variableMapping[varNum];
        let val = '';
        if (colName === 'course_fee') {
          const matchedCourse = courses?.find(c => c.name === contact.course);
          val = matchedCourse?.fee || 'N/A';
        } else if (contact[colName] !== undefined) {
          val = String(contact[colName]);
        }
        body = body.replace(`{{${varNum}}}`, val);
      }
    }
    return body;
  };

  const handleHeaderMediaUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setHeaderMediaUploading(true);
    try {
      const storageRef = ref(storage, `campaign_media/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed', 
        (snapshot) => {}, 
        (error) => {
          console.error("Upload failed", error);
          alert("Failed to upload image.");
          setHeaderMediaUploading(false);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setHeaderMediaUrl(downloadURL);
          setHeaderMediaFileName(file.name);
          setHeaderMediaUploading(false);
          // Add newly uploaded file to availableMedia dropdown instantly
          setAvailableMedia(prev => [...prev, { name: file.name, url: downloadURL }]);
        }
      );
    } catch (err) {
      console.error(err);
      setHeaderMediaUploading(false);
    }
  };

  const getMessageForContact = (contact) => {
    if (messageType === 'text') {
      return getPreviewMessage(contact);
    } else {
      return getTemplatePreview(contact);
    }
  };
  const getTemplateDataForContact = (contact) => {
    if (messageType !== 'template') return null;
    const vars = getTemplateVariables();
    const parameters = [];
    for (const varNum of vars) {
      let val = '';
      const mode = variableMode[varNum] || 'column';
      if (mode === 'manual' && manualVariables[varNum]) {
        val = manualVariables[varNum];
      } else if (mode === 'column' && variableMapping[varNum]) {
        const colName = variableMapping[varNum];
        if (colName === 'course_fee') {
          const matchedCourse = courses?.find(c => c.name === contact.course);
          val = matchedCourse?.fee || 'N/A';
        } else if (contact[colName] !== undefined) {
          val = String(contact[colName]);
        }
      }
      parameters.push({
        type: 'text',
        text: val || ' ' // Meta API rejects empty string, fallback to space
      });
    }
    const components = [];
    const headerType = getTemplateHeaderType();
    if (headerType && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && headerMediaUrl) {
      components.push({
        type: 'header',
        parameters: [
          {
            type: headerType.toLowerCase(),
            [headerType.toLowerCase()]: {
              link: headerMediaUrl
            }
          }
        ]
      });
    }

    if (parameters.length > 0) {
      components.push({
        type: 'body',
        parameters: parameters
      });
    }
    return {
      name: selectedTemplate,
      language: { code: templateLanguage || 'en_US' },
      components: components
    };
  };

  const handleScheduleCampaign = async () => {
    if (!selectedListId && uploadedContacts.length === 0) {
      alert('Please select or upload a contact list first');
      return;
    }
    if (messageType === 'text' && !messageText.trim()) {
      alert('Please enter a message');
      return;
    }
    if (messageType === 'template' && !selectedTemplate) {
      alert('Please select a template');
      return;
    }
    if (!scheduleDate) {
      alert('Please select a schedule date and time');
      return;
    }

    let targetContacts = [];
    if (selectedListId === 'crm-leads-all') {
      targetContacts = getFilteredLeads();
    } else if (selectedListId) {
      const allContacts = whatsappDb.getContacts();
      targetContacts = allContacts[selectedListId] || [];
    } else {
      targetContacts = uploadedContacts;
    }

    const newCampaign = {
      id: `camp-${Date.now()}`,
      name: campaignName || 'Scheduled Campaign',
      totalRecipients: targetContacts.length,
      sent: 0,
      failed: 0,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      scheduledFor: scheduleDate,
      contactListId: selectedListId,
      type: messageType,
      message: messageText,
      templateName: selectedTemplate,
      languageCode: templateLanguage
    };

    try {
      const currentCampaigns = whatsappDb.getCampaigns();
      await whatsappDb.saveCampaigns([newCampaign, ...currentCampaigns]);

      const preparedContacts = targetContacts.map(contact => ({
        ...contact,
        _messageToDeliver: getMessageForContact(contact),
        _templateData: getTemplateDataForContact(contact)
      }));

      const currentRecipients = whatsappDb.getRecipients();
      currentRecipients[newCampaign.id] = preparedContacts.map(c => ({
        ...c,
        status: 'scheduled',
        error: null
      }));
      whatsappDb.saveRecipients(currentRecipients);

      alert("Campaign scheduled successfully!");
      setSubView('campaigns');
    } catch (err) {
      console.error("Failed to schedule campaign:", err);
      alert("Error scheduling campaign");
    }
  };

  const handleSendCampaign = async () => {
    if (!selectedListId && uploadedContacts.length === 0) {
      alert('Please select or upload a contact list first');
      return;
    }
    if (messageType === 'text' && !messageText.trim()) {
      alert('Please enter a message');
      return;
    }
    if (messageType === 'template' && !selectedTemplate) {
      alert('Please select a template');
      return;
    }

    setSending(true);
    let targetContacts = [];
    if (selectedListId === 'crm-leads-all') {
      targetContacts = getFilteredLeads();
    } else if (selectedListId) {
      const allContacts = whatsappDb.getContacts();
      targetContacts = allContacts[selectedListId] || [];
    } else {
      targetContacts = uploadedContacts;
    }

    const totalCount = targetContacts.length;
    let sentCount = 0;
    let failedCount = 0;


    // Prepare contacts with the dynamic message body and template payload attached
    const preparedContacts = targetContacts.map(contact => ({
      ...contact,
      _messageToDeliver: getMessageForContact(contact),
      _templateData: getTemplateDataForContact(contact)
    }));

    try {
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'leads-management-tz';
      const isLocal = false; // Forced to false to use deployed function instead of local emulator
      const url = isLocal 
        ? `http://127.0.0.1:5001/${projectId}/us-central1/sendBulkWhatsAppCampaign`
        : `https://us-central1-${projectId}.cloudfunctions.net/sendBulkWhatsAppCampaign`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetContacts: preparedContacts,
          campaignName,
          messageType,
          selectedTemplate,
          templateLanguage,
          messageText: messageType === 'text' ? messageText : '',
          counselorName: 'Counselor'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Backend saves campaign and recipients, the onSnapshot listener in whatsappDb will sync UI
        setResult({
          totalRecipients: data.campaign?.totalRecipients || totalCount,
          sent: data.results?.sent || 0,
          failed: data.results?.failed || 0
        });
      } else {
        alert('Campaign failed: ' + (data.error || 'Unknown error') + '\nDetails: ' + (data.details || ''));
        setResult({ totalRecipients: totalCount, sent: 0, failed: totalCount });
      }
    } catch (err) {
      console.error('Failed to dispatch bulk campaign:', err);
      alert('Failed to reach bulk campaign gateway. Check your connection or Firebase deployment.');
      setResult({ totalRecipients: totalCount, sent: 0, failed: totalCount });
    } finally {
      setSending(false);
    }
  };

  if (result) {
    return (
      <div style={{ padding: 24, maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: '#dcfce7', borderRadius: '50%', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '40px auto 20px' }}>
          <CheckCircle size={40} color="#16a34a" />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Campaign Started!</h2>
        <p style={{ color: '#64748b', marginTop: 8 }}>
          Sending bulk messages to {result.totalRecipients} recipients. You can track progress in the campaigns list.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
          <button
            onClick={() => setSubView('campaigns')}
            style={{
              padding: '10px 24px', borderRadius: 10, fontWeight: 600,
              background: BRAND_BLUE, color: '#fff', border: 'none', cursor: 'pointer',
            }}
          >
            View Campaigns
          </button>
          <button
            onClick={() => { setResult(null); setStep(1); setMessageText(''); setCampaignName(''); setVariableMapping({}); setManualVariables({}); setVariableMode({}); setPhoneColumn(''); setHeaderMediaUrl(''); setHeaderMediaFileName(''); }}
            style={{
              padding: '10px 24px', borderRadius: 10, fontWeight: 600,
              background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer',
            }}
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>New Campaign</h1>
      <p style={{ color: '#64748b', marginBottom: 24 }}>Send personalized bulk messages via WhatsApp</p>

      {/* Step Indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {[
          { num: 1, label: 'Contacts' },
          { num: 2, label: 'Message' },
          { num: 3, label: 'Send' },
        ].map(({ num, label }) => (
          <div key={num} style={{ flex: 1 }}>
            <div style={{
              height: 4, borderRadius: 2, marginBottom: 6,
              background: step >= num ? BRAND_BLUE : '#e2e8f0',
              transition: 'background 0.3s',
            }} />
            <span style={{ fontSize: '0.8rem', color: step >= num ? BRAND_BLUE : '#94a3b8', fontWeight: 600 }}>
              Step {num}: {label}
            </span>
          </div>
        ))}
      </div>

      {/* STEP 1: Contacts */}
      {step === 1 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={20} />
            Select or Upload Contacts
          </h2>

          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #cbd5e1', borderRadius: 12, padding: 40,
              textAlign: 'center', cursor: 'pointer', marginBottom: 20,
              background: uploadedContacts.length > 0 ? '#f0fdf4' : '#fafafa',
              transition: 'all 0.2s',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            {uploadedContacts.length > 0 ? (
              <>
                <FileSpreadsheet size={36} color={BRAND_BLUE} style={{ margin: '0 auto 8px' }} />
                <p style={{ fontWeight: 600, color: '#16a34a' }}>{uploadedContacts.length} contacts loaded</p>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                  Columns: {columns.join(', ')}
                </p>
              </>
            ) : (
              <>
                <Upload size={36} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontWeight: 500, color: '#475569' }}>Drop CSV or Excel file here, or click to upload</p>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                  File must have a column with phone numbers (named: phone, Phone, number, mobile, etc.)
                </p>
              </>
            )}
          </div>

          {uploadedContacts.length > 0 && !selectedListId && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
              <input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Contact list name..."
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 8,
                  border: '1px solid #d1d5db', outline: 'none',
                }}
              />
              <button
                onClick={handleUploadToServer}
                disabled={uploading}
                style={{
                  padding: '10px 20px', borderRadius: 8, fontWeight: 600,
                  background: BRAND_BLUE, color: '#fff', border: 'none', cursor: 'pointer',
                  opacity: uploading ? 0.6 : 1,
                }}
              >
                {uploading ? 'Saving...' : 'Save Contacts'}
              </button>
            </div>
          )}

          {/* Existing Lists */}
          {existingLists.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0 12px' }}>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>or select existing list</span>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {existingLists
                  .filter(list => !selectedListId || selectedListId === list.id)
                  .map(list => (
                  <div
                    key={list.id}
                    onClick={() => handleSelectExistingList(list.id)}
                    style={{
                      padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                      border: selectedListId === list.id ? `2px solid ${BRAND_BLUE}` : '1px solid #e2e8f0',
                      background: selectedListId === list.id ? `${BRAND_BLUE}08` : '#fff',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, color: '#0f172a' }}>{list.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{list.contactCount} contacts</div>
                    </div>
                    {selectedListId === list.id && <CheckCircle size={20} color={BRAND_BLUE} />}
                  </div>
                ))}
              </div>
            </>
          )}

          {selectedListId && (
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, marginTop: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: 12 }}>Filter {selectedListId === 'crm-leads-all' ? 'CRM Leads' : 'List Contacts'}</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <select
                  value={campaignCourseFilter}
                  onChange={e => setCampaignCourseFilter(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none' }}
                >
                  <option value="">All Courses</option>
                  {uniqueCourses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={campaignStageFilter}
                  onChange={e => setCampaignStageFilter(e.target.value)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none' }}
                >
                  <option value="">All Stages</option>
                  {uniqueStages.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select
                  value={campaignSourceFilter}
                  onChange={e => {
                    setCampaignSourceFilter(e.target.value);
                    if (!e.target.value.toLowerCase().includes('meta')) {
                      setCampaignNameFilter('');
                    }
                  }}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none' }}
                >
                  <option value="">All Sources</option>
                  {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {campaignSourceFilter.toLowerCase().includes('meta') && (
                  <select
                    value={campaignNameFilter}
                    onChange={e => setCampaignNameFilter(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', outline: 'none' }}
                  >
                    <option value="">All Campaigns</option>
                    {uniqueCampaigns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <div style={{ marginTop: 12, fontSize: '0.85rem', color: '#64748b' }}>
                <span style={{ fontWeight: 600, color: BRAND_BLUE }}>{getFilteredLeads().length}</span> leads match your filters.
              </div>
            </div>
          )}

          {(selectedListId || uploadedContacts.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                Which column contains the phone numbers?
              </label>
              <select
                value={phoneColumn}
                onChange={(e) => setPhoneColumn(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                <option value="">Auto-detect (phone, Phone, number, mobile...)</option>
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setStep(2)}
              disabled={!selectedListId && uploadedContacts.length === 0}
              style={{
                padding: '10px 24px', borderRadius: 10, fontWeight: 600,
                background: (selectedListId || uploadedContacts.length > 0) ? BRAND_BLUE : '#e2e8f0',
                color: (selectedListId || uploadedContacts.length > 0) ? '#fff' : '#94a3b8',
                border: 'none', cursor: (selectedListId || uploadedContacts.length > 0) ? 'pointer' : 'not-allowed',
              }}
            >
              Next: Compose Message
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Compose Message */}
      {step === 2 && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 32 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16, color: '#0f172a' }}>Compose Message</h2>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
              Campaign Name
            </label>
            <input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., March Promo, Welcome Message..."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box',
                background: '#f8fafc'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <button
              onClick={() => setMessageType('text')}
              style={{
                padding: '10px 24px',
                borderRadius: 24,
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                background: messageType === 'text' ? BRAND_BLUE : '#fff',
                color: messageType === 'text' ? '#fff' : '#1f2937',
                border: messageType === 'text' ? `1px solid ${BRAND_BLUE}` : '1px solid #d1d5db',
                transition: 'all 0.2s',
              }}
            >
              Custom Message
            </button>
            <button
              onClick={() => setMessageType('template')}
              style={{
                padding: '10px 24px',
                borderRadius: 24,
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                background: messageType === 'template' ? BRAND_BLUE : '#fff',
                color: messageType === 'template' ? '#fff' : '#1f2937',
                border: messageType === 'template' ? `1px solid ${BRAND_BLUE}` : '1px solid #d1d5db',
                transition: 'all 0.2s',
              }}
            >
              WhatsApp Template
            </button>
          </div>

          {messageType === 'text' ? (
            <>
              {columns.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: 8 }}>Insert variable:</span>
                  {columns.map(col => (
                    <button
                      key={col}
                      onClick={() => insertVariable(col)}
                      style={{
                        padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 500,
                        background: `${BRAND_BLUE}15`, color: BRAND_BLUE, border: `1px solid ${BRAND_BLUE}40`,
                        cursor: 'pointer', marginRight: 6, marginBottom: 4,
                      }}
                    >
                      {`{${col}}`}
                    </button>
                  ))}
                </div>
              )}

              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={`Hi {name}! Welcome to TechZone. Your course is {course}.`}
                rows={6}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '1px solid #d1d5db', outline: 'none', resize: 'vertical',
                  fontFamily: 'inherit', fontSize: '0.95rem', boxSizing: 'border-box',
                }}
              />
            </>
          ) : (
            <>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: 6 }}>
                Select Template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value);
                  const tmpl = templates.find(t => t.name === e.target.value);
                  if (tmpl) setTemplateLanguage(tmpl.language);
                }}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem',
                  background: '#fff', cursor: 'pointer'
                }}
              >
                <option value="">Choose a template...</option>
                {templates.filter(t => t.status === 'APPROVED').map(t => (
                  <option key={t.name} value={t.name}>{t.name} - {t.language} ({t.category})</option>
                ))}
              </select>

              {selectedTemplate && (
                <div style={{ marginTop: 20 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                    Template Preview
                  </label>
                  <div style={{
                    background: '#e8f9e0',
                    color: '#2e631d',
                    padding: 16,
                    borderRadius: 12,
                    border: '1px solid #cceec1',
                    fontSize: '0.95rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    marginBottom: 20
                  }}>
                    {getTemplateBody()}
                  </div>

                  {/* Media Header If Needed */}
                  {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(getTemplateHeaderType()) && (
                    <div style={{ background: '#fffbeb', borderRadius: 10, padding: 16, border: '1px solid #fde68a', marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#92400e', marginBottom: 10 }}>
                        This template requires a {getTemplateHeaderType().toLowerCase()} header *
                      </label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder={`Paste public ${getTemplateHeaderType().toLowerCase()} URL (https://...)`}
                          value={headerMediaUrl}
                          onChange={(e) => {
                            setHeaderMediaUrl(e.target.value);
                            setHeaderMediaFileName('');
                          }}
                          style={{
                            flex: 1, padding: '10px 14px', borderRadius: 8,
                            border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem', boxSizing: 'border-box'
                          }}
                        />
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#92400e' }}>OR</span>
                        <input 
                          type="file" 
                          ref={headerMediaInputRef} 
                          style={{ display: 'none' }} 
                          accept={getTemplateHeaderType() === 'IMAGE' ? 'image/*' : getTemplateHeaderType() === 'VIDEO' ? 'video/*' : '*/*'}
                          onChange={handleHeaderMediaUpload} 
                        />
                        <button
                          onClick={() => headerMediaInputRef.current?.click()}
                          disabled={headerMediaUploading}
                          style={{
                            padding: '10px 16px', background: '#d97706', color: '#fff',
                            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
                          }}
                        >
                          {headerMediaUploading ? (
                            <><Loader2 size={16} className="spinner" /> Uploading...</>
                          ) : (
                            <><Upload size={16} /> Upload File</>
                          )}
                        </button>
                      </div>

                      {/* Select existing uploaded file */}
                      {availableMedia.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <select
                            onChange={(e) => {
                              const selected = availableMedia.find(m => m.url === e.target.value);
                              if (selected) {
                                setHeaderMediaUrl(selected.url);
                                setHeaderMediaFileName(selected.name);
                              }
                            }}
                            value={availableMedia.find(m => m.url === headerMediaUrl)?.url || ''}
                            style={{
                              width: '100%', padding: '10px 14px', borderRadius: 8,
                              border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.90rem',
                              background: '#fff', cursor: 'pointer'
                            }}
                          >
                            <option value="">Or select an image you uploaded previously...</option>
                            {availableMedia.map(m => (
                              <option key={m.url} value={m.url}>{m.name.split('_').slice(1).join('_') || m.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: 8 }}>
                        {headerMediaFileName ? `✅ Attached: ${headerMediaFileName}` : "Note: Meta API requires a public URL to deliver media."}
                      </div>
                    </div>
                  )}

                  {/* Set Template Variables Card */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 16,
                    padding: 24,
                    marginTop: 20
                  }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                      Set Template Variables
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4, marginBottom: 20 }}>
                      For each variable, choose to map from a CSV column (personalized per contact) or enter a fixed value (same for all).
                    </p>

                    {getTemplateVariables().map(v => (
                      <div key={v} style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <span style={{
                            background: '#eff6ff',
                            color: BRAND_BLUE,
                            padding: '4px 10px',
                            borderRadius: 8,
                            fontWeight: 600,
                            fontSize: '0.85rem'
                          }}>
                            {`{{${v}}}`}
                          </span>
                          <span style={{ color: '#94a3b8', fontWeight: 500 }}>→</span>

                          <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: 20, padding: 2 }}>
                            <button
                              onClick={() => setVariableMode(prev => ({ ...prev, [v]: 'column' }))}
                              style={{
                                padding: '6px 14px', borderRadius: 18, border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                background: (variableMode[v] || 'column') === 'column' ? BRAND_BLUE : 'transparent',
                                color: (variableMode[v] || 'column') === 'column' ? '#fff' : '#475569',
                                transition: 'all 0.2s',
                              }}
                            >
                              From Column
                            </button>
                            <button
                              onClick={() => setVariableMode(prev => ({ ...prev, [v]: 'manual' }))}
                              style={{
                                padding: '6px 14px', borderRadius: 18, border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                background: (variableMode[v] || 'column') === 'manual' ? BRAND_BLUE : 'transparent',
                                color: (variableMode[v] || 'column') === 'manual' ? '#fff' : '#475569',
                                transition: 'all 0.2s',
                              }}
                            >
                              Manual Value
                            </button>
                          </div>
                        </div>

                        {(variableMode[v] || 'column') === 'column' ? (
                          <select
                            value={variableMapping[v] || ''}
                            onChange={e => setVariableMapping(prev => ({ ...prev, [v]: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: 8,
                              border: '1px solid #cbd5e1',
                              outline: 'none',
                              fontSize: '0.9rem',
                              background: '#fff',
                            }}
                          >
                            <option value="">Select column...</option>
                            {columns.map(col => <option key={col} value={col}>{col}</option>)}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={manualVariables[v] || ''}
                            onChange={e => setManualVariables(prev => ({ ...prev, [v]: e.target.value }))}
                            placeholder="Enter fixed text value..."
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: 8,
                              border: '1px solid #cbd5e1',
                              outline: 'none',
                              fontSize: '0.9rem',
                              boxSizing: 'border-box',
                            }}
                          />
                        )}
                      </div>
                    ))}

                    <div style={{ marginTop: 24 }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#64748b', marginBottom: 8 }}>
                        Preview (first contact):
                      </label>
                      <div style={{
                        background: '#e8f9e0',
                        color: '#2e631d',
                        padding: 16,
                        borderRadius: 12,
                        border: '1px solid #cceec1',
                        fontSize: '0.95rem',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap'
                      }}>
                        {previewContacts.length > 0 ? getTemplatePreview(previewContacts[0]) : getTemplateBody()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => setStep(1)}
              style={{
                padding: '10px 24px',

                borderRadius: 24,
                background: '#fff',
                color: '#1e293b',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'all 0.2s',
              }}
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={messageType === 'template' && !selectedTemplate}
              style={{
                padding: '10px 24px',
                borderRadius: 24,
                fontWeight: 600,
                fontSize: '0.9rem',
                background: (messageType === 'text' || selectedTemplate) ? BRAND_BLUE : '#e2e8f0',
                color: (messageType === 'text' || selectedTemplate) ? '#fff' : '#94a3b8',
                border: 'none',
                cursor: (messageType === 'text' || selectedTemplate) ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              Next: Preview & Send
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Preview & Send */}
      {step === 3 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16, color: '#0f172a' }}>Preview & Confirm</h2>

          {previewContacts.length > 0 ? (
            <div style={{ background: '#efeae2', borderRadius: 12, padding: 20, border: '1px solid #cbd5e1', marginBottom: 20, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.06)', borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', fontWeight: 600 }}>
                Sample Preview
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600 }}>To: {previewContacts[0].name || 'Recipient'} ({getContactPhone(previewContacts[0]) || 'Number'})</span>
                <div style={{
                  background: '#dcf8c6', padding: '10px 14px', borderRadius: '10px 10px 4px 10px',
                  maxWidth: 500, fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginTop: 10,
                  boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)'
                }}>
                  {messageType === 'text' ? getPreviewMessage(previewContacts[0]) : getTemplatePreview(previewContacts[0])}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: 20, background: '#f8fafc', borderRadius: 8, color: '#64748b', textAlign: 'center', marginBottom: 20 }}>
              No preview available. Make sure a contact list is loaded.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setStep(2)} style={{ padding: '10px 24px', borderRadius: 10, background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Back</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input 
                type="datetime-local" 
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', color: '#334155', outline: 'none' }} 
              />
              <button
                style={{
                  padding: '10px 20px', borderRadius: 10, fontWeight: 600,
                  background: scheduleDate ? '#f1f5f9' : '#f8fafc', 
                  color: scheduleDate ? BRAND_BLUE : '#94a3b8', 
                  border: `1px solid ${scheduleDate ? BRAND_BLUE : '#cbd5e1'}`, 
                  cursor: scheduleDate ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: 8
                }}
                disabled={!scheduleDate || sending}
                onClick={handleScheduleCampaign}
              >
                Schedule Campaign
              </button>
              <button
                onClick={handleSendCampaign}
                disabled={sending}
                style={{
                  padding: '10px 28px', borderRadius: 10, fontWeight: 700,
                  background: BRAND_BLUE, color: '#fff', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, opacity: sending ? 0.7 : 1
                }}
              >
                {sending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                {sending ? 'Sending Campaign...' : 'Confirm & Send Bulk Messages'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}

