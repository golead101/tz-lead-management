import React, { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';

export default function Integrations() {
  const { integrations, updateIntegration, addLead } = useCRM();

  // Active configuration drawer state
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  // Form input states
  const [metaFields, setMetaFields] = useState({ appId: '', pageId: '', systemToken: '', webhookVerifyToken: '' });
  const [googleFields, setGoogleFields] = useState({ developerToken: '', customerId: '', clientId: '', clientSecret: '', webhookPasskey: '' });
  const [whatsappFields, setWhatsAppFields] = useState({ phoneNumberId: '', businessAccountId: '', systemToken: '' });
  const [webhookFields, setWebhookFields] = useState({ securitySecret: '', webhookUrlSlug: '' });

  // Sync state to inputs when selecting a platform
  useEffect(() => {
    if (selectedPlatform === 'meta') {
      setMetaFields({
        appId: integrations.meta.appId || '',
        pageId: integrations.meta.pageId || '',
        systemToken: integrations.meta.systemToken || '',
        webhookVerifyToken: integrations.meta.webhookVerifyToken || ''
      });
    } else if (selectedPlatform === 'google') {
      setGoogleFields({
        developerToken: integrations.google.developerToken || '',
        customerId: integrations.google.customerId || '',
        clientId: integrations.google.clientId || '',
        clientSecret: integrations.google.clientSecret || '',
        webhookPasskey: integrations.google.webhookPasskey || ''
      });
    } else if (selectedPlatform === 'whatsapp') {
      setWhatsAppFields({
        phoneNumberId: integrations.whatsapp.phoneNumberId || '',
        businessAccountId: integrations.whatsapp.businessAccountId || '',
        systemToken: integrations.whatsapp.systemToken || ''
      });
    } else if (selectedPlatform === 'webhooks') {
      setWebhookFields({
        securitySecret: integrations.webhooks.securitySecret || '',
        webhookUrlSlug: integrations.webhooks.webhookUrlSlug || ''
      });
    }
  }, [selectedPlatform, integrations]);

  const handleToggle = (platform) => {
    const nextEnabled = !integrations[platform].enabled;
    const nextStatus = nextEnabled 
      ? (platform === 'google' && !integrations.google.developerToken ? 'Setup Required' : 'Connected')
      : 'Disconnected';
    
    updateIntegration(platform, { 
      enabled: nextEnabled,
      status: nextStatus
    });
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    let fieldsToSave = {};
    let activeStatus = 'Connected';

    if (selectedPlatform === 'meta') {
      fieldsToSave = { ...metaFields };
      if (!metaFields.appId || !metaFields.systemToken) activeStatus = 'Setup Required';
    } else if (selectedPlatform === 'google') {
      fieldsToSave = { ...googleFields };
      if (!googleFields.developerToken || !googleFields.customerId) activeStatus = 'Setup Required';
    } else if (selectedPlatform === 'whatsapp') {
      fieldsToSave = { ...whatsappFields };
      if (!whatsappFields.phoneNumberId || !whatsappFields.systemToken) activeStatus = 'Setup Required';
    } else if (selectedPlatform === 'webhooks') {
      fieldsToSave = { ...webhookFields };
      if (!webhookFields.securitySecret) activeStatus = 'Setup Required';
    }

    updateIntegration(selectedPlatform, {
      ...fieldsToSave,
      enabled: true,
      status: activeStatus
    });
    
    setSelectedPlatform(null);
  };

  // Integration Simulator State & Function
  const [isSimulating, setIsSimulating] = useState(false);

  const triggerSimulatedLead = () => {
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
          course: 'Full-Stack Web Development',
          source: 'Meta Ads',
          priority: 'Hot',
          stage: 'New Lead',
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
          course: 'Data Science & Artificial Intelligence',
          source: 'Google Search',
          priority: 'Hot',
          stage: 'New Lead',
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
          priority: 'Warm',
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
          priority: 'Hot',
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
      priority: 'Hot',
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
          priority: 'Hot',
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
                  <path d="M16.924 6c-1.393 0-2.613.626-3.486 1.624L12 9.25 10.562 7.624C9.69 6.626 8.47 6 7.076 6 4.257 6 2 8.243 2 11c0 2.757 2.257 5 5.076 5 1.393 0 2.613-.626 3.486-1.624L12 12.75l1.438 1.626c.873.998 2.093 1.624 3.486 1.624 2.819 0 5.076-2.243 5.076-5 0-2.757-2.257-5-5.076-5zm0 8.5c-1.026 0-1.921-.497-2.522-1.282L12 10.5l-2.402 2.718c-.6.785-1.496 1.282-2.522 1.282-1.677 0-3.076-1.353-3.076-3s1.399-3 3.076-3c1.026 0 1.921.497 2.522 1.282L12 11.5l2.402-2.718c.6-.785 1.496-1.282 2.522-1.282 1.677 0 3.076 1.353 3.076 3s-1.399 3-3.076 3z"/>
                </svg>
              </div>
              
              {/* Toggler Switch */}
              <div 
                onClick={() => handleToggle('meta')}
                className={`db-chart-dropdown ${integrations.meta.enabled ? 'active-toggle' : ''}`}
                style={{
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  background: integrations.meta.enabled ? 'var(--primary-glow, rgba(47,107,255,0.08))' : 'rgba(0,0,0,0.04)',
                  color: integrations.meta.enabled ? 'var(--primary)' : 'var(--text-muted)',
                  borderColor: integrations.meta.enabled ? 'var(--primary)' : 'var(--border-color)',
                  fontWeight: '700'
                }}
              >
                {integrations.meta.enabled ? 'Active ●' : 'Inactive ○'}
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
                {integrations.meta.simulatedLeadsCount.toLocaleString()} leads captured
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
              
              {/* Toggler Switch */}
              <div 
                onClick={() => handleToggle('google')}
                className={`db-chart-dropdown ${integrations.google.enabled ? 'active-toggle' : ''}`}
                style={{
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  background: integrations.google.enabled ? 'var(--primary-glow, rgba(47,107,255,0.08))' : 'rgba(0,0,0,0.04)',
                  color: integrations.google.enabled ? 'var(--primary)' : 'var(--text-muted)',
                  borderColor: integrations.google.enabled ? 'var(--primary)' : 'var(--border-color)',
                  fontWeight: '700'
                }}
              >
                {integrations.google.enabled ? 'Active ●' : 'Inactive ○'}
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
                {integrations.google.simulatedLeadsCount.toLocaleString()} leads captured
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
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M12.012 2c-5.506 0-9.988 4.482-9.988 9.988 0 1.758.459 3.475 1.332 4.988L2 22l5.148-1.351a9.92 9.92 0 0 0 4.864 1.263h.005c5.502 0 9.985-4.482 9.985-9.988C22 6.482 17.518 2 12.012 2zm6.985 14.156c-.287.808-1.442 1.48-1.996 1.583-.497.094-1.127.151-3.238-.724-2.699-1.118-4.42-3.861-4.554-4.041-.135-.179-1.094-1.455-1.094-2.776 0-1.321.696-1.968.966-2.238.27-.27.584-.337.785-.337.202 0 .404.004.584.012.187.008.438-.072.686.526.254.61.87 2.122.946 2.274.075.152.126.331.025.531-.101.2-.152.33-.3.504-.15.174-.316.388-.451.52-.152.149-.311.312-.134.615.176.302.784 1.293 1.684 2.094.757.674 1.397.881 1.734 1.05.337.169.539.141.741-.093.202-.234.87-1.012 1.106-1.36.236-.348.472-.292.798-.174.326.118 2.072 1.002 2.426 1.183.354.181.59.27.674.417.085.147.085.852-.202 1.66z" />
                </svg>
              </div>
              
              {/* Toggler Switch */}
              <div 
                onClick={() => handleToggle('whatsapp')}
                className={`db-chart-dropdown ${integrations.whatsapp.enabled ? 'active-toggle' : ''}`}
                style={{
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  background: integrations.whatsapp.enabled ? 'var(--primary-glow, rgba(47,107,255,0.08))' : 'rgba(0,0,0,0.04)',
                  color: integrations.whatsapp.enabled ? 'var(--primary)' : 'var(--text-muted)',
                  borderColor: integrations.whatsapp.enabled ? 'var(--primary)' : 'var(--border-color)',
                  fontWeight: '700'
                }}
              >
                {integrations.whatsapp.enabled ? 'Active ●' : 'Inactive ○'}
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
                {integrations.whatsapp.simulatedLeadsCount.toLocaleString()} leads captured
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
              </p>

              {/* Dynamic Interactive Config Forms */}
              <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Meta Configuration Fields */}
                {selectedPlatform === 'meta' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Meta App ID</label>
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
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Page ID</label>
                      <input 
                        type="text" 
                        required
                        className="form-control" 
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="e.g. 109283471029"
                        value={metaFields.pageId}
                        onChange={(e) => setMetaFields({ ...metaFields, pageId: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>System User Access Token</label>
                      <textarea 
                        required
                        className="form-control" 
                        style={{ height: '70px', fontSize: '11px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)', resize: 'none', padding: '8px' }}
                        placeholder="EAAGy7A_meta_token..."
                        value={metaFields.systemToken}
                        onChange={(e) => setMetaFields({ ...metaFields, systemToken: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Webhook Verification Token</label>
                      <input 
                        type="text" 
                        required
                        className="form-control" 
                        style={{ height: '36px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                        placeholder="e.g. techzone_secret_verify_2026"
                        value={metaFields.webhookVerifyToken}
                        onChange={(e) => setMetaFields({ ...metaFields, webhookVerifyToken: e.target.value })}
                      />
                    </div>
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
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Developer Token</label>
                      <input 
                        type="password" 
                        required
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
                          className="form-control" 
                          style={{ height: '36px', fontSize: '11px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)' }}
                          placeholder="client-secret"
                          value={googleFields.clientSecret}
                          onChange={(e) => setGoogleFields({ ...googleFields, clientSecret: e.target.value })}
                        />
                      </div>
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
                  </>
                )}

                {/* WhatsApp Configuration Fields */}
                {selectedPlatform === 'whatsapp' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>WhatsApp Phone Number ID</label>
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
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>WhatsApp Business Account ID</label>
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
                      <label className="form-label" style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-secondary)' }}>Permanent Access Token</label>
                      <textarea 
                        required
                        className="form-control" 
                        style={{ height: '70px', fontSize: '11px', background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border-color)', resize: 'none', padding: '8px' }}
                        placeholder="EAAGy7B_whatsapp_token..."
                        value={whatsappFields.systemToken}
                        onChange={(e) => setWhatsAppFields({ ...whatsappFields, systemToken: e.target.value })}
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

                <button 
                  type="submit" 
                  className="primary-btn w-full mt-2" 
                  style={{ background: 'var(--primary)', color: '#ffffff', fontWeight: '700', height: '38px', fontSize: '12px' }}
                >
                  Save Connection Configurations
                </button>
              </form>

              {/* Firebase Cloud Functions Node.js Script Viewers (Exclusive Production Setup Section) */}
              {(selectedPlatform === 'google' || selectedPlatform === 'meta') && (
                <div style={{ marginTop: '24px', borderTop: '1px dashed var(--border-color)', paddingTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      🔥 Firebase Cloud Function (Production Integration Script)
                    </h4>
                    <button 
                      className="sidebar-logout-btn" 
                      onClick={() => copyToClipboard(
                        selectedPlatform === 'google' ? googleCloudCode : metaCloudCode, 
                        selectedPlatform === 'google' ? 'Google Cloud' : 'Meta Webhook'
                      )}
                      style={{ padding: '2px 8px', fontSize: '9.5px', background: 'rgba(0,0,0,0.02)', color: 'var(--primary)', fontWeight: '700', display: 'flex', gap: '3px' }}
                    >
                      Copy Script
                    </button>
                  </div>
                  <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '10px' }}>
                    Deploy this verified Node.js function inside your Firebase directory to automatically pipe webhook leads straight into Firestore:
                  </p>

                  <div className="code-viewer-block" style={{ margin: '0' }}>
                    <pre className="code-pre" style={{ maxHeight: '180px', overflowY: 'auto', fontSize: '10px', padding: '10px', background: '#0a101f', color: '#f8fafc', borderRadius: '6px' }}>
                      {selectedPlatform === 'google' ? googleCloudCode : metaCloudCode}
                    </pre>
                  </div>
                </div>
              )}
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
