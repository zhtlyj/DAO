import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Proposals from './pages/Proposals';
import AdminProposals from './pages/AdminProposals';
import MyVotes from './pages/MyVotes';
import Discussion from './pages/Discussion';
import Governance from './pages/Governance';
import AdminUsers from './pages/AdminUsers';
import AdminStatistics from './pages/AdminStatistics';
import Achievements from './pages/Achievements';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import './App.css';
const Voting = () => (
  <Layout>
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h2>投票中心</h2>
      <p>功能开发中...</p>
    </div>
  </Layout>
);
const CreateProposal = () => (
  <Layout>
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h2>提交提案</h2>
      <p>功能开发中...</p>
    </div>
  </Layout>
);
const AdminSettings = () => (
  <Layout>
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h2>系统设置</h2>
      <p>功能开发中...</p>
    </div>
  </Layout>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/proposals"
            element={
              <ProtectedRoute>
                <Proposals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/proposals/create"
            element={
              <ProtectedRoute>
                <CreateProposal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/voting"
            element={
              <ProtectedRoute>
                <Voting />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-votes"
            element={
              <ProtectedRoute>
                <MyVotes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/achievements"
            element={
              <ProtectedRoute>
                <Achievements />
              </ProtectedRoute>
            }
          />
          <Route
            path="/discussion"
            element={
              <ProtectedRoute>
                <Discussion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/governance"
            element={
              <ProtectedRoute>
                <Governance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin', 'student_representative', 'teacher_representative']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/statistics"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminStatistics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/proposals"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminProposals />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

