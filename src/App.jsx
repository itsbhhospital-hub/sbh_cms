import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import NewComplaint from './pages/NewComplaint';
import MyComplaints from './pages/MyComplaints';
import sbhBg from './assets/sbh.png'; // Global Background Image

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Layout component with Sidebar
// Removed bg-slate-50 to let global background show
const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex relative">
      <Sidebar />
      {/* Optimized Main Content: Removed overflow-x-hidden to prevent sticky conflict, removed 100vw to prevent scrollbar shift */}
      <main className="flex-1 ml-0 transition-all flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-grow p-4 md:p-10 pb-10 w-full">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
};


function App() {
  return (
    <AuthProvider>
      {/* Optimized Main Content */}


      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/new-complaint" element={
            <ProtectedRoute>
              <Layout>
                <NewComplaint />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/my-complaints" element={
            <ProtectedRoute>
              <Layout>
                <MyComplaints />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/user-management" element={
            <ProtectedRoute>
              <Layout>
                <UserManagement />
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
