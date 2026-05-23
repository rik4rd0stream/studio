
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
  Radar,
  Zap,
  Store
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
  const isMaster = user.role === 'master' || user.email === 'rik4rd0stream@gmail.com';

  const navItems = [
    { id: 'quick-send', label: 'Envio Rápido', icon: Zap, permission: 'hasQuickSendAccess' },
    { id: 'send-order', label: 'Envio de Pedido', icon: Send },
    { id: 'rt-status', label: 'Monitor RT', icon: Radar, permission: 'hasRtStatusAccess' },
    { id: 'request-order', label: 'Solicitação de Pedido', icon: PackageSearch, permission: 'hasRequestAccess' },
    { id: 'active-orders', label: 'Pedidos Ativos', icon: Activity },
  ];

  const adminItems = [
    { id: 'operation-logs', label: 'Log de Operações', icon: ClipboardList, masterOnly: true },
    { id: 'admin-users', label: 'Gestão de Usuários', icon: Users, masterOnly: true },
    { id: 'admin-couriers', label: 'Gestão de Entregadores', icon: Bike, masterOnly: false },
    { id: 'admin-stores', label: 'Gestão de Coletas', icon: Store, masterOnly: false },
  ];

  const userName = user?.name || "Usuário";
  const firstName = userName.split(' ')[0] || "Usuário";

  const renderItem = (item: any) => {
    if (item.masterOnly && !isMaster) return null;
    
    if (item.permission) {
      const hasPerm = (user as any)[item.permission];
      if (!hasPerm && !isMaster) return null;
    }
    
    const active = currentView === item.id;
    
    return (
      <Button
        key={item.id}
        variant="ghost"
        className={cn(
          "w-full justify-start gap-3 h-14 px-4 transition-all duration-200 rounded-2xl mb-2",
          active ? "bg-primary text-primary-foreground font-bold shadow-lg" : "hover:bg-muted"
        )}
        onClick={() => setView(item.id as AppView)}
      >
        <item.icon className={cn("h-6 w-6", active ? "text-white" : "text-primary")} />
        <span className="flex-1 text-left text-sm">{item.label}</span>
        {active && <ChevronRight className="h-5 w-5" />}
      </Button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card border-r" data-sidebar="sidebar">
      <div className="p-8">
        <h2 className="text-xl font-headline font-black text-primary tracking-tighter leading-none">Rappi Commander</h2>
        <div className="mt-6 px-1">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Operador Ativo</p>
          <p className="text-sm text-foreground font-black">{userName}</p>
        </div>
      </div>
      <div className="flex-1 px-4 space-y-1">
        <div className="py-2">
          <p className="px-4 mb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Operação</p>
          {navItems.map(renderItem)}
        </div>
        <div className="py-2 mt-2 border-t border-muted/50">
          <p className="px-4 mb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Administração</p>
          {adminItems.map(renderItem)}
        </div>
      </div>
      <div className="p-6 border-t border-muted/50 space-y-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <Button variant="ghost" className="w-full justify-start gap-4 h-12 border-none text-destructive hover:bg-destructive/10 rounded-2xl font-bold" onClick={onLogout}>
          <LogOut className="h-5 w-5" /> Sair do Sistema
        </Button>
      </div>
    </div>
  );
}
