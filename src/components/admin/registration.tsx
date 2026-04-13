"use client";

import { useState, useMemo } from "react";
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
  UserPlus, 
  Fingerprint, 
  ShieldAlert, 
  Loader2, 
  Pencil, 
  Trash2, 
  X, 
  Check,
  Bell,
  PackageSearch
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserProfile } from "@/lib/types";
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
  const [profile, setProfile] = useState<UserProfile>("normal");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [hasRequestAccess, setHasRequestAccess] = useState(false);
  const [idMotoboy, setIdMotoboy] = useState("");

  const collectionName = type === 'users' ? 'users' : 'entregadores';
  const listQuery = useMemoFirebase(() => query(collection(db, collectionName)), [db, collectionName]);
  const { data: items, isLoading: loadingList } = useCollection<any>(listQuery);

  const resetForm = () => {
    setName("");
    setEmail("");
    setProfile("normal");
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
      setProfile(item.profile || "normal");
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
        toast({ title: "Removido", description: "O registro foi excluído com sucesso." });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const id = editingId || Math.random().toString(36).substr(2, 9);
    const docRef = doc(db, collectionName, id);

    const data: any = type === 'users' ? {
      name,
      email,
      profile,
      notificationsEnabled,
      hasRequestAccess,
      updatedAt: new Date().toISOString()
    } : {
      nome: name,
      id_motoboy: idMotoboy,
      updatedAt: new Date().toISOString()
    };

    if (!editingId) {
      data.createdAt = new Date().toISOString();
    }

    const action = editingId ? updateDoc(docRef, data) : setDoc(docRef, data);

    action
      .then(() => {
        toast({ 
          title: editingId ? "Atualizado" : "Cadastrado", 
          description: `${name} foi salvo com sucesso.` 
        });
        resetForm();
        setLoading(false);
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: editingId ? 'update' : 'create',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
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
            {editingId ? 'Editar Registro' : (type === 'users' ? 'Novo Usuário Operacional' : 'Novo Entregador Parceiro')}
          </CardTitle>
          <CardDescription>
            {type === 'users' 
              ? 'Gerencie membros da equipe e seus níveis de acesso.' 
              : 'Gerencie a frota de entregadores parceiros.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-name">Nome Completo</Label>
              <Input 
                id="reg-name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Ex: João Silva" 
                required
                className="bg-muted border-none"
              />
            </div>

            {type === 'users' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email Corporativo</Label>
                  <Input 
                    id="reg-email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="exemplo@gmail.com" 
                    required
                    className="bg-muted border-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nível de Acesso</Label>
                    <Select value={profile} onValueChange={(val) => setProfile(val as UserProfile)}>
                      <SelectTrigger className="bg-muted border-none">
                        <SelectValue placeholder="Selecione o perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Operador Normal</SelectItem>
                        <SelectItem value="master">Acesso Master</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        <div className="space-y-0.5">
                          <Label className="text-xs">Notificações Push</Label>
                          <p className="text-[10px] text-muted-foreground">Autorizar recebimento</p>
                        </div>
                      </div>
                      <Switch 
                        checked={notificationsEnabled} 
                        onCheckedChange={setNotificationsEnabled} 
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PackageSearch className="h-4 w-4 text-primary" />
                        <div className="space-y-0.5">
                          <Label className="text-xs">Solicitação de Pedido</Label>
                          <p className="text-[10px] text-muted-foreground">Acesso à aba de pedidos</p>
                        </div>
                      </div>
                      <Switch 
                        checked={hasRequestAccess} 
                        onCheckedChange={setHasRequestAccess} 
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="reg-ext-id" className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-primary" /> ID do Entregador
                </Label>
                <Input 
                  id="reg-ext-id" 
                  value={idMotoboy} 
                  onChange={(e) => setIdMotoboy(e.target.value)} 
                  placeholder="Ex: 1562680" 
                  required
                  className="bg-muted border-none"
                />
              </div>
            )}

            <div className="flex gap-2 pt-4">
              {editingId && (
                <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" /> Cancelar
                </Button>
              )}
              <Button type="submit" className="flex-[2] h-12 text-lg" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {editingId ? <Check className="h-5 w-5 mr-2" /> : <UserPlus className="h-5 w-5 mr-2" />}
                    {editingId ? 'Salvar Alterações' : 'Salvar no Banco de Dados'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            {type === 'users' ? <Users className="h-5 w-5" /> : <Bike className="h-5 w-5" />}
            {type === 'users' ? 'Usuários Cadastrados' : 'Entregadores Ativos'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>{type === 'users' ? 'Nome' : 'Entregador'}</TableHead>
                <TableHead>{type === 'users' ? 'Email / Permissões' : 'ID Motoboy'}</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingList ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : items?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                items?.map((item) => (
                  <TableRow key={item.id} className="group">
                    <TableCell>
                      <div className="font-medium">{type === 'users' ? item.name : item.nome}</div>
                      <div className="text-[10px] font-bold uppercase text-primary">{type === 'users' ? item.profile : `ID: ${item.id_motoboy}`}</div>
                    </TableCell>
                    <TableCell>
                      {type === 'users' ? (
                        <div className="space-y-1">
                          <div className="text-xs">{item.email}</div>
                          <div className="flex gap-2">
                            {item.notificationsEnabled && <Bell className="h-3 w-3 text-green-500" title="Notificações Ativas" />}
                            {item.hasRequestAccess && <PackageSearch className="h-3 w-3 text-blue-500" title="Acesso a Solicitação" />}
                          </div>
                        </div>
                      ) : (
                        <div className="font-mono text-xs text-muted-foreground">ID Interno: {item.id}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}