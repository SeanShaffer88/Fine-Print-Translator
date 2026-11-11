// Rule set for English-language consumer subscription terms.
//
// Each rule is data: labelled patterns tested against one sentence.
//   trigger     at least one must match for the rule to apply
//   supporting  if any match, the result is "found"; otherwise "possible"
//   exclusion   if any match, the rule does not apply to that sentence
//   negation    wording saying the term does NOT apply; reported as "found"
//               with polarity "negated" (see docs/status-definitions.md)
//   maxStatus   caps a deliberately weak rule at "possible"
//   extract     candidate values, never authoritative
//
// A match is a pointer to wording, not a legal conclusion.
// Bump RULESET_VERSION whenever a pattern, rule, or extractor changes.

export const RULESET_VERSION = '0.1.0';

export const CATEGORIES = [
  { id: 'trial', label: 'Trial and conversion' },
  { id: 'renewal', label: 'Renewal' },
  { id: 'price', label: 'Price and fees' },
  { id: 'cancellation', label: 'Cancellation' },
  { id: 'refund', label: 'Refunds' },
];

export const VALUE_LABELS = {
  trialLength: 'Trial length',
  period: 'Period',
  amount: 'Amount',
  noticePeriod: 'Notice period',
  refundWindow: 'Refund window',
};

const WORD_NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, six: 6, twelve: 12 };
const num = (s) => WORD_NUM[s.toLowerCase()] ?? Number(s);
const span = (n, unit) => `${n} ${unit.toLowerCase()}${n === 1 ? '' : 's'}`;

