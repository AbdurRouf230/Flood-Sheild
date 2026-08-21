import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  LineChart, 
  Line, 
  AreaChart, 
  Area 
} from 'recharts';
import { 
  ShieldAlert, 
  RefreshCw, 
  Activity, 
  BarChart3, 
  TrendingUp, 
  Layers, 
  Home, 
  MapPin, 
  Users, 
  Info,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Server,
  TrendingDown,
  Compass,
  PlusCircle,
  Heart,
  Building2,
  BadgeCheck,
  Copy,
  Trash2,
  Shield,
  DollarSign
} from 'lucide-react';
import { parseTakaAmount, resolveRequestedFunding, formatTakaHint } from '../utils/takaAmount';

export default function DecisionSupportPage() {
  const { token, language, mongoUser } = useAuth();
  const { theme } = useTheme();

  // API base URL
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Data States
  const [analytics, setAnalytics] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Selected station for water level forecast chart
  const [selectedStationIdx, setSelectedStationIdx] = useState(0);

  // Shelter management states
  const [shelters, setShelters] = useState([]);
  const [shelterMsg, setShelterMsg] = useState('');
  const [shelterErr, setShelterErr] = useState('');
  const [showShelterForm, setShowShelterForm] = useState(false);
  const [sName, setSName] = useState('');
  const [sLat, setSLat] = useState('');
  const [sLon, setSLon] = useState('');
  const [sCap, setSCap] = useState('');
  const [sDist, setSDist] = useState('Sylhet');
  const [postingShelter, setPostingShelter] = useState(false);

  // Representative invite management
  const [repInvites, setRepInvites] = useState([]);
  const [showRepForm, setShowRepForm] = useState(false);
  const [repName, setRepName] = useState('');
  const [repShelterId, setRepShelterId] = useState('');
  const [repMsg, setRepMsg] = useState('');
  const [repErr, setRepErr] = useState('');
  const [postingRep, setPostingRep] = useState(false);



  // Volunteer management
  const [volSlots, setVolSlots] = useState([]);
  const [volApps, setVolApps] = useState({});        // slotId -> apps[]
  const [expandedSlot, setExpandedSlot] = useState(null);
  const [volMsg, setVolMsg] = useState('');
  const [volErr, setVolErr] = useState('');
  const [showVolForm, setShowVolForm] = useState(false);
  const [vDistrict, setVDistrict] = useState('Sylhet');
  const [vTask, setVTask] = useState('Supply Distribution');
  const [vCount, setVCount] = useState('5');
  const [vDesc, setVDesc] = useState('');
  const [postingVol, setPostingVol] = useState(false);

  const VOL_DISTRICTS = ['Sylhet','Sunamganj','Kurigram','Gaibandha','Netrokona','Sirajganj','Jamalpur','Bogura','Dhaka','Chittagong'];
  const VOL_TASKS = ['Supply Distribution','Shelter Support','Search & Rescue','Medical Aid','Data Collection','Transport Escort'];


  // Translations
  const translations = {
    en: {
      title: "Government Decision Support Center",
      subtitle: "Government command center for ensemble flood forecasting, national risk indexation, and resource audits.",
      riskLeaderboard: "Ensemble District Risk Rankings",
      nationalHeatmap: "National Risk Map (District Matrix)",
      resourceAnalytics: "Resource Allocations Audit",
      forecastTitle: "Prophet + XGBoost River Level Forecasting",
      incidentTitle: "Vetted Critical Incidents Feed",
      shelterTitle: "National Shelter Capacity Monitor",
      dangerLevel: "Danger Threshold Level",
      historical: "Historical Level",
      forecasted: "Forecasted Level",
      formulaLabel: "Weighted Ensemble Risk Formula",
      syncBtn: "Sync Command Center",
      verified: "Vetted Govt Approved",
      occupied: "Occupied Capacity",
      riskLevels: {
        Critical: "Critical Risk",
        High: "High Risk",
        Moderate: "Moderate Risk",
        Low: "Low Risk"
      },
      statsLabels: {
        totalIncidents: "Verified Incidents",
        unresolved: "Pending Action",
        totalWarehouses: "Active Depots",
        occupancy: "Average Occupancy"
      },
      demandVsDispatch: "Supply Request vs Dispatched Shipment (Units)",
      requested: "Quantity Requested",
      dispatched: "Quantity Dispatched",
      districtsList: {
        Sunamganj: "Sunamganj",
        Sylhet: "Sylhet",
        Kurigram: "Kurigram",
        Gaibandha: "Gaibandha",
        Sirajganj: "Sirajganj",
        Netrokona: "Netrokona",
        Jamalpur: "Jamalpur",
        Bogura: "Bogura",
        Chittagong: "Chittagong",
        Dhaka: "Dhaka"
      },
      distributionTitle: "Relief Distribution Tracking",
      distributionSub: "Live dispatch status, routing audits, and fulfillment monitoring.",
      dispatchWarehouse: "Dispatched Depot",
      dispatchedItems: "Items Allocations",
      transitStatus: "Transit Status",
      routeDistance: "Route Distance",
      timeLabel: "Dispatched Time"
    },
    bn: {
      title: "সরকারি সিদ্ধান্ত গ্রহণ সহায়তা কেন্দ্র",
      subtitle: "সরকারি কর্মকর্তাদের জন্য সমন্বিত বন্যা পূর্বাভাস, জাতীয় ঝুঁকি সূচক নির্ধারণ এবং ত্রাণ নিরীক্ষণ কমান্ড সেন্টার।",
      riskLeaderboard: "জেলা ভিত্তিক বন্যা ঝুঁকি র‍্যাঙ্কিং",
      nationalHeatmap: "জাতীয় ঝুঁকি মানচিত্র (জেলা গ্রিড)",
      resourceAnalytics: "ত্রাণ ও সম্পদ বরাদ্দ নিরীক্ষা",
      forecastTitle: "নদীর পানির উচ্চতা পূর্বাভাস (Prophet + XGBoost)",
      incidentTitle: "যাচাইকৃত জরুরি ঘটনা সমূহের ফিড",
      shelterTitle: "আশ্রয়কেন্দ্রের ধারণক্ষমতা মনিটর",
      dangerLevel: "বিপদসীমা লেভেল",
      historical: "অতীতের উচ্চতা",
      forecasted: "পূর্বাভাসকৃত উচ্চতা",
      formulaLabel: "সমন্বিত এআই ঝুঁকি হিসাব সূত্র",
      syncBtn: "কমান্ড সেন্টার সিঙ্ক",
      verified: "যাচাইকৃত সরকারি অনুমোদিত",
      occupied: "পূর্ণ ধারণক্ষমতা",
      riskLevels: {
        Critical: "মারাত্মক ঝুঁকি",
        High: "উচ্চ ঝুঁকি",
        Moderate: "মাঝারি ঝুঁকি",
        Low: "স্বল্প ঝুঁকি"
      },
      statsLabels: {
        totalIncidents: "যাচাইকৃত ঘটনা",
        unresolved: "পেন্ডিং অ্যাকশন",
        totalWarehouses: "সক্রিয় ত্রাণ ডিপো",
        occupancy: "গড় আবাসন হার"
      },
      demandVsDispatch: "ত্রাণ চাহিদা বনাম বিতরণ পরিমাণ (ইউনিট)",
      requested: "চাহিদা পরিমাণ",
      dispatched: "বিতরণ পরিমাণ",
      districtsList: {
        Sunamganj: "সুনামগঞ্জ",
        Sylhet: "সিলেট",
        Kurigram: "কুড়িগ্রাম",
        Gaibandha: "গাইবান্ধা",
        Sirajganj: "সিরাজগঞ্জ",
        Netrokona: "নেত্রকোনা",
        Jamalpur: "জামালপুর",
        Bogura: "বগুড়া",
        Chittagong: "চট্টগ্রাম",
        Dhaka: "ঢাকা"
      },
      distributionTitle: "ত্রাণ বিতরণ ট্র্যাকিং ও নিরীক্ষণ",
      distributionSub: "লাইভ ডিসপ্যাচ স্ট্যাটাস, রুট অডিট এবং বিতরণ তদারকি প্যানেল।",
      dispatchWarehouse: "উৎস ডিপো",
      dispatchedItems: "ত্রাণ সামগ্রী বরাদ্দ",
      transitStatus: "পরিবহন অবস্থা",
      routeDistance: "দূরত্ব (কিমি)",
      timeLabel: "ডিসপ্যাচ সময়"
    }
  };

  const t = translations[language] || translations['en'];

  // Load decision support datasets
  const fetchDecisionData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const headers = { 'Authorization': `Bearer ${token}` };

      console.log("[DecisionSupportPage] Querying API Command endpoints...");
      const [anRes, foreRes, riskRes, incRes] = await Promise.all([
        fetch(`${API_URL}/decision/analytics`, { headers }),
        fetch(`${API_URL}/decision/forecast`, { headers }),
        fetch(`${API_URL}/decision/district-risk`, { headers }),
        fetch(`${API_URL}/incidents`, { headers })
      ]);

      if (anRes.ok) {
        const anData = await anRes.json();
        setAnalytics(anData);
      } else {
        console.warn("[DecisionSupportPage] Analytics response error");
      }
      
      if (foreRes.ok) {
        const foreData = await foreRes.json();
        setForecast(foreData);
      } else {
        console.warn("[DecisionSupportPage] Forecast response error");
      }
      
      if (riskRes.ok) {
        const riskData = await riskRes.json();
        setRiskData(riskData);
      } else {
        console.warn("[DecisionSupportPage] Risk ranking response error");
      }
      
      if (incRes.ok) {
        const incData = await incRes.json();
        // Vetted incidents only (status: Approved/Verified)
        const vetted = incData.filter(i => i.status === 'Approved' || i.status === 'Verified');
        setIncidents(vetted);
      } else {
        console.warn("[DecisionSupportPage] Incidents response error");
      }
    } catch (e) {
      console.error('Failed to query command datasets:', e);
      setErrorMsg(language === 'en' ? 'Failed to synchronize with decision support databases.' : 'সিদ্ধান্ত সহায়তা ডেটাবেসের সাথে সিঙ্ক করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDecisionData();
      fetchVolunteerData();
    }
  }, [token]);



  // Fetch volunteer slots for gov dashboard
  const fetchVolunteerData = async () => {
    const hdrs = { Authorization: `Bearer ${token}` };
    const res = await fetch(`${API_URL}/volunteers/slots`, { headers: hdrs });
    if (res.ok) setVolSlots(await res.json());
  };

  const loadVolApps = async (slotId) => {
    if (volApps[slotId]) return;
    const hdrs = { Authorization: `Bearer ${token}` };
    const res = await fetch(`${API_URL}/volunteers/applications/slot/${slotId}`, { headers: hdrs });
    if (res.ok) {
      const data = await res.json();
      setVolApps(prev => ({ ...prev, [slotId]: data }));
    }
  };

  const handleVolRespond = async (slotId, appId, action) => {
    const hdrs = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    const res = await fetch(`${API_URL}/volunteers/slots/${slotId}/applications/${appId}/respond`, {
      method: 'PUT', headers: hdrs,
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    if (res.ok) {
      setVolMsg(`Application ${action}ed successfully`);
      setVolApps(prev => ({ ...prev, [slotId]: (prev[slotId] || []).map(a => a._id === appId ? data : a) }));
    } else setVolErr(data.message);
  };

  const handleVolClose = async (slotId) => {
    const hdrs = { Authorization: `Bearer ${token}` };
    const res = await fetch(`${API_URL}/volunteers/slots/${slotId}/close`, { method: 'PUT', headers: hdrs });
    if (res.ok) setVolSlots(prev => prev.map(s => s._id === slotId ? { ...s, status: 'Closed' } : s));
  };

  const handlePostVolSlot = async () => {
    if (!vCount || parseInt(vCount) < 1) return setVolErr('Volunteer count must be at least 1');
    setPostingVol(true); setVolErr(''); setVolMsg('');
    const hdrs = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    const res = await fetch(`${API_URL}/volunteers/slots`, {
      method: 'POST', headers: hdrs,
      body: JSON.stringify({ district: vDistrict, taskType: vTask, volunteersNeeded: parseInt(vCount), description: vDesc })
    });
    const data = await res.json();
    if (res.ok) {
      setVolMsg('Volunteer slot posted!');
      setVolSlots(prev => [data, ...prev]);
      setShowVolForm(false); setVDesc(''); setVCount('5');
    } else setVolErr(data.message);
    setPostingVol(false);
  };


  // Color mapping helper for risk scores
  const getRiskBadgeColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'bg-rose-500/10 border border-rose-500/20 text-rose-400';
      case 'high': return 'bg-orange-500/10 border border-orange-500/20 text-orange-400';
      case 'moderate': return 'bg-amber-500/10 border border-amber-500/20 text-amber-400';
      default: return 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400';
    }
  };

  const getRiskBorderColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'border-rose-500/30 shadow-lg shadow-rose-500/5';
      case 'high': return 'border-orange-500/30';
      case 'moderate': return 'border-amber-500/30';
      default: return 'border-emerald-500/30';
    }
  };

  // Restrict access check
  if (!mongoUser || mongoUser.role !== 'Government') {
    return (
      <div className="min-h-screen bg-flood-dark-950 flex flex-col justify-center items-center gap-4 text-center px-4">
        <div className="relative flex items-center justify-center p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 shadow-xl shadow-rose-500/10 animate-float mb-2">
          <ShieldAlert className="w-14 h-14" />
        </div>
        <h2 className="text-3xl font-extrabold text-white font-heading tracking-tight">
          {language === 'en' ? 'Access Restricted' : 'প্রবেশাধিকার সীমাবদ্ধ'}
        </h2>
        <p className="text-slate-400 max-w-md text-sm font-medium leading-relaxed">
          {language === 'en' 
            ? 'This executive decision support panel contains critical national crisis intelligence and is authorized for Government Officials only.' 
            : 'এই নির্বাহী সিদ্ধান্ত সহায়তা প্যানেলটিতে জাতীয় দুর্যোগের সংবেদনশীল তথ্য রয়েছে এবং এটি শুধুমাত্র সরকারি কর্মকর্তাদের জন্য অনুমোদিত।'}
        </p>
        <a
          href="/dashboard"
          className="mt-4 px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all duration-300 border border-slate-700 shadow-lg text-sm"
        >
          {language === 'en' ? 'Return to Dashboard' : 'ড্যাশবোর্ডে ফিরে যান'}
        </a>
      </div>
    );
  }

  // Pre-process Recharts resource data mapping (Defensive check)
  const chartResourceData = [];
  if (analytics && analytics.requestsSummary && analytics.requestsSummary.byItemType) {
    const items = ['Food', 'Water', 'Medicine', 'Shelter Kits'];
    items.forEach(it => {
      chartResourceData.push({
        name: language === 'en' ? it : (it === 'Food' ? 'খাদ্য সামগ্রী' : it === 'Water' ? 'বিশুদ্ধ পানি' : it === 'Medicine' ? 'ওষুধ' : 'আশ্রয় কিট'),
        requested: analytics.requestsSummary.byItemType[it] || 0,
        dispatched: it === 'Food' ? 1100 : it === 'Water' ? 2000 : it === 'Medicine' ? 400 : 0
      });
    });
  }

  // Pre-process Recharts water level forecast mapping (Defensive check)
  const waterForecastData = [];
  if (forecast && Array.isArray(forecast.stations) && forecast.stations[selectedStationIdx]) {
    const station = forecast.stations[selectedStationIdx];
    const dl = station.dangerLevel || 0;
    
    // Combine history
    if (Array.isArray(station.history)) {
      station.history.forEach((val, i) => {
        waterForecastData.push({
          day: `H-${7 - i}`,
          [t.historical || 'Historical']: val,
          [t.dangerLevel || 'Danger']: dl
        });
      });
    }
    
    // Combine forecast
    if (Array.isArray(station.forecast)) {
      station.forecast.forEach((val, i) => {
        waterForecastData.push({
          day: `F+${i + 1}`,
          [t.forecasted || 'Forecasted']: val,
          [t.dangerLevel || 'Danger']: dl
        });
      });
    }
  }

  // Shelters occupancy mockup matched with models capacity values
  const mockShelters = [
    { name: "Sylhet Govt College Shelter", district: "Sylhet", capacity: 800, occupied: 480 },
    { name: "Sunamganj Sadar High School", district: "Sunamganj", capacity: 600, occupied: 520 },
    { name: "Kurigram Degree College", district: "Kurigram", capacity: 750, occupied: 680 },
    { name: "Gaibandha Pilot School", district: "Gaibandha", capacity: 500, occupied: 380 },
    { name: "Sirajganj Sadar Shelter", district: "Sirajganj", capacity: 900, occupied: 720 },
    { name: "Dhaka Central Cyclone Center", district: "Dhaka", capacity: 2500, occupied: 220 }
  ];

  return (
    <div className="min-h-screen bg-flood-dark-950 text-slate-100 py-10 px-4 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        
        {/* Title Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-heading m-0 flex items-center gap-3">
              <Activity className="w-9 h-9 text-flood-cyan-400 animate-pulse" />
              {t.title}
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl font-medium">
              {t.subtitle}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDecisionData}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-sm font-bold border border-white/5 hover:border-flood-cyan-500/20 text-flood-cyan-400 hover:text-white transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{t.syncBtn}</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="glass-panel p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-sm font-semibold flex items-center gap-3 animate-fade-in shadow-lg">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500 animate-pulse" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Analytics Numeric Cards */}
        {analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 bg-slate-900/40">
              <div className="p-3.5 rounded-xl bg-rose-500/10 text-rose-400">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">
                  {analytics.incidentsSummary?.bySeverity?.Critical || 0}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">Critical SOS Incidents</div>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 bg-slate-900/40">
              <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">{incidents.length}</div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{t.statsLabels?.totalIncidents || 'Verified Incidents'}</div>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 bg-slate-900/40">
              <div className="p-3.5 rounded-xl bg-flood-cyan-500/10 text-flood-cyan-400">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">{analytics.shelterSummary?.totalShelters || 12}</div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{t.statsLabels?.totalWarehouses || 'Active Depots'}</div>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 bg-slate-900/40">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">{analytics.shelterSummary?.occupancyPercentage || 54.5}%</div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{t.statsLabels?.occupancy || 'Average Occupancy'}</div>
              </div>
            </div>
          </div>
        )}

        {/* National Risk Map Matrix Grid & District Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Risk Heatmap Matrix */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/5 bg-slate-900/30 flex flex-col gap-4">
            <h2 className="text-xl font-bold tracking-tight text-white font-heading border-b border-white/5 pb-3">
              {t.nationalHeatmap}
            </h2>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-t-flood-cyan-500 border-slate-800 animate-spin"></div>
                <p className="text-slate-400 text-xs">{language === 'en' ? 'Updating national risk telemetry...' : 'জাতীয় ঝুঁকি ডাটা আপডেট হচ্ছে...'}</p>
              </div>
            ) : riskData && riskData.rankings ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mt-2">
                {riskData.rankings.map(item => (
                  <div
                    key={item.district}
                    className={`p-3 rounded-2xl border bg-slate-900/60 flex flex-col justify-between h-28 transition-all duration-300 hover:scale-103 ${getRiskBorderColor(item.level)}`}
                  >
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {t.districtsList?.[item.district] || item.district}
                      </span>
                      <div className="text-[9px] font-black uppercase tracking-wider mt-1">
                        <span className={`px-2 py-0.5 rounded ${getRiskBadgeColor(item.level)}`}>
                          {item.level}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline border-t border-white/5 pt-2 mt-2">
                      <span className="text-sm font-bold text-slate-400">Risk:</span>
                      <span className="text-base font-black text-white">{item.riskScore}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* District Rankings Leaderboard */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-900/30 flex flex-col gap-4">
            <h2 className="text-xl font-bold tracking-tight text-white font-heading border-b border-white/5 pb-3">
              {t.riskLeaderboard}
            </h2>

            {riskData && riskData.rankings ? (
              <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                {riskData.rankings.map((item, idx) => (
                  <div 
                    key={item.district}
                    className="flex justify-between items-center p-3 rounded-xl bg-slate-950/60 border border-white/5 hover:border-flood-cyan-500/20 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded bg-slate-900 text-[10px] font-black text-slate-400 flex items-center justify-center border border-white/5">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-extrabold text-white">
                        {t.districtsList?.[item.district] || item.district}
                      </span>
                    </div>
                    
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${getRiskBadgeColor(item.level)}`}>
                      {item.riskScore}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-500">{language === 'en' ? 'Calculating rankings...' : 'র‍্যাঙ্কিং হিসাব করা হচ্ছে...'}</div>
            )}

            {riskData && (
              <div className="mt-2 p-3 rounded-xl bg-slate-950 border border-white/5 text-[9px] text-slate-400 font-semibold leading-relaxed">
                <div className="font-bold uppercase text-[8px] text-flood-cyan-400 mb-0.5">{t.formulaLabel}</div>
                {riskData.ensembleFormula}
              </div>
            )}
          </div>
        </div>

        {/* Resource Analytics (Recharts chart) & River Level Forecasting */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Supply Demand chart */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-900/30 flex flex-col gap-4">
            <h2 className="text-xl font-bold tracking-tight text-white font-heading border-b border-white/5 pb-3">
              {t.resourceAnalytics}
            </h2>
            
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              {t.demandVsDispatch}
            </div>

            {analytics && chartResourceData.length > 0 ? (
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartResourceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc', borderRadius: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="requested" name={t.requested || 'Requested'} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="dispatched" name={t.dispatched || 'Dispatched'} fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-slate-500">{language === 'en' ? 'Updating charts...' : 'চার্ট লোড হচ্ছে...'}</div>
            )}
          </div>

          {/* Timeseries forecast chart */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-900/30 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3">
              <h2 className="text-xl font-bold tracking-tight text-white font-heading">
                {t.forecastTitle}
              </h2>
              
              {/* Station selector */}
              {forecast && forecast.stations && (
                <select
                  value={selectedStationIdx}
                  onChange={(e) => setSelectedStationIdx(parseInt(e.target.value))}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white font-semibold outline-none focus:border-flood-cyan-400 cursor-pointer"
                >
                  {forecast.stations.map((s, i) => (
                    <option key={i} value={i}>{s.station}</option>
                  ))}
                </select>
              )}
            </div>

            {forecast && waterForecastData.length > 0 ? (
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={waterForecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', borderColor: 'rgba(255,255,255,0.1)', color: '#f8fafc', borderRadius: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Line type="monotone" dataKey={t.historical || 'Historical Level'} stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey={t.forecasted || 'Forecasted Level'} stroke="#22d3ee" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 4 }} />
                    <Line type="straight" dataKey={t.dangerLevel || 'Danger Threshold Level'} stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-20 text-center text-xs text-slate-500">{language === 'en' ? 'Calculating timeseries...' : 'পূর্বাভাস গণনা হচ্ছে...'}</div>
            )}
          </div>

        </div>

        {/* Verified Incidents Feed & Shelter Capacity tracking */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Verified Incidents Feed */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-900/30 flex flex-col gap-4">
            <h2 className="text-xl font-bold tracking-tight text-white font-heading border-b border-white/5 pb-3 flex items-center gap-2">
              <Compass className="w-5 h-5 text-flood-cyan-400" />
              {t.incidentTitle}
            </h2>

            <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
              {loading ? (
                <div className="py-10 text-center text-xs text-slate-500">{language === 'en' ? 'Updating incidents feed...' : 'ঘটনা ফিড লোড হচ্ছে...'}</div>
              ) : incidents.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 font-semibold">
                  {language === 'en' ? 'No vetted critical incidents matching filters.' : 'কোনো যাচাইকৃত ঝুঁকিপূর্ণ জরুরি ঘটনা পাওয়া যায়নি।'}
                </div>
              ) : (
                incidents.map(inc => (
                  <div 
                    key={inc._id}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          inc.severity === 'Critical' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 animate-pulse' : 'bg-orange-500/10 border border-orange-500/20 text-orange-400'
                        }`}>
                          {inc.severity}
                        </span>
                        <span className="text-xs font-black text-white">{inc.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-sm line-clamp-2">{inc.desc}</p>
                    </div>

                    <div className="text-right text-[10px] text-slate-500 font-semibold flex-shrink-0 flex flex-col gap-1">
                      <span className="text-slate-400 font-bold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-flood-cyan-400" />
                        {inc.district}
                      </span>
                      <span>({inc.lat?.toFixed(4)}, {inc.lng?.toFixed(4)})</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Shelter Capacity Monitor */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-900/30 flex flex-col gap-4">
            <h2 className="text-xl font-bold tracking-tight text-white font-heading border-b border-white/5 pb-3 flex items-center gap-2">
              <Home className="w-5 h-5 text-flood-cyan-400" />
              {t.shelterTitle}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
              {mockShelters.map((shelter, idx) => {
                const percent = Math.round((shelter.occupied / shelter.capacity) * 100);
                const isFull = percent >= 80;
                return (
                  <div 
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex flex-col gap-2.5"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="truncate">
                        <h4 className="text-xs font-black text-white truncate" title={shelter.name}>{shelter.name}</h4>
                        <span className="text-[9px] uppercase font-bold text-slate-500">{shelter.district}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                        isFull 
                          ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 animate-pulse' 
                          : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      }`}>
                        {percent}%
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-1">
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                        <span>{t.occupied || 'Occupied Capacity'}</span>
                        <span className="text-white font-extrabold">{shelter.occupied} / {shelter.capacity}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>








        {/* ── Volunteer Management (Government only) ── */}
        <div className="glass-panel p-5 border border-slate-200 dark:border-white/5 rounded-2xl bg-white/80 dark:bg-slate-900/60 shadow-md">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 font-heading flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" /> Volunteer Management
            </h3>
            <div className="flex gap-2">
              <button onClick={fetchVolunteerData}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-lg text-xs text-slate-300 transition-colors">
                Refresh
              </button>
              <button onClick={() => setShowVolForm(v => !v)}
                className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 rounded-lg text-xs text-white font-medium transition-colors flex items-center gap-1">
                <PlusCircle className="w-3.5 h-3.5" /> Post Slot
              </button>
            </div>
          </div>

          {/* Alerts */}
          {volMsg && <div className="mb-3 bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 px-3 py-2 rounded-lg text-xs">{volMsg}</div>}
          {volErr && <div className="mb-3 bg-red-900/40 border border-red-500/30 text-red-300 px-3 py-2 rounded-lg text-xs">{volErr}</div>}

          {/* Post Slot Form */}
          {showVolForm && (
            <div className="mb-4 bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-300">New Volunteer Slot</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">District</label>
                  <select value={vDistrict} onChange={e => setVDistrict(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500">
                    {VOL_DISTRICTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Task Type</label>
                  <select value={vTask} onChange={e => setVTask(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500">
                    {VOL_TASKS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Volunteers Needed</label>
                  <input type="number" min="1" value={vCount} onChange={e => setVCount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Description</label>
                  <input value={vDesc} onChange={e => setVDesc(e.target.value)} placeholder="Optional details..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handlePostVolSlot} disabled={postingVol}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg text-xs font-medium transition-colors">
                  {postingVol ? 'Posting...' : 'Post Slot'}
                </button>
                <button onClick={() => setShowVolForm(false)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {/* Slots List */}
          {volSlots.length === 0 ? (
            <p className="text-slate-500 text-xs text-center py-6">No volunteer slots posted yet. Click "Post Slot" to create one.</p>
          ) : (
            <div className="space-y-3">
              {volSlots.map(slot => (
                <div key={slot._id} className="bg-slate-900/60 border border-slate-700 rounded-xl overflow-hidden">
                  {/* Slot Header Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                        slot.status === 'Open' ? 'bg-emerald-900/40 text-emerald-300 border-emerald-500/30'
                        : slot.status === 'Closed' ? 'bg-slate-800 text-slate-500 border-slate-600'
                        : 'bg-blue-900/40 text-blue-300 border-blue-500/30'
                      }`}>{slot.status}</span>
                      <span className="text-sm font-semibold text-white">{slot.taskType}</span>
                      <span className="text-xs text-slate-400">
                        <MapPin className="inline w-3 h-3 mr-0.5" />{slot.district}
                        &nbsp;·&nbsp;
                        <Users className="inline w-3 h-3 mr-0.5" />{slot.volunteersNeeded} needed
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const next = expandedSlot === slot._id ? null : slot._id;
                          setExpandedSlot(next);
                          if (next) loadVolApps(next);
                        }}
                        className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-300 transition-colors">
                        {expandedSlot === slot._id ? 'Hide' : 'View'} Applicants
                      </button>
                      {slot.status === 'Open' && (
                        <button onClick={() => handleVolClose(slot._id)}
                          className="text-xs px-3 py-1 bg-red-900/30 hover:bg-red-900/50 border border-red-500/20 rounded-lg text-red-300 transition-colors">
                          Close Slot
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Applicants Panel */}
                  {expandedSlot === slot._id && (
                    <div className="border-t border-slate-700 px-4 py-3 bg-slate-950/40">
                      {!volApps[slot._id] ? (
                        <p className="text-xs text-slate-500">Loading applicants...</p>
                      ) : volApps[slot._id].length === 0 ? (
                        <p className="text-xs text-slate-500">No applications yet for this slot.</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">{volApps[slot._id].length} Applicant(s)</p>
                          {volApps[slot._id].map(app => (
                            <div key={app._id} className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                              <div>
                                <p className="text-sm font-medium text-white">{app.volunteerName}</p>
                                <p className="text-[10px] text-slate-500">
                                  {app.volunteerDistrict || 'Unknown district'}
                                  {app.message && <> · "{app.message}"</>}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                                  app.status === 'Accepted' ? 'bg-emerald-900/40 text-emerald-300 border-emerald-500/30'
                                  : app.status === 'Rejected' ? 'bg-red-900/40 text-red-400 border-red-500/30'
                                  : 'bg-amber-900/40 text-amber-300 border-amber-500/30'
                                }`}>{app.status}</span>
                                {app.status === 'Pending' && (
                                  <>
                                    <button onClick={() => handleVolRespond(slot._id, app._id, 'accept')}
                                      className="text-[10px] px-2 py-1 bg-emerald-800 hover:bg-emerald-700 rounded text-emerald-200 transition-colors">
                                      Accept
                                    </button>
                                    <button onClick={() => handleVolRespond(slot._id, app._id, 'reject')}
                                      className="text-[10px] px-2 py-1 bg-red-900 hover:bg-red-800 rounded text-red-300 transition-colors">
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
