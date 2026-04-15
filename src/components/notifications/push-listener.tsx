
"use client";

import { useEffect, useState, useCallback } from "react";
import { useFirestore } from "@/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, limit } from "firebase/firestore";
import { User, OrderRequest } from "@/lib/types";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { BellRing, ExternalLink, X, MessageSquareQuote, BatteryWarning } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PushListener({ 
  user, 
  onPendingCountChange 
}: { 
  user: User; 
  onPendingCountChange?: (count: number) => void 
}) {
  const db = useFirestore();
  const { toast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<OrderRequest[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>("default");

  // Verificar permissão de notificação e bateria
  useEffect(() => {
    if (typeof window !== 'undefined' && "Notification" in window) {
      setPermissionStatus(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission().then(setPermissionStatus);
      }
    }
  }, []);

  const sendSystemNotification = useCallback((title: string, body: string) => {
    if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        vibrate: [200, 100, 200]
      });
    }
  }, []);

  useEffect(() => {
    if (!user || !user.email || !user.notificationsEnabled) return;

    const userEmail = user.email.toLowerCase().trim();
    
    // Removido o orderBy da query para evitar erro de índice no Firebase
    const q = query(
      collection(db, "requests"),
      where("targetUserEmail", "==", userEmail),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as OrderRequest));
      
      // Ordenação manual no cliente para evitar erro de índice composto
      requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Mantemos apenas os 10 mais recentes
      const limitedRequests = requests.slice(0, 10);
      setPendingRequests(limitedRequests);
      
      if (onPendingCountChange) {
        onPendingCountChange(limitedRequests.length);
      }

      if (snapshot.docChanges().some(change => change.type === "added")) {
        setIsMinimized(false);
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(() => {});
        } catch (e) {}

        const lastRequest = limitedRequests[0];
        if (lastRequest) {
          sendSystemNotification(
            "NOVA SOLICITAÇÃO - RC", 
            `${lastRequest.senderName}: Pedido #${lastRequest.orderId}`
          );
        }
      }
    }, (error) => {
      console.error("Erro no Listener de Push:", error);
    });

    return () => unsubscribe();
  }, [db, user, onPendingCountChange, sendSystemNotification]);

  const handleAccept = (request: OrderRequest) => {
    if (!request.id) return;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(request.command)}`;
    window.open(whatsappUrl, '_blank');
    
    updateDoc(doc(db, "requests", request.id), {
      status: 'accepted',
      updatedAt: new Date().toISOString()
    });
    
    toast({ title: "Despachado", description: "Comando enviado para o WhatsApp." });
  };

  const handleReject = (id: string) => {
    updateDoc(doc(db, "requests", id), {
      status: 'rejected',
      updatedAt: new Date().toISOString()
    });
    
    toast({ title: "Removido", description: "Solicitação marcada como recusada." });
  };

  const activeRequest = pendingRequests[0];
  const showPopup = !!activeRequest && !isMinimized;

  return (
    <>
      {permissionStatus !== "granted" && (
        <div className="fixed bottom-20 left-4 right-4 bg-amber-500 text-white p-3 rounded-xl shadow-lg z-[100] flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-2">
            <BatteryWarning className="h-5 w-5" />
            <p className="text-[10px] font-bold uppercase leading-tight">
              Habilite Notificações e Remova "Economia de Bateria" para o app não dormir!
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => Notification.requestPermission().then(setPermissionStatus)} className="h-7 text-[9px] bg-white/20 hover:bg-white/30 text-white border-none font-bold uppercase">
            OK
          </Button>
        </div>
      )}

      <AlertDialog open={showPopup}>
        <AlertDialogContent className="max-w-[320px] rounded-3xl border-none shadow-2xl animate-in zoom-in-95 duration-300">
          <button 
            onClick={() => setIsMinimized(true)}
            className="absolute right-4 top-4 p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
          
          <AlertDialogHeader className="items-center text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <BellRing className="h-10 w-10 text-primary" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold text-primary">Novo Pedido!</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              <span className="font-bold text-foreground text-base">{activeRequest?.senderName}</span> solicita despacho:
              
              <div className="mt-4 p-4 bg-muted/50 rounded-2xl font-mono text-[11px] text-left border border-primary/10">
                <p className="font-bold text-primary mb-1 uppercase truncate">{activeRequest?.storeName}</p>
                <p className="opacity-70 font-bold">ORDEM: #{activeRequest?.orderId}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 mt-6">
            <AlertDialogAction 
              onClick={() => handleAccept(activeRequest)} 
              className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-base gap-3 rounded-2xl shadow-lg shadow-primary/20"
            >
              DESPACHAR AGORA <ExternalLink className="h-5 w-5" />
            </AlertDialogAction>
            
            <div className="grid grid-cols-2 gap-2 w-full">
              <AlertDialogCancel 
                onClick={() => setIsMinimized(true)} 
                className="h-10 border-none text-muted-foreground text-xs hover:bg-muted/50 rounded-xl m-0"
              >
                VER DEPOIS
              </AlertDialogCancel>
              <Button 
                variant="ghost" 
                onClick={() => handleReject(activeRequest?.id!)} 
                className="h-10 text-destructive text-xs hover:bg-destructive/10 rounded-xl"
              >
                REJEITAR
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {pendingRequests.length > 0 && (
        <Button
          onClick={() => setIsMinimized(false)}
          className={cn(
            "fixed top-24 right-8 h-14 w-14 rounded-full shadow-2xl z-50 transition-all duration-500 hover:scale-110 active:scale-95 flex flex-col items-center justify-center p-0",
            isMinimized ? "bg-primary animate-pulse border-4 border-background" : "bg-muted-foreground/20 text-muted-foreground opacity-30 grayscale"
          )}
        >
          <MessageSquareQuote className="h-5 w-5" />
          <span className="text-[10px] font-bold">{pendingRequests.length}</span>
          {isMinimized && (
            <div className="absolute -top-1 -right-1 h-6 w-6 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background animate-bounce">
              {pendingRequests.length}
            </div>
          )}
        </Button>
      )}
    </>
  );
}
