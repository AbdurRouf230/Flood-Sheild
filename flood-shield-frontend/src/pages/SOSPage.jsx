import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, Send, MapPin, Phone, UserCheck, MessageSquare, 
  Clock, Compass, Radio, Image as ImageIcon, UploadCloud, RefreshCw, X, ChevronRight, CheckCircle2, Navigation
} from 'lucide-react';
import { toast } from 'react-toastify';

function calcDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}

const DISTRICTS = ['Sylhet', 'Sunamganj', 'Kurigram', 'Gaibandha', 'Netrokona', 'Sirajganj', 'Jamalpur', 'Bogura', 'Dhaka', 'Chittagong'];

export default function SOSPage() {
  const { token, mongoUser } = useAuth();
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [sosList, setSosList] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [selectedVolUid, setSelectedVolUid] = useState(null);
  const [selectedSosId, setSelectedSosId] = useState(null);

  // Form state
  const [district, setDistrict] = useState(mongoUser?.district || 'Sylhet');
  const [villageName, setVillageName] = useState('');
  const [latitude, setLatitude] = useState('24.9020');
  const [longitude, setLongitude] = useState('91.8820');
  const [phone, setPhone] = useState(mongoUser?.phone || '+8801711223344');
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState('Critical');
  const [imageBase64, setImageBase64] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);

  // Chat message state
  const [chatText, setChatText] = useState('');
  const [chatImageBase64, setChatImageBase64] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [panelTab, setPanelTab] = useState('sos');

  const mapRef = useRef(null);            // Leaflet map instance — created once, never destroyed on re-render
  const markersLayerRef = useRef(null);   // LayerGroup for all markers+lines — cleared and redrawn on data change
  const lastFingerprintRef = useRef(''); // JSON fingerprint of last rendered dispatches — skip redraw if unchanged
  const chatPaneRef = useRef(null);

  const activeSos = sosList.find(s => String(s._id) === String(selectedSosId)) || sosList[0] || null;
  const selectedVol = volunteers.find(v => v.uid === selectedVolUid) || volunteers[0] || null;

  // ── Render/Update Leaflet Radar Map for Citizen ────────────────────────────
  // Initializes Leaflet map as soon as container & activeSos exist, and updates markers when data changes.
  useEffect(() => {
    if (panelTab !== 'sos') {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
        lastFingerprintRef.current = '';
      }
      return;
    }
    if (!activeSos) return;

    if (!document.getElementById('leaflet-css-link')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-link';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const initOrUpdateMap = () => {
      const container = document.getElementById('citizen-sos-radar-map');
      if (!window.L || !container) return;

      const cLat = activeSos.latitude || 24.9020;
      const cLon = activeSos.longitude || 91.8820;

      // Initialize map instance ONCE when container mounts
      if (!mapRef.current) {
        const map = window.L.map('citizen-sos-radar-map', {
          center: [cLat, cLon],
          zoom: 14,
          scrollWheelZoom: true,
          zoomControl: true
        });
        mapRef.current = map;

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        markersLayerRef.current = window.L.layerGroup().addTo(map);
        setTimeout(() => { map.invalidateSize(); }, 300);
      }

      if (!markersLayerRef.current) return;

      // Fingerprint check to skip redundant redrawing on poll ticks
      const dispatches = activeSos.dispatches || [];
      const fingerprint = JSON.stringify({
        sosId: activeSos._id,
        cLat, cLon,
        dispatches: dispatches.map(d => `${d.dispatchType}:${d.volunteerUid}:${d.latitude}:${d.longitude}`),
        legacyVol: `${activeSos.volunteerLatitude}:${activeSos.assignedVolunteerName}`
      });

      if (fingerprint === lastFingerprintRef.current) return;
      lastFingerprintRef.current = fingerprint;

      // Clear previous markers & redraw
      markersLayerRef.current.clearLayers();
      const layer = markersLayerRef.current;

      // Citizen Marker (Red 🚨)
      const citizenIcon = window.L.divIcon({
        className: 'custom-sos-marker',
        html: `<div style="background:#ef4444;width:34px;height:34px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 0 15px #ef4444;color:white;font-size:16px;">🚨</div>`,
        iconSize: [34, 34], iconAnchor: [17, 17]
      });
      window.L.marker([cLat, cLon], { icon: citizenIcon })
        .addTo(layer)
        .bindPopup(`<b>🔴 Your Distress GPS Location</b><br/>Name: ${activeSos.citizenName}<br/>Phone: ${activeSos.citizenPhone || 'N/A'}`);

      // Render Dispatched markers
      if (dispatches.length > 0) {
        dispatches.forEach(d => {
          if (!d.latitude || !d.longitude) return;

          if (d.dispatchType === 'Group' && d.logoUrl) {
            const teamIcon = window.L.divIcon({
              className: 'custom-team-logo-marker',
              html: `<div style="width:42px;height:42px;border-radius:50%;overflow:hidden;border:3px solid #3b82f6;box-shadow:0 0 16px rgba(59,130,246,0.8);background:#1e3a5f;"><img src="${d.logoUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentNode.innerHTML='<span style=color:white;font-size:18px>🏥</span>'"/></div>`,
              iconSize: [42, 42], iconAnchor: [21, 21]
            });
            window.L.marker([d.latitude, d.longitude], { icon: teamIcon })
              .addTo(layer)
              .bindPopup(`<b style="color:#3b82f6;">🏥 ${d.groupName || 'Rescue Team'}</b><br/>Going to: ${activeSos.citizenName}<br/>Leader: ${d.volunteerName || 'N/A'}<br/>Members: ${d.teamMembers?.length || 1}<br/>Distance: ${calcDistanceKm(cLat, cLon, d.latitude, d.longitude) || 'N/A'} km`);
            const gLine = window.L.polyline([[cLat, cLon], [d.latitude, d.longitude]], { color: '#3b82f6', weight: 2.5, dashArray: '6,8' }).addTo(layer);
            const gDist = calcDistanceKm(cLat, cLon, d.latitude, d.longitude);
            if (gDist) gLine.bindTooltip(`${gDist} km`, { permanent: true, direction: 'center' });

          } else if (d.dispatchType === 'Group') {
            const teamIcon = window.L.divIcon({
              className: 'custom-team-marker',
              html: `<div style="background:#3b82f6;width:38px;height:38px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px #3b82f6;color:white;font-size:18px;">🏥</div>`,
              iconSize: [38, 38], iconAnchor: [19, 19]
            });
            window.L.marker([d.latitude, d.longitude], { icon: teamIcon })
              .addTo(layer)
              .bindPopup(`<b style="color:#3b82f6;">🏥 ${d.groupName || 'Rescue Team'}</b><br/>Going to: ${activeSos.citizenName}<br/>Leader: ${d.volunteerName || 'N/A'}<br/>Phone: ${d.volunteerPhone || 'N/A'}<br/>Distance: ${calcDistanceKm(cLat, cLon, d.latitude, d.longitude) || 'N/A'} km`);
            const gLine2 = window.L.polyline([[cLat, cLon], [d.latitude, d.longitude]], { color: '#3b82f6', weight: 2.5, dashArray: '6,8' }).addTo(layer);
            const gDist2 = calcDistanceKm(cLat, cLon, d.latitude, d.longitude);
            if (gDist2) gLine2.bindTooltip(`${gDist2} km`, { permanent: true, direction: 'center' });

          } else {
            const volIcon = window.L.divIcon({
              className: 'custom-vol-marker',
              html: `<div style="background:#eab308;width:36px;height:36px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px #eab308;color:white;font-size:16px;">🛸</div>`,
              iconSize: [36, 36], iconAnchor: [18, 18]
            });
            window.L.marker([d.latitude, d.longitude], { icon: volIcon })
              .addTo(layer)
              .bindPopup(`<b style="color:#eab308;">🛸 Volunteer En-Route</b><br/>Name: ${d.volunteerName || 'Volunteer'}<br/>Going to: ${activeSos.citizenName}<br/>Phone: ${d.volunteerPhone || 'N/A'}<br/>Distance: ${calcDistanceKm(cLat, cLon, d.latitude, d.longitude) || 'N/A'} km`);
            const vLine = window.L.polyline([[cLat, cLon], [d.latitude, d.longitude]], { color: '#eab308', weight: 2.5, dashArray: '6,8' }).addTo(layer);
            const vDist = calcDistanceKm(cLat, cLon, d.latitude, d.longitude);
            if (vDist) vLine.bindTooltip(`${vDist} km`, { permanent: true, direction: 'center' });
          }
        });
      } else if (activeSos.volunteerLatitude && activeSos.assignedVolunteerName) {
        const legIcon = window.L.divIcon({
          className: 'custom-vol-marker',
          html: `<div style="background:#eab308;width:36px;height:36px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px #eab308;color:white;font-size:16px;">🛸</div>`,
          iconSize: [36, 36], iconAnchor: [18, 18]
        });
        window.L.marker([activeSos.volunteerLatitude, activeSos.volunteerLongitude], { icon: legIcon })
          .addTo(layer)
          .bindPopup(`<b style="color:#f97316;">🛩 ${activeSos.assignedVolunteerName}</b><br/>Phone: ${activeSos.assignedVolunteerPhone || 'N/A'}`);
        window.L.polyline([[cLat, cLon], [activeSos.volunteerLatitude, activeSos.volunteerLongitude]], { color: '#f97316', weight: 2.5, dashArray: '6,8' }).addTo(layer);
      }
    };

    if (window.L) {
      initOrUpdateMap();
    } else {
      let script = document.getElementById('leaflet-js-script');
      if (!script) {
        script = document.createElement('script');
        script.id = 'leaflet-js-script';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => initOrUpdateMap();
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', initOrUpdateMap);
      }
    }
  }, [activeSos, panelTab]); // map only lives on the SOS tab


  const fetchData = async () => {
    if (!token) return;
    try {
      const [resSos, resVol] = await Promise.all([
        fetch(`${API}/sos`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/sos/volunteers`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (resSos.ok) {
        const d = await resSos.json();
        setSosList(d);
        if (d.length > 0 && !selectedSosId) setSelectedSosId(d[0]._id);
      }
      if (resVol.ok) {
        const v = await resVol.json();
        setVolunteers(v);
        if (v.length > 0 && !selectedVolUid) setSelectedVolUid(v[0].uid);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    // Poll every 10 seconds — map markers use fingerprint comparison so they only
    // redraw when dispatch data actually changes, not on every poll tick
    const timer = setInterval(fetchData, 10000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Auto detect GPS Location
  const handleDetectLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported by your browser.');
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(4));
        setLongitude(pos.coords.longitude.toFixed(4));
        setDetectingLoc(false);
        toast.success(`📍 GPS Acquired: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      (err) => { setDetectingLoc(false); toast.error('GPS Detection failed.'); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Convert File to Base64
  const handleImageFileChange = (e, setImageState) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB.');
    const reader = new FileReader();
    reader.onloadend = () => setImageState(reader.result);
    reader.readAsDataURL(file);
  };

  // Submit SOS Distress Signal
  const handleSubmitSOS = async (e) => {
    e.preventDefault();
    if (!latitude || !longitude) return toast.error('GPS location coordinates required.');
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          district,
          villageName: villageName.trim(),
          message: message.trim() || '🔴 Emergency SOS: Urgent Rescue Boat Required!',
          urgency,
          phone,
          imageUrl: imageBase64
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('🚨 SOS Submitted! Dispatched to Volunteer Rescue Panel.');
        setMessage('');
        setImageBase64('');
        fetchData();
        if (data.sos?._id) setSelectedSosId(data.sos._id);
      } else {
        toast.error(data.message || 'Failed to submit SOS.');
      }
    } catch (e) { toast.error('Server error submitting SOS.'); }
    setSubmitting(false);
  };

  // Post Direct Chat Message to Volunteer
  const handleSendChatMessage = async (presetText = '') => {
    const textToSend = presetText || chatText.trim();
    if ((!textToSend && !chatImageBase64) || !activeSos) return;
    setSendingMsg(true);
    try {
      const res = await fetch(`${API}/sos/${activeSos._id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          text: textToSend,
          imageUrl: chatImageBase64
        })
      });
      if (res.ok) {
        setChatText('');
        setChatImageBase64('');
        fetchData();
      }
    } catch (e) { console.error(e); }
    setSendingMsg(false);
  };

  useEffect(() => {
    if (panelTab !== 'chat') return;
    if (chatPaneRef.current) {
      chatPaneRef.current.scrollTop = chatPaneRef.current.scrollHeight;
    }
  }, [activeSos?.messages, selectedSosId, panelTab]);

  // Calculate distance between Citizen SOS and each Volunteer
  const sortedVolunteers = volunteers.map(v => {
    const dist = calcDistanceKm(
      parseFloat(latitude),
      parseFloat(longitude),
      v.latitude,
      v.longitude
    );
    return { ...v, dist };
  }).sort((a, b) => (a.dist || 999) - (b.dist || 999));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full text-xs font-semibold text-red-400">
            <Radio className="w-3.5 h-3.5 text-red-400 animate-ping" />
            Citizen Emergency Portal
          </div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-red-500" /> SOS Emergency Panel
          </h1>
          <p className="text-xs text-slate-400">
            Submit an emergency distress signal to the Volunteer Rescue Panel. Select closest volunteer teams to chat & send photo proof.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="self-start md:self-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-2 cursor-pointer">
          <RefreshCw className="w-4 h-4" /> Refresh Status
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-800 pb-2.5 overflow-x-auto select-none flex-wrap items-center">
        <button
          type="button"
          onClick={() => setPanelTab('sos')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
            panelTab === 'sos'
              ? 'bg-slate-800 text-cyan-400 border-white/10 shadow-sm'
              : 'text-slate-400 border-transparent hover:bg-slate-800/40'
          }`}
        >
          <Radio className="w-3.5 h-3.5" /> SOS
        </button>
        <button
          type="button"
          onClick={() => setPanelTab('chat')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
            panelTab === 'chat'
              ? 'bg-slate-800 text-cyan-400 border-white/10 shadow-sm'
              : 'text-slate-400 border-transparent hover:bg-slate-800/40'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> Chat
        </button>
      </div>

      {panelTab === 'sos' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN (4 Cols): CITIZEN SOS SUBMISSION FORM */}
        <div className="lg:col-span-5 bg-gradient-to-br from-red-950/40 via-slate-900 to-slate-900 border-2 border-red-500/40 rounded-3xl p-6 space-y-5 shadow-2xl">
          <h2 className="text-base font-extrabold text-red-400 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" /> Submit SOS Distress Signal
          </h2>

          <form onSubmit={handleSubmitSOS} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-bold mb-1.5 block">District</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500">
                  {DISTRICTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-300 font-bold mb-1.5 block">Village / Landmark</label>
                <input
                  type="text"
                  value={villageName}
                  onChange={(e) => setVillageName(e.target.value)}
                  placeholder="E.g., Gowainghat River Bank"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* GPS Location & Auto Detect */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-slate-300 font-bold">GPS Coordinates (Lat / Lon)</label>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={detectingLoc}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer">
                  <Compass className={`w-3.5 h-3.5 ${detectingLoc ? 'animate-spin' : ''}`} /> Auto Detect GPS
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="Lat (e.g. 24.9020)"
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
                />
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="Lon (e.g. 91.8820)"
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-bold mb-1.5 block">Contact Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+88017..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold mb-1.5 block">Distress Message</label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your distress (e.g., Water rising rapidly, family stranded on roof, elderly patient needs boat evacuation)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500 resize-none"
              />
            </div>

            {/* Attach Photo Proof */}
            <div>
              <label className="text-slate-300 font-bold mb-1.5 block flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-cyan-400" /> Attach Emergency Photo Proof (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageFileChange(e, setImageBase64)}
                className="w-full text-slate-400 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
              {imageBase64 && (
                <div className="mt-2 relative w-24 h-24 rounded-xl overflow-hidden border border-slate-700">
                  <img src={imageBase64} alt="Distress preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageBase64('')}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 transition cursor-pointer text-sm">
              <Radio className="w-4 h-4 animate-ping" />
              {submitting ? 'Submitting SOS...' : '🚨 SUBMIT SOS TO RESCUE PANEL'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN (7 Cols): CLOSEST VOLUNTEERS ROW + DIRECT CHAT */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SECTION 1: CLOSEST VOLUNTEERS LIST (SHOWED IN A ROW) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" /> Closest Volunteer Rescue Teams ({sortedVolunteers.length})
              </h3>
              <span className="text-[11px] text-slate-400">Ranked by nearest GPS distance</span>
            </div>

            {/* Horizontal Scroll Row of Volunteers */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
              {sortedVolunteers.map((vol) => {
                const isSelected = vol.uid === selectedVolUid;
                return (
                  <div
                    key={vol.uid}
                    onClick={() => setSelectedVolUid(vol.uid)}
                    className={`shrink-0 w-64 p-4 rounded-2xl border text-left transition cursor-pointer space-y-2 ${isSelected ? 'bg-emerald-950/40 border-emerald-500/80 shadow-lg shadow-emerald-950/50' : 'bg-slate-950/80 border-slate-800 hover:bg-slate-900'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {vol.name}
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                        📍 {vol.dist !== null ? `${vol.dist} km` : 'Near'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-0.5">
                      <p className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-500" /> {vol.district} ({vol.orgName || 'Disaster Squad'})</p>
                      <p className="flex items-center gap-1 text-slate-300"><Phone className="w-3 h-3 text-emerald-400" /> {vol.phone}</p>
                    </div>

                    <button
                      type="button"
                      className={`w-full mt-1 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                      <MessageSquare className="w-3 h-3" /> {isSelected ? 'Chat Active' : 'Select & Message'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: LIVE DISPATCHED VOLUNTEER RADAR MAP + DIRECT MESSAGE CHAT */}
          {activeSos ? (
            <div className="space-y-6">
              
              {/* Live Dispatched Rescue Teams Radar Map */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-cyan-400" /> Dispatched Rescue Teams Live Location Radar
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Track all rescue teams and volunteers moving towards your distress location.
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${activeSos.status === 'Volunteer Dispatched' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                    {activeSos.status === 'Volunteer Dispatched' ? '🛸 Dispatched En-Route' : '⌛ Awaiting Rescue Team'}
                  </span>
                </div>

                {/* Dispatched Teams / Volunteers Info Cards */}
                {(() => {
                  const dispatches = activeSos.dispatches || [];
                  const legacyDispatched = (!dispatches.length && activeSos.assignedVolunteerName)
                    ? [{ dispatchType: 'Single', volunteerName: activeSos.assignedVolunteerName, volunteerPhone: activeSos.assignedVolunteerPhone, latitude: activeSos.volunteerLatitude, longitude: activeSos.volunteerLongitude }]
                    : [];
                  const allDispatches = [...dispatches, ...legacyDispatched];

                  if (allDispatches.length === 0) {
                    return (
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center text-xs text-slate-500">
                        No rescue team dispatched yet. Awaiting response...
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                        {allDispatches.length} rescue unit{allDispatches.length > 1 ? 's' : ''} en-route to your location:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {allDispatches.map((d, i) => {
                          const dist = calcDistanceKm(activeSos.latitude, activeSos.longitude, d.latitude, d.longitude);
                          const isGroup = d.dispatchType === 'Group';
                          return (
                            <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs ${isGroup ? 'bg-blue-950/40 border-blue-800/60' : 'bg-orange-950/30 border-orange-800/50'}`}>
                              {isGroup ? (
                                d.logoUrl
                                  ? <img src={d.logoUrl} alt="team logo" className="w-8 h-8 rounded-full object-cover border-2 border-blue-500 shrink-0" />
                                  : <span className="text-blue-400 text-lg shrink-0">🏥</span>
                              ) : (
                                <span className="text-orange-400 text-lg shrink-0">🛩</span>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-white truncate">
                                  {isGroup ? (d.groupName || 'Rescue Team') : (d.volunteerName || 'Volunteer')}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {isGroup ? `${d.teamMembers?.length || 1} member${(d.teamMembers?.length || 1) > 1 ? 's' : ''}` : 'Single Volunteer'}
                                  {dist ? ` • ${dist} km` : ''}
                                </p>
                              </div>
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${isGroup ? 'bg-blue-900 text-blue-300' : 'bg-orange-900 text-orange-300'}`}>
                                {isGroup ? 'TEAM' : 'SOLO'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Your GPS info */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Your Distress GPS</span>
                  <span className="text-xs font-bold text-red-400">{activeSos.latitude?.toFixed(4)}, {activeSos.longitude?.toFixed(4)}</span>
                </div>

                {/* Map Legend */}
                <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
                  <span>🚨 = Your SOS location</span>
                  <span>🛩 = Volunteer en-route (orange)</span>
                  <span>🏥 = Rescue Team (blue)</span>
                </div>

                {/* Leaflet Map Canvas */}
                <div className="w-full h-64 rounded-2xl border border-slate-800 overflow-hidden relative" id="citizen-sos-radar-map"></div>
              </div>
          </div>
        ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-500 text-xs">
              Submit your SOS above to connect with the closest volunteer teams. Then open the Chat tab to message them.
            </div>
          )}
        </div>
      </div>
      )}

      {panelTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col gap-3 h-[650px]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-red-500" /> SOS Contacts
            </h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {sosList.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-6 text-center">No SOS chats yet. Submit an SOS first.</p>
              ) : sosList.map((sos) => {
                const isSelected = String(sos._id) === String(selectedSosId);
                return (
                  <button
                    key={sos._id}
                    type="button"
                    onClick={() => setSelectedSosId(sos._id)}
                    className={`w-full text-left p-3 rounded-xl border text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/40'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-bold text-white truncate">{sos.assignedVolunteerName || sos.villageName || 'My SOS'}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">{sos.district} · {sos.status}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[650px] relative">
            {activeSos ? (
              <>
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-400 text-white">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white m-0">
                        Direct Rescue Chat with {activeSos.assignedVolunteerName || selectedVol?.name || 'Volunteer Rescue Squad'}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        District: <strong className="text-white">{activeSos.district || district}</strong>
                        {' | '}
                        Connected: <strong className="text-emerald-400">{activeSos.assignedVolunteerName || selectedVol?.name || 'Awaiting volunteer'}</strong>
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${activeSos.status === 'Volunteer Dispatched' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'}`}>
                    {activeSos.status}
                  </span>
                </div>

                <div ref={chatPaneRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                  {!activeSos.messages || activeSos.messages.length === 0 ? (
                    <div className="flex-1 flex flex-col justify-center items-center text-center gap-2 text-slate-500">
                      <MessageSquare className="w-14 h-14 text-slate-700" />
                      <p className="text-xs">No messages yet. Send a rescue update or photo below.</p>
                    </div>
                  ) : (
                    activeSos.messages.map((m, idx) => {
                      const isSystem = /dispatched to your SOS|dispatched to your location|withdrew from this SOS|no longer en-route/i.test(m.text || '');
                      if (isSystem) {
                        const isWithdraw = /withdrew|no longer en-route/i.test(m.text || '');
                        return (
                          <div key={idx} className="self-center max-w-[90%]">
                            <div className={`px-4 py-2.5 rounded-2xl text-[11px] text-center leading-relaxed ${isWithdraw ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-emerald-950/80 text-emerald-200 border border-emerald-800'}`}>
                              {m.text}
                            </div>
                          </div>
                        );
                      }
                      const isSelf = m.senderUid === mongoUser?.uid || m.senderRole === 'Citizen';
                      return (
                        <div key={idx} className={`flex flex-col max-w-[85%] ${isSelf ? 'self-end items-end' : 'self-start items-start'}`}>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                            <span className="font-semibold text-slate-200">{m.senderName}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isSelf ? 'bg-red-950 text-red-300' : 'bg-emerald-950 text-emerald-300'}`}>
                              {m.senderRole}
                            </span>
                            <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className={`px-4 py-3 rounded-3xl text-sm space-y-2 ${isSelf ? 'bg-gradient-to-br from-cyan-700 to-emerald-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700'}`}>
                            {m.text && <p className="text-xs leading-relaxed whitespace-pre-line">{m.text}</p>}
                            {m.imageUrl && (
                              <img src={m.imageUrl} alt="Chat attachment" className="w-56 h-40 object-cover rounded-xl border border-white/20" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      '📍 This is my exact location — please come quickly.',
                      '🆘 I am with family members and need boat rescue.',
                      '📷 Sending a photo of the water level.',
                      '🙏 We can see you on the map. Thank you.'
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendChatMessage(chip)}
                        className="text-[10px] py-1 px-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition cursor-pointer"
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                  {chatImageBase64 && (
                    <div className="relative inline-block border border-slate-700 rounded-xl overflow-hidden">
                      <img src={chatImageBase64} alt="Chat upload preview" className="w-20 h-20 object-cover" />
                      <button
                        type="button"
                        onClick={() => setChatImageBase64('')}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <label className="px-3.5 py-3 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition">
                      <ImageIcon className="w-4 h-4 text-cyan-400" /> Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageFileChange(e, setChatImageBase64)}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={chatText}
                      onChange={(e) => setChatText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                      placeholder="Type rescue update or send photo to volunteer..."
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendChatMessage()}
                      disabled={sendingMsg || (!chatText.trim() && !chatImageBase64)}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs p-8">
                Submit an SOS on the SOS tab, then select it here to chat with your rescue team.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
