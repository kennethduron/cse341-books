import { Router } from 'express';
import { getBooksHandler } from './controllers/books.js';

const router = Router();

router.get('/books', getBooksHandler);

export default router;
