export function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const meta = err.meta;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    error: {
      code,
      message: err.message || 'Error inesperado',
      ...(meta ? { meta } : {})
    }
  });
}
