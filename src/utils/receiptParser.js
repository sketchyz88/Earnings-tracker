const TIME_SUFFIX_PATTERN = '(?:a(?:\\.?\\s*m\\.?)?|p(?:\\.?\\s*m\\.?)?|am|pm|a|p)?';
const DATE_SEPARATOR_PATTERN = '[\\/\\-.]';

function cleanDateCandidate(rawValue) {
  return rawValue
    ?.replace(/[Oo]/g, '0')
    .replace(/[Il]/g, '1')
    .replace(/[^0-9/.\-]/g, '')
    .trim();
}

function extractFirstDate(text) {
  const match = text.match(
    new RegExp(`\\b(\\d{1,2}${DATE_SEPARATOR_PATTERN}\\d{1,2}${DATE_SEPARATOR_PATTERN}\\d{2,4})\\b`, 'i')
  );
  return match?.[1]?.trim() || '';
}

function extractMoney(rawValue) {
  if (!rawValue) {
    return null;
  }

  const normalized = rawValue.replace(/\$/g, '').replace(/,/g, '').trim();
  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function extractLabelValue(text, pattern) {
  const match = text.match(pattern);
  return match?.[1]?.trim() || '';
}

function extractFirstTime(text) {
  const match = text.match(new RegExp(`\\b(\\d{1,2}[:.]\\d{2}\\s*${TIME_SUFFIX_PATTERN})\\b`, 'i'));
  return match?.[1]?.trim() || '';
}

function buildNotes(extracted) {
  const notes = [];

  if (extracted.tabs) {
    notes.push(`Tabs: ${extracted.tabs}`);
  }

  if (extracted.guests) {
    notes.push(`Guests: ${extracted.guests}`);
  }

  return notes.join(' | ');
}

function normalizeDateForInput(rawDate) {
  if (!rawDate) {
    return undefined;
  }

  const normalized = cleanDateCandidate(rawDate);
  const parts = normalized?.split(/[\/.-]/).map((part) => part.trim()) || [];
  if (parts.length !== 3) {
    return undefined;
  }

  if (parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const [month, day, yearPart] = parts;
  const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function normalizeTimeForInput(rawTime, options = {}) {
  if (!rawTime) {
    return undefined;
  }

  const { defaultMeridiem } = options;
  const normalized = rawTime
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\b([ap])\b/g, '$1m')
    .replace(/\s+/g, ' ')
    .trim();

  const match = normalized.match(/(\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
  if (!match) {
    return undefined;
  }

  let hours = Number(match[1]);
  const minutes = match[2];
  const meridiem = match[3] || defaultMeridiem;

  if (meridiem === 'pm' && hours < 12) {
    hours += 12;
  }

  if (meridiem === 'am' && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function hasExplicitMeridiem(rawTime) {
  return /\b(?:a(?:\.?\s*m\.?)?|p(?:\.?\s*m\.?)?|am|pm)\b/i.test(rawTime || '');
}

export function parseReceiptText(text) {
  const cleanedText = text.replace(/\r/g, '');
  const topChunk = cleanedText.split('\n').slice(0, 14).join('\n');

  const rawDate = extractLabelValue(
    cleanedText,
    new RegExp(`date[\\s\\S]{0,20}?(\\d{1,2}${DATE_SEPARATOR_PATTERN}\\d{1,2}${DATE_SEPARATOR_PATTERN}\\d{2,4})`, 'i')
  ) || extractFirstDate(topChunk);
  const labeledTimePattern = new RegExp(
    `time[\\s\\S]{0,20}?(\\d{1,2}[:.]\\d{2}\\s*${TIME_SUFFIX_PATTERN})`,
    'i'
  );
  const genericTimePattern = new RegExp(
    `\\b(\\d{1,2}[:.]\\d{2}\\s*${TIME_SUFFIX_PATTERN})\\b`,
    'i'
  );
  const rawTime =
    extractLabelValue(cleanedText, labeledTimePattern) ||
    extractLabelValue(topChunk, labeledTimePattern) ||
    extractLabelValue(topChunk, genericTimePattern) ||
    extractFirstTime(topChunk);
  const normalizedEndTime = hasExplicitMeridiem(rawTime)
    ? normalizeTimeForInput(rawTime)
    : normalizeTimeForInput(rawTime, { defaultMeridiem: 'pm' });

  const extracted = {
    date: rawDate,
    time: rawTime,
    sales: extractMoney(
      extractLabelValue(
        cleanedText,
        /total\s+sales[\s\S]{0,20}?(-?\$?\d[\d,]*\.\d{2})/i
      )
    ),
    tips: extractMoney(
      extractLabelValue(
        cleanedText,
        /credit\s+tips[\s\S]{0,20}?(-?\$?\d[\d,]*\.\d{2})/i
      ) ||
        extractLabelValue(
          cleanedText,
          /total\s+tips[\s\S]{0,20}?(-?\$?\d[\d,]*\.\d{2})/i
        )
    ),
    tabs: extractLabelValue(cleanedText, /number\s+tabs[\s\S]{0,12}?(\d+)/i),
    guests: extractLabelValue(cleanedText, /number\s+guests[\s\S]{0,12}?(\d+)/i),
  };

  const summary = [];

  if (extracted.date) {
    summary.push({ label: 'Date', value: extracted.date });
  }

  if (extracted.time) {
    summary.push({ label: 'Time', value: extracted.time });
  }

  if (Number.isFinite(extracted.sales)) {
    summary.push({ label: 'Sales', value: `$${extracted.sales.toFixed(2)}` });
  }

  if (Number.isFinite(extracted.tips)) {
    summary.push({ label: 'Credit Tips', value: `$${extracted.tips.toFixed(2)}` });
  }

  if (extracted.tabs) {
    summary.push({ label: 'Tabs', value: extracted.tabs });
  }

  if (extracted.guests) {
    summary.push({ label: 'Guests', value: extracted.guests });
  }

  const notes = buildNotes(extracted);

  return {
    fields: {
      date: normalizeDateForInput(extracted.date),
      endTime: normalizedEndTime,
      sales: Number.isFinite(extracted.sales) ? extracted.sales : undefined,
      tips: Number.isFinite(extracted.tips) ? extracted.tips : undefined,
      notes: notes || undefined,
    },
    summary,
    rawText: cleanedText,
  };
}
