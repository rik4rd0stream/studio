
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, query, where, limit, doc, updateDoc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ClipboardPaste, Search, ArrowRight, X, Clock, CheckCircle2, XCircle, AlertCircle, History } from 'lucide-react';
import { OrderRequest, User } from '@/lib/types';

export function RequestOrder({ sender }: { sender: User }) {
  const db = useFirestore();
  const [manualOrderId, setManualOrderId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const usersQuery = useMemoFirebase(() => query(collection(db, 'userProfiles'), where('role', '==', 'normal')), [db]);
  const { data: usersData } = useCollection(usersQuery);
  const users = usersData || [];

  const myRequestsQuery = useMemoFirebase(() => {
    if (!sender?.email) return null;
    return query(
      collection(db, 'orderRequests'),
      where('senderEmail', '==', sender.email.toLowerCase().trim()),
      limit(20)
    );
  }, [db, sender?.email]);

  const { data: myRequestsData } = useCollection(myRequestsQuery);
  const myRequests = myRequestsData || [];

  const lastThreeRequests = useMemo(() => {
    if (!myRequests) return [];
    return [...myRequests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [myRequests]);

  const filteredUsers = users.filter(u => 
    (u.name || u.nome || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendRequest = async () => {
    if (!db || !sender || !selectedUser || !manualOrderId.trim()) return;
    
    setIsSubmitting(true);
    try {
      const cleanId = manualOrderId.trim();
      const newRequest: OrderRequest = {
        orderId: cleanId,
        storeName: 'Solicitação Manual',
        command: `PEDIDO MANUAL: ${cleanId}`,
        targetUserEmail: selectedUser.email.toLowerCase().trim(),
        senderName: sender.name || sender.email || 'Usuário',
        senderEmail: sender.email.toLowerCase().trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'orderRequests'), newRequest);
      setManualOrderId('');
      setSelectedUser(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!db) return;
    updateDoc(doc(db, 'orderRequests', requestId), {
      status: 'rejected',
      updatedAt: new Date().toISOString(),
      statusNote: 'Cancelado pelo remetente'
    });
  };

  const getStatusInfo = (req: OrderRequest) => {
    const createdAt = new Date(req.createdAt).getTime();
    const diff = Math.floor((currentTime - createdAt) / 1000);
    const remaining = Math.max(0, 120 - diff);

    switch (req.status) {
      case 'accepted':
        return { label: 'Aceito', color: 'bg-green-100 text-green-700', icon: CheckCircle2 };
      case 'rejected':
        const isTimeOut = req.statusNote === "Time Out";
        return { label: isTimeOut ? 'TIME OUT' : 'Cancelado', color: 'bg-red-100 text-red-700', icon: XCircle };
      case 'unavailable':
        return { label: 'Indisponível', color: 'bg-gray-100 text-gray-500', icon: AlertCircle };
      default:
        return { 
          label: `Pendente (${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')})`, 
          color: 'bg-amber-100 text-amber-700 animate-pulse', 
          icon: Clock,
          canCancel: true
        };
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto p-4 pb-20 animate-fade-in">
      {lastThreeRequests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <History className="h-4 w-4" />
            <h3 className="text-[10px] font-bold uppercase tracking-wider">Status do meu Despacho (3 Últimos)</h3>
          </div>
          {lastThreeRequests.map((req) => {
            const status = getStatusInfo(req);
            const Icon = status.icon;
            return (
              <div key={req.id} className="bg-card border border-border/40 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground">PEDIDO</span>
                  <span className="text-sm font-bold text-foreground">#{req.orderId}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-muted-foreground mb-1 uppercase tracking-tight">PARA: {req.targetUserEmail.split('@')[0]}</span>
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                      status.color
                    )}>
                      <Icon className="h-3 w-3" />
                      {status.label}
                    </div>
                  </div>
                  {status.canCancel && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10"
                      onClick={() => handleCancelRequest(req.id!)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">Solicitar Despacho</h2>
        <p className="text-xs text-muted-foreground">Peça para um operador despachar um pedido para você.</p>
      </div>

      <div className="space-y-4">
        <div className="relative group">
          <Input
            placeholder="Digite o ID do Pedido..."
            value={manualOrderId}
            onChange={(e) => setManualOrderId(e.target.value)}
            className="h-14 text-lg font-bold rounded-2xl border-none bg-muted/40 shadow-inner pr-12 text-center tracking-widest"
          />
          {manualOrderId && (
            <button 
              onClick={() => setManualOrderId('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-muted rounded-full text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar Operador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-xl border-none bg-muted/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1">
          {filteredUsers.map((u) => (
            <Card
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className={cn(
                "p-4 cursor-pointer transition-all border-2 rounded-2xl flex flex-col items-center text-center gap-2",
                selectedUser?.id === u.id
                  ? 'border-primary bg-primary/5 ring-4 ring-primary/10'
                  : 'border-transparent bg-card hover:bg-muted/10 shadow-sm'
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg",
                selectedUser?.id === u.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
              )}>
                {(u.name || u.nome || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden w-full">
                <span className="font-bold text-xs text-foreground truncate">{u.name || u.nome}</span>
                <span className="text-[10px] text-muted-foreground truncate">{u.email.split('@')[0]}</span>
              </div>
            </Card>
          ))}
        </div>

        <Button
          disabled={!manualOrderId.trim() || !selectedUser || isSubmitting}
          onClick={handleSendRequest}
          className="w-full h-14 rounded-2xl font-bold text-sm uppercase shadow-lg shadow-primary/20"
        >
          {isSubmitting ? 'Enviando...' : (
            <>Enviar Solicitação <ArrowRight className="ml-2 h-5 w-5" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
