'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, query, where, limit, doc, updateDoc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ClipboardPaste, 
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
  MapPin
} from 'lucide-react';
import { OrderRequest, User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { redashService, RedashOrder } from '@/lib/api/redash-service';

export function RequestOrder({ sender }: { sender: User }) {
  const db = useFirestore();
  const [manualOrderId, setManualOrderId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  // Redash Orders State
  const [allOrders, setAllOrders] = useState<RedashOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Redash Orders
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
      const isPoint9944 = Object.values(row).some(val => String(val).includes('9944'));
      const isSinRT = Object.entries(row).some(([key, val]) => 
        key.toLowerCase().includes('trusted') && String(val).includes('Sin RT')
      );
      return isPoint9944 && isSinRT;
    });
  }, [allOrders]);

  const usersQuery = useMemoFirebase(() => query(collection(db, 'userProfiles'), where('role', '==', 'normal')), [db]);
  const { data: usersData } = useCollection(usersQuery);
  const users = usersData || [];

  const myRequestsQuery = useMemoFirebase(() => {
    if (!sender?.email) return null;
    return query(
      collection(db, 'orderRequests'),
      where('senderEmail', '==', sender.email.toLowerCase().trim()),
      limit(20)
    );
  }, [db, sender?.email]);

  const { data: myRequestsData } = useCollection(myRequestsQuery);
  const myRequests = Array.isArray(myRequestsData) ? myRequestsData : [];

  const lastThreeRequests = useMemo(() => {
    if (!Array.isArray(myRequests)) return [];
    return [...myRequests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [myRequests]);

  const filteredUsers = users.filter(u => 
    (u.name || u.nome || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendRequest = async () => {
    if (!db || !sender || !selectedUser || !manualOrderId.trim()) return;
    
    setIsSubmitting(true);
    try {
      const cleanId = manualOrderId.trim();
      
      // Busca detalhes do pedido se ele estiver na lista do redash para enriquecer o comando
      const matchedOrder = redashOrders.find(o => String(o.order_id) === cleanId);
      const storeName = matchedOrder?.store_name || 'Pedido Manual';
      
      const newRequest: OrderRequest = {
        orderId: cleanId,
        storeName: storeName,
        command: matchedOrder 
          ? `SOLICITAÇÃO: ${storeName} #${cleanId}` 
          : `PEDIDO MANUAL: ${cleanId}`,
        targetUserEmail: selectedUser.email.toLowerCase().trim(),
        senderName: sender.name || sender.email || 'Usuário',
        senderEmail: sender.email.toLowerCase().trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'orderRequests'), newRequest);
      setManualOrderId('');
      setSelectedUser(null);
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
        return { label: 'Indisponível', color: 'bg-gray-100 text-gray-500', icon: AlertCircle };
      default:
        return { 
          label: `Pendente (${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')})`, 
          color: 'bg-amber-100 text-amber-700 animate-pulse', 
          icon: Clock,
          canCancel: true
        };
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto p-4 pb-24 animate-fade-in">
      {/* 3 ÚLTIMOS STATUS */}
      {lastThreeRequests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <History className="h-4 w-4" />
            <h3 className="text-[10px] font-bold uppercase tracking-wider">Status do meu Despacho (3 Últimos)</h3>
          </div>
          {lastThreeRequests.map((req) => {
            const status = getStatusInfo(req);
            const Icon = status.icon;
            return (
              <div key={req.id} className="bg-card border border-border/40 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">#{req.orderId}</span>
                  <span className="text-xs font-bold text-foreground truncate max-w-[120px]">{req.storeName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-bold text-muted-foreground mb-1 uppercase">PARA: {req.targetUserEmail.split('@')[0]}</span>
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase",
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
                      className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                      onClick={() => handleCancelRequest(req.id!)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">Solicitar Despacho</h2>
        <p className="text-xs text-muted-foreground">Escolha um pedido ou digite o ID.</p>
      </div>

      {/* LISTA DE PEDIDOS DISPONÍVEIS (REDASH) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pedidos Disponíveis ({redashOrders.length})</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => loadRedashData()} 
            disabled={loadingOrders} 
            className="h-6 text-[10px] font-bold text-blue-600 uppercase"
          >
            <RefreshCw className={cn("h-3 w-3 mr-1", loadingOrders && "animate-spin")} /> ATUALIZAR
          </Button>
        </div>

        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
          {loadingOrders && allOrders.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary opacity-50" />
              <p className="text-[9px] text-muted-foreground animate-pulse uppercase font-bold">Buscando...</p>
            </div>
          ) : redashOrders.length === 0 && !loadingOrders ? (
            <div className="text-center py-6 bg-muted/20 rounded-2xl border border-dashed flex flex-col items-center">
              <Package className="h-5 w-5 text-muted-foreground/50 mb-1" />
              <h3 className="text-[10px] font-medium text-muted-foreground">Nenhum pedido pendente</h3>
            </div>
          ) : (
            redashOrders.map((order, idx) => (
              <Card 
                key={idx} 
                className={cn(
                  "border-none bg-card shadow-sm hover:shadow-md transition-all cursor-pointer rounded-2xl group",
                  manualOrderId === String(order.order_id) ? "ring-2 ring-primary bg-primary/5" : ""
                )}
                onClick={() => setManualOrderId(String(order.order_id))}
              >
                <CardContent className="p-3 space-y-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-[11px] font-bold group-hover:text-primary truncate max-w-[180px]">{order.store_name}</h3>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-mono font-bold text-muted-foreground">#{order.order_id}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3 text-primary shrink-0" />
                    <p className="text-[9px] font-medium leading-tight truncate">{order.direccion_entrega}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* INPUT MANUAL E ENVIO */}
      <div className="space-y-4 pt-2">
        <div className="relative group">
          <Input
            placeholder="ID DO PEDIDO"
            value={manualOrderId}
            onChange={(e) => setManualOrderId(e.target.value)}
            className="h-14 text-lg font-bold rounded-2xl border-none bg-muted/40 shadow-inner pr-12 text-center tracking-widest"
          />
          {manualOrderId && (
            <button 
              onClick={() => setManualOrderId('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-muted rounded-full text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Search className="h-3 w-3 text-muted-foreground" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Escolher Operador</p>
          </div>
          <Input
            placeholder="Buscar Operador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-xl border-none bg-muted/30 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto p-1 no-scrollbar">
          {filteredUsers.map((u) => (
            <Card
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className={cn(
                "p-3 cursor-pointer transition-all border-2 rounded-2xl flex flex-col items-center text-center gap-1",
                selectedUser?.id === u.id
                  ? 'border-primary bg-primary/5 ring-4 ring-primary/10'
                  : 'border-transparent bg-card hover:bg-muted/10 shadow-sm'
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
                selectedUser?.id === u.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
              )}>
                {(u.name || u.nome || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden w-full">
                <span className="font-bold text-[10px] text-foreground truncate">{u.name || u.nome}</span>
                <span className="text-[8px] text-muted-foreground truncate">{u.email.split('@')[0]}</span>
              </div>
            </Card>
          ))}
        </div>

        <Button
          disabled={!manualOrderId.trim() || !selectedUser || isSubmitting}
          onClick={handleSendRequest}
          className="w-full h-14 rounded-2xl font-bold text-sm uppercase shadow-lg shadow-primary/20"
        >
          {isSubmitting ? 'Enviando...' : (
            <>Enviar Solicitação <ArrowRight className="ml-2 h-5 w-5" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
