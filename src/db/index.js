import mongoose from "mongoose";

import { DBNAME } from "../constants.js";

export const connectDb = async ()=>{
try{
  const conn = await mongoose.connect(`${process.env.MONGO_URI}/${DBNAME}`)
  console.log(
    `MongoDB Connected: ${conn.connection.host}`
  )
}
catch (e) {
  console.log("cannot connect to the database",e)
  process.exit(1)
}
}