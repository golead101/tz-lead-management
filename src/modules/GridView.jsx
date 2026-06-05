import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import DetailTimeline from './DetailTimeline';

export default function GridView() {
  const {
    leads,
    courses,
    pipelineStages,
    counselors,
    activeRole,
    activeUser,
    bulkReassignLeads,
    bulkUpdateStage,
    addLead,
    searchQuery,
    selectedLeadId,
    setSelectedLeadId,
    setActiveView,
    showToastMsg,
    showDetailModal,
    setShowDetailModal
  } = useCRM();

  // Filter States
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedStage, setSelectedStage] = useState('All');
  const [selectedCounselor, setSelectedCounselor] = useState(activeRole === 'Counselor' ? activeUser : 'All');
  const [selectedSource, setSelectedSource] = useState('All');

  // Sorting State
  const [sortBy, setSortBy] = useState('createdDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Selection State for Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Import CSV Modal State
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');

  // Bulk operation popovers
  const [bulkReassignOpen, setBulkReassignOpen] = useState(false);
  const [bulkStageOpen, setBulkStageOpen] = useState(false);
  const [bulkCounselorName, setBulkCounselorName] = useState(counselors[0]?.name || '');
  const [bulkStageName, setBulkStageName] = useState('Contacted');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter Leads
  const filteredLeads = leads.filter(lead => {
    if (activeRole === 'Counselor' && lead.counselor !== activeUser) return false;
    if (selectedCourse !== 'All' && lead.course !== selectedCourse) return false;
    if (selectedStage !== 'All' && lead.stage !== selectedStage) return false;
    if (selectedCounselor !== 'All' && lead.counselor !== selectedCounselor) return false;
    if (selectedSource !== 'All') {
      const srcLower = (lead.source || '').toLowerCase();
      if (selectedSource === 'Meta') {
        if (!srcLower.includes('meta')) return false;
      } else if (selectedSource === 'Google Ads') {
        if (!srcLower.includes('google')) return false;
      } else if (selectedSource === 'Website') {
        if (!srcLower.includes('website')) return false;
      } else {
        if (lead.source !== selectedSource) return false;
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.phone.includes(q) ||
        lead.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sort Leads
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    let valA = a[sortBy] || '';
    let valB = b[sortBy] || '';
    if (sortBy === 'createdDate') {
      return sortOrder === 'desc'
        ? new Date(valB) - new Date(valA)
        : new Date(valA) - new Date(valB);
    }
    valA = valA.toString().toLowerCase();
    valB = valB.toString().toLowerCase();
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginated Leads
  const totalPages = Math.ceil(sortedLeads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLeads = sortedLeads.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return '↕';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  // Row Selection helpers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedLeads.map(l => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (e, leadId) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, leadId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== leadId));
    }
  };

  // Bulk Actions
  const executeBulkReassign = () => {
    bulkReassignLeads(selectedIds, bulkCounselorName);
    setSelectedIds([]);
    setBulkReassignOpen(false);
  };

  const executeBulkStageUpdate = () => {
    bulkUpdateStage(selectedIds, bulkStageName);
    setSelectedIds([]);
    setBulkStageOpen(false);
  };

  // CSV Import Parser with Deduplication Algorithm
  const handleCsvImport = () => {
    if (!csvText.trim()) return;
    const lines = csvText.split('\n');
    let addedCount = 0;
    let dupCount = 0;

    lines.forEach((line, index) => {
      if (index === 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('email'))) {
        return;
      }
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 3) return;
      const [name, email, phone, course, source] = parts;
      const duplicateExists = leads.some(lead =>
        (email && lead.email.toLowerCase() === email.toLowerCase()) ||
        (phone && lead.phone.replace(/[^0-9]/g, '') === phone.replace(/[^0-9]/g, ''))
      );
      if (duplicateExists) {
        dupCount++;
      } else {
        addLead({
          name: name,
          email: email || '',
          phone: phone || '',
          course: course || courses[0]?.name,
          source: source || 'CSV Import',
          counselor: activeUser,
          stage: 'New Lead'
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      showToastMsg(`CSV parsing completed. Imported ${addedCount} leads.`);
    }
    if (dupCount > 0) {
      showToastMsg(`Identified & bypassed ${dupCount} duplicate records.`, 'error');
    }
    setImportOpen(false);
    setCsvText('');
  };

  const handleRowClick = (leadId) => {
    setSelectedLeadId(leadId);
    setShowDetailModal(true);
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Quick stats
  const totalAll = leads.filter(l => activeRole !== 'Counselor' || l.counselor === activeUser).length;
  const convertedCount = filteredLeads.filter(l => l.stage === 'Converted').length;
  const activeFiltersCount = [selectedCourse, selectedStage, selectedCounselor, selectedSource].filter(f => f !== 'All').length;

  // Get relative time string
  const getRelativeTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="fade-in">
      {/* ──────────── HEADER ──────────── */}
      <div className="gv-header">
        <div className="gv-header-left">
          <h2 className="gv-title">Lead Directory</h2>
          <div className="gv-breadcrumb">
            <span onClick={() => setActiveView('dashboard')} style={{ cursor: 'pointer', color: 'var(--primary)' }}>Dashboard</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            <span>All Leads</span>
          </div>
        </div>
        <div className="gv-header-actions">
          <button className="gv-btn-outline" onClick={() => setImportOpen(true)}>
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
            Import CSV
          </button>
          <button className="gv-btn-primary" onClick={() => { setSelectedLeadId(null); setShowDetailModal(true); }}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2.5"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.5"/></svg>
            Add Lead
          </button>
        </div>
      </div>

      {/* ──────────── STATS BAR ──────────── */}
      <div className="gv-stats-bar">
        <div className="gv-stat-chip">
          <span className="gv-stat-number">{filteredLeads.length}</span>
          <span className="gv-stat-label">
            {filteredLeads.length === totalAll ? 'Total Leads' : `of ${totalAll} Leads`}
          </span>
        </div>

        <div className="gv-stat-chip">
          <span className="gv-stat-dot" style={{ background: '#059669' }} />
          <span className="gv-stat-number" style={{ color: '#059669' }}>{convertedCount}</span>
          <span className="gv-stat-label">Converted</span>
        </div>
        {activeFiltersCount > 0 && (
          <div className="gv-stat-chip gv-active-filter-chip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active</span>
            <button
              className="gv-clear-filters"
              onClick={() => { setSelectedCourse('All'); setSelectedStage('All'); setSelectedCounselor('All'); setSelectedSource('All'); setCurrentPage(1); }}
            >Clear</button>
          </div>
        )}
      </div>

      {/* ──────────── FILTERS ──────────── */}
      <div className="gv-filter-bar">
        <div className="gv-filter-group">
          <label className="gv-filter-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 014 17V5a2 2 0 012-2h14v14H6.5A2.5 2.5 0 004 19.5z"/></svg>
            Course
          </label>
          <select
            value={selectedCourse}
            onChange={(e) => { setSelectedCourse(e.target.value); setCurrentPage(1); }}
            className="gv-filter-select"
          >
            <option value="All">All Programs</option>
            {courses.map(c => (
              <option key={c.id} value={c.name}>{c.code} — {c.name}</option>
            ))}
          </select>
        </div>

        <div className="gv-filter-group">
          <label className="gv-filter-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            Stage
          </label>
          <select
            value={selectedStage}
            onChange={(e) => { setSelectedStage(e.target.value); setCurrentPage(1); }}
            className="gv-filter-select"
          >
            <option value="All">All Stages</option>
            {pipelineStages.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        {activeRole !== 'Counselor' && (
          <div className="gv-filter-group">
            <label className="gv-filter-label">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z"/></svg>
              Owner
            </label>
            <select
              value={selectedCounselor}
              onChange={(e) => { setSelectedCounselor(e.target.value); setCurrentPage(1); }}
              className="gv-filter-select"
            >
              <option value="All">All Counselors</option>
              {counselors.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="gv-filter-group">
          <label className="gv-filter-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            Source
          </label>
          <select
            value={selectedSource}
            onChange={(e) => { setSelectedSource(e.target.value); setCurrentPage(1); }}
            className="gv-filter-select"
          >
            <option value="All">All Sources</option>
            <option value="Meta">Meta</option>
            <option value="Google Ads">Google Ads</option>
            <option value="Website">Website</option>
          </select>
        </div>
      </div>

      {/* ──────────── BULK ACTIONS ──────────── */}
      {selectedIds.length > 0 && (
        <div className="gv-bulk-bar">
          <div className="gv-bulk-left">
            <div className="gv-bulk-count">{selectedIds.length}</div>
            <span>lead{selectedIds.length > 1 ? 's' : ''} selected</span>
          </div>
          <div className="gv-bulk-right">
            <div style={{ position: 'relative' }}>
              <button className="gv-btn-outline gv-btn-sm" onClick={() => { setBulkReassignOpen(!bulkReassignOpen); setBulkStageOpen(false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                Reassign
              </button>
              {bulkReassignOpen && (
                <div className="gv-popover">
                  <label className="form-label" style={{ fontSize: '11px' }}>Assign to Counselor</label>
                  <select className="gv-filter-select" style={{ width: '100%' }} value={bulkCounselorName} onChange={(e) => setBulkCounselorName(e.target.value)}>
                    {counselors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <button className="gv-btn-primary gv-btn-sm" style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }} onClick={executeBulkReassign}>Apply</button>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button className="gv-btn-outline gv-btn-sm" onClick={() => { setBulkStageOpen(!bulkStageOpen); setBulkReassignOpen(false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Move Stage
              </button>
              {bulkStageOpen && (
                <div className="gv-popover">
                  <label className="form-label" style={{ fontSize: '11px' }}>Move to Stage</label>
                  <select className="gv-filter-select" style={{ width: '100%' }} value={bulkStageName} onChange={(e) => setBulkStageName(e.target.value)}>
                    {pipelineStages.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <button className="gv-btn-primary gv-btn-sm" style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }} onClick={executeBulkStageUpdate}>Apply</button>
                </div>
              )}
            </div>

            <button className="gv-btn-ghost gv-btn-sm" onClick={() => setSelectedIds([])}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* ──────────── DATA TABLE ──────────── */}
      <div className="gv-table-card">
        <div className="gv-table-scroll">
          <table className="gv-table">
            <thead>
              <tr>
                <th style={{ width: '44px' }}>
                  <label className="gv-checkbox-wrap">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedIds.length === paginatedLeads.length && paginatedLeads.length > 0}
                    />
                    <span className="gv-checkmark" />
                  </label>
                </th>
                <th className="gv-th-sortable" onClick={() => handleSort('name')}>
                  <span>Student</span>
                  <span className="gv-sort-icon">{getSortIcon('name')}</span>
                </th>
                <th className="gv-th-sortable" onClick={() => handleSort('course')}>
                  <span>Program</span>
                  <span className="gv-sort-icon">{getSortIcon('course')}</span>
                </th>
                <th className="gv-th-sortable" onClick={() => handleSort('stage')}>
                  <span>Status</span>
                  <span className="gv-sort-icon">{getSortIcon('stage')}</span>
                </th>
                <th className="gv-th-sortable" onClick={() => handleSort('source')}>
                  <span>Source</span>
                  <span className="gv-sort-icon">{getSortIcon('source')}</span>
                </th>
                <th className="gv-th-sortable" onClick={() => handleSort('counselor')}>
                  <span>Owner</span>
                  <span className="gv-sort-icon">{getSortIcon('counselor')}</span>
                </th>
                <th className="gv-th-sortable" onClick={() => handleSort('createdDate')}>
                  <span>Created</span>
                  <span className="gv-sort-icon">{getSortIcon('createdDate')}</span>
                </th>
                <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="gv-empty-state">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z"/></svg>
                      <h4>No leads found</h4>
                      <p>Try adjusting your filters or create a new lead to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead, idx) => {
                  const isChecked = selectedIds.includes(lead.id);
                  const isOverdue = lead.followupDate && new Date(lead.followupDate) < new Date();

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => handleRowClick(lead.id)}
                      className={`${isChecked ? 'gv-row-selected' : ''} ${isOverdue ? 'gv-row-overdue' : ''}`}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <label className="gv-checkbox-wrap">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleSelectRow(e, lead.id)}
                          />
                          <span className="gv-checkmark" />
                        </label>
                      </td>

                      {/* Student */}
                      <td>
                        <div className="gv-student-cell">
                          <div className="gv-avatar" style={{
                            background: `hsl(${lead.name.charCodeAt(0) * 7 % 360}, 55%, 92%)`,
                            color: `hsl(${lead.name.charCodeAt(0) * 7 % 360}, 60%, 40%)`
                          }}>
                            {getInitials(lead.name)}
                          </div>
                          <div className="gv-student-info">
                            <span className="gv-student-name">{lead.name}</span>
                            <span className="gv-student-meta">{lead.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Program */}
                      <td>
                        <span className="gv-course-text">{lead.course}</span>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`gv-status-badge status-${lead.stage.toLowerCase().replace(/ /g, '-')}`}>
                          {lead.stage}
                        </span>
                      </td>

                      {/* Source */}
                      <td>
                        <span className="gv-source-text">{lead.source}</span>
                      </td>

                      {/* Owner */}
                      <td>
                        <div className="gv-owner-cell">
                          <div className="gv-owner-dot">{getInitials(lead.counselor)}</div>
                          <span className="gv-owner-name">{lead.counselor.split(' ')[0]}</span>
                        </div>
                      </td>

                      {/* Created */}
                      <td>
                        <span className="gv-time-text">{getRelativeTime(lead.createdDate)}</span>
                      </td>

                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="gv-row-actions">
                          <button
                            className="gv-action-icon"
                            title="View Detail"
                            onClick={() => handleRowClick(lead.id)}
                          >
                            <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                          </button>
                          <button
                            className="gv-action-icon"
                            title="WhatsApp Chat"
                            onClick={() => { setSelectedLeadId(lead.id); setActiveView('whatsapp'); }}
                            style={{ color: '#059669' }}
                          >
                            <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ──────────── PAGINATION ──────────── */}
        {totalPages > 0 && (
          <div className="gv-pagination">
            <span className="gv-pagination-info">
              Showing <strong>{sortedLeads.length > 0 ? startIndex + 1 : 0}</strong> – <strong>{Math.min(startIndex + itemsPerPage, sortedLeads.length)}</strong> of <strong>{sortedLeads.length}</strong> leads
            </span>
            <div className="gv-pagination-controls">
              <button
                className="gv-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                title="First page"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg>
              </button>
              <button
                className="gv-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                title="Previous page"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>

              {getPageNumbers().map(page => (
                <button
                  key={page}
                  className={`gv-page-num ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}

              <button
                className="gv-page-btn"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                title="Next page"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
              <button
                className="gv-page-btn"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(totalPages)}
                title="Last page"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ──────────── CSV IMPORT MODAL ──────────── */}
      {importOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: '560px' }}>
            <div className="modal-header">
              <div>
                <h4 className="modal-title">Import Leads from CSV</h4>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Bulk import student inquiries from spreadsheet data</p>
              </div>
              <button className="modal-close-btn" onClick={() => setImportOpen(false)}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5"/></svg>
              </button>
            </div>

            <div className="modal-body">
              <div style={{ background: 'rgba(37, 99, 235, 0.04)', border: '1px solid rgba(37, 99, 235, 0.12)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                <strong style={{ color: '#2563eb' }}>Format:</strong> Each row should follow — <code style={{ background: 'rgba(0,0,0,0.04)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>Name, Email, Phone, Course, Source</code>
              </div>

              <div className="form-group">
                <textarea
                  className="form-control"
                  style={{ minHeight: '160px', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.6' }}
                  placeholder={"Aakash Nair, aakash@nair.com, +91 9555512345, Full-Stack Web Development, Referral\nKavita Sen, kavita.sen@outlook.com, +91 9888898888, Data Science & AI, Meta Ads"}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                />
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                <span><strong>Duplicate protection enabled</strong> — matching emails/phones will be automatically skipped.</span>
              </div>
            </div>

            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setImportOpen(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleCsvImport}>
                <svg viewBox="0 0 24 24" width="15" height="15"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                Parse & Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────── LEAD DETAIL MODAL ──────────── */}
      {showDetailModal && (
        <div className="lead-detail-modal-overlay" onClick={() => { setSelectedLeadId(null); setShowDetailModal(false); }}>
          <div className="lead-detail-modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <button 
              type="button" 
              className="lead-detail-modal-close" 
              onClick={() => { setSelectedLeadId(null); setShowDetailModal(false); }}
              title="Close Details"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <DetailTimeline 
              onClose={() => { setSelectedLeadId(null); setShowDetailModal(false); }} 
              backText="Back to Leads"
              hideTimeline={true} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
