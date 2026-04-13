"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  SendHorizontal, 
  MapPin, 
  Package, 
  RefreshCw, 
  AlertCircle,
  Clock
} from "lucide-react";
import { fetchRedashOrders, RedashOrder } from "@/app/actions/redash";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/lib/types";
import { useFirestore } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

interface CreateOrderProps {
  onOrderCreated: (order: Order) => void;
}

export function CreateOrder({ onOrderCreated }: CreateOrderProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [redashOrders, setRedashOrders] = useState<RedashOrder[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

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
    const interval = setInterval(loadData, 300000); // Atualiza a cada 5 min
    return () => clearInterval(interval);
  }, []);

  const handleDispatch = (redashOrder: RedashOrder) => {
    const orderId = redashOrder.order_id || Math.random().toString(36).substr(2, 9);
    const docRef = doc(db, 'orders', orderId);

    const newOrder: Order = {
      id: orderId,
      items: [redashOrder.items || "Pedido Redash"],
      status: 'pending',
      deliveryAddress: redashOrder.address || "Verificar no App",
      pickupAddress: "Point📍9944",
      specialInstructions: `Extraído do Redash - es_trusted: ${redashOrder.es_trusted}`,
      createdAt: new Date().toISOString(),
      categories: ['Redash'],
    };

    setDoc(docRef, newOrder)
      .then(() => {
        toast({ title: "Pedido Despachado", description: `ID: ${orderId} agora está em monitoramento.` });
        onOrderCreated(newOrder);
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'create',
          requestResourceData: newOrder,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            Envio Automático (Redash)
            {loading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          </h1>
          <p className="text-muted-foreground">
            Monitorando: <Badge variant="outline" className="text-primary border-primary">Point📍9944</Badge> e <Badge variant="outline">Sin RT➖</Badge>
          </p>
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
            Atualizar Agora
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {redashOrders.length === 0 && !loading ? (
          <div className="text-center py-20 bg-muted/30 rounded-xl border-2 border-dashed flex flex-col items-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Nenhum pedido pendente no Redash</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Aguardando novas ordens do Point📍9944 que atendam aos critérios de filtragem.
            </p>
          </div>
        ) : (
          redashOrders.map((order, idx) => (
            <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden border-l-4 border-l-primary">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="p-6 flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded">
                            {order.order_id || `ID-${idx}`}
                          </span>
                          <Badge className="bg-orange-500/10 text-orange-600 border-none">Aguardando Coleta</Badge>
                        </div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          {order.items || "Itens do Pedido"}
                        </h3>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Trusted Status</p>
                        <p className="text-xs font-medium text-green-600">{order.es_trusted}</p>
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
                          <p className="text-sm font-medium truncate max-w-[200px]">{order.address || "Endereço Pendente"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted/20 flex items-center justify-center border-t md:border-t-0 md:border-l">
                    <Button 
                      onClick={() => handleDispatch(order)}
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
    </div>
  );
}
