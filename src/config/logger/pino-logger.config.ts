import * as pino from 'pino';

const pinoTerminal = {
  target: 'pino/file',
  options: { destination: 1 },
};

export const pinoLoggerConfig = {
  pinoHttp: {
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      req: () => undefined,
      res: () => undefined,
    },
    transport: {
      targets: [pinoTerminal],
    },
  },
};
