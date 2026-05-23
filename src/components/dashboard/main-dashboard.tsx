
"use client";

import { useState, useEffect } from "react";
import { AppView, User } from "@/lib/types";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Send, Bell, Activity, Menu, WifiOff, Radar, Zap, Store } from "lucide-react";
import { CreateOrder } from "@/components/orders/create-order";
import { QuickSend } from "@/components/orders/quick-send";
import { ActiveOrders } from "@/components/orders/active-orders";
import { RequestOrder } from "@/components/orders/request-order";
import { Registration } from "@/components/admin/registration";
import { StoreRegistration } from "@/components/admin/store-registration";
import { OperationLogs } from "@/components/admin/operation-logs";
import { RTStatus } from "@/components/admin/rt-status";
import { PushListener } from "@/components/notifications/push-listener";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface MainDashboardProps {
  user: User;
  onLogout: () => void;
}

export function MainDashboard({ user, onLogout }: MainDashboardProps) {
  const [currentView, setView] = useState<AppView>(user.hasQuickSendAccess ? 'quick-send' : 'send-order');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [prefilledOrderId, setPrefilledOrderId] = useState<string>("");

  const isMaster = user.role === 'master' || user.email === 'rik4rd0stream@gmail.com';

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSetView = (view: AppView) => {
    setView(view);
    setIsMobileMenuOpen(false);
  };

  const handleSelectOrderFromActive = (orderId: string) => {
    setPrefilledOrderId(String(orderId));
    setView(user.hasQuickSendAccess ? 'quick-send' : 'send-order');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'send-order':
        return (
          <CreateOrder 
            onOrderCreated={() => setView('active-orders')} 
            initialOrderId={prefilledOrderId}
            onClearInitialId={() => setPrefilledOrderId("")}
          />
        );
      case 'quick-send':
        return (
          <QuickSend 
            onOrderCreated={() => setView('active-orders')} 
            initialOrderId={prefilledOrderId}
            onClearInitialId={() => setPrefilledOrderId("")}
          />
        );
      case 'active-orders':
        return <ActiveOrders onSelectOrder={handleSelectOrderFromActive} />;
      case 'rt-status':
        return <RTStatus />;
      case 'request-order':
        return <RequestOrder sender={user} />;
      case 'admin-users':
        return <Registration type="users" />;
      case 'admin-couriers':
        return <Registration type="couriers" />;
      case 'admin-stores':
        return <StoreRegistration />;
      case 'operation-logs':
        return <OperationLogs />;
      default:
        return <CreateOrder onOrderCreated={() => setView('active-orders')} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PushListener user={user} onPendingCountChange={setPendingCount} />
      
      <div className="w-64 h-full hidden md:block">
        <SidebarNav currentView={currentView} setView={setView} user={user} onLogout={onLogout} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 border-b flex items-center justify-between px-4 md:px-6 bg-card/50 backdrop-blur-sm z-10 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full text-primary h-12 w-12">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 border-none">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Menu de Navegação</SheetTitle>
                    <SheetDescription>Acesse as funcionalidades do sistema</SheetDescription>
                  </SheetHeader>
                  <SidebarNav 
                    currentView={currentView} 
                    setView={handleSetView} 
                    user={user} 
                    onLogout={onLogout} 
                  />
                </SheetContent>
              </Sheet>
            </div>

            <div className="font-bold text-primary text-2xl tracking-tighter">RC</div>
            
            <div className="flex gap-3 items-center ml-2">
              {user.hasQuickSendAccess && (
                <Button 
                  size="lg" 
                  variant={currentView === 'quick-send' ? 'default' : 'outline'} 
                  className={cn(
                    "rounded-2xl h-11 gap-2 text-xs font-bold px-4 transition-all border-primary/30",
                    currentView === 'quick-send' && "shadow-lg shadow-primary/20"
                  )}
                  onClick={() => handleSetView('quick-send')}
                >
                  <Zap className="h-4 w-4" /> <span className="hidden xs:inline">Rápido</span>
                </Button>
              )}

              <Button 
                size="lg" 
                variant={currentView === 'send-order' ? 'default' : 'outline'} 
                className={cn(
                  "rounded-2xl h-11 gap-2 text-xs font-bold px-4 transition-all border-primary/30",
                  currentView === 'send-order' && "shadow-lg shadow-primary/20"
                )}
                onClick={() => handleSetView('send-order')}
              >
                <Send className="h-4 w-4" /> <span className="hidden xs:inline">Envio</span>
              </Button>
              
              <Button 
                size="lg" 
                variant={currentView === 'active-orders' ? 'default' : 'outline'} 
                className={cn(
                  "rounded-2xl h-11 gap-2 text-xs font-bold px-4 transition-all border-primary/30",
                  currentView === 'active-orders' && "shadow-lg shadow-primary/20"
                )}
                onClick={() => handleSetView('active-orders')}
              >
                <Activity className="h-4 w-4" /> <span className="hidden xs:inline">Ativos</span>
              </Button>

              {isOffline && (
                <div className="flex items-center gap-1.5 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase animate-pulse border border-red-200">
                  <WifiOff className="h-3.5 w-3.5" /> Offline
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {user.notificationsEnabled && (
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "rounded-full relative h-11 w-11 transition-all",
                  pendingCount > 0 ? "text-primary bg-primary/10" : "text-muted-foreground"
                )}
                onClick={() => handleSetView('active-orders')}
              >
                <Bell className={cn("h-6 w-6", pendingCount > 0 && "animate-ring")} />
                {pendingCount > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
                    {pendingCount}
                  </span>
                )}
              </Button>
            )}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth pb-[env(safe-area-inset-bottom)]">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
