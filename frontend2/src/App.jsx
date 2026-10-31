import React, { useState, useCallback, useEffect } from 'react';
import CitizenLogin from './components/CitizenLogin';
import CyberDeptLogin from './components/CyberDeptLogin';
import CitizenDashboard from './components/CitizenDashboard';
import CyberDeptDashboard from './components/CyberDeptDashboard';

// Works whether VITE_API_URL is "https://host" or "https://host/api"
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '').replace(/\/api$/, '') + '/api';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function loadSession() {
  try {
    const token = sessionStorage.getItem('ccs_token');
    const user = JSON.parse(sessionStorage.getItem('ccs_user') || 'null');
    return token && user ? { token, user } : { token: null, user: null };
  } catch {
    return { token: null, user: null };
  }
}

export default function App() {
  const [session, setSession] = useState(loadSession);
  const [portal, setPortal] = useState('citizen');

  // Wake up a sleeping free-tier backend while the user is still reading the page
  useEffect(() => {
    fetch(`${API_BASE}/health`).catch(() => {});
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('ccs_token');
    sessionStorage.removeItem('ccs_user');
    setSession({ token: null, user: null });
  }, []);

  const handleLogin = useCallback((token, user) => {
    sessionStorage.setItem('ccs_token', token);
    sessionStorage.setItem('ccs_user', JSON.stringify(user));
    setSession({ token, user });
  }, []);

  const api = useCallback(
    async (path, { method = 'GET', body } = {}) => {
      const headers = { 'Content-Type': 'application/json' };
      if (session.token) headers.Authorization = `Bearer ${session.token}`;
      let res = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          res = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
          if (![502, 503, 504].includes(res.status)) break;
        } catch {
          res = null;
        }
        if (attempt < 2) await wait(5000); // server may be waking up (free hosting)
      }
      if (!res) {
        throw Object.assign(new Error('Cannot reach the server. Check your internet and try again in a minute.'), { status: 0 });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401 && session.token) logout();
        const fallback = res.status >= 502 ? 'The server is waking up. Please try again in a minute.' : 'Request failed';
        throw Object.assign(new Error(data.error || fallback), { status: res.status, data });
      }
      return data;
    },
    [session.token, logout]
  );

  if (session.user && session.user.role === 'citizen') {
    return <CitizenDashboard api={api} user={session.user} onLogout={logout} />;
  }
  if (session.user && session.user.role === 'cyber_dept') {
    return <CyberDeptDashboard api={api} user={session.user} onLogout={logout} />;
  }
  if (portal === 'dept') {
    return <CyberDeptLogin api={api} onLogin={handleLogin} onSwitch={() => setPortal('citizen')} />;
  }
  return <CitizenLogin api={api} onLogin={handleLogin} onSwitch={() => setPortal('dept')} />;
}