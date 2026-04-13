
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  SendHorizontal, 
  MapPin, 
  Package, 
  RefreshCw, 
  AlertCircle,
  Clock,
  Bike,
  Search
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
  
  // States for the WhatsApp flow
  const [selectedCommand, setSelectedCommand] = useState("!!bundleBR");
  const [selectedOrder, setSelectedOrder] = useState<RedashOrder | null>(null);
  const [isCourierDialogOpen, setIsCourierDialogOpen] = useState(false);
  const [searchCourier, setSearchCourier] = useState("");

  // Fetch Couriers from Firestore
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
    
    // Create WhatsApp URL
    const waUrl = `https://wa.me/?text=${encodeURIComponent(fullCommand)}`;
    
    // Open WhatsApp
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
      {/* Command Selection Header */}
      <div className="bg-card p-4 rounded-xl border shadow-sm space-y-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Selecione o Comando</p>
        <div className="flex flex-wrap gap-2">
          {COMMANDS.map((cmd) => (
            <Button
              key={cmd}
              variant={selectedCommand === cmd ? "default" : "secondary"}
              onClick={() => setSelectedCommand(cmd)}
              className={cn(
                "h-12 px-6 font-bold text-md transition-all",
                selectedCommand === cmd ? "shadow-lg scale-105" : "opacity-80 hover:opacity-100"
              )}
            >
              {cmd}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            Pedidos Pendentes
            {loading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-primary border-primary">Point📍9944</Badge> 
            <Badge variant="outline">Sin RT➖</Badge>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Atualizado: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {redashOrders.length === 0 && !loading ? (
          <div className="text-center py-20 bg-muted/30 rounded-xl border-2 border-dashed flex flex-col items-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Nenhum pedido filtrado</h3>
          </div>
        ) : (
          redashOrders.map((order, idx) => (
            <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden border-l-4 border-l-primary">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="p-6 flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded">
                          ID: {order.order_id || `ID-${idx}`}
                        </span>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          {order.items || "Itens do Pedido"}
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex gap-3">
                        <MapPin className="h-4 w-4 text-orange-500 shrink-0 mt-1" />
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Origem</p>
                          <p className="text-sm font-medium">{order.pickup || "Point📍9944"}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <MapPin className="h-4 w-4 text-green-500 shrink-0 mt-1" />
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Destino</p>
                          <p className="text-sm font-medium truncate max-w-[250px]">{order.address || "Endereço"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted/20 flex items-center justify-center border-t md:border-t-0 md:border-l">
                    <Button 
                      onClick={() => handleOpenCourierSelection(order)}
                      className="w-full md:w-auto px-8 h-12 gap-2 text-lg font-bold"
                    >
                      <SendHorizontal className="h-5 w-5" />
                      DESPACHAR
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Courier Selection Modal */}
      <Dialog open={isCourierDialogOpen} onOpenChange={setIsCourierDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Selecionar Motoboy</DialogTitle>
            <DialogDescription>
              Escolha o entregador para o comando <span className="font-bold text-primary">{selectedCommand}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar motoboy por nome ou ID..." 
                className="pl-10"
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
                  variant="outline"
                  className="w-full h-auto py-3 px-4 justify-between hover:bg-primary/5 hover:border-primary transition-colors group"
                  onClick={() => handleGenerateCommand(courier.id_motoboy)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20">
                      <Bike className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm leading-none">{courier.nome}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">ID Motoboy: {courier.id_motoboy}</p>
                    </div>
                  </div>
                  <SendHorizontal className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
