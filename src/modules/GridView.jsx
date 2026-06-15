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
    setShowDetailModal,
    updateLeadStage,
    logNote,
    updateLead,
    deleteLead
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
  const [bulkCounselorName, setBulkCounselorName] = useState(counselors.filter(c => c.status === 'Active')[0]?.name || '');
  const [bulkStageName, setBulkStageName] = useState('Contacted');

  React.useEffect(() => {
    const activeCouns = counselors.filter(c => c.status === 'Active');
    if (activeCouns.length > 0 && !activeCouns.find(c => c.name === bulkCounselorName)) {
      setBulkCounselorName(activeCouns[0].name);
    }
  }, [counselors]);

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
      if (selectedSource === 'meta') {
        if (!srcLower.includes('meta')) return false;
      } else if (selectedSource === 'google') {
        if (!srcLower.includes('google')) return false;
      } else if (selectedSource === 'whatsapp') {
        if (!srcLower.includes('whatsapp')) return false;
      } else if (selectedSource === 'website') {
        if (!srcLower.includes('website')) return false;
      } else if (selectedSource === 'call') {
        if (!srcLower.includes('call') && !srcLower.includes('phone')) return false;
      } else if (selectedSource === 'walkin') {
        if (!srcLower.includes('walk-in') && !srcLower.includes('walkin')) return false;
      } else if (selectedSource === 'other') {
        const isMeta = srcLower.includes('meta');
        const isGoogle = srcLower.includes('google');
        const isWhatsapp = srcLower.includes('whatsapp');
        const isWebsite = srcLower.includes('website');
        const isCall = srcLower.includes('call') || srcLower.includes('phone');
        const isWalkin = srcLower.includes('walk-in') || srcLower.includes('walkin');
        if (isMeta || isGoogle || isWhatsapp || isWebsite || isCall || isWalkin) return false;
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

  const [timelineNoteText, setTimelineNoteText] = useState('');

  const handleAddNoteSubmit = () => {
    if (!timelineNoteText.trim() || !selectedLeadId) return;
    logNote(selectedLeadId, timelineNoteText.trim());
    setTimelineNoteText('');
  };

  // Edit Lead State on Card
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editEducation, setEditEducation] = useState('');
  const [editCourse, setEditCourse] = useState('');
  const [editCounselor, setEditCounselor] = useState('');
  const [editStage, setEditStage] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editSubSource, setEditSubSource] = useState('');

  const handleEditStart = (lead) => {
    setEditName(lead.name || '');
    setEditPhone(lead.phone || '');
    setEditEmail(lead.email || '');
    setEditEducation(lead.education || '');
    setEditCourse(lead.course || '');
    setEditCounselor(lead.counselor || 'Unassigned');
    setEditStage(lead.stage || 'New Lead');
    setEditSource(lead.source || 'Walk-in');
    setEditSubSource(lead.subSource || '');
    setIsEditing(true);
  };

  const handleEditSave = (leadId) => {
    if (!editName.trim()) {
      alert("Name is required");
      return;
    }
    updateLead(leadId, {
      name: editName,
      phone: editPhone,
      email: editEmail,
      education: editEducation,
      course: editCourse,
      counselor: editCounselor,
      stage: editStage,
      source: editSource,
      subSource: editSubSource
    });
    setIsEditing(false);
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
              <option key="all" value="All">All Counselors</option>
              {counselors.map(c => (
                <option key={c.id} value={c.name}>
                  {c.name} {c.status === 'Deactivated' ? '(Deactivated)' : ''}
                </option>
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
            <option value="meta">Meta</option>
            <option value="google">Google</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="website">Website</option>
            <option value="call">Call</option>
            <option value="walkin">Walk-in</option>
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
                    {counselors.filter(c => c.status === 'Active' && c.role !== 'Admin' && c.name.toLowerCase() !== 'admin').map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
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
                        <span className="gv-source-text">
                          {lead.source === 'Website Form' || lead.source === 'Website Form Widget' || lead.source === 'Website' 
                            ? 'Website Leads' 
                            : (lead.source === 'Walk-in' && lead.subSource ? `Walk-in (${lead.subSource})` : lead.source)}
                        </span>
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
                          {activeRole !== 'Telecaller' && (
                            <button
                              className="gv-action-icon"
                              title="WhatsApp Chat"
                              onClick={() => { setSelectedLeadId(lead.id); setActiveView('whatsapp'); }}
                              style={{ color: '#059669' }}
                            >
                              <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                            </button>
                          )}
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
      {showDetailModal && (() => {
        if (!selectedLeadId) {
          return (
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
          );
        }

        const lead = leads.find(l => l.id === selectedLeadId);
        if (!lead) return null;
        
        // Formatted creation date
        const formattedCreatedDate = lead.createdDate 
          ? new Date(lead.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + 
            new Date(lead.createdDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
          : 'Unknown Date';
          
        return (
          <div className="lead-detail-modal-overlay" onClick={() => { setSelectedLeadId(null); setShowDetailModal(false); setTimelineNoteText(''); setIsEditing(false); }}>
            <div className="lead-detail-modal-content" style={{ maxWidth: '960px', width: '92%', height: '88vh', maxHeight: '720px', padding: '0px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 16px 28px', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>{lead.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      {lead.phone}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {formattedCreatedDate}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

                  {/* Edit Lead Option */}
                  {!isEditing && (
                    <button 
                      type="button" 
                      onClick={() => handleEditStart(lead)}
                      className="gv-btn-primary"
                      style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', height: '36px' }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit Lead
                    </button>
                  )}

                  {/* Delete Lead Option */}
                  {!isEditing && (
                    <button 
                      type="button" 
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete lead "${lead.name}"?`)) {
                          deleteLead(lead.id);
                          setSelectedLeadId(null);
                          setShowDetailModal(false);
                        }
                      }}
                      className="gv-btn-outline"
                      style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', height: '36px', color: '#dc2626', borderColor: '#fca5a5' }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      Delete
                    </button>
                  )}

                  {/* Close Modal Button */}
                  <button 
                    type="button" 
                    onClick={() => { setSelectedLeadId(null); setShowDetailModal(false); setTimelineNoteText(''); setIsEditing(false); }}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>


              {/* Modal Body Columns */}
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Left Column: Status, Agent, Complete Information */}
                <div style={{ width: '45%', padding: '24px 28px', borderRight: '1px solid #f1f5f9', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h4 style={{ margin: '0', fontSize: '14px', fontWeight: '750', color: '#0f172a' }}>Edit Lead Information</h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569' }}>Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Name"
                          style={{ padding: '8px 12px', fontSize: '13px' }}
                          required
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569' }}>Phone</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="Phone"
                          style={{ padding: '8px 12px', fontSize: '13px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569' }}>Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="Email"
                          style={{ padding: '8px 12px', fontSize: '13px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569' }}>Lead Status</label>
                        <select
                          className="form-control"
                          value={editStage}
                          onChange={(e) => setEditStage(e.target.value)}
                          style={{ padding: '8px 12px', fontSize: '13px', height: '38px' }}
                        >
                          {pipelineStages.map(st => (
                            <option key={st.id} value={st.name}>{st.name}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569' }}>Assigned Agent</label>
                        <select
                          className="form-control"
                          value={editCounselor}
                          onChange={(e) => setEditCounselor(e.target.value)}
                          style={{ padding: '8px 12px', fontSize: '13px', height: '38px' }}
                        >
                          <option value="Unassigned">Unassigned</option>
                          {counselors.filter(c => c.status === 'Active').map(c => (
                            <option key={c.name} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569' }}>Education</label>
                        <input
                          type="text"
                          className="form-control"
                          value={editEducation}
                          onChange={(e) => setEditEducation(e.target.value)}
                          placeholder="Education"
                          style={{ padding: '8px 12px', fontSize: '13px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569' }}>Course</label>
                        <select
                          className="form-control"
                          value={editCourse}
                          onChange={(e) => setEditCourse(e.target.value)}
                          style={{ padding: '8px 12px', fontSize: '13px', height: '38px' }}
                        >
                          <option value="">Select Course</option>
                          {courses.map(c => (
                            <option key={c.id || c.name} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569' }}>Source</label>
                        <select
                          className="form-control"
                          value={editSource}
                          onChange={(e) => setEditSource(e.target.value)}
                          style={{ padding: '8px 12px', fontSize: '13px', height: '38px' }}
                        >
                          <option value="Walk-in">Walk-in</option>
                          <option value="Meta Ads">Meta Ads</option>
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="WhatsApp Inbound">WhatsApp Inbound</option>
                          <option value="Google Ads">Google Ads</option>
                          <option value="Website Form">Website Form</option>
                          <option value="Referral">Referral</option>
                        </select>
                      </div>

                      {editSource === 'Walk-in' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569' }}>Sub Source</label>
                          <input
                            type="text"
                            className="form-control"
                            value={editSubSource}
                            onChange={(e) => setEditSubSource(e.target.value)}
                            placeholder="Sub Source"
                            style={{ padding: '8px 12px', fontSize: '13px' }}
                          />
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => handleEditSave(lead.id)}
                          className="gv-btn-primary"
                          style={{ flex: 1, padding: '8px 16px', fontSize: '13px', height: '38px', justifyContent: 'center' }}
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="gv-btn-outline"
                          style={{ flex: 1, padding: '8px 16px', fontSize: '13px', height: '38px', justifyContent: 'center' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Lead Status Section */}
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>Lead Status</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderRadius: '8px', border: '1px solid #f1f5f9', background: '#f8fafc' }}>
                          <span className={`status-badge status-${lead.stage.toLowerCase().replace(/ /g, '-')}`} style={{ fontSize: '12px', padding: '3px 9px', fontWeight: '700' }}>
                            {lead.stage}
                          </span>
                        </div>
                      </div>

                      {/* Assigned Agent Section */}
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>Assigned Agent</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderRadius: '8px', border: '1px solid #f1f5f9', background: '#f8fafc' }}>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748b" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                            {lead.counselor || 'Unassigned'}
                          </span>
                        </div>
                      </div>

                      {/* Complete Information Section */}
                      <div>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>Complete Information</h4>
                        <div style={{ padding: '16px 20px', borderRadius: '12px', border: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {lead.source === 'WhatsApp' || lead.source === 'WhatsApp Inbound' ? (
                            <>
                              <div>
                                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.03em' }}>Form Name</div>
                                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>WhatsApp</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.03em' }}>Page Name</div>
                                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>WhatsApp Lead</div>
                              </div>
                            </>
                          ) : lead.source === 'Meta' || lead.source === 'Meta Ads' ? (
                            <>
                              <div>
                                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.03em' }}>Form Name</div>
                                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>Meta Ads Form</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.03em' }}>Page Name</div>
                                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>Meta Lead</div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.03em' }}>Source</div>
                                <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>
                                  {lead.source === 'Walk-in' && lead.subSource ? `Walk-in (${lead.subSource})` : lead.source}
                                </div>
                              </div>
                            </>
                          )}
                          <div>
                            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.03em' }}>Email</div>
                            <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{lead.email || 'Not Provided'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.03em' }}>Education</div>
                            <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{lead.education || 'Not Provided'}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.03em' }}>Course</div>
                            <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>{lead.course || 'Not Provided'}</div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>


                {/* Right Column: Activity Timeline */}
                <div style={{ width: '55%', padding: '24px 28px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>Activity Timeline</h4>
                  
                  {/* Timeline stream */}
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '0px' }}>
                    {(() => {
                      const timelineNodes = [...(lead.timeline || [])].reverse();
                      if (timelineNodes.length === 0) {
                        return (
                          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '13px' }}>
                            No activity logged yet.
                          </div>
                        );
                      }
                      return timelineNodes.map((node, index) => {
                        const formattedNodeTime = node.timestamp
                          ? new Date(node.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' +
                            new Date(node.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                          : 'Unknown time';
                        return (
                          <div key={node.id} style={{ display: 'flex', gap: '14px', position: 'relative' }}>
                            {/* Connecting Line */}
                            {index < timelineNodes.length - 1 && (
                              <div style={{ position: 'absolute', left: '5px', top: '12px', bottom: '-24px', width: '1px', borderLeft: '1px solid #e2e8f0' }} />
                            )}
                            {/* Circle dot */}
                            <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#64748b', marginTop: '6px', flexShrink: 0, zIndex: 1 }} />
                            
                            {/* Log card */}
                            <div style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #f1f5f9', background: '#f8fafc' }}>
                              <div style={{ fontSize: '13.5px', color: '#1e293b', fontWeight: '600', lineHeight: '1.4', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
                                {node.content || node.title}
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', fontWeight: '500' }}>
                                {node.user} • {formattedNodeTime}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>


                </div>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
