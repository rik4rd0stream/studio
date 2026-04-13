'use client';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

/**
 * Erro personalizado para falhas de permissão no Firestore.
 * Carrega o contexto da operação para facilitar a depuração de Security Rules.
 */
export class FirestorePermissionError extends Error {
  context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    const message = `Erro de Permissão no Firestore: Operação '${context.operation}' negada em '${context.path}'.`;
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
  }
}
