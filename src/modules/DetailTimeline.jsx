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
  const [formCounselor, setFormCounselor] = useState(lead ? lead.counselor : activeUser);
  const [formStage, setFormStage] = useState(lead ? lead.stage : 'New Lead');
  
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

  // Call outcome logging form state
  const [callStatus, setCallStatus] = useState('Connected');
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
    if (lead) {
      setFormName(lead.name);
      setFormEmail(lead.email);
      setFormPhone(lead.phone);
      setFormLocation(lead.location);
      setFormEducation(lead.education);
      setFormCourse(lead.course);
      setFormSource(lead.source);
      setFormCounselor(lead.counselor);
      setFormStage(lead.stage);
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
      setFormCounselor(activeUser);
      setFormStage('New Lead');
      setFormCustomFields({});
      setIsEditMode(true);
    }
  }, [selectedLeadId, leads]);

  // Form Submission
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const data = {
      name: formName,
      email: formEmail,
      phone: formPhone,
      location: formLocation,
      education: formEducation,
      course: formCourse,
      source: formSource,
      counselor: formCounselor,
      stage: formStage,
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
    logCall(lead.id, {
      status: callStatus,
      interest: callInterest,
      questions: callQuestions,
      notes: callNotes,
      updateStage: callUpdateStage,
      scheduleFollowup: callSchedFollowup,
      followupDate: callFollowupDate,
      followupReason: callFollowupReason
    });

    // Reset Form
    setCallStatus('Connected');
    setCallInterest('Interested');
    setCallQuestions([]);
    setCallNotes('');
    setCallUpdateStage('');
    setCallSchedFollowup(false);
    setCallFollowupDate('');
    setCallFollowupReason('');
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
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
                    {lead.stage}
                  </span>
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
                    <svg viewBox="0 0 24 24" width="14" height="14" style={{ marginRight: '6px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    Log Call
                  </button>
                  <button 
                    type="button"
                    className="secondary-btn justify-center" 
                    style={{ fontSize: '12px', padding: '10px', fontWeight: '600' }} 
                    onClick={() => setFollowupModalOpen(true)}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" style={{ marginRight: '6px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    Schedule Callback
                  </button>
                  <button 
                    type="button"
                    className="secondary-btn justify-center" 
                    style={{ fontSize: '12px', padding: '10px', fontWeight: '600' }} 
                    onClick={() => setDemoModalOpen(true)}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" style={{ marginRight: '6px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 10l5 5-5 5m-6-5h11M4 4v7a4 4 0 004 4h1"/></svg>
                    Schedule Demo
                  </button>
                  <button 
                    type="button"
                    className="secondary-btn justify-center" 
                    style={{ fontSize: '12px', padding: '10px', fontWeight: '600' }} 
                    onClick={() => {
                      if (onClose) onClose();
                      setActiveView('whatsapp');
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" style={{ marginRight: '6px' }} fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
                    Chat Inbound
                  </button>
                </div>
              )}

              <div className="profile-details-list">
                {/* Contact Section */}
                <div className="profile-section-title">Contact Information</div>
                <div className="profile-detail-item">
                  <span className="detail-label">
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    Phone
                  </span>
                  <span className="detail-value">{lead.phone}</span>
                </div>

                <div className="profile-detail-item">
                  <span className="detail-label">
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    Email
                  </span>
                  <span className="detail-value">{lead.email}</span>
                </div>

                <div className="profile-detail-item">
                  <span className="detail-label">
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
                    Location
                  </span>
                  <span className="detail-value">{lead.location}</span>
                </div>

                {/* Academic Section */}
                <div className="profile-section-title">Academic & Intake</div>
                <div className="profile-detail-item">
                  <span className="detail-label">
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>
                    Education Background
                  </span>
                  <span className="detail-value">{lead.education}</span>
                </div>

                <div className="profile-detail-item">
                  <span className="detail-label">
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
                    Program of Interest
                  </span>
                  <span className="detail-value">{lead.course}</span>
                </div>

                <div className="profile-detail-item">
                  <span className="detail-label">
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                    Inquiry Source
                  </span>
                  <span className="detail-value">{lead.source}</span>
                </div>

                {/* Assignment Section */}
                <div className="profile-section-title">Assignment & Custom Data</div>
                <div className="profile-detail-item">
                  <span className="detail-label">
                    <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    Assigned Counselor
                  </span>
                  <span className="detail-value">{lead.counselor}</span>
                </div>

                {/* Renders Custom Fields dynamically */}
                {customFields.map(field => {
                  const val = lead.customFields?.[field.id] || 'Not Set';
                  return (
                    <div key={field.id} className="profile-detail-item">
                      <span className="detail-label">
                        <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
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
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
                {activeRole === 'Admin' && (
                  <button className="secondary-btn w-full justify-between" style={{ color: '#f43f5e' }} onClick={() => deleteLead(lead.id)}>
                    Remove Inquiry
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
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
                <label className="form-label">Inquiry Source</label>
                <select 
                  className="form-control"
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                >
                  <option value="Walk-in">Walk-in Inbound</option>
                  <option value="Meta Ads">Meta (Facebook/Instagram)</option>
                  <option value="Google Search">Google Platforms</option>
                  <option value="Website Form">Website Form</option>
                  <option value="WhatsApp Inbound">WhatsApp</option>
                  <option value="Student Referral">Student Referral</option>
                </select>
              </div>

              {activeRole !== 'Counselor' && (
                <div className="form-group">
                  <label className="form-label">Assigned Counselor</label>
                  <select 
                    className="form-control"
                    value={formCounselor}
                    onChange={(e) => setFormCounselor(e.target.value)}
                  >
                    {counselors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
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

              {/* Custom field entries inside forms */}
              {customFields.map(field => (
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
                    <svg viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                    Log Call
                  </button>

                  <button className="secondary-btn" onClick={() => setFollowupModalOpen(true)}>
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                    Schedule Callback
                  </button>

                  <button className="secondary-btn" onClick={() => setDemoModalOpen(true)}>
                    <svg viewBox="0 0 24 24"><path d="M15 10l5 5-5 5m-6-5h11M4 4v7a4 4 0 004 4h1" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
                    Schedule Demo
                  </button>

                  <button className="secondary-btn" onClick={() => {
                    if (onClose) onClose();
                    setActiveView('whatsapp');
                  }}>
                    Chat Inbound
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
                  {filteredTimeline.slice().reverse().map(node => {
                    const isCollapsed = collapsedNodeIds.includes(node.id);
                    return (
                      <div 
                        key={node.id} 
                        className={`timeline-node node-${node.type} timeline-node-collapsible`}
                        onClick={() => toggleNodeCollapse(node.id)}
                      >
                        <div className="timeline-icon-container">
                          {node.type === 'call' && <svg viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" stroke="currentColor" strokeWidth="3"/></svg>}
                          {node.type === 'whatsapp' && <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="3"/></svg>}
                          {node.type === 'system' && <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01" stroke="currentColor" strokeWidth="3"/></svg>}
                          {node.type === 'followup' && <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="3"/></svg>}
                          {node.type === 'demo' && <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m12-10a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" strokeWidth="3"/></svg>}
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
                          <div className="node-body">{node.content}</div>
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
                <svg viewBox="0 0 24 24" width="60" height="60" stroke="currentColor" strokeWidth="1" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m12-10a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
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
        <div className="modal-overlay">
          <div className="modal-card" style={{ width: '500px' }}>
            <div className="modal-header">
              <h4 className="modal-title">Log Phone/WhatsApp Call Outcome</h4>
              <button className="modal-close-btn" onClick={() => setCallModalOpen(false)}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5"/></svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group two-col">
                <div>
                  <label className="form-label">Call Connection Status</label>
                  <select className="form-control" value={callStatus} onChange={(e) => setCallStatus(e.target.value)}>
                    <option value="Connected">Connected / Talked</option>
                    <option value="No Answer">No Answer / Ringing</option>
                    <option value="Busy">Busy</option>
                    <option value="Switched Off">Switched Off / Switched Off</option>
                    <option value="Wrong Number">Wrong Number</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Interest Level</label>
                  <select className="form-control" value={callInterest} onChange={(e) => setCallInterest(e.target.value)}>
                    <option value="Highly Interested">🔥 Highly Interested</option>
                    <option value="Interested">☀️ Interested</option>
                    <option value="Needs Time">⏳ Needs Time</option>
                    <option value="Not Interested">❄️ Not Interested</option>
                  </select>
                </div>
              </div>

              {/* Questions Checklist */}
              <div className="form-group">
                <label className="form-label">Key Topics / Student Inquiries</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                  {['Fees Structure', 'Course Duration', 'Job Placements', 'Internships', 'Demo Class Required', 'Timing Batches'].map(q => (
                    <label key={q} className="flex align-center gap-2" style={{ cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={callQuestions.includes(q)}
                        onChange={() => handleQuestionToggle(q)}
                      />
                      {q}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Detailed Interaction Notes</label>
                <textarea 
                  className="form-control" 
                  placeholder="Detail what was discussed..."
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pipeline Stage Shift (Optional)</label>
                <select 
                  className="form-control"
                  value={callUpdateStage}
                  onChange={(e) => setCallUpdateStage(e.target.value)}
                >
                  <option value="">Keep current stage ({lead.stage})</option>
                  {pipelineStages.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              {/* Schedule Follow-up inside Call Form */}
              <div className="form-group" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                <label className="flex align-center gap-2 mb-4" style={{ cursor: 'pointer', fontWeight: '600' }}>
                  <input 
                    type="checkbox" 
                    checked={callSchedFollowup}
                    onChange={(e) => setCallSchedFollowup(e.target.checked)}
                  />
                  Schedule Follow-up callback?
                </label>

                {callSchedFollowup && (
                  <div className="fade-in">
                    <div className="form-group">
                      <label className="form-label">Callback Date & Time</label>
                      <input 
                        type="datetime-local" 
                        className="form-control"
                        required={callSchedFollowup}
                        value={callFollowupDate}
                        onChange={(e) => setCallFollowupDate(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label">Follow-up Goal / Objective</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. brochures feedback check, Zoom call"
                        value={callFollowupReason}
                        onChange={(e) => setCallFollowupReason(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setCallModalOpen(false)}>Cancel</button>
              <button className="primary-btn" onClick={handleSubmitCall}>Commit Log</button>
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
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5"/></svg>
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
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5"/></svg>
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
                    {counselors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
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
