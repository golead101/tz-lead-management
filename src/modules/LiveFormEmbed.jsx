import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';

export default function LiveFormEmbed() {
  const [formConfig, setFormConfig] = useState(null);
  const [fields, setFields] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formValues, setFormValues] = useState({});

  // Fetch the latest configuration from Firestore
  useEffect(() => {
    // Force the document body to be transparent for the iframe
    document.body.style.backgroundColor = 'transparent';
    document.body.style.backgroundImage = 'none';
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'settings', 'live_form');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormConfig(data.formConfig || { title: 'Inquiry Form', buttonText: 'Submit', buttonColor: '#2563eb' });
          setFields(data.fields || []);
        } else {
          // Fallback if not configured yet
          setFormConfig({ title: 'Student Inquiry Form', buttonText: 'Submit', buttonColor: '#2563eb' });
          setFields([
            { id: 'f_name', name: 'name', type: 'text', label: 'Student Name', placeholder: 'e.g. Rohan', required: true },
            { id: 'f_email', name: 'email', type: 'email', label: 'Email ID', placeholder: 'rohan@gmail.com', required: true }
          ]);
        }
      } catch (err) {
        console.error("Error loading form configuration:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // Auto-populate system fields for CRM compatibility
    data.stage = data.stage || 'New Lead';
    data.createdDate = data.createdDate || new Date().toISOString();
    data.lastContacted = data.lastContacted || new Date().toISOString();
    data.source = data.source || 'Website Embedded Form';
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

    try {
      // Store in the standard 'leads' collection so it shows up in CRM
      await addDoc(collection(db, 'leads'), data);
      setIsSuccess(true);
    } catch (err) {
      console.error('Error submitting form: ', err);
      alert('Failed to submit form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px', fontFamily: 'sans-serif' }}>Loading form...</div>;
  }

  if (isSuccess) {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif', textAlign: 'center', padding: '20px 0', background: 'transparent' }}>
        <div style={{ color: '#10b981', fontSize: '48px', marginBottom: '16px' }}>✓</div>
        <h3 style={{ color: '#111827', margin: 0 }}>Successfully Submitted!</h3>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>Thank you for your inquiry. We will contact you shortly.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', width: '100%', maxWidth: '400px', margin: '0 auto', background: 'transparent', padding: '0', boxSizing: 'border-box' }}>
      <h4 style={{ textAlign: 'center', margin: '0 0 20px 0', color: '#111827', fontSize: '18px', fontWeight: 'bold' }}>
        {formConfig.title}
      </h4>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {fields.map(f => (
          <div key={`field_${f.id}`}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
              {f.label} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
            </label>
            {f.type === 'select' ? (
              <>
                <select
                  name={f.name}
                  required={f.required}
                  value={formValues[f.id] || ''}
                  onChange={(e) => setFormValues({ ...formValues, [f.id]: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#f9fafb', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
                >
                  <option value="" disabled hidden>Select an option</option>
                  {f.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                </select>
                {formValues[f.id]?.toLowerCase().includes('other') && (
                  <div style={{ marginTop: '8px' }}>
                    <input type="text" name={`${f.name}_other`} placeholder="Please specify..." style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#f9fafb', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }} />
                  </div>
                )}
              </>
            ) : (
              <input type={f.type} name={f.name} placeholder={f.placeholder} required={f.required} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#f9fafb', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }} />
            )}
          </div>
        ))}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ width: '100%', padding: '14px', background: formConfig.buttonColor, color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', marginTop: '10px', fontSize: '14px', cursor: isSubmitting ? 'wait' : 'pointer', transition: 'opacity 0.2s', opacity: isSubmitting ? 0.7 : 1, boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}
        >
          {isSubmitting ? 'Submitting...' : formConfig.buttonText}
        </button>
      </form>
    </div>
  );
}
