
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil, Trash2, RefreshCw, Database, UserPlus, Bike, ShieldCheck, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCollectionBridge, setDocumentBridge, deleteDocumentBridge } from "@/app/actions/firestore-bridge";

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

  const isUser = type === 'users';
  const collectionName = isUser ? 'userProfiles' : 'entregadores';
  const title = isUser ? 'Gestão de Usuários' : 'Gestão de Entregadores';
  const idLabel = isUser ? 'E-mail (ID)' : 'ID do Motoboy (Código RT)';
  const idPlaceholder = isUser ? 'exemplo@rappi.com' : 'Ex: 994400';

  const loadData = async () => {
    setLoadingList(true);
    try {
      const result = await getCollectionBridge(collectionName);
      if (result.success) {
        setItems(result.data || []);
      } else {
        toast({ variant: "destructive", title: "Erro na Ponte", description: result.error });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erro de Conexão", description: "Falha ao acessar servidor." });
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
    setCustomId(item.id || item.id_motoboy || item.email || "");
    
    if (isUser) {
      setPassword(item.password || "");
      setNotificationsEnabled(item.notificationsEnabled !== false);
      setHasRequestAccess(!!item.hasRequestAccess);
    }
  };

  const resetForm = () => {
    setName("");
    setCustomId("");
    setPassword("");
    setNotificationsEnabled(true);
    setHasRequestAccess(false);
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
      toast({ variant: "destructive", title: "Campos Obrigatórios", description: "Preencha Nome e ID para continuar." });
      setLoading(false);
      return;
    }

    let data: any = isUser 
      ? { 
          name: name.trim(), 
          email: docId, 
          password: password.trim(),
          role: 'normal',
          notificationsEnabled,
          hasRequestAccess,
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
        toast({ title: "Sincronizado", description: "Dados salvos com sucesso." });
        resetForm();
        loadData();
      } else {
        toast({ variant: "destructive", title: "Falha na Gravação", description: result.error });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erro Crítico", description: "O servidor não respondeu." });
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
            {editingId ? 'Editar Cadastro' : 'Novo Cadastro'}
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
                  disabled={!!editingId}
                  className="h-12 bg-muted/30 border-none rounded-2xl font-mono text-sm focus-visible:ring-primary shadow-inner"
                />
              </div>
              
              {isUser && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 tracking-widest">Senha de Acesso</label>
                    <Input 
                      type="password"
                      placeholder="Senha para login" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required={!editingId}
                      className="h-12 bg-muted/30 border-none rounded-2xl focus-visible:ring-primary shadow-inner"
                    />
                  </div>
                  <div className="flex items-center gap-6 pt-2">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="notif" 
                        checked={notificationsEnabled} 
                        onCheckedChange={setNotificationsEnabled} 
                      />
                      <Label htmlFor="notif" className="text-xs font-bold flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5 text-primary" /> PUSH
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="access" 
                        checked={hasRequestAccess} 
                        onCheckedChange={setHasRequestAccess} 
                      />
                      <Label htmlFor="access" className="text-xs font-bold flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" /> SOLICITAR
                      </Label>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="h-12 px-8 font-bold uppercase rounded-2xl shadow-lg flex-1 md:flex-none">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (editingId ? 'Atualizar Registro' : 'Salvar na Nuvem')}
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
        <CardHeader className="flex flex-row items-center justify-between py-4 px-6">
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
              <p className="text-[10px] font-bold text-muted-foreground animate-pulse">SINCRONIZANDO COM A VERCEL...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-muted/30">
                    <TableHead className="text-[10px] font-bold uppercase px-4">Nome</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">ID / Identificador</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-16 text-muted-foreground italic text-xs">
                        Nenhum registro encontrado nesta coleção.
                      </TableCell>
                    </TableRow>
                  ) : items.map((item) => (
                    <TableRow key={item.id} className="border-muted/20 hover:bg-primary/5 transition-colors">
                      <TableCell className="font-bold text-sm px-4">
                        {item.name || item.nome}
                        {isUser && item.hasRequestAccess && (
                          <ShieldCheck className="inline h-3 w-3 ml-2 text-primary" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {item.id_motoboy || item.email || item.id}
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="flex gap-1 justify-end">
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
