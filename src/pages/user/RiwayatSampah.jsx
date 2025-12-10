import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { PageTransition, Button } from "../../components/AnimatedUI";
import { Package, Calendar, MapPin, ChevronRight, Clock, Truck, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RiwayatSampah() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // Query: Ambil deposits dimana userId == currentUser.uid
    const q = query(
      collection(db, "deposits"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc") // Urutkan dari yang terbaru
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-woc-darker text-white font-sans">
      <Navbar />

      <main className="pt-24 pb-10 max-w-5xl mx-auto px-4 md:px-6">
        <PageTransition>
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Riwayat Penyetoran</h1>
            <p className="text-slate-400">Pantau status penjemputan sampah Anda.</p>
          </div>

          {loading ? (
            <div className="text-center py-20 text-slate-500">Memuat riwayat...</div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
              <Package size={48} className="text-slate-600 mb-4"/>
              <p className="text-slate-400 font-medium mb-4">Anda belum pernah menyetor sampah.</p>
              <Button onClick={() => navigate('/setor')} className="!w-auto">Mulai Setor Sekarang</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AnimatePresence>
                {requests.map((req) => (
                  <HistoryCard key={req.id} data={req} onClick={() => navigate(`/request/${req.id}`)} />
                ))}
              </AnimatePresence>
            </div>
          )}

        </PageTransition>
      </main>
    </div>
  );
}

function HistoryCard({ data, onClick }) {
  // Helper Status
  const getStatusConfig = (status) => {
    switch(status) {
      case 'pending': return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: <Clock size={14}/>, label: 'Menunggu' };
      case 'on_progress': return { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: <Truck size={14}/>, label: 'Sedang Berjalan' };
      case 'completed': return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: <CheckCircle size={14}/>, label: 'Selesai' };
      default: return { color: 'text-slate-500', bg: 'bg-slate-800', icon: null, label: status };
    }
  };

  const statusCfg = getStatusConfig(data.status);
  const dateStr = data.createdAt?.seconds 
    ? new Date(data.createdAt.seconds * 1000).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })
    : "-";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-woc-dark border border-slate-800 rounded-xl p-5 hover:border-woc-tosca/50 transition-all cursor-pointer group shadow-lg"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
            <Calendar size={12}/> {dateStr}
          </p>
          <h3 className="font-bold text-white text-lg group-hover:text-woc-tosca transition-colors">
            Setor Sampah {data.estimasiBerat} Kg
          </h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${statusCfg.bg} ${statusCfg.color}`}>
          {statusCfg.icon} {statusCfg.label}
        </div>
      </div>

      <div className="flex items-start gap-2 text-sm text-slate-400 mb-6 bg-slate-900/50 p-3 rounded-lg">
         <MapPin size={16} className="shrink-0 mt-0.5 text-slate-500"/>
         <span className="line-clamp-2 text-xs">{data.alamatJemput}</span>
      </div>

      <div className="flex justify-between items-center border-t border-slate-800 pt-4">
        <span className="text-xs text-slate-500 font-mono">ID: {data.id.slice(0,8)}...</span>
        <button className="text-sm font-bold text-woc-tosca flex items-center gap-1 hover:gap-2 transition-all">
          Lihat Detail <ChevronRight size={16}/>
        </button>
      </div>
    </motion.div>
  );
}