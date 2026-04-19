export enum ResponseMessage {
  SUCCESS = 'Success',

  SOMETHING_WENT_WRONG = 'Something went wrong',

  UNHANDLED_RPC_EXCEPTION = 'Unhandled RPC exception',

  HISTORY_DATA_READY = 'History data ready',

  USER_CREATED = 'User created',
  USER_EMAIL_IN_USE = 'Invalid credentials',
  USER_NOT_FOUND = 'User not found',

  ROBOT_CREATED = 'Robot created',
  ROBOT_ALREADY_EXISTS = 'Robot already exists',
  ROBOT_FOUND = 'Robot found',
  ROBOTS_LISTED = 'Robots listed',
  ROBOT_NOT_FOUND = 'Robot not found',
  ROBOT_OWNER_FETCHED = 'Robot owner fetched',
  ROBOT_INDICATORS_UPDATED = 'Indicators added to robot',

  POSITION_CREATED = 'Position created',
  POSITION_CLOSED = 'Position closed',
  POSITION_NOT_FOUND = 'Position not found',
  POSITION_FOUND = 'Position found',
  POSITIONS_LISTED = 'Positions listed',

  ACCOUNT_CREATED = 'Account created',
  ACCOUNT_ALREADY_EXISTS = 'Account already exists',

  FUNDS_UPDATED = 'Funds updated',
}
