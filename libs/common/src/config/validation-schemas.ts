import Joi from 'joi';

export const internalRpcSchema = {
  INTERNAL_RPC_TOKEN: Joi.string().min(16).required(),
};

export const redisSchema = {
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_USER: Joi.string().allow('').optional(),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
};

export const kafkaSchema = {
  KAFKA_BROKERS: Joi.string().required(),
  KAFKA_CONSUMER_GROUP: Joi.string().required(),
};

export const mongoDbSchema = {
  MONGODB_URI: Joi.string().required(),
};
