
"use client";

import { useEffect, useState } from "react";
import { useFirestore, getFirebaseMessaging } from "@/firebase";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";
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
import { BellRing, ExternalLink, X, MessageSquareQuote, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const EXPIRATION_TIME_MS = 120000; // 2 minutos
const VAPID_KEY = "BIqUjXu7NogeKlsoD9Cp6FWKN4JfEnrBnNybso_ntheRV2uT9FQhM-AEoYwcJXebN-iLP7KVO9q72Q0OfwLcMi4";

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

  useEffect(() => {
    if (!user || !user.email) return;

    const setupFCM = async () => {
      try {
        const messaging = getFirebaseMessaging();
        if (!messaging) return;

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(messaging, { vapidKey: VAPID_KEY });
          
          if (token) {
            const userRef = doc(db, 'userProfiles', user.email.toLowerCase().trim());
            // Usa setDoc com merge para garantir que não quebre se o doc não existir
            await setDoc(userRef, {
              fcmToken: token,
              fcmTokens: [token], // Mantém suporte a múltiplos se necessário futuramente
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        }
      } catch (error) {
        console.error("Erro FCM:", error);
      }
    };

    setupFCM();
  }, [user, db]);

  useEffect(() => {
    const setupForegroundListener = async () => {
      const messaging = getFirebaseMessaging();
      if (!messaging) return;

      onMessage(messaging, (payload) => {
        toast({
          title: payload.notification?.title || "Novo Pedido!",
          description: payload.notification?.body,
        });
      });
    };
    setupForegroundListener();
  }, [toast]);

  useEffect(() => {
    // Filtro rígido para evitar erro de permissão prematuro
    if (!user || !user.email || user.notificationsEnabled !== true) return;

    const userEmail = user.email.toLowerCase().trim();
    const q = collection(db, "orderRequests");

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as OrderRequest))
        .filter(req => req.targetUserEmail === userEmail && req.status === "pending")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setPendingRequests(requests);
      if (onPendingCountChange) onPendingCountChange(requests.length);

      if (snapshot.docChanges().some(change => change.type === "added")) {
        const hasNew = snapshot.docChanges().some(c => c.type === "added" && (c.doc.data() as OrderRequest).targetUserEmail === userEmail);
        if (hasNew) setIsMinimized(false);
      }
    }, (error) => {
      // Ignora erro inicial de permissão enquanto as regras propagam
      if (error.code !== 'permission-denied') {
        console.error("Firestore Listener Error:", error);
      }
    });

    return () => unsubscribe();
  }, [db, user, onPendingCountChange]);

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
          setDoc(doc(db, "orderRequests", firstRequest.id), {
            status: 'rejected',
            updatedAt: new Date().toISOString(),
            statusNote: "Time Out"
          }, { merge: true });
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
                  setDoc(doc(db, "orderRequests", activeRequest.id), { 
                    status: 'accepted', 
                    updatedAt: new Date().toISOString() 
                  }, { merge: true });
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
                  setDoc(doc(db, "orderRequests", activeRequest.id), { 
                    status: 'rejected', 
                    updatedAt: new Date().toISOString() 
                  }, { merge: true });
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
