import { app } from "./app.js";
import dotenv from "dotenv";
import { connectDb } from "./db/index.js";

dotenv.configDotenv({
  path: "./.env"
})

const PORT = process.env.PORT || 8080

connectDb().then(
  ()=>{
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
)
.catch((err)=>{
  console.log("database error",err)
})