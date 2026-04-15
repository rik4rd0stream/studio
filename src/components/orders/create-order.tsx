
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2, 
  MapPin, 
  RefreshCw, 
  Search,
  Package,
  ClipboardPaste,
  ArrowRight,
  AlertCircle,
  Bike
} from "lucide-react";
import { redashService, RedashOrder } from "@/lib/api/redash-service";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const COMMANDS = ["!!bundleBR", "!!rebr", "!!Br", "!!forzabr"];

interface CreateOrderProps {
  onOrderCreated: (order: any) => void;
  initialOrderId?: string;
  onClearInitialId?: () => void;
}

export function CreateOrder({ onOrderCreated, initialOrderId, onClearInitialId }: CreateOrderProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [allOrders, setAllOrders] = useState<RedashOrder[]>([]);
  
  const [selectedCommand, setSelectedCommand] = useState("!!bundleBR");
  const [selectedOrder, setSelectedOrder] = useState<RedashOrder | null>(null);
  const [isCourierDialogOpen, setIsCourierDialogOpen] = useState(false);
  const [searchCourier, setSearchCourier] = useState("");
  // Garante que o estado inicial seja sempre uma string para evitar erro de .trim()
  const [manualOrderId, setManualOrderId] = useState<string>(initialOrderId ? String(initialOrderId) : "");

  useEffect(() => {
    if (initialOrderId) {
      setManualOrderId(String(initialOrderId));
    }
  }, [initialOrderId]);

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
    return [...couriers]
      .filter(c => 
        (c.nome || c.name)?.toLowerCase().includes(searchCourier.toLowerCase()) || 
        String(c.id_motoboy || "").includes(searchCourier)
      )
      // ORDEM ALFABÉTICA
      .sort((a, b) => (a.nome || a.name || "").localeCompare(b.nome || b.name || ""));
  }, [couriers, searchCourier]);

  const loadData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setFetchError(null);
    }
    const result = await redashService.fetchOrders();
    if (result.success) {
      setAllOrders(result.data || []);
    } else {
      setFetchError(result.error || "Erro ao carregar dados.");
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 20000); 
    return () => clearInterval(interval);
  }, []);

  const handleOpenCourierSelection = (order: RedashOrder) => {
    setSelectedOrder(order);
    setIsCourierDialogOpen(true);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = String(manualOrderId || "").trim();
    if (!cleanId) return;
    handleOpenCourierSelection({
      order_id: cleanId,
      store_name: "Pedido Manual",
      direccion_entrega: "Entrada Manual"
    } as RedashOrder);
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
    if (onClearInitialId) onClearInitialId();
  };

  return (
    <div className="space-y-6 animate-slide-up pb-32 max-w-xl mx-auto">
      {fetchError && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive rounded-2xl animate-in fade-in">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro de Conexão</AlertTitle>
          <AlertDescription className="text-[10px] leading-tight opacity-80">
            {fetchError}
          </AlertDescription>
          <Button variant="outline" size="sm" onClick={() => loadData()} className="mt-2 h-7 text-[9px] uppercase font-bold border-destructive/20 hover:bg-destructive/10 text-destructive">
            Tentar Novamente
          </Button>
        </Alert>
      )}

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
        {loading && allOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />
            <p className="text-[10px] text-muted-foreground font-medium animate-pulse">Buscando dados...</p>
          </div>
        ) : redashOrders.length === 0 && !loading ? (
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
          <Button 
            type="submit" 
            disabled={!String(manualOrderId || "").trim()} 
            className="h-11 font-bold text-[10px] uppercase rounded-xl"
          >
            Prosseguir <ArrowRight className="h-3.5 w-3.5 ml-2" />
          </Button>
        </div>
      </form>

      <Dialog open={isCourierDialogOpen} onOpenChange={setIsCourierDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl overflow-hidden p-0 border-none shadow-2xl">
          <DialogHeader className="p-5 pb-2">
            <DialogTitle>Despachar para:</DialogTitle>
            <DialogTitle className="text-xs">Pedido <span className="font-bold">#{selectedOrder?.order_id}</span></DialogTitle>
          </DialogHeader>
          <div className="px-5 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar motoboy..." className="pl-9 h-9 text-sm" value={searchCourier} onChange={(e) => setSearchCourier(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 max-h-[50vh]">
            {loadingCouriers ? (
              <Loader2 className="h-8 w-8 animate-spin mx-auto my-4 text-primary opacity-30" />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {filteredCouriers.map((c) => (
                  <Button 
                    key={c.id} 
                    variant="ghost" 
                    className="flex flex-col items-center justify-center h-24 p-2 hover:bg-primary/5 group border border-transparent hover:border-primary/10 rounded-xl transition-all" 
                    onClick={() => handleGenerateCommand(c.id_motoboy)}
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-1.5 group-hover:bg-primary/10 transition-colors">
                      <Bike className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <p className="font-bold text-[9px] leading-tight text-center truncate w-full group-hover:text-primary">
                      {(c.nome || c.name)?.split(' ')[0]}
                    </p>
                    <p className="text-[7px] text-muted-foreground font-mono mt-0.5">{c.id_motoboy}</p>
                  </Button>
                ))}
              </div>
            )}
            {filteredCouriers.length === 0 && !loadingCouriers && (
              <p className="text-center py-4 text-muted-foreground text-[10px] italic">Nenhum motoboy encontrado.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
