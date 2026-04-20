
"use client";

import { useState, useEffect, useMemo } from "react";
import { redashService, RedashOrder } from "@/lib/api/redash-service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, Package, User, Send, Settings2, ClipboardCopy, Zap, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { addDocumentBridge } from "@/app/actions/firestore-bridge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ActiveOrdersProps {
  onSelectOrder?: (orderId: string) => void;
}

export function ActiveOrders({ onSelectOrder }: ActiveOrdersProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [allOrders, setAllOrders] = useState<RedashOrder[]>([]);
  
  const [managingRt, setManagingRt] = useState<string | null>(null);
  
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

  const recordLog = (orderId: string, rtId: string, action: 'copy_id' | 'cheguei') => {
    if (!user) return;
    
    const logData = {
      orderId,
      rtId: rtId || "Nuvem",
      action,
      userName: user.name || "Operador",
      userEmail: user.email,
      timestamp: new Date().toISOString()
    };
    
    addDocumentBridge('operationLogs', logData);
  };

  const handleCopyAndGo = (id: any, rtId: string) => {
    const stringId = String(id);
    navigator.clipboard.writeText(stringId).then(() => {
      toast({
        title: "ID Copiado",
        description: `Código #${stringId} preparado para despacho.`,
        duration: 2000,
      });
      
      recordLog(stringId, rtId, 'copy_id');
      
      if (onSelectOrder) {
        onSelectOrder(stringId);
      }
    });
  };

  const handleForzaBr = (orderId: string, rtId: string) => {
    const command = `!!forzabr ${orderId} ${rtId}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(command)}`, '_blank');
    
    recordLog(orderId, rtId, 'cheguei');
  };

  const filteredOrders = useMemo(() => {
    return allOrders.filter(row => {
      const isPoint9944 = String(row.point_id || row.point || '').includes('9944');
      
      const isGeo = Object.entries(row).some(([key, val]) => 
        key.toLowerCase().includes('trusted') && String(val).includes('GEO⚡')
      );
      const isExterno = String(row.estado_detallado_actual || "").includes('EXTERNO❌');
      
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
    if (id === "Sem ID") return "Nuvem";
    const courier = couriers?.find(c => String(c.id_motoboy || c.id) === String(id));
    return courier ? (courier.nome || courier.name) : "Nuvem";
  };

  const rtOrdersToManage = managingRt ? groupedOrders[managingRt] || [] : [];

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
          Object.entries(groupedOrders).sort((a, b) => a[0].localeCompare(b[0])).map(([rtId, orders]) => {
            const isNuvemGroup = rtId === "Sem ID";
            const courierName = getCourierName(rtId);
            const isNuvemSub = courierName === "Nuvem";
            const hasExterno = orders.some(o => String(o.estado_detallado_actual || "").includes('EXTERNO❌'));
            const isCritical = isNuvemGroup || isNuvemSub || hasExterno;
            
            return (
              <Card key={rtId} className={cn(
                "border border-border/60 shadow-sm overflow-hidden rounded-2xl transition-colors",
                isCritical ? "bg-red-500/10 border-red-200/50" : "bg-card/80"
              )}>
                <CardContent className="p-0">
                  <div className={cn(
                    "p-4 flex items-center justify-between border-b border-border/40",
                    isCritical ? "bg-red-500/15" : "bg-muted/30"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        isCritical ? "bg-red-500/20" : "bg-primary/10"
                      )}>
                        {isNuvemGroup || isNuvemSub ? <Cloud className="h-4 w-4 text-red-600" /> : <User className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="text-sm font-bold text-foreground truncate">
                          {courierName}
                        </h3>
                        <p className={cn(
                          "text-[9px] font-bold truncate max-w-[180px]",
                          isCritical ? "text-red-700/70" : "text-muted-foreground"
                        )}>
                          {isNuvemGroup ? "Sem RT Atribuído" : `RT: ${rtId}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setManagingRt(rtId)}
                        className={cn(
                          "h-7 text-[9px] font-bold uppercase tracking-tight rounded-full border-primary/20 hover:bg-primary/5 gap-1",
                          isCritical ? "text-red-700 border-red-200 hover:bg-red-200" : "text-primary"
                        )}
                      >
                        <Settings2 className="h-3 w-3" /> Gerenciar
                      </Button>
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border",
                        isCritical ? "bg-red-500/20 text-red-700 border-red-300" : "bg-blue-500/10 text-blue-600 border-blue-200"
                      )}>
                        {orders.length}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 space-y-2">
                    {orders.slice(0, 3).map((order, idx) => {
                      const isExterno = String(order.estado_detallado_actual || "").includes('EXTERNO❌');
                      
                      return (
                        <div 
                          key={idx} 
                          className={cn(
                            "p-3 rounded-xl border transition-all",
                            isExterno ? "bg-red-600/20 border-red-400 shadow-inner" : "bg-muted/10 border-border/40",
                            "flex items-center justify-between"
                          )}
                        >
                          <div className="space-y-1">
                            <p className="text-[11px] font-bold text-foreground leading-tight">{order.store_name}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{order.direccion_entrega}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end mr-1">
                              <span className="text-[10px] font-mono font-bold text-muted-foreground">#{order.order_id}</span>
                              <span className={cn(
                                "text-[8px] font-bold uppercase mt-0.5 tracking-tight",
                                isExterno ? "text-red-700" : "text-muted-foreground/70"
                              )}>
                                {order.estado_detallado_actual}
                              </span>
                            </div>
                            <Button
                              variant="default"
                              size="icon"
                              className={cn(
                                "h-8 w-8 rounded-full shadow-sm",
                                isExterno ? "bg-red-600 hover:bg-red-700 text-white" : "bg-primary text-white hover:bg-primary/90"
                              )}
                              onClick={() => handleCopyAndGo(order.order_id, rtId)}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={!!managingRt} onOpenChange={(open) => !open && setManagingRt(null)}>
        <DialogContent className="max-w-[340px] rounded-3xl p-0 border-none shadow-2xl overflow-hidden">
          <DialogHeader className={cn(
            "p-6 pb-4 text-white",
            (managingRt === "Sem ID" || getCourierName(managingRt || "") === "Nuvem" || rtOrdersToManage.some(o => String(o.estado_detallado_actual || "").includes('EXTERNO❌'))) ? "bg-red-600" : "bg-primary"
          )}>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Settings2 className="h-5 w-5" /> {getCourierName(managingRt || "")}
            </DialogTitle>
            <DialogDescription className="text-white/80 text-xs font-bold">
              {managingRt === "Sem ID" ? "Sem RT Atribuído" : `RT: ${managingRt}`}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3 no-scrollbar">
            {rtOrdersToManage.map((order, idx) => {
               const isExterno = String(order.estado_detallado_actual || "").includes('EXTERNO❌');

               return (
                <div key={idx} className={cn(
                  "p-4 rounded-2xl border space-y-3",
                  isExterno ? "bg-red-500/10 border-red-300" : "bg-muted/30 border-border/40"
                )}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-xs font-bold leading-tight">{order.store_name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono font-bold">#{order.order_id}</p>
                    </div>
                    <Badge variant="outline" className={cn(
                      "text-[8px] uppercase font-bold py-0 h-4",
                      isExterno ? "border-red-400 text-red-700 bg-red-100" : "border-primary/20 text-primary"
                    )}>
                      {order.estado_detallado_actual}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="h-9 text-[10px] font-bold uppercase gap-1.5 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
                      onClick={() => {
                        navigator.clipboard.writeText(String(order.order_id));
                        recordLog(String(order.order_id), managingRt!, 'copy_id');
                        toast({ title: "Copiado!", description: "ID enviado para área de transferência." });
                      }}
                    >
                      <ClipboardCopy className="h-3.5 w-3.5" /> Copiar ID
                    </Button>
                    <Button 
                      size="sm" 
                      className={cn(
                        "h-9 text-[10px] font-bold uppercase gap-1.5 rounded-xl",
                        isExterno ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"
                      )}
                      onClick={() => handleForzaBr(String(order.order_id), managingRt!)}
                    >
                      <Zap className="h-3.5 w-3.5" /> Cheguei
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-4 bg-muted/20 border-t flex justify-center">
            <Button variant="ghost" onClick={() => setManagingRt(null)} className="text-xs font-bold uppercase text-muted-foreground">
              Fechar Janela
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
