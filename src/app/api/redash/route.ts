
import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route para servir como Proxy do Redash na Web.
 * Agora aceita parâmetros para diferentes queries.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const queryId = searchParams.get('queryId') || '130603';
  const apiKey = searchParams.get('apiKey') || 'VqwlaUY9wOLjhUJTvrfuKdFExSsJG8ktuzUXy4fR';

  const REDASH_URL = `https://redash.rappi.com/api/queries/${queryId}/results.json?api_key=${apiKey}`;

  try {
    const response = await fetch(REDASH_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      next: { revalidate: 10 }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Falha no Redash: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro de conexão com o servidor de Proxy.' },
      { status: 500 }
    );
  }
}
