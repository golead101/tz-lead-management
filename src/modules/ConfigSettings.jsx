import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';

export default function ConfigSettings() {
  const {
    courses,
    pipelineStages,
    customFields,
    branding,
    addCourse,
    addStage,
    addCustomField,
    changeBrandingColors,
    activeRole
  } = useCRM();

  // Switch tabs
  const [activeTab, setActiveTab] = useState('branding');

  // Customizer States
  const [instName, setInstName] = useState(branding.instituteName);
  const [primaryH, setPrimaryH] = useState(branding.primaryHue);
  const [secondaryH, setSecondaryH] = useState(branding.secondaryHue);

  // New Course State
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseDuration, setCourseDuration] = useState('6 Months');
  const [courseFee, setCourseFee] = useState('₹75,000');
  const [courseDesc, setCourseDesc] = useState('');

  // New Stage State
  const [stageName, setStageName] = useState('');
  const [stageDesc, setStageDesc] = useState('');

  // New Custom Field State
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [fieldOptions, setFieldOptions] = useState('');
  const [fieldRequired, setFieldRequired] = useState(false);

  if (activeRole !== 'Admin') {
    return (
      <div className="fade-in text-center" style={{ padding: '60px 0', color: 'var(--text-muted)' }}>
        <svg viewBox="0 0 24 24" width="80" height="80" stroke="currentColor" strokeWidth="1.5" fill="none"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        <h3 style={{ marginTop: '16px', color: 'var(--text-primary)' }}>Access Denied</h3>
        <p style={{ marginTop: '8px' }}>Visual configuration, custom fields registry, and settings are restricted to Administrators only.</p>
      </div>
    );
  }

  const handleBrandingSave = (e) => {
    e.preventDefault();
    changeBrandingColors({
      instituteName: instName,
      primaryHue: Number(primaryH),
      secondaryHue: Number(secondaryH)
    });
  };

  const handleAddCourse = (e) => {
    e.preventDefault();
    if (!courseName.trim()) return;
    addCourse({
      name: courseName,
      code: courseCode,
      duration: courseDuration,
      fee: courseFee,
      description: courseDesc
    });
    setCourseName('');
    setCourseCode('');
    setCourseDesc('');
  };

  const handleAddStage = (e) => {
    e.preventDefault();
    if (!stageName.trim()) return;
    addStage({
      name: stageName,
      description: stageDesc
    });
    setStageName('');
    setStageDesc('');
  };

  const handleAddCustomField = (e) => {
    e.preventDefault();
    if (!fieldName.trim()) return;
    addCustomField({
      name: fieldName,
      type: fieldType,
      options: fieldOptions ? fieldOptions.split(',').map(o => o.trim()) : [],
      required: fieldRequired
    });
    setFieldName('');
    setFieldOptions('');
    setFieldRequired(false);
  };

  const hasChanges = 
    instName !== branding.instituteName ||
    Number(primaryH) !== Number(branding.primaryHue) ||
    Number(secondaryH) !== Number(branding.secondaryHue);

  return (
    <div className="fade-in">
      <div className="welcome-header">
        <h2 className="welcome-title">System Customization Console</h2>
        <p className="welcome-subtitle">Configure institute visual identity, offer courses, custom stages pipeline, and custom fields registry.</p>
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        <button 
          className={`settings-tab-btn ${activeTab === 'branding' ? 'active' : ''}`}
          onClick={() => setActiveTab('branding')}
        >
          Visual Branding
        </button>
        <button 
          className={`settings-tab-btn ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          Program Directory
        </button>
        <button 
          className={`settings-tab-btn ${activeTab === 'stages' ? 'active' : ''}`}
          onClick={() => setActiveTab('stages')}
        >
          Pipeline Stages
        </button>
        <button 
          className={`settings-tab-btn ${activeTab === 'fields' ? 'active' : ''}`}
          onClick={() => setActiveTab('fields')}
        >
          Custom Fields Registry
        </button>
      </div>

      {/* Tab Panes */}
      <div className="content-panel">
        
        {/* Visual Branding Customizer */}
        {activeTab === 'branding' && (
          <div className="settings-pane active">
            <div className="dashboard-panel">
              <h3 className="panel-title mb-4">Branding & Layout Colors</h3>
              <form onSubmit={handleBrandingSave}>
                <div className="form-group">
                  <label className="form-label">Institute Branding Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    value={instName}
                    onChange={(e) => setInstName(e.target.value)}
                  />
                </div>

                <div className="form-group two-col mt-4">
                  <div>
                    <label className="form-label">Primary Color Hue (0-360) : {primaryH}°</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="360" 
                      className="w-full"
                      value={primaryH}
                      onChange={(e) => setPrimaryH(e.target.value)}
                    />
                    <div style={{ width: '100%', height: '14px', borderRadius: '4px', marginTop: '6px', background: `HSL(${primaryH}, 90%, 60%)` }} />
                  </div>

                  <div>
                    <label className="form-label">Secondary Color Hue (0-360) : {secondaryH}°</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="360" 
                      className="w-full"
                      value={secondaryH}
                      onChange={(e) => setSecondaryH(e.target.value)}
                    />
                    <div style={{ width: '100%', height: '14px', borderRadius: '4px', marginTop: '6px', background: `HSL(${secondaryH}, 85%, 62%)` }} />
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginTop: '20px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <strong>🎨 Instant Color Customization:</strong> Adjusting these sliders updates context state, which instantly alters the Primary / Secondary shades throughout the entire dashboard in real-time. No compilation needed!
                </div>

                <button 
                  type="submit" 
                  className="primary-btn mt-4" 
                  disabled={!hasChanges}
                  style={!hasChanges ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  Apply Branding
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Program Directory Manager */}
        {activeTab === 'courses' && (
          <div className="settings-pane active sandbox-split">
            {/* List */}
            <div className="dashboard-panel">
              <h3 className="panel-title mb-4">Offered Program Directory</h3>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {courses.map(course => (
                  <div key={course.id} className="config-list-item">
                    <div>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>[{course.code}] {course.name}</span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Duration: {course.duration} | Tuition Fee: {course.fee}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Creator */}
            <div className="dashboard-panel">
              <h3 className="panel-title mb-4">Add Course Offering</h3>
              <form onSubmit={handleAddCourse}>
                <div className="form-group two-col">
                  <div>
                    <label className="form-label">Course Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      placeholder="e.g. Cyber Security"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Course Code</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      placeholder="e.g. CYBER"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group two-col">
                  <div>
                    <label className="form-label">Duration</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      placeholder="e.g. 6 Months"
                      value={courseDuration}
                      onChange={(e) => setCourseDuration(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Fee Structure</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      required 
                      placeholder="e.g. ₹80,000"
                      value={courseFee}
                      onChange={(e) => setCourseFee(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Syllabus Overview Description</label>
                  <textarea 
                    className="form-control" 
                    placeholder="Short course topics outline..."
                    value={courseDesc}
                    onChange={(e) => setCourseDesc(e.target.value)}
                  />
                </div>

                <button type="submit" className="primary-btn mt-4">
                  Add Program
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Pipeline Stages Manager */}
        {activeTab === 'stages' && (
          <div className="settings-pane active sandbox-split">
            {/* List */}
            <div className="dashboard-panel">
              <h3 className="panel-title mb-4">Active Pipeline Workflow Stages</h3>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {pipelineStages.map(stage => (
                  <div key={stage.id} className="config-list-item">
                    <div className="flex align-center gap-2">
                      <div className="column-indicator" style={{ backgroundColor: `var(${stage.color})` }} />
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{stage.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Creator */}
            <div className="dashboard-panel">
              <h3 className="panel-title mb-4">Add Custom Pipeline Stage</h3>
              <form onSubmit={handleAddStage}>
                <div className="form-group">
                  <label className="form-label">Stage Title</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="e.g. Interview Cleared"
                    value={stageName}
                    onChange={(e) => setStageName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Stage Objective Description</label>
                  <textarea 
                    className="form-control" 
                    placeholder="Brief definition of when leads shift to this stage..."
                    value={stageDesc}
                    onChange={(e) => setStageDesc(e.target.value)}
                  />
                </div>

                <div style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.15)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: '#8b5cf6' }}>
                  <strong>🔔 Kanban Integration:</strong> Appending custom stages automatically generates a new column on your visual board layout!
                </div>

                <button type="submit" className="primary-btn mt-4">
                  Add Pipeline Stage
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Custom Fields Generator */}
        {activeTab === 'fields' && (
          <div className="settings-pane active sandbox-split">
            {/* List */}
            <div className="dashboard-panel">
              <h3 className="panel-title mb-4">Custom Fields Registry</h3>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {customFields.map(field => (
                  <div key={field.id} className="config-list-item">
                    <div>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{field.name}</span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Type: {field.type} {field.options?.length > 0 ? `| Options: ${field.options.join(', ')}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Creator */}
            <div className="dashboard-panel">
              <h3 className="panel-title mb-4">Add Custom Input Field</h3>
              <form onSubmit={handleAddCustomField}>
                <div className="form-group">
                  <label className="form-label">Field Title Label</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="e.g. Previous Batch Name"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                  />
                </div>

                <div className="form-group two-col">
                  <div>
                    <label className="form-label">Field Type</label>
                    <select 
                      className="form-control"
                      value={fieldType}
                      onChange={(e) => setFieldType(e.target.value)}
                    >
                      <option value="text">Text Input</option>
                      <option value="select">Dropdown Selector</option>
                    </select>
                  </div>
                  <div className="flex align-center" style={{ paddingTop: '20px' }}>
                    <label className="flex align-center gap-2" style={{ cursor: 'pointer', fontSize: '12px' }}>
                      <input 
                        type="checkbox" 
                        checked={fieldRequired}
                        onChange={(e) => setFieldRequired(e.target.checked)}
                      />
                      Mark field as Required?
                    </label>
                  </div>
                </div>

                {fieldType === 'select' && (
                  <div className="form-group">
                    <label className="form-label">Options (Comma separated values)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Batch A, Batch B, Batch C"
                      required={fieldType === 'select'}
                      value={fieldOptions}
                      onChange={(e) => setFieldOptions(e.target.value)}
                    />
                  </div>
                )}

                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: '#10b981' }}>
                  <strong>🔔 Dynamically Mapped Forms:</strong> Saving registers this field globally, adding it automatically to lead profile forms, edit panels, and detail timelines.
                </div>

                <button type="submit" className="primary-btn mt-4">
                  Add Custom Field
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
