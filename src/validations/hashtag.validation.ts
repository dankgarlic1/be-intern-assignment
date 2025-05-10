import Joi from 'joi';

export const createHashtagSchema = Joi.object({
  tag: Joi.string()
    .required()
    .min(1)
    .max(255)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .messages({
      'string.empty': 'Hashtag is required',
      'string.min': 'Hashtag must not be empty',
      'string.max': 'Hashtag cannot exceed 255 characters',
      'string.pattern.base': 'Hashtag must only contain alphanumeric characters and underscores',
    }),
});

export const updateHashtagSchema = Joi.object({
  tag: Joi.string()
    .required()
    .min(1)
    .max(255)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .messages({
      'string.empty': 'Hashtag is required',
      'string.min': 'Hashtag must not be empty',
      'string.max': 'Hashtag cannot exceed 255 characters',
      'string.pattern.base': 'Hashtag must only contain alphanumeric characters and underscores',
    }),
});
