
"use client";

import { useState } from "react";
import { AppView, User } from "@/lib/types";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Send, Bell, Users, Activity, PackageSearch } from "lucide-react";
import { CreateOrder } from "@/components/orders/create-order";
import { ActiveOrders } from "@/components/orders/active-orders";
import { RequestOrder } from "@/components/orders/request-order";
import { Registration } from "@/components/admin/registration";
import { PushListener } from "@/components/notifications/push-listener";

interface MainDashboardProps {
  user: User;
  onLogout: () => void;
}

export function MainDashboard({ user, onLogout }: MainDashboardProps) {
  const [currentView, setView] = useState<AppView>('send-order');

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
      
      <div className="w-64 h-full hidden md:block">
        <SidebarNav currentView={currentView} setView={setView} user={user} onLogout={onLogout} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <div className="md:hidden font-bold text-primary">RC</div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant={currentView === 'send-order' ? 'default' : 'outline'} 
                className="rounded-full h-8 gap-1.5"
                onClick={() => setView('send-order')}
              >
                <Send className="h-3.5 w-3.5" /> Envio
              </Button>
              <Button 
                size="sm" 
                variant={currentView === 'active-orders' ? 'default' : 'outline'} 
                className="rounded-full h-8 gap-1.5"
                onClick={() => setView('active-orders')}
              >
                <Activity className="h-3.5 w-3.5" /> Monitorar
              </Button>
              {(user.hasRequestAccess || user.profile === 'master') && (
                <Button 
                  size="sm" 
                  variant={currentView === 'request-order' ? 'default' : 'outline'} 
                  className="rounded-full h-8 gap-1.5 hidden sm:flex"
                  onClick={() => setView('request-order')}
                >
                  <PackageSearch className="h-3.5 w-3.5" /> Solicitação
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 mr-4 bg-muted/50 px-3 py-1 rounded-full border border-border">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Sistema Ativo</span>
            </div>
            {user.profile === 'master' && (
              <Button variant="ghost" size="sm" className="hidden lg:flex gap-2 text-xs" onClick={() => setView('admin-users')}>
                <Users className="h-4 w-4" /> Admin
              </Button>
            )}
            {user.notificationsEnabled && (
              <Button variant="ghost" size="icon" className="rounded-full relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
              </Button>
            )}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
