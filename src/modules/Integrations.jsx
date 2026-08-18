import React, { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function Integrations() {
  const { leads, integrations, updateIntegration, addLead, showToastMsg, setActiveView } = useCRM();

  const getCapturedCount = (platform) => {
    let sourceNames = [];
    if (platform === 'meta') sourceNames = ['Meta Ads', 'Meta'];
    else if (platform === 'google') sourceNames = ['Google Search', 'Google Ads', 'Google'];
    else if (platform === 'whatsapp') sourceNames = ['WhatsApp Inbound', 'WhatsApp'];
    else if (platform === 'webhooks') sourceNames = ['Website Form', 'Website'];
    else if (platform === 'instagram') sourceNames = ['Instagram Direct', 'Instagram'];

    return leads.filter(l => sourceNames.includes(l.source)).length;
  };

  // Active configuration drawer state
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  // Form input states
  const [metaFields, setMetaFields] = useState({ appId: '', appSecret: '', webhookVerifyToken: '', verifyToken: '', redirectUri: '' });
  const [googleFields, setGoogleFields] = useState({ developerToken: '', customerId: '', managerCustomerId: '', clientId: '', clientSecret: '', refreshToken: '', webhookPasskey: '' });
  const [whatsappFields, setWhatsAppFields] = useState({ phoneNumberId: '', businessAccountId: '', systemToken: '', accessToken: '', apiVersion: 'v20.0', webhookVerifyToken: '' });
  const [instagramFields, setInstagramFields] = useState({ instagramAccountId: '', pageId: '', accessToken: '', webhookVerifyToken: '', apiVersion: 'v20.0', enabled: false });

  // Google Ads API connection and sync statuses
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);
  const [webhookFields, setWebhookFields] = useState({ securitySecret: '', webhookUrlSlug: '' });

  // Sync state to inputs when selecting a platform
  useEffect(() => {
    if (selectedPlatform === 'meta') {
      setMetaFields({
        appId: integrations.meta.appId || import.meta.env.META_APP_ID || '',
        appSecret: integrations.meta.appSecret ? '••••••••••••••••' : (import.meta.env.META_APP_SECRET || ''),
        webhookVerifyToken: integrations.meta.webhookVerifyToken || import.meta.env.META_WEBHOOK_VERIFY_TOKEN || '',
        verifyToken: integrations.meta.verifyToken ? '••••••••••••••••' : (import.meta.env.VERIFY_TOKEN || ''),
        redirectUri: integrations.meta.redirectUri || import.meta.env.META_REDIRECT_URI || ''
      });
    } else if (selectedPlatform === 'google') {
      setGoogleFields({
        developerToken: integrations.google.developerToken ? '••••••••••••••••' : (import.meta.env.GOOGLE_ADS_DEVELOPER_TOKEN || ''),
        customerId: integrations.google.customerId || import.meta.env.GOOGLE_ADS_CUSTOMER_ID || '',
        managerCustomerId: integrations.google.managerCustomerId || import.meta.env.GOOGLE_ADS_MANAGER_CUSTOMER_ID || '',
        clientId: integrations.google.clientId || import.meta.env.GOOGLE_ADS_CLIENT_ID || '',
        clientSecret: integrations.google.clientSecret ? '••••••••••••••••' : (import.meta.env.GOOGLE_ADS_CLIENT_SECRET || ''),
        refreshToken: integrations.google.refreshToken ? '••••••••••••••••' : (import.meta.env.GOOGLE_ADS_REFRESH_TOKEN || ''),
        webhookPasskey: integrations.google.webhookPasskey || ''
      });
      setValidationResult(null);
    } else if (selectedPlatform === 'whatsapp') {
      setWhatsAppFields({
        phoneNumberId: integrations.whatsapp.phoneNumberId || import.meta.env.WHATSAPP_PHONE_NUMBER_ID || '',
        businessAccountId: integrations.whatsapp.businessAccountId || import.meta.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
        systemToken: integrations.whatsapp.systemToken || integrations.whatsapp.accessToken || '',
        accessToken: integrations.whatsapp.accessToken || integrations.whatsapp.systemToken || '',
        apiVersion: integrations.whatsapp.apiVersion || import.meta.env.WHATSAPP_API_VERSION || 'v20.0',
        webhookVerifyToken: integrations.whatsapp.webhookVerifyToken || import.meta.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || ''
      });
    } else if (selectedPlatform === 'webhooks') {
      setWebhookFields({
        securitySecret: integrations.webhooks.securitySecret || '',
        webhookUrlSlug: integrations.webhooks.webhookUrlSlug || ''
      });
    } else if (selectedPlatform === 'instagram') {
      setInstagramFields({
        instagramAccountId: integrations.instagram?.instagramAccountId || '',
        pageId: integrations.instagram?.pageId || '',
        accessToken: integrations.instagram?.accessToken ? '••••••••••••••••' : '',
        webhookVerifyToken: integrations.instagram?.webhookVerifyToken ? '••••••••••••••••' : '',
        apiVersion: integrations.instagram?.apiVersion || 'v20.0',
        enabled: integrations.instagram?.enabled || false
      });
    }
  }, [selectedPlatform, integrations]);

  // Subscribe to Google Ads logs from Firestore
  useEffect(() => {
    if (selectedPlatform === 'google') {
      const q = query(collection(db, 'googleAdsLogs'), orderBy('timestamp', 'desc'), limit(5));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const logs = [];
        snapshot.forEach((doc) => {
          logs.push({ id: doc.id, ...doc.data() });
        });
        setSyncLogs(logs);
      }, (err) => {
        console.error("Error subscribing to Google Ads logs:", err);
      });
      return () => unsubscribe();
    }
  }, [selectedPlatform]);

  // Connection testing helper
  const testGoogleAdsConnection = async () => {
    if (!googleFields.customerId) {
      showToastMsg('Customer ID is required to test connection.', 'error');
      return;
    }
    setIsValidating(true);
    setValidationResult(null);

    const fieldsToValidate = {
      customerId: googleFields.customerId,
      managerCustomerId: googleFields.managerCustomerId,
      developerToken: googleFields.developerToken === '••••••••••••••••' ? integrations.google.developerToken : googleFields.developerToken,
      clientId: googleFields.clientId,
      clientSecret: googleFields.clientSecret === '••••••••••••••••' ? integrations.google.clientSecret : googleFields.clientSecret,
      refreshToken: googleFields.refreshToken === '••••••••••••••••' ? integrations.google.refreshToken : googleFields.refreshToken
    };

    try {
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'tz-lead-management';
      const functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/googleAdsValidate`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fieldsToValidate)
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setValidationResult({ success: true, message: 'Google Ads API authenticated successfully!' });
        showToastMsg('Google Ads connection verified!', 'success');
        updateIntegration('google', {
          ...fieldsToValidate,
          enabled: true,
          status: 'Connected'
        });
      } else {
        setValidationResult({ success: false, message: data.details || data.error || 'Connection verification failed.' });
        showToastMsg(data.error || 'OAuth / API connection failed.', 'error');
        updateIntegration('google', {
          enabled: false,
          status: 'Setup Required'
        });
      }
    } catch (err) {
      console.error('Validation error:', err);
      setValidationResult({ success: false, message: 'Could not communicate with Firebase validation function.' });
      showToastMsg('Could not reach Cloud Function.', 'error');
      updateIntegration('google', {
        enabled: false,
        status: 'Setup Required'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const testMetaConnection = async () => {
    const fieldsToValidate = {
      appId: metaFields.appId,
      appSecret: metaFields.appSecret === '••••••••••••••••' ? integrations.meta.appSecret : metaFields.appSecret,
      webhookVerifyToken: metaFields.webhookVerifyToken,
      verifyToken: metaFields.verifyToken === '••••••••••••••••' ? integrations.meta.verifyToken : metaFields.verifyToken,
      redirectUri: metaFields.redirectUri
    };

    if (!fieldsToValidate.verifyToken) {
      showToastMsg('Verify Token is required to test connection.', 'error');
      return;
    }
    setIsValidating(true);
    setValidationResult(null);

    try {
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'tz-lead-management';
      const functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/metaValidate`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          verifyToken: fieldsToValidate.verifyToken
        })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setValidationResult({ success: true, message: data.message || 'Meta API authenticated successfully!' });
        showToastMsg('Meta connection verified!', 'success');
        updateIntegration('meta', {
          ...fieldsToValidate,
          enabled: true,
          status: 'Connected'
        });
      } else {
        setValidationResult({ success: false, message: data.details || data.error || 'Connection verification failed.' });
        showToastMsg(data.error || 'Meta API connection failed.', 'error');
        updateIntegration('meta', {
          enabled: false,
          status: 'Setup Required'
        });
      }
    } catch (err) {
      console.error('Meta validation error:', err);
      setValidationResult({ success: false, message: 'Could not communicate with Firebase Meta validation function.' });
      showToastMsg('Could not reach Cloud Function.', 'error');
      updateIntegration('meta', {
        enabled: false,
        status: 'Setup Required'
      });
    } finally {
      setIsValidating(false);
    }
  };


  // Reconciliation manual sync helper
  const forceGoogleAdsSync = async () => {
    setIsSyncing(true);
    try {
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'tz-lead-management';
      const functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/googleAdsSync`;
      const response = await fetch(functionUrl, {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToastMsg(`Sync successful! Imported ${data.leadsImported} leads.`, 'success');
      } else {
        showToastMsg(data.error || 'Sync execution failed.', 'error');
      }
    } catch (err) {
      console.error('Manual sync error:', err);
      showToastMsg('Sync function execution failed.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const hasConfig = (platform) => {
    const data = integrations[platform];
    if (platform === 'meta') {
      return !!(data.appId && data.verifyToken);
    } else if (platform === 'google') {
      return !!(data.developerToken && data.customerId);
    } else if (platform === 'whatsapp') {
      return !!(data.phoneNumberId && (data.systemToken || data.accessToken));
    } else if (platform === 'webhooks') {
      return !!(data.securitySecret);
    }
    return false;
  };



  const handleSaveConfig = (e) => {
    e.preventDefault();
    let fieldsToSave = {};
    let activeStatus = 'Connected';

    if (selectedPlatform === 'meta') {
      fieldsToSave = { ...metaFields };
      if (metaFields.appSecret === '••••••••••••••••') fieldsToSave.appSecret = integrations.meta.appSecret;
      if (metaFields.verifyToken === '••••••••••••••••') fieldsToSave.verifyToken = integrations.meta.verifyToken;

      const hasFieldsChanged =
        fieldsToSave.appId !== integrations.meta.appId ||
        fieldsToSave.appSecret !== integrations.meta.appSecret ||
        fieldsToSave.webhookVerifyToken !== integrations.meta.webhookVerifyToken ||
        fieldsToSave.verifyToken !== integrations.meta.verifyToken ||
        fieldsToSave.redirectUri !== integrations.meta.redirectUri;

      if (!fieldsToSave.appId || !fieldsToSave.verifyToken) {
        activeStatus = 'Setup Required';
      } else if (hasFieldsChanged) {
        activeStatus = 'Setup Required';
        showToastMsg('Configuration credentials modified. Please test connection to re-activate.', 'warning');
      } else {
        activeStatus = integrations.meta.status === 'Connected' ? 'Connected' : 'Setup Required';
      }
    } else if (selectedPlatform === 'google') {
      fieldsToSave = { ...googleFields };
      if (googleFields.developerToken === '••••••••••••••••') fieldsToSave.developerToken = integrations.google.developerToken;
      if (googleFields.clientSecret === '••••••••••••••••') fieldsToSave.clientSecret = integrations.google.clientSecret;
      if (googleFields.refreshToken === '••••••••••••••••') fieldsToSave.refreshToken = integrations.google.refreshToken;

      const hasFieldsChanged =
        fieldsToSave.customerId !== integrations.google.customerId ||
        fieldsToSave.managerCustomerId !== integrations.google.managerCustomerId ||
        fieldsToSave.developerToken !== integrations.google.developerToken ||
        fieldsToSave.clientId !== integrations.google.clientId ||
        fieldsToSave.clientSecret !== integrations.google.clientSecret ||
        fieldsToSave.refreshToken !== integrations.google.refreshToken;

      if (!fieldsToSave.developerToken || !fieldsToSave.customerId || !fieldsToSave.clientId || !fieldsToSave.clientSecret || !fieldsToSave.refreshToken) {
        activeStatus = 'Setup Required';
      } else if (hasFieldsChanged) {
        activeStatus = 'Setup Required';
        showToastMsg('Configuration credentials modified. Please test connection to re-activate.', 'warning');
      } else {
        activeStatus = integrations.google.status === 'Connected' ? 'Connected' : 'Setup Required';
      }
    } else if (selectedPlatform === 'whatsapp') {
      fieldsToSave = { ...whatsappFields };
      // Ensure systemToken is always set (synchronised with accessToken) for backward compatibility
      if (fieldsToSave.accessToken && !fieldsToSave.systemToken) {
        fieldsToSave.systemToken = fieldsToSave.accessToken;
      } else if (fieldsToSave.systemToken && !fieldsToSave.accessToken) {
        fieldsToSave.accessToken = fieldsToSave.systemToken;
      }
      if (!whatsappFields.phoneNumberId || !(whatsappFields.systemToken || whatsappFields.accessToken)) {
        activeStatus = 'Setup Required';
      }
    } else if (selectedPlatform === 'webhooks') {
      fieldsToSave = { ...webhookFields };
      if (!webhookFields.securitySecret) activeStatus = 'Setup Required';
    } else if (selectedPlatform === 'instagram') {
      const trimmedAccountId = instagramFields.instagramAccountId.trim();
      const trimmedPageId = instagramFields.pageId.trim();

      // Resolve the access token:
      // - If the field still shows the masked placeholder → user did not touch it → keep existing saved value.
      // - If the field is empty AND a token is already saved → user accidentally cleared it → keep existing saved value.
      // - If the field contains a new non-empty, non-placeholder string → user typed a new token → use the new value.
      const existingToken = integrations.instagram?.accessToken || '';
      let actualToken = instagramFields.accessToken.trim();
      if (actualToken === '••••••••••••••••' || (actualToken === '' && existingToken !== '')) {
        // Unchanged — restore the existing (encrypted) ciphertext from state.
        actualToken = existingToken;
      }
      // If actualToken is still '' at this point the user intentionally left it blank (no prior token saved).

      // Same logic for webhookVerifyToken.
      const existingWebhookToken = integrations.instagram?.webhookVerifyToken || '';
      let actualWebhookToken = instagramFields.webhookVerifyToken.trim();
      if (actualWebhookToken === '••••••••••••••••' || (actualWebhookToken === '' && existingWebhookToken !== '')) {
        actualWebhookToken = existingWebhookToken;
      }

      const hasAllRequired = !!(trimmedAccountId && trimmedPageId && actualToken && actualWebhookToken);
      const finalStatus = hasAllRequired ? 'Connected' : 'Setup Required';

      updateIntegration('instagram', {
        instagramAccountId: trimmedAccountId,
        pageId: trimmedPageId,
        accessToken: actualToken,
        webhookVerifyToken: actualWebhookToken,
        apiVersion: instagramFields.apiVersion.trim() || 'v20.0',
        enabled: instagramFields.enabled,
        status: finalStatus
      }, true);

      showToastMsg('Instagram configuration saved successfully.');
      setSelectedPlatform(null);
      return;
    }

    const isSetupValid = activeStatus === 'Connected';

    updateIntegration(selectedPlatform, {
      ...fieldsToSave,
      enabled: isSetupValid,
      status: activeStatus
    });

    setSelectedPlatform(null);
  };

  // Integration Simulator State & Function
  const [isSimulating, setIsSimulating] = useState(false);

  const triggerSimulatedLead = () => {
    if (!integrations[selectedPlatform].enabled) {
      showToastMsg(`Please configure and activate ${selectedPlatform.toUpperCase()} before triggering simulated leads.`, 'error');
      return;
    }
    setIsSimulating(true);

    setTimeout(() => {
      let mockLead = {};

      if (selectedPlatform === 'meta') {
        const firstNames = ['Aditi', 'Rohan', 'Kabir', 'Zoya', 'Tanvi', 'Rohan', 'Dia', 'Ishaan', 'Kavya', 'Yash'];
        const lastNames = ['Verma', 'Malhotra', 'Sinha', 'Chawla', 'Mehta', 'Kappor', 'Sen', 'Grover', 'Roy', 'Joshi'];
        const randomName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        const cleanName = randomName.toLowerCase().replace(' ', '.');

        mockLead = {
          name: randomName,
          email: `${cleanName}@meta-leads.com`,
          phone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
          location: 'Mumbai',
          education: 'Undergraduate',
          course: '',
          source: 'Meta Ads',
          stage: 'New Lead',
          counselor: 'Unassigned',
          customFields: {}
        };
      } else if (selectedPlatform === 'google') {
        const firstNames = ['Neha', 'Vikram', 'Anjali', 'Arjun', 'Priya', 'Rohit', 'Sameer', 'Aanya', 'Preeti', 'Dev'];
        const lastNames = ['Patel', 'Sen', 'Nair', 'Sharma', 'Grover', 'Verma', 'Malhotra', 'Bose', 'Gupta', 'Dutta'];
        const randomName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        const cleanName = randomName.toLowerCase().replace(' ', '.');

        mockLead = {
          name: randomName,
          email: `${cleanName}@gmail.com`,
          phone: `+91 97${Math.floor(10000000 + Math.random() * 90000000)}`,
          location: 'Delhi',
          education: 'Graduate',
          course: '',
          source: 'Google Ads',
          stage: 'New Lead',
          counselor: 'Unassigned',
          customFields: {}
        };
      } else if (selectedPlatform === 'whatsapp') {
        const firstNames = ['Pooja', 'Amit', 'Divya', 'Sanjay', 'Meera', 'Ravi', 'Ritu', 'Karan', 'Tarun', 'Shreya'];
        const lastNames = ['Gupta', 'Trivedi', 'Bose', 'Joshi', 'Reddy', 'Malhotra', 'Sen', 'Johar', 'Verma', 'Nair'];
        const randomName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        const cleanName = randomName.toLowerCase().replace(' ', '.');

        mockLead = {
          name: randomName,
          email: `${cleanName}@wa-inquiries.org`,
          phone: `+91 95${Math.floor(10000000 + Math.random() * 90000000)}`,
          location: 'Bangalore',
          education: 'Working Professional',
          course: 'UI/UX Product Design',
          source: 'WhatsApp Inbound',
          stage: 'New Lead',
          customFields: {}
        };
      } else if (selectedPlatform === 'webhooks') {
        const firstNames = ['Aarav', 'Sneha', 'Rahul', 'Neha', 'Vikram', 'Rohan', 'Aditya', 'Riya', 'Karan', 'Pooja'];
        const lastNames = ['Sharma', 'Reddy', 'Verma', 'Patel', 'Malhotra', 'Gupta', 'Roy', 'Sen', 'Johar', 'Reddy'];
        const randomName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        const cleanName = randomName.toLowerCase().replace(' ', '.');

        mockLead = {
          name: randomName,
          email: `${cleanName}@academy-student.in`,
          phone: `+91 99${Math.floor(10000000 + Math.random() * 90000000)}`,
          location: 'Pune',
          education: 'Final Year BCA',
          course: 'Cyber Security & Ethical Hacking',
          source: 'Website Form',
          stage: 'New Lead',
          customFields: {}
        };
      }

      // Add the simulated lead directly into the CRM database!
      addLead(mockLead);

      // Increment lead count on the integration card!
      updateIntegration(selectedPlatform, {
        simulatedLeadsCount: (integrations[selectedPlatform].simulatedLeadsCount || 0) + 1
      }, true); // Call with silent = true to avoid config toast redundancy!

      setIsSimulating(false);
    }, 1200);
  };

  // Pre-compiled Node.js Firebase Cloud Function scripts
  const googleCloudCode = `/**
 * Firebase Cloud Function: Google Ads Webhook Lead Capture
 * Matches Firestore student collections schema exactly.
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.captureGoogleAdsLead = functions.https.onRequest(async (req, res) => {
  try {
    // 1. Authenticate using configured webhook Key
    const passkey = req.headers['google-ads-key'] || req.query.key;
    const EXPECTED_KEY = "${integrations.google.webhookPasskey || 'YOUR_GOOGLE_PASSKEY'}";

    if (passkey !== EXPECTED_KEY) {
      console.warn("Unauthorized webhook payload mismatch.");
      return res.status(401).send("Unauthorized");
    }

    // 2. Parse lead fields
    const payload = req.body;
    const columns = payload.user_column_data || [];
    
    const leadRecord = {
      name: columns.find(c => c.column_id === 'FULL_NAME')?.string_value || 'Anonymous Lead',
      email: columns.find(c => c.column_id === 'EMAIL')?.string_value || '',
      phone: columns.find(c => c.column_id === 'PHONE_NUMBER')?.string_value || '',
      course: 'Data Science & Artificial Intelligence',
      source: 'Google Ads',
      createdDate: new Date().toISOString(),
      stage: 'New Lead',
      timeline: [{
        id: \`log-\${Date.now()}\`,
        type: 'system',
        title: 'Lead Captured via Google Ads',
        content: \`Campaign ID: \${payload.campaign_id || 'N/A'}. Webhook active.\`,
        timestamp: new Date().toISOString(),
        user: 'Google Server'
      }]
    };

    // 3. Write directly to Firestore
    await admin.firestore().collection('leads').add(leadRecord);
    return res.status(200).send("Success");
  } catch (err) {
    console.error("Firebase Capture Error:", err);
    return res.status(500).send("Server Error");
  }
});`;

  const metaCloudCode = `/**
 * Firebase Cloud Function: Meta (Facebook/Instagram) Lead Ads Webhook
 * Handles hub verification and fetches Lead details from Meta Graph API.
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
admin.initializeApp();

exports.metaWebhookHandler = functions.https.onRequest(async (req, res) => {
  // Meta verification handshake (GET request)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const VERIFY_TOKEN = "${integrations.meta.webhookVerifyToken || 'techzone_secret_verify_2026'}";

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  // Incoming lead payload (POST request)
  if (req.method === 'POST') {
    try {
      const entry = req.body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      if (value && value.leadgen_id) {
        const leadId = value.leadgen_id;
        const pageToken = "${integrations.meta.systemToken || 'YOUR_META_ACCESS_TOKEN'}";

        // Query Meta Graph API for complete lead info
        const graphUrl = \`https://graph.facebook.com/v18.0/\${leadId}?access_token=\${pageToken}\`;
        const response = await axios.get(graphUrl);
        const metaLead = response.data;

        const fields = {};
        (metaLead.field_data || []).forEach(f => {
          fields[f.name] = f.values?.[0] || '';
        });

        const studentLead = {
          name: fields.full_name || 'Anonymous Meta Lead',
          email: fields.email || '',
          phone: fields.phone_number || '',
          source: 'Meta Ads',
          course: 'Full-Stack Web Development',
          createdDate: new Date().toISOString(),
          stage: 'New Lead',
          timeline: [{
            id: \`log-\${Date.now()}\`,
            type: 'system',
            title: 'Lead Captured via Meta ads',
            content: \`Form ID: \${metaLead.form_id || 'N/A'}. Webhook synced.\`,
            timestamp: new Date().toISOString(),
            user: 'Meta Webhook'
          }]
        };

        await admin.firestore().collection('leads').add(studentLead);
      }
      return res.status(200).send('EVENT_RECEIVED');
    } catch(err) {
      console.error('Meta Server-to-Server Sync Error:', err);
      return res.status(500).send('Server Error');
    }
  }
  return res.status(405).send('Method Not Allowed');
});`;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    alert(`${label} snippet copied to clipboard!`);
  };

  return (
    <div className="fade-in" style={{ padding: '4px' }}>
      {/* Rebranded Header */}
      <div className="welcome-header" style={{ marginBottom: '24px' }}>
        <h2 className="welcome-title">Integrations & Plugins</h2>
        <p className="welcome-subtitle">
          Connect your paid campaigns, WhatsApp Cloud API, and website landing pages directly to your Firestore student queues.
        </p>
      </div>

      {/* Grid of 4 Premium Cards */}
      <div className="db-source-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>

        {/* Meta Ads Card */}
        <div className="db-source-card integrations-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '230px', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div className="db-source-icon-wrap meta" style={{ width: '42px', height: '42px' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M16.924 6c-1.393 0-2.613.626-3.486 1.624L12 9.25 10.562 7.624C9.69 6.626 8.47 6 7.076 6 4.257 6 2 8.243 2 11c0 2.757 2.257 5 5.076 5 1.393 0 2.613-.626 3.486-1.624L12 12.75l1.438 1.626c.873.998 2.093 1.624 3.486 1.624 2.819 0 5.076-2.243 5.076-5 0-2.757-2.257-5-5.076-5zm0 8.5c-1.026 0-1.921-.497-2.522-1.282L12 10.5l-2.402 2.718c-.6.785-1.496 1.282-2.522 1.282-1.677 0-3.076-1.353-3.076-3s1.399-3 3.076-3c1.026 0 1.921.497 2.522 1.282L12 11.5l2.402-2.718c.6-.785 1.496-1.282 2.522-1.282 1.677 0 3.076 1.353 3.076 3s-1.399 3-3.076 3z" />
                </svg>
              </div>


            </div>

            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Meta Ads Connector</h3>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '12px' }}>
              Capture leads instantly from your Facebook & Instagram campaigns straight to Firestore.
            </p>
          </div>

          <div>
            {/* Meta status pill */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <span className="db-source-badge" style={{
                background: integrations.meta.status === 'Connected' ? 'rgba(37,99,235,0.08)' : integrations.meta.status === 'Setup Required' ? 'rgba(249,115,22,0.08)' : 'rgba(239,68,68,0.08)',
                color: integrations.meta.status === 'Connected' ? '#2563eb' : integrations.meta.status === 'Setup Required' ? '#f97316' : '#ef4444',
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: '700'
              }}>
                {integrations.meta.status}
              </span>

              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                {getCapturedCount('meta').toLocaleString()} leads captured
              </span>
            </div>

            <button
              className="primary-btn w-full mt-3"
              onClick={() => setSelectedPlatform('meta')}
              style={{
                height: '32px',
                fontSize: '11px',
                fontWeight: '700',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              Configure Meta
            </button>
          </div>
        </div>

        {/* Google Ads Card */}
        <div className="db-source-card integrations-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '230px', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div className="db-source-icon-wrap google" style={{ width: '42px', height: '42px' }}>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
              </div>


            </div>

            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Google Ads Connector</h3>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '12px' }}>
              Connect Google Lead Form extensions or Campaign Search API directly to Firebase.
            </p>
          </div>

          <div>
            {/* Google status pill */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <span className="db-source-badge" style={{
                background: integrations.google.status === 'Connected' ? 'rgba(16,185,129,0.08)' : integrations.google.status === 'Setup Required' ? 'rgba(249,115,22,0.08)' : 'rgba(239,68,68,0.08)',
                color: integrations.google.status === 'Connected' ? '#10b981' : integrations.google.status === 'Setup Required' ? '#f97316' : '#ef4444',
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: '700'
              }}>
                {integrations.google.status}
              </span>

              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                {getCapturedCount('google').toLocaleString()} leads captured
              </span>
            </div>

            <button
              className="primary-btn w-full mt-3"
              onClick={() => setSelectedPlatform('google')}
              style={{
                height: '32px',
                fontSize: '11px',
                fontWeight: '700',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              Configure Google
            </button>
          </div>
        </div>

        {/* WhatsApp Business API Card */}
        <div className="db-source-card integrations-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '230px', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div className="db-source-icon-wrap whatsapp" style={{ width: '42px', height: '42px' }}>
                <svg viewBox="0 0 16 16" fill="currentColor" width="20" height="20">
                  <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
                </svg>
              </div>


            </div>

            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>WhatsApp Business</h3>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '12px' }}>
              Connect Meta Cloud API to automatically dispatch welcome flows and receive inbound logs.
            </p>
          </div>

          <div>
            {/* WhatsApp status pill */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <span className="db-source-badge" style={{
                background: integrations.whatsapp.status === 'Connected' ? 'rgba(16,185,129,0.08)' : integrations.whatsapp.status === 'Setup Required' ? 'rgba(249,115,22,0.08)' : 'rgba(239,68,68,0.08)',
                color: integrations.whatsapp.status === 'Connected' ? '#10b981' : integrations.whatsapp.status === 'Setup Required' ? '#f97316' : '#ef4444',
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: '700'
              }}>
                {integrations.whatsapp.status}
              </span>

              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                {getCapturedCount('whatsapp').toLocaleString()} leads captured
              </span>
            </div>

            <button
              className="primary-btn w-full mt-3"
              onClick={() => setSelectedPlatform('whatsapp')}
              style={{
                height: '32px',
                fontSize: '11px',
                fontWeight: '700',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              Configure WhatsApp
            </button>
          </div>
        </div>

        {/* Iframe Web Connector Card */}
        <div className="db-source-card integrations-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '230px', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div className="db-source-icon-wrap web" style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                  <rect x="2" y="3" width="20" height="18" rx="2" ry="2" />
                  <line x1="2" y1="8" x2="22" y2="8" />
                  <line x1="6" y1="21" x2="6" y2="8" />
                </svg>
              </div>


            </div>

            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Iframe Web Connector</h3>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '12px' }}>
              Generate, customize, and embed secure inquiry forms directly into your external website pages.
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <span className="db-source-badge" style={{
                background: 'rgba(16,185,129,0.08)',
                color: '#10b981',
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: '700'
              }}>
                Connected
              </span>

              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                {getCapturedCount('webhooks').toLocaleString()} leads captured
              </span>
            </div>

            <button
              className="primary-btn w-full mt-3"
              onClick={() => setActiveView('sandbox')}
              style={{
                height: '32px',
                fontSize: '11px',
                fontWeight: '700',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              Configure Iframe
            </button>
          </div>
        </div>

        {/* Instagram Business Card */}
        <div className="db-source-card integrations-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '230px', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div className="db-source-icon-wrap instagram" style={{ width: '42px', height: '42px', color: '#E1306C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
              </div>
            </div>

            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Instagram Business</h3>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '12px' }}>
              Connect your Instagram Business account to receive Instagram DMs, manage conversations, and enable automated replies.
            </p>
          </div>

          <div>
            {/* Instagram status pill */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <span className="db-source-badge" style={{
                background: (integrations.instagram?.enabled && integrations.instagram?.pageId && integrations.instagram?.instagramAccountId && integrations.instagram?.accessToken && integrations.instagram?.webhookVerifyToken) ? 'rgba(16,185,129,0.08)' : 'rgba(249,115,22,0.08)',
                color: (integrations.instagram?.enabled && integrations.instagram?.pageId && integrations.instagram?.instagramAccountId && integrations.instagram?.accessToken && integrations.instagram?.webhookVerifyToken) ? '#10b981' : '#f97316',
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: '700'
              }}>
                {(integrations.instagram?.enabled && integrations.instagram?.pageId && integrations.instagram?.instagramAccountId && integrations.instagram?.accessToken && integrations.instagram?.webhookVerifyToken) ? 'Connected' : 'Setup Required'}
              </span>

              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                {getCapturedCount('instagram').toLocaleString()} leads captured
              </span>
            </div>

            {/* Masked Account ID if configured */}
            {integrations.instagram?.instagramAccountId && (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '10px', textAlign: 'left' }}>
                Instagram Account: {(() => {
                  const id = integrations.instagram.instagramAccountId.trim();
                  if (id.length <= 8) return id;
                  return `${id.slice(0, 4)}••••${id.slice(-4)}`;
                })()}
              </div>
            )}

            <button
              className="primary-btn w-full mt-3"
              onClick={() => setSelectedPlatform('instagram')}
              style={{
                height: '32px',
                fontSize: '11px',
                fontWeight: '700',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              {(integrations.instagram?.enabled && integrations.instagram?.pageId && integrations.instagram?.instagramAccountId && integrations.instagram?.accessToken && integrations.instagram?.webhookVerifyToken) ? 'Manage Instagram' : 'Configure Instagram'}
            </button>
          </div>
        </div>

      </div>

      {/* Sleek Centered Configuration Modal Panel (Production-Grade UI) */}
      {selectedPlatform && (
        <div className="modal-overlay" style={{ zIndex: '9999' }}>
          <div className="modal-card" style={{
            maxWidth: '560px',
            width: '90%',
            maxHeight: '90vh',
            borderRadius: 'var(--radius-lg, 12px)',
            margin: 'auto',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflowY: 'auto',
            boxShadow: '0 15px 40px rgba(0,0,0,0.15)',
            background: 'var(--card-bg, #ffffff)',
            position: 'relative'
          }}>
            <div>
              {/* Drawer Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedPlatform === 'meta' && 'Meta Lead Ads Connector'}
                  {selectedPlatform === 'google' && 'Google Ads Connector'}
                  {selectedPlatform === 'whatsapp' && 'WhatsApp API Credentials'}
                  {selectedPlatform === 'webhooks' && 'Webhooks & HTML Form Embeds'}
                  {selectedPlatform === 'instagram' && 'Instagram Business Credentials'}
                </h3>
                <button
                  onClick={() => setSelectedPlatform(null)}
                  style={{
                    background: 'rgba(0,0,0,0.03)',
                    border: 'none',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: '700'
                  }}
                  title="Close Settings Panel"
                >
                  ✕
                </button>
              </div>

              {/* Helper Description */}
              <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.45', marginBottom: '20px' }}>
                {selectedPlatform === 'meta' && 'Sync Meta Lead Ads directly to your Firestore collections. Enter App ID credentials to authenticate real-time lead updates.'}
                {selectedPlatform === 'google' && 'Fetch inquiries straight from Google Ads Search Form assets. Provide developer details to establish secure server-to-server mappings.'}
                {selectedPlatform === 'whatsapp' && 'Map official Cloud API tokens to send automated welcome messages and map counselor outbound threads.'}
                {selectedPlatform === 'webhooks' && 'Paste lightweight Javascript interceptors into Wix/WordPress forms, or copy pre-styled responsive widget HTML containers.'}
                {selectedPlatform === 'instagram' && 'Connect your Instagram Business account to handle customer DMs, automated welcome flows, and custom integrations.'}
              </p>

              {/* Dynamic Interactive Config Forms */}
              <form onSubmit={handleSaveConfig} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* Meta Configuration Fields */}
                {selectedPlatform === 'meta' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Meta App ID (META_APP_ID)</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="e.g. 1249581023849102"
                        value={metaFields.appId}
                        onChange={(e) => setMetaFields({ ...metaFields, appId: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Meta App Secret (META_APP_SECRET)</label>
                      <input
                        type="password"
                        required
                        autoComplete="new-password"
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="••••••••••••••••"
                        value={metaFields.appSecret}
                        onChange={(e) => setMetaFields({ ...metaFields, appSecret: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Meta Webhook Verify Token (META_WEBHOOK_VERIFY_TOKEN)</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="e.g. meta_webhook_secret_2026"
                        value={metaFields.webhookVerifyToken}
                        onChange={(e) => setMetaFields({ ...metaFields, webhookVerifyToken: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Meta Access Token / Verify Token (VERIFY_TOKEN)</label>
                      <input
                        type="password"
                        required
                        autoComplete="new-password"
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="••••••••••••••••"
                        value={metaFields.verifyToken}
                        onChange={(e) => setMetaFields({ ...metaFields, verifyToken: e.target.value })}
                      />
                    </div>

                    {/* Meta Webhook Setup Info */}
                    <div style={{ marginTop: '8px', padding: '10px', borderRadius: '6px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-color)', fontSize: '11px' }}>
                      <label className="form-label" style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Webhook Callback URL</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          readOnly
                          className="form-control"
                          style={{ height: '28px', fontSize: '10px', padding: '0 8px', background: 'rgba(0,0,0,0.04)', flex: '1', border: '1px solid var(--border-color)' }}
                          value={`https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'tz-lead-management'}.cloudfunctions.net/metaWebhook`}
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(`https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'tz-lead-management'}.cloudfunctions.net/metaWebhook`, 'Meta Webhook URL')}
                          style={{ height: '28px', fontSize: '10px', padding: '0 8px', background: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '700' }}
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    {/* Meta Connection Test Action */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={testMetaConnection}
                        disabled={isValidating}
                        className="secondary-btn w-full"
                        style={{
                          height: '34px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: 'rgba(47, 107, 255, 0.08)',
                          color: 'var(--primary)',
                          border: '1px solid rgba(47, 107, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: isValidating ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {isValidating ? (
                          <>
                            <div style={{ width: '12px', height: '12px', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <span>🔌 Test API Connection</span>
                        )}
                      </button>
                    </div>

                    {validationResult && (
                      <div style={{
                        marginTop: '8px',
                        padding: '10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        background: validationResult.success ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                        color: validationResult.success ? '#059669' : '#dc2626',
                        border: validationResult.success ? '1px solid rgba(16,185,129,0.15)' : '1px solid rgba(239,68,68,0.15)',
                        lineHeight: '1.4'
                      }}>
                        <strong>{validationResult.success ? '✓ Connection Active' : '✗ Connection Failed'}</strong>
                        <p style={{ margin: '4px 0 0 0', wordBreak: 'break-all', fontSize: '10px' }}>{validationResult.message}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Google Configuration Fields */}
                {selectedPlatform === 'google' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Google Ads Customer ID</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="e.g. 123-456-7890"
                        value={googleFields.customerId}
                        onChange={(e) => setGoogleFields({ ...googleFields, customerId: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Manager Customer ID (Optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="e.g. 123-456-7890 (if using a manager/MCC account)"
                        value={googleFields.managerCustomerId}
                        onChange={(e) => setGoogleFields({ ...googleFields, managerCustomerId: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Developer Token</label>
                      <input
                        type="password"
                        required
                        autoComplete="new-password"
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="••••••••••••••••••••"
                        value={googleFields.developerToken}
                        onChange={(e) => setGoogleFields({ ...googleFields, developerToken: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Client ID</label>
                        <input
                          type="text"
                          required
                          className="form-control"
                          style={{ height: '36px', fontSize: '11px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                          placeholder="google-client-id"
                          value={googleFields.clientId}
                          onChange={(e) => setGoogleFields({ ...googleFields, clientId: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Client Secret</label>
                        <input
                          type="password"
                          required
                          autoComplete="new-password"
                          className="form-control"
                          style={{ height: '36px', fontSize: '11px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                          placeholder="client-secret"
                          value={googleFields.clientSecret}
                          onChange={(e) => setGoogleFields({ ...googleFields, clientSecret: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>OAuth 2.0 Refresh Token</label>
                      <input
                        type="password"
                        required
                        autoComplete="new-password"
                        className="form-control"
                        style={{ height: '36px', fontSize: '11px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="OAuth 2.0 Refresh Token"
                        value={googleFields.refreshToken}
                        onChange={(e) => setGoogleFields({ ...googleFields, refreshToken: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Google Webhook Security Passkey (Key)</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="e.g. google_ad_passkey_987"
                        value={googleFields.webhookPasskey}
                        onChange={(e) => setGoogleFields({ ...googleFields, webhookPasskey: e.target.value })}
                      />
                    </div>

                    {/* Google Ads Connection Test Actions */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={testGoogleAdsConnection}
                        disabled={isValidating}
                        className="secondary-btn w-full"
                        style={{
                          height: '34px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: 'rgba(47, 107, 255, 0.08)',
                          color: 'var(--primary)',
                          border: '1px solid rgba(47, 107, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: isValidating ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {isValidating ? (
                          <>
                            <div style={{ width: '12px', height: '12px', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <span>🔌 Test API Connection</span>
                        )}
                      </button>

                      {integrations.google.status === 'Connected' && (
                        <button
                          type="button"
                          onClick={forceGoogleAdsSync}
                          disabled={isSyncing}
                          className="secondary-btn w-full"
                          style={{
                            height: '34px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: 'rgba(16, 185, 129, 0.08)',
                            color: '#059669',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: isSyncing ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {isSyncing ? (
                            <>
                              <div style={{ width: '12px', height: '12px', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                              <span>Syncing...</span>
                            </>
                          ) : (
                            <span>🔄 Force API Sync</span>
                          )}
                        </button>
                      )}
                    </div>

                    {validationResult && (
                      <div style={{
                        marginTop: '8px',
                        padding: '10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        background: validationResult.success ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                        color: validationResult.success ? '#059669' : '#dc2626',
                        border: validationResult.success ? '1px solid rgba(16,185,129,0.15)' : '1px solid rgba(239,68,68,0.15)',
                        lineHeight: '1.4'
                      }}>
                        <strong>{validationResult.success ? '✓ Connection Active' : '✗ Connection Failed'}</strong>
                        <p style={{ margin: '4px 0 0 0', wordBreak: 'break-all', fontSize: '10px' }}>{validationResult.message}</p>
                      </div>
                    )}

                    {/* Sync Logs Display */}
                    <div style={{ marginTop: '16px', borderTop: '1px dashed var(--border-color)', paddingTop: '12px' }}>
                      <h4 style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                        📋 Recent Sync & Webhook Logs
                      </h4>
                      {syncLogs.length === 0 ? (
                        <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No sync activities logged yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                          {syncLogs.map((log) => (
                            <div key={log.id} style={{
                              padding: '8px',
                              borderRadius: '4px',
                              background: 'rgba(0,0,0,0.015)',
                              border: '1px solid var(--border-color)',
                              fontSize: '10px',
                              lineHeight: '1.3'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span style={{
                                  fontWeight: '700',
                                  color: log.status === 'success' ? '#059669' : log.status === 'skipped' ? '#b45309' : '#dc2626',
                                  textTransform: 'uppercase',
                                  fontSize: '9px'
                                }}>
                                  {log.type} - {log.status}
                                </span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <span style={{ color: 'var(--text-secondary)' }}>
                                {log.message || log.errorMessage || (log.leadId ? `Processed Lead: ${log.name || log.leadId}` : 'Google Ads action completed.')}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* WhatsApp Configuration Fields */}
                {selectedPlatform === 'whatsapp' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>WhatsApp Phone Number ID (WHATSAPP_PHONE_NUMBER_ID)</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="e.g. 102938471"
                        value={whatsappFields.phoneNumberId}
                        onChange={(e) => setWhatsAppFields({ ...whatsappFields, phoneNumberId: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>WhatsApp Business Account ID (WHATSAPP_BUSINESS_ACCOUNT_ID)</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="e.g. 982734912"
                        value={whatsappFields.businessAccountId}
                        onChange={(e) => setWhatsAppFields({ ...whatsappFields, businessAccountId: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>WhatsApp API Version (WHATSAPP_API_VERSION)</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="e.g. v20.0"
                        value={whatsappFields.apiVersion}
                        onChange={(e) => setWhatsAppFields({ ...whatsappFields, apiVersion: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>WhatsApp Webhook Verify Token (WHATSAPP_WEBHOOK_VERIFY_TOKEN)</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="e.g. whatsapp_webhook_token_secure"
                        value={whatsappFields.webhookVerifyToken}
                        onChange={(e) => setWhatsAppFields({ ...whatsappFields, webhookVerifyToken: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Permanent Access Token (WHATSAPP_ACCESS_TOKEN)</label>
                      <textarea
                        required
                        className="form-control"
                        style={{ height: '70px', fontSize: '11px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)', resize: 'none', padding: '8px' }}
                        placeholder="EAAGy7B_whatsapp_token..."
                        value={whatsappFields.accessToken || whatsappFields.systemToken}
                        onChange={(e) => setWhatsAppFields({
                          ...whatsappFields,
                          accessToken: e.target.value,
                          systemToken: e.target.value
                        })}
                      />
                    </div>
                  </>
                )}

                {/* Webhooks & Embeds Configuration Fields */}
                {selectedPlatform === 'webhooks' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Security Verification Secret</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="e.g. whsec_tz_83749281"
                        value={webhookFields.securitySecret}
                        onChange={(e) => setWebhookFields({ ...webhookFields, securitySecret: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>URL Slug Identifier</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="e.g. inst_aarav_mumbai_786"
                        value={webhookFields.webhookUrlSlug}
                        onChange={(e) => setWebhookFields({ ...webhookFields, webhookUrlSlug: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {/* Instagram Configuration Fields */}
                {selectedPlatform === 'instagram' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Instagram Account ID</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="e.g. 17841451155289766"
                        value={instagramFields.instagramAccountId}
                        onChange={(e) => setInstagramFields({ ...instagramFields, instagramAccountId: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Facebook Page ID</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="e.g. 123456789012345"
                        value={instagramFields.pageId}
                        onChange={(e) => setInstagramFields({ ...instagramFields, pageId: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Instagram Access Token</label>
                      <input
                        type="password"
                        required
                        autoComplete="new-password"
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="••••••••••••••••"
                        value={instagramFields.accessToken}
                        onChange={(e) => setInstagramFields({ ...instagramFields, accessToken: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Webhook Verify Token</label>
                      <input
                        type="password"
                        required
                        autoComplete="new-password"
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="••••••••••••••••"
                        value={instagramFields.webhookVerifyToken}
                        onChange={(e) => setInstagramFields({ ...instagramFields, webhookVerifyToken: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Meta API Version</label>
                      <input
                        type="text"
                        required
                        className="form-control"
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="v20.0"
                        value={instagramFields.apiVersion}
                        onChange={(e) => setInstagramFields({ ...instagramFields, apiVersion: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', padding: '12px 14px', borderRadius: '6px', background: 'rgba(0,0,0,0.015)', border: '1px solid var(--border-color)' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Enable Instagram Integration</label>
                        <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>Allow receiving and replying to DMs from the CRM</span>
                      </div>
                      <label className="status-toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px', margin: 0 }}>
                        <input 
                          type="checkbox" 
                          checked={instagramFields.enabled} 
                          onChange={(e) => setInstagramFields({ ...instagramFields, enabled: e.target.checked })}
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span className="status-toggle-slider" style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: instagramFields.enabled ? 'var(--primary, #2F6BFF)' : '#cbd5e1',
                          transition: '0.3s',
                          borderRadius: '20px'
                        }}>
                          <span className="status-toggle-knob" style={{
                            position: 'absolute',
                            height: '14px',
                            width: '14px',
                            left: instagramFields.enabled ? '18px' : '4px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            transition: '0.3s',
                            borderRadius: '50%'
                          }}></span>
                        </span>
                      </label>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="primary-btn w-full mt-2"
                  style={{ background: 'var(--primary)', color: '#ffffff', fontWeight: '700', height: '38px', fontSize: '12px' }}
                >
                  Save Connection Configurations
                </button>
              </form>

              {/* Integration Testing Sandbox Section */}
              <div style={{ marginTop: '24px', borderTop: '1px dashed var(--border-color)', paddingTop: '20px' }}>
                <style>{`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
                <h4 style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ⚡ Integration Testing Sandbox (Real-time Lead Webhook Simulator)
                </h4>
                <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '12px' }}>
                  Simulate an incoming HTTP webhook POST request from Meta Ads, Google Ads, or WhatsApp API. This writes a fresh student lead record straight into your active CRM state, triggering dashboard updates and notifications.
                </p>
                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={triggerSimulatedLead}
                  className="primary-btn w-full"
                  style={{
                    background: isSimulating ? 'rgba(0,0,0,0.04)' : 'rgba(16, 185, 129, 0.08)',
                    color: isSimulating ? 'var(--text-muted)' : '#059669',
                    border: isSimulating ? '1px solid var(--border-color)' : '1px solid rgba(16, 185, 129, 0.2)',
                    fontWeight: '700',
                    fontSize: '11.5px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: isSimulating ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSimulating ? (
                    <>
                      <div style={{ width: '14px', height: '14px', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      <span>Simulating Incoming Webhook...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡ Trigger Simulated {selectedPlatform === 'meta' ? 'Meta Ad' : selectedPlatform === 'google' ? 'Google Ad' : selectedPlatform === 'whatsapp' ? 'WhatsApp' : 'Website'} Webhook Lead</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Close / Action Row */}
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setSelectedPlatform(null)}
                className="secondary-btn w-full"
                style={{ height: '36px', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancel / Close Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
