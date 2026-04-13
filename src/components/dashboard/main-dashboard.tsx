
"use client";

import { useState, useMemo } from "react";
import { AppView, User, Order, Courier } from "@/lib/types";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Send, PackageSearch, Bell, Users, Activity } from "lucide-react";
import { CreateOrder } from "@/components/orders/create-order";
import { ActiveOrders } from "@/components/orders/active-orders";
import { Registration } from "@/components/admin/registration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";

interface MainDashboardProps {
  user: User;
  onLogout: () => void;
}

export function MainDashboard({ user, onLogout }: MainDashboardProps) {
  const [currentView, setView] = useState<AppView>('home');
  const db = useFirestore();

  // Consultas sem ordenação para evitar que registros antigos sumam
  const ordersQuery = useMemo(() => query(collection(db, 'orders')), [db]);
  const couriersQuery = useMemo(() => query(collection(db, 'entregadores')), [db]);

  const { data: orders } = useCollection<Order>(ordersQuery);
  const { data: couriers } = useCollection<Courier>(couriersQuery);

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return (
          <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold font-headline">Painel Geral</h1>
                <p className="text-muted-foreground">Logística e Despacho Rappi</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-none bg-primary text-white shadow-lg cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setView('send-order')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" /> Envio Rápido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm opacity-90">Crie um novo pedido agora usando assistência de IA.</p>
                </CardContent>
              </Card>

              <Card className="border-none bg-secondary text-white shadow-lg cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => setView('request-order')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PackageSearch className="h-5 w-5" /> Atribuir Pedidos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm opacity-90">Visualize solicitações de entregadores disponíveis.</p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm flex flex-col justify-center p-6 text-center">
                <h4 className="text-4xl font-bold text-primary">{orders?.filter(o => o.status !== 'completed').length || 0}</h4>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">Pedidos Ativos</p>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-bold font-headline flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Últimos Pedidos
                </h3>
                <ActiveOrders orders={orders?.slice(0, 3) || []} />
                {orders && orders.length > 3 && (
                  <Button variant="ghost" className="w-full" onClick={() => setView('active-orders')}>Ver todos os pedidos</Button>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold font-headline">Status da Frota</h3>
                  <Badge variant="outline">{couriers?.length || 0} Entregadores</Badge>
                </div>
                <Card className="border-none shadow-sm">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {!couriers || couriers.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic text-center py-4">Nenhum entregador cadastrado.</p>
                      ) : (
                        couriers.slice(0, 5).map(c => (
                          <div key={c.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                            <div>
                              <p className="text-sm font-medium">{c.nome}</p>
                              <p className="text-[10px] text-muted-foreground">ID: {c.id_motoboy}</p>
                            </div>
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                          </div>
                        ))
                      )}
                      <Button variant="outline" className="w-full" onClick={() => setView('admin-couriers')}>Gerenciar Entregadores</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        );
      case 'send-order':
        return <CreateOrder onOrderCreated={() => setView('active-orders')} />;
      case 'active-orders':
        return <ActiveOrders orders={orders || []} />;
      case 'admin-users':
        return <Registration type="users" />;
      case 'admin-couriers':
        return <Registration type="couriers" />;
      case 'request-order':
        return (
          <div className="space-y-6 text-center py-20 animate-slide-up">
            <PackageSearch className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold">Solicitação de Pedidos</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Nesta tela, os entregadores solicitam pedidos específicos. No momento, o sistema está processando atribuições automáticas.
            </p>
            <Button onClick={() => setView('active-orders')} className="mt-4">Ver Painel de Monitoramento</Button>
          </div>
        );
      default:
        return <div>Em breve...</div>;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
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
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {user.profile === 'master' && (
              <Button variant="ghost" size="sm" className="hidden lg:flex gap-2 text-xs" onClick={() => setView('admin-users')}>
                <Users className="h-4 w-4" /> Admin
              </Button>
            )}
            <Button variant="ghost" size="icon" className="rounded-full relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
            </Button>
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
