import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, Send, MapPin, Phone, UserCheck, MessageSquare, 
  CheckCircle2, Clock, Navigation, Radio, AlertCircle, RefreshCw, XCircle, HeartHandshake, Compass, Check
} from 'lucide-react';
import { toast } from 'react-toastify';

// Haversine formula to compute distance in km between 2 lat/lon points
function calcDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

const DISTRICTS = ['Sylhet', 'Sunamganj', 'Kurigram', 'Gaibandha', 'Netrokona', 'Sirajganj', 'Jamalpur', 'Bogura', 'Dhaka', 'Chittagong'];

export default function SOSRadarPanel() {
  const { token, mongoUser } = useAuth();
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const isVolunteer = mongoUser?.role === 'Volunteer' || mongoUser?.role === 'NGORepresentative' || mongoUser?.role === 'GovRepresentative';
  const isCitizen = !isVolunteer || mongoUser?.role === 'Citizen';

  const [sosList, setSosList] = useState([]);
  const [selectedSosId, setSelectedSosId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Citizen SOS Trigger Form states
  const [citizenDistrict, setCitizenDistrict] = useState(mongoUser?.district || 'Sylhet');
  const [citizenVillage, setCitizenVillage] = useState('');
  const [citizenLat, setCitizenLat] = useState('24.9020');
  const [citizenLon, setCitizenLon] = useState('91.8820');
  const [citizenPhone, setCitizenPhone] = useState(mongoUser?.phone || '');
  const [sosMessage, setSosMessage] = useState('');
  const [sosUrgency, setSosUrgency] = useState('Critical');
  const [triggering, setTriggering] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);

  // Chat message input
  const [chatText, setChatText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Volunteer Live GPS location state
  const [volLat, setVolLat] = useState('24.8960');
  const [volLon, setVolLon] = useState('91.8740');

  // Leaflet map reference
  const mapRef = useRef(null);

  const fetchSOSList = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/sos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSosList(data);
        if (data.length > 0 && !selectedSosId) {
          setSelectedSosId(data[0]._id);
        }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    fetchSOSList();
    const interval = setInterval(fetchSOSList, 6000); // Polling every 6s for live location & chat
    return () => clearInterval(interval);
  }, [token]);

  const activeSos = sosList.find(s => String(s._id) === String(selectedSosId)) || sosList[0] || null;

  // Auto detect citizen location
  const handleDetectLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation is not supported by your browser.');
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCitizenLat(pos.coords.latitude.toFixed(4));
        setCitizenLon(pos.coords.longitude.toFixed(4));
        setDetectingLoc(false);
        toast.success(`📍 GPS Location acquired: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      (err) => { setDetectingLoc(false); toast.error('GPS detection failed. Using map coordinates.'); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Trigger SOS Distress Signal
  const handleTriggerSOS = async (e) => {
    e.preventDefault();
    if (!citizenLat || !citizenLon) return toast.error('GPS location coordinates required.');
    setTriggering(true);
    try {
      const res = await fetch(`${API}/sos/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          latitude: parseFloat(citizenLat),
          longitude: parseFloat(citizenLon),
          district: citizenDistrict,
          villageName: citizenVillage.trim(),
          message: sosMessage.trim() || '🔴 Emergency SOS: Urgent Rescue Boat & Medical Evacuation Required!',
          urgency: sosUrgency,
          phone: citizenPhone.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('🚨 SOS Emergency Signal Broadcasted to Nearest Volunteer Groups!');
        setSosMessage('');
        fetchSOSList();
        if (data.sos?._id) setSelectedSosId(data.sos._id);
      } else {
        toast.error(data.message || 'Failed to trigger SOS.');
      }
    } catch (e) { toast.error('Server error triggering SOS.'); }
    setTriggering(false);
  };

  // Volunteer accepts SOS
  const handleRespondSOS = async (sosId) => {
    try {
      const res = await fetch(`${API}/sos/${sosId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          latitude: parseFloat(volLat),
          longitude: parseFloat(volLon),
          phone: mongoUser?.phone || '+8801811998877'
        })
      });
      if (res.ok) {
        toast.success('🛸 Rescue Team Dispatched! Live radar & message chat connected with Citizen.');
        fetchSOSList();
      } else {
        const d = await res.json();
        toast.error(d.message || 'Failed to dispatch rescue.');
      }
    } catch (e) { toast.error('Server error dispatching rescue.'); }
  };

  // Post Chat Message
  const handleSendChatMessage = async (presetText = '') => {
    const textToSend = presetText || chatText.trim();
    if (!textToSend || !activeSos) return;
    setSendingMsg(true);
    try {
      const res = await fetch(`${API}/sos/${activeSos._id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: textToSend })
      });
      if (res.ok) {
        setChatText('');
        fetchSOSList();
      }
    } catch (e) { console.error(e); }
    setSendingMsg(false);
  };

  // Render Leaflet Map for Active SOS Session
  useEffect(() => {
    if (!activeSos) return;
    const container = document.getElementById('sos-radar-map');
    if (!container) return;

    if (!document.getElementById('leaflet-css-link')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-link';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!window.L || !document.getElementById('sos-radar-map')) return;

      const cLat = activeSos.latitude;
      const cLon = activeSos.longitude;
      const vLat = activeSos.volunteerLatitude || (cLat - 0.006);
      const vLon = activeSos.volunteerLongitude || (cLon - 0.008);

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = window.L.map('sos-radar-map', { center: [cLat, cLon], zoom: 14 });
      mapRef.current = map;

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Citizen Marker (Red)
      const citizenIcon = window.L.divIcon({
        className: 'custom-sos-marker',
        html: `<div style="background:#ef4444; width:34px; height:34px; border-radius:50%; border:3px solid white; display:flex; align-items:center; justify-content:center; box-shadow:0 0 15px #ef4444; color:white; font-weight:bold; font-size:16px;">🚨</div>`,
        iconSize: [34, 34], iconAnchor: [17, 17]
      });
      window.L.marker([cLat, cLon], { icon: citizenIcon })
        .addTo(map)
        .bindPopup(`<b>🔴 Citizen Distress Location</b><br/>Name: ${activeSos.citizenName}<br/>Phone: ${activeSos.citizenPhone || 'N/A'}<br/>Notes: ${activeSos.message}`)
        .openPopup();

      // Volunteer Marker if Dispatched (Green)
      if (activeSos.assignedVolunteerName || activeSos.volunteerLatitude) {
        const volIcon = window.L.divIcon({
          className: 'custom-vol-marker',
          html: `<div style="background:#10b981; width:34px; height:34px; border-radius:50%; border:3px solid white; display:flex; align-items:center; justify-content:center; box-shadow:0 0 15px #10b981; color:white; font-weight:bold; font-size:16px;">🛸</div>`,
          iconSize: [34, 34], iconAnchor: [17, 17]
        });
        window.L.marker([vLat, vLon], { icon: volIcon })
          .addTo(map)
          .bindPopup(`<b>🟢 Rescue Volunteer Team</b><br/>Team: ${activeSos.assignedVolunteerName || 'Volunteer Group'}<br/>Phone: ${activeSos.assignedVolunteerPhone || 'N/A'}`);

        // Draw Distance Line
        window.L.polyline([[cLat, cLon], [vLat, vLon]], {
          color: '#38bdf8', weight: 3, dashArray: '6, 8'
        }).addTo(map);
      }

      setTimeout(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      }, 250);
    };

    if (window.L) {
      initMap();
    } else {
      let script = document.getElementById('leaflet-js-script');
      if (!script) {
        script = document.createElement('script');
        script.id = 'leaflet-js-script';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => initMap();
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', initMap);
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [activeSos]);

  const distanceInKm = activeSos ? calcDistanceKm(
    activeSos.latitude,
    activeSos.longitude,
    activeSos.volunteerLatitude || (activeSos.latitude - 0.006),
    activeSos.volunteerLongitude || (activeSos.longitude - 0.008)
  ) : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-2xl">
      
      {/* Title & Status Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full text-xs font-semibold text-red-400">
            <Radio className="w-3.5 h-3.5 text-red-400 animate-ping" />
            Citizen SOS & Live Volunteer Rescue Radar
          </div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-red-500" /> SOS Emergency Dispatch & Direct Chat
          </h2>
          <p className="text-xs text-slate-400">
            Citizens can broadcast instant rescue distress signals to nearest Volunteer groups. Both parties track live GPS radar & communicate via real-time text chat.
          </p>
        </div>

        <button
          onClick={fetchSOSList}
          className="self-start md:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-2 cursor-pointer">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh SOS Radar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT COLUMN: CITIZEN TRIGGER FORM & ACTIVE ALERTS LIST */}
        <div className="space-y-5">
          {/* Citizen Emergency Trigger Form */}
          <div className="bg-gradient-to-br from-red-950/40 via-slate-950 to-slate-950 border-2 border-red-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" /> Citizen Emergency SOS Trigger
            </h3>

            <form onSubmit={handleTriggerSOS} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">District</label>
                  <select
                    value={citizenDistrict}
                    onChange={(e) => setCitizenDistrict(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500">
                    {DISTRICTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Village / Area</label>
                  <input
                    type="text"
                    value={citizenVillage}
                    onChange={(e) => setCitizenVillage(e.target.value)}
                    placeholder="E.g., Gowainghat River Bank"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Coordinates & GPS Auto Detect */}
              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400 font-semibold">GPS Coordinates (Lat / Lon)</label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLoc}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer">
                    <Compass className={`w-3 h-3 ${detectingLoc ? 'animate-spin' : ''}`} /> Auto Detect GPS
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={citizenLat}
                    onChange={(e) => setCitizenLat(e.target.value)}
                    placeholder="Lat (e.g. 24.9020)"
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                  <input
                    type="text"
                    value={citizenLon}
                    onChange={(e) => setCitizenLon(e.target.value)}
                    placeholder="Lon (e.g. 91.8820)"
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Contact Phone Number</label>
                <input
                  type="text"
                  value={citizenPhone}
                  onChange={(e) => setCitizenPhone(e.target.value)}
                  placeholder="+88017..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Distress Situation & Urgent Need</label>
                <textarea
                  rows={2}
                  value={sosMessage}
                  onChange={(e) => setSosMessage(e.target.value)}
                  placeholder="E.g., Water rising rapidly, family stranded on roof, urgent boat & medical evacuation required!"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={triggering}
                className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition cursor-pointer">
                <Radio className="w-4 h-4 animate-ping" />
                {triggering ? 'Broadcasting SOS...' : '🚨 BROADCAST EMERGENCY SOS NOW'}
              </button>
            </form>
          </div>

          {/* Active SOS Session Feed List */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-red-400" /> Live District SOS Radar Feed ({sosList.length})
            </h3>

            {sosList.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No active SOS signals reported in your district.</p>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {sosList.map(sos => {
                  const isSelected = String(sos._id) === String(selectedSosId);
                  return (
                    <div
                      key={sos._id}
                      onClick={() => setSelectedSosId(sos._id)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer text-xs space-y-1.5 ${isSelected ? 'bg-red-950/40 border-red-500/60 shadow-md shadow-red-950/40' : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900/60'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                          {sos.citizenName}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sos.status === 'Volunteer Dispatched' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'}`}>
                          {sos.status}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] line-clamp-2">{sos.message}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-red-400" />{sos.villageName || sos.district}</span>
                        <span>{new Date(sos.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE & RIGHT COLUMN: SHARED RADAR MAP & LIVE IN-SYSTEM MESSAGE CHAT */}
        {activeSos ? (
          <div className="lg:col-span-2 space-y-5">
            {/* Live Shared Radar & Proximity Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4.5 space-y-3 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-cyan-400" /> Active SOS Session: {activeSos.citizenName} ({activeSos.district})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{activeSos.message}</p>
                </div>

                {isVolunteer && activeSos.status === 'Active SOS' && (
                  <button
                    onClick={() => handleRespondSOS(activeSos._id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white shadow-md shadow-emerald-600/30 transition cursor-pointer flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" /> 🛸 Dispatch My Rescue Team
                  </button>
                )}
              </div>

              {/* Live Distance Meter */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Citizen SOS Location</span>
                  <span className="text-xs font-bold text-red-400">{activeSos.latitude?.toFixed(4)}, {activeSos.longitude?.toFixed(4)}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Assigned Volunteer Team</span>
                  <span className="text-xs font-bold text-emerald-400">{activeSos.assignedVolunteerName || 'Waiting for Volunteer...'}</span>
                </div>
                <div className="bg-slate-900 border border-cyan-900/50 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-cyan-400 uppercase tracking-wider block">Radar Proximity Distance</span>
                  <span className="text-sm font-extrabold text-cyan-300">
                    {distanceInKm !== null ? `📍 ${distanceInKm} km away` : 'Connecting Radar...'}
                  </span>
                </div>
              </div>

              {/* Shared Radar Leaflet Map */}
              <div className="w-full h-64 rounded-xl border border-slate-800 overflow-hidden relative" id="sos-radar-map"></div>
            </div>

            {/* In-System Live Message Chat Box (Citizen 💬 Volunteer) */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4.5 space-y-3.5 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" /> Direct In-System Message Chat (Citizen 💬 Volunteer)
              </h3>

              {/* Message Feed Stream */}
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
                {!activeSos.messages || activeSos.messages.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-4">No messages yet. Send a direct text message below!</p>
                ) : (
                  activeSos.messages.map((m, idx) => {
                    const isSelf = m.senderUid === mongoUser?.uid;
                    return (
                      <div key={idx} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5">
                          <span className="font-semibold text-slate-200">{m.senderName}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${m.senderRole === 'Volunteer' ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'}`}>
                            {m.senderRole}
                          </span>
                          <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className={`px-3 py-2 rounded-xl text-xs max-w-sm ${isSelf ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'}`}>
                          {m.text}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Reply Chips */}
              <div className="flex flex-wrap gap-1.5">
                {(isVolunteer ? [
                  '🚁 We are deploying a boat to your location now!',
                  '📍 We see your GPS pin on the radar map.',
                  '🚨 We are 500 meters away, stay on the roof!'
                ] : [
                  '🌊 Water level is rising fast, please hurry!',
                  '👨‍👩‍👧 We are 5 people stranded on upper roof.',
                  '🚑 Elderly patient needs medical kit.'
                ]).map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendChatMessage(chip)}
                    className="text-[10px] py-1 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition cursor-pointer">
                    + {chip}
                  </button>
                ))}
              </div>

              {/* Chat Input Bar */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                  placeholder="Type direct rescue message to volunteer / citizen..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={() => handleSendChatMessage()}
                  disabled={sendingMsg || !chatText.trim()}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer">
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center p-12 bg-slate-950 border border-slate-800 rounded-2xl text-center text-slate-500 text-xs">
            Select or trigger an active SOS signal to launch the live shared location radar & direct message chat.
          </div>
        )}
      </div>
    </div>
  );
}
