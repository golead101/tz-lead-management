import React, { useState, useRef } from 'react';
import { useCRM } from '../context/CRMContext';

function ColorField({ label, desc, value, onChange, icon }) {
  const pickerRef = useRef(null);
  return (
    <div className="branding-item-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="branding-item-icon-box" style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
          {icon}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>{label}</span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>{desc}</span>
        </div>
      </div>
      <div className="custom-picker-field" style={{ width: '220px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', background: '#fff', position: 'relative' }} onClick={() => pickerRef.current?.click()}>
        <div className="custom-swatch" style={{ backgroundColor: value || '#ffffff', width: '20px', height: '20px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.1)' }} />
        <input 
          type="text" 
          className="custom-picker-hex" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{ fontSize: '12px', width: '100%', border: 'none', outline: 'none', fontFamily: 'monospace' }}
        />
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#94a3b8' }}>
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        <input 
          type="color" 
          ref={pickerRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
          value={value && value.startsWith('#') && value.length === 7 ? value : '#ffffff'} 
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

export default function ConfigSettings() {
  const {
    courses,
    pipelineStages,
    customFields,
    branding,
    counselors,
    addCourse,
    addStage,
    addCustomField,
    addCounselor,
    updateCounselorStatus,
    changeBrandingColors,
    activeRole
  } = useCRM();

  // Switch tabs
  const [activeTab, setActiveTab] = useState('branding');

  // Customizer States
  const [instName, setInstName] = useState(branding.instituteName);
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl || '');
  const [bgCol, setBgCol] = useState(branding.sidebarBg || '#0A1E44');
  const [textCol, setTextCol] = useState(branding.sidebarText || '#ffffff');
  const [activeCol, setActiveCol] = useState(branding.sidebarActiveBg || '#2F6BFF');
  const [hoverCol, setHoverCol] = useState(branding.sidebarHoverBg || '#173B7A');

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

  // New Counselor State
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPassword, setCPassword] = useState('');

  if (activeRole !== 'Admin') {
    return (
      <div className="fade-in text-center" style={{ padding: '60px 0', color: 'var(--text-muted)' }}>
        <svg viewBox="0 0 24 24" width="80" height="80" stroke="currentColor" strokeWidth="1.5" fill="none">
          <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
        <h3 style={{ marginTop: '16px', color: 'var(--text-primary)' }}>Access Denied</h3>
        <p style={{ marginTop: '8px' }}>Visual configuration, custom fields registry, and settings are restricted to Administrators only.</p>
      </div>
    );
  }

  const handleBrandingSave = (e) => {
    if (e) e.preventDefault();
    changeBrandingColors({
      instituteName: instName,
      logoUrl: logoUrl,
      sidebarBg: bgCol,
      sidebarText: textCol,
      sidebarActiveBg: activeCol,
      sidebarHoverBg: hoverCol
    });
  };

  const handleResetToDefault = () => {
    setInstName('TechZone Academy');
    setLogoUrl('');
    setBgCol('#0A1E44');
    setTextCol('#ffffff');
    setActiveCol('#2F6BFF');
    setHoverCol('#173B7A');
  };

  const handleCancelChanges = () => {
    setInstName(branding.instituteName);
    setLogoUrl(branding.logoUrl || '');
    setBgCol(branding.sidebarBg || '#0A1E44');
    setTextCol(branding.sidebarText || '#ffffff');
    setActiveCol(branding.sidebarActiveBg || '#2F6BFF');
    setHoverCol(branding.sidebarHoverBg || '#173B7A');
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image is too large. Recommended max size is 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const hasChanges = 
    instName !== branding.instituteName ||
    logoUrl !== (branding.logoUrl || '') ||
    bgCol !== (branding.sidebarBg || '#0A1E44') ||
    textCol !== (branding.sidebarText || '#ffffff') ||
    activeCol !== (branding.sidebarActiveBg || '#2F6BFF') ||
    hoverCol !== (branding.sidebarHoverBg || '#173B7A');

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

  const handleAddCounselor = (e) => {
    e.preventDefault();
    if (!cName.trim() || !cEmail.trim()) return;
    addCounselor({
      name: cName,
      email: cEmail,
      password: cPassword
    });
    setCName('');
    setCEmail('');
    setCPassword('');
  };

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
        <button 
          className={`settings-tab-btn ${activeTab === 'counselors' ? 'active' : ''}`}
          onClick={() => setActiveTab('counselors')}
        >
          Team Counselors
        </button>
      </div>

      {/* Tab Panes */}
      <div className="content-panel">
        
        {/* Visual Branding Customizer */}
        {activeTab === 'branding' && (
          <div className="settings-pane active">
            <div className="branding-settings-grid">
              
              {/* Left Column (65%) */}
              <div className="branding-card-settings" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.015)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-heading)', color: '#0f172a', marginBottom: '8px' }}>Sidebar Branding & Identity</h3>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>Customize the appearance of the left navigation sidebar only. These settings will not affect the rest of the application.</p>
                
                <form onSubmit={handleBrandingSave}>
                  {/* Row 1: Institute Name */}
                  <div className="branding-item-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="branding-item-icon-box" style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                        <span style={{ fontWeight: '750', fontSize: '15px' }}>T</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Institute Name</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>This name will be shown in sidebar logo area.</span>
                      </div>
                    </div>
                    <div>
                      <input 
                        type="text" 
                        className="form-control" 
                        required 
                        style={{ width: '220px', padding: '8px 12px', fontSize: '12.5px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        value={instName}
                        onChange={(e) => setInstName(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Row 2: Institute Logo */}
                  <div className="branding-item-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="branding-item-icon-box" style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Institute Logo</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Upload your institute logo.</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '110px', height: '32px', borderRadius: '6px', background: bgCol || '#0A1E44', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '4px', border: '1px solid rgba(0,0,0,0.08)' }}>
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '9px', fontWeight: '700', color: textCol || '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{instName}</span>
                        )}
                      </div>
                      <button 
                        type="button" 
                        className="secondary-btn" 
                        onClick={() => document.getElementById('logo-file-input').click()}
                        style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px' }}
                      >
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        Upload New
                      </button>
                      <input 
                        type="file" 
                        id="logo-file-input" 
                        style={{ display: 'none' }} 
                        accept="image/*" 
                        onChange={handleLogoUpload} 
                      />
                    </div>
                  </div>

                  {/* Row 3: Sidebar Background Color */}
                  <ColorField 
                    label="Sidebar Background Color" 
                    desc="Background color of the sidebar." 
                    value={bgCol} 
                    onChange={setBgCol} 
                    icon={(
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                        <path d="M7.5 10.5c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5z"/>
                        <path d="M11.5 7.5c.828 0 1.5-.672 1.5-1.5S11.828 4.5 11 4.5s-1.5.672-1.5 1.5.672 1.5 1.5 1.5z"/>
                        <path d="M16.5 9.5c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5z"/>
                      </svg>
                    )}
                  />

                  {/* Row 4: Sidebar Text & Icon Color */}
                  <ColorField 
                    label="Sidebar Text & Icon Color" 
                    desc="Color for menu text and icons." 
                    value={textCol} 
                    onChange={setTextCol} 
                    icon={(
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="4 7 4 4 20 4 20 7" />
                        <line x1="9" y1="20" x2="15" y2="20" />
                        <line x1="12" y1="4" x2="12" y2="20" />
                      </svg>
                    )}
                  />

                  {/* Row 5: Sidebar Active Menu Color */}
                  <ColorField 
                    label="Sidebar Active Menu Color" 
                    desc="Background color for active menu." 
                    value={activeCol} 
                    onChange={setActiveCol} 
                    icon={(
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M9 11l3 3 5-5" />
                      </svg>
                    )}
                  />

                  {/* Row 6: Sidebar Hover Color */}
                  <ColorField 
                    label="Sidebar Hover Color" 
                    desc="Background color on menu hover." 
                    value={hoverCol} 
                    onChange={setHoverCol} 
                    icon={(
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 11L3 3l8 18 3-7 7-3z" />
                      </svg>
                    )}
                  />

                  {/* Notice Informational Box */}
                  <div className="modern-alert-blue" style={{ marginTop: '24px', display: 'flex', gap: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px' }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2563eb" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <div style={{ fontSize: '12.5px', color: '#1e3a8a', lineHeight: '1.5' }}>
                      Branding settings only affect the left navigation sidebar. Dashboard cards, forms, reports, tables, and application components remain unchanged.
                    </div>
                  </div>

                  {/* Settings Action Buttons */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button 
                      type="submit" 
                      className="primary-btn" 
                      disabled={!hasChanges}
                      style={{ padding: '10px 20px', fontSize: '13px', borderRadius: '8px', opacity: hasChanges ? 1 : 0.5, cursor: hasChanges ? 'pointer' : 'not-allowed' }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17 21 17 13 7 13 7 21"/>
                        <polyline points="7 3 7 8 15 8"/>
                      </svg>
                      Save Branding
                    </button>
                    
                    <button 
                      type="button" 
                      className="secondary-btn" 
                      onClick={handleResetToDefault}
                      style={{ padding: '10px 16px', fontSize: '13px', borderRadius: '8px' }}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                      </svg>
                      Reset to Default
                    </button>

                    <button 
                      type="button" 
                      className="ghost-btn-custom" 
                      onClick={handleCancelChanges}
                      disabled={!hasChanges}
                      style={{ padding: '10px 16px', fontSize: '13px', borderRadius: '8px', opacity: hasChanges ? 1 : 0.5, cursor: hasChanges ? 'pointer' : 'not-allowed' }}
                    >
                      Cancel Changes
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column (35%) - Live Sidebar Preview */}
              <div className="preview-card-outer" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '16px', padding: '32px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.015)', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#64748b' }}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Sidebar Preview</h4>
                </div>
                <p style={{ fontSize: '11.5px', color: '#64748b', marginBottom: '24px' }}>This is how your sidebar will look.</p>

                {/* Dotted lines & overlay tags */}
                <div className="preview-callouts-layer">
                  {/* Background Tag */}
                  <div className="callout-swatch-tag" style={{ top: '15%', right: '5%', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="callout-dot" style={{ backgroundColor: bgCol, width: '8px', height: '8px', borderRadius: '50%' }} />
                    <span style={{ fontSize: '10.5px', fontWeight: '750' }}>Sidebar Background</span>
                  </div>
                  <div className="callout-pointing-line" style={{ top: '18.5%', right: '35%', width: '22%' }} />

                  {/* Active Menu Tag */}
                  <div className="callout-swatch-tag" style={{ top: '35%', right: '5%', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="callout-dot" style={{ backgroundColor: activeCol, width: '8px', height: '8px', borderRadius: '50%' }} />
                    <span style={{ fontSize: '10.5px', fontWeight: '750' }}>Active Menu Color</span>
                  </div>
                  <div className="callout-pointing-line" style={{ top: '38.5%', right: '35%', width: '16%' }} />

                  {/* Text & Icon Tag */}
                  <div className="callout-swatch-tag" style={{ top: '55%', right: '5%', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="callout-dot" style={{ backgroundColor: textCol, width: '8px', height: '8px', borderRadius: '50%' }} />
                    <span style={{ fontSize: '10.5px', fontWeight: '750' }}>Text & Icon Color</span>
                  </div>
                  <div className="callout-pointing-line" style={{ top: '58.5%', right: '35%', width: '20%' }} />

                  {/* Hover Tag */}
                  <div className="callout-swatch-tag" style={{ top: '75%', right: '5%', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="callout-dot" style={{ backgroundColor: hoverCol, width: '8px', height: '8px', borderRadius: '50%' }} />
                    <span style={{ fontSize: '10.5px', fontWeight: '750' }}>Hover Color</span>
                  </div>
                  <div className="callout-pointing-line" style={{ top: '78.5%', right: '35%', width: '20%' }} />
                </div>

                {/* Sidebar Mockup Frame */}
                <div className="preview-sidebar-frame" style={{ width: '200px', backgroundColor: bgCol, borderRadius: '12px', height: '480px', display: 'flex', flexDirection: 'column', padding: '16px 12px', zIndex: 1, boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
                  
                  {/* Brand Preview */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '16px', borderBottom: `1px solid ${hoverCol}33` }}>
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" style={{ maxHeight: '24px', maxWidth: '80px', objectFit: 'contain' }} />
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={activeCol} strokeWidth="2.5">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: textCol, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{instName}</span>
                      </>
                    )}
                  </div>

                  {/* Navigation list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '16px', flex: 1 }}>
                    {/* Dashboard */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', color: textCol, opacity: 0.7, fontSize: '11.5px', borderRadius: '6px' }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
                      <span>Dashboard</span>
                    </div>

                    {/* Leads - Active */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', backgroundColor: activeCol, color: textCol, fontSize: '11.5px', borderRadius: '6px', fontWeight: '600' }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      <span>Leads</span>
                    </div>

                    {/* Follow Ups - Hovered */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', backgroundColor: hoverCol, color: textCol, fontSize: '11.5px', borderRadius: '6px' }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L21 8"/><path d="M21 3v5h-5"/></svg>
                      <span>Follow Ups</span>
                    </div>

                    {/* Courses */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', color: textCol, opacity: 0.7, fontSize: '11.5px', borderRadius: '6px' }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                      <span>Courses</span>
                    </div>
                  </div>

                  {/* Bottom section */}
                  <div style={{ borderTop: `1px solid ${hoverCol}33`, paddingTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `${textCol}22`, color: textCol, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: '700' }}>
                      SS
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '9px', fontWeight: '600', color: textCol, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Stefan Salvatore</span>
                      <span style={{ fontSize: '7px', color: textCol, opacity: 0.6 }}>Admin</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Bulb Info Box */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#eab308" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5.5 5.5 0 0 0 12.5 2.5a5.5 5.5 0 0 0-5.5 5.5c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
                    <line x1="9" y1="18" x2="15" y2="18" />
                    <line x1="10" y1="22" x2="14" y2="22" />
                  </svg>
                  <span style={{ fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>
                    Changes you make on the left will reflect instantly in this preview. Click "Save Branding" to apply them globally.
                  </span>
                </div>
              </div>

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
                  <strong>🔔 Stage Integration:</strong> Appending custom stages automatically registers them for lead tracking and list filtering!
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

        {/* Counselors Manager */}
        {activeTab === 'counselors' && (
          <div className="settings-pane active sandbox-split">
            {/* List of active counselors */}
            <div className="dashboard-panel">
              <h3 className="panel-title mb-4">Team Counselors Directory</h3>
              <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {counselors.map(c => {
                  const status = c.status || 'Active';
                  const isActive = status === 'Active';
                  
                  const handleToggleStatus = () => {
                    if (isActive) {
                      const confirmDeactivate = window.confirm(
                        "Are you sure you want to deactivate this account? The user will no longer be able to log in until an Admin reactivates the account."
                      );
                      if (confirmDeactivate) {
                        updateCounselorStatus(c.id, 'Deactivated');
                      }
                    } else {
                      updateCounselorStatus(c.id, 'Active');
                    }
                  };

                  return (
                    <div key={c.id} className="config-list-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="card-counselor-avatar" style={{ width: '36px', height: '36px', fontSize: '13px', fontWeight: '700', borderRadius: '50%', background: isActive ? 'var(--primary)' : '#94a3b8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {c.name.split(' ').map(n=>n[0]).join('').toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '13.5px' }}>{c.name}</span>
                            {isActive ? (
                              <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                                Active
                              </span>
                            ) : (
                              <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', border: '1px solid #fecaca' }}>
                                Deactivated
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.email}</span>
                        </div>
                      </div>
                      
                      {activeRole === 'Admin' && (
                        <label className="status-toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px', margin: 0 }}>
                          <input 
                            type="checkbox" 
                            checked={isActive} 
                            onChange={handleToggleStatus}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span className="status-toggle-slider" style={{
                            position: 'absolute',
                            cursor: 'pointer',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: isActive ? 'var(--primary, #2F6BFF)' : '#cbd5e1',
                            transition: '0.3s',
                            borderRadius: '20px'
                          }}>
                            <span className="status-toggle-knob" style={{
                              position: 'absolute',
                              height: '14px',
                              width: '14px',
                              left: isActive ? '18px' : '4px',
                              bottom: '3px',
                              backgroundColor: 'white',
                              transition: '0.3s',
                              borderRadius: '50%'
                            }} />
                          </span>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Creator form */}
            <div className="dashboard-panel">
              <h3 className="panel-title mb-4">Add Team Counselor</h3>
              <form onSubmit={handleAddCounselor}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="e.g. Elena Gilbert"
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    required 
                    placeholder="e.g. elena@academy.com"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    required 
                    placeholder="Enter password for login"
                    value={cPassword}
                    onChange={(e) => setCPassword(e.target.value)}
                  />
                </div>

                <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: '#3b82f6', marginTop: '16px' }}>
                  <strong>🔔 Agent Assignment:</strong> Creating a new counselor automatically registers them inside the CRM. They will immediately become assignable to student inquiries.
                </div>

                <button type="submit" className="primary-btn mt-4">
                  Add Counselor Agent
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
