import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from '../context/CRMContext';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function Dashboard() {
  const { leads, activeUser, activeRole } = useCRM();

  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [timeRange, setTimeRange] = useState('7days'); // '7days', '1month', '1year'
  const [walkinExpanded, setWalkinExpanded] = useState(true);

  // phoneCallLeads count from Firestore (each doc = 1 unique phone lead called)
  const [phoneCallLeadsCount, setPhoneCallLeadsCount] = useState(0);
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'phoneCallLeads'),
      snap => setPhoneCallLeadsCount(snap.size),
      e => console.error('[Dashboard] phoneCallLeads listen failed:', e)
    );
    return () => unsub();
  }, []);

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

  // Filter leads based on counselor permissions
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
      if (dateRange.label === 'Today') {
        // start is today
      } else if (dateRange.label === 'Last 7 Days') {
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
    if (dateRange.label === 'Today') {
      start.setHours(0, 0, 0, 0);
    } else if (dateRange.label === 'Last 7 Days') {
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
    const metaCount = activeLeads.filter(l => (l.source || '').toLowerCase().includes('meta')).length;
    const googleCount = activeLeads.filter(l => (l.source || '').toLowerCase().includes('google')).length;
    const whatsappCount = activeLeads.filter(l => (l.source || '').toLowerCase().includes('whatsapp')).length;
    const websiteCount = activeLeads.filter(l => (l.source || '').toLowerCase().includes('website')).length;
    const callCount = activeLeads.filter(l => {
      const srcLower = (l.source || '').toLowerCase();
      return srcLower.includes('call') || srcLower.includes('phone');
    }).length;
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
    
    const newLeadsCount = activeLeads.filter(l => l.stage === 'New Lead').length;
    const contactedCount = activeLeads.filter(l => ['Contacted', 'Interested'].includes(l.stage)).length;
    const followUpsCount = activeLeads.filter(l => l.followupDate || l.stage === 'Follow-up').length;
    const demoScheduledCount = activeLeads.filter(l => l.stage === 'Demo Scheduled').length;
    const demoAttendedCount = activeLeads.filter(l => l.stage === 'Demo Attended').length;
    const freeClassCount = activeLeads.filter(l => l.stage === 'Free Class').length;
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
      newLeads: newLeadsCount,
      contacted: contactedCount,
      followUps: followUpsCount,
      demoScheduled: demoScheduledCount,
      demoAttended: demoAttendedCount,
      freeClass: freeClassCount,
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
                {['All Time', 'Today', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Custom Range'].map(opt => (
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
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '36px', height: '36px' }}>
                <defs>
                  <linearGradient id="globeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#29b6f6" />
                    <stop offset="100%" stopColor="#0288d1" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="40" fill="url(#globeGrad)" />
                <line x1="10" y1="50" x2="90" y2="50" stroke="#ffffff" strokeWidth="3" />
                <path d="M15.5 30C25 35 75 35 84.5 30" stroke="#ffffff" strokeWidth="3" />
                <path d="M15.5 70C25 65 75 65 84.5 70" stroke="#ffffff" strokeWidth="3" />
                <line x1="50" y1="10" x2="50" y2="90" stroke="#ffffff" strokeWidth="3" />
                <path d="M50 10C30 30 30 70 50 90" stroke="#ffffff" strokeWidth="3" />
                <path d="M50 10C70 30 70 70 50 90" stroke="#ffffff" strokeWidth="3" />
                <circle cx="50" cy="50" r="40" stroke="#ffffff" strokeWidth="3" />
                <rect x="20" y="38" width="60" height="24" rx="6" fill="#ffffff" />
                <text x="50" y="55" fill="url(#globeGrad)" fontSize="13" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" textAnchor="middle" letterSpacing="0.5">WWW</text>
                <path d="M55 62 L78 71 L69 75 L81 90 L73 94 L62 79 L53 84 Z" fill="url(#globeGrad)" stroke="#ffffff" strokeWidth="3.5" strokeLinejoin="round" />
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
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '30px', height: '30px' }}>
                <defs>
                  <linearGradient id="callGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#0891b2" />
                  </linearGradient>
                </defs>
                <path d="M5 4H7.5C8.2 4 8.8 4.5 8.9 5.2L9.7 8.5C9.8 9.1 9.5 9.7 9 10L7.5 11C8.5 13 10.5 15 12.5 16L13.5 14.5C13.8 14 14.4 13.7 15 13.8L18.3 14.6C19 14.7 19.5 15.3 19.5 16V18.5C19.5 19.3 18.8 20 18 20C10.3 20 4 13.7 4 5.9C4 5.1 4.7 4.4 5.5 4.4H5Z" fill="url(#callGrad)" />
                <path d="M13 3C15.65 3 18.2 4.05 20.07 5.93C21.95 7.8 23 10.35 23 13" stroke="url(#callGrad)" strokeWidth="2" strokeLinecap="round" />
                <path d="M14 6C15.86 6 17.64 6.74 18.95 8.05C20.26 9.36 21 11.14 21 13" stroke="url(#callGrad)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1 1" />
                <path d="M15 9C16.06 9 17.08 9.42 17.83 10.17C18.58 10.92 19 11.94 19 13" stroke="url(#callGrad)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="db-source-details">
              <span className="db-source-label">Call</span>
              <span className="db-source-value">{(activeStats.callLeads + phoneCallLeadsCount).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Walk-in Leads Card */}
        <div className="db-source-card">
          <div className="db-source-top">
            <div className="db-source-icon-wrap walkin">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '36px', height: '36px' }}>
                <defs>
                  <linearGradient id="walkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#db2777" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </linearGradient>
                </defs>
                <ellipse cx="50" cy="91" rx="32" ry="7" fill="#000000" opacity="0.12" />
                <path d="M 50 86 C 44 80 16 56 16 38 C 16 19.2 31.2 4 50 4 C 68.8 4 84 19.2 84 38 C 84 56 56 80 50 86 Z" fill="url(#walkGrad)" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="52.5" cy="21" r="5" fill="#ffffff" />
                <path d="M52.5 26 L52 44" stroke="#ffffff" strokeWidth="6.5" strokeLinecap="round" />
                <path d="M52.5 29 L58.5 31.5 L64.5 35" stroke="#ffffff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M52.5 29 L45 30.5 L42.5 37" stroke="#ffffff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M52 44 L57.5 50.5 L62 57" stroke="#ffffff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M52 44 L47 50.5 L42.5 57" stroke="#ffffff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="db-source-details">
              <span className="db-source-label">Walk-in</span>
              <span className="db-source-value">{activeStats.walkinLeads.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2.5 Row (Seven Core Funnel KPIs) */}
      <div className="db-funnel-grid" style={{ marginBottom: '24px' }}>
        {/* New Leads Card */}
        <div className="db-funnel-card new-leads-card">
          <div className="db-funnel-icon-wrap new">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '28px', height: '28px' }}>
              <circle cx="7" cy="8" r="3.2" fill="currentColor" opacity="0.4" />
              <path d="M2 17.5C2 15 4 13.5 7 13.5C8.2 13.5 9.5 13.9 10.3 14.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
              <circle cx="13" cy="9" r="4.5" fill="currentColor" />
              <path d="M6 21C6 17.5 9 15.5 13 15.5C15.2 15.5 17.5 16.3 18.8 17.8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M19 2L19.9 4.4L22.5 4.6L20.5 6.2L21.2 8.8L19 7.4L16.8 8.8L17.5 6.2L15.5 4.6L18.1 4.4L19 2Z" fill="#f59e0b" />
            </svg>
          </div>
          <div className="db-funnel-left">
            <span className="db-funnel-label">New Leads</span>
            <span className="db-funnel-value">{activeStats.newLeads.toLocaleString()}</span>
            <div className="db-funnel-delta up">
              ▲ 16.8% <span>vs last 7 days</span>
            </div>
          </div>
        </div>

        {/* Contacted Card */}
        <div className="db-funnel-card contacted-card">
          <div className="db-funnel-icon-wrap contacted">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '28px', height: '28px' }}>
              <path d="M19.5 13.5C19.5 17 15.5 17.5 13 17.5L8.5 21V17.5C4.5 17.5 2.5 15 2.5 11.5C2.5 7.5 6.5 4.5 11 4.5C15.5 4.5 19.5 7.5 19.5 11.5V13.5Z" fill="currentColor" />
              <path d="M13 9.5H19C21 9.5 22.5 10.8 22.5 12.5C22.5 14.2 21 15.5 19 15.5H17.5V18L15 15.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8" cy="11.5" r="1.2" fill="#ffffff" />
              <circle cx="11" cy="11.5" r="1.2" fill="#ffffff" />
              <circle cx="14" cy="11.5" r="1.2" fill="#ffffff" />
            </svg>
          </div>
          <div className="db-funnel-left">
            <span className="db-funnel-label">Contacted</span>
            <span className="db-funnel-value">{activeStats.contacted.toLocaleString()}</span>
            <div className="db-funnel-delta up">
              ▲ 14.3% <span>vs last 7 days</span>
            </div>
          </div>
        </div>

        {/* Follow Ups Card */}
        <div className="db-funnel-card followups-card">
          <div className="db-funnel-icon-wrap followups">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '28px', height: '28px' }}>
              <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="2.2" />
              <path d="M12 6.5V12.5L16 14.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 2C15.5 2 18.5 3.5 20.5 6L21.5 3" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </div>
          <div className="db-funnel-left">
            <span className="db-funnel-label">Follow Ups</span>
            <span className="db-funnel-value">{activeStats.followUps.toLocaleString()}</span>
            <div className="db-funnel-delta up">
              ▲ 17.6% <span>vs last 7 days</span>
            </div>
          </div>
        </div>

        {/* Demo Scheduled Card */}
        <div className="db-funnel-card demosched-card">
          <div className="db-funnel-icon-wrap demosched">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '28px', height: '28px' }}>
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
              <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="15" r="2" fill="currentColor" />
            </svg>
          </div>
          <div className="db-funnel-left">
            <span className="db-funnel-label">Demo Scheduled</span>
            <span className="db-funnel-value">{activeStats.demoScheduled.toLocaleString()}</span>
            <div className="db-funnel-delta up">
              ▲ 11.2% <span>vs last 7 days</span>
            </div>
          </div>
        </div>

        {/* Demo Attended Card */}
        <div className="db-funnel-card demo-card">
          <div className="db-funnel-icon-wrap demo">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '28px', height: '28px' }}>
              <rect x="2" y="4" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M12 16V20M9 20H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 10L11 13L16 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="db-funnel-left">
            <span className="db-funnel-label">Demo Attended</span>
            <span className="db-funnel-value">{activeStats.demoAttended.toLocaleString()}</span>
            <div className="db-funnel-delta up">
              ▲ 15.2% <span>vs last 7 days</span>
            </div>
          </div>
        </div>

        {/* Free Class Card */}
        <div className="db-funnel-card freeclass-card">
          <div className="db-funnel-icon-wrap freeclass">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '28px', height: '28px' }}>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <polygon points="12 6 13.5 9 16.5 9.5 14.2 11.5 15 14.5 12 13 9 14.5 9.8 11.5 7.5 9.5 10.5 9" fill="currentColor" />
            </svg>
          </div>
          <div className="db-funnel-left">
            <span className="db-funnel-label">Free Class</span>
            <span className="db-funnel-value">{activeStats.freeClass.toLocaleString()}</span>
            <div className="db-funnel-delta up">
              ▲ 18.5% <span>vs last 7 days</span>
            </div>
          </div>
        </div>

        {/* Converted Card */}
        <div className="db-funnel-card converted-card">
          <div className="db-funnel-icon-wrap converted">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '28px', height: '28px' }}>
              <path d="M6 4H18V11C18 13.8 15.8 16 13 16H11C8.2 16 6 13.8 6 11V4Z" fill="currentColor" />
              <path d="M6 6H4C2.9 6 2 6.9 2 8V9C2 10.1 2.9 11 4 11H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M18 6H20C21.1 6 22 6.9 22 8V9C22 10.1 21.1 11 20 11H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M9 19.5H15M12 16V19.5M7 21H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M9.5 9.5L11 11L14.5 7.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 2.5L4.5 3.5L5.5 3.8L4.7 4.5L5 5.5L4 5L3 5.5L3.3 4.5L2.5 3.8L3.5 3.5L4 2.5Z" fill="currentColor" />
              <path d="M20 2L20.3 2.8L21.1 3L20.5 3.6L20.7 4.4L20 4L19.3 4.4L19.5 3.6L18.9 3L19.7 2.8L20 2Z" fill="currentColor" />
            </svg>
          </div>
          <div className="db-funnel-left">
            <span className="db-funnel-label">Converted</span>
            <span className="db-funnel-value">{activeStats.converted.toLocaleString()}</span>
            <div className="db-funnel-delta up">
              ▲ 20.1% <span>vs last 7 days</span>
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



    </div>
  );
}
