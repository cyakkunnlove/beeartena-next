import { OpenAPIV3 } from 'openapi-types';

export const swaggerDocument: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'BEE ART ENA API',
    version: '1.0.0',
    description: 'まつ毛エクステサロン BEE ART ENA の予約・顧客管理API',
    contact: {
      name: 'BEE ART ENA Support',
      email: 'support@beeartena.com',
    },
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
      description: 'API Server',
    },
  ],
  tags: [
    { name: 'Auth', description: '認証関連のAPI' },
    { name: 'Users', description: 'ユーザー管理API' },
    { name: 'Reservations', description: '予約管理API' },
    { name: 'Points', description: 'ポイント管理API' },
    { name: 'Inquiries', description: 'お問い合わせ管理API' },
    { name: 'Webhooks', description: 'Webhook管理API' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['success', 'error'],
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Validation failed' },
              details: { type: 'object' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'user123' },
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          name: { type: 'string', example: '山田太郎' },
          phone: { type: 'string', example: '090-1234-5678' },
          role: { type: 'string', enum: ['customer', 'admin'], example: 'customer' },
          points: { type: 'number', example: 1500 },
          birthday: { type: 'string', format: 'date', example: '1990-01-01' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Reservation: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'res123' },
          customerId: { type: 'string', example: 'user123' },
          customerName: { type: 'string', example: '山田太郎' },
          customerEmail: { type: 'string', format: 'email' },
          customerPhone: { type: 'string', example: '090-1234-5678' },
          serviceType: { type: 'string', enum: ['2D', '3D', '4D'], example: '3D' },
          serviceName: { type: 'string', example: '3Dまつ毛エクステ' },
          price: { type: 'number', example: 8000 },
          date: { type: 'string', format: 'date', example: '2024-01-20' },
          time: { type: 'string', example: '14:00' },
          status: { 
            type: 'string', 
            enum: ['pending', 'confirmed', 'completed', 'cancelled'],
            example: 'confirmed'
          },
          notes: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Points: {
        type: 'object',
        properties: {
          userId: { type: 'string', example: 'user123' },
          currentPoints: { type: 'number', example: 1500 },
          lifetimePoints: { type: 'number', example: 5000 },
          tier: { 
            type: 'string', 
            enum: ['bronze', 'silver', 'gold', 'platinum'],
            example: 'silver'
          },
          tierExpiry: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      PointTransaction: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'pt123' },
          userId: { type: 'string', example: 'user123' },
          type: { 
            type: 'string', 
            enum: ['earned', 'used', 'manual', 'expired', 'adjusted', 'redeemed'],
            example: 'earned'
          },
          amount: { type: 'number', example: 100 },
          balance: { type: 'number', example: 1600 },
          description: { type: 'string', example: '予約完了ポイント' },
          reason: { type: 'string', nullable: true },
          referenceId: { type: 'string', nullable: true, example: 'res123' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Webhook: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'wh123' },
          url: { type: 'string', format: 'uri', example: 'https://example.com/webhook' },
          events: {
            type: 'array',
            items: { type: 'string' },
            example: ['reservation.created', 'reservation.cancelled'],
          },
          secret: { type: 'string', example: 'whsec_abc123' },
          active: { type: 'boolean', example: true },
          metadata: { type: 'object', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: '新規ユーザー登録',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name', 'phone'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                  name: { type: 'string' },
                  phone: { type: 'string' },
                  birthday: { type: 'string', format: 'date', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: '登録成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'バリデーションエラー',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'ログイン',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'ログイン成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: '認証失敗',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/reservations': {
      get: {
        tags: ['Reservations'],
        summary: '予約一覧取得',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['pending', 'confirmed', 'completed', 'cancelled'],
            },
          },
          {
            name: 'date',
            in: 'query',
            schema: { type: 'string', format: 'date' },
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20 },
          },
        ],
        responses: {
          '200': {
            description: '予約一覧',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Reservation' },
                    },
                    meta: {
                      type: 'object',
                      properties: {
                        pagination: {
                          type: 'object',
                          properties: {
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                            total: { type: 'integer' },
                            hasNext: { type: 'boolean' },
                            hasPrev: { type: 'boolean' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Reservations'],
        summary: '予約作成',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['serviceId', 'date', 'time'],
                properties: {
                  serviceId: { type: 'string', example: '3d-eyelash' },
                  date: { type: 'string', format: 'date' },
                  time: { type: 'string', example: '14:00' },
                  notes: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: '予約作成成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Reservation' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/webhooks': {
      get: {
        tags: ['Webhooks'],
        summary: 'Webhook一覧取得',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Webhook一覧',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Webhook' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Webhooks'],
        summary: 'Webhook作成',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url', 'events'],
                properties: {
                  url: { type: 'string', format: 'uri' },
                  events: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['reservation.created', 'reservation.cancelled'],
                  },
                  metadata: { type: 'object', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Webhook作成成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Webhook' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};