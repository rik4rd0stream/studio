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
  Package
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
import { useFirestore, useCollection } from "@/firebase";
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
  const [redashOrders, setRedashOrders] = useState<RedashOrder[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const [selectedCommand, setSelectedCommand] = useState("!!bundleBR");
  const [selectedOrder, setSelectedOrder] = useState<RedashOrder | null>(null);
  const [isCourierDialogOpen, setIsCourierDialogOpen] = useState(false);
  const [searchCourier, setSearchCourier] = useState("");

  const couriersQuery = useMemo(() => query(collection(db, 'entregadores')), [db]);
  const { data: couriers, loading: loadingCouriers } = useCollection<any>(couriersQuery);

  const filteredCouriers = useMemo(() => {
    if (!couriers) return [];
    return couriers.filter(c => 
      c.nome?.toLowerCase().includes(searchCourier.toLowerCase()) || 
      c.id_motoboy?.includes(searchCourier)
    );
  }, [couriers, searchCourier]);

  const loadData = async () => {
    setLoading(true);
    const result = await fetchRedashOrders();
    if (result.success) {
      setRedashOrders(result.data || []);
      setLastUpdate(new Date());
    } else {
      toast({ 
        variant: "destructive", 
        title: "Erro no Redash", 
        description: "Não foi possível carregar os dados automáticos." 
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 300000); // 5 min
    return () => clearInterval(interval);
  }, []);

  const handleOpenCourierSelection = (order: RedashOrder) => {
    setSelectedOrder(order);
    setIsCourierDialogOpen(true);
  };

  const handleGenerateCommand = (courierId: string) => {
    if (!selectedOrder) return;

    const orderId = selectedOrder.order_id || "0";
    const fullCommand = `${selectedCommand} ${orderId} ${courierId}`;
    
    const waUrl = `https://wa.me/?text=${encodeURIComponent(fullCommand)}`;
    window.open(waUrl, '_blank');
    
    toast({
      title: "Comando Gerado",
      description: `Enviando: ${fullCommand}`,
    });

    setIsCourierDialogOpen(false);
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-4 animate-slide-up pb-20">
      {/* Seleção de Comando Superior - Mais compacta conforme pedido */}
      <div className="bg-card p-3 rounded-xl border shadow-sm space-y-2">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Selecione o Comando</p>
        <div className="flex flex-wrap gap-1.5">
          {COMMANDS.map((cmd) => (
            <Button
              key={cmd}
              variant="default"
              onClick={() => setSelectedCommand(cmd)}
              className={cn(
                "h-9 px-4 font-bold text-xs transition-all border-none rounded-lg",
                selectedCommand === cmd 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "bg-secondary/40 text-secondary-foreground hover:bg-secondary/60"
              )}
            >
              {cmd}
            </Button>
          ))}
        </div>
      </div>

      {/* Cabeçalho de Pedidos */}
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.15em]">Pedidos Disponíveis</h2>
          <div className="flex items-center justify-center w-7 h-7 rounded-full border border-primary/30 text-primary font-bold text-xs bg-primary/5">
            {redashOrders.length}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="hidden sm:inline text-[8px] text-muted-foreground font-mono">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={loadData} 
            disabled={loading} 
            className="h-7 px-2 gap-1.5 text-blue-600 hover:bg-blue-50 text-[10px] font-bold uppercase"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="space-y-2 max-w-2xl mx-auto">
        {redashOrders.length === 0 && !loading ? (
          <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed flex flex-col items-center">
            <Package className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <h3 className="text-sm font-medium text-muted-foreground">Nenhum pedido filtrado</h3>
          </div>
        ) : (
          redashOrders.map((order, idx) => (
            <Card 
              key={idx} 
              className="border border-border/40 bg-card hover:border-primary/40 transition-all cursor-pointer shadow-none overflow-hidden group"
              onClick={() => handleOpenCourierSelection(order)}
            >
              <CardContent className="p-3.5 space-y-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-sm font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                    {order.store_name || "Loja s/ Nome"}
                  </h3>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    #{order.order_id}
                  </span>
                </div>
                
                <div className="flex items-start gap-1.5 text-muted-foreground">
                  <MapPin className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] font-medium leading-tight">
                    {order.direccion_entrega || "Endereço não disponível"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Seleção de Motoboy - Mais compacto */}
      <Dialog open={isCourierDialogOpen} onOpenChange={setIsCourierDialogOpen}>
        <DialogContent className="max-w-sm max-h-[70vh] flex flex-col p-0 border-none shadow-2xl overflow-hidden">
          <DialogHeader className="p-5 pb-2">
            <DialogTitle className="text-lg">Enviar para:</DialogTitle>
            <DialogDescription className="text-xs">
              Comando <span className="font-bold text-primary">{selectedCommand}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Buscar motoboy..." 
                className="pl-9 bg-muted/40 border-none h-9 text-sm"
                value={searchCourier}
                onChange={(e) => setSearchCourier(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-2 space-y-1.5 pb-5">
            {loadingCouriers ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : filteredCouriers.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground text-xs italic">Nenhum motoboy.</p>
            ) : (
              filteredCouriers.map((courier) => (
                <Button
                  key={courier.id}
                  variant="ghost"
                  className="w-full h-auto py-2.5 px-3 justify-between hover:bg-primary/5 hover:text-primary transition-colors border border-transparent hover:border-primary/10 group"
                  onClick={() => handleGenerateCommand(courier.id_motoboy)}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10">
                      <Bike className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-xs leading-none">{courier.nome}</p>
                      <p className="text-[9px] text-muted-foreground mt-1 font-mono">ID: {courier.id_motoboy}</p>
                    </div>
                  </div>
                  <SendHorizontal className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
