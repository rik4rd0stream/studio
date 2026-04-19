
"use client";

import { useState, useEffect } from "react";
import { AppView, User } from "@/lib/types";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Send, Bell, Activity, Menu, WifiOff } from "lucide-react";
import { CreateOrder } from "@/components/orders/create-order";
import { ActiveOrders } from "@/components/orders/active-orders";
import { RequestOrder } from "@/components/orders/request-order";
import { Registration } from "@/components/admin/registration";
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
  const [currentView, setView] = useState<AppView>('send-order');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [prefilledOrderId, setPrefilledOrderId] = useState<string>("");

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
    // Garante que o ID seja sempre uma string ao ser passado para o estado
    setPrefilledOrderId(String(orderId));
    setView('send-order');
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
      case 'active-orders':
        return <ActiveOrders onSelectOrder={handleSelectOrderFromActive} />;
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
      <PushListener user={user} onPendingCountChange={setPendingCount} />
      
      <div className="w-64 h-full hidden md:block">
        <SidebarNav currentView={currentView} setView={setView} user={user} onLogout={onLogout} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b flex items-center justify-between px-4 md:px-6 bg-card/50 backdrop-blur-sm z-10 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Menu className="h-5 w-5 text-primary" />
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

            <div className="hidden sm:block font-bold text-primary text-xl">RC</div>
            
            <div className="flex gap-1.5 items-center">
              <Button 
                size="sm" 
                variant={currentView === 'send-order' ? 'default' : 'outline'} 
                className="rounded-full h-8 gap-1.5 text-[10px] px-3 transition-all"
                onClick={() => handleSetView('send-order')}
              >
                <Send className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Envio</span>
              </Button>
              
              <Button 
                size="sm" 
                variant={currentView === 'active-orders' ? 'default' : 'outline'} 
                className="rounded-full h-8 gap-1.5 text-[10px] px-3 transition-all"
                onClick={() => handleSetView('active-orders')}
              >
                <Activity className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Ativos</span>
              </Button>

              {isOffline && (
                <div className="flex items-center gap-1 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 px-2 py-1 rounded-full text-[8px] font-bold uppercase animate-pulse border border-red-200">
                  <WifiOff className="h-3 w-3" /> Offline
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1 md:gap-3">
            {user.notificationsEnabled && (
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "rounded-full relative h-9 w-9 transition-all",
                  pendingCount > 0 ? "text-primary bg-primary/10" : "text-muted-foreground"
                )}
                onClick={() => handleSetView('active-orders')}
              >
                <Bell className={cn("h-5 w-5", pendingCount > 0 && "animate-ring")} />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
                    {pendingCount}
                  </span>
                )}
              </Button>
            )}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth pb-[env(safe-area-inset-bottom)]">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
