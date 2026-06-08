import React, { useState } from 'react';
import { useCRM } from '../context/CRMContext';

export default function Sandbox() {
  const { courses } = useCRM();

  // Initial field definitions
  const initialFields = [
    { id: 'f_name', name: 'name', type: 'text', label: 'Student Name', placeholder: 'e.g. Rohan', required: true },
    { id: 'f_email', name: 'email', type: 'email', label: 'Email ID', placeholder: 'rohan@gmail.com', required: true },
    { id: 'f_phone', name: 'phone', type: 'tel', label: 'Contact Number', placeholder: '+91 96543 21098', required: true },
    { id: 'f_course', name: 'course', type: 'select', label: 'Program of Interest', options: courses.map(c => c.name), required: false }
  ];

  // History State for Undo/Redo
  const [history, setHistory] = useState([initialFields]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Field State
  const [fields, setFields] = useState(initialFields);

  const [formConfig, setFormConfig] = useState({
    title: 'Student Inquiry Form',
    buttonText: 'Submit Admissions Inquiry',
    buttonColor: '#2563eb'
  });

  const [previewValues, setPreviewValues] = useState({});

  const updateFieldsWithHistory = (newFields) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newFields);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setFields(newFields);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setFields(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setFields(history[historyIndex + 1]);
    }
  };

  const handleAddField = () => {
    updateFieldsWithHistory([...fields, { id: `f_${Date.now()}`, name: `custom_${Date.now()}`, type: 'text', label: 'New Field', placeholder: '', required: false }]);
  };

  const updateField = (id, key, value) => {
    updateFieldsWithHistory(fields.map(f => f.id === id ? { ...f, [key]: value } : f));
  };

  const removeField = (id) => {
    updateFieldsWithHistory(fields.filter(f => f.id !== id));
  };

  const moveFieldUp = (index) => {
    if (index === 0) return;
    const newFields = [...fields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    updateFieldsWithHistory(newFields);
  };

  const moveFieldDown = (index) => {
    if (index === fields.length - 1) return;
    const newFields = [...fields];
    [newFields[index + 1], newFields[index]] = [newFields[index], newFields[index + 1]];
    updateFieldsWithHistory(newFields);
  };

  // Generate embed code connecting to Firestore
  const generateEmbedCode = () => {
    // Escape standard values for HTML
    let htmlInputs = fields.map(f => {
      let reqAttr = f.required ? 'required' : '';
      let baseStyle = 'padding: 10px; border-radius: 6px; border: 1px solid #d1d5db; width: 100%; box-sizing: border-box; margin-bottom: 12px; font-family: inherit; font-size: 13px;';
      let labelHtml = `<label style="display:block; margin-bottom: 4px; font-size: 12px; color: #374151; font-weight: 600;">${f.label} ${!f.required ? '<span style="color:#9ca3af; font-weight:400;">(optional)</span>' : ''}</label>`;

      if (f.type === 'select') {
        let opts = (f.options || []).map(o => `<option value="${o.trim()}">${o.trim()}</option>`).join('\n        ');
        return `      <div>\n        ${labelHtml}\n        <select name="${f.name}" ${reqAttr} style="${baseStyle}" onchange="var otherContainer = document.getElementById('${f.id}_other_container'); if(otherContainer) otherContainer.style.display = this.value.toLowerCase().includes('other') ? 'block' : 'none';">\n          <option value="" disabled selected hidden>Select an option</option>\n        ${opts}\n        </select>\n        <div id="${f.id}_other_container" style="display:none; margin-top: -4px; margin-bottom: 12px;">\n          <input type="text" name="${f.name}_other" placeholder="Please specify..." style="${baseStyle.replace('margin-bottom: 12px;', 'margin-bottom: 0;')}" />\n        </div>\n      </div>`;
      } else {
        return `      <div>\n        ${labelHtml}\n        <input type="${f.type}" name="${f.name}" placeholder="${f.placeholder}" ${reqAttr} style="${baseStyle}" />\n      </div>`;
      }
    }).join('\n');

    return `<!-- TechZone Lead Capture Form -->
<div id="tz-form-container" style="max-width: 400px; width: 100%; font-family: 'Inter', sans-serif; background: #ffffff; padding: 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); box-sizing: border-box;">
  <h4 style="text-align: center; margin-top: 0; margin-bottom: 16px; color: #111827; font-size: 18px;">${formConfig.title}</h4>
  <form id="tz-lead-form">
${htmlInputs}
    <button type="submit" style="width: 100%; padding: 12px; background: ${formConfig.buttonColor}; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 8px; font-size: 14px;">
      ${formConfig.buttonText}
    </button>
  </form>
  <div id="tz-success-msg" style="display:none; text-align:center; padding: 20px; color: #10b981; font-weight: bold; font-size: 16px;">
    ✓ Successfully Submitted!
  </div>
</div>

<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
  import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "${import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY'}",
    authDomain: "${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'YOUR_AUTH_DOMAIN'}",
    projectId: "${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID'}",
    storageBucket: "${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'YOUR_STORAGE_BUCKET'}",
    messagingSenderId: "${import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_MESSAGING_SENDER_ID'}",
    appId: "${import.meta.env.VITE_FIREBASE_APP_ID || 'YOUR_APP_ID'}"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  document.getElementById('tz-lead-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Auto-populate system fields for CRM compatibility
    data.stage = 'New Lead';
    data.createdDate = new Date().toISOString();
    data.lastContacted = new Date().toISOString();
    data.source = 'Website Embedded Form';
    data.timeline = [{
        id: 'log-' + Date.now(),
        type: 'system',
        title: 'Lead Captured',
        content: 'Inquiry successfully entered system via Website Form Widget.',
        timestamp: new Date().toISOString(),
        user: 'System'
    }];
    data.whatsappMessages = [];
    data.customFields = {};

    const btn = e.target.querySelector('button[type="submit"]');
    const oldText = btn.innerText;
    btn.innerText = 'Submitting...';
    btn.disabled = true;

    try {
      await addDoc(collection(db, 'leads'), data);
      document.getElementById('tz-lead-form').style.display = 'none';
      document.getElementById('tz-success-msg').style.display = 'block';
    } catch(err) {
      console.error('Error submitting form: ', err);
      alert('Failed to submit form.');
      btn.innerText = oldText;
      btn.disabled = false;
    }
  });
</script>`;
  };

  return (
    <div className="fade-in">
      <style>{`
        .sandbox-split ::-webkit-scrollbar { display: none; }
        .sandbox-split { -ms-overflow-style: none; scrollbar-width: none; }
        .sandbox-split * { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div className="welcome-header">
        <h2 className="welcome-title">Form Builder & Integrations</h2>
        <p className="welcome-subtitle">Build custom lead capture forms and embed them on any website. Directly synced with Firestore.</p>
      </div>

      <div className="sandbox-split">
        {/* Left Hand: Form Creator */}
        <div style={{ maxHeight: 'calc(100vh - 110px)', height: 'calc(100vh - 110px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingRight: '12px' }}>
          <div className="panel-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 className="panel-title" style={{ margin: 0 }}>Form Creator</h3>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={handleUndo} disabled={historyIndex === 0} style={{ background: 'transparent', color: historyIndex === 0 ? '#9ca3af' : 'var(--text-primary)', border: '1px solid #d1d5db', padding: '4px 8px', borderRadius: '4px', cursor: historyIndex === 0 ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: 'bold' }}>↩ Undo</button>
                <button onClick={handleRedo} disabled={historyIndex === history.length - 1} style={{ background: 'transparent', color: historyIndex === history.length - 1 ? '#9ca3af' : 'var(--text-primary)', border: '1px solid #d1d5db', padding: '4px 8px', borderRadius: '4px', cursor: historyIndex === history.length - 1 ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: 'bold' }}>↪ Redo</button>
              </div>
            </div>
            <button onClick={handleAddField} style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>+ Add Field</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, paddingBottom: '20px' }}>
            <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--text-primary)' }}>Form Configuration</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Form Title</label>
                  <input type="text" value={formConfig.title} onChange={e => setFormConfig({ ...formConfig, title: e.target.value })} style={{ width: '100%', fontSize: '12px', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Button Text</label>
                  <input type="text" value={formConfig.buttonText} onChange={e => setFormConfig({ ...formConfig, buttonText: e.target.value })} style={{ width: '100%', fontSize: '12px', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>

            {fields.map((f, i) => (
              <div key={f.id} style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '4px' }}>
                  <button onClick={() => moveFieldUp(i)} disabled={i === 0} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', color: i === 0 ? '#d1d5db' : '#374151', cursor: i === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: '24px', height: '24px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Move Up">↑</button>
                  <button onClick={() => moveFieldDown(i)} disabled={i === fields.length - 1} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', color: i === fields.length - 1 ? '#d1d5db' : '#374151', cursor: i === fields.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: '24px', height: '24px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Move Down">↓</button>
                  <button onClick={() => removeField(f.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', width: '24px', height: '24px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '4px' }} title="Remove Field">✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px', paddingRight: '100px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Field Label</label>
                    <input type="text" value={f.label} onChange={(e) => updateField(f.id, 'label', e.target.value)} style={{ width: '100%', fontSize: '12px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Field Type</label>
                    <select 
                      value={f.type} 
                      onChange={(e) => {
                        const newType = e.target.value;
                        if (newType === 'select' && (!f.options || typeof f.options === 'string')) {
                          const newFields = fields.map(field => {
                            if (field.id === f.id) {
                              return { ...field, type: newType, options: typeof field.options === 'string' && field.options.trim() ? field.options.split(',').map(o => o.trim()) : ['Option 1'] };
                            }
                            return field;
                          });
                          updateFieldsWithHistory(newFields);
                        } else {
                          updateField(f.id, 'type', newType);
                        }
                      }} 
                      style={{ width: '100%', fontSize: '12px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }}
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="tel">Phone</option>
                      <option value="select">Dropdown</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '100%' }}>
                    {f.type === 'select' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Dropdown Options</label>
                        {(f.options || []).map((opt, optIdx) => (
                          <div key={optIdx} style={{ display: 'flex', gap: '6px' }}>
                            <input 
                              type="text" 
                              value={opt} 
                              onChange={(e) => {
                                const newOpts = [...(f.options || [])];
                                newOpts[optIdx] = e.target.value;
                                updateField(f.id, 'options', newOpts);
                              }} 
                              style={{ width: '100%', fontSize: '12px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }} 
                            />
                            <button 
                              onClick={() => {
                                const newOpts = [...(f.options || [])];
                                newOpts.splice(optIdx, 1);
                                updateField(f.id, 'options', newOpts);
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Remove Option"
                            >✕</button>
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                          <button 
                            onClick={() => {
                              const newOpts = [...(f.options || []), `Option ${(f.options?.length || 0) + 1}`];
                              updateField(f.id, 'options', newOpts);
                            }}
                            style={{ background: 'rgba(0,0,0,0.05)', color: '#374151', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                          >
                            + Add Option
                          </button>
                          <button 
                            onClick={() => {
                              const courseNames = courses.map(c => c.name);
                              const newOpts = Array.from(new Set([...(f.options || []), ...courseNames])).filter(Boolean);
                              updateField(f.id, 'options', newOpts);
                            }}
                            style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                            title="Import from Settings > Program Directory"
                          >
                            ↓ Import Programs
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Placeholder</label>
                        <input type="text" value={f.placeholder || ''} onChange={(e) => updateField(f.id, 'placeholder', e.target.value)} style={{ width: '100%', fontSize: '12px', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', boxSizing: 'border-box' }} />
                      </>
                    )}
                  </div>
                  <div style={{ paddingTop: f.type === 'select' ? '18px' : '22px' }}>
                    <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '500', color: 'var(--text-primary)' }}>
                      <input type="checkbox" checked={f.required} onChange={(e) => updateField(f.id, 'required', e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                      Required
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Hand: Visual mock website sandbox form */}
        <div className="dashboard-panel" style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 110px)', height: 'calc(100vh - 110px)' }}>
          <div className="panel-header" style={{ marginBottom: '16px' }}>
            <h3 className="panel-title">Live Preview & Export</h3>
            <button onClick={() => {
              navigator.clipboard.writeText(generateEmbedCode());
              alert('Firebase Embed code copied to clipboard! Paste it into any HTML website.');
            }} style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--primary-light)', border: '1px solid var(--primary-light)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>Copy Form Code</button>
          </div>

          <div style={{ flex: 1, background: '#f3f4f6', borderRadius: '8px', padding: '32px 24px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflowY: 'auto' }}>
            {/* Preview Form */}
            <div style={{ width: '100%', maxWidth: '380px', minHeight: '600px', background: '#fff', padding: '28px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}>
              <h4 style={{ textAlign: 'center', marginBottom: '20px', color: '#111827', fontSize: '18px', fontWeight: 'bold' }}>{formConfig.title}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {fields.map(f => (
                  <div key={`prev_${f.id}`}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#374151', fontWeight: '600', marginBottom: '6px' }}>
                      {f.label} {!f.required && <span style={{ color: '#9ca3af', fontWeight: '400' }}>(optional)</span>}
                    </label>
                    {f.type === 'select' ? (
                      <>
                        <select 
                          value={previewValues[f.id] || ''}
                          onChange={(e) => setPreviewValues({ ...previewValues, [f.id]: e.target.value })}
                          style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', boxSizing: 'border-box' }}
                        >
                          <option value="" disabled hidden>Select an option</option>
                          {(f.options || []).map((o, i) => <option key={i} value={o.trim()}>{o.trim()}</option>)}
                        </select>
                        {previewValues[f.id]?.toLowerCase().includes('other') && (
                          <div style={{ marginTop: '8px' }}>
                            <input type="text" placeholder="Please specify..." style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', boxSizing: 'border-box' }} />
                          </div>
                        )}
                      </>
                    ) : (
                      <input type={f.type} placeholder={f.placeholder} required={f.required} style={{ width: '100%', padding: '12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', boxSizing: 'border-box' }} />
                    )}
                  </div>
                ))}
                <button style={{ width: '100%', padding: '14px', background: formConfig.buttonColor, color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', marginTop: '10px', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}>
                  {formConfig.buttonText}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
