import { Router } from 'express';
import { getBookByIdHandler, getBooksHandler } from './controllers/books.js';

const router = Router();

router.get('/books', getBooksHandler);
router.get('/books/:id', getBookByIdHandler);

export default router;
