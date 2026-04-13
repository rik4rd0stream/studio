"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, SendHorizontal, MapPin, Package, ListChecks } from "lucide-react";
import { refineOrderDetails } from "@/ai/flows/order-details-refinement";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/lib/types";

interface CreateOrderProps {
  onOrderCreated: (order: Order) => void;
}

export function CreateOrder({ onOrderCreated }: CreateOrderProps) {
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [extractedData, setExtractedData] = useState<{
    items: string[];
    pickup: string;
    delivery: string;
    instructions: string;
    categories: string[];
  }>({
    items: [],
    pickup: "",
    delivery: "",
    instructions: "",
    categories: [],
  });

  const handleRefine = async () => {
    if (!description.trim()) return;
    setLoading(true);
    try {
      const result = await refineOrderDetails({ description });
      setExtractedData({
        items: result.extractedItems,
        pickup: result.pickupAddress || "",
        delivery: result.deliveryAddress || "",
        instructions: result.specialInstructions || "",
        categories: result.suggestedCategories,
      });
      toast({ title: "Refinamento concluído", description: "Dados extraídos com IA com sucesso." });
    } catch (err) {
      toast({ variant: "destructive", title: "Erro na IA", description: "Não foi possível analisar o texto agora." });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9),
      items: extractedData.items.length > 0 ? extractedData.items : ["Item Diversos"],
      status: 'pending',
      deliveryAddress: extractedData.delivery || "Endereço não especificado",
      pickupAddress: extractedData.pickup || "Base Central",
      specialInstructions: extractedData.instructions,
      createdAt: new Date().toISOString(),
      categories: extractedData.categories,
    };
    onOrderCreated(newOrder);
    setDescription("");
    setExtractedData({ items: [], pickup: "", delivery: "", instructions: "", categories: [] });
    toast({ title: "Pedido enviado!", description: "O pedido já está disponível para os entregadores." });
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Novo Pedido</h1>
          <p className="text-muted-foreground">Descreva o pedido e use a IA para agilizar o preenchimento.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Entrada Inteligente
            </CardTitle>
            <CardDescription>Cole os detalhes brutos do pedido abaixo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              placeholder="Ex: Entregar 2 pizzas calabresa na Rua das Flores 123, apt 4. Coletar na Pizzaria do João. O cliente pediu pra não tocar a campainha."
              className="min-h-[200px] resize-none text-base p-4 bg-muted border-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button 
              onClick={handleRefine} 
              className="w-full h-12 text-lg gap-2" 
              disabled={loading || !description}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              Refinar Detalhes com IA
            </Button>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                Dados do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" /> Itens
                </Label>
                <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-muted rounded-md">
                  {extractedData.items.map((item, i) => (
                    <Badge key={i} variant="secondary" className="bg-primary/10 text-primary border-none">
                      {item}
                    </Badge>
                  ))}
                  {extractedData.items.length === 0 && <span className="text-muted-foreground text-sm italic">Nenhum item detectado</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-orange-500" /> Coleta
                  </Label>
                  <Input 
                    value={extractedData.pickup} 
                    onChange={(e) => setExtractedData({...extractedData, pickup: e.target.value})} 
                    placeholder="Endereço de Coleta"
                    className="bg-muted border-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-500" /> Entrega
                  </Label>
                  <Input 
                    value={extractedData.delivery} 
                    onChange={(e) => setExtractedData({...extractedData, delivery: e.target.value})}
                    placeholder="Endereço de Entrega"
                    className="bg-muted border-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Instruções Especiais</Label>
                <Input 
                  value={extractedData.instructions} 
                  onChange={(e) => setExtractedData({...extractedData, instructions: e.target.value})}
                  placeholder="Instruções de segurança, entrega, etc"
                  className="bg-muted border-none"
                />
              </div>

              {extractedData.categories.length > 0 && (
                <div className="space-y-2">
                  <Label>Categorias Sugeridas</Label>
                  <div className="flex gap-2">
                    {extractedData.categories.map((cat, i) => (
                      <Badge key={i} className="bg-secondary/20 text-secondary hover:bg-secondary/30 border-none">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Button type="submit" className="w-full h-14 text-xl gap-2 font-bold shadow-lg shadow-primary/20">
            <SendHorizontal className="h-6 w-6" />
            Enviar Pedido Agora
          </Button>
        </form>
      </div>
    </div>
  );
}