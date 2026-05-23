
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
  Store,
  MapPin as MapPinIcon,
  Star,
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
import { collection, query, doc, setDoc, deleteDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";

const COMMANDS = ["!!bundleBR", "!!rebr", "!!Br", "!!forzarbr"];

export function CreateOrder({ onOrderCreated, initialOrderId, onClearInitialId }: { 
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

  // Hook para buscar os favoritos específicos do usuário atual
  const userFavoritesQuery = useMemoFirebase(() => {
    if (!currentUser?.email) return null;
    return collection(db, 'users', currentUser.email.toLowerCase().trim(), 'favorites');
  }, [db, currentUser?.email]);
  const { data: userFavorites } = useCollection<any>(userFavoritesQuery);

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
    const favoriteIds = new Set((userFavorites || []).map(f => f.id));

    const base = [...couriers]
      .filter(c => 
        (c.nome || c.name || '').toLowerCase().includes(searchCourier.toLowerCase()) || 
        String(c.id_motoboy || "").includes(searchCourier)
      );
    
    return {
      favorites: base.filter(c => favoriteIds.has(String(c.id_motoboy))).sort((a, b) => (a.nome || "").localeCompare(b.nome || "")),
      others: base.filter(c => !favoriteIds.has(String(c.id_motoboy))).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
    };
  }, [couriers, searchCourier, userFavorites]);

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

  const toggleFavorite = async (e: React.MouseEvent, courierId: string) => {
    e.stopPropagation();
    if (!currentUser?.email) return;

    const favDocRef = doc(db, 'users', currentUser.email.toLowerCase().trim(), 'favorites', String(courierId));
    const isAlreadyFav = (userFavorites || []).some(f => f.id === String(courierId));

    if (isAlreadyFav) {
      await deleteDoc(favDocRef);
    } else {
      await setDoc(favDocRef, { createdAt: new Date().toISOString() });
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
        } catch (e) {}
      } else if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title: 'Despacho Rappi', text: fullCommand });
        } catch (err) {}
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
    <div className="space-y-4 animate-slide-up pb-32 max-w-xl mx-auto">
      <div className="bg-card p-3 rounded-2xl border border-border/40 shadow-sm space-y-2">
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">Comando de Despacho</p>
        <div className="flex flex-wrap gap-2">
          {COMMANDS.map((cmd) => (
            <Button
              key={cmd}
              variant="default"
              onClick={() => setSelectedCommand(cmd)}
              className={cn(
                "h-9 px-4 font-black text-[10px] rounded-xl transition-all",
                selectedCommand === cmd 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cmd}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <h2 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Pendentes ({redashOrders.length})</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => loadData()} 
          disabled={loading} 
          className="h-7 text-[10px] font-bold text-blue-600 uppercase rounded-full hover:bg-blue-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} /> ATUALIZAR
        </Button>
      </div>

      <div className="space-y-2">
        {loading && allOrders.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary opacity-30" />
            <p className="text-[9px] text-muted-foreground font-black tracking-widest uppercase">Buscando...</p>
          </div>
        ) : redashOrders.length === 0 && !loading ? (
          <div className="text-center py-10 bg-muted/20 rounded-2xl border border-dashed border-muted-foreground/20 flex flex-col items-center">
            <Package className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nenhum pedido pendente</h3>
          </div>
        ) : (
          redashOrders.map((order, idx) => {
            const pickupAddr = getStoreAddress(order.store_name || "");
            return (
              <Card 
                key={idx} 
                className="border-none bg-card shadow-sm hover:shadow-md transition-all cursor-pointer rounded-2xl group"
                onClick={() => handleOpenCourierSelection(order)}
              >
                <CardContent className="p-3 space-y-1">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 overflow-hidden pr-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black text-foreground group-hover:text-primary leading-tight truncate">
                          {order.store_name}
                        </h3>
                        {!pickupAddr && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 rounded-full text-amber-500 bg-amber-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTempStoreName(order.store_name || "");
                              setTempStoreAddress("");
                              setIsStoreRegisterOpen(true);
                            }}
                          >
                            <AlertCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-0.5">
                        <div className="flex items-start gap-1 text-muted-foreground">
                          <MapPinIcon className="h-3 w-3 text-orange-500 shrink-0 mt-0.5" />
                          <p className="text-[9px] font-bold leading-tight">
                            <span className="text-orange-600">COLETA:</span> {pickupAddr || "N/A"}
                          </p>
                        </div>
                        <div className="flex items-start gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                          <p className="text-[9px] font-bold leading-tight">
                            <span className="text-primary">ENTREGA:</span> {order.direccion_entrega}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[9px] font-mono font-black text-muted-foreground/60 tracking-tighter">#{order.order_id}</span>
                      <span className="text-[8px] text-primary font-black uppercase bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
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

      <Dialog open={isCourierDialogOpen} onOpenChange={setIsCourierDialogOpen}>
        <DialogContent 
          className="max-md rounded-3xl p-0 border-none shadow-2xl overflow-hidden"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-xl font-black tracking-tight">Selecionar Entregador</DialogTitle>
            <DialogDescription className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">
              Pedido #{selectedOrder?.order_id}
            </DialogDescription>
          </DialogHeader>
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar motoboy..." 
                className="pl-10 h-10 text-xs font-bold bg-muted/30 border-none rounded-2xl shadow-inner" 
                value={searchCourier} 
                onChange={(e) => setSearchCourier(e.target.value)} 
              />
            </div>
          </div>
          <div className="px-4 py-4 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar space-y-4">
            {loadingCouriers ? (
              <Loader2 className="h-8 w-8 animate-spin mx-auto my-6 text-primary opacity-30" />
            ) : (
              <>
                {filteredCouriers.favorites.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[8px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                      <Star className="h-2.5 w-2.5 fill-primary" /> Favoritos
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {filteredCouriers.favorites.map((c) => (
                        <Button 
                          key={c.id} 
                          variant="ghost" 
                          className="flex flex-col items-center justify-center h-20 p-2 hover:bg-primary/10 rounded-2xl border-2 border-primary/20 bg-primary/5 transition-all relative group" 
                          onClick={() => handleGenerateCommand(c.id_motoboy)}
                        >
                          <button 
                            onClick={(e) => toggleFavorite(e, c.id_motoboy)}
                            className="absolute top-1 right-1 p-1 z-10"
                          >
                            <Star className="h-3 w-3 fill-primary text-primary" />
                          </button>
                          <p className="font-bold text-xs leading-tight text-center truncate w-full group-hover:text-primary">
                            {(c.nome || c.name || '').split(' ')[0]}
                          </p>
                          <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase">RT {c.id_motoboy}</p>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Todos</p>
                  <div className="grid grid-cols-3 gap-2">
                    {filteredCouriers.others.map((c) => (
                      <Button 
                        key={c.id} 
                        variant="ghost" 
                        className="flex flex-col items-center justify-center h-20 p-2 hover:bg-primary/10 rounded-2xl bg-muted/20 transition-all relative group" 
                        onClick={() => handleGenerateCommand(c.id_motoboy)}
                      >
                        <button 
                          onClick={(e) => toggleFavorite(e, c.id_motoboy)}
                          className="absolute top-1 right-1 p-1 z-10 opacity-30 group-hover:opacity-100 transition-opacity"
                        >
                          <Star className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <p className="font-bold text-xs leading-tight text-center truncate w-full group-hover:text-primary">
                          {(c.nome || c.name || '').split(' ')[0]}
                        </p>
                        <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase">RT {c.id_motoboy}</p>
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
