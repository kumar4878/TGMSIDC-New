import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Indents from "@/pages/indents";
import IndentNew from "@/pages/indent-new";
import IndentDetail from "@/pages/indent-detail";
import RateContracts from "@/pages/rate-contracts";
import RateContractNew from "@/pages/rate-contract-new";
import RateContractDetail from "@/pages/rate-contract-detail";
import PurchaseOrders from "@/pages/purchase-orders";
import PurchaseOrderNew from "@/pages/purchase-order-new";
import PurchaseOrderDetail from "@/pages/purchase-order-detail";
import Tenders from "@/pages/tenders";
import TenderDetail from "@/pages/tender-detail";
import TenderWorkbench from "@/pages/tender-workbench";
import Deliveries from "@/pages/deliveries";
import DeliveryDetail from "@/pages/delivery-detail";
import Vendors from "@/pages/vendors";
import VendorNew from "@/pages/vendor-new";
import VendorDetail from "@/pages/vendor-detail";
import Institutions from "@/pages/institutions";
import Equipment from "@/pages/equipment";
import Reports from "@/pages/reports";
import Budget from "@/pages/budget";
import ApprovalInbox from "@/pages/approval-inbox";
import GRN from "@/pages/grn";
import Invoices from "@/pages/invoices";
import Payments from "@/pages/payments";
import Consolidation from "@/pages/consolidation";
import ApprovalHierarchy from "@/pages/approval-hierarchy";
import RCCoverage from "@/pages/rc-coverage";
import StockTransfers from "@/pages/stock-transfers";
import StockTransferNew from "@/pages/stock-transfer-new";
import StockTransferDetail from "@/pages/stock-transfer-detail";
import Quarantine from "@/pages/quarantine";
import QuarantineDetail from "@/pages/quarantine-detail";
import StockVisibility from "@/pages/stock-visibility";
import NearExpiry from "@/pages/near-expiry";
import DemandForecast from "@/pages/demand-forecast";
import KPIDashboard from "@/pages/kpi-dashboard";
import MasterData from "@/pages/master-data";
import AuditTrail from "@/pages/audit-trail";
import VendorPortal from "@/pages/vendor-portal";
import NotFound from "@/pages/not-found";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

import type { UserRole } from "@/contexts/AuthContext";

const ROLE_PERMITTED_ROUTES: Record<UserRole, string[]> = {
  admin: ["*"], // Admin has all modules and screens enabled
  vendor: [
    "/approval-inbox",
    "/indents",
    "/vendor-portal",
    "/purchase-orders",
    "/deliveries",
    "/invoices",
    "/reports",
  ],
  consignee: [
    "/",
    "/approval-inbox",
    "/indents",
    "/deliveries",
    "/grn",
    "/stock-visibility",
    "/reports",
  ],
  deo: [
    "/",
    "/approval-inbox",
    "/indents",
    "/indents/new",
    "/stock-visibility",
    "/reports",
  ],
  so_equipment: [
    "/",
    "/approval-inbox",
    "/indents",
    "/consolidation",
    "/rc-coverage",
    "/rate-contracts",
    "/purchase-orders",
    "/tenders",
    "/deliveries",
    "/grn",
    "/reports",
  ],
  gm_equipment: [
    "/",
    "/approval-inbox",
    "/indents",
    "/consolidation",
    "/budget",
    "/rc-coverage",
    "/rate-contracts",
    "/purchase-orders",
    "/tenders",
    "/tenders/workbench",
    "/deliveries",
    "/grn",
    "/equipment",
    "/vendors",
    "/institutions",
    "/kpi-dashboard",
    "/reports",
  ],
  executive_director: [
    "/",
    "/approval-inbox",
    "/indents",
    "/budget",
    "/purchase-orders",
    "/tenders",
    "/invoices",
    "/payments",
    "/audit-trail",
    "/kpi-dashboard",
    "/demand-forecast",
    "/reports",
  ],
  tgmsidc_user: [
    "/",
    "/approval-inbox",
    "/indents",
    "/budget",
    "/purchase-orders",
    "/deliveries",
    "/invoices",
    "/payments",
    "/reports",
  ],
};

