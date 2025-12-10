import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/AnimatedUI";
import Navbar from "../../components/Navbar"; // Pastikan path ini sesuai
import { Leaf, Coins, Truck, MapPin, ChevronRight, Recycle, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();

  // --- LOGIC UTAMA: GATEKEEPER ---
  // Fungsi ini menentukan arah user berdasarkan status login
  const handleAction = () => {
    if (!currentUser) {
      // Skenario 1: Belum Login -> Lempar ke Login Page
      navigate("/login");
    } else {
      // Skenario 2: Sudah Login -> Cek Role
      if (userRole === 'pengelola') {
        navigate('/manager/dashboard');
      } else {
        navigate('/setor'); // Asumsi route untuk pengguna menyetor sampah
      }
    }
  };

  // Variabel Animasi
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.3 } }
  };

  const floating = {
    animate: {
      y: [0, -15, 0],
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
    }
  };

  return (
    <div className="min-h-screen bg-woc-darker text-white overflow-x-hidden font-sans">
      
      {/* Navbar sudah dipisah ke komponen sendiri */}
      <Navbar />

      <main className="pt-24 pb-10 max-w-7xl mx-auto px-6">
        
        {/* HERO SECTION */}
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20 min-h-[80vh] lg:min-h-[70vh]">
          
          {/* KIRI: Teks & Tombol Aksi */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex-1 text-center lg:text-left z-10"
          >
            <div className="inline-block px-3 py-1 mb-4 rounded-full bg-woc-tosca/10 border border-woc-tosca/20 text-woc-tosca text-xs font-bold uppercase tracking-wider">
              Revolutionizing Waste Management
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-extrabold mb-6 leading-tight">
              Welcome to <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-woc-tosca to-emerald-400">
                Waste of Change
              </span>
            </h1>
            
            <p className="text-slate-400 text-lg mb-4 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Tempat di mana sampah bukan lagi sekadar sisa, tapi <span className="text-white font-semibold">peluang baru</span>.
            </p>
            
            <p className="text-slate-500 text-sm mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Kami hadir sebagai platform yang memudahkan kamu menukar sampah organik maupun anorganik, 
              mulai dari sisa makanan, plastik, kertas, hingga logam ke bank sampah terdekat.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {/* TOMBOL UTAMA DINAMIS */}
              <Button 
                variant="primary" 
                onClick={handleAction} 
                className="!w-auto px-8 py-4 !text-base shadow-lg shadow-woc-tosca/20"
              >
                {/* Teks & Icon berubah otomatis */}
                {!currentUser ? "Mulai Sekarang" : (userRole === 'pengelola' ? 'Dashboard' : 'Setor Sampah')} 
                {!currentUser ? <Lock size={18} className="opacity-70"/> : <ChevronRight size={20} />}
              </Button>
            </div>
          </motion.div>

          {/* KANAN: Visual Animasi */}
          <div className="flex-1 relative w-full flex justify-center items-center">
            {/* Glow Effect */}
            <div className="absolute w-[300px] h-[300px] bg-woc-tosca/20 rounded-full blur-[100px] animate-pulse"></div>
            
            {/* Orbiting Elements */}
            <motion.div variants={floating} animate="animate" className="relative z-10 w-64 h-64 lg:w-96 lg:h-96">
              <div className="absolute inset-0 m-auto w-40 h-40 bg-gradient-to-tr from-slate-800 to-slate-900 rounded-full border border-slate-700 flex items-center justify-center shadow-2xl">
                 <Recycle size={80} className="text-woc-tosca" />
              </div>
              <div className="absolute top-0 right-10 bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 backdrop-blur-sm">
                <Leaf className="text-emerald-400 w-8 h-8" />
              </div>
              <div className="absolute bottom-10 left-0 bg-yellow-500/10 p-4 rounded-2xl border border-yellow-500/20 backdrop-blur-sm">
                <Coins className="text-yellow-400 w-8 h-8" />
              </div>
              <div className="absolute bottom-0 right-20 bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 backdrop-blur-sm">
                <MapPin className="text-blue-400 w-8 h-8" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* FEATURES GRID */}
        <motion.div 
          variants={container} 
          initial="hidden" 
          whileInView="show" 
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 border-t border-slate-800/50 pt-16"
        >
          <FeatureCard 
            onClick={handleAction} 
            icon={<MapPin className="text-blue-400" size={32}/>} 
            title="Temukan Lokasi" 
            desc="Cari lokasi bank sampah terdekat dengan cepat dan akurat." 
            color="bg-blue-500/10" 
          />
          <FeatureCard 
            onClick={handleAction} 
            icon={<Truck className="text-woc-tosca" size={32}/>} 
            title="Jadwalkan Penjemputan" 
            desc="Atur jadwal penjemputan sampah hanya dalam beberapa klik." 
            color="bg-woc-tosca/10" 
          />
          <FeatureCard 
            onClick={handleAction} 
            icon={<Coins className="text-yellow-400" size={32}/>} 
            title="Pantau & Tukar Poin" 
            desc="Pantau saldo poinmu dan tukarkan dengan pulsa atau e-money." 
            color="bg-yellow-500/10" 
          />
        </motion.div>

      </main>
    </div>
  );
}

// Sub-Component untuk Card Fitur
function FeatureCard({ icon, title, desc, color, onClick }) {
  return (
    <motion.div 
      onClick={onClick}
      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      className="p-8 rounded-2xl bg-woc-dark border border-slate-800 hover:border-woc-tosca/50 transition-colors group cursor-pointer active:scale-95 duration-200"
    >
      <div className={`w-16 h-16 ${color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </motion.div>
  );
}