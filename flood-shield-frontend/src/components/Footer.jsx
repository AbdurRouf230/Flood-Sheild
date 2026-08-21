import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, PhoneCall } from 'lucide-react';

export default function Footer() {
  const { language } = useAuth();

  const translations = {
    en: {
      tagline: 'Empowering communities with real-time flood intelligence, prediction models, and coordinated relief systems.',
      emergencyTitle: 'Emergency Help Desks',
      emergencyPhone: 'National Disaster Helpline: 1090',
      emergencyNational: 'Emergency Services: 999',
      emergencyFFWC: 'FFWC Info Desk: 01713-042211',
      quickLinks: 'Platform Modules',
      linkDashboard: 'Unified Intelligence',
      linkPrediction: 'Flood Map & Prediction',
      linkIncident: 'Crowdsourced Reporting',
      linkRelief: 'Logistics Optimization',
      copyright: '© 2026 Flood Shield. All rights reserved. Developed for Disaster Preparedness.'
    },
    bn: {
      tagline: 'রিয়েল-টাইম ফ্লাড ইন্টেলিজেন্স, পূর্বাভাস মডেল এবং সমন্বিত ত্রাণ ব্যবস্থার মাধ্যমে তথ্য ও প্রযুক্তি সহায়তায় জনজীবন সুরক্ষিত রাখা।',
      emergencyTitle: 'জরুরি হেল্প ডেস্ক',
      emergencyPhone: 'জাতীয় দুর্যোগ হেল্পলাইন: ১০৯০',
      emergencyNational: 'জরুরি সেবা: ৯৯৯',
      emergencyFFWC: 'এফএফডব্লিউসি তথ্য ডেস্ক: ০১৭১৩-০৪২২১১',
      quickLinks: 'প্ল্যাটফর্ম মডিউল',
      linkDashboard: 'সমন্বিত ড্যাশবোর্ড',
      linkPrediction: 'ইন্টারেক্টিভ ফ্লাড ম্যাপ',
      linkIncident: 'ক্রাউডসোর্সড রিপোর্টিং',
      linkRelief: 'ত্রাণ ও লজিস্টিকস',
      copyright: '© ২০২৬ ফ্লাড শিল্ড। সর্বস্বত্ব সংরক্ষিত। দুর্যোগ প্রস্তুতি ও ব্যবস্থাপনায় নিয়োজিত।'
    }
  };

  const t = translations[language];

  return (
    <footer className="w-full bg-flood-dark-950 border-t border-white/5 py-12 px-6 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Brand Section */}
        <div className="flex flex-col gap-4 text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-flood-blue-600/20 text-flood-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight m-0 font-heading">
              {language === 'en' ? 'Flood Shield' : 'ফ্লাড শিল্ড'}
            </h2>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
            {t.tagline}
          </p>
        </div>

        {/* Links Section */}
        <div className="text-left flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-flood-cyan-400 font-heading">
            {t.quickLinks}
          </h3>
          <div className="grid grid-cols-1 gap-2 text-sm text-slate-400">
            <span className="hover:text-white transition-colors cursor-pointer">{t.linkDashboard}</span>
            <span className="hover:text-white transition-colors cursor-pointer">{t.linkPrediction}</span>
            <span className="hover:text-white transition-colors cursor-pointer">{t.linkIncident}</span>
            <span className="hover:text-white transition-colors cursor-pointer">{t.linkRelief}</span>
          </div>
        </div>

        {/* Emergency Section */}
        <div className="text-left flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-red-400 flex items-center gap-2 font-heading">
            <PhoneCall className="w-4 h-4" />
            {t.emergencyTitle}
          </h3>
          <div className="flex flex-col gap-2 text-sm text-slate-300">
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200">
              <strong>{t.emergencyPhone}</strong>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              {t.emergencyNational}
            </div>
            <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              {t.emergencyFFWC}
            </div>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-white/5 text-center text-xs text-slate-500">
        {t.copyright}
      </div>
    </footer>
  );
}
