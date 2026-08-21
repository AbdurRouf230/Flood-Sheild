import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Heart, Send, Trophy, MapPin, Clock, RefreshCw, Building2, ShieldCheck, Award, DollarSign, CheckCircle2, Wallet, PackageCheck, Tent, Truck, HandCoins } from 'lucide-react';

const DISTRICTS = ['Sylhet', 'Sunamganj', 'Kurigram', 'Gaibandha', 'Netrokona', 'Sirajganj', 'Jamalpur', 'Bogura', 'Dhaka', 'Chittagong', 'General'];
const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];
const GOV_GRANT_PRESETS = [10000, 25000, 50000, 100000, 250000];
const NGO_ALLOC_PRESETS = [10000, 25000, 50000, 100000];
const REQUEST_PRESETS = [10000, 25000, 50000, 100000];

const REGISTERED_NGOS = [
  { name: 'Care Flood Response', area: 'Kurigram' },
  { name: 'BRAC Disaster Relief Partner (NGO)', area: 'Sylhet' },
  { name: 'Disaster Relief BD', area: 'Sunamganj' },
  { name: 'Red Crescent Flood Relief Unit', area: 'Netrokona' },
  { name: 'Bangladesh Red Crescent Society', area: 'Dhaka' },
  { name: 'Sylhet Local Emergency Relief', area: 'Sylhet' }
];

const CAMPAIGN_TARGETS = [
  'Sylhet Haor Relief Camp',
  'Sunamganj Emergency Food Drive',
  'Kurigram Flood Shelter Relief',
  'Gaibandha Clean Water Campaign',
  'Custom Campaign...'
];

const LOGISTICS_TARGETS = [
  'Sylhet Disaster Logistics Hub',
  'Kurigram Regional Supply Depot',
  'Sunamganj Procurement Warehouse',
  'Dhaka Central Medical Warehouse',
  'Custom Logistics Hub...'
];

