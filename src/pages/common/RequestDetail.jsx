import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { doc, getDoc, updateDoc, runTransaction, increment } from "firebase/firestore";
import { db } from "../../firebase";
import Navbar from "../../components/Navbar";
import SuccessModal from "../../components/SuccessModal";
import ConfirmModal from "../../components/ConfirmModal";
import { Button } from "../../components/AnimatedUI";
import { ArrowLeft, Calendar, MapPin, Scale, User, Building2, Clock, CheckCircle, Truck, MessageCircle, AlertTriangle, Check, Coins, Wallet, Save, Banknote, List } from "lucide-react";

// --- MAP IMPORTS ---
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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

const GreenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapBounds({ pickup, dropoff }) {
  const map = useMap();
  useEffect(() => {
    if (pickup && dropoff) {
      const bounds = L.latLngBounds([pickup, dropoff]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (pickup) {
      map.setView(pickup, 13);
    }
  }, [pickup, dropoff, map]);
  return null;
}

const formatRupiah = (number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(number);
};

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();
  
  const [data, setData] = useState(null);
  const [affiliateData, setAffiliateData] = useState(null);
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(true);

  // Reward States
  const [inputPoints, setInputPoints] = useState(0);
  const [inputAmount, setInputAmount] = useState(0);

  // Logic States
  const [selectedProgress, setSelectedProgress] = useState("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [successTitle, setSuccessTitle] = useState("Berhasil!");

  const progressOptions = [
    { value: "persiapan", label: "Proses Persiapan" },
    { value: "penjemputan", label: "Proses Penjemputan" },
    { value: "konfirmasi", label: "Selesai & Menunggu Konfirmasi User" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, "deposits", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) { alert("Data tidak ditemukan"); navigate(-1); return; }
        
        const depositData = docSnap.data();
        setData(depositData);
        setSelectedProgress(depositData.progressStep || "persiapan");
        
        // Auto-fill input reward dengan estimasi sistem jika belum ada reward manual
        // Namun, jika sudah ada reward manual (disimpan pengelola), gunakan itu.
        const currentPoints = depositData.rewardPoints !== undefined ? depositData.rewardPoints : (depositData.estimasiPoin || 0);
        const currentAmount = depositData.rewardAmount !== undefined ? depositData.rewardAmount : (depositData.estimasiUang || 0);
        
        setInputPoints(currentPoints);
        setInputAmount(currentAmount);

        if (depositData.afiliasiId) {
          const affSnap = await getDoc(doc(db, "affiliations", depositData.afiliasiId));
          if (affSnap.exists()) {
            const affData = affSnap.data();
            setAffiliateData(affData);

            if (userRole === 'pengguna') {
              const managerSnap = await getDoc(doc(db, "users", affData.createdBy));
              if (managerSnap.exists()) setContactPhone(managerSnap.data().noTelp);
            } else {
              const userSnap = await getDoc(doc(db, "users", depositData.userId));
              if (userSnap.exists()) setContactPhone(userSnap.data().noTelp);
            }
          }
        }
      } catch (error) { console.error("Error:", error); }
      setLoading(false);
    };
    fetchData();
  }, [id, navigate, userRole]);

  const handleWhatsApp = () => {
    if (!contactPhone) return alert("Nomor telepon tidak tersedia.");
    let number = contactPhone.replace(/\D/g, ''); 
    if (number.startsWith('0')) number = '62' + number.slice(1);
    window.open(`https://wa.me/${number}?text=Halo, terkait penyetoran sampah ID: ${id}...`, '_blank');
  };

  const handleProgressChange = (e) => {
    const newVal = e.target.value;
    if (newVal === "konfirmasi") setIsConfirmModalOpen(true);
    else updateProgress(newVal);
  };

  const updateProgress = async (step) => {
    try {
      await updateDoc(doc(db, "deposits", id), { progressStep: step });
      setSelectedProgress(step);
      setData(prev => ({ ...prev, progressStep: step }));
      setIsConfirmModalOpen(false);
    } catch (err) { alert("Gagal update status."); }
  };

  const handleSaveRewards = async () => {
    try {
      await updateDoc(doc(db, "deposits", id), {
        rewardPoints: Number(inputPoints),
        rewardAmount: Number(inputAmount)
      });
      setData(prev => ({ ...prev, rewardPoints: Number(inputPoints), rewardAmount: Number(inputAmount) }));
      setSuccessTitle("Reward Disimpan!");
      setSuccessMessage("Rincian poin dan nominal berhasil disimpan.");
      setIsSuccessOpen(true);
    } catch (err) {
      alert("Gagal menyimpan reward.");
    }
  };

  const handleFinalize = async () => {
    try {
      setIsFinalizeModalOpen(false);
      setLoading(true);

      await runTransaction(db, async (transaction) => {
        const depositRef = doc(db, "deposits", id);
        const userRef = doc(db, "users", data.userId);

        const depositDoc = await transaction.get(depositRef);
        if (!depositDoc.exists()) throw "Deposit tidak ditemukan!";
        if (depositDoc.data().status === "completed") throw "Transaksi sudah selesai sebelumnya!";

        transaction.update(depositRef, { status: "completed", completedAt: new Date() });

        // Gunakan reward manual jika ada, jika tidak gunakan estimasi sistem
        const finalPoints = data.rewardPoints !== undefined ? Number(data.rewardPoints) : Number(data.estimasiPoin || 0);
        const finalAmount = data.rewardAmount !== undefined ? Number(data.rewardAmount) : Number(data.estimasiUang || 0);

        transaction.update(userRef, {
          totalPoints: increment(finalPoints),
          totalEarnings: increment(finalAmount)
        });
      });

      setData(prev => ({ ...prev, status: "completed" }));
      setSuccessTitle("Transaksi Selesai!");
      setSuccessMessage("Poin dan Saldo telah ditambahkan ke akun Anda.");
      setIsSuccessOpen(true);
    } catch (err) { 
      console.error(err);
      alert("Gagal menyelesaikan transaksi: " + err); 
    }
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-woc-darker flex items-center justify-center text-white">Memuat Detail...</div>;
  if (!data) return null;

  return (
    <div className="min-h-screen bg-woc-darker text-white font-sans">
      <Navbar />
      
      <SuccessModal isOpen={isSuccessOpen} onClose={() => setIsSuccessOpen(false)} title={successTitle} message={successMessage} />
      
      <ConfirmModal 
        isOpen={isConfirmModalOpen}
        onClose={() => { setIsConfirmModalOpen(false); setSelectedProgress(data.progressStep); }} 
        onConfirm={() => updateProgress("konfirmasi")}
        title="Ubah Status ke Menunggu Konfirmasi?"
        message="Pastikan sampah sudah diterima. Pengguna akan mendapatkan notifikasi untuk menyelesaikan transaksi."
        confirmText="Ya, Ubah Status"
      />

      <ConfirmModal 
        isOpen={isFinalizeModalOpen}
        onClose={() => setIsFinalizeModalOpen(false)}
        onConfirm={handleFinalize}
        title="Selesaikan Penyetoran?"
        message={`Anda akan menerima ${data.rewardPoints ?? data.estimasiPoin} Poin dan ${formatRupiah(data.rewardAmount ?? data.estimasiUang)}. Transaksi tidak bisa diubah setelah ini.`}
        confirmText="Ya, Terima & Selesai"
      />

      <main className="pt-24 pb-10 max-w-5xl mx-auto px-4 md:px-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} /> Kembali
          </button>
          
          <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 
            ${data.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : 
              data.status === 'on_progress' ? 'bg-blue-500/20 text-blue-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
            {data.status === 'completed' ? <CheckCircle size={16}/> : data.status === 'on_progress' ? <Truck size={16}/> : <Clock size={16}/>}
            {data.status === 'completed' ? "Transaksi Selesai" : data.status === 'on_progress' ? "Sedang Berjalan" : "Menunggu Konfirmasi"}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* KOLOM KIRI: INFO (Span 2) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* MAP SECTION */}
            <div className="bg-woc-dark border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="h-64 w-full relative z-0">
                <MapContainer center={[data.pickupLocation.lat, data.pickupLocation.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
                  <TileLayer attribution='&copy; Google Maps' url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" />
                  <Marker position={[data.pickupLocation.lat, data.pickupLocation.lng]} icon={RedIcon}><Popup>Lokasi Jemput (User)</Popup></Marker>
                  {affiliateData?.location && <Marker position={[affiliateData.location.lat, affiliateData.location.lng]} icon={GreenIcon}><Popup>Lokasi Bank Sampah</Popup></Marker>}
                  <MapBounds pickup={[data.pickupLocation.lat, data.pickupLocation.lng]} dropoff={affiliateData?.location ? [affiliateData.location.lat, affiliateData.location.lng] : null} />
                </MapContainer>
              </div>
              <div className="p-4 bg-slate-900/50 border-t border-slate-800">
                <p className="text-sm text-slate-300 flex items-start gap-2"><MapPin size={16} className="text-red-500 mt-0.5 shrink-0"/> {data.alamatJemput}</p>
              </div>
            </div>

            {/* DETAIL ITEMS SAMPAH (BARU) */}
            <div className="bg-woc-dark p-5 rounded-xl border border-slate-800">
                <label className="text-xs text-slate-500 font-bold uppercase mb-4 block flex items-center gap-2">
                    <List size={14}/> Rincian Item Sampah
                </label>
                
                {data.wasteItems && data.wasteItems.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Jenis Sampah</th>
                                    <th className="px-4 py-3 text-right">Berat</th>
                                    <th className="px-4 py-3 text-right text-emerald-500">Est. Uang</th>
                                    <th className="px-4 py-3 text-right text-yellow-500 rounded-r-lg">Est. Poin</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {data.wasteItems.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-800/30">
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-white">{item.typeLabel}</p>
                                            <p className="text-[10px] text-slate-500">{item.categoryLabel}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-slate-300">{item.weight} Kg</td>
                                        <td className="px-4 py-3 text-right font-mono text-emerald-400">{formatRupiah(item.estMoney)}</td>
                                        <td className="px-4 py-3 text-right font-mono text-yellow-400">{item.estPoints}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-800/30 font-bold text-white border-t-2 border-slate-700">
                                <tr>
                                    <td className="px-4 py-3">Total Estimasi</td>
                                    <td className="px-4 py-3 text-right">{data.estimasiBerat} Kg</td>
                                    <td className="px-4 py-3 text-right text-emerald-400">{formatRupiah(data.estimasiUang || 0)}</td>
                                    <td className="px-4 py-3 text-right text-yellow-400">{data.estimasiPoin || 0}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    // Fallback untuk data lama (hanya berat total)
                    <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-lg">
                        <span className="text-slate-400">Total Berat (Legacy)</span>
                        <span className="text-xl font-bold text-white">{data.estimasiBerat} Kg</span>
                    </div>
                )}
            </div>

            {/* INFO USER */}
            <div className="bg-woc-dark p-5 rounded-xl border border-slate-800">
                <label className="text-xs text-slate-500 font-bold uppercase mb-2 block flex items-center gap-2"><User size={14}/> Pengaju</label>
                <div className="flex justify-between items-center">
                    <div>
                        <p className="font-bold text-white">{data.userName}</p>
                        <p className="text-sm text-slate-400">{data.userEmail}</p>
                    </div>
                    <Button onClick={handleWhatsApp} variant="outline" className="!w-auto !py-2 !px-4 !text-xs border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10">
                        <MessageCircle size={14}/> WhatsApp
                    </Button>
                </div>
            </div>

            {/* SEKSI REWARD */}
            <div className="bg-gradient-to-r from-slate-900 to-woc-darker p-6 rounded-xl border border-yellow-500/20 shadow-lg">
              <h3 className="text-yellow-500 font-bold mb-4 flex items-center gap-2"><Coins size={20}/> Reward Final</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Total Poin Diterima</p>
                  <p className="text-2xl font-bold text-white">
                    {data.rewardPoints !== undefined ? data.rewardPoints : (data.estimasiPoin || 0)} 
                    <span className="text-xs font-normal text-slate-500 ml-1">Pts</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Total Uang Diterima</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatRupiah(data.rewardAmount !== undefined ? data.rewardAmount : (data.estimasiUang || 0))}
                  </p>
                </div>
              </div>
              {data.status !== 'completed' && (
                <p className="text-[10px] text-slate-500 mt-4 italic">*Poin dan Saldo akan masuk ke akun setelah transaksi diselesaikan.</p>
              )}
            </div>

          </div>

          {/* KOLOM KANAN: KONTROL STATUS (Span 1) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* KONTROL PENGELOLA */}
            {userRole === 'pengelola' && data.status === 'on_progress' && (
              <div className="space-y-6">
                {/* 1. Form Input Reward */}
                <div className="bg-woc-dark border border-slate-700 p-5 rounded-2xl shadow-lg">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm"><Banknote size={16} className="text-emerald-400"/> Input Reward Real</h3>
                  <p className="text-[10px] text-slate-400 mb-4">
                    Masukkan nilai final jika berbeda dari estimasi sistem (misal: karena berat bersih berbeda).
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-slate-400 mb-1 block">Skor Poin</label>
                      <input type="number" value={inputPoints} onChange={(e) => setInputPoints(e.target.value)} className="input-compact" placeholder="0" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 mb-1 block">Nominal Uang (Rp)</label>
                      <input type="number" value={inputAmount} onChange={(e) => setInputAmount(e.target.value)} className="input-compact" placeholder="0" />
                    </div>
                    <Button onClick={handleSaveRewards} className="w-full !py-2 !text-xs shadow-none bg-slate-800 hover:bg-slate-700">
                      Simpan Reward <Save size={14}/>
                    </Button>
                  </div>
                </div>

                {/* 2. Update Status */}
                <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-2xl">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-sm"><Truck size={16} className="text-blue-400"/> Update Progress</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-slate-400 mb-1 block">Status Pengerjaan</label>
                      <select value={selectedProgress} onChange={handleProgressChange} className="w-full p-3 rounded-lg bg-slate-900 border border-slate-600 text-white outline-none focus:border-blue-500 text-sm">
                        {progressOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    {selectedProgress === 'konfirmasi' && (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-200 flex gap-2 items-start">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5"/> Menunggu pengguna menekan tombol selesai.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* KONTROL PENGGUNA */}
            {userRole === 'pengguna' && data.status === 'on_progress' && (
              <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-2xl">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Clock size={18} className="text-blue-400"/> Status Terkini</h3>
                <div className="space-y-4 mb-6">
                  {progressOptions.map((opt, idx) => {
                    const currentIdx = progressOptions.findIndex(o => o.value === (data.progressStep || 'persiapan'));
                    const isActive = idx <= currentIdx;
                    return (
                      <div key={opt.value} className={`flex items-center gap-3 ${isActive ? 'text-white' : 'text-slate-600'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border ${isActive ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-600'}`}>{isActive ? <Check size={12}/> : idx + 1}</div>
                        <span className="text-xs font-medium">{opt.label}</span>
                      </div>
                    )
                  })}
                </div>
                {data.progressStep === 'konfirmasi' ? (
                  <Button onClick={() => setIsFinalizeModalOpen(true)} className="w-full shadow-lg shadow-emerald-500/20">Selesaikan Penyetoran <CheckCircle size={18}/></Button>
                ) : (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 text-center">Menunggu update dari pengelola...</div>
                )}
              </div>
            )}

            {/* CARD BANK SAMPAH INFO */}
            <div className="bg-woc-dark border border-slate-800 p-5 rounded-2xl">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Tujuan Penyetoran</h3>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400"><Building2 size={20}/></div>
                <div><p className="font-bold text-white">{affiliateData?.nama}</p><p className="text-xs text-slate-400">{affiliateData?.daerah}</p></div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}