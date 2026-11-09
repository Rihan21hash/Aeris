/**
 * AQI utilities for AERIS.
 * Supports both US EPA AQI and Indian CPCB National AQI standards.
 */

export interface AqiCategoryInfo {
  label: string;
  color: string;
  textColor: string;
  description: string;
}

export const EPA_CATEGORIES: Array<{ min: number; max: number; label: string; color: string; textColor: string }> = [
  { min: 0, max: 50, label: 'Good', color: '#00A651', textColor: '#FFFFFF' },
  { min: 51, max: 100, label: 'Moderate', color: '#F5D000', textColor: '#202124' },
  { min: 101, max: 150, label: 'Unhealthy for Sensitive Groups', color: '#FF8C00', textColor: '#FFFFFF' },
  { min: 151, max: 200, label: 'Unhealthy', color: '#E53935', textColor: '#FFFFFF' },
  { min: 201, max: 300, label: 'Very Unhealthy', color: '#8E44AD', textColor: '#FFFFFF' },
  { min: 301, max: 500, label: 'Hazardous', color: '#7E0023', textColor: '#FFFFFF' },
];

export const CPCB_CATEGORIES: Array<{ min: number; max: number; label: string; color: string; textColor: string }> = [
  { min: 0, max: 50, label: 'Good', color: '#00A651', textColor: '#FFFFFF' },
  { min: 51, max: 100, label: 'Satisfactory', color: '#84CF33', textColor: '#202124' },
  { min: 101, max: 200, label: 'Moderate', color: '#F5D000', textColor: '#202124' },
  { min: 201, max: 300, label: 'Poor', color: '#FF8C00', textColor: '#FFFFFF' },
  { min: 301, max: 400, label: 'Very Poor', color: '#E53935', textColor: '#FFFFFF' },
  { min: 401, max: 500, label: 'Severe', color: '#7E0023', textColor: '#FFFFFF' },
];

export function getAqiCategory(value: number | null | undefined, standard: 'us_epa' | 'cpcb_naqi' = 'us_epa'): AqiCategoryInfo {
  if (value === null || value === undefined || isNaN(value)) {
    return {
      label: 'Unavailable',
      color: '#687078',
      textColor: '#FFFFFF',
      description: 'Air quality data is currently unavailable.',
    };
  }

  const table = standard === 'cpcb_naqi' ? CPCB_CATEGORIES : EPA_CATEGORIES;
  for (const cat of table) {
    if (value <= cat.max) {
      return {
        label: cat.label,
        color: cat.color,
        textColor: cat.textColor,
        description: getHealthRecommendation(value, standard),
      };
    }
  }

  const last = table[table.length - 1];
  return {
    label: last.label,
    color: last.color,
    textColor: last.textColor,
    description: getHealthRecommendation(value, standard),
  };
}

export function getAqiColor(value: number | null | undefined, standard: 'us_epa' | 'cpcb_naqi' = 'us_epa'): string {
  return getAqiCategory(value, standard).color;
}

export function getHealthRecommendation(value: number | null | undefined, standard: 'us_epa' | 'cpcb_naqi' = 'us_epa'): string {
  if (value === null || value === undefined) {
    return 'No recommendations available.';
  }

  if (standard === 'cpcb_naqi') {
    if (value <= 50) return 'Minimal impact. Normal outdoor activities.';
    if (value <= 100) return 'Minor breathing discomfort to sensitive people.';
    if (value <= 200) return 'Breathing discomfort to the people with lungs, asthma and heart diseases.';
    if (value <= 300) return 'Breathing discomfort to most people on prolonged exposure.';
    if (value <= 400) return 'Respiratory illness on prolonged exposure. Avoid strenuous outdoor activities.';
    return 'Affects healthy people and seriously impacts those with existing diseases. Avoid outdoor exposure.';
  } else {
    if (value <= 50) return 'Air quality is satisfactory and poses little or no risk.';
    if (value <= 100) return 'Air quality is acceptable. Unusually sensitive individuals should consider limiting prolonged outdoor exertion.';
    if (value <= 150) return 'Members of sensitive groups may experience health effects. General public is less likely to be affected.';
    if (value <= 200) return 'Some members of the general public may experience health effects. Sensitive groups should avoid prolonged outdoor exertion.';
    if (value <= 300) return 'Health alert: The risk of health effects is increased for everyone. Avoid prolonged outdoor exertion.';
    return 'Health warning of emergency conditions: Everyone is more likely to be affected. Avoid all outdoor physical activities.';
  }
}

export function formatAqiValue(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return Math.round(value).toString();
}

