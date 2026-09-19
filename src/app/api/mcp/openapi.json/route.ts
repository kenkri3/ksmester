import { NextResponse } from 'next/server';

/**
 * 📄 OpenAPI 3.0 spesifikasjon for KS Mester Agent Tools
 * Gjør at agentplattformer kan importere verktøyene enten via MCP eller standard OpenAPI/REST.
 */
export async function GET() {
  const openApiSpec = {
    openapi: '3.0.3',
    info: {
      title: 'KS Mester Agent Tools API',
      description: 'Byggmester- og prosjektverktøy for autonome agenter: timeføring, byggedagbok, SJA, avvik og NS 8406.',
      version: '1.0.0'
    },
    servers: [
      {
        url: '/api/mcp',
        description: 'VikingMester MCP Bridge Server'
      }
    ],
    paths: {
      '/timeforing': {
        post: {
          summary: 'Bokfør timer på et prosjekt',
          operationId: 'registrer_timeforing',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['prosjektId', 'handverkerNavn', 'timer', 'beskrivelse'],
                  properties: {
                    prosjektId: { type: 'string' },
                    handverkerNavn: { type: 'string' },
                    timer: { type: 'number' },
                    beskrivelse: { type: 'string' },
                    dato: { type: 'string' },
                    kategori: { type: 'string', enum: ['arbeid', 'overtid', 'reise'] }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Timer registrert' }
          }
        }
      },
      '/byggedagbok': {
        post: {
          summary: 'Før notat i byggedagbok',
          operationId: 'oppdater_byggedagbok',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['prosjektId', 'notat'],
                  properties: {
                    prosjektId: { type: 'string' },
                    notat: { type: 'string' },
                    vaerforhold: { type: 'string' },
                    bemanning: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Byggedagbok oppdatert' }
          }
        }
      }
    }
  };

  return NextResponse.json(openApiSpec);
}
