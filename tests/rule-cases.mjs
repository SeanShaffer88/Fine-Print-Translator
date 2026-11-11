// Per-rule examples, written separately from the corpus documents.
// kind: positive (rule should clearly fire), negative (must not fire),
//       ambiguous (fires, but only as a possible match).
// expect: 'found' | 'possible' | null, plus optional polarity and values.
export const RULE_CASES = {
  'trial.conversion': [
    { kind: 'positive', text: 'Your 7-day free trial starts today.', expect: 'found', values: { trialLength: '7 days' } },
    { kind: 'positive', text: 'When the trial period ends you will be charged the regular rate.', expect: 'found' },
    { kind: 'positive', text: 'This plan does not include a free trial.', expect: 'found', polarity: 'negated' },
    { kind: 'negative', text: 'The court set a date for the trial.', expect: null },
    { kind: 'negative', text: 'We improve the product through trial and error.', expect: null },
    { kind: 'ambiguous', text: 'A promotional period may be available to some customers.', expect: 'possible' },
  ],
  'renewal.automatic': [
    { kind: 'positive', text: 'Your membership auto-renews annually.', expect: 'found', values: { period: '1 year' } },
    { kind: 'positive', text: 'The plan will automatically renew every month.', expect: 'found', values: { period: '1 month' } },
    { kind: 'positive', text: 'This plan will not automatically renew.', expect: 'found', polarity: 'negated' },
    { kind: 'negative', text: 'We automatically save your work.', expect: null },
    { kind: 'ambiguous', text: 'Automatic renewal applies to all plans.', expect: 'possible' },
  ],
  'renewal.continuation': [
    { kind: 'positive', text: 'You can renew your membership from the account menu.', expect: 'possible' },
    { kind: 'negative', text: 'Please renew your password every 90 days.', expect: null },
    { kind: 'negative', text: 'Payment is taken on the renewal date.', expect: null },
    { kind: 'ambiguous', text: 'The agreement continues for a further period if neither party objects.', expect: 'possible' },
  ],
  'price.amount': [
    { kind: 'positive', text: 'The plan costs $12.50 per month.', expect: 'found', values: { amount: '$12.50', period: '1 month' } },
    { kind: 'positive', text: 'A late fee of £5 applies.', expect: 'found', values: { amount: '£5' } },
    { kind: 'negative', text: 'You are free to leave feedback.', expect: null },
    { kind: 'negative', text: 'Fees are refunded if the service is unavailable.', expect: null },
    { kind: 'ambiguous', text: 'Taxes and other charges are your responsibility.', expect: 'possible' },
  ],
  'price.change': [
    { kind: 'positive', text: 'We will notify you before we increase the price.', expect: 'found' },
    { kind: 'positive', text: 'Prices may change with 14 days notice.', expect: 'found' },
    { kind: 'negative', text: 'We may change the layout of the app.', expect: null },
    { kind: 'ambiguous', text: 'Our rates may vary.', expect: 'possible' },
  ],
  'cancellation.terms': [
    { kind: 'positive', text: "You must provide 14 days' notice to cancel.", expect: 'found', values: { noticePeriod: '14 days' } },
    { kind: 'positive', text: 'To cancel, contact us by email.', expect: 'found' },
    { kind: 'positive', text: 'Annual plans cannot be cancelled during the first term.', expect: 'found', polarity: 'negated' },
    { kind: 'negative', text: 'You can cancel a pending download from the queue.', expect: null },
    { kind: 'negative', text: 'Billing continues until you cancel.', expect: null },
    { kind: 'ambiguous', text: 'Cancellation is subject to these terms.', expect: 'possible' },
  ],
  'cancellation.indirect': [
    { kind: 'positive', text: 'For help ending your subscription, see the help centre.', expect: 'possible' },
    { kind: 'negative', text: 'The service may end without warning during maintenance.', expect: null },
    { kind: 'ambiguous', text: 'You may stop using the service whenever you like.', expect: 'possible' },
  ],
  'refund.terms': [
    { kind: 'positive', text: 'You can request a refund within 7 days of payment.', expect: 'found', values: { refundWindow: '7 days' } },
    { kind: 'positive', text: 'We offer a 30-day money-back guarantee.', expect: 'found' },
    { kind: 'positive', text: 'No refunds are given for unused time.', expect: 'found', polarity: 'negated' },
    { kind: 'negative', text: 'We fund new features from subscription income.', expect: null },
    { kind: 'ambiguous', text: 'Refunds are handled case by case.', expect: 'possible' },
  ],
};
