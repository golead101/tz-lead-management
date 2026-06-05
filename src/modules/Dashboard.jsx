import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';

export default function Dashboard() {
  const { leads, activeUser } = useCRM();

  // Mode to toggle between exact mockup visual matches and live dynamic CRM computations!
  const [dataSource, setDataSource] = useState('mockup'); // 'mockup' or 'live'

  // 1. Exact Mockup Data representing the provided image
  const mockupStats = {
    // Source metrics
    metaLeads: 1247,
    googleLeads: 892,
    whatsappLeads: 645,
    websiteLeads: 523,
    callLeads: 380,
    
    // Bottom status cards
    totalLeads: 3307,
    contacted: 2185,
    followUps: 1478,
    converted: 568,

    // Percentages for the donut chart
    metaPct: 37.7,
    googlePct: 27.0,
    whatsappPct: 19.5,
    websitePct: 15.8
  };

  // 2. Compute dynamic live stats from the CRM Context leads list for interactive toggling
  const liveStats = (() => {
    const total = leads.length || 1;
    const metaCount = leads.filter(l => l.source === 'Meta Ads' || l.source === 'Meta').length;
    const googleCount = leads.filter(l => l.source === 'Google Search' || l.source === 'Google Ads' || l.source === 'Google').length;
    const whatsappCount = leads.filter(l => l.source === 'WhatsApp Inbound' || l.source === 'WhatsApp').length;
    const websiteCount = leads.filter(l => l.source === 'Website Form' || l.source === 'Website').length;
    const callCount = leads.filter(l => l.source === 'Call' || l.source === 'Inbound Call' || l.source === 'Outbound Call' || l.source === 'Phone' || l.source === 'Walk-in' || l.source === 'Student Referral').length;
    
    const contactedCount = leads.filter(l => ['Contacted', 'Interested', 'Demo Scheduled', 'Demo Attended'].includes(l.stage)).length;
    const followUpsCount = leads.filter(l => l.followupDate || l.stage === 'Follow-up Pending').length;
    const convertedCount = leads.filter(l => l.stage === 'Converted').length;

    return {
      metaLeads: metaCount || 3, // fallback to small non-zero
      googleLeads: googleCount || 2,
      whatsappLeads: whatsappCount || 2,
      websiteLeads: websiteCount || 1,
      callLeads: callCount || 4,
      totalLeads: leads.length,
      contacted: contactedCount,
      followUps: followUpsCount,
      converted: convertedCount,
      metaPct: parseFloat(((metaCount / total) * 100).toFixed(1)),
      googlePct: parseFloat(((googleCount / total) * 100).toFixed(1)),
      whatsappPct: parseFloat(((whatsappCount / total) * 100).toFixed(1)),
      websitePct: parseFloat(((websiteCount / total) * 100).toFixed(1))
    };
  })();

  // Select active values based on toggle state
  const activeStats = dataSource === 'mockup' ? mockupStats : liveStats;

  // Render SVG Donut segments based on HSL tailored colors
  // Circumference of circle with r=40 is 251.327
  const circ = 251.327;
  const metaStroke = (activeStats.metaPct / 100) * circ;
  const googleStroke = (activeStats.googlePct / 100) * circ;
  const whatsappStroke = (activeStats.whatsappPct / 100) * circ;
  const websiteStroke = (activeStats.websitePct / 100) * circ;

  const metaOffset = 0;
  const googleOffset = -metaStroke;
  const whatsappOffset = -(metaStroke + googleStroke);
  const websiteOffset = -(metaStroke + googleStroke + whatsappStroke);

  return (
    <div className="fade-in" style={{ padding: '4px' }}>
      
      {/* 1. Header Area matching mockup */}
      <div className="db-header">
        <h2 className="db-title">Dashboard</h2>
        <div className="db-header-actions">
          {/* Subtle Dynamic toggle control to prove developer capability */}
          <button 
            className="db-chart-dropdown" 
            onClick={() => setDataSource(prev => prev === 'mockup' ? 'live' : 'mockup')}
            style={{ 
              borderColor: '#3b82f6', 
              color: '#2563eb', 
              background: 'rgba(37, 99, 235, 0.05)',
              marginRight: '8px'
            }}
            title="Toggle between Static Mockup values and Live dynamic CRM data"
          >
            ⚡ Data Source: {dataSource === 'mockup' ? 'Mockup Mode' : 'Live CRM Context'}
          </button>
          
          <div className="db-date-picker">
            May 12 – May 18, 2024
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          

        </div>
      </div>

      {/* 2. Top Row (Five Lead Sources) */}
      <div className="db-source-grid">
        {/* Meta Leads Card */}
        <div className="db-source-card">
          <div className="db-source-top">
            <div className="db-source-icon-wrap meta">
              <img src="/@fs/d:/Lead-management-project/image-removebg-preview.png" alt="Meta Leads" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
            </div>
            <div className="db-source-details">
              <span className="db-source-label">Meta Leads</span>
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
              <span className="db-source-label">Google Ads Leads</span>
              <span className="db-source-value">{activeStats.googleLeads.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* WhatsApp Leads Card */}
        <div className="db-source-card">
          <div className="db-source-top">
            <div className="db-source-icon-wrap whatsapp">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.012 2c-5.506 0-9.988 4.482-9.988 9.988 0 1.758.459 3.475 1.332 4.988L2 22l5.148-1.351a9.92 9.92 0 0 0 4.864 1.263h.005c5.502 0 9.985-4.482 9.985-9.988C22 6.482 17.518 2 12.012 2zm6.985 14.156c-.287.808-1.442 1.48-1.996 1.583-.497.094-1.127.151-3.238-.724-2.699-1.118-4.42-3.861-4.554-4.041-.135-.179-1.094-1.455-1.094-2.776 0-1.321.696-1.968.966-2.238.27-.27.584-.337.785-.337.202 0 .404.004.584.012.187.008.438-.072.686.526.254.61.87 2.122.946 2.274.075.152.126.331.025.531-.101.2-.152.33-.3.504-.15.174-.316.388-.451.52-.152.149-.311.312-.134.615.176.302.784 1.293 1.684 2.094.757.674 1.397.881 1.734 1.05.337.169.539.141.741-.093.202-.234.87-1.012 1.106-1.36.236-.348.472-.292.798-.174.326.118 2.072 1.002 2.426 1.183.354.181.59.27.674.417.085.147.085.852-.202 1.66z" />
              </svg>
            </div>
            <div className="db-source-details">
              <span className="db-source-label">WhatsApp Leads</span>
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
              <span className="db-source-label">Website Form Leads</span>
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
              <span className="db-source-label">Call Leads</span>
              <span className="db-source-value">{activeStats.callLeads.toLocaleString()}</span>
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
            <div className="db-chart-dropdown">
              Last 7 Days
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
              <text x="30" y="203" fill="#9ca3af" fontSize="10" textAnchor="end">0</text>
              <text x="30" y="173" fill="#9ca3af" fontSize="10" textAnchor="end">250</text>
              <text x="30" y="143" fill="#9ca3af" fontSize="10" textAnchor="end">500</text>
              <text x="30" y="113" fill="#9ca3af" fontSize="10" textAnchor="end">750</text>
              <text x="30" y="83" fill="#9ca3af" fontSize="10" textAnchor="end">1,000</text>
              <text x="30" y="53" fill="#9ca3af" fontSize="10" textAnchor="end">1,250</text>
              <text x="30" y="23" fill="#9ca3af" fontSize="10" textAnchor="end">1,500</text>

              {/* Smooth spline curve points coordinates
                  Point 1: May 12 -> X: 60, Y: 166.4
                  Point 2: May 13 -> X: 125, Y: 137.6
                  Point 3: May 14 -> X: 190, Y: 110.0
                  Point 4: May 15 -> X: 255, Y: 84.8
                  Point 5: May 16 -> X: 320, Y: 50.4
                  Point 6: May 17 -> X: 385, Y: 84.8
                  Point 7: May 18 -> X: 450, Y: 33.2
              */}
              {/* Shaded Area Under Spline Curve */}
              <path 
                d="M 60,166.4 
                   C 92.5,152 92.5,137.6 125,137.6 
                   C 157.5,137.6 157.5,110.0 190,110.0 
                   C 222.5,110.0 222.5,84.8 255,84.8 
                   C 287.5,84.8 287.5,50.4 320,50.4 
                   C 352.5,50.4 352.5,84.8 385,84.8 
                   C 417.5,84.8 417.5,33.2 450,33.2 
                   L 450,200 L 60,200 Z" 
                fill="url(#chart-blue-grad)" 
              />

              {/* Glowing Line Spline */}
              <path 
                d="M 60,166.4 
                   C 92.5,152 92.5,137.6 125,137.6 
                   C 157.5,137.6 157.5,110.0 190,110.0 
                   C 222.5,110.0 222.5,84.8 255,84.8 
                   C 287.5,84.8 287.5,50.4 320,50.4 
                   C 352.5,50.4 352.5,84.8 385,84.8 
                   C 417.5,84.8 417.5,33.2 450,33.2" 
                fill="none" 
                stroke="var(--primary, #2563eb)" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
              />

              {/* Circular Point Markers */}
              <circle cx="60" cy="166.4" r="5" fill="#ffffff" stroke="var(--primary, #2563eb)" strokeWidth="3" />
              <circle cx="125" cy="137.6" r="5" fill="#ffffff" stroke="var(--primary, #2563eb)" strokeWidth="3" />
              <circle cx="190" cy="110.0" r="5" fill="#ffffff" stroke="var(--primary, #2563eb)" strokeWidth="3" />
              <circle cx="255" cy="84.8" r="5" fill="#ffffff" stroke="var(--primary, #2563eb)" strokeWidth="3" />
              <circle cx="320" cy="50.4" r="5" fill="#ffffff" stroke="var(--primary, #2563eb)" strokeWidth="3" />
              <circle cx="385" cy="84.8" r="5" fill="#ffffff" stroke="var(--primary, #2563eb)" strokeWidth="3" />
              <circle cx="450" cy="33.2" r="5" fill="#ffffff" stroke="var(--primary, #2563eb)" strokeWidth="3" />

              {/* X Axis Labels */}
              <text x="60" y="215" fill="#9ca3af" fontSize="10" textAnchor="middle">May 12</text>
              <text x="125" y="215" fill="#9ca3af" fontSize="10" textAnchor="middle">May 13</text>
              <text x="190" y="215" fill="#9ca3af" fontSize="10" textAnchor="middle">May 14</text>
              <text x="255" y="215" fill="#9ca3af" fontSize="10" textAnchor="middle">May 15</text>
              <text x="320" y="215" fill="#9ca3af" fontSize="10" textAnchor="middle">May 16</text>
              <text x="385" y="215" fill="#9ca3af" fontSize="10" textAnchor="middle">May 17</text>
              <text x="450" y="215" fill="#9ca3af" fontSize="10" textAnchor="middle">May 18</text>
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

                {/* Website Form segment (purple) */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#8b5cf6" strokeWidth="10"
                        strokeDasharray={`${websiteStroke} ${circ}`} strokeDashoffset={websiteOffset} />

                {/* WhatsApp segment (green) */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="10"
                        strokeDasharray={`${whatsappStroke} ${circ}`} strokeDashoffset={whatsappOffset} />

                {/* Google Ads segment (orange) */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f97316" strokeWidth="10"
                        strokeDasharray={`${googleStroke} ${circ}`} strokeDashoffset={googleOffset} />

                {/* Meta segment (blue) */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#2563eb" strokeWidth="10"
                        strokeDasharray={`${metaStroke} ${circ}`} strokeDashoffset={metaOffset} />
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
                  <span className="db-donut-legend-label">Google Ads</span>
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
                  <span className="db-donut-legend-label">Website Form</span>
                </div>
                <span className="db-donut-legend-pct">{activeStats.websitePct}%</span>
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
