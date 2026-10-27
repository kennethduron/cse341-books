import app from './app.js';
import { connectToDb } from './src/db/connect.js';

const port = process.env.PORT;

if (!port) {
  throw new Error('PORT is not defined. Set it in .env locally or in the hosting environment.');
}

const startServer = async () => {
  try {
    await connectToDb();
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exitCode = 1;
  }
};

startServer();
