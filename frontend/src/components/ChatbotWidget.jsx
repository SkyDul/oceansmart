import { useState, useRef, useEffect } from 'react';
import { Send, X, MessageCircle } from 'lucide-react';
import api from '../api';
import '../index.css';
import botModel from '../assets/models/bot fish.glb';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [botAnimation, setBotAnimation] = useState('Idle'); // Default animation
  const messagesEndRef = useRef(null);
  const [hasAlerts, setHasAlerts] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    // Initial fetch to check alerts
    api.get('/alerts?active_only=true&limit=10')
      .then(res => {
        const alertsCount = res.data.length;
        if (alertsCount > 0) {
          setHasAlerts(true);
          setBotAnimation('HitReact');
          setMessages([
            {
              role: 'bot',
              text: `🌊 Halo! Saya **OceanBot**.\n\n⚠️ **PERHATIAN:** Saat ini terdapat **${alertsCount} peringatan aktif** di kawasan! Silakan ketik "Ada peringatan aktif?" untuk informasi lebih lanjut.`
            }
          ]);
        } else {
          setBotAnimation('Idle');
          setMessages([
            {
              role: 'bot',
              text: '🌊 Halo! Saya **OceanBot**, asisten virtual OceanSmart.\n\nSaya bisa membantu Anda tentang:\n• Kondisi kualitas air terkini\n• Status peringatan dini\n• Informasi biota laut\n\nApa yang ingin Anda ketahui?'
            }
          ]);
        }
      })
      .catch(() => {
        // Fallback default greeting
        setMessages([
          {
            role: 'bot',
            text: '🌊 Halo! Saya **OceanBot**, asisten virtual OceanSmart. Apa yang ingin Anda ketahui?'
          }
        ]);
      });
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    setBotAnimation('Yes'); // Animation when processing/user is asking

    try {
      const res = await api.post('/chatbot', { message: userMsg });
      setMessages(prev => [...prev, { role: 'bot', text: res.data.reply }]);
      setBotAnimation(hasAlerts ? 'HitReact' : 'Idle'); // Revert animation
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: '⚠️ Maaf, terjadi kesalahan saat memproses pesan Anda. Pastikan backend sudah berjalan.'
      }]);
      setBotAnimation('Idle');
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
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999 }}>
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
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                <model-viewer
                  src={botModel}
                  auto-rotate
                  autoplay
                  animation-name={botAnimation}
                  interaction-prompt="none"
                  style={{ width: '100%', height: '100%', background: 'transparent' }}
                  camera-controls={false}
                ></model-viewer>
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>OceanBot</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages" style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`} style={{
                maxWidth: '85%',
                fontSize: '0.8125rem',
                padding: '0.5rem 0.75rem',
                marginBottom: '0.5rem',
                whiteSpace: 'pre-wrap'
              }}>
                {msg.text}
              </div>
            ))}
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
          style={{
            width: '65px',
            height: '65px',
            borderRadius: '50%',
            background: '#fff',
            border: 'none',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0, 150, 199, 0.4)',
            transition: 'transform 0.2s ease',
            marginLeft: 'auto',
            overflow: 'hidden',
            padding: 0,
            position: 'relative'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <model-viewer
            src={botModel}
            auto-rotate
            autoplay
            animation-name={botAnimation}
            interaction-prompt="none"
            camera-controls={false}
            style={{ width: '130%', height: '130%', position: 'absolute', top: '-15%', left: '-15%', background: 'transparent', pointerEvents: 'none' }}
          ></model-viewer>
          {hasAlerts && (
            <span style={{ position: 'absolute', top: 0, right: 0, background: 'var(--danger)', width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--background)' }}></span>
          )}
        </button>
      )}
    </div>
  );
}
