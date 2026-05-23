
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
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
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

  const handleForzarBr = async (orderId: string, rtId: string) => {
    const command = `!!forzarbr ${orderId} ${rtId}`;
    const isDirect = user?.useDirectWhatsApp !== false;

    if (isDirect) {
      window.open(`https://wa.me/?text=${encodeURIComponent(command)}`, '_blank');
    } else {
      if (Capacitor.isNativePlatform()) {
        try {
          await Share.share({ title: 'Cheguei Rappi', text: command });
        } catch (e) {}
      } else if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title: 'Cheguei Rappi', text: command });
        } catch (err) {}
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(command)}`, '_blank');
      }
    }
    
    recordLog(orderId, rtId, 'cheguei');
  };

  const filteredOrders = useMemo(() => {
    return allOrders.filter(row => {
      const pointValue = String(row.point_id || row.point || '').trim();
      const isPoint9944 = pointValue === '9944' || pointValue.includes('9944');
      if (!isPoint9944) return false;

      const esTrusted = String(row.es_trusted || '').toUpperCase();
      if (esTrusted.includes('SIN RT')) return false;

      const rtId = String(row.rt_asignado_orden || "").trim();
      const estadoActual = String(row.estado_detallado_actual || row.estado || "").toUpperCase();
      const isExterno = estadoActual.includes('EXTERNO');
      return rtId !== "" || isExterno;
    });
  }, [allOrders]);

  const groupedOrders = useMemo(() => {
    const groups: { [key: string]: RedashOrder[] } = {};
    filteredOrders.forEach(order => {
      const rtId = String(order.rt_asignado_orden || "Sem ID").trim();
      const displayRt = rtId === "Sem ID" || rtId === "" ? "Nuvem" : rtId;
      if (!groups[displayRt]) groups[displayRt] = [];
      groups[displayRt].push(order);
    });
    return groups;
  }, [filteredOrders]);

  const rtOrdersToManage = useMemo(() => {
    if (!managingRt) return [];
    return groupedOrders[managingRt] || [];
  }, [managingRt, groupedOrders]);

  const getCourierName = (id: string) => {
    if (id === "Sem ID" || id === "0" || id === "Nuvem" || !id) return "Nuvem";
    const courier = couriers?.find(c => String(c.id_motoboy || c.id) === String(id));
    return courier ? (courier.nome || courier.name) : "Nuvem";
  };

  return (
    <div className="space-y-3 animate-slide-up max-w-2xl mx-auto pb-20">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Monitoramento Ativo</h2>
          <p className="text-[9px] text-muted-foreground font-bold">{Object.keys(groupedOrders).length} RT(s) em operação</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => loadData()} 
          disabled={loading} 
          className="h-7 gap-1 text-blue-600 hover:bg-blue-50 text-[10px] font-black uppercase tracking-widest px-3 rounded-full"
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          ATUALIZAR
        </Button>
      </div>

      <div className="space-y-3">
        {Object.keys(groupedOrders).length === 0 && !loading ? (
          <div className="text-center py-10 bg-muted/20 rounded-2xl border border-dashed border-muted-foreground/20 flex flex-col items-center">
            <Package className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nenhum pedido ativo</h3>
          </div>
        ) : (
          Object.entries(groupedOrders)
            .sort((a, b) => {
              const nameA = getCourierName(a[0]);
              const nameB = getCourierName(b[0]);
              if (nameA === "Nuvem") return -1;
              if (nameB === "Nuvem") return 1;
              return nameA.localeCompare(nameB);
            })
            .map(([rtId, orders]) => {
              const courierName = getCourierName(rtId);
              const isNuvem = courierName === "Nuvem";
              const hasExterno = orders.some(o => {
                const s = String(o.estado_detallado_actual || o.estado || "").toUpperCase();
                return s.includes('EXTERNO');
              });
              const isAlert = isNuvem || hasExterno;
              
              return (
                <Card key={rtId} className={cn(
                  "border shadow-sm overflow-hidden rounded-xl transition-all",
                  isAlert ? "bg-red-500/[0.05] border-red-200" : "bg-card/80 border-border/40"
                )}>
                  <CardContent className="p-0">
                    <div className={cn(
                      "p-2.5 flex items-center justify-between border-b",
                      isAlert ? "bg-red-500/[0.1] border-red-200/50" : "bg-muted/30 border-border/40"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shadow-inner",
                          isAlert ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
                        )}>
                          {isNuvem ? <Cloud className="h-4 w-4" /> : <User className="h-4 w-4" />}
                        </div>
                        <div className="overflow-hidden">
                          <h3 className={cn(
                            "text-sm font-black tracking-tight leading-none mb-0.5 truncate max-w-[150px]",
                            isAlert ? "text-red-700" : "text-foreground"
                          )}>
                            {courierName}
                          </h3>
                          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/70">
                            {rtId === "Nuvem" ? "DESPACHO MANUAL" : `RT: ${rtId}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setManagingRt(rtId)}
                          className={cn(
                            "h-7 text-[9px] font-black uppercase tracking-widest rounded-lg gap-1.5 px-3 border",
                            isAlert ? "text-red-700 border-red-300 bg-red-50 hover:bg-red-100" : "text-primary border-primary/20 hover:bg-primary/5"
                          )}
                        >
                          <Settings2 className="h-3.5 w-3.5" /> Opções
                        </Button>
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border",
                          isAlert ? "bg-red-600 text-white border-red-400" : "bg-primary text-white border-primary-foreground/20"
                        )}>
                          {orders.length}
                        </div>
                      </div>
                    </div>

                    <div className="p-1.5 space-y-1">
                      {orders.map((order, idx) => {
                        const isExternoOrder = String(order.estado_detallado_actual || order.estado || "").toUpperCase().includes('EXTERNO');
                        
                        return (
                          <div 
                            key={idx} 
                            className={cn(
                              "p-2 rounded-lg border transition-all flex items-center justify-between group",
                              isExternoOrder ? "bg-red-600/10 border-red-300 shadow-inner" : "bg-muted/5 border-border/40 hover:bg-muted/10"
                            )}
                          >
                            <div className="space-y-0.5 overflow-hidden">
                              <p className={cn(
                                "text-[11px] font-black leading-tight truncate max-w-[160px]",
                                isExternoOrder ? "text-red-700" : "text-foreground"
                              )}>{order.store_name}</p>
                              <p className="text-[9px] text-muted-foreground font-bold truncate max-w-[180px]">{order.direccion_entrega}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <div className="flex flex-col items-end">
                                <span className={cn(
                                  "text-[8px] font-mono font-black",
                                  isExternoOrder ? "text-red-700" : "text-muted-foreground/60"
                                )}>#{order.order_id}</span>
                                <span className={cn(
                                  "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full",
                                  isExternoOrder ? "bg-red-600 text-white" : "bg-muted text-muted-foreground"
                                )}>
                                  {order.estado_detallado_actual || order.estado}
                                </span>
                              </div>
                              <Button
                                variant="default"
                                size="icon"
                                className={cn(
                                  "h-8 w-8 rounded-lg shadow-sm transition-transform",
                                  isExternoOrder ? "bg-red-600 hover:bg-red-700 text-white" : "bg-primary text-white"
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
        <DialogContent className="max-w-[320px] rounded-3xl p-0 border-none shadow-2xl overflow-hidden">
          <DialogHeader className={cn(
            "p-5 pb-4 text-white",
            (managingRt === "Nuvem" || rtOrdersToManage.some(o => String(o.estado_detallado_actual || "").toUpperCase().includes('EXTERNO'))) ? "bg-red-600" : "bg-primary"
          )}>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Settings2 className="h-5 w-5" /> {getCourierName(managingRt || "")}
            </DialogTitle>
            <DialogDescription className="text-white/80 text-[9px] font-black uppercase tracking-widest mt-1">
              {managingRt === "Nuvem" ? "Despacho Manual / Point" : `RT Ativo: ${managingRt}`}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 max-h-[50vh] overflow-y-auto space-y-2 no-scrollbar">
            {rtOrdersToManage.map((order, idx) => {
               const isExternoOrder = String(order.estado_detallado_actual || order.estado || "").toUpperCase().includes('EXTERNO');

               return (
                <div key={idx} className={cn(
                  "p-3 rounded-2xl border space-y-3",
                  isExternoOrder ? "bg-red-500/10 border-red-300" : "bg-muted/30 border-border/40"
                )}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-black leading-tight">{order.store_name}</p>
                      <p className="text-[9px] font-mono font-black text-muted-foreground/60">#{order.order_id}</p>
                    </div>
                    <Badge variant="outline" className={cn(
                      "text-[8px] uppercase font-black py-0 h-4 border-none px-2",
                      isExternoOrder ? "text-white bg-red-600" : "text-primary bg-primary/10"
                    )}>
                      {order.estado_detallado_actual || order.estado}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="h-9 text-[9px] font-black uppercase gap-1.5 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50"
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
                        "h-9 text-[9px] font-black uppercase gap-1.5 rounded-xl text-white shadow-md",
                        isExternoOrder ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700 shadow-orange-500/10"
                      )}
                      onClick={() => handleForzarBr(String(order.order_id), managingRt!)}
                    >
                      <Zap className="h-3.5 w-3.5" /> Cheguei
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-4 bg-muted/20 border-t flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => setManagingRt(null)} className="text-[9px] font-black uppercase text-muted-foreground tracking-widest hover:bg-transparent">
              Fechar Painel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
