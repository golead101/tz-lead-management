import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import '../index.css';

const courses = [
  'Full-Stack Web Development',
  'Data Science & Artificial Intelligence',
  'Cloud & DevOps Engineering',
  'Cyber Security & Ethical Hacking',
  'UI/UX Product Design'
];

export default function EmbedForm() {
  const [sbName, setSbName] = useState('');
  const [sbEmail, setSbEmail] = useState('');
  const [sbPhone, setSbPhone] = useState('');
  const [sbCourse, setSbCourse] = useState(courses[0]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double clicks
    
    setIsSubmitting(true);
    setError(null);

    const newLead = {
      name: sbName,
      email: sbEmail,
      phone: sbPhone,
      location: 'Website Default',
      course: sbCourse,
      source: 'Website Form Widget',
      priority: 'Hot',
      stage: 'New Lead',
      createdDate: new Date().toISOString(),
      lastContacted: new Date().toISOString(),
      timeline: [
        {
          id: `log-${Date.now()}`,
          type: 'system',
          title: 'Lead Captured',
          content: 'Inquiry successfully entered system via Website Form Widget (Embedded Form).',
          timestamp: new Date().toISOString(),
          user: 'System'
        }
      ],
      whatsappMessages: [],
      customFields: {}
    };

    try {
      await addDoc(collection(db, 'leads'), newLead);
      setSubmitted(true);
      
      // Clear Form after brief timeout
      setTimeout(() => {
        setSbName('');
        setSbEmail('');
        setSbPhone('');
        setSubmitted(false);
        setIsSubmitting(false);
      }, 4000);
    } catch (err) {
      console.error("Error adding document: ", err);
      setError("Failed to submit inquiry. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ 
      padding: '40px 20px', 
      background: 'transparent', 
      height: '100vh',
      overflowY: 'auto',
      width: '100%', 
      boxSizing: 'border-box', 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      fontFamily: "'Inter', sans-serif" 
    }}>
      <div style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: '500px',
        padding: '36px',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.03)',
        border: '1px solid #f3f4f6'
      }}>
        {submitted ? (
          <div className="text-center fade-in" style={{ padding: '20px 0' }}>
            <div style={{ 
              margin: '0 auto 20px', 
              background: '#10b981', 
              color: '#ffffff', 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '32px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              ✓
            </div>
            <h4 style={{ color: '#111827', fontSize: '22px', fontWeight: '800', margin: '0' }}>Inquiry Submitted!</h4>
            <p style={{ fontSize: '15px', color: '#6b7280', marginTop: '12px', lineHeight: '1.5' }}>
              We have successfully received your details. One of our counselors will contact you shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="fade-in">
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h4 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: '0 0 8px 0' }}>Request Information</h4>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>Fill out the form below to get started.</p>
            </div>
            
            {error && <div style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', background: '#fef2f2', padding: '12px', borderRadius: '8px' }}>{error}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '600' }}>Student Name</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Rohan Malhotra"
                style={{ padding: '14px 16px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb', fontSize: '15px', outline: 'none' }}
                value={sbName}
                onChange={(e) => setSbName(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '600' }}>Email ID</label>
              <input 
                type="email" 
                required
                placeholder="rohan@gmail.com"
                style={{ padding: '14px 16px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb', fontSize: '15px', outline: 'none' }}
                value={sbEmail}
                onChange={(e) => setSbEmail(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '600' }}>Contact Number</label>
              <input 
                type="text" 
                required
                placeholder="+91 96543 21098"
                style={{ padding: '14px 16px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb', fontSize: '15px', outline: 'none' }}
                value={sbPhone}
                onChange={(e) => setSbPhone(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: '#374151', fontWeight: '600' }}>Program of Interest</label>
              <select 
                style={{ padding: '14px 16px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb', fontSize: '15px', outline: 'none', cursor: 'pointer' }}
                value={sbCourse}
                onChange={(e) => setSbCourse(e.target.value)}
              >
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ 
                background: isSubmitting ? '#9ca3af' : 'var(--primary, #2563eb)', 
                color: '#ffffff', 
                fontWeight: '700', 
                fontSize: '16px',
                padding: '16px', 
                borderRadius: '8px', 
                border: 'none', 
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                marginTop: '8px',
                boxShadow: isSubmitting ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.3)'
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Admissions Inquiry'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
