
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, query, where, limit, doc, updateDoc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Search, 
  ArrowRight, 
  X, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  History,
  Package,
  RefreshCw,
  Loader2,
  MapPin,
  Bike,
  UserCheck,
  ChevronRight,
  User as UserIcon
} from 'lucide-react';
import { OrderRequest, User as UserType, Courier } from '@/lib/types';
import { cn } from '@/lib/utils';
import { redashService, RedashOrder } from '@/lib/api/redash-service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const STORAGE_LAST_USER = 'rappi_commander_last_user_v1';
const STORAGE_LAST_COURIER = 'rappi_commander_last_courier_v1';

export function RequestOrder({ sender }: { sender: UserType }) {
  const db = useFirestore();
  const [manualOrderId, setManualOrderId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCourierQuery, setSearchCourierQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  const [allOrders, setAllOrders] = useState<RedashOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [isCourierPopupOpen, setIsCourierPopupOpen] = useState(false);
  const [isUserPopupOpen, setIsUserPopupOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_LAST_USER);
    const savedCourier = localStorage.getItem(STORAGE_LAST_COURIER);
    
    if (savedUser) {
      try { setSelectedUser(JSON.parse(savedUser)); } catch (e) {}
    }
    if (savedCourier) {
      try { setSelectedCourier(JSON.parse(savedCourier)); } catch (e) {}
    }

    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedUser) {
      localStorage.setItem(STORAGE_LAST_USER, JSON.stringify(selectedUser));
    }
  }, [selectedUser]);

  useEffect(() => {
    if (selectedCourier) {
      localStorage.setItem(STORAGE_LAST_COURIER, JSON.stringify(selectedCourier));
    }
  }, [selectedCourier]);

  const loadRedashData = async (silent = false) => {
    if (!silent) setLoadingOrders(true);
    const result = await redashService.fetchOrders();
    if (result.success) {
      setAllOrders(result.data || []);
    }
    if (!silent) setLoadingOrders(false);
  };

  useEffect(() => {
    loadRedashData();
    const interval = setInterval(() => loadRedashData(true), 20000);
    return () => clearInterval(interval);
  }, []);

  const redashOrders = useMemo(() => {
    return allOrders.filter(row => {
      // Filtro estrito pelo point_id 9944
      const isPoint9944 = String(row.point_id || row.point || '').includes('9944');
      
      const isSinRT = Object.entries(row).some(([key, val]) => 
        key.toLowerCase().includes('trusted') && String(val).includes('Sin RT')
      );
      return isPoint9944 && isSinRT;
    });
  }, [allOrders]);

  // Filtro inteligente de operadores: apenas quem tem notificações ativadas e ordenado por nome
  const usersQuery = useMemoFirebase(() => query(
    collection(db, 'userProfiles'), 
    where('notificationsEnabled', '==', true)
  ), [db]);
  const { data: usersData } = useCollection<UserType>(usersQuery);
  const users = useMemo(() => {
    return [...(usersData || [])].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [usersData]);

  const couriersQuery = useMemoFirebase(() => query(collection(db, 'entregadores')), [db]);
  const { data: couriersData } = useCollection<Courier>(couriersQuery);
  const couriers = useMemo(() => {
    return [...(couriersData || [])].sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  }, [couriersData]);

  const myRequestsQuery = useMemoFirebase(() => {
    if (!sender?.email) return null;
    return query(
      collection(db, 'orderRequests'),
      where('senderEmail', '==', sender.email.toLowerCase().trim()),
      limit(10)
    );
  }, [db, sender?.email]);

  const { data: myRequestsData, isLoading: loadingMyRequests } = useCollection<OrderRequest>(myRequestsQuery);
  
  const lastThreeRequests = useMemo(() => {
    const requests = myRequestsData || [];
    return [...requests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [myRequestsData]);

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCouriers = couriers.filter(c => 
    (c.nome || '').toLowerCase().includes(searchCourierQuery.toLowerCase()) ||
    (c.id_motoboy || '').includes(searchCourierQuery)
  );

  const handleSendRequest = async () => {
    if (!db || !sender || !selectedUser || !selectedCourier || !manualOrderId.trim()) return;
    
    setIsSubmitting(true);
    try {
      const cleanId = manualOrderId.trim();
      const matchedOrder = redashOrders.find(o => String(o.order_id) === cleanId);
      const storeName = matchedOrder?.store_name || 'Pedido Manual';
      
      const fullCommand = `!!bundleBR ${cleanId} ${selectedCourier.id_motoboy}`;
      
      const newRequest: OrderRequest = {
        orderId: cleanId,
        storeName: storeName,
        command: fullCommand,
        targetUserEmail: selectedUser.email.toLowerCase().trim(),
        senderName: sender.name || sender.email || 'Usuário',
        senderEmail: sender.email.toLowerCase().trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'orderRequests'), newRequest);
      setManualOrderId('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!db) return;
    updateDoc(doc(db, 'orderRequests', requestId), {
      status: 'rejected',
      updatedAt: new Date().toISOString(),
      statusNote: 'Cancelado pelo remetente'
    });
  };

  const getStatusInfo = (req: OrderRequest) => {
    const createdAt = new Date(req.createdAt).getTime();
    const diff = Math.floor((currentTime - createdAt) / 1000);
    const remaining = Math.max(0, 120 - diff);

    switch (req.status) {
      case 'accepted':
        return { label: 'Aceito', color: 'bg-green-100 text-green-700', icon: CheckCircle2 };
      case 'rejected':
        const isTimeOut = req.statusNote === "Time Out";
        return { label: isTimeOut ? 'TIME OUT' : 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle };
      case 'unavailable':
        return { label: 'Indisponível', color: 'bg-slate-100 text-slate-500', icon: AlertCircle };
      default:
        return { 
          label: remaining > 0 ? `Pendente (${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')})` : 'Expirando...', 
          color: 'bg-amber-100 text-amber-700 animate-pulse', 
          icon: Clock,
          canCancel: true
        };
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto p-4 pb-24 animate-fade-in">
      {/* STATUS DAS SOLICITAÇÕES */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-primary px-1">
          <History className="h-4 w-4" />
          <h3 className="text-[10px] font-bold uppercase tracking-wider">Status das Solicitações</h3>
        </div>
        
        {loadingMyRequests ? (
          <div className="py-4 text-center">
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground opacity-30" />
          </div>
        ) : lastThreeRequests.length === 0 ? (
          <div className="bg-muted/10 border border-dashed rounded-2xl p-6 text-center">
            <p className="text-[10px] text-muted-foreground italic">Nenhuma solicitação recente encontrada.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lastThreeRequests.map((req) => {
              const status = getStatusInfo(req);
              const Icon = status.icon;
              return (
                <div key={req.id} className="bg-card border border-border/40 rounded-2xl p-3 flex items-center justify-between shadow-sm transition-all hover:border-primary/20">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono font-bold text-muted-foreground">#{req.orderId}</span>
                    <span className="text-[11px] font-bold text-foreground truncate max-w-[140px]">{req.storeName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                      <span className="text-[7px] font-bold text-muted-foreground mb-1 uppercase">PARA: {req.targetUserEmail.split('@')[0]}</span>
                      <div className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase",
                        status.color
                      )}>
                        <Icon className="h-3 w-3" />
                        {status.label}
                      </div>
                    </div>
                    {status.canCancel && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10"
                        onClick={() => handleCancelRequest(req.id!)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-px bg-border/40 my-2" />

      {/* PEDIDOS DO REDASH */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pedidos Disponíveis ({redashOrders.length})</h3>
          <Button variant="ghost" size="sm" onClick={() => loadRedashData()} disabled={loadingOrders} className="h-6 text-[10px] font-bold text-blue-600 uppercase">
            <RefreshCw className={cn("h-3 w-3 mr-1", loadingOrders && "animate-spin")} /> ATUALIZAR
          </Button>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 no-scrollbar">
          {redashOrders.length === 0 && !loadingOrders ? (
            <p className="text-center py-6 text-xs text-muted-foreground italic">Aguardando pedidos sem RT...</p>
          ) : redashOrders.map((order, idx) => (
            <Card 
              key={idx} 
              className={cn(
                "border-none bg-card shadow-sm hover:shadow-md transition-all cursor-pointer rounded-2xl group",
                manualOrderId === String(order.order_id) ? "ring-2 ring-primary bg-primary/5" : ""
              )}
              onClick={() => setManualOrderId(String(order.order_id))}
            >
              <CardContent className="p-3 flex justify-between items-center">
                <div className="overflow-hidden">
                  <h3 className="text-[11px] font-bold truncate group-hover:text-primary">{order.store_name}</h3>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[9px]">
                    <MapPin className="h-3 w-3 text-primary shrink-0" />
                    <p className="truncate">{order.direccion_entrega}</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold text-muted-foreground shrink-0 ml-2">#{order.order_id}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="relative max-w-[200px] mx-auto">
        <Input
          placeholder="ID DO PEDIDO"
          value={manualOrderId}
          onChange={(e) => setManualOrderId(e.target.value)}
          className="h-10 text-sm font-bold rounded-xl border-none bg-muted/40 shadow-inner text-center tracking-widest"
        />
        {manualOrderId && (
          <button onClick={() => setManualOrderId('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-muted rounded-full text-muted-foreground hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* SELETORES EM POPUP */}
      <div className="grid grid-cols-1 gap-3">
        {/* SELECIONAR ENTREGADOR */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Entregador</p>
          <Button 
            variant="outline" 
            onClick={() => setIsCourierPopupOpen(true)}
            className={cn(
              "w-full h-12 justify-between rounded-2xl border-none bg-card shadow-sm px-4",
              selectedCourier ? "ring-1 ring-primary/20" : ""
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn("p-1.5 rounded-lg", selectedCourier ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                <Bike className="h-4 w-4" />
              </div>
              <div className="text-left">
                {selectedCourier ? (
                  <p className="text-xs font-bold leading-tight">{selectedCourier.nome}</p>
                ) : (
                  <p className="text-xs font-medium text-muted-foreground">Escolher Motoboy</p>
                )}
              </div>
            </div>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>

        {/* SELECIONAR OPERADOR */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Operador (Quem recebe)</p>
          <Button 
            variant="outline" 
            onClick={() => setIsUserPopupOpen(true)}
            className={cn(
              "w-full h-12 justify-between rounded-2xl border-none bg-card shadow-sm px-4",
              selectedUser ? "ring-1 ring-primary/20" : ""
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn("p-1.5 rounded-lg", selectedUser ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                <UserCheck className="h-4 w-4" />
              </div>
              <div className="text-left">
                {selectedUser ? (
                  <p className="text-xs font-bold leading-tight">{selectedUser.name}</p>
                ) : (
                  <p className="text-xs font-medium text-muted-foreground">Escolher Operador</p>
                )}
              </div>
            </div>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <Button
        disabled={!manualOrderId.trim() || !selectedUser || !selectedCourier || isSubmitting}
        onClick={handleSendRequest}
        className="w-full h-14 rounded-2xl font-bold text-sm uppercase shadow-lg shadow-primary/20"
      >
        {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : (
          <>Enviar Solicitação <ArrowRight className="ml-2 h-5 w-5" /></>
        )}
      </Button>

      {/* POPUP SELEÇÃO ENTREGADOR */}
      <Dialog open={isCourierPopupOpen} onOpenChange={setIsCourierPopupOpen}>
        <DialogContent className="max-w-[320px] rounded-3xl p-6 gap-4">
          <DialogHeader>
            <DialogTitle className="text-lg">Escolher Entregador</DialogTitle>
            <DialogDescription className="text-xs">Selecione o motoboy para este despacho.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome ou RT..." 
              value={searchCourierQuery} 
              onChange={(e) => setSearchCourierQuery(e.target.value)} 
              className="pl-9 h-11 rounded-xl bg-muted/50 border-none"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto pr-1 no-scrollbar space-y-2">
            {filteredCouriers.map((c) => (
              <Button
                key={c.id}
                variant="ghost"
                onClick={() => {
                  setSelectedCourier(c);
                  setIsCourierPopupOpen(false);
                }}
                className={cn(
                  "w-full h-auto py-3 px-4 justify-between rounded-2xl border-2 transition-all",
                  selectedCourier?.id === c.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/30"
                )}
              >
                <div className="text-left overflow-hidden">
                  <p className="text-xs font-bold truncate">{c.nome}</p>
                  <p className="text-[10px] font-mono text-primary font-bold">RT {c.id_motoboy}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-primary/40" />
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* POPUP SELEÇÃO OPERADOR */}
      <Dialog open={isUserPopupOpen} onOpenChange={setIsUserPopupOpen}>
        <DialogContent className="max-w-[320px] rounded-3xl p-6 gap-4">
          <DialogHeader>
            <DialogTitle className="text-lg">Escolher Operador</DialogTitle>
            <DialogDescription className="text-xs">Quem deve receber esta notificação?</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome ou e-mail..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-9 h-11 rounded-xl bg-muted/50 border-none"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto pr-1 no-scrollbar space-y-2">
            {filteredUsers.map((u) => (
              <Button
                key={u.id}
                variant="ghost"
                onClick={() => {
                  setSelectedUser(u);
                  setIsUserPopupOpen(false);
                }}
                className={cn(
                  "w-full h-auto py-3 px-4 justify-between rounded-2xl border-2 transition-all",
                  selectedUser?.id === u.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/30"
                )}
              >
                <div className="text-left overflow-hidden">
                  <p className="text-xs font-bold truncate">{u.name}</p>
                  <p className="text-[10px] text-muted-foreground">{u.email}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-primary/40" />
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
