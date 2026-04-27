
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, query, where, limit, doc, setDoc, orderBy } from 'firebase/firestore';
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
  RefreshCw,
  Loader2,
  MapPin,
  Bike,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import { OrderRequest, User as UserType, Courier } from '@/lib/types';
import { cn } from '@/lib/utils';
import { redashService, RedashOrder } from '@/lib/api/redash-service';
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
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
    if (selectedUser) localStorage.setItem(STORAGE_LAST_USER, JSON.stringify(selectedUser));
  }, [selectedUser]);

  useEffect(() => {
    if (selectedCourier) localStorage.setItem(STORAGE_LAST_COURIER, JSON.stringify(selectedCourier));
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
    const interval = setInterval(() => loadRedashData(true), 15000);
    return () => clearInterval(interval);
  }, []);

  const redashOrders = useMemo(() => {
    return allOrders.filter(row => {
      const isPoint9944 = String(row.point_id || row.point || '').includes('9944');
      const esTrusted = String(row.es_trusted || '').toUpperCase();
      return isPoint9944 && esTrusted.includes('SIN RT');
    });
  }, [allOrders]);

  const usersQuery = useMemoFirebase(() => {
    return query(collection(db, 'userProfiles'), limit(50));
  }, [db]);
  
  const { data: usersData } = useCollection<UserType>(usersQuery);
  const users = useMemo(() => 
    (usersData || [])
      .filter(u => u.notificationsEnabled === true)
      .sort((a, b) => (a.name || "").localeCompare(b.name || "")), 
    [usersData]
  );

  const couriersQuery = useMemoFirebase(() => query(collection(db, 'entregadores')), [db]);
  const { data: couriersData } = useCollection<Courier>(couriersQuery);
  const couriers = useMemo(() => [...(couriersData || [])].sort((a, b) => (a.nome || "").localeCompare(b.nome || "")), [couriersData]);

  // Consulta robusta: só dispara quando o senderEmail está 100% pronto
  const myRequestsQuery = useMemoFirebase(() => {
    if (!sender || !sender.email || !sender.email.includes('@')) return null;
    
    const senderEmail = sender.email.toLowerCase().trim();
    return query(
      collection(db, 'orderRequests'),
      where('senderEmail', '==', senderEmail),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
  }, [db, sender?.email]);

  const { data: myRequestsData, isLoading: loadingMyRequests } = useCollection<OrderRequest>(myRequestsQuery);

  const handleSendRequest = async () => {
    if (!db || !sender || !selectedUser || !selectedCourier || !manualOrderId.trim()) return;
    
    setIsSubmitting(true);
    try {
      const cleanId = manualOrderId.trim();
      const matchedOrder = redashOrders.find(o => String(o.order_id) === cleanId);
      const storeName = matchedOrder?.store_name || 'Pedido Manual';
      
      const fullCommand = `!!forzarbr ${cleanId} ${selectedCourier.id_motoboy}`;
      
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
      toast({ title: "Solicitado!", description: `Aguardando ${selectedUser.name}` });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro ao enviar", description: "Verifique sua conexão." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!db) return;
    setDoc(doc(db, 'orderRequests', requestId), {
      status: 'rejected',
      updatedAt: new Date().toISOString(),
      statusNote: 'Cancelado pelo remetente'
    }, { merge: true });
  };

  const getStatusInfo = (req: OrderRequest) => {
    const createdAt = new Date(req.createdAt).getTime();
    const diff = Math.floor((currentTime - createdAt) / 1000);
    const remaining = Math.max(0, 120 - diff);

    switch (req.status) {
      case 'accepted': return { label: 'Aceito', color: 'bg-green-100 text-green-700', icon: CheckCircle2 };
      case 'rejected': return { label: req.statusNote || 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle };
      case 'unavailable': return { label: 'Indisponível', color: 'bg-slate-100 text-slate-500', icon: AlertCircle };
      default: return { 
        label: remaining > 0 ? `Pendente (${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')})` : 'Expirado', 
        color: 'bg-amber-100 text-amber-700 animate-pulse', 
        icon: Clock,
        canCancel: true
      };
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto p-4 pb-24 animate-fade-in">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-primary px-1">
          <History className="h-4 w-4" />
          <h3 className="text-[10px] font-bold uppercase tracking-wider">Status das Solicitações</h3>
        </div>
        
        {loadingMyRequests ? (
          <div className="py-4 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground opacity-30" /></div>
        ) : (myRequestsData || []).length === 0 ? (
          <div className="bg-muted/10 border border-dashed rounded-2xl p-6 text-center text-[10px] text-muted-foreground italic">Nenhuma solicitação encontrada na nova coleção.</div>
        ) : (
          <div className="space-y-2">
            {(myRequestsData || []).map((req) => {
              const status = getStatusInfo(req);
              const Icon = status.icon;
              return (
                <div key={req.id} className="bg-card border border-border/40 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono font-bold text-muted-foreground">#{req.orderId}</span>
                    <span className="text-[11px] font-bold truncate max-w-[140px]">{req.storeName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end">
                      <span className="text-[7px] font-bold text-muted-foreground mb-1 uppercase">PARA: {req.targetUserEmail.split('@')[0]}</span>
                      <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase", status.color)}>
                        <Icon className="h-3 w-3" /> {status.label}
                      </div>
                    </div>
                    {status.canCancel && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive" onClick={() => handleCancelRequest(req.id!)}>
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

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Disponíveis ({redashOrders.length})</h3>
          <Button variant="ghost" size="sm" onClick={() => loadRedashData()} disabled={loadingOrders} className="h-6 text-[10px] font-bold text-blue-600 uppercase">
            <RefreshCw className={cn("h-3 w-3 mr-1", loadingOrders && "animate-spin")} /> ATUALIZAR
          </Button>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
          {redashOrders.map((order, idx) => (
            <Card key={idx} className={cn("border-none bg-card shadow-sm hover:shadow-md transition-all cursor-pointer rounded-2xl group", manualOrderId === String(order.order_id) ? "ring-2 ring-primary" : "")} onClick={() => setManualOrderId(String(order.order_id))}>
              <CardContent className="p-3 flex justify-between items-center">
                <div className="overflow-hidden">
                  <h3 className="text-[11px] font-bold truncate group-hover:text-primary">{order.store_name}</h3>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[9px]"><MapPin className="h-3 w-3 text-primary shrink-0" /><p className="truncate">{order.direccion_entrega}</p></div>
                </div>
                <span className="text-[9px] font-mono font-bold text-muted-foreground shrink-0 ml-2">#{order.order_id}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="relative max-w-[200px] mx-auto">
        <Input placeholder="ID DO PEDIDO" value={manualOrderId} onChange={(e) => setManualOrderId(e.target.value)} className="h-10 text-sm font-bold rounded-xl border-none bg-muted/40 shadow-inner text-center tracking-widest" />
        {manualOrderId && <button onClick={() => setManualOrderId('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-muted rounded-full text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>}
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Button variant="outline" onClick={() => setIsCourierPopupOpen(true)} className="w-full h-12 justify-between rounded-2xl border-none bg-card shadow-sm px-4">
          <div className="flex items-center gap-3"><Bike className="h-4 w-4 text-primary" /><div className="text-left">{selectedCourier ? <p className="text-xs font-bold leading-tight">{selectedCourier.nome}</p> : <p className="text-xs font-medium text-muted-foreground">Escolher Motoboy</p>}</div></div>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </Button>
        <Button variant="outline" onClick={() => setIsUserPopupOpen(true)} className="w-full h-12 justify-between rounded-2xl border-none bg-card shadow-sm px-4">
          <div className="flex items-center gap-3"><UserCheck className="h-4 w-4 text-primary" /><div className="text-left">{selectedUser ? <p className="text-xs font-bold leading-tight">{selectedUser.name}</p> : <p className="text-xs font-medium text-muted-foreground">Escolher Operador</p>}</div></div>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>

      <Button disabled={!manualOrderId.trim() || !selectedUser || !selectedCourier || isSubmitting} onClick={handleSendRequest} className="w-full h-14 rounded-2xl font-bold text-sm uppercase shadow-lg">
        {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : <>Enviar Solicitação <ArrowRight className="ml-2 h-5 w-5" /></>}
      </Button>

      <Dialog open={isCourierPopupOpen} onOpenChange={setIsCourierPopupOpen}>
        <DialogContent className="max-w-[320px] rounded-3xl p-6 gap-4">
          <DialogHeader><DialogTitle className="text-lg">Entregador</DialogTitle></DialogHeader>
          <Input placeholder="Buscar por nome ou RT..." value={searchCourierQuery} onChange={(e) => setSearchCourierQuery(e.target.value)} className="h-11 rounded-xl bg-muted/50 border-none" />
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {couriers.filter(c => c.nome.toLowerCase().includes(searchCourierQuery.toLowerCase()) || c.id_motoboy.includes(searchCourierQuery)).map((c) => (
              <Button key={c.id} variant="ghost" onClick={() => { setSelectedCourier(c); setIsCourierPopupOpen(false); }} className="w-full h-auto py-3 px-4 justify-between rounded-2xl border-2 border-transparent bg-muted/30">
                <div className="text-left overflow-hidden"><p className="text-xs font-bold truncate">{c.nome}</p><p className="text-[10px] font-mono text-primary font-bold">RT {c.id_motoboy}</p></div><ChevronRight className="h-4 w-4 text-primary/40" />
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isUserPopupOpen} onOpenChange={setIsUserPopupOpen}>
        <DialogContent className="max-w-[320px] rounded-3xl p-6 gap-4">
          <DialogHeader><DialogTitle className="text-lg">Operador</DialogTitle></DialogHeader>
          <Input placeholder="Buscar por nome ou e-mail..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-11 rounded-xl bg-muted/50 border-none" />
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {users.filter(u => (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase())).map((u) => (
              <Button key={u.id} variant="ghost" onClick={() => { setSelectedUser(u); setIsUserPopupOpen(false); }} className="w-full h-auto py-3 px-4 justify-between rounded-2xl border-2 border-transparent bg-muted/30">
                <div className="text-left overflow-hidden"><p className="text-xs font-bold truncate">{u.name}</p><p className="text-[10px] text-muted-foreground">{u.email}</p></div><ChevronRight className="h-4 w-4 text-primary/40" />
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
