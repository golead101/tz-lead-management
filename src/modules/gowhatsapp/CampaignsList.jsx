import React, { useState, useEffect } from 'react';
import { BarChart3, Trash2, Eye, Plus, Copy } from 'lucide-react';
import { mockDb } from './mockData';

const BRAND_BLUE = '#2563eb';

export default function CampaignsList({ setSubView, navigateToReport, setReusedCampaign }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = () => {
    try {
      const camps = mockDb.getCampaigns();
      setCampaigns(camps);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    if (!confirm('Delete this campaign and all its data?')) return;
    try {
      const updated = campaigns.filter(c => c.id !== id);
      mockDb.saveCampaigns(updated);
      setCampaigns(updated);

      // Clean up recipients also
      const recipients = mockDb.getRecipients();
      delete recipients[id];
      mockDb.saveRecipients(recipients);
    } catch (error) {
      alert('Failed to delete campaign');
    }
  };

  const handleReuse = (campaign) => {
    if (setReusedCampaign) {
      setReusedCampaign({
        name: `${campaign.name} (copy)`,
        contactListId: campaign.contactListId,
        type: campaign.type,
        message: campaign.message,
        templateName: campaign.templateName,
        languageCode: campaign.languageCode
      });
    }
    setSubView('new-campaign');
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#64748b' }}>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Campaigns</h1>
        <button
          onClick={() => {
            if (setReusedCampaign) setReusedCampaign(null);
            setSubView('new-campaign');
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: BRAND_BLUE, color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={18} /> New Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <BarChart3 size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ fontWeight: 500 }}>No campaigns yet</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {campaigns.map(campaign => {
            const successRate = campaign.totalRecipients > 0
              ? Math.round((campaign.sent / campaign.totalRecipients) * 100)
              : 0;

            return (
              <div key={campaign.id} style={{
                background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
                padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, color: '#0f172a' }}>{campaign.name}</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: '#64748b' }}>
                    <span>Total: {campaign.totalRecipients}</span>
                    <span style={{ color: '#16a34a' }}>Sent: {campaign.sent}</span>
                    <span style={{ color: campaign.failed > 0 ? '#ef4444' : '#64748b' }}>Failed: {campaign.failed}</span>
                    <span>Success: {successRate}%</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ width: 200, height: 4, background: '#f1f5f9', borderRadius: 2, marginTop: 8 }}>
                    <div style={{
                      width: `${successRate}%`, height: '100%', borderRadius: 2,
                      background: successRate > 80 ? '#16a34a' : successRate > 50 ? '#f59e0b' : '#ef4444',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                    background: campaign.status === 'completed' ? '#dcfce7' : campaign.status === 'failed' ? '#fef2f2' : '#fef3c7',
                    color: campaign.status === 'completed' ? '#16a34a' : campaign.status === 'failed' ? '#ef4444' : '#d97706',
                  }}>
                    {campaign.status}
                  </span>
                  <button
                    onClick={() => navigateToReport(campaign.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#64748b' }}
                    title="View Report"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => handleReuse(campaign)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: BRAND_BLUE }}
                    title="Reuse Campaign"
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#ef4444' }}
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
