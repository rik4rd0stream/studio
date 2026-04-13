
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, SendHorizontal, MapPin, Package, ListChecks, Monitor, ChevronRight, ChevronLeft } from "lucide-react";
import { refineOrderDetails } from "@/ai/flows/order-details-refinement";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CreateOrderProps {
  onOrderCreated: (order: Order) => void;
}

export function CreateOrder({ onOrderCreated }: CreateOrderProps) {
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRedash, setShowRedash] = useState(false);
  
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

  const redashUrl = "https://redash.rappi.com/embed/query/130603/visualization/176504?api_key=VqwlaUY9wOLjhUJTvrfuKdFExSsJG8ktuzUXy4fR&";

  return (
    <div className="flex h-full gap-6 animate-slide-up relative">
      <div className={cn("flex-1 space-y-6 transition-all duration-300", showRedash ? "mr-[500px]" : "mr-0")}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-headline">Novo Pedido</h1>
            <p className="text-muted-foreground">Analise os dados do Redash e cole aqui para processamento com IA.</p>
          </div>
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={() => setShowRedash(!showRedash)}
          >
            <Monitor className="h-4 w-4" />
            {showRedash ? "Ocultar Redash" : "Monitorar Redash"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm h-fit">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Entrada Inteligente
              </CardTitle>
              <CardDescription>Copie e cole os detalhes brutos do Redash aqui</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                placeholder="Ex: Pedido 1234, Pizza, Rua A 100..."
                className="min-h-[250px] resize-none text-base p-4 bg-muted border-none focus:ring-primary"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Button 
                onClick={handleRefine} 
                className="w-full h-12 text-lg gap-2" 
                disabled={loading || !description}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                Extrair Dados com IA
              </Button>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary" />
                  Conferência de Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" /> Itens Detectados
                  </Label>
                  <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-muted rounded-md border border-dashed">
                    {extractedData.items.map((item, i) => (
                      <Badge key={i} variant="secondary" className="bg-primary/10 text-primary border-none">
                        {item}
                      </Badge>
                    ))}
                    {extractedData.items.length === 0 && <span className="text-muted-foreground text-xs italic">Aguardando entrada...</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                      <MapPin className="h-3 w-3 text-orange-500" /> Origem (Coleta)
                    </Label>
                    <Input 
                      value={extractedData.pickup} 
                      onChange={(e) => setExtractedData({...extractedData, pickup: e.target.value})} 
                      placeholder="Ponto de partida"
                      className="bg-muted border-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                      <MapPin className="h-3 w-3 text-green-500" /> Destino (Entrega)
                    </Label>
                    <Input 
                      value={extractedData.delivery} 
                      onChange={(e) => setExtractedData({...extractedData, delivery: e.target.value})}
                      placeholder="Local de chegada"
                      className="bg-muted border-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Notas do Operador</Label>
                  <Input 
                    value={extractedData.instructions} 
                    onChange={(e) => setExtractedData({...extractedData, instructions: e.target.value})}
                    placeholder="Complementos ou orientações"
                    className="bg-muted border-none"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Button type="submit" className="w-full h-16 text-xl gap-2 font-bold shadow-xl shadow-primary/20 hover:scale-[1.01] transition-transform">
              <SendHorizontal className="h-6 w-6" />
              DESPACHAR AGORA
            </Button>
          </form>
        </div>
      </div>

      {/* Painel Lateral Redash */}
      <div className={cn(
        "fixed top-16 right-0 bottom-0 w-[480px] bg-card border-l shadow-2xl transition-transform duration-300 z-20 overflow-hidden",
        showRedash ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              Fonte de Dados (Redash)
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setShowRedash(false)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 bg-white">
            <iframe 
              src={redashUrl}
              className="w-full h-full border-none"
              title="Monitoramento Redash"
            />
          </div>
          <div className="p-4 bg-muted/50 text-[10px] text-muted-foreground">
            Dica: Utilize filtros no Redash para localizar pedidos específicos antes de copiar.
          </div>
        </div>
      </div>
    </div>
  );
}
