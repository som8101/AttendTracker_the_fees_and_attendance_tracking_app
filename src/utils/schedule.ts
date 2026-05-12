import { ClassModel } from '../database/queries';
import { parse } from 'date-fns';

type ScheduleItem = {
  day: number;
  startTime: string; // '9:00 AM'
  endTime: string;   // '10:00 AM'
};

export function parseTime(timeStr: string): number {
  try {
    const [time, period] = timeStr.trim().split(/\s+/);
    let [hours, minutes] = time.split(':').map(Number);
    if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  } catch (e) {
    // fallback
    const date = parse(timeStr, 'h:mm a', new Date());
    return date.getHours() * 60 + date.getMinutes();
  }
}

export function checkScheduleOverlap(
  newSchedule: ScheduleItem[],
  existingClasses: ClassModel[],
  excludeClassId?: string
): string | null {
  // Validate new schedule times
  for (const item of newSchedule) {
    const start = parseTime(item.startTime);
    const end = parseTime(item.endTime);
    if (end <= start) {
      return `Invalid time range: ${item.startTime} to ${item.endTime}. End time must be after start time.`;
    }
  }

  for (const cls of existingClasses) {
    if (cls.id === excludeClassId) continue;
    if (!cls.weekly_schedule) continue;

    try {
      const clsSchedule: ScheduleItem[] = JSON.parse(cls.weekly_schedule);
      
      for (const newItem of newSchedule) {
        for (const existingItem of clsSchedule) {
          if (newItem.day === existingItem.day) {
            const newStart = parseTime(newItem.startTime);
            const newEnd = parseTime(newItem.endTime);
            const existStart = parseTime(existingItem.startTime);
            const existEnd = parseTime(existingItem.endTime);

            // Overlap condition:
            // Note: This logic assumes no cross-midnight ranges.
            if (newStart < existEnd && newEnd > existStart) {
              const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              return `Clash on ${days[newItem.day]}!\n"${cls.name}" is scheduled from ${existingItem.startTime} to ${existingItem.endTime}, which overlaps with your selected ${newItem.startTime} - ${newItem.endTime}.`;
            }
          }
        }
      }
    } catch (e) {
      continue;
    }
  }

  return null; // No overlap
}
