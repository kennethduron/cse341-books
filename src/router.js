import { Router } from 'express';
import { getBookByIdHandler, getBooksHandler } from './controllers/books.js';
import {
  createAuthorHandler,
  deleteAuthorHandler,
  getAuthorByIdHandler,
  getAuthorsHandler,
  updateAuthorHandler,
} from './controllers/authors.js';

const router = Router();

router.get('/books', getBooksHandler);
router.get('/books/:id', getBookByIdHandler);

router.get('/authors', getAuthorsHandler);
router.get('/authors/:id', getAuthorByIdHandler);
router.post('/authors', createAuthorHandler);
router.put('/authors/:id', updateAuthorHandler);
router.delete('/authors/:id', deleteAuthorHandler);

export default router;
