import { useState } from "react";

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  });
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('https://formspree.io/f/xpwrjdyl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.ok) {
        alert('תודה על פנייתך! נחזור אליך בהקדם');
        setFormData({ name: '', email: '', phone: '', company: '', message: '' });
      } else {
        alert('אירעה שגיאה בשליחת הטופס');
      }
    } catch (error) {
      alert('אירעה שגיאה בשליחת הטופס. נסה שוב או פנה אלינו ישירות.');
      console.error(error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="contact-form-container">
      <form className="contact-form" onSubmit={handleSubmit}>
        <h3 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '30px', textAlign: 'center', color: '#1c7895' }}>
          בואו נתחיל לעבוד יחד
        </h3>

        <div className="form-group">
          <label className="form-label">שם מלא</label>
          <input
            type="text"
            name="name"
            className="form-input"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">אימייל</label>
          <input
            type="email"
            name="email"
            className="form-input"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">טלפון</label>
          <input
            type="tel"
            name="phone"
            className="form-input"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">שם החברה</label>
          <input
            type="text"
            name="company"
            className="form-input"
            value={formData.company}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">הודעה</label>
          <textarea
            name="message"
            className="form-input form-textarea"
            value={formData.message}
            onChange={handleChange}
            placeholder="ספרו לנו על הצרכים שלכם..."
          />
        </div>

        <button type="submit" className="submit-button">
          שלח פנייה
        </button>
      </form>

      <div style={{ justifySelf: 'center' }}>
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/528e0dac3_WhatsAppImage2025-06-19at175252.jpeg"
          alt="צור קשר - Bot 10"
          style={{
            maxWidth: '300px',
            height: 'auto',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
            animation: 'float 3s ease-in-out infinite'
          }}
        />
      </div>
    </div>
  );
};



export default ContactForm