
/**
 * @fileOverview Funções para buscar dados do Redash.
 * Removido 'use server' para permitir o build estático do APK.
 * Nota: No APK (Capacitor), o fetch direto funciona sem problemas de CORS.
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
    // Busca direta pelo cliente (compatível com APK)
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
    // No navegador, isso pode falhar por CORS, mas no APK funcionará.
    console.error('Redash Fetch Error:', error.message);
    return { success: false, error: 'Erro de conexão com o servidor de dados.' };
  }
}
