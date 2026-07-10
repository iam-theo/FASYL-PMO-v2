import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  department: string;
  tenantId: string;
}

interface SecurityProfile {
  userId: string;
  roles: Array<{ code: string; name: string; description: string }>;
  directOverrides: Array<{ name: string; label: string; type: string }>;
  effectivePermissions: string[];
}

interface AuthContextType {
  user: User | null;
  securityProfile: SecurityProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: any) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  securityProfile: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
  hasPermission: () => false,
  hasRole: () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [securityProfile, setSecurityProfile] = useState<SecurityProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data.data);
          try {
            const profileResponse = await api.get('/auth/users/me/profile');
            setSecurityProfile(profileResponse.data.data);
          } catch (profileError) {
            console.error('Failed to load security profile', profileError);
          }
        } catch (error) {
          console.error('Failed to load user', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (data: { accessToken: string; refreshToken: string; user: User; securityProfile?: SecurityProfile }) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    if (data.securityProfile) {
      setSecurityProfile(data.securityProfile);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setSecurityProfile(null);
      window.location.href = '/login';
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!securityProfile) return false;
    return securityProfile.effectivePermissions.includes(permission);
  };

  const hasRole = (role: string): boolean => {
    if (!securityProfile) return false;
    return securityProfile.roles.some(r => r.code === role);
  };

  return (
    <AuthContext.Provider value={{ user, securityProfile, isAuthenticated: !!user, isLoading, login, logout, hasPermission, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
