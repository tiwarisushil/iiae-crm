import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Phone, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import IiaeChatbot from './IiaeChatbot';

const HELPLINE = '919870290575';
const WHATSAPP_TEXT = encodeURIComponent('Hello, I would like to know more about admission at IIAE.');

const STAFF_HIDDEN_ROLES = new Set(['admin', 'manager', 'counsellor']);

const useShowFloatingActions = () => {
  const { pathname } = useLocation();
  const { user, loading } = useAuth();

  return useMemo(() => {
    if (loading) return false;
    if (!pathname.startsWith('/dashboard')) return true;
    if (!user) return false;
    return !STAFF_HIDDEN_ROLES.has(user.role);
  }, [pathname, user, loading]);
};

const SiteFloatingActions = () => {
  const show = useShowFloatingActions();
  const [chatOpen, setChatOpen] = useState(false);

  if (!show) return null;

  const whatsappHref = `https://wa.me/${HELPLINE}?text=${WHATSAPP_TEXT}`;
  const callHref = `tel:+${HELPLINE}`;

  return (
    <div
      className={`iiae-contact-dock${chatOpen ? ' iiae-contact-dock--chat-open' : ''}`}
      aria-label="Quick contact"
    >
      <IiaeChatbot open={chatOpen} onClose={() => setChatOpen(false)} />
      <div className="iiae-float-actions">
        <button
          type="button"
          className={`iiae-float-btn iiae-float-btn--chat ${chatOpen ? 'iiae-float-btn--chat-open' : ''}`}
          onClick={() => setChatOpen((v) => !v)}
          aria-expanded={chatOpen}
          aria-label={chatOpen ? 'Close chat assistant' : 'Open chat assistant'}
        >
          {chatOpen ? <X className="h-5 w-5 text-white" strokeWidth={2.5} /> : <MessageCircle className="h-5 w-5 text-white" strokeWidth={2} />}
          <span className="text-white">{chatOpen ? 'Close' : 'Ask IIAE'}</span>
        </button>
        <a href={callHref} className="iiae-float-btn iiae-float-btn--call" aria-label="Call admission helpline">
          <Phone className="h-5 w-5" strokeWidth={2} />
          <span>Call</span>
        </a>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="iiae-float-btn iiae-float-btn--whatsapp"
          aria-label="Chat on WhatsApp"
        >
          <i className="fa-brands fa-whatsapp" aria-hidden="true" />
          <span>WhatsApp</span>
        </a>
      </div>
    </div>
  );
};

export default SiteFloatingActions;
