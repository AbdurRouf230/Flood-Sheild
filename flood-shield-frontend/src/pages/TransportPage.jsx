import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Truck, Send, RefreshCw, PlusCircle, UserCheck, MessageSquare,
  CheckCircle2, Clock, MapPin, Package
} from 'lucide-react';
import { facilityMatch } from '../utils/facilityMatch';

const STATUS_STYLES = {
  'Pending':    'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'In Transit': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Delivered':  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Cancelled':  'bg-slate-500/20 text-slate-400 border-slate-500/30',
};
const STATUS_NEXT = { 'Pending': 'In Transit', 'In Transit': 'Delivered' };
const DISTRICTS = ['Sylhet','Sunamganj','Kurigram','Gaibandha','Netrokona','Sirajganj','Jamalpur','Bogura','Dhaka','Chittagong'];
const WAREHOUSES = ['Sylhet Relief Hub','Sunamganj Disaster Depot','Kurigram Central Warehouse'];

const isHubMatch = (val1, val2) => {
  if (!val1 || !val2) return false;
  const s1 = String(val1).toLowerCase().trim();
  const s2 = String(val2).toLowerCase().trim();
  if (s1.includes(s2) || s2.includes(s1)) return true;

  // Word token matching (e.g. 'sylhet', 'depot' matching '[gov] sylhet divisional depot [hub]')
  const words2 = s2.split(/\s+/).filter(w => w.length > 2 && !['[gov]', '[ngo]', '[hub]', 'hub', 'depot', 'divisional'].includes(w));
  if (words2.length > 0 && words2.some(w => s1.includes(w))) return true;

  return false;
};

