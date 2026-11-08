import express from 'express';
import swaggerUi from 'swagger-ui-express';
import router from './src/router.js';
import swaggerDocument from './src/docs/openapi.js';

const app = express();

app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
  return res.status(200).json({ message: 'Server is running' });
});

app.use(router);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ message: 'Invalid JSON request body' });
  }

  console.error('Unhandled request error.', error?.name ?? 'UnknownError');
  return res.status(500).json({ message: 'Internal server error' });
});

export default app;
