import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, getDoc, getDocs } from 'firebase/firestore';

export default function QRFormEmbed() {
  const [formConfig, setFormConfig] = useState({
    title: 'Student Registration',
    subtitle: 'Fill in your details below',
    qualifications: ['10th Pass', '12th Pass', 'Undergraduate', 'Postgraduate', 'Other'],
    courses: ['Full-Stack Web Development', 'Data Science', 'UI/UX Design'],
    timings: ['Morning (9 AM - 11 AM)', 'Afternoon (2 PM - 4 PM)', 'Evening (6 PM - 8 PM)', 'Weekend Batches'],
    sources: ['Instagram', 'Facebook', 'Google Search', 'Friend/Referral', 'Walk-in/Poster', 'Other']
  });

  const [formValues, setFormValues] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.fontFamily = 'Inter, sans-serif';
    document.body.style.background = 'linear-gradient(-45deg, #09090b, #111827, #0f172a, #030712)';
    document.body.style.backgroundSize = '400% 400%';
    document.body.style.animation = 'gradientBG 15s ease infinite';
    document.body.style.color = '#fff';
    
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'settings', 'qr_form');
        const docSnap = await getDoc(docRef);

        const coursesSnap = await getDocs(collection(db, 'courses'));
        const activeCourses = coursesSnap.docs.map(d => d.data().name);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setFormConfig(prev => ({ 
            ...prev, 
            ...data,
            courses: activeCourses.length > 0 ? activeCourses : prev.courses 
          }));
        } else if (activeCourses.length > 0) {
          setFormConfig(prev => ({ ...prev, courses: activeCourses }));
        }
      } catch (err) {
        console.error("Error loading QR form configuration:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleChange = (e) => {
    setFormValues({ ...formValues, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data = { ...formValues };

    data.stage = 'New Lead';
    data.createdDate = new Date().toISOString();
    data.lastContacted = new Date().toISOString();
    data.source = data.source || 'QR Code Walk-in'; 
    data.temperature = 'Warm';
    data.timeline = [{
      id: 'log-' + Date.now(),
      type: 'system',
      title: 'Lead Captured',
      content: 'Inquiry successfully entered system via QR Code Form.',
      timestamp: new Date().toISOString(),
      user: 'System'
    }];
    data.whatsappMessages = [];
    data.customFields = {
      qualification: data.qualification || '',
      batchTiming: data.batchTiming || ''
    };
    
    if (data.hearAboutUs) {
      data.subSource = data.hearAboutUs;
    }

    try {
      await addDoc(collection(db, 'leads'), data);
      setIsSuccess(true);
    } catch (err) {
      console.error('Error submitting form: ', err);
      alert('Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', fontWeight: '500', animation: 'pulse 1.5s infinite' }}>Loading Form...</div>
        <style>{`
          @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
          @keyframes gradientBG { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        `}</style>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
        <style>{`@keyframes gradientBG { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }`}</style>
        <div style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(16px)', padding: '40px 30px', borderRadius: '24px', textAlign: 'center', width: '100%', maxWidth: '420px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', margin: '0 auto 24px', boxShadow: '0 0 20px rgba(16,185,129,0.4)' }}>✓</div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc', margin: '0 0 12px' }}>Registration Complete!</h2>
          <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: '1.6' }}>Thank you for reaching out. Our counselors will contact you shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '20px', boxSizing: 'border-box' }}>
      
      <style>{`
        body {
          background-color: #0d1b2a;
          background-image: radial-gradient(circle at 50% 0%, #1a365d 0%, #0d1b2a 70%);
          color: #fff;
        }

        .qr-form-container {
          background: rgba(13, 27, 42, 0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(0, 210, 255, 0.15);
          border-top: 1px solid rgba(0, 210, 255, 0.3);
          border-radius: 16px;
          padding: 16px 20px;
          width: 100%;
          max-width: 460px;
          box-shadow: 0 24px 48px rgba(0,0,0,0.4), 0 0 20px rgba(0, 210, 255, 0.05);
          align-self: center;
          margin: 10px 0;
          position: relative;
          overflow: hidden;
        }
        
        .qr-form-container::before {
          content: '';
          position: absolute;
          top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(circle at top right, rgba(0, 210, 255, 0.08), transparent 40%),
                      radial-gradient(circle at bottom left, rgba(2, 108, 182, 0.08), transparent 40%);
          z-index: -1;
          pointer-events: none;
        }

        .qr-form-title {
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 4px;
          text-align: center;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        
        .qr-form-title span {
          color: #00d2ff;
        }

        .qr-form-subtitle {
          font-size: 13px;
          color: #94a3b8;
          margin: 0 0 12px;
          text-align: center;
        }
        .form-group {
          margin-bottom: 10px;
        }
        .form-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: #cbd5e1;
          margin-bottom: 4px;
        }
        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255, 255, 255, 0.03);
          font-size: 13px;
          color: #f8fafc;
          outline: none;
          transition: all 0.3s ease;
          box-sizing: border-box;
          font-family: inherit;
        }
        .form-input::placeholder, .form-textarea::placeholder {
          color: #64748b;
        }
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: #00d2ff;
          box-shadow: 0 0 0 2px rgba(0, 210, 255, 0.2);
          background: rgba(255, 255, 255, 0.06);
        }
        .form-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          background-size: 14px;
          padding-right: 32px;
        }
        .form-select option {
          background-color: #0d1b2a;
          color: #f8fafc;
        }
        .form-textarea {
          resize: vertical;
          min-height: 40px;
        }
        .submit-btn {
          width: 100%;
          padding: 10px;
          background: #00d2ff;
          background: linear-gradient(90deg, #026cb6 0%, #00d2ff 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 8px;
          box-shadow: 0 4px 12px rgba(0, 210, 255, 0.3);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 210, 255, 0.4);
          filter: brightness(1.1);
        }
        .submit-btn:active {
          transform: translateY(1px);
        }
        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>

      <div className="qr-form-container">
        <h2 className="qr-form-title">Student <span>Registration</span></h2>
        <p className="qr-form-subtitle">{formConfig.subtitle}</p>

        <form onSubmit={handleSubmit}>
          
          <div className="form-group">
            <label className="form-label">Enter Your Name <span style={{color: '#ef4444'}}>*</span></label>
            <input 
              type="text" 
              name="name" 
              required 
              className="form-input" 
              placeholder="e.g. Rahul Kumar"
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mobile Number <span style={{color: '#ef4444'}}>*</span></label>
            <input 
              type="tel" 
              name="phone" 
              required 
              className="form-input" 
              placeholder="10-digit mobile number"
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Select Your Qualification <span style={{color: '#ef4444'}}>*</span></label>
            <select name="qualification" required className="form-select" onChange={handleChange} defaultValue="">
              <option value="" disabled>Choose qualification...</option>
              {formConfig.qualifications?.map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Enter Your Address</label>
            <textarea 
              name="location" 
              className="form-textarea" 
              placeholder="Your full address/city..."
              onChange={handleChange}
            ></textarea>
          </div>

          <div className="form-group">
            <label className="form-label">Preferred Course <span style={{color: '#ef4444'}}>*</span></label>
            <select name="course" required className="form-select" onChange={handleChange} defaultValue="">
              <option value="" disabled>Select a course...</option>
              {formConfig.courses?.map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Preferred Batch Timing <span style={{color: '#ef4444'}}>*</span></label>
            <select name="batchTiming" required className="form-select" onChange={handleChange} defaultValue="">
              <option value="" disabled>Select timing...</option>
              {formConfig.timings?.map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Where Did You Hear About Us?</label>
            <select name="hearAboutUs" className="form-select" onChange={handleChange} defaultValue="">
              <option value="" disabled>Select option...</option>
              {formConfig.sources?.map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting Details...' : 'Submit Inquiry'}
          </button>

        </form>
      </div>
    </div>
  );
}
