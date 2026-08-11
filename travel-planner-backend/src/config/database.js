import mongoose from "mongoose";

const connectDB=async()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Mongodb connected")
    } catch (error) {
        console.error("Mongodb connection failed");
        console.error(error.message);
        
        process.exit(1);
    }
};
export default connectDB;