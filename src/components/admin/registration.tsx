"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil, Trash2, RefreshCw, Database, UserPlus, Bike, ShieldCheck, Bell, Lock, Fingerprint, Radar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCollectionBridge, setDocumentBridge, deleteDocumentBridge } from "@/app/actions/firestore-bridge";
import { createAuthUserBridge } from "@/app/actions/auth-bridge";

interface RegistrationProps {
  type: 'users' | 'couriers';
}

export function Registration({ type }: RegistrationProps) {
  const { toast } = useToast();
  
  const [items, setItems] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [customId, setCustomId] = useState("");
  const [password, setPassword] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hasRequestAccess, setHasRequestAccess] = useState(false);
  const [hasRtStatusAccess, setHasRtStatusAccess] = useState(false);

  const isUser = type === 'users';
  const collectionName = isUser ? 'userProfiles' : 'entregadores';
  const title = isUser ? 'Gestão de Usuários' : 'Gestão de Entregadores';
  const idLabel = isUser ? 'E-mail de Acesso' : 'Código RT (Número)';
  const idPlaceholder = isUser ? 'exemplo@rappi.com' : 'Ex: 994400';

  const loadData = async () => {
    setLoadingList(true);
    try {
      const result = await getCollectionBridge(collectionName);
      if (result.success) {
        const sortedData = (result.data || []).sort((a: any, b: any) => {
          const nameA = (a.name || a.nome || "").toLowerCase();
          const nameB = (b.name || b.nome || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setItems(sortedData);
      } else {
        toast({ variant: "destructive", title: "Erro na Ponte", description: result.error });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erro de Conexão" });
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadData();
    resetForm();
  }, [type]);

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setName(item.name || item.nome || "");
    setCustomId(item.id_motoboy || item.email || item.id || "");
    
    if (isUser) {
      setPassword(item.password || "");
      setNotificationsEnabled(item.notificationsEnabled !== false);
      setHasRequestAccess(!!item.hasRequestAccess);
      setHasRtStatusAccess(!!item.hasRtStatusAccess);
    }
  };

  const resetForm = () => {
    setName("");
    setCustomId("");
    setPassword("");
    setNotificationsEnabled(true);
    setHasRequestAccess(false);
    setHasRtStatusAccess(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este registro permanentemente?")) return;
    try {
      const result = await deleteDocumentBridge(collectionName, id);
      if (result.success) {
        toast({ title: "Removido com sucesso" });
        loadData();
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao excluir" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const docId = customId.trim().toLowerCase();
    
    if (!docId || !name.trim()) {
      toast({ variant: "destructive", title: "Campos Obrigatórios", description: "Preencha Nome e Identificador." });
      setLoading(false);
      return;
    }

    if (isUser && !editingId) {
      if (password.length < 6) {
        toast({ variant: "destructive", title: "Senha Curta", description: "Mínimo 6 caracteres." });
        setLoading(false);
        return;
      }
      const authResult = await createAuthUserBridge(docId, password);
      if (!authResult.success) {
        toast({ variant: "destructive", title: "Erro de Autenticação", description: authResult.error });
        setLoading(false);
        return;
      }
    }

    if (editingId && editingId !== docId) {
      await deleteDocumentBridge(collectionName, editingId);
    }

    const data: any = isUser 
      ? { 
          name: name.trim(), 
          email: docId, 
          password: password.trim(),
          role: 'normal',
          notificationsEnabled,
          hasRequestAccess,
          hasRtStatusAccess,
          updatedAt: new Date().toISOString()
        }
      : { 
          nome: name.trim(), 
          id_motoboy: docId,
          updatedAt: new Date().toISOString()
        };

    try {
      const result = await setDocumentBridge(collectionName, docId, data);
      if (result.success) {
        toast({ title: "Sincronizado", description: "Dados salvos no servidor." });
        resetForm();
        loadData();
      } else {
        toast({ variant: "destructive", title: "Falha na Gravação", description: result.error });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erro Crítico" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-32 animate-fade-in">
      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-md rounded-3xl overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="text-primary text-xl font-bold flex items-center gap-2">
            {isUser ? <UserPlus className="h-5 w-5" /> : <Bike className="h-5 w-5" />}
            {editingId ? 'Editar Registro' : title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Nome Completo</label>
                <Input 
                  placeholder="Ex: Ricardo Silva" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  className="h-12 bg-muted/30 border-none rounded-2xl focus-visible:ring-primary shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">{idLabel}</label>
                <Input 
                  placeholder={idPlaceholder} 
                  value={customId} 
                  onChange={(e) => setCustomId(e.target.value)} 
                  required 
                  className="h-12 bg-muted/30 border-none rounded-2xl font-mono text-sm focus-visible:ring-primary shadow-inner"
                />
              </div>
              
              {isUser && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Senha de Acesso</label>
                    <div className="relative">
                      <Input 
                        type="text"
                        placeholder="Senha para login" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required={!editingId}
                        className="h-12 bg-muted/30 border-none rounded-2xl focus-visible:ring-primary shadow-inner pr-10"
                      />
                      <Lock className="absolute right-3 top-3.5 h-5 w-5 text-muted-foreground/50" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-6 pt-2">
                    <div className="flex items-center space-x-2">
                      <Switch id="notif" checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
                      <Label htmlFor="notif" className="text-xs font-bold flex items-center gap-1.5"><Bell className="h-3.5 w-3.5 text-primary" /> PUSH</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="access" checked={hasRequestAccess} onCheckedChange={setHasRequestAccess} />
                      <Label htmlFor="access" className="text-xs font-bold flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> SOLICITAR</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="rtAccess" checked={hasRtStatusAccess} onCheckedChange={setHasRtStatusAccess} />
                      <Label htmlFor="rtAccess" className="text-xs font-bold flex items-center gap-1.5"><Radar className="h-3.5 w-3.5 text-primary" /> MONITOR RT</Label>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="h-12 px-8 font-bold uppercase rounded-2xl shadow-lg flex-1 md:flex-none">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (editingId ? 'Salvar Alterações' : 'Cadastrar na Nuvem')}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={resetForm} className="h-12 rounded-2xl text-muted-foreground hover:bg-muted font-bold px-6">
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-card/30 backdrop-blur-sm rounded-3xl">
        <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b border-muted/20">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground font-bold uppercase tracking-tight">
            <Database className="h-4 w-4" /> Registros no Servidor
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loadingList} className="h-8 text-[10px] font-bold uppercase tracking-tight text-blue-600 hover:bg-blue-50 rounded-full">
            <RefreshCw className={loadingList ? "animate-spin h-3.5 w-3.5 mr-1" : "h-3.5 w-3.5 mr-1"} /> Atualizar
          </Button>
        </CardHeader>
        <CardContent className="px-2">
          {loadingList ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <Loader2 className="animate-spin h-8 w-8 text-primary opacity-20" />
              <p className="text-[10px] font-bold text-muted-foreground animate-pulse uppercase">Sincronizando...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-muted/30">
                    <TableHead className="text-[10px] font-bold uppercase px-4">Nome Completo</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">{isUser ? 'E-mail' : 'Código RT'}</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-right px-4">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-16 text-muted-foreground italic text-xs">
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : items.map((item) => (
                    <TableRow key={item.id} className="border-muted/20 hover:bg-primary/5 transition-colors group">
                      <TableCell className="font-bold text-sm px-4">
                        <div className="flex items-center gap-2">
                          {item.name || item.nome}
                          {isUser && item.hasRtStatusAccess && <Radar className="h-3 w-3 text-primary" />}
                          {isUser && item.hasRequestAccess && <ShieldCheck className="h-3 w-3 text-primary" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono text-[11px] font-bold text-primary">
                            {isUser ? item.email : (item.id_motoboy || item.id)}
                          </span>
                          {!isUser && item.id.length > 10 && (
                            <span className="text-[8px] text-muted-foreground font-mono flex items-center gap-1">
                              <Fingerprint className="h-2 w-2" /> ID Interno: {item.id.substring(0, 8)}...
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 text-right">
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-9 w-9 text-blue-600 hover:bg-blue-100 rounded-full">
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-9 w-9 text-destructive hover:bg-red-100 rounded-full">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
