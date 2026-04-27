
"use client";

import { useEffect, useState, useCallback } from "react";
import { useFirestore } from "@/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
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
import { BellRing, ExternalLink, X, MessageSquareQuote, Clock, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Capacitor } from '@capacitor/core';
import { redashService } from "@/lib/api/redash-service";

const EXPIRATION_TIME_MS = 120000; // 2 minutos

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
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Inicialização de Notificações
  useEffect(() => {
    const setupNotifications = async () => {
      // 1. Permissões Nativas (Android/iOS)
      if (Capacitor.isNativePlatform()) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const perm = await LocalNotifications.requestPermissions();
          if (perm.display === 'granted') {
            await LocalNotifications.createChannel({
              id: 'orders-channel-v1',
              name: 'Novos Pedidos Rappi',
              importance: 5,
              visibility: 1,
              vibration: true,
              sound: 'default'
            });
          }
        } catch (e) {
          console.error("Erro ao configurar notificações nativas:", e);
        }
      } 
      // 2. Permissões Web (PWA)
      else if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          await Notification.requestPermission();
        }
      }
    };
    setupNotifications();
  }, []);

  const sendSystemNotification = useCallback(async (title: string, body: string) => {
    // Notificação Nativa
    if (Capacitor.isNativePlatform()) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.schedule({
          notifications: [{ 
            title, 
            body, 
            id: Date.now(), 
            channelId: 'orders-channel-v1', 
            sound: 'default' 
          }]
        });
      } catch (e) {}
    } 
    // Notificação Browser (quando app aberto)
    else if (typeof window !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/logo.png' });
    }
  }, []);

  // Monitor de expiração e disponibilidade
  useEffect(() => {
    if (pendingRequests.length === 0) return;

    const interval = setInterval(async () => {
      const now = new Date().getTime();
      const firstRequest = pendingRequests[0];
      if (!firstRequest) return;

      const createdTime = new Date(firstRequest.createdAt).getTime();
      const diff = (createdTime + EXPIRATION_TIME_MS) - now;

      if (diff <= 0) {
        if (firstRequest.id) {
          updateDoc(doc(db, "orderRequests", firstRequest.id), {
            status: 'rejected',
            updatedAt: new Date().toISOString(),
            statusNote: "Time Out"
          });
        }
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      }

      // Verificação de Disponibilidade via Redash
      const redash = await redashService.fetchOrders();
      if (redash.success && redash.data) {
        const isStillAvailable = redash.data.some(o => String(o.order_id) === String(firstRequest.orderId));
        if (!isStillAvailable && firstRequest.id) {
          updateDoc(doc(db, "orderRequests", firstRequest.id), {
            status: 'unavailable',
            updatedAt: new Date().toISOString()
          });
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pendingRequests, db]);

  // Listener de Pedidos no Firestore
  useEffect(() => {
    if (!user?.email || !user.notificationsEnabled) return;

    const q = query(
      collection(db, "orderRequests"),
      where("targetUserEmail", "==", user.email.toLowerCase().trim()),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderRequest));
      requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setPendingRequests(requests);
      if (onPendingCountChange) onPendingCountChange(requests.length);

      if (snapshot.docChanges().some(change => change.type === "added")) {
        setIsMinimized(false);
        const lastRequest = requests[0];
        if (lastRequest) {
          sendSystemNotification("NOVA SOLICITAÇÃO", `${lastRequest.senderName}: #${lastRequest.orderId}`);
        }
      }
    });

    return () => unsubscribe();
  }, [db, user, onPendingCountChange, sendSystemNotification]);

  const activeRequest = pendingRequests[0];

  return (
    <>
      <AlertDialog open={!!activeRequest && !isMinimized}>
        <AlertDialogContent className="max-w-[320px] rounded-3xl border-none shadow-2xl">
          <button onClick={() => setIsMinimized(true)} className="absolute right-4 top-4 p-2 rounded-full hover:bg-muted">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
          
          <AlertDialogHeader className="items-center text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 relative">
              <BellRing className="h-10 w-10 text-primary animate-bounce" />
              <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
                <Clock className="h-3 w-3" /> {timeLeft}
              </div>
            </div>
            <AlertDialogTitle className="text-2xl font-bold text-primary">Novo Pedido!</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              <span className="font-bold text-foreground">{activeRequest?.senderName}</span> solicita despacho:
              <div className="mt-4 p-4 bg-muted/50 rounded-2xl font-mono text-[11px] text-left border border-primary/10">
                <p className="font-bold text-primary mb-1 uppercase truncate">{activeRequest?.storeName}</p>
                <p className="opacity-70 font-bold">ORDEM: #{activeRequest?.orderId}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 mt-6">
            <AlertDialogAction 
              onClick={() => {
                if (activeRequest?.id) {
                  updateDoc(doc(db, "orderRequests", activeRequest.id), { 
                    status: 'accepted', 
                    updatedAt: new Date().toISOString() 
                  });
                  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(activeRequest.command)}`;
                  window.open(whatsappUrl, '_blank');
                }
              }} 
              className="w-full h-14 bg-primary text-white font-bold text-base gap-3 rounded-2xl"
            >
              DESPACHAR ({timeLeft}) <ExternalLink className="h-5 w-5" />
            </AlertDialogAction>
            <Button 
              variant="ghost" 
              onClick={() => {
                if (activeRequest?.id) {
                  updateDoc(doc(db, "orderRequests", activeRequest.id), { 
                    status: 'rejected', 
                    updatedAt: new Date().toISOString() 
                  });
                }
              }} 
              className="h-10 text-destructive text-xs hover:bg-destructive/10 rounded-xl"
            >
              REJEITAR
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {pendingRequests.length > 0 && isMinimized && (
        <Button onClick={() => setIsMinimized(false)} className="fixed top-24 right-8 h-14 w-14 rounded-full shadow-2xl z-50 bg-primary animate-pulse border-4 border-background">
          <MessageSquareQuote className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-6 w-6 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
            {pendingRequests.length}
          </span>
        </Button>
      )}
    </>
  );
}
