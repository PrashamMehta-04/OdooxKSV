import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Zap, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['procurement_officer', 'manager', 'vendor'], {
    required_error: 'Please select a role',
  }),
  vendorName: z.string().optional(),
}).refine((d) => d.role !== 'vendor' || (d.vendorName && d.vendorName.length > 0), {
  message: 'Vendor company name is required',
  path: ['vendorName'],
});

type FormData = z.infer<typeof schema>;

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const roleValue = watch('role');

  const onSubmit = async (data: FormData) => {
    try {
      await signup(data);
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      toast.error(message);
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
          <p className="text-sm text-gray-500 mt-1">Create your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Get started</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full name"
              type="text"
              placeholder="John Doe"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 6 characters"
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
            <Select
              label="Role"
              options={[
                { value: 'procurement_officer', label: 'Procurement Officer' },
                { value: 'manager', label: 'Manager' },
                { value: 'vendor', label: 'Vendor' },
              ]}
              placeholder="Select a role"
              error={errors.role?.message}
              {...register('role', {
                onChange: (e) => setSelectedRole(e.target.value),
              })}
            />
            {(roleValue === 'vendor' || selectedRole === 'vendor') && (
              <Input
                label="Company / Vendor Name"
                type="text"
                placeholder="Tech Supplies Pvt. Ltd."
                error={errors.vendorName?.message}
                {...register('vendorName')}
              />
            )}
            <Button
              type="submit"
              isLoading={isSubmitting}
              className="w-full mt-2"
              size="lg"
            >
              Create account
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
