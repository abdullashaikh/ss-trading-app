import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [loginName, setLoginName] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(loginName, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-brand-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-700 text-white mx-auto flex items-center justify-center font-black text-3xl shadow-xl shadow-brand-700/30 mb-3 tracking-wider">
            SS
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">SS TRADING</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Chicken Distribution Management System</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Username / Login
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none"
                placeholder="Enter password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-brand-700 hover:bg-brand-800 active:scale-[0.99] text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-700/25 flex items-center justify-center gap-2 transition-all disabled:opacity-70 mt-2"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">Default: <span className="font-semibold text-gray-600">admin</span> / <span className="font-semibold text-gray-600">admin123</span></p>
        </div>
      </div>
    </div>
  );
};
