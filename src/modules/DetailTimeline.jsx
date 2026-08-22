import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';

export default function DetailTimeline({ onClose, backText = 'Back to Leads', hideTimeline = false }) {
  const {
    leads,
    courses,
    pipelineStages,
    counselors,
    customFields,
    selectedLeadId,
    setSelectedLeadId,
    setActiveView,
    addLead,
    updateLead,
    deleteLead,
    logCall,
    scheduleFollowup,
    scheduleDemo,
    logDemoAttendance,
    activeUser,
    activeRole
  } = useCRM();

  // Find the selected lead
  const lead = leads.find(l => l.id === selectedLeadId);

  // Timeline Filter & Collapse states
  const [timelineFilter, setTimelineFilter] = useState('All');
  const [collapsedNodeIds, setCollapsedNodeIds] = useState([]);

  const toggleNodeCollapse = (id) => {
    setCollapsedNodeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredTimeline = (lead?.timeline || []).filter(node => {
    if (timelineFilter === 'All') return true;
    if (timelineFilter === 'Calls') return node.type === 'call' || node.type === 'followup';
    if (timelineFilter === 'Chats') return node.type === 'whatsapp';
    if (timelineFilter === 'System') return node.type === 'system';
    if (timelineFilter === 'Demos') return node.type === 'demo';
    return true;
  });

  // Edit Mode Toggle
  const [isEditMode, setIsEditMode] = useState(!lead); // If no lead, we are in "Create" mode

  // Form States (for creation or editing)
  const [formName, setFormName] = useState(lead ? lead.name : '');
  const [formEmail, setFormEmail] = useState(lead ? lead.email : '');
  const [formPhone, setFormPhone] = useState(lead ? lead.phone : '');
  const [formLocation, setFormLocation] = useState(lead ? lead.location : '');
  const [formEducation, setFormEducation] = useState(lead ? lead.education : '');
  const [formCourse, setFormCourse] = useState(lead ? lead.course : courses[0]?.name || '');
  const [formSource, setFormSource] = useState(lead ? lead.source : 'Walk-in');
  const [formTemperature, setFormTemperature] = useState(lead ? (lead.temperature || 'Warm') : 'Warm');

  // Dynamic list of unique sub-sources for walk-in leads
  const [localSubSources, setLocalSubSources] = useState([]);

  React.useEffect(() => {
    const uniqueSubs = leads
      .filter(l => {
        const srcLower = (l.source || '').toLowerCase();
        return srcLower.includes('walk-in') || srcLower.includes('walkin');
      })
      .map(l => l.subSource || 'Walk-in');
    const computed = ['Walk-in', ...new Set(uniqueSubs.filter(s => s !== 'Walk-in' && s.toLowerCase().trim() !== 'walk-in'))];
    setLocalSubSources(prev => Array.from(new Set([...computed, ...prev])));
  }, [leads]);

  const activeCouns = counselors.filter(c => c.status === 'Active' && c.role !== 'Admin' && c.name.toLowerCase() !== 'admin');
  const getInitialCounselor = () => {
    if (lead) return lead.counselor;
    if (activeRole === 'Counselor') return activeUser;
    return activeCouns[0]?.name || activeUser;
  };

  const [formSubSource, setFormSubSource] = useState(lead ? (lead.subSource || 'Walk-in') : 'Walk-in');
  const [customSubSource, setCustomSubSource] = useState('');
  const [formCounselor, setFormCounselor] = useState(getInitialCounselor());
  const [formStage, setFormStage] = useState(lead ? lead.stage : 'New Lead');
  const [formFreeClassBatch, setFormFreeClassBatch] = useState(lead ? (lead.freeClassBatch || '') : '');

  // Custom Fields form data
  const [formCustomFields, setFormCustomFields] = useState(() => {
    if (lead && lead.customFields) {
      return { ...lead.customFields };
    }
    const defaults = {};
    customFields.forEach(field => {
      defaults[field.id] = field.options ? field.options[0] : '';
    });
    return defaults;
  });

  // Modal Dialog states
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [followupModalOpen, setFollowupModalOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  // Custom select dropdown states for Inquiry Source
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  const [hoveredSource, setHoveredSource] = useState(null);
  const sourceDropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(event.target)) {
        setIsSourceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Call outcome logging form state
  const [callStatus, setCallStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [callInterest, setCallInterest] = useState('Interested');
  const [callQuestions, setCallQuestions] = useState([]);
  const [callNotes, setCallNotes] = useState('');
  const [callUpdateStage, setCallUpdateStage] = useState('');
  const [callSchedFollowup, setCallSchedFollowup] = useState(false);
  const [callFollowupDate, setCallFollowupDate] = useState('');
  const [callFollowupReason, setCallFollowupReason] = useState('');

  // Follow-up scheduling form state
  const [followupDate, setFollowupDate] = useState('');
  const [followupReason, setFollowupReason] = useState('');

  // Demo scheduling form state
  const [demoDate, setDemoDate] = useState('');
  const [demoTime, setDemoTime] = useState('16:00');
  const [demoTrainer, setDemoTrainer] = useState(activeUser);
  const [demoMode, setDemoMode] = useState('Online');
  const [demoLocation, setDemoLocation] = useState('meet.google.com/abc-def-ghi');

  // Multi-select questions checkbox helper
  const handleQuestionToggle = (qName) => {
    setCallQuestions(prev =>
      prev.includes(qName) ? prev.filter(q => q !== qName) : [...prev, qName]
    );
  };

  // Sync states on lead selection change
  React.useEffect(() => {
    setCallStatus('');
    setDropdownOpen(false);
    setCallNotes('');
    setCallSchedFollowup(false);
    setCallFollowupDate('');
    if (lead) {
      setFormName(lead.name);
      setFormEmail(lead.email);
      setFormPhone(lead.phone);
      setFormLocation(lead.location);
      setFormEducation(lead.education);
      setFormCourse(lead.course);
      setFormSource(lead.source);
      setFormTemperature(lead.temperature || 'Warm');
      setFormSubSource(lead.subSource || 'Walk-in');
      setCustomSubSource('');
      setFormCounselor(lead.counselor);
      setFormStage(lead.stage);
      setFormFreeClassBatch(lead.freeClassBatch || '');
      setFormCustomFields(lead.customFields || {});
      setIsEditMode(false);
    } else {
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormLocation('');
      setFormEducation('');
      setFormCourse(courses[0]?.name || '');
      setFormSource('Walk-in');
      setFormTemperature('Warm');
      setFormSubSource('Walk-in');
      setCustomSubSource('');
      setFormCounselor(activeRole === 'Counselor' ? activeUser : (counselors.filter(c => c.status === 'Active' && c.role !== 'Admin' && c.name.toLowerCase() !== 'admin')[0]?.name || activeUser));
      setFormStage('New Lead');
      setFormFreeClassBatch('');
      setFormCustomFields({});
      setIsEditMode(true);
    }
  }, [selectedLeadId, leads, courses, counselors, activeRole, activeUser]);

  // Form Submission
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const isWalkin = lead ? (lead.source === 'Walk-in') : true;
    const finalSubSource = formSubSource === 'other' ? (customSubSource.trim() || 'Walk-in') : formSubSource;

    const data = {
      name: formName,
      email: formEmail,
      phone: formPhone,
      location: formLocation,
      education: formEducation,
      course: formCourse,
      source: lead ? lead.source : 'Walk-in',
      subSource: isWalkin ? (finalSubSource || 'Walk-in') : (lead?.subSource || ''),
      counselor: formCounselor,
      stage: formStage,
      freeClassBatch: formStage === 'Free Class' ? formFreeClassBatch : null,
      temperature: formTemperature,
      customFields: formCustomFields
    };

    if (lead) {
      // Update Lead Profile
      updateLead(lead.id, data);
      setIsEditMode(false);
    } else {
      // Create new Lead
      const newLead = addLead(data);
      setSelectedLeadId(newLead.id);
      setIsEditMode(false);
    }
  };

  // Log Call Handler
  const handleSubmitCall = () => {
    const canFollowup = ['interested', 'busy', 'call later', 'answered', 'no answer'].includes((callStatus || '').toLowerCase());
    const isFollowupSched = canFollowup && !!callFollowupDate;
    logCall(lead.id, {
      status: callStatus,
      interest: callInterest,
      questions: callQuestions,
      notes: callNotes,
      updateStage: callUpdateStage || callStatus,
      scheduleFollowup: isFollowupSched,
      followupDate: isFollowupSched ? callFollowupDate : '',
      followupReason: isFollowupSched ? (callNotes || 'Scheduled callback') : ''
    });

    // Reset Form
    setCallStatus('');
    setCallInterest('Interested');
    setCallQuestions([]);
    setCallNotes('');
    setCallUpdateStage('');
    setCallSchedFollowup(false);
    setCallFollowupDate('');
    setCallModalOpen(false);
  };

  // Schedule Callback Followup
  const handleSubmitFollowup = () => {
    scheduleFollowup(lead.id, followupDate, followupReason);
    setFollowupDate('');
    setFollowupReason('');
    setFollowupModalOpen(false);
  };

  // Schedule Classroom Demo
  const handleSubmitDemo = () => {
    scheduleDemo(lead.id, {
      date: demoDate,
      time: demoTime,
      trainer: demoTrainer,
      mode: demoMode,
      locationLink: demoLocation
    });
    setDemoDate('');
    setDemoTime('16:00');
    setDemoTrainer(activeUser);
    setDemoMode('Online');
    setDemoLocation('meet.google.com/abc-def-ghi');
    setDemoModalOpen(false);
  };

  const getInitials = (name) => {
    return name
      ? name.split(' ').map(p => p[0]).join('').toUpperCase()
      : 'U';
  };

  return (
    <div className="fade-in">
      {!onClose && (
        <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center' }}>
          <button
            className="secondary-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: '600' }}
            onClick={() => {
              if (onClose) {
                onClose();
              } else {
                setActiveView('grid');
              }
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {backText}
          </button>
        </div>
      )}

      <div className="lead-detail-layout" style={hideTimeline ? { gridTemplateColumns: '1fr', maxWidth: '600px', margin: '0 auto' } : {}}>
        {/* ==================================================================
            LEFT COLUMN: PROFILE DETAILS
            ================================================================== */}
        <div className="lead-profile-card">
          {lead && !isEditMode ? (
            /* Profile View Pane */
            <>
              <div className="profile-avatar-container">
                <div className="profile-avatar">{getInitials(lead.name)}</div>
                <h3 className="profile-name">{lead.name}</h3>
                <div className="profile-meta-chips">
                  <span className={`status-badge status-${lead.stage.toLowerCase().replace(/ /g, '-')}`}>
                    {lead.stage === 'Free Class' && lead.freeClassBatch ? `${lead.stage} (${lead.freeClassBatch})` : lead.stage}
                  </span>
                  {lead.temperature && lead.temperature !== 'Unassigned' && (
                    <span style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', 
                      borderRadius: '4px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
                      background: lead.temperature === 'Hot' ? '#fef2f2' : lead.temperature === 'Cold' ? '#f0f9ff' : '#fefce8',
                      color: lead.temperature === 'Hot' ? '#ef4444' : lead.temperature === 'Cold' ? '#0ea5e9' : '#eab308',
                      border: `1px solid ${lead.temperature === 'Hot' ? '#fecaca' : lead.temperature === 'Cold' ? '#bae6fd' : '#fef08a'}`,
                      marginLeft: '6px'
                    }}>
                      {lead.temperature === 'Hot' ? '🔥' : lead.temperature === 'Cold' ? '❄️' : '☀️'} {lead.temperature}
                    </span>
                  )}
                </div>
              </div>

              {hideTimeline && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  padding: '16px 0',
                  borderTop: '1px solid var(--border-color)',
                  borderBottom: '1px solid var(--border-color)',
                  margin: '10px 0 5px 0'
                }}>
                  <button
                    type="button"
                    className="primary-btn justify-center"
                    style={{ fontSize: '12px', padding: '10px', fontWeight: '600' }}
                    onClick={() => setCallModalOpen(true)}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" style={{ marginRight: '6px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    Log Call
                  </button>
                  <button
                    type="button"
                    className="secondary-btn justify-center"
                    style={{ fontSize: '12px', padding: '10px', fontWeight: '600' }}
                    onClick={() => setFollowupModalOpen(true)}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" style={{ marginRight: '6px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                    Schedule Callback
                  </button>
                  <button
                    type="button"
                    className="secondary-btn justify-center"
                    style={{ fontSize: '12px', padding: '10px', fontWeight: '600' }}
                    onClick={() => setDemoModalOpen(true)}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" style={{ marginRight: '6px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 10l5 5-5 5m-6-5h11M4 4v7a4 4 0 004 4h1" /></svg>
                    Schedule Demo
                  </button>

                </div>
              )}

              <div className="profile-details-list">
                {/* Contact Section */}
                <div className="profile-section-title">Contact Information</div>
                <div className="profile-detail-item">
                  <span className="detail-label">
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    Phone
                  </span>
                  <span className="detail-value">{lead.phone}</span>
                </div>

                <div className="profile-detail-item">
                  <span className="detail-label">
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    Email
                  </span>
                  <span className="detail-value">{lead.email}</span>
                </div>

                <div className="profile-detail-item">
                  <span className="detail-label">
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><circle cx="12" cy="11" r="3" /></svg>
                    Location
                  </span>
                  <span className="detail-value">{lead.location}</span>
                </div>

                {/* Academic Section */}
                <div className="profile-section-title">Academic & Intake</div>
                <div className="profile-detail-item">
                  <span className="detail-label">
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                    Education Background
                  </span>
                  <span className="detail-value">
                    {lead.education && lead.education !== 'Not Provided' ? lead.education : (lead.customFields?.qualification || lead.qualification || 'Not Provided')}
                  </span>
                </div>

                <div className="profile-detail-item">
                  <span className="detail-label">
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    Program of Interest
                  </span>
                  <span className="detail-value">{lead.course}</span>
                </div>

                {lead.stage === 'Free Class' && lead.freeClassBatch && (
                  <div className="profile-detail-item">
                    <span className="detail-label">
                      🎓 Batch / Class
                    </span>
                    <span className="detail-value">{lead.freeClassBatch}</span>
                  </div>
                )}

                <div className="profile-detail-item">
                  <span className="detail-label">
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    Inquiry Source
                  </span>
                  <span className="detail-value">
                    {(() => {
                      if (lead.source === 'Website Form' || lead.source === 'Website Form Widget' || lead.source === 'Website') {
                        return 'Website Leads';
                      }
                      if (lead.source === 'Walk-in' || lead.source === 'Walk-In') {
                        return lead.subSource && lead.subSource !== 'Walk-in' ? `Walk-in (${lead.subSource})` : 'Walk-in';
                      }
                      return lead.source;
                    })()}
                  </span>
                </div>

                {/* Assignment Section */}
                <div className="profile-section-title">Assignment & Custom Data</div>
                <div className="profile-detail-item">
                  <span className="detail-label">
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    Assigned Counselor
                  </span>
                  <span className="detail-value">{lead.counselor}</span>
                </div>

                {/* Renders Custom Fields dynamically */}
                {customFields
                  .filter(field => field.name.toLowerCase().trim() !== 'inquiry source')
                  .map(field => {
                    const val = lead.customFields?.[field.id] || 'Not Set';
                    return (
                      <div key={field.id} className="profile-detail-item">
                        <span className="detail-label">
                          <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                          {field.name}
                        </span>
                        <span className="detail-value">{val}</span>
                      </div>
                    );
                  })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                <button className="primary-btn w-full justify-between" onClick={() => setIsEditMode(true)}>
                  Edit Profile
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                {activeRole === 'Admin' && (
                  <button className="secondary-btn w-full justify-between" style={{ color: '#f43f5e' }} onClick={() => deleteLead(lead.id)}>
                    Remove Inquiry
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Creation / Inline Profile Editor Form */
            <form onSubmit={handleFormSubmit}>
              <h3 className="panel-title mb-4">
                {lead ? 'Update Counselor File' : 'Create Student Inquiry'}
              </h3>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>



              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>



              <div className="form-group">
                <label className="form-label">Education/Experience</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. final year B.Tech, Graduate"
                  value={formEducation}
                  onChange={(e) => setFormEducation(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Address / City</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Hyderabad, Sector 4"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Applied Course</label>
                <select
                  className="form-control"
                  value={formCourse}
                  onChange={(e) => setFormCourse(e.target.value)}
                >
                  {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Lead Temperature</label>
                <select
                  className="form-control"
                  value={formTemperature}
                  onChange={(e) => setFormTemperature(e.target.value)}
                >
                  <option value="Hot">🔥 Hot</option>
                  <option value="Warm">☀️ Warm</option>
                  <option value="Cold">❄️ Cold</option>
                </select>
              </div>

              {(!lead || lead.source === 'Walk-in') && (
                <div className="form-group" style={{ position: 'relative' }} ref={sourceDropdownRef}>
                  <label className="form-label">Inquiry Source</label>
                  
                  {/* Custom select trigger button */}
                  <div 
                    className="form-control" 
                    onClick={() => setIsSourceDropdownOpen(prev => !prev)}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      background: 'rgba(0,0,0,0.02)',
                      borderColor: 'var(--border-color)',
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      userSelect: 'none'
                    }}
                  >
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                      {formSubSource}
                    </span>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-secondary)' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>

                  {/* Custom dropdown menu */}
                  {isSourceDropdownOpen && (
                    <div 
                      style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: 0, 
                        right: 0, 
                        marginTop: '4px', 
                        background: '#ffffff', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '6px', 
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', 
                        zIndex: 10,
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}
                    >
                      {/* Walk-in Option */}
                      <div 
                        onClick={() => {
                          setFormSubSource('Walk-in');
                          setIsSourceDropdownOpen(false);
                        }}
                        onMouseEnter={() => setHoveredSource('Walk-in')}
                        onMouseLeave={() => setHoveredSource(null)}
                        style={{ 
                          padding: '8px 12px', 
                          fontSize: '13px', 
                          cursor: 'pointer', 
                          color: formSubSource === 'Walk-in' ? 'var(--primary)' : 'var(--text-primary)',
                          background: formSubSource === 'Walk-in' ? 'var(--primary-glow)' : (hoveredSource === 'Walk-in' ? 'rgba(0,0,0,0.02)' : 'transparent'),
                          fontWeight: formSubSource === 'Walk-in' ? '700' : '500',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        Walk-in
                      </div>

                      {/* Custom Options list with Remove buttons on the right side */}
                      {localSubSources.filter(s => s !== 'Walk-in').map(sub => (
                        <div 
                          key={sub}
                          onClick={() => {
                            setFormSubSource(sub);
                            setIsSourceDropdownOpen(false);
                          }}
                          onMouseEnter={() => setHoveredSource(sub)}
                          onMouseLeave={() => setHoveredSource(null)}
                          style={{ 
                            padding: '8px 12px', 
                            fontSize: '13px', 
                            cursor: 'pointer', 
                            color: formSubSource === sub ? 'var(--primary)' : 'var(--text-primary)',
                            background: formSubSource === sub ? 'var(--primary-glow)' : (hoveredSource === sub ? 'rgba(0,0,0,0.02)' : 'transparent'),
                            fontWeight: formSubSource === sub ? '700' : '500',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <span>{sub}</span>
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocalSubSources(prev => prev.filter(s => s !== sub));
                              if (formSubSource === sub) {
                                setFormSubSource('Walk-in');
                              }
                            }}
                            style={{ 
                              color: '#ef4444', 
                              fontWeight: 'bold', 
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(239, 68, 68, 0.08)',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                            title={`Remove option "${sub}"`}
                          >
                            ✕ Remove
                          </span>
                        </div>
                      ))}

                      {/* Other Option */}
                      <div 
                        onClick={() => {
                          setFormSubSource('other');
                          setIsSourceDropdownOpen(false);
                        }}
                        onMouseEnter={() => setHoveredSource('other')}
                        onMouseLeave={() => setHoveredSource(null)}
                        style={{ 
                          padding: '8px 12px', 
                          fontSize: '13px', 
                          cursor: 'pointer', 
                          color: formSubSource === 'other' ? 'var(--primary)' : 'var(--text-primary)',
                          background: formSubSource === 'other' ? 'var(--primary-glow)' : (hoveredSource === 'other' ? 'rgba(0,0,0,0.02)' : 'transparent'),
                          fontWeight: formSubSource === 'other' ? '700' : '500',
                          borderTop: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        other
                      </div>
                    </div>
                  )}

                  {formSubSource === 'other' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter custom source (e.g. poster, justdail)"
                        style={{ flex: 1 }}
                        value={customSubSource}
                        onChange={(e) => setCustomSubSource(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="primary-btn"
                        style={{ height: '38px', padding: '0 12px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => {
                          const trimmed = customSubSource.trim();
                          if (trimmed) {
                            setLocalSubSources(prev => {
                              if (prev.includes(trimmed)) return prev;
                              return [...prev, trimmed];
                            });
                            setFormSubSource(trimmed);
                            setCustomSubSource('');
                          }
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeRole !== 'Counselor' && (
                <div className="form-group">
                  <label className="form-label">Assigned Counselor</label>
                  <select
                    className="form-control"
                    value={formCounselor}
                    onChange={(e) => setFormCounselor(e.target.value)}
                  >
                    {counselors
                      .filter(c => c.status === 'Active' && c.role !== 'Admin' && c.name.toLowerCase() !== 'admin')
                      .map(c => (
                        <option key={c.id} value={c.name}>
                          {c.name} {c.status === 'Deactivated' ? '(Deactivated)' : ''}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Stage</label>
                <select
                  className="form-control"
                  value={formStage}
                  onChange={(e) => setFormStage(e.target.value)}
                >
                  {pipelineStages.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              {formStage === 'Free Class' && (
                <div className="form-group fade-in">
                  <label className="form-label">Free Class Batch Timing</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Morning 10AM"
                    value={formFreeClassBatch}
                    onChange={(e) => setFormFreeClassBatch(e.target.value)}
                  />
                </div>
              )}

              {/* Custom field entries inside forms */}
              {customFields
                .filter(field => field.name.toLowerCase().trim() !== 'inquiry source')
                .map(field => (
                  <div key={field.id} className="form-group">
                    <label className="form-label">{field.name}</label>
                    {field.type === 'select' ? (
                      <select
                        className="form-control"
                        value={formCustomFields[field.id] || ''}
                        onChange={(e) => setFormCustomFields(prev => ({ ...prev, [field.id]: e.target.value }))}
                      >
                        {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="form-control"
                        value={formCustomFields[field.id] || ''}
                        onChange={(e) => setFormCustomFields(prev => ({ ...prev, [field.id]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}

              <div className="flex gap-2 mt-4">
                {lead && (
                  <button type="button" className="secondary-btn w-full" onClick={() => setIsEditMode(false)}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="primary-btn w-full">
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ==================================================================
            RIGHT COLUMN: CHRONOLOGICAL ACTIVITY FEED TIMELINE
            ================================================================== */}
        {!hideTimeline && (
          <div className="timeline-card">
            {lead ? (
              <>
                {/* Timeline Utility Action bar */}
                <div className="timeline-action-bar">
                  <button className="primary-btn" onClick={() => setCallModalOpen(true)}>
                    <svg viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
                    Log Call
                  </button>

                  <button className="secondary-btn" onClick={() => setFollowupModalOpen(true)}>
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
                    Schedule Callback
                  </button>

                  <button className="secondary-btn" onClick={() => setDemoModalOpen(true)}>
                    <svg viewBox="0 0 24 24"><path d="M15 10l5 5-5 5m-6-5h11M4 4v7a4 4 0 004 4h1" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
                    Schedule Demo
                  </button>


                </div>

                {/* Timeline logs timeline */}
                <h3 className="panel-title mb-2">Timeline Interaction Audit Feed</h3>

                {/* Filter Pills Bar */}
                <div className="timeline-filter-bar">
                  {['All', 'Calls', 'Chats', 'System', 'Demos'].map(cat => (
                    <button
                      key={cat}
                      className={`timeline-filter-pill ${timelineFilter === cat ? 'active' : ''}`}
                      onClick={() => setTimelineFilter(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="timeline-stream">
                  {filteredTimeline.slice().reverse().map((node, index) => {
                    const isCollapsed = collapsedNodeIds.includes(node.id);
                    return (
                      <div
                        key={`${node.id}-${index}`}
                        className={`timeline-node node-${node.type} timeline-node-collapsible`}
                        onClick={() => toggleNodeCollapse(node.id)}
                      >
                        <div className="timeline-icon-container">
                          {node.type === 'call' && <svg viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" stroke="currentColor" strokeWidth="3" /></svg>}
                          {node.type === 'whatsapp' && <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="3" /></svg>}
                          {node.type === 'system' && <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4m0-4h.01" stroke="currentColor" strokeWidth="3" /></svg>}
                          {node.type === 'followup' && <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="3" /></svg>}
                          {node.type === 'demo' && <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m12-10a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" strokeWidth="3" /></svg>}
                        </div>

                        <div className="node-header">
                          <span className="node-title">{node.title}</span>
                          <span className="node-timestamp">
                            {new Date(node.timestamp).toLocaleString()} • {node.user}
                          </span>
                        </div>

                        {isCollapsed ? (
                          <div className="node-collapsed-hint">+ Click to expand details...</div>
                        ) : (
                          <div className="node-body" style={{ whiteSpace: 'pre-line' }}>{node.content}</div>
                        )}
                      </div>
                    );
                  })}
                  {filteredTimeline.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                      No events in this category yet.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
                <svg viewBox="0 0 24 24" width="60" height="60" stroke="currentColor" strokeWidth="1" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m12-10a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                <p style={{ marginTop: '12px' }}>Fill in details on the left to capture a new student inquiry into the platform.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================================================================
          MODAL 1: LOG CALL OUTCOME DIALOG FORM
          ================================================================== */}
      {callModalOpen && (
        <div className="modal-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1100 }}>
          <div className="modal-card" style={{ width: '480px', borderRadius: '16px', border: 'none', boxShadow: '0 12px 30px rgba(0,0,0,0.15)', overflow: 'visible', background: '#fff', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="modal-header" style={{ padding: '20px 24px 12px', borderBottom: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                <h3 className="modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1e293b', fontFamily: 'var(--font-heading)' }}>Log Call Result</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Record the outcome of your call with {lead.name}.</p>
              </div>
              <button className="modal-close-btn" onClick={() => { setCallModalOpen(false); setDropdownOpen(false); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', color: '#64748b', transition: 'color 0.2s' }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ padding: '12px 24px 20px', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left', overflow: 'visible' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                  Call Outcome <span style={{ color: '#ef4444' }}>*</span>
                </label>
                
                {/* Custom select trigger */}
                <div style={{ position: 'relative' }}>
                  <button 
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    style={{ 
                      width: '100%', 
                      padding: '10px 14px', 
                      borderRadius: '10px', 
                      border: '1px solid #cbd5e1', 
                      background: '#fff', 
                      color: callStatus ? '#1e293b' : '#94a3b8', 
                      fontSize: '14px', 
                      fontWeight: '550',
                      textAlign: 'left',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      {callStatus === '' && 'Call Outcome'}
                      {callStatus === 'Interested' && (
                        <>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#22c55e" strokeWidth="2.5" style={{ marginRight: '8px' }}><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>
                          Interested
                        </>
                      )}
                      {callStatus === 'Converted' && (
                        <>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#f97316" strokeWidth="2.5" style={{ marginRight: '8px' }}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" /><path d="M12 2a7 7 0 0 0-7 7c0 2.62 1.34 4.5 3 5.34a8.26 8.26 0 0 0 8 0c1.66-.84 3-2.72 3-5.34a7 7 0 0 0-7-7z" /></svg>
                          Converted / Won
                        </>
                      )}
                      {callStatus === 'Call Later' && (
                        <>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563eb" strokeWidth="2.5" style={{ marginRight: '8px' }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M12 14v4M10 16h4" /></svg>
                          Call Later / Follow up
                        </>
                      )}
                      {callStatus === 'Not Interested' && (
                        <>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ef4444" strokeWidth="2.5" style={{ marginRight: '8px' }}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                          Not Interested
                        </>
                      )}
                      {callStatus === 'No Answer' && (
                        <>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ea580c" strokeWidth="2.5" style={{ marginRight: '8px' }}><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" /><line x1="23" y1="1" x2="1" y2="23" /></svg>
                          No Answer
                        </>
                      )}
                      {callStatus === 'Invalid Number' && (
                        <>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748b" strokeWidth="2.5" style={{ marginRight: '8px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                          Invalid Number
                        </>
                      )}
                    </span>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748b" strokeWidth="2.5" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div 
                      style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: 0, 
                        right: 0, 
                        marginTop: '6px', 
                        background: '#fff', 
                        border: '1px solid #cbd5e1', 
                        borderRadius: '12px', 
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', 
                        zIndex: 1200,
                        padding: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                    >
                      {[
                        { val: 'Interested', label: 'Interested', stroke: '#22c55e', path: <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /> },
                        { val: 'Busy', label: 'Busy', stroke: '#eab308', path: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></> },
                        { val: 'Call Later', label: 'Call Later / Follow up', stroke: '#2563eb', path: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M12 14v4M10 16h4" /></> },
                        { val: 'Answered', label: 'Answered', stroke: '#06b6d4', path: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" /> },
                        { val: 'Not Interested', label: 'Not Interested', stroke: '#ef4444', path: <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></> },
                        { val: 'Wrong Number', label: 'Wrong Number', stroke: '#64748b', path: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></> },
                        { val: 'No Answer', label: 'No Answer', stroke: '#ea580c', path: <><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" /><line x1="23" y1="1" x2="1" y2="23" /></> },
                        { val: 'Converted', label: 'Converted / Won', stroke: '#f97316', path: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34" /><path d="M12 2a7 7 0 0 0-7 7c0 2.62 1.34 4.5 3 5.34a8.26 8.26 0 0 0 8 0c1.66-.84 3-2.72 3-5.34a7 7 0 0 0-7-7z" /></> }
                      ].map(item => (
                        <div 
                          key={item.val}
                          onClick={() => {
                            setCallStatus(item.val);
                            setDropdownOpen(false);
                          }}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '10px 12px', 
                            borderRadius: '8px', 
                            fontSize: '14px', 
                            fontWeight: '550',
                            color: '#1e293b',
                            cursor: 'pointer',
                            background: callStatus === item.val ? '#fef3c7' : 'transparent',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => { if (callStatus !== item.val) e.currentTarget.style.background = '#f1f5f9'; }}
                          onMouseLeave={(e) => { if (callStatus !== item.val) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={item.stroke} strokeWidth="2.5" style={{ marginRight: '8px' }}>
                            {item.path}
                          </svg>
                          {item.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Notes</label>
                <textarea
                  className="form-control"
                  placeholder="What was discussed?"
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  style={{ width: '100%', minHeight: '110px', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#1e293b', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                />
              </div>

              {/* Schedule Follow-up card */}
              {['interested', 'busy', 'call later', 'answered', 'no answer'].includes((callStatus || '').toLowerCase()) && (
                <div 
                  className="fade-in" 
                  style={{ 
                    background: '#eff6ff', 
                    border: '1px dashed #bfdbfe', 
                    borderRadius: '16px', 
                    padding: '16px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px',
                    marginTop: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a', fontWeight: '700', fontSize: '14px' }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Schedule Follow-up
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Follow-up Date & Time</label>
                    <input 
                      type="datetime-local" 
                      value={callFollowupDate}
                      onChange={(e) => setCallFollowupDate(e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '10px 14px', 
                        borderRadius: '10px', 
                        border: '1px solid #cbd5e1', 
                        background: '#fff', 
                        color: '#1e293b', 
                        fontSize: '14px', 
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ padding: '16px 24px 24px', borderTop: 'none', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#fff' }}>
              <button 
                className="secondary-btn" 
                onClick={() => setCallModalOpen(false)}
                style={{ padding: '8px 24px', borderRadius: '24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', transition: 'all 0.2s' }}
              >
                Cancel
              </button>
              <button 
                className="primary-btn" 
                onClick={handleSubmitCall}
                disabled={!callStatus}
                style={{ padding: '8px 24px', borderRadius: '24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: 'none', background: '#0b57d0', color: '#fff', opacity: !callStatus ? 0.65 : 1, transition: 'all 0.2s' }}
              >
                Save Call Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================
          MODAL 2: SCHEDULE CALLBACK FOLLOWUP ONLY
          ================================================================== */}
      {followupModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h4 className="modal-title">Schedule Callback Follow-up</h4>
              <button className="modal-close-btn" onClick={() => setFollowupModalOpen(false)}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" /></svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Callback Date & Time</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  required
                  value={followupDate}
                  onChange={(e) => setFollowupDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Purpose / Callback Goal</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. check brochure read, timing confirmation"
                  value={followupReason}
                  onChange={(e) => setFollowupReason(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setFollowupModalOpen(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleSubmitFollowup}>Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================
          MODAL 3: SCHEDULE CLASSROOM DEMO (IMPACT LINKED)
          ================================================================== */}
      {demoModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h4 className="modal-title">Schedule Demo / Live Class Invitation</h4>
              <button className="modal-close-btn" onClick={() => setDemoModalOpen(false)}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" /></svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group two-col">
                <div>
                  <label className="form-label">Class Date</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={demoDate}
                    onChange={(e) => setDemoDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Class Time</label>
                  <input
                    type="time"
                    className="form-control"
                    required
                    value={demoTime}
                    onChange={(e) => setDemoTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group two-col">
                <div>
                  <label className="form-label">Conducting Trainer</label>
                  <select
                    className="form-control"
                    value={demoTrainer}
                    onChange={(e) => setDemoTrainer(e.target.value)}
                  >
                    {counselors
                      .filter(c => c.status === 'Active' || c.name === demoTrainer)
                      .map(c => (
                        <option key={c.id} value={c.name}>
                          {c.name} {c.status === 'Deactivated' ? '(Deactivated)' : ''}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Class Mode</label>
                  <select
                    className="form-control"
                    value={demoMode}
                    onChange={(e) => setDemoMode(e.target.value)}
                  >
                    <option value="Online">🖥️ Online (Zoom/Meet)</option>
                    <option value="Offline">🏫 Offline Classroom</option>
                    <option value="Hybrid">🤝 Hybrid Mode</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Location Room / Video Link URL</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="meet.google.com/abc-def-ghi"
                  value={demoLocation}
                  onChange={(e) => setDemoLocation(e.target.value)}
                />
              </div>

              <div style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.15)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: '#06b6d4' }}>
                <strong>🔔 Automatic Actions Triggered:</strong> Saving this form automatically shifts lead pipeline status to **"Demo Scheduled"** and dispatches automated invitations templates!
              </div>
            </div>

            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setDemoModalOpen(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleSubmitDemo}>Invite & Sync</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
