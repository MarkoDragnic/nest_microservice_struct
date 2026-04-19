export const KAFKA_TOPICS = {
  CANDLE_PRICE: 'candle.price',
  INDICATOR_TRIGGER: 'indicator.trigger',
  SEND_NOTIFICATION: 'notification.send',

  CANDLE_PRICE_DLQ: 'candle.price.dlq',
  INDICATOR_TRIGGER_DLQ: 'indicator.trigger.dlq',
  SEND_NOTIFICATION_DLQ: 'notification.send.dlq',
} as const;
