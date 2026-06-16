import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, FileSpreadsheet, Users, Eye, AlertCircle, CheckCircle, Image, Link, Loader2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { mockDb } from './mockData';

const BRAND_BLUE = '#2563eb';

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

  // Preview / Send
  const [previewContacts, setPreviewContacts] = useState([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadExistingLists();
    loadTemplates();
  }, []);

  const loadExistingLists = () => {
    const lists = mockDb.getContactLists();
    setExistingLists(lists);
  };

  const loadTemplates = () => {
    const tmpls = mockDb.getTemplates();
    setTemplates(tmpls);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

      const allContacts = mockDb.getContacts();
      allContacts[newListId] = uploadedContacts.map((c, i) => ({ id: `c-${Date.now()}-${i}`, ...c }));

      mockDb.saveContactLists(newLists);
      mockDb.saveContacts(allContacts);

      setSelectedListId(newListId);
      setExistingLists(newLists);
      setUploading(false);
      alert('Contacts uploaded and saved successfully!');
    }, 1000);
  };

  const handleSelectExistingList = (listId) => {
    setSelectedListId(listId);
    setUploadedContacts([]);
    const allContacts = mockDb.getContacts();
    const listContacts = allContacts[listId] || [];
    setPreviewContacts(listContacts.slice(0, 3));
    const targetList = existingLists.find(l => l.id === listId);
    setColumns(targetList ? targetList.columns : []);
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
      } else if (mode === 'column' && variableMapping[varNum] && contact[variableMapping[varNum]] !== undefined) {
        body = body.replace(`{{${varNum}}}`, String(contact[variableMapping[varNum]]));
      }
    }
    return body;
  };

  const handleHeaderMediaUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setHeaderMediaUploading(true);
    setTimeout(() => {
      setHeaderMediaUrl(URL.createObjectURL(file));
      setHeaderMediaFileName(file.name);
      setHeaderMediaUploading(false);
    }, 1000);
  };

  const handleSendCampaign = () => {
    if (!selectedListId) {
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
    setTimeout(() => {
      const totalCount = previewContacts.length || 10;
      const sentCount = Math.round(totalCount * 0.95);
      const failedCount = totalCount - sentCount;
      const newCamp = {
        id: `camp-${Date.now()}`,
        name: campaignName || `Campaign - ${new Date().toLocaleDateString()}`,
        status: 'completed',
        totalRecipients: totalCount,
        sent: sentCount,
        failed: failedCount,
        delivered: Math.round(sentCount * 0.9),
        read: Math.round(sentCount * 0.75),
        replied: Math.round(sentCount * 0.1),
        type: messageType,
        templateName: selectedTemplate || null,
        languageCode: templateLanguage || null,
        message: messageType === 'text' ? messageText : getTemplateBody(),
        createdAt: { _seconds: Math.floor(Date.now() / 1000) },
        completedAt: { _seconds: Math.floor(Date.now() / 1000) + 60 }
      };

      const campaigns = mockDb.getCampaigns();
      mockDb.saveCampaigns([newCamp, ...campaigns]);
      
      // Save recipient list details for report
      const allRecipients = mockDb.getRecipients();
      allRecipients[newCamp.id] = previewContacts.map((c, i) => ({
        id: `r-${newCamp.id}-${i}`,
        name: c.name || `Recipient ${i+1}`,
        phone: c.phone || '919999999999',
        status: i === 0 ? 'failed' : i % 3 === 0 ? 'delivered' : 'read',
        error: i === 0 ? 'Inactive WhatsApp account' : null,
        errorCode: i === 0 ? '131026' : null,
        messageId: `msg-${Date.now()}-${i}`,
        deliveredAt: Date.now(),
        readAt: i % 3 !== 0 ? Date.now() + 500 : null,
        replied: i % 4 === 0
      }));
      mockDb.saveRecipients(allRecipients);

      setSending(false);
      setResult({ totalRecipients: totalCount });
    }, 1500);
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
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
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
                {existingLists.map(list => (
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
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16, color: '#0f172a' }}>Compose Message</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: 6 }}>
              Campaign Name
            </label>
            <input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g., March Promo, Welcome Message..."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['text', 'template'].map(t => (
              <button
                key={t}
                onClick={() => setMessageType(t)}
                style={{
                  padding: '8px 20px', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem',
                  background: messageType === t ? BRAND_BLUE : '#f1f5f9',
                  color: messageType === t ? '#fff' : '#64748b',
                  border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {t === 'text' ? 'Custom Message' : 'WhatsApp Template'}
              </button>
            ))}
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
                  border: '1px solid #d1d5db', outline: 'none', fontSize: '0.95rem',
                }}
              >
                <option value="">Choose a template...</option>
                {templates.filter(t => t.status === 'APPROVED').map(t => (
                  <option key={t.name} value={t.name}>{t.name} ({t.category})</option>
                ))}
              </select>

              {selectedTemplate && (
                <div style={{ marginTop: 16 }}>
                  {/* Media Header If Needed */}
                  {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(getTemplateHeaderType()) && (
                    <div style={{ background: '#fffbeb', borderRadius: 10, padding: 16, border: '1px solid #fde68a', marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#92400e', marginBottom: 10 }}>
                        This template requires a {getTemplateHeaderType().toLowerCase()} header *
                      </label>
                      <input
                        ref={headerMediaInputRef}
                        type="file"
                        onChange={handleHeaderMediaUpload}
                        style={{ display: 'none' }}
                      />
                      {headerMediaUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                          <CheckCircle size={18} color="#16a34a" />
                          <div style={{ flex: 1, fontSize: '0.85rem', color: '#16a34a' }}>{headerMediaFileName} (Loaded)</div>
                          <button onClick={() => setHeaderMediaUrl('')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>Remove</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => headerMediaInputRef.current?.click()}
                          style={{ width: '100%', padding: 20, border: '2px dashed #cbd5e1', borderRadius: 8, cursor: 'pointer', background: '#fafafa', color: '#64748b', fontSize: '0.85rem' }}
                        >
                          Click to upload sample media file
                        </button>
                      )}
                    </div>
                  )}

                  {/* Body Variables Mapping */}
                  {getTemplateVariables().map(v => (
                    <div key={v} style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                        Variable {`{{${v}}}`} Mapping
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select
                          value={variableMode[v] || 'column'}
                          onChange={e => setVariableMode(prev => ({ ...prev, [v]: e.target.value }))}
                          style={{ padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}
                        >
                          <option value="column">Map to Column</option>
                          <option value="manual">Fixed Text</option>
                        </select>
                        {(variableMode[v] || 'column') === 'column' ? (
                          <select
                            value={variableMapping[v] || ''}
                            onChange={e => setVariableMapping(prev => ({ ...prev, [v]: e.target.value }))}
                            style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}
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
                            style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(1)} style={{ padding: '10px 24px', borderRadius: 10, background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Back</button>
            <button
              onClick={() => setStep(3)}
              disabled={messageType === 'template' && !selectedTemplate}
              style={{
                padding: '10px 24px', borderRadius: 10, fontWeight: 600,
                background: (messageType === 'text' || selectedTemplate) ? BRAND_BLUE : '#e2e8f0',
                color: (messageType === 'text' || selectedTemplate) ? '#fff' : '#94a3b8',
                border: 'none', cursor: 'pointer',
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
                <span style={{ fontWeight: 600 }}>To: {previewContacts[0].name || 'Recipient'} ({previewContacts[0].phone || 'Number'})</span>
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

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(2)} style={{ padding: '10px 24px', borderRadius: 10, background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Back</button>
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
      )}
    </div>
  );
}
