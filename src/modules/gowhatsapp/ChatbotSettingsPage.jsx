import React, { useState, useEffect } from 'react';
import { Bot, Save, Loader2, FileText, Phone, List, CheckCircle } from 'lucide-react';
import { mockDb } from './mockData';

const BRAND_BLUE = '#2563eb';

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

const textareaStyle = {
  ...inputStyle,
  resize: 'none',
  fontFamily: 'inherit',
};

const cardStyle = {
  background: '#fff',
  padding: 24,
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

export default function ChatbotSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    welcomeTemplate: '',
    coursesText: '',
    feeDetails: '',
    counselorPhone: '',
    brochureUrl: '',
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = () => {
    try {
      const data = mockDb.getChatbotSettings();
      setSettings(data);
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
      mockDb.saveChatbotSettings(settings);
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: BRAND_BLUE, animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: 12, background: '#eff6ff', borderRadius: 12, color: BRAND_BLUE, display: 'flex' }}>
            <Bot size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Chatbot Auto-Replies</h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>Configure automated responses and menu flows</p>
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
              value={settings.welcomeTemplate}
              onChange={(e) => setSettings({ ...settings, welcomeTemplate: e.target.value })}
              style={inputStyle}
              placeholder="e.g. welcome_message"
            />
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Must match the approved template name in Meta Business Manager</p>
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
              value={settings.counselorPhone}
              onChange={(e) => setSettings({ ...settings, counselorPhone: e.target.value })}
              style={inputStyle}
              placeholder="+91 XXXXX XXXXX"
            />
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Phone number users will reach when calling a counselor</p>
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
              value={settings.coursesText}
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
              value={settings.feeDetails}
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
              value={settings.brochureUrl}
              onChange={(e) => setSettings({ ...settings, brochureUrl: e.target.value })}
              style={inputStyle}
              placeholder="https://firebasestorage.googleapis.com/..."
            />
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Direct link to your PDF brochure file</p>
          </div>
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, right: 32,
          padding: '12px 24px', borderRadius: 12,
          background: toast.type === 'success' ? '#0f172a' : '#ef4444',
          color: '#fff', fontWeight: 600, fontSize: '0.9rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          zIndex: 1000,
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
