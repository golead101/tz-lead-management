import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';

export default function KanbanView() {
  const {
    leads,
    pipelineStages,
    courses,
    counselors,
    activeRole,
    activeUser,
    updateLeadStage,
    searchQuery,
    setSelectedLeadId,
    setActiveView
  } = useCRM();

  // Filters State - Defaults to "New Lead" stage as requested!
  const [selectedStage, setSelectedStage] = useState('New Lead');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedCounselor, setSelectedCounselor] = useState(activeRole === 'Counselor' ? activeUser : 'All');
  const [selectedSource, setSelectedSource] = useState('All');

  // Dynamically extract unique lead sources from database to populate filter list
  const uniqueSources = ['All', ...new Set(leads.map(l => l.source).filter(Boolean))];

  // Transition Modal State (for logging outcome notes manually)
  const [transitionPrompt, setTransitionPrompt] = useState(null); // { leadId, nextStage, leadName }
  const [transitionNote, setTransitionNote] = useState('');

  // Filter Leads
  const filteredLeads = leads.filter(lead => {
    // Stage Filter - only show leads in the currently selected stage
    if (lead.stage !== selectedStage) return false;

    // Role-based security (Counselors only see assigned leads)
    if (activeRole === 'Counselor' && lead.counselor !== activeUser) {
      return false;
    }

    // Dropdown filters
    if (selectedCourse !== 'All' && lead.course !== selectedCourse) return false;
    if (selectedCounselor !== 'All' && lead.counselor !== selectedCounselor) return false;
    if (selectedSource !== 'All' && lead.source !== selectedSource) return false;

    // Search query matches Name, Phone, Email
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchName = lead.name.toLowerCase().includes(query);
      const matchEmail = lead.email.toLowerCase().includes(query);
      const matchPhone = lead.phone.includes(query);
      return matchName || matchEmail || matchPhone;
    }

    return true;
  });

  const submitTransition = () => {
    if (!transitionPrompt) return;
    updateLeadStage(transitionPrompt.leadId, transitionPrompt.nextStage, transitionNote);
    setTransitionPrompt(null);
    setTransitionNote('');
  };

  const cancelTransition = () => {
    setTransitionPrompt(null);
    setTransitionNote('');
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Get corresponding pipeline stage object to read colors
  const activeStageObj = pipelineStages.find(s => s.name === selectedStage) || pipelineStages[0];

  return (
    <div className="fade-in">
      {/* Page Headers & Filters */}
      <div className="board-header">
        <div>
          <h2 className="welcome-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span 
              className="column-indicator" 
              style={{ 
                backgroundColor: activeStageObj ? `var(${activeStageObj.color})` : 'var(--primary)',
                width: '12px',
                height: '12px'
              }}
            />
            {selectedStage} Workspace
          </h2>
          <p className="welcome-subtitle">
            Viewing active student inquiries under the stage <strong>"{selectedStage}"</strong>.
          </p>
        </div>

        <div className="board-filters">
          {/* Main Stage Filter Dropdown */}
          <select 
            value={selectedStage} 
            onChange={(e) => setSelectedStage(e.target.value)}
            className="filter-select stage-filter-select"
            style={{ 
              borderColor: 'var(--primary)', 
              fontWeight: '700',
              color: 'var(--text-primary)',
              background: 'rgba(239, 68, 68, 0.04)'
            }}
          >
            {pipelineStages.map(stage => (
              <option key={stage.id} value={stage.name}>
                📍 {stage.name}
              </option>
            ))}
          </select>

          {/* Course filter */}
          <select 
            value={selectedCourse} 
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.name}>{c.code}</option>
            ))}
          </select>

          {/* Counselor filter */}
          {activeRole !== 'Counselor' && (
            <select 
              value={selectedCounselor} 
              onChange={(e) => setSelectedCounselor(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Counselors</option>
              {counselors.map(c => (
                <option key={c.id} value={c.name}>
                  {c.name} {c.status === 'Deactivated' ? '(Deactivated)' : ''}
                </option>
              ))}
            </select>
          )}



          {/* Source filter dropdown */}
          <select 
            value={selectedSource} 
            onChange={(e) => setSelectedSource(e.target.value)}
            className="filter-select"
          >
            <option value="All">All Sources</option>
            {uniqueSources.filter(s => s !== 'All').map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid view showing stage leads */}
      <div className="kanban-single-grid">
        {filteredLeads.length === 0 ? (
          <div className="single-stage-empty-state">
            <div className="empty-state-icon">📭</div>
            <h4 className="empty-state-title">No leads in "{selectedStage}"</h4>
            <p className="empty-state-desc">
              There are currently no active student inquiries in this stage matching your selected filters or search query.
            </p>
          </div>
        ) : (
          filteredLeads.map(lead => {
            const isFollowupOverdue = lead.followupDate && new Date(lead.followupDate) < new Date();
            return (
              <div 
                key={lead.id}
                className="kanban-card single-stage-card"
                onClick={() => {
                  setSelectedLeadId(lead.id);
                  setActiveView('detail');
                }}
              >
                <div className="card-top">
                  <span className="card-title" title={lead.name}>{lead.name}</span>
                </div>

                <div className="card-course">{lead.course}</div>

                <div className="card-footer">
                  <div className="card-counselor">
                    <div className="card-counselor-avatar" title={lead.counselor}>
                      {getInitials(lead.counselor)}
                    </div>
                    <span style={{ fontSize: '10px' }}>{lead.source}</span>
                  </div>

                  {isFollowupOverdue && (
                    <div className="card-due-indicator overdue" title="Overdue callback follow-up!">
                      <svg viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="2.5" fill="none"/></svg>
                      <span>Overdue</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Stage Transition Notes Prompt Modal Overlay */}
      {transitionPrompt && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h4 className="modal-title">Stage Transition Outcome</h4>
              <button className="modal-close-btn" onClick={cancelTransition}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5"/></svg>
              </button>
            </div>
            
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '14px', fontSize: '13px' }}>
                You are shifting <strong>{transitionPrompt.leadName}</strong> to the stage <strong>"{transitionPrompt.nextStage}"</strong>. 
                Please enter a brief note explaining the outcome or reason for this change.
              </p>

              <div className="form-group">
                <label className="form-label">Counselor Transition Notes</label>
                <textarea 
                  className="form-control" 
                  placeholder="Enter outcome details (e.g. Student confirmed course batch, brochure received, etc.)"
                  value={transitionNote}
                  onChange={(e) => setTransitionNote(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="secondary-btn" onClick={cancelTransition}>
                Cancel
              </button>
              <button className="primary-btn" onClick={submitTransition}>
                Save & Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
