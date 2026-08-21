import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Layers, 
  Search, 
  Compass, 
  MapPin, 
  Activity, 
  UploadCloud, 
  ShieldCheck, 
  Droplet, 
  AlertTriangle, 
  Home, 
  Navigation,
  FileImage,
  RefreshCw,
  Eye,
  Info
} from 'lucide-react';

// Districts database mapping coordinates
const districtsInfo = [
  { name: 'Sunamganj', lat: 25.0664, lng: 91.3992, elevation: 12 },
  { name: 'Sylhet', lat: 24.8949, lng: 91.8687, elevation: 15 },
  { name: 'Kurigram', lat: 25.8054, lng: 89.6361, elevation: 28 },
  { name: 'Gaibandha', lat: 25.3288, lng: 89.5401, elevation: 24 },
  { name: 'Netrokona', lat: 24.8856, lng: 90.7308, elevation: 18 },
  { name: 'Sirajganj', lat: 24.4534, lng: 89.7008, elevation: 16 },
  { name: 'Jamalpur', lat: 24.9375, lng: 89.9377, elevation: 20 },
  { name: 'Bogura', lat: 24.8481, lng: 89.3730, elevation: 22 },
  { name: 'Dhaka', lat: 23.8103, lng: 90.4125, elevation: 8 },
  { name: 'Chittagong', lat: 22.3569, lng: 91.7832, elevation: 10 }
];

