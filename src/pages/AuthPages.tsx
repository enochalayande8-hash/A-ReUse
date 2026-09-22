import React, { useState } from 'react';
import { useAuth } from '../services/auth/AuthContext';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

interface AuthPagesProps {
  initialMode?: 'login' | 'signup' | 'forgot-password';
  onSuccess?: () => void;
  onClose?: () => void;
}

export const AuthPages: React.FC<AuthPagesProps> = ({
  initialMode = 'login',
  onSuccess,
  onClose,
}) => {
  const { login, signup, forgotPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password'>(initialMode);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const clearForm = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearForm();

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearForm();

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await signup(fullName.trim(), email.trim(), password, confirmPassword);
      setSuccessMsg('Account created successfully! Welcome to Awareness Global Movement.');
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          if (onClose) onClose();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Could not complete registration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearForm();

    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      const msg = await forgotPassword(email.trim());
      setSuccessMsg(msg || 'Password reset instructions have been dispatched.');
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-2">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-block mb-3">
          <BrandLogo size="md" />
        </div>
        <h2 className="text-2xl font-black text-[#2C1810] tracking-tight font-sans">
          {mode === 'login' && 'Sign In to Your Account'}
          {mode === 'signup' && 'Join the Movement'}
          {mode === 'forgot-password' && 'Reset Your Password'}
        </h2>
        <p className="text-xs text-[#795548] mt-1">
          {mode === 'login' && 'Track your verified environmental reusable bag impact.'}
          {mode === 'signup' && 'Unite with people worldwide reducing plastic bag waste.'}
          {mode === 'forgot-password' && 'Enter your email to receive recovery instructions.'}
        </p>
      </div>

      {/* Error / Success Feedback */}
      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Forms */}
      {mode === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#2C1810] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#2C1810]/20 text-sm text-[#2C1810] placeholder-[#A1887F] focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#2C1810] uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  clearForm();
                  setMode('forgot-password');
                }}
                className="text-xs text-[#8D6E63] hover:text-[#2C1810] underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full pl-10 pr-11 py-3 rounded-xl bg-white border border-[#2C1810]/20 text-sm text-[#2C1810] placeholder-[#A1887F] focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-[#8D6E63] hover:text-[#2C1810] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-[#2C1810] text-[#FDFBF7] text-sm font-bold hover:bg-[#3E2723] disabled:opacity-50 transition-all border border-[#D4AF37]/50 shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Log In</span>
            )}
          </button>

          <div className="text-center pt-3 border-t border-[#2C1810]/10 text-xs text-[#6D4C41]">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => {
                clearForm();
                setMode('signup');
              }}
              className="font-bold text-[#2C1810] hover:underline cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </form>
      )}

      {mode === 'signup' && (
        <form onSubmit={handleSignup} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-[#2C1810] uppercase tracking-wider mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full legal or preferred name"
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#2C1810]/20 text-sm text-[#2C1810] placeholder-[#A1887F] focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2C1810] uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#2C1810]/20 text-sm text-[#2C1810] placeholder-[#A1887F] focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2C1810] uppercase tracking-wider mb-1">
              Password (min. 8 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-white border border-[#2C1810]/20 text-sm text-[#2C1810] placeholder-[#A1887F] focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-[#8D6E63] hover:text-[#2C1810] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2C1810] uppercase tracking-wider mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#2C1810]/20 text-sm text-[#2C1810] placeholder-[#A1887F] focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-[#2C1810] text-[#FDFBF7] text-sm font-bold hover:bg-[#3E2723] disabled:opacity-50 transition-all border border-[#D4AF37]/50 shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Join Movement</span>
            )}
          </button>

          <div className="text-center pt-3 border-t border-[#2C1810]/10 text-xs text-[#6D4C41]">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => {
                clearForm();
                setMode('login');
              }}
              className="font-bold text-[#2C1810] hover:underline cursor-pointer"
            >
              Log In
            </button>
          </div>
        </form>
      )}

      {mode === 'forgot-password' && (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#2C1810] uppercase tracking-wider mb-1.5">
              Registered Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8D6E63] absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#2C1810]/20 text-sm text-[#2C1810] placeholder-[#A1887F] focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-[#2C1810] text-[#FDFBF7] text-sm font-bold hover:bg-[#3E2723] disabled:opacity-50 transition-all border border-[#D4AF37]/50 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Reset Password</span>
            )}
          </button>

          <div className="text-center pt-3 border-t border-[#2C1810]/10">
            <button
              type="button"
              onClick={() => {
                clearForm();
                setMode('login');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#795548] hover:text-[#2C1810] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Log In</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
