//Centralized error handling middleware
const errorHandling = (err, req, res, next) => {
  console.error(err.stack);
  const status = err.statusCode || 500;
  res.status(status).json({
    status,
    message: status === 500 ? "Internal Server Error" : err.message,
    error: err.message,
  });
};

export default errorHandling;