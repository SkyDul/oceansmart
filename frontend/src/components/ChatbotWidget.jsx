import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X } from 'lucide-react';
import api, { chatbotApi } from '../api';
import '../index.css';
import botModel from '../assets/models/bot fish.glb';
import { useAlert } from './AlertNotifier';

// Ketika file Fish by Quaternius tersedia di folder models,
// ganti baris ini menjadi:
// import dashboardBot from '../assets/models/Fish by Quaternius - ypEYhCImAB.glb';
// const DASHBOARD_BOT = dashboardBot;
// Sementara belum ada, pakai bot fish:
const DASHBOARD_BOT = botModel;

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [botAnimation, setBotAnimation] = useState('Wave');
  const [availableAnims, setAvailableAnims] = useState([]);
  const messagesEndRef = useRef(null);
  const headerModelRef = useRef(null);
  const [hasAlerts, setHasAlerts] = useState(false);
  const userRole = localStorage.getItem('ocean_role') || 'pengguna';
  const alertTimerRef = useRef(null);
  const periodicAlertRef = useRef(null);

  // Pick best matching animation name from available list
  const pickAnim = useCallback((intent, anims) => {
    if (!anims || anims.length === 0) return undefined;
    const lower = anims.map(a => ({ orig: a, low: a.toLowerCase() }));
    const find = (...keywords) => lower.find(a => keywords.some(k => a.low.includes(k)))?.orig;
    if (intent === 'wave') return find('wave', 'idle', 'swim', 'float') || anims[0];
    if (intent === 'fall') return find('fall', 'hit', 'damage', 'react', 'hurt') || anims[0];
    if (intent === 'think') return find('yes', 'nod', 'talk', 'speak', 'swim', 'idle') || anims[0];
    return anims[0];
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const { alerts } = useAlert();

  // Load persisted non-alert messages on mount
  useEffect(() => {
    const saved = localStorage.getItem('oceanbot_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Never restore auto-notification alerts — they are ephemeral
        setMessages(parsed.filter(m => m.type !== 'alert_notif'));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Save only non-ephemeral messages
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(
        'oceanbot_messages',
        JSON.stringify(messages.filter(m => m.type !== 'alert_notif'))
      );
    }
  }, [messages]);

  // Build alert notification text
  const buildAlertText = useCallback((activeAlerts) => {
    if (userRole === 'admin') {
      return `⚠️ Laporan Darurat!\nTerdapat ${activeAlerts.length} peringatan aktif di berbagai wilayah. Segera cek halaman Alerts.`;
    } else if (userRole === 'operator') {
      return `⚠️ Perhatian Operator!\nAda ${activeAlerts.length} peringatan aktif dari sensor di wilayah Anda. Harap segera periksa!`;
    }
    return `⚠️ Informasi Peringatan\nTerdapat ${activeAlerts.length} kondisi perairan yang perlu diwaspadai saat ini.`;
  }, [userRole]);

  // Push a transient alert notification message, auto-remove after 60s
  const pushAlertNotification = useCallback((activeAlerts) => {
    const msgId = `alert_notif_${Date.now()}`;
    setMessages(prev => [
      ...prev.filter(m => m.type !== 'alert_notif'), // remove any old one first
      { id: msgId, role: 'bot', text: buildAlertText(activeAlerts), type: 'alert_notif' }
    ]);

    // Auto-dismiss after 60 seconds
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== msgId));
    }, 60000);
  }, [buildAlertText]);

  // Monitor live alerts — set animation & periodic 1-minute notifications
  useEffect(() => {
    if (!alerts) return;

    const activeAlerts = alerts.filter(a => !a.is_resolved);
    setHasAlerts(activeAlerts.length > 0);

    if (activeAlerts.length > 0) {
      // Bot jatuh (Fall) saat ada peringatan
      setBotAnimation(pickAnim('fall', availableAnims) || 'Fall');

      // Push first notification immediately
      pushAlertNotification(activeAlerts);

      // Then repeat every 60 seconds while alerts are active
      if (periodicAlertRef.current) clearInterval(periodicAlertRef.current);
      periodicAlertRef.current = setInterval(() => {
        pushAlertNotification(activeAlerts);
      }, 60000);
    } else {
      // No active alerts — bot wave
      setBotAnimation(pickAnim('wave', availableAnims) || 'Wave');
      if (periodicAlertRef.current) clearInterval(periodicAlertRef.current);

      // Default greeting if chat is empty
      setMessages(prev => {
        if (prev.filter(m => m.type !== 'alert_notif').length === 0) {
          return [{ role: 'bot', text: 'Selamat datang! Saya OceanBot, asisten virtual OceanSmart. Kondisi perairan saat ini terpantau aman. Ada yang bisa saya bantu?' }];
        }
        return prev;
      });
    }

    return () => {
      if (periodicAlertRef.current) clearInterval(periodicAlertRef.current);
    };
  }, [alerts, pushAlertNotification, availableAnims, pickAnim]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    setBotAnimation(pickAnim('think', availableAnims) || 'Wave');

    try {
      const res = await chatbotApi.post('/chatbot', { message: userMsg });
      const reply = (res.data.reply || '').replace(/\*\*/g, '');
      setMessages(prev => [...prev, { role: 'bot', text: reply }]);
      setBotAnimation(hasAlerts ? (pickAnim('fall', availableAnims) || 'Fall') : (pickAnim('wave', availableAnims) || 'Wave'));
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: 'Maaf, terjadi kesalahan saat memproses pesan Anda. Pastikan backend sudah berjalan.'
      }]);
      setBotAnimation(hasAlerts ? (pickAnim('fall', availableAnims) || 'Fall') : (pickAnim('wave', availableAnims) || 'Wave'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickQuestions = [
    'Kondisi kualitas air?',
    'Ada peringatan aktif?',
    'Ocean Health Index?',
  ];

  return (
    <div style={{ position: 'fixed', bottom: '1.75rem', right: '2.5rem', zIndex: 9999 }}>
      {/* Chat Window */}
      {isOpen && (
        <div className="card" style={{
          width: '350px',
          height: '500px',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: '1rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '0.75rem 1rem',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 44, height: 44, overflow: 'visible', position: 'relative' }}>
                <model-viewer
                  src={DASHBOARD_BOT}
                  auto-rotate
                  autoplay
                  animation-name={botAnimation}
                  interaction-prompt="none"
                  style={{ width: '70px', height: '70px', background: 'transparent', position: 'absolute', top: '-13px', left: '-13px' }}
                  camera-controls={false}
                  shadow-intensity="0"
                  exposure="1.5"
                ></model-viewer>
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>OceanBot</h3>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setMessages([]);
                setInput('');
                localStorage.removeItem('oceanbot_messages');
              }}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages" style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
            {messages.map((msg, i) => {
              if (msg.type === 'alert_notif') {
                return (
                  <div key={msg.id || i} style={{
                    background: 'linear-gradient(135deg, #fff1f2, #fee2e2)',
                    border: '1px solid #fca5a5',
                    borderRadius: '0.75rem',
                    padding: '0.6rem 0.75rem',
                    marginBottom: '0.5rem',
                    fontSize: '0.8125rem',
                    color: '#991b1b',
                    whiteSpace: 'pre-wrap',
                    position: 'relative',
                    animation: 'alertPulse 2s ease-in-out infinite',
                  }}>
                    {msg.text}
                    <button
                      onClick={() => setMessages(prev => prev.filter(m => m.id !== msg.id))}
                      style={{ position: 'absolute', top: 6, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontSize: '0.75rem', fontWeight: 700, lineHeight: 1 }}
                      title="Tutup"
                    >✕</button>
                  </div>
                );
              }
              return (
                <div key={i} className={`chat-bubble ${msg.role}`} style={{
                  maxWidth: '85%',
                  fontSize: '0.8125rem',
                  padding: '0.5rem 0.75rem',
                  marginBottom: '0.5rem',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.text}
                </div>
              );
            })}
            {loading && (
              <div className="chat-bubble bot" style={{ display: 'flex', gap: 4, width: 'fit-content' }}>
                <span className="pulse">●</span>
                <span className="pulse" style={{ animationDelay: '0.2s' }}>●</span>
                <span className="pulse" style={{ animationDelay: '0.4s' }}>●</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length <= 1 && (
            <div style={{
              padding: '0 1rem 0.5rem',
              display: 'flex', gap: '0.5rem', flexWrap: 'wrap'
            }}>
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setInput(q);
                    setTimeout(() => {
                      document.getElementById('chatbot-widget-send')?.click();
                    }, 50);
                  }}
                  style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="chat-input-area" style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanya sesuatu..."
              disabled={loading}
              style={{ fontSize: '0.8125rem', padding: '0.5rem' }}
            />
            <button id="chatbot-widget-send" onClick={sendMessage} disabled={loading || !input.trim()} style={{ padding: '0.5rem' }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Tanya OceanBot"
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
            marginLeft: 'auto',
            overflow: 'visible',
            padding: 0,
            position: 'relative',
            filter: 'drop-shadow(0 6px 16px rgba(0, 119, 182, 0.45))'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <model-viewer
            src={DASHBOARD_BOT}
            auto-rotate
            autoplay
            animation-name={botAnimation}
            interaction-prompt="none"
            camera-controls={false}
            shadow-intensity="0"
            exposure="1.6"
            style={{ width: '105px', height: '105px', position: 'absolute', top: '-22px', left: '-22px', background: 'transparent', pointerEvents: 'none' }}
          ></model-viewer>
          {hasAlerts && (
            <span style={{ position: 'absolute', top: 0, right: 0, background: 'var(--danger)', width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--background)' }}></span>
          )}
        </button>
      )}

      <style>{`
        @keyframes alertPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
          50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}
