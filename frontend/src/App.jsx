import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { useAuth } from './context/AuthContext';

// Consumer Pages
import Home from './pages/Home';
import Recommendations from './pages/Recommendations';
import FarmerProfile from './pages/FarmerProfile';
import Order from './pages/Order';
import Orders from './pages/Orders';

// Farmer Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import FarmerInventory from './pages/FarmerInventory';
import FarmerOrders from './pages/FarmerOrders';
import CropLot from './pages/CropLot';
import Markets from './pages/Markets';
import PricePrediction from './pages/PricePrediction';
import Buyers from './pages/Buyers';
import Recommendation from './pages/Recommendation';
import Transaction from './pages/Transaction';
import StorageMap from './pages/StorageMap';
import MarketIntelligence from './pages/MarketIntelligence';

import './App.css';

/**
 * Shell layout with Sidebar and Topbar for all authenticated farmer intelligence pages
 */
function FarmerAppLayout() {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-layout">
        <Topbar />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const ProtectedRoute = ({ allowedRole, children }) => {
  const { profile, loading } = useAuth();
  
  if (loading) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}>Loading...</div>;
  if (!profile) return <Navigate to="/login" replace />;
  if (allowedRole && profile.role !== allowedRole) {
    return <Navigate to={profile.role === 'farmer' ? '/dashboard' : '/'} replace />;
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login & Register */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* =======================================================
            1. CONSUMER / FAMILY EXPERIENCE (PRIMARY)
           ======================================================= */}
        <Route path="/" element={
          <ProtectedRoute allowedRole="family">
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/recommendations" element={
          <ProtectedRoute allowedRole="family">
            <Recommendations />
          </ProtectedRoute>
        } />
        <Route path="/farmer/:id" element={
          <ProtectedRoute allowedRole="family">
            <FarmerProfile />
          </ProtectedRoute>
        } />
        <Route path="/order" element={
          <ProtectedRoute allowedRole="family">
            <Order />
          </ProtectedRoute>
        } />
        <Route path="/order/:id" element={
          <ProtectedRoute allowedRole="family">
            <Order />
          </ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute allowedRole="family">
            <Orders />
          </ProtectedRoute>
        } />

        {/* =======================================================
            2. FARMER MARKET INTELLIGENCE EXPERIENCE
           ======================================================= */}
        <Route element={
          <ProtectedRoute allowedRole="farmer">
            <FarmerAppLayout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventory" element={<FarmerInventory />} />
          <Route path="/farmer/orders" element={<FarmerOrders />} />
          <Route path="/crop-lot" element={<CropLot />} />
          <Route path="/storage" element={<StorageMap />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/price-prediction" element={<PricePrediction />} />
          <Route path="/buyers" element={<Buyers />} />
          <Route path="/recommendation" element={<Recommendation />} />
          <Route path="/transaction" element={<Transaction />} />
          <Route path="/market-intelligence" element={<MarketIntelligence />} />
        </Route>

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
