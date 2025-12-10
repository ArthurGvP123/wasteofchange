import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import Navbar from "../../components/Navbar";
import SuccessModal from "../../components/SuccessModal";
import { PageTransition, Button } from "../../components/AnimatedUI";
import { getProvinces, getRegencies, getDistricts } from "../../utils/apiWilayah";
import { Truck, MapPin, Scale, ArrowLeft, Building2, Crosshair, Calendar } from "lucide-react";

// --- MAP IMPORTS ---
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --- KONFIGURASI ICON MERAH (CUSTOM) ---
const RedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper: Pindah kamera peta
function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function SetorSampah() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // State Data
  const [loading, setLoading] = useState(false);
  const [wasteBanks, setWasteBanks] = useState([]);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  // Form State
  const [weight, setWeight] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [pickupCoords, setPickupCoords] = useState({ lat: -6.175392, lng: 106.827153 }); // Default Monas
  
  // Address State
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [addrData, setAddrData] = useState({ provinsi: "", kota: "", kecamatan: "" });
  const [selectedProvId, setSelectedProvId] = useState("");
  const [selectedRegId, setSelectedRegId] = useState("");

  // 1. Fetch Data Awal
  useEffect(() => {
    const initData = async () => {
      getProvinces().then(setProvinces);

      try {
        const querySnapshot = await getDocs(collection(db, "affiliations"));
        const banks = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setWasteBanks(banks);
      } catch (err) {
        console.error("Gagal ambil bank sampah", err);
      }
    };
    initData();
  }, [currentUser]);

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

  // --- MAPS HANDLERS ---
  
  // Marker User (Draggable) - Menggunakan RedIcon
  const DraggableMarker = () => {
    const markerRef = useRef(null);
    const eventHandlers = useMemo(() => ({
        dragend() {
          const marker = markerRef.current;
          if (marker != null) {
            const { lat, lng } = marker.getLatLng();
            setPickupCoords({ lat, lng });
          }
        },
      }), []);

    return (
      <Marker 
        draggable={true} 
        eventHandlers={eventHandlers} 
        position={pickupCoords} 
        ref={markerRef}
        icon={RedIcon} // GANTI ICON JADI MERAH
      >
        <Popup>Titik Jemput (Geser sesuka hati)</Popup>
      </Marker>
    );
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
    if (!weight || weight <= 0) { alert("Masukkan estimasi berat yang valid!"); setLoading(false); return; }
    if (!addrData.provinsi || !addrData.kota || !addrData.kecamatan) { alert("Lengkapi alamat penjemputan!"); setLoading(false); return; }

    try {
      const alamatLengkap = `${addrData.kecamatan}, ${addrData.kota}, ${addrData.provinsi}`;
      
      await addDoc(collection(db, "deposits"), {
        userId: currentUser.uid,
        userName: currentUser.displayName || "Pengguna",
        userEmail: currentUser.email,
        afiliasiId: selectedBankId,
        estimasiBerat: parseFloat(weight),
        pickupLocation: pickupCoords,
        alamatJemput: alamatLengkap,
        wilayahJemput: addrData,
        status: "pending",
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
        message="Permintaan penyetoran sampah Anda telah dikirim ke Bank Sampah. Pantau statusnya di halaman Riwayat." 
      />

      <main className="pt-24 pb-10 max-w-6xl mx-auto px-4 md:px-6">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Ajukan Penyetoran</h1>
              <p className="text-slate-400 text-sm">Isi formulir untuk penjemputan sampah.</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-lg border border-slate-800 text-xs text-slate-400">
            <Calendar size={14}/> {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* KOLOM KIRI: FORM INPUT (Span 5) */}
          <div className="lg:col-span-5 space-y-6">
            <form onSubmit={handleSubmit} className="bg-woc-dark border border-slate-800 rounded-2xl p-6 shadow-xl">
              
              {/* 1. Pilih Bank Sampah */}
              <div className="mb-6">
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
                <p className="text-[10px] text-slate-500 mt-2">
                  Tips: Anda juga bisa memilih Bank Sampah dengan mengklik titik hijau di peta.
                </p>
              </div>

              {/* 2. Estimasi Berat */}
              <div className="mb-6">
                <label className="text-xs font-bold text-woc-tosca uppercase mb-2 flex items-center gap-2">
                  <Scale size={14}/> Estimasi Berat (Kg)
                </label>
                <input 
                  type="number" 
                  min="0.1" 
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="input-compact bg-slate-900/50 p-3"
                  placeholder="Contoh: 2.5"
                  required
                />
              </div>

              {/* 3. Alamat Jemput */}
              <div className="mb-6 space-y-3">
                <label className="text-xs font-bold text-woc-tosca uppercase flex items-center gap-2">
                  <MapPin size={14}/> Alamat Penjemputan
                </label>
                
                {/* Dropdowns */}
                <div>
                   <select onChange={handleProvChange} className="input-compact cursor-pointer bg-slate-900/50 mb-2" required>
                      <option value="">Pilih Provinsi</option>{provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                   <div className="grid grid-cols-2 gap-2">
                      <select onChange={handleRegChange} disabled={!selectedProvId} className="input-compact cursor-pointer bg-slate-900/50 disabled:opacity-30" required>
                        <option value="">Pilih Kota</option>{regencies.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      <select onChange={handleDistChange} disabled={!selectedRegId} className="input-compact cursor-pointer bg-slate-900/50 disabled:opacity-30" required>
                        <option value="">Pilih Kec</option>{districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                   </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Mengirim..." : "Ajukan Penyetoran"} <Truck size={18}/>
                </Button>
              </div>

            </form>
          </div>

          {/* KOLOM KANAN: PETA (Span 7) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400">
                <span className="font-bold text-white">Legenda:</span> 
                <span className="ml-2 mr-1">🔴 Anda</span> | 
                <span className="ml-2">🟢 Bank Sampah</span>
              </div>
              <button 
                type="button" 
                onClick={handleGetLocation}
                className="text-[10px] flex items-center gap-1 bg-woc-tosca/10 text-woc-tosca px-3 py-1.5 rounded hover:bg-woc-tosca hover:text-white transition-colors font-bold"
              >
                <Crosshair size={12}/> Lokasi Saya
              </button>
            </div>

            {/* PERBAIKAN Z-INDEX DI SINI:
                Menambahkan class 'z-0' pada container pembungkus MapContainer.
                Ini memastikan peta berada di bawah Navbar (z-50) dan Modal (z-60+).
            */}
            <div className="h-[500px] w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 relative shadow-2xl z-0">
              <MapContainer center={pickupCoords} zoom={13} style={{ height: "100%", width: "100%" }}>
                
                <TileLayer
                  attribution='&copy; Google Maps'
                  url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                />
                
                <DraggableMarker />
                <MapRecenter lat={pickupCoords.lat} lng={pickupCoords.lng} />

                {/* Marker Bank Sampah */}
                {wasteBanks.map((bank) => (
                  bank.location && (
                    <CircleMarker 
                      key={bank.id}
                      center={[bank.location.lat, bank.location.lng]}
                      radius={10}
                      pathOptions={{ 
                        color: selectedBankId === bank.id ? '#ffffff' : '#10b981',
                        fillColor: '#10b981', 
                        fillOpacity: 0.8,
                        weight: selectedBankId === bank.id ? 4 : 1
                      }}
                      eventHandlers={{
                        click: () => {
                          setSelectedBankId(bank.id);
                        },
                      }}
                    >
                      <Popup>
                        <div className="text-center">
                          <strong className="block text-sm text-emerald-600 font-bold">{bank.nama}</strong>
                          <span className="text-xs text-gray-600">{bank.wilayah?.kecamatan}, {bank.wilayah?.kota}</span>
                          <button 
                            className="mt-2 text-[10px] bg-emerald-500 text-white px-2 py-1 rounded w-full"
                            onClick={() => setSelectedBankId(bank.id)}
                          >
                            Pilih Lokasi Ini
                          </button>
                        </div>
                      </Popup>
                    </CircleMarker>
                  )
                ))}

              </MapContainer>
              
              <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white text-xs p-3 rounded-lg backdrop-blur-sm z-[1000] text-center border border-white/10 pointer-events-none">
                Geser pin <span className="text-red-400 font-bold">Merah</span> ke titik penjemputan Anda. <br/>
                Klik lingkaran <span className="text-emerald-400 font-bold">Hijau</span> untuk memilih Bank Sampah.
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}