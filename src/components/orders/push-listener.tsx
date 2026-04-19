
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc,
  getDocs,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { OrderRequest } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, Check, X, Clock, AlertTriangle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export function PushListener() {
  const db = useFirestore();
  const { user } = useUser();
  const [pendingRequests, setPendingRequests] = useState<OrderRequest[]>([]);
  const [currentRequest, setCurrentRequest] = useState<OrderRequest | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [timeLeft, setTimeLeft] = useState<Record<string, number>>({});

  const sendSystemNotification = useCallback(async (title: string, body: string) => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        
        await LocalNotifications.createChannel({
          id: 'orders-channel-v1',
          name: 'Novos Pedidos',
          description: 'Notificações de novos pedidos para despacho',
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
              channelId: 'orders-channel-v1',
              sound: 'default'
            }
          ]
        });
      } catch (e) {
        console.error("Erro ao enviar notificação nativa:", e);
      }
    } else if (typeof window !== 'undefined' && "Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico"
      });
    }
  }, []);

  useEffect(() => {
    if (!db || !user?.email) return;

    const q = query(
      collection(db, 'orderRequests'),
      where('targetUserEmail', '==', user.email),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OrderRequest[];

      if (requests.length > pendingRequests.length) {
        const newReq = requests[requests.length - 1];
        sendSystemNotification(
          `Novo Pedido de ${newReq.senderName}`,
          `Comando: ${newReq.command}`
        );
      }

      setPendingRequests(requests);
    });

    return () => unsubscribe();
  }, [db, user?.email, pendingRequests.length, sendSystemNotification]);

  // Monitor de Indisponibilidade e Expiração
  useEffect(() => {
    if (!db || pendingRequests.length === 0) return;

    const timer = setInterval(async () => {
      const now = Date.now();
      const newTimeLeft: Record<string, number> = {};

      for (const req of pendingRequests) {
        const createdAt = new Date(req.createdAt).getTime();
        const diff = Math.floor((now - createdAt) / 1000);
        const remaining = Math.max(0, 120 - diff);
        
        newTimeLeft[req.id!] = remaining;

        // Se expirou
        if (remaining <= 0) {
          updateDoc(doc(db, 'orderRequests', req.id!), { 
            status: 'rejected', 
            updatedAt: new Date().toISOString() 
          });
          continue;
        }

        // Checar se outro já aceitou esse orderId
        const qAccepted = query(
          collection(db, 'orderRequests'),
          where('orderId', '==', req.orderId),
          where('status', '==', 'accepted'),
          limit(1)
        );
        const snap = await getDocs(qAccepted);
        if (!snap.empty) {
          updateDoc(doc(db, 'orderRequests', req.id!), { 
            status: 'unavailable', 
            updatedAt: new Date().toISOString() 
          });
        }
      }

      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [db, pendingRequests]);

  useEffect(() => {
    if (pendingRequests.length > 0 && !showDialog) {
      setCurrentRequest(pendingRequests[0]);
      setShowDialog(true);
    } else if (pendingRequests.length === 0) {
      setShowDialog(false);
      setCurrentRequest(null);
    }
  }, [pendingRequests, showDialog]);

  const handleAction = async (status: 'accepted' | 'rejected') => {
    if (!currentRequest?.id || !db) return;

    // Se for aceitar, fazer checagem final de segurança
    if (status === 'accepted') {
      const qAccepted = query(
        collection(db, 'orderRequests'),
        where('orderId', '==', currentRequest.orderId),
        where('status', '==', 'accepted'),
        limit(1)
      );
      const snap = await getDocs(qAccepted);
      
      if (!snap.empty) {
        // Alguém aceitou primeiro!
        await updateDoc(doc(db, 'orderRequests', currentRequest.id), {
          status: 'unavailable',
          updatedAt: new Date().toISOString()
        });
        alert("Ops! Este pedido já foi alocado por outro operador.");
        setShowDialog(false);
        return;
      }
    }

    await updateDoc(doc(db, 'orderRequests', currentRequest.id), {
      status,
      updatedAt: new Date().toISOString()
    });

    if (status === 'accepted') {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(currentRequest.command)}`;
      window.open(whatsappUrl, '_blank');
    }

    setShowDialog(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {pendingRequests.length > 0 && (
        <div className="fixed top-20 right-4 z-40">
          <Button 
            onClick={() => setShowDialog(true)}
            className="rounded-full h-14 w-14 bg-primary shadow-xl animate-bounce flex items-center justify-center relative"
          >
            <Bell className="h-6 w-6 text-white" />
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white">
              {pendingRequests.length}
            </span>
          </Button>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => {
        if (!open) setShowDialog(false);
      }}>
        <DialogContent 
          className="max-w-[90%] rounded-2xl border-none p-0 overflow-hidden"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="bg-primary p-6 text-white text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white/20 p-3 rounded-full animate-pulse">
                <Bell className="h-8 w-8" />
              </div>
            </div>
            <DialogTitle className="text-xl font-bold">Solicitação de Despacho</DialogTitle>
            <DialogDescription className="text-white/80 text-sm mt-1">
              De: {currentRequest?.senderName}
            </DialogDescription>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Loja</p>
              <p className="text-sm font-semibold text-slate-700">{currentRequest?.storeName}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Comando para WhatsApp</p>
              <p className="text-[11px] font-mono bg-white p-2 rounded border border-slate-200 text-slate-600 leading-relaxed">
                {currentRequest?.command}
              </p>
            </div>

            {currentRequest?.id && timeLeft[currentRequest.id] !== undefined && (
              <div className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-sm ${timeLeft[currentRequest.id] < 30 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-amber-50 text-amber-600'}`}>
                <Clock className="h-4 w-4" />
                Expira em: {formatTime(timeLeft[currentRequest.id])}
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-0 flex flex-row gap-3">
            <Button 
              variant="outline"
              onClick={() => handleAction('rejected')}
              className="flex-1 h-12 rounded-xl border-slate-200 text-slate-500 font-bold"
            >
              <X className="h-4 w-4 mr-2" /> Rejeitar
            </Button>
            <Button 
              onClick={() => handleAction('accepted')}
              className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              <Check className="h-4 w-4 mr-2" /> Despachar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
