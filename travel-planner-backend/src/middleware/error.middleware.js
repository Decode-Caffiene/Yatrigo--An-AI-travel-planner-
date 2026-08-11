const errorHandler = (err, req, res, next) => {
  // Multer errors (e.g. file too large) don't carry a statusCode - treat
  // them as client errors rather than falling through to a generic 500.
  const statusCode = err.statusCode || (err.name === "MulterError" ? 400 : 500);

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

export default errorHandler;