import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import api, { getSandboxState } from '../api';

export const AlertContext = createContext();

// Shared AudioContext unlocked on user gesture so background polls can play sound
let sharedAudioCtx = null;
function getAudioCtx() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

// Synthesize crisp marine alert tone via Web Audio API (no external mp3 required)
function playAlertTone(level = 'bahaya') {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    const playBeep = (freq, startOffset, duration, vol = 0.16) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = level === 'bahaya' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(vol, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    };

    if (level === 'bahaya') {
      playBeep(880, 0, 0.16, 0.15);
      playBeep(660, 0.2, 0.16, 0.15);
      playBeep(880, 0.4, 0.22, 0.18);
    } else {
      playBeep(587, 0, 0.18, 0.11);
    }
  } catch {
    // Ignore autoplay restrictions before user interaction
  }
}

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('ocean_alarm_muted') === 'true');
  const isMutedRef = useRef(isMuted);
  const seenAlertKeysRef = useRef(new Set());
  const initialLoadDoneRef = useRef(false);
  const esRef = useRef(null);
  const reconnectTimer = useRef(null);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      isMutedRef.current = next;
      localStorage.setItem('ocean_alarm_muted', String(next));
      if (!next) {
        playAlertTone('waspada');
      }
      return next;
    });
  }, []);

  // Fetch initial alerts — only active (unresolved, non-normal) alerts
  const fetchAlerts = useCallback(() => {
    api.get('/alerts?active_only=true&limit=200')
      .then(res => {
        if (Array.isArray(res.data)) {
          const active = res.data.filter(a => a.level !== 'normal');
          active.forEach(a => seenAlertKeysRef.current.add(`${a.sensor_id}_${a.parameter}`));
          initialLoadDoneRef.current = true;
          setAlerts(active);
        }
      })
      .catch(err => console.error('Error fetching alerts:', err));
  }, []);

  // Connect SSE stream
  const connectSSE = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const es = new EventSource(`${apiUrl}/alerts/stream`);
    esRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'ping' || data.type === 'connected') return;

        const eventType = data.event_type;
        const role = localStorage.getItem('ocean_role') || 'pengguna';
        const wilayah = localStorage.getItem('ocean_wilayah') || '';

        if (eventType === 'resolved' || data.is_resolved === true) {
          setAlerts(prev => prev.filter(a => a.id !== data.id));

        } else if (eventType === 'update') {
          setAlerts(prev =>
            prev.map(a =>
              a.id === data.id
                ? { ...a, value: data.value, level: data.level, message: data.message }
                : a
            )
          );

        } else {
          // New alert from SSE — DON'T add directly (SSE has no role filter)
          // The 10s poll will pick it up with proper wilayah filtering
          // Only update if already exists in state (safe update)
          if (data.level === 'normal') return;

          setAlerts(prev => {
            const idx = prev.findIndex(
              a => a.sensor_id === data.sensor_id && a.parameter === data.parameter && !a.is_resolved
            );
            if (idx >= 0) {
              // Update existing alert that's already in filtered state
              const updated = [...prev];
              updated[idx] = { ...updated[idx], ...data };
              return updated;
            }
            // Don't add new — poll will sync with proper filtering
            return prev;
          });
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      esRef.current = null;
      // Reconnect after 5s
      reconnectTimer.current = setTimeout(() => connectSSE(), 5000);
    };
  }, []);

  useEffect(() => {
    fetchAlerts();
    connectSSE();

    // Poll every 10s — sync state with active alerts on server
    const poll = setInterval(() => {
      api.get('/alerts?active_only=true&limit=200')
        .then(res => {
          if (!Array.isArray(res.data)) return;
          setAlerts(prev => {
            const incomingMap = new Map(res.data.map(a => [a.id, a]));
            const now = new Date();
            
            // Keep alerts that are either:
            // 1. Returned in the latest poll (active on server)
            // 2. Very recently created in the last 15 seconds (to prevent SSE race conditions)
            const updatedAlerts = prev.filter(a => {
              if (incomingMap.has(a.id)) return true;
              const ageMs = now - new Date(a.created_at);
              return ageMs < 15000;
            }).map(a => {
              const incoming = incomingMap.get(a.id);
              return incoming ? { ...a, ...incoming } : a;
            });
            
            // Add any new alerts from the poll that are not in the state yet
            const existingIds = new Set(updatedAlerts.map(a => a.id));
            let hasNewDanger = false;
            let hasNewWarn = false;
            for (const incoming of res.data) {
              if (!existingIds.has(incoming.id) && !incoming.is_resolved && incoming.level !== 'normal') {
                updatedAlerts.push(incoming);
                const key = `${incoming.sensor_id}_${incoming.parameter}`;
                if (initialLoadDoneRef.current && !seenAlertKeysRef.current.has(key)) {
                  seenAlertKeysRef.current.add(key);
                  if (incoming.level === 'bahaya') hasNewDanger = true;
                  else hasNewWarn = true;
                }
              }
            }
            if (!isMutedRef.current && (hasNewDanger || hasNewWarn)) {
              playAlertTone(hasNewDanger ? 'bahaya' : 'waspada');
            }
            
            // Sort: newer first
            updatedAlerts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            return updatedAlerts;
          });
        })
        .catch(() => {});
    }, 10000);

    const onSandboxUpdate = () => {
      const sb = getSandboxState();
      if (sb.active_anomaly !== 'normal' && !isMutedRef.current) {
        playAlertTone('bahaya');
      }
      fetchAlerts();
    };
    const unlockAudio = () => { getAudioCtx(); };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('ocean_sandbox_updated', onSandboxUpdate);

    return () => {
      clearInterval(poll);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('ocean_sandbox_updated', onSandboxUpdate);
      if (esRef.current) esRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [fetchAlerts, connectSSE]);

  return (
    <AlertContext.Provider value={{ alerts, setAlerts, isConnected, isMuted, toggleMute }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext) || {
  alerts: [],
  setAlerts: () => {},
  isConnected: false,
  isMuted: false,
  toggleMute: () => {},
};
