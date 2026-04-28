
import { Capacitor, CapacitorHttp } from '@capacitor/core';

export interface RedashOrder {
  order_id: string;
  store_name?: string;
  direccion_entrega?: string;
  point?: string;
  point_id?: string | number;
  es_trusted?: string;
  rt_asignado_orden?: string;
  estado_detallado_actual?: string;
  [key: string]: any;
}

/**
 * Serviço Inteligente de Redash.
 * Detecta a plataforma e escolhe a melhor estratégia de rede.
 */
export const redashService = {
  /**
   * Busca pedidos pendentes (Query 130603)
   */
  async fetchOrders(): Promise<{ success: boolean; data?: RedashOrder[]; error?: string }> {
    return this.fetchGeneric('130603', 'VqwlaUY9wOLjhUJTvrfuKdFExSsJG8ktuzUXy4fR');
  },

  /**
   * Busca status em tempo real dos RTs (Query 130602)
   */
  async fetchRTStatus(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    return this.fetchGeneric('130602', 'Pn9UL7ZVuB3E31cxV9Hlq8rJHVR6jN6B3HqGxR5s');
  },

  /**
   * Método genérico para lidar com diferentes queries e plataformas
   */
  async fetchGeneric(queryId: string, apiKey: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    // 1. Estratégia Nativa (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      try {
        const response = await CapacitorHttp.get({
          url: `https://redash.rappi.com/api/queries/${queryId}/results.json?api_key=${apiKey}`,
          headers: { 'Accept': 'application/json' }
        });

        if (response.status !== 200) {
          return { success: false, error: `Erro Nativo: ${response.status}` };
        }

        const rows = response.data?.query_result?.data?.rows || [];
        return { success: true, data: rows };
      } catch (e: any) {
        return { success: false, error: 'Erro na requisição nativa Capacitor.' };
      }
    }

    // 2. Estratégia Web (Browser via API Route Proxy)
    try {
      const response = await fetch(`/api/redash?queryId=${queryId}&apiKey=${apiKey}`);
      
      if (!response.ok) {
        return { success: false, error: 'Erro no Proxy da Web.' };
      }

      const data = await response.json();
      const rows = data?.query_result?.data?.rows || [];
      return { success: true, data: rows };
    } catch (e: any) {
      return { success: false, error: 'Erro ao conectar com o Proxy da Web.' };
    }
  }
};
