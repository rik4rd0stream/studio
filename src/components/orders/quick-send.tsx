
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
  X,
  Zap,
  Star,
  Store,
  MapPin as MapPinIcon,
  ChevronRight
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
import { Label } from "@/components/ui/label";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, doc, setDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";

const COMMANDS = ["!!bundleBR", "!!rebr", "!!Br", "!!forzarbr"];

export function QuickSend({ onOrderCreated, initialOrderId, onClearInitialId }: { 
  onOrderCreated: (order: any) => void;
  initialOrderId?: string;
  onClearInitialId?: () => void;
}) {
  const { toast } = useToast();
  const db = useFirestore();
  const { user: currentUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [allOrders, setAllOrders] = useState<RedashOrder[]>([]);
  
  const [selectedCommand, setSelectedCommand] = useState("!!bundleBR");
  const [selectedOrder, setSelectedOrder] = useState<RedashOrder | null>(null);
  const [isCourierDialogOpen, setIsCourierDialogOpen] = useState(false);
  const [searchCourier, setSearchCourier] = useState("");
  const [manualOrderId, setManualOrderId] = useState<string>(initialOrderId ? String(initialOrderId) : "");

  // Popover para cadastro rápido de loja
  const [isStoreRegisterOpen, setIsStoreRegisterOpen] = useState(false);
  const [tempStoreName, setTempStoreName] = useState("");
  const [tempStoreAddress, setTempStoreAddress] = useState("");

  useEffect(() => {
    if (initialOrderId) setManualOrderId(String(initialOrderId));
  }, [initialOrderId]);

  const couriersQuery = useMemoFirebase(() => query(collection(db, 'entregadores')), [db]);
  const { data: couriers, isLoading: loadingCouriers } = useCollection<any>(couriersQuery);

  const storesQuery = useMemoFirebase(() => collection(db, 'storeProfiles'), [db]);
  const { data: stores } = useCollection<any>(storesQuery);

  const redashOrders = useMemo(() => {
    return allOrders.filter(row => {
      const pointValue = String(row.point_id || row.point || '').trim();
      const isPoint9944 = pointValue === '9944' || pointValue.includes('9944');
      const esTrusted = String(row.es_trusted || '').toUpperCase();
      const isSinRT = esTrusted.includes('SIN RT');
      return isPoint9944 && isSinRT;
    });
  }, [allOrders]);

  const filteredCouriers = useMemo(() => {
    if (!couriers) return { favorites: [], others: [] };
    const base = [...couriers]
      .filter(c => 
        (c.nome || c.name || '').toLowerCase().includes(searchCourier.toLowerCase()) || 
        String(c.id_motoboy || "").includes(searchCourier)
      );
    
    return {
      favorites: base.filter(c => !!c.isFavorite).sort((a, b) => (a.nome || "").localeCompare(b.nome || "")),
      others: base.filter(c => !c.isFavorite).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
    };
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
    const interval = setInterval(() => loadData(true), 15000); 
    return () => clearInterval(interval);
  }, []);

  const handleOpenCourierSelection = (order: RedashOrder) => {
    setSelectedOrder(order);
    setIsCourierDialogOpen(true);
  };

  const getStoreAddress = (name: string) => {
    const store = stores?.find(s => s.id === name);
    return store?.address || null;
  };

  const handleQuickStoreRegister = async () => {
    if (!tempStoreName || !tempStoreAddress.trim()) return;
    try {
      await setDoc(doc(db, 'storeProfiles', tempStoreName), {
        address: tempStoreAddress.trim().substring(0, 50),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast({ title: "Coleta Salva", description: "Endereço registrado com sucesso." });
      setIsStoreRegisterOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao salvar" });
    }
  };

  const handleGenerateCommand = async (courierId: string) => {
    if (!selectedOrder) return;
    const fullCommand = `${selectedCommand} ${selectedOrder.order_id} ${courierId}`;
    const isDirect = currentUser?.useDirectWhatsApp !== false;

    if (isDirect) {
      window.open(`https://wa.me/?text=${encodeURIComponent(fullCommand)}`, '_blank');
    } else {
      if (Capacitor.isNativePlatform()) {
        try {
          await Share.share({ title: 'Despacho Rappi', text: fullCommand });
        } catch (e) {
          console.log("Compartilhamento cancelado.");
        }
      } else if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title: 'Despacho Rappi', text: fullCommand });
        } catch (err) {
          console.log("Compartilhamento web cancelado.");
        }
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(fullCommand)}`, '_blank');
      }
    }

    setIsCourierDialogOpen(false);
    setSelectedOrder(null);
    setManualOrderId(""); 
    if (onClearInitialId) onClearInitialId();
  };

  return (
    <div className="space-y-6 animate-slide-up pb-32 max-w-xl mx-auto">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[11px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
          <Zap className="h-4 w-4" /> Envio Rápido ({redashOrders.length})
        </h2>
        <Button variant="ghost" size="sm" onClick={() => loadData()} disabled={loading} className="h-8 text-[11px] font-bold text-blue-600 uppercase rounded-full hover:bg-blue-50">
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} /> ATUALIZAR
        </Button>
      </div>

      <div className="space-y-3">
        {loading && allOrders.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" />
            <p className="text-[10px] text-muted-foreground font-black tracking-widest uppercase">Buscando Pedidos...</p>
          </div>
        ) : redashOrders.length === 0 && !loading ? (
          <div className="text-center py-12 bg-muted/20 rounded-3xl border border-dashed border-muted-foreground/20 flex flex-col items-center">
            <Package className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nenhum pedido sem RT</h3>
          </div>
        ) : (
          redashOrders.map((order, idx) => {
            const pickupAddr = getStoreAddress(order.store_name || "");
            return (
              <Card 
                key={idx} 
                className="border-none bg-card shadow-sm hover:shadow-lg transition-all cursor-pointer rounded-3xl group"
                onClick={() => handleOpenCourierSelection(order)}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 overflow-hidden pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-black text-foreground group-hover:text-primary leading-tight truncate">
                          {order.store_name}
                        </h3>
                        {!pickupAddr && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 rounded-full text-amber-500 bg-amber-50 hover:bg-amber-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTempStoreName(order.store_name || "");
                              setTempStoreAddress("");
                              setIsStoreRegisterOpen(true);
                            }}
                          >
                            <AlertCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPinIcon className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] font-bold leading-tight">
                            <span className="text-orange-600">COLETA:</span> {pickupAddr || "Endereço não cadastrado"}
                          </p>
                        </div>
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <p className="text-[10px] font-bold leading-tight">
                            <span className="text-primary">ENTREGA:</span> {order.direccion_entrega}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] font-mono font-black text-muted-foreground/60 tracking-tighter">#{order.order_id}</span>
                      <span className="text-[9px] text-primary font-black uppercase bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                        {order.estado_detallado_actual || order.estado}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if(manualOrderId.trim()) handleOpenCourierSelection({ order_id: manualOrderId.trim(), store_name: "Manual", direccion_entrega: "Manual" } as RedashOrder); }} className="pt-8 space-y-4">
        <div className="relative">
          <Input 
            placeholder="ID DO PEDIDO" 
            value={manualOrderId}
            onChange={(e) => setManualOrderId(e.target.value)}
            className="h-16 text-center text-2xl font-black tracking-widest rounded-3xl border-none bg-muted/50 shadow-inner pr-14"
          />
          {manualOrderId && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => { setManualOrderId(""); if(onClearInitialId) onClearInitialId(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full text-muted-foreground hover:text-destructive"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Button type="button" variant="outline" onClick={async () => {
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
              const text = await navigator.clipboard.readText();
              if (text) setManualOrderId(text.trim());
            }
          }} className="h-14 font-black text-xs uppercase rounded-3xl border-muted-foreground/20 hover:bg-muted shadow-sm gap-3">
            <ClipboardPaste className="h-5 w-5" /> Colar ID
          </Button>
          <Button type="submit" disabled={!manualOrderId.trim()} className="h-14 font-black text-xs uppercase rounded-3xl shadow-xl shadow-primary/20 gap-3">
            Continuar <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </form>

      {/* Popup Cadastro Loja */}
      <Dialog open={isStoreRegisterOpen} onOpenChange={setIsStoreRegisterOpen}>
        <DialogContent className="max-w-[340px] rounded-[32px] p-8 border-none shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-xl font-black text-center tracking-tight">Cadastrar Coleta</DialogTitle>
            <DialogDescription className="text-xs text-center font-bold text-muted-foreground uppercase leading-relaxed">
              Loja: <span className="text-primary">{tempStoreName}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Endereço (Máx 50 caracteres)</Label>
              <Input 
                placeholder="Ex: Rua das Flores, 123 - Box 4"
                value={tempStoreAddress}
                onChange={(e) => setTempStoreAddress(e.target.value.substring(0, 50))}
                className="h-12 bg-muted/50 border-none rounded-2xl font-bold shadow-inner"
              />
            </div>
            <Button onClick={handleQuickStoreRegister} className="w-full h-14 font-black rounded-2xl shadow-lg text-sm uppercase">
              Salvar Endereço
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Popup Seleção Motoboy */}
      <Dialog open={isCourierDialogOpen} onOpenChange={setIsCourierDialogOpen}>
        <DialogContent 
          className="max-md rounded-[40px] p-0 border-none shadow-2xl overflow-hidden"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="bg-primary/5 p-8 border-b border-primary/10">
            <DialogHeader className="space-y-1 mb-6">
              <DialogTitle className="text-2xl font-black tracking-tight">Selecionar Entregador</DialogTitle>
              <DialogDescription className="text-[10px] text-primary font-black uppercase tracking-widest">
                Pedido #{selectedOrder?.order_id} • {selectedOrder?.store_name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Comando de Despacho</p>
              <div className="flex flex-wrap gap-2">
                {COMMANDS.map((cmd) => (
                  <Button
                    key={cmd}
                    variant="default"
                    onClick={() => setSelectedCommand(cmd)}
                    className={cn(
                      "h-11 px-6 font-black text-xs rounded-2xl transition-all border-2",
                      selectedCommand === cmd 
                        ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105" 
                        : "bg-background text-muted-foreground border-transparent hover:border-primary/20"
                    )}
                  >
                    {cmd}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar por Nome ou RT..." 
                className="pl-12 h-14 text-sm font-bold bg-muted/30 border-none rounded-3xl shadow-inner" 
                value={searchCourier} 
                onChange={(e) => setSearchCourier(e.target.value)} 
              />
            </div>

            <div className="max-h-[45vh] overflow-y-auto pr-2 no-scrollbar space-y-6">
              {filteredCouriers.favorites.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <Star className="h-3 w-3 fill-primary" /> Favoritos
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {filteredCouriers.favorites.map((c) => (
                      <Button 
                        key={c.id} 
                        variant="ghost" 
                        className="flex flex-col items-center justify-center h-28 p-3 hover:bg-primary/10 rounded-3xl border-2 border-primary/20 bg-primary/5 transition-all group relative" 
                        onClick={() => handleGenerateCommand(c.id_motoboy)}
                      >
                        <p className="font-black text-sm leading-tight text-center truncate w-full group-hover:text-primary">
                          {(c.nome || c.name || '').split(' ')[0]}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-black mt-1.5 uppercase">RT {c.id_motoboy}</p>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Todos os Motoboys</p>
                <div className="grid grid-cols-3 gap-3">
                  {filteredCouriers.others.map((c) => (
                    <Button 
                      key={c.id} 
                      variant="ghost" 
                      className="flex flex-col items-center justify-center h-28 p-3 hover:bg-primary/10 rounded-3xl border-2 border-transparent bg-muted/20 transition-all group" 
                      onClick={() => handleGenerateCommand(c.id_motoboy)}
                    >
                      <p className="font-bold text-sm leading-tight text-center truncate w-full group-hover:text-primary">
                        {(c.nome || c.name || '').split(' ')[0]}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-bold mt-1.5 uppercase">RT {c.id_motoboy}</p>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {filteredCouriers.favorites.length === 0 && filteredCouriers.others.length === 0 && !loadingCouriers && (
              <p className="text-center py-12 text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-50">Nenhum motoboy encontrado</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
