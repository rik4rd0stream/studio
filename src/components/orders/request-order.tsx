
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Loader2, 
  SendHorizontal, 
  MapPin, 
  RefreshCw, 
  UserPlus,
  Search,
  Package,
  ClipboardPaste,
  ArrowRight,
  BellRing
} from "lucide-react";
import { fetchRedashOrders, RedashOrder } from "@/app/actions/redash";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, where, doc, setDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { User } from "@/lib/types";

const COMMANDS = ["!!bundleBR", "!!rebr", "!!Br", "!!forzabr"];

export function RequestOrder({ sender }: { sender: User }) {
  const { toast } = useToast();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [allOrders, setAllOrders] = useState<RedashOrder[]>([]);
  
  const [selectedCommand, setSelectedCommand] = useState("!!bundleBR");
  const [selectedOrder, setSelectedOrder] = useState<RedashOrder | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [manualOrderId, setManualOrderId] = useState("");

  // Busca apenas usuários que podem receber notificações
  const usersQuery = useMemo(() => query(
    collection(db, 'users'), 
    where('notificationsEnabled', '==', true)
  ), [db]);
  const { data: appUsers, loading: loadingUsers } = useCollection<any>(usersQuery);

  const redashOrders = useMemo(() => {
    return allOrders.filter(row => {
      const isPoint9944 = Object.values(row).some(val => String(val).includes('9944'));
      const isSinRT = Object.entries(row).some(([key, val]) => 
        key.toLowerCase().includes('trusted') && String(val).includes('Sin RT')
      );
      return isPoint9944 && isSinRT;
    });
  }, [allOrders]);

  const filteredUsers = useMemo(() => {
    if (!appUsers) return [];
    return appUsers.filter(u => 
      u.name?.toLowerCase().includes(searchUser.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchUser.toLowerCase())
    );
  }, [appUsers, searchUser]);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    const result = await fetchRedashOrders();
    if (result.success) setAllOrders(result.data || []);
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenUserSelection = (order: RedashOrder) => {
    setSelectedOrder(order);
    setIsUserDialogOpen(true);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualOrderId.trim()) return;
    handleOpenUserSelection({
      order_id: manualOrderId.trim(),
      store_name: "Solicitação Manual",
      direccion_entrega: "Entrada Manual"
    });
  };

  const handleSendRequest = (targetUser: any) => {
    if (!selectedOrder) return;

    const requestId = Math.random().toString(36).substr(2, 9);
    const orderId = selectedOrder.order_id || "0";
    
    // Na solicitação, ainda não sabemos o motoboy, o usuário que receber vai preencher ou o robô espera?
    // Seguindo a lógica do usuário: "gera no celular dele o comando". 
    // Para gerar o comando completo !!cmd order motoboy, precisamos do ID do motoboy no final.
    // Vou enviar o comando base, e o receptor finaliza.
    
    const requestData = {
      orderId,
      storeName: selectedOrder.store_name || "Pedido",
      command: `${selectedCommand} ${orderId}`, // O usuário receptor adicionará o ID do motoboy se necessário
      targetUserId: targetUser.id,
      senderName: sender.name,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setDoc(doc(db, 'requests', requestId), requestData)
      .then(() => {
        toast({ title: "Solicitado", description: `Pedido enviado para ${targetUser.name}` });
        setIsUserDialogOpen(false);
        setSelectedOrder(null);
        setManualOrderId("");
      });
  };

  return (
    <div className="space-y-6 animate-slide-up pb-32 max-w-xl mx-auto">
      <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-center gap-3">
        <BellRing className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-sm font-bold text-primary">Solicitação Push</h3>
          <p className="text-[10px] text-muted-foreground">Envie pedidos para outros operadores aceitarem no celular.</p>
        </div>
      </div>

      <div className="bg-card p-3 rounded-xl border shadow-sm space-y-2">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Comando Base</p>
        <div className="flex flex-wrap gap-1.5">
          {COMMANDS.map((cmd) => (
            <Button
              key={cmd}
              variant="default"
              onClick={() => setSelectedCommand(cmd)}
              className={cn(
                "h-8 px-4 font-bold text-xs transition-all border-none rounded-lg",
                selectedCommand === cmd ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {cmd}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Pedidos para Solicitar</h2>
        <Button variant="ghost" size="sm" onClick={() => loadData()} disabled={loading} className="h-6 text-[11px] font-bold text-blue-600">
          <RefreshCw className={cn("h-3 w-3 mr-1", loading && "animate-spin")} /> ATUALIZAR
        </Button>
      </div>

      <div className="space-y-2">
        {redashOrders.map((order, idx) => (
          <Card key={idx} className="border border-border/40 hover:border-primary/40 cursor-pointer shadow-none overflow-hidden group" onClick={() => handleOpenUserSelection(order)}>
            <CardContent className="p-3 space-y-1">
              <div className="flex justify-between items-start">
                <h3 className="text-xs font-bold text-foreground group-hover:text-primary">{order.store_name}</h3>
                <span className="text-[9px] font-mono text-muted-foreground">#{order.order_id}</span>
              </div>
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <MapPin className="h-3 w-3 text-primary shrink-0" />
                <p className="text-[10px] font-medium leading-tight">{order.direccion_entrega}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <form onSubmit={handleManualSubmit} className="pt-6 space-y-3">
        <Input 
          placeholder="ID DO PEDIDO MANUAL" 
          value={manualOrderId}
          onChange={(e) => setManualOrderId(e.target.value)}
          className="h-12 text-center text-lg font-bold tracking-widest rounded-xl shadow-sm uppercase"
        />
        <Button type="submit" className="w-full h-11 font-bold text-[10px] uppercase rounded-xl">
          Solicitar Manualmente <ArrowRight className="h-3.5 w-3.5 ml-2" />
        </Button>
      </form>

      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-sm p-0 border-none shadow-2xl rounded-2xl overflow-hidden">
          <DialogHeader className="p-5 pb-2">
            <DialogTitle className="text-lg">Solicitar para usuário:</DialogTitle>
            <DialogDescription className="text-xs">
              Enviar pedido <span className="font-bold">#{selectedOrder?.order_id}</span> como notificação push.
            </DialogDescription>
          </DialogHeader>

          <div className="px-5 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Buscar usuário..." 
                className="pl-9 bg-muted/40 border-none h-9 text-sm rounded-lg"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-2 space-y-1.5 pb-5 max-h-[40vh]">
            {loadingUsers ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground text-xs italic">Nenhum usuário com notificações ativas.</p>
            ) : (
              filteredUsers.map((u) => (
                <Button
                  key={u.id}
                  variant="ghost"
                  className="w-full h-auto py-2.5 px-3 justify-between hover:bg-primary/5 hover:text-primary border border-transparent hover:border-primary/10 rounded-lg group"
                  onClick={() => handleSendRequest(u)}
                >
                  <div className="text-left">
                    <p className="font-bold text-[11px] leading-none">{u.name}</p>
                    <p className="text-[9px] text-muted-foreground mt-1">{u.email}</p>
                  </div>
                  <SendHorizontal className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
