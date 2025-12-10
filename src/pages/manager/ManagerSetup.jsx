import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../firebase";
import { ADMIN_SECRET_KEY, generateAffiliateID } from "../../config/adminConfig"; 
import { PageTransition, Button } from "../../components/AnimatedUI";
import { getProvinces, getRegencies, getDistricts } from "../../utils/apiWilayah";
import { Building2, Plus, Key, MapPin, Users, ArrowRight, ShieldCheck, Crosshair } from "lucide-react";

// --- IMPORTS UNTUK MAPS ---
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css"; // Pastikan CSS Leaflet terimport

// Fix icon marker default leaflet
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: iconMarker,
    iconRetinaUrl: iconRetina,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Komponen Helper: Recenter Map
function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function ManagerSetup() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // State Wilayah API
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedProvId, setSelectedProvId] = useState("");
  const [selectedRegId, setSelectedRegId] = useState("");

  // State Koordinat (Default Jakarta)
  const [coordinates, setCoordinates] = useState({ lat: -6.175392, lng: 106.827153 });

  // Form States
  const [formData, setFormData] = useState({
    nama: "",
    provinsi: "",
    kota: "",
    kecamatan: "",
    adminPass: "",
    joinId: ""
  });

  useEffect(() => {
    getProvinces().then(setProvinces);
  }, []);

  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  // --- HANDLERS MAPS & GPS ---
  const DraggableMarker = () => {
    const markerRef = useRef(null);
    const eventHandlers = useMemo(
      () => ({
        dragend() {
          const marker = markerRef.current;
          if (marker != null) {
            const { lat, lng } = marker.getLatLng();
            setCoordinates({ lat, lng });
          }
        },
      }),
      [],
    );

    return (
      <Marker
        draggable={true}
        eventHandlers={eventHandlers}
        position={coordinates}
        ref={markerRef}
      >
        <Popup>Lokasi Bank Sampah</Popup>
      </Marker>
    );
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser tidak mendukung Geolocation.");
      return;
    }
    document.body.style.cursor = "wait";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        document.body.style.cursor = "default";
      },
      (error) => {
        console.error(error);
        alert("Gagal mengambil lokasi. Pastikan GPS aktif.");
        document.body.style.cursor = "default";
      }
    );
  };

  // --- HANDLERS DROPDOWN ---
  const handleProvinceChange = async (e) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedProvId(id); setSelectedRegId(""); setRegencies([]); setDistricts([]);
    setFormData(prev => ({ ...prev, provinsi: name !== "Pilih Provinsi" ? name : "", kota: "", kecamatan: "" }));
    if (id) setRegencies(await getRegencies(id));
  };

  const handleRegencyChange = async (e) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedRegId(id); setDistricts([]);
    setFormData(prev => ({ ...prev, kota: name !== "Pilih Kota/Kab" ? name : "", kecamatan: "" }));
    if (id) setDistricts(await getDistricts(id));
  };

  const handleDistrictChange = (e) => {
    setFormData(prev => ({ ...prev, kecamatan: e.target.options[e.target.selectedIndex].text }));
  };

  // --- LOGIKA BUAT AFILIASI BARU ---
  const handleCreate = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);

    if (formData.adminPass !== ADMIN_SECRET_KEY) {
      setError("Kode rahasia admin salah!");
      setLoading(false); return;
    }

    if (!formData.provinsi || !formData.kota || !formData.kecamatan) {
      setError("Mohon lengkapi data wilayah administrasi.");
      setLoading(false); return;
    }

    try {
      const newID = generateAffiliateID();
      // Format baru: Kecamatan, Kota, Provinsi
      const daerahLengkap = `${formData.kecamatan}, ${formData.kota}, ${formData.provinsi}`;

      await setDoc(doc(db, "affiliations", newID), {
        id: newID,
        nama: formData.nama,
        daerah: daerahLengkap,
        wilayah: {
          provinsi: formData.provinsi,
          kota: formData.kota,
          kecamatan: formData.kecamatan
        },
        location: coordinates, // SIMPAN KOORDINAT
        createdBy: currentUser.uid,
        members: [currentUser.uid],
        createdAt: new Date()
      });

      await updateDoc(doc(db, "users", currentUser.uid), {
        afiliasiId: newID
      });

      navigate("/manager/dashboard"); 
    } catch (err) {
      console.error(err);
      setError("Gagal membuat afiliasi.");
    }
    setLoading(false);
  };

  // --- LOGIKA GABUNG ---
  const handleJoin = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const targetID = formData.joinId.toUpperCase();
      const affRef = doc(db, "affiliations", targetID);
      const affSnap = await getDoc(affRef);

      if (!affSnap.exists()) {
        setError("ID Afiliasi tidak ditemukan.");
        setLoading(false); return;
      }

      await updateDoc(affRef, { members: arrayUnion(currentUser.uid) });
      await updateDoc(doc(db, "users", currentUser.uid), { afiliasiId: targetID });

      navigate("/manager/dashboard");
    } catch (err) {
      console.error(err);
      setError("Gagal bergabung.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-woc-darker flex items-center justify-center p-4">
      {/* Menggunakan max-w-4xl agar muat layout 2 kolom jika di layar besar */}
      <PageTransition className="w-full max-w-4xl pt-20"> 
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Setup Pengelola</h1>
          <p className="text-slate-400">Anda belum terhubung dengan Bank Sampah manapun.</p>
        </div>

        <div className="bg-woc-dark border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          
          {/* Tab Header */}
          <div className="flex border-b border-slate-800">
            <button 
              onClick={() => setActiveTab("create")}
              className={`flex-1 py-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${activeTab === "create" ? "bg-woc-tosca/10 text-woc-tosca border-b-2 border-woc-tosca" : "text-slate-400 hover:text-white"}`}
            >
              <Plus size={18} /> Buat Baru
            </button>
            <button 
              onClick={() => setActiveTab("join")}
              className={`flex-1 py-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${activeTab === "join" ? "bg-woc-tosca/10 text-woc-tosca border-b-2 border-woc-tosca" : "text-slate-400 hover:text-white"}`}
            >
              <Users size={18} /> Gabung Tim
            </button>
          </div>

          <div className="p-6 md:p-8">
            {error && <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-center text-sm">{error}</div>}

            {/* --- FORM BUAT BARU --- */}
            {activeTab === "create" && (
              <form onSubmit={handleCreate} className="space-y-6">
                
                {/* Peringatan Admin */}
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg flex gap-3 items-start">
                  <ShieldCheck className="text-yellow-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="text-yellow-500 font-bold text-sm">Butuh Akses Admin</h4>
                    <p className="text-slate-400 text-xs mt-1">Hanya admin terverifikasi yang boleh membuat Bank Sampah baru.</p>
                  </div>
                </div>

                {/* Nama Afiliasi */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Nama Bank Sampah</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 text-slate-500" size={18} />
                    <input name="nama" value={formData.nama} onChange={handleChange} required className="w-full pl-10 p-3 bg-woc-darker rounded-lg border border-slate-700 text-white focus:border-woc-tosca outline-none" placeholder="Contoh: Bank Sampah Jaya" />
                  </div>
                </div>

                {/* GRID: Detail Alamat (Kiri) & Peta (Kanan) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* KOLOM KIRI: Dropdown */}
                  <div className="bg-slate-900/30 p-5 rounded-xl border border-dashed border-slate-700 h-fit">
                    <p className="text-xs text-woc-tosca font-bold mb-4 uppercase flex items-center gap-2">
                      <MapPin size={14}/> Detail Alamat
                    </p>
                    <div className="space-y-4">
                      <div>
                         <label className="text-[10px] text-slate-400 mb-1 block">Provinsi</label>
                         <select onChange={handleProvinceChange} className="input-compact cursor-pointer"><option value="">Pilih Provinsi</option>{provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                      </div>
                      <div>
                         <label className="text-[10px] text-slate-400 mb-1 block">Kota/Kab</label>
                         <select onChange={handleRegencyChange} disabled={!selectedProvId} className="input-compact cursor-pointer disabled:opacity-30"><option value="">Pilih Kota/Kab</option>{regencies.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
                      </div>
                      <div>
                         <label className="text-[10px] text-slate-400 mb-1 block">Kecamatan</label>
                         <select onChange={handleDistrictChange} disabled={!selectedRegId} className="input-compact cursor-pointer disabled:opacity-30"><option value="">Pilih Kecamatan</option>{districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                      </div>
                    </div>
                  </div>

                  {/* KOLOM KANAN: Peta & GPS */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-slate-500 font-bold uppercase">Titik Lokasi (Wajib)</label>
                      <button 
                        type="button" 
                        onClick={handleGetLocation}
                        className="text-[10px] flex items-center gap-1 bg-woc-tosca/10 text-woc-tosca px-2 py-1 rounded hover:bg-woc-tosca hover:text-white transition-colors"
                      >
                        <Crosshair size={12}/> Ambil Lokasi Saya
                      </button>
                    </div>
                    
                    {/* MAP CONTAINER (Google Style) */}
                    <div className="h-64 rounded-xl overflow-hidden border border-slate-700 relative z-0">
                      <MapContainer center={coordinates} zoom={15} style={{ height: "100%", width: "100%" }}>
                        {/* TILE LAYER GOOGLE MAPS */}
                        <TileLayer
                          attribution='&copy; Google Maps'
                          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                        />
                        <DraggableMarker />
                        <MapRecenter lat={coordinates.lat} lng={coordinates.lng} />
                      </MapContainer>
                    </div>
                    <p className="text-[10px] text-slate-500 text-center">
                      Geser pin merah untuk titik lokasi yang lebih presisi.
                    </p>
                  </div>
                </div>

                {/* Kode Admin */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Kode Rahasia Admin</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 text-slate-500" size={18} />
                    <input name="adminPass" type="password" value={formData.adminPass} onChange={handleChange} required className="w-full pl-10 p-3 bg-woc-darker rounded-lg border border-slate-700 text-white focus:border-woc-tosca outline-none" placeholder="Masukkan kode..." />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Membuat..." : "Buat Afiliasi Baru"} <ArrowRight size={18}/>
                </Button>
              </form>
            )}

            {/* --- FORM GABUNG (SAMA) --- */}
            {activeTab === "join" && (
              <form onSubmit={handleJoin} className="space-y-5 max-w-md mx-auto py-10">
                <div className="text-center mb-6">
                  <p className="text-slate-400 text-sm">Masukkan 8 digit ID Afiliasi yang diberikan oleh ketua tim.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">ID Afiliasi</label>
                  <input 
                    name="joinId" 
                    value={formData.joinId} 
                    onChange={handleChange} 
                    required 
                    maxLength={8}
                    className="w-full p-4 bg-woc-darker rounded-lg border border-slate-700 text-white text-center text-2xl font-mono tracking-widest focus:border-woc-tosca outline-none uppercase" 
                    placeholder="XXXXXXXX" 
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? "Memproses..." : "Gabung Sekarang"} <ArrowRight size={18}/>
                </Button>
              </form>
            )}

          </div>
        </div>
      </PageTransition>
    </div>
  );
}