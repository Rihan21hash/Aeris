/**
 * US EPA AQI utilities for AERIS.
 * High-contrast, accessible colors strictly adhering to US EPA standards.
 */

export interface AqiCategoryInfo {
  label: string;
  color: string;
  textColor: string;
  description: string;
}

export const EPA_CATEGORIES: Array<{ min: number; max: number; label: string; color: string; textColor: string }> = [
  { min: 0, max: 50, label: 'Good', color: '#00E400', textColor: '#111827' },
  { min: 51, max: 100, label: 'Moderate', color: '#FFFF00', textColor: '#111827' },
  { min: 101, max: 150, label: 'Unhealthy for Sensitive Groups', color: '#FF7E00', textColor: '#FFFFFF' },
  { min: 151, max: 200, label: 'Unhealthy', color: '#FF0000', textColor: '#FFFFFF' },
  { min: 201, max: 300, label: 'Very Unhealthy', color: '#8F3F97', textColor: '#FFFFFF' },
  { min: 301, max: 500, label: 'Hazardous', color: '#7E0023', textColor: '#FFFFFF' },
];

/** Official US EPA AQI color scale for card tinting */
export const EPA_COLORS: Array<{ min: number; max: number; color: string; bg: string; border: string }> = [
  { min: 0, max: 50, color: '#00E400', bg: 'rgba(0, 228, 0, 0.08)', border: 'rgba(0, 228, 0, 0.25)' },
  { min: 51, max: 100, color: '#FFFF00', bg: 'rgba(255, 255, 0, 0.08)', border: 'rgba(255, 255, 0, 0.3)' },
  { min: 101, max: 150, color: '#FF7E00', bg: 'rgba(255, 126, 0, 0.08)', border: 'rgba(255, 126, 0, 0.3)' },
  { min: 151, max: 200, color: '#FF0000', bg: 'rgba(255, 0, 0, 0.07)', border: 'rgba(255, 0, 0, 0.25)' },
  { min: 201, max: 300, color: '#8F3F97', bg: 'rgba(143, 63, 151, 0.07)', border: 'rgba(143, 63, 151, 0.25)' },
  { min: 301, max: 500, color: '#7E0023', bg: 'rgba(126, 0, 35, 0.07)', border: 'rgba(126, 0, 35, 0.25)' },
];

/** Get the dynamic card colors for a given US EPA AQI value */
export function getAqiCardColors(
  value: number | null | undefined,
  _standard?: string
): { color: string; bg: string; border: string; numberColor: string } {
  const neutral = { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB', numberColor: '#6B7280' };
  if (value === null || value === undefined || isNaN(value)) return neutral;

  for (const row of EPA_COLORS) {
    if (value <= row.max) {
      // For Yellow range, use dark readable text
      const needsDarkText = row.color === '#FFFF00';
      return {
        color: row.color,
        bg: row.bg,
        border: row.border,
        numberColor: needsDarkText ? '#78650A' : row.color,
      };
    }
  }
  const last = EPA_COLORS[EPA_COLORS.length - 1];
  return { color: last.color, bg: last.bg, border: last.border, numberColor: last.color };
}

export function getAqiCategory(value: number | null | undefined, _standard?: string): AqiCategoryInfo {
  if (value === null || value === undefined || isNaN(value)) {
    return {
      label: 'Unavailable',
      color: '#6B7280',
      textColor: '#FFFFFF',
      description: 'Air quality data is currently unavailable.',
    };
  }

  for (const cat of EPA_CATEGORIES) {
    if (value <= cat.max) {
      return {
        label: cat.label,
        color: cat.color,
        textColor: cat.textColor,
        description: getHealthRecommendation(value),
      };
    }
  }

  const last = EPA_CATEGORIES[EPA_CATEGORIES.length - 1];
  return {
    label: last.label,
    color: last.color,
    textColor: last.textColor,
    description: getHealthRecommendation(value),
  };
}

export function getAqiColor(value: number | null | undefined, _standard?: string): string {
  return getAqiCategory(value).color;
}

export function getHealthRecommendation(value: number | null | undefined, _standard?: string): string {
  if (value === null || value === undefined) {
    return 'No recommendations available.';
  }

  if (value <= 50) return 'Air quality is satisfactory and poses little or no risk.';
  if (value <= 100) return 'Air quality is acceptable. Unusually sensitive individuals should consider limiting prolonged outdoor exertion.';
  if (value <= 150) return 'Members of sensitive groups may experience health effects. General public is less likely to be affected.';
  if (value <= 200) return 'Some members of the general public may experience health effects. Sensitive groups should avoid prolonged outdoor exertion.';
  if (value <= 300) return 'Health alert: The risk of health effects is increased for everyone. Avoid prolonged outdoor exertion.';
  return 'Health warning of emergency conditions: Everyone is more likely to be affected. Avoid all outdoor physical activities.';
}

export function formatAqiValue(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return Math.round(value).toString();
}
