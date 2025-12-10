import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import SuccessModal from "../../components/SuccessModal";
import ConfirmModal from "../../components/ConfirmModal";
import { PageTransition, Button } from "../../components/AnimatedUI";
import { getProvinces, getRegencies, getDistricts } from "../../utils/apiWilayah";
import { Building2, MapPin, Save, X, Edit3, Copy, Check, LogOut, ArrowLeft, Crosshair } from "lucide-react";

// --- IMPORTS UNTUK MAPS ---
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

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

// Komponen Helper: Untuk memindahkan kamera peta saat lokasi berubah
function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export default function AffiliateManage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // State Data
  const [loading, setLoading] = useState(true);
  const [affiliateData, setAffiliateData] = useState(null);
  
  // UI States
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Form & Location States
  const [formData, setFormData] = useState({});
  // Default Koordinat (Jakarta Monas)
  const [coordinates, setCoordinates] = useState({ lat: -6.175392, lng: 106.827153 });
  
  // Dropdown States
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedProvId, setSelectedProvId] = useState("");
  const [selectedRegId, setSelectedRegId] = useState("");

  // 1. Fetch Data Afiliasi
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (currentUser) {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            if (userData.afiliasiId) {
              const affSnap = await getDoc(doc(db, "affiliations", userData.afiliasiId));
              if (affSnap.exists()) {
                const data = affSnap.data();
                setAffiliateData(data);
                
                // Setup Form
                setFormData({
                  nama: data.nama,
                  provinsi: data.wilayah?.provinsi || "",
                  kota: data.wilayah?.kota || "",
                  kecamatan: data.wilayah?.kecamatan || ""
                });

                // Setup Koordinat
                if (data.location) {
                  setCoordinates({ lat: data.location.lat, lng: data.location.lng });
                }
              } else {
                navigate("/manager/setup");
              }
            } else {
              navigate("/manager/setup");
            }
          }
        }
        const provData = await getProvinces();
        setProvinces(provData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, [currentUser, navigate]);

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
        <Popup>Lokasi Afiliasi</Popup>
      </Marker>
    );
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation tidak didukung browser ini.");
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
        alert("Gagal mengambil lokasi. Pastikan GPS aktif dan izin diberikan.");
        document.body.style.cursor = "default";
      }
    );
  };

  // --- HANDLERS DROPDOWN ---
  const handleProvChange = async (e) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedProvId(id); setSelectedRegId(""); setRegencies([]); setDistricts([]);
    setFormData(prev => ({ ...prev, provinsi: name, kota: "", kecamatan: "" }));
    if (id) setRegencies(await getRegencies(id));
  };

  const handleRegChange = async (e) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedRegId(id); setDistricts([]);
    setFormData(prev => ({ ...prev, kota: name, kecamatan: "" }));
    if (id) setDistricts(await getDistricts(id));
  };

  const handleDistChange = (e) => {
    setFormData(prev => ({ ...prev, kecamatan: e.target.options[e.target.selectedIndex].text }));
  };

  // --- ACTIONS ---
  const handleCopyID = () => {
    if (affiliateData?.id) {
      navigator.clipboard.writeText(affiliateData.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const affRef = doc(db, "affiliations", affiliateData.id);
      const daerahLengkap = `${formData.kecamatan}, ${formData.kota}, ${formData.provinsi}`;
      
      await updateDoc(affRef, {
        nama: formData.nama,
        daerah: daerahLengkap,
        wilayah: {
          provinsi: formData.provinsi,
          kota: formData.kota,
          kecamatan: formData.kecamatan
        },
        location: coordinates
      });

      setAffiliateData(prev => ({
        ...prev,
        nama: formData.nama,
        daerah: daerahLengkap,
        wilayah: { provinsi: formData.provinsi, kota: formData.kota, kecamatan: formData.kecamatan },
        location: coordinates
      }));

      setIsEditing(false);
      setIsSuccessOpen(true);
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan perubahan.");
    }
    setIsSaving(false);
  };

  const handleLeaveAffiliate = async () => {
    setIsLeaveModalOpen(false);
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "affiliations", affiliateData.id), {
        members: arrayRemove(currentUser.uid)
      });
      await updateDoc(doc(db, "users", currentUser.uid), {
        afiliasiId: null
      });
      navigate("/manager/setup");
    } catch (err) {
      console.error(err);
      alert("Gagal keluar dari afiliasi.");
    }
    setIsSaving(false);
  };

  if (loading) return <div className="min-h-screen bg-woc-darker flex items-center justify-center text-white">Memuat Data...</div>;

  return (
    <div className="min-h-screen bg-woc-darker text-white font-sans">
      <Navbar />
      
      <SuccessModal isOpen={isSuccessOpen} onClose={() => setIsSuccessOpen(false)} title="Berhasil!" message="Informasi Bank Sampah berhasil diperbarui." />
      
      <ConfirmModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onConfirm={handleLeaveAffiliate}
        title="Keluar dari Afiliasi?"
        message="Anda akan kehilangan akses ke data Bank Sampah ini."
        confirmText="Ya, Keluar"
        isDanger={true}
      />

      <main className="pt-24 pb-10 max-w-4xl mx-auto px-6">
        <PageTransition>
          
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Kelola Afiliasi</h1>
              <p className="text-slate-400 text-sm">Informasi Bank Sampah & Area Operasional</p>
            </div>
          </div>

          <div className="bg-woc-dark border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
            
            <div className="h-32 bg-gradient-to-r from-woc-tosca/20 to-emerald-500/20 relative">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
               <div className="absolute -bottom-10 left-8 p-4 bg-woc-darker rounded-2xl border border-slate-700 shadow-xl">
                  <Building2 size={40} className="text-woc-tosca" />
               </div>
            </div>

            <div className="pt-14 px-8 pb-8">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-1">{affiliateData?.nama}</h2>
                  <p className="text-slate-400 flex items-center gap-2">
                    <MapPin size={16} className="text-woc-tosca"/> 
                    {affiliateData?.wilayah 
                        ? `${affiliateData.wilayah.kecamatan}, ${affiliateData.wilayah.kota}, ${affiliateData.wilayah.provinsi}`
                        : affiliateData?.daerah}
                  </p>
                </div>

                {!isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-woc-tosca hover:text-white transition-all text-sm font-bold border border-slate-700"
                  >
                    <Edit3 size={16}/> Edit Data
                  </button>
                )}
              </div>

              <hr className="border-slate-800 mb-8"/>

              {isEditing ? (
                <form onSubmit={handleSave} className="space-y-6 animate-fade-in">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Nama Bank Sampah</label>
                    <input 
                      value={formData.nama}
                      onChange={(e) => setFormData({...formData, nama: e.target.value})}
                      className="input-compact bg-slate-900/50 p-4 text-lg"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* BAGIAN KIRI: Dropdown Wilayah */}
                    <div className="bg-slate-900/30 p-5 rounded-xl border border-dashed border-slate-700 h-fit">
                      <p className="text-xs text-woc-tosca font-bold mb-4 uppercase flex items-center gap-2">
                        <MapPin size={14}/> Detail Alamat
                      </p>
                      <div className="space-y-4">
                        <div>
                           <label className="text-[10px] text-slate-400 mb-1 block">Provinsi</label>
                           <select onChange={handleProvChange} className="input-compact cursor-pointer"><option value="">{formData.provinsi || "Pilih..."}</option>{provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                        </div>
                        <div>
                           <label className="text-[10px] text-slate-400 mb-1 block">Kota/Kab</label>
                           <select onChange={handleRegChange} disabled={!selectedProvId} className="input-compact cursor-pointer disabled:opacity-30"><option value="">{formData.kota || "Pilih..."}</option>{regencies.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
                        </div>
                        <div>
                           <label className="text-[10px] text-slate-400 mb-1 block">Kecamatan</label>
                           <select onChange={handleDistChange} disabled={!selectedRegId} className="input-compact cursor-pointer disabled:opacity-30"><option value="">{formData.kecamatan || "Pilih..."}</option>{districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                        </div>
                      </div>
                    </div>

                    {/* BAGIAN KANAN: Maps & GPS */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-xs text-slate-500 font-bold uppercase">Titik Lokasi (Wajib GPS)</label>
                        <button 
                          type="button" 
                          onClick={handleGetLocation}
                          className="text-[10px] flex items-center gap-1 bg-woc-tosca/10 text-woc-tosca px-2 py-1 rounded hover:bg-woc-tosca hover:text-white transition-colors"
                        >
                          <Crosshair size={12}/> Ambil Lokasi Saya
                        </button>
                      </div>
                      
                      {/* MAP CONTAINER DENGAN GOOGLE STREETS */}
                      <div className="h-64 rounded-xl overflow-hidden border border-slate-700 relative z-0">
                        <MapContainer center={coordinates} zoom={15} style={{ height: "100%", width: "100%" }}>
                          {/* MENGGUNAKAN TILE GOOGLE MAPS (Streets) */}
                          <TileLayer
                            attribution='&copy; Google Maps'
                            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                          />
                          <DraggableMarker />
                          <MapRecenter lat={coordinates.lat} lng={coordinates.lng} />
                        </MapContainer>
                      </div>
                      <p className="text-[10px] text-slate-500 text-center">
                        Geser pin merah untuk menyesuaikan lokasi tepat afiliasi.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                     <button 
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                     >
                        Batal
                     </button>
                     <Button type="submit" disabled={isSaving} className="!w-auto !py-2.5 !px-6 !text-sm">
                        {isSaving ? "Menyimpan..." : "Simpan Perubahan"} <Save size={16}/>
                     </Button>
                  </div>
                </form>
              ) : (
                // MODE VIEW
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                      <h3 className="text-slate-500 text-xs font-bold uppercase mb-2">ID Afiliasi</h3>
                      <div className="flex items-center gap-4">
                        <span className="text-3xl font-mono font-bold text-white tracking-widest">{affiliateData?.id}</span>
                        <button onClick={handleCopyID} className="p-2 rounded-lg bg-slate-800 hover:bg-woc-tosca hover:text-white text-slate-400 transition-all" title="Salin ID">
                          {copied ? <Check size={20}/> : <Copy size={20}/>}
                        </button>
                      </div>
                      {copied && <p className="text-emerald-500 text-xs mt-2 animate-pulse">Berhasil disalin!</p>}
                    </div>

                    <div className="bg-red-500/5 p-6 rounded-xl border border-red-500/10">
                      <h3 className="text-red-500 text-xs font-bold uppercase mb-2">Zona Bahaya</h3>
                      <p className="text-slate-400 text-sm mb-4">Keluar dari afiliasi ini akan menghapus akses Anda.</p>
                      <button onClick={() => setIsLeaveModalOpen(true)} className="w-full py-3 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white text-sm font-bold flex items-center justify-center gap-2 transition-all">
                        <LogOut size={16}/> Keluar dari Afiliasi
                      </button>
                    </div>
                  </div>

                  {/* READ ONLY MAP PREVIEW */}
                  <div className="h-64 rounded-xl overflow-hidden border border-slate-800 relative z-0 opacity-80 hover:opacity-100 transition-opacity">
                     <MapContainer 
                        center={affiliateData?.location || coordinates} 
                        zoom={15} 
                        style={{ height: "100%", width: "100%" }}
                        zoomControl={false}
                        dragging={false}
                        scrollWheelZoom={false}
                        doubleClickZoom={false}
                     >
                        {/* MENGGUNAKAN TILE GOOGLE MAPS (Streets) */}
                        <TileLayer
                            attribution='&copy; Google Maps'
                            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                        />
                        <Marker position={affiliateData?.location || coordinates} />
                     </MapContainer>
                     <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-[10px] text-slate-300 z-[1000]">
                        Preview Lokasi
                     </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </PageTransition>
      </main>
    </div>
  );
}