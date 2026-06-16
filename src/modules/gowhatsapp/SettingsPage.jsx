import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle, XCircle, Phone, Send, AlertCircle, ExternalLink } from 'lucide-react';
import { mockDb } from './mockData';

const BRAND_BLUE = '#2563eb';

export default function SettingsPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Test message
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hello! This is a test message from GO WhatsApp.');
  const [testMode, setTestMode] = useState('template');
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = () => {
    try {
      const statusData = mockDb.getApiStatus();
      setStatus(statusData);
    } catch (error) {
      setStatus({ ok: false, error: 'Failed to connect' });
    } finally {
      setLoading(false);
    }
  };

  const sendTestMessage = () => {
    if (!testPhone.trim()) {
      alert('Enter a phone number');
      return;
    }
    setSending(true);
    setTestResult(null);

    // Mock API call to send test message
    setTimeout(() => {
      setSending(false);
      setTestResult({
        success: true,
        data: { messageId: `test-wa-${Date.now()}` }
      });
    }, 1200);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#64748b' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 24, color: '#0f172a' }}>
        <Settings size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        WhatsApp API Settings
      </h1>

      {/* Connection Status */}
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, marginBottom: 20,
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12, color: '#0f172a' }}>Connection Status</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {status?.ok ? (
            <CheckCircle size={22} color="#16a34a" />
          ) : (
            <XCircle size={22} color="#ef4444" />
          )}
          <span style={{ fontWeight: 500, color: status?.ok ? '#16a34a' : '#ef4444' }}>
            {status?.ok ? 'Connected' : 'Not Connected'}
          </span>
        </div>

        {status?.ok && status.phoneNumbers?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 8 }}>Registered Phone Numbers:</div>
            {status.phoneNumbers.map((p) => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', background: '#f8fafc', borderRadius: 8, marginBottom: 6,
              }}>
                <Phone size={16} color={BRAND_BLUE} />
                <span style={{ fontWeight: 500, color: '#0f172a' }}>{p.display_phone_number}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem',
                  background: p.quality_rating === 'GREEN' ? '#dcfce7' : '#fef3c7',
                  color: p.quality_rating === 'GREEN' ? '#16a34a' : '#d97706',
                }}>
                  Quality: {p.quality_rating || 'N/A'}
                </span>
              </div>
            ))}
          </div>
        )}

        {status?.error && (
          <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#ef4444' }}>
            Error: {status.error}
          </div>
        )}

        <div style={{ marginTop: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, fontSize: '0.85rem', color: '#475569' }}>
          <strong>Business Account ID:</strong> {status?.businessAccountId || 'Not configured'}
          <br />
          <strong>API Token:</strong> {status?.configured ? 'Configured (stored in server .env)' : 'Not configured'}
        </div>
      </div>

      {/* Important Info */}
      <div style={{
        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12,
        padding: 16, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.85rem', color: '#92400e', lineHeight: 1.6 }}>
            <strong>Important WhatsApp API Rules:</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              <li><strong>Template messages required</strong> to message someone first. You cannot send custom text to users who haven't messaged you in the last 24 hours.</li>
              <li><strong>Test phone numbers</strong> can only send to numbers added in your{' '}
                <a
                  href="https://developers.facebook.com/apps/1300990564706914/whatsapp-business/wa-dev-console/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#d97706', textDecoration: 'underline' }}
                >
                  Meta Developer Console <ExternalLink size={11} style={{ verticalAlign: 'middle' }} />
                </a>
                {' '}(Step 1 "To" field).
              </li>
              <li>Add recipient numbers in the console before testing.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Test Message */}
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20,
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12, color: '#0f172a' }}>Send Test Message</h2>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: 4 }}>
            Phone Number (with country code, e.g. 919822XXXXXX)
          </label>
          <input
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="919822XXXXXX"
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Message Type Toggle */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: 6 }}>
            Message Type
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setTestMode('template')}
              style={{
                padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem',
                background: testMode === 'template' ? BRAND_BLUE : '#f1f5f9',
                color: testMode === 'template' ? '#fff' : '#64748b',
                border: 'none', cursor: 'pointer',
              }}
            >
              Template (hello_world)
            </button>
            <button
              onClick={() => setTestMode('text')}
              style={{
                padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem',
                background: testMode === 'text' ? BRAND_BLUE : '#f1f5f9',
                color: testMode === 'text' ? '#fff' : '#64748b',
                border: 'none', cursor: 'pointer',
              }}
            >
              Custom Text
            </button>
          </div>
        </div>

        {testMode === 'template' ? (
          <div style={{
            padding: '12px 16px', background: '#f0fdf4', borderRadius: 8,
            border: '1px solid #bbf7d0', marginBottom: 12, fontSize: '0.85rem', color: '#166534',
          }}>
            Will send the pre-approved <strong>hello_world</strong> template. This works for first-time contacts
            (no 24-hour window needed).
          </div>
        ) : (
          <>
            <div style={{
              padding: '8px 12px', background: '#fef2f2', borderRadius: 8,
              border: '1px solid #fecaca', marginBottom: 8, fontSize: '0.8rem', color: '#dc2626',
            }}>
              Custom text only works if the recipient has messaged your business number in the last 24 hours.
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: 4 }}>
                Message
              </label>
              <textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                rows={3}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: '1px solid #d1d5db', outline: 'none', resize: 'vertical',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>
          </>
        )}

        <button
          onClick={sendTestMessage}
          disabled={sending}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: BRAND_BLUE, color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
            opacity: sending ? 0.6 : 1,
          }}
        >
          <Send size={16} /> {sending ? 'Sending...' : 'Send Test'}
        </button>

        {testResult && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8,
            background: testResult.success ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
            fontSize: '0.85rem',
            color: testResult.success ? '#16a34a' : '#dc2626',
          }}>
            {testResult.success
              ? `Message sent successfully! ID: ${testResult.data?.messageId || 'N/A'}`
              : `Failed: ${testResult.error}`
            }
          </div>
        )}
      </div>
    </div>
  );
}
