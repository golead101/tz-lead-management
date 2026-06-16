import React, { useState, useEffect } from 'react';
import { Send, XCircle, BarChart3, Plus, MessageCircle, Eye, CheckCheck, TrendingUp } from 'lucide-react';
import { mockDb } from './mockData';

const BRAND_BLUE = '#2563eb';

export default function GoWhatsAppDashboard({ setSubView, navigateToReport }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const camps = mockDb.getCampaigns();
      const status = mockDb.getApiStatus();
      const convos = mockDb.getConversations();
      
      const unread = convos.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      
      setCampaigns(camps);
      setApiStatus(status);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to load dashboard mock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSent = campaigns.reduce((s, c) => s + (c.sent || 0), 0);
  const totalFailed = campaigns.reduce((s, c) => s + (c.failed || 0), 0);
  const totalDelivered = campaigns.reduce((s, c) => s + (c.delivered || 0), 0);
  const totalRead = campaigns.reduce((s, c) => s + (c.read || 0), 0);
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;

  const stats = [
    { label: 'Total Campaigns', value: campaigns.length, icon: BarChart3, color: BRAND_BLUE, link: 'campaigns' },
    { label: 'Unread Messages', value: unreadCount, icon: MessageCircle, color: '#8b5cf6', link: 'inbox' },
    { label: 'Messages Sent', value: totalSent, icon: Send, color: '#3b82f6' },
    { label: 'Delivered', value: totalDelivered, icon: CheckCheck, color: '#10b981', sub: `${deliveryRate}%` },
    { label: 'Read', value: totalRead, icon: Eye, color: '#8b5cf6', sub: `${readRate}%` },
    { label: 'Failed', value: totalFailed, icon: XCircle, color: '#ef4444' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#64748b' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>WhatsApp</h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>Bulk messaging & campaign management</p>
        </div>
        <button
          onClick={() => setSubView('new-campaign')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: BRAND_BLUE, color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: 10, fontWeight: 600,
            cursor: 'pointer', fontSize: '0.9rem',
          }}
        >
          <Plus size={18} /> New Campaign
        </button>
      </div>

      {/* API Status */}
      {apiStatus && !apiStatus.ok && (
        <div style={{
          padding: '12px 16px', borderRadius: 10, marginBottom: 20,
          background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
        }}>
          WhatsApp API not connected. Go to Settings to configure your access token.
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {stats.map((item) => (
          <div
            key={item.label}
            onClick={() => item.link && setSubView(item.link)}
            style={{
              background: '#fff', borderRadius: 12, padding: '20px 24px',
              border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 16,
              cursor: item.link ? 'pointer' : 'default',
              transition: 'box-shadow 0.15s',
            }}
            onMouseEnter={e => { if (item.link) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ background: `${item.color}15`, borderRadius: 10, padding: 10 }}>
              <item.icon size={22} color={item.color} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{item.value}</span>
                {item.sub && <span style={{ fontSize: '0.8rem', fontWeight: 600, color: item.color }}>{item.sub}</span>}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Analytics Link */}
      {campaigns.length > 0 && (
        <div
          onClick={() => setSubView('analytics')}
          style={{
            background: `linear-gradient(135deg, ${BRAND_BLUE}12, #8b5cf612)`,
            borderRadius: 12, padding: '16px 20px', marginBottom: 20, cursor: 'pointer',
            border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            transition: 'box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={20} color={BRAND_BLUE} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>View Full Analytics</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Delivery funnel, read rates, response times, engagement insights & more
              </div>
            </div>
          </div>
          <span style={{ color: BRAND_BLUE, fontWeight: 600, fontSize: '0.85rem' }}>Open →</span>
        </div>
      )}

      {/* Recent Campaigns */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Recent Campaigns</h2>
          {campaigns.length > 0 && (
            <button onClick={() => setSubView('campaigns')} style={{ color: BRAND_BLUE, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
              View All
            </button>
          )}
        </div>

        {campaigns.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <TrendingUp size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>No campaigns yet</p>
            <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Create your first campaign to start sending bulk messages</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>
                <th style={{ textAlign: 'left', padding: '10px 16px' }}>Campaign</th>
                <th style={{ textAlign: 'center', padding: '10px 16px' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '10px 16px' }}>Total</th>
                <th style={{ textAlign: 'center', padding: '10px 16px' }}>Sent</th>
                <th style={{ textAlign: 'center', padding: '10px 16px' }}>Delivered</th>
                <th style={{ textAlign: 'center', padding: '10px 16px' }}>Read</th>
                <th style={{ textAlign: 'center', padding: '10px 16px' }}>Failed</th>
                <th style={{ textAlign: 'right', padding: '10px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.slice(0, 5).map(campaign => (
                <tr key={campaign.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0f172a' }}>{campaign.name}</td>
                  <td style={{ textAlign: 'center', padding: '12px 16px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                      background: campaign.status === 'completed' ? '#dcfce7' : campaign.status === 'running' ? '#fef3c7' : '#f1f5f9',
                      color: campaign.status === 'completed' ? '#16a34a' : campaign.status === 'running' ? '#d97706' : '#64748b',
                    }}>
                      {campaign.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 16px', color: '#0f172a' }}>{campaign.totalRecipients}</td>
                  <td style={{ textAlign: 'center', padding: '12px 16px', color: '#16a34a', fontWeight: 600 }}>{campaign.sent}</td>
                  <td style={{ textAlign: 'center', padding: '12px 16px', color: '#10b981', fontWeight: 600 }}>{campaign.delivered || 0}</td>
                  <td style={{ textAlign: 'center', padding: '12px 16px', color: '#8b5cf6', fontWeight: 600 }}>{campaign.read || 0}</td>
                  <td style={{ textAlign: 'center', padding: '12px 16px', color: campaign.failed > 0 ? '#ef4444' : '#64748b', fontWeight: 600 }}>{campaign.failed}</td>
                  <td style={{ textAlign: 'right', padding: '12px 16px' }}>
                    <button
                      onClick={() => navigateToReport(campaign.id)}
                      style={{ color: BRAND_BLUE, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
