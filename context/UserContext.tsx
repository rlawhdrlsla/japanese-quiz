'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface UserInfo {
  user_id: number;
  username: string;
  current_round: number;
  cycle_seen_count: number;
  total_words: number;
  total_rounds_in_cycle: number;
}

interface UserContextType {
  user: UserInfo | null;
  loading: boolean;
  login: (username: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  login: async () => ({ ok: false }),
  logout: () => {},
  refreshUser: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('quiz_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('quiz_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error };
    setUser(data);
    localStorage.setItem('quiz_user', JSON.stringify(data));
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('quiz_user');
  };

  const refreshUser = async () => {
    if (!user) return;
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username }),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      localStorage.setItem('quiz_user', JSON.stringify(data));
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
