import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, Send, MapPin, Phone, UserCheck, MessageSquare, 
  Clock, Navigation, Radio, AlertCircle, RefreshCw, Image as ImageIcon, Users, CheckCircle2, X, Shield, Undo2
} from 'lucide-react';
import { toast } from 'react-toastify';

function calcDistanceKm(lat1, lon1, lat2, lon2) {
  const a1 = Number(lat1);
  const b1 = Number(lon1);
  const a2 = Number(lat2);
  const b2 = Number(lon2);
  if (![a1, b1, a2, b2].every(Number.isFinite)) return null;
  const R = 6371;
  const dLat = (a2 - a1) * Math.PI / 180;
  const dLon = (b2 - b1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(a1 * Math.PI / 180) * Math.cos(a2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getLivePosition(fallback) {
  return new Promise((resolve) => {
    const finish = (pos) => resolve(pos || fallback);
    const timer = setTimeout(() => finish(fallback), 800);
    if (!navigator.geolocation) {
      clearTimeout(timer);
      finish(fallback);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        finish({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        finish(fallback);
      },
      { enableHighAccuracy: false, timeout: 700, maximumAge: 60000 }
    );
  });
}

const STAFF_ROLES = ['Government', 'NGO', 'GovRepresentative', 'NGORepresentative', 'GovRepLogistics', 'NGORepLogistics'];

function canWithdrawDispatch(user, dispatch) {
  if (!user || !dispatch) return false;
  if (STAFF_ROLES.includes(user.role)) return true;
  const uid = String(user.uid || '');
  if (dispatch.dispatchType === 'Group') {
    if (String(dispatch.volunteerUid || '') === uid) return true;
    if (String(dispatch.dispatchedByUid || '') === uid) return true;
    return (dispatch.teamMembers || []).some(m => String(m.uid) === uid);
  }
  return String(dispatch.volunteerUid || '') === uid;
}

export default function RescuePanelPage() {
  const { token, mongoUser } = useAuth();
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [sosList, setSosList] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [selectedSosId, setSelectedSosId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chat message input
  const [chatText, setChatText] = useState('');
  const [chatImageBase64, setChatImageBase64] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [panelTab, setPanelTab] = useState('sos');
  const chatEndRef = useRef(null);

  // Group dispatch modal state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [dispatchSosId, setDispatchSosId] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [groupLogo, setGroupLogo] = useState('');     // URL or base64 of team logo
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupLeaderId, setGroupLeaderId] = useState('');
  const [dispatching, setDispatching] = useState(false);

  // Leaflet map reference
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const lastFingerprintRef = useRef('');
  const withdrawRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [dispatchingSelf, setDispatchingSelf] = useState(false);

  const isRep = STAFF_ROLES.includes(mongoUser?.role);
  const isVolunteer = mongoUser?.role === 'Volunteer';

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
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
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 10000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const activeSos = sosList.find(s => String(s._id) === String(selectedSosId)) || sosList[0] || null;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSos?.messages, selectedSosId, panelTab]);

  // Convert File to Base64
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB.');
    const reader = new FileReader();
    reader.onloadend = () => setChatImageBase64(reader.result);
    reader.readAsDataURL(file);
  };

  // Logo file → base64
  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error('Logo must be under 2MB.');
    const reader = new FileReader();
    reader.onloadend = () => setGroupLogo(reader.result);
    reader.readAsDataURL(file);
  };

  // Single volunteer self-dispatch (for Volunteer role)
  const handleRespondSOS = async (sosId) => {
    if (dispatchingSelf) return;
    setDispatchingSelf(true);
    try {
      const me = volunteers.find(v => String(v.uid) === String(mongoUser?.uid));
      const fallback = {
        latitude: Number(me?.latitude) || Number(mongoUser?.latitude) || 24.8960,
        longitude: Number(me?.longitude) || Number(mongoUser?.longitude) || 91.8740
      };
      const pos = await getLivePosition(fallback);

      const res = await fetch(`${API}/sos/${sosId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          dispatchType: 'Single',
          volunteerUid: mongoUser?.uid || me?.uid,
          volunteerName: mongoUser?.name || me?.name,
          latitude: pos.latitude,
          longitude: pos.longitude,
          phone: mongoUser?.phone || me?.phone || '+8801811998877'
        })
      });
      if (res.ok) {
        toast.success('You are dispatched. Distance to the SOS caller is on the map.');
        await fetchData();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.message || 'Failed to dispatch rescue.');
      }
    } catch (e) {
      toast.error('Server error dispatching rescue.');
    }
    setDispatchingSelf(false);
  };

  // Rep dispatches a single volunteer
  const handleDispatchSingleVolunteer = async (sosId, vol) => {
    try {
      const res = await fetch(`${API}/sos/${sosId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          dispatchType: 'Single',
          volunteerUid: vol.uid,
          volunteerName: vol.name,
          latitude: vol.latitude,
          longitude: vol.longitude,
          phone: vol.phone,
          // shelter location as fallback
          shelterLatitude: mongoUser?.latitude || vol.latitude,
          shelterLongitude: mongoUser?.longitude || vol.longitude
        })
      });
      if (res.ok) {
        toast.success(`🛸 ${vol.name} dispatched to SOS!`);
        fetchData();
      } else {
        const d = await res.json();
        toast.error(d.message || 'Dispatch failed.');
      }
    } catch (e) { toast.error('Server error.'); }
  };

  // Rep dispatches a group
  const handleDispatchGroup = async () => {
    if (!groupName.trim()) return toast.error('Group name is required.');
    if (selectedMembers.length === 0) return toast.error('Select at least one team member.');
    const leader = volunteers.find(v => v.uid === groupLeaderId) || volunteers.find(v => selectedMembers.includes(v.uid));
    if (!leader) return toast.error('Select a group leader.');
    setDispatching(true);
    try {
      const res = await fetch(`${API}/sos/${dispatchSosId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          dispatchType: 'Group',
          groupName: groupName.trim(),
          groupLeaderUid: leader.uid,
          groupLeaderName: leader.name,
          groupLeaderPhone: leader.phone,
          teamMembers: selectedMembers.map(uid => {
            const v = volunteers.find(v => v.uid === uid);
            return { uid: v?.uid, name: v?.name, role: v?.role, phone: v?.phone };
          }),
          logoUrl: groupLogo,
          latitude: leader.latitude,
          longitude: leader.longitude,
          shelterLatitude: mongoUser?.latitude || leader.latitude,
          shelterLongitude: mongoUser?.longitude || leader.longitude,
          phone: leader.phone
        })
      });
      if (res.ok) {
        toast.success(`🛸 Group "${groupName}" dispatched as Rescue Team!`);
        setShowGroupModal(false);
        setGroupName(''); setGroupLogo(''); setSelectedMembers([]); setGroupLeaderId('');
        fetchData();
      } else {
        const d = await res.json();
        toast.error(d.message || 'Group dispatch failed.');
      }
    } catch (e) { toast.error('Server error.'); }
    setDispatching(false);
  };

  const handleWithdrawDispatch = async (sosId, dispatchId) => {
    if (!sosId || !dispatchId) return;
    try {
      const res = await fetch(`${API}/sos/${sosId}/dispatches/${dispatchId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('Dispatch withdrawn.');
        fetchData();
      } else {
        toast.error(d.message || 'Could not withdraw dispatch.');
      }
    } catch (e) {
      toast.error('Server error withdrawing dispatch.');
    }
  };
  withdrawRef.current = handleWithdrawDispatch;

  // Post Chat Message
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

  // ─── Leaflet Map ─────────────────────────────────────────────────────────────
  // EFFECT 1: Initialize map ONCE on mount so user zoom/pan is never lost
  useEffect(() => {
    if (panelTab !== 'sos') return;
    const container = document.getElementById('rescue-panel-map');
    if (!container) return;

    if (!document.getElementById('leaflet-css-link')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css-link';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const createMap = () => {
      const el = document.getElementById('rescue-panel-map');
      if (!window.L || !el || mapRef.current) return;

      const centerLat = activeSos ? activeSos.latitude : 24.9020;
      const centerLon = activeSos ? activeSos.longitude : 91.8820;

      const map = window.L.map('rescue-panel-map', { center: [centerLat, centerLon], zoom: 13 });
      mapRef.current = map;

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      markersLayerRef.current = window.L.layerGroup().addTo(map);
      setMapReady(true);
      setTimeout(() => { map.invalidateSize(); }, 250);
    };

    if (window.L) {
      createMap();
    } else {
      let script = document.getElementById('leaflet-js-script');
      if (!script) {
        script = document.createElement('script');
        script.id = 'leaflet-js-script';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => createMap();
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', createMap);
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersLayerRef.current = null;
        lastFingerprintRef.current = '';
        setMapReady(false);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelTab]);

  // EFFECT 2: Everyone visible. Distance lines only for dispatched volunteer/team → their SOS.
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current || !window.L) return;

    const fingerprint = JSON.stringify({
      sos: sosList.map(s => `${s._id}:${s.status}:${(s.dispatches || []).map(d => d._id).join(',')}`),
      vols: volunteers.map(v => `${v.uid}:${v.latitude}:${v.longitude}`),
      me: mongoUser?.uid
    });
    if (fingerprint === lastFingerprintRef.current) return;
    lastFingerprintRef.current = fingerprint;

    markersLayerRef.current.clearLayers();
    const layer = markersLayerRef.current;

    const drawCitizenRoute = (fromLat, fromLng, sos, distKm, color, fromLabel) => {
      const sosLat = Number(sos.latitude);
      const sosLng = Number(sos.longitude);
      const dLat = Number(fromLat);
      const dLng = Number(fromLng);
      if (![sosLat, sosLng, dLat, dLng].every(Number.isFinite)) return;
      if (!distKm || Number(distKm) < 0.05) return;
      const line = window.L.polyline([[dLat, dLng], [sosLat, sosLng]], {
        color,
        weight: 3,
        dashArray: '6, 8',
        opacity: 0.9
      }).addTo(layer);
      line.bindTooltip(`${distKm} km`, {
        permanent: true,
        direction: 'center',
        opacity: 0.95,
        className: 'rescue-distance-label'
      });
      line.bindPopup(`<b>${escHtml(fromLabel)}</b> → <b>${escHtml(sos.citizenName)}</b><br/>Distance: ${distKm} km`);
    };

    const attachWithdraw = (marker) => {
      marker.on('popupopen', (e) => {
        const btn = e.popup.getElement()?.querySelector('[data-rescue-withdraw]');
        if (!btn) return;
        const onClick = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          withdrawRef.current?.(btn.getAttribute('data-sos'), btn.getAttribute('data-dispatch'));
          mapRef.current?.closePopup();
        };
        btn.addEventListener('click', onClick);
      });
    };

    const withdrawBtnHtml = (sos, dispatch) => {
      if (!canWithdrawDispatch(mongoUser, dispatch) || !dispatch._id) return '';
      return `<button type="button" data-rescue-withdraw data-sos="${escHtml(sos._id)}" data-dispatch="${escHtml(dispatch._id)}"
        style="margin-top:8px;width:100%;padding:6px 8px;background:#b45309;color:white;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">
        Withdraw from SOS
      </button>`;
    };

    const singleByVolUid = new Map();
    const groupDispatches = [];
    sosList.forEach(sos => {
      (sos.dispatches || []).forEach(d => {
        if (d.dispatchType === 'Group') groupDispatches.push({ sos, d });
        else singleByVolUid.set(String(d.volunteerUid || ''), { sos, d });
      });
      if ((!sos.dispatches || sos.dispatches.length === 0) && sos.assignedVolunteerUid && sos.volunteerLatitude) {
        singleByVolUid.set(String(sos.assignedVolunteerUid), {
          sos,
          d: {
            _id: `legacy-${sos._id}`,
            dispatchType: 'Single',
            volunteerUid: sos.assignedVolunteerUid,
            volunteerName: sos.assignedVolunteerName,
            volunteerPhone: sos.assignedVolunteerPhone,
            latitude: sos.volunteerLatitude,
            longitude: sos.volunteerLongitude
          }
        });
      }
    });

    // 1. All SOS citizens
    sosList.forEach(sos => {
      const citizenIcon = window.L.divIcon({
        className: 'custom-sos-marker',
        html: `<div style="background:#ef4444; width:36px; height:36px; border-radius:50%; border:3px solid white; display:flex; align-items:center; justify-content:center; box-shadow:0 0 16px #ef4444; color:white; font-weight:bold; font-size:16px;">🚨</div>`,
        iconSize: [36, 36], iconAnchor: [18, 18]
      });
      window.L.marker([sos.latitude, sos.longitude], { icon: citizenIcon })
        .addTo(layer)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; color:#1e293b;">
            <b style="color:#ef4444;">SOS Caller: ${escHtml(sos.citizenName)}</b><br/>
            <b>Phone:</b> ${escHtml(sos.citizenPhone || 'N/A')}<br/>
            <b>Distress:</b> ${escHtml(sos.message)}<br/>
            <b>Status:</b> ${escHtml(sos.status)}
          </div>
        `);
    });

    // 2. All volunteers — green available, yellow when dispatched to an SOS
    const plottedVolUids = new Set();
    volunteers.forEach(vol => {
      const assignment = singleByVolUid.get(String(vol.uid));
      const isDispatched = Boolean(assignment);
      const pinLat = isDispatched ? (Number(assignment.d.latitude) || Number(vol.latitude)) : Number(vol.latitude);
      const pinLng = isDispatched ? (Number(assignment.d.longitude) || Number(vol.longitude)) : Number(vol.longitude);
      if (!Number.isFinite(pinLat) || !Number.isFinite(pinLng)) return;
      plottedVolUids.add(String(vol.uid));
      const color = isDispatched ? '#eab308' : '#10b981';
      const volIcon = window.L.divIcon({
        className: 'custom-vol-marker',
        html: `<div style="background:${color}; width:34px; height:34px; border-radius:50%; border:3px solid white; display:flex; align-items:center; justify-content:center; box-shadow:0 0 14px ${color}; color:white; font-weight:bold; font-size:15px;">🛸</div>`,
        iconSize: [34, 34], iconAnchor: [17, 17]
      });
      const marker = window.L.marker([pinLat, pinLng], { icon: volIcon }).addTo(layer);
      if (isDispatched) {
        const { sos, d } = assignment;
        const dist = calcDistanceKm(sos.latitude, sos.longitude, pinLat, pinLng);
        marker.bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; color:#1e293b;">
            <b style="color:#ca8a04;">Dispatched Volunteer</b><br/>
            <b>Name:</b> ${escHtml(vol.name)}<br/>
            <b>Going to:</b> ${escHtml(sos.citizenName)}<br/>
            <b>Phone:</b> ${escHtml(vol.phone || d.volunteerPhone || 'N/A')}<br/>
            <b>Distance:</b> ${dist || 'N/A'} km
            ${withdrawBtnHtml(sos, d)}
          </div>
        `);
        attachWithdraw(marker);
        drawCitizenRoute(pinLat, pinLng, sos, dist, '#eab308', vol.name);
      } else {
        marker.bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; color:#1e293b;">
            <b style="color:#10b981;">Available Volunteer</b><br/>
            <b>Name:</b> ${escHtml(vol.name)}<br/>
            <b>Org:</b> ${escHtml(vol.orgName || 'Disaster Relief')}<br/>
            <b>Phone:</b> ${escHtml(vol.phone)}<br/>
            Not dispatched to any SOS.
          </div>
        `);
      }
    });

    // Dispatched volunteer not in the volunteer list — still show yellow pin + route
    singleByVolUid.forEach(({ sos, d }, uid) => {
      if (plottedVolUids.has(uid) || d.latitude == null || d.longitude == null) return;
      const dist = calcDistanceKm(sos.latitude, sos.longitude, d.latitude, d.longitude);
      const dispIcon = window.L.divIcon({
        className: 'custom-dispatched-vol-marker',
        html: `<div style="background:#eab308; width:34px; height:34px; border-radius:50%; border:3px solid white; display:flex; align-items:center; justify-content:center; box-shadow:0 0 14px #eab308; color:white; font-size:15px;">🛸</div>`,
        iconSize: [34, 34], iconAnchor: [17, 17]
      });
      const marker = window.L.marker([d.latitude, d.longitude], { icon: dispIcon })
        .addTo(layer)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; color:#1e293b;">
            <b style="color:#ca8a04;">Dispatched Volunteer</b><br/>
            <b>Name:</b> ${escHtml(d.volunteerName)}<br/>
            <b>Going to:</b> ${escHtml(sos.citizenName)}<br/>
            <b>Distance:</b> ${dist || 'N/A'} km
            ${withdrawBtnHtml(sos, d)}
          </div>
        `);
      attachWithdraw(marker);
      drawCitizenRoute(d.latitude, d.longitude, sos, dist, '#eab308', d.volunteerName);
    });

    // 3. Teams exist on the map only while dispatched
    groupDispatches.forEach(({ sos, d }) => {
      if (d.latitude == null || d.longitude == null) return;
      const dist = calcDistanceKm(sos.latitude, sos.longitude, d.latitude, d.longitude);
      const html = d.logoUrl
        ? `<div style="width:40px; height:40px; border-radius:50%; overflow:hidden; border:3px solid #3b82f6; box-shadow:0 0 14px rgba(59,130,246,0.7); background:#1e3a5f;">
            <img src="${escHtml(d.logoUrl)}" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentNode.innerHTML='🏥'" />
          </div>`
        : `<div style="background:#3b82f6; width:38px; height:38px; border-radius:50%; border:3px solid white; display:flex; align-items:center; justify-content:center; box-shadow:0 0 14px #3b82f6; color:white; font-size:18px;">🏥</div>`;
      const teamIcon = window.L.divIcon({
        className: 'custom-team-marker',
        html,
        iconSize: [40, 40], iconAnchor: [20, 20]
      });
      const marker = window.L.marker([d.latitude, d.longitude], { icon: teamIcon })
        .addTo(layer)
        .bindPopup(`
          <div style="font-family:sans-serif; font-size:12px; color:#1e293b;">
            <b style="color:#3b82f6;">Rescue Team</b><br/>
            <b>Team:</b> ${escHtml(d.groupName || 'Rescue Team')}<br/>
            <b>Going to:</b> ${escHtml(sos.citizenName)}<br/>
            <b>Leader:</b> ${escHtml(d.volunteerName || 'Leader')}<br/>
            <b>Phone:</b> ${escHtml(d.volunteerPhone || 'N/A')}<br/>
            <b>Distance:</b> ${dist || 'N/A'} km
            ${withdrawBtnHtml(sos, d)}
          </div>
        `);
      attachWithdraw(marker);
      drawCitizenRoute(d.latitude, d.longitude, sos, dist, '#3b82f6', d.groupName || 'Rescue Team');
    });
  }, [sosList, volunteers, mongoUser, mapReady]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            {isRep ? 'Shelter / Campaign Rescue Command Center' : 'Volunteer Rescue Command Center'}
          </div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-emerald-400" /> Rescue Panel
          </h1>
          <p className="text-xs text-slate-400">
            View all Citizen SOS distress locations on the map. {isRep ? 'Dispatch single volunteers or rescue teams (groups) to SOS alerts.' : 'Accept SOS alerts & chat directly with citizens.'}
          </p>
        </div>

        <button
          onClick={fetchData}
          className="self-start md:self-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-2 cursor-pointer">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Rescue Feed
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
        
        {/* LEFT COLUMN (5 Cols): CITIZEN SOS FEED LIST & DISPATCH */}
        <div className="lg:col-span-5 space-y-5">
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-500 animate-ping" /> Citizen SOS Distress Feed ({sosList.length})
              </h2>
              <span className="text-[11px] text-slate-400">Real-time alerts</span>
            </div>

            {sosList.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">No active SOS distress signals reported.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {sosList.map(sos => {
                  const isSelected = String(sos._id) === String(selectedSosId);
                  const sosDispatches = sos.dispatches || [];
                  const mySingleDispatch = sosDispatches.find(d => d.dispatchType !== 'Group' && String(d.volunteerUid) === String(mongoUser?.uid));
                  const dispatchedVolUids = new Set(
                    sosList.flatMap(s => (s.dispatches || []).filter(d => d.dispatchType !== 'Group').map(d => String(d.volunteerUid)))
                  );
                  return (
                    <div
                      key={sos._id}
                      onClick={() => setSelectedSosId(sos._id)}
                      className={`p-4 rounded-2xl border text-xs transition cursor-pointer space-y-2 ${isSelected ? 'bg-red-950/40 border-red-500/80 shadow-lg shadow-red-950/40' : 'bg-slate-950/80 border-slate-800 hover:bg-slate-900'}`}>
                      
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                          {sos.citizenName}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${sos.status === 'Volunteer Dispatched' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'}`}>
                          {sos.status}
                        </span>
                      </div>

                      <p className="text-slate-300 text-xs leading-relaxed">{sos.message}</p>

                      {sos.imageUrl && (
                        <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-800">
                          <img src={sos.imageUrl} alt="Distress proof" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                        <span className="flex items-center gap-1 text-slate-300"><MapPin className="w-3.5 h-3.5 text-red-400" /> {sos.villageName || sos.district}</span>
                        <span className="flex items-center gap-1 text-emerald-400"><Phone className="w-3.5 h-3.5" /> {sos.citizenPhone || 'N/A'}</span>
                      </div>

                      {/* Show dispatched teams summary */}
                      {sosDispatches.length > 0 && (
                        <div className="pt-1 space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Dispatched ({sosDispatches.length}):</span>
                          {sosDispatches.map((d, i) => (
                            <div key={d._id || i} className="flex items-center gap-2 bg-slate-900 rounded-lg px-2 py-1">
                              {d.dispatchType === 'Group' ? (
                                d.logoUrl
                                  ? <img src={d.logoUrl} alt="logo" className="w-5 h-5 rounded-full object-cover border border-blue-500" />
                                  : <span className="text-blue-400 text-xs">🏥</span>
                              ) : (
                                <span className="text-yellow-400 text-xs">🛸</span>
                              )}
                              <span className="text-[10px] text-slate-300 truncate flex-1">
                                {d.dispatchType === 'Group' ? `[Team] ${d.groupName}` : d.volunteerName}
                              </span>
                              {d.latitude && d.longitude && sos.latitude && sos.longitude && (
                                <span className="text-[10px] font-bold text-cyan-400 whitespace-nowrap">
                                  {calcDistanceKm(sos.latitude, sos.longitude, d.latitude, d.longitude)} km
                                </span>
                              )}
                              {canWithdrawDispatch(mongoUser, d) && d._id && (
                                <button
                                  type="button"
                                  title="Withdraw"
                                  onClick={(e) => { e.stopPropagation(); handleWithdrawDispatch(sos._id, d._id); }}
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-900/80 text-amber-200 hover:bg-amber-800 border border-amber-700 cursor-pointer shrink-0 flex items-center gap-0.5">
                                  <Undo2 className="w-2.5 h-2.5" /> Withdraw
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Volunteer self-dispatch / withdraw */}
                      {isVolunteer && sos.status !== 'Resolved' && sos.status !== 'Cancelled' && (
                        mySingleDispatch ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleWithdrawDispatch(sos._id, mySingleDispatch._id); }}
                            className="w-full mt-2 py-2 bg-amber-700 hover:bg-amber-600 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5">
                            <Undo2 className="w-4 h-4" /> Withdraw Myself
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={dispatchingSelf}
                            onClick={(e) => { e.stopPropagation(); handleRespondSOS(sos._id); }}
                            className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5">
                            <UserCheck className="w-4 h-4" /> {dispatchingSelf ? 'Dispatching…' : 'Respond & Dispatch Myself'}
                          </button>
                        )
                      )}

                      {/* Rep dispatch buttons: single volunteer or group */}
                      {isRep && (
                        <div className="flex gap-2 mt-2">
                          {/* Dispatch single volunteer dropdown */}
                          <select
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-[10px] text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                            defaultValue=""
                            onChange={(e) => {
                              e.stopPropagation();
                              const uid = e.target.value;
                              if (!uid) return;
                              const vol = volunteers.find(v => v.uid === uid);
                              if (vol) handleDispatchSingleVolunteer(sos._id, vol);
                              e.target.value = '';
                            }}
                            onClick={(e) => e.stopPropagation()}>
                            <option value="">🛩 Dispatch Volunteer...</option>
                            {volunteers.filter(v => v.role === 'Volunteer' && !dispatchedVolUids.has(String(v.uid))).map(v => (
                              <option key={v.uid} value={v.uid}>{v.name} ({v.district})</option>
                            ))}
                          </select>

                          {/* Dispatch group button */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDispatchSosId(sos._id); setShowGroupModal(true); }}
                            className="px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl text-[10px] flex items-center gap-1 transition cursor-pointer whitespace-nowrap">
                            <Users className="w-3 h-3" /> Rescue Team
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (7 Cols): RESCUE MAP + DIRECT CHAT */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SECTION 1: RESCUE MAP */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Navigation className="w-4 h-4 text-cyan-400" /> Rescue Panel Live Map
              </h2>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-red-400 font-bold"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Citizens ({sosList.length})</span>
                <span className="flex items-center gap-1 text-emerald-400 font-bold"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available</span>
                <span className="flex items-center gap-1 text-yellow-400 font-bold"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span> Dispatched</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">🚨 <span className="text-red-400">= SOS caller</span></span>
              <span className="flex items-center gap-1">🛸 <span className="text-emerald-400">= Available volunteer</span></span>
              <span className="flex items-center gap-1">🛸 <span className="text-yellow-400">= Dispatched volunteer</span></span>
              <span className="flex items-center gap-1">🏥 <span className="text-blue-400">= Rescue team (on map only while dispatched)</span></span>
              <span className="flex items-center gap-1"><span className="inline-block w-5 border-t-2 border-dashed border-yellow-400"></span> <span className="text-cyan-400">= Distance to that SOS caller</span></span>
            </div>
            <style>{`
              .rescue-distance-label {
                background: rgba(15, 23, 42, 0.94) !important;
                border: 1px solid rgba(34, 211, 238, 0.55) !important;
                color: #e2e8f0 !important;
                font-size: 10px !important;
                font-weight: 700 !important;
                padding: 2px 7px !important;
                border-radius: 6px !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.45) !important;
                white-space: nowrap;
              }
              .rescue-distance-label::before { display: none !important; }
            `}</style>

            {/* Rescue Panel Leaflet Map */}
            <div className="w-full h-80 rounded-2xl border border-slate-800 overflow-hidden relative z-0" id="rescue-panel-map"></div>
          </div>
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
                <p className="text-xs text-slate-500 italic py-6 text-center">No SOS chats yet.</p>
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
                    <div className="font-bold text-white truncate">{sos.citizenName}</div>
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
                      <h3 className="text-sm font-bold text-white m-0">Direct Rescue Chat with {activeSos.citizenName}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        District: <strong className="text-white">{activeSos.district}</strong> | Phone: <strong className="text-emerald-400">{activeSos.citizenPhone || 'N/A'}</strong>
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${activeSos.status === 'Volunteer Dispatched' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'}`}>
                    {activeSos.status}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                  {!activeSos.messages || activeSos.messages.length === 0 ? (
                    <div className="flex-1 flex flex-col justify-center items-center text-center gap-2 text-slate-500">
                      <MessageSquare className="w-14 h-14 text-slate-700" />
                      <p className="text-xs">No messages yet. Send a rescue update below.</p>
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
                      const isSelf = m.senderUid === mongoUser?.uid || m.senderRole === 'Volunteer' || m.senderRole === 'Government' || m.senderRole === 'NGO';
                      return (
                        <div key={idx} className={`flex flex-col max-w-[85%] ${isSelf ? 'self-end items-end' : 'self-start items-start'}`}>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                            <span className="font-semibold text-slate-200">{m.senderName}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isSelf ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'}`}>
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
                  <div ref={chatEndRef} />
                </div>

                <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      '🛸 Rescue team is en-route with inflatable boat!',
                      '📍 We see your location on the Rescue Panel map.',
                      '🚑 Medical squad & oxygen kit are with us.',
                      '🚨 Hold on! We are 2 minutes away from your location.'
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
                      <button type="button" onClick={() => setChatImageBase64('')} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <label className="px-3.5 py-3 bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition">
                      <ImageIcon className="w-4 h-4 text-cyan-400" /> Photo
                      <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                    </label>
                    <input
                      type="text"
                      value={chatText}
                      onChange={(e) => setChatText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                      placeholder="Type rescue update or send photo to citizen..."
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
                Select a citizen SOS from the left to open a large rescue chat.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Group Dispatch Modal ────────────────────────────────────────────── */}
      {showGroupModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-lg space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" /> Dispatch Rescue Team (Group)
              </h2>
              <button onClick={() => setShowGroupModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Group Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Team / Group Name *</label>
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="e.g. Sylhet River Rescue Squad"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Team Logo Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Team Logo (shown on map)</label>
              <div className="flex items-center gap-3">
                {groupLogo && (
                  <img src={groupLogo} alt="Team logo preview" className="w-12 h-12 rounded-full object-cover border-2 border-blue-500" />
                )}
                <label className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-400" /> Upload Logo
                  <input type="file" accept="image/*" onChange={handleLogoFileChange} className="hidden" />
                </label>
                {groupLogo && (
                  <button onClick={() => setGroupLogo('')} className="text-red-400 text-xs hover:underline cursor-pointer">Remove</button>
                )}
              </div>
              {!groupLogo && (
                <p className="text-[10px] text-slate-500">Without a logo, a default 🏥 icon will appear on the map.</p>
              )}
            </div>

            {/* Select Team Members */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Select Team Members *</label>
              <div className="max-h-40 overflow-y-auto space-y-1 bg-slate-950 rounded-xl p-3 border border-slate-700">
                {volunteers.filter(v => v.role === 'Volunteer').map(v => (
                  <label key={v.uid} className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-900 px-2 py-1 rounded-lg transition">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(v.uid)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedMembers(prev => [...prev, v.uid]);
                          if (!groupLeaderId) setGroupLeaderId(v.uid);
                        } else {
                          setSelectedMembers(prev => prev.filter(id => id !== v.uid));
                          if (groupLeaderId === v.uid) setGroupLeaderId('');
                        }
                      }}
                      className="w-3.5 h-3.5 accent-blue-500"
                    />
                    <span className="text-xs text-slate-200">{v.name}</span>
                    <span className="text-[10px] text-slate-400">{v.district}</span>
                    <span className="text-[10px] text-slate-500">{v.phone}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Select Group Leader */}
            {selectedMembers.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Group Leader *</label>
                <select
                  value={groupLeaderId}
                  onChange={e => setGroupLeaderId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer">
                  <option value="">-- Select Leader --</option>
                  {selectedMembers.map(uid => {
                    const v = volunteers.find(v => v.uid === uid);
                    return v ? <option key={uid} value={uid}>{v.name}</option> : null;
                  })}
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowGroupModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatchGroup}
                disabled={dispatching}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {dispatching ? 'Dispatching...' : '🏥 Dispatch Rescue Team'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
