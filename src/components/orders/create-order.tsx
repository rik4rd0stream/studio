
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
  X
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
import { collection, query } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const COMMANDS = ["!!bundleBR", "!!rebr", "!!Br", "!!forzabr"];

export function CreateOrder({ onOrderCreated, initialOrderId, onClearInitialId }: { 
  onOrderCreated: (order: any) => void;
  initialOrderId?: string;
  onClearInitialId?: () => void;
}) {
  const { toast } = useToast();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [allOrders, setAllOrders] = useState<RedashOrder[]>([]);
  
  const [selectedCommand, setSelectedCommand] = useState("!!bundleBR");
  const [selectedOrder, setSelectedOrder] = useState<RedashOrder | null>(null);
  const [isCourierDialogOpen, setIsCourierDialogOpen] = useState(false);
  const [searchCourier, setSearchCourier] = useState("");
  const [manualOrderId, setManualOrderId] = useState<string>(initialOrderId ? String(initialOrderId) : "");

  useEffect(() => {
    if (initialOrderId) setManualOrderId(String(initialOrderId));
  }, [initialOrderId]);

  const couriersQuery = useMemoFirebase(() => query(collection(db, 'entregadores')), [db]);
  const { data: couriers, isLoading: loadingCouriers } = useCollection<any>(couriersQuery);

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

  const filteredCouriers = useMemo(() => {
    if (!couriers) return [];
    return [...couriers]
      .filter(c => 
        (c.nome || c.name || '').toLowerCase().includes(searchCourier.toLowerCase()) || 
        String(c.id_motoboy || "").includes(searchCourier)
      )
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

  const handleClearManualId = () => {
    setManualOrderId("");
    if (onClearInitialId) onClearInitialId();
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
        <Alert variant="destructive" className="rounded-2xl border-none bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro Redash</AlertTitle>
          <AlertDescription className="text-[10px]">{fetchError}</AlertDescription>
        </Alert>
      )}

      <div className="bg-card p-3 rounded-2xl border border-border/40 shadow-sm space-y-2">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Comando de Despacho</p>
        <div className="flex flex-wrap gap-1.5">
          {COMMANDS.map((cmd) => (
            <Button
              key={cmd}
              variant="default"
              onClick={() => setSelectedCommand(cmd)}
              className={cn(
                "h-8 px-4 font-bold text-xs rounded-xl transition-all",
                selectedCommand === cmd ? "bg-primary text-primary-foreground shadow-lg" : "bg-muted text-muted-foreground"
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
          className="h-6 text-[11px] font-bold text-blue-600 uppercase"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} /> ATUALIZAR
        </Button>
      </div>

      <div className="space-y-2">
        {loading && allOrders.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />
            <p className="text-[10px] text-muted-foreground animate-pulse">BUSCANDO PEDIDOS...</p>
          </div>
        ) : redashOrders.length === 0 && !loading ? (
          <div className="text-center py-8 bg-muted/20 rounded-2xl border border-dashed flex flex-col items-center">
            <Package className="h-6 w-6 text-muted-foreground/50 mb-2" />
            <h3 className="text-xs font-medium text-muted-foreground">Nenhum pedido pendente</h3>
          </div>
        ) : (
          redashOrders.map((order, idx) => (
            <Card 
              key={idx} 
              className="border-none bg-card shadow-sm hover:shadow-md transition-all cursor-pointer rounded-2xl group"
              onClick={() => handleOpenCourierSelection(order)}
            >
              <CardContent className="p-4 space-y-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-xs font-bold group-hover:text-primary">{order.store_name}</h3>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-mono font-bold text-muted-foreground">#{order.order_id}</span>
                    <span className="text-[8px] text-primary font-bold uppercase">{order.estado_detallado_actual}</span>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                  <p className="text-[10px] font-medium leading-tight">{order.direccion_entrega}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <form onSubmit={handleManualSubmit} className="pt-6 space-y-3">
        <div className="relative">
          <Input 
            placeholder="ID DO PEDIDO" 
            value={manualOrderId}
            onChange={(e) => setManualOrderId(e.target.value)}
            className="h-14 text-center text-xl font-bold tracking-widest rounded-2xl border-none bg-muted/50 shadow-inner pr-12"
          />
          {manualOrderId && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClearManualId}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={async () => {
            const text = await navigator.clipboard.readText();
            if (text) setManualOrderId(text.trim());
          }} className="h-12 font-bold text-[10px] uppercase rounded-2xl">
            <ClipboardPaste className="h-4 w-4 mr-2" /> Colar ID
          </Button>
          <Button type="submit" disabled={!manualOrderId.trim()} className="h-12 font-bold text-[10px] uppercase rounded-2xl shadow-lg">
            Prosseguir <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </form>

      <Dialog open={isCourierDialogOpen} onOpenChange={setIsCourierDialogOpen}>
        <DialogContent 
          className="max-md rounded-3xl p-0 border-none shadow-2xl overflow-hidden"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl">Despachar Pedido</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-mono">
              Pedido #{selectedOrder?.order_id}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar motoboy..." 
                className="pl-9 h-11 text-sm bg-muted/30 border-none rounded-xl" 
                value={searchCourier} 
                onChange={(e) => setSearchCourier(e.target.value)} 
              />
            </div>
          </div>
          <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
            {loadingCouriers ? (
              <Loader2 className="h-8 w-8 animate-spin mx-auto my-4 text-primary opacity-30" />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {filteredCouriers.map((c) => (
                  <Button 
                    key={c.id} 
                    variant="ghost" 
                    className="flex flex-col items-center justify-center h-24 p-2 hover:bg-primary/10 rounded-2xl border-2 border-transparent hover:border-primary/20 transition-all group" 
                    onClick={() => handleGenerateCommand(c.id_motoboy)}
                  >
                    <p className="font-bold text-sm leading-tight text-center truncate w-full group-hover:text-primary">
                      {(c.nome || c.name || '').split(' ')[0]}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1 font-bold">RT {c.id_motoboy}</p>
                  </Button>
                ))}
              </div>
            )}
            {filteredCouriers.length === 0 && !loadingCouriers && (
              <p className="text-center py-8 text-muted-foreground text-xs italic">Nenhum motoboy encontrado.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
