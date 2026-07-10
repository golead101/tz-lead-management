import React, { useState, useEffect } from 'react';
import { Bot, Save, Loader2, Edit3, Trash2, Plus, FileText, Upload, Link as LinkIcon, Eye, LayoutList, GitMerge, X, CheckCircle, Phone, List } from 'lucide-react';
import { whatsappDb } from './whatsappDb';
import { storage } from '../../firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import VisualFlowBuilder from './VisualFlowBuilder';

const BRAND_BLUE = '#2563eb';

export default function ChatbotSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('CUSTOM AUTO REPLIES');
  const [viewMode, setViewMode] = useState('list');
  const [settings, setSettings] = useState({
    customReplies: [],
    mediaFiles: [],
    metaCostRate: '0.80',
  });
  const [toast, setToast] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newReply, setNewReply] = useState({ trigger: '', responseType: 'Text', preview: '', buttons: '' });
  const [templates, setTemplates] = useState([]);
  
  const fileInputRef = React.useRef(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = () => {
    try {
      const data = whatsappDb.getChatbotSettings();
      // Ensure arrays exist
      if (!data.customReplies) data.customReplies = [];
      if (!data.mediaFiles) data.mediaFiles = [];
      setSettings(data);
      setTemplates(whatsappDb.getTemplates());
    } catch (error) {
      console.error('Failed to fetch chatbot settings:', error);
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    try {
      setSaving(true);
      whatsappDb.saveChatbotSettings(settings);
      showToast('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save chatbot settings:', error);
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteReply = (id) => {
    if (window.confirm('Are you sure you want to delete this custom reply?')) {
      setSettings(prev => ({
        ...prev,
        customReplies: prev.customReplies.filter(r => r.id !== id)
      }));
    }
  };

  const handleEditReply = (reply) => {
    setEditingId(reply.id);
    setNewReply({
      trigger: reply.trigger,
      responseType: reply.responseType,
      preview: reply.preview,
      buttons: reply.buttons || ''
    });
    setShowAddModal(true);
  };

  const handleAddReply = (e) => {
    e.preventDefault();
    if (!newReply.trigger || !newReply.preview) {
      showToast('Please fill required fields', 'error');
      return;
    }
    const btnArray = newReply.responseType === 'Buttons' ? (Array.isArray(newReply.buttons) ? newReply.buttons.filter(Boolean) : newReply.buttons.split(',').map(s => s.trim()).filter(Boolean)) : null;
    
    setSettings(prev => {
      const updatedReplies = editingId
        ? prev.customReplies.map(r => r.id === editingId ? {
            ...r, trigger: newReply.trigger, responseType: newReply.responseType, preview: newReply.preview, buttons: btnArray
          } : r)
        : [...prev.customReplies, {
            id: 'r' + Date.now(), trigger: newReply.trigger, responseType: newReply.responseType, preview: newReply.preview, buttons: btnArray
          }];
          
      return { ...prev, customReplies: updatedReplies };
    });

    setEditingId(null);
    setNewReply({ trigger: '', responseType: 'Text', preview: '', buttons: '' });
    setShowAddModal(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFile(true);
      const storageRef = ref(storage, `whatsapp_media/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
      
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed', 
        (snapshot) => {},
        (error) => {
          console.error("Upload error:", error);
          showToast('Failed to upload file', 'error');
          setUploadingFile(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const newFile = {
            id: 'm' + Date.now(),
            name: file.name,
            size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            url: downloadURL,
            storagePath: uploadTask.snapshot.ref.fullPath
          };
          
          const newSettings = {
            ...settings,
            mediaFiles: [newFile, ...settings.mediaFiles]
          };
          
          setSettings(newSettings);
          whatsappDb.saveChatbotSettings(newSettings);
          showToast('File uploaded successfully', 'success');
          setUploadingFile(false);
          
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      );
    } catch (error) {
      console.error("Upload process error:", error);
      showToast('Error uploading file', 'error');
      setUploadingFile(false);
    }
  };

  const handleDeleteMedia = async (fileId, storagePath) => {
    if (!window.confirm('Are you sure you want to delete this file? Any auto-replies using it will fail.')) return;
    
    try {
      if (storagePath) {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef).catch(e => console.log('File may not exist in storage:', e));
      }
      
      const newSettings = {
        ...settings,
        mediaFiles: settings.mediaFiles.filter(f => f.id !== fileId)
      };
      
      setSettings(newSettings);
      whatsappDb.saveChatbotSettings(newSettings);
      showToast('File deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete media:', error);
      showToast('Failed to delete file', 'error');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Link copied to clipboard', 'success');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE }} />
      </div>
    );
  }

  const cardStyle = {
    background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #e2e8f0', 
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 16
  };
  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box',
    outline: 'none', fontSize: '0.95rem'
  };
  const textareaStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', boxSizing: 'border-box',
    outline: 'none', fontSize: '0.95rem', resize: 'vertical'
  };

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, boxSizing: 'border-box', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: 12, background: '#eff6ff', borderRadius: 12, color: BRAND_BLUE, display: 'flex' }}>
            <Bot size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Chatbot Configurations</h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4, margin: 0 }}>Configure automated responses and menu flows</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: BRAND_BLUE, color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: 10, fontWeight: 600,
            cursor: 'pointer', fontSize: '0.9rem',
            boxShadow: '0 4px 18px rgba(37, 99, 235, 0.2)',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
          Save Configuration
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Welcome Template Section */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#0f172a' }}>
            <CheckCircle size={18} color="#16a34a" />
            Entry Template
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Initial Template Name</label>
            <input
              type="text"
              value={settings.welcomeTemplate || ''}
              onChange={(e) => setSettings({ ...settings, welcomeTemplate: e.target.value })}
              style={inputStyle}
              placeholder="e.g. welcome_message"
            />
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Must match the approved template name in Meta Business Manager</p>
          </div>
        </div>

        {/* Counselor Section */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#0f172a' }}>
            <Phone size={18} color={BRAND_BLUE} />
            Counselor Contact
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Counselor Phone Number</label>
            <input
              type="text"
              value={settings.counselorPhone || ''}
              onChange={(e) => setSettings({ ...settings, counselorPhone: e.target.value })}
              style={inputStyle}
              placeholder="+91 XXXXX XXXXX"
            />
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Phone number users will reach when calling a counselor</p>
          </div>
        </div>

        {/* Courses Section */}
        <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#0f172a' }}>
            <List size={18} color="#f59e0b" />
            Programs List
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Courses Text (Manual Reply)</label>
            <textarea
              rows={5}
              value={settings.coursesText || ''}
              onChange={(e) => setSettings({ ...settings, coursesText: e.target.value })}
              style={textareaStyle}
              placeholder="List your courses here..."
            />
          </div>
        </div>

        {/* Fees Section */}
        <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#0f172a' }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, background: '#dcfce7', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: '700', color: '#16a34a' }}>$</div>
            Fee Details
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Fee Structure Text</label>
            <textarea
              rows={5}
              value={settings.feeDetails || ''}
              onChange={(e) => setSettings({ ...settings, feeDetails: e.target.value })}
              style={textareaStyle}
              placeholder="List your fees here..."
            />
          </div>
        </div>

        {/* Brochure Section */}
        <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#0f172a' }}>
            <FileText size={18} color="#ef4444" />
            Brochure PDF
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Brochure Download URL</label>
            <input
              type="text"
              value={settings.brochureUrl || ''}
              onChange={(e) => setSettings({ ...settings, brochureUrl: e.target.value })}
              style={inputStyle}
              placeholder="https://firebasestorage.googleapis.com/..."
            />
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>Direct link to your PDF brochure file</p>
          </div>
        </div>

        {/* Meta Cost Rate Section */}
        <div style={{ ...cardStyle, gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#0f172a' }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, background: '#dcfce7', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: '700', color: '#16a34a' }}>₹</div>
            Meta Cost Rate (INR)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>Per Conversation Cost</label>
            <input
              type="number"
              step="0.01"
              value={settings.metaCostRate || ''}
              onChange={(e) => setSettings({ ...settings, metaCostRate: e.target.value })}
              style={inputStyle}
              placeholder="0.80"
            />
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>This rate is used to estimate billing on the dashboard.</p>
          </div>
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, padding: '12px 24px',
          background: toast.type === 'error' ? '#ef4444' : '#10b981', color: 'white',
          borderRadius: 8, boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500
        }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ padding: 14, background: '#eff6ff', borderRadius: 16, color: BRAND_BLUE, display: 'flex', border: '1px solid #bfdbfe' }}>
            <Bot size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>Chatbot Auto-Replies</h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>Automate conversations with users. Create Custom Auto Replies and Interactive List Messages.</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', background: '#fff', borderRadius: 24, padding: 4, border: '1px solid #e2e8f0' }}>
            <button 
              onClick={() => setViewMode('flow')}
              style={{ 
                padding: '6px 16px', borderRadius: 20, border: viewMode === 'flow' ? '1px solid #cbd5e1' : 'none', 
                background: viewMode === 'flow' ? '#fff' : 'transparent', color: viewMode === 'flow' ? BRAND_BLUE : '#64748b', 
                fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', 
                boxShadow: viewMode === 'flow' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' 
              }}>
              <GitMerge size={16} /> Visual Flow
            </button>
            <button 
              onClick={() => setViewMode('list')}
              style={{ 
                padding: '6px 16px', borderRadius: 20, border: viewMode === 'list' ? '1px solid #cbd5e1' : 'none', 
                background: viewMode === 'list' ? '#fff' : 'transparent', color: viewMode === 'list' ? BRAND_BLUE : '#64748b', 
                fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', 
                boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' 
              }}>
              <LayoutList size={16} /> Table List
            </button>
          </div>

          <button 
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px', background: BRAND_BLUE, color: 'white', border: 'none', borderRadius: 24,
              fontSize: '0.95rem', fontWeight: 600, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Configuration
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 32, marginTop: 12 }}>
        <button 
          onClick={() => setActiveTab('CUSTOM AUTO REPLIES')}
          style={{ padding: '0 0 12px', background: 'none', border: 'none', borderBottom: activeTab === 'CUSTOM AUTO REPLIES' ? `2px solid ${BRAND_BLUE}` : '2px solid transparent', color: activeTab === 'CUSTOM AUTO REPLIES' ? '#0f172a' : '#64748b', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
        >
          CUSTOM AUTO REPLIES
        </button>
        <button 
          onClick={() => setActiveTab('INTERACTIVE LIST MESSAGES')}
          style={{ padding: '0 0 12px', background: 'none', border: 'none', borderBottom: activeTab === 'INTERACTIVE LIST MESSAGES' ? `2px solid ${BRAND_BLUE}` : '2px solid transparent', color: activeTab === 'INTERACTIVE LIST MESSAGES' ? '#0f172a' : '#64748b', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
        >
          INTERACTIVE LIST MESSAGES
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'CUSTOM AUTO REPLIES' && (
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0' }}>
          
          <div style={{ padding: '24px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem', lineHeight: '1.5', maxWidth: 600 }}>
              This section allows users to create and manage Custom Auto Replies in response to customer chats.<br/>
              Create triggers from keywords, list selections, or button clicks.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={() => { setEditingId(null); setNewReply({ trigger: '', responseType: 'Text', preview: '', buttons: '' }); setShowAddModal(true); }}
                style={{ padding: '10px 20px', background: '#e0e7ff', color: BRAND_BLUE, border: 'none', borderRadius: 24, fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Plus size={18} /> Add new Custom Reply
              </button>
            </div>
          </div>

          {viewMode === 'flow' ? (
            <VisualFlowBuilder 
              customReplies={settings.customReplies} 
              onEdit={handleEditReply}
              onDelete={handleDeleteReply}
              onAddRule={() => { setEditingId(null); setNewReply({ trigger: '', responseType: 'Text', preview: '', buttons: '' }); setShowAddModal(true); }}
            />
          ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '16px 32px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Input Trigger</th>
                  <th style={{ padding: '16px 32px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Auto Response Preview</th>
                  <th style={{ padding: '16px 32px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Response Type</th>
                  <th style={{ padding: '16px 32px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid #e2e8f0', width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {settings.customReplies.map(reply => (
                  <tr key={reply.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '20px 32px', fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                      {reply.trigger}
                    </td>
                    <td style={{ padding: '20px 32px' }}>
                      <div style={{ fontSize: '0.9rem', color: '#475569', marginBottom: reply.buttons ? 8 : 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {reply.responseType === 'Document' && <FileText size={16} color="#ef4444" />}
                        <span style={{ color: reply.responseType === 'Document' ? '#ef4444' : reply.responseType === 'Template' ? '#3b82f6' : '#475569' }}>
                          {reply.preview}
                        </span>
                      </div>
                      {reply.buttons && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {reply.buttons.map((btn, i) => (
                            <span key={i} style={{ background: '#e2e8f0', color: '#334155', fontSize: '0.8rem', padding: '4px 12px', borderRadius: 16 }}>
                              {btn}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '20px 32px' }}>
                      <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.8rem', padding: '4px 12px', borderRadius: 16, fontWeight: 500 }}>
                        {reply.responseType}
                      </span>
                    </td>
                    <td style={{ padding: '20px 32px' }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={() => handleEditReply(reply)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }} title="Edit"><Edit3 size={18} /></button>
                        <button onClick={() => handleDeleteReply(reply.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }} title="Delete"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {settings.customReplies.length === 0 && (
                  <tr><td colSpan="4" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No custom replies configured.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}
      
      {activeTab === 'INTERACTIVE LIST MESSAGES' && (
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#64748b' }}>Interactive List Messages feature is coming soon.</p>
        </div>
      )}

      {/* Media Library Section */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 32, marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#fee2e2', color: '#ef4444', padding: 10, borderRadius: 12, display: 'flex' }}><FileText size={24} /></div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Brochure & Media Files Library</h2>
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploadingFile}
            style={{ background: BRAND_BLUE, color: 'white', border: 'none', padding: '10px 24px', borderRadius: 24, fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: uploadingFile ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)', opacity: uploadingFile ? 0.7 : 1 }}
          >
            {uploadingFile ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            {uploadingFile ? 'Uploading...' : 'Upload New File'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {settings.mediaFiles.map(file => (
            <div key={file.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <FileText size={20} color="#ef4444" />
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>{file.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 2 }}>{file.size} • Uploaded {file.date}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => copyToClipboard(file.url || '')} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 8, color: '#475569', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <LinkIcon size={14} /> Copy Link
                </button>
                <button onClick={() => handleDeleteMedia(file.id, file.storagePath)} style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: 8, color: '#ef4444', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {settings.mediaFiles.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>No media files uploaded yet.</div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#fff', width: 600, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>{editingId ? 'Edit Custom Reply' : 'Configure Custom Reply'}</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleAddReply} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '24px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Trigger Input</label>
                  <input 
                    type="text" 
                    value={newReply.trigger} 
                    onChange={e => setNewReply({...newReply, trigger: e.target.value})}
                    placeholder="Hi, Hey, Hello"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '1rem', outline: 'none' }}
                    required
                  />
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 8 }}>The exact word or phrase that triggers this reply.</div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 12, fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Response Type</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {['Text', 'Buttons', 'Template', 'Document'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewReply({ ...newReply, responseType: type, preview: '', buttons: type === 'Buttons' ? [''] : '' })}
                        style={{
                          padding: '10px 20px',
                          borderRadius: 24,
                          border: newReply.responseType === type ? `2px solid #0f172a` : '1px solid #e2e8f0',
                          background: '#fff',
                          color: newReply.responseType === type ? BRAND_BLUE : '#475569',
                          fontWeight: newReply.responseType === type ? 600 : 500,
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {newReply.responseType === 'Text' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Response Text</label>
                    <textarea 
                      value={newReply.preview}
                      onChange={e => setNewReply({...newReply, preview: e.target.value})}
                      placeholder="Enter the reply message..."
                      style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #cbd5e1', boxSizing: 'border-box', minHeight: 100, resize: 'vertical', fontSize: '1rem', outline: 'none' }}
                      required
                    />
                  </div>
                )}

                {newReply.responseType === 'Buttons' && (
                  <>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Message Text</label>
                      <textarea 
                        value={newReply.preview}
                        onChange={e => setNewReply({...newReply, preview: e.target.value})}
                        placeholder="Hello! Thanks for reaching out."
                        style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #cbd5e1', boxSizing: 'border-box', minHeight: 100, resize: 'vertical', fontSize: '1rem', outline: 'none' }}
                        required
                      />
                    </div>
                    <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <label style={{ display: 'block', marginBottom: 12, fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Buttons (Max 3)</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12 }}>
                        {Array.isArray(newReply.buttons) && newReply.buttons.map((btn, index) => (
                          <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input 
                              type="text" 
                              value={btn} 
                              onChange={e => {
                                const newBtns = [...newReply.buttons];
                                newBtns[index] = e.target.value;
                                setNewReply({...newReply, buttons: newBtns});
                              }}
                              placeholder="New Button"
                              style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '0.95rem', outline: 'none', background: '#fff' }}
                              required
                            />
                            <button type="button" onClick={() => setNewReply({...newReply, buttons: newReply.buttons.filter((_, i) => i !== index)})} style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#94a3b8', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                      {(!Array.isArray(newReply.buttons) || newReply.buttons.length < 3) && (
                        <button type="button" onClick={() => setNewReply({...newReply, buttons: Array.isArray(newReply.buttons) ? [...newReply.buttons, ''] : ['']})} style={{ background: 'none', border: 'none', color: BRAND_BLUE, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, fontSize: '0.9rem' }}>
                          <Plus size={16} /> Add Button
                        </button>
                      )}
                    </div>
                  </>
                )}

                {newReply.responseType === 'Template' && (
                  <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', marginBottom: 12, fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>Select Template</label>
                    <select
                      value={newReply.preview}
                      onChange={e => setNewReply({...newReply, preview: e.target.value})}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #cbd5e1', boxSizing: 'border-box', background: '#fff', marginBottom: 24, fontSize: '1rem', outline: 'none' }}
                      required
                    >
                      <option value="">Select a template...</option>
                      {templates.map(tpl => <option key={tpl.name} value={tpl.name}>{tpl.name}</option>)}
                    </select>
                    
                    {newReply.preview && (
                      <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: 16 }}>Template Preview:</div>
                        {(() => {
                          const tpl = templates.find(t => t.name === newReply.preview);
                          if (!tpl) return <div style={{ color: '#94a3b8' }}>Preview not available</div>;
                          const body = tpl.components?.find(c => c.type === 'BODY')?.text || '';
                          const buttons = tpl.components?.find(c => c.type === 'BUTTONS')?.buttons || [];
                          return (
                            <div>
                              <div style={{ fontSize: '0.95rem', color: '#475569', marginBottom: 16, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{body}</div>
                              {buttons.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {buttons.map((b, i) => (
                                    <div key={i} style={{ padding: '10px', background: '#f1f5f9', color: '#0369a1', textAlign: 'center', borderRadius: 8, fontSize: '0.95rem', fontWeight: 600 }}>{b.text}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {newReply.responseType === 'Document' && (
                  <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', marginBottom: 12, fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>Select Document</label>
                    <select
                      value={newReply.preview}
                      onChange={e => setNewReply({...newReply, preview: e.target.value})}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #cbd5e1', boxSizing: 'border-box', background: '#fff', fontSize: '1rem', outline: 'none' }}
                      required
                    >
                      <option value="">Select a document...</option>
                      {settings.mediaFiles.map(file => <option key={file.id} value={file.name}>{file.name} ({file.size})</option>)}
                    </select>
                  </div>
                )}
                
              </div>
              
              <div style={{ padding: '20px 32px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 20, borderRadius: '0 0 16px 16px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', fontWeight: 600, color: '#475569', cursor: 'pointer', fontSize: '1rem' }}>Cancel</button>
                <button type="submit" style={{ padding: '12px 24px', background: '#10b981', border: 'none', borderRadius: 24, fontWeight: 600, color: '#fff', cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>Save Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
