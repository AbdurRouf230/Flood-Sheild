import React from 'react';
import { Sun, Cloud, CloudRain, AlertTriangle } from 'lucide-react';

/**
 * Animated weather representation based on flood hazard state
 * @param {string} condition - 'sunny' | 'cloudy' | 'rainy'
 */
export default function WeatherAnimation({ condition = 'sunny', language = 'en' }) {
  const labels = {
    en: {
      sunny: 'Clear Weather Forecast',
      cloudy: 'Overcast & Low Pressure',
      rainy: 'Active Precipitation Warning',
      details: 'Current Atmospheric Condition'
    },
    bn: {
      sunny: 'পরিষ্কার আবহাওয়ার পূর্বাভাস',
      cloudy: 'মেঘলা ও নিম্নচাপ পরিস্থিতি',
      rainy: 'সক্রিয় বৃষ্টিপাত সতর্কতা',
      details: 'বর্তমান বায়ুমণ্ডলীয় অবস্থা'
    }
  };

  const t = labels[language];

  return (
    <div className="w-full h-full relative overflow-hidden rounded-2xl flex flex-col justify-between p-6 bg-gradient-to-br from-slate-900 to-slate-950/80 border border-white/5 shadow-inner min-h-[220px]">
      
      {/* Dynamic Animated background representations */}
      
      {condition === 'sunny' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Rotating rays background */}
          <div className="absolute w-44 h-44 rounded-full bg-amber-500/10 animate-[spin_12s_linear_infinite] border-2 border-dashed border-amber-500/20"></div>
          {/* Glowing pulse aura */}
          <div className="absolute w-28 h-28 rounded-full bg-amber-500/20 animate-ping"></div>
          <div className="absolute w-32 h-32 rounded-full bg-gradient-radial from-amber-500/20 to-transparent blur-md"></div>
        </div>
      )}

      {condition === 'cloudy' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Layered clouds moving horizontally */}
          <div className="absolute top-[20%] left-[-20%] w-[140%] h-full opacity-10 flex flex-col gap-6">
            <div className="w-24 h-12 bg-slate-400 rounded-full blur-[2px] animate-[cloudMove_20s_linear_infinite]"></div>
            <div className="w-32 h-14 bg-slate-300 rounded-full blur-[1px] self-end animate-[cloudMove_15s_linear_infinite_reverse]"></div>
          </div>
        </div>
      )}

      {condition === 'rainy' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Animated raindrops */}
          <div className="absolute top-0 left-0 w-full h-full opacity-35 flex justify-around">
            <div className="w-[1.5px] h-8 bg-cyan-400 rounded animate-[rainDrop_1.2s_linear_infinite_delay-100]"></div>
            <div className="w-[1.5px] h-10 bg-cyan-400 rounded animate-[rainDrop_0.8s_linear_infinite_delay-300]"></div>
            <div className="w-[1.5px] h-6 bg-cyan-400 rounded animate-[rainDrop_1.5s_linear_infinite_delay-500]"></div>
            <div className="w-[1.5px] h-9 bg-cyan-400 rounded animate-[rainDrop_1.0s_linear_infinite_delay-200]"></div>
            <div className="w-[1.5px] h-7 bg-cyan-400 rounded animate-[rainDrop_1.3s_linear_infinite_delay-400]"></div>
            <div className="w-[1.5px] h-10 bg-cyan-400 rounded animate-[rainDrop_0.9s_linear_infinite_delay-600]"></div>
            <div className="w-[1.5px] h-8 bg-cyan-400 rounded animate-[rainDrop_1.1s_linear_infinite_delay-100]"></div>
            <div className="w-[1.5px] h-6 bg-cyan-400 rounded animate-[rainDrop_1.4s_linear_infinite_delay-700]"></div>
          </div>
          {/* Soft blue glow */}
          <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-cyan-950/20 to-transparent blur-md"></div>
        </div>
      )}

      {/* Floating Header */}
      <div className="flex justify-between items-center z-10 w-full">
        <span className="text-xs text-slate-400 tracking-wide font-semibold uppercase">{t.details}</span>
        {condition === 'rainy' && (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-[10px] text-red-400 font-bold uppercase tracking-wider animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            Alert
          </span>
        )}
      </div>

      {/* Floating Center Icon */}
      <div className="flex items-center justify-center py-6 z-10">
        {condition === 'sunny' && (
          <div className="p-5 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-lg shadow-amber-500/5 hover:scale-105 transition-transform duration-300">
            <Sun className="w-16 h-16 text-amber-400 animate-[spin_20s_linear_infinite]" />
          </div>
        )}
        {condition === 'cloudy' && (
          <div className="p-5 rounded-full bg-slate-500/10 border border-slate-500/20 shadow-lg shadow-slate-500/5 hover:scale-105 transition-transform duration-300">
            <Cloud className="w-16 h-16 text-slate-300 animate-[float_4s_ease-in-out_infinite]" />
          </div>
        )}
        {condition === 'rainy' && (
          <div className="p-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 shadow-lg shadow-cyan-500/5 hover:scale-105 transition-transform duration-300">
            <CloudRain className="w-16 h-16 text-cyan-400 animate-[float_3s_ease-in-out_infinite]" />
          </div>
        )}
      </div>

      {/* Status Info Footer */}
      <div className="text-left z-10 w-full mt-2">
        <h4 className="text-md font-bold text-white leading-tight font-heading">
          {condition === 'sunny' && t.sunny}
          {condition === 'cloudy' && t.cloudy}
          {condition === 'rainy' && t.rainy}
        </h4>
        <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
          {condition === 'sunny' && <span>Pressure: 1012 hPa • UV Index: High</span>}
          {condition === 'cloudy' && <span>Humidity: 88% • Wind: 14 km/h NE</span>}
          {condition === 'rainy' && <span className="text-cyan-400">Precipitation: &gt; 12mm/hr • Flood Risk Active</span>}
        </div>
      </div>

      {/* CSS Animation Keyframes */}
      <style>{`
        @keyframes cloudMove {
          0% { transform: translateX(-15%); }
          100% { transform: translateX(115%); }
        }
        @keyframes rainDrop {
          0% { transform: translateY(-30px); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateY(220px); opacity: 0; }
        }
        .animate-rainDrop_1\\.2s_linear_infinite_delay-100 { animation: rainDrop 1.2s linear infinite; animation-delay: -0.1s; }
        .animate-rainDrop_0\\.8s_linear_infinite_delay-300 { animation: rainDrop 0.8s linear infinite; animation-delay: -0.3s; }
        .animate-rainDrop_1\\.5s_linear_infinite_delay-500 { animation: rainDrop 1.5s linear infinite; animation-delay: -0.5s; }
        .animate-rainDrop_1\\.0s_linear_infinite_delay-200 { animation: rainDrop 1.0s linear infinite; animation-delay: -0.2s; }
        .animate-rainDrop_1\\.3s_linear_infinite_delay-400 { animation: rainDrop 1.3s linear infinite; animation-delay: -0.4s; }
        .animate-rainDrop_0\\.9s_linear_infinite_delay-600 { animation: rainDrop 0.9s linear infinite; animation-delay: -0.6s; }
        .animate-rainDrop_1\\.1s_linear_infinite_delay-100 { animation: rainDrop 1.1s linear infinite; animation-delay: -0.1s; }
        .animate-rainDrop_1\\.4s_linear_infinite_delay-700 { animation: rainDrop 1.4s linear infinite; animation-delay: -0.7s; }
      `}</style>
    </div>
  );
}
