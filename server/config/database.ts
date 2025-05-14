import mongoose from 'mongoose';

const connectDB = async (): Promise<boolean> => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error: any) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Don't exit the process in case of error, allow fallback to in-memory storage
    return false;
  }
};

export default connectDB;