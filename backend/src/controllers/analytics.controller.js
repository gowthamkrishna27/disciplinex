import { checkFallback } from '../config/db.js';
import Task from '../models/Task.js';
import { JsonDb } from '../models/fallback/jsonDb.js';

// Utility to calculate task duration in hours
const getTaskDuration = (startTime, endTime) => {
  try {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    
    let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (diffMinutes < 0) {
      // Handle overnight tasks (e.g. 23:00 to 01:00 is 120 mins)
      diffMinutes += 24 * 60;
    }
    return Number((diffMinutes / 60).toFixed(2));
  } catch (error) {
    return 0;
  }
};

// Get the date strings for the last N days
const getLastNDays = (n) => {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
};

// Categorize start time into times-of-day
const getTimeOfDayCategory = (startTime) => {
  const hour = parseInt(startTime.split(':')[0], 10);
  if (hour >= 5 && hour < 12) return 'Morning (5AM-12PM)';
  if (hour >= 12 && hour < 17) return 'Afternoon (12PM-5PM)';
  if (hour >= 17 && hour < 22) return 'Evening (5PM-10PM)';
  return 'Night (10PM-5AM)';
};

export const getAnalyticsSummary = async (req, res) => {
  try {
    const isFallback = checkFallback();
    let allTasks = [];

    if (isFallback) {
      allTasks = JsonDb.findTasksByUser(req.user.id);
    } else {
      allTasks = await Task.find({ user: req.user.id });
    }

    if (allTasks.length === 0) {
      return res.json({
        totalTasks: 0,
        completedTasks: 0,
        missedTasks: 0,
        inProgressTasks: 0,
        productivityScore: 0,
        totalCompletedHours: 0,
        currentStreak: 0,
        longestStreak: 0,
        weeklyConsistency: [],
        productiveHoursChart: [],
        categoryBreakdown: [],
        mostProductiveTime: 'N/A'
      });
    }

    // 1. High level aggregates
    const completedTasks = allTasks.filter(t => t.status === 'Completed');
    const missedTasks = allTasks.filter(t => t.status === 'Missed');
    const inProgressTasks = allTasks.filter(t => t.status === 'In Progress');
    const totalTasksCount = allTasks.length;
    
    // Calculate total completed hours
    let totalCompletedHours = 0;
    completedTasks.forEach(t => {
      totalCompletedHours += getTaskDuration(t.startTime, t.endTime);
    });
    totalCompletedHours = Number(totalCompletedHours.toFixed(1));

    // Productivity Score = (Completed / (Completed + Missed + In Progress + Not Started)) * 100
    const productivityScore = totalTasksCount > 0 
      ? Math.round((completedTasks.length / totalTasksCount) * 100) 
      : 0;

    // 2. Weekly Consistency & Productive Hours (Last 7 Days)
    const last7Days = getLastNDays(7);
    const weeklyConsistency = [];
    const productiveHoursChart = [];

    last7Days.forEach(dateStr => {
      const dayTasks = allTasks.filter(t => t.date === dateStr);
      const dayCompleted = dayTasks.filter(t => t.status === 'Completed');
      
      // Calculate completion score
      const score = dayTasks.length > 0 
        ? Math.round((dayCompleted.length / dayTasks.length) * 100)
        : 0;

      // Calculate completed hours
      let hours = 0;
      dayCompleted.forEach(t => {
        hours += getTaskDuration(t.startTime, t.endTime);
      });
      hours = Number(hours.toFixed(1));

      // Day name (e.g. "Mon")
      const dayName = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });

      weeklyConsistency.push({
        date: dateStr,
        day: dayName,
        percentage: score,
        tasksCount: dayTasks.length
      });

      productiveHoursChart.push({
        date: dateStr,
        day: dayName,
        hours: hours
      });
    });

    // 3. Category Breakdown
    const categories = ['Work', 'Study', 'Health', 'Personal', 'Routine'];
    const categoryBreakdown = categories.map(cat => {
      const catTasks = allTasks.filter(t => t.category === cat);
      const catCompleted = catTasks.filter(t => t.status === 'Completed');
      return {
        name: cat,
        value: catTasks.length,
        completed: catCompleted.length,
        percentage: catTasks.length > 0 ? Math.round((catCompleted.length / catTasks.length) * 100) : 0
      };
    }).filter(c => c.value > 0);

    // 4. Most Productive Timing
    const timeOfDayCounts = {};
    completedTasks.forEach(t => {
      const cat = getTimeOfDayCategory(t.startTime);
      timeOfDayCounts[cat] = (timeOfDayCounts[cat] || 0) + 1;
    });

    let mostProductiveTime = 'N/A';
    let maxCompletions = 0;
    Object.entries(timeOfDayCounts).forEach(([timeCat, count]) => {
      if (count > maxCompletions) {
        maxCompletions = count;
        mostProductiveTime = timeCat;
      }
    });

    // 5. Streak Counter
    // A successful day is defined as a day with at least 1 task AND productivity percentage >= 75%
    // Let's analyze all distinct dates in descending order
    const distinctDatesWithTasks = [...new Set(allTasks.map(t => t.date))].sort((a, b) => b.localeCompare(a));
    
    // Helper to check if a date succeeded
    const isSuccessfulDay = (dateStr) => {
      const dayTasks = allTasks.filter(t => t.date === dateStr);
      if (dayTasks.length === 0) return false;
      const dayCompleted = dayTasks.filter(t => t.status === 'Completed');
      const score = (dayCompleted.length / dayTasks.length) * 100;
      return score >= 75; // 75% threshold for streak consistency
    };

    // Calculate Current Streak
    let currentStreak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // If today had tasks and succeeded, start check from today.
    // If today has no tasks or hasn't succeeded yet, check yesterday. If yesterday succeeded, streak is maintained.
    let streakDateStr = todayStr;
    const todayTasks = allTasks.filter(t => t.date === todayStr);

    if (todayTasks.length === 0 || !isSuccessfulDay(todayStr)) {
      // If yesterday didn't succeed either, streak is 0 unless today succeeded.
      streakDateStr = yesterdayStr;
    }

    let checkingDate = new Date(streakDateStr);
    while (true) {
      const checkingStr = checkingDate.toISOString().split('T')[0];
      
      // If this checking day has tasks, verify success
      const dayTasks = allTasks.filter(t => t.date === checkingStr);
      if (dayTasks.length > 0) {
        if (isSuccessfulDay(checkingStr)) {
          currentStreak++;
        } else {
          break; // Streak broken
        }
      } else {
        // If checking date is prior to the user's first task ever, break.
        // Otherwise, if they just had an empty day, it breaks the streak (routine requires consistency!).
        const earliestTask = allTasks.reduce((min, t) => t.date < min ? t.date : min, todayStr);
        if (checkingStr < earliestTask) {
          break;
        } else {
          break; // Empty day breaks streak
        }
      }
      // Go to previous day
      checkingDate.setDate(checkingDate.getDate() - 1);
    }

    // Calculate Longest Streak in history
    let longestStreak = 0;
    let tempStreak = 0;
    
    // Sort all dates chronologically
    const chronologicalDates = [...distinctDatesWithTasks].sort((a, b) => a.localeCompare(b));
    
    if (chronologicalDates.length > 0) {
      let lastCheckedDate = null;
      
      for (const dateStr of chronologicalDates) {
        const succeeded = isSuccessfulDay(dateStr);
        
        if (succeeded) {
          if (lastCheckedDate) {
            // Check if this date is exactly 1 day after the lastCheckedDate
            const diffTime = Math.abs(new Date(dateStr) - new Date(lastCheckedDate));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 1) {
              tempStreak++;
            } else {
              tempStreak = 1; // Empty days between broke it, reset to 1
            }
          } else {
            tempStreak = 1;
          }
          lastCheckedDate = dateStr;
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
        } else {
          tempStreak = 0;
          lastCheckedDate = null;
        }
      }
    }

    res.json({
      totalTasks: totalTasksCount,
      completedTasks: completedTasks.length,
      missedTasks: missedTasks.length,
      inProgressTasks: inProgressTasks.length,
      productivityScore,
      totalCompletedHours,
      currentStreak,
      longestStreak,
      weeklyConsistency,
      productiveHoursChart,
      categoryBreakdown,
      mostProductiveTime
    });

  } catch (error) {
    console.error('[Analytics Controller] Compilation Error:', error);
    res.status(500).json({ message: 'Server error generating analytics', error: error.message });
  }
};
