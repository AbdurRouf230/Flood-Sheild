import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  FileSpreadsheet,
  Navigation,
  PlusCircle,
  RefreshCw,
  Map as MapIcon,
  UserCheck,
  MapPin,
  Users,
  Phone,
  ShieldCheck,
  Droplet,
  ArrowRight,
  TrendingUp,
  Database,
  Truck,
  Plus,
  Minus,
  Send,
  FileInput,
  DollarSign,
  Crosshair,
  Tent,
  ToggleLeft,
  ToggleRight,
  PackageCheck
} from 'lucide-react';
import { parseTakaAmount, resolveRequestedFunding, formatTakaHint } from '../utils/takaAmount';
import { toast } from 'react-toastify';

const LOGISTICS_HUBS = [
  // GOV Facilitated Logistics Depots (3 hubs for GOV Admin)
  { name: '[GOV] Sylhet Divisional Depot [Hub]', district: 'Sylhet', lat: 24.8950, lon: 91.8700, type: 'GOV' },
  { name: '[GOV] Sunamganj Relief Depot [Hub]', district: 'Sunamganj', lat: 25.0658, lon: 91.4073, type: 'GOV' },
  { name: '[GOV] Kurigram Storage Depot [Hub]', district: 'Kurigram', lat: 25.8103, lon: 89.6417, type: 'GOV' },
  // NGO Logistics Hubs
  { name: '[BRAC] Sylhet Relief Hub', district: 'Sylhet', lat: 24.8950, lon: 91.8700, type: 'NGO' },
  { name: '[BRAC] Sunamganj Relief Hub', district: 'Sunamganj', lat: 25.0658, lon: 91.4073, type: 'NGO' },
  { name: '[BRAC] Moulvibazar Relief Hub', district: 'Moulvibazar', lat: 24.4828, lon: 91.7774, type: 'NGO' },
];

function calcDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export default function ReliefLogisticsPage() {
  const { token, language, mongoUser } = useAuth();
  const { theme } = useTheme();

  // API base URL
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Data States
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // NGO Request states
  const [ngoRequests, setNgoRequests] = useState([]);
  const [ngoReqType, setNgoReqType] = useState('Supplies');
  const [ngoReqDistrict, setNgoReqDistrict] = useState('Sylhet');
  const [ngoReqDetail, setNgoReqDetail] = useState('');
  const [ngoReqQty, setNgoReqQty] = useState('1');
  const [ngoReqUrgency, setNgoReqUrgency] = useState('Medium');
  const [ngoReqMsg, setNgoReqMsg] = useState('');
  const [ngoReqErr, setNgoReqErr] = useState('');
  const [postingNGO, setPostingNGO] = useState(false);
  const [ngoLoaded, setNgoLoaded] = useState(false);

  // Representative funding requests (Gov + NGO)
  const [repFundingRequests, setRepFundingRequests] = useState([]);
  const [fundingAmounts, setFundingAmounts] = useState({});
  const [fundingDeclineMsgs, setFundingDeclineMsgs] = useState({});
  const [fundingActionId, setFundingActionId] = useState('');
  const [fundingMsg, setFundingMsg] = useState('');
  const [fundingErr, setFundingErr] = useState('');

  // Restocking Form State
  const [restockWarehouse, setRestockWarehouse] = useState('Sylhet Relief Hub');
  const [restockItem, setRestockItem] = useState('Food');
  const [restockQuantity, setRestockQuantity] = useState('');
  const [isRestocking, setIsRestocking] = useState(false);

  // New Request Form State
  const [newReqVillage, setNewReqVillage] = useState('');
  const [newReqDistrict, setNewReqDistrict] = useState('Sylhet');
  const [newReqLogisticsHub, setNewReqLogisticsHub] = useState('Sylhet Relief Hub');
  const [newReqLat, setNewReqLat] = useState('24.8950');
  const [newReqLon, setNewReqLon] = useState('91.8700');
  const [showVillageMapPicker, setShowVillageMapPicker] = useState(false);
  const villageMapRef = useRef(null);
  const [newReqContact, setNewReqContact] = useState('');
  const [newReqPhone, setNewReqPhone] = useState('');
  const [newReqPopulation, setNewReqPopulation] = useState('');
  const [newReqItem, setNewReqItem] = useState('Food');
  const [newReqQuantity, setNewReqQuantity] = useState('');
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);

  // Campaign Request Mode Toggle
  const [requestMode, setRequestMode] = useState('village'); // 'village' | 'campaign'
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');

  // Transport receive state
  const [receivingTransportId, setReceivingTransportId] = useState('');

  // Route Optimization Standalone Form State
  const [optStart, setOptStart] = useState('Sylhet Relief Hub');
  const [optEnd, setOptEnd] = useState('Tahirpur North East');
  const [optResult, setOptResult] = useState(null);
  const [optLoading, setOptLoading] = useState(false);

  // Demand Prediction Standalone Form State
  const [predPop, setPredPop] = useState('1500');
  const [predItem, setPredItem] = useState('Food');
  const [predRisk, setPredRisk] = useState('65');
  const [predResult, setPredResult] = useState(null);
  const [predLoading, setPredLoading] = useState(false);

  // Active Dispatch Allocation Modal State
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState('Sylhet Relief Hub');
  const [calculatedRoute, setCalculatedRoute] = useState(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchError, setDispatchError] = useState('');

  // Warehouse detail modal state
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [selectedWarehouseName, setSelectedWarehouseName] = useState('');

  // Available Volunteers & Restock Volunteer Assignment
  const [availableVolunteers, setAvailableVolunteers] = useState([]);
  const [restockVolunteerUid, setRestockVolunteerUid] = useState('');
  const [restockVolunteerName, setRestockVolunteerName] = useState('');
  const [transportsList, setTransportsList] = useState([]);

  // Translations
  const translations = {
    en: {
      title: "Relief Logistics & Resource Optimization",
      subtitle: "NGO & Government panel to track inventory, prioritize village demand, optimize route paths, and prevent double delivery.",
      inventoryTitle: "Inventory Stock Tracker",
      warehouse: "Warehouse Name",
      itemType: "Item Type",
      stock: "Current Stock",
      lowStockWarning: "Low Stock Alert!",
      restockTitle: "Restock Warehouse Hub",
      addStock: "Add Stock Quantity",
      saveStockBtn: "Submit Restock",
      requestsTitle: "Village Relief Requests Feed",
      submitRequestTitle: "File New Village Request",
      villageName: "Village Name",
      district: "District",
      contactPerson: "Contact Person",
      phone: "Phone Number",
      population: "Population Count",
      requestItem: "Requested Item Type",
      requestQty: "Quantity Requested",
      submitRequestBtn: "Submit Request & Calc Score",
      routeOptTitle: "Route Optimization Solver",
      startNode: "Source Warehouse Node",
      endNode: "Destination Village Node",
      runOptBtn: "Calculate Shortest Route",
      distance: "Distance",
      routePath: "Path Nodes Segments",
      demandPredTitle: "ML Demand Prediction Calculator",
      riskIndex: "District Flood Risk Score",
      predictBtn: "Predict Required Units",
      predictedUnits: "Predicted Resource Requirement",
      confidence: "Model Confidence Score",
      dispatchTitle: "Dispatch Relief Allocation",
      dispatchConfirmBtn: "Confirm & Dispatch Shipment",
      dispatchCloseBtn: "Cancel",
      selectWarehouse: "Select Dispatching Hub",
      stockAvailable: "Stock Available",
      insufficientStock: "Warning: Insufficient stock at selected warehouse!",
      preventDoubleTitle: "Double-Delivery Safeguards",
      warningRecentRequest: "Warning: A duplicate request for this item was filed recently (last 24h) for this village.",
      warningDoubleAllocation: "Warning: Relief resources have already been allocated to this request.",
      priorityScore: "Priority Score",
      status: "Status",
      actions: "Actions",
      searchPlaceholder: "Search by village or district...",
      allDistricts: "All Districts",
      overviewRequests: "Total Requests",
      overviewPending: "Pending Dispatch",
      overviewAllocated: "Dispatched Shipments",
      overviewLowStock: "Low Stock Items",
      restockSuccess: "Warehouse stock updated successfully.",
      requestSuccess: "Village request submitted and priority score calculated.",
      dispatchSuccess: "Relief items dispatched. A transport mission was created on the Transport page.",
      statusLabels: {
        Pending: "Pending",
        Approved: "Approved",
        Dispatched: "Dispatched / In Transit",
        Delivered: "Delivered"
      },
      items: {
        Food: "Food (bags)",
        Water: "Water (liters)",
        Medicine: "Medicine (kits)",
        "Shelter Kits": "Shelter Kits (packs)"
      },
      districts: ['Sylhet', 'Sunamganj', 'Kurigram', 'Jamalpur', 'Gaibandha', 'Bogura', 'Sirajganj', 'Netrokona', 'Dhaka', 'Chittagong']
    },
    bn: {
      title: "ত্রাণ সামগ্রী ও পরিবহন অপটিমাইজেশন",
      subtitle: "এনজিও ও সরকারি প্যানেল: ইনভেন্টরি ট্র্যাকিং, চাহিদা নির্ধারণ, পরিবহন রুট অপটিমাইজেশন এবং দ্বৈত বিতরণ প্রতিরোধ।",
      inventoryTitle: "ত্রাণ সামগ্রী স্টক ট্র্যাকার",
      warehouse: "গুদাম/হাব নাম",
      itemType: "সামগ্রীর ধরন",
      stock: "বর্তমান স্টক",
      lowStockWarning: "স্টক ফুরিয়ে আসছে!",
      restockTitle: "গুদাম হাব রিস্টক করুন",
      addStock: "যুক্ত করার পরিমাণ",
      saveStockBtn: "স্টক আপডেট করুন",
      requestsTitle: "গ্রামভিত্তিক ত্রাণ সহায়তার আবেদন তালিকা",
      submitRequestTitle: "নতুন গ্রামের আবেদন যোগ করুন",
      villageName: "গ্রামের নাম",
      district: "জেলা",
      contactPerson: "যোগাযোগকারী ব্যক্তি",
      phone: "ফোন নম্বর",
      population: "জনসংখ্যা",
      requestItem: "প্রয়োজনীয় সামগ্রী",
      requestQty: "প্রয়োজনীয় পরিমাণ",
      submitRequestBtn: "আবেদন জমা দিন ও অগ্রাধিকার নির্ণয় করুন",
      routeOptTitle: "পরিবহন রুট অপটিমাইজেশন",
      startNode: "উৎস গুদাম হাব",
      endNode: "গন্তব্য গ্রাম",
      runOptBtn: "সংক্ষিপ্ততম রুট নির্ণয় করুন",
      distance: "দূরত্ব",
      routePath: "রুট পাথ সেগমেন্টসমূহ",
      demandPredTitle: "এআই চাহিদা প্রাক্কলন ক্যালকুলেটর",
      riskIndex: "জেলা বন্যা ঝুঁকি সূচক",
      predictBtn: "চাহিদা প্রাক্কলন করুন",
      predictedUnits: "প্রাক্কলিত প্রয়োজনীয় সামগ্রী",
      confidence: "মডেল নির্ভুলতার হার",
      dispatchTitle: "ত্রাণ সামগ্রী বিতরণ ও প্রেরণ",
      dispatchConfirmBtn: "শিপমেন্ট কনফার্ম ও ডিসপ্যাচ করুন",
      dispatchCloseBtn: "বাতিল",
      selectWarehouse: "বিতরণকারী গুদাম নির্বাচন করুন",
      stockAvailable: "স্টক আছে",
      insufficientStock: "সতর্কতা: নির্বাচিত গুদামে পর্যাপ্ত স্টক নেই!",
      preventDoubleTitle: "দ্বৈত বিতরণ প্রতিরোধ সতর্কতা",
      warningRecentRequest: "সতর্কতা: গত ২৪ ঘণ্টার এই গ্রামের জন্য একই সামগ্রীর আবেদন করা হয়েছে।",
      warningDoubleAllocation: "সতর্কতা: এই আবেদনের বিপরীতে ইতিমধ্যে ত্রাণ বরাদ্দ করা হয়েছে।",
      priorityScore: "অগ্রাধিকার স্কোর",
      status: "অবস্থা",
      actions: "অ্যাকশন",
      searchPlaceholder: "গ্রাম বা জেলা দিয়ে খুঁজুন...",
      allDistricts: "সব জেলা",
      overviewRequests: "মোট আবেদন",
      overviewPending: "ডিসপ্যাচ পেন্ডিং",
      overviewAllocated: "প্রেরিত শিপমেন্ট",
      overviewLowStock: "স্বল্প স্টকের সামগ্রী",
      restockSuccess: "গুদাম স্টক সফলভাবে আপডেট করা হয়েছে।",
      requestSuccess: "গ্রামের আবেদন জমা হয়েছে এবং অগ্রাধিকার স্কোর হিসাব করা হয়েছে।",
      dispatchSuccess: "ত্রাণ সামগ্রী সফলভাবে পাঠানো হয়েছে। ট্রান্সপোর্ট পেজে একটি পরিবহন মিশন তৈরি হয়েছে।",
      statusLabels: {
        Pending: "পেন্ডিং",
        Approved: "অনুমোদিত",
        Dispatched: "বিতরণ চলছে / ট্রানজিট",
        Delivered: "ডেলিভারি সম্পন্ন"
      },
      items: {
        Food: "খাদ্য সামগ্রী (ব্যাগ)",
        Water: "বিশুদ্ধ পানি (লিটার)",
        Medicine: "ওষুধ (কিট)",
        "Shelter Kits": "আশ্রয় কিট (প্যাক)"
      },
      districts: ['Sylhet', 'Sunamganj', 'Kurigram', 'Jamalpur', 'Gaibandha', 'Bogura', 'Sirajganj', 'Netrokona', 'Dhaka', 'Chittagong']
    }
  };

  const t = translations[language] || translations['en'];

  const prevReqRef = useRef('');
  const prevTransRef = useRef('');
  const prevInvRef = useRef('');
  const prevCampRef = useRef('');
  const prevVolRef = useRef('');
  const prevFundRef = useRef('');

  // Ready-to-Dispatch panel state (for GOV/NGO Admin — dispatching loaded Pending transports)
  const [dispatchingTransportId, setDispatchingTransportId] = useState('');

  const updateIfChanged = (setter, ref, newData) => {
    const str = JSON.stringify(newData || []);
    if (ref.current !== str) {
      ref.current = str;
      setter(newData);
    }
  };

  // Fetch initial database lists with silent background polling to prevent extra re-renders
  const fetchData = async (isBackground = false) => {
    try {
      if (!isBackground && requests.length === 0) setLoading(true);
      setErrorMsg('');
      const sessionToken = token || localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${sessionToken}` };

      const [invRes, reqRes] = await Promise.all([
        fetch(`${API_URL}/logistics/inventory`, { headers }),
        fetch(`${API_URL}/logistics/requests`, { headers })
      ]);

      if (mongoUser?.role === 'Government' || mongoUser?.role === 'NGO') {
        const repRes = await fetch(`${API_URL}/representatives/requests`, { headers });
        if (repRes.ok) {
          const all = await repRes.json();
          updateIfChanged(setRepFundingRequests, prevFundRef, all.filter(r => r.requestType === 'Funding'));
        }
      }

      if (invRes.ok) {
        const invData = await invRes.json();
        updateIfChanged(setInventory, prevInvRef, invData);
      }
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        updateIfChanged(setRequests, prevReqRef, reqData);
      }
      try {
        const volRes = await fetch(`${API_URL}/volunteers/available`, { headers: { Authorization: `Bearer ${token}` } });
        if (volRes.ok) updateIfChanged(setAvailableVolunteers, prevVolRef, await volRes.json());
      } catch (ve) { console.warn('Failed to load available volunteers:', ve); }

      try {
        const tRes = await fetch(`${API_URL}/transport`, { headers: { Authorization: `Bearer ${token}` } });
        if (tRes.ok) updateIfChanged(setTransportsList, prevTransRef, await tRes.json());
      } catch (te) { console.warn('Failed to load transports:', te); }

      // Load campaigns and/or shelters for Request mode
      try {
        if (mongoUser?.role === 'Government') {
          // Government admin: fetch BOTH shelters and campaigns so the dropdown shows all
          const [shelterRes, campRes] = await Promise.all([
            fetch(`${API_URL}/shelters`, { headers }),
            fetch(`${API_URL}/campaigns`, { headers })
          ]);
          const shelterList = shelterRes.ok ? await shelterRes.json() : [];
          const campaignList = campRes.ok ? await campRes.json() : [];
          // Mark source type for display and merge
          const taggedShelters = shelterList.map(s => ({ ...s, _sourceType: 'shelter' }));
          const taggedCampaigns = campaignList.map(c => ({ ...c, _sourceType: 'campaign' }));
          updateIfChanged(setCampaigns, prevCampRef, [...taggedShelters, ...taggedCampaigns]);
        } else {
          const campRes = await fetch(`${API_URL}/campaigns`, { headers });
          if (campRes.ok) updateIfChanged(setCampaigns, prevCampRef, await campRes.json());
        }
      } catch (ce) { console.warn('Failed to load campaigns/shelters:', ce); }
    } catch (e) {
      console.error('Failed to load logistics datasets:', e);
      if (!isBackground) setErrorMsg(language === 'en' ? 'Failed to sync logistics databases with servers.' : 'সার্ভার থেকে লজিস্টিক ডেটাবেস সিঙ্ক করতে ব্যর্থ হয়েছে।');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData(false);
      const interval = setInterval(() => {
        fetchData(true);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [token, mongoUser?.role]);

  const handleRepFunding = async (id, action) => {
    setFundingErr(''); setFundingMsg('');
    setFundingActionId(id);
    const req = repFundingRequests.find(r => String(r._id) === String(id));
    const requested = resolveRequestedFunding(req);
    const amount = parseTakaAmount(fundingAmounts[id] ?? '');
    const message = fundingDeclineMsgs[id] || '';
    if (action === 'approve' && amount !== requested) {
      setFundingErr(`Approved amount must exactly match requested amount (৳${requested.toLocaleString()})`);
      setFundingActionId('');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/representatives/requests/${id}/funding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, amount, message })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update funding request');
      setFundingMsg(action === 'approve' ? `Funding approved: ৳${amount.toLocaleString()}` : 'Funding request declined');
      setRepFundingRequests(p => p.map(x => String(x._id) === String(id) ? data : x));
    } catch (e) {
      setFundingErr(e.message);
    } finally {
      setFundingActionId('');
    }
  };

  // Auto-calculate optimized route when warehouse selection changes inside dispatch modal
  useEffect(() => {
    if (dispatchModalOpen && selectedRequest && selectedWarehouse) {
      handleModalRouteCalc();
    }
  }, [selectedWarehouse, selectedRequest, dispatchModalOpen]);

  // Form search filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('All');

  // Filter requests with null-safe guards (removes dispatched and delivered requests)
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Exclude requests that have already been dispatched or delivered
      if (req.status === 'Dispatched' || req.status === 'In Transit' || req.status === 'Delivered') {
        return false;
      }
      const matchedT = transportsList.find(t => String(t.requestId) === String(req._id) || (t.destination === req.villageName && t.itemsSummary?.includes(req.itemType)));
      if (matchedT && (matchedT.status === 'In Transit' || matchedT.status === 'Delivered')) {
        return false;
      }

      const village = (req.villageName || '').toLowerCase();
      const contact = (req.contactPerson || '').toLowerCase();
      const term = searchTerm.toLowerCase();
      const matchesSearch = village.includes(term) || contact.includes(term);
      const matchesDistrict = filterDistrict === 'All' || req.district === filterDistrict;
      return matchesSearch && matchesDistrict;
    });
  }, [requests, transportsList, searchTerm, filterDistrict]);

  // Check low stock levels (arbitrary low threshold: Food/Water < 1000, Medicine/Shelter Kits < 200)
  const isStockLow = (itemType, quantity) => {
    if (itemType === 'Food' || itemType === 'Water') {
      return quantity < 1500;
    }
    return quantity < 300;
  };


  // Handle restock form submit
  const handleRestock = async (e) => {
    e.preventDefault();
    if (!restockQuantity || parseInt(restockQuantity) <= 0) return;

    setIsRestocking(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch(`${API_URL}/logistics/inventory/restock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          warehouseName: restockWarehouse,
          itemType: restockItem,
          quantity: parseInt(restockQuantity),
          volunteerUid: restockVolunteerUid || undefined,
          volunteerName: restockVolunteerName || undefined
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to update stock');
      }

      toast.success(language === 'en'
        ? '📋 Restock request created! The logistics hub rep must load the vehicle, then dispatch to begin shipment.'
        : '📋 রিস্টক অনুরোধ তৈরি হয়েছে! লজিস্টিক্স হাব রেপ গাড়ি লোড করবে, তারপর পাঠানো হবে।');

      setRestockQuantity('');
      setRestockVolunteerUid('');
      setRestockVolunteerName('');
      fetchData();

      setSuccessMsg(t.restockSuccess);
      setRestockQuantity('');
      // Reload inventory data
      fetchData();
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message);
    } finally {
      setIsRestocking(false);
    }
  };

  // Handle dispatching a Pending+Loaded restock transport (GOV/NGO Admin only)
  const handleDispatchTransport = async (transportId) => {
    setDispatchingTransportId(transportId);
    const sessionToken = token || localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/transport/${transportId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ status: 'In Transit' })
      });
      if (res.ok) {
        toast.success(language === 'en'
          ? '🚛 Transport dispatched! Now visible in Transport Tracker.'
          : '🚛 পরিবহন পাঠানো হয়েছে! ট্রান্সপোর্ট ট্র্যাকারে দেখা যাবে।');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to dispatch transport');
      }
    } catch (e) {
      toast.error('Network error: failed to dispatch');
    } finally {
      setDispatchingTransportId('');
    }
  };

  // Count low stock items (<= 100 units)
  const lowStockCount = useMemo(() => {
    if (!Array.isArray(inventory)) return 0;
    return inventory.filter(item => item.quantity <= 100).length;
  }, [inventory]);

  // Dynamic list of logistics hubs combining pre-seeded hubs and newly registered warehouses/campaigns
  // For Government users: only show GOV-facilitated hubs; for NGO: show all
  const userRole = (mongoUser?.role || '').toLowerCase();
  const isGovUser = userRole.includes('gov') || userRole.includes('official');
  const allHubs = useMemo(() => {
    const map = new Map();
    LOGISTICS_HUBS.forEach(h => map.set(h.name, h));
    if (Array.isArray(inventory)) {
      inventory.forEach(inv => {
        if (inv.warehouseName && !map.has(inv.warehouseName)) {
          let dist = inv.district || 'Sylhet';
          const match = inv.warehouseName.match(/\(([^)]+)\)/);
          if (match) dist = match[1];
          map.set(inv.warehouseName, {
            name: inv.warehouseName,
            district: dist,
            lat: 24.8950,
            lon: 91.8700,
            type: inv.warehouseName.includes('[GOV]') ? 'GOV' : 'NGO'
          });
        }
      });
    }
    let hubs = Array.from(map.values());
    // Government users: strictly show only GOV-facilitated logistics hubs
    if (isGovUser) {
      hubs = hubs.filter(h => h.type === 'GOV' || h.name?.includes('[GOV]') || h.name?.includes('Depot') || h.name?.includes('Hub'));
    } else {
      hubs = hubs.filter(h => h.type !== 'GOV' && !h.name?.includes('[GOV]'));
    }
    return hubs;
  }, [inventory, isGovUser]);

  useEffect(() => {
    if (allHubs.length > 0) {
      if (!allHubs.some(h => h.name === newReqLogisticsHub)) setNewReqLogisticsHub(allHubs[0].name);
      if (!allHubs.some(h => h.name === restockWarehouse)) setRestockWarehouse(allHubs[0].name);
      if (!allHubs.some(h => h.name === selectedWarehouse)) setSelectedWarehouse(allHubs[0].name);
    }
  }, [allHubs, newReqLogisticsHub, restockWarehouse, selectedWarehouse]);

  // Calculate closest hub based on village lat/lon
  const getClosestHubInfo = (vLat, vLon) => {
    const lat = parseFloat(vLat) || 24.8950;
    const lon = parseFloat(vLon) || 91.8700;
    let closest = allHubs[0] || LOGISTICS_HUBS[0];
    let minD = Infinity;

    allHubs.forEach(hub => {
      const d = calcDistanceKm(lat, lon, hub.lat, hub.lon);
      if (d < minD) {
        minD = d;
        closest = hub;
      }
    });

    return { hub: closest, distanceKm: minD };
  };

  const closestHubInfo = getClosestHubInfo(newReqLat, newReqLon);

  // When District changes, auto-select nearest hub for that district
  const handleDistrictChange = (selectedDistrict) => {
    setNewReqDistrict(selectedDistrict);
    const matchedHub = allHubs.find(h => h.district === selectedDistrict) || allHubs[0];
    setNewReqLogisticsHub(matchedHub.name);
    setNewReqLat(matchedHub.lat.toFixed(4));
    setNewReqLon(matchedHub.lon.toFixed(4));
  };

  // When Lat/Lon manually or via map picker changes
  const handleCoordsUpdate = (latVal, lonVal) => {
    setNewReqLat(latVal);
    setNewReqLon(lonVal);
    const closest = getClosestHubInfo(latVal, lonVal);
    if (closest && closest.hub) {
      setNewReqLogisticsHub(closest.hub.name);
    }
  };

  // Reverse Geocoding to fetch village name from map coordinates
  const fetchVillageNameFromCoords = async (lat, lng) => {
    try {
      // 1. Primary: OpenStreetMap Nominatim for accurate suburb/village/neighbourhood detection
      const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const res = await fetch(nomUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const detected =
            data.address.suburb ||
            data.address.village ||
            data.address.neighbourhood ||
            data.address.hamlet ||
            data.address.quarter ||
            data.address.residential ||
            data.address.town ||
            data.address.city_district ||
            (data.display_name ? data.display_name.split(',')[0] : '');

          if (detected && detected.trim()) {
            const cleanName = detected.trim();
            setNewReqVillage(cleanName);
            toast.info(`📍 Location detected: ${cleanName}`);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Nominatim reverse geocode error:', err);
    }

    try {
      // 2. Fallback: BigDataCloud free reverse geocode API
      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
      const res = await fetch(bdcUrl);
      if (res.ok) {
        const data = await res.json();
        const detected =
          data.locality ||
          data.localityInfo?.administrative?.[4]?.name ||
          data.localityInfo?.administrative?.[3]?.name ||
          data.localityInfo?.administrative?.[2]?.name ||
          data.city;
        if (detected && detected.trim()) {
          const cleanName = detected.trim();
          setNewReqVillage(cleanName);
          toast.info(`📍 Location detected: ${cleanName}`);
        }
      }
    } catch (e) {
      console.warn('BigDataCloud reverse geocode failed:', e);
    }
  };

  // Village Map Picker Leaflet initialization
  useEffect(() => {
    if (!showVillageMapPicker) return;

    // Small delay to ensure the DOM div is rendered before Leaflet attaches
    const timer = setTimeout(() => {
      const initVillageMap = () => {
        const container = document.getElementById('village-map-container');
        if (!container) return;

        // If already initialized, just resize
        if (villageMapRef.current) {
          villageMapRef.current.invalidateSize();
          return;
        }

        const initialLat = parseFloat(newReqLat) || 24.8950;
        const initialLon = parseFloat(newReqLon) || 91.8700;

        const map = window.L.map(container, {
          center: [initialLat, initialLon],
          zoom: 10,
          zoomControl: true
        });
        villageMapRef.current = map;

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const marker = window.L.marker([initialLat, initialLon], { draggable: true }).addTo(map);
        marker.bindPopup(`<b>Village Location</b>`).openPopup();

        const updateCoords = (lat, lng) => {
          const fLat = lat.toFixed(4);
          const fLon = lng.toFixed(4);
          handleCoordsUpdate(fLat, fLon);
          marker.setLatLng([lat, lng]);
          fetchVillageNameFromCoords(lat, lng);
        };

        map.on('click', (e) => updateCoords(e.latlng.lat, e.latlng.lng));
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          updateCoords(pos.lat, pos.lng);
        });

        setTimeout(() => map.invalidateSize(), 100);
      };

      if (window.L) {
        initVillageMap();
      } else {
        // Load Leaflet JS if not yet loaded
        const existingScript = document.getElementById('leaflet-script');
        if (existingScript) {
          existingScript.addEventListener('load', initVillageMap);
        } else {
          const script = document.createElement('script');
          script.id = 'leaflet-script';
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = initVillageMap;
          document.head.appendChild(script);
        }
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      if (villageMapRef.current) {
        villageMapRef.current.remove();
        villageMapRef.current = null;
      }
    };
  }, [showVillageMapPicker]);

  // When a Campaign is selected - auto-fill district, coords, and pick closest hub
  const handleCampaignSelect = (campId) => {
    setSelectedCampaignId(campId);
    const camp = campaigns.find(c => (c._id || c.campaignId || c.shelterId) === campId || c.campaignId === campId || c.shelterId === campId);
    if (camp) {
      const lat = parseFloat(camp.lat) || 24.8950;
      const lon = parseFloat(camp.lon) || 91.8700;
      setNewReqDistrict(camp.district || 'Sylhet');
      setNewReqVillage(camp.name);
      setNewReqLat(lat.toFixed(4));
      setNewReqLon(lon.toFixed(4));
      setNewReqContact(camp.ngoName || camp.createdBy || mongoUser?.name || (mongoUser?.role === 'Government' ? 'Shelter Manager' : 'Campaign Manager'));
      setNewReqPhone(camp.contactPhone || mongoUser?.phone || '+8801700000000');
      setNewReqPopulation(camp.capacity || 1000);
      // Auto-calculate closest hub
      const closest = getClosestHubInfo(lat, lon);
      if (closest && closest.hub) {
        setNewReqLogisticsHub(closest.hub.name);
        toast.success(`🏬 Auto-matched hub: ${closest.hub.name} (${closest.distanceKm} km away)`);
      }
    }
  };

  // Check duplicate request in last 24h on frontend
  const checkDuplicateRequest = (village, item) => {
    return requests.some(r =>
      r.villageName.toLowerCase() === village.toLowerCase() &&
      r.itemType === item &&
      r.status !== 'Delivered' &&
      (new Date() - new Date(r.reportedAt)) < 24 * 3600000
    );
  };

  // Handle village/campaign request submission
  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (requestMode === 'campaign' && !selectedCampaignId) {
      toast.error('⚠️ Please select a campaign first.');
      return;
    }
    if (requestMode === 'village' && (!newReqVillage || !newReqPopulation || !newReqQuantity)) {
      const msg = language === 'en' ? 'Village name, population, and item quantity are required.' : 'গ্রামের নাম, জনসংখ্যা এবং পরিমাণের তথ্য প্রদান করা আবশ্যক।';
      setErrorMsg(msg);
      toast.error(`⚠️ ${msg}`);
      return;
    }
    if (requestMode === 'campaign' && (!newReqQuantity || parseInt(newReqQuantity) <= 0)) {
      toast.error('⚠️ Please enter a valid quantity.');
      return;
    }

    setIsCreatingRequest(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const campObj = campaigns.find(c => (c._id || c.campaignId || c.shelterId) === selectedCampaignId || c.campaignId === selectedCampaignId || c.shelterId === selectedCampaignId);
      const contactPerson = (newReqContact && newReqContact.trim()) || (requestMode === 'campaign' ? (campObj?.ngoName || campObj?.createdBy || mongoUser?.name || (mongoUser?.role === 'Government' ? 'Shelter Manager' : 'Campaign Manager')) : (mongoUser?.name || 'Local Lead'));
      const phone = (newReqPhone && newReqPhone.trim()) || (requestMode === 'campaign' ? (campObj?.contactPhone || mongoUser?.phone || '+8801700000000') : (mongoUser?.phone || '+8801700000000'));
      const population = parseInt(newReqPopulation) || (requestMode === 'campaign' ? (campObj?.capacity || 1000) : 1000);

      const response = await fetch(`${API_URL}/logistics/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          villageName: newReqVillage,
          district: newReqDistrict,
          contactPerson,
          phone,
          population,
          itemType: newReqItem,
          quantity: parseInt(newReqQuantity),
          assignedHub: newReqLogisticsHub,
          latitude: parseFloat(newReqLat),
          longitude: parseFloat(newReqLon),
          shortestDistanceKm: closestHubInfo?.distanceKm || 0
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Request creation failed');
      }

      setSuccessMsg(t.requestSuccess);
      toast.success(`✅ Relief request submitted for ${newReqVillage}!`);

      // Immediately insert into requests feed
      setRequests(prev => [data, ...prev]);

      setNewReqVillage('');
      setNewReqContact('');
      setNewReqPhone('');
      setNewReqPopulation('');
      setNewReqQuantity('');
      setSelectedCampaignId('');
      fetchData();
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message);
      toast.error(`❌ ${e.message}`);
    } finally {
      setIsCreatingRequest(false);
    }
  };

  // Standalone Route Optimization query
  const handleRouteSolve = async (e) => {
    e.preventDefault();
    setOptLoading(true);
    setOptResult(null);

    try {
      const response = await fetch(`${API_URL}/logistics/optimize-route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          startNode: optStart,
          endNode: optEnd
        })
      });

      if (response.ok) {
        const data = await response.json();
        setOptResult(data);
      }
    } catch (e) {
      console.error('Routing service failed:', e);
    } finally {
      setOptLoading(false);
    }
  };

  // Standalone Demand Prediction query
  const handleDemandPredict = async (e) => {
    e.preventDefault();
    setPredLoading(true);
    setPredResult(null);

    try {
      const response = await fetch(`${API_URL}/logistics/predict-demand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          population: parseInt(predPop),
          itemType: predItem,
          districtRisk: parseInt(predRisk)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPredResult(data);
      }
    } catch (e) {
      console.error('Demand prediction failed:', e);
    } finally {
      setPredLoading(false);
    }
  };

  // Open the dispatch modal for a specific request
  const openDispatchModal = (request) => {
    setSelectedRequest(request);
    setCalculatedRoute(null);
    setDispatchError('');
    setDispatchModalOpen(true);

    // Auto-select a warehouse in the same district if available, otherwise default
    const sameDistrictWarehouse = inventory.find(i => i.district === request.district);
    if (sameDistrictWarehouse) {
      setSelectedWarehouse(sameDistrictWarehouse.warehouseName);
    } else {
      setSelectedWarehouse('Sylhet Relief Hub');
    }
  };

  // Modal Route Calculation trigger
  const handleModalRouteCalc = async () => {
    if (!selectedRequest || !selectedWarehouse) return;
    setCalculatingRoute(true);
    setCalculatedRoute(null);
    try {
      const response = await fetch(`${API_URL}/logistics/optimize-route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          startNode: selectedWarehouse,
          endNode: selectedRequest.villageName
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCalculatedRoute(data);
      }
    } catch (e) {
      console.error('Route calculation failed inside modal:', e);
    } finally {
      setCalculatingRoute(false);
    }
  };

  // Confirm Dispatch Shipment Allocation
  const handleConfirmDispatch = async () => {
    if (!selectedRequest || !selectedWarehouse) return;

    // Check stock validation on frontend
    const invItem = inventory.find(i => i.warehouseName === selectedWarehouse && i.itemType === selectedRequest.itemType);
    const stockAvailable = invItem ? invItem.quantity : 0;
    if (stockAvailable < selectedRequest.quantity) {
      setDispatchError(t.insufficientStock);
      return;
    }

    setDispatchLoading(true);
    setDispatchError('');

    try {
      const response = await fetch(`${API_URL}/logistics/allocate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          requestId: selectedRequest._id,
          warehouseName: selectedWarehouse,
          allocatedItems: [
            { itemType: selectedRequest.itemType, quantity: selectedRequest.quantity }
          ],
          routeDistance: calculatedRoute ? calculatedRoute.totalDistanceKm : 45.0,
          routePath: calculatedRoute ? calculatedRoute.optimizedPath : [selectedWarehouse, selectedRequest.villageName],
          dispatchedByText: mongoUser.role === 'NGORepresentative' ? `${mongoUser.name} (Logistics)` : mongoUser.role === 'NGO' ? 'NGO' : mongoUser.role
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Dispatch allocation failed');
      }

      setSuccessMsg(t.dispatchSuccess);
      setDispatchModalOpen(false);
      setSelectedRequest(null);
      // Reload both inventory & request lists
      fetchData();
    } catch (e) {
      console.error(e);
      setDispatchError(e.message);
    } finally {
      setDispatchLoading(false);
    }
  };

  // Access Restrictions Check — wait for mongoUser to load
  if (!mongoUser) {
    return (
      <div className="min-h-screen bg-flood-dark-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-flood-cyan-500 border-slate-800 animate-spin"></div>
      </div>
    );
  }

  if (!['Government', 'NGO', 'NGORepresentative', 'GovRepresentative', 'GovRepLogistics', 'NGORepLogistics'].includes(mongoUser.role)) {
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
            ? 'This resource optimization and route planning panel is authorized for Government Officials and NGO Workers only.'
            : 'এই ত্রাণ সামগ্রী ও পরিবহন অপটিমাইজেশন প্যানেলটি শুধুমাত্র সরকারি কর্মকর্তা এবং এনজিও কর্মীদের ব্যবহারের জন্য অনুমোদিত।'}
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

  return (
    <>
      <div className="min-h-screen bg-flood-dark-950 text-slate-100 py-10 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">

          {/* Title Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white font-heading m-0 flex items-center gap-3">
                <Boxes className="w-9 h-9 text-flood-cyan-400" />
                {t.title}
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl font-medium">
                {t.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-sm font-bold border border-white/5 hover:border-flood-cyan-500/20 text-flood-cyan-400 hover:text-white transition-all cursor-pointer"
                title="Sync Database"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{language === 'en' ? 'Sync Stores' : 'স্টোর সিঙ্ক'}</span>
              </button>
            </div>
          </div>

          {/* Global Success / Error Messages */}
          {errorMsg && (
            <div className="glass-panel p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-sm font-semibold flex items-center gap-3 animate-fade-in shadow-lg">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500 animate-pulse" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-sm font-semibold flex items-center gap-3 animate-fade-in shadow-lg">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Top Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 bg-slate-900/40">
              <div className="p-3.5 rounded-xl bg-flood-cyan-500/10 text-flood-cyan-400">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">{requests.length}</div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{t.overviewRequests}</div>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 bg-slate-900/40">
              <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">
                  {requests.filter(r => r.status === 'Pending' || r.status === 'Approved').length}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{t.overviewPending}</div>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 bg-slate-900/40">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">
                  {requests.filter(r => r.status === 'Dispatched' || r.status === 'Delivered').length}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{t.overviewAllocated}</div>
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 bg-slate-900/40">
              <div className="p-3.5 rounded-xl bg-rose-500/10 text-rose-500">
                <Boxes className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">{lowStockCount}</div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{t.overviewLowStock}</div>
              </div>
            </div>
          </div>

          {/* Inventory Stock Tracker & Restock Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Warehouse Stocks Grid */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/5 bg-slate-900/30 flex flex-col gap-5">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <h2 className="text-xl font-bold tracking-tight text-white font-heading flex items-center gap-2">
                  <Database className="w-5 h-5 text-flood-cyan-400" />
                  {t.inventoryTitle}
                </h2>
                {lowStockCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/20 text-[10px] font-bold text-rose-400 flex items-center gap-1.5 animate-pulse">
                    <ShieldAlert className="w-3 h-3" />
                    {language === 'en' ? `${lowStockCount} Alerts` : `${lowStockCount} সতর্কবার্তা`}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-t-flood-cyan-500 border-slate-800 animate-spin"></div>
                  <p className="text-slate-400 text-xs">{language === 'en' ? 'Updating stock levels...' : 'স্টক স্তর আপডেট হচ্ছে...'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {inventory.map(inv => {
                    const isLow = isStockLow(inv.itemType, inv.quantity);
                    return (
                      <div
                        key={inv._id}
                        onClick={() => { setSelectedWarehouseName(inv.warehouseName); setWarehouseModalOpen(true); }}
                        className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer group ${isLow
                            ? 'bg-rose-950/10 border-rose-500/20 shadow-lg shadow-rose-500/5 hover:border-rose-500/40 hover:shadow-rose-500/10'
                            : 'bg-slate-900/60 border-white/5 hover:border-flood-cyan-500/30 hover:bg-slate-900/80'
                          }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                              {inv.warehouseName}
                            </span>
                            <h3 className="text-base font-bold text-white mt-0.5">
                              {t.items[inv.itemType] || inv.itemType}
                            </h3>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {isLow && (
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-[9px] font-bold text-rose-400 uppercase tracking-wide">
                                {t.lowStockWarning}
                              </span>
                            )}
                            <span className="text-[9px] text-slate-500 group-hover:text-flood-cyan-400 transition-colors font-semibold">
                              {language === 'en' ? 'Click to view all →' : 'সব দেখুন →'}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-baseline mt-4">
                          <span className="text-2xl font-black text-white">
                            {inv.quantity.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold">{inv.unit}</span>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-rose-500' : inv.quantity > 5000 ? 'bg-emerald-500' : 'bg-flood-cyan-500'
                              }`}
                            style={{ width: `${Math.min(100, (inv.quantity / (inv.itemType === 'Food' || inv.itemType === 'Water' ? 20000 : 5000)) * 100)}%` }}
                          />
                        </div>

                        {/* Restock Quick Setter */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRestockWarehouse(inv.warehouseName);
                            setRestockItem(inv.itemType);
                          }}
                          className="w-full mt-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[10px] font-bold text-slate-300 hover:text-white border border-white/5 hover:border-flood-cyan-500/20 transition-all cursor-pointer text-center"
                        >
                          {language === 'en' ? 'Select for Restocking' : 'রিস্টকিং সিলেক্ট করুন'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Restock Form Panel */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-900/30 flex flex-col gap-4">
              <h2 className="text-lg font-bold tracking-tight text-white font-heading border-b border-white/5 pb-3 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-flood-cyan-400" />
                {t.restockTitle}
              </h2>

              <form onSubmit={handleRestock} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.warehouse}</label>
                  <select
                    value={restockWarehouse}
                    onChange={(e) => setRestockWarehouse(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-semibold text-sm outline-none focus:border-flood-cyan-400 transition-colors"
                  >
                    {allHubs.length > 0 ? (
                      allHubs.map(h => (
                        <option key={h.name} value={h.name}>
                          {h.name} ({h.district || 'Sylhet'})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="[GOV] Sylhet Divisional Depot [Hub]">[GOV] Sylhet Divisional Depot [Hub] (Sylhet)</option>
                        <option value="[GOV] Sunamganj Relief Depot [Hub]">[GOV] Sunamganj Relief Depot [Hub] (Sunamganj)</option>
                        <option value="[GOV] Kurigram Storage Depot [Hub]">[GOV] Kurigram Storage Depot [Hub] (Kurigram)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.itemType}</label>
                  <select
                    value={restockItem}
                    onChange={(e) => setRestockItem(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-semibold text-sm outline-none focus:border-flood-cyan-400 transition-colors"
                  >
                    <option value="Food">Food (bags)</option>
                    <option value="Water">Water (liters)</option>
                    <option value="Medicine">Medicine (kits)</option>
                    <option value="Shelter Kits">Shelter Kits (packs)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.addStock}</label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={restockQuantity}
                    onChange={(e) => setRestockQuantity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-600 font-semibold text-sm outline-none focus:border-flood-cyan-400 transition-colors"
                  />
                </div>

                {/* Volunteer Selector for Restock Transport */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {language === 'en' ? 'Assign Transport Volunteer (Optional)' : 'পরিবহন স্বেচ্ছাসেবক নির্বাচন করুন'}
                  </label>
                  <select
                    value={restockVolunteerUid}
                    onChange={(e) => {
                      const v = availableVolunteers.find(vol => vol.uid === e.target.value);
                      setRestockVolunteerUid(e.target.value);
                      setRestockVolunteerName(v ? v.name : '');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-semibold text-sm outline-none focus:border-flood-cyan-400 transition-colors"
                  >
                    <option value="">{language === 'en' ? '-- No Volunteer Assigned --' : '-- কোনো স্বেচ্ছাসেবক নির্বাচন করা হয়নি --'}</option>
                    {availableVolunteers.map(vol => (
                      <option key={vol.uid} value={vol.uid}>
                        {vol.name} ({vol.district})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isRestocking}
                  className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-flood-blue-600 to-flood-cyan-500 text-white font-bold text-sm tracking-wide shadow-md shadow-flood-blue-500/10 hover:shadow-flood-blue-500/20 active:scale-98 transition-all cursor-pointer flex justify-center items-center"
                >
                  {isRestocking ? (
                    <div className="w-4 h-4 border-2 border-t-white border-transparent rounded-full animate-spin"></div>
                  ) : (
                    t.saveStockBtn
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* ── Ready to Dispatch Panel (NGO Admin only — hidden for Government admin) ── */}
          {mongoUser?.role === 'NGO' && (() => {
            const pendingLoaded = Array.isArray(transportsList)
              ? transportsList.filter(tr => tr.status === 'Pending' && tr.loadStatus === 'Loaded')
              : [];
            if (pendingLoaded.length === 0) return null;
            return (
              <div className="glass-panel p-6 rounded-3xl border border-emerald-500/20 bg-emerald-900/10 flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Truck className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {language === 'en' ? 'Ready to Dispatch' : 'পাঠানোর জন্য প্রস্তুত'}
                  </h2>
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    {pendingLoaded.length} {language === 'en' ? 'loaded' : 'লোড হয়েছে'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {language === 'en'
                    ? 'These shipments have been loaded by the logistics hub. Click Dispatch to mark them In Transit — they will then appear in the Transport Tracker.'
                    : 'এই শিপমেন্টগুলি লজিস্টিক্স হাব লোড করেছে। ডিসপ্যাচ ক্লিক করুন — তারপর ট্রান্সপোর্ট ট্র্যাকারে দেখা যাবে।'}
                </p>
                <div className="space-y-3">
                  {pendingLoaded.map(tr => (
                    <div key={tr._id} className="flex items-center justify-between gap-3 bg-slate-900/60 border border-emerald-500/20 rounded-xl px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {tr.origin} <span className="text-slate-400">→</span> {tr.destination}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">{tr.district}</span>
                          {tr.itemsSummary && <span className="truncate">{tr.itemsSummary}</span>}
                        </div>
                        {tr.assignedVolunteers && tr.assignedVolunteers.length > 0 && (
                          <div className="text-[10px] text-cyan-400 mt-0.5">
                            👤 {tr.assignedVolunteers.map(v => v.volunteerName).join(', ')}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDispatchTransport(tr._id)}
                        disabled={dispatchingTransportId === tr._id}
                        className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-1.5"
                      >
                        {dispatchingTransportId === tr._id
                          ? <><div className="w-3 h-3 border-2 border-t-white border-transparent rounded-full animate-spin" /> Dispatching...</>
                          : <><Send className="w-3.5 h-3.5" /> {language === 'en' ? 'Dispatch Now' : 'এখনই পাঠান'}</>
                        }
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Submit Request Form Section */}
          <div className="w-full">

            {/* File New Request Form */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 bg-slate-900/30 flex flex-col gap-5 shadow-xl w-full">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3">
                <h2 className="text-xl font-bold tracking-tight text-white font-heading flex items-center gap-2">
                  <PlusCircle className="w-6 h-6 text-flood-cyan-400" />
                  {requestMode === 'village' ? t.submitRequestTitle : (mongoUser?.role === 'Government' ? 'Shelter + Campaign Relief Request' : 'Campaign Relief Request')}
                </h2>
                {/* Mode Toggle */}
                <div className="flex gap-1.5 p-1.5 bg-slate-950/60 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setRequestMode('village')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${requestMode === 'village'
                        ? 'bg-flood-cyan-500 text-white shadow-md shadow-flood-cyan-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <MapPin className="w-3.5 h-3.5" /> Village Request
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestMode('campaign')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${requestMode === 'campaign'
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                  >
                    <Tent className="w-3.5 h-3.5" /> {mongoUser?.role === 'Government' ? 'Shelter Request' : 'Campaign Request'}
                  </button>
                </div>
              </div>

              {/* Campaign/Shelter Request Mode Selector */}
              {requestMode === 'campaign' && (
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col gap-3 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Tent className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-emerald-300">{mongoUser?.role === 'Government' ? 'Select Target Shelter or Campaign' : 'Select Target Campaign'}</span>
                    <span className="text-[10px] text-slate-400 ml-auto">Closest hub auto-matched by distance</span>
                  </div>
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => handleCampaignSelect(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-emerald-500/30 text-emerald-300 font-semibold text-sm outline-none focus:border-emerald-400 transition-colors"
                  >
                    <option value="">-- {mongoUser?.role === 'Government' ? 'Select Shelter / Campaign' : 'Select Campaign'} --</option>
                    {campaigns.filter(c => !c.name?.includes('[Hub]')).map(c => (
                      <option key={c._id || c.campaignId || c.shelterId} value={c._id || c.campaignId || c.shelterId}>
                        {mongoUser?.role === 'Government' ? `[${c._sourceType === 'shelter' ? '🏠 Shelter' : '🏕 Campaign'}] ` : ''}{c.name} ({c.district})
                      </option>
                    ))}
                  </select>
                  {selectedCampaignId && newReqLogisticsHub && (
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Auto-matched Logistics Hub:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5" />
                        {newReqLogisticsHub}
                        <span className="text-emerald-500/70">({closestHubInfo.distanceKm} km)</span>
                      </span>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmitRequest} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{requestMode === 'campaign' ? (mongoUser?.role === 'Government' ? 'Shelter / Campaign Name (Auto)' : 'Campaign Name (Auto)') : t.villageName}</label>

                    <input
                      type="text"
                      placeholder="e.g. Chilmari Char"
                      value={newReqVillage}
                      onChange={(e) => setNewReqVillage(e.target.value)}
                      disabled={requestMode === 'campaign'}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-white placeholder-slate-600 font-semibold text-xs outline-none transition-colors ${requestMode === 'campaign'
                          ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-300 cursor-not-allowed'
                          : 'bg-slate-950 border-white/10 focus:border-flood-cyan-400'
                        }`}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.district}</label>
                    <select
                      value={newReqDistrict}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-semibold text-xs outline-none focus:border-flood-cyan-400"
                    >
                      {t.districts.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Logistics Hub</label>
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Shortest: {closestHubInfo.distanceKm} km
                      </span>
                    </div>
                    <select
                      value={newReqLogisticsHub}
                      onChange={(e) => setNewReqLogisticsHub(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-emerald-500/30 text-emerald-300 font-semibold text-xs outline-none focus:border-emerald-400"
                    >
                      {allHubs.map(h => (
                        <option key={h.name} value={h.name}>
                          {h.name} ({h.district}) — {calcDistanceKm(parseFloat(newReqLat) || 24.895, parseFloat(newReqLon) || 91.87, h.lat, h.lon)} km
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Village Map Selection & Coordinates */}
                <div className="space-y-2 bg-slate-950/60 p-3 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-flood-cyan-400" />
                      Village Coordinates & Map
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowVillageMapPicker(!showVillageMapPicker)}
                      className="text-[10px] font-bold text-flood-cyan-400 hover:text-white bg-flood-cyan-500/10 hover:bg-flood-cyan-500/20 px-2 py-1 rounded-lg border border-flood-cyan-500/30 transition flex items-center gap-1 cursor-pointer"
                    >
                      <MapIcon className="w-3 h-3" />
                      {showVillageMapPicker ? 'Hide Map' : '🗺️ Pick on Map'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Latitude (e.g. 24.8950)"
                      value={newReqLat}
                      onChange={(e) => handleCoordsUpdate(e.target.value, newReqLon)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white font-mono text-[11px] outline-none focus:border-flood-cyan-400"
                    />
                    <input
                      type="text"
                      placeholder="Longitude (e.g. 91.8700)"
                      value={newReqLon}
                      onChange={(e) => handleCoordsUpdate(newReqLat, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-white font-mono text-[11px] outline-none focus:border-flood-cyan-400"
                    />
                  </div>

                  {/* Interactive Leaflet Map Container - always render, show/hide with CSS */}
                  <div
                    id="village-map-container"
                    style={{ height: showVillageMapPicker ? '260px' : '0px', display: showVillageMapPicker ? 'block' : 'none' }}
                    className="w-full rounded-xl border border-flood-cyan-500/30 relative"
                  ></div>
                  {showVillageMapPicker && (
                    <p className="text-[9px] text-slate-400 text-center italic pt-1">Click or drag the marker to set exact village location — name auto-fills</p>
                  )}
                </div>

                {/* Shortest Route Display */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <Navigation className="w-3 h-3" /> Shortest Supply Path
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {closestHubInfo.distanceKm} km
                    </span>
                  </div>
                  <div className="text-xs text-slate-200 font-mono flex items-center gap-1.5 flex-wrap">
                    <span className="text-emerald-400 font-bold">{newReqLogisticsHub}</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-slate-400">Regional Highway Transit</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-sky-300 font-bold">{newReqVillage || 'Village Node'}</span>
                  </div>
                  <div className="text-[9px] text-slate-500 flex justify-between pt-1 border-t border-slate-900">
                    <span>Auto-matched for {newReqDistrict}</span>
                    <span>Est. Transit: ~{Math.round(closestHubInfo.distanceKm * 1.8)} mins</span>
                  </div>
                </div>

                {/* Population - Village mode only */}
                {requestMode === 'village' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.population}</label>
                    <input
                      type="number"
                      placeholder="e.g. 1400"
                      value={newReqPopulation}
                      onChange={(e) => setNewReqPopulation(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-600 font-semibold text-xs outline-none focus:border-flood-cyan-400"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.requestItem}</label>
                    <select
                      value={newReqItem}
                      onChange={(e) => setNewReqItem(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white font-semibold text-xs outline-none focus:border-flood-cyan-400"
                    >
                      <option value="Food">Food (bags)</option>
                      <option value="Water">Water (liters)</option>
                      <option value="Medicine">Medicine (kits)</option>
                      <option value="Shelter Kits">Shelter Kits (packs)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t.requestQty}</label>
                    <input
                      type="number"
                      placeholder="e.g. 350"
                      value={newReqQuantity}
                      onChange={(e) => setNewReqQuantity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-600 font-semibold text-xs outline-none focus:border-flood-cyan-400"
                    />
                  </div>
                </div>

                {/* Inline error display */}
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    {errorMsg}
                  </div>
                )}

                {/* Alert duplicate requests filed in last 24h instantly */}
                {newReqVillage && checkDuplicateRequest(newReqVillage, newReqItem) && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t.warningRecentRequest}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isCreatingRequest}
                  className="w-full mt-2 py-3 rounded-xl font-bold text-sm tracking-wide transition-all cursor-pointer flex justify-center items-center gap-2"
                  style={{
                    background: isCreatingRequest ? '#334155' : requestMode === 'campaign'
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
                    color: 'white', border: 'none',
                    boxShadow: isCreatingRequest ? 'none' : requestMode === 'campaign' ? '0 4px 20px rgba(16,185,129,0.35)' : '0 4px 20px rgba(6,182,212,0.35)'
                  }}
                >
                  {isCreatingRequest ? (
                    <>
                      <div className="w-4 h-4 border-2 border-t-white border-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {t.submitRequestBtn || 'Submit Request & Calc Score'}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Requests Feed Grid Table */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-900/30 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
              <h2 className="text-xl font-bold tracking-tight text-white font-heading flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-flood-cyan-400" />
                {t.requestsTitle}
              </h2>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white placeholder-slate-600 outline-none focus:border-flood-cyan-400 w-full sm:w-48 transition-colors"
                />
                <select
                  value={filterDistrict}
                  onChange={(e) => setFilterDistrict(e.target.value)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white font-semibold outline-none focus:border-flood-cyan-400 cursor-pointer"
                >
                  <option value="All">{t.allDistricts}</option>
                  {t.districts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto w-full no-scrollbar">
              <table className="w-full text-left border-collapse text-slate-300">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">{t.villageName}</th>
                    <th className="py-3 px-4">{t.district}</th>
                    <th className="py-3 px-4">{t.population}</th>
                    <th className="py-3 px-4">{t.requestItem}</th>
                    <th className="py-3 px-4">{t.requestQty}</th>
                    <th className="py-3 px-4 text-center">{t.priorityScore}</th>
                    <th className="py-3 px-4">{t.status}</th>
                    <th className="py-3 px-4 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-10 text-center text-slate-500 font-medium">
                        <div className="w-8 h-8 rounded-full border-2 border-t-flood-cyan-500 border-slate-800 animate-spin mx-auto mb-2"></div>
                        {language === 'en' ? 'Retrieving request databases...' : 'ত্রাণের আবেদন লোড হচ্ছে...'}
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-slate-500 font-medium">
                        {language === 'en' ? 'No active relief requests match your filters.' : 'কোনো সক্রিয় ত্রাণ আবেদন পাওয়া যায়নি।'}
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map(req => {
                      const isAllocated = req.status === 'Dispatched' || req.status === 'Delivered';
                      return (
                        <tr
                          key={req._id}
                          className={`hover:bg-slate-900/20 transition-colors ${!isAllocated && req.priorityScore >= 80
                              ? 'bg-rose-500/[0.02]'
                              : ''
                            }`}
                        >
                          <td className="py-4 px-4 font-bold text-white">
                            <div className="flex flex-col">
                              <span>{req.villageName}</span>
                              {req.submittedByRole === 'GovRepresentative' && (
                                <span className="text-[9px] text-violet-400 font-bold mt-0.5">Gov Rep Request → {req.destinationShelter || 'shelter'}</span>
                              )}
                              <span className="text-[10px] text-slate-500 font-normal mt-0.5">{req.contactPerson} ({req.phone})</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-medium text-slate-300">{req.district}</td>
                          <td className="py-4 px-4 font-semibold text-slate-400">{req.population?.toLocaleString()}</td>
                          <td className="py-4 px-4 font-semibold text-slate-300">{t.items[req.itemType] || req.itemType}</td>
                          <td className="py-4 px-4 font-black text-white">{req.quantity?.toLocaleString()}</td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[10px] ${req.priorityScore >= 80
                                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                                : req.priorityScore >= 60
                                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500'
                                  : 'bg-slate-800 border border-slate-700 text-slate-400'
                              }`}>
                              {req.priorityScore}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {(() => {
                              const matchedT = transportsList.find(t => String(t.requestId) === String(req._id) || t.destination === req.villageName);
                              return (
                                <div className="flex flex-col gap-1 items-start">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${req.status === 'Pending'
                                      ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                                      : req.status === 'Approved'
                                        ? 'bg-flood-cyan-500/10 border border-flood-cyan-500/20 text-flood-cyan-400 animate-pulse'
                                        : req.status === 'Dispatched'
                                          ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                                          : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${req.status === 'Pending'
                                        ? 'bg-amber-500'
                                        : req.status === 'Approved'
                                          ? 'bg-flood-cyan-400'
                                          : req.status === 'Dispatched'
                                            ? 'bg-blue-500'
                                            : 'bg-emerald-500'
                                      }`}></span>
                                    {t.statusLabels[req.status] || req.status}
                                  </span>
                                  {matchedT && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${matchedT.loadStatus === 'Loaded'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      }`}>
                                      {matchedT.loadStatus === 'Loaded' ? '📦 Loaded' : '⏳ Not Loaded'}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-4 px-4 text-right">
                            {!isAllocated ? (() => {
                              const matchedT = transportsList.find(t => String(t.requestId) === String(req._id) || t.destination === req.villageName);
                              const isNotLoaded = !matchedT || matchedT.loadStatus !== 'Loaded';
                              return (
                                <button
                                  onClick={() => openDispatchModal(req)}
                                  disabled={isNotLoaded}
                                  title={isNotLoaded ? 'Vehicle must be loaded by NGO Representative before dispatching' : ''}
                                  className={`px-3.5 py-1.5 rounded-lg font-bold text-[10px] tracking-wide shadow-md transition-all inline-flex items-center gap-1.5 ${isNotLoaded
                                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                                      : 'bg-gradient-to-r from-flood-blue-600 to-flood-cyan-500 text-white shadow-flood-blue-500/10 hover:shadow-flood-blue-500/25 active:scale-95 cursor-pointer'
                                    }`}
                                >
                                  <Truck className="w-3 h-3" />
                                  <span>{isNotLoaded ? 'Not Loaded' : (language === 'en' ? 'Dispatch' : 'পাঠান')}</span>
                                </button>
                              );
                            })() : (
                              <span className="text-[10px] text-slate-500 font-semibold italic flex items-center justify-end gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                                {language === 'en' ? 'Completed' : 'সম্পন্ন'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dispatch Relief Allocation Modal */}
          {dispatchModalOpen && selectedRequest && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
              <div className="w-full max-w-xl glass-panel p-6 rounded-3xl border border-white/10 bg-slate-900 shadow-2xl flex flex-col gap-5 animate-slide-up text-left">

                <div className="flex justify-between items-start border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-white font-heading">
                      {t.dispatchTitle}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {language === 'en' ? 'Map dispatch route and select warehouse stock levels.' : 'শিপমেন্টের রুট ম্যাপ করুন এবং গুদাম সিলেক্ট করুন।'}
                    </p>
                  </div>
                  <button
                    onClick={() => setDispatchModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                </div>

                {dispatchError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-400 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4.5 h-4.5 text-rose-500" />
                    <span>{dispatchError}</span>
                  </div>
                )}

                {/* Request target overview inside modal */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">{t.villageName}</div>
                    <div className="text-white font-bold mt-1 text-sm">{selectedRequest.villageName}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">{t.population}</div>
                    <div className="text-white font-black mt-1 text-sm">{selectedRequest.population?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">{t.itemType}</div>
                    <div className="text-flood-cyan-400 font-black mt-1 text-sm">{t.items[selectedRequest.itemType] || selectedRequest.itemType}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">{t.requestQty}</div>
                    <div className="text-white font-black mt-1 text-sm">{selectedRequest.quantity?.toLocaleString()}</div>
                  </div>
                </div>

                {/* Form elements for allocation */}
                <div className="flex flex-col gap-4">

                  {/* Select stock depot */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {t.selectWarehouse}
                    </label>
                    <select
                      value={selectedWarehouse}
                      onChange={(e) => setSelectedWarehouse(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-semibold text-xs outline-none focus:border-flood-cyan-400 transition-colors"
                    >
                      <option value="Sylhet Relief Hub">Sylhet Relief Hub (Sylhet)</option>
                      <option value="Sunamganj Disaster Depot">Sunamganj Disaster Depot (Sunamganj)</option>
                      <option value="Kurigram Central Warehouse">Kurigram Central Warehouse (Kurigram)</option>
                    </select>
                  </div>

                  {/* Display depot's current stock level */}
                  <div className="flex justify-between items-center text-xs py-1 px-1">
                    <span className="text-slate-400 font-bold">{t.stockAvailable}:</span>
                    {(() => {
                      const invItem = inventory.find(i => i.warehouseName === selectedWarehouse && i.itemType === selectedRequest.itemType);
                      const stock = invItem ? invItem.quantity : 0;
                      const isLow = stock < selectedRequest.quantity;
                      return (
                        <span className={`font-black text-sm ${isLow ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {stock.toLocaleString()} {invItem ? invItem.unit : ''}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Live route display mapped to dispatch solver */}
                  <div className="border-t border-white/5 pt-3 mt-1 flex flex-col gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {language === 'en' ? 'Calculated Delivery Route' : 'হিসাবকৃত ত্রাণ পরিবহন রুট'}
                    </label>

                    {calculatingRoute ? (
                      <div className="py-4 text-center text-xs text-slate-500 font-medium">
                        <div className="w-5 h-5 rounded-full border border-t-flood-cyan-500 border-transparent animate-spin mx-auto mb-1"></div>
                        {language === 'en' ? 'Solving shortest path graph...' : 'সংক্ষিপ্ততম পথ নির্ণয় করা হচ্ছে...'}
                      </div>
                    ) : calculatedRoute ? (
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/5 flex flex-col gap-2 animate-slide-up">
                        <div className="flex justify-between items-baseline text-xs">
                          <span className="text-slate-400 font-semibold">{t.distance}:</span>
                          <span className="font-extrabold text-flood-cyan-400">{calculatedRoute.totalDistanceKm} km</span>
                        </div>
                        <div className="flex flex-col gap-1 text-[10px]">
                          <span className="text-slate-400 font-semibold">{t.routePath}:</span>
                          <div className="flex flex-wrap items-center gap-1 mt-1 text-white font-medium">
                            {calculatedRoute.optimizedPath.map((node, i) => (
                              <React.Fragment key={i}>
                                {i > 0 && <ArrowRight className="w-2.5 h-2.5 text-slate-600 flex-shrink-0" />}
                                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/5 truncate max-w-[100px]" title={node}>
                                  {node}
                                </span>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                        <div className="text-[8px] text-slate-500 font-semibold text-right">
                          Solver: {calculatedRoute.solverUsed}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleModalRouteCalc}
                        className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-white border border-white/5 hover:border-flood-cyan-500/20 transition-all cursor-pointer text-center"
                      >
                        {language === 'en' ? 'Calculate Delivery Route' : 'রুট ক্যালকুলেট করুন'}
                      </button>
                    )}
                  </div>

                </div>

                {/* Warning duplicates inside modal too */}
                {selectedRequest && checkDuplicateRequest(selectedRequest.villageName, selectedRequest.itemType) && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold text-rose-400 flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    <span>{t.warningRecentRequest}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3.5 border-t border-white/5 pt-4 mt-2">
                  <button
                    onClick={() => setDispatchModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-white/10 text-slate-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    {t.dispatchCloseBtn}
                  </button>
                  <button
                    onClick={handleConfirmDispatch}
                    disabled={dispatchLoading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-flood-blue-600 to-flood-cyan-500 text-white font-bold text-xs tracking-wide shadow-md shadow-flood-blue-500/10 hover:shadow-flood-blue-500/20 active:scale-95 transition-all cursor-pointer flex justify-center items-center gap-1.5"
                  >
                    {dispatchLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-t-white border-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Truck className="w-3.5 h-3.5" />
                        <span>{t.dispatchConfirmBtn}</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

      {/* ═══ Warehouse Stock Detail Modal ═══ */}
      {warehouseModalOpen && selectedWarehouseName && (() => {
        const warehouseItems = inventory.filter(i => i.warehouseName === selectedWarehouseName);
        const hubInfo = allHubs.find(h => h.name === selectedWarehouseName);
        const totalItems = warehouseItems.reduce((sum, i) => sum + i.quantity, 0);
        const lowItems = warehouseItems.filter(i => isStockLow(i.itemType, i.quantity));

        return (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
            onClick={() => setWarehouseModalOpen(false)}
          >
            <div
              className="w-full max-w-2xl glass-panel rounded-3xl border border-white/10 bg-slate-900/95 shadow-2xl shadow-black/60 flex flex-col animate-slide-up overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-flood-cyan-500/10 border border-flood-cyan-500/20">
                    <Database className="w-5 h-5 text-flood-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight">{selectedWarehouseName}</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {hubInfo ? `${hubInfo.district} District` : ''} · {warehouseItems.length} item type{warehouseItems.length !== 1 ? 's' : ''}
                      {lowItems.length > 0 && (
                        <span className="ml-2 text-rose-400 font-bold animate-pulse">
                          ⚠ {lowItems.length} low stock alert{lowItems.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setWarehouseModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex-shrink-0"
                >
                  <Minus className="w-5 h-5" />
                </button>
              </div>

              {/* Summary strip */}
              <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
                <div className="px-5 py-3 text-center">
                  <div className="text-xl font-black text-white">{totalItems.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Total Units</div>
                </div>
                <div className="px-5 py-3 text-center">
                  <div className="text-xl font-black text-emerald-400">{warehouseItems.filter(i => !isStockLow(i.itemType, i.quantity)).length}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Adequate Stock</div>
                </div>
                <div className="px-5 py-3 text-center">
                  <div className={`text-xl font-black ${lowItems.length > 0 ? 'text-rose-400' : 'text-slate-500'}`}>{lowItems.length}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Low Stock</div>
                </div>
              </div>

              {/* Items Grid */}
              <div className="p-6 flex flex-col gap-3 max-h-[55vh] overflow-y-auto custom-scrollbar">
                {warehouseItems.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 font-medium text-sm">
                    No inventory records found for this warehouse.
                  </div>
                ) : (
                  warehouseItems.map(item => {
                    const isLow = isStockLow(item.itemType, item.quantity);
                    const maxQty = item.itemType === 'Food' || item.itemType === 'Water' ? 20000 : 5000;
                    const pct = Math.min(100, Math.round((item.quantity / maxQty) * 100));
                    const barColor = isLow ? 'bg-rose-500' : pct > 70 ? 'bg-emerald-500' : 'bg-flood-cyan-500';

                    return (
                      <div
                        key={item._id}
                        className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${isLow
                            ? 'bg-rose-950/10 border-rose-500/20'
                            : 'bg-slate-900/60 border-white/5'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isLow ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                            <div>
                              <div className="text-sm font-bold text-white">
                                {t.items[item.itemType] || item.itemType}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium capitalize">{item.itemType}</div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xl font-black text-white">{item.quantity.toLocaleString()}</div>
                            <div className="text-[10px] text-slate-400 font-semibold">{item.unit}</div>
                          </div>
                        </div>

                        {/* Stock progress bar */}
                        <div>
                          <div className="flex justify-between text-[9px] text-slate-500 font-semibold mb-1">
                            <span>{isLow ? '⚠ Low Stock' : 'In Stock'}</span>
                            <span>{pct}% of capacity</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {isLow && (
                          <div className="text-[10px] text-rose-400 font-bold flex items-center gap-1.5 bg-rose-500/5 border border-rose-500/15 px-2.5 py-1.5 rounded-lg">
                            <ShieldAlert className="w-3 h-3 flex-shrink-0" />
                            {language === 'en' ? 'Critical: Restock urgently required' : 'জরুরি: দ্রুত রিস্টক প্রয়োজন'}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between gap-3 p-5 border-t border-white/5 bg-slate-950/40">
                <p className="text-[11px] text-slate-500 font-medium">
                  {language === 'en' ? 'Click "Select for Restocking" on a card to pre-fill the restock form.' : 'রিস্টক ফর্ম পূরণ করতে কার্ডে ক্লিক করুন।'}
                </p>
                <button
                  onClick={() => setWarehouseModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white text-xs font-bold transition-all cursor-pointer flex-shrink-0"
                >
                  {language === 'en' ? 'Close' : 'বন্ধ করুন'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
