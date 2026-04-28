
"use client";

import { useEffect, useState, useCallback } from "react";
import { useFirestore, getFirebaseMessaging } from "@/firebase";
import { collection, onSnapshot, doc, setDoc, updateDoc, getDocs, query, where, limit } from "firebase/firestore";
import { getToken } from "firebase/messaging";
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { User, OrderRequest } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { BellRing, X, MessageSquareQuote, Clock, Check, XCircle, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const EXPIRATION_TIME_MS = 120000; // 2 minutos
const VAPID_KEY = "BIqUjXu7NogeKlsoD9Cp6FWKN4JfEnrBnNybso_ntheRV2uT9FQhM-AEoYwcJXebN-iLP7KVO9q72Q0OfwLcMi4";

export function PushListener({ user, onPendingCountChange }: { user: User; onPendingCountChange?: (count: number) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<OrderRequest[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  /**
   * Listeners para Push Notifications Nativos (Android)
   */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Quando o push chega com o app aberto (foreground)
    const receiveListener = PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log("Push recebido (foreground):", notification);

      toast({
        title: notification.title || "Novo Pedido!",
        description: notification.body,
      });
    });

    // Quando o usuário clica na notificação na barra do Android
    const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log("Usuário clicou na notificação:", notification);
      setIsMinimized(false); // Maximiza o alerta se houver pedido pendente
    });

    return () => {
      receiveListener.remove();
      actionListener.remove();
    };
  }, [toast]);

  /**
   * Dispara uma notificação nativa do sistema (Android/Web)
   * Isso garante que o celular vibre/toque mesmo se o app não estiver em foco.
   */
  const sendSystemAlert = useCallback(async (title: string, body: string) => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        
        await LocalNotifications.createChannel({
          id: 'orders-v1',
          name: 'Pedidos Rappi',
          description: 'Alertas de novos pedidos',
          importance: 5,
          visibility: 1,
          vibration: true
        });

        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: Date.now(),
              channelId: 'orders-v1',
              sound: 'default'
            }
          ]
        });
      } catch (e) {
        console.error("Erro LocalNotification:", e);
      }
    } else if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/logo.png" });
    }
  }, []);

  // 🔥 CONFIGURAÇÃO INICIAL E TOKENS
  useEffect(() => {
    if (!user?.email || !db) return;

    const setupPush = async () => {
      const userEmail = user.email.toLowerCase().trim();
      const userRef = doc(db, 'userProfiles', userEmail);

      // Registro Web
      if (!Capacitor.isNativePlatform()) {
        try {
          const messaging = getFirebaseMessaging();
          if (messaging) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              const token = await getToken(messaging, { vapidKey: VAPID_KEY });
              if (token) {
                await setDoc(userRef, { fcmTokens: [token], updatedAt: new Date().toISOString() }, { merge: true });
              }
            }
          }
        } catch (e) {
          console.error("Erro FCM Web:", e);
        }
      }

      // Registro Android
      if (Capacitor.isNativePlatform()) {
        try {
          const perm = await PushNotifications.requestPermissions();
          if (perm.receive === 'granted') {
            await PushNotifications.register();
          }

          PushNotifications.addListener('registration', async (token) => {
            await setDoc(userRef, { fcmTokens: [token.value], updatedAt: new Date().toISOString() }, { merge: true });
          });
        } catch (e) {
          console.error("Erro Push Nativo:", e);
        }
      }
    };

    setupPush();
  }, [user, db]);

  // 🔥 ESCUTA PEDIDOS EM TEMPO REAL
  useEffect(() => {
    if (!user?.email || !db || user.notificationsEnabled === false) return;

    const userEmail = user.email.toLowerCase().trim();
    const q = query(collection(db, "orderRequests"), where("targetUserEmail", "==", userEmail), where("status", "==", "pending"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as OrderRequest))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Se chegou um novo pedido que não tínhamos na lista
      if (requests.length > pendingRequests.length) {
        const latest = requests[0];
        sendSystemAlert("NOVO PEDIDO!", `${latest.senderName} enviou ${latest.storeName}`);
        setIsMinimized(false); // Maximiza o alerta
      }

      setPendingRequests(requests);
      if (onPendingCountChange) onPendingCountChange(requests.length);
    }, (err) => {
      console.error("Erro no listener de pedidos:", err);
    });

    return () => unsubscribe();
  }, [db, user, pendingRequests.length, onPendingCountChange, sendSystemAlert]);

  // 🔥 CONTADOR E EXPIRAÇÃO
  useEffect(() => {
    if (pendingRequests.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const firstReq = pendingRequests[0];
      if (!firstReq) return;

      const createdTime = new Date(firstReq.createdAt).getTime();
      const diff = (createdTime + EXPIRATION_TIME_MS) - now;

      if (diff <= 0) {
        updateDoc(doc(db, "orderRequests", firstReq.id!), {
          status: 'rejected',
          statusNote: "Expirado",
          updatedAt: new Date().toISOString()
        });
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingRequests, db]);

  const handleAction = async (status: 'accepted' | 'rejected') => {
    const activeRequest = pendingRequests[0];
    if (!activeRequest?.id || !db) return;

    try {
      if (status === 'accepted') {
        // Checagem final de segurança (Race Condition)
        const qCheck = query(
          collection(db, 'orderRequests'),
          where('orderId', '==', activeRequest.orderId),
          where('status', '==', 'accepted'),
          limit(1)
        );
        const snap = await getDocs(qCheck);
        if (!snap.empty) {
          await updateDoc(doc(db, 'orderRequests', activeRequest.id), {
            status: 'unavailable',
            updatedAt: new Date().toISOString()
          });
          toast({ variant: "destructive", title: "Indisponível", description: "Outro operador já aceitou." });
          return;
        }
      }

      await updateDoc(doc(db, 'orderRequests', activeRequest.id), {
        status,
        updatedAt: new Date().toISOString()
      });

      if (status === 'accepted') {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(activeRequest.command)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao processar ação." });
    }
  };

  const activeRequest = pendingRequests[0];
  if (!activeRequest) return null;

  return (
    <>
      <AlertDialog open={!!activeRequest && !isMinimized}>
        <AlertDialogContent className="max-w-[320px] rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <button onClick={() => setIsMinimized(true)} className="absolute right-4 top-4 p-2 rounded-full hover:bg-muted z-10">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>

          <div className="bg-primary p-6 text-white text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 relative">
              <BellRing className="h-10 w-10 text-white animate-bounce" />
              <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg border-2 border-white">
                <Clock className="h-3 w-3" /> {timeLeft}
              </div>
            </div>
            <AlertDialogTitle className="text-2xl font-bold">Novo Pedido!</AlertDialogTitle>
            <AlertDialogDescription className="text-white/80 text-xs uppercase font-bold tracking-widest mt-1">
              DE: {activeRequest.senderName}
            </AlertDialogDescription>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-muted/30 p-4 rounded-2xl border border-border/40">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Loja / Pedido</p>
              <p className="text-sm font-black leading-tight">{activeRequest.storeName}</p>
              <p className="text-[10px] font-mono font-bold text-primary mt-1">#{activeRequest.orderId}</p>
            </div>
          </div>

          <AlertDialogFooter className="p-6 pt-0 flex flex-col gap-2">
            <AlertDialogAction 
              onClick={() => handleAction('accepted')}
              className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-bold text-base rounded-2xl shadow-lg border-none"
            >
              <Check className="mr-2 h-5 w-5" /> DESPACHAR ({timeLeft})
            </AlertDialogAction>
            <Button variant="ghost" onClick={() => handleAction('rejected')} className="w-full h-10 text-destructive hover:bg-red-50 text-xs font-bold rounded-xl">
              <XCircle className="mr-2 h-4 w-4" /> REJEITAR
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isMinimized && (
        <Button onClick={() => setIsMinimized(false)} className="fixed top-24 right-6 h-14 w-14 rounded-full shadow-2xl z-50 bg-primary animate-pulse border-4 border-background">
          <Bell className="h-6 w-6 text-white" />
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white">
            {pendingRequests.length}
          </span>
        </Button>
      )}
    </>
  );
}
