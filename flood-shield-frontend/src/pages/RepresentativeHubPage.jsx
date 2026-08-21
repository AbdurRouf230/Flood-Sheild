import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Send, Package, DollarSign, MapPin, RefreshCw,
  Building2, AlertTriangle
} from 'lucide-react';
import { parseTakaAmount, parseTakaFromText, resolveRequestedFunding, formatTakaHint } from '../utils/takaAmount';

const NUMERIC_INPUT = 'w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]';

const ITEM_TYPES = ['Food', 'Water', 'Medicine', 'Shelter Kits'];
const REQUEST_TYPES = [
  { key: 'Funding', label: 'Funding Request', icon: DollarSign, desc: 'Request emergency funds for shelter operations' },
  { key: 'VillageRelief', label: 'Village Relief Request', icon: MapPin, desc: 'File a village relief request to Government & NGO' },
];

export default function RepresentativeHubPage() {
  const { token, mongoUser, language } = useAuth();
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const [activeTab, setActiveTab] = useState('requests');
  const [requestType, setRequestType] = useState('Funding');
  const [itemType, setItemType] = useState('Food');
  const [otherItemType, setOtherItemType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [fundingAmount, setFundingAmount] = useState('');
  const [details, setDetails] = useState('');
  const [urgency, setUrgency] = useState('Medium');
  const [villageName, setVillageName] = useState('');
  const [population, setPopulation] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [myRequests, setMyRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const t = language === 'bn' ? {
    title: 'প্রতিনিধি রিসোর্স হাব',
    subtitle: 'সরকার ও এনজিও-তে অনুরোধ পাঠান, আপনার স্টক ট্র্যাক করুন',
    tabRequests: 'অনুরোধ',
    tabHistory: 'আমার অনুরোধ',
    tabInventory: 'আমার ইনভেন্টরি',
    shelter: 'আশ্রয়কেন্দ্র',
    submit: 'অনুরোধ জমা দিন',
    noRequests: 'এখনো কোনো অনুরোধ নেই।',
    noInventory: 'ইনভেন্টরি খালি — ট্রান্সপোর্ট পেজ থেকে শipment গ্রহণ করুন।',
    item: 'সামগ্রী', qty: 'পরিমাণ', status: 'অবস্থা', type: 'ধরন'
  } : {
    title: 'Representative Resource Hub',
    subtitle: 'Request relief, funding, and stock from Government & NGO — track your shelter inventory',
    tabRequests: 'New Request',
    tabHistory: 'My Requests',
    tabInventory: 'My Inventory',
    shelter: 'Assigned Shelter',
    submit: 'Submit Request',
    noRequests: 'No requests submitted yet.',
    noInventory: 'Inventory empty — receive shipments on the Transport page.',
    item: 'Item', qty: 'Quantity', status: 'Status', type: 'Type',
    amount: 'Amount', response: 'Response'
  };

  const flash = (type, text) => {
    if (type === 'ok') { setMsg(text); setErr(''); } else { setErr(text); setMsg(''); }
    setTimeout(() => { setMsg(''); setErr(''); }, 5000);
  };

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const hdrs = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      const [reqRes, invRes] = await Promise.all([
        fetch(`${API}/representatives/requests/mine`, { headers: hdrs }),
        fetch(`${API}/representatives/inventory`, { headers: hdrs })
      ]);
      if (reqRes.ok) setMyRequests(await reqRes.json());
      if (invRes.ok) setInventory(await invRes.json());
    } catch (e) { flash('err', 'Failed to load data'); }
    setLoading(false);
  }, [token, API]);

  useEffect(() => { if (token) fetchData(); }, [token, fetchData]);

  useEffect(() => {
    if ((activeTab === 'history' || activeTab === 'inventory') && token) fetchData();
  }, [activeTab, token, fetchData]);

  useEffect(() => {
    if (activeTab !== 'history' || !token) return undefined;
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, [activeTab, token, fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const amt = parseTakaAmount(fundingAmount) || parseTakaFromText(details);
      const finalItemType = itemType === 'Other' ? otherItemType : itemType;
      const body = {
        requestType, itemType: finalItemType, quantity: parseInt(quantity) || 0,
        fundingAmount: requestType === 'Funding' ? amt : undefined,
        details, urgency, villageName, population, phone
      };
      if (requestType === 'Funding' && (!amt || amt <= 0)) {
        throw new Error('Funding amount is required');
      }
      if (requestType === 'VillageRelief' && (!itemType || !quantity)) {
        throw new Error('Item type and quantity are required');
      }
      const res = await fetch(`${API}/representatives/requests`, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      flash('ok', language === 'bn' ? 'অনুরোধ সফলভাবে জমা হয়েছে' : 'Request submitted to Government & NGO');
      setDetails(''); setQuantity(''); setFundingAmount(''); setVillageName(''); setPopulation('');
      fetchData();
      setActiveTab('history');
    } catch (e) {
      flash('err', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const statusStyle = (s) => ({
    Pending: 'text-amber-400 bg-amber-500/10',
    Approved: 'text-blue-400 bg-blue-500/10',
    Declined: 'text-rose-400 bg-rose-500/10',
    Rejected: 'text-rose-400 bg-rose-500/10',
    Received: 'text-emerald-400 bg-emerald-500/10',
    Fulfilled: 'text-emerald-400 bg-emerald-500/10'
  }[s] || 'text-slate-400 bg-slate-500/10');

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-heading">{t.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
          {mongoUser?.shelterName && (
            <p className="text-xs text-flood-cyan-400 mt-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {t.shelter}: <span className="font-semibold">{mongoUser.shelterName}</span>
              {mongoUser.representativeId && <span className="text-slate-500 ml-2">({mongoUser.representativeId})</span>}
            </p>
          )}
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {msg && <div className="bg-emerald-900/30 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-xl text-sm">{msg}</div>}
      {err && <div className="bg-red-900/30 border border-red-500/30 text-red-300 px-4 py-2 rounded-xl text-sm">{err}</div>}

      <div className="flex gap-2 flex-wrap">
        {['requests', 'history', 'inventory'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab
                ? 'bg-flood-cyan-500/20 text-flood-cyan-400 border border-flood-cyan-500/30'
                : 'bg-slate-100 dark:bg-slate-900/60 text-slate-500 border border-transparent hover:border-slate-300 dark:hover:border-white/10'
            }`}
          >
            {tab === 'requests' ? t.tabRequests : tab === 'history' ? t.tabHistory : t.tabInventory}
          </button>
        ))}
      </div>

      {activeTab === 'requests' && (
        <div className="glass-panel p-5 border border-slate-200 dark:border-white/5 rounded-2xl space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {REQUEST_TYPES.map(rt => {
              const Icon = rt.icon;
              const sel = requestType === rt.key;
              return (
                <button
                  key={rt.key}
                  type="button"
                  onClick={() => setRequestType(rt.key)}
                  className={`text-left p-4 rounded-xl border transition-all ${sel ? 'border-flood-cyan-400 bg-flood-cyan-400/10' : 'border-slate-200 dark:border-white/5 hover:border-flood-cyan-400/30'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${sel ? 'text-flood-cyan-400' : 'text-slate-400'}`} />
                    <span className="text-sm font-bold text-slate-800 dark:text-white">{rt.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{rt.desc}</p>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-white/5">
            {requestType === 'Funding' && (
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Requested Amount (৳)</label>
                <input
                  type="text"
                  inputMode="text"
                  required
                  value={fundingAmount}
                  onChange={e => setFundingAmount(e.target.value.replace(/[^\d.kK,]/g, ''))}
                  placeholder="e.g. 1000000 or 1000k"
                  className={NUMERIC_INPUT}
                />
                {parseTakaAmount(fundingAmount) > 0 && (
                  <p className="text-[10px] text-flood-cyan-400 mt-1">
                    = ৳{parseTakaAmount(fundingAmount).toLocaleString()}
                  </p>
                )}
              </div>
            )}
            {requestType === 'VillageRelief' && (
              <>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{t.item}</label>
                  <select value={itemType} onChange={e => setItemType(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm">
                    {ITEM_TYPES.map(i => <option key={i} value={i}>{i}</option>)}
                    <option value="Other">Other (Specify)</option>
                  </select>
                </div>
                {itemType === 'Other' && (
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Specify Item</label>
                    <input type="text" required value={otherItemType} onChange={e => setOtherItemType(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Blankets" />
                  </div>
                )}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">{t.qty}</label>
                  <input type="number" required value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Village / Area Name</label>
                  <input value={villageName} onChange={e => setVillageName(e.target.value)} placeholder={mongoUser?.shelterName || ''} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Affected Population</label>
                  <input type="number" value={population} onChange={e => setPopulation(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Contact Phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+880..." className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm" />
                </div>
              </>
            )}
            <div className="md:col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Details / Justification</label>
              <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3} required className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Describe the need..." />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Urgency</label>
              <select value={urgency} onChange={e => setUrgency(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm">
                {['Low', 'Medium', 'High', 'Critical'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={submitting} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-flood-blue-600 to-flood-cyan-500 text-white font-bold text-sm disabled:opacity-50">
                <Send className="w-4 h-4" /> {submitting ? '...' : t.submit}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="glass-panel p-5 border border-slate-200 dark:border-white/5 rounded-2xl overflow-x-auto">
          <p className="text-xs text-slate-500 mb-3">
            Village relief: <span className="text-amber-400">Pending</span> → admin dispatches → <span className="text-blue-400">Approved</span> → Received on Transport.
            Funding: <span className="text-amber-400">Pending</span> → <span className="text-blue-400">Approved</span> or <span className="text-rose-400">Declined</span> by Government/NGO.
          </p>
          {myRequests.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">{t.noRequests}</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200 dark:border-white/5">
                  <th className="text-left p-2">{t.type}</th>
                  <th className="text-left p-2">{t.item}</th>
                  <th className="text-left p-2">{t.qty}</th>
                  <th className="text-left p-2">{t.amount}</th>
                  <th className="text-left p-2">{t.status}</th>
                  <th className="text-left p-2">{t.response}</th>
                  <th className="text-left p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map(r => (
                  <tr key={r._id} className="border-b border-slate-100 dark:border-white/5">
                    <td className="p-2 font-medium">{r.requestType}</td>
                    <td className="p-2">{r.itemType || '—'}</td>
                    <td className="p-2">{r.quantity || '—'}</td>
                    <td className="p-2">{r.requestType === 'Funding' ? `৳${resolveRequestedFunding(r).toLocaleString()}${formatTakaHint(resolveRequestedFunding(r))}` : '—'}</td>
                    <td className="p-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusStyle(r.status)}`}>{r.status}</span></td>
                    <td className="p-2 text-slate-400 max-w-[200px] truncate" title={r.govResponse}>{r.govResponse || '—'}</td>
                    <td className="p-2 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="glass-panel p-5 border border-slate-200 dark:border-white/5 rounded-2xl">
          <p className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Stock increases when you click <strong>Received</strong> on incoming transports.
          </p>
          {inventory.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">{t.noInventory}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {inventory.map(row => (
                <div key={row._id || row.itemType} className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5">
                  <Package className="w-5 h-5 text-flood-cyan-400 mb-2" />
                  <div className="text-sm font-bold text-slate-800 dark:text-white">{row.itemType}</div>
                  <div className="text-xl font-black text-flood-cyan-400 mt-1">{row.quantity?.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500">{row.unit}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