function ProtectedScreen({ path, component: Component, params }: { path: string; component: React.ComponentType<any>; params?: any }) {
  const { user } = useAuth();
  if (!user) return <Redirect to="/login" />;

  if (user.role === "admin") {
    return <Component {...params} />;
  }

  // Raise Indent (/indents/new) is restricted exclusively to DEO and Admin
  if (path === "/indents/new") {
    if (user.role !== "deo") {
      return <Redirect to="/indents" />;
    }
  }

  // Approval Inbox and Indent view/details are explicitly permitted for all roles
  if (path === "/approval-inbox" || path === "/indents" || path.startsWith("/indents/")) {
    return <Component {...params} />;
  }

  const permitted = ROLE_PERMITTED_ROUTES[user.role] || [];
  const isAllowed = permitted.some((p) => {
    if (p === "*") return true;
    if (p === path) return true;
    if (p !== "/" && path.startsWith(p + "/")) return true;
    return false;
  });

  if (!isAllowed) {
    const home = user.role === "vendor" ? "/vendor-portal" : user.role === "deo" ? "/indents" : "/";
    return <Redirect to={home} />;
  }

  return <Component {...params} />;
}

function r(path: string, Component: React.ComponentType<any>) {
  return (
    <Route path={path}>
      {(params) => <ProtectedScreen path={path} component={Component} params={params} />}
    </Route>
  );
}

function Router() {
  const [location] = useLocation();
  if (location === "/login") {
    return (
      <Switch>
        <Route path="/login" component={Login} />
      </Switch>
    );
  }
  return (
    <AuthGuard>
      <Layout>
        <Switch>
          {r("/", Dashboard)}
          {r("/indents/new", IndentNew)}
          {r("/indents/:id", IndentDetail)}
          {r("/indents", Indents)}
          {r("/consolidation", Consolidation)}
          {r("/rate-contracts/new", RateContractNew)}
          {r("/rate-contracts/:id", RateContractDetail)}
          {r("/rate-contracts", RateContracts)}
          {r("/purchase-orders/new", PurchaseOrderNew)}
          {r("/purchase-orders/:id", PurchaseOrderDetail)}
          {r("/purchase-orders", PurchaseOrders)}
          {r("/tenders/workbench", TenderWorkbench)}
          {r("/tenders/:id", TenderDetail)}
          {r("/tenders", Tenders)}
          {r("/deliveries/:id", DeliveryDetail)}
          {r("/deliveries", Deliveries)}
          {r("/grn", GRN)}
          {r("/invoices", Invoices)}
          {r("/payments", Payments)}
          {r("/budget", Budget)}
          {r("/approval-inbox", ApprovalInbox)}
          {r("/vendors/new", VendorNew)}
          {r("/vendors/:id", VendorDetail)}
          {r("/vendors", Vendors)}
          {r("/vendor-portal", VendorPortal)}
          {r("/institutions", Institutions)}
          {r("/equipment", Equipment)}
          {r("/masters", MasterData)}
          {r("/audit-trail", AuditTrail)}
          {r("/reports", Reports)}
          {r("/rc-coverage", RCCoverage)}
          {r("/approval-hierarchy", ApprovalHierarchy)}
          {r("/stock-transfers/new", StockTransferNew)}
          {r("/stock-transfers/:id", StockTransferDetail)}
          {r("/stock-transfers", StockTransfers)}
          <Route path="/quarantine/:id"><Redirect to="/stock-visibility" /></Route>
          <Route path="/quarantine"><Redirect to="/stock-visibility" /></Route>
          {r("/stock-visibility", StockVisibility)}
          <Route path="/near-expiry"><Redirect to="/stock-visibility" /></Route>
          {r("/demand-forecast", DemandForecast)}
          {r("/kpi-dashboard", KPIDashboard)}
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </AuthGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
