
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, addDoc, query, where, limit } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ClipboardPaste, Search, ArrowRight, X, Clock, CheckCircle2, XCircle, AlertCircle, History } from 'lucide-react';
import { OrderRequest, User } from '@/lib/types';

export function RequestOrder() {
  const db = useFirestore();
  const { user } = useUser();
  const [manualOrderId, setManualOrderId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Timer para o histórico
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const usersQuery = useMemo(() => {
    if (!db) return null;
    return query(collection(db, 'users'), where('role', '==', 'normal'));
  }, [db]);

  const { data: users = [] } = useCollection(usersQuery);

  const myRequestsQuery = useMemo(() => {
    if (!db || !user?.email) return null;
    return query(
      collection(db, 'orderRequests'),
      where('senderEmail', '==', user.email),
      limit(20)
    );
  }, [db, user?.email]);

  const { data: myRequests = [] } = useCollection(myRequestsQuery);

  // Ordenar e pegar os 3 últimos no cliente para evitar erro de índice composto
  const lastThreeRequests = useMemo(() => {
    return [...myRequests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [myRequests]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendRequest = async () => {
    if (!db || !user || !selectedUser || !manualOrderId.trim()) return;
    
    setIsSubmitting(true);
    try {
      const newRequest: OrderRequest = {
        orderId: manualOrderId.trim(),
        storeName: 'Solicitação Manual',
        command: `PEDIDO MANUAL: ${manualOrderId.trim()}`,
        targetUserEmail: selectedUser.email,
        senderName: user.name || user.email || 'Usuário',
        senderEmail: user.email || '',
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

  const getStatusInfo = (req: OrderRequest) => {
    const createdAt = new Date(req.createdAt).getTime();
    const diff = Math.floor((currentTime - createdAt) / 1000);
    const remaining = Math.max(0, 120 - diff);

    switch (req.status) {
      case 'accepted':
        return { label: 'Aceito', color: 'bg-green-100 text-green-700', icon: CheckCircle2 };
      case 'rejected':
        return { label: 'Recusado/Expirado', color: 'bg-red-100 text-red-700', icon: XCircle };
      case 'unavailable':
        return { label: 'Indisponível', color: 'bg-gray-100 text-gray-500', icon: AlertCircle };
      default:
        return { 
          label: `Pendente (${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')})`, 
          color: 'bg-amber-100 text-amber-700 animate-pulse', 
          icon: Clock 
        };
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto p-4 pb-20">
      {/* Histórico de Status Curto */}
      {lastThreeRequests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <History className="h-4 w-4" />
            <h3 className="text-[10px] font-bold uppercase tracking-wider">Status do meu Despacho (3 Últimos)</h3>
          </div>
          {lastThreeRequests.map((req) => {
            const status = getStatusInfo(req);
            const Icon = status.icon;
            return (
              <div key={req.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400">PEDIDO</span>
                  <span className="text-xs font-bold text-slate-700">#{req.orderId}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold text-slate-400 mb-1">PARA: {req.targetUserEmail.split('@')[0]}</span>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${status.color}`}>
                    <Icon className="h-3 w-3" />
                    {status.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-800">Solicitar Despacho</h2>
        <p className="text-xs text-slate-500">Peça para um operador despachar um pedido para você.</p>
      </div>

      <div className="space-y-4">
        <div className="relative group">
          <Input
            placeholder="Digite o ID do Pedido..."
            value={manualOrderId}
            onChange={(e) => setManualOrderId(e.target.value)}
            className="h-14 text-lg font-bold rounded-2xl border-slate-200 shadow-sm pr-12 focus:ring-primary"
          />
          {manualOrderId && (
            <button 
              onClick={() => setManualOrderId('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar Operador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-xl border-slate-200"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto p-1">
          {filteredUsers.map((u) => (
            <Card
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className={`p-4 cursor-pointer transition-all border-2 rounded-2xl flex flex-col items-center text-center gap-2 ${
                selectedUser?.id === u.id
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-slate-100 hover:border-slate-200 bg-white'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                selectedUser?.id === u.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs text-slate-700 truncate w-full">{u.name}</span>
                <span className="text-[10px] text-slate-400">{u.email.split('@')[0]}</span>
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
