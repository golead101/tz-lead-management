import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, RefreshCw, ExternalLink, Plus, X, Trash2, AlertCircle,
  CheckCircle, Image, Video, FileIcon, Phone, Globe, Copy, MessageSquare, Upload, Loader
} from 'lucide-react';
import { whatsappDb } from './whatsappDb';

const BRAND_BLUE = '#2563eb';

const CATEGORIES = [
  { value: 'MARKETING', label: 'Marketing', desc: 'Promotions, offers, updates' },
  { value: 'UTILITY', label: 'Utility', desc: 'Order updates, account alerts' },
  { value: 'AUTHENTICATION', label: 'Authentication', desc: 'OTPs, verification codes' },
];

const LANGUAGES = [
  { value: 'en_US', label: 'English (US)' },
  { value: 'en_GB', label: 'English (UK)' },
  { value: 'hi', label: 'Hindi' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
];

const HEADER_TYPES = [
  { value: 'NONE', label: 'None', icon: null },
  { value: 'TEXT', label: 'Text', icon: null },
  { value: 'IMAGE', label: 'Image', icon: Image },
  { value: 'VIDEO', label: 'Video', icon: Video },
  { value: 'DOCUMENT', label: 'Document', icon: FileIcon },
];

const BUTTON_TYPES = [
  { value: 'QUICK_REPLY', label: 'Quick Reply', icon: MessageSquare, desc: 'Predefined response' },
  { value: 'URL', label: 'Visit Website', icon: Globe, desc: 'Open a URL' },
  { value: 'PHONE_NUMBER', label: 'Call Phone Number', icon: Phone, desc: 'Dial a number' },
  { value: 'COPY_CODE', label: 'Copy Offer Code', icon: Copy, desc: 'Copy to clipboard' },
];

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none',
  boxSizing: 'border-box',
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);

  // Form State
  const [tplName, setTplName] = useState('');
  const [tplCategory, setTplCategory] = useState('MARKETING');
  const [tplLanguage, setTplLanguage] = useState('en_US');
  const [tplHeaderType, setTplHeaderType] = useState('NONE');
  const [tplHeaderText, setTplHeaderText] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [tplFooter, setTplFooter] = useState('');
  const [tplButtons, setTplButtons] = useState([]);
  const [showButtonMenu, setShowButtonMenu] = useState(false);
  const [tplVariableExamples, setTplVariableExamples] = useState({});
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaHandle, setMediaHandle] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef(null);

  const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'leads-management-tz';

  useEffect(() => {
    loadTemplates();
  }, []);

  // Fetch real templates from Meta WhatsApp Business Account via Cloud Function
  const loadTemplates = async (showRefreshMsg = false) => {
    setLoading(true);
    try {
      const url = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/getWhatsAppTemplates`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success) {
        setTemplates(data.templates || []);
        if (showRefreshMsg) {
          setToast({ type: 'success', message: `Synced ${data.count} templates from your Meta account.` });
        }
      } else {
        // Fallback: load from local cache if API fails
        const cached = whatsappDb.getTemplates();
        setTemplates(cached);
        if (showRefreshMsg) {
          setToast({ type: 'error', message: data.error || 'Failed to sync from Meta. Showing cached templates.' });
        }
        console.error('[TemplatesPage] Meta API error:', data.error, data.details);
      }
    } catch (err) {
      // Fallback: load from local cache
      const cached = whatsappDb.getTemplates();
      setTemplates(cached);
      if (showRefreshMsg) {
        setToast({ type: 'error', message: 'Could not reach Meta API. Showing cached templates.' });
      }
      console.error('[TemplatesPage] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMediaUploadMock = (file) => {
    setUploadingMedia(true);
    setTimeout(() => {
      setMediaHandle(`mock-handle-${Date.now()}`);
      setMediaFile(file);
      setUploadingMedia(false);
      setToast({ type: 'success', message: `Sample file "${file.name}" uploaded successfully.` });
    }, 1000);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleMediaUploadMock(file);
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaHandle('');
  };

  const handleCreate = async () => {
    if (!tplName.trim() || !tplBody.trim()) {
      setToast({ type: 'error', message: 'Template name and body are required' });
      return;
    }
    setCreating(true);

    const cleanName = tplName.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

    const components = [
      tplHeaderType !== 'NONE' ? { type: 'HEADER', format: tplHeaderType, ...(tplHeaderType === 'TEXT' ? { text: tplHeaderText } : {}) } : null,
      { type: 'BODY', text: tplBody },
      tplFooter ? { type: 'FOOTER', text: tplFooter } : null,
      tplButtons.length > 0 ? { type: 'BUTTONS', buttons: tplButtons } : null
    ].filter(Boolean);

    try {
      const url = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/createWhatsAppTemplate`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          category: tplCategory,
          language: tplLanguage,
          components
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setShowCreator(false);
        resetForm();
        setToast({ type: 'success', message: `Template "${cleanName}" submitted to Meta for approval. Status: PENDING.` });
        // Refresh from Meta to show real status
        await loadTemplates();
      } else {
        setToast({ type: 'error', message: data.error || 'Failed to submit template to Meta.' });
        console.error('[handleCreate] Meta error:', data.details);
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Could not reach Meta API. Check your connection.' });
      console.error('[handleCreate] Error:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (name) => {
    if (!confirm(`Delete template "${name}" from Meta? This cannot be undone.`)) return;
    setDeleting(name);

    try {
      const url = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/deleteWhatsAppTemplate`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setToast({ type: 'success', message: `Template "${name}" deleted from Meta.` });
        // Refresh to reflect Meta's actual state
        await loadTemplates();
      } else {
        setToast({ type: 'error', message: data.error || 'Failed to delete from Meta.' });
        console.error('[handleDelete] Meta error:', data.details);
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Could not reach Meta API.' });
      console.error('[handleDelete] Error:', err);
    } finally {
      setDeleting(null);
    }
  };

  const resetForm = () => {
    setTplName('');
    setTplCategory('MARKETING');
    setTplLanguage('en_US');
    setTplHeaderType('NONE');
    setTplHeaderText('');
    setTplBody('');
    setTplFooter('');
    setTplButtons([]);
    setTplVariableExamples({});
    clearMedia();
  };

  const insertVariable = (field) => {
    if (field === 'header') {
      const count = (tplHeaderText.match(/\{\{\d+\}\}/g) || []).length + 1;
      setTplHeaderText(prev => prev + `{{${count}}}`);
    } else {
      const count = (tplBody.match(/\{\{\d+\}\}/g) || []).length + 1;
      setTplBody(prev => prev + `{{${count}}}`);
    }
  };

  const addButton = (type) => {
    if (tplButtons.length >= 10) return;
    const newBtn = { type, text: '' };
    if (type === 'URL') newBtn.url = '';
    if (type === 'PHONE_NUMBER') newBtn.phoneNumber = '';
    setTplButtons(prev => [...prev, newBtn]);
    setShowButtonMenu(false);
  };

  const updateButton = (index, updates) => {
    setTplButtons(prev => prev.map((btn, i) => i === index ? { ...btn, ...updates } : btn));
  };

  const removeButton = (index) => {
    setTplButtons(prev => prev.filter((_, i) => i !== index));
  };

  const getPreviewBody = () => {
    return tplBody.replace(/\{\{(\d+)\}\}/g, (_, num) => `[Variable ${num}]`);
  };

  const getStatusColor = (status) => {
    if (status === 'APPROVED') return { bg: '#dcfce7', color: '#16a34a' };
    if (status === 'PENDING') return { bg: '#fef3c7', color: '#d97706' };
    return { bg: '#f1f5f9', color: '#64748b' };
  };

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 20px', borderRadius: 10,
          background: toast.type === 'success' ? '#dcfce7' : '#fef2f2',
          color: toast.type === 'success' ? '#16a34a' : '#ef4444',
          fontWeight: 500, fontSize: '0.9rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Message Templates</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => loadTemplates(true)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f1f5f9', color: '#475569', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> {loading ? 'Syncing...' : 'Refresh from Meta'}
          </button>
          <button onClick={() => setShowCreator(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: BRAND_BLUE, color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={16} /> Create Template
          </button>
        </div>
      </div>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 24 }}>
        Create templates here. Meta requires approval before templates can be sent to customers.
      </p>

      {/* Templates Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {templates.map(t => {
          const bodyText = t.components?.find(c => c.type === 'BODY')?.text || '';
          const header = t.components?.find(c => c.type === 'HEADER');
          const statusStyle = getStatusColor(t.status);
          return (
            <div key={t.name} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 200 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>{t.name}</span>
                  <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, bg: statusStyle.bg, color: statusStyle.color }}>{t.status}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 12 }}>
                  Category: {t.category} | Lang: {t.language}
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: '0.85rem', color: '#475569', whiteSpace: 'pre-wrap', border: '1px solid #f1f5f9' }}>
                  {header?.text && <strong style={{ display: 'block', marginBottom: 4, color: '#0f172a' }}>{header.text}</strong>}
                  {bodyText}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  onClick={() => handleDelete(t.name)}
                  disabled={deleting === t.name}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Creator Modal */}
      {showCreator && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 20,
          overflowY: 'auto',
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 900,
            margin: '0 16px 40px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Create Message Template</h2>
              <button onClick={() => { setShowCreator(false); resetForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 320, padding: 24, borderRight: '1px solid #f1f5f9', maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6, color: '#0f172a' }}>Template Name *</label>
                  <input type="text" value={tplName} onChange={e => setTplName(e.target.value)} placeholder="e.g. order_confirmation" style={inputStyle} />
                </div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6, color: '#0f172a' }}>Category</label>
                    <select value={tplCategory} onChange={e => setTplCategory(e.target.value)} style={inputStyle}>
                      {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6, color: '#0f172a' }}>Language</label>
                    <select value={tplLanguage} onChange={e => setTplLanguage(e.target.value)} style={inputStyle}>
                      {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6, color: '#0f172a' }}>Header Type</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {HEADER_TYPES.map(ht => (
                      <button
                        key={ht.value}
                        onClick={() => setTplHeaderType(ht.value)}
                        style={{
                          padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                          border: tplHeaderType === ht.value ? `2px solid ${BRAND_BLUE}` : '1px solid #e2e8f0',
                          background: tplHeaderType === ht.value ? '#eff6ff' : '#fff',
                          fontWeight: 500, fontSize: '0.8rem', color: tplHeaderType === ht.value ? BRAND_BLUE : '#64748b',
                        }}
                      >
                        {ht.label}
                      </button>
                    ))}
                  </div>

                  {tplHeaderType === 'TEXT' && (
                    <div style={{ marginTop: 10 }}>
                      <input type="text" value={tplHeaderText} onChange={e => setTplHeaderText(e.target.value)} placeholder="Header text..." style={inputStyle} />
                    </div>
                  )}

                  {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(tplHeaderType) && (
                    <div style={{ marginTop: 10 }}>
                      <input ref={fileInputRef} type="file" onChange={handleFileSelect} style={{ display: 'none' }} />
                      {!mediaFile ? (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          style={{ width: '100%', padding: 20, border: '2px dashed #cbd5e1', borderRadius: 8, cursor: 'pointer', background: '#fafafa', color: '#64748b' }}
                        >
                          {uploadingMedia ? 'Uploading Sample...' : 'Click to Upload sample media'}
                        </button>
                      ) : (
                        <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.85rem', color: '#16a34a' }}>{mediaFile.name}</span>
                          <button onClick={clearMedia} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>Remove</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>Body *</label>
                    <button onClick={() => insertVariable('body')} style={{ background: '#eff6ff', color: BRAND_BLUE, border: `1px solid ${BRAND_BLUE}`, padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                      + Add Variable
                    </button>
                  </div>
                  <textarea value={tplBody} onChange={e => setTplBody(e.target.value)} placeholder="Enter body text..." rows={5} style={inputStyle} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: 6, color: '#0f172a' }}>Footer (optional)</label>
                  <input type="text" value={tplFooter} onChange={e => setTplFooter(e.target.value)} placeholder="e.g. Reply STOP to opt out" style={inputStyle} />
                </div>
              </div>

              {/* Preview Side */}
              <div style={{ flex: 1, minWidth: 320, padding: 24, background: '#f8fafc', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569', marginBottom: 16 }}>Live Preview</h3>
                  <div style={{ background: '#efeae2', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <div style={{
                      background: '#fff', padding: '10px 14px', borderRadius: '8px 8px 8px 0',
                      maxWidth: '90%', fontSize: '0.9rem', lineHeight: 1.5,
                      boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)'
                    }}>
                      {tplHeaderType === 'TEXT' && tplHeaderText && <strong style={{ display: 'block', marginBottom: 4, color: '#0f172a' }}>{tplHeaderText}</strong>}
                      {tplBody ? getPreviewBody() : <span style={{ color: '#94a3b8' }}>Template body preview...</span>}
                      {tplFooter && <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 6 }}>{tplFooter}</div>}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button onClick={() => { setShowCreator(false); resetForm(); }} style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleCreate} disabled={creating} style={{ background: BRAND_BLUE, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', opacity: creating ? 0.7 : 1 }}>
                    {creating ? 'Submitting...' : 'Submit Template'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
