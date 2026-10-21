import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Scale, User, Lock, Eye, EyeOff,
  ArrowRight, UserPlus, Users, CalendarCheck, BookOpen, ShieldCheck,
} from 'lucide-react';
import legalScales from '../assets/legal_scales.png';

interface AuthForm {
  username: string;
  password: string;
  email?: string;
}

const features = [
  { icon: <Users size={18} />,        title: 'Find Relevant Services',   desc: 'Get legal aid services based on your location and issue.' },
  { icon: <CalendarCheck size={18} />, title: 'Book Appointments',        desc: 'Check available slots and book with the authorities.' },
  { icon: <BookOpen size={18} />,      title: 'Guidance and Resources',   desc: 'Access useful information and resources.' },
  { icon: <ShieldCheck size={18} />,   title: 'Safe and Secure',          desc: 'Your information is protected and used only for this request.' },
];

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const { register: formReg, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AuthForm>();

  const onSubmit = async (data: AuthForm) => {
    try {
      if (mode === 'login') {
        const signedIn = await login(data.username, data.password);
        toast.success('Welcome back!');
        navigate(signedIn.role === 'admin' ? '/admin' : '/app/location');
      } else {
        await register(data.username, data.email || `${data.username}@example.com`, data.password);
        toast.success('Account created! Please log in.');
        setMode('login');
        reset();
      }
    } catch (e: any) {
      toast.error(e.message || 'Authentication failed');
    }
  };

  return (
    <div className="lp-root">

      {/* ══ LEFT PANEL ══ */}
      <div className="lp-left">
        {/* Blobs */}
        <div className="lp-blob lp-blob-center" />
        <div className="lp-blob lp-blob-topleft" />

        {/* Logo */}
        <div className="lp-logo">
          <Scale size={34} strokeWidth={1.8} className="lp-logo-icon" />
          <div>
            <p className="lp-logo-name">Legal Aid Navigator</p>
            <p className="lp-logo-tag">Find the right legal support, near you.</p>
          </div>
        </div>

        {/* Hero */}
        <div className="lp-hero">
          <h1 className="lp-hero-heading">
            Accessible Legal<br />Support for Everyone
          </h1>
          <p className="lp-hero-sub">
            Connect with the right legal aid services and authorities, get guidance,
            and book appointments easily — all in one place.
          </p>
        </div>

        {/* Features */}
        <ul className="lp-features">
          {features.map(f => (
            <li key={f.title} className="lp-feature">
              <span className="lp-feat-icon">{f.icon}</span>
              <div>
                <p className="lp-feat-title">{f.title}</p>
                <p className="lp-feat-desc">{f.desc}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Illustration — absolutely positioned right side */}
        <img
          src={legalScales}
          alt="Scales of justice"
          className="lp-illustration"
        />
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div className="lp-right">
        <div className="lp-card">
          {/* Header — no icon, just text */}
          <div className="lp-card-header">
            <h2 className="lp-card-title">Welcome to<br />Legal Aid Navigator</h2>
            <p className="lp-card-sub">Sign in to continue to your account</p>
          </div>

          {/* Tabs */}
          <div className="lp-tabs">
            <button type="button"
              className={`lp-tab ${mode === 'login' ? 'lp-tab-on' : 'lp-tab-off'}`}
              onClick={() => { setMode('login'); reset(); }}>
              Login
            </button>
            <button type="button"
              className={`lp-tab ${mode === 'register' ? 'lp-tab-on' : 'lp-tab-off'}`}
              onClick={() => { setMode('register'); reset(); }}>
              Create Account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="lp-form" noValidate>

            {/* Username */}
            <div className="lp-field">
              <label className="lp-label">Username <span className="lp-star">*</span></label>
              <div className="lp-iw">
                <User size={15} className="lp-iico" />
                <input type="text" placeholder="Enter your username"
                  className={`lp-inp ${errors.username ? 'lp-inp-err' : ''}`}
                  {...formReg('username', { required: 'Username is required' })} />
              </div>
              {errors.username && <p className="lp-errmsg">{errors.username.message}</p>}
            </div>

            {/* Email (register only) */}
            {mode === 'register' && (
              <div className="lp-field">
                <label className="lp-label">Email <span className="lp-star">*</span></label>
                <div className="lp-iw">
                  <User size={15} className="lp-iico" />
                  <input type="email" placeholder="Enter your email"
                    className={`lp-inp ${errors.email ? 'lp-inp-err' : ''}`}
                    {...formReg('email', { required: 'Email is required' })} />
                </div>
                {errors.email && <p className="lp-errmsg">{errors.email.message}</p>}
              </div>
            )}

            {/* Password */}
            <div className="lp-field">
              <label className="lp-label">Password <span className="lp-star">*</span></label>
              <div className="lp-iw">
                <Lock size={15} className="lp-iico" />
                <input type={showPassword ? 'text' : 'password'} placeholder="Enter your password"
                  className={`lp-inp lp-inp-pr ${errors.password ? 'lp-inp-err' : ''}`}
                  {...formReg('password', { required: 'Password is required' })} />
                <button type="button" className="lp-eye" tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="lp-errmsg">{errors.password.message}</p>}
            </div>

            {/* Forgot */}
            {mode === 'login' && (
              <div className="lp-forgot-row">
                <button type="button" className="lp-forgot">Forgot password?</button>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={isSubmitting} className="lp-submit">
              {isSubmitting ? <span className="lp-spinner" /> :
                mode === 'login'
                  ? <><span>Login</span><ArrowRight size={17} /></>
                  : <><span>Create Account</span><UserPlus size={17} /></>}
            </button>

            {/* OR */}
            <div className="lp-or">
              <span className="lp-or-line" />
              <span className="lp-or-text">OR</span>
              <span className="lp-or-line" />
            </div>

            {/* Alt */}
            <button type="button" className="lp-alt"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); reset(); }}>
              {mode === 'login'
                ? <><span>Create Account</span><UserPlus size={17} /></>
                : <><span>Back to Login</span><ArrowRight size={17} /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
