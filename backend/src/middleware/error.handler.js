export const ErrorHandler = (err, req, res, next) => {
    console.log("error part:" ,err.message);
  return res.status(err.status || 500).json({
    status: false,
    message:err.message|| "something is wrong try again later",
  });
};
