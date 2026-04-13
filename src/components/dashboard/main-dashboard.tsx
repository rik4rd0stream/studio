
"use client";

import { useState } from "react";
import { AppView, User } from "@/lib/types";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Send, Bell, Users, Activity, PackageSearch, Menu } from "lucide-react";
import { CreateOrder } from "@/components/orders/create-order";
import { ActiveOrders } from "@/components/orders/active-orders";
import { RequestOrder } from "@/components/orders/request-order";
import { Registration } from "@/components/admin/registration";
import { PushListener } from "@/components/notifications/push-listener";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface MainDashboardProps {
  user: User;
  onLogout: () => void;
}

export function MainDashboard({ user, onLogout }: MainDashboardProps) {
  const [currentView, setView] = useState<AppView>('send-order');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSetView = (view: AppView) => {
    setView(view);
    setIsMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'send-order':
        return <CreateOrder onOrderCreated={() => setView('active-orders')} />;
      case 'active-orders':
        return <ActiveOrders />;
      case 'request-order':
        return <RequestOrder sender={user} />;
      case 'admin-users':
        return <Registration type="users" />;
      case 'admin-couriers':
        return <Registration type="couriers" />;
      default:
        return <CreateOrder onOrderCreated={() => setView('active-orders')} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PushListener user={user} />
      
      {/* Sidebar para Desktop */}
      <div className="w-64 h-full hidden md:block">
        <SidebarNav currentView={currentView} setView={setView} user={user} onLogout={onLogout} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b flex items-center justify-between px-4 md:px-6 bg-card/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Botão de Menu para Mobile */}
            <div className="md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Menu className="h-5 w-5 text-primary" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 border-none">
                  <SidebarNav 
                    currentView={currentView} 
                    setView={handleSetView} 
                    user={user} 
                    onLogout={onLogout} 
                  />
                </SheetContent>
              </Sheet>
            </div>

            <div className="hidden sm:block font-bold text-primary text-xl">RC</div>
            
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
              <Button 
                size="sm" 
                variant={currentView === 'send-order' ? 'default' : 'outline'} 
                className="rounded-full h-8 gap-1.5 text-[10px] px-3"
                onClick={() => setView('send-order')}
              >
                <Send className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Envio</span>
              </Button>
              <Button 
                size="sm" 
                variant={currentView === 'active-orders' ? 'default' : 'outline'} 
                className="rounded-full h-8 gap-1.5 text-[10px] px-3"
                onClick={() => setView('active-orders')}
              >
                <Activity className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Monitorar</span>
              </Button>
              {(user.hasRequestAccess || user.profile === 'master') && (
                <Button 
                  size="sm" 
                  variant={currentView === 'request-order' ? 'default' : 'outline'} 
                  className="rounded-full h-8 gap-1.5 text-[10px] px-3"
                  onClick={() => setView('request-order')}
                >
                  <PackageSearch className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Solicitação</span>
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 md:gap-3">
            <div className="hidden lg:flex items-center gap-2 mr-2 bg-muted/50 px-3 py-1 rounded-full border border-border">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Sistema Ativo</span>
            </div>
            
            {user.notificationsEnabled && (
              <Button variant="ghost" size="icon" className="rounded-full relative h-9 w-9">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
              </Button>
            )}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
