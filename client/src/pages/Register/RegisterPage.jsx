import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Layers, Mail, Lock, User, Globe, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const registerValidationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  timezone: z.string().min(1, 'Timezone is required')
});

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney'
];

export const RegisterPage = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(registerValidationSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      timezone: COMMON_TIMEZONES.includes(detectedTimezone) ? detectedTimezone : 'UTC'
    }
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      await registerUser(data);
      navigate('/login?registered=true', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 mb-4 shadow-inner">
          <Layers className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Create an Account</h2>
        <p className="mt-2 text-sm text-slate-400">Get started with OmniPost Studio</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900/90 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-xl">
          {serverError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  {...register('name')}
                  className={`block w-full pl-10 pr-3 py-2.5 bg-slate-950/80 border ${
                    errors.name ? 'border-rose-500/80 focus:ring-rose-500' : 'border-slate-800 focus:border-emerald-500 focus:ring-emerald-500'
                  } rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 transition`}
                  placeholder="Jane Doe"
                  autoComplete="name"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-xs text-rose-400">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  {...register('email')}
                  className={`block w-full pl-10 pr-3 py-2.5 bg-slate-950/80 border ${
                    errors.email ? 'border-rose-500/80 focus:ring-rose-500' : 'border-slate-800 focus:border-emerald-500 focus:ring-emerald-500'
                  } rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 transition`}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-rose-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  {...register('password')}
                  className={`block w-full pl-10 pr-3 py-2.5 bg-slate-950/80 border ${
                    errors.password ? 'border-rose-500/80 focus:ring-rose-500' : 'border-slate-800 focus:border-emerald-500 focus:ring-emerald-500'
                  } rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 transition`}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-400">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Timezone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Globe className="h-4 w-4" />
                </div>
                <select
                  {...register('timezone')}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz} className="bg-slate-900 text-white">
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
              {errors.timezone && (
                <p className="mt-1 text-xs text-rose-400">{errors.timezone.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-950"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-emerald-400 hover:text-emerald-300 transition">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
