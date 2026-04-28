
"use client";

import { useState, useEffect, useMemo } from "react";
import { redashService } from "@/lib/api/redash-service";
import { RTStatusData } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  RefreshCw, 
  Loader2, 
  MapPin, 
  Search, 
  Wifi, 
  WifiOff, 
  Zap, 
  ZapOff, 
  Award,
  Navigation
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";

export function RTStatus() {
  const { toast } = useToast();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RTStatusData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Busca entregadores cadastrados para mostrar o nome em vez de apenas o ID
  const couriersQuery = useMemoFirebase(() => collection(db, 'entregadores'), [db]);
  const { data: couriers } = useCollection<any>(couriersQuery);

  const getCourierName = (id: string) => {
    const courier = couriers?.find(c => String(c.id_motoboy || c.id) === String(id));
    return courier ? (courier.nome || courier.name) : `RT ${id}`;
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    const result = await redashService.fetchRTStatus();
    if (result.success) {
      setData(result.data || []);
    } else {
      toast({ variant: "destructive", title: "Erro ao carregar Status", description: result.error });
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 20000);
    return () => clearInterval(interval);
  }, []);

  const getLevelStyles = (level: string) => {
    const l = String(level || "").toUpperCase();
    if (l.includes("DIAMANTE")) return "text-black dark:text-white font-black";
    if (l.includes("PRATA")) return "text-slate-400 font-bold";
    if (l.includes("BRONZE")) return "text-orange-500 font-bold";
    if (l.includes("DANGER") || l.includes("ATENCIÓN") || l.includes("VERMELHO")) return "text-red-600 font-bold";
    return "text-muted-foreground";
  };

  const filteredData = useMemo(() => {
    return data.filter(rt => {
      // Filtro obrigatório por Localidade (Point 9944)
      const geoId = String(rt.geo_queue_id || rt.point_id || "");
      const isPoint9944 = geoId === '9944' || geoId.includes('9944');
      
      if (!isPoint9944) return false;

      // Filtro de busca por texto (agora inclui o nome se existir)
      const courierName = getCourierName(rt.courier_id).toLowerCase();
      const matchesSearch = String(rt.courier_id).includes(searchTerm) || 
                           courierName.includes(searchTerm.toLowerCase()) ||
                           String(rt.storekeeper_level_name || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [data, searchTerm, couriers]);

  const openMap = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <Navigation className="h-6 w-6" /> Monitor RT (Point 9944)
          </h2>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Tempo real & Localização</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por Nome ou RT..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-card border-none shadow-sm rounded-xl"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => loadData()} disabled={loading} className="rounded-xl h-10 w-10">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {loading && data.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Filtrando Point 9944...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredData.map((rt, idx) => {
            const isOnline = rt.on_geo_queue === true || rt.on_geo_queue === 1 || String(rt.on_geo_queue).toLowerCase() === 'true';
            const isGeo = rt.connected_on_geo_queue === true || rt.connected_on_geo_queue === 1 || String(rt.connected_on_geo_queue).toLowerCase() === 'true';
            const isAuto = rt.auto_acceptance === true || rt.auto_acceptance === 1 || String(rt.auto_acceptance).toLowerCase() === 'true';
            const courierName = getCourierName(rt.courier_id);

            return (
              <Card key={idx} className={cn(
                "border-none shadow-sm rounded-2xl overflow-hidden transition-all hover:shadow-md",
                isOnline ? "bg-card" : "bg-muted/30 opacity-70"
              )}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                        isOnline ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                      )}>
                        {isOnline ? <Wifi className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="text-lg font-black leading-none mb-1 truncate max-w-[180px]">
                          {courierName}
                        </h3>
                        <p className={cn("text-[10px] uppercase tracking-tighter flex items-center gap-1", getLevelStyles(rt.storekeeper_level_name))}>
                          <Award className="h-3 w-3" /> {rt.storekeeper_level_name || 'Nível N/A'}
                        </p>
                        {courierName !== `RT ${rt.courier_id}` && (
                          <p className="text-[9px] font-bold text-muted-foreground/60 uppercase mt-0.5">ID: {rt.courier_id}</p>
                        )}
                      </div>
                    </div>

                    {isOnline && rt.lat && rt.lng && (
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        onClick={() => openMap(rt.lat, rt.lng)}
                        className="h-8 rounded-full gap-1.5 text-[9px] font-bold uppercase"
                      >
                        <MapPin className="h-3 w-3" /> Mapa
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className={cn(
                      "p-3 rounded-xl flex items-center justify-between border",
                      isGeo ? "bg-blue-50 border-blue-100 text-blue-700" : "bg-muted text-muted-foreground border-transparent"
                    )}>
                      <span className="text-[9px] font-bold uppercase tracking-tight">Status GEO</span>
                      {isGeo ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
                    </div>
                    
                    <div className={cn(
                      "p-3 rounded-xl flex items-center justify-between border",
                      isAuto ? "bg-orange-50 border-orange-100 text-orange-700" : "bg-muted text-muted-foreground border-transparent"
                    )}>
                      <span className="text-[9px] font-bold uppercase tracking-tight">Auto Aceite</span>
                      <div className={cn("w-2 h-2 rounded-full", isAuto ? "bg-orange-500 animate-pulse" : "bg-slate-300")} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {filteredData.length === 0 && !loading && (
        <div className="py-20 text-center text-muted-foreground italic text-sm">
          Nenhum RT do Point 9944 encontrado.
        </div>
      )}
    </div>
  );
}
