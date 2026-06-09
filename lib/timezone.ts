import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const APP_TIME_ZONE = "America/Sao_Paulo";
export const APP_TIME_ZONE_LABEL = "Horário de Brasília";
export const APP_TIME_ZONE_SHORT = "BRT";

const LOCAL_DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm";
const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function toValidDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Data e hora inválidas.");
  }

  return date;
}

export function brasiliaLocalInputToUtcIso(value: string) {
  const localValue = value.trim();

  if (!LOCAL_DATE_TIME_PATTERN.test(localValue)) {
    throw new RangeError("Data e hora local inválidas.");
  }

  const utcDate = fromZonedTime(localValue, APP_TIME_ZONE);

  if (
    Number.isNaN(utcDate.getTime()) ||
    formatInTimeZone(utcDate, APP_TIME_ZONE, LOCAL_DATE_TIME_FORMAT) !== localValue
  ) {
    throw new RangeError("Data e hora local inválidas.");
  }

  return utcDate.toISOString();
}

export function utcIsoToBrasiliaInputValue(value: string | Date) {
  return formatInTimeZone(toValidDate(value), APP_TIME_ZONE, LOCAL_DATE_TIME_FORMAT);
}

export function formatBrasiliaTime(value: string | Date) {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(toValidDate(value));

  return `${formatted} ${APP_TIME_ZONE_SHORT}`;
}

export function formatBrasiliaDateTime(value: string | Date) {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
    hour12: false
  }).format(toValidDate(value));

  return `${formatted} ${APP_TIME_ZONE_SHORT}`;
}

export function formatBrasiliaDate(value: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIME_ZONE,
    dateStyle: "short"
  }).format(toValidDate(value));
}
