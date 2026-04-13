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

interface RegistrationProps {
  type: 'users' | 'couriers';
  onAddUser?: (user: User) => void;
  onAddCourier?: (courier: Courier) => void;
}

export function Registration({ type, onAddUser, onAddCourier }: RegistrationProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<UserProfile>("normal");
  const [externalId, setExternalId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      if (type === 'users' && onAddUser) {
        onAddUser({
          id: Math.random().toString(36).substr(2, 9),
          name,
          email,
          profile
        });
        toast({ title: "Usuário Cadastrado", description: `${name} agora tem acesso ao sistema.` });
      } else if (type === 'couriers' && onAddCourier) {
        onAddCourier({
          id: Math.random().toString(36).substr(2, 9),
          name,
          externalId
        });
        toast({ title: "Entregador Cadastrado", description: `${name} foi adicionado à frota.` });
      }
      
      // Clear
      setName("");
      setEmail("");
      setPassword("");
      setExternalId("");
      setLoading(false);
    }, 600);
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
                    placeholder="joao.silva@rappi.com" 
                    required
                    className="bg-muted border-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-pass">Senha Temporária</Label>
                  <Input 
                    id="reg-pass" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="••••••••" 
                    required
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
                  value={externalId} 
                  onChange={(e) => setExternalId(e.target.value)} 
                  placeholder="Ex: MOTO-9982" 
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
                  Finalizar Cadastro
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}