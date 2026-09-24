import { NextResponse } from 'next/server';

/**
 * 📄 OpenAPI 3.0 spesifikasjon for KS Mester Agent Tools
 * Gjør at eksterne autonome agenter kan importere verktøyene enten via MCP eller standard OpenAPI/REST.
 */
export async function GET() {
  const openApiSpec = {
    openapi: '3.0.3',
    info: {
      title: 'KS Mester Agent Tools API',
      description: 'Komplette byggmester- og prosjektverktøy for autonome agenter: oppgaver, timeføring, byggedagbok, SJA, avvik, prosjekter og NS 8406.',
      version: '1.2.0'
    },
    servers: [
      {
        url: '/api/mcp',
        description: 'VikingMester MCP Bridge Server'
      }
    ],
    paths: {
      '/oppgaver': {
        get: {
          summary: 'Hent oppgaver og fremdrift for et prosjekt',
          operationId: 'hent_oppgaver',
          parameters: [
            { name: 'prosjektId', in: 'query', schema: { type: 'string' }, description: 'Prosjekt-ID eller navn (f.eks. «Renovering Bad Vidjeveien 21»)' },
            { name: 'tildeltTil', in: 'query', schema: { type: 'string' }, description: 'Navn på håndverker' },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'all'] }, description: 'Filter på oppgavestatus' }
          ],
          responses: {
            '200': { description: 'Liste over registrerte oppgaver med frister og ansvarlig' }
          }
        },
        post: {
          summary: 'Opprett og tildel en ny oppgave',
          operationId: 'opprett_oppgave',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['prosjektId', 'tittel'],
                  properties: {
                    prosjektId: { type: 'string' },
                    tittel: { type: 'string' },
                    beskrivelse: { type: 'string' },
                    tildeltTil: { type: 'string' },
                    frist: { type: 'string' },
                    prioritet: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Oppgave opprettet og tildelt' }
          }
        }
      },
      '/timer': {
        get: {
          summary: 'Hent førte timer for et prosjekt',
          operationId: 'hent_timer',
          parameters: [
            { name: 'prosjektId', in: 'query', required: true, schema: { type: 'string' }, description: 'Prosjekt-ID eller navn' },
            { name: 'handverkerNavn', in: 'query', schema: { type: 'string' }, description: 'Navn på håndverker' }
          ],
          responses: {
            '200': { description: 'Timeliste og totalt antall timer ført på prosjektet' }
          }
        },
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
            '200': { description: 'Timer registrert og synkronisert med byggedagbok' }
          }
        }
      },
      '/timeforing': {
        post: {
          summary: 'Bokfør timer på et prosjekt (alias)',
          operationId: 'registrer_timeforing_alias',
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
        get: {
          summary: 'Hent historikk fra elektronisk byggedagbok',
          operationId: 'hent_byggedagbok',
          parameters: [
            { name: 'prosjektId', in: 'query', required: true, schema: { type: 'string' }, description: 'Prosjekt-ID eller navn' },
            { name: 'antall', in: 'query', schema: { type: 'number' }, description: 'Maks antall dager som returneres' }
          ],
          responses: {
            '200': { description: 'Byggedagboknotater, bemanning og værforhold' }
          }
        },
        post: {
          summary: 'Før notat i byggedagbok iht. Byggherreforskriften § 15',
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
      },
      '/avvik': {
        get: {
          summary: 'Hent registrerte avvik og RUH for et prosjekt',
          operationId: 'hent_avvik',
          parameters: [
            { name: 'prosjektId', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'closed', 'all'] } }
          ],
          responses: {
            '200': { description: 'Avviksliste med alvorlighetsgrad og tiltak' }
          }
        },
        post: {
          summary: 'Registrer et avvik eller RUH i avviksregisteret',
          operationId: 'registrer_avvik',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['prosjektId', 'tittel', 'beskrivelse'],
                  properties: {
                    prosjektId: { type: 'string' },
                    tittel: { type: 'string' },
                    beskrivelse: { type: 'string' },
                    alvorlighetsgrad: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                    fag: { type: 'string' },
                    korrigerendeTiltak: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Avvik loggført' }
          }
        }
      },
      '/prosjekter': {
        get: {
          summary: 'Hent liste over aktive byggeprosjekter',
          operationId: 'hent_prosjekter',
          parameters: [
            { name: 'sokeord', in: 'query', schema: { type: 'string' }, description: 'Søkeord for navn, adresse eller kunde' }
          ],
          responses: {
            '200': { description: 'Liste over prosjekter' }
          }
        },
        post: {
          summary: 'Opprett et nytt byggeprosjekt',
          operationId: 'opprett_prosjekt',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['navn', 'adresse'],
                  properties: {
                    navn: { type: 'string' },
                    adresse: { type: 'string' },
                    byggeleder: { type: 'string' },
                    kundeNavn: { type: 'string' },
                    kundeEpost: { type: 'string' },
                    kundeTelefon: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Prosjekt opprettet' }
          }
        }
      },
      '/prosjektdetaljer': {
        get: {
          summary: 'Hent detaljert prosjektinformasjon med timer og avvik',
          operationId: 'hent_prosjektdetaljer',
          parameters: [
            { name: 'prosjektId', in: 'query', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Prosjektdetaljer, timer og status' }
          }
        }
      },
      '/sja': {
        post: {
          summary: 'Opprett Sikker Jobb Analyse (SJA) iht. Byggherreforskriften § 18',
          operationId: 'opprett_sja',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['prosjektId', 'tittel', 'arbeidsoppgave', 'risikoer', 'tiltak'],
                  properties: {
                    prosjektId: { type: 'string' },
                    tittel: { type: 'string' },
                    arbeidsoppgave: { type: 'string' },
                    risikoer: { type: 'array', items: { type: 'string' } },
                    tiltak: { type: 'array', items: { type: 'string' } },
                    hjemmel: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'SJA arkivert' }
          }
        }
      },
      '/endringsordre': {
        post: {
          summary: 'Opprett endringsordre / tilleggskrav iht. NS 8406',
          operationId: 'opprett_endringsordre',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['prosjektId', 'tittel', 'beskrivelse', 'belopEksMva'],
                  properties: {
                    prosjektId: { type: 'string' },
                    tittel: { type: 'string' },
                    beskrivelse: { type: 'string' },
                    belopEksMva: { type: 'number' },
                    dagerFristforlengelse: { type: 'number' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Endringsordre opprettet' }
          }
        }
      },
      '/tilbud': {
        post: {
          summary: 'Opprett et formelt tilbudsutkast eller priskalkyle',
          operationId: 'opprett_tilbud',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['tittel', 'belopEksMva'],
                  properties: {
                    prosjektId: { type: 'string' },
                    kundeNavn: { type: 'string' },
                    tittel: { type: 'string' },
                    beskrivelse: { type: 'string' },
                    belopEksMva: { type: 'number' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Tilbud opprettet' }
          }
        }
      },
      '/okonomi': {
        get: {
          summary: 'Hent økonomisk status for et prosjekt',
          operationId: 'hent_okonomi_status',
          parameters: [
            { name: 'prosjektId', in: 'query', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Økonomisk sammendrag og fakturerbart beløp' }
          }
        }
      }
    }
  };

  return NextResponse.json(openApiSpec);
}