function period(t) {
  let m = /\b(?:every|each|per|a)\s+(day|week|month|year)\b/i.exec(t);
  if (m) return span(1, m[1]);
  if (/\bmonthly\b/i.test(t)) return '1 month';
  if (/\b(annual(ly)?|yearly)\b/i.test(t)) return '1 year';
  if (/\bquarterly\b/i.test(t)) return '3 months';
  if (/\bweekly\b/i.test(t)) return '1 week';
  m = /\b(\d+|one|two|three|six|twelve)[- ]?(day|week|month|year)s?\b/i.exec(t);
  return m ? span(num(m[1]), m[2]) : undefined;
}
const amount = (t) => /[$£€]\s?\d[\d,]*(?:\.\d{1,2})?/.exec(t)?.[0].replace(/\s/g, '');
function noticePeriod(t) {
  const m =
    /\b(\d+)\s*(day|week|month)s?['’]?\s*(?:prior\s+|advance\s+|written\s+)*notice\b/i.exec(t) ||
    /\bnotice\s+of\s+(?:at\s+least\s+)?(\d+)\s*(day|week|month)s?\b/i.exec(t);
  return m ? span(Number(m[1]), m[2]) : undefined;
}
function trialLength(t) {
  const m =
    /\b(\d+|one|two|three)[- ]?(day|week|month)s?\s+(?:free\s+)?trial\b/i.exec(t) ||
    /\btrial\b[^.]{0,40}?\b(?:of|for|lasts?)\s+(\d+|one|two|three)\s+(day|week|month)s?\b/i.exec(t);
  return m ? span(num(m[1]), m[2]) : undefined;
}
function refundWindow(t) {
  const m = /\bwithin\s+(\d+)\s+(day|week|month)s?\b/i.exec(t);
  return m ? span(Number(m[1]), m[2]) : undefined;
}
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

const INTERVAL =
  /\b(month|year|week|day)s?\b|\b(monthly|annual(ly)?|yearly|quarterly|weekly)\b/i;
const CURRENCY = /[$£€]\s?\d/;

export const RULES = [
  {
    id: 'trial.conversion',
    category: 'trial',
    explanation: 'Mentions a trial or introductory period.',
    trigger: [
      ['trial wording', /\bfree[- ]trial\b|\btrial (period|offer|subscription|membership)\b|\b(the|your) trial (ends?|expires?|is over|converts?)\b|\b(end of|during|after) (the|your) trial\b|\b\d+[- ]?(day|week|month)s? trial\b/i],
      ['introductory period wording', /\bintroductory (period|offer|price|rate)\b|\bpromotional period\b/i],
    ],
    supporting: [
      ['a trial length', /\b(\d+|one|two|three)[- ]?(day|week|month)s?\s+(free\s+)?trial\b|\btrial\b[^.]{0,40}\b(\d+|one|two|three)\s+(day|week|month)s?\b/i],
      ['conversion or charging wording', /\bconvert(s|ed)?\b|\bpaid (subscription|membership|plan)\b|\b(will|be) (charged|billed)\b|\b(begin|start)s? (charging|billing)\b/i],
    ],
    negation: [
      ['wording that there is no trial', /\bno free[- ]trial\b|\b(not|without) (include|offer|provide)?s?\s*(a|any) (free[- ])?trial\b|\bno trial (period|is)\b/i],
    ],
    exclusion: [['"trial and error"', /\btrial and error\b/i]],
    extract: (t) => clean({ trialLength: trialLength(t) }),
  },
  {
    id: 'renewal.automatic',
    category: 'renewal',
    explanation: 'Uses automatic-renewal wording.',
    trigger: [
      ['automatic renewal wording', /\bautomatic(ally)?[- ]renew|\brenew(s|ed)? automatically\b|\bauto[- ]?renew|\bautomatic renewal\b/i],
    ],
    supporting: [['a renewal period or interval', INTERVAL]],
    negation: [
      ['wording that it does not renew automatically', /\b(does not|do not|will not|shall not|won't|doesn't|don't|never)\s+(be\s+)?(automatically\s+)?(auto[- ]?)?renew|\bno automatic renewal\b|\bnot automatically renew/i],
    ],
    extract: (t) => clean({ period: period(t) }),
  },
  {
    id: 'renewal.continuation',
    category: 'renewal',
    maxStatus: 'possible',
    explanation:
      'Mentions renewal or continuation without clear automatic-renewal wording.',
    trigger: [
      ['renewal wording', /\brenew(s|ed|al|als|ing)?\b(?! date)/i],
      ['continuation wording', /\b(continue[sd]?|extend(s|ed)?|rolls? over)\b[^.]{0,60}\b(term|period)\b/i],
    ],
    negation: [
      ['wording that it does not renew', /\b(does not|do not|will not|shall not|won't|doesn't|don't|never)\s+(be\s+)?renew/i],
    ],
    exclusion: [['renewal of something other than a plan', /\brenew(s|ed|al|ing)?\s+(your|the|a)?\s*(password|licen[cs]e|passport|certificate|domain)\b/i]],
  },
  {
    id: 'price.amount',
    category: 'price',
    explanation: 'Mentions a price, fee, or charge.',
    trigger: [
      ['price or fee wording', /\b(fee|fees|price|prices|pricing|charge|charges|charged|cost|costs|billed)\b/i],
      ['a currency amount', CURRENCY],
    ],
    supporting: [['a currency amount', CURRENCY]],
    exclusion: [['refund wording (handled by the refund rules)', /\brefund|non-?refundable\b/i]],
    extract: (t) => clean({ amount: amount(t), period: amount(t) ? period(t) : undefined }),
  },
  {
    id: 'price.change',
    category: 'price',
    explanation: 'Mentions that prices or fees may change.',
    trigger: [
      ['price-change wording', /\b(change|increase|adjust|raise|modify|revise)s?\b[^.]{0,40}\b(fee|fees|price|prices|pricing|charge|charges|rate|rates)\b|\b(fee|fees|price|prices|pricing|charge|charges|rate|rates)\b[^.]{0,40}\b(may|can|will|might)\s+(change|increase|vary|be (adjusted|revised|increased))\b|\bprice (change|increase)s?\b/i],
    ],
    supporting: [['notice wording', /\bnotice\b|\bnotify\b|\bin advance\b/i]],
    exclusion: [['refund wording (handled by the refund rules)', /\brefund|non-?refundable\b/i]],
  },
  {
    id: 'cancellation.terms',
    category: 'cancellation',
    explanation: 'Mentions cancelling or terminating.',
    trigger: [
      ['cancellation wording', /\bcancel(s|led|ed|ling|ing|lation|ation)?\b/i],
      ['termination wording', /\bterminat(e|es|ed|ing|ion)\b[^.]{0,30}\b(subscription|membership|plan|agreement|account)\b/i],
    ],
    supporting: [
      ['a notice period', /\b\d+\s*(day|week|month)s?['’]?\s*(prior\s+|advance\s+|written\s+)*notice\b|\bnotice\s+of\s+(at\s+least\s+)?\d+/i],
      ['a cancellation method', /\b(in|through|via|from|on)\s+(the|your)?\s*[A-Z][\w ]{0,30}?(Settings|page|Page|dashboard|Dashboard|app|website)\b|\bby (email|e-mail|phone|post|mail|writing|contacting|calling|emailing|logging)\b|\bwritten notice\b|\bcontact(ing)? (us|customer|support|our)\b/],
      ['"at any time"', /\bat any time\b/i],
      ['when cancellation takes effect', /\b(takes?|will take) effect\b|\beffective\b/i],
    ],
    negation: [
      ['wording that cancellation is not available', /\b(cannot|can't|may not|not able to|unable to)\s+(be\s+)?cancel|\bnon-?cancell?able\b/i],
    ],
    exclusion: [
      ['a passing reference ("unless/until you cancel")', /\b(unless|until)\s+(you\s+)?cancel/i],
      ['cancelling something other than a plan', /\bcancel(s|led|ed|ling|ing)?\s+(a|an|the|your|any)?\s*(pending\s+)?(upload|download|order|request|booking|reservation|appointment|transfer|print job)\b/i],
    ],
    extract: (t) => clean({ noticePeriod: noticePeriod(t) }),
  },
  {
    id: 'cancellation.indirect',
    category: 'cancellation',
    maxStatus: 'possible',
    explanation: 'May describe ending the service without using the word "cancel".',
    trigger: [
      ['wording about stopping or ending the service', /\bstop using the service\b|\b(end|ending|discontinue|discontinuing)\s+(your|the)\s+(plan|subscription|membership|service)\b|\bopt out of (renewal|the service)\b/i],
    ],
  },
  {
    id: 'refund.terms',
    category: 'refund',
    explanation: 'Mentions refunds.',
    trigger: [
      ['refund wording', /\brefund(s|ed|able)?\b|\bnon-?refundable\b|\bmoney[- ]back\b|\breimburs(e|ed|ement|ements)\b/i],
    ],
    supporting: [
      ['a time window', /\bwithin\s+\d+\s+(day|week|month)s?\b/i],
      ['refund entitlement wording', /\bfull refund\b|\bpro-?rated\b|\bmoney[- ]back guarantee\b|\b(request|receive|entitled to|eligible for|issue|provide)\s+(a|an|any)\s+(\w+\s+)?refund\b/i],
    ],
    negation: [
      ['wording that refunds are not given', /\bnon-?refundable\b|\bnot refundable\b|\bno refunds?\b|\b(not|never)\s+(be\s+)?(provide|offer|issue|give|entitled to|eligible for)\s*(any|a)?\s*refunds?\b/i],
    ],
    extract: (t) => clean({ refundWindow: refundWindow(t) }),
  },
];
