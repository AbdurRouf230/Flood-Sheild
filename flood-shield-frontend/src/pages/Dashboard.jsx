import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  AlertTriangle, 
  Droplet, 
  Waves, 
  Users, 
  MapPin, 
  RefreshCw, 
  Sparkles, 
  Clock, 
  BarChart3, 
  ShieldCheck, 
  Compass,
  ArrowUp,
  ArrowDown,
  Minus,
  Heart,
  Truck,
  ArrowRight,
  Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import WeatherAnimation from '../components/WeatherAnimation';
import DashboardMap from '../components/DashboardMap';

export default function Dashboard() {
  const { token, language, mongoUser } = useAuth();
  const { lowBandwidth } = useTheme();
  const navigate = useNavigate();

  // Data States
  const [overview, setOverview] = useState(null);
  const [rainfall, setRainfall] = useState(null);
  const [rivers, setRivers] = useState(null);
  const [riskRanking, setRiskRanking] = useState([]);
  const [population, setPopulation] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [aiSummary, setAiSummary] = useState(null);

  // Status indicators
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const translations = {
    en: {
      title: 'Unified Flood Intelligence Dashboard',
      description: 'Continuous monitoring of weather predictions, river stations, and population exposure models.',
      lastUpdated: 'Last updated',
      refreshBtn: 'Refresh Intelligence',
      loadingMsg: 'Syncing real-time parameters from FFWC & Open-Meteo API...',
      riskTitle: 'National Flood Risk Index',
      riskLow: 'Low Flood Probability',
      riskMod: 'Moderate Flood Alert',
      riskHigh: 'High Risk Alert',
      riskCrit: 'Critical Evacuation Warning',
      rainfallTitle: 'Precipitation Forecast Widget',
      rainCurrent: 'Current Rainfall',
      rain72h: '72-Hour Accumulation',
      riverTitle: 'River Flow Telemeter',
      riverNormal: 'Safe Discharge',
      riverWarning: 'Approaching Warning',
      riverDanger: 'Exceeding Danger Level',
      rankingTitle: 'Top District Risks',
      rankingColDist: 'District',
      rankingColRisk: 'Score',
      rankingColCat: 'Alert',
      rankingColTrend: 'Trend',
      exposureTitle: 'Population Exposure Model',
      exposedPop: 'Estimated Exposed Citizens',
      shelterDemand: 'Cyclone Shelter Demand',
      exposedVulnerable: 'Vulnerable Groups',
      alertsTitle: 'Critical Incident Feed',
      alertsNone: 'No active major incidents reported.',
      aiTitle: 'AI Emergency Intelligence Briefing',
      aiEngine: 'Brief generated dynamically using Llama-3 predictions.',
      lowBandwidthMessage: 'Low bandwidth mode active. Charts and GIS map widgets disabled to save data.'
    },
    bn: {
      title: 'সমন্বিত বন্যা তথ্য ড্যাশবোর্ড',
      description: 'আবহাওয়ার পূর্বাভাস, নদীর পানিপ্রবাহ পরিমাপক এবং নাগরিক ঝুঁকিসমূহ নিয়মিত পর্যবেক্ষণ।',
      lastUpdated: 'সর্বশেষ আপডেট',
      refreshBtn: 'রিসেট ডাটা',
      loadingMsg: 'এফএফডব্লিউসি এবং ওপেন-মেটিও এপিআই থেকে তথ্য লোড হচ্ছে...',
      riskTitle: 'জাতীয় বন্যা ঝুঁকি সূচক',
      riskLow: 'কম বন্যা ঝুঁকি',
      riskMod: 'মাঝারি বন্যা সতর্কতা',
      riskHigh: 'উচ্চ ঝুঁকি সতর্কতা',
      riskCrit: 'জরুরি আশ্রয় গ্রহণ সতর্কতা',
      rainfallTitle: 'বৃষ্টিপাতের পূর্বাভাস মডিউল',
      rainCurrent: 'বর্তমান বৃষ্টিপাত',
      rain72h: '৭২ ঘণ্টার পুঞ্জীভূত বৃষ্টি',
      riverTitle: 'নদীর প্রবাহ পরিমাপক',
      riverNormal: 'স্বাভাবিক প্রবাহ',
      riverWarning: 'সতর্কতা স্তর',
      riverDanger: 'বিপদসীমার উপরে',
      rankingTitle: 'শীর্ষ জেলাসমূহের ঝুঁকি',
      rankingColDist: 'জেলা',
      rankingColRisk: 'স্কোর',
      rankingColCat: 'সতর্কতা',
      rankingColTrend: 'প্রবাহ',
      exposureTitle: 'নাগরিক ঝুঁকি মডেল',
      exposedPop: 'ঝুঁকিপূর্ণ নাগরিক সংখ্যা',
      shelterDemand: 'আশ্রয়কেন্দ্রের প্রাক্কলিত চাহিদা',
      exposedVulnerable: 'ঝুঁকিপূর্ণ জনগোষ্ঠী',
      alertsTitle: 'জরুরি ঘটনা প্রবাহ ফিড',
      alertsNone: 'কোনো সত্রিয় জরুরি ঘটনা নেই।',
      aiTitle: 'এআই জরুরি অবস্থা সারসংক্ষেপ',
      aiEngine: 'লামা-৩ মডেলের পূর্বাভাসের ভিত্তিতে প্রস্তুতকৃত।',
      lowBandwidthMessage: 'ডাটা সাশ্রয়ী মোড সক্রিয় রয়েছে। ম্যাপ ও গ্রাফ লোড বন্ধ করা হয়েছে।'
    }
  };

  const t = translations[language];

  // Fetch all dashboard data from API Gateway
  const fetchDashboardData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    setError(null);

    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [
        overviewRes,
        rainfallRes,
        riversRes,
        rankingRes,
        populationRes,
        alertsRes,
        aiSummaryRes
      ] = await Promise.all([
        fetch(`${API_URL}/dashboard/overview`, { headers }),
        fetch(`${API_URL}/dashboard/rainfall`, { headers }),
        fetch(`${API_URL}/dashboard/rivers`, { headers }),
        fetch(`${API_URL}/dashboard/risk-ranking`, { headers }),
        fetch(`${API_URL}/dashboard/population`, { headers }),
        fetch(`${API_URL}/dashboard/alerts`, { headers }),
        fetch(`${API_URL}/dashboard/ai-summary`, { headers })
      ]);

      if (!overviewRes.ok || !rainfallRes.ok || !riversRes.ok) {
        throw new Error('Failed to synchronize critical dashboard endpoints');
      }

      const overviewData = await overviewRes.json();
      const rainfallData = await rainfallRes.json();
      const riversData = await riversRes.json();
      const rankingData = await rankingRes.json();
      const populationData = await populationRes.json();
      const alertsData = await alertsRes.json();
      const aiSummaryData = await aiSummaryRes.json();

      setOverview(overviewData);
      setRainfall(rainfallData);
      setRivers(riversData);
      setRiskRanking(rankingData);
      setPopulation(populationData);
      setAlerts(alertsData);
      setAiSummary(aiSummaryData);
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(err.message || 'System failed to fetch telemetry data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();

      // FR-2.1: Auto Refresh cycle (every 5 seconds)
      const interval = setInterval(() => {
        fetchDashboardData();
      }, 5000);

      return () => clearInterval(interval);
    } else {
      setLoading(false);
      setError(language === 'bn' 
        ? "ডাটাবেস কানেকশন অফলাইন। অনুগ্রহ করে নিশ্চিত করুন যে ব্যাকএন্ড সার্ভার এবং মঙ্গোডিবি চালু আছে।" 
        : "Backend database connection offline. Please verify that your MongoDB local service and backend server are running."
      );
    }
  }, [token, language]);


  // Color mapping based on score
  const getRiskColors = (score) => {
    if (score >= 81) return { text: 'text-red-500', border: 'border-red-500/30', bg: 'bg-red-500/10', glow: 'shadow-red-500/25', label: t.riskCrit };
    if (score >= 61) return { text: 'text-orange-500', border: 'border-orange-500/30', bg: 'bg-orange-500/10', glow: 'shadow-orange-500/25', label: t.riskHigh };
    if (score >= 31) return { text: 'text-yellow-500', border: 'border-yellow-500/30', bg: 'bg-yellow-500/10', glow: 'shadow-yellow-500/25', label: t.riskMod };
    return { text: 'text-emerald-500', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', glow: 'shadow-emerald-500/25', label: t.riskLow };
  };

  const getAlertBadge = (level) => {
    switch (level.toLowerCase()) {
      case 'red': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'orange': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'yellow': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-[80vh] flex flex-col justify-center items-center gap-5 text-slate-400">
        <div className="w-14 h-14 rounded-full border-4 border-t-flood-cyan-500 border-slate-800 animate-spin"></div>
        <p className="text-sm font-semibold max-w-sm text-center">{t.loadingMsg}</p>
      </div>
    );
  }

  // Active weather animation condition based on average risk score
  let weatherCondition = 'sunny';
  if (overview && overview.averageRiskScore >= 61) weatherCondition = 'rainy';
  else if (overview && overview.averageRiskScore >= 31) weatherCondition = 'cloudy';

  const riskStyle = overview ? getRiskColors(overview.averageRiskScore) : {};

  return (
    <div className="w-full min-h-screen px-4 md:px-8 py-8 transition-colors duration-300 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col gap-8">
      
      {/* Dashboard Control Header */}
      <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div className="text-left">
          <h2 className="text-2xl md:text-3xl font-extrabold font-heading text-slate-900 dark:text-white leading-tight">
            {t.title}
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">{t.description}</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="text-xs text-slate-500 text-left md:text-right hidden sm:block">
            <span>{t.lastUpdated}:</span>
            <div className="font-semibold text-slate-700 dark:text-slate-300">

              {lastUpdated.toLocaleTimeString()} ({Math.round((new Date() - lastUpdated) / 60000)}m ago)
            </div>
          </div>
          
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-flood-blue-600 to-flood-cyan-500 text-white font-bold text-sm shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{t.refreshBtn}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto w-full px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Low Bandwidth Alert Banner */}
      {lowBandwidth && (
        <div className="max-w-7xl mx-auto w-full px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-xl flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>{t.lowBandwidthMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* WIDGET 1: Risk Score Card */}
        {overview && (
          <div className={`glass-panel rounded-2xl p-6 border flex flex-col justify-between ${riskStyle.border} ${riskStyle.bg} shadow-lg ${riskStyle.glow} transition-all`}>
            <div className="flex justify-between items-start text-left">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t.riskTitle}</h3>
                <span className={`text-2xl font-black mt-2 inline-block ${riskStyle.text}`}>
                  {riskStyle.label}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 text-white border border-white/5">
                <Compass className="w-6 h-6 text-flood-cyan-400" />
              </div>
            </div>

            {/* Gauge visualization */}
            <div className="flex items-center justify-center py-6 relative">
              <div className="w-32 h-32 rounded-full border-[10px] border-slate-800 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-4xl font-extrabold text-white">{overview.averageRiskScore}</span>
                  <span className="text-xs text-slate-500 block mt-0.5">/100</span>
                </div>
              </div>
              {/* Outer color indicator */}
              <div 
                className="absolute w-36 h-36 rounded-full border-2 border-dashed pointer-events-none opacity-50"
                style={{ borderColor: getRiskColors(overview.averageRiskScore).text }}
              ></div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/5 pt-4 text-slate-400">
              <div className="text-left">
                <span>Critical Zones:</span>
                <strong className="block text-white text-md mt-0.5">{overview.criticalDistrictsCount}</strong>
              </div>
              <div className="text-left font-sans">
                <span>High Alert Zones:</span>
                <strong className="block text-white text-md mt-0.5">{overview.highDistrictsCount}</strong>
              </div>
            </div>
          </div>
        )}

        {/* WIDGET 2: Custom Weather Animation Panel */}
        <div className="w-full">
          <WeatherAnimation condition={weatherCondition} language={language} />
        </div>

        {/* WIDGET 3: Population Exposure Card */}
        {population && (
          <div className="glass-panel rounded-2xl p-6 border border-white/5 flex flex-col justify-between shadow-lg">
            <div className="flex justify-between items-start text-left">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t.exposureTitle}</h3>
                <span className="text-md font-bold text-white block mt-2">WorldPop density exposure</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/40 text-flood-cyan-400 border border-white/5">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="flex flex-col gap-4 py-4 text-left">
              <div>
                <span className="text-xs text-slate-400">{t.exposedPop}</span>
                <div className="text-3xl font-extrabold text-white tracking-tight mt-1">
                  {population.totalExposedPopulation.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-400">{t.shelterDemand}</span>
                <div className="text-xl font-bold text-flood-cyan-400 mt-0.5">
                  {population.totalShelterDemandEstimate.toLocaleString()} seats
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-3 text-left">
              <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">{t.exposedVulnerable}</span>
              <div className="text-xs text-slate-300 mt-1 truncate">
                {population.districtsDetail[0]?.vulnerableCommunities || 'Haor Fishermen'}
              </div>
            </div>
          </div>
        )}

      </div>

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* WIDGET 4: Rainfall Forecast Widget */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex flex-col gap-4 text-left shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-flood-cyan-400 font-heading">
                {t.rainfallTitle}
              </h3>
              <span className="text-xs text-slate-400">Open-Meteo Weather models</span>
            </div>
            <Droplet className="w-5 h-5 text-flood-cyan-400" />
          </div>

          {lowBandwidth ? (
            // Bandwidth fallback list
            <div className="flex flex-col gap-3 py-6">
              {rainfall && rainfall.summary.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-white/5 text-sm">
                  <span className="font-semibold text-white">{item.district}</span>
                  <div className="flex gap-4 text-slate-400 text-xs">
                    <span>Now: <strong className="text-white">{item.current}mm</strong></span>
                    <span>24h: <strong className="text-white">{item.forecast24h}mm</strong></span>
                    <span>72h: <strong className="text-white">{item.forecast72h}mm</strong></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="w-full h-[275px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rainfall?.timelineCharts || []} margin={{ top: 15, right: 20, left: 35, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#64748b" 
                      fontSize={11} 
                      label={{ value: language === 'en' ? 'Time (Hours)' : 'সময় (ঘণ্টা)', position: 'insideBottom', offset: -15, fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={11} 
                      unit="mm" 
                      label={{ value: language === 'en' ? 'Precipitation (mm)' : 'বৃষ্টিপাত (মিমি)', angle: -90, position: 'insideLeft', offset: -10, fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                      itemStyle={{ color: '#fff', fontSize: 12 }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                    <Line type="monotone" dataKey="Sylhet" stroke="#0ea5e9" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="Sunamganj" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="Kurigram" stroke="#f43f5e" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 px-1 border-t border-white/5 pt-2">
                <span><strong>X-Axis:</strong> {language === 'en' ? 'Time (Hours over a 24h cycle)' : 'এক্স-অক্ষ: সময় (২৪ ঘণ্টার চক্র)'}</span>
                <span><strong>Y-Axis:</strong> {language === 'en' ? 'Rainfall in Millimeters (mm)' : 'ওয়াই-অক্ষ: বৃষ্টিপাত (মিমি)'}</span>
              </div>
            </>

          )}
        </div>

        {/* WIDGET 5: Leaflet Map or Grid */}
        <div className="w-full">
          {lowBandwidth ? (
            <div className="glass-panel rounded-2xl p-6 border border-white/5 flex flex-col gap-4 text-left shadow-lg min-h-[300px]">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-flood-cyan-400 font-heading">
                Interactive Risk Index List
              </h3>
              <div className="flex flex-col gap-2 py-4">
                {riskRanking.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2.5 border-b border-white/5 text-sm">
                    <span className="font-semibold text-white">{item.district}</span>
                    <span className={`px-2.5 py-1 rounded text-xs font-bold ${getRiskColors(item.score).bg} ${getRiskColors(item.score).text}`}>
                      {item.score}% Risk ({item.category})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <DashboardMap riskRanking={riskRanking} language={language} />
          )}
        </div>

      </div>

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* WIDGET 6: River Monitor Panel */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex flex-col gap-4 text-left shadow-lg lg:col-span-2">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-flood-cyan-400 font-heading">
                {t.riverTitle}
              </h3>
              <span className="text-xs text-slate-400">Telemeter levels (meters) vs FFWC thresholds</span>
            </div>
            <Waves className="w-5 h-5 text-flood-cyan-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-white/5 pb-4">
            {rivers && rivers.stations.slice(0, 3).map((station, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{station.river} ({station.name})</span>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-lg font-bold text-white">{station.level}m</span>
                  <span className="text-xs text-red-400 font-semibold px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">{station.status}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1.5 flex justify-between">
                  <span>Danger: {station.dangerLevel}m</span>
                  <span className="flex items-center gap-0.5 text-red-400">
                    <ArrowUp className="w-3 h-3" /> {station.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {lowBandwidth ? (
            <div className="flex flex-col gap-2 py-4 text-sm text-slate-300">
              {rivers && rivers.timeSeries.slice(-3).map((item, idx) => (
                <div key={idx} className="flex justify-between py-1">
                  <span>{item.date}:</span>
                  <span>Surma: <strong>{item.SurmaLevel}m</strong> • Kushiyara: <strong>{item.KushiyaraLevel}m</strong></span>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="w-full h-[215px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rivers?.timeSeries || []} margin={{ top: 15, right: 20, left: 35, bottom: 40 }}>
                    <defs>
                      <linearGradient id="colorSurma" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorJamuna" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b" 
                      fontSize={11} 
                      label={{ value: language === 'en' ? 'Date (Days)' : 'তারিখ (দিন)', position: 'insideBottom', offset: -15, fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={11} 
                      unit="m" 
                      label={{ value: language === 'en' ? 'Level (m)' : 'পানির স্তর (মিটার)', angle: -90, position: 'insideLeft', offset: -10, fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                      itemStyle={{ color: '#fff', fontSize: 12 }}
                    />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                    <Area type="monotone" dataKey="SurmaLevel" name="Surma River" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorSurma)" strokeWidth={2} />
                    <Area type="monotone" dataKey="JamunaLevel" name="Jamuna River" stroke="#f43f5e" fillOpacity={1} fill="url(#colorJamuna)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 px-1 border-t border-white/5 pt-2">
                <span><strong>X-Axis:</strong> {language === 'en' ? 'Date (Recent 7 Days)' : 'এক্স-অক্ষ: তারিখ (গত ৭ দিন)'}</span>
                <span><strong>Y-Axis:</strong> {language === 'en' ? 'Water Level in Meters (m)' : 'ওয়াই-অক্ষ: পানির উচ্চতা (মিটার)'}</span>
              </div>
            </>

          )}
        </div>

        {/* WIDGET 7: District Risk Ranking Table */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex flex-col gap-4 text-left shadow-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-flood-cyan-400 font-heading">
              {t.rankingTitle}
            </h3>
            <BarChart3 className="w-5 h-5 text-flood-cyan-400" />
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-500 font-bold">
                  <th className="py-2.5">{t.rankingColDist}</th>
                  <th className="py-2.5 text-center">{t.rankingColRisk}</th>
                  <th className="py-2.5 text-center">{t.rankingColCat}</th>
                  <th className="py-2.5 text-right">{t.rankingColTrend}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {riskRanking.slice(0, 7).map((item, idx) => {
                  const style = getRiskColors(item.score);
                  return (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 text-white">{item.district}</td>
                      <td className="py-2.5 text-center font-bold">{item.score}%</td>
                      <td className="py-2.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold tracking-wide uppercase ${style.text} ${style.bg} border ${style.border}`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        {item.trend === 'Rising' && <span className="text-red-400 inline-flex items-center gap-0.5"><ArrowUp className="w-3.5 h-3.5" /></span>}
                        {item.trend === 'Falling' && <span className="text-emerald-400 inline-flex items-center gap-0.5"><ArrowDown className="w-3.5 h-3.5" /></span>}
                        {item.trend === 'Stable' && <span className="text-slate-500 inline-flex items-center gap-0.5"><Minus className="w-3.5 h-3.5" /></span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* WIDGET 8: Emergency Alert Feed */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex flex-col gap-4 text-left shadow-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-flood-cyan-400 font-heading">
              {t.alertsTitle}
            </h3>
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
              Live Feed
            </span>
          </div>

          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">{t.alertsNone}</p>
            ) : (
              alerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-3 rounded-xl border flex flex-col gap-1.5 ${getAlertBadge(alert.level)}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-wider">{alert.type}</span>
                    <span className="text-[10px] opacity-70">
                      {new Date(alert.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs leading-normal font-sans font-medium">{alert.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* WIDGET 9: AI Summary Section */}
        {aiSummary && (
          <div className="glass-panel rounded-2xl p-6 border border-flood-cyan-400/20 flex flex-col justify-between shadow-lg lg:col-span-2 relative overflow-hidden">
            {/* Background design graphics */}
            <div className="absolute top-[-20%] right-[-10%] w-[120px] h-[120px] bg-flood-cyan-500/10 rounded-full blur-xl pointer-events-none"></div>

            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-flood-cyan-400 animate-pulse-glow" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white font-heading">
                  {t.aiTitle}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] text-slate-500 font-bold uppercase border border-white/5">
                Verified NLP
              </span>
            </div>

            {/* AI Output Box */}
            <div className="py-4 text-left flex-1 flex flex-col justify-center">
              <p className="text-sm md:text-md leading-relaxed text-slate-200 font-medium font-sans">
                {language === 'bn' ? aiSummary.summary.bn : aiSummary.summary.en}
              </p>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-white/5 pt-3">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-600" />
                Gen: {new Date(aiSummary.generatedAt).toLocaleTimeString()}
              </span>
              <span>{aiSummary.model}</span>
            </div>
          </div>
        )}

      </div>

      {/* ── Quick Feature Access ── */}
      <div className="max-w-7xl mx-auto w-full px-4 pb-8">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Quick Access</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={() => navigate('/volunteers')}
            className="group glass-panel border border-white/5 rounded-2xl p-4 text-left hover:border-cyan-500/40 hover:bg-cyan-900/10 transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-cyan-900/30 rounded-lg"><Users className="w-5 h-5 text-cyan-400" /></div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
            </div>
            <p className="text-sm font-bold text-white">Volunteer Hub</p>
            <p className="text-xs text-slate-500 mt-0.5">Job board & deployment map</p>
          </button>

          <button onClick={() => navigate('/donate')}
            className="group glass-panel border border-white/5 rounded-2xl p-4 text-left hover:border-rose-500/40 hover:bg-rose-900/10 transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-rose-900/30 rounded-lg"><Heart className="w-5 h-5 text-rose-400" /></div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-rose-400 transition-colors" />
            </div>
            <p className="text-sm font-bold text-white">Donate</p>
            <p className="text-xs text-slate-500 mt-0.5">Support flood relief fund</p>
          </button>

          {mongoUser && ['Government','NGO','Volunteer'].includes(mongoUser.role) && (
            <button onClick={() => navigate('/transport')}
              className="group glass-panel border border-white/5 rounded-2xl p-4 text-left hover:border-blue-500/40 hover:bg-blue-900/10 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-900/30 rounded-lg"><Truck className="w-5 h-5 text-blue-400" /></div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors" />
              </div>
              <p className="text-sm font-bold text-white">Transport</p>
              <p className="text-xs text-slate-500 mt-0.5">Live supply tracking & chat</p>
            </button>
          )}

          <button onClick={() => navigate('/incidents')}
            className="group glass-panel border border-white/5 rounded-2xl p-4 text-left hover:border-violet-500/40 hover:bg-violet-900/10 transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-violet-900/30 rounded-lg"><Globe className="w-5 h-5 text-violet-400" /></div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-violet-400 transition-colors" />
            </div>
            <p className="text-sm font-bold text-white">Community Feed</p>
            <p className="text-xs text-slate-500 mt-0.5">Approved incident reports</p>
          </button>
        </div>
      </div>

    </div>
  );
}
