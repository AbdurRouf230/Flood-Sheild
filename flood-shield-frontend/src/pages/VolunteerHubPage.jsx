import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users, MapPin, Briefcase, CheckCircle2, Clock, XCircle,
  PlusCircle, RefreshCw, ChevronDown, Send, AlertTriangle, TrendingUp, UserCheck,
  Tag
} from 'lucide-react';

const TASK_TYPES = ['Supply Distribution', 'Shelter Support', 'Search & Rescue', 'Medical Aid', 'Data Collection', 'Transport Escort'];
const ASSIGNABLE_TASKS = ['Relief Support Transport', 'Incident Verification', 'Rescue Operation'];
const DISTRICTS = ['Sylhet', 'Sunamganj', 'Kurigram', 'Gaibandha', 'Netrokona', 'Sirajganj', 'Jamalpur', 'Bogura', 'Dhaka', 'Chittagong'];

const STATUS_STYLES = {
  Open: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Filled: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Closed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  Pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  Accepted: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const TASK_STYLES = {
  'Relief Support Transport': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  'Incident Verification': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  'Rescue Operation': 'bg-red-500/20 text-red-300 border-red-500/40',
  'Unassigned': 'bg-slate-800 text-slate-400 border-slate-700'
};

export default function VolunteerHubPage() {
  const { token, mongoUser } = useAuth();
  const role = mongoUser?.role || 'Citizen';
  const isManager = role === 'NGO' || role === 'Government' || role === 'NGORepresentative' || role === 'GovRepresentative';
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [tab, setTab] = useState('board'); // board | myapps | volunteers | map
  const [slots, setSlots] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [mapData, setMapData] = useState([]);
  const [volunteersList, setVolunteersList] = useState([]);
  const [slotApps, setSlotApps] = useState({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Volunteer Directory search and filters
  const [volSearch, setVolSearch] = useState('');
  const [volDistrictFilter, setVolDistrictFilter] = useState('All');
  const [volOrgFilter, setVolOrgFilter] = useState('All');
  const [volTaskFilter, setVolTaskFilter] = useState('All');
  const [assigningUid, setAssigningUid] = useState(null);
  const [selectedTaskMap, setSelectedTaskMap] = useState({});

  // Create slot form
  const [showForm, setShowForm] = useState(false);
  const [fDistrict, setFDistrict] = useState('Sylhet');
  const [fTask, setFTask] = useState(TASK_TYPES[0]);
  const [fCount, setFCount] = useState('5');
  const [fDesc, setFDesc] = useState('');
  const [posting, setPosting] = useState(false);

  // Apply form
  const [applyMsg, setApplyMsg] = useState('');
  const [applyCvName, setApplyCvName] = useState('');
  const [applyNidNumber, setApplyNidNumber] = useState('');
  const [applyNidImageName, setApplyNidImageName] = useState('');
  const [applyingId, setApplyingId] = useState(null);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchAll = async () => {
    if (!token) return;
    setLoading(true);
    const hdrs = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    try {
      const [sRes, mRes, vRes] = await Promise.all([
        fetch(`${API}/volunteers/slots`, { headers: hdrs }),
        fetch(`${API}/volunteers/map`, { headers: hdrs }),
        fetch(`${API}/volunteers/available`, { headers: hdrs })
      ]);
      if (sRes.ok) setSlots(await sRes.json());
      if (mRes.ok) setMapData(await mRes.json());
      if (vRes.ok) setVolunteersList(await vRes.json());

      const currentRole = mongoUser?.role;
      if (currentRole === 'Volunteer' || currentRole === 'Citizen') {
        const aRes = await fetch(`${API}/volunteers/applications/mine`, { headers: hdrs });
        if (aRes.ok) setMyApps(await aRes.json());
      }
    } catch (e) { setErr('Failed to load volunteer data'); }
    setLoading(false);
  };

  useEffect(() => { if (token && mongoUser) fetchAll(); }, [token, mongoUser?.role]);

  const loadSlotApps = async (slotId) => {
    if (slotApps[slotId]) return;
    const hdrs = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    const res = await fetch(`${API}/volunteers/applications/slot/${slotId}`, { headers: hdrs });
    if (res.ok) {
      const data = await res.json();
      setSlotApps(prev => ({ ...prev, [slotId]: data }));
    }
  };

  const handlePostSlot = async () => {
    if (!fCount || parseInt(fCount) < 1) return setErr('Volunteer count must be at least 1');
    setPosting(true); setErr(''); setMsg('');
    const res = await fetch(`${API}/volunteers/slots`, {
      method: 'POST', headers,
      body: JSON.stringify({ district: fDistrict, taskType: fTask, volunteersNeeded: parseInt(fCount), description: fDesc })
    });
    const data = await res.json();
    if (res.ok) { setMsg('Slot posted successfully!'); setSlots(prev => [data, ...prev]); setShowForm(false); setFDesc(''); setFCount('5'); }
    else setErr(data.message);
    setPosting(false);
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  const handleApply = async (slotId) => {
    if (!applyCvName || !applyNidNumber || !applyNidImageName) {
      setErr('CV, NID Number, and NID Image are required.');
      return;
    }
    setApplyingId(slotId); setErr(''); setMsg('');
    try {
      const cvBase64 = await fileToBase64(applyCvName);
      const nidImageBase64 = await fileToBase64(applyNidImageName);

      const res = await fetch(`${API}/volunteers/slots/${slotId}/apply`, {
        method: 'POST', headers,
        body: JSON.stringify({ 
          message: applyMsg,
          cvUrl: cvBase64,
          nidNumber: applyNidNumber,
          nidImageUrl: nidImageBase64
        })
      });
      const data = await res.json();
      if (res.ok) { 
        setMsg('Application submitted successfully!'); 
        setMyApps(prev => [data, ...prev]); 
        setApplyMsg(''); 
        setApplyCvName('');
        setApplyNidNumber('');
        setApplyNidImageName('');
        setApplyingId(null);
      } else {
        setErr(data.message);
        setApplyingId(null);
      }
    } catch (e) {
      setErr('Failed to read files or submit application.');
      setApplyingId(null);
    }
  };

  const handleRespond = async (slotId, appId, action) => {
    setErr(''); setMsg('');
    const res = await fetch(`${API}/volunteers/slots/${slotId}/applications/${appId}/respond`, {
      method: 'PUT', headers,
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(`Application ${action}ed`);
      setSlotApps(prev => ({
        ...prev,
        [slotId]: (prev[slotId] || []).map(a => a._id === appId ? data : a)
      }));
    } else setErr(data.message);
  };

  const handleClose = async (slotId) => {
    const res = await fetch(`${API}/volunteers/slots/${slotId}/close`, { method: 'PUT', headers });
    if (res.ok) { setSlots(prev => prev.map(s => s._id === slotId ? { ...s, status: 'Closed' } : s)); setMsg('Slot closed.'); }
  };

  const handleAssignTask = async (uid, taskToAssign) => {
    if (!taskToAssign) return;
    setAssigningUid(uid); setErr(''); setMsg('');
    try {
      const res = await fetch(`${API}/volunteers/${uid}/task`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ task: taskToAssign })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`✅ Assigned "${taskToAssign}" to volunteer`);
        setVolunteersList(prev => prev.map(v => v.uid === uid ? { ...v, assignedTask: taskToAssign } : v));
      } else {
        setErr(data.message || 'Failed to assign task');
      }
    } catch (e) {
      setErr('Error assigning task to volunteer');
    } finally {
      setAssigningUid(null);
    }
  };

  const alreadyApplied = (slotId) => myApps.some(a => a.slotId === slotId);

  const isNgoRole = role === 'NGO' || role === 'NGORepresentative';
  const isGovRole = role === 'Government' || role === 'GovRepresentative';

  const filteredVolunteers = volunteersList.filter(v => {
    const isVolGov = v.name?.includes('[GOV]') || v.orgName?.toLowerCase().includes('government') || v.orgName?.toLowerCase().includes('dmro');
    const isVolNgo = v.name?.includes('[BRAC]') || v.orgName?.toLowerCase().includes('ngo') || v.orgName?.toLowerCase().includes('brac') || (!isVolGov && !v.name?.includes('[GOV]'));

    // Strict role scoping: NGO sees ONLY NGO volunteers, GOV sees ONLY GOV volunteers
    if (isNgoRole && !isVolNgo) return false;
    if (isGovRole && !isVolGov) return false;

    const nameMatch = !volSearch.trim() || (v.name || '').toLowerCase().includes(volSearch.toLowerCase()) || (v.district || '').toLowerCase().includes(volSearch.toLowerCase());
    const districtMatch = volDistrictFilter === 'All' || v.district === volDistrictFilter;
    const orgMatch = volOrgFilter === 'All' || (volOrgFilter === 'GOV' && isVolGov) || (volOrgFilter === 'NGO' && isVolNgo);
    const taskMatch = volTaskFilter === 'All' || (volTaskFilter === 'Unassigned' ? (!v.assignedTask || v.assignedTask === 'Unassigned') : v.assignedTask === volTaskFilter);

    return nameMatch && districtMatch && orgMatch && taskMatch;
  }).sort((a, b) => {
    if (a.uid === mongoUser?.uid) return -1;
    if (b.uid === mongoUser?.uid) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-cyan-400" /> Volunteer Hub
            </h1>
            <p className="text-slate-400 text-sm mt-1">Volunteer coordination, job board, volunteer directory & task assignment</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchAll} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            {(role === 'NGO' || role === 'Government') && (
              <button onClick={() => setShowForm(v => !v)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium transition-colors">
                <PlusCircle className="w-4 h-4" /> Post Volunteer Slot
              </button>
            )}
          </div>
        </div>

        {/* Citizen Role Banner */}
        {role === 'Citizen' && (
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-300 text-xs flex items-center gap-3">
            <UserCheck className="w-5 h-5 flex-shrink-0 text-cyan-400" />
            <span>
              <strong>Citizen Volunteer Opportunity:</strong> You can apply for any open volunteer job slot below. Once an NGO or Government organizer <strong>ACCEPTS</strong> your application, your account role will automatically be upgraded from <strong>Citizen</strong> to <strong>Volunteer</strong>!
            </span>
          </div>
        )}

        {/* Alerts */}
        {msg && <div className="bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-lg text-sm">{msg}</div>}
        {err && <div className="bg-red-900/40 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg text-sm">{err}</div>}

        {/* Post Slot Form */}
        {showForm && (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
            <h3 className="font-semibold text-white">New Volunteer Slot</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">District</label>
                <select value={fDistrict} onChange={e => setFDistrict(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500">
                  {DISTRICTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Task Type</label>
                <select value={fTask} onChange={e => setFTask(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500">
                  {TASK_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Volunteers Needed</label>
                <input type="number" min="1" value={fCount} onChange={e => setFCount(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Description (optional)</label>
                <input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Brief task details..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={handlePostSlot} disabled={posting} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
                {posting ? 'Posting...' : 'Post Slot'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900 p-1 rounded-xl w-fit flex-wrap">
          {[
            { id: 'board', label: 'Job Board', icon: Briefcase },
            ...((role === 'Volunteer' || role === 'Citizen') ? [{ id: 'myapps', label: 'My Applications', icon: UserCheck }] : []),
            ...(role !== 'Citizen' ? [{ id: 'volunteers', label: 'Volunteer Directory & Tasks', icon: Users }] : []),
            { id: 'map', label: 'District Need Map', icon: MapPin }
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-slate-400 py-16">Loading volunteer data...</div>
        ) : (
          <>
            {/* Job Board */}
            {tab === 'board' && (
              <div className="space-y-4">
                {slots.length === 0 && <div className="text-center text-slate-500 py-10">No volunteer slots posted yet.</div>}
                {slots.map(slot => (
                  <div key={slot._id} className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_STYLES[slot.status]}`}>{slot.status}</span>
                          <span className="font-semibold text-white">{slot.taskType}</span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">
                          <MapPin className="inline w-3 h-3 mr-1" />{slot.district} &nbsp;·&nbsp;
                          <Users className="inline w-3 h-3 mr-1" />{slot.volunteersNeeded} needed &nbsp;·&nbsp;
                          Posted by <span className="text-slate-300">{slot.postedBy}</span> ({slot.postedByRole})
                        </p>
                        {slot.description && <p className="text-xs text-slate-500 mt-1">{slot.description}</p>}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {(role === 'Volunteer' || role === 'Citizen') && slot.status === 'Open' && !alreadyApplied(slot._id) && (
                          <button onClick={() => setApplyingId(applyingId === slot._id ? null : slot._id)}
                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-medium transition-colors">
                            Apply
                          </button>
                        )}
                        {(role === 'Volunteer' || role === 'Citizen') && alreadyApplied(slot._id) && (
                          <span className="px-3 py-1.5 bg-slate-700 rounded-lg text-xs text-slate-400">Applied</span>
                        )}
                        {(role === 'NGO' || role === 'Government') && (
                          <>
                            <button onClick={() => { loadSlotApps(slot._id); setApplyingId(applyingId === slot._id ? null : slot._id); }}
                              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs transition-colors flex items-center gap-1">
                              <ChevronDown className="w-3 h-3" /> Applications
                            </button>
                            {slot.status === 'Open' && (
                              <button onClick={() => handleClose(slot._id)}
                                className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 rounded-lg text-xs text-red-400 transition-colors">
                                Close Slot
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {(role === 'Volunteer' || role === 'Citizen') && applyingId === slot._id && slot.status === 'Open' && !alreadyApplied(slot._id) && (
                      <div className="pt-4 mt-2 border-t border-slate-700 flex flex-col gap-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-400 mb-1 block">CV (PDF)</label>
                            <input type="file" accept=".pdf" onChange={e => setApplyCvName(e.target.files[0])}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer" />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-400 mb-1 block">NID Card Number</label>
                            <input type="text" value={applyNidNumber} onChange={e => setApplyNidNumber(e.target.value)} placeholder="e.g., 1234567890"
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500 text-slate-200" />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-slate-400 mb-1 block">NID Image</label>
                            <input type="file" accept="image/*" onChange={e => setApplyNidImageName(e.target.files[0])}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input value={applyMsg} onChange={e => setApplyMsg(e.target.value)} placeholder="Short application message..."
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 text-slate-200" />
                          <button onClick={() => handleApply(slot._id)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap">
                            <Send className="w-3 h-3" /> Submit
                          </button>
                        </div>
                      </div>
                    )}

                    {(role === 'NGO' || role === 'Government') && applyingId === slot._id && (
                      <div className="pt-3 border-t border-slate-700 space-y-2">
                        <p className="text-xs text-slate-400 font-medium">Applications</p>
                        {(slotApps[slot._id] || []).length === 0 && <p className="text-xs text-slate-500">No applications yet.</p>}
                        {(slotApps[slot._id] || []).map(app => (
                          <div key={app._id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-800 rounded-lg px-4 py-3 gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-200">{app.volunteerName}</span>
                                <span className="text-xs text-slate-500">({app.volunteerDistrict})</span>
                              </div>
                              {app.message && <p className="text-xs text-slate-400 mt-1">"{app.message}"</p>}
                              
                              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                                {app.nidNumber && <span className="text-[11px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">NID: <span className="font-mono text-cyan-400">{app.nidNumber}</span></span>}
                                {app.cvUrl && (
                                  <a href={app.cvUrl} download="volunteer-cv.pdf" className="text-[11px] text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1">
                                    📄 Download CV
                                  </a>
                                )}
                                {app.nidImageUrl && (
                                  <a href={app.nidImageUrl} download="volunteer-nid.png" className="text-[11px] text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1">
                                    🖼️ Download NID Image
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[app.status]}`}>{app.status}</span>
                              {app.status === 'Pending' && (
                                <>
                                  <button onClick={() => handleRespond(slot._id, app._id, 'accept')} className="px-3 py-1.5 bg-emerald-700/50 hover:bg-emerald-700 rounded-lg text-xs text-emerald-300 transition-colors">Accept</button>
                                  <button onClick={() => handleRespond(slot._id, app._id, 'reject')} className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 rounded-lg text-xs text-red-400 transition-colors">Reject</button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {slot.assignedVolunteers && slot.assignedVolunteers.length > 0 && (
                      <div className="pt-2 border-t border-slate-700">
                        <p className="text-xs text-slate-500 mb-1">Assigned volunteers ({slot.assignedVolunteers.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {slot.assignedVolunteers.map((v, i) => (
                            <span key={i} className="text-xs bg-cyan-900/30 border border-cyan-700/30 text-cyan-300 px-2 py-0.5 rounded-full">{v.volunteerName}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* My Applications — Volunteer only */}
            {tab === 'myapps' && role === 'Volunteer' && (
              <div className="space-y-3">
                {myApps.length === 0 && <div className="text-center text-slate-500 py-10">You haven't applied to any slots yet.</div>}
                {myApps.map(app => (
                  <div key={app._id} className="bg-slate-900 border border-slate-700 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-200">Slot ID: {app.slotId}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Applied {new Date(app.appliedAt).toLocaleString()}</p>
                      {app.message && <p className="text-xs text-slate-400 mt-1">"{app.message}"</p>}
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full border font-medium ${STATUS_STYLES[app.status]}`}>{app.status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Volunteer Directory & Task Assignments (NGO & GOV) */}
            {(tab === 'volunteers' && role !== 'Citizen') && (
              <div className="space-y-6">
                {/* Search & Filter Bar */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Search Volunteer / District</label>
                    <input
                      type="text"
                      value={volSearch}
                      onChange={e => setVolSearch(e.target.value)}
                      placeholder="e.g. Jamal, Sylhet..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Filter District</label>
                    <select
                      value={volDistrictFilter}
                      onChange={e => setVolDistrictFilter(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="All">All Districts</option>
                      {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Affiliation Scope</label>
                    <select
                      value={volOrgFilter}
                      onChange={e => setVolOrgFilter(e.target.value)}
                      disabled={isNgoRole || isGovRole}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 disabled:opacity-80"
                    >
                      {isNgoRole && <option value="All">Scoped: NGO Volunteers Only</option>}
                      {isGovRole && <option value="All">Scoped: GOV Volunteers Only</option>}
                      {!isNgoRole && !isGovRole && (
                        <>
                          <option value="All">All Organizations</option>
                          <option value="GOV">Government (GOV)</option>
                          <option value="NGO">NGO (BRAC)</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 mb-1 block">Filter Assigned Task</label>
                    <select
                      value={volTaskFilter}
                      onChange={e => setVolTaskFilter(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="All">All Tasks</option>
                      {ASSIGNABLE_TASKS.map(t => <option key={t} value={t}>{t}</option>)}
                      <option value="Unassigned">Unassigned</option>
                    </select>
                  </div>
                </div>

                {/* Volunteers Cards Grid */}
                {filteredVolunteers.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-500 text-sm">
                    No volunteers found matching the filters.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredVolunteers.map(vol => {
                      const currentTask = vol.assignedTask || 'Unassigned';
                      const selectedTask = selectedTaskMap[vol.uid] || ASSIGNABLE_TASKS[0];
                      const isGov = vol.name?.includes('[GOV]') || vol.orgName?.includes('Government');
                      const isNgo = vol.name?.includes('[BRAC]') || vol.orgName?.includes('NGO') || vol.orgName?.includes('BRAC');

                      return (
                        <div key={vol.uid} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 shadow-lg transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-white text-base">{vol.name}</h3>
                                {isGov && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    GOV
                                  </span>
                                )}
                                {isNgo && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    NGO (BRAC)
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                <span><MapPin className="inline w-3 h-3 text-rose-400" /> {vol.district}</span>
                                {vol.email && <span className="font-mono text-slate-500">· {vol.email}</span>}
                              </p>
                            </div>

                            {/* Assigned Task Badge */}
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${TASK_STYLES[currentTask] || TASK_STYLES.Unassigned}`}>
                              {currentTask === 'Relief Support Transport' && '🚚 '}
                              {currentTask === 'Incident Verification' && '🔍 '}
                              {currentTask === 'Rescue Operation' && '🚨 '}
                              {currentTask}
                            </span>
                          </div>

                          {/* Task Assignment Control */}
                          {isManager && (
                            <div className="pt-3 border-t border-slate-800 space-y-2">
                              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                                <Tag className="w-3 h-3 text-cyan-400" /> Assign New Task:
                              </label>
                              <div className="flex gap-2">
                                <select
                                  value={selectedTask}
                                  onChange={e => setSelectedTaskMap(prev => ({ ...prev, [vol.uid]: e.target.value }))}
                                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                                >
                                  {ASSIGNABLE_TASKS.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                  <option value="Unassigned">Unassigned</option>
                                </select>

                                <button
                                  onClick={() => handleAssignTask(vol.uid, selectedTask)}
                                  disabled={assigningUid === vol.uid}
                                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
                                >
                                  {assigningUid === vol.uid ? 'Assigning...' : 'Assign Task'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* District Need Map */}
            {tab === 'map' && (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">Districts ranked by need score (approved incidents + open volunteer slots needed)</p>
                {mapData.map((d, i) => (
                  <div key={d.district} className="bg-slate-900 border border-slate-700 rounded-xl px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs font-mono w-5">#{i + 1}</span>
                        <span className="font-medium text-white">{d.district}</span>
                        {d.needScore >= 5 && <span className="text-xs bg-red-900/40 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> High Need</span>}
                      </div>
                      <span className="text-lg font-bold text-cyan-400">{d.needScore}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
                      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (d.needScore / 15) * 100)}%` }} />
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span><TrendingUp className="inline w-3 h-3 mr-1 text-orange-400" />{d.approvedIncidents} approved incidents</span>
                      <span><Users className="inline w-3 h-3 mr-1 text-cyan-400" />{d.volunteersNeeded} volunteers needed</span>
                    </div>
                  </div>
                ))}
                {mapData.length === 0 && <div className="text-center text-slate-500 py-10">No map data available.</div>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
