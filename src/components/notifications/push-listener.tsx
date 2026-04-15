
"use client";

import { useEffect, useState } from "react";
import { useFirestore } from "@/firebase";
import { collection, query, where, onSnapshot, doc, deleteDoc } from "firebase/firestore";
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
import { BellRing, ExternalLink, ListChecks } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

/**
 * Listener de notificações em tempo real com Fila Persistente.
 */
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
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  useEffect(() => {
    if (!user || !user.email || !user.notificationsEnabled) return;

    const userEmail = user.email.toLowerCase().trim();
    const q = query(
      collection(db, "requests"),
      where("targetUserEmail", "==", userEmail),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrderRequest));
      setPendingRequests(requests);
      
      if (onPendingCountChange) {
        onPendingCountChange(requests.length);
      }

      // Alerta sonoro apenas para novos itens
      if (snapshot.docChanges().some(change => change.type === "added")) {
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(() => {});
        } catch (e) {}
        
        toast({
          title: "NOVA SOLICITAÇÃO",
          description: `Você tem ${requests.length} pedido(s) pendente(s).`,
        });
      }
    });

    return () => unsubscribe();
  }, [db, user, toast, onPendingCountChange]);

  const handleAccept = (request: OrderRequest) => {
    if (!request.id) return;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(request.command)}`;
    window.open(whatsappUrl, '_blank');
    deleteDoc(doc(db, "requests", request.id));
    toast({ title: "Despachado", description: "Comando enviado para o WhatsApp." });
  };

  const handleReject = (id: string) => {
    deleteDoc(doc(db, "requests", id));
  };

  const activeRequest = pendingRequests[0];

  if (!activeRequest) return null;

  return (
    <AlertDialog open={!!activeRequest && !isQueueOpen}>
      <AlertDialogContent className="max-w-[320px] rounded-2xl border-none shadow-2xl">
        <AlertDialogHeader className="items-center text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2 animate-bounce">
            <BellRing className="h-8 w-8 text-primary" />
          </div>
          <AlertDialogTitle className="text-xl font-bold text-primary">Novo Pedido!</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            <span className="font-bold text-foreground">{activeRequest.senderName}</span> solicita:
            <div className="mt-4 p-4 bg-muted/50 rounded-2xl font-mono text-[11px] text-left border border-primary/10">
              <p className="font-bold text-primary mb-1 uppercase">{activeRequest.storeName}</p>
              <p className="opacity-70 font-bold">ORDEM: #{activeRequest.orderId}</p>
            </div>
            {pendingRequests.length > 1 && (
              <p className="mt-3 text-[10px] text-blue-600 font-bold uppercase animate-pulse">
                + {pendingRequests.length - 1} outros pedidos na fila
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 mt-4">
          <AlertDialogAction 
            onClick={() => handleAccept(activeRequest)} 
            className="w-full h-12 bg-primary font-bold gap-2 rounded-xl"
          >
            DESPACHAR <ExternalLink className="h-4 w-4" />
          </AlertDialogAction>
          <AlertDialogCancel 
            onClick={() => handleReject(activeRequest.id!)} 
            className="w-full h-10 border-none text-muted-foreground text-xs"
          >
            RECUSAR
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
