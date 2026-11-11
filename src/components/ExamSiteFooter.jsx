import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import BrandLogo from '../assets/iiae/IIAE-LOGO.png';

const SITE = 'https://www.iiae.in';

const usefulLinks = [
  ['About Us', `${SITE}/about-us`],
  ['Contact Us', `${SITE}/contact-us`],
  ['Infrastructure', `${SITE}/infrastructure`],
  ['Placement', `${SITE}/placements`],
  ['Parents Page', `${SITE}/parents-page`],
  ['Newsroom', `${SITE}/newsroom`],
];

const pageLinks = [
  ['Libraries', `${SITE}/iiae-libraries`],
  ['Research At IIAE', `${SITE}/research-at-iiae`],
  ['Faculty Directory', `${SITE}/faculties`],
  ['Course Catalogue', 'https://iiae.in/public/assets/documents/E-Brochure.pdf'],
  ['Career Services', `${SITE}/career-service`],
  ['Award Of C OF R', `${SITE}/award-of-c-of-r`],
];

const ExamSiteFooter = ({ onApply }) => {
  const navigate = useNavigate();
  const apply = onApply || (() => navigate('/apply-now'));
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const subscribe = async (event) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await api.post('/newsletters/subscribe', { email: trimmed });
      setSubscribed(true);
      toast.success('You are subscribed to our newsletter.');
    } catch (err) {
      const message = err.response?.data?.message || 'Could not subscribe. Please try again later.';
      if (err.response?.status === 400 && /already subscribed/i.test(message)) {
        setSubscribed(true);
        toast.success('You are already on our mailing list.');
        return;
      }
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="exam-footer">
      <section className="exam-footer-query">
        <div className="exam-footer-inner exam-footer-query-row">
          <h4>If you still have any query regarding career, contact us at +919870290573/75</h4>
          <button type="button" className="exam-footer-apply" onClick={apply}>
            Apply Now <i className="fa-solid fa-arrow-right" />
          </button>
        </div>
      </section>

      <div className="exam-footer-main">
        <div className="exam-footer-inner exam-footer-grid">
          <div className="exam-footer-brand">
            <a href={SITE}>
              <img src={BrandLogo} alt="IIAE" />
            </a>
            <span>
              <i className="fa-solid fa-location-dot" />
              Plot NO. 3&4., Near Yadav Bhavan, Bagdola Village Extension, Sector 8, Dwarka, New Delhi 110077.
            </span>
            <button type="button" className="exam-footer-apply" onClick={apply}>
              Apply Now <i className="fa-solid fa-arrow-right" />
            </button>
          </div>

          <div>
            <h3>Useful Links</h3>
            <ul>
              {usefulLinks.map(([label, href]) => (
                <li key={label}><a href={href}>{label}</a></li>
              ))}
            </ul>
          </div>

          <div className="exam-footer-help">
            <h3>Admission Helpline</h3>
            <ul>
              <li><a href="tel:+91-98702-90575"><i className="fa-solid fa-phone" /> +91 9870290575</a></li>
              <li><a href="tel:+91-98702-90577"><i className="fa-solid fa-phone" /> +91 9870290577</a></li>
              <li><a href="tel:+91-98702-90573"><i className="fa-solid fa-phone" /> +91 9870290573</a></li>
              <li><a href="tel:+91-84484-88194"><i className="fa-solid fa-phone" /> +91 8448488194</a></li>
              <li><a href="mailto:admission.iiae@gmail.com"><i className="fa-solid fa-envelope" /> admission.iiae@gmail.com</a></li>
            </ul>
          </div>

          <div className="exam-footer-news">
            <h3>Subscribe Newsletter</h3>
            {subscribed ? (
              <p className="exam-footer-thanks">Thank you for subscribing.</p>
            ) : (
              <form onSubmit={subscribe}>
                <input
                  type="email"
                  required
                  disabled={submitting}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (formError) setFormError('');
                  }}
                  placeholder="Enter email address"
                />
                <button type="submit" disabled={submitting}>
                  {submitting ? 'Subscribing…' : 'Subscribe Now!'}
                </button>
                {formError ? <p className="exam-footer-form-error" role="alert">{formError}</p> : null}
              </form>
            )}
            <a href={`${SITE}/important-dates-for-aiaee`}>
              AIAEE Important Dates <i className="fa-solid fa-arrow-right" />
            </a>
          </div>
        </div>

        <div className="exam-footer-pages">
          <div className="exam-footer-inner">
            <ul className="exam-footer-page-links">
              {pageLinks.map(([label, href]) => (
                <li key={label}><a href={href}>{label}</a></li>
              ))}
            </ul>
            <ul className="exam-footer-social">
              <li><a href="https://www.facebook.com/www.iiae.in" aria-label="Facebook"><i className="fa-brands fa-facebook" /></a></li>
              <li><a href="#" aria-label="X" onClick={(event) => event.preventDefault()}><i className="fa-brands fa-x-twitter" /></a></li>
              <li><a href="https://www.linkedin.com/company/indian-institute-of-aircraft-engineering-iiae-delhi" aria-label="LinkedIn"><i className="fa-brands fa-linkedin" /></a></li>
              <li><a href="https://www.instagram.com/iiaenewdelhi/" aria-label="Instagram"><i className="fa-brands fa-instagram" /></a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="exam-footer-copy">
        <div className="exam-footer-inner exam-footer-copy-row">
          <p>Copyright © 2025-2026 IIAE – Indian Institute of Aircraft Engineering</p>
          <p>
            <a href={`${SITE}/privacy-policy`}>Privacy Policy</a>
            <span>|</span>
            <a href={`${SITE}/terms-conditions`}>Terms & Conditions</a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default ExamSiteFooter;
