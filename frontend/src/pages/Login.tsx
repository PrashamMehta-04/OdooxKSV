import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Zap, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

const forgotSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit OTP'),
});

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [verifiedOtp, setVerifiedOtp] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const { register: regForgot, handleSubmit: handleForgotSubmit, formState: { errors: forgotErrors } } = useForm<{email: string}>({ resolver: zodResolver(forgotSchema) });
  const { register: regOtp, handleSubmit: handleOtpSubmit, reset: resetOtpForm, formState: { errors: otpErrors } } = useForm<{otp: string}>({ resolver: zodResolver(otpSchema) });
  const { register: regReset, handleSubmit: handleResetSubmit, reset: resetPasswordForm, formState: { errors: resetErrors } } = useForm<{password: string}>({ resolver: zodResolver(resetSchema) });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      toast.error(message);
    }
  };

  const onForgotSubmit = async (data: { email: string }) => {
    setIsForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', data);
      setResetEmail(data.email);
      setVerifiedOtp('');
      resetOtpForm({ otp: '' });
      resetPasswordForm({ password: '' });
      setForgotStep('verify');
      toast.success('OTP sent successfully.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send OTP';
      toast.error(msg);
    } finally {
      setIsForgotLoading(false);
    }
  };

  const onOtpSubmit = async (data: { otp: string }) => {
    setIsForgotLoading(true);
    try {
      await api.post('/auth/verify-otp', { email: resetEmail, otp: data.otp });
      setVerifiedOtp(data.otp);
      resetPasswordForm({ password: '' });
      setForgotStep('reset');
      toast.success('OTP verified');
    } catch {
      toast.error('Invalid or expired OTP');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const onResetSubmit = async (data: { password: string }) => {
    setIsForgotLoading(true);
    try {
      await api.post('/auth/reset-password', { email: resetEmail, otp: verifiedOtp, password: data.password });
      toast.success('Password reset successfully!');
      setShowForgotModal(false);
      setForgotStep('request');
      setResetEmail('');
      setVerifiedOtp('');
      resetOtpForm({ otp: '' });
      resetPasswordForm({ password: '' });
    } catch {
      toast.error('Invalid or expired OTP');
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-500 rounded-2xl shadow-lg mb-4">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">VendorBridge</h1>
          <p className="text-sm text-gray-500 mt-1">Procurement & Vendor Management</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              leftIcon={<Mail size={16} />}
              error={errors.email?.message}
              {...register('email')}
            />
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-medium text-primary-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                leftIcon={<Lock size={16} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="pointer-events-auto text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />
            </div>
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full mt-2"
              size="lg"
            >
              Sign in
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary-600 font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={showForgotModal}
        onClose={() => {
          setShowForgotModal(false);
          setForgotStep('request');
          setResetEmail('');
          setVerifiedOtp('');
          resetOtpForm({ otp: '' });
          resetPasswordForm({ password: '' });
        }}
        title={
          forgotStep === 'request'
            ? 'Reset Password'
            : forgotStep === 'verify'
              ? 'Verify OTP'
              : 'Set New Password'
        }
        size="sm"
      >
        {forgotStep === 'request' ? (
          <form onSubmit={handleForgotSubmit(onForgotSubmit)} className="space-y-4">
            <p className="text-sm text-gray-600">Enter your registered email address and we'll send you a one-time password.</p>
            <Input
              label="Email Address"
              placeholder="you@example.com"
              error={forgotErrors.email?.message}
              {...regForgot('email')}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowForgotModal(false)}>Cancel</Button>
              <Button type="submit" isLoading={isForgotLoading}>Send OTP</Button>
            </div>
          </form>
        ) : forgotStep === 'verify' ? (
          <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="space-y-4">
            <p className="text-sm text-gray-600">Enter the OTP sent to {resetEmail}.</p>
            <Input
              label="OTP"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              error={otpErrors.otp?.message}
              {...regOtp('otp')}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setForgotStep('request');
                  setResetEmail('');
                  setVerifiedOtp('');
                  resetOtpForm({ otp: '' });
                }}
              >
                Back
              </Button>
              <Button type="submit" isLoading={isForgotLoading}>Verify OTP</Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-4">
            <p className="text-sm text-gray-600">OTP verified. Choose a new password for {resetEmail}.</p>
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              error={resetErrors.password?.message}
              {...regReset('password')}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setForgotStep('verify')}>Back</Button>
              <Button type="submit" isLoading={isForgotLoading}>Reset Password</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Login;
