import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import SuccessModal from "../../components/SuccessModal";
import { PageTransition, Button } from "../../components/AnimatedUI";
import { getProvinces, getRegencies, getDistricts } from "../../utils/apiWilayah";
import { User, Mail, Phone, MapPin, Save, X, Edit3, Shield, Coins, Wallet } from "lucide-react"; // Tambah Coins & Wallet

// Helper Format Rupiah
const formatRupiah = (number) => {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(number);
};

export default function Profile() {
  const { currentUser } = useAuth();
  
  // State Data
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // UI States
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Form Data User
  const [formData, setFormData] = useState({});
  
  // Dropdown Wilayah
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedProvId, setSelectedProvId] = useState("");
  const [selectedRegId, setSelectedRegId] = useState("");

  // FETCH DATA
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (currentUser) {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            setFormData({
              nama: data.nama,
              noTelp: data.noTelp,
              provinsi: data.wilayah?.provinsi || "",
              kota: data.wilayah?.kota || "",
              kecamatan: data.wilayah?.kecamatan || ""
            });
          }
        }
        const provData = await getProvinces();
        setProvinces(provData);
      } catch (error) { console.error("Gagal ambil data:", error); }
      setLoading(false);
    };
    fetchData();
  }, [currentUser]);

  // HANDLERS
  const handleUserProvChange = async (e) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedProvId(id); setSelectedRegId(""); setRegencies([]); setDistricts([]);
    setFormData(prev => ({ ...prev, provinsi: name, kota: "", kecamatan: "" }));
    if (id) setRegencies(await getRegencies(id));
  };
  const handleUserRegChange = async (e) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedRegId(id); setDistricts([]);
    setFormData(prev => ({ ...prev, kota: name, kecamatan: "" }));
    if (id) setDistricts(await getDistricts(id));
  };
  const handleUserDistChange = (e) => setFormData(prev => ({ ...prev, kecamatan: e.target.options[e.target.selectedIndex].text }));

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const docRef = doc(db, "users", currentUser.uid);
      const daerahString = `${formData.kecamatan}, ${formData.kota}, ${formData.provinsi}`;
      
      await updateDoc(docRef, {
        nama: formData.nama,
        noTelp: formData.noTelp,
        wilayah: { provinsi: formData.provinsi, kota: formData.kota, kecamatan: formData.kecamatan },
        daerah: daerahString
      });
      setUserData({ ...userData, nama: formData.nama, noTelp: formData.noTelp, wilayah: { provinsi: formData.provinsi, kota: formData.kota, kecamatan: formData.kecamatan }, daerah: daerahString });
      setIsEditing(false);
      setSuccessMessage("Profil pribadi berhasil diperbarui.");
      setIsSuccessOpen(true);
    } catch (error) { alert("Gagal menyimpan data."); }
    setIsSaving(false);
  };

  if (loading) return <div className="min-h-screen bg-woc-darker flex items-center justify-center text-white">Memuat Data...</div>;

  return (
    <div className="min-h-screen bg-woc-darker text-white font-sans">
      <Navbar />
      <SuccessModal isOpen={isSuccessOpen} onClose={() => setIsSuccessOpen(false)} title="Berhasil!" message={successMessage} />

      <main className="pt-24 pb-10 max-w-4xl mx-auto px-4 md:px-6">
        <PageTransition>
          
          {/* --- BAGIAN BARU: STATISTIK AKUN (Hanya untuk Pengguna) --- */}
          {userData?.role === 'pengguna' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Card Poin */}
              <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 p-6 rounded-2xl border border-yellow-500/20 relative overflow-hidden group hover:border-yellow-500/40 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <Coins size={64} className="text-yellow-500"/>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-500"><Coins size={20}/></div>
                    <p className="text-yellow-500 font-bold text-xs uppercase tracking-wider">Total Poin WoC</p>
                  </div>
                  <h3 className="text-3xl font-extrabold text-white mt-1">
                    {userData.totalPoints || 0} 
                    <span className="text-sm font-normal text-slate-400 ml-1">Pts</span>
                  </h3>
                </div>
              </div>

              {/* Card Pendapatan */}
              <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-6 rounded-2xl border border-emerald-500/20 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <Wallet size={64} className="text-emerald-500"/>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-500"><Wallet size={20}/></div>
                    <p className="text-emerald-500 font-bold text-xs uppercase tracking-wider">Total Pendapatan</p>
                  </div>
                  <h3 className="text-3xl font-extrabold text-white mt-1">
                    {formatRupiah(userData.totalEarnings || 0)}
                  </h3>
                </div>
              </div>
            </div>
          )}

          {/* Header Profil */}
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-woc-tosca to-emerald-600 flex items-center justify-center text-4xl font-bold text-white shadow-2xl shadow-woc-tosca/20">
              {userData?.nama?.charAt(0).toUpperCase()}
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold mb-1">{userData?.nama}</h1>
              <div className="flex items-center justify-center md:justify-start gap-3 text-slate-400 text-sm">
                <span className="flex items-center gap-1"><Mail size={14}/> {userData?.email}</span>
                <span className="bg-woc-tosca/10 text-woc-tosca px-2 py-0.5 rounded text-xs uppercase font-bold tracking-wider border border-woc-tosca/20">{userData?.role}</span>
              </div>
            </div>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="md:ml-auto flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-all text-sm">
                <Edit3 size={16} /> Edit Profil
              </button>
            )}
          </div>

          {/* Form Profil */}
          <div className="bg-woc-dark border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-woc-tosca/5 rounded-full blur-3xl -z-10"></div>
            
            <form onSubmit={handleSaveUser}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                
                <div className="col-span-1 md:col-span-2 border-b border-slate-800 pb-2 mb-2">
                  <h3 className="text-woc-tosca font-bold flex items-center gap-2"><User size={18}/> Informasi Pribadi</h3>
                </div>

                <div>
                  <label className="text-xs text-slate-500 font-bold uppercase mb-2 block">Nama Lengkap</label>
                  {isEditing ? <input name="nama" value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} className="input-compact" required /> : <p className="text-lg font-medium">{userData?.nama}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold uppercase mb-2 flex items-center gap-1">Email <Shield size={10}/></label>
                  <input value={userData?.email} disabled className="input-compact opacity-50 cursor-not-allowed bg-slate-900/50 text-slate-400 border-none" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold uppercase mb-2 block">No. Telepon</label>
                  {isEditing ? <input name="noTelp" type="tel" value={formData.noTelp} onChange={(e) => setFormData({...formData, noTelp: e.target.value})} className="input-compact" required /> : <p className="text-lg font-medium flex items-center gap-2"><Phone size={16} className="text-slate-500"/> {userData?.noTelp}</p>}
                </div>

                <div className="col-span-1 md:col-span-2 border-b border-slate-800 pb-2 mb-2 mt-4">
                  <h3 className="text-woc-tosca font-bold flex items-center gap-2"><MapPin size={18}/> Alamat Domisili</h3>
                </div>

                {isEditing ? (
                  <div className="col-span-1 md:col-span-2 bg-slate-900/30 p-4 rounded-xl border border-dashed border-slate-700">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                           <label className="text-[10px] text-slate-400 mb-1 block">Provinsi</label>
                           <select onChange={handleUserProvChange} className="input-compact cursor-pointer"><option value="">{formData.provinsi || "Pilih..."}</option>{provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                        </div>
                        <div>
                           <label className="text-[10px] text-slate-400 mb-1 block">Kota/Kab</label>
                           <select onChange={handleUserRegChange} disabled={!selectedProvId} className="input-compact cursor-pointer disabled:opacity-30"><option value="">{formData.kota || "Pilih..."}</option>{regencies.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
                        </div>
                        <div>
                           <label className="text-[10px] text-slate-400 mb-1 block">Kecamatan</label>
                           <select onChange={handleUserDistChange} disabled={!selectedRegId} className="input-compact cursor-pointer disabled:opacity-30"><option value="">{formData.kecamatan || "Pilih..."}</option>{districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                        </div>
                      </div>
                  </div>
                ) : (
                  <div className="col-span-1 md:col-span-2">
                    <p className="text-lg font-medium">
                      {userData?.wilayah ? `${userData.wilayah.kecamatan}, ${userData.wilayah.kota}, ${userData.wilayah.provinsi}` : userData?.daerah}
                    </p>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-slate-800">
                  <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-2"><X size={18}/> Batal</button>
                  <Button type="submit" disabled={isSaving} className="!w-auto px-6">{isSaving ? "Menyimpan..." : "Simpan Perubahan"} <Save size={18}/></Button>
                </div>
              )}
            </form>
          </div>
        </PageTransition>
      </main>
    </div>
  );
}