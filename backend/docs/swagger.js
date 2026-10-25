/**
 * OpenAPI 3.0.0 Specification for Crime & Cybercrime NLP Classification Backend
 */
export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Crime & Cybercrime NLP Triage & Reporting API',
    version: '1.0.0',
    description: `
### Overview
RESTful API for citizen crime incident reporting, automated AI/NLP triage using fine-tuned DistilBERT v3, and police administrative case management.

### Key Capabilities
- **Citizen Crime Reporting**: Anonymous/public complaint intake with real-time NLP classification, domain segregation (Physical vs. Cyber), severity scoring, emergency dispatch flags, and actionable citizen safety advisories.
- **Incident Tracking**: Secure citizen status lookup concealing internal investigation logs, officer identities, and sensitive complainant PII.
- **Officer & Admin Authentication**: Dual-token JWT architecture (Short-lived Access Tokens & Long-lived Refresh Tokens) with atomic rotation, replay protection, and database tracking.
- **Triage & Operations Management**: Dynamic filtering, CASE-based urgency/severity sorting, pagination, case assignment, and append-only investigation notes.
- **Analytics & Aggregation**: Real-time SQL database \`GROUP BY\` metrics for crime domains, severity distribution, and top incident categories.
- **Hardened Security**: IP-based rate limiting (5 submissions/hour, 30 tracking lookups/15 min) and centralized error sanitation preventing stack trace leakage.
    `,
    contact: {
      name: 'National Crime Portal Engineering Team',
      email: 'support@crimeportal.gov',
    },
  },
  servers: [
    {
      url: 'https://vigilex.duckdns.org',
      description: 'Production Server (AWS EC2 - HTTPS)',
    },
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server',
    },
  ],
  tags: [
    { name: 'Health', description: 'System health check and uptime monitor' },
    {
      name: 'Public Citizen Reports',
      description: 'Citizen complaint filing and public tracking',
    },
    {
      name: 'Authentication',
      description: 'Officer login, token refresh rotation, and logout',
    },
    {
      name: 'Admin Triage & Operations',
      description: 'Protected case management, triage, and reclassification',
    },
    {
      name: 'Admin Analytics',
      description: 'Incident aggregation and statistical metrics',
    },
  ],
  paths: {
    '/api/v1/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API server health status',
        description:
          'Returns server operational status and active API version.',
        responses: {
          200: {
            description: 'API is healthy and running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    version: { type: 'string', example: 'v1' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/reports/classify': {
      post: {
        tags: ['Public Citizen Reports'],
        summary: 'Direct sentence classification (instant AI inference preview)',
        description:
          'Passes any raw incident sentence/narrative (in English or Roman Urdu) directly through the DeBERTa-v3 NLP model and Gemini Normalizer. Returns category, domain, confidence, urgency, and safety advisory without saving to the database.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['text'],
                properties: {
                  text: {
                    type: 'string',
                    example: 'Mera phone cheen lia gun dikha kar Saddar mein',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Direct classification output',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        predicted_category: { type: 'string', example: 'Robbery & Armed Snatching' },
                        domain: { type: 'string', example: 'Physical' },
                        confidence_score: { type: 'number', example: 97.4 },
                        severity: { type: 'string', example: 'Critical' },
                        is_urgent: { type: 'boolean', example: true },
                        safety_advisory: { type: 'string' },
                        normalized_text: { type: 'string' },
                        is_translated: { type: 'boolean', example: true },
                        top_candidates: { type: 'array' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Missing or empty text parameter',
          },
        },
      },
    },
    '/api/v1/reports': {
      post: {
        tags: ['Public Citizen Reports'],
        summary: 'Submit a new crime or cybercrime complaint',
        description: `
Validates complainant narrative, runs real-time DistilBERT v3 NLP classification, assigns standard tracking ID (\`CRIME-YYYY-XXXXXXXXXX\`), and persists report to MySQL.
**Rate Limit**: 5 requests per hour per IP.
        `,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateReportRequest' },
              example: {
                citizen_name: 'Ahmed Khan',
                contact_number: '+923001234567',
                incident_location: 'Gulshan-e-Iqbal, Karachi',
                incident_date: '2026-10-20T22:30:00.000Z',
                description:
                  'Two masked men on a motorcycle pointed a gun at me and snatched my phone and 25,000 cash near the metro station.',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Report created and classified successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateReportResponse' },
              },
            },
          },
          400: {
            description: 'Validation failed for request body',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          429: {
            description: 'Rate limit exceeded (Maximum 5 reports/hour)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/reports/track/{trackingId}': {
      get: {
        tags: ['Public Citizen Reports'],
        summary: 'Track public crime complaint status',
        description: `
Returns sanitized citizen tracking view. Strictly conceals internal notes, citizen phone number, officer ID, and raw ML probabilities.
**Rate Limit**: 30 requests per 15 minutes per IP.
        `,
        parameters: [
          {
            name: 'trackingId',
            in: 'path',
            required: true,
            description:
              'Unique public tracking identifier (e.g. CRIME-2026-B31F9BDB58)',
            schema: { type: 'string', example: 'CRIME-2026-B31F9BDB58' },
          },
        ],
        responses: {
          200: {
            description: 'Public tracking information retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TrackReportResponse' },
              },
            },
          },
          400: {
            description: 'Invalid tracking ID format',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Report not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          429: {
            description: 'Rate limit exceeded (Maximum 30 lookups/15 min)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Officer & Admin authentication login',
        description: `
Verifies email and password using bcrypt. Returns dual tokens (Access Token valid 15m, Refresh Token valid 7d).
Returns identical generic \`"Invalid credentials"\` (401) on non-existent email or wrong password to prevent user enumeration.
        `,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
              example: {
                email: 'admin@crimeportal.gov',
                password: 'Admin@12345',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful, access and refresh tokens returned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          400: {
            description: 'Validation failed for email or password format',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/refresh-token': {
      post: {
        tags: ['Authentication'],
        summary: 'Rotate and refresh JWT access token',
        description: `
Validates refresh token signature and database revocation state using row locking.
Atomically marks old token as revoked (\`is_revoked: true\`) and issues a fresh token pair.
Rejects any attempt to reuse an old or revoked refresh token with 401.
        `,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Token refreshed and rotated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RefreshTokenResponse' },
              },
            },
          },
          400: {
            description: 'Refresh token is required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description:
              'Refresh token is invalid, expired, or has already been used/revoked',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Officer logout & token revocation',
        description:
          'Revokes the active refresh token in the database table so it cannot be used again.',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LogoutRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Logged out successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/admin/officers': {
      post: {
        tags: ['Admin Triage & Operations'],
        summary: 'Create a new police officer account (Admin only)',
        description: 'Allows an administrator to register an investigator or officer with name, email, role, and password.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Inspector Tariq' },
                  email: { type: 'string', format: 'email', example: 'tariq@police.gov.pk' },
                  password: { type: 'string', format: 'password', example: 'Password123!' },
                  role: { type: 'string', enum: ['admin', 'officer'], default: 'officer' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Officer account created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' }
              }
            }
          },
          403: {
            description: 'Forbidden - Only administrators can register officers'
          }
        }
      },
      get: {
        tags: ['Admin Triage & Operations'],
        summary: 'List all officers (For case assignment dropdown & directory)',
        description: 'Returns list of registered officers to assign cases to.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Officers retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' }
              }
            }
          }
        }
      }
    },
    '/api/v1/admin/reports': {
      get: {
        tags: ['Admin Triage & Operations'],
        summary:
          'List & triage crime reports (Paginated, filtered, triage sorted)',
        description: `
Protected endpoint returning paginated complaints.
- **Triage Sorting**: Critical & urgent complaints appear at the very top via SQL CASE logic.
- **Filters**: domain, severity, category (URL-encoded), status, is_urgent.
        `,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'domain',
            in: 'query',
            description: 'Filter by domain',
            schema: { type: 'string', enum: ['Cyber', 'Physical'] },
          },
          {
            name: 'severity',
            in: 'query',
            description: 'Filter by severity',
            schema: {
              type: 'string',
              enum: ['Critical', 'High', 'Medium', 'Low'],
            },
          },
          {
            name: 'category',
            in: 'query',
            description:
              'Filter by category (URL-encoded, e.g. Robbery%20%26%20Armed%20Snatching)',
            schema: { type: 'string' },
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter by investigation status',
            schema: {
              type: 'string',
              enum: ['Pending', 'Under Investigation', 'Resolved', 'Dismissed'],
            },
          },
          {
            name: 'officer_id',
            in: 'query',
            description:
              'Filter by assigned officer ID (e.g. 1) or "unassigned" to get unassigned reports',
            schema: { type: 'string', example: '1' },
          },
          {
            name: 'is_urgent',
            in: 'query',
            description: 'Filter by urgent dispatch flag',
            schema: { type: 'boolean' },
          },
          {
            name: 'page',
            in: 'query',
            description: 'Page number (default: 1)',
            schema: { type: 'integer', default: 1, minimum: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Items per page (default: 20, max: 100)',
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
          },
        ],
        responses: {
          200: {
            description: 'Paginated admin triage reports',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AdminReportsListResponse',
                },
              },
            },
          },
          401: {
            description: 'Unauthorized - Missing or invalid Bearer token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/admin/reports/my-tasks': {
      get: {
        tags: ['Admin Triage & Operations'],
        summary:
          'Get assigned reports for the currently authenticated officer',
        description: `
Retrieves cases specifically assigned to the logged-in officer (extracted automatically from the Bearer JWT token \`req.user.id\`).
- **Triage Sorting**: Critical & urgent complaints appear first.
- **Filters**: domain, severity, category, status, is_urgent.
        `,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'domain',
            in: 'query',
            description: 'Filter by domain',
            schema: { type: 'string', enum: ['Cyber', 'Physical'] },
          },
          {
            name: 'severity',
            in: 'query',
            description: 'Filter by severity',
            schema: {
              type: 'string',
              enum: ['Critical', 'High', 'Medium', 'Low'],
            },
          },
          {
            name: 'category',
            in: 'query',
            description: 'Filter by category',
            schema: { type: 'string' },
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter by investigation status',
            schema: {
              type: 'string',
              enum: ['Pending', 'Under Investigation', 'Resolved', 'Dismissed'],
            },
          },
          {
            name: 'is_urgent',
            in: 'query',
            description: 'Filter by urgent dispatch flag',
            schema: { type: 'boolean' },
          },
          {
            name: 'page',
            in: 'query',
            description: 'Page number (default: 1)',
            schema: { type: 'integer', default: 1, minimum: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Items per page (default: 20, max: 100)',
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
          },
        ],
        responses: {
          200: {
            description: 'Paginated tasks assigned to the current officer',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AdminReportsListResponse',
                },
              },
            },
          },
          401: {
            description: 'Unauthorized - Missing or invalid Bearer token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/admin/reports/{id}': {
      get: {
        tags: ['Admin Triage & Operations'],
        summary: 'Get full report details by ID',
        description:
          'Returns full crime report details including citizen contact and assigned officer info.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Report Database ID',
            schema: { type: 'integer', example: 1 },
          },
        ],
        responses: {
          200: {
            description: 'Report record found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AdminReportDetailResponse',
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Report not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Admin Triage & Operations'],
        summary:
          'Update report status, assign officer, and append investigation notes',
        description: `
Updates case management fields.
- **status**: Allowed values: \`Under Investigation\`, \`Resolved\`, \`Dismissed\`.
- **officer_id**: Must exist in \`officers\` table (or null to unassign).
- **officer_notes**: Appends to previous notes with timestamp and officer name (never replaces).
        `,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Report Database ID',
            schema: { type: 'integer', example: 1 },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateReportRequest' },
              example: {
                status: 'Under Investigation',
                officer_id: 1,
                officer_notes:
                  'Patrol dispatched to incident coordinates. CCTV being requested.',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Report updated and notes appended successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AdminReportDetailResponse',
                },
              },
            },
          },
          400: {
            description:
              'Invalid status, non-existent officer_id, or invalid payload',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Report not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/admin/reports/{id}/reclassify': {
      post: {
        tags: ['Admin Triage & Operations'],
        summary: 'Re-trigger DistilBERT NLP classification on a report',
        description:
          'Re-invokes the Python ML microservice for a complaint (especially useful for unclassified or imported reports) and populates domain, severity, and safety advisory.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Report Database ID',
            schema: { type: 'integer', example: 1 },
          },
        ],
        responses: {
          200: {
            description: 'Report reclassified and updated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AdminReportDetailResponse',
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          404: {
            description: 'Report not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/admin/stats': {
      get: {
        tags: ['Admin Analytics'],
        summary: 'Get crime triage aggregate statistics',
        description:
          'Computes SQL direct `GROUP BY` counts for crime domain, severity levels, and top 5 categories without loading row data into Node.js memory.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Aggregated analytics data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AdminStatsResponse' },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Enter your JWT access token obtained from /api/v1/auth/login',
      },
    },
    schemas: {
      CreateReportRequest: {
        type: 'object',
        required: [
          'citizen_name',
          'contact_number',
          'incident_location',
          'incident_date',
          'description',
        ],
        properties: {
          citizen_name: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
            example: 'Ahmed Khan',
          },
          contact_number: {
            type: 'string',
            minLength: 10,
            maxLength: 20,
            example: '+923001234567',
          },
          incident_location: {
            type: 'string',
            minLength: 3,
            maxLength: 255,
            example: 'Gulshan-e-Iqbal, Karachi',
          },
          incident_date: {
            type: 'string',
            format: 'date-time',
            example: '2026-10-20T22:30:00.000Z',
          },
          description: {
            type: 'string',
            minLength: 20,
            maxLength: 10000,
            example:
              'Two masked men on a motorcycle pointed a gun at me and snatched my phone and 25,000 cash near the metro station.',
          },
        },
      },
      CreateReportResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'integer', example: 201 },
          message: {
            type: 'string',
            example: 'Report submitted and classified successfully',
          },
          data: {
            type: 'object',
            properties: {
              tracking_id: { type: 'string', example: 'CRIME-2026-B31F9BDB58' },
              status: { type: 'string', example: 'Pending' },
              predicted_category: {
                type: 'string',
                example: 'Robbery & Armed Snatching',
              },
              domain: { type: 'string', example: 'Physical' },
              severity: { type: 'string', example: 'Critical' },
              is_urgent: { type: 'boolean', example: true },
              confidence_score: { type: 'number', example: 99.39 },
              safety_advisory: {
                type: 'string',
                example:
                  'EMERGENCY: Immediate armed threat. Call Emergency Police Helpline (15) immediately for rapid patrol response.',
              },
              created_at: { type: 'string', format: 'date-time' },
            },
          },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      TrackReportResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'integer', example: 200 },
          message: {
            type: 'string',
            example: 'Report tracking details retrieved successfully',
          },
          data: {
            type: 'object',
            properties: {
              tracking_id: { type: 'string', example: 'CRIME-2026-B31F9BDB58' },
              status: { type: 'string', example: 'Under Investigation' },
              predicted_category: {
                type: 'string',
                example: 'Robbery & Armed Snatching',
              },
              created_at: { type: 'string', format: 'date-time' },
              safety_advisory: {
                type: 'string',
                example: 'EMERGENCY: Immediate armed threat...',
              },
              assigned_officer: {
                type: 'string',
                example: 'Super Administrator',
              },
            },
          },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'admin@crimeportal.gov',
          },
          password: { type: 'string', minLength: 1, example: 'Admin@12345' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'integer', example: 200 },
          message: { type: 'string', example: 'Login successful' },
          data: {
            type: 'object',
            properties: {
              officer: {
                type: 'object',
                properties: {
                  id: { type: 'integer', example: 1 },
                  name: { type: 'string', example: 'Super Administrator' },
                  email: { type: 'string', example: 'admin@crimeportal.gov' },
                  role: { type: 'string', example: 'admin' },
                },
              },
              accessToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsIn...',
              },
              refreshToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsIn...',
              },
              expiresIn: { type: 'string', example: '15m' },
            },
          },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsIn...',
          },
        },
      },
      RefreshTokenResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'integer', example: 200 },
          message: { type: 'string', example: 'Token refreshed successfully' },
          data: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              expiresIn: { type: 'string', example: '15m' },
            },
          },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      LogoutRequest: {
        type: 'object',
        properties: {
          refreshToken: { type: 'string' },
        },
      },
      UpdateReportRequest: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['Under Investigation', 'Resolved', 'Dismissed'],
            example: 'Under Investigation',
          },
          officer_id: { type: 'integer', nullable: true, example: 1 },
          officer_notes: {
            type: 'string',
            example:
              'Patrol dispatched to crime scene. Reviewing nearby surveillance footage.',
          },
        },
      },
      AdminReportsListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'integer', example: 200 },
          message: {
            type: 'string',
            example: 'Admin reports retrieved successfully',
          },
          data: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 45 },
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              pages: { type: 'integer', example: 3 },
              reports: {
                type: 'array',
                items: { $ref: '#/components/schemas/ReportDetail' },
              },
            },
          },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      AdminReportDetailResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'integer', example: 200 },
          message: { type: 'string', example: 'Report retrieved successfully' },
          data: { $ref: '#/components/schemas/ReportDetail' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      ReportDetail: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          tracking_id: { type: 'string', example: 'CRIME-2026-B31F9BDB58' },
          citizen_name: { type: 'string', example: 'Ahmed Khan' },
          contact_number: { type: 'string', example: '+923001234567' },
          incident_location: {
            type: 'string',
            example: 'Gulshan-e-Iqbal, Karachi',
          },
          incident_date: { type: 'string', format: 'date-time' },
          description: {
            type: 'string',
            example: 'Two masked men on motorcycle snatched phone and cash.',
          },
          predicted_category: {
            type: 'string',
            example: 'Robbery & Armed Snatching',
          },
          domain: { type: 'string', example: 'Physical' },
          confidence_score: { type: 'number', example: 99.39 },
          severity: { type: 'string', example: 'Critical' },
          is_urgent: { type: 'boolean', example: true },
          safety_advisory: {
            type: 'string',
            example: 'EMERGENCY: Immediate armed threat...',
          },
          top_candidates: { type: 'array', items: { type: 'object' } },
          status: { type: 'string', example: 'Under Investigation' },
          officer_id: { type: 'integer', nullable: true, example: 1 },
          officer_notes: {
            type: 'string',
            example:
              '[2026-10-20T22:35:00.000Z] Super Administrator: Patrol dispatched.\n[2026-10-20T22:45:00.000Z] Super Administrator: Suspect vehicle identified.',
          },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          officer: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'integer', example: 1 },
              name: { type: 'string', example: 'Super Administrator' },
              email: { type: 'string', example: 'admin@crimeportal.gov' },
              role: { type: 'string', example: 'admin' },
            },
          },
        },
      },
      AdminStatsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'integer', example: 200 },
          message: {
            type: 'string',
            example: 'Admin statistics retrieved successfully',
          },
          data: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 45 },
              by_domain: {
                type: 'object',
                example: { Physical: 25, Cyber: 20 },
              },
              by_severity: {
                type: 'object',
                example: { Critical: 15, High: 20, Medium: 10 },
              },
              top_categories: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    category: {
                      type: 'string',
                      example: 'Robbery & Armed Snatching',
                    },
                    count: { type: 'integer', example: 12 },
                  },
                },
              },
            },
          },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'integer', example: 200 },
          message: {
            type: 'string',
            example: 'Operation completed successfully',
          },
          data: { type: 'object', nullable: true, example: null },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'integer', example: 400 },
          message: {
            type: 'string',
            example: 'Validation failed for request body',
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'description' },
                message: {
                  type: 'string',
                  example:
                    'Complaint description must be at least 20 characters long',
                },
              },
            },
          },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
}

export default swaggerSpec
