
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { 
  Users, 
  Bike, 
  Loader2, 
  Pencil, 
  Trash2, 
  KeyRound,
  Bell,
  PackageSearch
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { doc, setDoc, deleteDoc, updateDoc, collection } from "firebase/firestore";
import { cn } from "@/lib/utils";

interface RegistrationProps {
  type: 'users' | 'couriers';
}

export function Registration({ type }: RegistrationProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("normal");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hasRequestAccess, setHasRequestAccess] = useState(false);
  const [idMotoboy, setIdMotoboy] = useState("");

  const collectionName = type === 'users' ? 'userProfiles' : 'entregadores';
  
  const listQuery = useMemoFirebase(() => collection(db, collectionName), [db, collectionName]);
  const { data: items, isLoading: loadingList } = useCollection<any>(listQuery);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("normal");
    setNotificationsEnabled(false);
    setHasRequestAccess(false);
    setIdMotoboy("");
    setEditingId(null);
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    if (type === 'users') {
      setName(item.name || item.nome || "");
      setEmail(item.email || "");
      setPassword(item.password || "");
      setRole(item.role || "normal");
      setNotificationsEnabled(item.notificationsEnabled || false);
      setHasRequestAccess(item.hasRequestAccess || false);
    } else {
      setName(item.nome || item.name || "");
      setIdMotoboy(item.id_motoboy || item.id || "");
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Tem certeza que deseja remover este registro?")) return;
    deleteDoc(doc(db, collectionName, id))
      .then(() => {
        toast({ title: "Removido", description: "Registro excluído com sucesso." });
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const id = editingId || (type === 'users' ? 'usr_' : 'rt_') + Math.random().toString(36).substr(2, 9);
    const docRef = doc(db, collectionName, id);

    const data: any = type === 'users' ? {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password.trim(),
      role,
      notificationsEnabled,
      hasRequestAccess,
      updatedAt: new Date().toISOString()
    } : {
      nome: name.trim(),
      id_motoboy: idMotoboy.trim(),
      updatedAt: new Date().toISOString()
    };

    if (!editingId) {
      data.createdAt = new Date().toISOString();
      data.id = id;
    }

    const action = editingId ? updateDoc(docRef, data) : setDoc(docRef, data);

    action
      .then(() => {
        toast({ title: "Salvo", description: "Dados gravados com sucesso." });
        resetForm();
        setLoading(false);
      })
      .catch((err) => {
        console.error("Submit Error:", err);
        toast({ variant: "destructive", title: "Erro ao Salvar", description: "Falha na conexão com o servidor." });
        setLoading(false);
      });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-slide-up pb-20">
      <Card className="border-none shadow-sm">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            {type === 'users' ? <Users className="h-8 w-8 text-primary" /> : <Bike className="h-8 w-8 text-primary" />}
          </div>
          <CardTitle className="text-2xl font-bold">
            {editingId ? 'Editar Registro' : (type === 'users' ? 'Novo Usuário' : 'Novo Entregador')}
          </CardTitle>
          <CardDescription>
            Preencha os dados abaixo para gerenciar o acesso ao sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required className="bg-muted border-none" />
            </div>

            {type === 'users' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-muted border-none" />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-muted border-none pl-10" />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nível de Acesso</Label>
                    <Select value={role} onValueChange={(val) => setRole(val as UserRole)}>
                      <SelectTrigger className="bg-muted border-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Operador Padrão</SelectItem>
                        <SelectItem value="master">Administrador Master</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        <Label className="text-xs">Notificações Push</Label>
                      </div>
                      <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PackageSearch className="h-4 w-4 text-primary" />
                        <Label className="text-xs">Acesso a Solicitações</Label>
                      </div>
                      <Switch checked={hasRequestAccess} onCheckedChange={setHasRequestAccess} />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>ID do Entregador (Rappi)</Label>
                <Input value={idMotoboy} onChange={(e) => setIdMotoboy(e.target.value)} required className="bg-muted border-none" />
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 h-12 text-lg font-bold" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : editingId ? 'Atualizar Dados' : 'Confirmar Cadastro'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm} className="h-12">Cancelar</Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl">Registros Ativos</CardTitle>
          {items && <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">{items.length} itens</span>}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nome</TableHead>
                <TableHead>Identificação</TableHead>
                <TableHead className="text-right">Gerenciar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingList ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8"><Loader2 className="animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : items?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-bold text-[12px] text-foreground uppercase">{item.nome || item.name}</div>
                    <div className="text-[10px] opacity-60 truncate max-w-[150px]">{item.email || ""}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-[11px] font-bold text-primary uppercase">
                      {type === 'users' ? item.role : (item.id_motoboy || item.id)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}><Pencil className="h-3 w-3 text-primary" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
