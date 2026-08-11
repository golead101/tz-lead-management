import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from '../context/CRMContext';
import { db, functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { QRCodeCanvas } from 'qrcode.react';

const TagInput = ({ value, onChange, placeholder, label }) => {
  const [inputValue, setInputValue] = useState('');
  
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !tags.includes(newTag)) {
        onChange([...tags, newTag].join(', '));
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      e.preventDefault();
      const newTags = [...tags];
      newTags.pop();
      onChange(newTags.join(', '));
    }
  };

  const removeTag = (tagToRemove) => {
    onChange(tags.filter(t => t !== tagToRemove).join(', '));
  };

  return (
    <div className="form-group mb-4">
      <label className="form-label">{label}</label>
      <div 
        className="form-control" 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '8px', 
          minHeight: '42px', 
          height: 'auto', 
          alignItems: 'center',
          padding: '8px 12px'
        }}
      >
        {tags.map((tag, idx) => (
          <span 
            key={idx} 
            style={{
              background: 'var(--bg-secondary, #f1f5f9)',
              color: 'var(--text-primary, #1e293b)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid var(--border-color, #e2e8f0)'
            }}
          >
            {tag}
            <button 
              type="button" 
              onClick={() => removeTag(tag)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '0',
                fontSize: '14px',
                lineHeight: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              &times;
            </button>
          </span>
        ))}
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : "Type and press Enter..."}
          style={{
            border: 'none',
            background: 'transparent',
            outline: 'none',
            flex: 1,
            minWidth: '120px',
            fontSize: '14px',
            color: 'inherit'
          }}
        />
      </div>
      <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
        Press Enter or comma to add an option.
      </small>
    </div>
  );
};


