
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
  PackageSearch,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { doc, setDoc, deleteDoc, updateDoc, collection, query } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

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
  
  const listQuery = useMemoFirebase(() => query(collection(db, collectionName)), [db, collectionName]);
  const { data: items, isLoading: loadingList, error: listError } = useCollection<any>(listQuery);

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
      setName(item.name || "");
      setEmail(item.email || "");
      setPassword(item.password || "");
      setRole(item.role || "normal");
      setNotificationsEnabled(item.notificationsEnabled || false);
      setHasRequestAccess(item.hasRequestAccess || false);
    } else {
      setName(item.nome || "");
      setIdMotoboy(item.id_motoboy || "");
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    const docRef = doc(db, collectionName, id);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: "Removido", description: "Registro excluído com sucesso." });
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
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
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'write', requestResourceData: data }));
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
            {editingId ? 'Editar' : (type === 'users' ? 'Novo Usuário' : 'Novo Entregador')}
          </CardTitle>
          <CardDescription>
            {type === 'users' ? 'Gestão de operadores do sistema.' : 'Banco de dados de entregadores ativo.'}
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
                    <Label>Nível</Label>
                    <Select value={role} onValueChange={(val) => setRole(val as UserRole)}>
                      <SelectTrigger className="bg-muted border-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Operador</SelectItem>
                        <SelectItem value="master">Master</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        <Label className="text-xs">Push</Label>
                      </div>
                      <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PackageSearch className="h-4 w-4 text-primary" />
                        <Label className="text-xs">Solicitação</Label>
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

            <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : editingId ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader><CardTitle className="text-xl">Registros Atuais</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Identificação</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingList ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
              ) : listError ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-destructive">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-[10px] font-bold uppercase">Erro de Permissão no Android</p>
                    <p className="text-[9px] opacity-70">Verifique se as Regras de Segurança foram aplicadas.</p>
                  </TableCell>
                </TableRow>
              ) : items?.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic text-xs">Nenhum registro encontrado.</TableCell></TableRow>
              ) : items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="font-medium">{type === 'users' ? item.name : item.nome}</div>
                    <div className="text-[10px] font-bold text-primary uppercase">{type === 'users' ? item.role : `ID: ${item.id_motoboy}`}</div>
                  </TableCell>
                  <TableCell className="text-xs">{type === 'users' ? item.email : ""}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>
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
