import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, FileText, FileCheck, ShoppingCart, Gavel,
  Truck, Users, Building2, Wrench, BarChart3, Bell, Menu,
  IndianRupee, Inbox, ClipboardList, Receipt, CreditCard, Layers,
  ChevronDown, LogOut, ChevronRight,
  PanelLeftClose, PanelLeftOpen, ShieldCheck,
  Eye, Calendar, FlaskConical, ArrowRightLeft, TrendingUp, Activity,
  Settings, Merge, Shield, Search, Network, Sparkles
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
}

import type { UserRole } from "@/contexts/AuthContext";

const ALL_NAV_GROUPS: NavGroup[] = [
  {
    label: "INTELLIGENCE",
    items: [
      { href: "/", label: "Command Center", icon: LayoutDashboard },
      { href: "/approval-inbox", label: "Approval Inbox", icon: Inbox },
    ],
  },
  {
    label: "DEMAND & BUDGET",
    items: [
      { href: "/indents", label: "Indents", icon: FileText },
      { href: "/budget", label: "Budget Register", icon: IndianRupee },
    ],
  },
  {
    label: "PROCUREMENT",
    items: [
      { href: "/rc-coverage", label: "RC Coverage", icon: ShieldCheck },
      { href: "/rate-contracts", label: "Rate Contracts", icon: FileCheck },
      { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
      { href: "/tenders", label: "Tenders", icon: Gavel },
      { href: "/tenders/workbench", label: "Tender Workbench", icon: Layers },
    ],
  },
  {
    label: "FULFILMENT & QA",
    items: [
      { href: "/deliveries", label: "Deliveries & QA", icon: Truck },
      { href: "/grn", label: "GRN & Installation", icon: ClipboardList },
      { href: "/vendor-portal", label: "Vendor Portal", icon: Building2 },
    ],
  },
  /* Hiding Inventory temporarily as per request
  {
    label: "INVENTORY",
    items: [
      { href: "/stock-visibility", label: "Stock Visibility", icon: Eye },
      { href: "/stock-transfers", label: "Stock Transfers", icon: ArrowRightLeft },
    ],
  },
  */
  {
    label: "FINANCE",
    items: [
      { href: "/payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    label: "ADMINISTRATION",
    items: [
      { href: "/users", label: "Users & Roles", icon: Users },
      { href: "/equipment", label: "Equipment Master", icon: Wrench },
      { href: "/masters", label: "Statutory Masters", icon: Shield },
      { href: "/vendors", label: "Vendors", icon: Building2 },
      { href: "/institutions", label: "Hospital Master", icon: Building2 },
      { href: "/approval-hierarchy", label: "Approval Hierarchy", icon: Settings },
      // { href: "/audit-trail", label: "Audit Trail", icon: ShieldCheck },
    ],
  },
  {
    label: "ANALYTICS & REPORTS",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
];

const ROLE_ALLOWED_PATHS: Record<UserRole, string[]> = {
  admin: ["*"], // Admin has all modules enabled
  vendor: [
    "/approval-inbox",
    "/indents",
    "/vendor-portal",
    "/purchase-orders",
    "/deliveries",
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
    "/stock-visibility",
    "/reports",
  ],
  so_equipment: [
    "/",
    "/approval-inbox",
    "/indents",
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
    "/payments",
    "/audit-trail",
    "/kpi-dashboard",
    "/demand-forecast",
    "/users",
    "/reports",
  ],
  managing_director: [
    "/",
    "/indents",
    "/budget",
    "/rc-coverage",
    "/rate-contracts",
    "/purchase-orders",
    "/tenders",
    "/deliveries",
    "/payments",
    "/vendors",
    "/institutions",
    "/equipment",
    "/users",
    "/kpi-dashboard",
    "/demand-forecast",
    "/audit-trail",
    "/reports",
  ],
  tgmsidc_user: [
    "/approval-inbox",
    "/indents",
    "/budget",
    "/rc-coverage",
    "/rate-contracts",
    "/purchase-orders",
    "/tenders",
    "/tenders/workbench",
    "/deliveries",
    "/grn",
    "/payments",
    "/reports",
  ],
};

function getNavGroupsForRole(role: UserRole): NavGroup[] {
  if (role === "admin") return ALL_NAV_GROUPS;
  const allowed = Array.from(new Set([...(ROLE_ALLOWED_PATHS[role] || []), "/approval-inbox", "/indents"]));
  return ALL_NAV_GROUPS.map((group) => {
    const filteredItems = group.items.filter((item) => allowed.includes(item.href));
    return { ...group, items: filteredItems };
  }).filter((group) => group.items.length > 0);
}

// Helper to determine active breadcrumb title from path
function getBreadcrumb(pathname: string): { section: string; title: string } {
  if (pathname === "/") return { section: "Intelligence", title: "Command Center" };
  if (pathname.startsWith("/approval-inbox")) return { section: "Intelligence", title: "Approval Inbox" };
  if (pathname.startsWith("/indents/new")) return { section: "Demand", title: "New Indent Requisition" };
  if (pathname.startsWith("/indents/")) return { section: "Demand", title: "Indent Detail Workspace" };
  if (pathname.startsWith("/indents")) return { section: "Demand", title: "Indent Management" };
  if (pathname.startsWith("/budget")) return { section: "Demand", title: "Budget & Allocation Register" };
  if (pathname.startsWith("/rc-coverage")) return { section: "Procurement", title: "Rate Contract Coverage" };
  if (pathname.startsWith("/rate-contracts")) return { section: "Procurement", title: "Rate Contracts" };
  if (pathname.startsWith("/purchase-orders")) return { section: "Procurement", title: "Purchase Orders" };
  if (pathname.startsWith("/tenders/workbench")) return { section: "Procurement", title: "Tender Workbench" };
  if (pathname.startsWith("/tenders")) return { section: "Procurement", title: "Tenders" };
  if (pathname.startsWith("/deliveries")) return { section: "Fulfilment", title: "Deliveries & Inspection" };
  if (pathname.startsWith("/grn")) return { section: "Fulfilment", title: "Consignee GRN & Commissioning" };
  if (pathname.startsWith("/vendor-portal")) return { section: "Fulfilment", title: "Vendor Fulfilment Portal" };
  if (pathname.startsWith("/equipment")) return { section: "Administration", title: "Equipment Master & Registry" };
  if (pathname.startsWith("/stock-visibility")) return { section: "Inventory", title: "Stock Visibility" };
  if (pathname.startsWith("/stock-transfers")) return { section: "Inventory", title: "Stock Transfers" };
  if (pathname.startsWith("/invoices")) return { section: "Finance", title: "Invoices" };
  if (pathname.startsWith("/payments")) return { section: "Finance", title: "Payments & Disbursements" };
  if (pathname.startsWith("/masters")) return { section: "Admin", title: "Statutory Masters" };
  if (pathname.startsWith("/vendors")) return { section: "Admin", title: "Vendor Registry" };
  if (pathname.startsWith("/institutions")) return { section: "Admin", title: "Healthcare Facilities & Consignees" };
  if (pathname.startsWith("/approval-hierarchy")) return { section: "Admin", title: "Approval Hierarchy" };
  if (pathname.startsWith("/audit-trail")) return { section: "Admin", title: "Audit Trail" };
  if (pathname.startsWith("/kpi-dashboard")) return { section: "Analytics", title: "Procurement Control Tower" };
  if (pathname.startsWith("/demand-forecast")) return { section: "Analytics", title: "Demand Forecasting" };
  if (pathname.startsWith("/reports")) return { section: "Analytics", title: "Statutory Reports" };
  return { section: "Procurement", title: "Portal" };
}

function NavItemEl({ href, label, icon: Icon, badge, collapsed }: NavItem & { collapsed: boolean }) {
  const [location] = useLocation();
  const isActive = href === "/" ? location === "/" : location.startsWith(href);

  const inner = (
    <Link href={href}>
      <div
        data-active={isActive ? "true" : undefined}
        className={cn(
          "neo-nav-i select-none group cursor-pointer transition-all duration-150",
          collapsed ? "justify-center px-1.5" : "px-3 py-2",
          isActive
            ? "active on bg-[#1f7e17] hover:bg-[#1f7e17] text-white font-semibold shadow-sm"
            : "text-white/90 hover:text-white hover:bg-white/[0.08]"
        )}
      >
        <Icon className={cn("w-4 h-4 shrink-0 transition-opacity text-white", isActive ? "opacity-100" : "opacity-85 group-hover:opacity-100")} />

        {!collapsed && (
          <>
            <span className="truncate flex-1 tracking-tight text-[13px]">{label}</span>
            {badge && (
              <span className="bg-[#dc2f3c] text-white text-[9.5px] font-bold rounded-full px-1.5 py-0.2 shrink-0">
                {badge}
              </span>
            )}
          </>
        )}
      </div>
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs bg-[#060f19] text-white border-white/10">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  if (!user) return null;

  const breadcrumb = getBreadcrumb(location);
  const navGroups = getNavGroupsForRole(user.role);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-screen w-screen overflow-hidden bg-[#f4f7fb] text-[#152340]">
        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* ── Left Rail Sidebar (Exact Dark Obsidian neoInt Design) ── */}
        <aside
          className={cn(
            "fixed lg:relative z-50 flex flex-col h-full bg-[#060f19] text-white border-r border-white/[0.08] transition-all duration-200 ease-in-out shrink-0",
            collapsed ? "w-[64px]" : "w-[240px]",
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          {/* Header Brand: Deloitte. + Identity Block */}
          <div
            className={cn(
              "neo-brand shrink-0 border-b border-white/[0.08]",
              collapsed ? "px-2 py-4 flex flex-col items-center" : "px-4 py-4"
            )}
          >
            <div className="flex items-center justify-between w-full">
              {!collapsed ? (
                <div className="flex items-center text-[21px] font-extrabold tracking-tight text-white leading-none">
                  Deloitte<span className="text-[#86bc25] text-2xl leading-none font-black ml-0.5">.</span>
                </div>
              ) : (
                <div className="text-white font-extrabold text-xl leading-none">
                  D<span className="text-[#86bc25] font-black">.</span>
                </div>
              )}

              <button
                onClick={() => setCollapsed(!collapsed)}
                className={cn(
                  "hidden lg:flex items-center justify-center rounded p-1 transition-colors text-[#7e97be] hover:text-white hover:bg-white/[0.08]",
                  collapsed && "mt-2"
                )}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Sub-identity: Procurement Portal */}
            {!collapsed && (
              <div className="flex items-center gap-2.5 mt-4 pt-0.5">
                <div className="w-6 h-6 flex items-center justify-center text-white/90 shrink-0">
                  <Network className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-bold text-white tracking-tight leading-tight truncate">
                    Procurement Portal
                  </div>
                  <div className="text-[#38bdf8] text-[10.5px] font-semibold leading-none mt-1 truncate tracking-wide">
                    Healthcare Procurement
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links Scrollable Area */}
          <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
            {navGroups.map((group) => (
              <div key={group.label} className="pt-1 first:pt-0">
                {!collapsed && (
                  <div className="flex items-center gap-2 px-2.5 pt-2 pb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#86bc25] shrink-0 shadow-[0_0_6px_rgba(134,188,37,0.9)]" />
                    <p className="text-[10.5px] uppercase tracking-wider font-extrabold text-[#38bdf8] drop-shadow-sm select-none truncate">
                      {group.label}
                    </p>
                  </div>
                )}
                {collapsed && <div className="border-t border-white/[0.08] my-2" />}
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavItemEl
                      key={item.href}
                      {...item}
                      collapsed={collapsed}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer: Powered by neoInt */}
          <div className="neo-rail-foot shrink-0 border-t border-white/[0.08] bg-[#060f19]">
            {!collapsed ? (
              <div className="px-2 py-1">
                <div className="text-[10px] font-semibold text-[#e2e8f0] tracking-wider uppercase leading-none mb-1">
                  Powered by
                </div>
                <div className="text-[18px] font-bold text-white tracking-tight leading-tight flex items-center">
                  neo<span className="text-[#86bc25] font-extrabold">Int</span>
                </div>
                <div className="text-[10px] text-[#e2e8f0] leading-tight mt-1.5 font-medium">
                  Intelligence for healthcare procurement & equipment
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2">
                <span className="text-[11px] font-bold text-[#86bc25]">neoInt</span>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main App Content Column ── */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Top Bar (neoInt 58px Topbar) */}
          <header className="h-[58px] min-h-[58px] bg-white border-b border-[#e4eaf2] flex items-center justify-between px-4 sm:px-6 gap-3 shrink-0 z-30 shadow-xs">
            {/* Left section: Hamburger (mobile) + Breadcrumbs */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden text-[#6b7a93] hover:text-[#152340] p-1.5 rounded-md hover:bg-[#f4f7fb]"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1.5 text-xs text-[#6b7a93] truncate">
                <span className="font-semibold text-[#152340]/70 hover:text-[#152340] cursor-pointer" onClick={() => navigate("/")}>
                  Portal
                </span>
                <span className="text-[#93a2b8] font-mono">/</span>
                <span className="text-[#6b7a93] font-medium">{breadcrumb.section}</span>
                <span className="text-[#93a2b8] font-mono">/</span>
                <span className="text-[#152340] font-bold truncate">{breadcrumb.title}</span>
              </div>
            </div>

            {/* Middle / Right: Pill Search + Badges + Profile */}
            <div className="flex items-center gap-3">
              {/* Pill Search */}
              <div className="relative hidden md:block">
                <Search className="w-4 h-4 text-[#93a2b8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search portal (Indents, POs, Tenders, Equipment)..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="w-64 lg:w-80 h-[34px] rounded-full bg-[#f4f7fb] border border-[#e4eaf2] text-[12.5px] text-[#152340] placeholder:text-[#93a2b8] pl-9 pr-3 focus:outline-none focus:border-[#2563eb] focus:bg-white transition-all"
                />
              </div>

              {/* Financial Year Pill */}
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-[#f4f7fb] border border-[#e4eaf2] rounded-md text-[11px] font-semibold text-[#3c4a63]">
                <Calendar className="w-3.5 h-3.5 text-[#2563eb]" />
                <span>FY 2026–27</span>
              </div>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  className="w-[34px] h-[34px] rounded-md text-[#6b7a93] hover:text-[#152340] hover:bg-[#f4f7fb] flex items-center justify-center transition-colors relative"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#dc2f3c] ring-2 ring-white" />
                </button>
              </div>

              {/* User Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 pl-3 border-l border-[#e4eaf2] hover:opacity-90 transition-opacity outline-none cursor-pointer">
                    <div className="w-[32px] h-[32px] rounded-full bg-gradient-to-br from-[#060f19] to-[#186812] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                      {user.initials || "TG"}
                    </div>
                    <div className="hidden md:block text-left">
                      <div className="text-[12.5px] font-bold text-[#152340] leading-tight flex items-center gap-1.5">
                        <span>{user.fullName}</span>
                      </div>
                      <div className="text-[10px] font-medium text-[#6b7a93] leading-none mt-0.5">
                        {user.roleLabel}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-[#93a2b8] hidden md:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 bg-white border-[#e4eaf2] shadow-lg rounded-lg p-1.5">
                  <DropdownMenuLabel className="font-normal px-2.5 py-2">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-bold text-[#152340]">{user.fullName}</p>
                      <p className="text-xs text-[#6b7a93]">{user.designation || user.roleLabel}</p>
                      {user.facilityName && (
                        <p className="text-xs text-[#2563eb] font-medium mt-0.5">{user.facilityName}</p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#e4eaf2]" />
                  <DropdownMenuItem className="text-xs text-[#6b7a93] cursor-default px-2.5 py-1.5" disabled>
                    Role: <span className="font-semibold text-[#152340] ml-1">{user.roleLabel}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs text-[#6b7a93] cursor-default px-2.5 py-1.5" disabled>
                    Dept: <span className="font-semibold text-[#152340] ml-1">{user.department || "Medical Procurement"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#e4eaf2]" />
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      navigate("/login");
                    }}
                    className="cursor-pointer text-[#dc2f3c] focus:text-[#dc2f3c] focus:bg-[#fef2f3] px-2.5 py-1.5 text-xs font-semibold rounded-md"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Scrollable Canvas */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 bg-[#f4f7fb]">
            <div className="max-w-[1720px] mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
