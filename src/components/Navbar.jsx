import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { 
  Recycle, ChevronDown, User, LogOut, History, LogIn, ArrowRight, 
  LayoutDashboard, Truck, Home, Building2, Menu, UserPlus // Tambah Menu & UserPlus
} from "lucide-react"; 
import { motion, AnimatePresence } from "framer-motion";
import LogoutModal from "./LogoutModal";

export default function Navbar() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogoutConfirm = async () => {
    try {
      setIsLogoutModalOpen(false);
      setIsDropdownOpen(false);
      navigate("/"); 
      await logout();
    } catch (error) {
      console.error("Gagal logout", error);
    }
  };

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-woc-darker/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          
          {/* LOGO */}
          <Link to="/" className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
            <div className="bg-woc-tosca/10 p-1.5 rounded-lg">
              <Recycle className="w-6 h-6 text-woc-tosca" />
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:block">Waste of Change</span>
          </Link>
          
          {/* LOGIC TOMBOL KANAN */}
          {currentUser ? (
            // --- SKENARIO 1: USER SUDAH LOGIN ---
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 py-2 px-4 rounded-full hover:bg-slate-800/50 border border-transparent hover:border-slate-700 transition-all"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-slate-200 leading-none mb-1">
                    {currentUser?.displayName || "Pengguna"}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-woc-tosca font-bold leading-none">
                    {userRole}
                  </div>
                </div>
                
                <div className="w-9 h-9 bg-gradient-to-br from-woc-tosca to-emerald-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-woc-tosca/20">
                  {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "U"}
                </div>
                
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-woc-dark border border-slate-700 rounded-xl shadow-xl overflow-hidden py-2"
                  >
                    <div className="px-4 py-3 border-b border-slate-800 sm:hidden">
                      <p className="text-white font-bold">{currentUser?.displayName}</p>
                      <p className="text-xs text-slate-400">{currentUser?.email}</p>
                    </div>

                    {/* MENU ITEMS (LOGGED IN) */}
                    <DropdownItem to="/" icon={<Home size={16}/>} label="Beranda" onClick={() => setIsDropdownOpen(false)} />
                    <DropdownItem to="/profil" icon={<User size={16}/>} label="Profil Saya" onClick={() => setIsDropdownOpen(false)} />

                    <div className="border-t border-slate-800 my-1 mx-2"></div>

                    {userRole === 'pengelola' && (
                      <>
                        <DropdownItem to="/manager/dashboard" icon={<LayoutDashboard size={16}/>} label="Dashboard" onClick={() => setIsDropdownOpen(false)} />
                        <DropdownItem to="/manager/affiliate" icon={<Building2 size={16}/>} label="Kelola Afiliasi" onClick={() => setIsDropdownOpen(false)} />
                      </>
                    )}

                    {userRole === 'pengguna' && (
                      <>
                        <DropdownItem to="/setor" icon={<Truck size={16}/>} label="Setor Sampah" onClick={() => setIsDropdownOpen(false)} />
                        <DropdownItem to="/riwayat" icon={<History size={16}/>} label="Riwayat Penyetoran" onClick={() => setIsDropdownOpen(false)} />
                      </>
                    )}
                    
                    <div className="border-t border-slate-800 my-1"></div>
                    
                    <button 
                      onClick={() => { setIsDropdownOpen(false); setIsLogoutModalOpen(true); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-colors text-left"
                    >
                      <LogOut size={16} /> Keluar Akun
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            // --- SKENARIO 2: USER BELUM LOGIN ---
            <>
              {/* TAMPILAN DESKTOP (Hidden on Mobile) */}
              <div className="hidden sm:flex items-center gap-4">
                <Link to="/login" className="text-slate-300 hover:text-white font-medium text-sm transition-colors">
                  Masuk
                </Link>
                <Link to="/register" className="px-4 py-2 rounded-lg bg-woc-tosca hover:bg-woc-toscaHover text-woc-darker font-bold text-sm transition-all shadow-lg shadow-woc-tosca/20 flex items-center gap-2">
                  Daftar <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>

              {/* TAMPILAN MOBILE (Visible only on Mobile) */}
              <div className="sm:hidden relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="p-2 rounded-lg bg-slate-800 text-woc-tosca border border-slate-700 hover:bg-slate-700 transition-colors"
                >
                  <Menu size={20} />
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-woc-dark border border-slate-700 rounded-xl shadow-xl overflow-hidden py-2"
                    >
                      <DropdownItem 
                        to="/login" 
                        icon={<LogIn size={16}/>} 
                        label="Masuk" 
                        onClick={() => setIsDropdownOpen(false)} 
                      />
                      <DropdownItem 
                        to="/register" 
                        icon={<UserPlus size={16}/>} 
                        label="Daftar Akun" 
                        onClick={() => setIsDropdownOpen(false)} 
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Modal Logout */}
      <LogoutModal 
        isOpen={isLogoutModalOpen} 
        onClose={() => setIsLogoutModalOpen(false)} 
        onConfirm={handleLogoutConfirm} 
      />
    </>
  );
}

function DropdownItem({ to, icon, label, onClick }) {
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors hover:pl-5 duration-200"
    >
      {icon} {label}
    </Link>
  );
}

const ArrowRightIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);