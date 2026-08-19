import React, { useState, useEffect } from 'react';
import { BarChart3, Trash2, Eye, Plus, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { whatsappDb, deleteCampaignById } from './whatsappDb';

const BRAND_BLUE = '#2563eb';
const ITEMS_PER_PAGE = 10;

export default function CampaignsList({ setSubView, navigateToReport, setReusedCampaign }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = () => {
    try {
      const camps = whatsappDb.getCampaigns();
      setCampaigns(camps);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign and all its data?')) return;
    try {
      // Optimistically remove from UI immediately
      setCampaigns(prev => prev.filter(c => c.id !== id));
      // Delete from Firestore + localStorage directly (no race condition)
      await deleteCampaignById(id);
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      alert('Failed to delete campaign');
      loadCampaigns(); // reload on error
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

  // Helper to extract timestamp or date number for sorting (latest first)
  const parseCampaignDate = (c) => {
    if (c.createdAt) {
      const t = new Date(c.createdAt).getTime();
      if (!isNaN(t)) return t;
    }
    if (c.scheduledFor) {
      const t = new Date(c.scheduledFor).getTime();
      if (!isNaN(t)) return t;
    }
    const matchId = c.id && String(c.id).match(/camp-(\d+)/);
    if (matchId) {
      const ts = parseInt(matchId[1], 10);
      if (!isNaN(ts)) return ts;
    }
    const dateMatch = c.name && String(c.name).match(/\d{1,2}\/\d{1,2}\/\d{4}/);
    if (dateMatch) {
      const t = new Date(dateMatch[0]).getTime();
      if (!isNaN(t)) return t;
    }
    return 0;
  };

  // Sort campaigns descending (latest first)
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    const timeA = parseCampaignDate(a);
    const timeB = parseCampaignDate(b);
    if (timeA !== timeB) {
      return timeB - timeA;
    }
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedCampaigns.length / ITEMS_PER_PAGE));

  // Reset to valid page if page exceeds totalPages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [campaigns.length, totalPages, currentPage]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCampaigns = sortedCampaigns.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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

      {sortedCampaigns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <BarChart3 size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ fontWeight: 500 }}>No campaigns yet</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {paginatedCampaigns.map(campaign => {
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

          {/* Pagination Controls */}
          {sortedCampaigns.length > ITEMS_PER_PAGE && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', background: '#fff', borderRadius: 12,
              border: '1px solid #e2e8f0', marginTop: 16, flexWrap: 'wrap', gap: 12
            }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
                Showing <span style={{ fontWeight: 600, color: '#0f172a' }}>{startIndex + 1}</span> to{' '}
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {Math.min(startIndex + ITEMS_PER_PAGE, sortedCampaigns.length)}
                </span> of{' '}
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{sortedCampaigns.length}</span> campaigns
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1',
                    background: currentPage === 1 ? '#f8fafc' : '#fff',
                    color: currentPage === 1 ? '#94a3b8' : '#334155',
                    fontSize: '0.85rem', fontWeight: 500,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={16} /> Previous
                </button>

                <div style={{ display: 'flex', gap: 4 }}>
                  {(() => {
                    const pages = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (currentPage > 3) pages.push('...');
                      const start = Math.max(2, currentPage - 1);
                      const end = Math.min(totalPages - 1, currentPage + 1);
                      for (let i = start; i <= end; i++) pages.push(i);
                      if (currentPage < totalPages - 2) pages.push('...');
                      pages.push(totalPages);
                    }
                    return pages.map((p, idx) => {
                      if (p === '...') {
                        return <span key={`dots-${idx}`} style={{ padding: '0 4px', color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>...</span>;
                      }
                      return (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          style={{
                            minWidth: 32, height: 32, padding: '0 6px',
                            borderRadius: 8,
                            border: p === currentPage ? 'none' : '1px solid #e2e8f0',
                            background: p === currentPage ? BRAND_BLUE : '#fff',
                            color: p === currentPage ? '#fff' : '#334155',
                            fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {p}
                        </button>
                      );
                    });
                  })()}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1',
                    background: currentPage === totalPages ? '#f8fafc' : '#fff',
                    color: currentPage === totalPages ? '#94a3b8' : '#334155',
                    fontSize: '0.85rem', fontWeight: 500,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

