import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Camera, RotateCcw } from 'lucide-react';
import { chatbotApi } from '../api';
import '../index.css';
import botModel from '../assets/models/bot fish.glb';
import { useAlert } from './AlertNotifier';

const DASHBOARD_BOT = botModel;

// Kompresi foto kamera HP sebelum dikirim agar cepat & hemat kuota di laut
function compressImage(file, maxSize = 800, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [botAnimation, setBotAnimation] = useState('Wave');
  const [availableAnims, setAvailableAnims] = useState([]);
  const messagesEndRef = useRef(null);
  const headerModelRef = useRef(null);
  const fileInputRef = useRef(null);
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
    if (!isOpen) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.type !== 'alert_notif') {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const { alerts } = useAlert();

  useEffect(() => {
    const saved = localStorage.getItem('oceanbot_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.filter(m => m.type !== 'alert_notif'));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      try {
        // Simpan pesan tanpa menyimpan base64 gambar besar ke localStorage agar tidak melebihi kuota
        const toSave = messages
          .filter(m => m.type !== 'alert_notif')
          .map(m => (m.image ? { ...m, image: undefined, text: m.text || '📷 [Foto Biota Laut]' } : m));
        localStorage.setItem('oceanbot_messages', JSON.stringify(toSave));
      } catch {
        // Ignore storage quota errors
      }
    }
  }, [messages]);

  const buildAlertText = useCallback((activeAlerts) => {
    if (userRole === 'admin') {
      return `⚠️ Laporan Darurat!\nTerdapat ${activeAlerts.length} peringatan aktif di berbagai wilayah. Segera cek halaman Alerts.`;
    } else if (userRole === 'operator') {
      return `⚠️ Perhatian Operator!\nAda ${activeAlerts.length} peringatan aktif dari sensor di wilayah Anda. Harap segera periksa!`;
    }
    return `⚠️ Informasi Peringatan\nTerdapat ${activeAlerts.length} kondisi perairan yang perlu diwaspadai saat ini.`;
  }, [userRole]);

  const pushAlertNotification = useCallback((activeAlerts) => {
    const msgId = `alert_notif_${Date.now()}`;
    setMessages(prev => [
      ...prev.filter(m => m.type !== 'alert_notif'),
      { id: msgId, role: 'bot', text: buildAlertText(activeAlerts), type: 'alert_notif' }
    ]);

    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => {
      setMessages(prev => prev.filter(m => m.id !== msgId));
    }, 60000);
  }, [buildAlertText]);

  useEffect(() => {
    const viewer = headerModelRef.current;
    if (!viewer) return;
    const onLoad = () => {
      if (viewer.availableAnimations?.length > 0) {
        setAvailableAnims(viewer.availableAnimations);
      }
    };
    viewer.addEventListener('load', onLoad);
    return () => viewer.removeEventListener('load', onLoad);
  }, [isOpen]);

  useEffect(() => {
    const active = (alerts || []).filter(a => !a.is_resolved && a.level !== 'normal');
    const isDanger = active.length > 0;
    setHasAlerts(isDanger);
    setBotAnimation(
      isDanger
        ? (pickAnim('fall', availableAnims) || 'Fall')
        : (pickAnim('wave', availableAnims) || 'Wave')
    );

    if (periodicAlertRef.current) clearInterval(periodicAlertRef.current);

    if (isDanger) {
      setMessages(prev => {
        if (prev.filter(m => m.type !== 'alert_notif').length === 0) {
          return [{
            role: 'bot',
            text: `Halo! Saya OceanBot. Saat ini terdeteksi ${active.length} peringatan aktif pada sistem pemantauan. Ada yang bisa saya bantu?`
          }];
        }
        return prev;
      });
      pushAlertNotification(active);
      periodicAlertRef.current = setInterval(() => {
        pushAlertNotification(active);
      }, 60000);
    } else {
      setMessages(prev => {
        if (prev.filter(m => m.type !== 'alert_notif').length === 0) {
          return [{
            role: 'bot',
            text: 'Halo! Saya OceanBot, asisten OceanSmart. Tanya kondisi laut atau kirim foto ikan/biota untuk identifikasi cepat! 🐟📷'
          }];
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
    setLoadingText('');
    setBotAnimation(pickAnim('think', availableAnims) || 'Wave');

    try {
      const res = await chatbotApi.post('/chatbot', { message: userMsg });
      const reply = (res.data.reply || '').replace(/\*/g, '');
      setMessages(prev => [...prev, { role: 'bot', text: reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: 'Maaf, terjadi kesalahan saat memproses pesan Anda. Pastikan backend sudah berjalan.'
      }]);
    } finally {
      setLoading(false);
      setBotAnimation(hasAlerts ? (pickAnim('fall', availableAnims) || 'Fall') : (pickAnim('wave', availableAnims) || 'Wave'));
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || loading) return;

    try {
      setLoading(true);
      setLoadingText('Mengidentifikasi biota laut...');
      setBotAnimation(pickAnim('think', availableAnims) || 'Wave');

      const compressedDataUrl = await compressImage(file, 800, 0.78);
      const caption = input.trim();
      if (caption) setInput('');

      setMessages(prev => [
        ...prev,
        {
          role: 'user',
          image: compressedDataUrl,
          text: caption || 'Identifikasi foto biota laut ini'
        }
      ]);

      const res = await chatbotApi.post('/chatbot/vision', {
        image_base64: compressedDataUrl,
        mime_type: 'image/jpeg',
        message: caption
      });

      const reply = (res.data.reply || '').replace(/\*/g, '');
      setMessages(prev => [...prev, { role: 'bot', text: reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: '⚠️ Maaf, gagal menganalisis foto. Pastikan koneksi internet stabil dan server backend aktif.'
      }]);
    } finally {
      setLoading(false);
      setLoadingText('');
      setBotAnimation(hasAlerts ? (pickAnim('fall', availableAnims) || 'Fall') : (pickAnim('wave', availableAnims) || 'Wave'));
    }
  };

  const handleClearChat = () => {
    localStorage.removeItem('oceanbot_messages');
    setMessages([{
      role: 'bot',
      text: 'Obrolan dibersihkan. Silakan tanya seputar kondisi laut atau kirim foto biota untuk dicek! 🌊📷'
    }]);
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
  ];

  return (
    <div className={`oceanbot-wrapper ${isOpen ? 'is-open' : ''}`}>
      {/* Hidden File Input for Camera / Gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        style={{ display: 'none' }}
      />

      {/* Chat Window */}
      {isOpen && (
        <div className="oceanbot-window">
          {/* Header */}
          <div style={{
            padding: '0.75rem 1rem',
            background: 'linear-gradient(135deg, var(--primary, #023e8a), var(--primary-dark, #03045e))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{ width: 42, height: 42, overflow: 'visible', position: 'relative', flexShrink: 0 }}>
                <model-viewer
                  ref={headerModelRef}
                  src={DASHBOARD_BOT}
                  auto-rotate
                  autoplay
                  animation-name={botAnimation}
                  interaction-prompt="none"
                  style={{ width: '68px', height: '68px', background: 'transparent', position: 'absolute', top: '-13px', left: '-13px' }}
                  camera-controls={false}
                  shadow-intensity="0"
                  exposure="1.5"
                ></model-viewer>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                  OceanBot
                </h3>
                <span style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.8)', display: 'block' }}>
                  Asisten & Scanner Biota AI
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={handleClearChat}
                title="Bersihkan obrolan"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Tutup"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages" style={{ flex: 1, padding: '1rem', overflowY: 'auto', gap: '0.75rem' }}>
            {messages.map((msg, i) => {
              if (msg.type === 'alert_notif') {
                return (
                  <div key={msg.id || i} style={{
                    background: 'linear-gradient(135deg, #fff1f2, #fee2e2)',
                    border: '1px solid #fca5a5',
                    borderRadius: '0.75rem',
                    padding: '0.65rem 0.85rem',
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
                  maxWidth: '86%',
                  fontSize: '0.835rem',
                  padding: '0.65rem 0.875rem',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.55,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="Foto Biota"
                      style={{
                        width: '100%',
                        maxHeight: '170px',
                        objectFit: 'cover',
                        borderRadius: '0.5rem',
                        marginBottom: msg.text ? '0.5rem' : 0,
                        display: 'block'
                      }}
                    />
                  )}
                  {msg.text}
                </div>
              );
            })}
            {loading && (
              <div className="chat-bubble bot" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content', fontSize: '0.8125rem' }}>
                <span className="pulse">●</span>
                <span className="pulse" style={{ animationDelay: '0.2s' }}>●</span>
                <span className="pulse" style={{ animationDelay: '0.4s' }}>●</span>
                {loadingText && <span style={{ marginLeft: '0.25rem', color: '#64748b' }}>{loadingText}</span>}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions & Questions */}
          {messages.length <= 1 && (
            <div style={{
              padding: '0 1rem 0.65rem',
              display: 'flex',
              gap: '0.45rem',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.35rem 0.75rem',
                  borderRadius: '9999px',
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--primary, #023e8a), var(--primary-light, #0077b6))',
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(2, 62, 138, 0.25)'
                }}
              >
                <Camera size={13} /> Foto Biota
              </button>
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
                  style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem', borderRadius: '9999px' }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="chat-input-area" style={{
            padding: '0.65rem 0.85rem',
            borderTop: '1px solid var(--outline-variant, #e2e8f0)',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexShrink: 0
          }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              title="Foto / Upload Biota Laut"
              style={{
                padding: '0.55rem 0.65rem',
                borderRadius: '0.75rem',
                background: 'linear-gradient(135deg, var(--primary, #023e8a), var(--primary-light, #0077b6))',
                color: '#ffffff',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(2, 62, 138, 0.25)'
              }}
            >
              <Camera size={18} />
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanya atau kirim foto biota..."
              disabled={loading}
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: '0.85rem',
                padding: '0.55rem 0.75rem',
                borderRadius: '0.75rem',
                background: '#ffffff'
              }}
            />
            <button
              id="chatbot-widget-send"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              title="Kirim pesan"
              style={{
                padding: '0.55rem 0.75rem',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                opacity: loading || !input.trim() ? 0.55 : 1
              }}
            >
              <Send size={17} />
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Tanya OceanBot & Scan Biota"
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
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.12)'}
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