export default function DonatePage() {
  const { token, mongoUser } = useAuth();
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const isGovAdmin = mongoUser?.role === 'Government';
  const isNGOAdmin = mongoUser?.role === 'NGO';
  const isGovRep = mongoUser?.role === 'GovRepresentative' || mongoUser?.role === 'GovRepLogistics';
  const isNgoRep = mongoUser?.role === 'NGORepresentative' || mongoUser?.role === 'NGORepLogistics';
  const isFieldRep = isGovRep || isNgoRep;

  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [donorName, setDonorName] = useState(mongoUser?.name || '');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [district, setDistrict] = useState('General');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [err, setErr] = useState('');
  const [totalRaised, setTotalRaised] = useState(0);

  // Government NGO Disbursement state
  const [disbursements, setDisbursements] = useState([]);
  const [totalDisbursed, setTotalDisbursed] = useState(0);
  const [disbNgoName, setDisbNgoName] = useState(REGISTERED_NGOS[0].name);
  const [customNgo, setCustomNgo] = useState('');
  const [disbDistrict, setDisbDistrict] = useState('Sylhet');
  const [disbAmount, setDisbAmount] = useState('');
  const [disbNotes, setDisbNotes] = useState('');
  const [disbSubmitting, setDisbSubmitting] = useState(false);
  const [disbSuccess, setDisbSuccess] = useState('');
  const [disbErr, setDisbErr] = useState('');

  // NGO Admin Treasury & Fund Distribution state
  const [ngoTreasury, setNgoTreasury] = useState(null);
  const [allocTargetType, setAllocTargetType] = useState('Campaign');
  const [allocTargetName, setAllocTargetName] = useState(CAMPAIGN_TARGETS[0]);
  const [customTarget, setCustomTarget] = useState('');
  const [allocAmount, setAllocAmount] = useState('');
  const [allocNotes, setAllocNotes] = useState('');
  const [allocSubmitting, setAllocSubmitting] = useState(false);
  const [allocSuccess, setAllocSuccess] = useState('');
  const [allocErr, setAllocErr] = useState('');

  const [fundingRequests, setFundingRequests] = useState([]);
  const [reqAmount, setReqAmount] = useState('');
  const [reqPurpose, setReqPurpose] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);
  const [reqSuccess, setReqSuccess] = useState('');
  const [reqErr, setReqErr] = useState('');
  const [fulfillingId, setFulfillingId] = useState('');

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/donations/public`);
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
        setTotalRaised(data.reduce((s, d) => s + d.amount, 0));
      }
    } catch (e) { /* no-op */ }
    setLoading(false);
  };

  const fetchDisbursements = async () => {
    try {
      const res = await fetch(`${API}/donations/disbursements`);
      if (res.ok) {
        const data = await res.json();
        setDisbursements(data.disbursements || []);
        setTotalDisbursed(data.totalDisbursed || 0);
      }
    } catch (e) { /* no-op */ }
  };

  const fetchNGOTreasury = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/donations/ngo-treasury`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNgoTreasury(data);
      }
    } catch (e) { /* no-op */ }
  };

  const fetchFundingRequests = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/donations/funding-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setFundingRequests(await res.json());
    } catch (e) { /* no-op */ }
  };

  useEffect(() => {
    fetchLeaderboard();
    fetchDisbursements();
    if (isNGOAdmin) fetchNGOTreasury();
    if (isNGOAdmin || isGovAdmin || isFieldRep) fetchFundingRequests();
  }, [token, isNGOAdmin, isGovAdmin, isFieldRep]);

  const handleDonate = async () => {
    if (!donorName.trim()) return setErr('Please enter your name.');
    if (!amount || isNaN(amount) || Number(amount) < 1) return setErr('Enter a valid amount (min 1 BDT).');
    setSubmitting(true); setErr(''); setSuccess('');
    try {
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const res = await fetch(`${API}/donations`, {
        method: 'POST', headers,
        body: JSON.stringify({ donorName: donorName.trim(), amount: Number(amount), message: message.trim(), district })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Thank you ${donorName}! Your donation of ৳${Number(amount).toLocaleString()} has been recorded. 💙`);
        setAmount(''); setMessage('');
        fetchLeaderboard();
      } else setErr(data.message);
    } catch (e) { setErr('Failed to submit donation. Please try again.'); }
    setSubmitting(false);
  };

  const handleDisburseNGO = async () => {
    const targetNGO = disbNgoName === 'Custom' ? customNgo.trim() : disbNgoName;
    if (!targetNGO) return setDisbErr('Please select or specify an NGO Partner name.');
    if (!disbAmount || isNaN(disbAmount) || Number(disbAmount) < 1) return setDisbErr('Enter a valid grant allocation amount (min 1 BDT).');

    setDisbSubmitting(true); setDisbErr(''); setDisbSuccess('');
    try {
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const res = await fetch(`${API}/donations/disburse`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ngoName: targetNGO,
          amount: Number(disbAmount),
          district: disbDistrict,
          notes: disbNotes.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setDisbSuccess(`🏛️ Successfully disbursed ৳${Number(disbAmount).toLocaleString()} grant to ${targetNGO}!`);
        setDisbAmount(''); setDisbNotes(''); setCustomNgo('');
        fetchDisbursements();
      } else setDisbErr(data.message || 'Failed to disburse funding.');
    } catch (e) { setDisbErr('Server connection error. Please try again.'); }
    setDisbSubmitting(false);
  };

  const handleNGOAllocate = async () => {
    const targetName = allocTargetName.startsWith('Custom') ? customTarget.trim() : allocTargetName;
    if (!targetName) return setAllocErr('Please select or specify a target Campaign or Logistics Hub.');
    if (!allocAmount || isNaN(allocAmount) || Number(allocAmount) < 1) return setAllocErr('Enter a valid allocation amount (min 1 BDT).');

    setAllocSubmitting(true); setAllocErr(''); setAllocSuccess('');
    try {
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const res = await fetch(`${API}/donations/ngo-allocate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetType: allocTargetType,
          targetName,
          amount: Number(allocAmount),
          notes: allocNotes.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAllocSuccess(`💚 Successfully distributed ৳${Number(allocAmount).toLocaleString()} to ${allocTargetType}: ${targetName}!`);
        setAllocAmount(''); setAllocNotes(''); setCustomTarget('');
        fetchNGOTreasury();
        fetchFundingRequests();
      } else setAllocErr(data.message || 'Failed to allocate funding.');
    } catch (e) { setAllocErr('Server connection error. Please try again.'); }
    setAllocSubmitting(false);
  };

  const handleRequestFunding = async () => {
    if (!reqAmount || isNaN(reqAmount) || Number(reqAmount) < 1) return setReqErr('Enter a valid request amount (min 1 BDT).');
    setReqSubmitting(true); setReqErr(''); setReqSuccess('');
    try {
      const res = await fetch(`${API}/donations/funding-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: Number(reqAmount),
          purpose: reqPurpose.trim(),
          district: mongoUser?.district || 'General'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setReqSuccess(data.message || 'Funding request sent to your admin.');
        setReqAmount('');
        setReqPurpose('');
        fetchFundingRequests();
      } else setReqErr(data.message || 'Failed to send funding request.');
    } catch (e) { setReqErr('Server connection error. Please try again.'); }
    setReqSubmitting(false);
  };

  const handleFulfillRequest = async (id) => {
    setFulfillingId(id);
    setDisbErr(''); setAllocErr('');
    try {
      const res = await fetch(`${API}/donations/funding-requests/${id}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        if (isGovAdmin) {
          setDisbSuccess(data.message);
          fetchDisbursements();
        } else {
          setAllocSuccess(data.message);
          fetchNGOTreasury();
        }
        fetchFundingRequests();
      } else if (isGovAdmin) setDisbErr(data.message || 'Failed to disburse this request.');
      else setAllocErr(data.message || 'Failed to allocate this request.');
    } catch (e) {
      if (isGovAdmin) setDisbErr('Server connection error. Please try again.');
      else setAllocErr('Server connection error. Please try again.');
    }
    setFulfillingId('');
  };

  const medal = (i) => ['🥇', '🥈', '🥉'][i] || `#${i + 1}`;
  const pendingAdminRequests = fundingRequests.filter((r) => r.status === 'Pending');
  const repSiteLabel = mongoUser?.campaignName || mongoUser?.shelterName || mongoUser?.assignedHub || mongoUser?.orgName || 'your assigned site';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-rose-600/20 to-pink-600/20 border border-rose-500/30 px-6 py-3 rounded-full">
            <Heart className="w-6 h-6 text-rose-400 fill-rose-400" />
            <h1 className="text-2xl font-bold text-white">Flood Relief Donations & Funding</h1>
          </div>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto">
            Community contributions and Government relief grants go directly toward emergency flood operations — supplying food, medicine, and shelter to affected communities in Bangladesh.
          </p>
        </div>

        {/* Community & Treasury Overview Banner */}
        <div className="glass-panel p-5 border border-slate-200 dark:border-white/5 rounded-2xl bg-white/80 dark:bg-slate-900/60 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 font-heading flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-400" /> Disaster Relief Treasury Summary
            </h3>
            <button
              onClick={() => { fetchLeaderboard(); fetchDisbursements(); if (isNGOAdmin) fetchNGOTreasury(); if (isNGOAdmin || isGovAdmin || isFieldRep) fetchFundingRequests(); }}
              className="px-3 py-1.5 bg-rose-900/30 hover:bg-rose-900/50 border border-rose-500/20 rounded-lg text-xs text-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Totals
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-700/80 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">Total Community Raised</p>
              <p className="text-3xl font-bold text-emerald-400">৳{totalRaised.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">from public donors</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-700/80 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">Govt Grants Disbursed to NGOs</p>
              <p className="text-3xl font-bold text-violet-400">৳{totalDisbursed.toLocaleString()}</p>
              <p className="text-xs text-violet-300/80 mt-1">grant allocations</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-700/80 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">Total Donors & Grants</p>
              <p className="text-3xl font-bold text-cyan-400">{leaderboard.length + disbursements.length}</p>
              <p className="text-xs text-slate-500 mt-1">verified contributions</p>
            </div>
          </div>
        </div>

        {/* NGO ADMIN EXCLUSIVE SECTION: NGO TREASURY & FUND DISTRIBUTION */}
        {isNGOAdmin && (
          <div className="bg-gradient-to-br from-slate-900 via-emerald-950/30 to-slate-900 border-2 border-emerald-500/40 rounded-2xl p-6 space-y-6 shadow-xl shadow-emerald-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-400 mb-1">
                  <Wallet className="w-4 h-4 text-emerald-400" /> NGO Executive Treasury & Budget Center
                </div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" /> NGO Relief Treasury & Fund Allocation
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage your organization's budget, view government grants received, and allocate funds directly to Active Campaigns & Logistics Hubs.
                </p>
              </div>

              <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl px-4 py-2.5 text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Available Unallocated Treasury</span>
                <span className="text-xl font-bold text-emerald-400">৳{(ngoTreasury?.availableBudget || 500000).toLocaleString()} <span className="text-xs text-slate-400 font-normal">BDT</span></span>
              </div>
            </div>

            {/* Treasury Breakdown Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">NGO Internal Budget</span>
                <span className="text-lg font-bold text-slate-200">৳{(ngoTreasury?.internalBudget || 500000).toLocaleString()}</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Govt Grants Received</span>
                <span className="text-lg font-bold text-violet-400">৳{(ngoTreasury?.totalGranted || 0).toLocaleString()}</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Distributed Funds</span>
                <span className="text-lg font-bold text-amber-400">৳{(ngoTreasury?.totalAllocated || 0).toLocaleString()}</span>
              </div>
              <div className="bg-slate-900/80 border border-emerald-900/50 rounded-xl p-3.5 text-center">
                <span className="text-[10px] text-emerald-400 uppercase tracking-wider block">Active Grants Count</span>
                <span className="text-lg font-bold text-emerald-300">{(ngoTreasury?.ngoGrants?.length || 0)} Grants</span>
              </div>
            </div>

            {allocSuccess && <div className="bg-emerald-900/50 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />{allocSuccess}</div>}
            {allocErr && <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm">{allocErr}</div>}

            <div className="bg-slate-900/80 border border-amber-500/20 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HandCoins className="w-4 h-4 text-amber-400" /> Pending Representative Funding Requests
              </h3>
              {pendingAdminRequests.length === 0 ? (
                <p className="text-xs text-slate-500">No pending requests from NGO representatives.</p>
              ) : (
                <div className="space-y-2">
                  {pendingAdminRequests.map((r) => (
                    <div key={r._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{r.requestedByName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{r.siteType}: {r.siteName} · {r.district}</p>
                        {r.purpose && <p className="text-xs text-slate-500 italic mt-1">{r.purpose}</p>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold text-emerald-400">৳{Number(r.amount).toLocaleString()}</span>
                        <button
                          onClick={() => handleFulfillRequest(r._id)}
                          disabled={fulfillingId === r._id}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          {fulfillingId === r._id ? 'Allocating...' : 'Allocate Request'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fund Distribution Form */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" /> Distribute Funds to Disaster Campaign or Logistics Hub
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Target Type Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Select Distribution Target Sector</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setAllocTargetType('Campaign'); setAllocTargetName(CAMPAIGN_TARGETS[0]); }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer ${allocTargetType === 'Campaign' ? 'bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-600/30' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                      <Tent className="w-4 h-4" /> Disaster Campaign
                    </button>
                    <button
                      onClick={() => { setAllocTargetType('Logistics'); setAllocTargetName(LOGISTICS_TARGETS[0]); }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer ${allocTargetType === 'Logistics' ? 'bg-cyan-600 border-cyan-400 text-white shadow-md shadow-cyan-600/30' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                      <Truck className="w-4 h-4" /> Logistics Hub
                    </button>
                  </div>
                </div>

                {/* Target Name Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Select Target {allocTargetType === 'Campaign' ? 'Disaster Campaign' : 'Logistics Hub'}
                  </label>
                  <select
                    value={allocTargetName}
                    onChange={e => setAllocTargetName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
                    {(allocTargetType === 'Campaign' ? CAMPAIGN_TARGETS : LOGISTICS_TARGETS).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {allocTargetName.startsWith('Custom') && (
                    <input
                      value={customTarget}
                      onChange={e => setCustomTarget(e.target.value)}
                      placeholder={`Enter custom ${allocTargetType} name...`}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 mt-2"
                    />
                  )}
                </div>

                {/* Amount Selection */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-semibold text-slate-300">Fund Allocation Amount (BDT ৳)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {NGO_ALLOC_PRESETS.map(a => (
                      <button
                        key={a}
                        onClick={() => setAllocAmount(String(a))}
                        className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${allocAmount === String(a) ? 'bg-emerald-600 border-emerald-400 text-white shadow-md' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
                        ৳{a.toLocaleString()}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={allocAmount}
                    onChange={e => setAllocAmount(e.target.value)}
                    placeholder="Or enter custom allocation amount..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 mt-1"
                  />
                </div>

                {/* Notes */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Allocation Purpose & Operational Details</label>
                  <textarea
                    value={allocNotes}
                    onChange={e => setAllocNotes(e.target.value)}
                    rows={2}
                    placeholder="E.g., Allocated for purchasing 150 medical kits and dry food packs for Sylhet relief operations."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    onClick={handleNGOAllocate}
                    disabled={allocSubmitting}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer">
                    <PackageCheck className="w-5 h-5 text-emerald-200" />
                    {allocSubmitting ? 'Processing Allocation...' : `💚 Distribute Funds to ${allocTargetType}`}
                  </button>
                </div>
              </div>
            </div>

            {/* NGO Allocations Ledger Table */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" /> NGO Fund Distribution Ledger
              </h3>
              {!ngoTreasury?.allocations || ngoTreasury.allocations.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No allocations recorded yet for your organization.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-700">
                      <tr>
                        <th className="p-3">Sector</th>
                        <th className="p-3">Target Name</th>
                        <th className="p-3">Allocated Amount</th>
                        <th className="p-3">Allocated By</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {ngoTreasury.allocations.map((a, idx) => (
                        <tr key={a._id || idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${a.targetType === 'Campaign' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50' : 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/50'}`}>
                              {a.targetType === 'Campaign' ? <Tent className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                              {a.targetType}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-white">{a.targetName}</td>
                          <td className="p-3 font-bold text-emerald-400 text-sm">৳{Number(a.amount).toLocaleString()}</td>
                          <td className="p-3 text-slate-400">{a.allocatedBy}</td>
                          <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(a.allocatedAt).toLocaleDateString()}</td>
                          <td className="p-3 text-slate-400 italic max-w-xs truncate">{a.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GOVERNMENT EXCLUSIVE SECTION: NGO GRANT DISBURSEMENT */}
        {isGovAdmin && (
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border-2 border-cyan-500/40 rounded-2xl p-6 space-y-6 shadow-xl shadow-cyan-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-xs font-semibold text-cyan-400 mb-1">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" /> Government Admin Authorized Panel
                </div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-cyan-400" /> Government NGO Grant Funding & Disbursement
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Allocate and disburse official disaster relief grants to active NGO partners based on total community funding and field needs.
                </p>
              </div>

              <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl px-4 py-2 text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Available Treasury</span>
                <span className="text-lg font-bold text-cyan-300">৳{Math.max(0, totalRaised + 5000000000 - totalDisbursed).toLocaleString()} <span className="text-xs text-slate-400 font-normal">BDT</span></span>
              </div>
            </div>

            {disbSuccess && <div className="bg-emerald-900/50 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl text-sm flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />{disbSuccess}</div>}
            {disbErr && <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm">{disbErr}</div>}

            <div className="bg-slate-900/80 border border-amber-500/20 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HandCoins className="w-4 h-4 text-amber-400" /> Pending Representative Funding Requests
              </h3>
              {pendingAdminRequests.length === 0 ? (
                <p className="text-xs text-slate-500">No pending requests from Government representatives.</p>
              ) : (
                <div className="space-y-2">
                  {pendingAdminRequests.map((r) => (
                    <div key={r._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{r.requestedByName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{r.siteType}: {r.siteName} · {r.district}</p>
                        {r.purpose && <p className="text-xs text-slate-500 italic mt-1">{r.purpose}</p>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold text-cyan-300">৳{Number(r.amount).toLocaleString()}</span>
                        <button
                          onClick={() => handleFulfillRequest(r._id)}
                          disabled={fulfillingId === r._id}
                          className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          {fulfillingId === r._id ? 'Disbursing...' : 'Disburse Request'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* NGO Grant Allocation Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-900/80 border border-slate-800 rounded-xl p-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" /> Select Registered NGO Partner
                </label>
                <select
                  value={disbNgoName}
                  onChange={e => setDisbNgoName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors">
                  {REGISTERED_NGOS.map(n => <option key={n.name} value={n.name}>{n.name} ({n.area})</option>)}
                  <option value="Custom">+ Enter Custom NGO Partner...</option>
                </select>
                {disbNgoName === 'Custom' && (
                  <input
                    value={customNgo}
                    onChange={e => setCustomNgo(e.target.value)}
                    placeholder="Enter NGO Organization Name..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 mt-2"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" /> Target Relief District
                </label>
                <select
                  value={disbDistrict}
                  onChange={e => setDisbDistrict(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500">
                  {DISTRICTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-cyan-400" /> Grant Allocation Amount (BDT ৳)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {GOV_GRANT_PRESETS.map(g => (
                    <button
                      key={g}
                      onClick={() => setDisbAmount(String(g))}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${disbAmount === String(g) ? 'bg-cyan-600 border-cyan-400 text-white shadow-md shadow-cyan-600/30' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
                      ৳{g.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  value={disbAmount}
                  onChange={e => setDisbAmount(e.target.value)}
                  placeholder="Or enter custom grant amount..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 mt-1"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  Government Grant Purpose & Resolution Notes
                </label>
                <textarea
                  value={disbNotes}
                  onChange={e => setDisbNotes(e.target.value)}
                  rows={2}
                  placeholder="E.g., Emergency grant for medical supplies, shelter repair kits, and dry food distribution in Sylhet."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  onClick={handleDisburseNGO}
                  disabled={disbSubmitting}
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition-all cursor-pointer">
                  <ShieldCheck className="w-5 h-5 text-cyan-200" />
                  {disbSubmitting ? 'Processing Government Grant...' : '🏛️ Disburse Funding to NGO Partner'}
                </button>
              </div>
            </div>

            {/* Government Disbursement Ledger */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Award className="w-4 h-4 text-violet-400" /> Official NGO Grant Disbursement Ledger
              </h3>
              {disbursements.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No government disbursements recorded yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-700">
                      <tr>
                        <th className="p-3">NGO Partner</th>
                        <th className="p-3">Allocated District</th>
                        <th className="p-3">Grant Amount</th>
                        <th className="p-3">Disbursed By</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {disbursements.map((d, idx) => (
                        <tr key={d._id || idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-semibold text-white">
                            {d.ngoName}
                            {d.notes && <p className="text-[11px] text-slate-400 font-normal italic mt-0.5">{d.notes}</p>}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded-md">
                              <MapPin className="w-3 h-3" /> {d.district || 'General'}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-emerald-400 text-sm">
                            ৳{Number(d.amount).toLocaleString()}
                          </td>
                          <td className="p-3 text-slate-400">{d.disbursedBy}</td>
                          <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(d.disbursedAt).toLocaleDateString()}</td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" /> {d.status || 'Disbursed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {isFieldRep && (
          <div className={`rounded-2xl p-6 space-y-5 border-2 shadow-xl ${isGovRep ? 'bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border-cyan-500/30' : 'bg-gradient-to-br from-slate-900 via-emerald-950/30 to-slate-900 border-emerald-500/30'}`}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-1 ${isGovRep ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'}`}>
                  <HandCoins className="w-4 h-4" /> Request Funding
                </div>
                <h2 className="text-xl font-bold text-white">Ask {isGovRep ? 'Government Admin' : 'NGO Admin'} for funds</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Request money for <span className="text-slate-200 font-semibold">{repSiteLabel}</span>. Your {isGovRep ? 'Government' : 'NGO'} admin can then disburse this amount.
                </p>
              </div>
              <div className={`shrink-0 rounded-xl px-4 py-2.5 text-right border ${isGovRep ? 'bg-slate-900/90 border-cyan-500/30' : 'bg-slate-900/90 border-emerald-500/30'}`}>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  {isGovRep ? 'Gov admin disbursed to you' : 'NGO admin disbursed to you'}
                </span>
                <span className={`text-xl font-bold ${isGovRep ? 'text-cyan-300' : 'text-emerald-400'}`}>
                  ৳{fundingRequests.filter((r) => r.status === 'Disbursed').reduce((sum, r) => sum + Number(r.amount || 0), 0).toLocaleString()}
                  <span className="text-xs text-slate-400 font-normal"> BDT</span>
                </span>
              </div>
            </div>

            {reqSuccess && <div className="bg-emerald-900/50 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl text-sm">{reqSuccess}</div>}
            {reqErr && <div className="bg-red-900/50 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl text-sm">{reqErr}</div>}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {REQUEST_PRESETS.map((a) => (
                <button
                  key={a}
                  onClick={() => setReqAmount(String(a))}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${reqAmount === String(a) ? (isGovRep ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-emerald-600 border-emerald-400 text-white') : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                >
                  ৳{a.toLocaleString()}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              value={reqAmount}
              onChange={(e) => setReqAmount(e.target.value)}
              placeholder="Or enter custom amount..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <textarea
              value={reqPurpose}
              onChange={(e) => setReqPurpose(e.target.value)}
              rows={2}
              placeholder="Why do you need this funding? (inventory restock, camp supplies, depot fuel...)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 resize-none"
            />
            <button
              onClick={handleRequestFunding}
              disabled={reqSubmitting}
              className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${isGovRep ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'}`}
            >
              <Send className="w-4 h-4" />
              {reqSubmitting ? 'Sending request...' : `Send request to ${isGovRep ? 'Government Admin' : 'NGO Admin'}`}
            </button>

            {fundingRequests.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Your requests</p>
                {fundingRequests.map((r) => (
                  <div key={r._id} className="flex items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs">
                    <span className="text-slate-300">৳{Number(r.amount).toLocaleString()} · {r.siteName}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold ${r.status === 'Disbursed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-300'}`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Public Donation Form */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-400" /> Make a Public Donation
            </h2>

            {success && <div className="bg-emerald-900/40 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl text-sm">{success}</div>}
            {err && <div className="bg-red-900/40 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl text-sm">{err}</div>}

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Your Name</label>
              <input value={donorName} onChange={e => setDonorName(e.target.value)} placeholder="Full name"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500 transition-colors" />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400">Amount (BDT)</label>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_AMOUNTS.map(a => (
                  <button key={a} onClick={() => setAmount(String(a))}
                    className={`py-2 rounded-xl text-sm font-medium transition-colors border cursor-pointer ${amount === String(a) ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>
                    ৳{a.toLocaleString()}
                  </button>
                ))}
              </div>
              <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Or enter custom amount..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500 transition-colors mt-1" />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Dedicate to District (optional)</label>
              <select value={district} onChange={e => setDistrict(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500">
                {DISTRICTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Message (optional)</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Words of support..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500 resize-none" />
            </div>

            <button onClick={handleDonate} disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all cursor-pointer">
              <Send className="w-4 h-4" />
              {submitting ? 'Processing...' : 'Donate Now'}
            </button>

            <p className="text-xs text-slate-500 text-center">This is a record-only system. No real payment is processed.</p>
          </div>

          {/* Leaderboard */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" /> Top Donors
              </h2>
              <button onClick={fetchLeaderboard} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="text-center text-slate-500 py-8">Loading...</div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center text-slate-500 py-8">Be the first to donate!</div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {leaderboard.map((d, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${i < 3 ? 'bg-gradient-to-r from-amber-900/20 to-slate-800/40 border border-amber-700/20' : 'bg-slate-800/50'}`}>
                    <span className="text-xl w-8 text-center flex-shrink-0">{medal(i)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-slate-200 text-sm truncate">{d.donorName}</p>
                        <p className="font-bold text-rose-400 text-sm ml-2 flex-shrink-0">৳{d.amount.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {d.district !== 'General' && <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{d.district}</span>}
                        <span className="text-xs text-slate-600 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(d.donatedAt).toLocaleDateString()}</span>
                      </div>
                      {d.message && <p className="text-xs text-slate-400 mt-1 italic">"{d.message}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
