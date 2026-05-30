export const ResponseSchemas = {
  success: {
    type: 'object' as const,
    properties: {
      statusCode: {
        type: 'number',
        example: 200,
        description: 'Código HTTP da resposta',
      },
      mensagem: {
        type: 'string',
        example: 'Operação realizada com sucesso',
        description: 'Mensagem descritiva do resultado',
      },
      dados: {
        type: 'object',
        description: 'Dados retornados pela operação',
        nullable: true,
      },
    },
    required: ['statusCode', 'mensagem'] as string[],
  },

  created: {
    type: 'object' as const,
    properties: {
      statusCode: {
        type: 'number',
        example: 201,
        description: 'Código HTTP indicando criação',
      },
      mensagem: {
        type: 'string',
        example: 'Recurso criado com sucesso',
        description: 'Confirmação da criação',
      },
      dados: {
        type: 'object',
        description: 'Dados do recurso criado',
        nullable: true,
      },
    },
    required: ['statusCode', 'mensagem'] as string[],
  },

  simple: {
    type: 'object' as const,
    properties: {
      statusCode: {
        type: 'number',
        example: 200,
        description: 'Código HTTP da resposta',
      },
      mensagem: {
        type: 'string',
        example: 'Operação realizada com sucesso',
        description: 'Confirmação da operação',
      },
    },
    required: ['statusCode', 'mensagem'] as string[],
  },

  withArray: {
    type: 'object' as const,
    properties: {
      statusCode: {
        type: 'number',
        example: 200,
        description: 'Código HTTP da resposta',
      },
      mensagem: {
        type: 'string',
        example: 'Dados retornados com sucesso',
        description: 'Mensagem de confirmação',
      },
      totalItens: {
        type: 'number',
        example: 50,
        description: 'Total de itens encontrados',
        nullable: true,
      },
      pagina: {
        type: 'number',
        example: 1,
        description: 'Página atual',
        nullable: true,
      },
      tamanho: {
        type: 'number',
        example: 10,
        description: 'Itens por página',
        nullable: true,
      },
      limite: {
        type: 'number',
        example: 100,
        description: 'Limite máximo de itens',
        nullable: true,
      },
      totalPaginas: {
        type: 'number',
        example: 5,
        description: 'Total de páginas disponíveis',
        nullable: true,
      },
      tamanhoDados: {
        type: 'number',
        example: 10,
        description: 'Quantidade de itens retornados nesta página',
        nullable: true,
      },
      dados: {
        type: 'array',
        items: { type: 'object' },
        description: 'Array de itens retornados',
      },
      error: {
        type: 'string',
        description: 'Mensagem de erro, se houver',
        nullable: true,
      },
    },
    required: ['statusCode', 'mensagem', 'dados'] as string[],
  },

  noContent: {
    type: 'object' as const,
    properties: {
      statusCode: {
        type: 'number',
        example: 204,
        description: 'Código HTTP indicando sucesso sem conteúdo',
      },
    },
    required: ['statusCode'] as string[],
  },
};

export function getDefaultResponseSchema(status: number) {
  switch (status) {
    case 201:
      return ResponseSchemas.created;

    case 204:
      return ResponseSchemas.noContent;

    case 200:
    default:
      return ResponseSchemas.success;
  }
}
