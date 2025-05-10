import Joi from 'joi';

export const createPostSchema = Joi.object({
  content: Joi.string().required().min(1).max(5000).messages({
    'string.empty': 'Post content is required',
    'string.min': 'Post content must not be empty',
    'string.max': 'Post content cannot exceed 5000 characters',
  }),
  authorId: Joi.number().required().positive().messages({
    'number.base': 'Author ID must be a number',
    'number.positive': 'Author ID must be a positive number',
    'any.required': 'Author ID is required',
  }),
  hashtags: Joi.array()
    .items(
      Joi.string()
        .max(255)
        .pattern(/^[a-zA-Z0-9_]+$/)
        .messages({
          'string.pattern.base':
            'Hashtags must only contain alphanumeric characters and underscores',
          'string.max': 'Hashtags cannot exceed 255 characters',
        })
    )
    .optional(),
});

export const updatePostSchema = Joi.object({
  content: Joi.string().min(1).max(5000).messages({
    'string.min': 'Post content must not be empty',
    'string.max': 'Post content cannot exceed 5000 characters',
  }),
  hashtags: Joi.array()
    .items(
      Joi.string()
        .max(255)
        .pattern(/^[a-zA-Z0-9_]+$/)
        .messages({
          'string.pattern.base':
            'Hashtags must only contain alphanumeric characters and underscores',
          'string.max': 'Hashtags cannot exceed 255 characters',
        })
    )
    .optional(),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

export const feedQuerySchema = Joi.object({
  userId: Joi.number().required().positive().messages({
    'number.base': 'User ID must be a number',
    'number.positive': 'User ID must be a positive number',
    'any.required': 'User ID is required',
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100',
  }),
  offset: Joi.number().integer().min(0).default(0).messages({
    'number.base': 'Offset must be a number',
    'number.integer': 'Offset must be an integer',
    'number.min': 'Offset must be a non-negative number',
  }),
});
