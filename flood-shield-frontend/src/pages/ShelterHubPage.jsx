import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { facilityMatch } from '../utils/facilityMatch';
import { 
  Tent, 
  PlusCircle, 
  Users, 
  Package, 
  Send, 
  KeyRound, 
  Building, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MapPin,
  RefreshCw,
  TrendingUp,
  Boxes,
  Mail,
  Copy,
  CheckCircle,
  RotateCw,
  Crosshair,
  Map,
  Plus,
  Trash2,
  Warehouse
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const sendInviteEmailRequest = async (path, headers, body) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || 'Failed to send email');
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Email send timed out. Copy the invite token and share it directly.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

export default function ShelterHubPage() {
  const { currentUser, mongoUser, token } = useAuth();
  const isGov = mongoUser?.role === 'Government';
  const isGovRep = mongoUser?.role === 'GovRepresentative' || mongoUser?.role === 'GovRepLogistics';

  const [activeTab, setActiveTab] = useState(isGovRep ? 'my-campaign' : 'shelters');
  
  // Data states
  const [shelters, setShelters] = useState([]);
  const [invites, setInvites] = useState([]);
  const [requests, setRequests] = useState([]);
  const [villageRequests, setVillageRequests] = useState([]);
  const [inventory, setInventory] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Form states (Government - Create Shelter)
  const [shelterName, setShelterName] = useState('');
  const [shelterDistrict, setShelterDistrict] = useState('Sylhet');
  const [shelterLat, setShelterLat] = useState('24.8950');
  const [shelterLon, setShelterLon] = useState('91.8700');
  const [shelterCapacity, setShelterCapacity] = useState('500');
  const [shelterPhone, setShelterPhone] = useState('');

  // Form states (Government - Create Invite)
  const [repName, setRepName] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [selectedShelterId, setSelectedShelterId] = useState('');
  const [lastGeneratedInvite, setLastGeneratedInvite] = useState(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');
  const [resendingId, setResendingId] = useState(null);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [showShelterMap, setShowShelterMap] = useState(false);
  const shelterMapRef = useRef(null);

  // Form states (Government - Create Logistics Rep Invite)
  const [logRepName, setLogRepName] = useState('');
  const [logRepEmail, setLogRepEmail] = useState('');
  const [selectedHub, setSelectedHub] = useState('');
  const [lastGeneratedLogisticsInvite, setLastGeneratedLogisticsInvite] = useState(null);
  const [logRepLoading, setLogRepLoading] = useState(false);
  const [logRepMsg, setLogRepMsg] = useState('');

  // Inventory stock state for campaign creation
  const [shelterInventoryItems, setShelterInventoryItems] = useState([
    { itemType: 'Food', quantity: '' },
  ]);
  const [addingStock, setAddingStock] = useState(false);

  // Creation mode state for left panel: 'campaign' | 'hub'
  const [creationMode, setCreationMode] = useState('campaign');

  // Form states (Government - Create Logistics Hub)
  const [hubName, setHubName] = useState('');
  const [hubDistrict, setHubDistrict] = useState('Sylhet');
  const [hubLat, setHubLat] = useState('24.8950');
  const [hubLon, setHubLon] = useState('91.8700');
  const [hubCapacity, setHubCapacity] = useState('5000');
  const [hubPhone, setHubPhone] = useState('');
  const [showHubMap, setShowHubMap] = useState(false);
  const hubMapRef = useRef(null);

  // Inventory stock state for logistics hub creation
  const [hubInventoryItems, setHubInventoryItems] = useState([
    { itemType: 'Food', quantity: '500' },
    { itemType: 'Water', quantity: '2000' }
  ]);

  // Form states (GovernmentRep - Submit Request)
  const [itemCategory, setItemCategory] = useState('Food');
  const [otherItemCategory, setOtherItemCategory] = useState('');
  const [requestQuantity, setRequestQuantity] = useState('');
  const [urgency, setUrgency] = useState('Medium');

  // Transport tracking for Government Rep
  const [transports, setTransports] = useState([]);
  const [receivingId, setReceivingId] = useState('');
  const [receiveMsg, setReceiveMsg] = useState('');
  const [receiveErr, setReceiveErr] = useState('');

  const districtsOfBD = [
    'Sylhet', 'Sunamganj', 'Kurigram', 'Jamalpur', 'Gaibandha', 
    'Bogura', 'Sirajganj', 'Tangail', 'Netrokona', 'Lalmonirhat', 
    'Feni', 'Noakhali', 'Chittagong', 'Cox\'s Bazar', 'Dhaka', 'Barisal', 'Khulna'
  ];

  const getAuthHeader = () => {
    const sessionToken = token || localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    };
  };

  const prevShelterRef = useRef('');
  const prevInvRef = useRef('');
  const prevReqRef = useRef('');
  const prevVRRef = useRef('');
  const prevTransRef = useRef('');

  const updateIfChanged = (setter, ref, newData) => {
    const str = JSON.stringify(newData || []);
    if (ref.current !== str) {
      ref.current = str;
      setter(newData);
    }
  };

  const fetchData = async (isBackground = false) => {
    if (!isBackground && requests.length === 0) setLoading(true);
    try {
      if (isGov) {
        const resC = await fetch(`${API_URL}/shelters`, { headers: getAuthHeader() });
        if (resC.ok) updateIfChanged(setShelters, prevShelterRef, await resC.json());

        const resInv = await fetch(`${API_URL}/logistics/inventory`, { headers: getAuthHeader() });
        if (resInv.ok) updateIfChanged(setInventory, prevInvRef, await resInv.json());

        if (isGov) {
          const resI = await fetch(`${API_URL}/shelters/invites`, { headers: getAuthHeader() });
          if (resI.ok) setInvites(await resI.json());

          const resR = await fetch(`${API_URL}/representatives/requests`, { headers: getAuthHeader() });
          if (resR.ok) updateIfChanged(setRequests, prevReqRef, await resR.json());
        }
      } else if (isGovRep) {
        const resInv = await fetch(`${API_URL}/representatives/inventory`, { headers: getAuthHeader() });
        if (resInv.ok) updateIfChanged(setInventory, prevInvRef, await resInv.json());

        const resR = await fetch(`${API_URL}/representatives/requests/mine`, { headers: getAuthHeader() });
        if (resR.ok) updateIfChanged(setRequests, prevReqRef, await resR.json());

        const resVR = await fetch(`${API_URL}/logistics/requests`, { headers: getAuthHeader() });
        if (resVR.ok) {
           const allVr = await resVR.json();
           const filtered = allVr.filter(vr => 
             (!mongoUser?.district || vr.district === mongoUser.district) && 
             vr.submittedByUid !== mongoUser?.uid &&
             vr.contactPerson !== mongoUser?.name &&
             vr.status !== 'Dispatched' && 
             vr.status !== 'In Transit' && 
             vr.status !== 'Delivered'
           );
           updateIfChanged(setVillageRequests, prevVRRef, filtered);
        }

        // Load transports for this rep
        try {
          const resT = await fetch(`${API_URL}/transport`, { headers: getAuthHeader() });
          if (resT.ok) updateIfChanged(setTransports, prevTransRef, await resT.json());
        } catch (te) { console.warn('Could not load transports:', te); }
      }
    } catch (e) {
      console.error('Failed fetching campaign data:', e);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
    const interval = setInterval(() => {
      fetchData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [mongoUser]);

  // Shelter map picker - Leaflet initialization
  useEffect(() => {
    if (!showShelterMap) return;
    const timer = setTimeout(() => {
      const container = document.getElementById('camp-map-container');
      if (!container) return;
      if (shelterMapRef.current) {
        shelterMapRef.current.invalidateSize();
        return;
      }
      const initialLat = parseFloat(shelterLat) || 24.8950;
      const initialLon = parseFloat(shelterLon) || 91.8700;

      const initMap = () => {
        const map = window.L.map(container, { center: [initialLat, initialLon], zoom: 11 });
        shelterMapRef.current = map;
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        const marker = window.L.marker([initialLat, initialLon], { draggable: true }).addTo(map);
        marker.bindPopup('<b>Shelter Location</b>').openPopup();
        const updateCoords = async (lat, lng) => {
          setShelterLat(lat.toFixed(4));
          setShelterLon(lng.toFixed(4));
          marker.setLatLng([lat, lng]);
          // Reverse geocode to auto-fill district suggestion
          try {
            const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
            if (r.ok) {
              const d = await r.json();
              const district = d.principalSubdivisionCode?.replace('BD-', '') || d.city || d.locality;
              if (district) toast.info(`📍 Location: ${d.locality || d.city || district}`);
            }
          } catch (_) {}
        };
        map.on('click', (e) => updateCoords(e.latlng.lat, e.latlng.lng));
        marker.on('dragend', () => { const p = marker.getLatLng(); updateCoords(p.lat, p.lng); });
        setTimeout(() => map.invalidateSize(), 100);
      };

      if (window.L) { initMap(); }
      else {
        const s = document.createElement('script');
        s.id = 'leaflet-js';
        s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        s.onload = initMap;
        document.head.appendChild(s);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      if (shelterMapRef.current) { shelterMapRef.current.remove(); shelterMapRef.current = null; }
    };
  }, [showShelterMap]);

  // Inventory item helpers
  const addInventoryRow = () => {
    setShelterInventoryItems(prev => [...prev, { itemType: 'Water', quantity: '' }]);
  };
  const removeInventoryRow = (idx) => {
    setShelterInventoryItems(prev => prev.filter((_, i) => i !== idx));
  };
  const updateInventoryRow = (idx, field, value) => {
    setShelterInventoryItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleCreateShelter = async (e) => {
    e.preventDefault();
    if (!shelterName.trim()) return setError('Shelter name is required.');
    setActionLoading(true);
    setError(''); setMessage('');
    try {
      const res = await fetch(`${API_URL}/shelters`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          name: shelterName,
          district: shelterDistrict,
          lat: shelterLat,
          lon: shelterLon,
          capacity: shelterCapacity,
          contactPhone: shelterPhone
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create campaign');
      
      toast.success(`✅ Shelter "${data.name}" launched successfully!`);
      setMessage(`Shelter "${data.name}" created successfully!`);

      // Post inventory stock items to the logistics restock endpoint
      const validItems = shelterInventoryItems.filter(i => i.quantity && parseInt(i.quantity) > 0);
      if (validItems.length > 0) {
        setAddingStock(true);
        const warehouseName = `${shelterName} (${shelterDistrict})`;
        for (const item of validItems) {
          try {
            await fetch(`${API_URL}/logistics/inventory/restock`, {
              method: 'POST',
              headers: getAuthHeader(),
              body: JSON.stringify({
                warehouseName,
                itemType: item.itemType,
                quantity: parseInt(item.quantity)
              })
            });
          } catch (stockErr) {
            console.warn('Stock item failed:', item.itemType, stockErr.message);
          }
        }
        toast.success(`📦 ${validItems.length} stock item(s) added to Inventory Tracker!`);
        setAddingStock(false);
      }

      setShelterName(''); setShelterPhone('');
      setShelterInventoryItems([{ itemType: 'Food', quantity: '' }]);
      fetchData();
    } catch (err) {
      setError(err.message);
      toast.error(`❌ ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Hub map picker - Leaflet initialization
  useEffect(() => {
    if (!showHubMap) return;
    const timer = setTimeout(() => {
      const container = document.getElementById('hub-map-container');
      if (!container) return;
      if (hubMapRef.current) {
        hubMapRef.current.invalidateSize();
        return;
      }
      const initialLat = parseFloat(hubLat) || 24.8950;
      const initialLon = parseFloat(hubLon) || 91.8700;

      const initMap = () => {
        const map = window.L.map(container, { center: [initialLat, initialLon], zoom: 11 });
        hubMapRef.current = map;
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        const marker = window.L.marker([initialLat, initialLon], { draggable: true }).addTo(map);
        marker.bindPopup('<b>Logistics Hub Location</b>').openPopup();
        const updateCoords = async (lat, lng) => {
          setHubLat(lat.toFixed(4));
          setHubLon(lng.toFixed(4));
          marker.setLatLng([lat, lng]);
          try {
            const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
            if (r.ok) {
              const d = await r.json();
              const district = d.principalSubdivisionCode?.replace('BD-', '') || d.city || d.locality;
              if (district) toast.info(`📍 Hub Location: ${d.locality || d.city || district}`);
            }
          } catch (_) {}
        };
        map.on('click', (e) => updateCoords(e.latlng.lat, e.latlng.lng));
        marker.on('dragend', () => { const p = marker.getLatLng(); updateCoords(p.lat, p.lng); });
        setTimeout(() => map.invalidateSize(), 100);
      };

      if (window.L) { initMap(); }
      else {
        const s = document.createElement('script');
        s.id = 'leaflet-js';
        s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        s.onload = initMap;
        document.head.appendChild(s);
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      if (hubMapRef.current) { hubMapRef.current.remove(); hubMapRef.current = null; }
    };
  }, [showHubMap]);

  // Hub Inventory helpers
  const addHubInventoryRow = () => {
    setHubInventoryItems(prev => [...prev, { itemType: 'Food', quantity: '' }]);
  };
  const removeHubInventoryRow = (idx) => {
    setHubInventoryItems(prev => prev.filter((_, i) => i !== idx));
  };
  const updateHubInventoryRow = (idx, field, value) => {
    setHubInventoryItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleGetHubCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHubLat(pos.coords.latitude.toFixed(4));
        setHubLon(pos.coords.longitude.toFixed(4));
        setDetectingLoc(false);
        toast.success(`📍 Hub Location: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      (err) => { setDetectingLoc(false); toast.error(`Failed: ${err.message}`); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const getLiveStockForCard = (c) => {
    let food = c.inventory?.dryFood || 0;
    let water = c.inventory?.waterBottles || 0;
    let med = c.inventory?.medicalKits || 0;

    if (Array.isArray(inventory) && inventory.length > 0) {
      const cleanName = c.name.replace(/\s*\[Hub\]$/i, '').replace(/\s*\(Hub\)$/i, '').trim();
      const matches = inventory.filter(i => 
        i.warehouseName.toLowerCase().includes(cleanName.toLowerCase()) || 
        cleanName.toLowerCase().includes(i.warehouseName.toLowerCase())
      );
      matches.forEach(i => {
        if (i.itemType === 'Food') food = i.quantity;
        if (i.itemType === 'Water') water = i.quantity;
        if (i.itemType === 'Medicine') med = i.quantity;
      });
    }
    return { food, water, med };
  };

  const getMyLiveStock = () => {
    if (!inventory) return { dryFood: 0, waterBottles: 0, medicalKits: 0, shelterKits: 0 };
    if (!Array.isArray(inventory)) {
      return {
        dryFood: inventory.dryFood || 0,
        waterBottles: inventory.waterBottles || 0,
        medicalKits: inventory.medicalKits || 0,
        shelterKits: inventory.shelterKits || 0
      };
    }
    const totals = { dryFood: 0, waterBottles: 0, medicalKits: 0, shelterKits: 0 };
    inventory.forEach(i => {
      if (isGov && i.warehouseName && i.warehouseName.includes('[BRAC]')) return;
      if (i.itemType === 'Food') totals.dryFood += (i.quantity || 0);
      else if (i.itemType === 'Water') totals.waterBottles += (i.quantity || 0);
      else if (i.itemType === 'Medicine') totals.medicalKits += (i.quantity || 0);
      else if (i.itemType === 'Shelter Kits') totals.shelterKits += (i.quantity || 0);
    });
    return totals;
  };

  const handleCreateLogisticsHub = async (e) => {
    e.preventDefault();
    if (!hubName.trim()) return setError('Logistics Hub name is required.');
    setActionLoading(true);
    setError(''); setMessage('');
    try {
      const cleanHubName = hubName.trim();
      const warehouseName = `${cleanHubName} (${hubDistrict})`;

      // 1. Save Hub Card into Shelter database registry
      await fetch(`${API_URL}/shelters`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          name: `${cleanHubName} [Hub]`,
          district: hubDistrict,
          lat: hubLat,
          lon: hubLon,
          capacity: hubCapacity,
          contactPhone: hubPhone
        })
      });

      // 2. Save Inventory Stock items
      const validItems = hubInventoryItems.filter(i => i.quantity && parseInt(i.quantity) > 0);
      if (validItems.length > 0) {
        setAddingStock(true);
        for (const item of validItems) {
          await fetch(`${API_URL}/logistics/inventory/restock`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({
              warehouseName,
              district: hubDistrict,
              itemType: item.itemType,
              quantity: parseInt(item.quantity)
            })
          });
        }
      }

      toast.success(`🏬 Logistics Hub "${cleanHubName}" registered successfully!`);
      setMessage(`Logistics Hub "${cleanHubName}" registered successfully!`);
      
      setHubName(''); setHubPhone('');
      setHubInventoryItems([{ itemType: 'Food', quantity: '' }]);
      fetchData();
    } catch (err) {
      setError(err.message);
      toast.error(`❌ ${err.message}`);
    } finally {
      setActionLoading(false);
      setAddingStock(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setShelterLat(pos.coords.latitude.toFixed(4));
        setShelterLon(pos.coords.longitude.toFixed(4));
        setDetectingLoc(false);
        toast.success(`📍 Current location: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      (err) => { setDetectingLoc(false); toast.error(`Failed: ${err.message}`); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    if (!repName.trim() || !selectedShelterId) return setError('Representative name and Shelter selection are required.');
    setActionLoading(true);
    setError(''); setMessage('');
    setLastGeneratedInvite(null);
    setEmailStatus('');
    try {
      const res = await fetch(`${API_URL}/shelters/invite`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          name: repName,
          email: repEmail.trim(),
          shelterId: selectedShelterId,
          shelterName: (shelters.find(c => String(c._id || c.shelterId) === String(selectedShelterId)) || {}).name || ''
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create invite token');
      const selectedShelter = shelters.find(c => String(c._id || c.shelterId) === String(selectedShelterId));
      setLastGeneratedInvite({
        inviteId: data.inviteId,
        name: repName.trim(),
        shelterName: selectedShelter?.name || selectedShelterId,
        email: repEmail.trim()
      });
      setMessage(`✅ Invite token generated: ${data.inviteId}`);
      setRepName('');
      setRepEmail('');
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateLogisticsInvite = async (e) => {
    e.preventDefault();
    if (!logRepName.trim() || !selectedHub) return setError('Representative name and Logistics Hub selection are required.');
    setLogRepLoading(true);
    setError(''); setLogRepMsg('');
    try {
      const res = await fetch(`${API_URL}/shelters/logistics-invite`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ name: logRepName, email: logRepEmail.trim(), assignedHub: selectedHub })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create logistics invite token');
      setLastGeneratedLogisticsInvite({ inviteId: data.inviteId, name: logRepName.trim(), assignedHub: selectedHub, email: logRepEmail.trim() });
      setLogRepMsg(`✅ Logistics Rep invite generated: ${data.inviteId}`);
      setLogRepName('');
      setLogRepEmail('');
      setSelectedHub('');
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLogRepLoading(false);
    }
  };

  const handleSendInviteEmail = async () => {
    if (!lastGeneratedInvite?.email) return;
    setEmailSending(true);
    setEmailStatus('');
    try {
      await sendInviteEmailRequest('/shelters/invite/send-email', getAuthHeader(), {
        toEmail: lastGeneratedInvite.email,
        toName: lastGeneratedInvite.name,
        inviteToken: lastGeneratedInvite.inviteId,
        shelterName: lastGeneratedInvite.shelterName
      });
      setEmailStatus('sent');
      toast.success(`📧 Invite email sent successfully to ${lastGeneratedInvite.email}!`);
    } catch (err) {
      setEmailStatus('error:' + err.message);
      toast.error(`❌ ${err.message}`);
    } finally {
      setEmailSending(false);
    }
  };

  const handleResendInvite = async (inv) => {
    let targetEmail = inv.email;
    if (!targetEmail) {
      targetEmail = window.prompt(`Enter representative email address to send token (${inv.inviteId}):`);
      if (!targetEmail || !targetEmail.trim()) return;
      targetEmail = targetEmail.trim();
    }

    const currentKey = inv._id || inv.inviteId;
    setResendingId(currentKey);
    try {
      await sendInviteEmailRequest('/shelters/invite/send-email', getAuthHeader(), {
        toEmail: targetEmail,
        toName: inv.name,
        inviteToken: inv.inviteId,
        shelterName: inv.shelterName || '',
        assignedHub: inv.assignedHub || ''
      });
      toast.success(`📧 Invite email successfully resent to ${targetEmail}!`);
    } catch (err) {
      toast.error(`❌ ${err.message}`);
    } finally {
      setResendingId(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
    toast.info('📋 Token copied to clipboard!');
  };


  const handleSubmitRepRequest = async (e) => {
    e.preventDefault();
    if (!requestQuantity) return setError('Please specify requested quantity.');
    if (itemCategory === 'Other' && !otherItemCategory.trim()) return setError('Please specify the other item.');
    setActionLoading(true);
    setError(''); setMessage('');
    try {
      const finalCategory = itemCategory === 'Other' ? otherItemCategory : itemCategory;
      const res = await fetch(`${API_URL}/representatives/requests`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ 
          requestType: 'VillageRelief', 
          itemType: finalCategory, 
          quantity: requestQuantity, 
          urgency 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit request');
      setMessage('Request submitted to parent Government successfully!');
      setRequestQuantity('');
      setOtherItemCategory('');
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRespondRequest = async (reqId, status) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_URL}/representatives/requests/${reqId}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ action: status === 'Approved' ? 'approve' : 'reject', govResponse: `Action taken by ${mongoUser?.name || 'Government'}` })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update request');
      setMessage(`Request updated to ${status}`);
      toast.success(`Request successfully ${status}!`);
      fetchData();
    } catch (err) {
      setError(err.message);
      toast.error(`❌ ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceiveShipment = async (transportId) => {
    setReceivingId(transportId);
    setReceiveMsg('');
    setReceiveErr('');
    try {
      const res = await fetch(`${API_URL}/transport/${transportId}/receive`, {
        method: 'POST',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to receive shipment');
      setReceiveMsg('✅ Shipment received! Inventory updated.');
      toast.success('📦 Shipment received and inventory credited!');
      fetchData();
    } catch (err) {
      setReceiveErr(err.message);
      toast.error(`❌ ${err.message}`);
    } finally {
      setReceivingId('');
    }
  };

  const handleDispatchShipment = async (transportId) => {
    setReceivingId(transportId);
    setReceiveMsg('');
    setReceiveErr('');
    try {
      const res = await fetch(`${API_URL}/transport/${transportId}/status`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ status: 'In Transit' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to dispatch shipment');
      setReceiveMsg('🚚 Shipment dispatched! Status updated to In Transit.');
      toast.success('🚚 Shipment dispatched successfully!');
      fetchData();
    } catch (err) {
      setReceiveErr(err.message);
      toast.error(`❌ ${err.message}`);
    } finally {
      setReceivingId('');
    }
  };

  const handleLoadCar = async (transportId, vr = null) => {
    setReceivingId(transportId || vr?._id);
    try {
      let targetTransportId = transportId;

      if (!targetTransportId && vr) {
        const createRes = await fetch(`${API_URL}/transport`, {
          method: 'POST',
          headers: getAuthHeader(),
          body: JSON.stringify({
            requestId: vr._id,
            district: vr.district || mongoUser?.district || 'Sylhet',
            origin: mongoUser?.assignedHub || mongoUser?.shelterName || 'Logistics Depot',
            destination: vr.villageName || 'Relief Location',
            itemsSummary: `${vr.quantity} ${vr.itemType}`,
            assignedHub: mongoUser?.assignedHub || mongoUser?.shelterName || 'Logistics Depot',
            transportType: 'Village',
            loadStatus: 'Loaded',
            status: 'Pending',
            addedBy: mongoUser?.name || 'Logistics Rep',
            addedByRole: mongoUser?.role || 'GovRepLogistics'
          })
        });
        if (createRes.ok) {
          const newT = await createRes.json();
          targetTransportId = newT._id;
        }
      }

      if (targetTransportId) {
        const res = await fetch(`${API_URL}/transport/${targetTransportId}/load`, {
          method: 'PUT',
          headers: getAuthHeader(),
          body: JSON.stringify({ loadStatus: 'Loaded', assignedHub: mongoUser?.assignedHub || mongoUser?.shelterName || 'Government Shelter' })
        });
        if (!res.ok) throw new Error('Failed to load vehicle');
      }
      toast.success('📦 Vehicle loaded successfully! Status updated to Loaded.');
      fetchData();
    } catch (e) { toast.error(`❌ ${e.message}`); }
    finally { setReceivingId(''); }
  };

  const handleDispatchVillageRequest = async (vr) => {
    setReceivingId(vr._id);
    setReceiveMsg('');
    setReceiveErr('');
    try {
      const response = await fetch(`${API_URL}/logistics/allocate`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          requestId: vr._id,
          warehouseName: mongoUser.assignedHub || mongoUser.shelterName || 'Government Shelter',
          allocatedItems: [
            { itemType: vr.itemType, quantity: vr.quantity }
          ],
          routeDistance: 45.0,
          routePath: [mongoUser.assignedHub || mongoUser.shelterName || 'Government Shelter', vr.villageName],
          dispatchedByText: `${mongoUser.name} (${mongoUser.assignedHub ? 'Logistics' : 'Shelter Rep'})`
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Dispatch allocation failed');
      }
      toast.success('🚚 Village Request dispatched successfully!');
      fetchData();
    } catch (e) {
      toast.error(`❌ ${e.message}`);
    } finally {
      setReceivingId('');
    }
  };

  // Incoming shipments whose destination is this shelter or hub only
  const myTransports = transports.filter(t => {
    const myPlace = (mongoUser?.assignedHub || mongoUser?.shelterName || '').trim();
    if (!myPlace) return false;

    const destMatch = facilityMatch(t.destination, myPlace)
      || facilityMatch(t.restockWarehouse, myPlace)
      || facilityMatch(t.assignedHub, myPlace);
    const uidMatch = t.representativeUid && t.representativeUid === mongoUser?.uid;
    return destMatch || uidMatch;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Banner Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Tent className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  {mongoUser?.assignedHub ? 'Government Logistics Hub' : 'Government Shelter Hub'}
                </h1>
                <p className="text-slate-400 text-sm">
                  {isGov && `Government Headquarters: ${mongoUser?.name || 'Central Command'}`}
                  {isGovRep && (mongoUser?.assignedHub ? `Assigned Logistics Hub: ${mongoUser?.assignedHub} (${mongoUser?.district})` : `Assigned Shelter: ${mongoUser?.shelterName} (${mongoUser?.district})`)}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {/* Feedback Alerts */}
        {message && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Role Tabs */}
        {isGov && (
          <div className="flex border-b border-slate-800 gap-6">
            <button
              onClick={() => setActiveTab('shelters')}
              className={`pb-4 font-semibold text-sm transition flex items-center gap-2 border-b-2 ${
                activeTab === 'shelters' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tent className="w-4 h-4" /> Active Shelters ({shelters.length})
            </button>
            <button
              onClick={() => setActiveTab('invites')}
              className={`pb-4 font-semibold text-sm transition flex items-center gap-2 border-b-2 ${
                activeTab === 'invites' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-4 h-4" /> Field Rep Invites ({invites.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`pb-4 font-semibold text-sm transition flex items-center gap-2 border-b-2 ${
                activeTab === 'requests' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Send className="w-4 h-4" /> Shelter Requests ({requests.length})
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-4 font-semibold text-sm transition flex items-center gap-2 border-b-2 ${
                activeTab === 'overview' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" /> Intel Overview
            </button>
          </div>
        )}

        {/* Government VIEW - TAB 1: CAMPAIGNS */}
        {(isGov && activeTab === 'shelters') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create Shelter / Logistics Hub Form Container */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5">
              {/* Option Selector: Relief Shelter vs Logistics Hub */}
              <div className="flex bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 gap-1.5">
                <button
                  type="button"
                  onClick={() => setCreationMode('campaign')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    creationMode === 'campaign'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Tent className="w-4 h-4" /> Relief Shelter
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode('hub')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    creationMode === 'hub'
                      ? 'bg-sky-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Warehouse className="w-4 h-4" /> Logistics Hub
                </button>
              </div>

              {/* FORM 1: RELIEF CAMPAIGN */}
              {creationMode === 'campaign' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-base border-b border-slate-900 pb-2">
                    <PlusCircle className="w-4 h-4" /> Launch New Relief Shelter
                  </div>
                  <form onSubmit={handleCreateShelter} className="space-y-4">
                    {/* Shelter Name */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Shelter Name</label>
                      <input 
                        type="text"
                        value={shelterName}
                        onChange={(e) => setShelterName(e.target.value)}
                        placeholder="e.g. Sylhet Haor Relief Camp"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* District */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">District</label>
                      <select 
                        value={shelterDistrict}
                        onChange={(e) => setShelterDistrict(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        {districtsOfBD.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    {/* Coordinates + Map Picker */}
                    <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-medium text-slate-400 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Shelter Coordinates
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleGetCurrentLocation}
                            disabled={detectingLoc}
                            className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/30 transition cursor-pointer"
                          >
                            <Crosshair className={`w-3 h-3 ${detectingLoc ? 'animate-spin' : ''}`} />
                            {detectingLoc ? 'Detecting...' : 'My Location'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowShelterMap(v => !v)}
                            className="text-[11px] font-medium text-sky-400 hover:text-sky-300 flex items-center gap-1 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-1 rounded-lg border border-sky-500/30 transition cursor-pointer"
                          >
                            <Map className="w-3 h-3" />
                            {showShelterMap ? 'Hide Map' : 'Pick on Map'}
                          </button>
                        </div>
                      </div>

                      {/* Lat/Lon inputs */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Latitude</label>
                          <input 
                            type="text"
                            value={shelterLat}
                            onChange={(e) => setShelterLat(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Longitude</label>
                          <input 
                            type="text"
                            value={shelterLon}
                            onChange={(e) => setShelterLon(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Leaflet Map Container */}
                      <div
                        id="camp-map-container"
                        style={{ height: showShelterMap ? '260px' : '0px', display: showShelterMap ? 'block' : 'none' }}
                        className="w-full rounded-xl border border-sky-500/30 relative"
                      ></div>
                      {showShelterMap && (
                        <p className="text-[10px] text-slate-500 text-center italic">Click or drag marker on map to set shelter location</p>
                      )}
                    </div>

                    {/* Capacity + Phone */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Capacity</label>
                        <input 
                          type="number"
                          value={shelterCapacity}
                          onChange={(e) => setShelterCapacity(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Contact Phone</label>
                        <input 
                          type="text"
                          value={shelterPhone}
                          onChange={(e) => setShelterPhone(e.target.value)}
                          placeholder="+88017..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Inventory Stock Section */}
                    <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-emerald-500/20">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <Boxes className="w-3.5 h-3.5" /> Initial Shelter Stock
                        </label>
                        <button
                          type="button"
                          onClick={addInventoryRow}
                          className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/30 transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Item
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500">Appears in Live Stock and Inventory Stock Tracker.</p>
                      <div className="space-y-2">
                        {shelterInventoryItems.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <select
                              value={item.itemType}
                              onChange={(e) => updateInventoryRow(idx, 'itemType', e.target.value)}
                              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                            >
                              <option value="Food">🍲 Food (bags)</option>
                              <option value="Water">💧 Water (liters)</option>
                              <option value="Medicine">💊 Medicine (kits)</option>
                              <option value="Shelter Kits">⛺ Shelter Kits</option>
                            </select>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateInventoryRow(idx, 'quantity', e.target.value)}
                              placeholder="Qty"
                              className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                            {shelterInventoryItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeInventoryRow(idx)}
                                className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={actionLoading || addingStock}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 font-bold text-slate-950 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {actionLoading ? 'Creating Shelter...' : addingStock ? 'Adding Stock...' : (
                        <><Tent className="w-4 h-4" /> Launch Shelter</>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* FORM 2: LOGISTICS HUB */}
              {creationMode === 'hub' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-base border-b border-slate-900 pb-2">
                    <Warehouse className="w-4 h-4" /> Register Logistics Hub & Stock
                  </div>
                  <form onSubmit={handleCreateLogisticsHub} className="space-y-4">
                    {/* Hub Name */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Logistics Hub / Depot Name</label>
                      <input 
                        type="text"
                        value={hubName}
                        onChange={(e) => setHubName(e.target.value)}
                        placeholder="e.g. Sylhet Central Disaster Depot"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    {/* District */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">District</label>
                      <select 
                        value={hubDistrict}
                        onChange={(e) => setHubDistrict(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                      >
                        {districtsOfBD.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    {/* Hub Coordinates + Map Picker */}
                    <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-medium text-slate-400 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-sky-400" /> Hub Location & Coordinates
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleGetHubCurrentLocation}
                            disabled={detectingLoc}
                            className="text-[11px] font-medium text-sky-400 hover:text-sky-300 flex items-center gap-1 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-1 rounded-lg border border-sky-500/30 transition cursor-pointer"
                          >
                            <Crosshair className={`w-3 h-3 ${detectingLoc ? 'animate-spin' : ''}`} />
                            {detectingLoc ? 'Detecting...' : 'My Location'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowHubMap(v => !v)}
                            className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/30 transition cursor-pointer"
                          >
                            <Map className="w-3 h-3" />
                            {showHubMap ? 'Hide Map' : 'Pick on Map'}
                          </button>
                        </div>
                      </div>

                      {/* Lat/Lon inputs */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Latitude</label>
                          <input 
                            type="text"
                            value={hubLat}
                            onChange={(e) => setHubLat(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Longitude</label>
                          <input 
                            type="text"
                            value={hubLon}
                            onChange={(e) => setHubLon(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      {/* Leaflet Map Container for Hub */}
                      <div
                        id="hub-map-container"
                        style={{ height: showHubMap ? '260px' : '0px', display: showHubMap ? 'block' : 'none' }}
                        className="w-full rounded-xl border border-sky-500/30 relative"
                      ></div>
                      {showHubMap && (
                        <p className="text-[10px] text-slate-500 text-center italic">Click or drag marker to pinpoint logistics hub location</p>
                      )}
                    </div>

                    {/* Storage Capacity + Phone */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Storage Capacity</label>
                        <input 
                          type="number"
                          value={hubCapacity}
                          onChange={(e) => setHubCapacity(e.target.value)}
                          placeholder="e.g. 5000"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Hub Manager Phone</label>
                        <input 
                          type="text"
                          value={hubPhone}
                          onChange={(e) => setHubPhone(e.target.value)}
                          placeholder="+88017..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    {/* Logistics Hub Stock Section */}
                    <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-sky-500/20">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                          <Boxes className="w-3.5 h-3.5" /> Initial Hub Stock Inventory
                        </label>
                        <button
                          type="button"
                          onClick={addHubInventoryRow}
                          className="text-[11px] font-medium text-sky-400 hover:text-sky-300 flex items-center gap-1 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-1 rounded-lg border border-sky-500/30 transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Item
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500">Registers directly into the Inventory Stock Tracker.</p>
                      <div className="space-y-2">
                        {hubInventoryItems.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <select
                              value={item.itemType}
                              onChange={(e) => updateHubInventoryRow(idx, 'itemType', e.target.value)}
                              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                            >
                              <option value="Food">🍲 Food (bags)</option>
                              <option value="Water">💧 Water (liters)</option>
                              <option value="Medicine">💊 Medicine (kits)</option>
                              <option value="Shelter Kits">⛺ Shelter Kits</option>
                            </select>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateHubInventoryRow(idx, 'quantity', e.target.value)}
                              placeholder="Qty"
                              className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                            />
                            {hubInventoryItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeHubInventoryRow(idx)}
                                className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={actionLoading || addingStock}
                      className="w-full py-3 bg-sky-500 hover:bg-sky-600 font-bold text-slate-950 rounded-xl text-sm transition shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {actionLoading ? 'Registering Hub...' : addingStock ? 'Saving Stock...' : (
                        <><Warehouse className="w-4 h-4" /> Register Hub & Add Stock</>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Shelter & Hub Cards */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Tent className="w-5 h-5 text-emerald-400" /> Active Government Relief Shelters & Logistics Hubs
              </h2>
              {shelters.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
                  No active shelters or logistics hubs found. Use the form to launch one.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shelters.map(c => {
                    const isHubCard = c.name.includes('[Hub]') || c.name.includes('(Hub)');
                    const stock = getLiveStockForCard(c);
                    return (
                      <div key={c._id || c.shelterId} className={`bg-slate-950 border rounded-2xl p-5 space-y-3 ${isHubCard ? 'border-sky-500/30' : 'border-slate-800'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                              {isHubCard ? <Warehouse className="w-4 h-4 text-sky-400" /> : <Tent className="w-4 h-4 text-emerald-400" />}
                              {c.name}
                            </h3>
                            <p className={`text-xs flex items-center gap-1 mt-0.5 ${isHubCard ? 'text-sky-400' : 'text-emerald-400'}`}>
                              <MapPin className="w-3.5 h-3.5" /> {c.district} ({c.lat}, {c.lon})
                            </p>
                          </div>
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${isHubCard ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                            {c.status || 'Active'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900 text-xs text-slate-300">
                          <div><span className="text-slate-500">ID:</span> {c.shelterId}</div>
                          <div><span className="text-slate-500">Capacity:</span> {c.occupancy || 0} / {c.capacity}</div>
                        </div>
                        <div className="pt-2 border-t border-slate-900">
                          <p className="text-xs text-slate-500 mb-1">Live Stock:</p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-0.5 bg-slate-900 text-slate-300 rounded font-mono">🍲 Food: {stock.food}</span>
                            <span className="px-2 py-0.5 bg-slate-900 text-slate-300 rounded font-mono">💧 Water: {stock.water}</span>
                            <span className="px-2 py-0.5 bg-slate-900 text-slate-300 rounded font-mono">💊 Med: {stock.med}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Government VIEW - TAB 2: INVITES */}
        {(isGov && activeTab === 'invites') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-4">
              {/* Toggle: Shelter Rep vs Logistics Hub Rep */}
              <div className="flex gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                <button
                  onClick={() => setCreationMode('campaign')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                    creationMode === 'campaign'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-900/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <KeyRound className="w-4 h-4" /> Shelter Rep
                </button>
                <button
                  onClick={() => setCreationMode('hub')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                    creationMode === 'hub'
                      ? 'bg-blue-500 text-white shadow-md shadow-blue-900/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Warehouse className="w-4 h-4" /> Logistics Hub
                </button>
              </div>

              {/* Shelter Rep Form */}
              {creationMode === 'campaign' && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
                    <KeyRound className="w-5 h-5" /> Generate Representative Token
                  </div>
                  <form onSubmit={handleCreateInvite} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Representative Name</label>
                      <input
                        type="text"
                        value={repName}
                        onChange={(e) => setRepName(e.target.value)}
                        placeholder="e.g. Kazi Government Field Rep"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-emerald-400" />
                        Representative Email Address
                      </label>
                      <input
                        type="email"
                        value={repEmail}
                        onChange={(e) => setRepEmail(e.target.value)}
                        placeholder="field.rep@government.org"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 placeholder-slate-600"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Directly sends invite token and registration link via Email</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Assign to Shelter</label>
                      <select
                        value={selectedShelterId}
                        onChange={(e) => setSelectedShelterId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Select Shelter --</option>
                        {shelters.filter(c => !c.name.includes('[Hub]')).map(c => <option key={c._id || c.shelterId} value={String(c._id || c.shelterId)}>{c.name} ({c.district})</option>)}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 font-bold text-slate-950 rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4" />
                      {actionLoading ? 'Generating...' : 'Generate Invite Code'}
                    </button>
                  </form>

                  {lastGeneratedInvite && (
                    <div className="bg-gradient-to-br from-emerald-950/60 to-slate-950 border border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-lg shadow-emerald-900/20 animate-fade-in">
                      <div className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-emerald-400" />
                        <span className="font-bold text-emerald-400 text-sm">Generated Token</span>
                      </div>
                      <div className="font-mono text-emerald-400 font-bold text-lg tracking-widest">{lastGeneratedInvite.inviteId}</div>
                      <div className="text-xs text-slate-400">
                        <span className="text-slate-300">{lastGeneratedInvite.name}</span> → {lastGeneratedInvite.shelterName}
                      </div>
                      {lastGeneratedInvite.email && (
                        <button
                          onClick={handleSendInviteEmail}
                          disabled={emailSending || emailStatus === 'sent'}
                          className={`flex items-center justify-center gap-2 w-full py-2.5 font-bold rounded-xl text-sm transition shadow-lg cursor-pointer ${
                            emailStatus === 'sent'
                              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 cursor-default'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                          }`}
                        >
                          {emailSending ? 'Sending...' : emailStatus === 'sent' ? (
                            <><CheckCircle className="w-4 h-4 text-emerald-400" /> Invite Email Sent!</>
                          ) : (
                            <><Mail className="w-4 h-4" /> 📧 Send Invite via Email</>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Logistics Hub Rep Form */}
              {creationMode === 'hub' && (
                <div className="bg-slate-950 border border-blue-500/30 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-lg">
                    <Warehouse className="w-5 h-5" /> Generate Logistics Rep Token
                  </div>
                  {logRepMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold">{logRepMsg}</div>
                  )}
                  <form onSubmit={handleCreateLogisticsInvite} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Representative Name</label>
                      <input
                        type="text"
                        value={logRepName}
                        onChange={(e) => setLogRepName(e.target.value)}
                        placeholder="e.g. Zahid Logistics Rep"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-blue-400" /> Representative Email Address
                      </label>
                      <input
                        type="email"
                        value={logRepEmail}
                        onChange={(e) => setLogRepEmail(e.target.value)}
                        placeholder="logistics.rep@government.org"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 placeholder-slate-600"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Sends invite token via Email</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Assign to Logistics Center</label>
                      <select
                        value={selectedHub}
                        onChange={(e) => setSelectedHub(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">-- Select Logistics Center --</option>
                        {(() => {
                          const hubObj = {};
                          shelters.filter(c => c.name.includes('[Hub]')).forEach(hub => {
                            hubObj[hub.name] = `${hub.name} (${hub.district || 'Gov Depot'})`;
                          });
                          if (Array.isArray(inventory)) {
                            inventory.forEach(item => {
                              if (item.warehouseName && (item.warehouseName.startsWith('[GOV]') || item.warehouseName.includes('[Hub]'))) {
                                if (!hubObj[item.warehouseName]) {
                                  hubObj[item.warehouseName] = `${item.warehouseName} (${item.district || 'Gov Depot'})`;
                                }
                              }
                            });
                          }
                          return Object.entries(hubObj).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ));
                        })()}
                      </select>
                      <p className="text-[10px] text-slate-500 mt-1">Only your Government's logistics centers are shown</p>
                    </div>
                    <button
                      type="submit"
                      disabled={logRepLoading}
                      className="w-full py-3 bg-blue-500 hover:bg-blue-600 font-bold text-white rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Warehouse className="w-4 h-4" />
                      {logRepLoading ? 'Generating...' : 'Generate Logistics Invite'}
                    </button>
                  </form>

                  {lastGeneratedLogisticsInvite && (
                    <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-4 space-y-2">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Generated Token</div>
                      <div className="font-mono text-blue-400 font-bold text-lg tracking-widest">{lastGeneratedLogisticsInvite.inviteId}</div>
                      <div className="text-xs text-slate-400">
                        <span className="text-slate-300">{lastGeneratedLogisticsInvite.name}</span> → {lastGeneratedLogisticsInvite.assignedHub}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right panel: tokens table spanning 2 cols */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-bold text-white">Generated Field Officer Tokens</h2>
              {invites.length === 0 ? (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
                  No invite tokens generated yet.
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Invite Token</th>
                        <th className="p-3">Field Officer Name</th>
                        <th className="p-3">Email Address</th>
                        <th className="p-3">Shelter / Hub</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {invites.map(inv => (
                        <tr key={inv._id || inv.inviteId}>
                          <td className="p-3 font-mono text-emerald-400 font-bold">{inv.inviteId}</td>
                          <td className="p-3 text-white font-medium">{inv.name}</td>
                          <td className="p-3 text-slate-300 font-mono text-[11px]">
                            {inv.email ? (
                              <span className="text-emerald-300/90">{inv.email}</span>
                            ) : (
                              <span className="text-slate-600 font-sans italic">Not specified</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-300">
                            {inv.assignedHub ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">HUB</span>
                                {inv.assignedHub}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">CAMP</span>
                                {inv.shelterName} ({inv.district})
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              inv.status === 'Registered' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleResendInvite(inv)}
                              disabled={resendingId === (inv._id || inv.inviteId)}
                              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 rounded-lg transition text-[11px] font-medium inline-flex items-center gap-1.5 active:scale-95 cursor-pointer"
                            >
                              <RotateCw className={`w-3 h-3 ${resendingId === (inv._id || inv.inviteId) ? 'animate-spin' : ''}`} />
                              {resendingId === (inv._id || inv.inviteId) ? 'Sending...' : 'Resend Email'}
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
        )}

        {/* Government VIEW - TAB 3: REQUESTS */}
        {(isGov && activeTab === 'requests') && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Incoming Shelter Resource Requests</h2>
            {requests.length === 0 ? (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-sm">
                No campaign requests submitted yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.map(r => (
                  <div key={r._id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white text-sm">{r.shelterName || r.assignedHub || r.warehouseName || (r.details && r.details.includes('by ') ? r.details.split('by ')[1] : 'Government Facility')}</h3>
                        <p className="text-xs text-slate-400">Rep: {r.representativeName || r.submittedByName || r.contactPerson || 'Gov Representative'}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        r.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                        r.status === 'Funded' ? 'bg-sky-500/10 text-sky-400' :
                        r.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-slate-500 font-semibold">Needed:</span> {r.itemType ? `${r.itemType}: ${r.quantity}` : (r.itemsNeeded || 'Resource Request')}
                    </p>
                    {r.status === 'Pending' && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleRespondRequest(r._id, 'Approved')}
                          className="flex-1 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-bold rounded-lg border border-emerald-500/30 transition"
                        >
                          Approve Request
                        </button>
                        <button
                          onClick={() => handleRespondRequest(r._id, 'Rejected')}
                          className="py-1.5 px-3 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-xs font-bold rounded-lg border border-rose-500/30 transition"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Government REPRESENTATIVE VIEW */}
        {isGovRep && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
                <Send className="w-5 h-5" /> Request Supplies / Funding
              </div>
              <form onSubmit={handleSubmitRepRequest} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Item Category</label>
                    <select
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Food">Food</option>
                      <option value="Water">Water</option>
                      <option value="Medicine">Medicine</option>
                      <option value="Shelter Kits">Shelter Kits</option>
                      <option value="Clothing">Clothing</option>
                      <option value="Rescue Boat">Rescue Boat</option>
                      <option value="Funds">Funds</option>
                      <option value="Other">Other (Specify)</option>
                    </select>
                  </div>
                  {itemCategory === 'Other' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Specify Item</label>
                      <input
                        type="text"
                        value={otherItemCategory}
                        onChange={(e) => setOtherItemCategory(e.target.value)}
                        placeholder="e.g. Blankets"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={requestQuantity}
                      onChange={(e) => setRequestQuantity(e.target.value)}
                      placeholder={itemCategory === 'Funds' ? 'e.g. 50000 (BDT)' : 'e.g. 200'}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Urgency Level</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 font-bold text-slate-950 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Request to Government'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-emerald-400" /> {mongoUser?.assignedHub ? 'Logistics Hub Live Stock' : 'Shelter Live Stock'}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-400">Dry Food</p>
                    <p className="text-lg font-bold text-emerald-400">{getMyLiveStock().dryFood || 0} bags</p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-400">Water</p>
                    <p className="text-lg font-bold text-sky-400">{getMyLiveStock().waterBottles || 0} L</p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-400">Medicine</p>
                    <p className="text-lg font-bold text-rose-400">{getMyLiveStock().medicalKits || 0} kits</p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-400">Shelter Kits</p>
                    <p className="text-lg font-bold text-amber-400">{getMyLiveStock().shelterKits || 0} packs</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-white">My Submitted Requests</h2>
                {requests.length === 0 ? (
                  <p className="text-slate-400 text-xs">No requests submitted yet.</p>
                ) : (
                  <div className="space-y-3">
                    {requests.map(r => (
                      <div key={r._id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                        <div>
                          <p className="text-white font-semibold">{r.itemType ? `${r.itemType}: ${r.quantity}` : (r.itemsNeeded || 'Resource Request')}</p>
                          <p className="text-slate-500">Urgency: {r.urgency}</p>
                        </div>
                        <span className={`px-2.5 py-1 font-bold rounded ${
                          r.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                          r.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Village Relief Requests Feed (For Gov Logistics Representatives only) */}
              {(mongoUser?.role === 'GovRepLogistics' || (mongoUser?.role === 'GovRepresentative' && !!mongoUser?.assignedHub)) && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Send className="w-5 h-5 text-sky-400" /> Pending Village Relief Requests
                  </h2>
                  {(() => {
                    const pendingUnloadedRequests = villageRequests.filter(vr => {
                      if (vr.submittedByUid && vr.submittedByUid === mongoUser?.uid) return false;
                      if (vr.contactPerson && mongoUser?.name && vr.contactPerson === mongoUser.name) return false;
                      const matchingTransport = transports.find(t => String(t.requestId) === String(vr._id) || (t.destination === vr.villageName && t.itemsSummary?.includes(vr.itemType)));
                      if (matchingTransport && (matchingTransport.loadStatus === 'Loaded' || matchingTransport.status === 'In Transit' || matchingTransport.status === 'Delivered')) {
                        return false;
                      }
                      return true;
                    });

                    if (pendingUnloadedRequests.length === 0) {
                      return <p className="text-slate-400 text-xs">No pending village requests in your district requiring loading.</p>;
                    }

                    return (
                      <div className="space-y-3">
                        {pendingUnloadedRequests.map(vr => {
                          const matchingTransport = transports.find(t => String(t.requestId) === String(vr._id));
                          const tId = matchingTransport?._id;

                          return (
                            <div key={vr._id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                              <div className="space-y-1 w-full">
                                <p className="text-white font-semibold text-sm">
                                  {vr.villageName} <span className="text-slate-400 font-normal">({vr.district})</span>
                                </p>
                                <div className="flex items-center gap-3 text-xs text-slate-300">
                                  <span className="font-bold text-emerald-400">{vr.quantity} {vr.itemType}</span>
                                  <span>Pop: {vr.population}</span>
                                  <span className="text-amber-400 font-bold">Priority: {vr.priorityScore || 0}</span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleLoadCar(tId, vr)}
                                disabled={receivingId === tId || receivingId === vr._id}
                                className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl whitespace-nowrap transition shadow-lg shadow-amber-500/20 flex justify-center items-center gap-1.5 cursor-pointer"
                              >
                                <Package className="w-4 h-4" />
                                {receivingId === tId || receivingId === vr._id ? 'Loading...' : 'Load Car'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* ── Incoming Transports Panel ── */}
            <div className="lg:col-span-3">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-sky-400" />
                    {mongoUser?.assignedHub ? 'Incoming Restock Shipments' : 'Incoming Relief Transports'}
                  </h2>
                  <button onClick={fetchData} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-300 flex items-center gap-1.5 transition cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>

                {receiveMsg && <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">{receiveMsg}</div>}
                {receiveErr && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">{receiveErr}</div>}

                {myTransports.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-sm">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No incoming transports assigned to {mongoUser?.assignedHub || mongoUser?.shelterName || 'you'}.
                  </div>
                ) : (
                  <div className="space-y-3">
                      {myTransports.map(t => {
                        const myPlace = (mongoUser?.assignedHub || mongoUser?.shelterName || '').trim();
                        const destMatch = facilityMatch(t.destination, myPlace)
                          || facilityMatch(t.restockWarehouse, myPlace)
                          || facilityMatch(t.assignedHub, myPlace);
                        const originMatch = facilityMatch(t.origin, myPlace) || facilityMatch(t.assignedHub, myPlace);
                        const canReceive = t.status === 'In Transit' && destMatch && (!originMatch || t.transportType === 'Restock');
                        const isDelivered = t.status === 'Delivered';
                        const statusColor = t.status === 'Delivered'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : t.status === 'In Transit'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                            : t.status === 'Pending'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-slate-700 text-slate-400 border-slate-600';

                        return (
                          <div key={t._id} className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col sm:flex-row justify-between gap-3">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColor}`}>
                                  {t.status}
                                </span>
                                {t.loadStatus && (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    t.loadStatus === 'Loaded' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                                  }`}>
                                    {t.loadStatus === 'Loaded' ? '📦 Loaded' : '⏳ Not Loaded'}
                                  </span>
                                )}
                                {t.transportType === 'Restock' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">Restock</span>
                                )}
                              </div>
                              <p className="text-white text-sm font-bold">{t.itemsSummary || 'Relief Supplies'}</p>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                                <span>From: <span className="text-slate-300 font-semibold">{t.origin || t.assignedHub || '—'}</span></span>
                                <span>→</span>
                                <span>To: <span className="text-slate-300 font-semibold">{t.destination || '—'}</span></span>
                              </div>
                              {t.assignedVolunteers?.length > 0 && (
                                <p className="text-[10px] text-slate-500">Driver: {t.assignedVolunteers[0]?.volunteerName}</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end justify-center gap-2 flex-shrink-0">
                              {isDelivered ? (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Received
                                </span>
                              ) : canReceive ? (
                                <button
                                  onClick={() => handleReceiveShipment(t._id)}
                                  disabled={receivingId === t._id}
                                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/40 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                                >
                                  {receivingId === t._id ? (
                                    <div className="w-3.5 h-3.5 border-2 border-t-white border-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Package className="w-3.5 h-3.5" />
                                  )}
                                  {receivingId === t._id ? 'Receiving...' : 'Receive Shipment'}
                                </button>
                              ) : t.status === 'In Transit' ? (
                                <Link
                                  to="/transport"
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-[11px] font-bold border border-sky-500/30 transition-all"
                                >
                                  🚚 In Transit · View in Transport Tracker →
                                </Link>
                              ) : t.status === 'Pending' && t.loadStatus === 'Loaded' ? (
                                <button
                                  onClick={() => handleDispatchShipment(t._id)}
                                  disabled={receivingId === t._id}
                                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                                >
                                  {receivingId === t._id ? (
                                    <div className="w-3.5 h-3.5 border-2 border-t-white border-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Send className="w-3.5 h-3.5" />
                                  )}
                                  {receivingId === t._id ? 'Dispatching...' : 'Dispatch Shipment'}
                                </button>
                              ) : (
                                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-[11px] font-bold border border-slate-700">
                                  <Clock className="w-3.5 h-3.5" /> Waiting for Load
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                )}
              </div>
            </div>
          </div>
        )}


        {/* GOVERNMENT VIEW - READ-ONLY OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" /> Aggregate Government Shelter Intel (Read-Only)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <p className="text-xs text-slate-400">Total Active Shelters</p>
                  <p className="text-2xl font-extrabold text-emerald-400">{shelters.length}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <p className="text-xs text-slate-400">Total Shelter Occupancy</p>
                  <p className="text-2xl font-extrabold text-sky-400">
                    {shelters.reduce((acc, c) => acc + (c.occupancy || 0), 0)} persons
                  </p>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <p className="text-xs text-slate-400">Districts Covered</p>
                  <p className="text-2xl font-extrabold text-purple-400">
                    {new Set(shelters.map(c => c.district)).size} districts
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shelters.map(c => (
                <div key={c.shelterId} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2 text-xs shadow-lg">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-white text-sm">{c.name}</h3>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded">{c.createdBy}</span>
                  </div>
                  <p className="text-slate-400">District: {c.district} | Capacity: {c.occupancy}/{c.capacity}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
