
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
  const [manualOrderId, setManualOrderId] = useState("");

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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualOrderId.trim()) {
      toast({ variant: "destructive", title: "Erro", description: "Digite um ID de pedido." });
      return;
    }
    const dummyOrder: RedashOrder = {
      order_id: manualOrderId.trim(),
      store_name: "Pedido Manual",
      direccion_entrega: "Entrada Manual"
    };
    handleOpenCourierSelection(dummyOrder);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setManualOrderId(text.trim());
        toast({ title: "Colado", description: "ID colado da área de transferência." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível ler a área de transferência. Verifique as permissões do navegador." });
    }
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
    setManualOrderId(""); 
  };

  return (
    <div className="space-y-6 animate-slide-up pb-32 max-w-xl mx-auto">
      {/* Seleção de Comando Superior */}
      <div className="bg-card p-3 rounded-xl border shadow-sm space-y-2">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Selecione o Comando</p>
        <div className="flex flex-wrap gap-1.5">
          {COMMANDS.map((cmd) => (
            <Button
              key={cmd}
              variant="default"
              onClick={() => setSelectedCommand(cmd)}
              className={cn(
                "h-8 px-4 font-bold text-xs transition-all border-none rounded-lg",
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
        <div className="flex items-center gap-2">
          <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pedidos Disponíveis</h2>
          <div className="flex items-center justify-center w-6 h-6 rounded-full border border-primary/30 text-primary font-bold text-[10px] bg-primary/5">
            {redashOrders.length}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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
            className="h-6 px-2 gap-1.5 text-blue-600 hover:bg-blue-50 text-[9px] font-bold uppercase"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="space-y-2">
        {redashOrders.length === 0 && !loading ? (
          <div className="text-center py-8 bg-muted/20 rounded-xl border border-dashed flex flex-col items-center">
            <Package className="h-6 w-6 text-muted-foreground/50 mb-2" />
            <h3 className="text-xs font-medium text-muted-foreground">Nenhum pedido filtrado</h3>
          </div>
        ) : (
          redashOrders.map((order, idx) => (
            <Card 
              key={idx} 
              className="border border-border/40 bg-card hover:border-primary/40 transition-all cursor-pointer shadow-none overflow-hidden group"
              onClick={() => handleOpenCourierSelection(order)}
            >
              <CardContent className="p-3 space-y-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-xs font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                    {order.store_name || "Loja s/ Nome"}
                  </h3>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    #{order.order_id}
                  </span>
                </div>
                
                <div className="flex items-start gap-1.5 text-muted-foreground">
                  <MapPin className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] font-medium leading-tight">
                    {order.direccion_entrega || "Endereço não disponível"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Seção de Entrada Manual Minimalista */}
      <div className="pt-6 space-y-3">
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <Input 
            placeholder="ID DO PEDIDO" 
            value={manualOrderId}
            onChange={(e) => setManualOrderId(e.target.value)}
            className="h-12 text-center text-lg font-bold tracking-widest bg-card border border-border focus-visible:ring-primary focus-visible:border-primary transition-all rounded-xl shadow-sm uppercase placeholder:text-muted-foreground/40"
          />

          <div className="grid grid-cols-2 gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handlePaste}
              className="h-11 gap-2 font-bold text-[10px] uppercase tracking-tight border-orange-200 text-primary hover:bg-orange-50 rounded-xl"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              Colar Manual
            </Button>
            <Button 
              type="submit" 
              disabled={!manualOrderId.trim()}
              className="h-11 gap-2 font-bold text-[10px] uppercase tracking-tight rounded-xl shadow-sm bg-primary hover:bg-primary/90"
            >
              Prosseguir para Envio
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
      </div>

      {/* Modal de Seleção de Motoboy */}
      <Dialog open={isCourierDialogOpen} onOpenChange={setIsCourierDialogOpen}>
        <DialogContent className="max-w-sm max-h-[80vh] flex flex-col p-0 border-none shadow-2xl overflow-hidden rounded-2xl">
          <DialogHeader className="p-5 pb-2">
            <DialogTitle className="text-lg">Enviar para:</DialogTitle>
            <DialogDescription className="text-xs">
              Comando <span className="font-bold text-primary">{selectedCommand}</span> para pedido <span className="font-bold">#{selectedOrder?.order_id}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Buscar motoboy..." 
                className="pl-9 bg-muted/40 border-none h-9 text-sm rounded-lg"
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
              <p className="text-center py-4 text-muted-foreground text-xs italic">Nenhum motoboy encontrado.</p>
            ) : (
              filteredCouriers.map((courier) => (
                <Button
                  key={courier.id}
                  variant="ghost"
                  className="w-full h-auto py-2 px-3 justify-between hover:bg-primary/5 hover:text-primary transition-colors border border-transparent hover:border-primary/10 group rounded-lg"
                  onClick={() => handleGenerateCommand(courier.id_motoboy)}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10">
                      <Bike className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-[11px] leading-none">{courier.nome}</p>
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
