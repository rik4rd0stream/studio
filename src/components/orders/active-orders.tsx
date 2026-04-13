"use client";

import { useState, useEffect, useMemo } from "react";
import { redashService, RedashOrder } from "@/lib/api/redash-service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, Package, User, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function ActiveOrders() {
  const { toast } = useToast();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [allOrders, setAllOrders] = useState<RedashOrder[]>([]);
  
  // Usando a coleção antiga 'entregadores' com consulta direta para compatibilidade Android
  const couriersQuery = useMemoFirebase(() => collection(db, 'entregadores'), [db]);
  const { data: couriers } = useCollection<any>(couriersQuery);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    const result = await redashService.fetchOrders();
    if (result.success) {
      setAllOrders(result.data || []);
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 15000); 
    return () => clearInterval(interval);
  }, []);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      toast({
        title: "ID Copiado",
        description: `O código #${id} foi salvo na área de transferência.`,
        duration: 2000,
      });
    });
  };

  const filteredOrders = useMemo(() => {
    return allOrders.filter(row => {
      const isPoint9944 = Object.values(row).some(val => String(val).includes('9944'));
      const isGeo = Object.entries(row).some(([key, val]) => 
        key.toLowerCase().includes('trusted') && String(val).includes('GEO⚡')
      );
      const isExterno = Object.entries(row).some(([key, val]) => 
        key.toLowerCase().includes('trusted') && String(val).includes('EXTERNO❌')
      );
      return isPoint9944 && (isGeo || isExterno);
    });
  }, [allOrders]);

  const groupedOrders = useMemo(() => {
    const groups: { [key: string]: RedashOrder[] } = {};
    filteredOrders.forEach(order => {
      const rtId = order.rt_asignado_orden || "Sem ID";
      if (!groups[rtId]) groups[rtId] = [];
      groups[rtId].push(order);
    });
    return groups;
  }, [filteredOrders]);

  const getCourierName = (id: string) => {
    // Busca flexível: id_motoboy ou id
    const courier = couriers?.find(c => String(c.id_motoboy || c.id) === String(id));
    return courier ? (courier.nome || courier.name) : "Motoboy não identificado";
  };

  return (
    <div className="space-y-6 animate-slide-up max-w-2xl mx-auto pb-20">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Monitoramento Ativo</h2>
          <p className="text-[9px] text-muted-foreground">{Object.keys(groupedOrders).length} RT(s) em operação</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => loadData()} 
          disabled={loading} 
          className="h-7 gap-1.5 text-blue-600 hover:bg-blue-50 text-[11px] font-bold uppercase tracking-tight"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          ATUALIZAR
        </Button>
      </div>

      <div className="space-y-4">
        {Object.keys(groupedOrders).length === 0 && !loading ? (
          <div className="text-center py-16 bg-muted/20 rounded-2xl border border-dashed flex flex-col items-center">
            <Package className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <h3 className="text-xs font-medium text-muted-foreground">Nenhum pedido GEO/EXTERNO</h3>
          </div>
        ) : (
          Object.entries(groupedOrders).map(([rtId, orders]) => (
            <Card key={rtId} className="border border-border/60 bg-card/80 shadow-sm overflow-hidden rounded-2xl">
              <CardContent className="p-0">
                <div className="p-4 bg-muted/30 flex items-center justify-between border-b border-border/40">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">RT: {rtId} - {getCourierName(rtId)}</h3>
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-[10px] font-bold border border-blue-200">
                    {orders.length}
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  {orders.map((order, idx) => {
                    const isExterno = Object.values(order).some(val => String(val).includes('EXTERNO❌'));
                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "p-3 rounded-xl border border-border/40 flex items-center justify-between transition-all",
                          isExterno ? "bg-red-500/5 border-red-200/50" : "bg-muted/10"
                        )}
                      >
                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-foreground leading-tight">{order.store_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{order.direccion_entrega}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-end mr-1">
                            <div className="flex items-center gap-2">
                              {isExterno && (
                                <Badge className="h-5 px-1.5 text-[8px] font-bold bg-red-500 text-white border-none uppercase">
                                  Externo
                                </Badge>
                              )}
                              <span className="text-[10px] font-mono font-bold text-muted-foreground">#{order.order_id}</span>
                            </div>
                            <span className="text-[8px] text-muted-foreground/70 font-bold uppercase mt-0.5 tracking-tight">
                              {order.estado_detallado_actual}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                            onClick={() => handleCopyId(order.order_id)}
                            title="Copiar ID"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}