import { useState, useEffect, useRef } from "react";
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation, type NavLinkProps } from "react-router-dom";
import { useAuth } from "./api/auth.js";
import ProtectedRoute from "./components/ProtectedRoute.js";
import Login from "./pages/Login.js";
import Dashboard from "./pages/Dashboard.js";
import GigsList from "./pages/gigs/GigsList.js";
import GigDetail from "./pages/gigs/GigDetail.js";
import GigRoles from "./pages/gigs/GigRoles.js";
import SetListBuilder from "./pages/gigs/SetListBuilder.js";
import GigBilling from "./pages/gigs/GigBilling.js";
import InvoiceEdit from "./pages/gigs/InvoiceEdit.js";
import EnquiriesList from "./pages/enquiries/EnquiriesList.js";
import EmailGenerator from "./pages/enquiries/EmailGenerator.js";
import PeopleList from "./pages/people/PeopleList.js";
import ServicesList from "./pages/services/ServicesList.js";
import ServiceDetail from "./pages/services/ServiceDetail.js";
import RolesList from "./pages/services/RolesList.js";
import SongsList from "./pages/songs/SongsList.js";
import ShowcasesList from "./pages/showcases/ShowcasesList.js";
import ShowcaseDetail from "./pages/showcases/ShowcaseDetail.js";
import AttributionsList from "./pages/attributions/AttributionsList.js";
import AttributionDetail from "./pages/attributions/AttributionDetail.js";
import RehearsalsList from "./pages/rehearsals/RehearsalsList.js";
import ExpensesList from "./pages/expenses/ExpensesList.js";
import PerformerGigList from "./pages/performer/PerformerGigList.js";
import PerformerGigDetail from "./pages/performer/PerformerGigDetail.js";
import ClientForm from "./pages/client/ClientForm.js";
import AccountsList from "./pages/accounts/AccountsList.js";
import AccountDetail from "./pages/accounts/AccountDetail.js";
import DeliveryPage from "./pages/delivery/DeliveryPage.js";
import AccountingPage from "./pages/accounting/AccountingPage.js";
import FeeAllocationsList from "./pages/fee-allocations/FeeAllocationsList.js";
import ExpensePaymentsPage from "./pages/expense-payments/ExpensePaymentsPage.js";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/gigs", label: "Gigs" },
  // { to: "/enquiries", label: "Enquiries" },  // hidden — not in use yet
  { to: "/songs", label: "Songs" },
  { to: "/people", label: "People" },
  { to: "/services", label: "Services" },
  { to: "/showcases", label: "Showcases" },
  { to: "/expenses", label: "Expenses" },
  { to: "/accounts", label: "Accounts" },
  { to: "/accounting", label: "Accounting" },
];

const MORE_LINKS = [
  { to: "/attributions", label: "Attributions" },
  { to: "/rehearsals", label: "Rehearsals" },
  { to: "/services/roles", label: "Roles" },
  { to: "/fee-allocations", label: "Fee allocations" },
  { to: "/expense-payments", label: "Expense payments" },
];

const navLinkStyle: NavLinkProps["style"] = ({ isActive }) => ({
  fontWeight: isActive ? 700 : undefined,
});

function AppNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLLIElement>(null);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  useEffect(() => {
    if (!moreOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (e.target instanceof Node && moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreOpen]);

  return (
    <nav className="container-fluid" style={{ borderBottom: "1px solid var(--pico-muted-border-color)", marginBottom: "1rem" }}>
      <ul>
        <li><strong>Every Angle</strong></li>
      </ul>
      <ul className="nav-desktop-links">
        {NAV_LINKS.map(({ to, label, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} style={navLinkStyle}>
              {label}
            </NavLink>
          </li>
        ))}
        <li ref={moreRef} style={{ position: "relative" }}>
          <button
            className="secondary outline"
            style={{ padding: "0.2em 0.7em" }}
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
          >
            More ▾
          </button>
          {moreOpen && (
            <div className="nav-more-dropdown">
              {MORE_LINKS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  style={navLinkStyle}
                >
                  {label}
                </NavLink>
              ))}
            </div>
          )}
        </li>
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
            <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)} style={navLinkStyle}>
              {label}
            </NavLink>
          ))}
          <hr style={{ margin: "0.25rem 0", borderColor: "var(--pico-muted-border-color)" }} />
          {MORE_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} onClick={() => setMenuOpen(false)} style={navLinkStyle}>
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
  const location = useLocation();

  if (isLoading) return null;

  const isPerformerRoute = location.pathname.startsWith("/p/") || location.pathname.startsWith("/c/") || location.pathname.startsWith("/d/");

  return (
    <>
      {user && !isPerformerRoute && <AppNav />}
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Public performer portal — no auth required */}
        <Route path="/p/:token" element={<PerformerGigList />} />
        <Route path="/p/:token/gigs/:gigId" element={<PerformerGigDetail />} />
        {/* Public client form portal — no auth required */}
        <Route path="/c/:token" element={<ClientForm />} />
        {/* Public media delivery portal — no auth required */}
        <Route path="/d/:token" element={<DeliveryPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/gigs" element={<GigsList />} />
          <Route path="/gigs/:id" element={<GigDetail />} />
          <Route path="/gigs/:id/roles" element={<GigRoles />} />
          <Route path="/gigs/:id/set-list" element={<SetListBuilder />} />
          <Route path="/gigs/:id/invoices" element={<GigBilling />} />
          <Route path="/gigs/:id/invoices/:invoiceId/edit" element={<InvoiceEdit />} />
          <Route path="/enquiries" element={<EnquiriesList />} />
          <Route path="/enquiries/email-generator" element={<EmailGenerator />} />
          <Route path="/songs" element={<SongsList />} />
          <Route path="/people" element={<PeopleList />} />
          <Route path="/services" element={<ServicesList />} />
          <Route path="/services/roles" element={<RolesList />} />
          <Route path="/services/:id" element={<ServiceDetail />} />
          <Route path="/showcases" element={<ShowcasesList />} />
          <Route path="/showcases/:id" element={<ShowcaseDetail />} />
          <Route path="/attributions" element={<AttributionsList />} />
          <Route path="/attributions/:id" element={<AttributionDetail />} />
          <Route path="/rehearsals" element={<RehearsalsList />} />
          <Route path="/expenses" element={<ExpensesList />} />
          <Route path="/accounts" element={<AccountsList />} />
          <Route path="/accounts/:id" element={<AccountDetail />} />
          <Route path="/accounting" element={<AccountingPage />} />
          <Route path="/fee-allocations" element={<FeeAllocationsList />} />
          <Route path="/expense-payments" element={<ExpensePaymentsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}
