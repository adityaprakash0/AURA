import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './index.css';
import logoImg from './assets/logo.jpg';

// --- LIVE BACKEND CONFIG ---
// Bhai, Render URL yahan globally set kar diya hai
const BASE_URL = "https://aura-iulg.onrender.com";

// --- Formatters & Helpers ---
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const decodeToken = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
};

const getStockPnl = (stock) => {
  const quantity = Number(stock.quantity) || 0;
  const buyPrice = Number(stock.buy_price) || 0;
  const currentPrice = Number(stock.current_price) || 0;
  return Number(stock.profitLoss ?? (currentPrice - buyPrice) * quantity) || 0;
};

export default function CapitalPilotApp() {
  const [token, setToken] = useState(() => localStorage.getItem("capitalPilotToken") || "");
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("capitalPilotUser");
    return saved ? JSON.parse(saved) : null;
  });
  
  const [stocks, setStocks] = useState([]);
  const [transactions, setTransactions] = useState([]); 
  const [currentView, setCurrentView] = useState('auth'); 
  const [authTab, setAuthTab] = useState('login'); 
  const [authStep, setAuthStep] = useState('auth'); 
  const [pendingEmail, setPendingEmail] = useState("");
  const [notification, setNotification] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); 

  const isLoggedIn = Boolean(user && token);

  // --- API Utility (Updated for Production) ---
  const apiRequest = async (path, options = {}) => {
    const { requiresAuth = false, method = "GET", body } = options;
    const headers = { "Content-Type": "application/json" };
    
    if (requiresAuth) {
      if (!token) throw new Error("Session expired. Please log in again.");
      headers.Authorization = `Bearer ${token}`;
    }

    // BASE_URL yahan add kiya hai taaki live backend se connect ho
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      if (requiresAuth && response.status === 401) handleLogout();
      throw new Error(data.message || "Something went wrong!");
    }
    return data;
  };

  const showToast = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- Auth Actions ---
  const handleAuth = async (e, type) => {
    e.preventDefault();
    setIsPending(true);
    const formData = Object.fromEntries(new FormData(e.target));
    
    try {
      const endpoint = type === 'login' ? '/api/users/login' : '/api/users/signup';
      const result = await apiRequest(endpoint, { method: "POST", body: formData });
      
      if (type === 'signup') {
        setPendingEmail(formData.email);
        setAuthStep('verify');
        showToast("success", "OTP sent to your email!");
      } else {
        const decoded = decodeToken(result.token);
        const userData = { id: decoded.id, email: formData.email, name: formData.name || "User", role: "User" };
        
        setToken(result.token);
        setUser(userData);
        localStorage.setItem("capitalPilotToken", result.token);
        localStorage.setItem("capitalPilotUser", JSON.stringify(userData));
        setCurrentView('dashboard');
        showToast("success", `Welcome back!`);
      }
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setIsPending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsPending(true);
    const formData = Object.fromEntries(new FormData(e.target));

    try {
      const result = await apiRequest('/api/users/verify-signup', { 
        method: "POST", 
        body: { email: pendingEmail, otp: formData.otp } 
      });

      const decoded = decodeToken(result.token);
      const userData = { id: decoded.id, email: pendingEmail, name: "User", role: "User" };
      
      setToken(result.token);
      setUser(userData);
      localStorage.setItem("capitalPilotToken", result.token);
      localStorage.setItem("capitalPilotUser", JSON.stringify(userData));
      
      setAuthStep('auth');
      setCurrentView('dashboard');
      showToast("success", "Email verified! Welcome to AURA.");
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setIsPending(false);
    }
  };

  const handleLogout = () => {
    setToken("");
    setUser(null);
    setStocks([]);
    localStorage.removeItem("capitalPilotToken");
    localStorage.removeItem("capitalPilotUser");
    setCurrentView('auth');
    setAuthStep('auth');
    showToast("neutral", "Logged out successfully.");
  };

  // --- Data Fetching ---
  const loadPortfolio = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const data = await apiRequest("/api/stocks/me", { requiresAuth: true });
      setStocks(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast("error", "Failed to load portfolio.");
    }
  }, [isLoggedIn, token]);

  useEffect(() => {
    if (isLoggedIn) {
      setCurrentView('dashboard');
      loadPortfolio();
    } else {
      setCurrentView('auth');
    }
  }, [isLoggedIn, loadPortfolio]);

  // --- Portfolio Actions ---
  const handleAddStock = async (e) => {
    e.preventDefault();
    setIsPending(true);
    const formData = Object.fromEntries(new FormData(e.target));
    const payload = {
      stockname: formData.stockname.trim(),
      quantity: Number(formData.quantity),
      buy_price: Number(formData.buy_price),
      current_price: Number(formData.current_price)
    };

    try {
      await apiRequest("/api/stocks", { requiresAuth: true, method: "POST", body: payload });
      e.target.reset();
      showToast("success", `${payload.stockname} added to portfolio.`);
      setTransactions([{ type: "BUY", stock: payload.stockname, qty: payload.quantity, price: payload.buy_price, date: new Date().toLocaleDateString() }, ...transactions]);
      await loadPortfolio();
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setIsPending(false);
    }
  };

  const handleSellStock = async (stockId, stockName) => {
    const confirmSell = window.confirm(`Are you sure you want to sell your holdings of ${stockName}?`);
    if (!confirmSell) return;

    try {
      await apiRequest(`/api/stocks/${stockId}`, { requiresAuth: true, method: "DELETE" });
      showToast("success", `Successfully sold ${stockName}.`);
      setTransactions([{ type: "SELL", stock: stockName, qty: "ALL", price: "Market", date: new Date().toLocaleDateString() }, ...transactions]);
      await loadPortfolio();
    } catch (error) {
      showToast("error", `Failed to sell stock: ${error.message}`);
    }
  };

  const enrichedStocks = useMemo(() => {
    let filtered = stocks.map(s => ({
      ...s,
      pnl: getStockPnl(s),
      currentValue: (Number(s.quantity) || 0) * (Number(s.current_price) || 0),
      investedValue: (Number(s.quantity) || 0) * (Number(s.buy_price) || 0)
    }));
    if (searchQuery) filtered = filtered.filter(s => s.stockname.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterType === 'profit') filtered = filtered.filter(s => s.pnl >= 0);
    if (filterType === 'loss') filtered = filtered.filter(s => s.pnl < 0);
    return filtered;
  }, [stocks, searchQuery, filterType]);

  const stats = useMemo(() => ({
    totalInvested: enrichedStocks.reduce((sum, s) => sum + s.investedValue, 0),
    currentValue: enrichedStocks.reduce((sum, s) => sum + s.currentValue, 0),
    totalPnl: enrichedStocks.reduce((sum, s) => sum + s.pnl, 0),
    count: enrichedStocks.length
  }), [enrichedStocks]);

  // --- Render Sub-Components ---
  const renderNavbar = () => (
    <nav className="glass-navbar">
      <div className="nav-brand">
        <img src={logoImg} alt="AURA Logo" className="nav-logo" />
        <h2>AURA</h2>
      </div>
      <ul className="nav-links">
        <li className={currentView === 'dashboard' ? 'active' : ''} onClick={() => setCurrentView('dashboard')}>Dashboard</li>
        <li className={currentView === 'portfolio' ? 'active' : ''} onClick={() => setCurrentView('portfolio')}>Manage Portfolio</li>
        <li className={currentView === 'transactions' ? 'active' : ''} onClick={() => setCurrentView('transactions')}>Transactions</li>
      </ul>
      <div className="nav-user">
        <div className="user-info" onClick={() => setCurrentView('profile')}>
          <span className="user-role">{user?.role}</span>
          <span className="user-email">{user?.email}</span>
        </div>
        <button className="ghost-button small-btn" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );

  const renderDashboard = () => (
    <div className="view-container fade-in">
      <div className="header-row">
        <h2>Portfolio Overview</h2>
        <button className="ghost-button" onClick={loadPortfolio}>⟳ Refresh Data</button>
      </div>
      <div className="summary-grid">
        <article className="summary-card"><span className="micro-label">Total Positions</span><strong>{stats.count}</strong></article>
        <article className="summary-card"><span className="micro-label">Invested Capital</span><strong>{currencyFormatter.format(stats.totalInvested)}</strong></article>
        <article className="summary-card"><span className="micro-label">Current Value</span><strong className="text-accent">{currencyFormatter.format(stats.currentValue)}</strong></article>
        <article className="summary-card"><span className="micro-label">Overall P&L</span><strong className={stats.totalPnl >= 0 ? "profit-positive" : "profit-negative"}>{currencyFormatter.format(stats.totalPnl)}</strong></article>
      </div>
      <div className="panel-header mt-4"><h3>Current Holdings</h3></div>
      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Stock Name</th><th>Qty</th><th>Avg Buy Price</th><th>Current Price</th><th>Net P&L</th></tr></thead>
            <tbody>
              {enrichedStocks.length === 0 ? (
                <tr><td colSpan="5" className="empty-state">No stocks found. Add your first position from 'Manage Portfolio'.</td></tr>
              ) : (
                enrichedStocks.map((stock, i) => (
                  <tr key={stock._id || i}>
                    <td><strong>{stock.stockname}</strong></td>
                    <td>{stock.quantity}</td>
                    <td>{currencyFormatter.format(stock.buy_price)}</td>
                    <td>{currencyFormatter.format(stock.current_price)}</td>
                    <td className={stock.pnl >= 0 ? "profit-positive" : "profit-negative"}>{currencyFormatter.format(stock.pnl)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPortfolio = () => (
    <div className="view-container fade-in">
      <div className="workspace-grid">
        <form className="composer-card" onSubmit={handleAddStock}>
          <div className="composer-header"><h3>Add New Trade</h3><p>Execute a buy order for your portfolio.</p></div>
          <label><span>Stock Name</span><input type="text" name="stockname" required /></label>
          <label><span>Quantity</span><input type="number" name="quantity" min="1" required /></label>
          <label><span>Buy Price (INR)</span><input type="number" name="buy_price" step="0.01" required /></label>
          <label><span>Current Market Price</span><input type="number" name="current_price" step="0.01" required /></label>
          <button className="primary-button" type="submit" disabled={isPending}>{isPending ? 'Executing...' : 'Add to Portfolio'}</button>
        </form>
        <div className="table-card">
          <div className="table-header"><h3>Manage Holdings</h3><p>Search and sell assets.</p></div>
          <div className="filter-row">
            <input type="text" placeholder="🔍 Search stock..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="filter-select">
              <option value="all">All Holdings</option>
              <option value="profit">In Profit</option>
              <option value="loss">In Loss</option>
            </select>
          </div>
          <div className="table-wrap mt-2">
            <table>
              <thead><tr><th>Stock</th><th>P&L</th><th>Action</th></tr></thead>
              <tbody>
                {enrichedStocks.map((stock, i) => (
                  <tr key={stock._id || i}>
                    <td><div><strong>{stock.stockname}</strong></div><div className="micro-label">Qty: {stock.quantity}</div></td>
                    <td className={stock.pnl >= 0 ? "profit-positive" : "profit-negative"}>{currencyFormatter.format(stock.pnl)}</td>
                    <td><button className="action-button sell" onClick={() => handleSellStock(stock._id, stock.stockname)}>Sell</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransactions = () => (
    <div className="view-container fade-in">
      <h2>Transaction History</h2>
      <div className="table-card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Stock</th><th>Qty</th><th>Price</th></tr></thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan="5" className="empty-state">No history found.</td></tr>
              ) : (
                transactions.map((txn, i) => (
                  <tr key={i}>
                    <td>{txn.date}</td>
                    <td><span className={`badge ${txn.type.toLowerCase()}`}>{txn.type}</span></td>
                    <td>{txn.stock}</td>
                    <td>{txn.qty}</td>
                    <td>{currencyFormatter.format(txn.price)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="view-container fade-in profile-view">
      <div className="composer-card max-w-md mx-auto">
        <h3>User Profile</h3>
        <div className="profile-details">
          <div className="detail-group"><span className="micro-label">Role</span><p className="badge admin">{user?.role}</p></div>
          <div className="detail-group"><span className="micro-label">Email</span><p>{user?.email}</p></div>
        </div>
        <hr className="divider" />
        <button className="ghost-button w-full mb-2" onClick={() => showToast('neutral', 'Feature coming soon')}>Edit Details</button>
      </div>
    </div>
  );

  const renderAuth = () => (
    <div className="auth-container fade-in">
      <div className="auth-card glass-panel">
        {authStep === 'auth' ? (
          <>
            <div className="text-center mb-2 mx-auto">
              <img src={logoImg} alt="AURA Logo" className="auth-logo" />
            </div>
            <h2 className="text-center mb-4">AURA</h2>
            <div className="tab-row full-width mb-4">
              <button className={`tab-button ${authTab === 'login' ? 'active' : ''}`} onClick={() => setAuthTab('login')}>Login</button>
              <button className={`tab-button ${authTab === 'signup' ? 'active' : ''}`} onClick={() => setAuthTab('signup')}>Sign Up</button>
            </div>
            <form onSubmit={(e) => handleAuth(e, authTab)} className="form-stack">
              {authTab === 'signup' && <label><span>Full Name</span><input type="text" name="name" required /></label>}
              <label><span>Email Address</span><input type="email" name="email" required /></label>
              <label><span>Password</span><input type="password" name="password" required /></label>
              <button className="primary-button mt-2" type="submit" disabled={isPending}>{isPending ? 'Processing...' : authTab === 'login' ? 'Secure Login' : 'Create Account'}</button>
            </form>
          </>
        ) : (
          <div className="verify-step fade-in">
            <h3 className="text-center">Verify Email</h3>
            <p className="text-center micro-label mb-4">Enter code sent to {pendingEmail}</p>
            <form onSubmit={handleVerifyOtp} className="form-stack">
              <label><span>OTP Code</span><input type="text" name="otp" maxLength="6" placeholder="123456" required /></label>
              <button className="primary-button mt-2" type="submit" disabled={isPending}>{isPending ? 'Verifying...' : 'Verify OTP'}</button>
              <button type="button" className="ghost-button small-btn w-full mt-2" onClick={() => setAuthStep('auth')}>Back</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <div className="grid-overlay"></div>
      <div className="orb orb-a"></div><div className="orb orb-b"></div><div className="orb orb-c"></div>
      {notification && <div className={`toast-notification ${notification.type} fade-in`}>{notification.message}</div>}
      <div className="content-wrapper">
        {isLoggedIn ? (
          <>{renderNavbar()}<main className="main-content">
            {currentView === 'dashboard' && renderDashboard()}
            {currentView === 'portfolio' && renderPortfolio()}
            {currentView === 'transactions' && renderTransactions()}
            {currentView === 'profile' && renderProfile()}
          </main></>
        ) : renderAuth()}
      </div>
      <footer className="app-footer"><p>Developed by <strong>ADITYA PRAKASH</strong></p></footer>
    </div>
  );
}