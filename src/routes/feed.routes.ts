import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validate, ValidationType } from '../middleware/validation.middleware';
import { feedQuerySchema } from '../validations/post.validation';

export const feedRouter = Router();
const userController = new UserController();

feedRouter.get('/', validate(feedQuerySchema, ValidationType.QUERY), (req, res) =>
  userController.getFeedFromQuery(req, res)
);
