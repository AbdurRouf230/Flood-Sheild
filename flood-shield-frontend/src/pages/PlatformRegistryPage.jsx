import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';

export default function PlatformRegistryPage() {
  const { token, language, mongoUser } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [adminRegistry, setAdminRegistry] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');
  const [adminErr, setAdminErr] = useState('');

  const fetchAdminRegistry = async () => {
    setAdminLoading(true);
    setAdminErr('');
    try {
      const hdrs = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_URL}/admin/platform-registry`, { headers: hdrs });
      if (res.ok) setAdminRegistry(await res.json());
      else setAdminErr('Failed to load platform registry');
    } catch {
      setAdminErr('Failed to load platform registry');
    }
    setAdminLoading(false);
  };

  useEffect(() => {
    if (token) {
      fetchAdminRegistry();
    }
  }, [token]);

  const handleRemoveUser = async (uid, label) => {
    if (!uid || !window.confirm(`Remove ${label} from the platform?`)) return;
    setAdminErr(''); setAdminMsg('');
    const res = await fetch(`${API_URL}/admin/users/${uid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) { setAdminMsg(data.message); fetchAdminRegistry(); }
    else setAdminErr(data.message);
  };

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
            ? 'This platform registry is authorized for Government Officials only.' 
            : 'এই প্ল্যাটফর্ম রেজিস্ট্রি শুধুমাত্র সরকারি কর্মকর্তাদের জন্য অনুমোদিত।'}
        </p>
      </div>
    );
  }

  const ngos = adminRegistry?.ngos || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto mt-[40px]">
        {/* ── Working NGO Partners Registry (Government Admin) ── */}
        <div className="glass-panel p-5 border border-slate-200 dark:border-white/5 rounded-2xl bg-white/80 dark:bg-slate-900/60 shadow-md">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 font-heading flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" /> Working NGO Partners Registry
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Registered NGO organizations and active disaster relief partner accounts on Flood Shield</p>
            </div>
            <button onClick={fetchAdminRegistry} disabled={adminLoading}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded-lg text-xs text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer">
              <RefreshCw className={`w-3.5 h-3.5 ${adminLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {adminMsg && <div className="bg-emerald-900/30 border border-emerald-500/30 text-emerald-300 px-3 py-2 rounded-lg text-xs mb-3">{adminMsg}</div>}
          {adminErr && <div className="bg-red-900/30 border border-red-500/30 text-red-300 px-3 py-2 rounded-lg text-xs mb-3">{adminErr}</div>}

          {!adminRegistry ? (
            <p className="text-center text-slate-500 py-8 text-sm">{adminLoading ? 'Loading registry...' : 'Click Refresh to load platform data'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-700">
                    <th className="text-left p-2">NGO Partner Name</th>
                    <th className="text-left p-2">Email Contact</th>
                    <th className="text-left p-2">Allocated Relief Area</th>
                    <th className="text-left p-2">Organization</th>
                    <th className="text-left p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ngos.length === 0 && (
                    <tr><td colSpan="5" className="text-center text-slate-500 py-6">No NGO partner accounts registered</td></tr>
                  )}
                  {ngos.map(n => (
                    <tr key={n.uid} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="p-2 text-slate-200 font-medium">{n.name}{n._seed ? ' (demo)' : ''}</td>
                      <td className="p-2 text-slate-400">{n.email}</td>
                      <td className="p-2 text-slate-300">{n.allocatedArea}</td>
                      <td className="p-2 text-emerald-400 font-semibold">{n.orgName}</td>
                      <td className="p-2">
                        <button onClick={() => handleRemoveUser(n.uid, n.name)}
                          className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer" title="Remove NGO Partner Account">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
