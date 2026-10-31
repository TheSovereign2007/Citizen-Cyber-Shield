import React, { useState, useCallback } from 'react';
import CitizenLogin from './components/CitizenLogin';
import CyberDeptLogin from './components/CyberDeptLogin';
import CitizenDashboard from './components/CitizenDashboard';
import CyberDeptDashboard from './components/CyberDeptDashboard';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

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
      let res;
      try {
        res = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
      } catch {
        throw Object.assign(new Error('Cannot reach the server. Is the backend running on port 4000?'), { status: 0 });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401 && session.token) logout();
        throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status, data });
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