
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2, 
  SendHorizontal, 
  MapPin, 
  RefreshCw, 
  Bike,
  Search,
  Package,
  ClipboardPaste,
  ArrowRight
} from "lucide-react";
import { fetchRedashOrders, RedashOrder } from "@/app/actions/redash";
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
import { collection, query } from "firebase/firestore";
import { cn } from "@/lib/utils";

const COMMANDS = ["!!bundleBR", "!!rebr", "!!Br", "!!forzabr"];

interface CreateOrderProps {
  onOrderCreated: (order: any) => void;
}

export function CreateOrder({ onOrderCreated }: CreateOrderProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [allOrders, setAllOrders] = useState<RedashOrder[]>([]);
  
  const [selectedCommand, setSelectedCommand] = useState("!!bundleBR");
  const [selectedOrder, setSelectedOrder] = useState<RedashOrder | null>(null);
  const [isCourierDialogOpen, setIsCourierDialogOpen] = useState(false);
  const [searchCourier, setSearchCourier] = useState("");
  const [manualOrderId, setManualOrderId] = useState("");

  const couriersQuery = useMemoFirebase(() => query(collection(db, 'entregadores')), [db]);
  const { data: couriers, isLoading: loadingCouriers } = useCollection<any>(couriersQuery);

  const redashOrders = useMemo(() => {
    return allOrders.filter(row => {
      const isPoint9944 = Object.values(row).some(val => 
        String(val).includes('9944')
      );
      const isSinRT = Object.entries(row).some(([key, val]) => 
        key.toLowerCase().includes('trusted') && String(val).includes('Sin RT')
      );
      return isPoint9944 && isSinRT;
    });
  }, [allOrders]);

  const filteredCouriers = useMemo(() => {
    if (!couriers) return [];
    return couriers.filter(c => 
      c.nome?.toLowerCase().includes(searchCourier.toLowerCase()) || 
      c.id_motoboy?.includes(searchCourier)
    );
  }, [couriers, searchCourier]);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    const result = await fetchRedashOrders();
    if (result.success) {
      setAllOrders(result.data || []);
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenCourierSelection = (order: RedashOrder) => {
    setSelectedOrder(order);
    setIsCourierDialogOpen(true);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualOrderId.trim()) return;
    handleOpenCourierSelection({
      order_id: manualOrderId.trim(),
      store_name: "Pedido Manual",
      direccion_entrega: "Entrada Manual"
    });
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setManualOrderId(text.trim());
    } catch (err) {}
  };

  const handleGenerateCommand = (courierId: string) => {
    if (!selectedOrder) return;
    const fullCommand = `${selectedCommand} ${selectedOrder.order_id} ${courierId}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(fullCommand)}`, '_blank');
    setIsCourierDialogOpen(false);
    setSelectedOrder(null);
    setManualOrderId(""); 
  };

  return (
    <div className="space-y-6 animate-slide-up pb-32 max-w-xl mx-auto">
      <div className="bg-card p-3 rounded-xl border shadow-sm space-y-2">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Comando de Despacho</p>
        <div className="flex flex-wrap gap-1.5">
          {COMMANDS.map((cmd) => (
            <Button
              key={cmd}
              variant="default"
              onClick={() => setSelectedCommand(cmd)}
              className={cn(
                "h-8 px-4 font-bold text-xs rounded-lg transition-all",
                selectedCommand === cmd ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"
              )}
            >
              {cmd}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pedidos sem RT ({redashOrders.length})</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => loadData()} 
          disabled={loading} 
          className="h-6 text-[11px] font-bold text-blue-600 uppercase tracking-tight"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
          ATUALIZAR
        </Button>
      </div>

      <div className="space-y-2">
        {redashOrders.length === 0 && !loading ? (
          <div className="text-center py-8 bg-muted/20 rounded-xl border border-dashed flex flex-col items-center">
            <Package className="h-6 w-6 text-muted-foreground/50 mb-2" />
            <h3 className="text-xs font-medium text-muted-foreground">Nenhum pedido pendente</h3>
          </div>
        ) : (
          redashOrders.map((order, idx) => (
            <Card 
              key={idx} 
              className="border border-border/40 hover:border-primary/40 cursor-pointer shadow-none overflow-hidden group"
              onClick={() => handleOpenCourierSelection(order)}
            >
              <CardContent className="p-3 space-y-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-xs font-bold group-hover:text-primary transition-colors">{order.store_name}</h3>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-mono text-muted-foreground">#{order.order_id}</span>
                    <span className="text-[8px] text-primary font-bold uppercase">{order.estado_detallado_actual}</span>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 text-muted-foreground">
                  <MapPin className="h-3 w-3 text-primary shrink-0" />
                  <p className="text-[10px] font-medium leading-tight">{order.direccion_entrega}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <form onSubmit={handleManualSubmit} className="pt-6 space-y-3">
        <Input 
          placeholder="ID DO PEDIDO" 
          value={manualOrderId}
          onChange={(e) => setManualOrderId(e.target.value)}
          className="h-12 text-center text-lg font-bold tracking-widest rounded-xl shadow-sm uppercase"
        />
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={handlePaste} className="h-11 font-bold text-[10px] uppercase text-primary border-primary/20 rounded-xl">
            <ClipboardPaste className="h-3.5 w-3.5 mr-2" /> Colar Manual
          </Button>
          <Button type="submit" disabled={!manualOrderId.trim()} className="h-11 font-bold text-[10px] uppercase rounded-xl">
            Prosseguir <ArrowRight className="h-3.5 w-3.5 ml-2" />
          </Button>
        </div>
      </form>

      <Dialog open={isCourierDialogOpen} onOpenChange={setIsCourierDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl overflow-hidden p-0 border-none shadow-2xl">
          <DialogHeader className="p-5 pb-2">
            <DialogTitle>Enviar para:</DialogTitle>
            <DialogDescription className="text-xs">Pedido <span className="font-bold">#{selectedOrder?.order_id}</span></DialogDescription>
          </DialogHeader>
          <div className="px-5 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar motoboy..." className="pl-9 h-9 text-sm" value={searchCourier} onChange={(e) => setSearchCourier(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-2 space-y-1.5 pb-5 max-h-[40vh]">
            {loadingCouriers ? <Loader2 className="h-5 w-5 animate-spin mx-auto my-4 text-primary" /> : filteredCouriers.map((c) => (
              <Button key={c.id} variant="ghost" className="w-full justify-between h-auto py-2.5 px-3 hover:bg-primary/5 group" onClick={() => handleGenerateCommand(c.id_motoboy)}>
                <div className="text-left">
                  <p className="font-bold text-[11px] leading-none group-hover:text-primary">{c.nome}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">ID: {c.id_motoboy}</p>
                </div>
                <SendHorizontal className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
