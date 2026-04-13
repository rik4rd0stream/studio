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
    <div className="space-y-6 animate-slide-up pb-20">
      {/* Seleção de Comando Superior */}
      <div className="bg-card p-4 rounded-xl border shadow-sm space-y-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Selecione o Comando</p>
        <div className="flex flex-wrap gap-2">
          {COMMANDS.map((cmd) => (
            <Button
              key={cmd}
              variant={selectedCommand === cmd ? "default" : "secondary"}
              onClick={() => setSelectedCommand(cmd)}
              className={cn(
                "h-10 px-5 font-bold text-sm transition-all",
                selectedCommand === cmd ? "shadow-md scale-105" : "opacity-80 hover:opacity-100"
              )}
            >
              {cmd}
            </Button>
          ))}
        </div>
      </div>

      {/* Cabeçalho de Pedidos */}
      <div className="flex items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em]">Pedidos Sin RT</h2>
          <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-primary/40 text-primary font-bold text-sm bg-primary/5">
            {redashOrders.length}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="hidden sm:inline text-[9px] text-muted-foreground font-mono uppercase">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadData} 
            disabled={loading} 
            className="gap-2 bg-blue-500/10 border-blue-500/20 text-blue-600 hover:bg-blue-500/20 uppercase text-[10px] font-bold tracking-wider"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Lista de Pedidos conforme referência */}
      <div className="space-y-3 max-w-2xl mx-auto">
        {redashOrders.length === 0 && !loading ? (
          <div className="text-center py-20 bg-muted/30 rounded-xl border-2 border-dashed flex flex-col items-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Nenhum pedido disponível</h3>
          </div>
        ) : (
          redashOrders.map((order, idx) => (
            <Card 
              key={idx} 
              className="border border-border/40 bg-card/60 hover:bg-muted/40 transition-all cursor-pointer shadow-none overflow-hidden group"
              onClick={() => handleOpenCourierSelection(order)}
            >
              <CardContent className="p-4 space-y-1.5">
                <h3 className="text-base font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                  {order.store_name || "Loja não identificada"}
                </h3>
                
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium leading-tight">
                    {order.direccion_entrega || "Endereço não informado"}
                  </p>
                </div>

                <div className="text-[11px] font-mono text-muted-foreground pt-1">
                  #{order.order_id || `ID-${idx}`}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Seleção de Motoboy */}
      <Dialog open={isCourierDialogOpen} onOpenChange={setIsCourierDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 border-none shadow-2xl">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl">Selecionar Motoboy</DialogTitle>
            <DialogDescription>
              Gerar comando <span className="font-bold text-primary">{selectedCommand}</span> para o pedido selecionado.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar motoboy por nome ou ID..." 
                className="pl-10 bg-muted/50 border-none h-11"
                value={searchCourier}
                onChange={(e) => setSearchCourier(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-2 pb-6">
            {loadingCouriers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredCouriers.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm italic">Nenhum motoboy encontrado.</p>
            ) : (
              filteredCouriers.map((courier) => (
                <Button
                  key={courier.id}
                  variant="ghost"
                  className="w-full h-auto py-3 px-4 justify-between hover:bg-primary/5 hover:text-primary transition-colors border border-transparent hover:border-primary/20 group"
                  onClick={() => handleGenerateCommand(courier.id_motoboy)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10">
                      <Bike className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm leading-none">{courier.nome}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-mono">ID: {courier.id_motoboy}</p>
                    </div>
                  </div>
                  <SendHorizontal className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
