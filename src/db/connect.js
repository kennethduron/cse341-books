import { MongoClient } from 'mongodb';

let database;

export const connectToDb = async () => {
  const connectionString = process.env.MONGODB_URI;
  const databaseName = process.env.MONGODB_DB_NAME;

  if (!connectionString) {
    throw new Error('MONGODB_URI is not defined.');
  }

  if (!databaseName) {
    throw new Error('MONGODB_DB_NAME is not defined.');
  }

  const connectedClient = new MongoClient(connectionString);

  try {
    await connectedClient.connect();
    const connectedDatabase = connectedClient.db(databaseName);
    await connectedDatabase.command({ ping: 1 });
    database = connectedDatabase;
    console.log('Connected to MongoDB.');
  } catch (error) {
    await connectedClient.close();
    throw error;
  }
};

export const getDb = () => {
  if (!database) {
    throw new Error('Database connection has not been established.');
  }

  return database;
};
