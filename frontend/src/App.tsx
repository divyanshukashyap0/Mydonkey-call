import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { LandingPage } from './pages/LandingPage';
import { RoomPage } from './pages/RoomPage';
import { ProfilePage } from './pages/ProfilePage';
import { HistoryPage } from './pages/HistoryPage';
import { FriendsPage } from './pages/FriendsPage';
import { CreatePage } from './pages/CreatePage';
import { JoinPage } from './pages/JoinPage';
import { AdminPage } from './pages/AdminPage';

const RoomRouteWrapper: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  if (!roomCode) return <LandingPage />;
  return <RoomPage roomCode={roomCode.toUpperCase()} />;
};

const AppContent: React.FC = () => {
  const { initAuth, isLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    initAuth();
  }, []);

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: 'var(--text-muted)' }}>
        Loading MyDonkey Call...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage onEnterRoom={(code) => navigate(`/room/${code}`)} />} />
      <Route path="/room/:roomCode" element={<RoomRouteWrapper />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/friends" element={<FriendsPage />} />
      <Route path="/create" element={<CreatePage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
};

import { ToastProvider } from './components/common/ToastNotification';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
};
