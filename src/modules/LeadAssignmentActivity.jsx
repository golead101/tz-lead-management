import React, { useState, useMemo } from 'react';
import { useCRM } from '../context/CRMContext';
import { computeCounselorMetrics, getPeriodBounds } from '../utils/leadAssignmentMetrics';

const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

function ProgressRow({ label, value, of, color }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
        <span style={{ color: '#475569', fontWeight: 600 }}>{label}</span>
        <span style={{ color: '#0f172a', fontWeight: 700 }}>{value} / {of} <span style={{ color, fontWeight: 800 }}>{pct(value, of)}%</span></span>
      </div>
      <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct(value, of)}%`, background: color, borderRadius: '3px' }} />
      </div>
    </div>
  );
}

export default function LeadAssignmentActivity() {
  const { leads, counselors, activeRole, setActiveView, setPendingActivityFilter } = useCRM();

  const [dateFilter, setDateFilter] = useState('Today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedCounselor, setSelectedCounselor] = useState('All');

  const counselorList = useMemo(
    () => (counselors || []).filter(c => c.role === 'Counselor').map(c => c.name).filter(Boolean),
    [counselors]
  );

  const { start, end } = useMemo(
    () => getPeriodBounds(dateFilter, customStart, customEnd),
    [dateFilter, customStart, customEnd]
  );

  const allMetrics = useMemo(
    () => computeCounselorMetrics(leads, counselorList, start, end),
    [leads, counselorList, start, end]
  );

  const visibleMetrics = selectedCounselor === 'All'
    ? allMetrics
    : allMetrics.filter(m => m.name === selectedCounselor);

  const totals = visibleMetrics.reduce((acc, m) => ({
    assigned: acc.assigned + m.assigned,
    contacted: acc.contacted + m.contacted,
    interested: acc.interested + m.interested,
    demo: acc.demo + m.demo,
    converted: acc.converted + m.converted
  }), { assigned: 0, contacted: 0, interested: 0, demo: 0, converted: 0 });

  const periodLabel = dateFilter === 'Custom Range' ? 'Selected Period' : dateFilter;

  const handleViewLeads = (counselorName) => {
    try {
      sessionStorage.setItem('gv_filter_counselor', JSON.stringify([counselorName]));
    } catch { /* sessionStorage unavailable, filter simply won't preset */ }
    setActiveView('grid');
  };

  const handleViewActivity = (counselorName) => {
    setPendingActivityFilter({ counselor: counselorName });
    setActiveView('history');
  };

  if (activeRole === 'Counselor') {
    return (
      <div className="fade-in">
        <div className="chart-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none" style={{ color: 'var(--primary)', marginBottom: '8px' }}><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Access Restricted</h4>
          <p style={{ fontSize: '11.5px', maxWidth: '280px', lineHeight: '1.5' }}>Lead Assignment &amp; Activity is restricted to Administrators and Managers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="welcome-header" style={{ marginBottom: '20px' }}>
        <h2 className="welcome-title">Lead Assignment &amp; Activity</h2>
        <p className="welcome-subtitle">Real counselor activity for the selected period &mdash; assigned, contacted, and funnel progression, not a live snapshot.</p>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '150px', outline: 'none' }}
          >
            <option value="Today">Today</option>
            <option value="This Week">This Week</option>
            <option value="This Month">This Month</option>
            <option value="Custom Range">Custom Range</option>
          </select>
        </div>

        {dateFilter === 'Custom Range' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Start Date</label>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>End Date</label>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }} />
            </div>
          </>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Counselor</label>
          <select
            value={selectedCounselor}
            onChange={(e) => setSelectedCounselor(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '180px', outline: 'none' }}
          >
            <option value="All">All Counselors</option>
            {counselorList.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
      </div>

      {/* Top Summary */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-primary">
          <span className="kpi-label">Assigned</span>
          <span className="kpi-value">{totals.assigned}</span>
        </div>
        <div className="kpi-card kpi-primary">
          <span className="kpi-label">Contacted</span>
          <span className="kpi-value" style={{ color: '#2563eb' }}>{totals.contacted}</span>
        </div>
        <div className="kpi-card kpi-primary">
          <span className="kpi-label">Interested</span>
          <span className="kpi-value" style={{ color: '#8b5cf6' }}>{totals.interested}</span>
        </div>
        <div className="kpi-card kpi-primary">
          <span className="kpi-label">Demo</span>
          <span className="kpi-value" style={{ color: '#f59e0b' }}>{totals.demo}</span>
        </div>
        <div className="kpi-card kpi-primary">
          <span className="kpi-label">Converted</span>
          <span className="kpi-value" style={{ color: '#10b981' }}>{totals.converted}</span>
        </div>
      </div>

      {/* Counselor Performance Cards */}
      {visibleMetrics.length === 0 ? (
        <div className="chart-card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
          No counselors found for this filter.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {visibleMetrics.map(m => (
            <div key={m.name} className="chart-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', flexShrink: 0 }}>
                  {m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{m.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.assigned} Assigned &middot; {periodLabel}</div>
                </div>
              </div>

              <ProgressRow label="Contacted" value={m.contacted} of={m.assigned} color="#2563eb" />
              <ProgressRow label="Interested" value={m.interested} of={m.contacted} color="#8b5cf6" />
              <ProgressRow label="Demo" value={m.demo} of={m.interested} color="#f59e0b" />
              <ProgressRow label="Converted" value={m.converted} of={m.demo} color="#10b981" />

              {m.stageBreakdown.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Call Outcomes / Current Stage</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {m.stageBreakdown.map(sb => (
                      <span
                        key={sb.stage}
                        style={{
                          fontSize: '11px', fontWeight: '600', padding: '3px 8px', borderRadius: '12px',
                          background: sb.stage === 'Not Interested' || sb.stage === 'Closed' ? '#fef2f2' : '#f1f5f9',
                          color: sb.stage === 'Not Interested' || sb.stage === 'Closed' ? '#b91c1c' : '#475569'
                        }}
                      >
                        {sb.stage}: {sb.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {m.pending > 0 && (
                <div style={{ marginTop: '10px', marginBottom: '10px', fontSize: '12px', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '6px 10px' }}>
                  &#9888; {m.pending} lead{m.pending === 1 ? '' : 's'} not contacted
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button
                  onClick={() => handleViewLeads(m.name)}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#334155', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  View Leads
                </button>
                <button
                  onClick={() => handleViewActivity(m.name)}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: 'none', background: 'var(--primary)', color: 'white', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                >
                  View Activity
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
