import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Send, XCircle, BarChart3, Plus, MessageCircle, Eye, CheckCheck, TrendingUp,
  AlertTriangle, Clock, Users, Zap, ShieldCheck, Activity, RefreshCw, Info
} from 'lucide-react';
import { mockDb } from './mockData';

const BRAND_BLUE = '#2563eb';
const C = {
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
  orange: '#f59e0b',
  red: '#ef4444',
  teal: '#14b8a6',
  pink: '#ec4899',
  indigo: '#6366f1',
  slate: '#64748b',
};

const CHART_PAL = [C.green, C.blue, C.purple, C.orange, C.red, C.teal, C.pink, C.indigo];

function pct(a, b) {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
      padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    }}>
      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#475569' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          {p.name}: <strong>{p.value?.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
};

const Section = ({ children, title, subtitle, right, style }) => (
  <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 24px', ...style }}>
    {title && (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>{title}</h3>
          {subtitle && <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0' }}>{subtitle}</p>}
        </div>
        {right}
      </div>
    )}
    {children}
  </div>
);

export default function GoWhatsAppDashboard({ setSubView, navigateToReport }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [period, setPeriod] = useState(30);
  const [campaignId, setCampaignId] = useState('');
  const [showMeta, setShowMeta] = useState(false);

  useEffect(() => {
    loadData();
  }, [period, campaignId]);

  const loadData = () => {
    setLoading(true);
    try {
      setCampaigns(mockDb.getCampaigns());
      setApiStatus(mockDb.getApiStatus());
      setConversations(mockDb.getConversations());
    } catch (error) {
      console.error('Failed to load dashboard mock data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#64748b' }}>
        Loading dashboard metrics...
      </div>
    );
  }

  // Filter campaigns
  const filteredCampaigns = campaignId 
    ? campaigns.filter(c => c.id === campaignId) 
    : campaigns;

  const totalSent = filteredCampaigns.reduce((s, c) => s + (c.sent || 0), 0);
  const totalFailed = filteredCampaigns.reduce((s, c) => s + (c.failed || 0), 0);
  const totalDelivered = filteredCampaigns.reduce((s, c) => s + (c.delivered || 0), 0);
  const totalRead = filteredCampaigns.reduce((s, c) => s + (c.read || 0), 0);
  
  const deliveryRate = totalSent > 0 ? pct(totalDelivered, totalSent) : 0;
  const readRate = totalDelivered > 0 ? pct(totalRead, totalDelivered) : 0;
  const failureRate = totalSent > 0 ? pct(totalFailed, totalSent) : 0;

  // Conversations and Inbound
  const activeConversations = conversations.length;
  const totalInbound = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0) + 15; // mock replies count
  const buttonClicks = Math.round(totalRead * 0.25); // estimate
  const avgResponseTime = 8; // minutes
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  // Delivery funnel
  const funnel = {
    sent: totalSent,
    delivered: totalDelivered,
    read: totalRead,
    replied: totalInbound,
    failed: totalFailed
  };

  // Mock message volume
  const dailyVolume = Array.from({ length: 14 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - idx));
    const dateStr = d.toISOString().split('T')[0];
    return {
      date: dateStr,
      outbound: Math.round(20 + Math.random() * 80),
      inbound: Math.round(5 + Math.random() * 20)
    };
  });

  // Mock hourly read rate
  const hourlyReadRate = Array.from({ length: 24 }).map((_, hour) => {
    let base = 10;
    if (hour >= 9 && hour <= 18) base = 65 + Math.random() * 20; // peak office hours
    else if (hour >= 19 && hour <= 22) base = 50 + Math.random() * 15;
    return {
      hour,
      sent: 100,
      read: Math.round(base),
      readRate: Math.round(base)
    };
  });

  const bestHour = hourlyReadRate.reduce((best, h) => h.readRate > best.readRate ? h : best, { hour: 0, readRate: 0 });
  const bestHourStr = `${bestHour.hour.toString().padStart(2, '0')}:00`;

  // Mock error breakdown
  const errorData = [
    { name: '131026: Inactive WhatsApp account', value: 8 },
    { name: '131042: Media upload failure', value: 3 },
    { name: '131051: Template format mismatch', value: 2 },
  ];

  // Campaign Performance list
  const campaignPerformance = campaigns.map(c => ({
    name: c.name,
    sent: c.sent || 0,
    delivered: c.delivered || 0,
    read: c.read || 0,
    failed: c.failed || 0,
    replied: c.replied || 0,
    total: c.totalRecipients || 0
  }));

  // Message Types pie chart data
  const messageTypeData = [
    { name: 'Text Message', value: Math.round(totalSent * 0.4), fill: C.blue },
    { name: 'Image Template', value: Math.round(totalSent * 0.3), fill: C.green },
    { name: 'Document Template', value: Math.round(totalSent * 0.2), fill: C.purple },
    { name: 'Utility Template', value: Math.round(totalSent * 0.1), fill: C.orange }
  ];

  // Top Contacts list
  const topContacts = conversations.map((c, i) => ({
    name: c.contactName,
    phone: c.phone,
    sent: 4 + i * 2,
    replied: 2 + i * 3,
  }));

  // Meta Insights mock data
  const metaInsights = [
    {
      title: 'Messages Sent (Meta API)',
      values: Array.from({ length: 7 }).map((_, i) => ({ value: 120 + i * 15, end_time: `2026-06-1${i}T00:00:00` })),
      description: 'Total number of messages successfully delivered from business API.',
    },
    {
      title: 'Messages Received (Meta API)',
      values: Array.from({ length: 7 }).map((_, i) => ({ value: 30 + i * 8, end_time: `2026-06-1${i}T00:00:00` })),
      description: 'Incoming user messages processed by webhook handlers.',
    },
    {
      title: 'Messaging Cost (Simulated)',
      values: Array.from({ length: 7 }).map((_, i) => ({ value: Math.round(5 + i * 1.5), end_time: `2026-06-1${i}T00:00:00` })),
      description: 'Meta utility/marketing category-based conversations cost ($).',
    }
  ];

  // Insights messages
  const insights = [];
  if (failureRate > 5) {
    insights.push({ type: 'danger', text: `${failureRate}% failure rate is high — review contacts list for invalid phone numbers.` });
  }
  insights.push({ type: 'success', text: `Healthy student engagement — ${totalInbound} replies received this period!` });
  insights.push({ type: 'info', text: `Peak reading times detected around ${bestHourStr} (${bestHour.readRate}% open rate).` });

  const insightColors = {
    success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#d97706' },
    info: { bg: '#f0f9ff', border: '#bae6fd', text: '#0369a1' },
    danger: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' }
  };

  const phoneQuality = apiStatus && apiStatus.phoneNumbers?.[0] ? apiStatus.phoneNumbers[0] : null;
  const qualityColor = phoneQuality?.quality_rating === 'GREEN' ? C.green : C.orange;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>WhatsApp Dashboard</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: '0.9rem' }}>
            Bulk messaging, campaigns & analytics overview
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Campaign Filter */}
          <select
            value={campaignId}
            onChange={e => setCampaignId(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
              border: '1px solid #e2e8f0', background: campaignId ? `${BRAND_BLUE}10` : '#f8fafc',
              color: campaignId ? BRAND_BLUE : '#64748b', cursor: 'pointer',
              outline: 'none', maxWidth: 180,
            }}
          >
            <option value="">All Campaigns</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button 
            onClick={() => setShowMeta(!showMeta)} 
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              background: showMeta ? C.indigo : '#fff', color: showMeta ? '#fff' : '#64748b',
              border: `1px solid ${showMeta ? C.indigo : '#e2e8f0'}`, transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <Activity size={14} /> Meta Insights {showMeta ? 'On' : 'Off'}
          </button>
          
          <button onClick={loadData} style={{ padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Refresh">
            <RefreshCw size={16} color="#64748b" />
          </button>

          {[7, 14, 30, 90].map(d => (
            <button key={d} onClick={() => setPeriod(d)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              background: period === d ? BRAND_BLUE : '#f8fafc', color: period === d ? '#fff' : '#64748b',
              border: period === d ? 'none' : '1px solid #e2e8f0', transition: 'all 0.15s',
            }}>
              {d}D
            </button>
          ))}

          <button
            onClick={() => setSubView('new-campaign')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: BRAND_BLUE, color: '#fff', border: 'none',
              padding: '8px 16px', borderRadius: 8, fontWeight: 600,
              cursor: 'pointer', fontSize: '0.85rem',
            }}
          >
            <Plus size={16} /> New Campaign
          </button>
        </div>
      </div>

      {/* API Status Alert */}
      {apiStatus && !apiStatus.ok && (
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
          fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8
        }}>
          <AlertTriangle size={16} />
          WhatsApp API not connected. Go to Settings to configure your access token.
        </div>
      )}

      {/* Row 1: High-fidelity Gradient Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', borderRadius: 20,
          padding: '24px 28px', color: '#fff', position: 'relative', overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(37, 99, 235, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, opacity: 0.9, fontSize: '0.9rem', fontWeight: 600 }}>
            <Send size={18} /> Messages Sent
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>{totalSent.toLocaleString()}</div>
          <div style={{ marginTop: 8, fontSize: '0.85rem', opacity: 0.8 }}>
            {totalFailed > 0 ? `${totalFailed} failed (${failureRate}%)` : 'All messages processed'}
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #22c55e, #15803d)', borderRadius: 20,
          padding: '24px 28px', color: '#fff', position: 'relative', overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(34, 197, 94, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, opacity: 0.9, fontSize: '0.9rem', fontWeight: 600 }}>
            <CheckCheck size={18} /> Delivery Rate
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>{deliveryRate}%</div>
          <div style={{ marginTop: 8, fontSize: '0.85rem', opacity: 0.8 }}>
            {totalDelivered} of {totalSent} delivered
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #a855f7, #6d28d9)', borderRadius: 20,
          padding: '24px 28px', color: '#fff', position: 'relative', overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(168, 85, 247, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, opacity: 0.9, fontSize: '0.9rem', fontWeight: 600 }}>
            <MessageCircle size={18} /> Engagement
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>{totalInbound}</div>
          <div style={{ marginTop: 8, fontSize: '0.85rem', opacity: 0.8 }}>
            {totalInbound} replies received · {activeConversations} active chats
          </div>
        </div>
      </div>

      {/* Row 2: Secondary border white cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        {[
          { label: 'Read Messages', value: totalRead, sub: `${readRate}% read`, icon: Eye, color: C.purple, link: 'campaigns' },
          { label: 'Button Clicks', value: buttonClicks, sub: 'CTA actions', icon: Zap, color: C.orange },
          { label: 'Avg Response', value: `${avgResponseTime}m`, sub: 'Active chatbot', icon: Clock, color: C.indigo, link: 'chatbot' },
          { label: 'Conversations', value: activeConversations, sub: `${totalUnread} unread`, icon: Users, color: C.teal, link: 'inbox' },
          { label: 'Total Unread', value: totalUnread, sub: 'in inbox list', icon: MessageCircle, color: C.pink, link: 'inbox' },
        ].map(({ label, value, sub, icon: Icon, color, link }) => (
          <div 
            key={label} 
            onClick={() => link && setSubView(link)}
            style={{
              background: '#fff', borderRadius: 16, padding: '18px 20px',
              border: '1px solid #e2e8f0', cursor: link ? 'pointer' : 'default',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (link) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ background: `${color}12`, borderRadius: 10, padding: 8, display: 'flex' }}>
                <Icon size={18} color={color} />
              </div>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>{label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{value}</span>
              {sub && <span style={{ fontSize: '0.75rem', fontWeight: 600, color }}>{sub}</span>}
            </div>
          </div>
        ))}
      </div>



      {/* Meta Insights Panel */}
      {showMeta && (
        <Section title="Meta Cloud Insights" subtitle="Simulated Meta business account API health stats">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {metaInsights.map((insight, idx) => {
              const totalValue = insight.values.reduce((sum, v) => sum + v.value, 0);
              const chartData = insight.values.map((v, i) => ({ date: `06/${10+i}`, value: v.value }));
              return (
                <div key={idx} style={{ padding: '16px', borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                    {insight.title}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>
                    {idx === 2 ? `$${totalValue}` : totalValue}
                  </div>
                  <div style={{ height: 60 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <Area type="monotone" dataKey="value" stroke={CHART_PAL[idx % CHART_PAL.length]} fill={`${CHART_PAL[idx % CHART_PAL.length]}20`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 8 }}>
                    {insight.description}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Row 4: Daily Volume Chart */}
      <Section title="Message Volume" subtitle="Daily inbound and outbound trends">
        <div style={{ height: 264 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyVolume}>
              <defs>
                <linearGradient id="outG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.blue} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="inG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.green} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
              <Area type="monotone" dataKey="outbound" stroke={C.blue} fill="url(#outG)" strokeWidth={2} name="Sent" />
              <Area type="monotone" dataKey="inbound" stroke={C.green} fill="url(#inG)" strokeWidth={2} name="Replies" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>



      {/* Row 6: Campaigns & Details */}
      {campaignPerformance.length > 0 && (
        <Section title="Campaign Performance" subtitle="Delivery and reads metrics comparison">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
            <div style={{ height: 264 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} width={120} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="sent" fill={C.blue} name="Sent" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="delivered" fill={C.green} name="Delivered" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="read" fill={C.purple} name="Read" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Campaign</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Sent</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Delivered</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Read</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignPerformance.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 500, color: '#0f172a' }}>{c.name}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px', color: C.blue, fontWeight: 600 }}>{c.sent}</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px', color: C.green, fontWeight: 600 }}>{pct(c.delivered, c.sent)}%</td>
                      <td style={{ textAlign: 'center', padding: '10px 8px', color: C.purple, fontWeight: 600 }}>{pct(c.read, c.delivered)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Section>
      )}

      {/* Row 7: Message formats & Quality health */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Message Types */}
        <Section title="Message Types" subtitle="Content format distributions">
          <div style={{ display: 'flex', alignItems: 'center', height: 200 }}>
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie data={messageTypeData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                  {messageTypeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
              {messageTypeData.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: item.fill }} />
                  <span style={{ color: '#475569' }}>{item.name}: <strong>{item.value}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Quality Health */}
        <Section title="Account Health">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '14px', borderRadius: 12, background: `${qualityColor}10`,
            }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: qualityColor }} />
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: qualityColor }}>
                {phoneQuality?.quality_rating || 'GREEN'}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Quality</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.85rem' }}>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: 2 }}>Status</div>
                <div style={{ fontWeight: 700, color: C.green }}>{phoneQuality?.status || 'CONNECTED'}</div>
              </div>
              <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginBottom: 2 }}>Limit</div>
                <div style={{ fontWeight: 700, color: C.blue }}>10K/day</div>
              </div>
            </div>

            {phoneQuality?.verifiedName && (
              <div style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center' }}>
                <ShieldCheck size={14} style={{ verticalAlign: -2, marginRight: 4, display: 'inline' }} color={C.green} />
                {phoneQuality.verifiedName}
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* Row 8: Most Active Contacts */}
      <Section title="Most Active Contacts" subtitle="By inbound replies volume">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>
              <th style={{ textAlign: 'left', padding: '8px' }}>Contact</th>
              <th style={{ textAlign: 'center', padding: '8px' }}>Outbound</th>
              <th style={{ textAlign: 'center', padding: '8px' }}>Inbound</th>
            </tr>
          </thead>
          <tbody>
            {topContacts.map((c, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '10px 8px', fontWeight: 500, color: '#0f172a' }}>{c.name}</td>
                <td style={{ textAlign: 'center', padding: '10px 8px' }}>{c.sent}</td>
                <td style={{ textAlign: 'center', padding: '10px 8px', color: C.green, fontWeight: 600 }}>{c.replied}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
