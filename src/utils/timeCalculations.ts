export interface DailyWorkHours {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

// Carga horária padrão: Seg-Sex: Diária normal, Sáb: 4h, Dom: 4h (hora extra dobrada)
export const standardWorkHours: DailyWorkHours = {
  monday: 8, // 8 horas normais
  tuesday: 8,
  wednesday: 8,
  thursday: 8,
  friday: 8,
  saturday: 4, // 4 horas, hora extra excede
  sunday: 0, // Domingo: 4h hora extra dobrada (sem carga padrão)
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

export function calculateWorkedHours(
  entryTime: string, 
  exitTime: string, 
  lunchExitTime?: string | null,
  lunchReturnTime?: string | null
): number {
  const entry = timeStringToHours(entryTime);
  const exit = timeStringToHours(exitTime);
  
  // Se tem horários de almoço registrados, usa o tempo real
  let lunchBreak = 1; // Padrão: 1 hora
  if (lunchExitTime && lunchReturnTime) {
    const lunchExit = timeStringToHours(lunchExitTime);
    const lunchReturn = timeStringToHours(lunchReturnTime);
    lunchBreak = lunchReturn - lunchExit;
  }
  
  const totalHours = exit - entry - lunchBreak;
  return Math.max(0, totalHours);
}

export function calculateLunchDiscount(
  lunchExitTime: string | null,
  lunchReturnTime: string | null,
  dailyRate: number
): number {
  if (!lunchExitTime || !lunchReturnTime) return 0;
  
  const lunchExit = timeStringToHours(lunchExitTime);
  const lunchReturn = timeStringToHours(lunchReturnTime);
  const lunchHours = lunchReturn - lunchExit;
  
  // Se almoço > 1 hora, calcular desconto dos minutos excedentes
  if (lunchHours > 1) {
    const excessHours = lunchHours - 1;
    // Assumindo jornada de 8 horas (480 minutos) para cálculo proporcional
    const hourlyRate = dailyRate / 8;
    return excessHours * hourlyRate;
  }
  
  return 0;
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
  overtimeRate: number,
  lunchDiscount: number = 0
): { dailyValue: number; overtimeValue: number; totalValue: number; lunchDiscount: number } {
  const standardHours = getStandardHoursForDay(date);
  const dayOfWeek = date.getDay();
  
  // Domingo: hora extra dobrada (sem carga padrão)
  if (dayOfWeek === 0) {
    const overtimeValue = workedHours * overtimeRate * 2; // Hora extra dobrada
    const total = overtimeValue - lunchDiscount;
    return {
      dailyValue: 0,
      overtimeValue: overtimeValue,
      totalValue: Math.max(0, total),
      lunchDiscount,
    };
  }
  
  // Sábado: 4h diária, hora extra excede
  if (dayOfWeek === 6) {
    if (workedHours <= standardHours) {
      // Até 4 horas = diária proporcional
      const hourlyRate = dailyRate / 8; // Base de cálculo em 8 horas
      const proportionalDaily = hourlyRate * workedHours;
      const total = proportionalDaily - lunchDiscount;
      return {
        dailyValue: proportionalDaily,
        overtimeValue: 0,
        totalValue: Math.max(0, total),
        lunchDiscount,
      };
    } else {
      // Acima de 4 horas = diária de 4h + hora extra excedente
      const hourlyRate = dailyRate / 8;
      const saturdayDaily = hourlyRate * 4;
      const overtimeHours = workedHours - standardHours;
      const overtimeValue = overtimeHours * overtimeRate;
      const total = saturdayDaily + overtimeValue - lunchDiscount;
      return {
        dailyValue: saturdayDaily,
        overtimeValue: overtimeValue,
        totalValue: Math.max(0, total),
        lunchDiscount,
      };
    }
  }
  
  // Segunda a Sexta: diária normal
  // Se a jornada não foi cumprida, paga proporcionalmente
  if (workedHours < standardHours) {
    const hourlyRate = dailyRate / standardHours;
    const proportionalDaily = hourlyRate * workedHours;
    const total = proportionalDaily - lunchDiscount;
    return {
      dailyValue: proportionalDaily,
      overtimeValue: 0,
      totalValue: Math.max(0, total),
      lunchDiscount,
    };
  }
  
  // Se cumpriu a jornada, paga diária integral + horas extras
  const overtimeHours = workedHours - standardHours;
  const overtimeValue = overtimeHours * overtimeRate;
  const total = dailyRate + overtimeValue - lunchDiscount;
  
  return {
    dailyValue: dailyRate,
    overtimeValue: overtimeValue,
    totalValue: Math.max(0, total),
    lunchDiscount,
  };
}