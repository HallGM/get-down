import { useState } from "react";
import { Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./api/auth.js";
import ProtectedRoute from "./components/ProtectedRoute.js";
import Login from "./pages/Login.js";
import Dashboard from "./pages/Dashboard.js";
import GigsList from "./pages/gigs/GigsList.js";
import GigDetail from "./pages/gigs/GigDetail.js";
import EnquiriesList from "./pages/enquiries/EnquiriesList.js";
import EmailGenerator from "./pages/enquiries/EmailGenerator.js";
import InvoicesList from "./pages/invoices/InvoicesList.js";
import InvoiceDetail from "./pages/invoices/InvoiceDetail.js";
import PeopleList from "./pages/people/PeopleList.js";
import ServicesList from "./pages/services/ServicesList.js";
import SongsList from "./pages/songs/SongsList.js";
import ShowcasesList from "./pages/showcases/ShowcasesList.js";
import AttributionsList from "./pages/attributions/AttributionsList.js";
import RehearsalsList from "./pages/rehearsals/RehearsalsList.js";
import ExpensesList from "./pages/expenses/ExpensesList.js";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/gigs", label: "Gigs" },
  { to: "/enquiries", label: "Enquiries" },
  { to: "/invoices", label: "Invoices" },
  { to: "/songs", label: "Songs" },
  { to: "/people", label: "People" },
  { to: "/services", label: "Services" },
  { to: "/showcases", label: "Showcases" },
  { to: "/attributions", label: "Attributions" },
  { to: "/rehearsals", label: "Rehearsals" },
  { to: "/expenses", label: "Expenses" },
];

function AppNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="container-fluid" style={{ borderBottom: "1px solid var(--pico-muted-border-color)", marginBottom: "1rem" }}>
      <ul>
        <li><strong>Every Angle</strong></li>
      </ul>
      <ul className="nav-desktop-links">
        {NAV_LINKS.map(({ to, label, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} style={({ isActive }) => ({ fontWeight: isActive ? 700 : undefined })}>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
      <ul style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        {user && (
          <>
            <li><small style={{ color: "var(--pico-muted-color)" }}>{user.displayName ?? user.firstName}</small></li>
            <li><button className="secondary outline" style={{ padding: "0.2em 0.7em" }} onClick={handleLogout}>Logout</button></li>
          </>
        )}
        <li className="nav-hamburger">
          <button
            className="secondary outline"
            style={{ padding: "0.2em 0.7em" }}
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-label="Menu"
          >
            ☰
          </button>
        </li>
      </ul>
      {menuOpen && (
        <div className="nav-mobile-dropdown">
          {NAV_LINKS.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)}
              style={({ isActive }) => ({ fontWeight: isActive ? 700 : undefined })}>
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <>
      {user && <AppNav />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/gigs" element={<GigsList />} />
          <Route path="/gigs/:id" element={<GigDetail />} />
          <Route path="/enquiries" element={<EnquiriesList />} />
          <Route path="/enquiries/email-generator" element={<EmailGenerator />} />
          <Route path="/invoices" element={<InvoicesList />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/songs" element={<SongsList />} />
          <Route path="/people" element={<PeopleList />} />
          <Route path="/services" element={<ServicesList />} />
          <Route path="/showcases" element={<ShowcasesList />} />
          <Route path="/attributions" element={<AttributionsList />} />
          <Route path="/rehearsals" element={<RehearsalsList />} />
          <Route path="/expenses" element={<ExpensesList />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}

