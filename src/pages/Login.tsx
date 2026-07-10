import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Briefcase, Lock, Mail, Loader2 } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
        deviceInfo: navigator.userAgent
      });

      const { accessToken, refreshToken } = response.data.data;
      
      // Fetch user profile immediately after login
      localStorage.setItem('accessToken', accessToken);
      const userRes = await api.get('/auth/me');
      
      let securityProfile = null;
      try {
        const profileRes = await api.get('/auth/users/me/profile');
        securityProfile = profileRes.data.data;
      } catch (profileErr) {
        console.error('Failed to load security profile on login', profileErr);
      }
      
      login({ accessToken, refreshToken, user: userRes.data.data, securityProfile });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 selection:bg-indigo-500/30">
      <div className="w-full max-w-md bg-[#18181b] rounded-2xl border border-zinc-800 p-8 shadow-2xl shadow-black">
        <div className="flex justify-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center border border-indigo-500/20 text-white shadow-lg shadow-indigo-600/20">
            <Briefcase className="h-6 w-6" />
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">FASYL PMO Login</h1>
          <p className="text-zinc-500 text-sm mt-2">Enterprise Project Management</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#09090b] border border-zinc-800 text-zinc-200 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">Password</label>
              <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#09090b] border border-zinc-800 text-zinc-200 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2.5 font-medium transition-colors mt-6 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
