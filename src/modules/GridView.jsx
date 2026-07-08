import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import DetailTimeline from './DetailTimeline';
import * as XLSX from 'xlsx';


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
    bulkDeleteLeads,
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
    logCall,
    updateLead,
    deleteLead,
    setWhatsappSubView,
    setPrefilledCampaignLeads
  } = useCRM();

  // Filter States
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedStage, setSelectedStage] = useState('All');
  const [selectedCounselor, setSelectedCounselor] = useState('All');
  const [selectedSource, setSelectedSource] = useState('All');
  const [selectedTemperature, setSelectedTemperature] = useState('All');

  const [dateRangeFilter, setDateRangeFilter] = useState('All Time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [gridSearch, setGridSearch] = useState('');

  // Sorting State
  const [sortBy, setSortBy] = useState('createdDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Selection State for Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Import CSV Modal State
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [uploadedFileData, setUploadedFileData] = useState(null);

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
    if (activeRole === 'Counselor' && lead.counselor !== activeUser) {
      const src = (lead.source || '').toLowerCase();
      const isGlobal = src.includes('meta') || src.includes('google') || src.includes('website');
      if (!isGlobal) return false;
    }
    if (selectedCourse !== 'All' && lead.course !== selectedCourse) return false;
    if (selectedStage !== 'All' && lead.stage !== selectedStage) return false;
    if (selectedTemperature !== 'All' && (lead.temperature || 'Warm') !== selectedTemperature) return false;
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

    if (dateRangeFilter !== 'All Time') {
      const leadDate = new Date(lead.createdDate);
      const today = new Date();
      if (dateRangeFilter === 'Today') {
        const startOfDay = new Date(today);
        startOfDay.setHours(0,0,0,0);
        if (leadDate < startOfDay) return false;
      } else if (dateRangeFilter === 'Last 7 Days') {
        const past = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (leadDate < past) return false;
      } else if (dateRangeFilter === 'Last 30 Days') {
        const past = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (leadDate < past) return false;
      } else if (dateRangeFilter === 'This Month') {
        if (leadDate.getMonth() !== today.getMonth() || leadDate.getFullYear() !== today.getFullYear()) return false;
      } else if (dateRangeFilter === 'Custom Range') {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0,0,0,0);
          if (leadDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23,59,59,999);
          if (leadDate > end) return false;
        }
      }
    }

    if (gridSearch) {
      const q = gridSearch.toLowerCase();
      if (
        !String(lead.name || '').toLowerCase().includes(q) &&
        !String(lead.phone || '').includes(q)
      ) {
        return false;
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        String(lead.name || '').toLowerCase().includes(q) ||
        String(lead.phone || '').includes(q) ||
        String(lead.location || '').toLowerCase().includes(q)
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

  const executeBulkDelete = () => {
    if (confirm(`Are you sure you want to completely delete ${selectedIds.length} selected lead(s)? This cannot be undone.`)) {
      bulkDeleteLeads(selectedIds);
      setSelectedIds([]);
    }
  };

  const executeSendCampaign = () => {
    const selected = leads.filter(l => selectedIds.includes(l.id));
    setPrefilledCampaignLeads(selected);
    setSelectedIds([]);
    setActiveView('gowhatsapp');
    setWhatsappSubView('new-campaign');
  };

  // CSV Import Parser with Deduplication Algorithm
  const handleCsvImport = () => {
    const dataToProcess = uploadedFileData || csvText;
    if (!dataToProcess || typeof dataToProcess !== 'string' || !dataToProcess.trim()) return;
    const lines = dataToProcess.split('\n');
    let addedCount = 0;
    let dupCount = 0;

    lines.forEach((line, index) => {
      if (index === 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('email') || line.toLowerCase().includes('phone'))) {
        return;
      }
    });

    let nameIdx = 0, emailIdx = 1, phoneIdx = 2, courseIdx = 3, sourceIdx = 4;
    let hasHeader = false;

    if (lines.length > 0) {
      const headerLine = lines[0].toLowerCase();
      if (headerLine.includes('name') || headerLine.includes('email') || headerLine.includes('phone') || headerLine.includes('program')) {
        hasHeader = true;
        const headers = lines[0].split(',').map(p => p.trim().toLowerCase());
        
        nameIdx = headers.findIndex(h => h.includes('name'));
        emailIdx = headers.findIndex(h => h.includes('email'));
        phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('contact') || h.includes('mobile'));
        courseIdx = headers.findIndex(h => h.includes('course') || h.includes('program'));
        sourceIdx = headers.findIndex(h => h.includes('source'));
      }
    }

    lines.forEach((line, index) => {
      if (index === 0 && hasHeader) return;
      
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 2) return;
      
      let name = '', email = '', phone = '', course = '', source = '';
      
      if (hasHeader) {
         name = nameIdx !== -1 && nameIdx < parts.length ? parts[nameIdx] : '';
         email = emailIdx !== -1 && emailIdx < parts.length ? parts[emailIdx] : '';
         phone = phoneIdx !== -1 && phoneIdx < parts.length ? parts[phoneIdx] : '';
         course = courseIdx !== -1 && courseIdx < parts.length ? parts[courseIdx] : '';
         source = sourceIdx !== -1 && sourceIdx < parts.length ? parts[sourceIdx] : '';
      } else {
         name = parts[0];
         email = parts[1];
         phone = parts[2];
         course = parts[3];
         source = parts[4];
      }
      
      if (!name && !email && !phone) return; // Skip completely empty rows

      const cleanPhone = phone ? String(phone).replace(/[^0-9]/g, '') : '';
      const cleanEmail = email ? email.toLowerCase() : '';

      const duplicateExists = leads.some(lead =>
        (cleanEmail && lead.email && lead.email.toLowerCase() === cleanEmail) ||
        (cleanPhone && String(lead.phone || '').replace(/[^0-9]/g, '') === cleanPhone)
      );
      if (duplicateExists) {
        dupCount++;
      } else {
        addLead({
          name: name || 'Unknown',
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
      showToastMsg(`Identified & bypassed ${dupCount} duplicate records.`);
    }
    setImportOpen(false);
    setCsvText('');
    setUploadedFileData(null);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setUploadedFileData(null);
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      setUploadedFileData(csv);
    } catch (error) {
      console.error("Error parsing file:", error);
      showToastMsg("Error parsing file. Please check format.", "error");
      setUploadedFileData(null);
    }
  };

  const handleRowClick = (leadId) => {
    setSelectedLeadId(leadId);
    setShowDetailModal(true);
  };

  const [timelineNoteText, setTimelineNoteText] = useState('');

  const [callOutcome, setCallOutcome] = useState('No Answer');
  const [callNotes, setCallNotes] = useState('');
  const [scheduleFollowup, setScheduleFollowup] = useState(false);
  const [followupDate, setFollowupDate] = useState('');

  const handleLogCallSubmit = () => {
    if (!selectedLeadId) return;
    logCall(selectedLeadId, {
      status: callOutcome,
      notes: callNotes,
      scheduleFollowup: scheduleFollowup,
      followupDate: followupDate,
      updateStage: scheduleFollowup ? 'Follow-up' : ''
    });
    setCallNotes('');
    setScheduleFollowup(false);
    setFollowupDate('');
    setCallOutcome('No Answer');
  };

  const handleAddNoteSubmit = () => {
    if (!timelineNoteText.trim() || !selectedLeadId) return;
    logNote(selectedLeadId, timelineNoteText.trim());
    setTimelineNoteText('');
  };

  // Edit Lead State on Card
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEducation, setEditEducation] = useState('');
  const [editCourse, setEditCourse] = useState('');
  const [editCounselor, setEditCounselor] = useState('');
  const [editStage, setEditStage] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editSubSource, setEditSubSource] = useState('');
  const [editFollowupDate, setEditFollowupDate] = useState('');

  const handleEditStart = (lead) => {
    setEditName(lead.name || '');
    setEditPhone(lead.phone || '');
    setEditEducation(lead.education || '');
    setEditCourse(lead.course || '');
    setEditCounselor(lead.counselor || 'Unassigned');
    setEditStage(lead.stage || 'New Lead');
    setEditSource(lead.source || 'Walk-in');
    setEditSubSource(lead.subSource || '');
    setEditFollowupDate(lead.followupDate || '');
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
      education: editEducation,
      course: editCourse,
      counselor: editCounselor,
      stage: editStage,
      source: editSource,
      subSource: editSubSource,
      followupDate: editStage === 'Follow-up' ? editFollowupDate : null
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
  const activeFiltersCount = [selectedCourse, selectedStage, selectedCounselor, selectedSource, dateRangeFilter].filter(f => f !== 'All' && f !== 'All Time').length;

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

  const getDisplayDateRange = () => {
    if (dateRangeFilter === 'Custom Range' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${startStr} - ${endStr}`;
    }
    return dateRangeFilter;
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
              onClick={() => { setSelectedCourse('All'); setSelectedStage('All'); setSelectedCounselor('All'); setSelectedSource('All'); setDateRangeFilter('All Time'); setCustomStartDate(''); setCustomEndDate(''); setGridSearch(''); setCurrentPage(1); }}
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
            {courses.map((c, index) => (
              <option key={`${c.id}-${index}`} value={c.name}>{c.code} — {c.name}</option>
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
        <div className="gv-filter-group">
          <label className="gv-filter-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" strokeLinecap="round"/><circle cx="12" cy="12" r="4"/></svg>
            Temperature
          </label>
          <select
            value={selectedTemperature}
            onChange={(e) => { setSelectedTemperature(e.target.value); setCurrentPage(1); }}
            className="gv-filter-select"
          >
            <option value="All">All Leads</option>
            <option value="Hot">🔥 Hot Leads</option>
            <option value="Warm">☀️ Warm Leads</option>
            <option value="Cold">❄️ Cold Leads</option>
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
              {counselors.map((c, index) => (
                <option key={`${c.id}-${index}`} value={c.name}>
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

        <div className="gv-filter-group" style={{ position: 'relative' }}>
          <label className="gv-filter-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            Date Range
          </label>
          <div
            className="gv-filter-select"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: 'var(--dark-surface-solid)', userSelect: 'none', backgroundImage: 'none' }}
            onClick={() => setDateFilterOpen(!dateFilterOpen)}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getDisplayDateRange()}</span>
            {dateRangeFilter === 'Custom Range' && customStartDate && customEndDate ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '8px', flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '8px', flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
            )}
          </div>
          
          {dateFilterOpen && (
            <div className="gv-popover" style={{ width: '240px', padding: '8px 0', zIndex: 100, top: 'calc(100% + 4px)', left: 0, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                 {['All Time', 'Today', 'Last 7 Days', 'Last 30 Days', 'This Month'].map(option => (
                   <div 
                     key={option}
                     style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '13px', background: dateRangeFilter === option ? 'rgba(37, 99, 235, 0.08)' : 'transparent', color: dateRangeFilter === option ? '#2563eb' : 'inherit', fontWeight: dateRangeFilter === option ? 600 : 400, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                     onClick={() => {setDateRangeFilter(option); setDateFilterOpen(false); setCurrentPage(1);}}
                     onMouseEnter={(e) => { if (dateRangeFilter !== option) e.currentTarget.style.background = 'var(--dark-bg)' }}
                     onMouseLeave={(e) => { if (dateRangeFilter !== option) e.currentTarget.style.background = 'transparent' }}
                   >
                     {option}
                     {dateRangeFilter === option && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>}
                   </div>
                 ))}
                 
                 <div 
                   style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '13px', background: dateRangeFilter === 'Custom Range' ? 'rgba(37, 99, 235, 0.08)' : 'transparent', color: dateRangeFilter === 'Custom Range' ? '#2563eb' : 'inherit', fontWeight: dateRangeFilter === 'Custom Range' ? 600 : 400, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                   onClick={() => setDateRangeFilter('Custom Range')}
                   onMouseEnter={(e) => { if (dateRangeFilter !== 'Custom Range') e.currentTarget.style.background = 'var(--dark-bg)' }}
                   onMouseLeave={(e) => { if (dateRangeFilter !== 'Custom Range') e.currentTarget.style.background = 'transparent' }}
                 >
                   Custom Range
                   {dateRangeFilter === 'Custom Range' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>}
                 </div>
              </div>
              
              {dateRangeFilter === 'Custom Range' && (
                <div style={{ padding: '12px 16px 4px 16px', marginTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', letterSpacing: '0.5px' }}>Start Date</label>
                  <input type="date" className="gv-filter-select" style={{ width: '100%', marginBottom: '12px', padding: '6px 10px', height: 'auto', fontSize: '13px' }} value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                  <label className="form-label" style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', letterSpacing: '0.5px' }}>End Date</label>
                  <input type="date" className="gv-filter-select" style={{ width: '100%', marginBottom: '16px', padding: '6px 10px', height: 'auto', fontSize: '13px' }} value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                  <button className="gv-btn-primary" style={{ width: '100%', justifyContent: 'center', height: '32px', fontSize: '13px' }} onClick={() => { setDateFilterOpen(false); setCurrentPage(1); }}>Apply Range</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="gv-filter-group">
          <label className="gv-filter-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Search Lead
          </label>
          <input
            type="text"
            className="gv-filter-select"
            placeholder="Name or phone..."
            value={gridSearch}
            onChange={(e) => { setGridSearch(e.target.value); setCurrentPage(1); }}
            style={{ width: '160px', padding: '6px 12px' }}
          />
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

            <button className="gv-btn-outline gv-btn-sm" onClick={executeSendCampaign}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"/></svg>
              Send Campaign
            </button>

            <button className="gv-btn-outline gv-btn-sm" style={{ borderColor: '#fca5a5', color: '#ef4444' }} onClick={executeBulkDelete}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg>
              Delete
            </button>

            <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 4px' }}></div>

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
                  <span>Name & Contact</span>
                  <span className="gv-sort-icon">{getSortIcon('name')}</span>
                </th>
                <th className="gv-th-sortable" onClick={() => handleSort('stage')}>
                  <span>status</span>
                  <span className="gv-sort-icon">{getSortIcon('stage')}</span>
                </th>
                <th className="gv-th-sortable" onClick={() => handleSort('source')}>
                  <span>source</span>
                  <span className="gv-sort-icon">{getSortIcon('source')}</span>
                </th>
                <th className="gv-th-sortable" onClick={() => handleSort('counselor')}>
                  <span>Assigned To</span>
                  <span className="gv-sort-icon">{getSortIcon('counselor')}</span>
                </th>
                <th className="gv-th-sortable" onClick={() => handleSort('createdDate')}>
                  <span>Date</span>
                  <span className="gv-sort-icon">{getSortIcon('createdDate')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan="7">
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
                            <span className="gv-student-name">
                              {lead.name}
                              {lead.temperature && lead.temperature !== 'Unassigned' && (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', marginLeft: '6px', fontSize: '10px', fontWeight: 'bold',
                                  color: lead.temperature === 'Hot' ? '#ef4444' : lead.temperature === 'Cold' ? '#0ea5e9' : '#eab308'
                                }} title={`${lead.temperature} Lead`}>
                                  {lead.temperature === 'Hot' ? '🔥' : lead.temperature === 'Cold' ? '❄️' : '☀️'}
                                </span>
                              )}
                            </span>
                            <span className="gv-student-meta" style={{ fontFamily: 'monospace', opacity: 0.8 }}>{lead.phone || '-'}</span>
                          </div>
                        </div>
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

                      {/* Date */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {new Date(lead.createdDate).toLocaleDateString()}
                          </span>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            {new Date(lead.createdDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
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
              <button className="modal-close-btn" onClick={() => { setImportOpen(false); setUploadedFileData(null); setCsvText(''); }}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5"/></svg>
              </button>
            </div>

            <div className="modal-body">
              <div style={{ background: 'rgba(37, 99, 235, 0.04)', border: '1px solid rgba(37, 99, 235, 0.12)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                <strong style={{ color: '#2563eb' }}>Format:</strong> Each row should follow — <code style={{ background: 'rgba(0,0,0,0.04)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>Name, Email, Phone, Course, Source</code>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', display: 'block', color: 'var(--text-primary)' }}>Upload CSV or Excel Document</label>
                <input 
                  type="file" 
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileUpload}
                  style={{ fontSize: '12px', padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', width: '100%', background: 'var(--bg-primary)' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', display: 'block', color: 'var(--text-primary)' }}>Or paste data here</label>
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
              <button className="secondary-btn" onClick={() => { setImportOpen(false); setUploadedFileData(null); setCsvText(''); }}>Cancel</button>
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
        
        const currentLeadIndex = sortedLeads.findIndex(l => l.id === selectedLeadId);
        const hasPrev = currentLeadIndex > 0;
        const hasNext = currentLeadIndex >= 0 && currentLeadIndex < sortedLeads.length - 1;
        
        // Formatted creation date
        const formattedCreatedDate = lead.createdDate 
          ? new Date(lead.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + 
            new Date(lead.createdDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
          : 'Unknown Date';
          
        return (
          <div className="lead-detail-modal-overlay" onClick={() => { setSelectedLeadId(null); setShowDetailModal(false); setTimelineNoteText(''); setIsEditing(false); }}>
            <div className="lead-detail-modal-content" style={{ maxWidth: '960px', width: '92%', height: '88vh', maxHeight: '720px', padding: '0px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div className="gv-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 16px 28px', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>{lead.name}</h3>
                  <div className="gv-modal-meta" style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
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
                
                <div className="gv-modal-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

                  {/* Navigation Buttons */}
                  {!isEditing && (
                    <div style={{ display: 'flex', gap: '4px', marginRight: '4px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (hasPrev) {
                            setSelectedLeadId(sortedLeads[currentLeadIndex - 1].id);
                            setTimelineNoteText('');
                            setIsEditing(false);
                          }
                        }}
                        disabled={!hasPrev}
                        className="gv-btn-outline"
                        style={{ padding: '6px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !hasPrev ? 0.5 : 1, cursor: !hasPrev ? 'not-allowed' : 'pointer' }}
                        title="Previous Lead"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M15 18l-6-6 6-6"/></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (hasNext) {
                            setSelectedLeadId(sortedLeads[currentLeadIndex + 1].id);
                            setTimelineNoteText('');
                            setIsEditing(false);
                          }
                        }}
                        disabled={!hasNext}
                        className="gv-btn-outline"
                        style={{ padding: '6px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !hasNext ? 0.5 : 1, cursor: !hasNext ? 'not-allowed' : 'pointer' }}
                        title="Next Lead"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M9 18l6-6-6-6"/></svg>
                      </button>
                    </div>
                  )}

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
              <div className="gv-modal-body" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Left Column: Status, Agent, Complete Information */}
                <div className="gv-modal-left" style={{ width: '45%', padding: '24px 28px', borderRight: '1px solid #f1f5f9', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

                      {editStage === 'Follow-up' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569' }}>Follow-up Date & Time</label>
                          <input
                            type="datetime-local"
                            className="form-control"
                            value={editFollowupDate}
                            onChange={(e) => setEditFollowupDate(e.target.value)}
                            style={{ padding: '8px 12px', fontSize: '13px', height: '38px' }}
                          />
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569' }}>Assigned Agent</label>
                        <select
                          className="form-control"
                          value={editCounselor}
                          onChange={(e) => setEditCounselor(e.target.value)}
                          disabled={activeRole !== 'Admin'}
                          style={{ 
                            padding: '8px 12px', 
                            fontSize: '13px', 
                            height: '38px',
                            backgroundColor: activeRole !== 'Admin' ? '#f1f5f9' : undefined,
                            cursor: activeRole !== 'Admin' ? 'not-allowed' : undefined
                          }}
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
                <div className="gv-modal-right" style={{ width: '55%', padding: '24px 28px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>Activity Timeline</h4>
                  
                  {/* Add Note/Remark Input */}
                  <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '4px', display: 'block' }}>Call Outcome</label>
                        <select className="form-control" value={callOutcome} onChange={(e) => setCallOutcome(e.target.value)} style={{ padding: '8px 12px', fontSize: '13px', height: '36px', width: '100%' }}>
                          <option value="Answered">Answered</option>
                          <option value="No Answer">No Answer</option>
                          <option value="Busy">Busy</option>
                          <option value="Wrong Number">Wrong Number</option>
                          <option value="Interested">Interested</option>
                          <option value="Not Interested">Not Interested</option>
                          <option value="Call Later">Call Later</option>
                        </select>
                      </div>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '4px', display: 'block' }}>Notes</label>
                        <input type="text" className="form-control" placeholder="Additional remarks..." value={callNotes} onChange={(e) => setCallNotes(e.target.value)} style={{ padding: '8px 12px', fontSize: '13px', height: '36px', width: '100%' }} />
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: '#334155' }}>
                          <input type="checkbox" checked={scheduleFollowup} onChange={(e) => setScheduleFollowup(e.target.checked)} />
                          Schedule Follow-up
                        </label>
                        {scheduleFollowup && (
                          <input type="datetime-local" className="form-control" value={followupDate} onChange={(e) => setFollowupDate(e.target.value)} style={{ padding: '4px 8px', fontSize: '12px', height: '28px' }} />
                        )}
                      </div>
                      <button type="button" onClick={handleLogCallSubmit} className="gv-btn-primary" style={{ padding: '0 16px', fontSize: '12px', height: '32px' }}>
                        Log Activity
                      </button>
                    </div>
                  </div>
                  
                  {/* Timeline stream */}
                  <div className="gv-timeline-stream" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '0px' }}>
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
