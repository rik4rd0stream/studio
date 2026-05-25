
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil, Trash2, RefreshCw, Database, UserPlus, Bike, ShieldCheck, Bell, Lock, Radar, Share2, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCollectionBridge, setDocumentBridge, deleteDocumentBridge } from "@/app/actions/firestore-bridge";
import { createAuthUserBridge } from "@/app/actions/auth-bridge";
import { cn } from "@/lib/utils";

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
  const [useDirectWhatsApp, setUseDirectWhatsApp] = useState(true);
  const [useShareChooser, setUseShareChooser] = useState(false);

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
      setUseDirectWhatsApp(item.useDirectWhatsApp !== false);
      setUseShareChooser(!!item.useShareChooser);
    }
  };

  const resetForm = () => {
    setName("");
    setCustomId("");
    setPassword("");
    setNotificationsEnabled(true);
    setHasRequestAccess(false);
    setHasRtStatusAccess(false);
    setUseDirectWhatsApp(true);
    setUseShareChooser(false);
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
          useDirectWhatsApp,
          useShareChooser,
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
    <div className="max-w-4xl mx-auto space-y-4 pb-32 animate-fade-in">
      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="bg-primary/5 py-3 border-b border-primary/10">
          <CardTitle className="text-primary text-lg font-bold flex items-center gap-2">
            {isUser ? <UserPlus className="h-5 w-5" /> : <Bike className="h-5 w-5" />}
            {editingId ? 'Editar Registro' : title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Nome Completo</label>
                <Input 
                  placeholder="Ex: Ricardo Silva" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  className="h-10 bg-muted/30 border-none rounded-xl focus-visible:ring-primary shadow-inner text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">{idLabel}</label>
                <Input 
                  placeholder={idPlaceholder} 
                  value={customId} 
                  onChange={(e) => setCustomId(e.target.value)} 
                  required 
                  className="h-10 bg-muted/30 border-none rounded-xl font-mono text-sm focus-visible:ring-primary shadow-inner"
                />
              </div>
              
              {isUser && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Senha de Acesso</label>
                    <div className="relative">
                      <Input 
                        type="text"
                        placeholder="Senha para login" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required={!editingId}
                        className="h-10 bg-muted/30 border-none rounded-xl focus-visible:ring-primary shadow-inner pr-10 text-sm"
                      />
                      <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <div className="flex items-center space-x-2 bg-muted/20 px-2.5 py-1.5 rounded-lg">
                      <Switch id="notif" checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
                      <Label htmlFor="notif" className="text-[8px] font-bold flex items-center gap-1 uppercase"><Bell className="h-3 w-3 text-primary" /> PUSH</Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-muted/20 px-2.5 py-1.5 rounded-lg">
                      <Switch id="access" checked={hasRequestAccess} onCheckedChange={setHasRequestAccess} />
                      <Label htmlFor="access" className="text-[8px] font-bold flex items-center gap-1 uppercase"><ShieldCheck className="h-3 w-3 text-primary" /> SOLICITAR</Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-muted/20 px-2.5 py-1.5 rounded-lg">
                      <Switch id="rtAccess" checked={hasRtStatusAccess} onCheckedChange={setHasRtStatusAccess} />
                      <Label htmlFor="rtAccess" className="text-[8px] font-bold flex items-center gap-1 uppercase"><Radar className="h-3 w-3 text-primary" /> MONITOR RT</Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-muted/20 px-2.5 py-1.5 rounded-lg">
                      <Switch 
                        id="directZap" 
                        checked={useDirectWhatsApp} 
                        onCheckedChange={(val) => {
                          setUseDirectWhatsApp(val);
                          if (val) setUseShareChooser(false);
                        }} 
                      />
                      <Label htmlFor="directZap" className="text-[8px] font-bold flex items-center gap-1 uppercase"><Share2 className="h-3 w-3 text-primary" /> ZAP DIRETO</Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-muted/20 px-2.5 py-1.5 rounded-lg border-2 border-primary/20">
                      <Switch 
                        id="shareChooser" 
                        checked={useShareChooser} 
                        onCheckedChange={(val) => {
                          setUseShareChooser(val);
                          if (val) setUseDirectWhatsApp(false);
                        }} 
                      />
                      <Label htmlFor="shareChooser" className="text-[8px] font-bold flex items-center gap-1 uppercase text-primary"><Smartphone className="h-3 w-3" /> SHARE CHOOSER</Label>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="h-11 px-8 font-black uppercase rounded-xl shadow-md flex-1 md:flex-none text-xs">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (editingId ? 'Salvar' : 'Cadastrar')}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={resetForm} className="h-11 rounded-xl text-muted-foreground hover:bg-muted font-bold px-6 text-xs">
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-card/30 backdrop-blur-sm rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b border-muted/20">
          <CardTitle className="text-[10px] flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest">
            <Database className="h-3 w-3" /> Registros
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loadingList} className="h-8 text-[9px] font-bold uppercase tracking-widest text-blue-600 hover:bg-blue-50 rounded-full px-3">
            <RefreshCw className={loadingList ? "animate-spin h-3 w-3 mr-1" : "h-3 w-3 mr-1"} /> Atualizar
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loadingList ? (
            <div className="py-10 text-center flex flex-col items-center gap-2">
              <Loader2 className="animate-spin h-6 w-6 text-primary opacity-20" />
              <p className="text-[8px] font-bold text-muted-foreground uppercase">Sincronizando...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-muted/30">
                    <TableHead className="text-[9px] font-black uppercase px-6">Nome</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">{isUser ? 'E-mail' : 'RT'}</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-right px-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic text-[10px]">
                        Nenhum registro.
                      </TableCell>
                    </TableRow>
                  ) : items.map((item) => (
                    <TableRow key={item.id} className="border-muted/20 hover:bg-primary/5 transition-colors">
                      <TableCell className="font-bold text-xs px-6 py-3">
                        {item.name || item.nome}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[10px] font-bold text-primary">
                          {isUser ? item.email : (item.id_motoboy || item.id)}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 text-right">
                        <div className="flex gap-1.5 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-8 w-8 text-blue-600 hover:bg-blue-100 rounded-lg border border-blue-100">
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-destructive hover:bg-red-100 rounded-lg border border-red-100">
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
