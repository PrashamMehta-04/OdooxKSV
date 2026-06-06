import React, { useState } from 'react';
import { User as UserIcon, Mail, Shield, Lock, Building2, Phone, Edit2, Check, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

const resetSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit OTP'),
});

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
});

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [verifiedOtp, setVerifiedOtp] = useState('');
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const { register: regOtp, handleSubmit: handleOtpSubmit, reset: resetOtpForm, formState: { errors: otpErrors } } = useForm<{otp: string}>({ resolver: zodResolver(otpSchema) });
  const { register: regReset, handleSubmit: handleResetSubmit, reset: resetPasswordForm, formState: { errors: resetErrors } } = useForm<{password: string}>({ resolver: zodResolver(resetSchema) });
  
  const { register: regProfile, handleSubmit: handleProfileSubmit, formState: { errors: profileErrors }, reset: resetProfileForm } = useForm<{name: string, phone: string}>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
    }
  });

  if (!user) return null;

  const onProfileSubmit = async (data: { name: string, phone: string }) => {
    setIsLoading(true);
    try {
      const res = await api.put('/auth/update', data);
      if (res.data.success) {
        updateUser(res.data.data);
        toast.success('Profile updated successfully');
        setIsEditingProfile(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const startPasswordReset = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: user.email });
      setResetStep('verify');
      setShowResetModal(true);
      toast.success('OTP sent to your email.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpSubmit = async (data: { otp: string }) => {
    setIsLoading(true);
    try {
      await api.post('/auth/verify-otp', { email: user.email, otp: data.otp });
      setVerifiedOtp(data.otp);
      setResetStep('reset');
      toast.success('OTP verified');
    } catch {
      toast.error('Invalid or expired OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data: { password: string }) => {
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { email: user.email, otp: verifiedOtp, password: data.password });
      toast.success('Password updated successfully!');
      setShowResetModal(false);
      setResetStep('request');
      setVerifiedOtp('');
      resetOtpForm();
      resetPasswordForm();
    } catch {
      toast.error('Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account settings and information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Info Card */}
        <Card className="md:col-span-1 flex flex-col items-center text-center py-8">
          <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 mb-4 border-4 border-primary-50">
            <UserIcon size={48} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
          <p className="text-sm font-medium text-primary-600 bg-primary-50 px-3 py-1 rounded-full mt-2 capitalize">
            {user.role.replace('_', ' ')}
          </p>
          <div className="w-full border-t border-gray-100 mt-6 pt-6 px-4 space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Mail size={16} className="text-gray-400" />
              <span className="truncate">{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Phone size={16} className="text-gray-400" />
                <span>{user.phone}</span>
              </div>
            )}
            {user.vendorId && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Building2 size={16} className="text-gray-400" />
                <span>Vendor Account Linked</span>
              </div>
            )}
          </div>
        </Card>

        {/* Account Details Card */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Shield size={18} className="text-primary-500" />
                Account Information
              </h3>
              {!isEditingProfile ? (
                <button
                  onClick={() => {
                    resetProfileForm({ name: user.name, phone: user.phone || '' });
                    setIsEditingProfile(true);
                  }}
                  className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
                  title="Edit Profile"
                >
                  <Edit2 size={16} />
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleProfileSubmit(onProfileSubmit)}
                    className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                    title="Save Changes"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                    title="Cancel"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
            
            {isEditingProfile ? (
              <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  error={profileErrors.name?.message}
                  {...regProfile('name')}
                />
                <Input
                  label="Phone Number"
                  error={profileErrors.phone?.message}
                  {...regProfile('phone')}
                />
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</label>
                  <p className="text-sm text-gray-900 font-medium mt-1">{user.name}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone Number</label>
                  <p className="text-sm text-gray-900 font-medium mt-1">{user.phone || '—'}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</label>
                  <p className="text-sm text-gray-900 font-medium mt-1">{user.email}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Access Role</label>
                  <p className="text-sm text-gray-900 font-medium mt-1 capitalize">{user.role.replace('_', ' ')}</p>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Lock size={18} className="text-primary-500" />
              Security Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Password</p>
                  <p className="text-xs text-gray-500 mt-0.5">Secure your account with a strong password</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startPasswordReset}
                  isLoading={isLoading && resetStep === 'request'}
                >
                  Change Password
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Reset Password Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => {
          setShowResetModal(false);
          setResetStep('request');
          setVerifiedOtp('');
          resetOtpForm();
          resetPasswordForm();
        }}
        title={resetStep === 'verify' ? 'Verify OTP' : 'Set New Password'}
        size="sm"
      >
        {resetStep === 'verify' ? (
          <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="space-y-4">
            <p className="text-sm text-gray-600">Enter the 6-digit OTP sent to {user.email}.</p>
            <Input
              label="OTP"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              error={otpErrors.otp?.message}
              {...regOtp('otp')}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowResetModal(false)}>Cancel</Button>
              <Button type="submit" isLoading={isLoading}>Verify OTP</Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-4">
            <p className="text-sm text-gray-600">OTP verified. Choose a new password for your account.</p>
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              error={resetErrors.password?.message}
              {...regReset('password')}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setResetStep('verify')}>Back</Button>
              <Button type="submit" isLoading={isLoading}>Update Password</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Profile;
