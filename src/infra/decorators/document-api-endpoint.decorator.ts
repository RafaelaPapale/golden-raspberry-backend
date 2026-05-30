import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiProperty,
  ApiBody,
  ApiParamOptions,
  ApiQueryOptions,
} from '@nestjs/swagger';
import { getDefaultResponseSchema } from '../swagger/response-schemas';

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type ExtendedApiParamOptions = ApiParamOptions & {
  pattern?: string;
};

export type ExtendedApiQueryOptions = ApiQueryOptions & {
  pattern?: string;
};

export interface DocumentApiEndpointOptions<
  TSuccessModel extends Type<unknown> = any,
> {
  summary: string;
  description: string;
  successStatus?: number;
  successType?: TSuccessModel;
  responseSchema?: Record<string, any>;
  requiresAuth?: boolean;
  bodyType?: Type<unknown> | [Type<unknown>];
  bodyDescription?: string;
  params?: ExtendedApiParamOptions[];
  queries?: ExtendedApiQueryOptions[];
}

function validateInputs(options: DocumentApiEndpointOptions): void {
  if (!options.summary || options.summary.trim() === '') {
    throw new Error('DocumentApiEndpoint: summary cannot be empty');
  }

  if (!options.description || options.description.trim() === '') {
    throw new Error('DocumentApiEndpoint: description cannot be empty');
  }

  if (options.successStatus !== undefined) {
    if (options.successStatus < 100 || options.successStatus > 599) {
      throw new Error(
        `DocumentApiEndpoint: successStatus must be a valid HTTP status code (100-599), got ${options.successStatus}`,
      );
    }
  }
}

export const DocumentApiEndpoint = <TSuccessModel extends Type<unknown>>({
  summary,
  description,
  successStatus = HTTP_STATUS.OK,
  successType,
  responseSchema,
  requiresAuth = true,
  bodyType,
  bodyDescription,
  params,
  queries,
}: DocumentApiEndpointOptions<TSuccessModel>) => {
  validateInputs({
    summary,
    description,
    successStatus,
    successType,
    responseSchema,
    requiresAuth,
    bodyType,
    bodyDescription,
    params,
    queries,
  });

  const decorators = [ApiOperation({ summary, description })];

  if (responseSchema) {
    decorators.push(
      ApiResponse({
        status: successStatus,
        schema: responseSchema,
      }),
    );
  } else if (successType) {
    decorators.push(
      ApiResponse({
        status: successStatus,
        type: successType,
      }),
    );
  } else {
    decorators.push(
      ApiResponse({
        status: successStatus,
        schema: (
          getDefaultResponseSchema as (
            status: number,
          ) => Record<string, unknown>
        )(successStatus),
      }),
    );
  }

  decorators.push(
    ApiResponse({
      status: HTTP_STATUS.BAD_REQUEST,
      description: 'Dados inválidos ou ausentes - validação falhou',
    }),
    ApiResponse({
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      description: 'Erro interno do servidor',
    }),
  );

  if (requiresAuth) {
    decorators.push(
      ApiBearerAuth('JWT-auth'),
      ApiResponse({
        status: HTTP_STATUS.UNAUTHORIZED,
        description: 'Token inválido ou ausente',
      }),
      ApiResponse({
        status: HTTP_STATUS.FORBIDDEN,
        description:
          'Não autorizado - permissões insuficientes para esta operação',
      }),
    );
  }

  if (bodyType) {
    decorators.push(
      ApiBody({
        type: bodyType,
        description: bodyDescription || 'Dados da requisição',
      }),
    );
  }

  return applyDecorators(...decorators);
};

export const DocumentPublicEndpoint = <TSuccessModel extends Type<unknown>>({
  summary,
  description,
  successStatus = HTTP_STATUS.OK,
  successType,
  responseSchema,
  bodyType,
  bodyDescription,
  params,
  queries,
}: Omit<DocumentApiEndpointOptions<TSuccessModel>, 'requiresAuth'>) => {
  return DocumentApiEndpoint({
    summary,
    description,
    successStatus,
    successType,
    responseSchema,
    requiresAuth: false,
    bodyType,
    bodyDescription,
    params,
    queries,
  });
};

export const ApiPropertyNumeric = (fieldName: string, required = true) =>
  ApiProperty({
    description: fieldName,
    pattern: String.raw`^\d+$`,
    required,
    type: String,
    example: '12345',
  });
