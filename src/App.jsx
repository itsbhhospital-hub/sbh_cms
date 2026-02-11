import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import { AnalyticsProvider } from './context/AnalyticsContext';
import { IntelligenceProvider } from './context/IntelligenceContext';
import { LayoutProvider } from './context/LayoutContext';
import GlobalLoader from './components/GlobalLoader';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';

// Lazy Load Heavy Pages
const UserManagement = lazy(() => import('./pages/UserManagement'));
const NewComplaint = lazy(() => import('./pages/NewComplaint'));
const MyComplaints = lazy(() => import('./pages/MyComplaints'));
const WorkReport = lazy(() => import('./pages/WorkReport'));
const SolvedByMe = lazy(() => import('./pages/SolvedByMe'));
const CaseTransfer = lazy(() => import('./pages/CaseTransfer'));
const ExtendedCases = lazy(() => import('./pages/ExtendedCases'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const AICommandCenter = lazy(() => import('./pages/AICommandCenter'));

const ProtectedRoute = ({ children }) => {
  const auth = useAuth();
  // Guard against null auth context (e.g. during initial hot reload or error)
  if (!auth) return <div className="h-screen w-full flex items-center justify-center">Loading authentication...</div>;

  const { user, loading } = auth;

  if (loading) return <GlobalLoader />;
  if (!user) return <Navigate to="/login" />;
  return children;
};

// Layout component with Sidebar
// Removed bg-slate-50 to let global background show
const Layout = ({ children }) => {
  return (
    <LayoutProvider>
      <div className="min-h-screen flex relative">
        <Sidebar />
        {/* Optimized Main Content: Removed overflow-x-hidden to prevent sticky conflict, removed 100vw to prevent scrollbar shift */}
        <main className="flex-1 ml-0 transition-all flex flex-col min-h-screen w-full relative">
          <Navbar />
          <div className="flex-grow p-4 md:p-8 w-full max-w-full overflow-x-hidden pb-20 md:pb-24">
            <Suspense fallback={<GlobalLoader />}>
              {children}
            </Suspense>
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
          <AnalyticsProvider>
            <IntelligenceProvider>
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
                <Route path="/change-password" element={
                  <ProtectedRoute>
                    <Layout>
                      <ChangePassword />
                    </Layout>
                  </ProtectedRoute>
                } />
                <Route path="/ai-command-center" element={
                  <ProtectedRoute>
                    <Layout>
                      <AICommandCenter />
                    </Layout>
                  </ProtectedRoute>
                } />
              </Routes>
            </IntelligenceProvider>
          </AnalyticsProvider>
        </AuthProvider>
      </LoadingProvider>
    </Router>
  );
}

export default App;