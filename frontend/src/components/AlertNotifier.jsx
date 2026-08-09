import { createContext, useContext, useEffect, useState } from 'react';

export const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initial fetch of active alerts
    fetch('http://localhost:8000/api/alerts?active_only=false&limit=100')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAlerts(data);
        }
      })
      .catch(err => console.error('Error fetching initial alerts:', err));

    // Connect to SSE stream
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    let es = new EventSource(`${apiUrl}/alerts/stream`);

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event_type === 'resolved') {
          setAlerts(prev => prev.map(a => a.id === data.id ? { ...a, is_resolved: true } : a));
        } else {
          // New alert — update state only, notification handled by ChatbotWidget
          setAlerts(prev => [data, ...prev]);
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    es.onerror = (err) => {
      console.error('SSE connection error:', err);
      setIsConnected(false);
      es.close();
      setTimeout(() => setIsConnected(true), 5000);
    };

    return () => {
      es.close();
    };
  }, []);

  return (
    <AlertContext.Provider value={{ alerts, setAlerts, isConnected }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => useContext(AlertContext) || { alerts: [], setAlerts: () => {}, isConnected: false };
