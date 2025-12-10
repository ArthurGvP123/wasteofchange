import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Home from './pages/user/Home';
import Profile from './pages/common/Profile';
import RequestDetail from './pages/common/RequestDetail'; 

// User Pages
import SetorSampah from './pages/user/SetorSampah';
import RiwayatSampah from './pages/user/RiwayatSampah';

// Manager Pages
import ManagerSetup from './pages/manager/ManagerSetup';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import AffiliateManage from './pages/manager/AffiliateManage'; // [BARU] Import Halaman

const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-woc-darker text-woc-text font-sans">
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Home />} />
            
            {/* Protected Routes (Umum) */}
            <Route path="/profil" element={<PrivateRoute><Profile /></PrivateRoute>} />
            
            {/* ROUTE DETAIL UMUM (Bisa diakses Pengelola & Pengguna) */}
            <Route path="/request/:id" element={<PrivateRoute><RequestDetail /></PrivateRoute>} />
            
            {/* User Routes */}
            <Route path="/setor" element={<PrivateRoute><SetorSampah /></PrivateRoute>} />
            <Route path="/riwayat" element={<PrivateRoute><RiwayatSampah /></PrivateRoute>} />

            {/* Manager Routes */}
            <Route path="/manager/setup" element={<PrivateRoute><ManagerSetup /></PrivateRoute>} />
            <Route path="/manager/dashboard" element={<PrivateRoute><ManagerDashboard /></PrivateRoute>} />
            
            {/* [BARU] Route Kelola Afiliasi */}
            <Route path="/manager/affiliate" element={<PrivateRoute><AffiliateManage /></PrivateRoute>} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;