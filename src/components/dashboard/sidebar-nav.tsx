
"use client";

import { AppView, User } from "@/lib/types";
import { 
  Send, 
  PackageSearch, 
  Activity, 
  Users, 
  Bike, 
  LogOut,
  ChevronRight
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
    { 
      id: 'request-order', 
      label: 'Solicitação de Pedido', 
      icon: PackageSearch,
      restricted: true 
    },
    { id: 'active-orders', label: 'Pedidos Ativos', icon: Activity },
  ];

  const adminItems = [
    { id: 'admin-users', label: 'Cadastro de Usuários', icon: Users, masterOnly: true },
    { id: 'admin-couriers', label: 'Cadastro de Entregadores', icon: Bike, masterOnly: false },
  ];

  // Fallback seguro para o nome do usuário para evitar erro de .split()
  const userName = user?.name || "Usuário";
  const firstName = userName.split(' ')[0] || "Usuário";

  const renderItem = (item: any) => {
    // Regra: Master vê tudo, outros dependem de permissões específicas
    if (item.masterOnly && user.profile !== 'master') return null;
    if (item.restricted && !user.hasRequestAccess && user.profile !== 'master') return null;
    
    const active = currentView === item.id;
    
    return (
      <Button
        key={item.id}
        variant="ghost"
        className={cn(
          "w-full justify-start gap-3 h-12 px-4 transition-all duration-200",
          active ? "bg-primary text-primary-foreground font-semibold shadow-md" : "hover:bg-muted"
        )}
        onClick={() => setView(item.id as AppView)}
      >
        <item.icon className={cn("h-5 w-5", active ? "text-white" : "text-primary")} />
        <span className="flex-1 text-left">{item.label}</span>
        {active && <ChevronRight className="h-4 w-4" />}
      </Button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card border-r">
      <div className="p-6">
        <h2 className="text-xl font-headline font-bold text-primary tracking-tight">Rappi Commander</h2>
        <p className="text-xs text-muted-foreground mt-1">Olá, {firstName}</p>
      </div>

      <div className="flex-1 px-2 space-y-1">
        <div className="py-2">
          <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Operação</p>
          {navItems.map(renderItem)}
        </div>

        <div className="py-2 border-t">
          <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Administração</p>
          {adminItems.map(renderItem)}
        </div>
      </div>

      <div className="p-4 border-t space-y-2">
        <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
            {userName.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-bold">{user.profile}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-3 h-10 border-none text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair do Sistema
        </Button>
      </div>
    </div>
  );
}
