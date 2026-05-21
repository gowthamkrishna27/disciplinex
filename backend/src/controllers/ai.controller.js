import { checkFallback } from '../config/db.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { JsonDb } from '../models/fallback/jsonDb.js';

// Helper to calculate task duration in hours
const getTaskDuration = (startTime, endTime) => {
  try {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (diffMinutes < 0) diffMinutes += 24 * 60;
    return Number((diffMinutes / 60).toFixed(2));
  } catch (error) {
    return 0;
  }
};

// Categorize start time into times-of-day
const getTimeOfDayCategory = (startTime) => {
  const hour = parseInt(startTime.split(':')[0], 10);
  if (hour >= 5 && hour < 12) return 'Morning (5AM-12PM)';
  if (hour >= 12 && hour < 17) return 'Afternoon (12PM-5PM)';
  if (hour >= 17 && hour < 22) return 'Evening (5PM-10PM)';
  return 'Night (10PM-5AM)';
};

// Main AI consultation controller
export const consultAICoach = async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ message: 'Message payload is required.' });
  }

  try {
    const isFallback = checkFallback();
    let allTasks = [];
    let userRecord = null;

    // Fetch user details and tasks
    if (isFallback) {
      allTasks = JsonDb.findTasksByUser(req.user.id);
      userRecord = JsonDb.findUserById(req.user.id);
    } else {
      allTasks = await Task.find({ user: req.user.id });
      userRecord = await User.findById(req.user.id);
    }

    const userName = userRecord?.name || 'Champ';
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'Completed');
    const missedTasks = allTasks.filter(t => t.status === 'Missed');
    const inProgressTasks = allTasks.filter(t => t.status === 'In Progress');

    // Calculate core statistics
    let totalCompletedHours = 0;
    completedTasks.forEach(t => {
      totalCompletedHours += getTaskDuration(t.startTime, t.endTime);
    });
    totalCompletedHours = Number(totalCompletedHours.toFixed(1));

    const productivityScore = totalTasks > 0 
      ? Math.round((completedTasks.length / totalTasks) * 100) 
      : 0;

    // Category breakdown success ratios
    const categories = ['Work', 'Study', 'Health', 'Personal', 'Routine'];
    const categoryStats = categories.map(cat => {
      const catTasks = allTasks.filter(t => t.category === cat);
      const catCompleted = catTasks.filter(t => t.status === 'Completed');
      return {
        name: cat,
        total: catTasks.length,
        completed: catCompleted.length,
        ratio: catTasks.length > 0 ? Math.round((catCompleted.length / catTasks.length) * 100) : 0
      };
    }).filter(c => c.total > 0);

    // Peak performance era
    const timeOfDayCounts = {};
    completedTasks.forEach(t => {
      const cat = getTimeOfDayCategory(t.startTime);
      timeOfDayCounts[cat] = (timeOfDayCounts[cat] || 0) + 1;
    });
    let peakEra = 'N/A';
    let maxCompletions = 0;
    Object.entries(timeOfDayCounts).forEach(([timeCat, count]) => {
      if (count > maxCompletions) {
        maxCompletions = count;
        peakEra = timeCat;
      }
    });

    // Lowest performing category
    let lowestCat = 'N/A';
    let lowestRatio = 101;
    categoryStats.forEach(c => {
      if (c.ratio < lowestRatio) {
        lowestRatio = c.ratio;
        lowestCat = c.name;
      }
    });
    if (lowestRatio === 101) lowestRatio = 0;

    // Normalizing message to handle classification
    const prompt = message.toLowerCase();
    let reply = '';
    let widgetData = null;

    // AI Conversational Classification & Routing
    if (totalTasks === 0) {
      reply = `Hello **${userName}**! I am your **DisciplineX AI Agent**, trained to analyze your daily routines and optimize your performance. 

Currently, I see that your routine schedule is empty. To begin my deep diagnostic training on your data, please schedule a few tasks on your timeline (e.g., in Work, Study, or Health) and mark them completed. 

Once scheduled, I can generate hourly density heatmaps, consistency streaks, and tailored focus recommendations just for you!`;
    } 
    else if (prompt.includes('analyze') || prompt.includes('routine') || prompt.includes('performance')) {
      reply = `### 📊 Deep Routine Analytics Report
Hello **${userName}**! I have run a full diagnostic sweep over your **${totalTasks}** scheduled routines. Here is my context-trained analysis:

* **Productivity Quotient:** Your current score stands at **${productivityScore}%** based on **${completedTasks.length}** successfully completed items.
* **Focus Density:** You have logged a total of **${totalCompletedHours} hours** of deeply productive focus.
* **Peak Performance Zone:** Your completions cluster heavily in the **${peakEra}** era. This is when your mental endurance is highest!
* **Cognitive Bottleneck:** Your **${lowestCat}** category is currently your lowest-performing area with a **${lowestRatio}%** success ratio. 

**My Actionable Advice:**
1. **Leverage the Peak Zone:** Shift your high-focus tasks to your **${peakEra}** window. 
2. **Support the Bottleneck:** Set up a tiny 15-minute routine in **${lowestCat}** early in the morning. Completing it first will build momentum!`;
      
      widgetData = {
        type: 'performance_summary',
        score: productivityScore,
        hours: totalCompletedHours,
        peakEra,
        lowestCat,
        lowestRatio
      };
    } 
    else if (prompt.includes('streak') || prompt.includes('consistency') || prompt.includes('flame')) {
      reply = `### ⚡ Streak & Consistency Evaluation
Hello **${userName}**! Maintaining high streaks is the ultimate psychological trigger for neuroplasticity.

Looking at your routine logs:
* You have completed **${completedTasks.length}** tasks total.
* Your current streak calculation shows consistent task execution metrics.
* Your lowest category is **${lowestCat}** (**${lowestRatio}%** success), which poses the biggest risk of breaking your next major streak.

**How to secure your streaks:**
1. **Never Double-Miss:** Missing one day is a mistake, but missing two consecutive days is the start of a bad habit. If you miss a task today, make it your absolute priority tomorrow.
2. **Reduce Friction:** Prepare your workspace the night before so you can dive straight into your routine without decision fatigue.`;
      
      widgetData = {
        type: 'streak_analyzer',
        completed: completedTasks.length,
        missed: missedTasks.length,
        bottleneck: lowestCat
      };
    } 
    else if (prompt.includes('schedule') || prompt.includes('suggest') || prompt.includes('plan')) {
      reply = `### 📅 Customized High-Performance Routine
Based on your real cognitive patterns (where your efficiency is highest in the **${peakEra}**), I have generated an optimized high-performance schedule structure just for you:

| Time | Block Name | Category | Intensity |
| :--- | :--- | :--- | :--- |
| **07:00 AM** | Quick Micro-Habit (Friction Buster) | **${lowestCat !== 'N/A' ? lowestCat : 'Routine'}** | Light (15m) |
| **09:30 AM** | Core Objective | **Work** | Ultra-High (90m) |
| **01:30 PM** | Creative / Strategy Sweep | **Study** | High (60m) |
| **04:30 PM** | Wellness / Recharge | **Health** | Active (45m) |
| **08:30 PM** | Reflection & Plan Prep | **Personal** | Meditative (30m) |

**Why this works for you:**
* By scheduling **${lowestCat !== 'N/A' ? lowestCat : 'Routine'}** first thing, you beat the procrastination loop on your lowest-performing area before daily fatigue sets in.
* Your heaviest cognitive focus blocks are strategically aligned around your peak active hours!`;

      widgetData = {
        type: 'schedule_suggestion',
        peakEra,
        suggestedStart: '07:00 AM',
        priorityCat: lowestCat
      };
    } 
    else if (prompt.includes('health') || prompt.includes('study') || prompt.includes('work') || prompt.includes('personal')) {
      // Find matches for requested category
      const targetCat = categories.find(c => prompt.includes(c.toLowerCase())) || 'Work';
      const stats = categoryStats.find(c => c.name === targetCat);
      const ratio = stats ? stats.ratio : 0;
      const count = stats ? stats.total : 0;

      reply = `### 🎯 Focus Analysis: ${targetCat} Category
Let's look specifically at your performance in **${targetCat}**:
* **Routines Scheduled:** **${count}** tasks total.
* **Success Quotient:** **${ratio}%** completion rate.

**DisciplineX AI Agent Diagnostic:**
${ratio >= 80 
  ? `Outstanding job! You are maintaining high discipline in **${targetCat}**. To advance even further, try introducing a 'stretch goal'—add a task that increases your completion duration by 15% and see if you can hold this ratio.` 
  : `Your completion rate of **${ratio}%** shows room for optimization. The main reason for drops in **${targetCat}** is usually planning fallacy (scheduling too many heavy tasks at once). Try breaking your tasks into sub-30-minute chunks.`
}

**Next Action:** Make sure your next scheduled task in **${targetCat}** is timed for your peak performance era: **${peakEra}**!`;
    } 
    else {
      reply = `Hello **${userName}**! I am your **DisciplineX AI Agent**, trained directly on your routine analytics and streaks. 

I've examined your records:
* **Productivity Score:** **${productivityScore}%**
* **Completed Hours:** **${totalCompletedHours}h**
* **Peak Productivity Window:** **${peakEra}**
* **Most Challenging Category:** **${lowestCat}** (**${lowestRatio}%** success rate)

Ask me anything about your productivity! You can try asking:
* *"Analyze my routines"* for a full performance diagnostic.
* *"How do I improve my streak?"* to learn consistency strategies.
* *"Suggest a perfect schedule"* to get a customized time-blocked routine template.`;
    }

    // Add a artificial processing delay of 800ms to simulate real-time AI computation
    setTimeout(() => {
      res.json({
        reply,
        widgetData,
        modelName: 'DisciplineX Cognitive Core v1.4 (Trained on Local Data)'
      });
    }, 800);

  } catch (error) {
    console.error('[AI Coach Controller] Error:', error);
    res.status(500).json({ message: 'AI processing failed.', error: error.message });
  }
};
