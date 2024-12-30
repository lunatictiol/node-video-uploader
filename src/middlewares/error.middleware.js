import mongoose from "mongoose";

import { ApiError } from "../utils/ApiError.js";


const errorHandler = (err, req, res, next) => {
  console.error(err)
  let error = err
  if (!(err instanceof ApiError)) {
    const statusCode = error.statusCode || error instanceof mongoose.Error ? 400 : 500
    const message = error.message || "Something went wrong"
    error = new ApiError(statusCode, message,error?.errors || [], err.stack);
  }

  const response = {
    success: false,
    message: error.message,
    error: error.error,
    stack: process.env.NODE_ENV === 'development' ? err.stack : {}
  }
  res.status(error.statusCode).json(response)

}

export {errorHandler}