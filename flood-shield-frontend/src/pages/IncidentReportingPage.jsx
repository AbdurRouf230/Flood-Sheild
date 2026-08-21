import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-toastify';
import { 
  AlertTriangle, 
  MapPin, 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  Eye, 
  ShieldAlert, 
  Compass, 
  Users, 
  Truck, 
  Anchor, 
  FileVideo,
  Navigation,
  RefreshCw,
  Info,
  Layers,
  ArrowRight,
  Droplet,
  Heart,
  MessageCircle,
  Globe
} from 'lucide-react';

const BANGLADESH_CENTER = [24.2, 90.3];

export default function IncidentReportingPage() {
  const { token, language, mongoUser } = useAuth();
  const { theme } = useTheme();

  // Form states
  const [title, setTitle] = useState('');
  const [district, setDistrict] = useState('Sylhet');
  const [type, setType] = useState('Flooded Road');
  const [desc, setDesc] = useState('');
  const [lat, setLat] = useState('24.8949');
  const [lng, setLng] = useState('91.8687');
  const [imageFile, setImageFile] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoName, setVideoName] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // List and filter states
  const [incidents, setIncidents] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [activeTab, setActiveTab] = useState('All'); // All, Pending, Verified, Approved, SubmitReport, Community
  const [reactions, setReactions] = useState({}); // incidentId -> count
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Leaflet form map references
  const formMapRef = useRef(null);
  const formMapInstanceRef = useRef(null);
  const formMarkerRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Translations
  const translations = {
    en: {
      pageTitle: 'Crowdsourced Flood Incident reporting',
      pageSub: 'Real-time bidirectional reporting and multi-stage verification workflow.',
      formTitle: 'Submit Emergency Report',
      formType: 'Incident Category',
      formSubject: 'Incident Title',
      formDesc: 'Situation Description',
      formCoords: 'Geographic Coordinates',
      formMedia: 'Media Attachments (Optional)',
      formImage: 'Upload Incident Photo',
      formVideo: 'Upload Incident Video',
      formMapHelper: 'Click anywhere on the map to pin coords automatically.',
      submitBtn: 'File Emergency Report',
      submitting: 'Saving report details & running YOLOv8 detection...',
      gpsBtn: 'Detect GPS',
      feedTitle: 'Verification Workflow Tracker',
      feedSub: 'Citizen → Volunteer Verification → Government Approval',
      tabAll: 'All Reports',
      tabPending: 'Pending Citizen',
      tabVerified: 'Verified Volunteer',
      tabApproved: 'Approved Govt',
      tabSubmitReport: '+ Submit Report',
      cardReported: 'Reported by',
      cardVerified: 'Verified by',
      cardApproved: 'Approved by',
      actionVerify: 'Verify Report',
      actionApprove: 'Approve & Sync GIS',
      statusPending: 'Pending',
      statusVerified: 'Verified',
      statusApproved: 'Approved & Synced',
      aiConfidence: 'AI Detections (YOLOv8)',
      aiNoDetections: 'No critical hazards detected.',
      types: {
        'Flooded Road': 'Flooded Road',
        'Dam Breach': 'Dam Breach / Levee',
        'Trapped People': 'Trapped People / SOS',
        'Shelter Need': 'Shelter Request',
        'Food Need': 'Food & Supply Need'
      },
      districts: [
        'Sylhet', 'Sunamganj', 'Kurigram', 'Jamalpur', 'Gaibandha', 
        'Bogura', 'Sirajganj', 'Netrokona', 'Dhaka', 'Chittagong'
      ]
    },
    bn: {
      pageTitle: 'ক্রাউডসোর্সড বন্যা ঘটনা রিপোর্টিং',
      pageSub: 'রিয়েল-টাইম দ্বিমুখী রিপোর্টিং এবং বহুমুখী ভেরিফিকেশন কাজের ধারা।',
      formTitle: 'জরুরি রিপোর্ট জমা দিন',
      formType: 'ঘটনার বিভাগ',
      formSubject: 'রিপোর্টের শিরোনাম',
      formDesc: 'অবস্থার বিস্তারিত বিবরণ',
      formCoords: 'ভৌগোলিক স্থানাঙ্কসমূহ',
      formMedia: 'মিডিয়া ফাইল যুক্ত করুন (ঐচ্ছিক)',
      formImage: 'ঘটনার ছবি আপলোড করুন',
      formVideo: 'ঘটনার ভিডিও আপলোড করুন',
      formMapHelper: 'স্থানাঙ্ক স্বয়ংক্রিয়ভাবে পেতে মানচিত্রের যেকোনো জায়গায় ক্লিক করুন।',
      submitBtn: 'জরুরি রিপোর্ট নথিভুক্ত করুন',
      submitting: 'রিপোর্ট সেভ হচ্ছে ও YOLOv8 রান হচ্ছে...',
      gpsBtn: 'জিপিএস সনাক্ত',
      feedTitle: 'ভেরিফিকেশন প্রগ্রেস ট্র্যাকার',
      feedSub: 'নাগরিক → স্বেচ্ছাসেবক যাচাইকরণ → সরকারি অনুমোদন',
      tabAll: 'সকল রিপোর্ট',
      tabPending: 'পেন্ডিং নাগরিক রিপোর্ট',
      tabVerified: 'যাচাইকৃত স্বেচ্ছাসেবক',
      tabApproved: 'অনুমোদিত সরকারি',
      tabSubmitReport: '+ রিপোর্ট জমা দিন',
      cardReported: 'রিপোর্টকারী',
      cardVerified: 'যাচাইকারী',
      cardApproved: 'অনুমোদনকারী',
      actionVerify: 'রিপোর্ট যাচাই করুন',
      actionApprove: 'অনুমোদন ও জিআইএস সিঙ্ক',
      statusPending: 'পেন্ডিং',
      statusVerified: 'যাচাইকৃত',
      statusApproved: 'অনুমোদিত ও সিঙ্কড',
      aiConfidence: 'এআই ডিটেকশন (YOLOv8)',
      aiNoDetections: 'কোনো ঝুঁকিপূর্ণ অবজেক্ট পাওয়া যায়নি।',
      types: {
        'Flooded Road': 'প্লাবিত সড়ক',
        'Dam Breach': 'বাঁধ ভাঙন / লিভি',
        'Trapped People': 'আটকে পড়া মানুষ / এসওএস',
        'Shelter Need': 'আশ্রয়কেন্দ্রের আবেদন',
        'Food Need': 'খাদ্য ও ত্রাণ সহায়তা'
      },
      districts: [
        'Sylhet', 'Sunamganj', 'Kurigram', 'Jamalpur', 'Gaibandha', 
        'Bogura', 'Sirajganj', 'Netrokona', 'Dhaka', 'Chittagong'
      ]
    }
  };

  const t = translations[language];

  // Helper to retrieve Lucide icons for YOLO tags
  const getTagIcon = (tag) => {
    switch (tag) {
      case 'Flood': return <Droplet className="w-3.5 h-3.5 text-flood-cyan-400" />;
      case 'Human': return <Users className="w-3.5 h-3.5 text-amber-500" />;
      case 'Vehicle': return <Truck className="w-3.5 h-3.5 text-rose-500" />;
      case 'Boat': return <Anchor className="w-3.5 h-3.5 text-teal-400" />;
      default: return <Info className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Colors mapping for severity levels
  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical': return '#ef4444'; // Red
      case 'high':
      case 'severe': return '#f97316'; // Orange
      case 'moderate': return '#eab308'; // Yellow
      default: return '#10b981'; // Green
    }
  };

  // Fetch all incidents
  const fetchIncidents = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`${API_URL}/incidents`, { headers });
      if (response.ok) {
        const data = await response.json();
        setIncidents(data);
      }
    } catch (e) {
      console.error('Failed to fetch incidents list:', e);
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchIncidents();
    }
  }, [token]);

  // Handle Geolocation in form
  const handleGPSDetect = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(6);
        const longitude = position.coords.longitude.toFixed(6);
        setLat(latitude);
        setLng(longitude);

        if (formMapInstanceRef.current && window.L) {
          formMapInstanceRef.current.setView([latitude, longitude], 12);
          updateFormMarker(latitude, longitude);
        }
      },
      (err) => console.warn('Geolocation detection blocked:', err),
      { enableHighAccuracy: true }
    );
  };

  // Update marker on form map
  const updateFormMarker = (latitude, longitude) => {
    if (!formMapInstanceRef.current || !window.L) return;
    const l = parseFloat(latitude);
    const n = parseFloat(longitude);

    if (formMarkerRef.current) {
      formMarkerRef.current.setLatLng([l, n]);
    } else {
      const formIcon = window.L.divIcon({
        className: 'custom-form-pin',
        html: `<div class="relative flex items-center justify-center">
                <span class="absolute inline-flex h-4 w-4 animate-ping rounded-full bg-red-400 opacity-75"></span>
                <div class="relative rounded-full h-3 w-3 bg-red-500 border border-white"></div>
               </div>`,
        iconSize: [16, 16]
      });
      formMarkerRef.current = window.L.marker([l, n], { icon: formIcon }).addTo(formMapInstanceRef.current);
    }
  };

  // Setup Form Leaflet Map when activeTab is SubmitReport
  useEffect(() => {
    if (activeTab !== 'SubmitReport') return;

    const timer = setTimeout(() => {
      const initFormMap = () => {
        if (typeof window === 'undefined' || !window.L || !formMapRef.current) return;

        if (formMapInstanceRef.current) {
          formMapInstanceRef.current.remove();
          formMapInstanceRef.current = null;
        }

        const map = window.L.map(formMapRef.current, {
          zoomControl: false,
          attributionControl: false
        }).setView(BANGLADESH_CENTER, 7);

        formMapInstanceRef.current = map;

        // Base layer
        const baseLayer = theme === 'dark' 
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

        window.L.tileLayer(baseLayer, { maxZoom: 19 }).addTo(map);

        // On map click, place/shift pin and update state inputs
        map.on('click', (e) => {
          const clickLat = e.latlng.lat.toFixed(6);
          const clickLng = e.latlng.lng.toFixed(6);
          setLat(clickLat);
          setLng(clickLng);
          updateFormMarker(clickLat, clickLng);
        });

        // Initial placement
        updateFormMarker(lat, lng);
        setTimeout(() => map.invalidateSize(), 150);
      };

      if (typeof window !== 'undefined') {
        if (window.L) {
          initFormMap();
        } else {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
          script.crossOrigin = '';
          script.onload = initFormMap;
          document.head.appendChild(script);
        }
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      if (formMapInstanceRef.current) {
        formMapInstanceRef.current.remove();
        formMapInstanceRef.current = null;
      }
    };
  }, [activeTab, theme]);

  // Read upload image file
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Read upload video file name (simulation)
  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoFile(file);
    setVideoName(file.name);
  };

  // Handle Form Submission
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!title || !desc || !lat || !lng) {
      setFormError('Please enter all required coordinates and text fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const response = await fetch(`${API_URL}/incidents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          district,
          type,
          desc,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          image: imageBase64 || null,
          video: videoName || null // simple mock name reference
        })
      });

      if (!response.ok) {
        throw new Error('Failed to record crowdsourced report');
      }

      // Success cleanup
      setTitle('');
      setDesc('');
      setImageFile(null);
      setImageBase64('');
      setVideoFile(null);
      setVideoName('');
      
      toast.success(language === 'en' ? 'Emergency report submitted successfully!' : 'জরুরি রিপোর্ট সফলভাবে জমা হয়েছে!');
      // Refetch and switch back to Pending tab to show new report
      fetchIncidents();
      setActiveTab('Pending');
    } catch (err) {
      setFormError(err.message || 'Server error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Workflow transition logic: Verify Incident
  const handleVerify = async (id) => {
    setActionLoadingId(id);
    try {
      const response = await fetch(`${API_URL}/incidents/${id}/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchIncidents();
      }
    } catch (e) {
      console.error('Failed to verify report:', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Workflow transition logic: Approve Incident
  const handleApprove = async (id) => {
    setActionLoadingId(id);
    try {
      const response = await fetch(`${API_URL}/incidents/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchIncidents();
      }
    } catch (e) {
      console.error('Failed to approve report:', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter lists based on selected workflow tab
  const filteredIncidents = incidents.filter(i => {
    if (activeTab === 'All') return true;
    return i.status === activeTab;
  });

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-heading m-0 flex items-center gap-2">
          <ShieldAlert className="w-7 h-7 text-red-500 animate-pulse" />
          {t.pageTitle}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">
          {t.pageSub}
        </p>
      </div>

      <div className="w-full flex flex-col gap-6">
        <div className="glass-panel p-5 border border-slate-200 dark:border-white/5 rounded-2xl bg-white/80 dark:bg-slate-900/60 shadow-md flex flex-col gap-4 min-h-[550px]">
          
          <div className="flex flex-col gap-1 border-b border-slate-200/50 dark:border-white/5 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-flood-cyan-400 font-heading m-0">
              {t.feedTitle}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">
              {t.feedSub}
            </p>
          </div>

          {/* Workflow Tab Selector Filters & Submit Report Toggle */}
          <div className="flex gap-2 border-b border-slate-200/30 dark:border-white/5 pb-2.5 overflow-x-auto select-none flex-wrap items-center">
            <button
              onClick={() => setActiveTab(activeTab === 'SubmitReport' ? 'All' : 'SubmitReport')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
                activeTab === 'SubmitReport'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white border-red-500/50 shadow-md shadow-red-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {t.tabSubmitReport || '+ Submit Report'}
            </button>

            {['All', 'Pending', 'Verified', 'Approved'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                  activeTab === tab
                    ? 'bg-slate-100 dark:bg-slate-800 text-flood-cyan-500 dark:text-flood-cyan-400 border-slate-200 dark:border-white/10 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-800/10'
                }`}
              >
                {tab === 'All' ? t.tabAll : 
                 tab === 'Pending' ? t.tabPending :
                 tab === 'Verified' ? t.tabVerified :
                 t.tabApproved}
              </button>
            ))}

            <button
              onClick={() => setActiveTab('Community')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1 ${
                activeTab === 'Community'
                  ? 'bg-rose-900/40 text-rose-400 border-rose-500/30'
                  : 'text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-800/10'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Community Feed
            </button>
          </div>

          {/* Dynamic Content: Submit Form OR Community Feed OR Incident Workflow List */}
          {activeTab === 'SubmitReport' ? (
            <div className="max-w-3xl mx-auto w-full py-2">
              <form onSubmit={handleSubmitReport} className="glass-panel p-6 border border-slate-200 dark:border-white/10 rounded-2xl bg-white/90 dark:bg-slate-900/80 shadow-xl flex flex-col gap-4">
                
                <h3 className="text-base font-bold uppercase tracking-wider text-red-400 font-heading border-b border-slate-200/50 dark:border-white/10 pb-2 mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                  {t.formTitle}
                </h3>

                {/* Select category & district */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{t.formType}</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full text-xs font-semibold px-2.5 py-2 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="Flooded Road">{t.types['Flooded Road']}</option>
                      <option value="Dam Breach">{t.types['Dam Breach']}</option>
                      <option value="Trapped People">{t.types['Trapped People']}</option>
                      <option value="Shelter Need">{t.types['Shelter Need']}</option>
                      <option value="Food Need">{t.types['Food Need']}</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">District</label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full text-xs font-semibold px-2.5 py-2 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      {t.districts.map((d, idx) => (
                        <option key={idx} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Title */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{t.formSubject}</label>
                  <input 
                    type="text"
                    placeholder="e.g. Broken embankment near Sunamganj sadar"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                    required
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{t.formDesc}</label>
                  <textarea 
                    rows="3"
                    placeholder="Detail current risk, estimated stranded people, water speed etc..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                    required
                  />
                </div>

                {/* Coords inputs & form mini map */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.formCoords}</span>
                    <button
                      type="button"
                      onClick={handleGPSDetect}
                      className="flex items-center gap-1 text-[10px] font-bold text-flood-cyan-400 hover:text-flood-cyan-300 transition-colors"
                    >
                      <Navigation className="w-3 h-3 rotate-45" />
                      {t.gpsBtn}
                    </button>
                  </div>

                  {/* Coordinates text inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="number"
                      step="0.000001"
                      placeholder="Latitude"
                      value={lat}
                      onChange={(e) => {
                        setLat(e.target.value);
                        updateFormMarker(e.target.value, lng);
                      }}
                      className="w-full text-xs font-semibold px-2.5 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                      required
                    />
                    <input 
                      type="number"
                      step="0.000001"
                      placeholder="Longitude"
                      value={lng}
                      onChange={(e) => {
                        setLng(e.target.value);
                        updateFormMarker(lat, e.target.value);
                      }}
                      className="w-full text-xs font-semibold px-2.5 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Local Form Map for automatic pin drop */}
                  <div className="w-full rounded-xl overflow-hidden border border-slate-200 dark:border-white/5 bg-slate-950 h-40 relative mt-1">
                    <div ref={formMapRef} className="w-full h-full z-10" />
                    <div className="absolute inset-0 bg-black/35 flex items-center justify-center pointer-events-none z-20 text-[9px] text-white/90 font-bold px-4 text-center">
                      {t.formMapHelper}
                    </div>
                  </div>
                </div>

                {/* Media Uploads */}
                <div className="border-t border-slate-200/50 dark:border-white/5 pt-3 mt-1 flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {t.formMedia}
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Photo upload */}
                    <div className="relative border border-dashed border-slate-300 dark:border-white/10 rounded-xl p-3 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-950/40 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      />
                      <UploadCloud className="w-6 h-6 text-slate-400" />
                      <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 mt-1 block truncate max-w-full">
                        {imageFile ? 'Photo Loaded' : t.formImage}
                      </span>
                    </div>

                    {/* Video upload */}
                    <div className="relative border border-dashed border-slate-300 dark:border-white/10 rounded-xl p-3 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-950/40 cursor-pointer">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      />
                      <FileVideo className="w-6 h-6 text-slate-400" />
                      <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 mt-1 block truncate max-w-full">
                        {videoName ? videoName : t.formVideo}
                      </span>
                    </div>
                  </div>

                  {/* Photo preview if loaded */}
                  {imageFile && (
                    <div className="w-fit border rounded-lg overflow-hidden bg-slate-950 h-16 max-w-xs self-start">
                      <img src={imageFile} alt="Preview" className="h-full w-auto object-cover" />
                    </div>
                  )}
                </div>

                {/* Error & Submit Button */}
                {formError && (
                  <div className="text-[10px] text-red-500 font-bold bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-md shadow-red-500/20 cursor-pointer disabled:opacity-50 transition-all mt-2"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2 text-white">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{t.submitting}</span>
                    </div>
                  ) : (
                    <>
                      <AlertTriangle className="w-4.5 h-4.5 animate-pulse" />
                      <span>{t.submitBtn}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : activeTab === 'Community' ? (
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[600px] pr-1.5">
              {incidents.filter(i => i.status === 'Approved').length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center gap-2 py-20 text-slate-400 text-xs text-center">
                  <Globe className="w-8 h-8 opacity-30" />
                  <span>No approved incidents in the community feed yet.</span>
                </div>
              ) : (
                incidents.filter(i => i.status === 'Approved').map(incident => (
                  <div key={incident._id} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                    {/* Post header */}
                    <div className="flex items-center gap-3 p-4 pb-2">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {incident.reportedBy?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{incident.reportedBy}</p>
                        <p className="text-xs text-slate-500">{incident.district} · {new Date(incident.reportedAt).toLocaleString()}</p>
                      </div>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium border ${
                        incident.type === 'Trapped People' ? 'text-red-400 border-red-500/30 bg-red-900/20' :
                        incident.type === 'Dam Breach' ? 'text-orange-400 border-orange-500/30 bg-orange-900/20' :
                        incident.type === 'Flooded Road' ? 'text-blue-400 border-blue-500/30 bg-blue-900/20' :
                        'text-amber-400 border-amber-500/30 bg-amber-900/20'
                      }`}>{incident.type}</span>
                    </div>
                    {/* Content */}
                    <div className="px-4 pb-3">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">{incident.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{incident.desc}</p>
                      {incident.aiTags && incident.aiTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {incident.aiTags.map((tag, i) => (
                            <span key={i} className="text-xs bg-cyan-900/30 border border-cyan-700/30 text-cyan-400 px-2 py-0.5 rounded-full">🤖 {tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Image */}
                    {incident.image && (
                      <img src={incident.image} alt="incident" className="w-full max-h-48 object-cover" />
                    )}
                    {/* Reactions */}
                    <div className="flex items-center gap-4 px-4 py-3 border-t border-slate-200/30 dark:border-white/5">
                      <button
                        onClick={() => setReactions(r => ({ ...r, [incident._id]: (r[incident._id] || 0) + 1 }))}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Heart className={`w-4 h-4 ${reactions[incident._id] > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
                        <span>{reactions[incident._id] || 0} Helpful</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : loadingFeed ? (
            <div className="flex-1 flex flex-col justify-center items-center gap-2 py-20 text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-flood-cyan-400" />
              <span>Loading live crowdsourced feed...</span>
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center gap-2 py-20 text-slate-400 text-xs text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
              <span>No active reports matching filter criteria.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[600px] pr-1.5">
              {filteredIncidents.map((incident) => {
                const severityColor = getRiskColor(incident.severity);
                const isPending = incident.status === 'Pending';
                const isVerified = incident.status === 'Verified';
                const isApproved = incident.status === 'Approved';

                const canVerify = mongoUser?.role === 'Volunteer' && isPending;
                const canApprove = mongoUser?.role === 'Government' && isVerified;

                return (
                  <div 
                    key={incident._id}
                    className="glass-panel p-4.5 rounded-xl border border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-950/30 transition-all flex flex-col gap-3"
                  >
                    {/* Top title and status badges */}
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span 
                          className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border mr-2"
                          style={{ color: severityColor, borderColor: `${severityColor}35`, backgroundColor: `${severityColor}10` }}
                        >
                          {t.types[incident.type] || incident.type}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white m-0 inline-block">
                          {incident.title}
                        </h4>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-flood-cyan-400" />
                          <span>{incident.district} ({incident.lat.toFixed(4)}, {incident.lng.toFixed(4)})</span>
                        </div>
                      </div>

                      {/* Status Label Badge */}
                      <span className={`text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider rounded-full border shrink-0 ${
                        isApproved ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                        isVerified ? 'bg-flood-blue-500/10 border-flood-blue-500/20 text-flood-blue-400' :
                        'bg-amber-500/10 border-amber-500/20 text-amber-500'
                      }`}>
                        {incident.status === 'Pending' ? t.statusPending :
                         incident.status === 'Verified' ? t.statusVerified :
                         t.statusApproved}
                      </span>
                    </div>

                    {/* Main description details */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-white/40 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200/50 dark:border-white/5 m-0 leading-relaxed">
                      {incident.desc}
                    </p>

                    {/* Attachments preview if available */}
                    {incident.image && (
                      <div className="w-2/3 border rounded-lg overflow-hidden bg-slate-950 h-28 max-w-sm">
                        <img src={incident.image} alt="Report attachment" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* AI tags classification section */}
                    <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-200/30 dark:border-white/5">
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        {t.aiConfidence}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {incident.aiTags && incident.aiTags.length > 0 ? (
                          incident.aiTags.map((tag, tIdx) => (
                            <span 
                              key={tIdx} 
                              className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-white/5 flex items-center gap-1.5"
                            >
                              {getTagIcon(tag)}
                              <span>{tag}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">{t.aiNoDetections}</span>
                        )}
                      </div>
                    </div>

                    {/* Bottom workflow metadata progress & verification controls */}
                    <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center pt-2.5 border-t border-slate-200/50 dark:border-white/5">
                      
                      {/* Reporter & Validator credentials flow chart */}
                      <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        <span>{t.cardReported}: <strong className="text-slate-700 dark:text-slate-300">{incident.reportedBy}</strong></span>
                        
                        {incident.verifiedBy && (
                          <>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t.cardVerified}: <strong className="text-flood-blue-400">{incident.verifiedBy}</strong></span>
                          </>
                        )}

                        {incident.approvedBy && (
                          <>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t.cardApproved}: <strong className="text-emerald-500">{incident.approvedBy}</strong></span>
                          </>
                        )}
                      </div>

                      {/* Control Actions buttons based on Authorization */}
                      <div className="self-end md:self-auto shrink-0">
                        {canVerify && (
                          <button
                            onClick={() => handleVerify(incident._id)}
                            disabled={actionLoadingId === incident._id}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-flood-blue-600 hover:bg-flood-blue-500 text-white cursor-pointer disabled:opacity-50 flex items-center gap-1 transition-all"
                          >
                            {actionLoadingId === incident._id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                            {t.actionVerify}
                          </button>
                        )}

                        {canApprove && (
                          <button
                            onClick={() => handleApprove(incident._id)}
                            disabled={actionLoadingId === incident._id}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer disabled:opacity-50 flex items-center gap-1 transition-all"
                          >
                            {actionLoadingId === incident._id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            {t.actionApprove}
                          </button>
                        )}
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
