import Joi from 'joi';

export const createLikeSchema = Joi.object({
  userId: Joi.number().required().positive().messages({
    'number.base': 'User ID must be a number',
    'number.positive': 'User ID must be a positive number',
    'any.required': 'User ID is required',
  }),
  postId: Joi.number().required().positive().messages({
    'number.base': 'Post ID must be a number',
    'number.positive': 'Post ID must be a positive number',
    'any.required': 'Post ID is required',
  }),
});
