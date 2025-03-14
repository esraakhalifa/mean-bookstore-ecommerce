import fs from 'node:fs';
import path from 'node:path';
import {createLogger, format, transports} from 'winston';

const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
    format.printf(({timestamp, level, message}) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
  ),
  transports: [
    new transports.File({filename: path.join(logDir, 'requests.log')})
  ]

});

const requestLogger = (req, _res, next) => {
  const sanitizedUrl = req.url.replace(/\/verify\/[^/]+/, '/verify/***'); // sanitize tokens in URLs
  logger.info(`${req.method} ${sanitizedUrl} - IP: ${req.ip}`);
  next();
};

export default requestLogger;
