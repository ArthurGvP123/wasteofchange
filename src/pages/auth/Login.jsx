import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { PageTransition } from "../../components/AnimatedUI";
import { Recycle, Mail, Lock, LogIn, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion"; // Import Framer Motion

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- LOGIC AUTH (SAMA SEPERTI SEBELUMNYA) ---
  const handleRoleRedirect = async (uid) => {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.role === 'pengelola') {
          if (data.afiliasiId) navigate("/manager/dashboard");
          else navigate("/manager/setup");
        } else {
          navigate("/"); 
        }
      } else {
        navigate("/");
      }
    } catch (err) {
      setError("Gagal memuat data pengguna.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    setError(""); setLoading(true);
    try {
      const res = await login(email, password);
      await handleRoleRedirect(res.user.uid);
    } catch (err) {
      setError("Email atau password tidak valid.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(""); setLoading(true);
    try {
      const result = await loginWithGoogle();
      const user = result.user;
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) {
        await handleRoleRedirect(user.uid);
      } else {
        navigate("/register", { state: { googleUser: { uid: user.uid, email: user.email, displayName: user.displayName } } });
      }
    } catch (err) {
      setError("Gagal login Google.");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-woc-darker overflow-hidden px-4 relative">
      
      {/* --- BACKGROUND ANIMATION --- */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        {/* Blob 1 (Tosca) */}
        <motion.div 
          animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-20 w-96 h-96 bg-woc-tosca/20 rounded-full blur-[100px]"
        />
        {/* Blob 2 (Emerald) */}
        <motion.div 
          animate={{ x: [0, -100, 0], y: [0, 50, 0], scale: [1, 1.5, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px]"
        />
        {/* Blob 3 (Center Blue) */}
        <motion.div 
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[100px]"
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
        <span className="text-sm font-medium">Kembali</span>
      </Link>

      {/* --- FORM CARD --- */}
      <PageTransition className="w-full max-w-sm z-10">
        <div className="bg-woc-dark/40 border border-slate-700/50 rounded-2xl p-6 shadow-2xl backdrop-blur-xl relative">
          
          {/* Efek Shine di Card */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl pointer-events-none"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-woc-tosca to-emerald-600 rounded-lg text-white shadow-lg shadow-woc-tosca/20">
                <Recycle size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white leading-tight">Waste of Change</h1>
                <p className="text-slate-400 text-xs">Selamat datang kembali</p>
              </div>
            </div>

            {error && <div className="mb-4 p-2 rounded bg-red-500/10 border border-red-500/20 text-red-500 text-xs text-center">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-woc-tosca transition-colors" size={16} />
                <input name="email" type="email" required className="input-compact pl-10 bg-slate-900/50 border-slate-700/50 focus:bg-slate-900" placeholder="Email Address" />
              </div>

              <div className="relative group">
                <Lock className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-woc-tosca transition-colors" size={16} />
                <input name="password" type="password" required className="input-compact pl-10 bg-slate-900/50 border-slate-700/50 focus:bg-slate-900" placeholder="Password" />
              </div>

              <button type="submit" disabled={loading} className="btn-compact bg-woc-tosca text-woc-darker hover:bg-woc-toscaHover mt-2 shadow-lg shadow-woc-tosca/20">
                {loading ? "..." : "Masuk"} <LogIn size={16}/>
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700/50"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-transparent px-2 text-slate-500 font-bold">Atau</span></div>
            </div>

            <button onClick={handleGoogleLogin} type="button" className="btn-compact bg-white/5 hover:bg-white/10 text-white border border-slate-600/50">
              <span className="font-bold text-lg leading-none mb-0.5">G</span> <span className="text-xs">Google Account</span>
            </button>

            <p className="mt-6 text-center text-slate-400 text-xs">
              Belum punya akun? <Link to="/register" className="text-woc-tosca font-bold hover:underline">Daftar Sekarang</Link>
            </p>
          </div>
        </div>
      </PageTransition>
    </div>
  );
}