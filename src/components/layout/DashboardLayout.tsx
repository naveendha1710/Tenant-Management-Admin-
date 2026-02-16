import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Search, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BackToHome } from "@/components/ui/back-to-home";
import { NotificationsDrawer } from "@/components/NotificationsDrawer";
import { RoleBasedActionButton } from "./RoleBasedActionButton";
import { NotificationBadge } from "./NotificationBadge";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { DemoNotice } from "@/components/ui/demo-notice";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import React from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const { user, role, logout } = useAuth();

  const handleSignOut = async () => {
    await logout();
  };
  
  const HeaderContent = () => {
    const { isMobile } = useSidebar();
    
    return (
      <header className="h-16 border-b border-dashboard-nav-border bg-dashboard-nav/95 backdrop-blur-sm flex-shrink-0 z-40">
        <div className="flex items-center justify-between h-full px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4">
            {isMobile && <SidebarTrigger className="text-foreground hover:bg-muted" />}
            <BackToHome variant="ghost" size="sm" className="hidden sm:flex" />
            {title && (
              <div className="flex flex-col">
                <h1 className="text-base sm:text-base sm:text-lg md:text-xl font-semibold text-foreground truncate max-w-[150px] sm:max-w-none">{title}</h1>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{subtitle}</p>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 sm:gap-4">
            {/* Role-based Primary Action Button */}
            <div className="hidden lg:block">
              <RoleBasedActionButton />
            </div>
            
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search tenants, spaces..." 
                className="w-48 lg:w-full sm:w-64 pl-10"
              />
            </div>
            
            {/* Notifications */}
            <NotificationBell />
            
            {/* Application Notifications Badge */}
            <div className="hidden sm:block">
              <NotificationBadge />
            </div>
          </div>
        </div>
      </header>
    );
  };
  
  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-gradient-dashboard overflow-hidden">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Top Navigation Bar */}
          <HeaderContent />
          
          {/* Main Content */}
          <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}