import React, { useEffect, useState, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, getDoc, getDocs } from 'firebase/firestore';

const CustomSelect = ({ name, options, value, onChange, placeholder, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt) => {
    onChange({ target: { name, value: opt } });
    setIsOpen(false);
  };

  return (
    <div className="custom-dropdown" ref={dropdownRef}>
      <div 
        className={`form-select ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {value || <span style={{ color: '#94a3b8' }}>{placeholder}</span>}
      </div>
      {isOpen && (
        <div className="dropdown-options">
          {options?.map((opt, i) => (
            <div 
              key={i} 
              className="dropdown-option" 
              onClick={() => handleSelect(opt)}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
      <select 
        name={name} 
        required={required} 
        value={value || ''} 
        onChange={onChange}
        style={{ opacity: 0, position: 'absolute', left: 0, top: 0, height: '100%', width: '100%', pointerEvents: 'none' }}
      >
        <option value="" disabled>{placeholder}</option>
        {options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
};

export default function QRFormEmbed() {
  const [formConfig, setFormConfig] = useState({
    title: 'Student Registration',
    subtitle: 'Fill in your details below',
    qualifications: ['10th Pass', '12th Pass', 'Undergraduate', 'Postgraduate', 'Other'],
    courses: (() => {
      try {
        const saved = localStorage.getItem('crm_courses');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(c => c.name || c);
        }
      } catch(e){}
      return ['Data Analytics', 'Data Science With GenAI', 'AIML With GenAI', 'Digital Marketing'];
    })(),
    timings: ['Morning (9 AM - 11 AM)', 'Afternoon (2 PM - 4 PM)', 'Evening (6 PM - 8 PM)', 'Weekend Batches'],
    sources: ['Instagram', 'Facebook', 'Google Search', 'Friend/Referral', 'Walk-in/Poster', 'Other']
  });

  const [formValues, setFormValues] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.fontFamily = 'Inter, sans-serif';
    document.body.style.background = 'linear-gradient(-45deg, #f8fafc, #e2e8f0, #f1f5f9, #cbd5e1)';
    document.body.style.backgroundSize = '400% 400%';
    document.body.style.animation = 'gradientBG 15s ease infinite';
    document.body.style.color = '#0f172a';
    
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
            courses: activeCourses.length > 0 ? activeCourses : (data.courses && data.courses.length > 0 ? data.courses : prev.courses) 
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
    data.source = 'Walk-in'; 
    data.subSource = data.hearAboutUs || 'QR Code';
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

    try {
      await addDoc(collection(db, 'leads'), data);
      setIsSuccess(true);
      
      if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance('Your enquiry has been submitted.');
        
        const setVoiceAndSpeak = () => {
          const voices = window.speechSynthesis.getVoices();
          // Try to find a female voice by name (Zira on Windows, Samantha on Mac, Google UK Female, etc.)
          const femaleVoice = voices.find(v => 
            /female|zira|samantha|victoria/i.test(v.name)
          );
          
          if (femaleVoice) {
            msg.voice = femaleVoice;
          }
          
          msg.pitch = 1.4; // Higher pitch to sound younger
          msg.rate = 1.0;
          
          window.speechSynthesis.speak(msg);
        };

        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.addEventListener('voiceschanged', setVoiceAndSpeak, { once: true });
        } else {
          setVoiceAndSpeak();
        }
      }
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
        <div style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(16px)', padding: '40px 30px', borderRadius: '24px', textAlign: 'center', width: '100%', maxWidth: '420px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', margin: '0 auto 24px', boxShadow: '0 0 20px rgba(16,185,129,0.4)' }}>✓</div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px' }}>Registration Complete!</h2>
          <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.6' }}>Thank you for reaching out. Our counselors will contact you shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '20px', boxSizing: 'border-box' }}>
      
      <style>{`
        body {
          background-color: #f8fafc;
          background-image: radial-gradient(circle at 50% 0%, #e2e8f0 0%, #f8fafc 70%);
          color: #0f172a;
        }

        .qr-form-container {
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.98));
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 32px 40px;
          width: 100%;
          max-width: 1100px;
          box-shadow: 0 24px 48px rgba(0,0,0,0.4), 0 1px 3px rgba(255,255,255,0.05);
          align-self: flex-start;
          margin: 6vh auto 10vh auto;
          position: relative;
          box-sizing: border-box;
        }
        
        .qr-form-container::before {
          content: '';
          position: absolute;
          top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.1), transparent 40%),
                      radial-gradient(circle at bottom left, rgba(236, 72, 153, 0.1), transparent 40%);
          z-index: -1;
          pointer-events: none;
        }

        .qr-form-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .qr-form-title {
          font-size: 26px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 6px;
          letter-spacing: -0.5px;
        }
        
        .qr-form-title span {
          color: #818cf8;
          background: linear-gradient(135deg, #818cf8, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .qr-form-subtitle {
          font-size: 15px;
          color: #cbd5e1;
          margin: 0;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
        }
        
        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-label {
          font-size: 13px;
          font-weight: 600;
          color: #e2e8f0;
          margin-bottom: 6px;
        }
        
        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 14px;
          color: #0f172a;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
          font-family: inherit;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
        }
        
        .form-input::placeholder, .form-textarea::placeholder {
          color: #94a3b8;
        }
        
        .form-input:focus, .form-select:focus, .form-textarea:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
          background: #ffffff;
        }
        
        .form-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          background-size: 14px;
          padding-right: 36px;
        }
        
        .form-select option {
          background-color: #ffffff;
          color: #0f172a;
        }
        
        .form-textarea {
          resize: vertical;
          min-height: 50px;
        }
        
        .custom-dropdown {
          position: relative;
          width: 100%;
        }
        .dropdown-options {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          width: 100%;
          max-height: 250px;
          overflow-y: auto;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          z-index: 50;
        }
        .dropdown-option {
          padding: 10px 14px;
          font-size: 14px;
          color: #0f172a;
          cursor: pointer;
          transition: background 0.2s;
        }
        .dropdown-option:hover {
          background: #f1f5f9;
        }
        
        .submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 10px;
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
          letter-spacing: 0.5px;
        }
        
        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(99, 102, 241, 0.4);
        }
        
        .submit-btn:active {
          transform: translateY(1px);
        }
        
        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }
        
        @media (max-width: 1280px) {
          .qr-form-container {
            max-width: 90%;
            padding: 32px 30px;
            margin: 5vh auto 7vh auto;
          }
        }
        
        @media (max-width: 768px) {
          .qr-form-container {
            max-width: 95%;
            padding: 24px 20px;
            margin: 4vh auto 6vh auto;
          }
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .slide-animation {
          animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="qr-form-container">
        <div className="qr-form-header">
          <h2 className="qr-form-title">Student <span>Registration</span></h2>
          <p className="qr-form-subtitle">{formConfig.subtitle}</p>
        </div>

        <form onSubmit={(e) => { 
          e.preventDefault(); 
          if (currentStep < 6) { 
            setCurrentStep(prev => prev + 1); 
          } else { 
            handleSubmit(e); 
          } 
        }}>
          
          <div className="form-grid" style={{ display: 'block' }}>
            {currentStep === 0 && (
              <div className="form-group slide-animation" style={{ position: 'relative', zIndex: 10 }}>
                <label className="form-label">Enter Your Name <span style={{color: '#ef4444'}}>*</span></label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  className="form-input" 
                  placeholder="e.g. Rahul Kumar"
                  value={formValues.name || ''}
                  onChange={handleChange}
                  autoFocus
                />
              </div>
            )}

            {currentStep === 1 && (
              <div className="form-group slide-animation" style={{ position: 'relative', zIndex: 10 }}>
                <label className="form-label">Mobile Number <span style={{color: '#ef4444'}}>*</span></label>
                <input 
                  type="tel" 
                  name="phone" 
                  required 
                  className="form-input" 
                  placeholder="10-digit mobile number"
                  value={formValues.phone || ''}
                  onChange={handleChange}
                  autoFocus
                />
              </div>
            )}

            {currentStep === 2 && (
              <div className="form-group slide-animation" style={{ position: 'relative', zIndex: 10 }}>
                <label className="form-label">Select Your Qualification <span style={{color: '#ef4444'}}>*</span></label>
                <select name="qualification" required className="form-select" onChange={handleChange} value={formValues.qualification || ''}>
                  <option value="" disabled>Choose qualification...</option>
                  {formConfig.qualifications?.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}

            {currentStep === 3 && (
              <div className="form-group slide-animation" style={{ position: 'relative', zIndex: 10 }}>
                <label className="form-label">Preferred Course <span style={{color: '#ef4444'}}>*</span></label>
                <CustomSelect 
                  name="course" 
                  required 
                  placeholder="Select a course..." 
                  options={formConfig.courses} 
                  value={formValues.course} 
                  onChange={handleChange} 
                />
              </div>
            )}
            
            {currentStep === 4 && (
              <div className="form-group full-width slide-animation" style={{ position: 'relative', zIndex: 10 }}>
                <label className="form-label">Enter Your Address</label>
                <textarea 
                  name="location" 
                  className="form-textarea" 
                  placeholder="Your full address/city..."
                  value={formValues.location || ''}
                  onChange={handleChange}
                  autoFocus
                ></textarea>
              </div>
            )}

            {currentStep === 5 && (
              <div className="form-group slide-animation" style={{ position: 'relative', zIndex: 10 }}>
                <label className="form-label">Preferred Batch Timing <span style={{color: '#ef4444'}}>*</span></label>
                <select name="batchTiming" required className="form-select" onChange={handleChange} value={formValues.batchTiming || ''}>
                  <option value="" disabled>Select timing...</option>
                  {formConfig.timings?.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}

            {currentStep === 6 && (
              <div className="form-group slide-animation" style={{ position: 'relative', zIndex: 10 }}>
                <label className="form-label">Where Did You Hear About Us?</label>
                <select name="hearAboutUs" className="form-select" onChange={handleChange} value={formValues.hearAboutUs || ''}>
                  <option value="" disabled>Select option...</option>
                  {formConfig.sources?.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group full-width" style={{ flexDirection: 'row', gap: '10px', marginTop: '30px', zIndex: 1, position: 'relative' }}>
              {currentStep > 0 && (
                <button 
                  type="button" 
                  className="submit-btn" 
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'none' }} 
                  onClick={() => setCurrentStep(prev => Math.max(prev - 1, 0))}
                >
                  Back
                </button>
              )}
              {currentStep < 6 ? (
                <button type="submit" className="submit-btn">
                  Next
                </button>
              ) : (
                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting Details...' : 'Submit Inquiry'}
                </button>
              )}
            </div>
            
            <div style={{ textAlign: 'center', marginTop: '24px', color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>
              Step {currentStep + 1} of 7
            </div>
            
            <div className="slide-animation" style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
              <div style={{ width: `${((currentStep + 1) / 7) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: '3px', transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}></div>
            </div>

          </div>

        </form>
      </div>
    </div>
  );
}
