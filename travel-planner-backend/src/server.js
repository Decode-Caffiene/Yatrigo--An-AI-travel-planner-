import "./config/env.js";
import app from "./app.js";


import connectDB from "./config/database.js";

const PORT=process.env.PORT || 5000;

connectDB();

app.listen(PORT,()=>{
    console.log(`server is running on ${PORT}`);
});
