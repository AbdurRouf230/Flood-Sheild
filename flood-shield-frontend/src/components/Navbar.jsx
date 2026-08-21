import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Shield, Globe, LogOut, User, Sun, Moon, Zap, ZapOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { currentUser, mongoUser, logout, language, toggleLanguage } = useAuth();
  const { theme, toggleTheme, lowBandwidth, toggleLowBandwidth } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const translations = {
    en: {
      appName: 'Flood Shield',
      logoSub: 'Unified Intel',
      logout: 'Logout',
      langLabel: 'বাংলা',
      rolePrefix: 'Role',
      themeDark: 'Dark Mode',
      themeLight: 'Light Mode',
      bandwidthLow: 'Low Bandwidth Active',
      bandwidthFull: 'Full Data Mode',
      exitSession: 'Exit Session',
      roles: {
        Government: 'Govt Official',
        NGO: 'NGO Worker',
        Volunteer: 'Volunteer',
        Citizen: 'Citizen',
        GovRepresentative: 'Gov Representative',
        NGORepresentative: 'NGO Representative',
        GovRepLogistics: 'Gov Logistics Rep',
        NGORepLogistics: 'NGO Logistics Rep'
      }
    },
    bn: {
      appName: 'ফ্লাড শিল্ড',
      logoSub: 'সমন্বিত তথ্য',
      logout: 'লগআউট',
      langLabel: 'English',
      rolePrefix: 'পদবি',
      themeDark: 'ডার্ক মোড',
      themeLight: 'লাইট মোড',
      bandwidthLow: 'ডাটা সাশ্রয়ী মোড সক্রিয়',
      bandwidthFull: 'ফুল ডাটা মোড',
      exitSession: 'সেশন বন্ধ করুন',
      roles: {
        Government: 'সরকারি কর্মকর্তা',
        NGO: 'এনজিও কর্মী',
        Volunteer: 'স্বেচ্ছাসেবক',
        Citizen: 'নাগরিক',
        GovRepresentative: 'সরকারি প্রতিনিধি',
        NGORepresentative: 'এনজিও প্রতিনিধি',
        GovRepLogistics: 'সরকারি লজিস্টিকস প্রতিনিধি',
        NGORepLogistics: 'এনজিও লজিস্টিকস প্রতিনিধি'
      }
    }
  };

  const t = translations[language];

  return (
    <nav className="sticky top-0 z-50 w-full px-4 md:px-8 py-3.5 glass-panel border-b border-slate-200 dark:border-white/5 transition-all duration-300 bg-white/80 dark:bg-slate-950/70 text-slate-800 dark:text-white">
      <div className="max-w-[1600px] mx-auto flex justify-between items-center gap-6 lg:gap-8">

        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer shrink-0 animate-fade-in" onClick={() => navigate('/')}>
          <div className="relative flex items-center justify-center p-2 rounded-xl bg-gradient-to-tr from-flood-blue-600 to-flood-cyan-400 text-white shadow-lg shadow-flood-blue-500/20">
            <Shield className="w-6 h-6 animate-pulse-glow" />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 font-heading leading-tight">
              {t.appName}
            </h1>
            <span className="text-[10px] tracking-wider uppercase text-flood-cyan-400 font-semibold leading-none">
              {t.logoSub}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        {currentUser && (
          <div className="hidden md:flex items-center gap-0.5 lg:gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/50 dark:border-white/5 mx-1 lg:mx-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden max-w-full shrink-0">
            <button
              onClick={() => navigate('/dashboard')}
              className={`px-2 py-1 rounded-lg text-[11px] xl:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${window.location.pathname === '/dashboard'
                  ? 'bg-white dark:bg-slate-800 text-flood-cyan-500 dark:text-flood-cyan-400 shadow-sm border border-slate-200 dark:border-white/5'
                  : 'text-slate-600 dark:text-slate-400 hover:text-flood-cyan-500 dark:hover:text-flood-cyan-400'
                }`}
            >
              {language === 'en' ? 'Dashboard' : 'ড্যাশবোর্ড'}
            </button>
            {mongoUser && ['Citizen', 'Volunteer'].includes(mongoUser.role) && (
              <button
                onClick={() => navigate('/sos')}
                className={`px-2 py-1 rounded-lg text-[11px] xl:text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap shrink-0 ${window.location.pathname === '/sos'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                  }`}
              >
                🚨 {language === 'en' ? 'SOS' : 'এসওএস'}
              </button>
            )}
            {mongoUser && ['Volunteer', 'NGO', 'Government', 'GovRepresentative', 'NGORepresentative', 'GovRepLogistics', 'NGORepLogistics'].includes(mongoUser.role) && (
              <button
                onClick={() => navigate('/rescue-panel')}
                className={`px-2 py-1 rounded-lg text-[11px] xl:text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap shrink-0 ${window.location.pathname === '/rescue-panel'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                  }`}
              >
                🛸 {language === 'en' ? 'Rescue Panel' : 'উদ্ধার প্যানেল'}
              </button>
            )}
            <button
              onClick={() => navigate('/flood-map')}
              className={`px-2 py-1 rounded-lg text-[11px] xl:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${window.location.pathname === '/flood-map'
                  ? 'bg-white dark:bg-slate-800 text-flood-cyan-500 dark:text-flood-cyan-400 shadow-sm border border-slate-200 dark:border-white/5'
                  : 'text-slate-600 dark:text-slate-400 hover:text-flood-cyan-500 dark:hover:text-flood-cyan-400'
                }`}
            >
              {language === 'en' ? 'GIS Map' : 'মানচিত্র'}
            </button>
            <button
              onClick={() => navigate('/incidents')}
              className={`px-2 py-1 rounded-lg text-[11px] xl:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${window.location.pathname === '/incidents'
                  ? 'bg-white dark:bg-slate-800 text-flood-cyan-500 dark:text-flood-cyan-400 shadow-sm border border-slate-200 dark:border-white/5'
                  : 'text-slate-600 dark:text-slate-400 hover:text-flood-cyan-500 dark:hover:text-flood-cyan-400'
                }`}
            >
              {language === 'en' ? 'Report' : 'রিপোর্ট'}
            </button>
            <button
              onClick={() => navigate('/assistant')}
              className={`px-2 py-1 rounded-lg text-[11px] xl:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${window.location.pathname === '/assistant'
                  ? 'bg-white dark:bg-slate-800 text-flood-cyan-500 dark:text-flood-cyan-400 shadow-sm border border-slate-200 dark:border-white/5'
                  : 'text-slate-600 dark:text-slate-400 hover:text-flood-cyan-500 dark:hover:text-flood-cyan-400'
                }`}
            >
              {language === 'en' ? 'AI Assistant' : 'এআই'}
            </button>
            {mongoUser && ['Government', 'GovRepresentative', 'GovRepLogistics'].includes(mongoUser.role) && (
              <button
                onClick={() => navigate('/shelter-hub')}
                className={`px-2 py-1 rounded-lg text-[11px] xl:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${window.location.pathname === '/shelter-hub'
                    ? 'bg-white dark:bg-slate-800 text-violet-500 dark:text-violet-400 shadow-sm border border-slate-200 dark:border-white/5'
                    : 'text-slate-600 dark:text-slate-400 hover:text-violet-500 dark:hover:text-violet-400'
                  }`}
              >
                {mongoUser.role === 'GovRepLogistics' ? (language === 'en' ? 'Logistics Hub' : 'লজিস্টিকস হাব') : (language === 'en' ? 'Shelter Hub' : 'আশ্রয়কেন্দ্র')}
              </button>
            )}
            {mongoUser && ['NGO', 'NGORepresentative', 'NGORepLogistics'].includes(mongoUser.role) && (
              <button
                onClick={() => navigate('/campaign-hub')}
                className={`px-2 py-1 rounded-lg text-[11px] xl:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${window.location.pathname === '/campaign-hub'
                    ? 'bg-white dark:bg-slate-800 text-emerald-500 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-white/5'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400'
                  }`}
              >
                {mongoUser.role === 'NGORepLogistics' ? (language === 'en' ? 'Logistics Hub' : 'লজিস্টিকস হাব') : (language === 'en' ? 'Campaign Hub' : 'ক্যাম্পেইন')}
              </button>
            )}
            {mongoUser && (mongoUser.role === 'Government' || mongoUser.role === 'NGO') && (
              <button
                onClick={() => navigate('/logistics')}
                className={`px-2 py-1 rounded-lg text-[11px] xl:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${window.location.pathname === '/logistics'
                    ? 'bg-white dark:bg-slate-800 text-flood-cyan-500 dark:text-flood-cyan-400 shadow-sm border border-slate-200 dark:border-white/5'
                    : 'text-slate-600 dark:text-slate-400 hover:text-flood-cyan-500 dark:hover:text-flood-cyan-400'
                  }`}
              >
                {language === 'en' ? 'Logistics' : 'লজিস্টিকস'}
              </button>
            )}
            {mongoUser && mongoUser.role === 'Government' && (
              <button
                onClick={() => navigate('/decision-support')}
                className={`px-2 py-1 rounded-lg text-[11px] xl:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${window.location.pathname === '/decision-support'
                    ? 'bg-white dark:bg-slate-800 text-flood-cyan-500 dark:text-flood-cyan-400 shadow-sm border border-slate-200 dark:border-white/5'
                    : 'text-slate-600 dark:text-slate-400 hover:text-flood-cyan-500 dark:hover:text-flood-cyan-400'
                  }`}
              >
                {language === 'en' ? 'Decision Center' : 'সিদ্ধান্ত কেন্দ্র'}
              </button>
            )}
            {mongoUser && mongoUser.role === 'Government' && (
              <button
                onClick={() => navigate('/platform-registry')}
                className={`px-2 py-1 rounded-lg text-[11px] xl:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${window.location.pathname === '/platform-registry'
                    ? 'bg-white dark:bg-slate-800 text-blue-500 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-white/5'
                    : 'text-slate-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400'
                  }`}
              >
                {language === 'en' ? "NGO's" : 'এনজিও'}
              </button>
            )}
            {mongoUser && mongoUser.role !== 'GovRepresentative' && mongoUser.role !== 'NGORepresentative' && mongoUser.role !== 'GovRepLogistics' && mongoUser.role !== 'NGORepLogistics' && (
              <button
                onClick={() => navigate('/volunteers')}
                className={`px-2 py-1 rounded-lg text-[11px] xl:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${window.location.pathname === '/volunteers'
                    ? 'bg-white dark:bg-slate-800 text-flood-cyan-500 dark:text-flood-cyan-400 shadow-sm border border-slate-200 dark:border-white/5'
                    : 'text-slate-600 dark:text-slate-400 hover:text-flood-cyan-500 dark:hover:text-flood-cyan-400'
                  }`}
              >
                {language === 'en' ? 'Volunteers' : 'স্বেচ্ছাসেবক'}
              </button>
            )}
            <button
              onClick={() => navigate('/donate')}
              className={`px-2 py-1 rounded-lg text-[11px] xl:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${window.location.pathname === '/donate'
                  ? 'bg-white dark:bg-slate-800 text-rose-500 shadow-sm border border-slate-200 dark:border-white/5'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-400'
                }`}
            >
              {language === 'en' ? '❤ Donate' : '❤ দান করুন'}
            </button>
            {mongoUser && ['Government', 'NGO', 'Volunteer', 'GovRepresentative', 'NGORepresentative', 'GovRepLogistics', 'NGORepLogistics'].includes(mongoUser.role) && (
              <button
                onClick={() => navigate('/transport')}
                className={`px-2 py-1 rounded-lg text-[11px] xl:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${window.location.pathname === '/transport'
                    ? 'bg-white dark:bg-slate-800 text-flood-cyan-500 dark:text-flood-cyan-400 shadow-sm border border-slate-200 dark:border-white/5'
                    : 'text-slate-600 dark:text-slate-400 hover:text-flood-cyan-500 dark:hover:text-flood-cyan-400'
                  }`}
              >
                {language === 'en' ? 'Transport' : 'পরিবহন'}
              </button>
            )}
          </div>
        )}


        {/* Action Controls & User Display */}
        <div className="flex items-center gap-3.5 shrink-0">
          {/* Low Bandwidth Mode Toggle */}
          <button
            onClick={toggleLowBandwidth}
            title={lowBandwidth ? t.bandwidthLow : t.bandwidthFull}
            className={`p-2 rounded-lg border transition-all cursor-pointer ${lowBandwidth
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                : 'border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-flood-cyan-400 hover:bg-slate-800/20'
              }`}
          >
            {lowBandwidth ? <ZapOff className="w-4.5 h-4.5 animate-pulse" /> : <Zap className="w-4.5 h-4.5" />}
          </button>

          {/* Light/Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? t.themeLight : t.themeDark}
            className="p-2 rounded-lg border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-flood-cyan-400 hover:bg-slate-800/20 transition-all cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-flood-cyan-400/50 hover:bg-flood-cyan-400/10 hover:text-flood-cyan-500 dark:hover:text-white transition-all cursor-pointer"
            aria-label="Toggle language"
          >
            <Globe className="w-4 h-4 text-flood-cyan-400" />
            <span>{t.langLabel}</span>
          </button>

          {/* User Display */}
          {mongoUser ? (
            <div className="flex items-center gap-3.5 pl-4 border-l border-slate-200 dark:border-white/10">
              <div className="hidden md:block text-right">
                <div className="text-sm font-semibold text-slate-800 dark:text-white">{mongoUser.name}</div>
                <div className="text-xs text-flood-cyan-400">
                  {t.rolePrefix}: {t.roles[mongoUser.role] || mongoUser.role}
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-slate-800 border border-flood-cyan-400/30 flex items-center justify-center text-flood-cyan-400 shadow-inner">
                <User className="w-4 h-4" />
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                title={t.logout}
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          ) : (
            // Safeguard: If mongoUser is null but Firebase is authenticated, render exit action
            currentUser && (
              <div className="flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-white/10">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer animate-pulse"
                  title={t.exitSession}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.exitSession}</span>
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </nav>

  );
}
