import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ShieldAlert,
  Mail,
  Lock,
  User,
  MapPin,
  Building,
  Heart,
  Users,
  UserCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Eye,
  EyeOff,
  BadgeCheck,
  KeyRound,
  Zap
} from 'lucide-react';

export default function AuthPage() {
  const {
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    demoLogin,
    resetPassword,
    language
  } = useAuth();

  const navigate = useNavigate();

  // View state: 'login' | 'register' | 'forgot'
  const [mode, setMode] = useState('login');

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('Sylhet');
  const [role, setRole] = useState('Citizen');
  const [representativeId, setRepresentativeId] = useState('');

  // UI states
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const districtsOfBangladesh = [
    'Sylhet', 'Sunamganj', 'Kurigram', 'Jamalpur', 'Gaibandha',
    'Bogura', 'Sirajganj', 'Tangail', 'Netrokona', 'Lalmonirhat',
    'Nilphamari', 'Rangpur', 'Dinajpur', 'Feni', 'Noakhali',
    'Chittagong', 'Cox\'s Bazar', 'Dhaka', 'Barisal', 'Khulna',
    'Rajshahi', 'Mymensingh'
  ];

  const translations = {
    en: {
      heroTitle: 'Flood Shield Intelligence',
      heroSubtitle: 'Coordinating disaster mitigation, real-time analytics, and relief logistics with advanced GIS predictions.',
      bannerAlert: 'FFWC Alert: Water levels in Surma and Kushiyara rivers are currently flowing above danger levels. Stay informed.',
      loginTab: 'Sign In',
      registerTab: 'Register Account',
      forgotTab: 'Reset Password',
      emailLabel: 'Email Address',
      passLabel: 'Password',
      confirmPassLabel: 'Confirm Password',
      nameLabel: 'Full Name',
      districtLabel: 'District / Region',
      roleLabel: 'Select Your Role',
      forgotLink: 'Forgot password?',
      loginBtn: 'Sign In to Dashboard',
      registerBtn: 'Create Account',
      forgotBtn: 'Send Reset Email',
      googleBtn: 'Sign In with Google',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      backToLogin: 'Back to Sign In',
      roleGov: 'Government',
      roleGovDesc: 'Disaster management bureau, analytics & logistics commands.',
      roleNgo: 'NGO Partner',
      roleNgoDesc: 'Relief deployment, supply chains, and volunteer management.',
      roleVol: 'Volunteer',
      roleVolDesc: 'Crowdsourced rescue, local shelter sync, and field reports.',
      roleCit: 'Citizen',
      roleCitDesc: 'Interactive maps, SOS reporting, alerts, and shelter lookup.',
      roleRep: 'Gov Representative',
      roleRepDesc: 'Shelter-linked field officer — register with an ID issued by Government admin.',
      repIdLabel: 'Representative ID',
      repIdPlaceholder: 'e.g. GR-SYL-A1B2C3',
      repIdHint: 'Your ID is created when a Government admin adds you in the Decision Center Shelter Registry.',
      govBlockedNote: 'Government admin accounts are pre-provisioned and cannot be self-registered.',
      errRepIdRequired: 'Representative ID is required for this role.',
      errPasswordMismatch: 'Passwords do not match.',
      errRoleRequired: 'Please select a valid onboarding role.',
      successReset: 'Password reset instructions sent to your email.',
      submitting: 'Processing...'
    },
    bn: {
      heroTitle: 'ফ্লাড শিল্ড ইন্টেলিজেন্স',
      heroSubtitle: 'অ্যাডভান্সড জিআইএস পূর্বাভাসের মাধ্যমে দুর্যোগ প্রশমন, রিয়েল-টাইম বিশ্লেষণ এবং ত্রাণ সরবরাহের সমন্বয় সাধন।',
      bannerAlert: 'এফএফডব্লিউসি সতর্কবার্তা: সুরমা ও কুশিয়ারা নদীর পানি বিপদসীমার উপর দিয়ে প্রবাহিত হচ্ছে। সতর্ক থাকুন।',
      loginTab: 'লগইন করুন',
      registerTab: 'নিবন্ধন করুন',
      forgotTab: 'পাসওয়ার্ড পুনরুদ্ধার',
      emailLabel: 'ইমেইল এড্রেস',
      passLabel: 'পাসওয়ার্ড',
      confirmPassLabel: 'পাসওয়ার্ড নিশ্চিত করুন',
      nameLabel: 'সম্পূর্ণ নাম',
      districtLabel: 'জেলা / অঞ্চল',
      roleLabel: 'আপনার ভূমিকা নির্বাচন করুন',
      forgotLink: 'পাসওয়ার্ড ভুলে গেছেন?',
      loginBtn: 'ড্যাশবোর্ডে প্রবেশ করুন',
      registerBtn: 'অ্যাকাউন্ট তৈরি করুন',
      forgotBtn: 'রিসেট লিংক পাঠান',
      googleBtn: 'গুগল দিয়ে লগইন করুন',
      noAccount: 'কোনো অ্যাকাউন্ট নেই?',
      haveAccount: 'ইতিমধ্যে অ্যাকাউন্ট আছে?',
      backToLogin: 'লগইনে ফিরে যান',
      roleGov: 'সরকারি প্রশাসন',
      roleGovDesc: 'দুর্যোগ ব্যবস্থাপনা ব্যুরো, সিদ্ধান্ত গ্রহণ ও প্রশাসনিক কাজ।',
      roleNgo: 'এনজিও অংশীদার',
      roleNgoDesc: 'ত্রাণ বিতরণ, সরবরাহ চেইন এবং স্বেচ্ছাসেবক পরিচালনা।',
      roleVol: 'স্বেচ্ছাসেবক',
      roleVolDesc: 'উদ্ধার কাজ, আশ্রয়কেন্দ্র ব্যবস্থাপনা এবং মাঠ পর্যায়ের রিপোর্ট।',
      roleCit: 'সাধারণ নাগরিক',
      roleCitDesc: 'ইন্টারেক্টিভ ম্যাপ, এসওএস রিপোর্টিং এবং আশ্রয়কেন্দ্রের সন্ধান।',
      roleRep: 'সরকারি প্রতিনিধি',
      roleRepDesc: 'আশ্রয়কেন্দ্র-সংযুক্ত কর্মী — সরকারি অ্যাডমিনের দেওয়া আইডি দিয়ে নিবন্ধন করুন।',
      repIdLabel: 'প্রতিনিধি আইডি',
      repIdPlaceholder: 'যেমন GR-SYL-A1B2C3',
      repIdHint: 'সিদ্ধান্ত কেন্দ্রের আশ্রয়কেন্দ্র রেজিস্ট্রি থেকে সরকারি অ্যাডমিন আপনাকে এই আইডি দেবেন।',
      govBlockedNote: 'সরকারি অ্যাডমিন অ্যাকাউন্ট আগে থেকেই তৈরি — নিজে নিবন্ধন করা যাবে না।',
      errRepIdRequired: 'এই ভূমিকার জন্য প্রতিনিধি আইডি আবশ্যক।',
      errPasswordMismatch: 'পাসওয়ার্ড দুটি মিলছে না।',
      errRoleRequired: 'অনুগ্রহ করে আপনার সঠিক ভূমিকা নির্বাচন করুন।',
      successReset: 'পাসওয়ার্ড রিসেট করার নির্দেশাবলী আপনার ইমেইলে পাঠানো হয়েছে।',
      submitting: 'প্রক্রিয়াধীন...'
    }
  };

  const t = translations[language];

  // Form handlers
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (mode === 'login') {
      if (!email || !password) return;
      setLoading(true);
      try {
        await loginWithEmail(email, password);
        toast.success(language === 'en' ? '👋 Welcome back! Signed in successfully.' : '👋 স্বাগতম! লগইন সফল হয়েছে।');
        navigate('/dashboard');
      } catch (err) {
        toast.error(`❌ ${err.message || 'Failed to sign in. Please verify credentials.'}`);
        setError(err.message || 'Failed to sign in. Please verify credentials.');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'register') {
      if (!email || !password || !name || !district) return;
      if (password !== confirmPassword) {
        return setError(t.errPasswordMismatch);
      }
      if ((role === 'GovRepresentative' || role === 'NGORepresentative') && !representativeId.trim()) {
        return setError(role === 'NGORepresentative' ? 'NGO Invite Token is required for this role.' : t.errRepIdRequired);
      }
      setLoading(true);
      try {
        await registerWithEmail(email, password, name, role, district, representativeId.trim());
        toast.success(
          language === 'en'
            ? '🎉 Account created successfully! Redirecting to Dashboard...'
            : '🎉 অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...'
        );
        setMessage(language === 'en' ? '✅ Account created successfully! Redirecting to Dashboard...' : '✅ অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! ড্যাশবোর্ডে পুনঃনির্দেশিত করা হচ্ছে...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      } catch (err) {
        toast.error(`❌ ${err.message || 'Registration failed. Try a different email or verify token.'}`);
        setError(err.message || 'Registration failed. Try a different email or verify token.');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'forgot') {
      if (!email) return;
      setLoading(true);
      try {
        await resetPassword(email);
        setMessage(t.successReset);
      } catch (err) {
        setError(err.message || 'Failed to send reset email.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await loginWithGoogle(role);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (targetRole, email = null) => {
    setError('');
    setMessage('');
    try {
      await demoLogin(targetRole, email);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    }
  };

  const rolesConfig = [
    { key: 'NGO', title: t.roleNgo, desc: t.roleNgoDesc, icon: Heart, color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:border-emerald-400' },
    { key: 'Volunteer', title: t.roleVol, desc: t.roleVolDesc, icon: UserCheck, color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5 hover:border-cyan-400' },
    { key: 'Citizen', title: t.roleCit, desc: t.roleCitDesc, icon: Users, color: 'border-sky-500/30 text-sky-400 bg-sky-500/5 hover:border-sky-400' },
    { key: 'GovRepresentative', title: t.roleRep, desc: t.roleRepDesc, icon: BadgeCheck, color: 'border-violet-500/30 text-violet-400 bg-violet-500/5 hover:border-violet-400' },
    { key: 'NGORepresentative', title: 'NGO Representative', desc: 'Campaign-linked field officer — register with an invite token issued by an NGO.', icon: KeyRound, color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:border-emerald-400' },
  ];

  return (
    <div className="w-full min-h-screen flex flex-col items-center bg-gradient-radial from-slate-900 via-flood-dark-950 to-flood-dark-950 px-4 md:px-6 relative overflow-hidden">

      {/* Background visual graphics */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-flood-blue-700/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[50%] bg-flood-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* 2. Flood Awareness Banner */}
      <div className="w-full max-w-7xl mt-4 px-4 py-3 bg-red-950/30 border border-red-500/20 rounded-xl flex items-center gap-3 animate-pulse-glow">
        <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
        <div className="overflow-hidden relative w-full text-left">
          <p className="text-xs md:text-sm text-red-200 font-medium whitespace-nowrap animate-[marquee_25s_linear_infinite]">
            {t.bannerAlert}
          </p>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center lg:items-stretch justify-between gap-12 py-12 md:py-16 z-10">

        {/* 1. Hero Section */}
        <div className="flex flex-col justify-center items-start lg:w-1/2 text-left animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-flood-blue-600/10 border border-flood-blue-500/20 text-flood-cyan-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-flood-cyan-400 animate-ping"></span>
            System Live Platform
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 font-heading leading-tight leading-none bg-gradient-to-r from-white via-slate-100 to-flood-cyan-400 bg-clip-text text-transparent">
            {t.heroTitle}
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed max-w-lg mb-8">
            {t.heroSubtitle}
          </p>

          {/* Quick Demo Test Users Section */}
          <div className="w-full max-w-lg bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-5 mb-6 space-y-4 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-flood-cyan-400 tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-400 animate-pulse" /> 1-CLICK TEST USER LOGIN & FIELD REPS
              </h3>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-semibold">Pre-seeded & Assigned</span>
            </div>

            {/* Core Roles */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Core & Administrative Roles</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('Government')}
                  className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-left transition font-medium flex items-center gap-2 shadow-sm"
                >
                  <span>🏛️</span> <span>Government (Admin)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('NGO')}
                  className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-left transition font-medium flex items-center gap-2 shadow-sm"
                >
                  <span>🟣</span> <span>NGO Admin (BRAC)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('Volunteer')}
                  className="p-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-300 text-left transition font-medium flex items-center gap-2 shadow-sm"
                >
                  <span>🟢</span> <span>Volunteer ([GOV] Fatema)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('Volunteer2')}
                  className="p-2 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-xl text-teal-300 text-left transition font-medium flex items-center gap-2 shadow-sm"
                >
                  <span>🟢</span> <span>Volunteer ([BRAC] Mitu)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('Citizen')}
                  className="p-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-xl text-sky-300 text-left transition font-medium flex items-center gap-2 shadow-sm"
                >
                  <span>🔵</span> <span>Citizen (Rahim)</span>
                </button>
              </div>
            </div>

            {/* GOV Shelters & Logistics */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-semibold text-violet-400 uppercase tracking-wider">GOV Assigned Representatives (3 Shelters & 3 Depots)</div>
              <div className="grid grid-cols-1 gap-1.5 text-xs">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('GovRep_Sylhet', 'govrep.test@floodshield.bd')}
                    className="p-2 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 rounded-xl text-violet-200 text-left transition font-medium flex flex-col justify-center"
                    title="Assigned to Sylhet Govt College Shelter"
                  >
                    <div className="font-bold text-[11px] text-violet-300 flex items-center gap-1"><span>🟪</span> Sylhet Shelter Rep</div>
                    <div className="text-[10px] text-slate-400 truncate">Tariq (Sylhet Govt College)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('GovLog_Sylhet', 'govrep.logistics@floodshield.bd')}
                    className="p-2 bg-fuchsia-500/15 hover:bg-fuchsia-500/25 border border-fuchsia-500/30 rounded-xl text-fuchsia-200 text-left transition font-medium flex flex-col justify-center"
                    title="Assigned to [GOV] Sylhet Divisional Depot"
                  >
                    <div className="font-bold text-[11px] text-fuchsia-300 flex items-center gap-1"><span>🏢</span> Sylhet Depot Rep</div>
                    <div className="text-[10px] text-slate-400 truncate">Karim (Sylhet Divisional Depot)</div>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('GovRep_Sunamganj', 'govrep.sunamganj@floodshield.bd')}
                    className="p-2 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 rounded-xl text-violet-200 text-left transition font-medium flex flex-col justify-center"
                    title="Assigned to Sunamganj Govt High School Shelter"
                  >
                    <div className="font-bold text-[11px] text-violet-300 flex items-center gap-1"><span>🟪</span> Sunamganj Shelter Rep</div>
                    <div className="text-[10px] text-slate-400 truncate">Hasan (Sunamganj High School)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('GovLog_Sunamganj', 'govlog.sunamganj@floodshield.bd')}
                    className="p-2 bg-fuchsia-500/15 hover:bg-fuchsia-500/25 border border-fuchsia-500/30 rounded-xl text-fuchsia-200 text-left transition font-medium flex flex-col justify-center"
                    title="Assigned to [GOV] Sunamganj Disaster Depot"
                  >
                    <div className="font-bold text-[11px] text-fuchsia-300 flex items-center gap-1"><span>🏢</span> Sunamganj Depot Rep</div>
                    <div className="text-[10px] text-slate-400 truncate">Jamal (Sunamganj Disaster Depot)</div>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('GovRep_Moulvibazar', 'govrep.moulvibazar@floodshield.bd')}
                    className="p-2 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 rounded-xl text-violet-200 text-left transition font-medium flex flex-col justify-center"
                    title="Assigned to Moulvibazar Stadium Shelter"
                  >
                    <div className="font-bold text-[11px] text-violet-300 flex items-center gap-1"><span>🟪</span> Moulvibazar Shelter Rep</div>
                    <div className="text-[10px] text-slate-400 truncate">Rahman (Moulvibazar Stadium)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('GovLog_Moulvibazar', 'govlog.moulvibazar@floodshield.bd')}
                    className="p-2 bg-fuchsia-500/15 hover:bg-fuchsia-500/25 border border-fuchsia-500/30 rounded-xl text-fuchsia-200 text-left transition font-medium flex flex-col justify-center"
                    title="Assigned to [GOV] Moulvibazar Emergency Hub"
                  >
                    <div className="font-bold text-[11px] text-fuchsia-300 flex items-center gap-1"><span>🏢</span> Moulvibazar Depot Rep</div>
                    <div className="text-[10px] text-slate-400 truncate">Kamal (Moulvibazar Emergency Hub)</div>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('VolunteerGOV', 'volunteer.gov.test@floodshield.bd')}
                  className="p-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 rounded-xl text-cyan-200 text-left transition font-medium flex flex-col justify-center"
                  title="Government DMRO volunteer — Sylhet"
                >
                  <div className="font-bold text-[11px] text-cyan-300 flex items-center gap-1"><span>🟢</span> GOV Volunteer</div>
                  <div className="text-[10px] text-slate-400 truncate">[GOV] Fatema (Sylhet DMRO)</div>
                </button>
              </div>
            </div>

            {/* NGO Reps */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">NGO Assigned Representatives</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('NGORepresentative')}
                  className="p-2 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-xl text-teal-300 text-left transition font-medium flex flex-col justify-center shadow-sm"
                >
                  <div className="font-bold text-[11px] flex items-center gap-1"><span>🌿</span> NGO Campaign Rep</div>
                  <div className="text-[10px] text-slate-400 truncate">Kazi (Sylhet Haor Relief Camp)</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('NGORepLogistics')}
                  className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-300 text-left transition font-medium flex flex-col justify-center shadow-sm"
                >
                  <div className="font-bold text-[11px] flex items-center gap-1"><span>📦</span> NGO Logistics Rep</div>
                  <div className="text-[10px] text-slate-400 truncate">Zahid (Sylhet Relief Hub)</div>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            <div className="p-4 rounded-xl glass-panel-light">
              <div className="text-2xl font-bold text-flood-cyan-400">99.8%</div>
              <div className="text-xs text-slate-400">Prediction Accuracy</div>
            </div>
            <div className="p-4 rounded-xl glass-panel-light">
              <div className="text-2xl font-bold text-white">2.4M</div>
              <div className="text-xs text-slate-400">Citizens Monitored</div>
            </div>
          </div>
        </div>

        {/* 3. Login / Register Card */}
        <div className="w-full lg:w-[480px] flex flex-col justify-center animate-slide-up [animation-delay:150ms]">
          <div className="w-full glass-panel rounded-3xl p-6 md:p-8 shadow-2xl relative border border-white/10">

            {/* Form Toggle Header */}
            {mode !== 'forgot' && (
              <div className="flex bg-slate-950/60 p-1 rounded-xl mb-6 border border-white/5">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setMessage(''); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === 'login'
                      ? 'bg-gradient-to-r from-flood-blue-600 to-flood-cyan-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                    }`}
                >
                  {t.loginTab}
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); setMessage(''); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === 'register'
                      ? 'bg-gradient-to-r from-flood-blue-600 to-flood-cyan-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                    }`}
                >
                  {t.registerTab}
                </button>
              </div>
            )}

            {mode === 'forgot' && (
              <h2 className="text-xl font-bold text-white text-left mb-6 font-heading">
                {t.forgotTab}
              </h2>
            )}

            {/* Notifications */}
            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-left">{error}</span>
              </div>
            )}

            {message && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-left">{message}</span>
              </div>
            )}

            {/* Email form submit */}
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">

              {/* Representative / Invite Token Field (Top Position) */}
              {mode === 'register' && (role === 'GovRepresentative' || role === 'NGORepresentative') && (
                <div className="flex flex-col text-left p-3.5 bg-cyan-500/5 border border-cyan-500/30 rounded-2xl animate-fade-in">
                  <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                    {role === 'NGORepresentative' ? 'NGO Invite Token' : t.repIdLabel}
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                    <input
                      type="text"
                      required
                      placeholder={role === 'NGORepresentative' ? 'e.g. NR-SUN-621064' : t.repIdPlaceholder}
                      value={representativeId}
                      onChange={(e) => setRepresentativeId(e.target.value.toUpperCase())}
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/80 focus:bg-slate-950 border border-cyan-500/40 focus:border-cyan-400 rounded-xl text-white text-sm font-semibold outline-none transition-all placeholder:text-slate-600 uppercase tracking-wider shadow-inner"
                    />
                  </div>
                  <p className="text-[11px] text-cyan-300/80 mt-1.5 font-medium">
                    {role === 'NGORepresentative'
                      ? 'Enter the invite token issued by your NGO partner from the Campaign Hub.'
                      : t.repIdHint}
                  </p>
                </div>
              )}

              {/* Name (Register Mode) */}
              {mode === 'register' && (
                <div className="flex flex-col text-left">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    {t.nameLabel}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/60 hover:bg-slate-950/80 focus:bg-slate-950 border border-white/10 focus:border-flood-cyan-400/80 rounded-xl text-white text-sm outline-none transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>
              )}

              {/* District & Region (Register Mode) */}
              {mode === 'register' && (
                <div className="flex flex-col text-left">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    {t.districtLabel}
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/60 hover:bg-slate-950/80 focus:bg-slate-950 border border-white/10 focus:border-flood-cyan-400/80 rounded-xl text-white text-sm outline-none transition-all cursor-pointer"
                    >
                      {districtsOfBangladesh.map((dist) => (
                        <option key={dist} value={dist} className="bg-slate-900 text-white">
                          {dist}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div className="flex flex-col text-left">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {t.emailLabel}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="name@organization.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/60 hover:bg-slate-950/80 focus:bg-slate-950 border border-white/10 focus:border-flood-cyan-400/80 rounded-xl text-white text-sm outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Password */}
              {mode !== 'forgot' && (
                <div className="flex flex-col text-left">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      {t.passLabel}
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}
                        className="text-xs text-flood-cyan-400 hover:text-white transition-colors"
                      >
                        {t.forgotLink}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3 bg-slate-950/60 hover:bg-slate-950/80 focus:bg-slate-950 border border-white/10 focus:border-flood-cyan-400/80 rounded-xl text-white text-sm outline-none transition-all placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-flood-cyan-400 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password (Register Mode) */}
              {mode === 'register' && (
                <div className="flex flex-col text-left">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    {t.confirmPassLabel}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3 bg-slate-950/60 hover:bg-slate-950/80 focus:bg-slate-950 border border-white/10 focus:border-flood-cyan-400/80 rounded-xl text-white text-sm outline-none transition-all placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-flood-cyan-400 transition-colors"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* 6. Role Selector (Only shown in register mode or before Google login) */}
              {mode === 'register' && (
                <div className="flex flex-col text-left mt-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                    {t.roleLabel}
                  </label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {rolesConfig.map((item) => {
                      const Icon = item.icon;
                      const isSelected = role === item.key;
                      return (
                        <div
                          key={item.key}
                          onClick={() => setRole(item.key)}
                          className={`flex items-start gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 ${isSelected
                              ? 'border-flood-cyan-400 bg-flood-cyan-400/10 shadow-lg shadow-flood-cyan-500/5'
                              : 'border-white/5 bg-slate-950/20 hover:bg-slate-950/40 hover:border-white/10'
                            }`}
                        >
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-flood-cyan-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">{item.title}</div>
                            <div className="text-[11px] text-slate-400 leading-tight mt-0.5">{item.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 flex items-start gap-1.5">
                    <Building className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
                    {t.govBlockedNote}
                  </p>
                </div>
              )}



              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 bg-gradient-to-r from-flood-blue-600 to-flood-cyan-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-flood-blue-500/25 hover:shadow-flood-cyan-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{loading ? t.submitting : (mode === 'login' ? t.loginBtn : mode === 'register' ? t.registerBtn : t.forgotBtn)}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* 4. Google Sign-In Button */}
            {mode !== 'forgot' && (
              <div className="flex flex-col gap-4 mt-6">
                <div className="flex items-center gap-3">
                  <div className="h-[1px] flex-1 bg-white/10"></div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Or Connect</span>
                  <div className="h-[1px] flex-1 bg-white/10"></div>
                </div>

                {/* Pre-Google Role Hint in login mode */}
                {mode === 'login' && (
                  <div className="flex items-center gap-2 justify-center p-2 rounded-lg bg-slate-950/30 border border-white/5">
                    <span className="text-xs text-slate-400">Onboard role:</span>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="bg-transparent text-flood-cyan-400 font-semibold text-xs outline-none cursor-pointer border-b border-flood-cyan-400/30 pb-0.5 hover:border-flood-cyan-400"
                    >
                      <option value="Citizen" className="bg-slate-900 text-white">Citizen</option>
                      <option value="Volunteer" className="bg-slate-900 text-white">Volunteer</option>
                      <option value="NGO" className="bg-slate-900 text-white">NGO</option>
                    </select>
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" title="Select your role before signing in with Google. Existing users retain their roles." />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{t.googleBtn}</span>
                </button>
              </div>
            )}

            {/* Toggle Form Modes */}
            <div className="mt-6 text-center text-sm">
              {mode === 'login' && (
                <p className="text-slate-400">
                  {t.noAccount}{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setError(''); setMessage(''); }}
                    className="text-flood-cyan-400 font-bold hover:underline"
                  >
                    {t.registerTab}
                  </button>
                </p>
              )}
              {mode === 'register' && (
                <p className="text-slate-400">
                  {t.haveAccount}{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); setMessage(''); }}
                    className="text-flood-cyan-400 font-bold hover:underline"
                  >
                    {t.loginTab}
                  </button>
                </p>
              )}
              {mode === 'forgot' && (
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setMessage(''); }}
                  className="text-flood-cyan-400 font-bold hover:underline flex items-center gap-1 mx-auto"
                >
                  {t.backToLogin}
                </button>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Marquee animation rule */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
