import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { PageTransition, Button } from "../../components/AnimatedUI";
import { Package, Clock, CheckCircle, MapPin, Calendar, ArrowRight, Eye, Truck, RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ManagerDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [managerAffiliation, setManagerAffiliation] = useState(null);
  
  // State untuk refresh manual
  const [refreshKey, setRefreshKey] = useState(0);

  // 1. Ambil ID Afiliasi Pengelola
  useEffect(() => {
    const fetchManagerData = async () => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.afiliasiId) {
            setManagerAffiliation(userData.afiliasiId);
          } else {
            navigate("/manager/setup");
          }
        }
      }
    };
    fetchManagerData();
  }, [currentUser, navigate]);

  // 2. Real-time Listener (dengan Refresh Key)
  useEffect(() => {
    if (!managerAffiliation) return;

    setLoading(true);
    
    const q = query(
      collection(db, "deposits"),
      where("afiliasiId", "==", managerAffiliation),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(data);
      setLoading(false);
    }, (error) => {
      console.error("Error Fetching Data:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [managerAffiliation, refreshKey]);

  const handleRefresh = () => {
    setRequests([]); 
    setRefreshKey(prev => prev + 1);
  };

  const filteredRequests = requests.filter(req => {
    if (activeTab === "pending") return req.status === "pending";
    if (activeTab === "on_progress") return req.status === "on_progress";
    if (activeTab === "completed") return req.status === "completed";
    return false;
  });

  const handleAccept = async (id) => {
    try {
      const docRef = doc(db, "deposits", id);
      await updateDoc(docRef, { status: "on_progress", updatedAt: new Date() });
    } catch (error) { console.error("Error:", error); alert("Gagal update status."); }
  };

  const handleView = (id) => navigate(`/request/${id}`);

  return (
    <div className="min-h-screen bg-woc-darker text-white font-sans">
      <Navbar />

      <main className="pt-24 pb-10 max-w-6xl mx-auto px-4 md:px-6">
        <PageTransition>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard Pengelola</h1>
              <p className="text-slate-400">Pantau dan kelola sampah yang masuk.</p>
            </div>
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-all text-sm font-bold text-slate-300 hover:text-white"
            >
              <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
              Refresh Data
            </button>
          </div>

          <div className="flex flex-wrap gap-4 border-b border-slate-800 mb-8">
            <TabButton active={activeTab === "pending"} onClick={() => setActiveTab("pending")} icon={<Clock size={18}/>} label="Baru" count={requests.filter(r => r.status === 'pending').length} color="text-yellow-500" />
            <TabButton active={activeTab === "on_progress"} onClick={() => setActiveTab("on_progress")} icon={<Truck size={18}/>} label="Proses" count={requests.filter(r => r.status === 'on_progress').length} color="text-blue-500" />
            <TabButton active={activeTab === "completed"} onClick={() => setActiveTab("completed")} icon={<CheckCircle size={18}/>} label="Selesai" count={requests.filter(r => r.status === 'completed').length} color="text-emerald-500" />
          </div>

          {loading ? (
            <div className="text-center py-20 text-slate-500 flex flex-col items-center gap-2">
               <RefreshCcw className="animate-spin text-woc-tosca" size={24}/> Memuat data...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
              <Package size={48} className="text-slate-600 mb-4"/>
              <p className="text-slate-400 font-medium">Belum ada pengajuan di kategori ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredRequests.map((req) => (
                  <RequestCard key={req.id} data={req} onAccept={() => handleAccept(req.id)} onView={() => handleView(req.id)} />
                ))}
              </AnimatePresence>
            </div>
          )}

        </PageTransition>
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count, color }) {
  return (
    <button onClick={onClick} className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 transition-all relative ${active ? `text-white border-b-2 border-woc-tosca` : "text-slate-500 hover:text-slate-300"}`}>
      <span className={active ? color : ""}>{icon}</span> {label}
      {count > 0 && <span className={`ml-1 text-[10px] px-2 py-0.5 rounded-full ${active ? 'bg-slate-800 text-white' : 'bg-slate-800/50 text-slate-500'}`}>{count}</span>}
    </button>
  );
}

function RequestCard({ data, onAccept, onView }) {
  const dateStr = data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' }) : "Baru saja";
  
  // --- FUNGSI HELPER UNTUK LABEL STATUS ---
  const getStatusLabel = (status) => {
    switch(status) {
      case 'pending': return 'Menunggu Konfirmasi';
      case 'on_progress': return 'Sedang Berjalan';
      case 'completed': return 'Selesai';
      default: return status.replace('_', ' ');
    }
  };

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-woc-dark border border-slate-800 rounded-xl p-5 hover:border-slate-600 transition-colors shadow-lg relative overflow-hidden group">
      
      {/* Badge Status Custom */}
      <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-wider 
        ${data.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 
          data.status === 'on_progress' ? 'bg-blue-500/20 text-blue-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
        {getStatusLabel(data.status)}
      </div>

      <div className="flex items-center gap-3 mb-4 mt-2">
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">{data.userName ? data.userName.charAt(0).toUpperCase() : "U"}</div>
        <div>
          <h3 className="font-bold text-white text-sm">{data.userName || "Pengguna"}</h3>
          <p className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={10}/> {dateStr}</p>
        </div>
      </div>
      <div className="space-y-2 mb-6">
        <div className="flex items-start gap-2 text-sm text-slate-300"><MapPin size={16} className="text-woc-tosca shrink-0 mt-0.5"/><span className="line-clamp-2 text-xs">{data.alamatJemput}</span></div>
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/50"><p className="text-xs text-slate-500 mb-1">Estimasi Berat</p><p className="font-bold text-white">{data.estimasiBerat || "0"} Kg</p></div>
      </div>
      {data.status === 'pending' ? <Button onClick={onAccept} className="w-full !py-2.5 !text-sm shadow-none">Terima Pengajuan <ArrowRight size={16}/></Button> : <Button onClick={onView} variant="outline" className="w-full !py-2.5 !text-sm">Lihat Detail <Eye size={16}/></Button>}
    </motion.div>
  );
}