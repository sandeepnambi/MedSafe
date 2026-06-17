import mongoose from 'mongoose';

export const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medsafe';
  
  console.log(`Connecting strictly to MongoDB at: ${mongoURI}...`);
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    console.log('💚 MongoDB connected successfully!');
  } catch (error) {
    console.error('❌ MongoDB Connection Failure! Server cannot boot without database connectivity:', error.message);
    process.exit(1);
  }
};

// Strict Mongoose collection resolver
export const getModel = (modelName) => {
  try {
    return mongoose.model(modelName);
  } catch (e) {
    // Model might not be compiled yet, fall back to schema compilation
    return mongoose.models[modelName] || null;
  }
};

export const getDBType = () => 'MongoDB';