export default function FloodMapPage() {
  const { token, language } = useAuth();
  const { theme } = useTheme();

  // Coordinates Search and Geolocation State
  const [searchDistrict, setSearchDistrict] = useState('');
  const [latInput, setLatInput] = useState('24.8949');
  const [lonInput, setLonInput] = useState('91.8687');
  const [gpsError, setGpsError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  // Layer States
  const [activeLayers, setActiveLayers] = useState({
    satellite: false,
    flood: true,
    shelter: true,
    incident: true
  });

  // Prediction API States
  const [predictionData, setPredictionData] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [predictError, setPredictError] = useState(null);

  // Image Upload and Segmentation States
  const [selectedModel, setSelectedModel] = useState('SegFormer');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [originalBase64, setOriginalBase64] = useState(null);
  const [segmentedImage, setSegmentedImage] = useState(null);
  const [segmenting, setSegmenting] = useState(false);
  const [segmentError, setSegmentError] = useState(null);
  const [segmentMetrics, setSegmentMetrics] = useState(null);

  // Map Data lists loaded from backend
  const [shelters, setShelters] = useState([]);
  const [incidents, setIncidents] = useState([]);

  // Leaflet references
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const routeGroupRef = useRef(null);
  const routeRequestIdRef = useRef(0);
  const shelterGroupRef = useRef(null);
  const incidentGroupRef = useRef(null);
  const floodGroupRef = useRef(null);
  const satelliteLayerRef = useRef(null);
  const darkLayerRef = useRef(null);
  const lightLayerRef = useRef(null);

  // Refs for canvas fallback segmentation
  const originalCanvasRef = useRef(null);
  const resultCanvasRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Translations dictionary
  const translations = {
    en: {
      pageTitle: 'GIS Flood Telemetry & AI Prediction Hub',
      pageSub: 'Interactive layers, live geolocation mapping, and deep learning segmentation models.',
      layerControl: 'GIS Layer Overlays',
      layerSat: 'Satellite Mode',
      layerFlood: 'Flood Extents',
      layerShelter: 'Cyclone Shelters',
      layerIncident: 'Emergency Reports',
      searchTitle: 'Geographic Locator Search',
      searchDist: 'Fly to District',
      searchDistSelect: 'Select District...',
      locateBtn: 'Locate Current GPS',
      locateSuccess: 'GPS Position synced.',
      locateFail: 'GPS Blocked/Unavailable. Input manually.',
      coordsForm: 'Manual Geographic Coordinates',
      coordsLat: 'Latitude (N)',
      coordsLon: 'Longitude (E)',
      legendTitle: 'Map Legend',
      legendYou: 'Your location',
      legendShelter: 'Cyclone shelter',
      legendIncidentCritical: 'Critical emergency report',
      legendIncidentHigh: 'High / severe report',
      legendIncidentModerate: 'Moderate report',
      legendFloodHigh: 'High flood extent',
      legendFloodMed: 'Moderate flood extent',
      legendRoute: 'Path to suggested shelter',
      predictBtn: 'Run AI Prediction',
      predicting: 'Processing telemetry matrices...',
      probLabel: 'Flood Probability',
      depthLabel: 'Predicted Flood Depth',
      riskLabel: 'Assessed Risk Severity',
      shelterLabel: 'Suggested Shelter',
      telemetryTitle: 'Live Telemetry Readings',
      telemetryElev: 'DEM Elevation',
      telemetryRain: 'Precip Forecast (72h)',
      telemetryRiver: 'Dist to River',
      uploadTitle: 'Sen1Floods11 Image Segmentation',
      uploadSub: 'Upload drone or satellite flood photo. Pretrained models (DeepLabV3, SegFormer) isolate surface water.',
      uploadPlaceholder: 'Drag & drop image, or click to browse',
      modelLabel: 'Segmentation Model',
      segmentBtn: 'Process Image',
      segmenting: 'Executing ConvNet inference...',
      metricsTitle: 'Inference Visual Metrics',
      metricsCoverage: 'Surface Water Coverage',
      metricsArea: 'Covered Area Est.',
      metricsSeverity: 'Flood Intensity',
      originalImg: 'Original Target Photo',
      segmentedImg: 'Segmented Water Overlays',
      fallbackNotice: 'Running local client-side segmentation pipeline (Python offline).',
      sourceInfo: 'ML models configured utilizing Sentinel-1/2 SAR, NASA DEM, and Sen1Floods11 datasets.'
    },
    bn: {
      pageTitle: 'জিআইএস বন্যা পরিমাপ ও এআই পূর্বাভাস হাব',
      pageSub: 'ইন্টারেক্টিভ লেয়ার, লাইভ জিপিএস ম্যাপিং এবং গভীর শিখন (Deep Learning) সেগমেন্টেশন মডেল।',
      layerControl: 'জিআইএস লেয়ার ওভারলে',
      layerSat: 'স্যাটেলাইট ভিউ',
      layerFlood: 'বন্যা উপদ্রুত এলাকা',
      layerShelter: 'আশ্রয়কেন্দ্রসমূহ',
      layerIncident: 'জরুরি ঘটনা রিপোর্ট',
      searchTitle: 'ভৌগোলিক অবস্থান অনুসন্ধান',
      searchDist: 'জেলায় নেভিগেট করুন',
      searchDistSelect: 'জেলা নির্বাচন করুন...',
      locateBtn: 'বর্তমান জিপিএস সনাক্তকরণ',
      locateSuccess: 'জিপিএস অবস্থান সফলভাবে সিঙ্ক হয়েছে।',
      locateFail: 'জিপিএস লক/অনুপস্থিত। ম্যানুয়ালি লিখুন।',
      coordsForm: 'ভৌগোলিক স্থানাঙ্ক লিখুন',
      coordsLat: 'অক্ষাংশ (Lat)',
      coordsLon: 'দ্রাঘিমাংশ (Lon)',
      legendTitle: 'মানচিত্র নির্দেশিকা',
      legendYou: 'আপনার অবস্থান',
      legendShelter: 'আশ্রয়কেন্দ্র',
      legendIncidentCritical: 'জরুরি রিপোর্ট (সংকটজনক)',
      legendIncidentHigh: 'জরুরি রিপোর্ট (উচ্চ)',
      legendIncidentModerate: 'জরুরি রিপোর্ট (মাঝারি)',
      legendFloodHigh: 'উচ্চ বন্যা এলাকা',
      legendFloodMed: 'মাঝারি বন্যা এলাকা',
      legendRoute: 'প্রস্তাবিত আশ্রয়কেন্দ্রের পথ',
      predictBtn: 'এআই পূর্বাভাস শুরু করুন',
      predicting: 'টেলিমეტ্রি ম্যাট্রিক্স প্রসেসিং হচ্ছে...',
      probLabel: 'বন্যা সম্ভাবনা',
      depthLabel: 'প্রাক্কলিত বন্যার গভীরতা',
      riskLabel: 'ঝুঁকি তীব্রতা নির্ধারণ',
      shelterLabel: 'প্রস্তাবিত আশ্রয়কেন্দ্র',
      telemetryTitle: 'লাইভ টেলিমেনট্রি রিডিংস',
      telemetryElev: 'ডিইএম উচ্চতা',
      telemetryRain: '৭২ ঘণ্টার বৃষ্টিপাতের পূর্বাভাস',
      telemetryRiver: 'নদী থেকে দূরত্ব',
      uploadTitle: 'Sen1Floods11 ইমেজ সেগমেন্টেশন',
      uploadSub: 'ড্রোন বা স্যাটেলাইটের বন্যার ছবি আপলোড করুন। ডিপ লার্নিং মডেল পানি আলাদা করবে।',
      uploadPlaceholder: 'ছবি ড্র্যাগ এন্ড ড্রপ করুন বা ব্রাউজ করুন',
      modelLabel: 'সেগমেন্টেশন মডেল',
      segmentBtn: 'ইমেজ প্রসেস করুন',
      segmenting: 'কনভোলিউশনাল নেটওয়ার্ক রান হচ্ছে...',
      metricsTitle: 'ভিজ্যুয়াল মেট্রিক্স রিপোর্ট',
      metricsCoverage: 'পানির কভারেজ শতকরা',
      metricsArea: 'প্রাক্কলিত প্লাবিত এলাকা',
      metricsSeverity: 'বন্যা তীব্রতা সূচক',
      originalImg: 'মূল টার্গেট ছবি',
      segmentedImg: 'চিহ্নিত পানির ওভারলে',
      fallbackNotice: 'স্থানীয় ক্লায়েন্ট-সাইড সেগমেন্টেশন রান হচ্ছে (পাইথন অফলাইন)।',
      sourceInfo: 'সেন্টিনেল-১/২ সার, নাসা ডিইএম এবং Sen1Floods11 ডেটাসেটের সাহায্যে তৈরি।'
    }
  };

  const t = translations[language];

  // Colors mapping for severity levels
  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical': return '#ef4444'; // Red
      case 'high':
      case 'severe': return '#f97316'; // Orange
      case 'moderate': return '#eab308'; // Yellow
      default: return '#10b981'; // Green
    }
  };

  // Fetch geographic overlays from backend
  const fetchOverlays = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [sheltersRes, incidentsRes] = await Promise.all([
        fetch(`${API_URL}/flood-map/shelters`, { headers }),
        fetch(`${API_URL}/flood-map/incidents`, { headers })
      ]);

      if (sheltersRes.ok && incidentsRes.ok) {
        const sheltersData = await sheltersRes.json();
        const incidentsData = await incidentsRes.json();
        setShelters(sheltersData);
        setIncidents(incidentsData);
      }
    } catch (e) {
      console.error('Failed to sync map overlay layers:', e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOverlays();
    }
  }, [token]);

  // Handle GPS location fetch
  const handleGPSLocation = () => {
    setIsLocating(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError(t.locateFail);
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lon = position.coords.longitude.toFixed(6);
        setLatInput(lat);
        setLonInput(lon);
        setIsLocating(false);
        setGpsError(null);

        // Fly map and predict
        if (mapInstanceRef.current && window.L) {
          mapInstanceRef.current.flyTo([lat, lon], 12);
          updateUserMarker(lat, lon);
        }
        triggerPrediction(lat, lon);
      },
      (error) => {
        console.warn('Geolocation access failed:', error);
        setGpsError(t.locateFail);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // Update user marker on coordinates change
  const ensureGisMarkerStyles = () => {
    if (document.getElementById('flood-gis-marker-styles')) return;
    const style = document.createElement('style');
    style.id = 'flood-gis-marker-styles';
    style.textContent = `
      .flood-user-location-marker,
      .shelter-marker-icon,
      .incident-marker-icon {
        background: transparent !important;
        border: none !important;
      }
      @keyframes flood-user-ping {
        0% { transform: scale(0.55); opacity: 0.75; }
        100% { transform: scale(1.85); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  };

  const makeUserLocationIcon = () => {
    const youLabel = language === 'bn' ? 'আপনি' : 'YOU';
    return window.L.divIcon({
      className: 'flood-user-location-marker',
      html: `
        <div style="position:relative;width:52px;height:58px;pointer-events:none;">
          <span style="position:absolute;left:12px;top:12px;width:28px;height:28px;border-radius:9999px;background:#22d3ee;animation:flood-user-ping 1.5s ease-out infinite;"></span>
          <div style="position:absolute;left:12px;top:12px;width:28px;height:28px;border-radius:9999px;background:linear-gradient(135deg,#2563eb,#06b6d4);border:2px solid #ffffff;box-shadow:0 2px 10px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
          </div>
          <div style="position:absolute;left:50%;top:42px;transform:translateX(-50%);background:#0ea5e9;color:#fff;font:700 9px/1.2 sans-serif;letter-spacing:.04em;padding:2px 6px;border-radius:9999px;border:1px solid #fff;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.4);">
            ${youLabel}
          </div>
        </div>
      `,
      iconSize: [52, 58],
      iconAnchor: [26, 26],
      popupAnchor: [0, -22]
    });
  };

  const updateUserMarker = (lat, lon) => {
    if (!mapInstanceRef.current || !window.L) return;
    const l = parseFloat(lat);
    const n = parseFloat(lon);
    if (!Number.isFinite(l) || !Number.isFinite(n)) return;

    ensureGisMarkerStyles();
    const icon = makeUserLocationIcon();
    const popupHtml = `
      <div class="font-sans text-slate-800" style="min-width:140px;">
        <strong>${language === 'bn' ? 'আপনার অবস্থান' : 'Your location'}</strong><br/>
        <span style="font-size:11px;">${l.toFixed(4)}, ${n.toFixed(4)}</span>
      </div>
    `;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([l, n]);
      userMarkerRef.current.setIcon(icon);
      userMarkerRef.current.setPopupContent(popupHtml);
    } else {
      userMarkerRef.current = window.L.marker([l, n], {
        icon,
        zIndexOffset: 2000
      }).addTo(mapInstanceRef.current);
      userMarkerRef.current.bindPopup(popupHtml);
    }
  };

  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const resolveSuggestedShelter = (lat, lon) => {
    const apiLat = parseFloat(predictionData?.suggestedShelterLat);
    const apiLng = parseFloat(predictionData?.suggestedShelterLng);
    if (Number.isFinite(apiLat) && Number.isFinite(apiLng)) {
      const named = predictionData.suggestedShelterName
        || predictionData.suggestedShelter?.split(' (Distance:')[0]?.trim()
        || 'Suggested shelter';
      return { name: named, lat: apiLat, lng: apiLng };
    }

    if (!Array.isArray(shelters) || shelters.length === 0) return null;

    const label = String(predictionData?.suggestedShelter || '');
    const matched = shelters.find((s) => s?.name && label.includes(s.name));
    if (matched && Number.isFinite(Number(matched.lat)) && Number.isFinite(Number(matched.lng ?? matched.lon))) {
      return { name: matched.name, lat: Number(matched.lat), lng: Number(matched.lng ?? matched.lon) };
    }

    let nearest = null;
    let minDist = Infinity;
    shelters.forEach((s) => {
      const sLat = Number(s.lat);
      const sLng = Number(s.lng ?? s.lon);
      if (!Number.isFinite(sLat) || !Number.isFinite(sLng)) return;
      const dist = haversineKm(lat, lon, sLat, sLng);
      if (dist < minDist) {
        minDist = dist;
        nearest = { name: s.name, lat: sLat, lng: sLng };
      }
    });
    return nearest;
  };

  const paintShelterPath = (latlngs, shelter, distanceKm, isRoad) => {
    const group = routeGroupRef.current;
    const map = mapInstanceRef.current;
    if (!group || !map || !window.L || !latlngs?.length) return;

    group.clearLayers();

    const glow = window.L.polyline(latlngs, {
      color: '#082f49',
      weight: 10,
      opacity: 0.45,
      lineJoin: 'round',
      lineCap: 'round'
    });
    const line = window.L.polyline(latlngs, {
      color: '#22d3ee',
      weight: 5,
      opacity: 0.95,
      dashArray: isRoad ? null : '10 8',
      lineJoin: 'round',
      lineCap: 'round'
    });

    const destIcon = window.L.divIcon({
      className: 'flood-user-location-marker',
      html: `
        <div style="width:18px;height:18px;border-radius:9999px;background:#10b981;border:3px solid #fff;box-shadow:0 0 0 6px rgba(16,185,129,.35);"></div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    const dest = window.L.marker([shelter.lat, shelter.lng], { icon: destIcon, zIndexOffset: 1500 });

    const distLabel = Number.isFinite(distanceKm) ? `${distanceKm.toFixed(2)} km` : '';
    const popup = `
      <div class="font-sans text-slate-800" style="min-width:170px;">
        <strong>${language === 'bn' ? 'আশ্রয়কেন্দ্রের পথ' : 'Path to shelter'}</strong><br/>
        <span style="font-size:11px;">${shelter.name}</span><br/>
        <span style="font-size:11px;">${distLabel}${isRoad ? (language === 'bn' ? ' · সড়ক পথ' : ' · road route') : (language === 'bn' ? ' · সরলরেখা' : ' · direct line')}</span>
      </div>
    `;
    line.bindPopup(popup);
    dest.bindPopup(popup);

    group.addLayer(glow);
    group.addLayer(line);
    group.addLayer(dest);

    try {
      map.fitBounds(line.getBounds().pad(0.28), { maxZoom: 14, animate: true });
    } catch {
      // Bounds can fail on a single point
    }
  };

  const drawPathToShelter = async (lat, lon) => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;

    const fromLat = parseFloat(lat);
    const fromLon = parseFloat(lon);
    if (!Number.isFinite(fromLat) || !Number.isFinite(fromLon)) return;

    if (!routeGroupRef.current) {
      routeGroupRef.current = window.L.layerGroup().addTo(map);
    }

    const shelter = resolveSuggestedShelter(fromLat, fromLon);
    if (!shelter) {
      routeGroupRef.current.clearLayers();
      return;
    }

    const requestId = ++routeRequestIdRef.current;
    const fallbackKm = haversineKm(fromLat, fromLon, shelter.lat, shelter.lng);
    const straight = [[fromLat, fromLon], [shelter.lat, shelter.lng]];

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${shelter.lng},${shelter.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (requestId !== routeRequestIdRef.current) return;
      if (data?.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates?.length) {
        const latlngs = data.routes[0].geometry.coordinates.map(([lng, lt]) => [lt, lng]);
        const roadKm = (data.routes[0].distance || 0) / 1000;
        paintShelterPath(latlngs, shelter, roadKm || fallbackKm, true);
        return;
      }
    } catch {
      // Public routing can be blocked; fall back to a visible direct path.
    }

    if (requestId !== routeRequestIdRef.current) return;
    paintShelterPath(straight, shelter, fallbackKm, false);
  };

  // Fly to selected District coordinates
  const handleDistrictChange = (e) => {
    const name = e.target.value;
    setSearchDistrict(name);
    if (!name) return;

    const dist = districtsInfo.find(d => d.name === name);
    if (dist && mapInstanceRef.current) {
      setLatInput(dist.lat.toString());
      setLonInput(dist.lng.toString());
      mapInstanceRef.current.flyTo([dist.lat, dist.lng], 10);
      updateUserMarker(dist.lat, dist.lng);
      triggerPrediction(dist.lat, dist.lng);
    }
  };

  // Trigger coordinate prediction
  const triggerPrediction = async (lat = latInput, lon = lonInput) => {
    setPredicting(true);
    setPredictError(null);
    try {
      const response = await fetch(`${API_URL}/flood-map/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lat: parseFloat(lat), lon: parseFloat(lon) })
      });

      if (!response.ok) throw new Error('Prediction API failed');
      const data = await response.json();
      setPredictionData(data);

      // Auto crop map patch & infer segmentation for selected model
      autoCropMapPatch(lat, lon, selectedModel);
    } catch (e) {
      setPredictError(language === 'bn' ? 'পূর্বাভাস ডাটা লোড ব্যর্থ হয়েছে।' : 'Failed to compile telemetry predictions.');
      autoCropMapPatch(lat, lon, selectedModel);
    } finally {
      setPredicting(false);
    }
  };

  // Auto-crop satellite map patch for selected coordinates & model
  const autoCropMapPatch = (lat = latInput, lon = lonInput, model = selectedModel) => {
    setSegmenting(true);
    setSegmentError(null);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const latNum = parseFloat(lat) || 24.8949;
    const lonNum = parseFloat(lon) || 91.8687;
    const zoom = 13;

    const x = Math.floor((lonNum + 180) / 360 * Math.pow(2, zoom));
    const latRad = latNum * Math.PI / 180;
    const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;

    const processPatch = (imageDataUrl) => {
      setUploadedImage(imageDataUrl);
      setOriginalBase64(imageDataUrl);

      fetch(`${API_URL}/flood-map/segment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ image: imageDataUrl, model })
      })
      .then(res => {
        if (!res.ok) throw new Error('Segmentation API failed');
        return res.json();
      })
      .then(data => {
        setSegmentedImage(data.segmentedImage);
        setSegmentMetrics({
          floodPercent: data.floodPercent,
          waterCoverageSqm: data.waterCoverageSqm,
          severity: data.severity,
          fallbackActive: data.fallbackActive || false
        });
        if (data.fallbackActive) {
          setTimeout(() => runBrowserSegmentation(data.floodPercent), 100);
        }
      })
      .catch(err => {
        runBrowserSegmentation(28.5);
        setSegmentMetrics({
          floodPercent: 28.5,
          waterCoverageSqm: 142500,
          severity: 'Moderate',
          fallbackActive: true
        });
      })
      .finally(() => {
        setSegmenting(false);
      });
    };

    img.onload = () => {
      ctx.drawImage(img, 0, 0, 512, 512);
      processPatch(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(256, 256, 140, 0, Math.PI * 2);
      ctx.fill();
      processPatch(canvas.toDataURL('image/png'));
    };
  };

  // Drag and drop image upload handling
  const handleImageUpload = (e) => {
    const file = e.target.files ? e.target.files[0] : e.dataTransfer.files[0];
    if (!file) return;

    setUploadedImage(URL.createObjectURL(file));
    setSegmentedImage(null);
    setSegmentMetrics(null);
    setSegmentError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setOriginalBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Run image segmentation
  const triggerSegmentation = async () => {
    if (!originalBase64) return;
    setSegmenting(true);
    setSegmentError(null);

    try {
      const response = await fetch(`${API_URL}/flood-map/segment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ image: originalBase64, model: selectedModel })
      });

      if (!response.ok) throw new Error('Segmentation failed');
      const data = await response.json();
      
      setSegmentedImage(data.segmentedImage);
      setSegmentMetrics({
        floodPercent: data.floodPercent,
        waterCoverageSqm: data.waterCoverageSqm,
        severity: data.severity,
        fallbackActive: data.fallbackActive || false
      });

      // If backend executed fallback, run browser-side canvas segmentation for realistic look
      if (data.fallbackActive) {
        setTimeout(() => runBrowserSegmentation(data.floodPercent), 100);
      }
    } catch (e) {
      setSegmentError(language === 'bn' ? 'সেগমেন্টেশন প্রসেস ব্যর্থ হয়েছে।' : 'Segmentation failed. Model files offline.');
    } finally {
      setSegmenting(false);
    }
  };

  // Client-Side Canvas thresholding fallback segmenter (runs locally if python server down)
  const runBrowserSegmentation = (targetPercent) => {
    const canvas = resultCanvasRef.current;
    if (!canvas || !originalBase64) return;
    
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original
      ctx.drawImage(img, 0, 0);
      
      // Read pixels
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      
      // Simple flood-water classification in browser (HSV heuristic / blue-brown thresholding)
      // To run quickly, we iterate pixels and identify high saturation blue, dark brown, or reflection
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        
        // Calculate blue-ness ratio
        const maxVal = Math.max(r, g, b);
        const minVal = Math.min(r, g, b);
        const l = (maxVal + minVal) / 2.0;
        
        // Water features: blue saturation high OR dark-greenish water OR muddy-brown water
        // Heuristic:
        const isBlueWater = (b > r * 1.15 && b > g * 1.05 && maxVal - minVal > 15);
        const isBrownMuddy = (r > g * 1.1 && g > b * 1.05 && l < 110 && l > 35);
        const isGrayReflective = (Math.abs(r - g) < 8 && Math.abs(g - b) < 8 && l < 160 && l > 100 && r < 140);
        
        if (isBlueWater || isBrownMuddy || isGrayReflective) {
          // Tint blue [RGBA: (30, 144, 255, 120)]
          data[i] = Math.round(r * 0.4 + 20 * 0.6);   // Red
          data[i+1] = Math.round(g * 0.4 + 150 * 0.6); // Green
          data[i+2] = Math.round(b * 0.3 + 245 * 0.7); // Blue
        }
      }
      
      ctx.putImageData(imgData, 0, 0);
      
      // Set the resulting base64 to state
      setSegmentedImage(canvas.toDataURL());
    };
    img.src = originalBase64;
  };

  // Initialize Leaflet Map
  useEffect(() => {
    const initializeMap = () => {
      if (typeof window === 'undefined' || !window.L || !mapContainerRef.current) return;

      // Clean old instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = window.L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([24.2, 90.3], 7);

      mapInstanceRef.current = map;

      // Base layers definitions
      satelliteLayerRef.current = window.L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      );

      darkLayerRef.current = window.L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { maxZoom: 19 }
      );

      lightLayerRef.current = window.L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { maxZoom: 19 }
      );

      // Default load based on theme
      if (activeLayers.satellite) {
        satelliteLayerRef.current.addTo(map);
      } else if (theme === 'dark') {
        darkLayerRef.current.addTo(map);
      } else {
        lightLayerRef.current.addTo(map);
      }

      window.L.control.zoom({ position: 'bottomright' }).addTo(map);

      ensureGisMarkerStyles();

      // Initialize groups
      shelterGroupRef.current = window.L.layerGroup().addTo(map);
      incidentGroupRef.current = window.L.layerGroup().addTo(map);
      floodGroupRef.current = window.L.layerGroup().addTo(map);
      routeGroupRef.current = window.L.layerGroup().addTo(map);

      // Map click handler (sets manual coords inputs)
      map.on('click', (e) => {
        const lat = e.latlng.lat.toFixed(6);
        const lon = e.latlng.lng.toFixed(6);
        setLatInput(lat);
        setLonInput(lon);
        updateUserMarker(lat, lon);
        triggerPrediction(lat, lon);
      });

      // Update initial marker location
      updateUserMarker(latInput, lonInput);
    };

    // Load Leaflet CDN if window.L is not present
    if (typeof window !== 'undefined') {
      if (window.L) {
        initializeMap();
      } else {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.onload = initializeMap;
        document.head.appendChild(script);
      }
    }

    return () => {
      userMarkerRef.current = null;
      routeGroupRef.current = null;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update base maps dynamically on theme / satellite state changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.L) return;

    // Remove active base layers
    if (map.hasLayer(satelliteLayerRef.current)) map.removeLayer(satelliteLayerRef.current);
    if (map.hasLayer(darkLayerRef.current)) map.removeLayer(darkLayerRef.current);
    if (map.hasLayer(lightLayerRef.current)) map.removeLayer(lightLayerRef.current);

    // Add selected
    if (activeLayers.satellite) {
      satelliteLayerRef.current.addTo(map);
    } else if (theme === 'dark') {
      darkLayerRef.current.addTo(map);
    } else {
      lightLayerRef.current.addTo(map);
    }
  }, [activeLayers.satellite, theme]);

  // Update Shelters overlay group
  useEffect(() => {
    const group = shelterGroupRef.current;
    if (!group || !window.L) return;
    group.clearLayers();

    if (activeLayers.shelter && shelters.length > 0) {
      shelters.forEach(s => {
        const shelterIcon = window.L.divIcon({
          className: 'shelter-marker-icon',
          html: `<div class="p-1 rounded-full bg-emerald-500 text-white border border-white flex items-center justify-center shadow-lg transform transition hover:scale-125 duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                 </div>`,
          iconSize: [22, 22]
        });

        const marker = window.L.marker([s.lat, s.lng], { icon: shelterIcon });
        marker.bindPopup(`
          <div class="p-2 font-sans text-slate-800" style="min-width: 180px;">
            <h4 class="font-bold border-b pb-1 text-sm text-slate-900 m-0">${s.name}</h4>
            <div class="text-[11px] mt-1.5 leading-tight">
              <strong>Capacity:</strong> ${s.capacity} people<br/>
              <strong>Occupancy:</strong> ${s.currentOccupancy} (${Math.round((s.currentOccupancy/s.capacity)*100)}%)<br/>
              <strong>Status:</strong> <span class="font-semibold text-${s.status === 'Full' ? 'red-500' : 'emerald-600'}">${s.status}</span><br/>
              <strong>Contact:</strong> ${s.phone}
            </div>
          </div>
        `);
        group.addLayer(marker);
      });
    }
  }, [activeLayers.shelter, shelters]);

  // Update Incidents overlay group
  useEffect(() => {
    const group = incidentGroupRef.current;
    if (!group || !window.L) return;
    group.clearLayers();

    if (activeLayers.incident && incidents.length > 0) {
      incidents.forEach(i => {
        const iconColor = getRiskColor(i.severity);
        const incidentIcon = window.L.divIcon({
          className: 'incident-marker-icon',
          html: `<div class="p-1.5 rounded-lg text-white flex items-center justify-center shadow-lg transform transition hover:scale-125 duration-200" style="background-color: ${iconColor}; border: 1.5px solid white;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                 </div>`,
          iconSize: [24, 24]
        });

        const marker = window.L.marker([i.lat, i.lng], { icon: incidentIcon });
        marker.bindPopup(`
          <div class="p-2 font-sans text-slate-800" style="max-width: 220px;">
            <h4 class="font-bold border-b pb-1 text-sm m-0 text-red-600 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              ${i.title}
            </h4>
            <div class="text-[11px] mt-1.5 leading-tight">
              <strong>District:</strong> ${i.district}<br/>
              <strong>Severity:</strong> <span style="color: ${iconColor}; font-weight: bold;">${i.severity}</span><br/>
              <strong>Reported:</strong> ${new Date(i.reportedAt).toLocaleTimeString()}<br/>
              <p class="mt-1.5 text-slate-600 bg-slate-50 p-1 rounded border">${i.desc}</p>
            </div>
          </div>
        `);
        group.addLayer(marker);
      });
    }
  }, [activeLayers.incident, incidents]);

  // Update Flood circles overlay group
  useEffect(() => {
    const group = floodGroupRef.current;
    if (!group || !window.L) return;
    group.clearLayers();

    // Map circles representing historic and active flood zones (Sylhet, Sunamganj, Kurigram)
    if (activeLayers.flood) {
      const floodZones = [
        { lat: 25.0664, lng: 91.3992, rad: 28000, risk: 92, title: 'Sunamganj Haor Basin' },
        { lat: 24.8949, lng: 91.8687, rad: 24000, risk: 88, title: 'Sylhet Surma Riverway' },
        { lat: 25.8054, lng: 89.6361, rad: 20000, risk: 85, title: 'Kurigram Brahmaputra Corridor' },
        { lat: 25.3288, lng: 89.5401, rad: 18000, risk: 78, title: 'Gaibandha River Corridor' },
        { lat: 24.8856, lng: 90.7308, rad: 15000, risk: 65, title: 'Netrokona Runoff Plain' }
      ];

      floodZones.forEach(fz => {
        const col = fz.risk >= 80 ? '#ef4444' : fz.risk >= 60 ? '#f97316' : '#eab308';
        const circle = window.L.circle([fz.lat, fz.lng], {
          color: col,
          fillColor: col,
          fillOpacity: 0.25,
          weight: 1.5,
          radius: fz.rad
        });

        circle.bindPopup(`
          <div class="p-1 font-sans text-xs">
            <strong>${fz.title}</strong><br/>
            Flood Coverage Index: ${fz.risk}%
          </div>
        `);
        group.addLayer(circle);
      });
    }
  }, [activeLayers.flood]);

  useEffect(() => {
    updateUserMarker(latInput, lonInput);
  }, [latInput, lonInput, language]);

  useEffect(() => {
    drawPathToShelter(latInput, lonInput);
  }, [shelters, predictionData, language]);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1.5 md:flex-row md:justify-between md:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-heading m-0 flex items-center gap-2">
            <Compass className="w-7 h-7 text-flood-cyan-400 animate-spin-slow" />
            {t.pageTitle}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">
            {t.pageSub}
          </p>
        </div>
        <span className="w-fit text-[11px] font-semibold text-flood-cyan-500 dark:text-flood-cyan-400 px-3 py-1 bg-flood-cyan-500/10 border border-flood-cyan-500/20 rounded-full flex items-center gap-1.5 self-start md:self-auto">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          Active GIS Satellites: Sentinel-1 / Sentinel-2
        </span>
      </div>

      {/* TOP SECTION: Map (7 cols) & Geographic Locator Search (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT: Map & Layer Toggles (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Map canvas container */}
          <div className="w-full relative h-[450px] md:h-[500px] glass-panel border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-lg bg-slate-950">
            
            {/* GIS Layer Toggle Floating Widget */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 bg-white/90 dark:bg-slate-950/85 p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-xl backdrop-blur-md max-w-[200px]">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 border-b border-slate-200 dark:border-white/5 pb-1.5 mb-1.5">
                <Layers className="w-3.5 h-3.5 text-flood-cyan-400" />
                {t.layerControl}
              </span>
              
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-flood-cyan-400 select-none">
                <input 
                  type="checkbox"
                  checked={activeLayers.satellite}
                  onChange={(e) => setActiveLayers({...activeLayers, satellite: e.target.checked})}
                  className="rounded border-slate-300 text-flood-cyan-500 focus:ring-flood-cyan-400"
                />
                {t.layerSat}
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-flood-cyan-400 select-none">
                <input 
                  type="checkbox"
                  checked={activeLayers.flood}
                  onChange={(e) => setActiveLayers({...activeLayers, flood: e.target.checked})}
                  className="rounded border-slate-300 text-flood-cyan-500 focus:ring-flood-cyan-400"
                />
                {t.layerFlood}
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-flood-cyan-400 select-none">
                <input 
                  type="checkbox"
                  checked={activeLayers.shelter}
                  onChange={(e) => setActiveLayers({...activeLayers, shelter: e.target.checked})}
                  className="rounded border-slate-300 text-flood-cyan-500 focus:ring-flood-cyan-400"
                />
                {t.layerShelter}
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-flood-cyan-400 select-none">
                <input 
                  type="checkbox"
                  checked={activeLayers.incident}
                  onChange={(e) => setActiveLayers({...activeLayers, incident: e.target.checked})}
                  className="rounded border-slate-300 text-flood-cyan-500 focus:ring-flood-cyan-400"
                />
                {t.layerIncident}
              </label>
            </div>

            {/* Map Canvas div */}
            <div ref={mapContainerRef} className="w-full h-full z-10" />

            <div className="absolute bottom-4 left-4 z-20 bg-white/90 dark:bg-slate-950/90 p-3 rounded-xl border border-slate-200 dark:border-white/10 shadow-xl backdrop-blur-md max-w-[230px]">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 border-b border-slate-200 dark:border-white/5 pb-1.5 mb-2">
                <Info className="w-3.5 h-3.5 text-flood-cyan-400" />
                {t.legendTitle}
              </span>
              <ul className="flex flex-col gap-1.5 m-0 p-0 list-none">
                <li className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  <span className="relative flex h-5 w-5 items-center justify-center shrink-0">
                    <span className="absolute h-4 w-4 rounded-full bg-cyan-400/50" />
                    <span className="relative h-3 w-3 rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 border border-white" />
                  </span>
                  {t.legendYou}
                </li>
                <li className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  <span className="h-[3px] w-5 rounded-full bg-cyan-400 shrink-0" />
                  {t.legendRoute}
                </li>
                <li className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  <span className="h-5 w-5 rounded-full bg-emerald-500 text-white border border-white flex items-center justify-center shrink-0">
                    <Home className="w-3 h-3" />
                  </span>
                  {t.legendShelter}
                </li>
                <li className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  <span className="h-5 w-5 rounded-md bg-red-500 text-white border border-white flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-3 h-3" />
                  </span>
                  {t.legendIncidentCritical}
                </li>
                <li className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  <span className="h-5 w-5 rounded-md bg-orange-500 text-white border border-white flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-3 h-3" />
                  </span>
                  {t.legendIncidentHigh}
                </li>
                <li className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  <span className="h-5 w-5 rounded-md bg-yellow-500 text-white border border-white flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-3 h-3" />
                  </span>
                  {t.legendIncidentModerate}
                </li>
                <li className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  <span className="h-4 w-4 rounded-full bg-red-500/40 border border-red-500 shrink-0" />
                  {t.legendFloodHigh}
                </li>
                <li className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                  <span className="h-4 w-4 rounded-full bg-orange-500/40 border border-orange-500 shrink-0" />
                  {t.legendFloodMed}
                </li>
              </ul>
            </div>

            {/* Fallback load screen */}
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-slate-400 text-xs pointer-events-none z-0">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-t-flood-cyan-400 border-slate-800 rounded-full animate-spin"></div>
                <span>Initialising Leaflet Server Map...</span>
              </div>
            </div>
          </div>

          {/* Dataset Info Note */}
          <div className="glass-panel p-4 border border-slate-200 dark:border-white/5 rounded-xl bg-white/60 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-[11px] flex gap-2 items-start leading-relaxed shadow-sm">
            <Info className="w-4 h-4 text-flood-cyan-400 shrink-0 mt-0.5" />
            <span>{t.sourceInfo}</span>
          </div>

        </div>

        {/* RIGHT: Search & Geographic Locator Panel (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full">
          <div className="glass-panel p-5 border border-slate-200 dark:border-white/5 rounded-2xl bg-white/80 dark:bg-slate-900/60 shadow-md flex flex-col gap-4 h-full justify-between">
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-flood-cyan-400 font-heading border-b border-slate-200/50 dark:border-white/5 pb-2 mb-1 flex items-center gap-2">
                <Search className="w-4.5 h-4.5" />
                {t.searchTitle}
              </h3>

              {/* Fly to District */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{t.searchDist}</label>
                <select
                  value={searchDistrict}
                  onChange={handleDistrictChange}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-flood-cyan-400 transition-colors"
                >
                  <option value="">{t.searchDistSelect}</option>
                  {districtsInfo.map((d, idx) => (
                    <option key={idx} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Locate Me Button with error handle */}
              <div className="flex flex-col gap-2 mt-1">
                <button
                  onClick={handleGPSLocation}
                  disabled={isLocating}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-flood-blue-600 to-flood-cyan-500 hover:from-flood-blue-500 hover:to-flood-cyan-400 text-white shadow-md shadow-flood-blue-500/10 cursor-pointer disabled:opacity-50 transition-all duration-200"
                >
                  {isLocating ? (
                    <div className="w-4 h-4 border-2 border-t-white border-white/20 rounded-full animate-spin"></div>
                  ) : (
                    <Navigation className="w-4 h-4 rotate-45" />
                  )}
                  {t.locateBtn}
                </button>
                {gpsError && (
                  <div className="text-[11px] text-amber-500 font-semibold flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {gpsError}
                  </div>
                )}
              </div>

              {/* Manual Lat/Lon input coordinates */}
              <div className="border-t border-slate-200/50 dark:border-white/5 pt-3 mt-1 flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.coordsForm}</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400">{t.coordsLat}</label>
                    <input 
                      type="number" 
                      step="0.0001"
                      value={latInput}
                      onChange={(e) => setLatInput(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-1.5 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-flood-cyan-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-500 dark:text-slate-400">{t.coordsLon}</label>
                    <input 
                      type="number" 
                      step="0.0001"
                      value={lonInput}
                      onChange={(e) => setLonInput(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-1.5 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-flood-cyan-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => {
                  if (mapInstanceRef.current && latInput && lonInput) {
                    mapInstanceRef.current.flyTo([parseFloat(latInput), parseFloat(lonInput)], 11);
                    updateUserMarker(latInput, lonInput);
                  }
                  triggerPrediction(latInput, lonInput);
                }}
                disabled={predicting || !latInput || !lonInput}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border border-flood-cyan-500/30 bg-flood-cyan-500/10 text-flood-cyan-400 hover:bg-flood-cyan-500/20 cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
              >
                {predicting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                {predicting ? t.predicting : t.predictBtn}
              </button>
              {predictError && (
                <div className="text-[10px] text-red-500 font-semibold bg-red-500/10 border border-red-500/20 px-2 py-1 rounded mt-2">
                  {predictError}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* MIDDLE SECTION (GREEN PORTION): AI PREDICTION REPORT PANEL (FULL WIDTH) */}
      {predictionData && (
        <div className="w-full glass-panel p-5 border border-slate-200 dark:border-white/5 rounded-2xl bg-white/80 dark:bg-slate-900/60 shadow-md flex flex-col gap-4 animate-fade-in">
          <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-white/5 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-flood-cyan-400 font-heading m-0 flex items-center gap-2">
              <Activity className="w-4.5 h-4.5 text-emerald-400 animate-pulse" />
              AI Prediction Report
            </h3>
            <span className="text-[9px] px-2.5 py-0.5 font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full">
              XGBoost v2.0
            </span>
          </div>

          {/* Grid outputs in 4 columns for full-width layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Probability Card */}
            <div className="p-3.5 rounded-xl border border-slate-200/50 dark:border-white/5 bg-slate-50 dark:bg-slate-950/40 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">{t.probLabel}</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-2xl font-bold font-heading text-slate-900 dark:text-white">{predictionData.floodProbability}%</span>
                <span className="text-[10px] text-slate-400 font-medium">chance</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${predictionData.floodProbability}%`,
                    backgroundColor: getRiskColor(predictionData.riskLevel)
                  }}
                />
              </div>
            </div>

            {/* Flood Depth Card */}
            <div className="p-3.5 rounded-xl border border-slate-200/50 dark:border-white/5 bg-slate-50 dark:bg-slate-950/40 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">{t.depthLabel}</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-bold font-heading text-slate-900 dark:text-white">{predictionData.floodDepth}m</span>
                <span className="text-[10px] text-slate-400 font-medium">water depth</span>
              </div>
              <span className="text-[9px] text-slate-400 italic mt-2.5 truncate">
                Relative to regional grid
              </span>
            </div>

            {/* Risk Level Badge */}
            <div className="p-3.5 rounded-xl border border-slate-200/50 dark:border-white/5 bg-slate-50 dark:bg-slate-950/40 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">{t.riskLabel}</span>
              <div className="mt-2.5 flex items-center gap-1.5">
                <span 
                  className="w-2.5 h-2.5 rounded-full animate-pulse" 
                  style={{ backgroundColor: getRiskColor(predictionData.riskLevel) }}
                />
                <span 
                  className="text-sm font-bold uppercase tracking-wider"
                  style={{ color: getRiskColor(predictionData.riskLevel) }}
                >
                  {predictionData.riskLevel}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 mt-2 truncate">Severity Classification</span>
            </div>

            {/* Distance to River */}
            <div className="p-3.5 rounded-xl border border-slate-200/50 dark:border-white/5 bg-slate-50 dark:bg-slate-950/40 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">{t.telemetryRiver}</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-xl font-bold font-heading text-slate-900 dark:text-white">
                  {predictionData.telemetry?.distance_to_river_km || '1.2'} km
                </span>
              </div>
              <span className="text-[9px] text-slate-400 mt-3.5 truncate">Closest active water channel</span>
            </div>

          </div>

          {/* Suggested Shelter Banner */}
          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 flex flex-col gap-1.5">
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />
              {t.shelterLabel}
            </span>
            <span className="text-xs font-semibold text-slate-800 dark:text-emerald-300">
              {predictionData.suggestedShelter}
            </span>
          </div>

          {/* Live Telemetry list */}
          <div className="border-t border-slate-200/50 dark:border-white/5 pt-3">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
              {t.telemetryTitle}
            </span>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-500/5 p-2.5 rounded-lg border border-slate-200/30 dark:border-white/5 text-center">
                <div className="text-[10px] text-slate-400">{t.telemetryElev}</div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">{predictionData.telemetry?.elevation || '12'} m</div>
              </div>
              <div className="bg-slate-500/5 p-2.5 rounded-lg border border-slate-200/30 dark:border-white/5 text-center">
                <div className="text-[10px] text-slate-400">{t.telemetryRain}</div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">{predictionData.telemetry?.precipitation_72h || '75'} mm</div>
              </div>
              <div className="bg-slate-500/5 p-2.5 rounded-lg border border-slate-200/30 dark:border-white/5 text-center">
                <div className="text-[10px] text-slate-400">DEM Source</div>
                <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1.5 uppercase truncate">NASA DEM</div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* BOTTOM SECTION (FULL SPACE IN IMAGE 2): SEN1FLOODS11 IMAGE SEGMENTATION PANEL (FULL WIDTH) */}
      <div className="w-full glass-panel p-6 border border-slate-200 dark:border-white/5 rounded-2xl bg-white/80 dark:bg-slate-900/60 shadow-md flex flex-col gap-5">
        <div className="flex flex-col gap-1 border-b border-slate-200/50 dark:border-white/5 pb-3">
          <h3 className="text-base font-bold uppercase tracking-wider text-flood-cyan-400 font-heading m-0 flex items-center gap-2">
            <UploadCloud className="w-5.5 h-5.5 animate-pulse text-flood-cyan-400" />
            {t.uploadTitle}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed m-0">
            {t.uploadSub}
          </p>
        </div>

        {/* Controls row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Model select */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-600 dark:text-slate-400 font-bold shrink-0">{t.modelLabel}:</label>
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                autoCropMapPatch(latInput, lonInput, e.target.value);
              }}
              className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-flood-cyan-400"
            >
              <option value="SegFormer">SegFormer (Transformer-B0)</option>
              <option value="DeepLabV3">DeepLabV3 (ResNet-50)</option>
              <option value="Sen1Floods11">Sen1Floods11 (SAR Pipeline)</option>
            </select>
          </div>

          {/* Auto-Crop Map Patch Control */}
          <div className="flex flex-col gap-2 bg-slate-950/40 p-3 rounded-xl border border-white/5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
              <span>Active Target Patch:</span>
              <span className="font-mono text-flood-cyan-400 font-bold">{latInput}, {lonInput}</span>
            </div>

            <button
              type="button"
              onClick={() => autoCropMapPatch(latInput, lonInput, selectedModel)}
              disabled={segmenting}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-md cursor-pointer disabled:opacity-50 transition-all"
            >
              {segmenting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Auto-Cropping Map Patch & Inferring...</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4 text-cyan-200 animate-pulse" />
                  <span>⚡ Auto-Crop Map Patch & Run Segmenter</span>
                </>
              )}
            </button>

            <div className="relative text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <span className="text-[10px] text-slate-400 hover:text-slate-200 underline cursor-pointer">
                or Upload Custom Image / Drone Photo
              </span>
            </div>
          </div>
        </div>

        {/* Images comparison layout side-by-side (full width space) */}
        {uploadedImage && (
          <div className="flex flex-col gap-4 border-t border-slate-200/50 dark:border-white/5 pt-4">
            
            {/* Images Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Original target image patch */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-400 text-center uppercase tracking-wider font-bold">{t.originalImg}</span>
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-950 h-64 md:h-80 flex items-center justify-center shadow-lg">
                  <img src={uploadedImage} alt="Original uploaded flood" className="w-full h-full object-cover" />
                </div>
              </div>

              {/* Segmented Water Mask image */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-400 text-center uppercase tracking-wider font-bold">{t.segmentedImg}</span>
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-950 h-64 md:h-80 flex items-center justify-center relative shadow-lg">
                  {segmenting ? (
                    <div className="flex flex-col items-center gap-3 text-xs text-slate-400 z-10">
                      <RefreshCw className="w-7 h-7 text-flood-cyan-400 animate-spin" />
                      <span>{t.segmenting}</span>
                    </div>
                  ) : segmentedImage ? (
                    <img src={segmentedImage} alt="Segmented flood mask" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-xs text-slate-500 text-center px-4">
                      Click Process Image to execute deep learning segmenter
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Process Image Button */}
            <button
              onClick={triggerSegmentation}
              disabled={segmenting || !originalBase64}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-flood-cyan-500 hover:bg-flood-cyan-400 text-white cursor-pointer disabled:opacity-50 transition-colors shadow-md shadow-flood-cyan-500/20"
            >
              <Eye className="w-4 h-4" />
              {t.segmentBtn}
            </button>
            {segmentError && (
              <div className="text-xs text-red-500 font-semibold bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl text-center">
                {segmentError}
              </div>
            )}

          </div>
        )}

        {/* SEGMENTATION REPORT VISUAL METRICS */}
        {segmentMetrics && (
          <div className="p-5 rounded-2xl border border-slate-200/50 dark:border-white/10 bg-slate-50 dark:bg-slate-950/40 flex flex-col gap-4 animate-fade-in shadow-inner">
            
            {/* Fallback Notice Banner */}
            {segmentMetrics.fallbackActive && (
              <div className="text-xs text-amber-500 bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-xl flex items-center gap-2 leading-relaxed font-semibold">
                <Info className="w-4 h-4 shrink-0" />
                <span>{t.fallbackNotice}</span>
              </div>
            )}

            <div className="flex justify-between items-center border-b border-slate-200/30 dark:border-white/5 pb-2.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.metricsTitle}</span>
              <span className="text-xs text-flood-cyan-400 font-bold bg-flood-cyan-400/10 border border-flood-cyan-400/20 px-3 py-1 rounded-full uppercase">
                {selectedModel} Mode
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center bg-white/50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/40 dark:border-white/5">
                <span className="text-xs text-slate-400 block truncate">{t.metricsCoverage}</span>
                <span className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1 block">
                  {segmentMetrics.floodPercent}%
                </span>
              </div>
              <div className="text-center bg-white/50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/40 dark:border-white/5">
                <span className="text-xs text-slate-400 block truncate">{t.metricsArea}</span>
                <span className="text-xl font-bold text-slate-800 dark:text-white mt-1.5 block">
                  {(segmentMetrics.waterCoverageSqm / 10000).toFixed(1)} ha
                </span>
              </div>
              <div className="text-center bg-white/50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/40 dark:border-white/5">
                <span className="text-xs text-slate-400 block truncate">{t.metricsSeverity}</span>
                <span 
                  className="text-sm font-black uppercase mt-2 block tracking-wider"
                  style={{ color: getRiskColor(segmentMetrics.severity) }}
                >
                  {segmentMetrics.severity}
                </span>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Hidden canvases for browser fallback image segmentation rendering */}
      <canvas ref={originalCanvasRef} className="hidden" />
      <canvas ref={resultCanvasRef} className="hidden" />

    </div>
  );
}
