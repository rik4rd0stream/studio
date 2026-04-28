
"use client";

import { AppView, User } from "@/lib/types";
import { 
  Send, 
  PackageSearch, 
  Activity, 
  Users, 
  Bike, 
  LogOut,
  ChevronRight,
  ClipboardList,
  Navigation
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarNavProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  user: User;
  onLogout: () => void;
}

export function SidebarNav({ currentView, setView, user, onLogout }: SidebarNavProps) {
  const navItems = [
    { id: 'send-order', label: 'Envio de Pedido', icon: Send },
    { id: 'rt-status', label: 'Status Real-Time RT', icon: Navigation },
    { id: 'request-order', label: 'Solicitação de Pedido', icon: PackageSearch, restricted: true },
    { id: 'active-orders', label: 'Pedidos Ativos', icon: Activity },
  ];

  const adminItems = [
    { id: 'operation-logs', label: 'Log de Operações', icon: ClipboardList, masterOnly: true },
    { id: 'admin-users', label: 'Gestão de Usuários', icon: Users, masterOnly: true },
    { id: 'admin-couriers', label: 'Gestão de Entregadores', icon: Bike, masterOnly: false },
  ];

  const userName = user?.name || "Usuário";
  const firstName = userName.split(' ')[0] || "Usuário";

  const renderItem = (item: any) => {
    const isMaster = user.role === 'master' || user.email === 'rik4rd0stream@gmail.com';
    
    if (item.masterOnly && !isMaster) return null;
    if (item.restricted && !user.hasRequestAccess && !isMaster) return null;
    
    const active = currentView === item.id;
    
    return (
      <Button
        key={item.id}
        variant="ghost"
        className={cn(
          "w-full justify-start gap-3 h-12 px-4 transition-all duration-200 rounded-xl mb-1",
          active ? "bg-primary text-primary-foreground font-semibold shadow-md" : "hover:bg-muted"
        )}
        onClick={() => setView(item.id as AppView)}
      >
        <item.icon className={cn("h-5 w-5", active ? "text-white" : "text-primary")} />
        <span className="flex-1 text-left text-sm">{item.label}</span>
        {active && <ChevronRight className="h-4 w-4" />}
      </Button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card border-r" data-sidebar="sidebar">
      <div className="p-6">
        <h2 className="text-lg font-headline font-bold text-primary tracking-tight leading-none">Rappi Commander</h2>
        <div className="mt-4 px-1">
          <p className="text-xs text-muted-foreground font-medium">Olá, <span className="text-foreground font-bold">{firstName}</span></p>
        </div>
      </div>
      <div className="flex-1 px-3 space-y-1">
        <div className="py-2">
          <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Operação</p>
          {navItems.map(renderItem)}
        </div>
        <div className="py-2 border-t border-muted/50">
          <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Administração</p>
          {adminItems.map(renderItem)}
        </div>
      </div>
      <div className="p-4 border-t border-muted/50 space-y-2 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-2xl">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs shadow-inner">
            {userName.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate text-foreground">{userName}</p>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">{user.role}</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start gap-3 h-10 border-none text-destructive hover:bg-destructive/10 rounded-xl" onClick={onLogout}>
          <LogOut className="h-4 w-4" /> Sair do Sistema
        </Button>
      </div>
    </div>
  );
}
