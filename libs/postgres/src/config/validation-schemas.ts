import Joi from 'joi';

// The three flags stay strings on purpose: DatabasePostgresqlModule compares them with 'true',
// and ConfigService returns the validated value, so Joi.boolean() would silently switch them off.
export const postgresSchema = {
  POSTGRES_HOST: Joi.string().required(),
  POSTGRES_PORT: Joi.number().required(),
  POSTGRES_DB: Joi.string().required(),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_SSL: Joi.string().valid('true', 'false').optional(),
  POSTGRES_SYNCHRONIZE: Joi.string().valid('true', 'false').optional(),
  POSTGRES_MIGRATIONS_RUN: Joi.string().valid('true', 'false').optional(),
};
