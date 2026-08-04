export const environment = {
  production: false,

  /** Local API */
  apiBaseUrl: 'https://localhost:7186',
  hubUrl: 'https://localhost:7186/hub/notifications',
  hubChatUrl: 'https://localhost:7186/hub/chat',

  /** Deployed API — switch to these when testing Stripe webhooks */
  // apiBaseUrl: 'https://free-gency-backend-003bbc67b812.herokuapp.com',
  // hubUrl: 'https://free-gency-backend-003bbc67b812.herokuapp.com/hub/notifications',

  stripePublicKey:
    'pk_test_51TyEnQ0uGNIPAqooG7uCqKRhjQSr4THkU8MMOtG98sTzlndXeokSWVY8oA8HDBL1kesoMCBJji65cOPNKUfEiSHV00HrBgK1lN',
};
