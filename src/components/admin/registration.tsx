"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Bike, UserPlus, Fingerprint, ShieldAlert, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { User, Courier, UserProfile } from "@/lib/types";
import { useFirestore } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

interface RegistrationProps {
  type: 'users' | 'couriers';
  onAddUser?: (user: User) => void;
  onAddCourier?: (courier: Courier) => void;
}

export function Registration({ type, onAddUser, onAddCourier }: RegistrationProps) {
  const { toast } = useToast();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  
  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<UserProfile>("normal");
  const [idMotoboy, setIdMotoboy] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const id = Math.random().toString(36).substr(2, 9);
    const collectionName = type === 'users' ? 'users' : 'entregadores';
    const docRef = doc(db, collectionName, id);

    const data = type === 'users' ? {
      name,
      email,
      profile,
      createdAt: new Date().toISOString()
    } : {
      nome: name,
      id_motoboy: idMotoboy,
      createdAt: new Date().toISOString()
    };

    setDoc(docRef, data)
      .then(() => {
        if (type === 'users' && onAddUser) {
          onAddUser({ id, name, email, profile });
          toast({ title: "Usuário Cadastrado", description: `${name} salvo no banco de dados.` });
        } else if (type === 'couriers' && onAddCourier) {
          onAddCourier({ id, nome: name, id_motoboy: idMotoboy });
          toast({ title: "Entregador Cadastrado", description: `${name} adicionado à frota.` });
        }
        
        setName("");
        setEmail("");
        setPassword("");
        setIdMotoboy("");
        setLoading(false);
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'create',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
      });
  };

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <Card className="border-none shadow-sm">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            {type === 'users' ? <Users className="h-8 w-8 text-primary" /> : <Bike className="h-8 w-8 text-primary" />}
          </div>
          <CardTitle className="text-2xl font-bold">
            {type === 'users' ? 'Novo Usuário Operacional' : 'Novo Entregador Parceiro'}
          </CardTitle>
          <CardDescription>
            {type === 'users' 
              ? 'Adicione membros da equipe para gerenciar o despacho.' 
              : 'Registre novos entregadores informando nome e identificação.'}
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
                <div className="space-y-2">
                  <Label htmlFor="reg-pass">Senha Temporária (Opcional no momento)</Label>
                  <Input 
                    id="reg-pass" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="••••••••" 
                    className="bg-muted border-none"
                  />
                </div>
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
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                    <ShieldAlert className="h-3 w-3" />
                    Usuários Master podem gerenciar outros usuários.
                  </p>
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

            <Button type="submit" className="w-full h-12 text-lg mt-6" disabled={loading}>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-5 w-5 mr-2" />
                  Salvar no Banco de Dados
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}