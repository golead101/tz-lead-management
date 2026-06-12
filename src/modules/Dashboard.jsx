import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from '../context/CRMContext';

export default function Dashboard() {
  const { leads, activeUser, activeRole } = useCRM();

  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [timeRange, setTimeRange] = useState('7days'); // '7days', '1month', '1year'
  const [walkinExpanded, setWalkinExpanded] = useState(true);

  // Date Picker States
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    label: 'All Time',
    startDate: null,
    endDate: null
  });

  const datePickerRef = useRef(null);

  // Close date picker dropdown on clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter leads based on counselor permissions (counselors only see their own leads)
  const roleFilteredLeads = leads.filter(lead => {
    if (activeRole === 'Counselor') {
      return lead.counselor === activeUser;
    }
    return true;
  });

  const formatDateRangeText = () => {
    if (dateRange.label !== 'Custom Range') {
      const end = new Date();
      let start = new Date();
      if (dateRange.label === 'Last 7 Days') {
        start.setDate(end.getDate() - 7);
      } else if (dateRange.label === 'Last 30 Days') {
        start.setDate(end.getDate() - 30);
      } else if (dateRange.label === 'This Month') {
        start.setDate(1);
      } else {
        // All Time
        if (roleFilteredLeads.length === 0) return 'All Time';
        const dates = roleFilteredLeads.map(l => new Date(l.createdDate)).filter(d => !isNaN(d));
        if (dates.length === 0) return 'All Time';
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        return `${minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      if (dateRange.startDate && dateRange.endDate) {
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      return 'Select Dates';
    }
  };

  // Filter leads based on selected date range
  const filteredLeads = (() => {
    if (dateRange.label === 'All Time') return roleFilteredLeads;

    const end = dateRange.endDate ? new Date(dateRange.endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    let start = new Date();
    if (dateRange.label === 'Last 7 Days') {
      start.setDate(end.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (dateRange.label === 'Last 30 Days') {
      start.setDate(end.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (dateRange.label === 'This Month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (dateRange.label === 'Custom Range' && dateRange.startDate) {
      start = new Date(dateRange.startDate);
      start.setHours(0, 0, 0, 0);
    } else {
      return roleFilteredLeads;
    }

    return roleFilteredLeads.filter(l => {
      if (!l.createdDate) return false;
      const created = new Date(l.createdDate);
      return created >= start && created <= end;
    });
  })();

  // Compute dynamic live stats from the CRM Context leads list for interactive toggling
  const liveStats = (() => {
    const activeLeads = filteredLeads;
    const total = activeLeads.length || 1;
    const metaCount = activeLeads.filter(l => l.source === 'Meta Ads' || l.source === 'Meta').length;
    const googleCount = activeLeads.filter(l => l.source === 'Google Search' || l.source === 'Google Ads' || l.source === 'Google').length;
    const whatsappCount = activeLeads.filter(l => l.source === 'WhatsApp Inbound' || l.source === 'WhatsApp').length;
    const websiteCount = activeLeads.filter(l => l.source === 'Website Form' || l.source === 'Website').length;
    const callCount = activeLeads.filter(l => l.source === 'Call' || l.source === 'Inbound Call' || l.source === 'Outbound Call' || l.source === 'Phone').length;
    const walkinCount = activeLeads.filter(l => {
      const srcLower = (l.source || '').toLowerCase();
      return srcLower.includes('walk-in') || srcLower.includes('walkin');
    }).length;
    
    const othersCount = activeLeads.filter(l => {
      const srcLower = (l.source || '').toLowerCase();
      const isMeta = srcLower.includes('meta');
      const isGoogle = srcLower.includes('google');
      const isWhatsapp = srcLower.includes('whatsapp');
      const isWebsite = srcLower.includes('website');
      const isCall = srcLower.includes('call') || srcLower.includes('phone');
      const isWalkin = srcLower.includes('walk-in') || srcLower.includes('walkin');
      return !(isMeta || isGoogle || isWhatsapp || isWebsite || isCall || isWalkin);
    }).length;
    
    const contactedCount = activeLeads.filter(l => ['Contacted', 'Interested', 'Demo Scheduled', 'Demo Attended'].includes(l.stage)).length;
    const followUpsCount = activeLeads.filter(l => l.followupDate || l.stage === 'Follow-up Pending').length;
    const convertedCount = activeLeads.filter(l => l.stage === 'Converted').length;

    return {
      metaLeads: metaCount,
      googleLeads: googleCount,
      whatsappLeads: whatsappCount,
      websiteLeads: websiteCount,
      callLeads: callCount,
      walkinLeads: walkinCount,
      othersLeads: othersCount,
      totalLeads: activeLeads.length,
      contacted: contactedCount,
      followUps: followUpsCount,
      converted: convertedCount,
      metaPct: parseFloat(((metaCount / total) * 100).toFixed(1)),
      googlePct: parseFloat(((googleCount / total) * 100).toFixed(1)),
      whatsappPct: parseFloat(((whatsappCount / total) * 100).toFixed(1)),
      websitePct: parseFloat(((websiteCount / total) * 100).toFixed(1)),
      callPct: parseFloat(((callCount / total) * 100).toFixed(1)),
      walkinPct: parseFloat(((walkinCount / total) * 100).toFixed(1)),
      othersPct: parseFloat(((othersCount / total) * 100).toFixed(1))
    };
  })();

  const activeStats = liveStats;

  // Group walk-in leads by sub-source
  const walkinLeadsList = filteredLeads.filter(l => {
    const srcLower = (l.source || '').toLowerCase();
    return srcLower.includes('walk-in') || srcLower.includes('walkin');
  });

  const walkinGroups = {};
  walkinLeadsList.forEach(l => {
    const sub = l.subSource || 'Walk-in';
    const key = sub.toLowerCase().trim();
    if (!walkinGroups[key]) {
      walkinGroups[key] = {
        label: sub,
        count: 0
      };
    }
    walkinGroups[key].count += 1;
  });

  const walkinPalette = [
    '#db2777', // Walk-in pink (base)
    '#ec4899', // Pink 500
    '#f43f5e', // Rose 500
    '#fb7185', // Rose 400
    '#be185d', // Pink 700
    '#fda4af', // Rose 300
    '#9d174d', // Pink 800
  ];

  const walkinSegments = Object.keys(walkinGroups).map((key, index) => {
    const group = walkinGroups[key];
    return {
      key: `walkin_${key}`,
      label: group.label,
      count: group.count,
      color: walkinPalette[index % walkinPalette.length]
    };
  });

  // Build all segments for the donut chart
  const totalLeadsCount = filteredLeads.length || 1;
  const donutSegments = [
    { label: 'meta', count: activeStats.metaLeads, color: '#2563eb' },
    { label: 'google', count: activeStats.googleLeads, color: '#f97316' },
    { label: 'whatsapp', count: activeStats.whatsappLeads, color: '#10b981' },
    { label: 'website', count: activeStats.websiteLeads, color: '#8b5cf6' },
    { label: 'call', count: activeStats.callLeads, color: '#06b6d4' },
    ...walkinSegments
  ].map(seg => ({
    ...seg,
    pct: parseFloat(((seg.count / totalLeadsCount) * 100).toFixed(1))
  }));

  const circ = 251.327;

  // Dynamic Graph Data Generation from live filtered leads
  const graphDatasets = {
    '7days': (() => {
      const data = [];
      const end = dateRange.endDate ? new Date(dateRange.endDate) : new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(end);
        d.setDate(end.getDate() - i);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const count = filteredLeads.filter(l => {
          if (!l.createdDate) return false;
          const created = new Date(l.createdDate);
          return created.toDateString() === d.toDateString();
        }).length;
        data.push({ label, value: count });
      }
      return data;
    })(),
    '1month': (() => {
      const data = [];
      const end = dateRange.endDate ? new Date(dateRange.endDate) : new Date();
      for (let i = 3; i >= 0; i--) {
        const wEnd = new Date(end);
        wEnd.setDate(end.getDate() - (i * 7));
        const wStart = new Date(wEnd);
        wStart.setDate(wEnd.getDate() - 6);
        wStart.setHours(0,0,0,0);
        wEnd.setHours(23,59,59,999);
        const label = `Week ${4 - i}`;
        const count = filteredLeads.filter(l => {
          if (!l.createdDate) return false;
          const created = new Date(l.createdDate);
          return created >= wStart && created <= wEnd;
        }).length;
        data.push({ label, value: count });
      }
      return data;
    })(),
    '1year': (() => {
      const data = [];
      const end = dateRange.endDate ? new Date(dateRange.endDate) : new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
        const label = d.toLocaleDateString('en-US', { month: 'short' });
        const count = filteredLeads.filter(l => {
          if (!l.createdDate) return false;
          const created = new Date(l.createdDate);
          return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth();
        }).length;
        data.push({ label, value: count });
      }
      return data;
    })()
  };

  const activeGraphData = graphDatasets[timeRange];
  const maxGraphValue = Math.max(...activeGraphData.map(d => d.value)) || 100;
  const yMultiplier = 180 / (maxGraphValue * 1.1); // 200 is bottom, 20 is top, 180 is height

  const computedPoints = activeGraphData.map((d, i) => {
    const cx = 60 + i * (390 / (activeGraphData.length - 1));
    const cy = 200 - (d.value * yMultiplier);
    const colW = 390 / (activeGraphData.length - 1);
    const colX = cx - colW / 2;
    return { ...d, cx, cy, colX, colW };
  });

  let linePath = `M ${computedPoints[0].cx},${computedPoints[0].cy}`;
  for (let i = 1; i < computedPoints.length; i++) {
    const prev = computedPoints[i - 1];
    const curr = computedPoints[i];
    const midX = (prev.cx + curr.cx) / 2;
    linePath += ` C ${midX},${prev.cy} ${midX},${curr.cy} ${curr.cx},${curr.cy}`;
  }
  const shadedPath = linePath + ` L ${computedPoints[computedPoints.length - 1].cx},200 L ${computedPoints[0].cx},200 Z`;

  // Compute Y-Axis labels dynamically based on max value size
  const maxVal = maxGraphValue * 1.1;
  const factor = maxVal > 1000 ? 1000 : (maxVal > 100 ? 100 : (maxVal > 10 ? 10 : 1));
  const maxRounded = Math.ceil(maxVal / factor) * factor || 10;
  const yLabels = [0, maxRounded * 0.166, maxRounded * 0.333, maxRounded * 0.5, maxRounded * 0.666, maxRounded * 0.833, maxRounded].map(v => Math.round(v));

  return (
    <div className="fade-in" style={{ padding: '4px' }}>
      
      {/* 1. Header Area matching mockup */}
      <div className="db-header">
        <h2 className="db-title">Dashboard</h2>
        <div className="db-header-actions">

          <div 
            ref={datePickerRef}
            className="db-date-picker" 
            style={{ position: 'relative', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setIsDatePickerOpen(prev => !prev)}
          >
            {formatDateRangeText()}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>

            {/* Dropdown Calendar / Date Range Selector Popup */}
            {isDatePickerOpen && (
              <div 
                className="date-picker-dropdown" 
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  zIndex: 100,
                  width: '240px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {['All Time', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Custom Range'].map(opt => (
                  <div
                    key={opt}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: dateRange.label === opt ? '700' : '500',
                      color: dateRange.label === opt ? 'var(--primary, #2563eb)' : '#374151',
                      background: dateRange.label === opt ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onClick={() => {
                      if (opt !== 'Custom Range') {
                        setDateRange({ label: opt, startDate: null, endDate: null });
                        setIsDatePickerOpen(false);
                      } else {
                        setDateRange(prev => ({ ...prev, label: opt }));
                      }
                    }}
                  >
                    <span>{opt}</span>
                    {dateRange.label === opt && (
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                ))}

                {/* Custom Date Inputs if Custom Range is active */}
                {dateRange.label === 'Custom Range' && (
                  <div style={{
                    borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                    paddingTop: '8px',
                    marginTop: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 'bold', textAlign: 'left' }}>START DATE</span>
                      <input 
                        type="date" 
                        value={dateRange.startDate || ''}
                        onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: '6px',
                          border: '1px solid rgba(0,0,0,0.12)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          outline: 'none',
                          width: '100%',
                          color: '#374151'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 'bold', textAlign: 'left' }}>END DATE</span>
                      <input 
                        type="date" 
                        value={dateRange.endDate || ''}
                        onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: '6px',
                          border: '1px solid rgba(0,0,0,0.12)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          outline: 'none',
                          width: '100%',
                          color: '#374151'
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="primary-btn justify-center"
                      style={{ fontSize: '11px', padding: '8px', width: '100%', fontWeight: '700' }}
                      onClick={() => setIsDatePickerOpen(false)}
                      disabled={!dateRange.startDate || !dateRange.endDate}
                    >
                      Apply Range
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          

        </div>
      </div>

      {/* 2. Top Row (Five Lead Sources) */}
      <div className="db-source-grid">
        {/* Meta Leads Card */}
        <div className="db-source-card">
          <div className="db-source-top">
            <div className="db-source-icon-wrap meta">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.924 6c-1.393 0-2.613.626-3.486 1.624L12 9.25 10.562 7.624C9.69 6.626 8.47 6 7.076 6 4.257 6 2 8.243 2 11c0 2.757 2.257 5 5.076 5 1.393 0 2.613-.626 3.486-1.624L12 12.75l1.438 1.626c.873.998 2.093 1.624 3.486 1.624 2.819 0 5.076-2.243 5.076-5 0-2.757-2.257-5-5.076-5zm0 8.5c-1.026 0-1.921-.497-2.522-1.282L12 10.5l-2.402 2.718c-.6.785-1.496 1.282-2.522 1.282-1.677 0-3.076-1.353-3.076-3s1.399-3 3.076-3c1.026 0 1.921.497 2.522 1.282L12 11.5l2.402-2.718c.6-.785 1.496-1.282 2.522-1.282 1.677 0 3.076 1.353 3.076 3s-1.399 3-3.076 3z"/>
              </svg>
            </div>
            <div className="db-source-details">
              <span className="db-source-label">Meta</span>
              <span className="db-source-value">{activeStats.metaLeads.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Google Ads Leads Card */}
        <div className="db-source-card">
          <div className="db-source-top">
            <div className="db-source-icon-wrap google">
              <svg viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
            </div>
            <div className="db-source-details">
              <span className="db-source-label">Google</span>
              <span className="db-source-value">{activeStats.googleLeads.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* WhatsApp Leads Card */}
        <div className="db-source-card">
          <div className="db-source-top">
            <div className="db-source-icon-wrap whatsapp">
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
              </svg>
            </div>
            <div className="db-source-details">
              <span className="db-source-label">WhatsApp</span>
              <span className="db-source-value">{activeStats.whatsappLeads.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Website Form Leads Card */}
        <div className="db-source-card">
          <div className="db-source-top">
            <div className="db-source-icon-wrap web">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <div className="db-source-details">
              <span className="db-source-label">Website</span>
              <span className="db-source-value">{activeStats.websiteLeads.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Call Leads Card */}
        <div className="db-source-card">
          <div className="db-source-top">
            <div className="db-source-icon-wrap call">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <div className="db-source-details">
              <span className="db-source-label">Call</span>
              <span className="db-source-value">{activeStats.callLeads.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Walk-in Leads Card */}
        <div className="db-source-card">
          <div className="db-source-top">
            <div className="db-source-icon-wrap walkin" style={{ color: '#db2777' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '28px', height: '28px' }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="db-source-details">
              <span className="db-source-label">Walk-in</span>
              <span className="db-source-value">{activeStats.walkinLeads.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Middle Row (Curved Line Chart & Donut Chart) */}
      <div className="db-charts-grid">
        {/* Leads Over Time Spline Chart */}
        <div className="db-chart-card">
          <div className="db-chart-header">
            <h3 className="db-chart-title">Leads Over Time</h3>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select 
                className="db-chart-dropdown" 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                style={{ appearance: 'none', paddingRight: '24px', background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer' }}
              >
                <option value="7days">Last 7 Days</option>
                <option value="1month">Last 1 Month</option>
                <option value="1year">Last 1 Year</option>
              </select>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '14px', height: '14px', position: 'absolute', right: '8px', pointerEvents: 'none', color: 'var(--text-secondary)' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
          
          <div className="db-line-chart-wrap">
            {/* Custom SVG Spline Graphic */}
            <svg viewBox="0 0 500 220" width="100%" height="100%">
              <defs>
                {/* Visual Area Gradient matching mockup */}
                <linearGradient id="chart-blue-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary, #2563eb)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--primary, #2563eb)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="45" y1="20" x2="480" y2="20" stroke="rgba(0,0,0,0.04)" strokeDasharray="3 3" />
              <line x1="45" y1="50" x2="480" y2="50" stroke="rgba(0,0,0,0.04)" strokeDasharray="3 3" />
              <line x1="45" y1="80" x2="480" y2="80" stroke="rgba(0,0,0,0.04)" strokeDasharray="3 3" />
              <line x1="45" y1="110" x2="480" y2="110" stroke="rgba(0,0,0,0.04)" strokeDasharray="3 3" />
              <line x1="45" y1="140" x2="480" y2="140" stroke="rgba(0,0,0,0.04)" strokeDasharray="3 3" />
              <line x1="45" y1="170" x2="480" y2="170" stroke="rgba(0,0,0,0.04)" strokeDasharray="3 3" />
              <line x1="45" y1="200" x2="480" y2="200" stroke="rgba(0,0,0,0.08)" />

              {/* Y Axis Labels */}
              <text x="30" y="203" fill="#9ca3af" fontSize="10" textAnchor="end">{yLabels[0].toLocaleString()}</text>
              <text x="30" y="173" fill="#9ca3af" fontSize="10" textAnchor="end">{yLabels[1].toLocaleString()}</text>
              <text x="30" y="143" fill="#9ca3af" fontSize="10" textAnchor="end">{yLabels[2].toLocaleString()}</text>
              <text x="30" y="113" fill="#9ca3af" fontSize="10" textAnchor="end">{yLabels[3].toLocaleString()}</text>
              <text x="30" y="83" fill="#9ca3af" fontSize="10" textAnchor="end">{yLabels[4].toLocaleString()}</text>
              <text x="30" y="53" fill="#9ca3af" fontSize="10" textAnchor="end">{yLabels[5].toLocaleString()}</text>
              <text x="30" y="23" fill="#9ca3af" fontSize="10" textAnchor="end">{yLabels[6].toLocaleString()}</text>

              {/* Shaded Area Under Spline Curve */}
              <path 
                d={shadedPath} 
                fill="url(#chart-blue-grad)" 
              />

              {/* Glowing Line Spline */}
              <path 
                d={linePath} 
                fill="none" 
                stroke="var(--primary, #2563eb)" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
              />

              {/* Vertical Hover Columns for tracking */}
              {computedPoints.map((pt, i) => (
                <g key={i} onMouseEnter={() => setHoveredPoint(pt)} onMouseLeave={() => setHoveredPoint(null)} style={{ cursor: 'crosshair' }}>
                  {/* Invisible full height column for easier hovering */}
                  <rect x={pt.colX} y="20" width={pt.colW} height="180" fill="transparent" />
                  
                  {/* Vertical line ONLY on hover (No dots anywhere!) */}
                  {hoveredPoint?.label === pt.label && (
                    <line x1={pt.cx} y1="20" x2={pt.cx} y2="200" stroke="#9ca3af" strokeWidth="1" strokeDasharray="4 4" style={{ pointerEvents: 'none' }} />
                  )}
                </g>
              ))}

              {/* Tooltip Overlay (Fixed at top of vertical line) */}
              {hoveredPoint && (
                <g transform={`translate(${hoveredPoint.cx}, 20)`} style={{ pointerEvents: 'none' }}>
                  <rect x="-45" y="-10" width="90" height="42" rx="6" fill="#1e293b" />
                  <polygon points="-6,32 6,32 0,38" fill="#1e293b" />
                  <text x="0" y="6" fill="#f8fafc" fontSize="11" textAnchor="middle" fontWeight="bold">{hoveredPoint.label}</text>
                  <text x="0" y="22" fill="#94a3b8" fontSize="10" textAnchor="middle">{hoveredPoint.value.toLocaleString()} Leads</text>
                </g>
              )}

              {/* X Axis Labels */}
              {computedPoints.map((pt, i) => (
                <text key={i} x={pt.cx} y="215" fill="#9ca3af" fontSize="10" textAnchor="middle">
                  {pt.label}
                </text>
              ))}
            </svg>
          </div>
        </div>

        {/* Leads by Source Donut Chart */}
        <div className="db-chart-card">
          <div className="db-chart-header">
            <h3 className="db-chart-title">Leads by Source</h3>
          </div>
          
          <div className="db-donut-chart-wrap">
            {/* SVG Donut Circle */}
            <div style={{ width: '150px', height: '150px', position: 'relative', flexShrink: 0 }}>
              <svg width="150" height="150" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background loop */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(0,0,0,0.02)" strokeWidth="10" />

                {(() => {
                  let accumulatedStroke = 0;
                  return donutSegments.map((seg, idx) => {
                    const stroke = (seg.pct / 100) * circ;
                    const offset = -accumulatedStroke;
                    accumulatedStroke += stroke;
                    if (seg.count === 0) return null;
                    return (
                      <circle
                        key={idx}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="10"
                        strokeDasharray={`${stroke} ${circ}`}
                        strokeDashoffset={offset}
                      />
                    );
                  });
                })()}
              </svg>

              {/* Exact Mockup Center Text */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1.1
              }}>
                <span style={{ fontSize: '22px', fontWeight: '800', color: '#111827' }}>
                  {activeStats.totalLeads.toLocaleString()}
                </span>
                <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '500', marginTop: '2px' }}>
                  Total Leads
                </span>
              </div>
            </div>

            {/* Custom Legendary Legend block */}
            <div className="db-donut-legend">
              <div className="db-donut-legend-item">
                <div className="db-donut-legend-left">
                  <div className="db-donut-legend-square" style={{ background: '#2563eb' }} />
                  <span className="db-donut-legend-label">Meta</span>
                </div>
                <span className="db-donut-legend-pct">{activeStats.metaPct}%</span>
              </div>

              <div className="db-donut-legend-item">
                <div className="db-donut-legend-left">
                  <div className="db-donut-legend-square" style={{ background: '#f97316' }} />
                  <span className="db-donut-legend-label">Google</span>
                </div>
                <span className="db-donut-legend-pct">{activeStats.googlePct}%</span>
              </div>

              <div className="db-donut-legend-item">
                <div className="db-donut-legend-left">
                  <div className="db-donut-legend-square" style={{ background: '#10b981' }} />
                  <span className="db-donut-legend-label">WhatsApp</span>
                </div>
                <span className="db-donut-legend-pct">{activeStats.whatsappPct}%</span>
              </div>

              <div className="db-donut-legend-item">
                <div className="db-donut-legend-left">
                  <div className="db-donut-legend-square" style={{ background: '#8b5cf6' }} />
                  <span className="db-donut-legend-label">Website</span>
                </div>
                <span className="db-donut-legend-pct">{activeStats.websitePct}%</span>
              </div>

              <div className="db-donut-legend-item">
                <div className="db-donut-legend-left">
                  <div className="db-donut-legend-square" style={{ background: '#06b6d4' }} />
                  <span className="db-donut-legend-label">Call</span>
                </div>
                <span className="db-donut-legend-pct">{activeStats.callPct}%</span>
              </div>

              {/* Walk-in Group nested hierarchy */}
              <div className="db-donut-legend-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                <div 
                  onClick={() => setWalkinExpanded(!walkinExpanded)}
                  style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div className="db-donut-legend-left">
                    <div className="db-donut-legend-square" style={{ background: '#db2777' }} />
                    <span className="db-donut-legend-label" style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Walk-in
                      <span style={{ fontSize: '8px', opacity: 0.7, display: 'inline-block', transition: 'transform 0.2s', transform: walkinExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
                    </span>
                  </div>
                  <span className="db-donut-legend-pct" style={{ fontWeight: '600' }}>{activeStats.walkinPct}%</span>
                </div>
                
                {/* Sub-sources nested tree hierarchy list */}
                {walkinExpanded && (
                  <div style={{ paddingLeft: '14px', borderLeft: '1px dashed #e5e7eb', marginLeft: '4px', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', marginTop: '4px' }}>
                    {walkinSegments.length === 0 ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '11px', color: '#6b7280' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '1px', background: '#db2777' }} />
                          <span>Walk-in</span>
                        </div>
                        <span>0%</span>
                      </div>
                    ) : (
                      walkinSegments.map(seg => {
                        const segPct = parseFloat(((seg.count / totalLeadsCount) * 100).toFixed(1));
                        return (
                          <div key={seg.key} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '11px', color: '#4b5563' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '1px', background: seg.color }} />
                              <span>{seg.label}</span>
                            </div>
                            <span>{segPct}%</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Row (Four Core KPI Cards) */}
      <div className="db-bottom-grid">
        {/* New Leads Card */}
        <div className="db-bottom-card">
          <div className="db-bottom-left">
            <span className="db-bottom-label">New Leads</span>
            <span className="db-bottom-value">{activeStats.totalLeads.toLocaleString()}</span>
            <div className="db-bottom-delta up">
              ▲ 16.8% <span>vs last 7 days</span>
            </div>
          </div>
          <div className="db-bottom-icon-wrap new">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
        </div>

        {/* Contacted Card */}
        <div className="db-bottom-card">
          <div className="db-bottom-left">
            <span className="db-bottom-label">Contacted</span>
            <span className="db-bottom-value">{activeStats.contacted.toLocaleString()}</span>
            <div className="db-bottom-delta up">
              ▲ 14.3% <span>vs last 7 days</span>
            </div>
          </div>
          <div className="db-bottom-icon-wrap contacted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
        </div>

        {/* Follow Ups Card */}
        <div className="db-bottom-card">
          <div className="db-bottom-left">
            <span className="db-bottom-label">Follow Ups</span>
            <span className="db-bottom-value">{activeStats.followUps.toLocaleString()}</span>
            <div className="db-bottom-delta up">
              ▲ 17.6% <span>vs last 7 days</span>
            </div>
          </div>
          <div className="db-bottom-icon-wrap followups">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        </div>

        {/* Converted Card */}
        <div className="db-bottom-card">
          <div className="db-bottom-left">
            <span className="db-bottom-label">Converted</span>
            <span className="db-bottom-value">{activeStats.converted.toLocaleString()}</span>
            <div className="db-bottom-delta up">
              ▲ 20.1% <span>vs last 7 days</span>
            </div>
          </div>
          <div className="db-bottom-icon-wrap converted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" />
              <path d="M12 2a7 7 0 0 0-7 7c0 2.62 1.34 4.5 3 5.34V4.66" />
            </svg>
          </div>
        </div>
      </div>

    </div>
  );
}
