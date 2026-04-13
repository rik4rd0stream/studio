
/**
 * @fileOverview Funções para buscar dados do Redash.
 * Removido 'use server' para permitir o build estático do Capacitor (APK).
 * 
 * NOTA DE DESENVOLVIMENTO:
 * 1. No NAVEGADOR (Web/Vercel): Pode ocorrer erro de CORS. Use uma extensão de "CORS Unblock" para testar na Web.
 * 2. No APK ANDROID (Capacitor): As requisições funcionarão PERFEITAMENTE sem necessidade de ajustes, pois o WebView do Android ignora restrições de CORS para APIs externas.
 */

export interface RedashOrder {
  order_id: string;
  store_name?: string;
  direccion_entrega?: string;
  point?: string;
  es_trusted?: string;
  rt_asignado_orden?: string;
  estado_detallado_actual?: string;
  [key: string]: any;
}

export async function fetchRedashOrders() {
  const url = `https://redash.rappi.com/api/queries/130603/results.json?api_key=VqwlaUY9wOLjhUJTvrfuKdFExSsJG8ktuzUXy4fR`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    }); 
    
    if (!response.ok) {
      throw new Error(`Falha no Redash: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.query_result || !data.query_result.data || !data.query_result.data.rows) {
      return { success: true, data: [] };
    }

    return { success: true, data: data.query_result.data.rows as RedashOrder[] };
  } catch (error: any) {
    console.error('Redash Fetch Error:', error.message);
    // Retornamos um erro amigável explicando o CORS para o desenvolvedor
    return { 
      success: false, 
      error: 'Erro de conexão. Se estiver no navegador, ative uma extensão de CORS para ver os dados. No APK, os dados aparecerão automaticamente.' 
    };
  }
}
