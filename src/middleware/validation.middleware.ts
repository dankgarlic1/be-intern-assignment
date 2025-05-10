import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export enum ValidationType {
  BODY = 'body',
  QUERY = 'query',
  PARAMS = 'params',
}

export const validate = (schema: Joi.ObjectSchema, type: ValidationType = ValidationType.BODY) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req[type], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      return res.status(400).json({ message: errorMessage });
    }

    next();
  };
};

export const validateMultiple = (
  validations: Array<{ schema: Joi.ObjectSchema; type: ValidationType }>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const validation of validations) {
      const { schema, type } = validation;
      const { error } = schema.validate(req[type], {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const errorMessage = error.details.map((detail) => detail.message).join(', ');
        return res.status(400).json({ message: errorMessage });
      }
    }

    next();
  };
};
