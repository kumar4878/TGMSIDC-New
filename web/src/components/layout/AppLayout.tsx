import React from "react";
import { Link, useLocation } from "wouter";
import { 
  Building2, 
  ClipboardList, 
  FileText, 
  LayoutDashboard, 
  Package, 
  Settings, 
  ShoppingCart, 
  Truck, 
  Users 
} from "lucide-react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider } from "@/components/ui/sidebar";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Indents", href: "/indents", icon: ClipboardList },
  { name: "Rate Contracts", href: "/rate-contracts", icon: FileText },
  { name: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart },
  { name: "Tenders", href: "/tenders", icon: FileText },
  { name: "Deliveries", href: "/deliveries", icon: Truck },
  { name: "Vendors", href: "/vendors", icon: Users },
  { name: "Institutions", href: "/institutions", icon: Building2 },
  { name: "Equipment", href: "/equipment", icon: Package },
  { name: "Reports", href: "/reports", icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-sidebar-primary flex items-center justify-center font-bold text-sidebar-primary-foreground">
                HP
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-none tracking-tight">Health Procurement</span>
                <span className="text-xs text-sidebar-foreground/70 leading-none">Portal</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href} className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors">
                        <item.icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-auto p-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