export default function TransportPage() {
  const { token, mongoUser } = useAuth();
  const role = mongoUser?.role || 'Citizen';
  const isRep = ['GovRepresentative', 'NGORepresentative', 'GovRepLogistics', 'NGORepLogistics'].includes(role);
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Create transport form
  const [showForm, setShowForm] = useState(false);
  const [fDistrict, setFDistrict] = useState('Sylhet');
  const [fOrigin, setFOrigin] = useState(WAREHOUSES[0]);
  const [fDest, setFDest] = useState('');
  const [fItems, setFItems] = useState('');
  const [fETA, setFETA] = useState('');

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('All');
  const [posting, setPosting] = useState(false);

  // Chat state per transport
  const [openChatId, setOpenChatId] = useState(null);
  const [chatMessages, setChatMessages] = useState({});
  const [chatText, setChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatPollRef = useRef(null);

  // Assign volunteer state
  const [assigningId, setAssigningId] = useState(null);
  const [assignUid, setAssignUid] = useState('');
  const [assignName, setAssignName] = useState('');
  const [availableVolunteers, setAvailableVolunteers] = useState([]);
  const [loadingVolunteers, setLoadingVolunteers] = useState(false);

  const flash = (type, text) => {
    if (type === 'ok') { setMsg(text); setErr(''); }
    else { setErr(text); setMsg(''); }
    setTimeout(() => { setMsg(''); setErr(''); }, 4000);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const isRepRole = role === 'GovRepresentative' || role === 'NGORepresentative' || role === 'GovRepLogistics' || role === 'NGORepLogistics';
      const transportUrl = isRepRole
        ? `${API}/representatives/transports`
        : `${API}/transport`;
      const tRes = await fetch(transportUrl, { headers });
      if (tRes.ok) setTransports(await tRes.json());
    } catch (e) { flash('err', 'Failed to load transport data'); }
    setLoading(false);
  };


  useEffect(() => { if (token) fetchAll(); }, [token]);

  // Poll chat every 5s when open
  useEffect(() => {
    if (openChatId && token) {
      loadChat(openChatId);
      chatPollRef.current = setInterval(() => loadChat(openChatId), 5000);
    }
    return () => clearInterval(chatPollRef.current);
  }, [openChatId, token]);

  const loadChat = async (id) => {
    if (!token) return;
    const res = await fetch(`${API}/transport/${id}/chat`, { headers });
    if (res.ok) {
      const data = await res.json();
      setChatMessages(prev => ({ ...prev, [id]: data }));
    }
  };


  const handleCreate = async () => {
    if (!fDest.trim()) return flash('err', 'Destination is required');
    setPosting(true);
    const res = await fetch(`${API}/transport`, {
      method: 'POST', headers,
      body: JSON.stringify({ district: fDistrict, origin: fOrigin, destination: fDest, itemsSummary: fItems, estimatedArrival: fETA || undefined })
    });
    const data = await res.json();
    if (res.ok) { flash('ok', 'Transport created!'); setTransports(p => [data, ...p]); setShowForm(false); setFDest(''); setFItems(''); setFETA(''); }
    else flash('err', data.message);
    setPosting(false);
  };

  const handleStatusUpdate = async (id, status) => {
    let dispatchedByText = '';
    if (status === 'In Transit') {
      if (role === 'NGO') dispatchedByText = 'NGO';
      else if (role === 'NGORepresentative') dispatchedByText = `${mongoUser?.name || 'NGO Rep'} (Logistics)`;
    }
    const res = await fetch(`${API}/transport/${id}/status`, { method: 'PUT', headers, body: JSON.stringify({ status, dispatchedByText }) });
    const data = await res.json();
    if (res.ok) {
      const successMsg = (status === 'Delivered' && role === 'Volunteer')
        ? `✅ Delivery confirmed! Mission marked as Delivered.`
        : `Status → ${status}`;
      flash('ok', successMsg);
      setTransports(p => p.map(t => t._id === id ? data : t));
    }
    else flash('err', data.message);
  };


  const handleReceive = async (id) => {
    const res = await fetch(`${API}/transport/${id}/receive`, { method: 'POST', headers });
    const data = await res.json();
    if (res.ok) {
      flash('ok', 'Shipment received — inventory updated!');
      setTransports(p => p.map(t => t._id === id ? { ...t, status: 'Delivered', receivedByUid: mongoUser?.uid } : t));
    } else flash('err', data.message);
  };

  const handleLoadCar = async (id) => {
    const res = await fetch(`${API}/transport/${id}/load`, {
      method: 'PUT', headers,
      body: JSON.stringify({ loadStatus: 'Loaded' })
    });
    const data = await res.json();
    if (res.ok) {
      flash('ok', 'Logistics loaded into transport vehicle! NGO can now dispatch.');
      setTransports(p => p.map(t => t._id === id ? { ...t, loadStatus: 'Loaded' } : t));
    } else flash('err', data.message);
  };

  const handleAssign = async (id) => {
    if (!assignUid.trim() || !assignName.trim()) return flash('err', 'Select a volunteer from the list');
    const res = await fetch(`${API}/transport/${id}/assign`, { method: 'POST', headers, body: JSON.stringify({ volunteerUid: assignUid, volunteerName: assignName }) });
    const data = await res.json();
    if (res.ok) {
      flash('ok', `${assignName} assigned`);
      setTransports(p => p.map(t => t._id === id ? data : t));
      closeAssignPanel();
    } else flash('err', data.message);
  };

  const closeAssignPanel = () => {
    setAssigningId(null);
    setAssignUid('');
    setAssignName('');
    setAvailableVolunteers([]);
  };

  const loadAvailableVolunteers = async (transport) => {
    setLoadingVolunteers(true);
    try {
      const exclude = (transport.assignedVolunteers || []).map(v => v.volunteerUid).join(',');
      const params = new URLSearchParams({ district: transport.district || '' });
      if (exclude) params.set('excludeUids', exclude);
      const res = await fetch(`${API}/volunteers/available?${params}`, { headers });
      if (res.ok) setAvailableVolunteers(await res.json());
      else setAvailableVolunteers([]);
    } catch (e) {
      setAvailableVolunteers([]);
      flash('err', 'Failed to load volunteer list');
    }
    setLoadingVolunteers(false);
  };

  const openAssignPanel = (transport) => {
    if (assigningId === transport._id) {
      closeAssignPanel();
      return;
    }
    setAssignUid('');
    setAssignName('');
    setAssigningId(transport._id);
    loadAvailableVolunteers(transport);
  };

  const handleSendChat = async () => {
    if (!chatText.trim() || !openChatId) return;
    setSendingChat(true);
    const res = await fetch(`${API}/transport/${openChatId}/chat`, { method: 'POST', headers, body: JSON.stringify({ text: chatText }) });
    if (res.ok) { setChatText(''); loadChat(openChatId); }
    else {
      const data = await res.json().catch(() => ({}));
      flash('err', data.message || 'Failed to send message');
    }
    setSendingChat(false);
  };

  if (!['NGO', 'Government', 'Volunteer', 'GovRepresentative', 'NGORepresentative', 'GovRepLogistics', 'NGORepLogistics'].includes(role)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Transport tracking is available for NGO, Government, Volunteer, and Representative roles only.</p>
        </div>
      </div>
    );
  }

  const isLogisticsRep = role === 'GovRepLogistics' || role === 'NGORepLogistics';

  const isHubMatch = (hubA, hubB) => {
    if (!hubA || !hubB) return false;
    const a = hubA.toLowerCase();
    const b = hubB.toLowerCase();
    return a.includes(b) || b.includes(a);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Truck className="w-6 h-6 text-blue-400" /> Transport Tracker
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {isRep
                ? `Incoming shipments for ${mongoUser?.campaignName || mongoUser?.shelterName || mongoUser?.assignedHub || 'your site'} — click Receive to update inventory`
                : 'Live supply transport status, volunteer assignments, and mission chat'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchAll} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            {(role === 'NGO' || role === 'Government') && (
              <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
                <PlusCircle className="w-4 h-4" /> New Transport
              </button>
            )}
          </div>
        </div>

        {msg && <div className="bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-lg text-sm">{msg}</div>}
        {err && <div className="bg-red-900/40 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg text-sm">{err}</div>}

        {/* Create Transport Form */}
        {showForm && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-white">New Transport Mission</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">District</label>
                <select value={fDistrict} onChange={e => setFDistrict(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
                  {DISTRICTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Origin Warehouse</label>
                <select value={fOrigin} onChange={e => setFOrigin(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
                  {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Destination</label>
                <input value={fDest} onChange={e => setFDest(e.target.value)} placeholder="Village / shelter name" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Estimated Arrival</label>
                <input type="datetime-local" value={fETA} onChange={e => setFETA(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-400 mb-1 block">Items Summary</label>
                <input value={fItems} onChange={e => setFItems(e.target.value)} placeholder="e.g. 500 food bags, 1000L water, 200 medicine kits" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCreate} disabled={posting} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
                {posting ? 'Creating...' : 'Create Transport'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Transport Cards */}
        {loading ? (
          <div className="text-center text-slate-400 py-16">Loading transports...</div>
        ) : transports.length === 0 ? (
          <div className="text-center text-slate-500 py-16">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            {role === 'Volunteer'
              ? <p>No transport missions assigned to you yet.<br /><span className="text-xs text-slate-600 mt-1 block">An admin will assign you to a transport mission.</span></p>
              : <p>No transport missions yet.</p>
            }
          </div>

        ) : (() => {
          const filteredTransports = transports.filter(t => {
            if (role === 'Volunteer') {
              // Backend already filters to only this volunteer's assigned transports
              return true;
            }

            // GOV Admin / NGO Admin:
            // Pending transports are hidden — they sit at the logistics hub waiting to be Loaded
            // then dispatched. Only show In Transit, Delivered, Cancelled.
            if (role === 'Government' || role === 'NGO') {
              return t.status !== 'Pending';
            }

            // Logistics Reps & Shelter Reps: see their hub / shelter transports (including Pending
            // so they can click Load Car or Received)
            if (role === 'NGORepresentative' || role === 'GovRepresentative' || role === 'GovRepLogistics' || role === 'NGORepLogistics') {
              const userHub = (mongoUser?.assignedHub || mongoUser?.shelterName || mongoUser?.campaignName || '').toLowerCase().trim();
              const userDist = (mongoUser?.district || '').toLowerCase().trim();

              const matchesHub = userHub && (
                isHubMatch(t.origin, userHub) || 
                isHubMatch(t.destination, userHub) || 
                isHubMatch(t.assignedHub, userHub) ||
                isHubMatch(userHub, t.origin) ||
                isHubMatch(userHub, t.destination)
              );
              const matchesDist = userDist && (
                (t.district || '').toLowerCase().includes(userDist) || 
                isHubMatch(t.district, userDist) ||
                (t.origin || '').toLowerCase().includes(userDist) ||
                (t.destination || '').toLowerCase().includes(userDist)
              );
              const matchesUid = t.representativeUid && t.representativeUid === mongoUser?.uid;

              if (!userHub && !userDist) return true;
              return matchesHub || matchesDist || matchesUid;
            }
            return true;
          });


          if (filteredTransports.length === 0) {
            return (
              <div className="text-center text-slate-500 py-16">
                <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                {(role === 'Government' || role === 'NGO')
                  ? <p>No active transport missions yet.<br /><span className="text-xs text-slate-600 mt-1 block">Pending transports are being loaded at the logistics hub. They will appear here once dispatched.</span></p>
                  : <p>No transport missions assigned to your area or account.</p>
                }
              </div>
            );
          }


          return (
            <div className="space-y-4">
              {filteredTransports.map((t) => (
                <div key={t._id} className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3 bg-slate-900 border border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[t.status] || 'bg-slate-700 text-slate-300'}`}>
                          {t.status}
                        </span>
                        {t.district && (
                          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-cyan-400" /> {t.district}
                          </span>
                        )}
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          t.loadStatus === 'Loaded'
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-950/80 text-amber-400 border border-amber-500/30'
                        }`}>
                          {t.loadStatus || 'Loaded'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1.5 flex items-center gap-2">
                        <span>{t.origin}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-cyan-300">{t.destination}</span>
                      </h3>
                      {t.itemsSummary && (
                        <p className="text-xs text-slate-400 mt-1">Cargo: <span className="text-white font-medium">{t.itemsSummary}</span></p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {isRep && t.status === 'In Transit' && (
                        facilityMatch(t.destination, mongoUser?.campaignName || mongoUser?.shelterName || mongoUser?.assignedHub)
                        || facilityMatch(t.restockWarehouse, mongoUser?.assignedHub || mongoUser?.shelterName || mongoUser?.campaignName)
                        || facilityMatch(t.assignedHub, mongoUser?.assignedHub)
                      ) ? (
                        <button onClick={() => handleReceive(t._id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-md cursor-pointer">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Receive
                        </button>
                      ) : null}
                      {role === 'Volunteer' && t.status !== 'Delivered' && t.status !== 'Cancelled' && (
                        <button onClick={() => handleStatusUpdate(t._id, 'Delivered')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-md cursor-pointer">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark Delivered
                        </button>
                      )}

                      {/* Load Car button for Hub Reps */}
                      {isLogisticsRep && t.loadStatus === 'Not Loaded' && t.status !== 'Delivered' && t.status !== 'Cancelled' && (
                        <button onClick={() => handleLoadCar(t._id)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 border border-amber-500/30 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" /> Load Car
                        </button>
                      )}

                      {(role === 'NGO' || role === 'Government' || (role === 'NGORepresentative' && isHubMatch(mongoUser?.assignedHub, t.assignedHub || t.origin))) && STATUS_NEXT[t.status] && (
                        <button onClick={() => handleStatusUpdate(t._id, STATUS_NEXT[t.status])}
                          disabled={t.loadStatus === 'Not Loaded'}
                          title={t.loadStatus === 'Not Loaded' ? 'Vehicle must be loaded by Logistics Hub before dispatching' : ''}
                          className="px-3 py-1.5 bg-blue-600/40 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed border border-blue-500/30 rounded-lg text-xs font-medium text-blue-300 transition-colors flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Mark {STATUS_NEXT[t.status]}
                        </button>
                      )}
                      {(role === 'NGO' || role === 'Government' || role === 'GovRepLogistics' || role === 'NGORepLogistics' || role === 'GovRepresentative' || role === 'NGORepresentative') && t.status !== 'Delivered' && t.status !== 'Cancelled' && (
                        <button onClick={() => openAssignPanel(t)}
                          className={`px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer ${assigningId === t._id ? 'bg-cyan-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}>
                          <UserCheck className="w-3.5 h-3.5" /> Assign Volunteer
                        </button>
                      )}
                      <button onClick={() => setOpenChatId(openChatId === t._id ? null : t._id)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${openChatId === t._id ? 'bg-violet-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
                        <MessageSquare className="w-3 h-3" /> Chat {chatMessages[t._id] ? `(${chatMessages[t._id].length})` : ''}
                      </button>
                    </div>
                  </div>

                  {/* Assigned Volunteers */}
                  {t.assignedVolunteers && t.assignedVolunteers.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <p className="text-xs text-slate-500 mb-1">Assigned volunteers</p>
                      <div className="flex flex-wrap gap-2">
                        {t.assignedVolunteers.map((v, i) => (
                          <span key={i} className="text-xs bg-cyan-900/30 border border-cyan-700/30 text-cyan-300 px-2 py-0.5 rounded-full">{v.volunteerName}</span>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Assign Volunteer Panel */}
                {assigningId === t._id && (
                  <div className="border-t border-slate-800 bg-slate-950/50 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Available Volunteers</p>
                      <span className="text-xs text-slate-500">{t.district} district first</span>
                    </div>

                    {loadingVolunteers ? (
                      <p className="text-sm text-slate-500 py-4 text-center">Loading volunteers...</p>
                    ) : availableVolunteers.length === 0 ? (
                      <p className="text-sm text-slate-500 py-4 text-center">No available volunteers found. Register volunteer accounts or accept applications in the Volunteer Hub.</p>
                    ) : (
                      <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                        {[...availableVolunteers]
                          .sort((a, b) => {
                            const aMatch = a.district === t.district;
                            const bMatch = b.district === t.district;
                            if (aMatch && !bMatch) return -1;
                            if (!aMatch && bMatch) return 1;
                            return 0;
                          })
                          .map(v => (
                          <button
                            key={v.uid}
                            type="button"
                            onClick={() => { setAssignUid(v.uid); setAssignName(v.name); }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors flex items-center justify-between gap-2 ${
                              assignUid === v.uid
                                ? 'bg-cyan-900/40 border-cyan-500 text-cyan-100'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-cyan-600/50 hover:bg-slate-800/80'
                            }`}
                          >
                            <div>
                              <span className="font-medium">{v.name}</span>
                              {v.email && <p className="text-xs text-slate-500 mt-0.5">{v.email}</p>}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                              v.district === t.district
                                ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/30 font-bold'
                                : 'bg-slate-900 text-slate-400 border border-slate-700'
                            }`}>
                              {v.district}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {assignUid && (
                      <p className="text-xs text-cyan-400">
                        Selected: <span className="font-semibold">{assignName}</span>
                      </p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleAssign(t._id)}
                        disabled={!assignUid}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                      >
                        Assign Selected
                      </button>
                      <button onClick={closeAssignPanel} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors">Cancel</button>
                    </div>
                  </div>
                )}

                {/* Chat Panel */}
                {openChatId === t._id && (
                  <div className="border-t border-slate-800 bg-slate-950/70">
                    <div className="p-3 border-b border-slate-800 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-violet-400" />
                      <span className="text-sm font-medium text-slate-300">Mission Chat — {t.origin} → {t.destination}</span>
                    </div>
                    <div className="p-4 max-h-64 overflow-y-auto space-y-2">
                      {(chatMessages[t._id] || []).length === 0 && (
                        <p className="text-xs text-slate-500 text-center py-4">No messages yet. Start the conversation.</p>
                      )}
                      {(chatMessages[t._id] || []).map((m, i) => {
                        const isMe = m.senderName === mongoUser?.name;
                        return (
                          <div key={i} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${isMe ? 'bg-violet-700 text-white' : 'bg-slate-800 text-slate-200'}`}>
                              {!isMe && <p className="text-xs font-medium text-violet-400 mb-0.5">{m.senderName} <span className="text-slate-500 font-normal">({m.senderRole})</span></p>}
                              <p>{m.text}</p>
                              <p className={`text-xs mt-1 ${isMe ? 'text-violet-300' : 'text-slate-500'}`}>{new Date(m.sentAt).toLocaleTimeString()}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="p-3 border-t border-slate-800 flex gap-2">
                      <input value={chatText} onChange={e => setChatText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                        placeholder="Type a message... (Enter to send)"
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 text-slate-200" />
                      <button onClick={handleSendChat} disabled={sendingChat} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg transition-colors">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
        })()}
      </div>
    </div>
  );
}
