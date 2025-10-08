export const notFound = (req, res, _next) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
};

export const errorHandler = (err, _req, res, _next) => {
  console.error('Error:', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Server Error' });
};
