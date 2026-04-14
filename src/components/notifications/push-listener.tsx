
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
 * Listener de notificações em tempo real.
 * Usa o E-mail como identificador principal para garantir compatibilidade
 * entre usuários criados manualmente e logados via Auth.
 */
export function PushListener({ user }: { user: User }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [activeRequest, setActiveRequest] = useState<OrderRequest | null>(null);

  useEffect(() => {
    // Só ativa se o usuário estiver logado e com notificações habilitadas
    // Usamos o e-mail como identificador de destino (Target)
    if (!user || !user.email || !user.notificationsEnabled) return;

    const userEmail = user.email.toLowerCase().trim();

    // Busca solicitações pendentes para este e-mail
    const q = query(
      collection(db, "requests"),
      where("targetUserEmail", "==", userEmail),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // Pega a solicitação mais recente
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        const request = { id: lastDoc.id, ...lastDoc.data() } as OrderRequest;
        
        if (activeRequest?.id !== request.id) {
          setActiveRequest(request);
          
          toast({
            title: "NOVO PEDIDO RECEBIDO",
            description: `Enviado por: ${request.senderName}`,
          });

          // Tenta tocar o som de alerta
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.warn("Audio play blocked by browser policy"));
          } catch (e) {}
        }
      } else {
        setActiveRequest(null);
      }
    }, (error) => {
      console.error("Firestore Listener Error:", error);
    });

    return () => unsubscribe();
  }, [db, user, activeRequest?.id, toast]);

  const handleAccept = () => {
    if (!activeRequest || !activeRequest.id) return;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(activeRequest.command)}`;
    window.open(whatsappUrl, '_blank');
    
    // Remove a solicitação após aceitar para não repetir
    deleteDoc(doc(db, "requests", activeRequest.id));
    setActiveRequest(null);

    toast({
      title: "Despachado",
      description: "Comando enviado para o WhatsApp.",
    });
  };

  const handleReject = () => {
    if (!activeRequest || !activeRequest.id) return;
    deleteDoc(doc(db, "requests", activeRequest.id));
    setActiveRequest(null);
  };

  if (!activeRequest) return null;

  return (
    <AlertDialog open={!!activeRequest}>
      <AlertDialogContent className="max-w-[320px] rounded-2xl border-none shadow-2xl animate-in zoom-in-95 duration-200">
        <AlertDialogHeader className="items-center text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2 animate-bounce">
            <BellRing className="h-8 w-8 text-primary" />
          </div>
          <AlertDialogTitle className="text-xl font-bold text-primary">Solicitação de Operação</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            <span className="font-bold text-foreground">{activeRequest.senderName}</span> solicita sua ação:
            <div className="mt-4 p-4 bg-muted/50 rounded-2xl font-mono text-[11px] text-left border border-primary/10">
              <p className="font-bold text-primary mb-1 uppercase">{activeRequest.storeName}</p>
              <p className="opacity-70 font-bold">ORDEM: #{activeRequest.orderId}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 mt-4">
          <AlertDialogAction 
            onClick={handleAccept} 
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold gap-2 rounded-xl text-sm"
          >
            ACEITAR E DESPACHAR <ExternalLink className="h-4 w-4" />
          </AlertDialogAction>
          <AlertDialogCancel 
            onClick={handleReject} 
            className="w-full h-10 bg-transparent border-none text-muted-foreground hover:text-foreground text-xs"
          >
            RECUSAR
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
