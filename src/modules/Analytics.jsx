import React, { useState, useEffect } from 'react';
import { useCRM } from '../context/CRMContext';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function Analytics() {
  const { leads, activeRole, activeUser, counselors } = useCRM();

  // Filter leads based on counselor permissions
  const visibleLeads = leads.filter(lead => {
    if (activeRole === 'Counselor') {
      const src = (lead.source || '').toLowerCase();
      const isGlobal = src.includes('meta') || src.includes('google') || src.includes('website');
      return lead.counselor === activeUser || isGlobal;
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

  // 2. Counselor comparative rankings
  const counselorsList = counselors ? counselors.map(c => c.name) : [];
  const counselorPerformance = counselorsList.map(name => {
    const counselorLeads = leads.filter(l => l.counselor === name);
    const converted = counselorLeads.filter(l => l.stage === 'Converted').length;
    const active = counselorLeads.filter(l => !['Converted', 'Closed', 'Not Interested'].includes(l.stage)).length;
    const rate = counselorLeads.length > 0 ? Math.round((converted / counselorLeads.length) * 100) : 0;
    return { name, converted, active, rate, total: counselorLeads.length };
  }).sort((a, b) => b.rate - a.rate);

  // 3. Telecaller performance ranking
  const telecallerUsers = counselors
    ? counselors.filter(c => c.role === 'Telecaller' || c.role === 'Manager')
    : [];

  // --- Fetch real call data from phoneCallActivities & phoneCallLeads ---
  const [callSyncMap, setCallSyncMap] = useState({}); // { telecallerName: { calls, leadsContacted } }

  useEffect(() => {
    // Step 1: listen to users collection to build UID → name map
    const unsubUsers = onSnapshot(collection(db, 'users'), usersSnap => {
      const uidToName = {};
      usersSnap.docs.forEach(d => {
        const data = d.data();
        const name = data.name || data.displayName || data.email || null;
        if (name) uidToName[d.id] = name;
      });

      // Step 2: listen to phoneCallActivities → count calls & unique contacts per UID
      const unsubActivities = onSnapshot(
        collection(db, 'phoneCallActivities'),
        activitiesSnap => {
          const callsByUid = {};
          const contactsByUid = {};

          activitiesSnap.docs.forEach(d => {
            const data = d.data();
            const uid = data.firebaseUid || data.userId || data.uid || null;
            if (!uid) return;
            callsByUid[uid] = (callsByUid[uid] || 0) + 1;
            if (!contactsByUid[uid]) contactsByUid[uid] = new Set();
            const contact = data.contactName || data.phone || data.number || '';
            if (contact) contactsByUid[uid].add(contact);
          });

          const nameMap = {};
          Object.entries(uidToName).forEach(([uid, name]) => {
            nameMap[name] = {
              calls: callsByUid[uid] || 0,
              leadsContacted: contactsByUid[uid] ? contactsByUid[uid].size : 0,
            };
          });
          setCallSyncMap(nameMap);
        },
        e => console.error('[Analytics] phoneCallActivities listen failed:', e)
      );

      return unsubActivities;
    },
    e => console.error('[Analytics] users listen failed:', e));

    return () => unsubUsers();
  }, []);

  const telecallerPerformance = telecallerUsers.map(tc => {
    const name = tc.name || tc.email || 'Unknown';
    // Leads assigned to or called by this telecaller
    const assignedLeads = leads.filter(l => 
      l.telecaller === name || 
      l.assignedTelecaller === name ||
      (l.timeline || []).some(t => 
        (t.type === 'call' || t.type === 'Call') && 
        (t.user === name || t.telecaller === name)
      )
    );
    // Conversions = assigned leads that are Converted or Enrolled
    const conversions = assignedLeads.filter(l =>
      l.stage === 'Converted' || l.stage === 'Enrolled'
    ).length;
    const convRate = assignedLeads.length > 0
      ? Math.round((conversions / assignedLeads.length) * 100)
      : 0;

    // Real call data from phoneCallActivities (via UID→name mapping)
    const syncData = callSyncMap[name] || null;
    // Calls: from phoneCallActivities (primary), fallback to lead timeline entries
    const callsFromTimeline = leads.reduce((total, lead) => {
      return total + (lead.timeline || []).filter(t =>
        (t.type === 'call' || t.type === 'Call') &&
        (t.user === name || t.counselor === name || t.telecaller === name)
      ).length;
    }, 0);
    const callsMade = syncData ? syncData.calls : callsFromTimeline;
    // Leads contacted: unique contacts from phoneCallActivities, fallback to stage-based count
    const leadsContactedFromSync = syncData ? syncData.leadsContacted : 0;
    const leadsContactedFromStage = assignedLeads.filter(l => l.stage && l.stage !== 'New Lead').length;
    const leadsContacted = leadsContactedFromSync > 0 ? leadsContactedFromSync : leadsContactedFromStage;

    return { name, callsMade, leadsContacted, conversions, convRate, total: assignedLeads.length };
  }).sort((a, b) => b.convRate - a.convRate || b.conversions - a.conversions);

  const rankMedal = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
  const rankLabel = (i) => i === 0 ? 'Top Performer' : i === 1 ? 'Second Place' : i === 2 ? 'Third Place' : null;
  const rankLabelColor = (i) => i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : '#d97706';

  return (
    <div className="fade-in">
      <div className="welcome-header" style={{ marginBottom: '20px' }}>
        <h2 className="welcome-title">Visual Analytics &amp; Performance Reporting</h2>
        <p className="welcome-subtitle">Dynamic Tableau-style dashboard displaying enrollment conversion rates, channel attribution scorecards, and counselor rankings.</p>
      </div>

      {/* ==================================================================
          TOP KPI SCORECARDS GRID
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
          <div style={{ height: '4px', background: 'rgba(0,0,0,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '6px' }}>
            <div style={{ height: '100%', width: `${conversionRate}%`, background: '#10b981' }} />
          </div>
        </div>
      </div>

      {/* ==================================================================
          CHARTS ROW 1: TELECALLER RANKING & COUNSELOR RANKING
          ================================================================== */}
      <div className="analytics-grid">
        {/* Telecaller Performance Ranking */}
        {activeRole !== 'Counselor' ? (
          <div className="chart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 className="panel-title" style={{ marginBottom: '4px' }}>Telecaller Performance Ranking</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Displays rankings based on interactions and outbound conversion rates.
                </p>
              </div>
              <span style={{ fontSize: '20px' }}>📞</span>
            </div>

            {telecallerPerformance.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 0', fontSize: '13px' }}>
                No telecallers assigned yet. Add telecallers in Settings.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #f1f5f9', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
                      <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600 }}>Rank</th>
                      <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 600 }}>Telecaller Name</th>
                      <th style={{ textAlign: 'center', padding: '8px 6px', fontWeight: 600 }}>Calls</th>
                      <th style={{ textAlign: 'center', padding: '8px 6px', fontWeight: 600 }}>Leads Contacted</th>
                      <th style={{ textAlign: 'center', padding: '8px 6px', fontWeight: 600 }}>Conversions</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 600 }}>Conversion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {telecallerPerformance.map((tc, i) => (
                      <tr key={tc.name} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 6px', fontWeight: 700, color: rankLabelColor(i), fontSize: '15px' }}>
                          {rankMedal(i) || <span style={{ color: '#94a3b8', fontWeight: 600 }}>{i + 1}</span>}
                        </td>
                        <td style={{ padding: '12px 6px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>{tc.name}</div>
                          {rankLabel(i) && (
                            <div style={{
                              display: 'inline-block', marginTop: 3, fontSize: '10px', fontWeight: 700,
                              padding: '1px 7px', borderRadius: 20,
                              background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : '#fff7ed',
                              color: rankLabelColor(i)
                            }}>
                              {rankLabel(i)}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', padding: '12px 6px', color: '#64748b', fontWeight: 600 }}>{tc.callsMade}</td>
                        <td style={{ textAlign: 'center', padding: '12px 6px', color: '#64748b', fontWeight: 600 }}>{tc.leadsContacted}</td>
                        <td style={{ textAlign: 'center', padding: '12px 6px', color: '#10b981', fontWeight: 700, fontSize: '14px' }}>{tc.conversions}</td>
                        <td style={{ textAlign: 'right', padding: '12px 6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                            <div style={{ width: 60, height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${tc.convRate}%`, background: tc.convRate > 50 ? '#10b981' : tc.convRate > 20 ? '#3b82f6' : '#e2e8f0', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontWeight: 800, color: tc.convRate > 0 ? '#3b82f6' : '#94a3b8', minWidth: 36, textAlign: 'right' }}>{tc.convRate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="chart-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>
            <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none" style={{ color: 'var(--primary)', marginBottom: '8px' }}><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Access Restricted</h4>
            <p style={{ fontSize: '11.5px', maxWidth: '280px', lineHeight: '1.5' }}>Telecaller performance rankings are restricted to Administrators.</p>
          </div>
        )}

        {/* Counselor Comparative rankings leaderboard */}
        {activeRole !== 'Counselor' ? (
          <div className="chart-card">
            <h3 className="panel-title" style={{ marginBottom: '6px' }}>Counselor Performance Rankings</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Comparative leaderboard ranking team enrollment speed and conversion rates.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
              {counselorPerformance.map((perf, index) => {
                const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#9ca3af' : '#d97706';
                const rankText = index === 0 ? '🏆 1st' : index === 1 ? '🥈 2nd' : '🥉 3rd';
                return (
                  <div key={perf.name} className="counselor-performance-row" style={{ border: '1px solid rgba(0,0,0,0.03)', padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.005)' }}>
                    <div className="counselor-prof-avatar" style={{ gap: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: rankColor, width: '42px', textTransform: 'uppercase' }}>{rankText}</span>
                      <div className="card-counselor-avatar" style={{ width: '28px', height: '28px', fontSize: '11px', fontWeight: '700' }}>
                        {perf.name.split(' ').map(n => n[0]).join('')}
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
            <p style={{ fontSize: '11.5px', maxWidth: '280px', lineHeight: '1.5' }}>Detailed comparative counselor leaderboard rankings are restricted to Telecallers &amp; Administrators.</p>
          </div>
        )}
      </div>
    </div>
  );
}
