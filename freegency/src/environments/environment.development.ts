export const environment = {
  production: false,
  /** Local API — keep Stripe CLI listening so webhooks credit wallets */
  apiBaseUrl: 'https://localhost:7186',
  hubUrl: 'https://localhost:7186/hub/notifications',
  stripePublicKey:
    'pk_test_51TmDO3EW2kqDFv3mSLCYIICY1i9MqZ9MECS7whBhZi4jpxNPRopgMdVt5ccFQ5TjqC8PByk2HwaWnyaSphtaHPFP00RMmTmOG2',
};
