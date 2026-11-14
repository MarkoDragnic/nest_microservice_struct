export const TCP_EVENTS = {
  HEALTH_CHECK: 'health.check',
  AUTHENTICATE: 'authenticate',

  ACCOUNT_CREATE: 'account.create',
  ACCOUNT_DECRYPT: 'account.decrypt',

  POSITION_OPEN: 'position.open',
  POSITION_CLOSE: 'position.close',

  ROBOT_CREATE: 'robot.create',
  ROBOT_GET_OWNER: 'robot.get-owner',
  ROBOT_INDICATORS_UPSERT: 'robot.indicators-upsert',

  USER_CREATE: 'user.create',

  HISTORY_MINUTE_DATA: 'history_minute_data',

  PRICE_PROVIDER_SUBSCRIBE: 'tcp.price_provider.subscribe',
  PRICE_PROVIDER_UNSUBSCRIBE: 'tcp.price_provider.unsubscribe',
} as const;

export const TCP_DB_EVENTS = {
  ACCOUNT_CREATE: 'account.db.create',

  ROBOT_CREATE: 'robot.db.create',
  ROBOT_INDICATORS_UPSERT: 'robot-indicators.db.upsert',
  ROBOT_FIND_ONE: 'robot.db.find-one',
  ROBOT_FIND_NOTIFICATION_TARGET: 'robot.db.find-notification-target',
  ROBOT_FIND_ALL_BY_SYMBOL: 'robot.db.find-all-by-symbol',
  ROBOT_FIND_PAGINATED: 'robot.db.find-paginated',

  POSITION_FIND_ONE: 'position.db.find-one',
  POSITION_FIND_PAGINATED: 'position.db.find-paginated',
  POSITION_OPEN_TRANSACTIONAL: 'position.db.open-transactional',
  POSITION_CLOSE_TRANSACTIONAL: 'position.db.close-transactional',
  POSITION_OPEN_FOR_ROBOTS: 'position.db.open-for-robots',

  USER_FIND_ONE: 'user.db.find-one',
  USER_FIND_ONE_WITH_PASSWORD: 'user.db.find-one-with-password',
  USER_CREATE: 'user.db.create',
} as const;
