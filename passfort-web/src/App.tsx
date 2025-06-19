// Main App Component for PassFort Zero-Knowledge Password Manager

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Settings } from './pages/Settings';
import { Dashboard } from './pages/Dashboard'; // Import the new comprehensive dashboard

// Components
import { PWAInstallBanner } from './components/ui/PWAInstallBanner';

// Store
import { useAuthStore } from './store/authStore';

// Hooks
import { useTheme } from './hooks/useTheme';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Theme Provider Component
const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme(); // This will automatically initialize and apply the theme
  void theme; // Explicitly mark as used for TypeScript

  return <>{children}</>;
};

// Main App Component
const App: React.FC = () => {
  const { refreshAuth, isAuthenticated } = useAuthStore();

  // Try to restore authentication on app load
  useEffect(() => {
    console.log('🔐 Initializing PassFort Zero-Knowledge Password Manager...');
    refreshAuth().catch(() => {
      console.log('No valid session found');
    });
  }, [refreshAuth]);

  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          {/* Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: '',
              style: {},
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />

          {/* Routes */}
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
          </Routes>

          {/* PWA Install Banner */}
          <PWAInstallBanner />
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;
