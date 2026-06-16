import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Send, CheckCheck, Eye, MessageCircle,
  AlertTriangle, Clock, Users, Zap, ShieldCheck, BarChart3,
  Activity, MousePointerClick, Info, RefreshCw
} from 'lucide-react';
import { mockDb } from './mockData';

const BRAND_BLUE = '#2563eb';
const C = {
  green: '#25D366', blue: '#3b82f6', purple: '#8b5cf6', orange: '#f59e0b',
  red: '#ef4444', teal: '#14b8a6', pink: '#ec4899', indigo: '#6366f1', slate: '#64748b',
};
const CHART_PAL = [C.green, C.blue, C.purple, C.orange, C.red, C.teal, C.pink, C.indigo];

function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }

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

const WebhookHint = () => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.65rem',
    color: C.orange, background: '#fffbeb', padding: '2px 8px', borderRadius: 20,
    border: '1px solid #fde68a', marginTop: 4,
  }}>
    <Info size={10} /> Awaiting webhook data
  </div>
);

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [campaignId, setCampaignId] = useState('');
  const [showMeta, setShowMeta] = useState(false);
  
  // States
  const [campaigns, setCampaigns] = useState([]);
  const [apiStatus, setApiStatus] = useState(null);
  const [conversations, setConversations] = useState([]);
  
  useEffect(() => {
    loadData();
  }, [period, campaignId]);

  const loadData = () => {
    setLoading(true);
    try {
      setCampaigns(mockDb.getCampaigns());
      setApiStatus(mockDb.getApiStatus());
      setConversations(mockDb.getConversations());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, border: `3px solid ${BRAND_BLUE}20`, borderTopColor: BRAND_BLUE,
          borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px',
        }} />
        <div style={{ color: '#64748b' }}>Loading analytics...</div>
      </div>
    </div>
  );

  // Filter campaigns
  const filteredCampaigns = campaignId 
    ? campaigns.filter(c => c.id === campaignId) 
    : campaigns;

  const totalCampaigns = filteredCampaigns.length;
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
  if (failureRate > 5) insights.push({ type: 'danger', text: `${failureRate}% failure rate is high — review contacts list for invalid phone numbers.` });
  if (readRate < 50) insights.push({ type: 'warning', text: `Read rate is ${readRate}%. Try scheduling campaigns around ${bestHourStr} when users are most active.` });
  if (totalInbound > 5) insights.push({ type: 'success', text: `Healthy student engagement — ${totalInbound} replies received this period!` });
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
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <BarChart3 size={28} color={BRAND_BLUE} /> Analytics
          </h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: '0.9rem' }}>
            {selectedCampaignName => null}
            {campaignId 
              ? <>Campaign details · Last {period} days</>
              : <>{totalCampaigns} campaign{totalCampaigns !== 1 ? 's' : ''} · Last {period} days</>
            }
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
              outline: 'none', maxWidth: 200,
            }}
          >
            <option value="">All Campaigns</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />

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
          
          <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />

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
        </div>
      </div>

      {/* Row 1: Hero Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div style={{
          background: `linear-gradient(135deg, ${C.blue}, #2563eb)`, borderRadius: 16,
          padding: '24px 28px', color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, opacity: 0.9, fontSize: '0.9rem' }}>
            <Send size={18} /> Messages Sent
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>{totalSent.toLocaleString()}</div>
          <div style={{ marginTop: 8, fontSize: '0.85rem', opacity: 0.8 }}>
            {totalFailed > 0 ? `${totalFailed} failed (${failureRate}%)` : 'All messages processed'}
          </div>
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${C.green}, #16a34a)`, borderRadius: 16,
          padding: '24px 28px', color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, opacity: 0.9, fontSize: '0.9rem' }}>
            <CheckCheck size={18} /> Delivery Rate
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>{deliveryRate}%</div>
          <div style={{ marginTop: 8, fontSize: '0.85rem', opacity: 0.8 }}>
            {totalDelivered} of {totalSent} delivered
          </div>
        </div>

        <div style={{
          background: `linear-gradient(135deg, ${C.purple}, #7c3aed)`, borderRadius: 16,
          padding: '24px 28px', color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, opacity: 0.9, fontSize: '0.9rem' }}>
            <MessageCircle size={18} /> Engagement
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>{totalInbound}</div>
          <div style={{ marginTop: 8, fontSize: '0.85rem', opacity: 0.8 }}>
            {totalInbound} replies received · {activeConversations} active chats
          </div>
        </div>
      </div>

      {/* Row 2: Secondary stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        {[
          { label: 'Read Messages', value: totalRead, sub: `${readRate}% read`, icon: Eye, color: C.purple },
          { label: 'Button Clicks', value: buttonClicks, sub: 'CTA actions', icon: MousePointerClick, color: C.orange },
          { label: 'Avg Response', value: `${avgResponseTime}m`, sub: 'Active chatbot', icon: Clock, color: C.indigo },
          { label: 'Conversations', value: activeConversations, sub: `${totalUnread} unread`, icon: Users, color: C.teal },
          { label: 'Total Unread', value: totalUnread, sub: 'In inbox list', icon: MessageCircle, color: C.pink },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} style={{
            background: '#fff', borderRadius: 12, padding: '16px 18px',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ background: `${color}12`, borderRadius: 8, padding: 6, display: 'flex' }}>
                <Icon size={16} color={color} />
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{value}</span>
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

      {/* Row 3: Insights Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {insights.map((insight, i) => {
          const ic = insightColors[insight.type];
          return (
            <div key={i} style={{
              padding: '12px 16px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 500,
              background: ic.bg, border: `1px solid ${ic.border}`, color: ic.text, lineHeight: 1.4,
            }}>
              <Zap size={13} style={{ marginRight: 4, verticalAlign: -2, display: 'inline' }} />
              {insight.text}
            </div>
          );
        })}
      </div>

      {/* Row 4: Funnel & Volume Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.2fr', gap: 20, alignItems: 'start' }}>
        {/* Delivery Funnel */}
        <Section title="Delivery Funnel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { label: 'Sent', value: funnel.sent, color: C.blue, icon: Send },
              { label: 'Delivered', value: funnel.delivered, color: C.green, icon: CheckCheck },
              { label: 'Read', value: funnel.read, color: C.purple, icon: Eye },
              { label: 'Replied', value: funnel.replied, color: C.teal, icon: MessageCircle },
            ].map((step, i, arr) => {
              const stepRate = i > 0 && arr[i - 1].value > 0 ? pct(step.value, arr[i - 1].value) : 100;
              const barWidth = arr[0].value > 0 ? Math.max(8, (step.value / arr[0].value) * 100) : (i === 0 ? 100 : 0);
              return (
                <div key={step.label}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
                    <step.icon size={16} color={step.color} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>{step.label}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: step.color }}>{step.value}</span>
                      </div>
                      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${barWidth}%`, background: `linear-gradient(90deg, ${step.color}80, ${step.color})`,
                          borderRadius: 10,
                        }} />
                      </div>
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ textAlign: 'center', paddingLeft: 26, fontSize: '0.65rem', color: stepRate >= 50 ? C.green : C.orange, fontWeight: 700 }}>
                      ↓ {stepRate}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        {/* Daily Volume */}
        <Section title="Message Volume" subtitle="Daily inbound and outbound trends">
          <div style={{ height: 280 }}>
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
      </div>

      {/* Row 5: Campaigns & Details */}
      {campaignPerformance.length > 0 && (
        <Section title="Campaign Performance" subtitle="Delivery and reads metrics comparison">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} width={140} />
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

      {/* Row 6: Send times, types, account quality */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Send times */}
        <Section title="Best Time to Send" subtitle="Hourly read rate distribution">
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyReadRate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} unit="%" />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="readRate" name="Read %" fill={C.green} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

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

      {/* Row 7: Active contacts & Failure reasons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
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

        <Section title="Failure Breakdown" subtitle="Detailed API error logs">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {errorData.map((e, idx) => (
              <div key={idx} style={{ padding: 12, borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 500 }}>{e.name}</span>
                <span style={{ padding: '2px 8px', borderRadius: 4, background: '#fee2e2', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700 }}>
                  {e.value}
                </span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
