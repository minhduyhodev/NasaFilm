import { useEffect } from 'react';
import { checkDueReminders } from '../utils/movieReminderUtils';

const CHECK_INTERVAL_MS = 60_000;

export const useMovieReminderScheduler = () => {
  useEffect(() => {
    checkDueReminders();
    const timerId = window.setInterval(checkDueReminders, CHECK_INTERVAL_MS);
    return () => window.clearInterval(timerId);
  }, []);
};

export default useMovieReminderScheduler;
