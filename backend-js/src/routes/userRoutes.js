import express from 'express';
import {
  listUsers,
  createUser,
  getUser,
  updateUserHandler,
  deleteUserHandler
} from '../controllers/userController.js';

const router = express.Router();

router.get('/', listUsers);
router.post('/', createUser);
router.get('/:id', getUser);
router.put('/:id', updateUserHandler);
router.delete('/:id', deleteUserHandler);

export default router;
