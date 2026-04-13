
'use server';

/**
 * @fileOverview Funções para buscar dados do Redash via Server Actions.
 * O uso de 'use server' resolve problemas de CORS no navegador (Web/Vercel).
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
      },
      next: { revalidate: 10 } // Cache curto para dados operacionais
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
    return { 
      success: false, 
      error: 'Erro de conexão com o Redash.' 
    };
  }
}
