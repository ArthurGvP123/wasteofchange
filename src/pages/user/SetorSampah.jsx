import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import Navbar from "../../components/Navbar";
import SuccessModal from "../../components/SuccessModal";
import { PageTransition, Button } from "../../components/AnimatedUI";
import { getProvinces, getRegencies, getDistricts } from "../../utils/apiWilayah";
import { WASTE_CATEGORIES, calculateEstimate } from "../../utils/wasteData"; // Import Data Sampah
import { Truck, MapPin, ArrowLeft, Building2, Crosshair, Calendar, Plus, Trash2, Coins, Wallet, Scale, AlertCircle } from "lucide-react";

// --- MAP IMPORTS ---
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const RedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

// Helper Format Rupiah
const formatRupiah = (num) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);

export default function SetorSampah() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Data States
  const [loading, setLoading] = useState(false);
  const [wasteBanks, setWasteBanks] = useState([]);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  // Form State
  const [selectedBankId, setSelectedBankId] = useState("");
  const [pickupCoords, setPickupCoords] = useState({ lat: -6.175392, lng: 106.827153 });
  
  // --- ITEM SAMPAH STATE (BARU) ---
  const [wasteItems, setWasteItems] = useState([
    { id: Date.now(), categoryId: "", typeId: "", weight: "" }
  ]);
  const [totals, setTotals] = useState({ weight: 0, money: 0, points: 0 });

  // Address State
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [addrData, setAddrData] = useState({ provinsi: "", kota: "", kecamatan: "" });
  const [selectedProvId, setSelectedProvId] = useState("");
  const [selectedRegId, setSelectedRegId] = useState("");

  // Init Data
  useEffect(() => {
    getProvinces().then(setProvinces);
    const fetchBanks = async () => {
      try {
        const snap = await getDocs(collection(db, "affiliations"));
        setWasteBanks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
    };
    fetchBanks();
  }, []);

  // --- LOGIC KALKULASI TOTAL ---
  useEffect(() => {
    let totalW = 0, totalM = 0, totalP = 0;
    
    wasteItems.forEach(item => {
      const w = parseFloat(item.weight) || 0;
      if (item.categoryId && item.typeId && w > 0) {
        const est = calculateEstimate(item.categoryId, item.typeId, w);
        totalW += w;
        totalM += est.money;
        totalP += est.points;
      }
    });

    setTotals({ weight: parseFloat(totalW.toFixed(2)), money: totalM, points: totalP });
  }, [wasteItems]);

  // --- HANDLERS ITEM SAMPAH ---
  const handleAddItem = () => {
    setWasteItems([...wasteItems, { id: Date.now(), categoryId: "", typeId: "", weight: "" }]);
  };

  const handleRemoveItem = (id) => {
    if (wasteItems.length === 1) return; // Sisakan minimal 1 baris
    setWasteItems(wasteItems.filter(item => item.id !== id));
  };

  const updateItem = (id, field, value) => {
    setWasteItems(prev => prev.map(item => {
      if (item.id === id) {
        // Jika ganti kategori, reset sub-type
        if (field === 'categoryId') return { ...item, [field]: value, typeId: "" };
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // --- HANDLERS ALAMAT ---
  const handleProvChange = async (e) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedProvId(id); setSelectedRegId(""); setRegencies([]); setDistricts([]);
    setAddrData(prev => ({ ...prev, provinsi: name, kota: "", kecamatan: "" }));
    if (id) setRegencies(await getRegencies(id));
  };
  const handleRegChange = async (e) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedRegId(id); setDistricts([]);
    setAddrData(prev => ({ ...prev, kota: name, kecamatan: "" }));
    if (id) setDistricts(await getDistricts(id));
  };
  const handleDistChange = (e) => setAddrData(prev => ({ ...prev, kecamatan: e.target.options[e.target.selectedIndex].text }));

  // --- MAPS ---
  const DraggableMarker = () => {
    const markerRef = useRef(null);
    const eventHandlers = useMemo(() => ({
        dragend() {
          const marker = markerRef.current;
          if (marker != null) setPickupCoords(marker.getLatLng());
        },
      }), []);
    return <Marker draggable={true} eventHandlers={eventHandlers} position={pickupCoords} ref={markerRef} icon={RedIcon}><Popup>Titik Jemput</Popup></Marker>;
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) return alert("Browser tidak support GPS.");
    document.body.style.cursor = "wait";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPickupCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        document.body.style.cursor = "default";
      },
      () => { alert("Gagal ambil lokasi."); document.body.style.cursor = "default"; }
    );
  };

  // --- SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!selectedBankId) { alert("Pilih Bank Sampah tujuan!"); setLoading(false); return; }
    if (totals.weight <= 0) { alert("Masukkan minimal satu jenis sampah dengan berat valid!"); setLoading(false); return; }
    if (!addrData.provinsi || !addrData.kota || !addrData.kecamatan) { alert("Lengkapi alamat penjemputan!"); setLoading(false); return; }

    // Filter item yang valid saja (sudah diisi lengkap)
    const validItems = wasteItems.filter(i => i.categoryId && i.typeId && i.weight > 0).map(i => {
        // Simpan juga label agar di detail nanti mudah dibaca
        const cat = WASTE_CATEGORIES[i.categoryId];
        const type = cat.types.find(t => t.id === i.typeId);
        const est = calculateEstimate(i.categoryId, i.typeId, parseFloat(i.weight));
        
        return {
            categoryId: i.categoryId,
            categoryLabel: cat.label,
            typeId: i.typeId,
            typeLabel: type.label,
            weight: parseFloat(i.weight),
            estPoints: est.points,
            estMoney: est.money
        };
    });

    try {
      const alamatLengkap = `${addrData.kecamatan}, ${addrData.kota}, ${addrData.provinsi}`;
      
      await addDoc(collection(db, "deposits"), {
        userId: currentUser.uid,
        userName: currentUser.displayName || "Pengguna",
        userEmail: currentUser.email,
        afiliasiId: selectedBankId,
        
        // Data Baru
        wasteItems: validItems,
        estimasiBerat: totals.weight, // Total berat untuk sorting/query cepat
        estimasiPoin: totals.points,
        estimasiUang: totals.money,

        pickupLocation: pickupCoords,
        alamatJemput: alamatLengkap,
        wilayahJemput: addrData,
        status: "pending",
        progressStep: "persiapan",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      setIsSuccessOpen(true);
    } catch (error) {
      console.error(error);
      alert("Gagal membuat pengajuan.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-woc-darker text-white font-sans">
      <Navbar />
      <SuccessModal 
        isOpen={isSuccessOpen} 
        onClose={() => { setIsSuccessOpen(false); navigate("/riwayat"); }} 
        title="Pengajuan Terkirim!" 
        message="Permintaan penyetoran sampah Anda telah dikirim. Pantau statusnya di menu Riwayat." 
      />

      <main className="pt-24 pb-10 max-w-7xl mx-auto px-4 md:px-6">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Ajukan Penyetoran</h1>
              <p className="text-slate-400 text-sm">Isi rincian sampah untuk penjemputan.</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-lg border border-slate-800 text-xs text-slate-400">
            <Calendar size={14}/> {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* KOLOM KIRI: FORM (Span 7) */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* 1. Pilih Bank Sampah */}
              <div className="bg-woc-dark border border-slate-800 rounded-2xl p-6 shadow-xl">
                <label className="text-xs font-bold text-woc-tosca uppercase mb-2 flex items-center gap-2">
                  <Building2 size={14}/> Pilih Bank Sampah
                </label>
                <select 
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="input-compact cursor-pointer bg-slate-900/50 p-3 text-sm"
                  required
                >
                  <option value="">-- Pilih Tujuan Penyetoran --</option>
                  {wasteBanks.map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.nama} ({bank.wilayah?.kota || bank.daerah})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Rincian Sampah (Dinamis) */}
              <div className="bg-woc-dark border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-end mb-4">
                    <label className="text-xs font-bold text-woc-tosca uppercase flex items-center gap-2">
                        <Scale size={14}/> Rincian Sampah
                    </label>
                    <div className="text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-700">
                        Total Estimasi: <span className="text-white font-bold">{totals.weight} Kg</span>
                    </div>
                </div>

                <div className="space-y-3">
                    {wasteItems.map((item, index) => (
                        <div key={item.id} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-slate-900/30 p-3 rounded-xl border border-slate-800 animate-fade-in">
                            <span className="text-xs text-slate-500 w-6 font-mono hidden md:block">{index + 1}.</span>
                            
                            {/* Kategori */}
                            <select 
                                value={item.categoryId}
                                onChange={(e) => updateItem(item.id, 'categoryId', e.target.value)}
                                className="input-compact !py-2 !text-xs flex-1 cursor-pointer"
                                required
                            >
                                <option value="">Pilih Kategori</option>
                                {Object.values(WASTE_CATEGORIES).map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                                ))}
                            </select>

                            {/* Sub Jenis */}
                            <select 
                                value={item.typeId}
                                onChange={(e) => updateItem(item.id, 'typeId', e.target.value)}
                                className="input-compact !py-2 !text-xs flex-1 cursor-pointer disabled:opacity-30"
                                disabled={!item.categoryId}
                                required
                            >
                                <option value="">Pilih Jenis</option>
                                {item.categoryId && WASTE_CATEGORIES[item.categoryId].types.map(t => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                ))}
                            </select>

                            {/* Berat */}
                            <div className="relative w-full md:w-28">
                                <input 
                                    type="number" step="0.1" min="0.1"
                                    value={item.weight}
                                    onChange={(e) => updateItem(item.id, 'weight', e.target.value)}
                                    placeholder="Berat"
                                    className="input-compact !py-2 !text-xs pr-8"
                                    required
                                />
                                <span className="absolute right-3 top-2 text-[10px] text-slate-500">Kg</span>
                            </div>

                            {/* Hapus Button */}
                            {wasteItems.length > 1 && (
                                <button type="button" onClick={() => handleRemoveItem(item.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                    <Trash2 size={16}/>
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <button type="button" onClick={handleAddItem} className="mt-4 text-xs font-bold text-woc-tosca flex items-center gap-1 hover:underline">
                    <Plus size={14}/> Tambah Baris
                </button>
              </div>

              {/* 3. Alamat Jemput */}
              <div className="bg-woc-dark border border-slate-800 rounded-2xl p-6 shadow-xl">
                <label className="text-xs font-bold text-woc-tosca uppercase mb-3 flex items-center gap-2">
                  <MapPin size={14}/> Alamat Penjemputan
                </label>
                <div className="grid gap-3">
                   <select onChange={handleProvChange} className="input-compact cursor-pointer bg-slate-900/50" required>
                      <option value="">Pilih Provinsi</option>{provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                   <div className="grid grid-cols-2 gap-3">
                      <select onChange={handleRegChange} disabled={!selectedProvId} className="input-compact cursor-pointer bg-slate-900/50 disabled:opacity-30" required>
                        <option value="">Pilih Kota</option>{regencies.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      <select onChange={handleDistChange} disabled={!selectedRegId} className="input-compact cursor-pointer bg-slate-900/50 disabled:opacity-30" required>
                        <option value="">Pilih Kec</option>{districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                   </div>
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Mengirim..." : "Ajukan Penyetoran"} <Truck size={18}/>
                </Button>
              </div>

            </form>
          </div>

          {/* KOLOM KANAN: ESTIMASI & PETA (Span 5) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* KARTU ESTIMASI (Sticky Logic could be added here) */}
            <div className="bg-gradient-to-br from-slate-900 to-woc-darker border border-slate-700 p-6 rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 bg-woc-tosca/5 rounded-full blur-3xl -z-10"></div>
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Wallet size={16} className="text-emerald-400"/> Estimasi Perolehan
                </h3>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                        <span className="text-xs text-slate-400 flex items-center gap-2"><Coins size={14} className="text-yellow-500"/> Poin</span>
                        <span className="text-xl font-bold text-white">{totals.points} <small className="text-slate-500 text-xs">Pts</small></span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                        <span className="text-xs text-slate-400 flex items-center gap-2"><Wallet size={14} className="text-emerald-500"/> Uang Tunai</span>
                        <span className="text-xl font-bold text-emerald-400">{formatRupiah(totals.money)}</span>
                    </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3 items-start">
                    <AlertCircle size={16} className="text-blue-400 shrink-0 mt-0.5"/>
                    <p className="text-[10px] text-blue-300 leading-relaxed">
                        Ini adalah estimasi awal. Nilai final akan ditentukan oleh Bank Sampah setelah penimbangan dan pengecekan kualitas.
                    </p>
                </div>
            </div>

            {/* PETA */}
            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                    <label className="text-xs font-bold text-slate-400 uppercase">Peta Lokasi</label>
                    <button type="button" onClick={handleGetLocation} className="text-[10px] flex items-center gap-1 bg-woc-tosca/10 text-woc-tosca px-2 py-1 rounded hover:bg-woc-tosca hover:text-white transition-colors">
                        <Crosshair size={12}/> Lokasi Saya
                    </button>
                </div>
                <div className="h-[350px] w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 relative shadow-xl z-0">
                    <MapContainer center={pickupCoords} zoom={13} style={{ height: "100%", width: "100%" }}>
                        <TileLayer attribution='&copy; Google Maps' url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" />
                        <DraggableMarker />
                        <MapRecenter lat={pickupCoords.lat} lng={pickupCoords.lng} />
                        {wasteBanks.map((bank) => (
                            bank.location && (
                                <CircleMarker 
                                    key={bank.id} center={[bank.location.lat, bank.location.lng]} radius={10}
                                    pathOptions={{ color: selectedBankId === bank.id ? '#ffffff' : '#10b981', fillColor: '#10b981', fillOpacity: 0.8, weight: selectedBankId === bank.id ? 4 : 1 }}
                                    eventHandlers={{ click: () => setSelectedBankId(bank.id) }}
                                >
                                    <Popup>
                                        <div className="text-center"><strong className="block text-sm text-emerald-600">{bank.nama}</strong><span className="text-xs text-gray-600">{bank.wilayah?.kecamatan}</span><button className="mt-2 text-[10px] bg-emerald-500 text-white px-2 py-1 rounded w-full" onClick={() => setSelectedBankId(bank.id)}>Pilih Ini</button></div>
                                    </Popup>
                                </CircleMarker>
                            )
                        ))}
                    </MapContainer>
                </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}