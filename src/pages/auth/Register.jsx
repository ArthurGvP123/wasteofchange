import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { doc, setDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { PageTransition } from "../../components/AnimatedUI";
import { getProvinces, getRegencies, getDistricts } from "../../utils/apiWilayah";
import { UserPlus, ArrowRight, MapPin, CheckCircle2, ArrowLeft, User } from "lucide-react";
import { motion } from "framer-motion";

export default function Register() {
  const { signup, setAccountPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const googleUser = location.state?.googleUser;

  // --- STATE WILAYAH & FORM (SAMA) ---
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedProvId, setSelectedProvId] = useState("");
  const [selectedRegId, setSelectedRegId] = useState("");

  const [formData, setFormData] = useState({
    nama: googleUser?.displayName || "",
    email: googleUser?.email || "",
    password: "",
    noTelp: "",
    provinsi: "",
    kota: "",
    kecamatan: "",
    role: "pengguna"
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { getProvinces().then(setProvinces); }, []);

  // --- HANDLERS (SAMA) ---
  const handleProvinceChange = async (e) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedProvId(id); setSelectedRegId(""); setRegencies([]); setDistricts([]);
    setFormData(prev => ({ ...prev, provinsi: name !== "Pilih" ? name : "", kota: "", kecamatan: "" }));
    if (id) setRegencies(await getRegencies(id));
  };
  const handleRegencyChange = async (e) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedRegId(id); setDistricts([]);
    setFormData(prev => ({ ...prev, kota: name !== "Pilih" ? name : "", kecamatan: "" }));
    if (id) setDistricts(await getDistricts(id));
  };
  const handleDistrictChange = (e) => setFormData(prev => ({ ...prev, kecamatan: e.target.options[e.target.selectedIndex].text }));
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);

    if (!formData.provinsi || !formData.kota || !formData.kecamatan) { setError("Lengkapi wilayah."); setLoading(false); return; }
    if (formData.password.length < 6) { setError("Pass min 6 char."); setLoading(false); return; }

    try {
      let uid;
      if (googleUser) {
        if (auth.currentUser) {
           await setAccountPassword(auth.currentUser, formData.password);
           uid = auth.currentUser.uid;
        } else throw new Error("Sesi habis.");
      } else {
        const res = await signup(formData.email, formData.password);
        uid = res.user.uid;
      }

      await setDoc(doc(db, "users", uid), {
        nama: formData.nama,
        email: formData.email,
        noTelp: formData.noTelp,
        role: formData.role,
        wilayah: { provinsi: formData.provinsi, kota: formData.kota, kecamatan: formData.kecamatan },
        daerah: `${formData.kota}, ${formData.kecamatan}, ${formData.provinsi}`,
        afiliasiId: null,
        createdAt: new Date()
      });

      if (formData.role === 'pengelola') navigate("/manager/setup");
      else navigate("/");

    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-woc-darker overflow-hidden p-4 relative">
      
      {/* --- BACKGROUND ANIMATION --- */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -right-[20%] w-[80vw] h-[80vw] bg-gradient-to-b from-woc-tosca/10 to-transparent rounded-full blur-[100px]"
        />
        <motion.div 
          animate={{ x: [-50, 50, -50], y: [50, -50, 50] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]"
        />
      </div>

      {/* --- BACK BUTTON --- */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-slate-400 hover:text-white transition-all hover:-translate-x-1"
      >
        <div className="p-2 rounded-full bg-slate-800/50 backdrop-blur border border-slate-700 hover:border-woc-tosca">
           <ArrowLeft size={20} />
        </div>
        <span className="text-sm font-medium hidden sm:inline">Kembali</span>
      </Link>

      <PageTransition className="w-full max-w-4xl z-10 relative">
        
        {/* Container Form dengan Glassmorphism */}
        <form onSubmit={handleSubmit} className="bg-woc-dark/60 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] backdrop-blur-xl">
          
          {/* KOLOM KIRI */}
          <div className="w-full md:w-1/2 p-5 border-r border-slate-700/50 flex flex-col justify-center bg-slate-900/30">
            <div className="mb-4">
               <h1 className="text-xl font-bold text-white flex items-center gap-2">
                 <UserPlus className="text-woc-tosca" size={24}/>
                 {googleUser ? "Lengkapi Profil" : "Daftar Akun"}
               </h1>
               <p className="text-slate-400 text-xs ml-8">Bergabung bersama komunitas kami.</p>
            </div>

            {error && <div className="mb-3 p-2 bg-red-500/10 text-red-500 text-xs rounded border border-red-500/10 text-center">{error}</div>}

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Nama Lengkap</label>
                <input name="nama" value={formData.nama} onChange={handleChange} required className="input-compact bg-slate-900/50" placeholder="Nama Anda" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Email</label>
                  <input name="email" value={formData.email} onChange={handleChange} disabled={!!googleUser} required className={`input-compact bg-slate-900/50 ${googleUser && 'opacity-50'}`} />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">No. Telp</label>
                  <input name="noTelp" type="tel" value={formData.noTelp} onChange={handleChange} required className="input-compact bg-slate-900/50" placeholder="08..." />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Password {googleUser && "(Manual)"}</label>
                <input name="password" type="password" onChange={handleChange} required className="input-compact bg-slate-900/50" placeholder="••••••••" />
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold mb-2 block">Daftar Sebagai</label>
                <div className="grid grid-cols-2 gap-3">
                  {['pengguna', 'pengelola'].map((r) => (
                    <div 
                      key={r}
                      onClick={() => setFormData({...formData, role: r})}
                      className={`cursor-pointer px-3 py-2 rounded border text-center text-xs capitalize transition-all relative ${formData.role === r ? 'border-woc-tosca bg-woc-tosca/20 text-woc-tosca font-bold' : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-500'}`}
                    >
                      {r}
                      {formData.role === r && <CheckCircle2 size={14} className="absolute top-1.5 right-1.5 text-woc-tosca" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {!googleUser && (
              <p className="mt-4 text-center text-slate-400 text-xs">
                Sudah punya akun? <Link to="/login" className="text-woc-tosca hover:underline">Login</Link>
              </p>
            )}
          </div>

          {/* KOLOM KANAN */}
          <div className="w-full md:w-1/2 p-5 bg-slate-800/20 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-woc-tosca mb-4">
              <MapPin size={18} /> <span className="text-sm font-bold uppercase">Lokasi Domisili</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Provinsi</label>
                <select onChange={handleProvinceChange} className="input-compact cursor-pointer bg-slate-900/50">
                  <option value="">Pilih Provinsi</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Kota/Kab</label>
                  <select onChange={handleRegencyChange} disabled={!selectedProvId} className="input-compact cursor-pointer disabled:opacity-30 bg-slate-900/50">
                    <option value="">Pilih</option>
                    {regencies.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-bold mb-1 block">Kecamatan</label>
                  <select onChange={handleDistrictChange} disabled={!selectedRegId} className="input-compact cursor-pointer disabled:opacity-30 bg-slate-900/50">
                    <option value="">Pilih</option>
                    {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-slate-700/50">
              <button type="submit" disabled={loading} className="btn-compact bg-woc-tosca text-woc-darker hover:bg-woc-toscaHover shadow-lg shadow-woc-tosca/10">
                {loading ? "Menyimpan..." : "Daftar Sekarang"} <ArrowRight size={16} />
              </button>
              <p className="mt-3 text-center text-[10px] text-slate-500 leading-tight">
                Dengan mendaftar, Anda menyetujui kebijakan privasi Waste of Change.
              </p>
            </div>
          </div>

        </form>
      </PageTransition>
    </div>
  );
}