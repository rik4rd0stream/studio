
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

export function PushListener({ user }: { user: User }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [activeRequest, setActiveRequest] = useState<OrderRequest | null>(null);

  useEffect(() => {
    if (!user || !user.notificationsEnabled) return;

    const q = query(
      collection(db, "requests"),
      where("targetUserId", "==", user.id),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const request = { id: change.doc.id, ...change.doc.data() } as OrderRequest;
          setActiveRequest(request);
        }
      });
    });

    return () => unsubscribe();
  }, [db, user]);

  const handleAccept = () => {
    if (!activeRequest || !activeRequest.id) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(activeRequest.command)}`, '_blank');
    deleteDoc(doc(db, "requests", activeRequest.id));
    setActiveRequest(null);
  };

  const handleReject = () => {
    if (!activeRequest || !activeRequest.id) return;
    deleteDoc(doc(db, "requests", activeRequest.id));
    setActiveRequest(null);
  };

  if (!activeRequest) return null;

  return (
    <AlertDialog open={!!activeRequest}>
      <AlertDialogContent className="max-w-[320px] rounded-2xl border-none shadow-2xl">
        <AlertDialogHeader className="items-center text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2 animate-bounce">
            <BellRing className="h-6 w-6 text-primary" />
          </div>
          <AlertDialogTitle className="text-lg font-bold">Solicitação de Envio</AlertDialogTitle>
          <AlertDialogDescription className="text-xs">
            <span className="font-bold text-foreground">{activeRequest.senderName}</span> solicita o envio de:
            <div className="mt-2 p-3 bg-muted rounded-xl font-mono text-[10px] text-left">
              <p className="font-bold text-primary mb-1">{activeRequest.storeName}</p>
              <p className="opacity-70">Pedido: #{activeRequest.orderId}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2">
          <AlertDialogAction onClick={handleAccept} className="w-full h-11 bg-primary font-bold gap-2">
            Aceitar e Despachar <ExternalLink className="h-4 w-4" />
          </AlertDialogAction>
          <AlertDialogCancel onClick={handleReject} className="w-full h-11 bg-muted border-none text-xs">
            Ignorar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
