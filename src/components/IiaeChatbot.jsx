import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, ExternalLink, Loader2, Send, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import BrandLogo from '../assets/iiae/IIAE-LOGO.png';

const WELCOME = {
  role: 'assistant',
  content:
    'Namaste! I’m your IIAE admission assistant. Ask about AIAEE, courses, fees, or say **“take me to apply”** and I’ll open the right page for you.',
};

const QUICK_PROMPTS = [
  { label: 'Where to apply?', text: 'Where can I apply?' },
  { label: 'AIAEE 2027', text: 'Tell me about AIAEE 2027' },
  { label: 'Pay fees', text: 'Where can I pay fees online?' },
  { label: 'Helpline', text: 'What is the admission helpline?' },
];

const formatAssistantText = (text) => {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const IiaeChatbot = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('checking');
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const goTo = useCallback(
    (navigation) => {
      if (!navigation?.path) return;
      if (navigation.external) {
        window.open(navigation.path, '_blank', 'noopener,noreferrer');
        return;
      }
      navigate(navigation.path);
      onClose();
    },
    [navigate, onClose],
  );

  useEffect(() => {
    if (!open) return undefined;
    const mq = window.matchMedia('(max-width: 639px)');
    const applyScrollLock = () => {
      document.body.style.overflow = mq.matches ? 'hidden' : '';
    };
    applyScrollLock();
    mq.addEventListener('change', applyScrollLock);
    return () => {
      document.body.style.overflow = '';
      mq.removeEventListener('change', applyScrollLock);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setStatus('checking');
    api
      .get('/chatbot/status')
      .then((res) => setStatus(res.data?.enabled ? 'online' : 'offline'))
      .catch(() => setStatus('offline'));
    const t = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open, sending]);

  const submitText = useCallback(
    async (text) => {
      const trimmed = String(text || '').trim();
      if (!trimmed || sending) return;

      const next = [...messagesRef.current, { role: 'user', content: trimmed }];
      setMessages(next);
      setInput('');
      setSending(true);

      try {
        const { data } = await api.post('/chatbot/chat', {
          messages: next
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role, content: m.content })),
          context: {
            loggedIn: Boolean(user),
            role: user?.role || null,
          },
        });

        const assistantMsg = {
          role: 'assistant',
          content: data.reply,
          navigation: data.navigation || null,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        if (data.navigation) {
          goTo(data.navigation);
        }
      } catch (err) {
        const fallback =
          err.response?.data?.message ||
          'Sorry, something went wrong. Please call +91 9870290575 for immediate help.';
        setMessages((prev) => [...prev, { role: 'assistant', content: fallback, isError: true }]);
      } finally {
        setSending(false);
      }
    },
    [sending, user, goTo],
  );

  const send = (event) => {
    event.preventDefault();
    submitText(input);
  };

  if (!open) return null;

  return (
    <div className="iiae-chat-panel" role="dialog" aria-label="IIAE admission chat" aria-modal="true">
      <header className="iiae-chat-head">
        <div className="iiae-chat-head-brand">
          <img src={BrandLogo} alt="" className="iiae-chat-logo" />
          <div>
            <p className="iiae-chat-title">Admission Assistant</p>
            <p className="iiae-chat-status">
              <span
                className={`iiae-chat-status-dot iiae-chat-status-dot--${status}`}
                aria-hidden="true"
              />
              {status === 'checking' && 'Connecting…'}
              {status === 'online' && 'Online · IIAE New Delhi'}
              {status === 'offline' && 'Helpline only · AI offline'}
            </p>
          </div>
        </div>
        <button type="button" className="iiae-chat-close" onClick={onClose} aria-label="Close chat">
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      </header>

      <div className="iiae-chat-messages" ref={listRef}>
        {messages.map((msg, index) => (
          <div
            key={`${index}-${msg.role}`}
            className={`iiae-chat-row iiae-chat-row--${msg.role === 'user' ? 'user' : 'bot'}`}
          >
            {msg.role !== 'user' && (
              <span className="iiae-chat-avatar iiae-chat-avatar--bot" aria-hidden="true">
                <Bot className="h-4 w-4" />
              </span>
            )}
            <div
              className={`iiae-chat-bubble ${
                msg.role === 'user'
                  ? 'iiae-chat-bubble--user'
                  : msg.isError
                    ? 'iiae-chat-bubble--error'
                    : 'iiae-chat-bubble--bot'
              }`}
            >
              <p className="iiae-chat-text">
                {msg.role === 'user' ? msg.content : formatAssistantText(msg.content)}
              </p>
              {msg.navigation && (
                <button type="button" className="iiae-chat-nav-btn" onClick={() => goTo(msg.navigation)}>
                  {msg.navigation.external ? <ExternalLink className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  Open {msg.navigation.label}
                </button>
              )}
            </div>
            {msg.role === 'user' && (
              <span className="iiae-chat-avatar iiae-chat-avatar--user" aria-hidden="true">
                <User className="h-4 w-4" />
              </span>
            )}
          </div>
        ))}
        {sending && (
          <div className="iiae-chat-row iiae-chat-row--bot">
            <span className="iiae-chat-avatar iiae-chat-avatar--bot" aria-hidden="true">
              <Bot className="h-4 w-4" />
            </span>
            <div className="iiae-chat-bubble iiae-chat-bubble--bot iiae-chat-typing">
              <span className="iiae-chat-dots" aria-hidden="true">
                <span /><span /><span />
              </span>
              <span className="sr-only">Assistant is typing</span>
            </div>
          </div>
        )}
      </div>

      <div className="iiae-chat-quick">
        {QUICK_PROMPTS.map((item) => (
          <button
            key={item.label}
            type="button"
            className="iiae-chat-chip"
            disabled={sending}
            onClick={() => submitText(item.text)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form className="iiae-chat-form" onSubmit={send}>
        <div className="iiae-chat-input-wrap">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about admissions, AIAEE, apply…"
            disabled={sending}
            maxLength={2000}
            autoComplete="off"
          />
          <button type="submit" disabled={sending || !input.trim()} aria-label="Send message">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="iiae-chat-footnote">IIAE may use AI to answer. For official decisions, contact admissions.</p>
      </form>
    </div>
  );
};

export default IiaeChatbot;
