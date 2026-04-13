'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Componente que escuta erros globais de permissão do Firebase
 * e exibe um alerta visual (toast) para o usuário.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      console.error('Firestore Permission Denied:', error.context);
      
      toast({
        variant: 'destructive',
        title: 'Acesso Negado',
        description: `Você não tem permissão para ${error.context.operation} em ${error.context.path}. Verifique as regras de segurança.`,
      });
    };

    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null;
}
