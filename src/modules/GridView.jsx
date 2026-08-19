import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';
import DetailTimeline from './DetailTimeline';
import * as XLSX from 'xlsx';


function MultiSelectFilter({ label, icon, options, selectedValues, onChange, allLabel = "ALL" }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleOption = (value) => {
    if (value === 'All') {
      onChange(['All']);
    } else {
      let newValues = selectedValues.filter(v => v !== 'All');
      if (newValues.includes(value)) {
        newValues = newValues.filter(v => v !== value);
      } else {
        newValues.push(value);
      }
      if (newValues.length === 0) {
        newValues = ['All'];
      }
      onChange(newValues);
    }
  };

  const isAllSelected = selectedValues.includes('All') || selectedValues.length === 0;

  let labelText = allLabel;
  if (!isAllSelected) {
    if (selectedValues.length === 1) {
      const opt = options.find(o => o.value === selectedValues[0]);
      labelText = opt ? opt.label : selectedValues[0];
    } else {
      labelText = `${selectedValues.length} Selected`;
    }
  }

  return (
    <div className="gv-filter-group" ref={dropdownRef} style={{ position: 'relative' }}>
      <label className="gv-filter-label">
        {icon}
        {label}
      </label>
      <div 
        className="gv-filter-select"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          backgroundImage: 'none',
          paddingRight: '12px'
        }}
      >
        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {labelText}
        </span>
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="#6b7280" 
          strokeWidth="2"
          style={{ 
            marginLeft: '8px', 
            transition: 'transform 0.15s ease', 
            transform: isOpen ? 'rotate(180deg)' : 'none',
            flexShrink: 0
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {isOpen && (
        <div 
          className="gv-popover" 
          style={{ 
            left: 0, 
            right: 'auto', 
            width: '240px', 
            maxHeight: '300px', 
            overflowY: 'auto', 
            padding: '8px', 
            zIndex: 150, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '4px',
            marginTop: '4px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
          }}
        >
          <label 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '6px 8px', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontSize: '12.5px',
              fontWeight: isAllSelected ? '600' : 'normal',
              background: isAllSelected ? '#f1f5f9' : 'transparent',
              color: isAllSelected ? 'var(--primary)' : 'var(--text-primary)',
              margin: 0
            }}
          >
            <input 
              type="checkbox" 
              checked={isAllSelected}
              onChange={() => handleToggleOption('All')}
              style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            {allLabel}
          </label>

          <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />

          {options.map((opt) => {
            const isChecked = selectedValues.includes(opt.value);
            return (
              <label 
                key={opt.value}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '6px 8px', 
                  borderRadius: '4px', 
                  cursor: 'pointer', 
                  fontSize: '12.5px',
                  fontWeight: isChecked ? '600' : 'normal',
                  background: isChecked ? '#eff6ff' : 'transparent',
                  color: isChecked ? 'var(--primary)' : 'var(--text-primary)',
                  margin: 0
                }}
              >
                <input 
                  type="checkbox" 
                  checked={isChecked}
                  onChange={() => handleToggleOption(opt.value)}
                  style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}


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
    bulkUpdateSource,
    bulkUpdateCourse,
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

  // Filter States (now supporting multi-select as arrays)
  const [selectedCourse, setSelectedCourse] = useState(['All']);
  const [selectedStage, setSelectedStage] = useState(['All']);
  const [selectedCounselor, setSelectedCounselor] = useState(['All']);
  const [selectedSource, setSelectedSource] = useState(['All']);
  const [selectedCampaign, setSelectedCampaign] = useState(['All']);
  const [selectedTemperature, setSelectedTemperature] = useState(['All']);

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
  const [bulkSourceOpen, setBulkSourceOpen] = useState(false);
  const [bulkCounselorName, setBulkCounselorName] = useState(counselors.filter(c => c.status === 'Active')[0]?.name || '');
  const [bulkStageName, setBulkStageName] = useState('Contacted');
  const [bulkSourceName, setBulkSourceName] = useState('Meta Ads');
  const [bulkCourseOpen, setBulkCourseOpen] = useState(false);
  const [bulkCourseName, setBulkCourseName] = useState(courses[0]?.name || '');

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
      return false;
    }
    // Course Multi-select filter
    if (selectedCourse && selectedCourse.length > 0 && !selectedCourse.includes('All')) {
      const leadC = (lead.course || '').trim().toLowerCase();
      const match = selectedCourse.some(val => {
        const filterC = val.trim().toLowerCase();
        return leadC === filterC || leadC.includes(filterC) || filterC.includes(leadC);
      });
      if (!match) return false;
    }
    // Stage Multi-select filter
    if (selectedStage && selectedStage.length > 0 && !selectedStage.includes('All')) {
      const leadS = (lead.stage || '').trim().toLowerCase();
      const match = selectedStage.some(val => {
        const filterS = val.trim().toLowerCase();
        return leadS === filterS;
      });
      if (!match) return false;
    }
    // Temperature Multi-select filter
    if (selectedTemperature && selectedTemperature.length > 0 && !selectedTemperature.includes('All')) {
      const leadTemp = lead.temperature || 'Warm';
      if (!selectedTemperature.includes(leadTemp)) return false;
    }
    // Counselor Multi-select filter
    if (selectedCounselor && selectedCounselor.length > 0 && !selectedCounselor.includes('All')) {
      const leadCoun = lead.counselor || 'Unassigned';
      const counLower = leadCoun.trim().toLowerCase();
      const isLeadUnassigned = counLower === '' || counLower === 'unassigned' || counLower === 'none';
      
      const match = selectedCounselor.some(val => {
        if (val === 'Unassigned') {
          return isLeadUnassigned;
        }
        return lead.counselor === val;
      });
      if (!match) return false;
    }
    // Source Multi-select filter
    if (selectedSource && selectedSource.length > 0 && !selectedSource.includes('All')) {
      const matchesSingleSource = (sourceOption) => {
        const srcLower = (lead.source || '').toLowerCase();
        if (sourceOption === 'meta') {
          if (!srcLower.includes('meta')) return false;
          if (selectedCampaign && selectedCampaign.length > 0 && !selectedCampaign.includes('All')) {
            const leadCampaign = (lead.campaign || lead.campaignName || lead.subSource || '').trim().toLowerCase();
            const campaignMatch = selectedCampaign.some(camp => {
              return leadCampaign === camp.trim().toLowerCase();
            });
            if (!campaignMatch) return false;
          }
          return true;
        }
        if (sourceOption === 'google') return srcLower.includes('google');
        if (sourceOption === 'whatsapp') return srcLower.includes('whatsapp');
        if (sourceOption === 'instagram') return srcLower.includes('instagram');
        if (sourceOption === 'website') return srcLower.includes('website');
        if (sourceOption === 'call') return srcLower.includes('call') || srcLower.includes('phone');
        if (sourceOption === 'walkin') return srcLower.includes('walk-in') || srcLower.includes('walkin');
        if (sourceOption === 'other') {
          const isMeta = srcLower.includes('meta');
          const isGoogle = srcLower.includes('google');
          const isWhatsapp = srcLower.includes('whatsapp');
          const isInstagram = srcLower.includes('instagram');
          const isWebsite = srcLower.includes('website');
          const isCall = srcLower.includes('call') || srcLower.includes('phone');
          const isWalkin = srcLower.includes('walk-in') || srcLower.includes('walkin');
          return !(isMeta || isGoogle || isWhatsapp || isInstagram || isWebsite || isCall || isWalkin);
        }
        return false;
      };

      const match = selectedSource.some(srcOpt => matchesSingleSource(srcOpt));
      if (!match) return false;
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

  const currentPageIds = paginatedLeads.map(l => l.id);
  const isAllPageSelected = paginatedLeads.length > 0 && currentPageIds.every(id => selectedIds.includes(id));
  const isSomePageSelected = currentPageIds.some(id => selectedIds.includes(id));

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

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentPageIds])));
    } else {
      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)));
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

  const executeBulkCourseUpdate = () => {
    bulkUpdateCourse(selectedIds, bulkCourseName);
    setSelectedIds([]);
    setBulkCourseOpen(false);
  };

  const executeBulkSourceUpdate = () => {
    bulkUpdateSource(selectedIds, bulkSourceName);
    setSelectedIds([]);
    setBulkSourceOpen(false);
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

  // CSV / Excel Import Parser
  const handleCsvImport = () => {
    const dataToProcess = uploadedFileData || csvText;
    if (!dataToProcess || typeof dataToProcess !== 'string' || !dataToProcess.trim()) return;

    // Helper to parse a single CSV line respecting quotes
    const parseCsvLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const lines = dataToProcess.split('\n').filter(l => l.trim() !== '');
    if (lines.length === 0) return;

    let nameIdx = -1, emailIdx = -1, phoneIdx = -1, courseIdx = -1, statusIdx = -1, sourceIdx = -1, counselorIdx = -1, tempIdx = -1, createdDateIdx = -1, campaignIdx = -1;
    let hasHeader = false;

    const firstLineParts = parseCsvLine(lines[0]);
    const firstLineLower = lines[0].toLowerCase();

    if (firstLineLower.includes('name') || firstLineLower.includes('email') || firstLineLower.includes('phone') || firstLineLower.includes('status') || firstLineLower.includes('assigned') || firstLineLower.includes('course')) {
      hasHeader = true;
      const headers = firstLineParts.map(h => h.trim().toLowerCase());

      nameIdx = headers.findIndex(h => h === 'name' || (h.includes('name') && !h.includes('campaign')));
      emailIdx = headers.findIndex(h => h.includes('email'));
      phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('contact') || h.includes('mobile'));
      courseIdx = headers.findIndex(h => h.includes('course') || h.includes('program'));
      statusIdx = headers.findIndex(h => h.includes('status') || h.includes('stage'));
      sourceIdx = headers.findIndex(h => h.includes('source') || h.includes('platform'));
      counselorIdx = headers.findIndex(h => h.includes('assigned') || h.includes('counselor') || h.includes('owner'));
      tempIdx = headers.findIndex(h => h.includes('temperature') || h.includes('temp') || h.includes('priority'));
      createdDateIdx = headers.findIndex(h => h.includes('created') || h.includes('date'));
      campaignIdx = headers.findIndex(h => h.includes('campaign'));
    }

    const mapCsvStage = (raw) => {
      if (!raw) return 'New Lead';
      const trimmed = raw.trim();
      const lower = trimmed.toLowerCase();
      if (lower === 'free class attend' || lower === 'free class' || lower === 'st-freeclass') return 'Free Class';
      if (lower === 'follow-up pending' || lower === 'followup pending' || lower === 'follow up') return 'Follow-up';
      if (lower === 'new lead' || lower === 'new') return 'New Lead';
      if (lower === 'contacted') return 'Contacted';
      if (lower === 'interested') return 'Interested';
      if (lower === 'demo scheduled' || lower === 'demo') return 'Demo Scheduled';
      if (lower === 'demo attended') return 'Demo Attended';
      if (lower === 'admission taken' || lower === 'converted' || lower === 'enrolled') return 'Converted';
      if (lower === 'not interested' || lower === 'lost') return 'Not Interested';
      return trimmed;
    };

    const mapCsvCounselor = (raw) => {
      if (!raw) return activeUser || 'Unassigned';
      const trimmed = raw.trim();
      if (trimmed.toLowerCase() === 'unassigned' || trimmed.toLowerCase() === 'none' || trimmed === '') {
        return 'Unassigned';
      }
      return trimmed;
    };

    const parseCsvDate = (raw) => {
      if (!raw || !raw.trim()) return new Date().toISOString();
      const str = raw.trim();
      try {
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      } catch (e) {}

      const parts = str.split(/[\/\-\s,:]+/);
      if (parts.length >= 3) {
        const d1 = parseInt(parts[0], 10);
        const d2 = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        if (!isNaN(d1) && !isNaN(d2) && !isNaN(y)) {
          const fullYear = y < 100 ? 2000 + y : y;
          const d = new Date(fullYear, d2 - 1, d1);
          if (!isNaN(d.getTime())) return d.toISOString();
        }
      }
      return str;
    };

    let addedCount = 0;
    let updatedCount = 0;

    lines.forEach((line, index) => {
      if (index === 0 && hasHeader) return;

      const parts = parseCsvLine(line);
      if (parts.length < 2) return;

      let name = '', email = '', phone = '', course = '', rawStatus = '', source = '', rawCounselor = '', rawTemp = '', rawCreatedDate = '', campaign = '';

      if (hasHeader) {
        name = nameIdx !== -1 && nameIdx < parts.length ? parts[nameIdx] : '';
        email = emailIdx !== -1 && emailIdx < parts.length ? parts[emailIdx] : '';
        phone = phoneIdx !== -1 && phoneIdx < parts.length ? parts[phoneIdx] : '';
        course = courseIdx !== -1 && courseIdx < parts.length ? parts[courseIdx] : '';
        rawStatus = statusIdx !== -1 && statusIdx < parts.length ? parts[statusIdx] : '';
        source = sourceIdx !== -1 && sourceIdx < parts.length ? parts[sourceIdx] : '';
        rawCounselor = counselorIdx !== -1 && counselorIdx < parts.length ? parts[counselorIdx] : '';
        rawTemp = tempIdx !== -1 && tempIdx < parts.length ? parts[tempIdx] : '';
        rawCreatedDate = createdDateIdx !== -1 && createdDateIdx < parts.length ? parts[createdDateIdx] : '';
        campaign = campaignIdx !== -1 && campaignIdx < parts.length ? parts[campaignIdx] : '';
      } else {
        if (parts.length === 4) {
          name = parts[0];
          phone = parts[1];
          source = parts[2];
          campaign = parts[3];
        } else if (parts.length === 5) {
          name = parts[0];
          phone = parts[1];
          source = parts[2];
          campaign = parts[3];
          rawCreatedDate = parts[4];
        } else if (parts.length === 6) {
          name = parts[0];
          phone = parts[1];
          source = parts[2];
          campaign = parts[3];
          rawCreatedDate = parts[4];
          rawCounselor = parts[5];
        } else {
          name = parts[0];
          email = parts[1];
          phone = parts[2];
          course = parts[3];
          rawStatus = parts.length > 4 ? parts[4] : '';
          source = parts.length > 5 ? parts[5] : '';
          campaign = parts.length > 6 ? parts[6] : '';
          rawCreatedDate = parts.length > 7 ? parts[7] : '';
        }
      }

      if (!name && !email && !phone) return;

      const cleanPhone = phone ? String(phone).replace(/[^0-9]/g, '') : '';
      const cleanEmail = email ? email.toLowerCase().trim() : '';

      const existingLead = leads.find(lead =>
        (cleanEmail && lead.email && lead.email.toLowerCase().trim() === cleanEmail) ||
        (cleanPhone && cleanPhone.length >= 10 && String(lead.phone || '').replace(/[^0-9]/g, '').slice(-10) === cleanPhone.slice(-10))
      );

      const finalCampaign = campaign ? campaign.trim() : '';

      if (existingLead) {
        // UPDATE existing lead with latest info from uploaded file
        const updatePayload = {};
        if (name && name.trim() && name !== 'Campaign Contact') updatePayload.name = name.trim();
        if (email && email.trim()) updatePayload.email = email.trim();
        if (course && course.trim()) updatePayload.course = course.trim();
        if (source && source.trim()) updatePayload.source = source.trim();
        if (finalCampaign) {
          updatePayload.campaign = finalCampaign;
          updatePayload.campaignName = finalCampaign;
          updatePayload.subSource = finalCampaign;
        }
        if (rawCounselor && rawCounselor.trim()) updatePayload.counselor = mapCsvCounselor(rawCounselor);
        if (rawStatus && rawStatus.trim()) updatePayload.stage = mapCsvStage(rawStatus);
        if (rawTemp && rawTemp.trim()) updatePayload.temperature = rawTemp.trim();
        if (rawCreatedDate && rawCreatedDate.trim()) updatePayload.createdDate = parseCsvDate(rawCreatedDate);

        if (Object.keys(updatePayload).length > 0) {
          updateLead(existingLead.id, updatePayload);
          updatedCount++;
        }
      } else {
        // ADD NEW LEAD with exact info from uploaded file
        const finalStage = mapCsvStage(rawStatus);
        const finalCounselor = mapCsvCounselor(rawCounselor);
        const finalCreatedDate = parseCsvDate(rawCreatedDate);
        const finalTemp = rawTemp && ['Hot', 'Warm', 'Cold'].includes(rawTemp.trim()) ? rawTemp.trim() : 'Hot';

        addLead({
          name: name || (cleanPhone ? cleanPhone : 'Lead'),
          email: email || '',
          phone: phone || '',
          course: course || '',
          source: source || 'CSV Import',
          subSource: finalCampaign,
          campaign: finalCampaign,
          campaignName: finalCampaign,
          counselor: finalCounselor,
          stage: finalStage,
          temperature: finalTemp,
          createdDate: finalCreatedDate,
          skipAutoReply: true,
          isBulkImport: true,
          disableAutoWelcome: true
        });
        addedCount++;
      }
    });

    if (addedCount > 0 || updatedCount > 0) {
      showToastMsg(`Import complete: ${addedCount} new leads added, ${updatedCount} existing leads updated with latest info.`);
      const lastPage = Math.ceil((leads.length + addedCount) / itemsPerPage);
      setCurrentPage(lastPage > 0 ? lastPage : 1);
    } else {
      showToastMsg('No new or updated lead data found in file.');
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

  const [callOutcome, setCallOutcome] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [scheduleFollowup, setScheduleFollowup] = useState(false);
  const [followupDate, setFollowupDate] = useState('');

  React.useEffect(() => {
    setCallOutcome('');
    setCallNotes('');
    setScheduleFollowup(false);
    setFollowupDate('');
  }, [selectedLeadId]);

  const handleLogCallSubmit = () => {
    if (!selectedLeadId || !callOutcome) return;
    const canFollowup = ['interested', 'busy', 'call later', 'answered', 'no answer'].includes((callOutcome || '').toLowerCase());
    const hasFollowup = canFollowup && scheduleFollowup && !!followupDate;
    logCall(selectedLeadId, {
      status: callOutcome,
      notes: callNotes,
      scheduleFollowup: hasFollowup,
      followupDate: hasFollowup ? followupDate : '',
      followupReason: hasFollowup ? (callNotes || 'Scheduled callback') : '',
      updateStage: callOutcome
    });
    setCallNotes('');
    setScheduleFollowup(false);
    setFollowupDate('');
    setCallOutcome('');
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
  const [editCampaign, setEditCampaign] = useState('');
  const [editFollowupDate, setEditFollowupDate] = useState('');

  const handleEditStart = (lead) => {
    setEditName(lead.name || '');
    setEditPhone(lead.phone || '');
    setEditEducation(lead.education || '');
    setEditCourse(lead.course || '');
    setEditCounselor(lead.counselor || 'Unassigned');
    setEditStage(lead.stage || 'New Lead');
    setEditSource(lead.source || '');
    setEditSubSource(lead.subSource || '');
    setEditCampaign(lead.campaign || lead.campaignName || '');
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
      campaign: editCampaign,
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
  const activeFiltersCount = [
    selectedCourse.length > 0 && !selectedCourse.includes('All'),
    selectedStage.length > 0 && !selectedStage.includes('All'),
    selectedCounselor.length > 0 && !selectedCounselor.includes('All'),
    selectedSource.length > 0 && !selectedSource.includes('All'),
    selectedCampaign.length > 0 && !selectedCampaign.includes('All'),
    selectedTemperature.length > 0 && !selectedTemperature.includes('All'),
    dateRangeFilter !== 'All Time'
  ].filter(Boolean).length;

  const uniqueMetaCampaigns = [...new Set(
    leads.filter(l => (l.source || '').toLowerCase().includes('meta'))
         .map(l => l.campaign || l.campaignName || l.subSource)
         .filter(Boolean)
  )];

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
    return dateRangeFilter === 'All Time' ? 'ALL' : dateRangeFilter;
  };
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
      showToastMsg('No leads to export.');
      return;
    }

    const exportData = filteredLeads.map(lead => ({
      Name: lead.name || '',
      Phone: lead.phone || '',
      Email: lead.email || '',
      Course: lead.course || '',
      Source: lead.source || '',
      Stage: lead.stage || '',
      Counselor: lead.counselor || '',
      Temperature: lead.temperature || '',
      'Created Date': lead.createdDate ? new Date(lead.createdDate).toLocaleString() : ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const csvOutput = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'leads_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToastMsg('Leads exported successfully.');
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
          <button className="gv-btn-outline" onClick={handleExportCSV}>
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
            Export CSV
          </button>
          <button className="gv-btn-outline" onClick={() => setImportOpen(true)}>
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M12 15v-12M7 8l5-5 5 5" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
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
              onClick={() => {
                setSelectedCourse(['All']);
                setSelectedStage(['All']);
                setSelectedCounselor(['All']);
                setSelectedSource(['All']);
                setSelectedCampaign(['All']);
                setSelectedTemperature(['All']);
                setDateRangeFilter('All Time');
                setCustomStartDate('');
                setCustomEndDate('');
                setGridSearch('');
                setCurrentPage(1);
              }}
            >Clear</button>
          </div>
        )}
      </div>

      {/* ──────────── FILTERS ──────────── */}
      <div className="gv-filter-bar">
        <MultiSelectFilter
          label="Course"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 014 17V5a2 2 0 012-2h14v14H6.5A2.5 2.5 0 004 19.5z"/></svg>}
          options={courses.map(c => ({ value: c.name, label: `${c.code ? `${c.code} — ` : ''}${c.name}` }))}
          selectedValues={selectedCourse}
          onChange={(vals) => { setSelectedCourse(vals); setCurrentPage(1); }}
        />

        <MultiSelectFilter
          label="Stage"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
          options={pipelineStages.map(s => ({ value: s.name, label: s.name }))}
          selectedValues={selectedStage}
          onChange={(vals) => { setSelectedStage(vals); setCurrentPage(1); }}
        />

        <MultiSelectFilter
          label="Temperature"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" strokeLinecap="round"/><circle cx="12" cy="12" r="4"/></svg>}
          options={[
            { value: 'Hot', label: '🔥 Hot Leads' },
            { value: 'Warm', label: '☀️ Warm Leads' },
            { value: 'Cold', label: '❄️ Cold Leads' }
          ]}
          selectedValues={selectedTemperature}
          onChange={(vals) => { setSelectedTemperature(vals); setCurrentPage(1); }}
        />

        {activeRole === 'Counselor' ? (
          <div className="gv-filter-group">
            <label className="gv-filter-label">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z"/></svg>
              ASSIGNED TO
            </label>
            <select className="gv-filter-select" disabled value={activeUser} style={{ opacity: 0.8 }}>
              <option value={activeUser}>{activeUser}</option>
            </select>
          </div>
        ) : (
          <MultiSelectFilter
            label="ASSIGNED TO"
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z"/></svg>}
            options={[
              { value: 'Unassigned', label: 'Unassigned' },
              ...counselors.map(c => ({
                value: c.name,
                label: `${c.name}${c.status === 'Deactivated' ? ' (Deactivated)' : ''}`
              }))
            ]}
            selectedValues={selectedCounselor}
            onChange={(vals) => { setSelectedCounselor(vals); setCurrentPage(1); }}
          />
        )}

        <MultiSelectFilter
          label="Source"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
          options={[
            { value: 'meta', label: 'Meta' },
            { value: 'google', label: 'Google' },
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'instagram', label: 'Instagram' },
            { value: 'website', label: 'Website' },
            { value: 'call', label: 'Call' },
            { value: 'walkin', label: 'Walk-in' },
            { value: 'other', label: 'Other' }
          ]}
          selectedValues={selectedSource}
          onChange={(vals) => {
            setSelectedSource(vals);
            setCurrentPage(1);
            if (!vals.includes('meta')) {
              setSelectedCampaign(['All']);
            }
          }}
        />

        {selectedSource && selectedSource.includes('meta') && (
          <MultiSelectFilter
            label="Campaign"
            icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" strokeLinecap="round"/><circle cx="12" cy="12" r="4"/></svg>}
            options={uniqueMetaCampaigns.map(c => ({ value: c, label: c }))}
            selectedValues={selectedCampaign}
            onChange={(vals) => { setSelectedCampaign(vals); setCurrentPage(1); }}
          />
        )}

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
                     {option === 'All Time' ? 'ALL' : option}
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
            {selectedIds.length < filteredLeads.length ? (
              <button 
                className="gv-btn-ghost gv-btn-sm" 
                style={{ marginLeft: '12px', color: 'var(--primary)', fontWeight: '600', textDecoration: 'underline', cursor: 'pointer' }}
                onClick={() => setSelectedIds(filteredLeads.map(l => l.id))}
              >
                Select all {filteredLeads.length} leads
              </button>
            ) : (
              filteredLeads.length > itemsPerPage && (
                <button 
                  className="gv-btn-ghost gv-btn-sm" 
                  style={{ marginLeft: '12px', color: 'var(--primary)', fontWeight: '600', textDecoration: 'underline', cursor: 'pointer' }}
                  onClick={() => setSelectedIds(currentPageIds)}
                >
                  Select current page only ({paginatedLeads.length})
                </button>
              )
            )}
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
                    <option value="Unassigned">Unassigned</option>
                    {counselors.filter(c => c.status === 'Active' && c.role !== 'Admin' && c.name.toLowerCase() !== 'admin').map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <button className="gv-btn-primary gv-btn-sm" style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }} onClick={executeBulkReassign}>Apply</button>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button className="gv-btn-outline gv-btn-sm" onClick={() => { setBulkStageOpen(!bulkStageOpen); setBulkReassignOpen(false); setBulkSourceOpen(false); }}>
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

            <div style={{ position: 'relative' }}>
              <button className="gv-btn-outline gv-btn-sm" onClick={() => { setBulkSourceOpen(!bulkSourceOpen); setBulkStageOpen(false); setBulkReassignOpen(false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                Change Source
              </button>
              {bulkSourceOpen && (
                <div className="gv-popover">
                  <label className="form-label" style={{ fontSize: '11px' }}>Update Source to</label>
                  <select className="gv-filter-select" style={{ width: '100%' }} value={bulkSourceName} onChange={(e) => setBulkSourceName(e.target.value)}>
                    <option value="Meta Ads">Meta Ads</option>
                    <option value="Walk-in">Walk-in</option>
                    <option value="WhatsApp Inbound">WhatsApp Inbound</option>
                    <option value="Website Embedded Form">Website Embedded Form</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Campaign Upload">Campaign Upload</option>
                  </select>
                  <button className="gv-btn-primary gv-btn-sm" style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }} onClick={executeBulkSourceUpdate}>Apply</button>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button className="gv-btn-outline gv-btn-sm" onClick={() => { setBulkCourseOpen(!bulkCourseOpen); setBulkSourceOpen(false); setBulkStageOpen(false); setBulkReassignOpen(false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 014 17V5a2 2 0 012-2h14v14H6.5A2.5 2.5 0 004 19.5z"/></svg>
                Change Course
              </button>
              {bulkCourseOpen && (
                <div className="gv-popover">
                  <label className="form-label" style={{ fontSize: '11px' }}>Change Course to</label>
                  <select className="gv-filter-select" style={{ width: '100%' }} value={bulkCourseName} onChange={(e) => setBulkCourseName(e.target.value)}>
                    {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <button className="gv-btn-primary gv-btn-sm" style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }} onClick={executeBulkCourseUpdate}>Apply</button>
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
                  <label className="gv-checkbox-wrap" title={isAllPageSelected ? "Deselect current page" : "Select current page"}>
                    <input
                      type="checkbox"
                      ref={el => { if (el) el.indeterminate = isSomePageSelected && !isAllPageSelected; }}
                      onChange={handleSelectAll}
                      checked={isAllPageSelected}
                    />
                    <span className="gv-checkmark" />
                  </label>
                </th>
                <th>
                  <span>Name & Contact</span>
                </th>
                <th>
                  <span>STATUS</span>
                </th>
                <th>
                  <span>SOURCE</span>
                </th>
                <th>
                  <span>ASSIGNED TO</span>
                </th>
                <th>
                  <span>DATE</span>
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
                        {(() => {
                          const displayName = (lead.source === 'Instagram' && lead.name?.startsWith('Instagram User') && lead.instagramUsername)
                            ? lead.instagramUsername
                            : ((lead.name && lead.name !== 'Campaign Contact' && lead.name !== 'WhatsApp Student') ? lead.name : (lead.phone || 'Lead'));
                          const charCode = displayName.charCodeAt(0) || 65;
                          return (
                            <div className="gv-student-cell">
                              <div className="gv-avatar" style={{
                                background: `hsl(${charCode * 7 % 360}, 55%, 92%)`,
                                color: `hsl(${charCode * 7 % 360}, 60%, 40%)`
                              }}>
                                {getInitials(displayName)}
                              </div>
                              <div className="gv-student-info">
                                <span className="gv-student-name">
                                  {displayName}
                                  {lead.temperature && lead.temperature !== 'Unassigned' && (
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', marginLeft: '6px', fontSize: '10px', fontWeight: 'bold',
                                      color: lead.temperature === 'Hot' ? '#ef4444' : lead.temperature === 'Cold' ? '#0ea5e9' : '#eab308'
                                    }} title={`${lead.temperature} Lead`}>
                                      {lead.temperature === 'Hot' ? '🔥' : lead.temperature === 'Cold' ? '❄️' : '☀️'}
                                    </span>
                                  )}
                                </span>
                                <span className="gv-student-meta" style={{ fontFamily: 'monospace', color: '#334155', fontWeight: '600' }}>{lead.phone || '-'}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`gv-status-badge status-${lead.stage.toLowerCase().replace(/ /g, '-')}`}>
                          {lead.stage}
                        </span>
                      </td>

                      {/* Source */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span className="gv-source-text">
                            {lead.source === 'Website Form' || lead.source === 'Website Form Widget' || lead.source === 'Website' 
                              ? 'Website Leads' 
                              : (lead.source === 'Walk-in' && lead.subSource ? `Walk-in (${lead.subSource})` : lead.source)}
                          </span>
                          {(() => {
                            const campText = lead.campaign || lead.campaignName || (lead.subSource && lead.subSource !== lead.source ? lead.subSource : '');
                            if (!campText) return null;
                            return (
                              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                {campText}
                              </span>
                            );
                          })()}
                        </div>
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
                        {(() => {
                          const rawDate = lead.createdDate || lead.createdAt;
                          const parsedDate = rawDate && !isNaN(new Date(rawDate).getTime()) ? new Date(rawDate) : null;
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {parsedDate ? parsedDate.toLocaleDateString() : '—'}
                              </span>
                              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                {parsedDate ? parsedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                          );
                        })()}
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
                <strong style={{ color: '#2563eb' }}>Format:</strong> Each row should follow — <code style={{ background: 'rgba(0,0,0,0.04)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>Name, Phone, Source, Campaign Name</code> (Optional: Email, Course)
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
                  placeholder={"Name, Phone, Source, Campaign Name\nAakash Nair, +91 9555512345, Referral, Agentic AI demo campaign\nKavita Sen, +91 9888898888, Meta Ads, Summer Promo"}
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

                  {/* WhatsApp Chat Option */}
                  {!isEditing && lead.phone && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLeadId(lead.id);
                        setShowDetailModal(false);
                        setActiveView('gowhatsapp');
                        setWhatsappSubView('inbox');
                      }}
                      className="gv-btn-primary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        height: '36px',
                        backgroundColor: '#25D366',
                        borderColor: '#25D366',
                        color: '#ffffff',
                        cursor: 'pointer'
                      }}
                      title={`Chat with ${lead.name} in WhatsApp Inbox`}
                    >
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                        <path d="M12.012 2c-5.506 0-9.969 4.463-9.969 9.969 0 1.761.459 3.479 1.331 4.988l-1.413 5.163 5.281-1.385c1.455.794 3.1 1.213 4.77 1.213 5.506 0 9.969-4.463 9.969-9.969s-4.463-9.969-9.969-9.969zm5.82 14.344c-.244.688-1.425 1.313-1.969 1.394-.544.081-1.244.119-3.563-.825-2.731-1.113-4.488-3.9-4.625-4.081-.138-.181-1.106-1.469-1.106-2.8 0-1.331.694-1.988.944-2.25.25-.263.544-.325.725-.325.181 0 .363.006.519.013.169.006.394-.063.619.475.244.588.825 2.013.894 2.156.069.144.113.313.019.5-.094.188-.144.3-.288.469-.144.169-.3.375-.431.506-.144.144-.294.3-.125.588.169.288.75 1.238 1.613 2.006 1.106.988 2.038 1.294 2.325 1.438.288.144.456.125.625-.069.169-.194.725-.844.919-1.138.194-.294.394-.244.662-.144.269.094 1.713.806 2.006.95.294.144.494.219.569.344.075.125.075.725-.169 1.413z"/>
                      </svg>
                      WhatsApp
                    </button>
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
                        <option value="">Select Source</option>
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

                      {editSource.toLowerCase().includes('meta') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#475569' }}>Campaign Name</label>
                          <input
                            type="text"
                            className="form-control"
                            value={editCampaign}
                            onChange={(e) => setEditCampaign(e.target.value)}
                            placeholder="e.g. Agentic AI demo campaign"
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
                        <select className="form-control" value={callOutcome} onChange={(e) => setCallOutcome(e.target.value)} style={{ padding: '8px 12px', fontSize: '13px', height: '36px', width: '100%', color: callOutcome ? 'inherit' : '#94a3b8' }}>
                          <option value="" disabled>Call Outcome</option>
                          <option value="Answered" style={{ color: '#1e293b' }}>Answered</option>
                          <option value="No Answer" style={{ color: '#1e293b' }}>No Answer</option>
                          <option value="Busy" style={{ color: '#1e293b' }}>Busy</option>
                          <option value="Wrong Number" style={{ color: '#1e293b' }}>Wrong Number</option>
                          <option value="Interested" style={{ color: '#1e293b' }}>Interested</option>
                          <option value="Not Interested" style={{ color: '#1e293b' }}>Not Interested</option>
                          <option value="Call Later" style={{ color: '#1e293b' }}>Call Later</option>
                        </select>
                      </div>
                      <div style={{ flex: 2 }}>
                        <label style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '4px', display: 'block' }}>Notes</label>
                        <input type="text" className="form-control" placeholder="Additional remarks..." value={callNotes} onChange={(e) => setCallNotes(e.target.value)} style={{ padding: '8px 12px', fontSize: '13px', height: '36px', width: '100%' }} />
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {['interested', 'busy', 'call later', 'answered', 'no answer'].includes((callOutcome || '').toLowerCase()) && (
                          <>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: '#334155' }}>
                              <input type="checkbox" checked={scheduleFollowup} onChange={(e) => setScheduleFollowup(e.target.checked)} />
                              Schedule Follow-up
                            </label>
                            {scheduleFollowup && (
                              <input type="datetime-local" className="form-control" value={followupDate} onChange={(e) => setFollowupDate(e.target.value)} style={{ padding: '4px 8px', fontSize: '12px', height: '28px' }} />
                            )}
                          </>
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
