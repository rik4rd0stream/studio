
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2, 
  SendHorizontal, 
  MapPin, 
  RefreshCw, 
  Search,
  Package,
  ArrowRight,
  BellRing,
  User as UserIcon,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Timer,
  AlertCircle
} from "lucide-react";
import { redashService, RedashOrder } from "@/lib/api/redash-service";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, setDoc, updateDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { User, OrderRequest } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const COMMANDS = ["!!bundleBR", "!!rebr", "!!Br", "!!forzabr"];
const EXPIRATION_TIME_MS = 120000;

export function RequestOrder({ sender }: { sender: User }) {
  const { toast } = useToast();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [allOrders, setAllOrders] = useState<RedashOrder[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  const [selectedCommand, setSelectedCommand] = useState("!!bundleBR");
  const [selectedOrder, setSelectedOrder] = useState<RedashOrder | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<any>(null);
  const [isCourierDialogOpen, setIsCourierDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [searchCourier, setSearchCourier] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [manualOrderId, setManualOrderId] = useState("");

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const historyQuery = useMemoFirebase(() => query(
    collection(db, 'requests'),
    where('senderEmail', '==', sender.email.toLowerCase().trim())
  ), [db, sender.email]);
  const { data: historyData } = useCollection<any>(historyQuery);

  const history = useMemo(() => {
    if (!historyData) return [];
    return [...historyData]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [historyData]);

  const couriersQuery = useMemoFirebase(() => query(collection(db, 'entregadores')), [db]);
  const { data: couriers, isLoading: loadingCouriers } = useCollection<any>(couriersQuery);

  const usersQuery = useMemoFirebase(() => query(
    collection(db, 'userProfiles'), 
    where('notificationsEnabled', '==', true)
  ), [db]);
  const { data: appUsers, isLoading: loadingUsers } = useCollection<any>(usersQuery);

  const redashOrders = useMemo(() => {
    return allOrders.filter(row => {
      const isPoint9944 = Object.values(row).some(val => String(val).includes('9944'));
      const isSinRT = Object.entries(row).some(([key, val]) => key.toLowerCase().includes('trusted') && String(val).includes('Sin RT'));
      return isPoint9944 && isSinRT;
    });
  }, [allOrders]);

  const filteredCouriers = useMemo(() => {
    if (!couriers) return [];
    return [...couriers]
      .filter(c => (c.nome || c.name)?.toLowerCase().includes(searchCourier.toLowerCase()) || String(c.id_motoboy || "").includes(searchCourier))
      .sort((a, b) => (a.nome || a.name || "").localeCompare(b.nome || b.name || ""));
  }, [couriers, searchCourier]);

  const filteredUsers = useMemo(() => {
    if (!appUsers) return [];
    return appUsers.filter(u => u.name?.toLowerCase().includes(searchUser.toLowerCase()) || (u.email || u.id)?.toLowerCase().includes(searchUser.toLowerCase()));
  }, [appUsers, searchUser]);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    const result = await redashService.fetchOrders();
    if (result.success) setAllOrders(result.data || []);
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSendRequest = (targetUser: any) => {
    if (!selectedOrder || !selectedCourier) return;
    const requestId = Math.random().toString(36).substr(2, 9);
    const requestData = {
      orderId: String(selectedOrder.order_id),
      storeName: selectedOrder.store_name || "Pedido",
      command: `${selectedCommand} ${selectedOrder.order_id} ${selectedCourier.id_motoboy}`,
      targetUserEmail: targetUser.email.toLowerCase().trim(),
      senderName: sender.name,
      senderEmail: sender.email.toLowerCase().trim(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    setDoc(doc(db, 'requests', requestId), requestData).then(() => {
      toast({ title: "Solicitado" });
      setIsUserDialogOpen(false);
      setSelectedOrder(null);
      setManualOrderId("");
    });
  };

  const handleCancelRequest = (id: string) => {
    updateDoc(doc(db, "requests", id), {
      status: 'rejected',
      statusNote: 'Cancelado',
      updatedAt: new Date().toISOString()
    });
    toast({ title: "Cancelado" });
  };

  const getStatusBadge = (req: any) => {
    if (req.status === 'accepted') {
      return <Badge className="bg-green-500 text-white gap-1 px-2 h-5 text-[9px] uppercase"><CheckCircle2 className="h-2.5 w-2.5" /> ACEITO</Badge>;
    }
    if (req.status === 'rejected') {
      const note = req.statusNote || "RECUSADO";
      return <Badge className="bg-red-500 text-white gap-1 px-2 h-5 text-[9px] uppercase"><XCircle className="h-2.5 w-2.5" /> {note.toUpperCase()}</Badge>;
    }
    
    const createdTime = new Date(req.createdAt).getTime();
    const diff = (createdTime + EXPIRATION_TIME_MS) - currentTime;
    const isIndisponivel = !redashOrders.some(o => String(o.order_id) === String(req.orderId));
    
    if (isIndisponivel) {
      return <Badge className="bg-slate-500 text-white gap-1 px-2 h-5 text-[9px] uppercase"><AlertCircle className="h-2.5 w-2.5" /> INDISPONÍVEL</Badge>;
    }

    if (diff <= 0) return <Badge className="bg-red-500 text-white gap-1 px-2 h-5 text-[9px] uppercase">TIME OUT</Badge>;
    
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    
    return (
      <div className="flex flex-col items-end gap-1">
        <Badge variant="outline" className="border-amber-500 text-amber-600 gap-1 px-2 h-5 text-[9px] bg-amber-50 uppercase">
          <Clock className="h-2.5 w-2.5 animate-pulse" /> {mins}:{secs.toString().padStart(2, '0')}
        </Badge>
        <Button variant="ghost" size="icon" onClick={() => handleCancelRequest(req.id)} className="h-6 w-6 text-red-500 hover:bg-red-50">
          <X size={12} />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-slide-up pb-32 max-w-xl mx-auto">
      {history && history.length > 0 && (
        <Card className="border-none shadow-sm bg-muted/30 rounded-2xl">
          <div className="p-3 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2"><Clock className="h-3 w-3" /> Status do Despacho</h3>
          </div>
          <CardContent className="p-2 space-y-1.5">
            {history.map((req: any) => (
              <div key={req.id} className="bg-card p-2.5 rounded-xl border border-border/40 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-mono font-bold text-muted-foreground">#{req.orderId}</span>
                    <span className="text-[10px] font-bold truncate">{req.storeName}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground truncate">Operador: {req.targetUserEmail}</p>
                </div>
                {getStatusBadge(req)}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-center gap-3">
        <BellRing className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-sm font-bold text-primary">Solicitação de Alta Precisão</h3>
          <p className="text-[10px] text-muted-foreground">O sistema detecta se o pedido for alocado para outro antes do tempo.</p>
        </div>
      </div>

      <div className="bg-card p-3 rounded-xl border shadow-sm space-y-2">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Comando Base</p>
        <div className="flex flex-wrap gap-1.5">
          {COMMANDS.map((cmd) => (
            <Button key={cmd} variant="default" onClick={() => setSelectedCommand(cmd)} className={cn("h-8 px-4 font-bold text-xs rounded-lg", selectedCommand === cmd ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{cmd}</Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pedidos Disponíveis ({redashOrders.length})</h2>
        <Button variant="ghost" size="sm" onClick={() => loadData()} disabled={loading} className="h-6 text-[11px] font-bold text-blue-600"><RefreshCw className={cn("h-3 w-3 mr-1", loading && "animate-spin")} /> ATUALIZAR</Button>
      </div>

      <div className="space-y-2">
        {redashOrders.map((order, idx) => (
          <Card key={idx} className="border border-border/40 hover:border-primary/40 cursor-pointer shadow-none overflow-hidden" onClick={() => { setSelectedOrder(order); setIsCourierDialogOpen(true); }}>
            <CardContent className="p-3 space-y-1">
              <div className="flex justify-between items-start"><h3 className="text-xs font-bold">{order.store_name}</h3><span className="text-[9px] font-mono text-muted-foreground">#{order.order_id}</span></div>
              <div className="flex items-start gap-1.5 text-muted-foreground"><MapPin className="h-3 w-3 text-primary shrink-0" /><p className="text-[10px] font-medium leading-tight">{order.direccion_entrega}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if(manualOrderId.trim()) { setSelectedOrder({order_id: manualOrderId.trim(), store_name: "Manual"} as any); setIsCourierDialogOpen(true); } }} className="pt-6 space-y-3">
        <div className="relative group">
          <Input placeholder="ID DO PEDIDO MANUAL" value={manualOrderId} onChange={(e) => setManualOrderId(e.target.value)} className="h-12 text-center text-lg font-bold tracking-widest rounded-xl shadow-sm uppercase pr-12" />
          {manualOrderId.trim() !== "" && <Button type="button" variant="ghost" size="icon" onClick={() => setManualOrderId("")} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></Button>}
        </div>
        <Button type="submit" className="w-full h-11 font-bold text-[10px] uppercase rounded-xl">Solicitar Manualmente <ArrowRight className="h-3.5 w-3.5 ml-2" /></Button>
      </form>

      <Dialog open={isCourierDialogOpen} onOpenChange={setIsCourierDialogOpen}>
        <DialogContent className="max-w-md p-0 border-none shadow-2xl rounded-2xl overflow-hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="p-5 pb-2"><DialogTitle>Selecione o Motoboy</DialogTitle></DialogHeader>
          <div className="px-5 py-2"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Buscar motoboy..." className="pl-9 h-9 text-sm" value={searchCourier} onChange={(e) => setSearchCourier(e.target.value)} /></div></div>
          <div className="flex-1 overflow-y-auto px-5 py-4 max-h-[50vh] grid grid-cols-3 gap-2">
            {filteredCouriers.map((c) => (
              <Button key={c.id} variant="ghost" className="flex flex-col items-center justify-center h-20 p-2 border hover:border-primary/20 rounded-xl" onClick={() => { setSelectedCourier(c); setIsCourierDialogOpen(false); setIsUserDialogOpen(true); }}>
                <p className="font-bold text-sm leading-tight text-center truncate w-full">{(c.nome || c.name)?.split(' ')[0]}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-1 opacity-70">{c.id_motoboy}</p>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-sm p-0 border-none shadow-2xl rounded-2xl overflow-hidden" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="p-5 pb-2"><DialogTitle>Quem vai enviar?</DialogTitle></DialogHeader>
          <div className="px-5 py-2"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Buscar usuário..." className="pl-9 h-9 text-sm" value={searchUser} onChange={(e) => setSearchUser(e.target.value)} /></div></div>
          <div className="flex-1 overflow-y-auto px-5 py-2 space-y-1.5 pb-5 max-h-[40vh]">
            {filteredUsers.map((u) => (
              <Button key={u.id} variant="ghost" className="w-full h-auto py-2.5 px-3 justify-between hover:bg-primary/5 border rounded-lg group" onClick={() => handleSendRequest(u)}>
                <div className="text-left flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10"><UserIcon className="h-3.5 w-3.5" /></div>
                  <div><p className="font-bold text-[11px] leading-none">{u.name}</p><p className="text-[9px] text-muted-foreground mt-1">{u.email || u.id}</p></div>
                </div>
                <SendHorizontal className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
