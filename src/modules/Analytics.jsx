import React from 'react';
import { useCRM } from '../context/CRMContext';

export default function Analytics() {
  const { leads, pipelineStages, activeRole, activeUser } = useCRM();

  // Filter leads based on counselor permissions
  const visibleLeads = leads.filter(lead => {
    if (activeRole === 'Counselor') {
      return lead.counselor === activeUser;
    }
    return true;
  });

  const totalLeads = visibleLeads.length;

  // 1. KPI Scorecards calculations
  const convertedLeadsCount = visibleLeads.filter(l => l.stage === 'Converted').length;
  const conversionRate = totalLeads > 0 ? ((convertedLeadsCount / totalLeads) * 100).toFixed(1) : 0;

  const activePipelineCount = visibleLeads.filter(l => 
    !['Converted', 'Closed', 'Not Interested'].includes(l.stage)
  ).length;

  const hotCount = visibleLeads.filter(l => l.priority === 'Hot').length;
  const warmCount = visibleLeads.filter(l => l.priority === 'Warm').length;
  const coldCount = visibleLeads.filter(l => l.priority === 'Cold').length;

  // 2. Funnel stage calculations
  const getStageCount = (stageName) => visibleLeads.filter(l => l.stage === stageName).length;
  
  const funnelStages = [
    { name: 'New Lead', count: getStageCount('New Lead') },
    { name: 'Contacted', count: getStageCount('Contacted') },
    { name: 'Interested', count: getStageCount('Interested') },
    { name: 'Demo Scheduled', count: getStageCount('Demo Scheduled') },
    { name: 'Demo Attended', count: getStageCount('Demo Attended') },
    { name: 'Converted', count: getStageCount('Converted') }
  ];

  const maxFunnelCount = Math.max(...funnelStages.map(s => s.count), 1);

  // 3. SVG Donut chart circle geometry calculations
  // Circle radius = 40, Circumference = 2 * PI * 40 = 251.32
  const totalTemp = (hotCount + warmCount + coldCount) || 1;
  const hotPct = (hotCount / totalTemp) * 100;
  const warmPct = (warmCount / totalTemp) * 100;
  const coldPct = (coldCount / totalTemp) * 100;
  const dashArrayMax = 251.32;

  // 4. Source acquisition statistics
  const sourcesList = ['Meta Ads', 'Google Search', 'Website Form', 'WhatsApp Inbound', 'Walk-in', 'Student Referral'];
  const sourceStats = sourcesList.map(source => {
    const count = visibleLeads.filter(l => l.source === source).length;
    const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
    return { name: source, count, pct };
  }).sort((a, b) => b.count - a.count);

  // 5. Counselor comparative rankings
  const counselorsList = ['Elena Gilbert', 'Damon Salvatore', 'Stefan Salvatore'];
  const counselorPerformance = counselorsList.map(name => {
    const counselorLeads = leads.filter(l => l.counselor === name);
    const converted = counselorLeads.filter(l => l.stage === 'Converted').length;
    const active = counselorLeads.filter(l => !['Converted', 'Closed', 'Not Interested'].includes(l.stage)).length;
    const rate = counselorLeads.length > 0 ? Math.round((converted / counselorLeads.length) * 100) : 0;
    return { name, converted, active, rate, total: counselorLeads.length };
  }).sort((a, b) => b.rate - a.rate); // Sort by conversion rate for high-end leaderboard!

  return (
    <div className="fade-in">
      <div className="welcome-header" style={{ marginBottom: '20px' }}>
        <h2 className="welcome-title">Visual Analytics & Performance Reporting</h2>
        <p className="welcome-subtitle">Dynamic Tableau-style dashboard displaying enrollment conversion rates, channel attribution scorecards, and counselor rankings.</p>
      </div>

      {/* ==================================================================
          TOP KPI SCORECARDS GRID (Power BI / Tableau Inspired)
          ================================================================== */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-primary">
          <span className="kpi-label">Total Inquiries</span>
          <span className="kpi-value">{totalLeads}</span>
          <span className="kpi-subtext">Active student profiles logged</span>
        </div>

        <div className="kpi-card kpi-primary">
          <span className="kpi-label">Active Pipeline</span>
          <span className="kpi-value" style={{ color: 'var(--primary)' }}>{activePipelineCount}</span>
          <span className="kpi-subtext">Leads actively in callback process</span>
        </div>

        <div className="kpi-card kpi-primary">
          <span className="kpi-label">Enrollment Rate</span>
          <span className="kpi-value" style={{ color: '#10b981' }}>{conversionRate}%</span>
          {/* Miniature visual progress bar */}
          <div style={{ height: '4px', background: 'rgba(0,0,0,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '6px' }}>
            <div style={{ height: '100%', width: `${conversionRate}%`, background: '#10b981' }} />
          </div>
        </div>

        <div className="kpi-card kpi-primary">
          <span className="kpi-label">High-Priority (Hot)</span>
          <span className="kpi-value" style={{ color: '#f43f5e' }}>{hotCount} 🔥</span>
          <span className="kpi-subtext">Leads flagged with hot temperature</span>
        </div>
      </div>

      {/* ==================================================================
          CHARTS ROW 1: PIPELINE FUNNEL & TEMPERATURE DONUT
          ================================================================== */}
      <div className="analytics-grid">
        {/* Funnel Stage Card */}
        <div className="chart-card">
          <h3 className="panel-title" style={{ marginBottom: '6px' }}>Conversion Funnel Stages</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Measures visual conversion rates across intake stages.
          </p>

          <div className="funnel-container">
            {funnelStages.map((stage, idx) => {
              const percentage = ((stage.count / maxFunnelCount) * 100).toFixed(0);
              return (
                <div key={stage.name} className="funnel-stage-row">
                  <div className="funnel-stage-label">{stage.name}</div>
                  <div className="funnel-stage-bar-outer">
                    <div 
                      className="funnel-stage-bar-inner" 
                      style={{ 
                        width: `${percentage}%`,
                        background: 'linear-gradient(to right, var(--primary), #f43f5e)',
                        opacity: 1 - (idx * 0.12) // soft visual decay
                      }}
                    />
                  </div>
                  <div className="funnel-stage-value">
                    {stage.count} <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '500' }}>({totalLeads > 0 ? ((stage.count / totalLeads) * 100).toFixed(0) : 0}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Temperature Donut Chart */}
        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="panel-title" style={{ marginBottom: '6px' }}>Inquiries Temperature Ratio</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Proportions of Hot (red), Warm (amber), and Cold (blue) leads.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flex: 1, padding: '10px' }}>
            {/* SVG Donut Chart */}
            <div style={{ width: '130px', height: '130px', position: 'relative' }}>
              <svg width="130" height="130" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}>
                {/* Background track circle */}
                <circle cx="60" cy="60" r="40" fill="transparent" stroke="rgba(0,0,0,0.03)" strokeWidth="12" />

                {/* Cold Segment */}
                {coldCount > 0 && (
                  <circle
                    cx="60"
                    cy="60"
                    r="40"
                    fill="transparent"
                    stroke="#3b82f6"
                    strokeWidth="12"
                    strokeDasharray={`${(coldPct / 100) * dashArrayMax} ${dashArrayMax}`}
                    strokeDashoffset={`-${((hotPct + warmPct) / 100) * dashArrayMax}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                  />
                )}

                {/* Warm Segment */}
                {warmCount > 0 && (
                  <circle
                    cx="60"
                    cy="60"
                    r="40"
                    fill="transparent"
                    stroke="#f59e0b"
                    strokeWidth="12"
                    strokeDasharray={`${(warmPct / 100) * dashArrayMax} ${dashArrayMax}`}
                    strokeDashoffset={`-${(hotPct / 100) * dashArrayMax}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                  />
                )}

                {/* Hot Segment */}
                {hotCount > 0 && (
                  <circle
                    cx="60"
                    cy="60"
                    r="40"
                    fill="transparent"
                    stroke="#f43f5e"
                    strokeWidth="12"
                    strokeDasharray={`${(hotPct / 100) * dashArrayMax} ${dashArrayMax}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                  />
                )}

                {/* Center text rotated back to upright */}
                <g style={{ transform: 'rotate(90deg)', transformOrigin: '60px 60px' }}>
                  <text x="60" y="56" textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontWeight="700" letterSpacing="0.5">LEADS</text>
                  <text x="60" y="76" textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="800">{totalLeads}</text>
                </g>
              </svg>
            </div>

            {/* Custom Interactive Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e' }} />
                <span style={{ fontWeight: '600', width: '50px' }}>Hot</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '700' }}>{hotCount}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>({totalLeads > 0 ? Math.round(hotPct) : 0}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ fontWeight: '600', width: '50px' }}>Warm</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '700' }}>{warmCount}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>({totalLeads > 0 ? Math.round(warmPct) : 0}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                <span style={{ fontWeight: '600', width: '50px' }}>Cold</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '700' }}>{coldCount}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>({totalLeads > 0 ? Math.round(coldPct) : 0}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================
          CHARTS ROW 2: CHANNEL ATTRIBUTION & LEADERBOARD RANKINGS
          ================================================================== */}
      <div className="analytics-grid" style={{ marginTop: '20px' }}>
        {/* Acquisition Channel Attribution */}
        <div className="chart-card">
          <h3 className="panel-title" style={{ marginBottom: '6px' }}>Acquisition Channel Attribution</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Inquiry volume attribution mapped to lead registration source.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sourceStats.map(stat => (
              <div key={stat.name} className="funnel-stage-row" style={{ height: 'auto', paddingBottom: '4px' }}>
                <div className="funnel-stage-label" style={{ width: '130px', fontSize: '12px', fontWeight: '600' }}>{stat.name}</div>
                <div className="funnel-stage-bar-outer" style={{ height: '8px' }}>
                  <div 
                    className="funnel-stage-bar-inner" 
                    style={{ width: `${stat.pct}%`, background: 'var(--primary)' }}
                  />
                </div>
                <div className="funnel-stage-value" style={{ width: '40px', fontSize: '12px', fontWeight: '700' }}>{stat.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Counselor Comparative rankings leaderboard */}
        {activeRole !== 'Counselor' ? (
          <div className="chart-card">
            <h3 className="panel-title" style={{ marginBottom: '6px' }}>Counselor Performance Rankings</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Comparative leaderboard ranking team enrollment speed and conversion rates.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {counselorPerformance.map((perf, index) => {
                // Gold, Silver, Bronze badges for leaderboard ranks
                const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#9ca3af' : '#d97706';
                const rankText = index === 0 ? '🏆 1st' : index === 1 ? '🥈 2nd' : '🥉 3rd';
                
                return (
                  <div key={perf.name} className="counselor-performance-row" style={{ border: '1px solid rgba(0,0,0,0.03)', padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.005)' }}>
                    <div className="counselor-prof-avatar" style={{ gap: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: rankColor, width: '42px', textTransform: 'uppercase' }}>{rankText}</span>
                      <div className="card-counselor-avatar" style={{ width: '28px', height: '28px', fontSize: '11px', fontWeight: '700' }}>
                        {perf.name.split(' ').map(n=>n[0]).join('')}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{perf.name}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{perf.total} Assigned Inquiry Cards</span>
                      </div>
                    </div>
                    
                    <div className="counselor-stats-block" style={{ gap: '14px' }}>
                      <div className="stat-item">
                        <span className="stat-val">{perf.active} Active</span>
                        <span className="stat-lbl">In Process</span>
                      </div>
                      <div className="stat-item" style={{ minWidth: '70px', textAlign: 'right' }}>
                        <span className="stat-val" style={{ color: '#10b981', fontWeight: '850' }}>{perf.rate}%</span>
                        <span className="stat-lbl">Enroll Rate</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="chart-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>
            <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none" style={{ color: 'var(--primary)', marginBottom: '8px' }}><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Access Restricted</h4>
            <p style={{ fontSize: '11.5px', maxWidth: '280px', lineHeight: '1.5' }}>Detailed comparative counselor leaderboard rankings are restricted to Managers & Administrators.</p>
          </div>
        )}
      </div>
    </div>
  );
}
