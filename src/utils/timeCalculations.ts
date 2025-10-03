export interface DailyWorkHours {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

// Carga horária padrão: Seg-Qui: 8h48min, Sex: 7h48min, Sáb: 4h, Dom: 0h
export const standardWorkHours: DailyWorkHours = {
  monday: 8.8, // 8h48min = 8.8h
  tuesday: 8.8,
  wednesday: 8.8,
  thursday: 8.8,
  friday: 7.8, // 7h48min = 7.8h (aproximadamente)
  saturday: 4,
  sunday: 0,
};

export function timeStringToHours(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours + minutes / 60;
}

export function hoursToTimeString(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function calculateWorkedHours(entryTime: string, exitTime: string, lunchBreak: number = 1): number {
  const entry = timeStringToHours(entryTime);
  const exit = timeStringToHours(exitTime);
  const totalHours = exit - entry - lunchBreak;
  return Math.max(0, totalHours);
}

export function getStandardHoursForDay(date: Date): number {
  const dayOfWeek = date.getDay(); // 0 = domingo, 1 = segunda, etc.
  
  switch (dayOfWeek) {
    case 1: return standardWorkHours.monday;
    case 2: return standardWorkHours.tuesday;
    case 3: return standardWorkHours.wednesday;
    case 4: return standardWorkHours.thursday;
    case 5: return standardWorkHours.friday;
    case 6: return standardWorkHours.saturday;
    case 0: return standardWorkHours.sunday;
    default: return 0;
  }
}

export function calculateDailyAndOvertimeValues(
  workedHours: number,
  date: Date,
  dailyRate: number,
  overtimeRate: number
): { dailyValue: number; overtimeValue: number; totalValue: number } {
  const standardHours = getStandardHoursForDay(date);
  
  // Se a jornada não foi cumprida, paga proporcionalmente
  if (workedHours < standardHours) {
    const proportionalDaily = (workedHours / standardHours) * dailyRate;
    return {
      dailyValue: proportionalDaily,
      overtimeValue: 0,
      totalValue: proportionalDaily,
    };
  }
  
  // Se cumpriu a jornada
  const overtimeHours = workedHours - standardHours;
  const overtimeValue = overtimeHours * overtimeRate;
  
  return {
    dailyValue: dailyRate,
    overtimeValue: overtimeValue,
    totalValue: dailyRate + overtimeValue,
  };
}