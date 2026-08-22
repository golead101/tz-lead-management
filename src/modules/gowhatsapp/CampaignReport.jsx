import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft, CheckCircle, XCircle, Clock, Send, Eye,
  CheckCheck, ArrowRight, AlertTriangle, MessageSquare, Download
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { whatsappDb } from './whatsappDb';
import { useCRM } from '../../context/CRMContext';
import { db } from '../../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const BRAND_BLUE = '#2563eb';
export default function CampaignReport({ campaignId, setSubView }) {
  const [campaign, setCampaign] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Extract engaged contacts modal
  const [extractOpen, setExtractOpen] = useState(false);
  const [extractInclude, setExtractInclude] = useState('delivered');
  const [extractExcludeFailed, setExtractExcludeFailed] = useState(true);
  const [extractOnlyReplied, setExtractOnlyReplied] = useState(false);
  const [extractListName, setExtractListName] = useState('');
  const [extractSubmitting, setExtractSubmitting] = useState(false);

  const { leads } = useCRM();

  const campaignTimeRef = useRef(null);

  useEffect(() => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Listen to Campaign Document
    const unsubCamp = onSnapshot(doc(db, 'whatsapp_campaigns', campaignId), (snap) => {
      if (snap.exists()) {
        const campData = snap.data();
        setCampaign(campData);
        if (campData.createdAt) {
          campaignTimeRef.current = campData.createdAt._seconds 
            ? campData.createdAt._seconds * 1000 
            : new Date(campData.createdAt).getTime();
        }
      }
      setLoading(false);
    }, (err) => {
      console.error('Failed to listen to campaign:', err);
      setLoading(false);
    });

    // 2. Listen to Recipients Document
    const unsubRecs = onSnapshot(doc(db, 'whatsapp_recipients', campaignId), (snap) => {
      if (snap.exists()) {
        const recsData = snap.data() || {};
        const list = recsData.recipients || [];
        setRecipients(list);

        // Sync local storage so other dashboard views reflect the new status
        try {
          const allRecipients = whatsappDb.getRecipients();
          allRecipients[campaignId] = list;
          localStorage.setItem('gowha_recipients', JSON.stringify(allRecipients));
        } catch (e) {}
      }
    }, (err) => {
      console.error('Failed to listen to recipients:', err);
    });

    return () => {
      unsubCamp();
      unsubRecs();
    };
  }, [campaignId]);

  // Decoupled computation of replied flag — runs dynamically on changes without triggering Firestore subscriptions
  const mappedRecipients = useMemo(() => {
    const campaignTime = campaignTimeRef.current || Date.now();

    const getMsgTimestamp = (msg) => {
      if (msg.timestamp) {
        return typeof msg.timestamp === 'object' && msg.timestamp._seconds
          ? msg.timestamp._seconds * 1000
          : new Date(msg.timestamp).getTime();
      }
      const match = msg.id ? msg.id.match(/\d+$/) : null;
      return match ? parseInt(match[0], 10) : Date.now();
    };

    return recipients.map(r => {
      const cleanRepPhone = r.phone.replace(/\D/g, '');
      const lead = leads.find(l => l.phone && l.phone.replace(/\D/g, '') === cleanRepPhone);
      const msgs = lead?.whatsappMessages || [];
      const hasReplied = msgs.some(m => {
        const isIncoming = m.sender === 'lead' || m.direction === 'inbound';
        if (!isIncoming) return false;
        const msgTime = getMsgTimestamp(m);
        return msgTime >= campaignTime - 5000; // 5s buffer
      });
      return {
        ...r,
        replied: hasReplied
      };
    });
  }, [recipients, leads]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#64748b' }}>Loading...</div>;
  }

  if (!campaign) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Campaign not found</div>;
  }

  const successRate = campaign.totalRecipients > 0 ? Math.round((campaign.sent / campaign.totalRecipients) * 100) : 0;
  const deliveryRate = campaign.sent > 0 ? Math.round((campaign.delivered / campaign.sent) * 100) : 0;
  const readRate = campaign.delivered > 0 ? Math.round((campaign.read / campaign.delivered) * 100) : 0;

  const matchesFilter = (r, key) => {
    switch (key) {
      case 'all': return true;
      case 'sent': return r.status !== 'failed';
      case 'delivered': return r.status === 'delivered' || r.status === 'read';
      case 'read': return r.status === 'read';
      case 'replied': return !!r.replied;
      case 'failed': return r.status === 'failed';
      default: return true;
    }
  };

  const filteredRecipients = mappedRecipients.filter(r => matchesFilter(r, filter));

  // Funnel data
  const funnelSteps = [
    { name: 'Sent', value: campaign.sent || 0, color: '#3b82f6', icon: Send },
    { name: 'Delivered', value: campaign.delivered || 0, color: BRAND_BLUE, icon: CheckCheck },
    { name: 'Read', value: campaign.read || 0, color: '#8b5cf6', icon: Eye },
  ];

  // Error breakdown
  const errorMap = {};
  mappedRecipients.filter(r => r.status === 'failed').forEach(r => {
    const key = r.errorCode ? `${r.errorCode}: ${r.error || 'Unknown'}` : (r.error || 'Unknown error');
    errorMap[key] = (errorMap[key] || 0) + 1;
  });
  const errorData = Object.entries(errorMap)
    .map(([name, value]) => ({ name: name.length > 35 ? name.substring(0, 35) + '...' : name, value }))
    .sort((a, b) => b.value - a.value);

  const statusCounts = {
    all: recipients.length,
    sent: recipients.filter(r => matchesFilter(r, 'sent')).length,
    delivered: recipients.filter(r => matchesFilter(r, 'delivered')).length,
    read: recipients.filter(r => matchesFilter(r, 'read')).length,
    replied: recipients.filter(r => matchesFilter(r, 'replied')).length,
    failed: recipients.filter(r => matchesFilter(r, 'failed')).length,
  };

  const handleExtract = () => {
    if (extractSubmitting) return;
    setExtractSubmitting(true);

    setTimeout(() => {
      // Build list of extracted contacts
      let extracted = recipients.filter(r => matchesFilter(r, extractInclude));
      if (extractExcludeFailed) {
        extracted = extracted.filter(r => r.status !== 'failed');
      }
      if (extractOnlyReplied) {
        extracted = extracted.filter(r => !!r.replied);
      }

      if (extracted.length === 0) {
        setExtractSubmitting(false);
        alert('No contacts match the extraction filters.');
        return;
      }

      const listId = `list-${Date.now()}`;
      const newListName = extractListName || `${campaign.name} - Extracted`;
      
      const newLists = [
        ...whatsappDb.getContactLists(),
        {
          id: listId,
          name: newListName,
          contactCount: extracted.length,
          columns: ['name', 'phone'],
          createdAt: new Date().toISOString()
        }
      ];

      const allContacts = whatsappDb.getContacts();
      allContacts[listId] = extracted.map((r, i) => ({ id: `c-${Date.now()}-${i}`, name: r.name, phone: r.phone }));

      whatsappDb.saveContactLists(newLists);
      whatsappDb.saveContacts(allContacts);

      setExtractSubmitting(false);
      setExtractOpen(false);

      if (window.confirm(`Created list "${newListName}" with ${extracted.length} contacts. Open it now?`)) {
        setSubView('contacts');
      }
    }, 1200);
  };

  const statusIcon = (status) => {
    switch (status) {
      case 'read': return <Eye size={14} color="#8b5cf6" />;
      case 'delivered': return <CheckCheck size={14} color={BRAND_BLUE} />;
      case 'sent': return <CheckCircle size={14} color="#3b82f6" />;
      case 'failed': return <XCircle size={14} color="#ef4444" />;
      default: return <Clock size={14} color="#94a3b8" />;
    }
  };

  const statusLabel = (status) => {
    const map = {
      read: { bg: '#f3e8ff', color: '#7c3aed' },
      delivered: { bg: '#dcfce7', color: '#16a34a' },
      sent: { bg: '#eff6ff', color: '#3b82f6' },
      failed: { bg: '#fef2f2', color: '#dc2626' },
    };
    const s = map[status] || { bg: '#f1f5f9', color: '#64748b' };
    return (
      <span style={{
        padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600,
        background: s.bg, color: s.color, display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        {statusIcon(status)} {status}
      </span>
    );
  };

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <button
        onClick={() => setSubView('campaigns')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#64748b', marginBottom: 16, padding: 0,
        }}
      >
        <ArrowLeft size={18} /> Back to Campaigns
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{campaign.name}</h1>
          <span style={{
            padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
            background: campaign.status === 'completed' ? '#dcfce7' : '#fef3c7',
            color: campaign.status === 'completed' ? '#16a34a' : '#d97706',
          }}>
            {campaign.status}
          </span>
        </div>
        <button
          onClick={() => {
            setExtractListName(`${campaign.name} - engaged`);
            setExtractOpen(true);
          }}
          style={{
            padding: '8px 14px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
            background: '#0f172a', color: '#fff', border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
          }}
        >
          <Download size={14} /> Extract list
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Total', value: campaign.totalRecipients || 0, icon: Send, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Sent', value: campaign.sent || 0, icon: CheckCircle, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Delivered', value: campaign.delivered || 0, icon: CheckCheck, color: BRAND_BLUE, bg: `${BRAND_BLUE}10` },
          { label: 'Read', value: campaign.read || 0, icon: Eye, color: '#8b5cf6', bg: '#f3e8ff' },
          { label: 'Replied', value: campaign.replied || 0, icon: MessageSquare, color: '#c2410c', bg: '#fff7ed' },
          { label: 'Failed', value: campaign.failed || 0, icon: XCircle, color: '#ef4444', bg: '#fef2f2' },
          { label: 'Success', value: `${successRate}%`, icon: Clock, color: BRAND_BLUE, bg: `${BRAND_BLUE}08` },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={{
            background: bg, borderRadius: 12, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Icon size={20} color={color} />
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Delivery Funnel */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, marginBottom: 24 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, color: '#0f172a' }}>Delivery Funnel</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
          {funnelSteps.map((step, i) => {
            const pctOfPrev = i > 0 && funnelSteps[i - 1].value > 0
              ? Math.round((step.value / funnelSteps[i - 1].value) * 100)
              : 100;
            return (
              <div key={step.name} style={{ flex: 1, minWidth: '180px', textAlign: 'center', position: 'relative', marginBottom: 10 }}>
                <div style={{
                  background: `${step.color}12`, borderRadius: 12, padding: '16px 10px', margin: '0 6px',
                  border: `2px solid ${step.color}25`,
                }}>
                  <step.icon size={20} color={step.color} style={{ marginBottom: 4 }} />
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: step.color }}>{step.value.toLocaleString()}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{step.name}</div>
                  {i > 0 && (
                    <div style={{
                      fontSize: '0.7rem', fontWeight: 700, color: step.color, marginTop: 6,
                      background: `${step.color}12`, borderRadius: 20, padding: '2px 8px', display: 'inline-block',
                    }}>
                      {pctOfPrev}% of {funnelSteps[i - 1].name.toLowerCase()}
                    </div>
                  )}
                </div>
                {i < funnelSteps.length - 1 && (
                  <div style={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>
                    <ArrowRight size={14} color="#cbd5e1" />
                  </div>
                )}
              </div>
            );
          })}
          {campaign.failed > 0 && (
            <div style={{ flex: 1, minWidth: '180px', textAlign: 'center', marginBottom: 10 }}>
              <div style={{
                background: '#fef2f2', borderRadius: 12, padding: '16px 10px', margin: '0 6px',
                border: '2px solid #fecaca',
              }}>
                <XCircle size={20} color="#ef4444" style={{ marginBottom: 4 }} />
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{campaign.failed}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Failed</div>
              </div>
            </div>
          )}
        </div>

        {/* Rate bars */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Delivery Rate', value: deliveryRate, color: BRAND_BLUE },
            { label: 'Read Rate', value: readRate, color: '#8b5cf6' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#475569' }}>{label}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color }}>{value}%</span>
              </div>
              <div style={{ height: 6, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.min(value, 100)}%`,
                  background: `linear-gradient(90deg, ${color}80, ${color})`,
                  borderRadius: 10,
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error Breakdown Chart */}
      {errorData.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, marginBottom: 24 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={16} color="#ef4444" /> Failure Breakdown
          </h2>
          <div style={{ height: Math.max(120, errorData.length * 40), width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={1}>
              <BarChart data={errorData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} width={220} />
                <Tooltip />
                <Bar dataKey="value" fill="#ef4444" radius={[0, 6, 6, 0]} name="Failures">
                  {errorData.map((_, i) => (
                    <Cell key={i} fill={`rgba(239, 68, 68, ${Math.max(0.4, 1 - i * 0.15)})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Message Preview */}
      {campaign.message && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#475569', marginBottom: 8 }}>Message Template Preview</div>
          <div style={{
            background: '#dcf8c6', padding: '10px 14px', borderRadius: '10px 10px 4px 10px',
            maxWidth: 500, fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap',
            boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)'
          }}>
            {campaign.message}
          </div>
        </div>
      )}

      {/* Recipients Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Recipients ({filteredRecipients.length})</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {['all', 'sent', 'delivered', 'read', 'replied', 'failed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 500,
                  background: filter === f ? BRAND_BLUE : '#f1f5f9',
                  color: filter === f ? '#fff' : '#64748b',
                  border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                }}
              >
                {f} {f !== 'all' ? `(${statusCounts[f] || 0})` : ''}
              </button>
            ))}
          </div>
        </div>

        {filteredRecipients.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8' }}>
            No recipients in this filter
          </div>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                  <th style={{ textAlign: 'left', padding: '8px 16px' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '8px 16px' }}>Phone</th>
                  <th style={{ textAlign: 'center', padding: '8px 16px' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '8px 16px' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecipients.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '10px 16px', color: '#0f172a' }}>{r.name || '-'}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: '#0f172a' }}>{r.phone}</td>
                    <td style={{ textAlign: 'center', padding: '10px 16px' }}>
                      <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
                        {statusLabel(r.status)}
                        {r.replied && (
                          <span style={{
                            padding: '3px 8px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600,
                            background: '#fff7ed', color: '#c2410c',
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                          }}>
                            <MessageSquare size={11} /> replied
                          </span>
                        )}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: r.error ? '#ef4444' : '#94a3b8' }}>
                      {r.status === 'scheduled' && campaign.scheduledFor 
                        ? new Date(campaign.scheduledFor).toLocaleString() 
                        : (r.error ? r.error : (r.messageId ? `ID: ${r.messageId.substring(0, 16)}...` : '-'))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {extractOpen && (
        <div
          onClick={() => !extractSubmitting && setExtractOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 14, padding: 24, width: 'min(520px, 92vw)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Create contact list from this campaign</h3>
              <button
                onClick={() => setExtractOpen(false)}
                disabled={extractSubmitting}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
              >
                <XCircle size={20} />
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 16 }}>
              Build a fresh list of recipients you can re-target.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Who to include
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { key: 'read', label: `Read (${statusCounts.read})`, hint: 'Openers' },
                  { key: 'delivered', label: `Delivered (${statusCounts.delivered})`, hint: 'Reached handsets' },
                  { key: 'replied', label: `Replied (${statusCounts.replied})`, hint: 'Engaged users' },
                  { key: 'failed', label: `Failed (${statusCounts.failed})`, hint: 'Error logs' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setExtractInclude(opt.key)}
                    style={{
                      textAlign: 'left', padding: '10px 12px', borderRadius: 8, fontSize: '0.82rem',
                      background: extractInclude === opt.key ? '#ecfdf5' : '#f8fafc',
                      border: `1px solid ${extractInclude === opt.key ? BRAND_BLUE : '#e2e8f0'}`,
                      color: '#0f172a', cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    <div>{opt.label}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 400 }}>{opt.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                List name
              </label>
              <input
                type="text"
                value={extractListName}
                onChange={e => setExtractListName(e.target.value)}
                placeholder="List name..."
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setExtractOpen(false)}
                disabled={extractSubmitting}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
                  background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExtract}
                disabled={extractSubmitting}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700,
                  background: BRAND_BLUE, color: '#fff', border: 'none', cursor: 'pointer',
                  opacity: extractSubmitting ? 0.7 : 1,
                }}
              >
                {extractSubmitting ? 'Creating list...' : 'Create List'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
