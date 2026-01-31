import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import NewComplaint from './pages/NewComplaint';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

import Sidebar from './components/Sidebar';

// Layout component with Sidebar
const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10 ml-0 transition-all overflow-x-hidden">
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
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
          <Route path="/users" element={
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
