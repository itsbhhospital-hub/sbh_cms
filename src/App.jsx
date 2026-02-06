import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import GlobalLoader from './components/GlobalLoader';
import { LayoutProvider } from './context/LayoutContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import NewComplaint from './pages/NewComplaint';
import MyComplaints from './pages/MyComplaints';
import WorkReport from './pages/WorkReport'; // NEW
import SolvedByMe from './pages/SolvedByMe'; // NEW
import CaseTransfer from './pages/CaseTransfer'; // NEW
import ExtendedCases from './pages/ExtendedCases'; // NEW
import sbhBg from './assets/sbh.png'; // Global Background Image

const ProtectedRoute = ({ children }) => {
  const auth = useAuth();
  if (!auth) return <div>Initializing...</div>; // Safety check
  const { user, loading } = auth;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-slate-100 border-t-orange-600 rounded-full animate-spin"></div>
    </div>
  );
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
    <LayoutProvider>
      <div className="min-h-screen flex relative">
        <Sidebar />
        {/* Optimized Main Content: Removed overflow-x-hidden to prevent sticky conflict, removed 100vw to prevent scrollbar shift */}
        <main className="flex-1 ml-0 transition-all flex flex-col min-h-screen">
          <Navbar />
          <div className="flex-grow p-4 md:p-10 pb-32 md:pb-24 w-full">
            {children}
          </div>
          <Footer />
        </main>
      </div>
    </LayoutProvider>
  );
};


function App() {
  return (
    <Router>
      <LoadingProvider>
        <AuthProvider>
          <GlobalLoader />
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
            <Route path="/solved-by-me" element={
              <ProtectedRoute>
                <Layout>
                  <SolvedByMe />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/work-report" element={
              <ProtectedRoute>
                <Layout>
                  <WorkReport />
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
            <Route path="/case-transfer" element={
              <ProtectedRoute>
                <Layout>
                  <CaseTransfer />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/extended-cases" element={
              <ProtectedRoute>
                <Layout>
                  <ExtendedCases />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </LoadingProvider>
    </Router>
  );
}

export default App;
