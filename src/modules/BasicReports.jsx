import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';

export default function BasicReports() {
  const { leads, activeRole, activeUser } = useCRM();
  
  // States
  const [dateRange, setDateRange] = useState('all');
  const [reportType, setReportType] = useState('all_leads');
  
  // Filter leads based on counselor permissions
  const permissionLeads = leads.filter(lead => {
    if (activeRole === 'Counselor') {
      return lead.counselor === activeUser;
    }
    return true;
  });

  // Filter based on Date Range & Report Type
  const filteredLeads = permissionLeads.filter(lead => {
    if (reportType === 'converted' && lead.stage !== 'Converted') return false;

    if (dateRange === 'all') return true;
    
    // Simple date filtering (assuming lead.createdAt or date is parseable)
    // For leads without valid dates, we'll just include them if "all" or ignore them if a specific date range is required
    const dateStr = lead.createdAt || lead.date;
    if (!dateStr) return false;

    const leadDate = new Date(dateStr);
    if (isNaN(leadDate.getTime())) return false;

    const now = new Date();
    
    if (dateRange === '7d') {
      return (now - leadDate) <= 7 * 24 * 60 * 60 * 1000;
    }
    if (dateRange === '30d') {
      return (now - leadDate) <= 30 * 24 * 60 * 60 * 1000;
    }
    return true;
  });

  // Export to CSV function
  const exportToCSV = () => {
    if (filteredLeads.length === 0) return;
    
    // Define headers
    const headers = ['Lead Name', 'Phone', 'Email', 'Stage', 'Source', 'Counselor', 'Date'];
    
    // Map rows
    const rows = filteredLeads.map(lead => [
      `"${(lead.name || '').replace(/"/g, '""')}"`,
      `"${(lead.phone || '').replace(/"/g, '""')}"`,
      `"${(lead.email || '').replace(/"/g, '""')}"`,
      `"${(lead.stage || '').replace(/"/g, '""')}"`,
      `"${(lead.source || '').replace(/"/g, '""')}"`,
      `"${(lead.counselor || '').replace(/"/g, '""')}"`,
      `"${(lead.date || '').replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lead_report_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fade-in">
      <div className="welcome-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="welcome-title">Basic Reports & Data Extract</h2>
          <p className="welcome-subtitle">Export raw operational data to CSV for external processing.</p>
        </div>
        <button 
          onClick={exportToCSV}
          style={{
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px'
          }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Export CSV
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Report Type</label>
          <select 
            value={reportType} 
            onChange={(e) => setReportType(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '200px', outline: 'none' }}
          >
            <option value="all_leads">All Leads Data</option>
            <option value="converted">Converted Leads Only</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date Range</label>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '150px', outline: 'none' }}
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Data Table Preview */}
      <div className="chart-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0, color: '#0f172a' }}>Data Preview ({filteredLeads.length} records)</h3>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
              <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Name</th>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Phone</th>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Stage</th>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Source</th>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Counselor</th>
                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.slice(0, 100).map((lead, i) => (
                <tr key={lead.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: '500' }}>{lead.name}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{lead.phone}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ 
                      display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                      background: lead.stage === 'Converted' ? '#dcfce7' : '#f1f5f9',
                      color: lead.stage === 'Converted' ? '#166534' : '#475569'
                    }}>
                      {lead.stage}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{lead.source}</td>
                  <td style={{ padding: '12px 16px', fontWeight: '500' }}>{lead.counselor || 'Unassigned'}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{lead.date || 'N/A'}</td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No data found for selected filters</td>
                </tr>
              )}
            </tbody>
          </table>
          {filteredLeads.length > 100 && (
             <div style={{ padding: '12px', textAlign: 'center', color: '#64748b', fontSize: '12px', borderTop: '1px solid #f1f5f9' }}>
               Showing first 100 records. Export to CSV to see all {filteredLeads.length} records.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
