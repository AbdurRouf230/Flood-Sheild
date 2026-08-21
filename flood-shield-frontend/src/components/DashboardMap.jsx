import React, { useEffect, useRef } from 'react';

// Coordinates and data for major districts in Bangladesh
const districtData = [
  { name: 'Sylhet', lat: 24.8949, lng: 91.8687, risk: 88, category: 'Critical', shelter: 'Sylhet Govt College Shelter (Capacity: 800)' },
  { name: 'Sunamganj', lat: 25.0664, lng: 91.3992, risk: 92, category: 'Critical', shelter: 'Sunamganj High School (Capacity: 600)' },
  { name: 'Kurigram', lat: 25.8054, lng: 89.6361, risk: 85, category: 'Critical', shelter: 'Kurigram Degree College (Capacity: 750)' },
  { name: 'Gaibandha', lat: 25.3288, lng: 89.5401, risk: 78, category: 'High', shelter: 'Gaibandha Pilot School (Capacity: 500)' },
  { name: 'Netrokona', lat: 24.8856, lng: 90.7308, risk: 65, category: 'High', shelter: 'Netrokona Zilla School (Capacity: 450)' },
  { name: 'Sirajganj', lat: 24.4534, lng: 89.7008, risk: 58, category: 'Moderate', shelter: 'Sirajganj Sadar Shelter (Capacity: 900)' },
  { name: 'Jamalpur', lat: 24.9375, lng: 89.9377, risk: 52, category: 'Moderate', shelter: 'Jamalpur Govt College (Capacity: 600)' },
  { name: 'Bogura', lat: 24.8481, lng: 89.3730, risk: 48, category: 'Moderate', shelter: 'Bogura School Shelter (Capacity: 400)' },
  { name: 'Dhaka', lat: 23.8103, lng: 90.4125, risk: 28, category: 'Low', shelter: 'Dhaka Central Cyclone Center (Capacity: 2500)' },
  { name: 'Chittagong', lat: 22.3569, lng: 91.7832, risk: 22, category: 'Low', shelter: 'Halishahar Shelter Hub (Capacity: 1500)' }
];

export default function DashboardMap({ riskRanking = [], language = 'en' }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const getRiskColor = (score) => {
    if (score >= 81) return '#ef4444'; // Red (Critical)
    if (score >= 61) return '#f97316'; // Orange (High)
    if (score >= 31) return '#eab308'; // Yellow (Moderate)
    return '#10b981'; // Green (Low)
  };

  const getTranslations = () => {
    return language === 'en' ? {
      title: 'Interactive Risk Map',
      popRisk: 'Risk Score',
      popCat: 'Risk Level',
      popShelter: 'Nearest Shelter',
      loadErr: 'Leaflet map is initializing...'
    } : {
      title: 'ইন্টারেক্টিভ ঝুঁকি মানচিত্র',
      popRisk: 'ঝুঁকি স্কোর',
      popCat: 'ঝুঁকি স্তর',
      popShelter: 'নিকটবর্তী আশ্রয়কেন্দ্র',
      loadErr: 'মানচিত্র লোড হচ্ছে...'
    };
  };

  const t = getTranslations();

  useEffect(() => {
    // Dynamic loading of Leaflet from window global variable
    // This is robust against bundle environment errors on different operating systems
    const initMap = () => {
      if (typeof window === 'undefined' || !window.L || !mapRef.current) return;

      // Clean up previous map instance if exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      // Initialize map centered around central Bangladesh
      const map = window.L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([24.2, 90.3], 7);

      mapInstanceRef.current = map;

      // Add dark tiles style for premium styling
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Add custom zoom control at bottom-right
      window.L.control.zoom({
        position: 'bottomright'
      }).addTo(map);

      // Map ranking inputs to coordinate data
      const displayData = riskRanking && riskRanking.length > 0
        ? riskRanking.map(item => {
            const coord = districtData.find(d => d.name.toLowerCase() === item.district.toLowerCase()) || { lat: 23.8, lng: 90.4 };
            return {
              name: item.district,
              lat: coord.lat,
              lng: coord.lng,
              risk: item.score,
              category: item.category,
              shelter: coord.shelter || 'Local Primary School'
            };
          })
        : districtData;

      // Plot circles on the map
      displayData.forEach((district) => {
        const color = getRiskColor(district.risk);
        
        const circle = window.L.circle([district.lat, district.lng], {
          color: color,
          fillColor: color,
          fillOpacity: 0.35,
          radius: 20000 + (district.risk * 150) // Scale size slightly with risk score
        }).addTo(map);

        // Bind interactive popups
        circle.bindPopup(`
          <div style="font-family: sans-serif; color: #1e293b; padding: 4px;">
            <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
              ${district.name}
            </h4>
            <div style="font-size: 11px; margin-bottom: 4px;">
              <strong>${t.popRisk}:</strong> ${district.risk}%
            </div>
            <div style="font-size: 11px; margin-bottom: 4px;">
              <strong>${t.popCat}:</strong> 
              <span style="color: ${color}; font-weight: bold;">${district.category}</span>
            </div>
            <div style="font-size: 10px; color: #64748b; line-height: 1.2;">
              <strong>${t.popShelter}:</strong><br/>${district.shelter}
            </div>
          </div>
        `);
      });
    };

    // Load leaflet if not already present
    if (typeof window !== 'undefined') {
      if (window.L) {
        initMap();
      } else {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.onload = initMap;
        document.head.appendChild(script);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [riskRanking, language]);

  return (
    <div className="w-full h-full flex flex-col glass-panel rounded-2xl p-4 border border-white/5 shadow-lg relative min-h-[350px]">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-flood-cyan-400 font-heading">
          {t.title}
        </h3>
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Map Server Online"></span>
      </div>
      
      {/* Map canvas frame */}
      <div className="flex-1 w-full rounded-xl overflow-hidden bg-slate-950 border border-white/5 relative min-h-[280px]">
        <div ref={mapRef} className="w-full h-full z-10" />
        
        {/* Placeholder if map takes time to load */}
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 text-slate-400 text-xs pointer-events-none z-0">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-t-flood-cyan-400 border-slate-800 rounded-full animate-spin"></div>
            <span>{t.loadErr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