export default function ConfigSettings() {
  const {
    courses,
    pipelineStages,
    customFields,
    branding,
    counselors,
    addCourse,
    removeCourse,
    addStage,
    addCustomField,
    addCounselor,
    removeCounselor,
    updateCounselorStatus,
    changeBrandingColors,
    activeRole
  } = useCRM();

  // Switch tabs
  const [activeTab, setActiveTab] = useState('branding');

  // QR Form Settings
  const [qrQualifications, setQrQualifications] = useState('10th Pass, 12th Pass, Undergraduate, Postgraduate, Other');
  const [qrCourses, setQrCourses] = useState(courses && courses.length > 0 ? courses.map(c => c.name).join(', ') : '');
  const [qrTimings, setQrTimings] = useState('Morning (9 AM - 11 AM), Afternoon (2 PM - 4 PM), Evening (6 PM - 8 PM), Weekend Batches');
  const [qrSources, setQrSources] = useState('Instagram, Facebook, Google Search, Friend/Referral, Walk-in/Poster, Other');
  const [isSavingQr, setIsSavingQr] = useState(false);

  useEffect(() => {
    const fetchQrConfig = async () => {
      try {
        const docRef = doc(db, 'settings', 'qr_form');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.qualifications) setQrQualifications(data.qualifications.join(', '));
          if (data.courses) setQrCourses(data.courses.join(', '));
          if (data.timings) setQrTimings(data.timings.join(', '));
          if (data.sources) setQrSources(data.sources.join(', '));
        } else if (courses && courses.length > 0) {
          setQrCourses(courses.map(c => c.name).join(', '));
        }
      } catch (err) {
        console.error("Error fetching QR config:", err);
      }
    };
    if (activeRole === 'Admin') {
      fetchQrConfig();
    }
  }, [activeRole, courses]);

  const handleSaveQrConfig = async (e) => {
    e.preventDefault();
    setIsSavingQr(true);
    try {
      await setDoc(doc(db, 'settings', 'qr_form'), {
        qualifications: qrQualifications.split(',').map(s => s.trim()).filter(Boolean),
        courses: qrCourses.split(',').map(s => s.trim()).filter(Boolean),
        timings: qrTimings.split(',').map(s => s.trim()).filter(Boolean),
        sources: qrSources.split(',').map(s => s.trim()).filter(Boolean)
      }, { merge: true });
      alert('QR Form Configuration Saved!');
    } catch (err) {
      console.error("Error saving QR config:", err);
      alert('Failed to save QR configuration.');
    } finally {
      setIsSavingQr(false);
    }
  };

  const qrRef = useRef(null);
  const qrUrl = window.location.origin + '/qr-form?v=' + (courses ? courses.length : '1');

  const downloadQR = () => {
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;
    const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    let downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = "LeadCRM_Enquire_QR.png";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Customizer States
  const [instName, setInstName] = useState(branding.instituteName);
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl || '');
  const [brandTextSize, setBrandTextSize] = useState(branding.brandTextSize || 19);
  const [brandLogoSize, setBrandLogoSize] = useState(branding.brandLogoSize || 32);

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
  const [cRole, setCRole] = useState('Counselor');
  const [cStatus, setCStatus] = useState('Active');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

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
      sidebarBg: branding.sidebarBg || '#0A1E44',
      sidebarText: branding.sidebarText || '#ffffff',
      sidebarActiveBg: branding.sidebarActiveBg || '#2F6BFF',
      sidebarHoverBg: branding.sidebarHoverBg || '#173B7A',
      brandTextSize: parseInt(brandTextSize),
      brandLogoSize: parseInt(brandLogoSize)
    });
  };

  const handleResetToDefault = () => {
    setInstName('TechZone Academy');
    setLogoUrl('');
    setBrandTextSize(19);
    setBrandLogoSize(32);
  };

  const handleCancelChanges = () => {
    setInstName(branding.instituteName);
    setLogoUrl(branding.logoUrl || '');
    setBrandTextSize(branding.brandTextSize || 19);
    setBrandLogoSize(branding.brandLogoSize || 32);
  };

  const cropTransparentPixels = (base64Str, callback) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = 0;
        let maxY = 0;
        let found = false;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const alpha = data[(y * canvas.width + x) * 4 + 3];
            if (alpha > 5) { // Threshold for transparency detection
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
              found = true;
            }
          }
        }

        if (!found) {
          callback(base64Str);
          return;
        }

        // Add 2px safety padding around content bounding box
        const padding = 2;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(canvas.width - 1, maxX + padding);
        maxY = Math.min(canvas.height - 1, maxY + padding);

        const cropWidth = maxX - minX + 1;
        const cropHeight = maxY - minY + 1;

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropWidth;
        cropCanvas.height = cropHeight;
        const cropCtx = cropCanvas.getContext('2d');

        cropCtx.drawImage(
          img,
          minX, minY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        );

        callback(cropCanvas.toDataURL());
      } catch (e) {
        console.error("Canvas pixel cropping failed: ", e);
        callback(base64Str);
      }
    };
    img.onerror = () => {
      callback(base64Str);
    };
    img.src = base64Str;
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
        cropTransparentPixels(reader.result, (croppedBase64) => {
          setLogoUrl(croppedBase64);
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const hasChanges = 
    instName !== branding.instituteName ||
    logoUrl !== (branding.logoUrl || '') ||
    brandTextSize !== (branding.brandTextSize || 19) ||
    brandLogoSize !== (branding.brandLogoSize || 32);

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

  const handleAddCounselor = async (e) => {
    e.preventDefault();
    if (!cName.trim() || !cEmail.trim() || !cPassword.trim()) return;
    
    setIsCreatingUser(true);
    try {
      const createUserAccount = httpsCallable(functions, 'createUserAccount');
      const result = await createUserAccount({
        name: cName,
        email: cEmail,
        password: cPassword,
        role: cRole
      });
      
      if (result.data.success) {
        alert(result.data.message);
        setCName('');
        setCEmail('');
        setCPassword('');
        setCRole('Counselor');
        setCStatus('Active');
      }
    } catch (error) {
      console.error('Error creating user account:', error);
      alert('Failed to create user account: ' + error.message);
    } finally {
      setIsCreatingUser(false);
    }
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
          User Management
        </button>
        <button 
          className={`settings-tab-btn ${activeTab === 'qrform' ? 'active' : ''}`}
          onClick={() => setActiveTab('qrform')}
        >
          QR Form Settings
        </button>
      </div>

      {/* Tab Panes */}
      <div className="content-panel">

        {/* QR Form Customizer */}
        {activeTab === 'qrform' && (
          <div className="settings-pane active sandbox-split">
            {/* Left Side: Form Options */}
            <div className="dashboard-panel">
              <h3 className="panel-title mb-4">QR Enquire Form Dropdowns</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Configure the comma-separated options that students will see when they scan the QR code to fill the enquiry form.
              </p>
              <form onSubmit={handleSaveQrConfig}>
                
                <TagInput
                  label="Qualifications Options"
                  value={qrQualifications}
                  onChange={setQrQualifications}
                  placeholder="e.g. 10th Pass, 12th Pass, Undergraduate"
                />

                <div className="form-group mb-4">
                  <label className="form-label">Courses Options</label>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)', padding: '10px 12px', background: 'var(--bg-secondary, #f1f5f9)', borderRadius: '6px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                    Courses are automatically synced from your active Program Directory.
                  </div>
                </div>
                <TagInput
                  label="Batch Timing Options"
                  value={qrTimings}
                  onChange={setQrTimings}
                  placeholder="e.g. Morning, Evening, Weekend"
                />

                <TagInput
                  label="Where Did You Hear About Us? Options"
                  value={qrSources}
                  onChange={setQrSources}
                  placeholder="e.g. Instagram, Facebook, Friend"
                />

                <button type="submit" className="primary-btn mt-4" disabled={isSavingQr}>
                  {isSavingQr ? 'Saving...' : 'Save QR Configuration'}
                </button>
              </form>
            </div>

            {/* Right Side: QR Code Generator */}
            <div className="dashboard-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <h3 className="panel-title mb-2">Your Live QR Code</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Scan this to open the Enquiry Form.
              </p>
              
              <div ref={qrRef} style={{ background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'inline-block' }}>
                <QRCodeCanvas 
                  value={qrUrl}
                  size={200}
                  bgColor={"#ffffff"}
                  fgColor={"#0f172a"}
                  level={"H"}
                  includeMargin={false}
                />
              </div>

              <div style={{ marginTop: '24px', width: '100%' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569', wordBreak: 'break-all', marginBottom: '16px' }}>
                  {qrUrl}
                </div>
                <button 
                  type="button" 
                  onClick={downloadQR}
                  className="primary-btn" 
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download QR Code
                </button>
              </div>
            </div>

          </div>
        )}
        
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
                      <div style={{ minWidth: '150px', height: '40px', borderRadius: '6px', background: branding.sidebarBg || '#0A1E44', display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', padding: '6px 12px', border: '1px solid rgba(0,0,0,0.08)' }}>
                        {logoUrl && (
                          <img src={logoUrl} alt="Logo" style={{ maxHeight: '28px', maxWidth: '40px', objectFit: 'contain' }} />
                        )}
                        <span style={{ fontSize: '11px', fontWeight: '700', color: branding.sidebarText || '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {instName}
                        </span>
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

                  {/* Row 3: Name Text Size */}
                  <div className="branding-item-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="branding-item-icon-box" style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                        <span style={{ fontWeight: '750', fontSize: '13px' }}>A A</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Institute Name Text Size</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Resize the branding text in the sidebar.</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input 
                        type="range" 
                        min="12" 
                        max="28" 
                        value={brandTextSize} 
                        onChange={(e) => setBrandTextSize(parseInt(e.target.value))}
                        style={{ width: '130px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', width: '35px', textAlign: 'right' }}>{brandTextSize}px</span>
                    </div>
                  </div>

                  {/* Row 4: Logo Image Size */}
                  <div className="branding-item-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', opacity: logoUrl ? 1 : 0.4, pointerEvents: logoUrl ? 'auto' : 'none', transition: 'opacity 0.2s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="branding-item-icon-box" style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M4 14h6v6H4zm10-10h6v6h-6zm0 10h6v6h-6zM4 4h6v6H4z"/>
                        </svg>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#1e293b' }}>Logo Image Size</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Resize the uploaded logo image.</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input 
                        type="range" 
                        min="20" 
                        max="120" 
                        value={brandLogoSize} 
                        onChange={(e) => setBrandLogoSize(parseInt(e.target.value))}
                        disabled={!logoUrl}
                        style={{ width: '130px', cursor: logoUrl ? 'pointer' : 'not-allowed' }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b', width: '35px', textAlign: 'right' }}>{brandLogoSize}px</span>
                    </div>
                  </div>



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



                {/* Sidebar Mockup Frame */}
                <div className="preview-sidebar-frame" style={{ width: '200px', backgroundColor: branding.sidebarBg || '#0A1E44', borderRadius: '12px', height: '480px', display: 'flex', flexDirection: 'column', padding: '16px 12px', zIndex: 1, boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
                  
                  {/* Brand Preview */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '16px', borderBottom: `1px solid ${(branding.sidebarHoverBg || '#173B7A')}33` }}>
                    {logoUrl && (
                      <img src={logoUrl} alt="Logo" style={{ maxHeight: `${brandLogoSize * 0.7}px`, maxWidth: `${brandLogoSize * 0.9}px`, objectFit: 'contain' }} />
                    )}
                    {instName === 'LeadCRM' && !logoUrl && (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={branding.sidebarActiveBg || '#2F6BFF'} strokeWidth="2.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    )}
                    <span style={{ fontSize: `${brandTextSize * 0.6}px`, fontWeight: '800', color: branding.sidebarText || '#ffffff', whiteSpace: 'normal', lineHeight: '1.2' }}>
                      {instName === 'TechZone Academy' ? (
                        <>TechZone <span style={{ color: branding.sidebarActiveBg || '#2F6BFF', display: 'block' }}>Academy</span></>
                      ) : instName === 'LeadCRM' ? (
                        <>Lead<span style={{ color: branding.sidebarActiveBg || '#2F6BFF', display: 'block' }}>CRM</span></>
                      ) : (
                        instName
                      )}
                    </span>
                  </div>

                  {/* Navigation list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '16px', flex: 1 }}>
                    {/* Dashboard */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', color: branding.sidebarText || '#ffffff', opacity: 0.7, fontSize: '11.5px', borderRadius: '6px' }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
                      <span>Dashboard</span>
                    </div>

                    {/* Leads - Active */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', backgroundColor: branding.sidebarActiveBg || '#2F6BFF', color: branding.sidebarText || '#ffffff', fontSize: '11.5px', borderRadius: '6px', fontWeight: '600' }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      <span>Leads</span>
                    </div>

                    {/* Follow Ups - Hovered */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', backgroundColor: branding.sidebarHoverBg || '#173B7A', color: branding.sidebarText || '#ffffff', fontSize: '11.5px', borderRadius: '6px' }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L21 8"/><path d="M21 3v5h-5"/></svg>
                      <span>Follow Ups</span>
                    </div>

                    {/* Courses */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', color: branding.sidebarText || '#ffffff', opacity: 0.7, fontSize: '11.5px', borderRadius: '6px' }}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                      <span>Courses</span>
                    </div>
                  </div>

                  {/* Bottom section */}
                  <div style={{ borderTop: `1px solid ${(branding.sidebarHoverBg || '#173B7A')}33`, paddingTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `${branding.sidebarText || '#ffffff'}22`, color: branding.sidebarText || '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: '700' }}>
                      A
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '9px', fontWeight: '600', color: branding.sidebarText || '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Admin User</span>
                      <span style={{ fontSize: '7px', color: branding.sidebarText || '#ffffff', opacity: 0.6 }}>Admin</span>
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
              <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {courses.map(course => (
                  <div key={course.id} className="config-list-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <div>
                      <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>[{course.code}] {course.name}</span>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Duration: {course.duration} | Tuition Fee: {course.fee}</div>
                    </div>
                    {courses.length > 1 && (
                      <button 
                        onClick={() => removeCourse(course.id)}
                        className="ghost-btn-custom" 
                        style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px' }}
                        title="Remove Program"
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Creator */}
            <div className="dashboard-panel">
              <h3 className="panel-title mb-4">Add Course Offering</h3>
              <form onSubmit={handleAddCourse}>
                <div className="form-group">
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
              <h3 className="panel-title mb-4">User Directory</h3>
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
                        updateCounselorStatus(c.id, 'Inactive');
                      }
                    } else {
                      updateCounselorStatus(c.id, 'Active');
                    }
                  };

                  return (
                    <div key={c.id} className="config-list-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="card-counselor-avatar" style={{ width: '36px', height: '36px', fontSize: '13px', fontWeight: '700', borderRadius: '50%', background: isActive ? 'var(--primary)' : '#94a3b8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {(c.name || '').split(' ').map(n=>n[0]).join('').toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                            <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '13.5px' }}>{c.name}</span>
                            <span style={{ 
                              background: c.role === 'Admin' ? '#faf5ff' : (c.role === 'Manager' || c.role === 'Telecaller') ? '#fff7ed' : '#f0fdf4',
                              color: c.role === 'Admin' ? '#6b21a8' : (c.role === 'Manager' || c.role === 'Telecaller') ? '#c2410c' : '#15803d',
                              fontSize: '10px',
                              fontWeight: '750',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              border: c.role === 'Admin' ? '1px solid #e9d5ff' : (c.role === 'Manager' || c.role === 'Telecaller') ? '1px solid #ffedd5' : '1px solid #bbf7d0',
                              marginLeft: '6px'
                            }}>
                              {c.role === 'Manager' || c.role === 'Telecaller' ? 'Telecaller' : (c.role || 'Counselor')}
                            </span>
                            {isActive ? (
                              <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', border: '1px solid #a7f3d0', marginLeft: '6px' }}>
                                Active
                              </span>
                            ) : (
                              <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', border: '1px solid #fecaca', marginLeft: '6px' }}>
                                Inactive
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.email}</span>
                        </div>
                      </div>
                      
                      {activeRole === 'Admin' && c.role !== 'Admin' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                          <button 
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to permanently delete user "${c.name}"?`)) {
                                removeCounselor(c.id);
                              }
                            }}
                            title="Delete User"
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Creator form */}
            <div className="dashboard-panel">
              <h3 className="panel-title mb-4">Create New User</h3>
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

                <div className="form-group two-col">
                  <div>
                    <label className="form-label">User Role</label>
                    <select 
                      className="form-control"
                      value={cRole}
                      onChange={(e) => setCRole(e.target.value)}
                    >
                      <option value="Counselor">Counselor</option>
                      <option value="Telecaller">Telecaller</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Initial Status</label>
                    <select 
                      className="form-control"
                      value={cStatus}
                      onChange={(e) => setCStatus(e.target.value)}
                    >
                      <option value="Active">Active (Enabled)</option>
                      <option value="Inactive">Inactive (Disabled)</option>
                    </select>
                  </div>
                </div>

                <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: '#3b82f6', marginTop: '16px' }}>
                  <strong>🔔 User Assignment:</strong> Creating a new user registers them inside the CRM. Telecallers get cross-team monitoring access, and Counselors receive isolated queues.
                </div>

                <button type="submit" className="primary-btn mt-4" disabled={isCreatingUser}>
                  {isCreatingUser ? 'Creating...' : 'Create User Account'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
