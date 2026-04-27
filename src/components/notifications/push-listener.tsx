
"use client";

import { useEffect, useState, useCallback } from "react";
import { useFirestore, getFirebaseMessaging } from "@/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
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
import { BellRing, ExternalLink, X, MessageSquareQuote, Clock, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Capacitor } from '@capacitor/core';

const EXPIRATION_TIME_MS = 120000; // 2 minutos
const VAPID_KEY = "SUA_VAPID_KEY_AQUI"; // RICARDO: Pegar no Console do Firebase

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

  // 1. GESTÃO DE TOKENS (PUSH REAL)
  useEffect(() => {
    const setupFCM = async () => {
      if (!user?.email) return;

      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        // Solicita permissão
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(messaging, { vapidKey: VAPID_KEY });
          
          if (token) {
            // Salva o token no Firestore para que o backend saiba para onde enviar
            const userRef = doc(db, 'userProfiles', user.email.toLowerCase().trim());
            await updateDoc(userRef, {
              fcmTokens: arrayUnion(token)
            });
            console.log("FCM Token registrado:", token);
          }
        }

        // Listener para mensagens com app aberto (Foreground)
        onMessage(messaging, (payload) => {
          console.log("Mensagem FCM recebida em foreground:", payload);
          toast({
            title: payload.notification?.title || "Novo Pedido!",
            description: payload.notification?.body,
          });
        });

      } catch (error) {
        console.error("Erro ao configurar FCM:", error);
      }
    };

    setupFCM();
  }, [user?.email, db, toast]);

  // 2. CONFIGURAÇÃO NATIVA (ANDROID)
  useEffect(() => {
    const setupNative = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          await LocalNotifications.requestPermissions();
          await LocalNotifications.createChannel({
            id: 'orders-channel-v1',
            name: 'Novos Pedidos Rappi',
            importance: 5,
            vibration: true,
            sound: 'ifood_style.wav' // Opcional se tiver o arquivo
          });
        } catch (e) {}
      }
    };
    setupNative();
  }, []);

  // 3. LISTENER FIRESTORE (BACKUP/FOREGROUND)
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
      }
    });

    return () => unsubscribe();
  }, [db, user, onPendingCountChange]);

  // Monitor de expiração
  useEffect(() => {
    if (pendingRequests.length === 0) return;
    const interval = setInterval(() => {
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
    }, 1000);
    return () => clearInterval(interval);
  }, [pendingRequests, db]);

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
