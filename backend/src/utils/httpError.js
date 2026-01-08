export class HttpError extends Error {
  constructor(statusCode, code, message, meta) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.meta = meta;
  }
}

export function badRequest(message, code = 'BAD_REQUEST', meta) {
  return new HttpError(400, code, message, meta);
}

export function unauthorized(message = 'No autorizado', code = 'UNAUTHORIZED', meta) {
  return new HttpError(401, code, message, meta);
}

export function forbidden(message = 'Prohibido', code = 'FORBIDDEN', meta) {
  return new HttpError(403, code, message, meta);
}
