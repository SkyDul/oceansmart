import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import api from '../api';

export const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const esRef = useRef(null);
  const reconnectTimer = useRef(null);

  // Fetch initial alerts — does a full replace (first load only)
  const fetchAlerts = useCallback(() => {
    api.get('/alerts?limit=200')
      .then(res => {
        if (Array.isArray(res.data)) setAlerts(res.data);
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
        // Skip keepalive / connection messages
        if (data.type === 'ping' || data.type === 'connected') return;

        const eventType = data.event_type;

        if (eventType === 'resolved' || data.is_resolved === true) {
          // Resolved: update the existing alert in state
          setAlerts(prev =>
            prev.map(a =>
              a.id === data.id
                ? { ...a, is_resolved: true, resolved_at: data.resolved_at, level: data.level }
                : a
            )
          );

        } else if (eventType === 'update') {
          // Ongoing danger — update value/level in place
          setAlerts(prev =>
            prev.map(a =>
              a.id === data.id
                ? { ...a, value: data.value, level: data.level, message: data.message }
                : a
            )
          );

        } else {
          // New danger condition — add or upsert alert
          setAlerts(prev => {
            const idx = prev.findIndex(
              a => a.sensor_id === data.sensor_id && a.parameter === data.parameter && !a.is_resolved
            );
            if (idx >= 0) {
              // Update existing
              const updated = [...prev];
              updated[idx] = { ...updated[idx], ...data };
              return updated;
            } else {
              // New alert
              return [data, ...prev];
            }
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

    // Poll every 10s — MERGE (upsert by id) so SSE-pushed active alerts are not wiped
    const poll = setInterval(() => {
      api.get('/alerts?limit=200')
        .then(res => {
          if (!Array.isArray(res.data)) return;
          setAlerts(prev => {
            const map = new Map(prev.map(a => [a.id, a]));
            for (const incoming of res.data) {
              const existing = map.get(incoming.id);
              if (existing) {
                // In-memory (SSE) data is fresher for value/level/message
                // But is_resolved=true must always win (from either side)
                const resolved = existing.is_resolved || incoming.is_resolved;
                map.set(incoming.id, { ...incoming, ...existing, is_resolved: resolved });
              } else {
                map.set(incoming.id, incoming);
              }
            }
            const merged = Array.from(map.values());
            merged.sort((a, b) => {
              if (!a.is_resolved && b.is_resolved) return -1;
              if (a.is_resolved && !b.is_resolved) return 1;
              return new Date(b.created_at) - new Date(a.created_at);
            });
            return merged;
          });
        })
        .catch(() => {});
    }, 10000);

    return () => {
      clearInterval(poll);
      if (esRef.current) esRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [fetchAlerts, connectSSE]);

  return (
    <AlertContext.Provider value={{ alerts, setAlerts, isConnected }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext) || {
  alerts: [],
  setAlerts: () => {},
  isConnected: false,
};
