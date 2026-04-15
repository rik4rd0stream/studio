
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
import { BellRing, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Listener de notificações em tempo real com Fila Persistente.
 * Em vez de depender de um evento "push" volátil, ele escuta uma coleção "requests".
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

  useEffect(() => {
    if (!user || !user.email || !user.notificationsEnabled) return;

    const userEmail = user.email.toLowerCase().trim();
    
    // Escuta a fila de solicitações destinadas a este usuário
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
      
      setPendingRequests(requests);
      
      if (onPendingCountChange) {
        onPendingCountChange(requests.length);
      }

      // Alerta sonoro apenas quando um NOVO pedido entra na fila
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
    
    // Executa a ação (Abre o WhatsApp)
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(request.command)}`;
    window.open(whatsappUrl, '_blank');
    
    // Confirmação (ACK): Remove do banco apenas após a execução
    deleteDoc(doc(db, "requests", request.id));
    
    toast({ title: "Despachado", description: "Comando enviado para o WhatsApp." });
  };

  const handleReject = (id: string) => {
    deleteDoc(doc(db, "requests", id));
  };

  // Pega o primeiro da fila para exibir o alerta
  const activeRequest = pendingRequests[0];

  if (!activeRequest) return null;

  return (
    <AlertDialog open={!!activeRequest}>
      <AlertDialogContent className="max-w-[320px] rounded-3xl border-none shadow-2xl animate-in zoom-in-95 duration-300">
        <AlertDialogHeader className="items-center text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 animate-bounce">
            <BellRing className="h-10 w-10 text-primary" />
          </div>
          <AlertDialogTitle className="text-2xl font-bold text-primary">Novo Pedido!</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            <span className="font-bold text-foreground text-base">{activeRequest.senderName}</span> está solicitando despacho:
            
            <div className="mt-4 p-4 bg-muted/50 rounded-2xl font-mono text-[11px] text-left border border-primary/10">
              <p className="font-bold text-primary mb-1 uppercase truncate">{activeRequest.storeName}</p>
              <p className="opacity-70 font-bold">ORDEM: #{activeRequest.orderId}</p>
            </div>
            
            {pendingRequests.length > 1 && (
              <div className="mt-4 py-1.5 px-3 bg-blue-50 dark:bg-blue-900/30 rounded-full inline-flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <p className="text-[10px] text-blue-600 dark:text-blue-300 font-bold uppercase">
                  + {pendingRequests.length - 1} na fila de espera
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 mt-6">
          <AlertDialogAction 
            onClick={() => handleAccept(activeRequest)} 
            className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-base gap-3 rounded-2xl shadow-lg shadow-primary/20"
          >
            DESPACHAR AGORA <ExternalLink className="h-5 w-5" />
          </AlertDialogAction>
          <AlertDialogCancel 
            onClick={() => handleReject(activeRequest.id!)} 
            className="w-full h-10 border-none text-muted-foreground text-xs hover:bg-muted/50 rounded-xl"
          >
            RECUSAR / REMOVER
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
