import { isValidIsoDate } from '../domain/workout';

const MAX_RANGE_DAYS = 366;

const rangeDays = (from, to) => (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;

/** @returns {string} An error message, or '' when the period can be imported. */
export const importPeriodError = (from, to, today) => {
  if (!isValidIsoDate(from) || !isValidIsoDate(to) || from > to) return 'Enter a valid date range.';
  if (to > today) return 'The end date cannot be in the future.';
  if (rangeDays(from, to) > MAX_RANGE_DAYS) return 'Choose a period of at most a year.';
  return '';
};
