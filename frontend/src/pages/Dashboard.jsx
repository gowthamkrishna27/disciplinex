import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  CircleDot, 
  CopyPlus, 
  Plus, 
  Trash2, 
  Calendar,
  AlertCircle
} from 'lucide-react';

export const Dashboard = () => {
  const { user } = useAuth();
  
  // Date State (Defaults to Today's date YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [tasks, setTasks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Quick Add Task Form State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickStart, setQuickStart] = useState('09:00');
  const [quickEnd, setQuickEnd] = useState('10:00');
  const [quickCategory, setQuickCategory] = useState('Work');

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      // Get tasks for selected date
      const tasksData = await api.get(`/schedule?date=${selectedDate}`);
      setTasks(tasksData.sort((a, b) => a.startTime.localeCompare(b.startTime)));

      // Get latest analytics (streak, etc.)
      const analyticsData = await api.get('/analytics/summary');
      setAnalytics(analyticsData);
    } catch (err) {
      setErrorMessage(err.message || 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  // Adjust date helper
  const adjustDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/schedule/${taskId}`, { status: newStatus });
      // Update tasks array locally
      setTasks(prev => 
        prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t)
      );
      // Refresh analytics in background
      const updatedAnalytics = await api.get('/analytics/summary');
      setAnalytics(updatedAnalytics);
    } catch (err) {
      alert(err.message || 'Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/schedule/${taskId}`);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      const updatedAnalytics = await api.get('/analytics/summary');
      setAnalytics(updatedAnalytics);
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const handleCopyPrevious = async () => {
    setErrorMessage('');
    try {
      const data = await api.post(`/schedule/copy-previous?date=${selectedDate}`);
      setTasks(data.tasks.sort((a, b) => a.startTime.localeCompare(b.startTime)));
      
      const updatedAnalytics = await api.get('/analytics/summary');
      setAnalytics(updatedAnalytics);
    } catch (err) {
      setErrorMessage(err.message || 'No prior routine schedules found to copy.');
    }
  };

  const handleQuickAddSubmit = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    try {
      const newTask = await api.post('/schedule', {
        title: quickTitle,
        startTime: quickStart,
        endTime: quickEnd,
        category: quickCategory,
        date: selectedDate
      });
      
      setTasks(prev => [...prev, newTask].sort((a, b) => a.startTime.localeCompare(b.startTime)));
      setQuickTitle('');
      setShowQuickAdd(false);
      
      const updatedAnalytics = await api.get('/analytics/summary');
      setAnalytics(updatedAnalytics);
    } catch (err) {
      alert(err.message || 'Failed to add task');
    }
  };

  // Compute stats for today
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const missedTasksCount = tasks.filter(t => t.status === 'Missed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
  
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Calculate completed hours for today
  const getTaskDuration = (start, end) => {
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let diff = (eH * 60 + eM) - (sH * 60 + sM);
    if (diff < 0) diff += 24 * 60;
    return Number((diff / 60).toFixed(2));
  };

  let completedHoursToday = 0;
  tasks.filter(t => t.status === 'Completed').forEach(t => {
    completedHoursToday += getTaskDuration(t.startTime, t.endTime);
  });

  // Category Accent styling
  const getCategoryStyles = (category) => {
    switch (category) {
      case 'Work': return 'bg-brand-purple/10 text-brand-purple border-brand-purple/20';
      case 'Study': return 'bg-brand-blue/10 text-brand-blue border-brand-blue/20';
      case 'Health': return 'bg-brand-green/10 text-brand-green border-brand-green/20';
      case 'Personal': return 'bg-brand-amber/10 text-brand-amber border-brand-amber/20';
      default: return 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-700';
    }
  };

  // Status Badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed': return 'text-brand-green bg-brand-green/10 border-brand-green/20';
      case 'Missed': return 'text-brand-red bg-brand-red/10 border-brand-red/20';
      case 'In Progress': return 'text-brand-blue bg-brand-blue/10 border-brand-blue/20';
      default: return 'text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700';
    }
  };

  // Dynamic Daily Motivation Summary Text
  const getMotivationSummary = () => {
    if (totalTasks === 0) {
      return "No routine scheduled for today. Take control of your daily schedule by creating blocks, setting clear timings, and checking them off.";
    }
    if (completionPercentage === 0) {
      return "Day initialized. Set your intention, mark your first task as In Progress, and begin taking consistent actions.";
    }
    if (completionPercentage < 40) {
      return "Slow progress is still progress. Break down the friction of starting. Complete the very next block on your timeline.";
    }
    if (completionPercentage < 80) {
      return "Healthy momentum! You have crossed key routine blocks. Complete a few more tasks to lock in a highly disciplined day.";
    }
    if (completionPercentage < 100) {
      return "Outstanding routine execution! You are extremely close to a flawless day. Finish the remaining slots strong!";
    }
    return "flawless day! You executed your full routine exactly as planned. This level of execution is the foundation of ultimate consistency.";
  };

  const formatDisplayDate = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-sans">
      
      {/* Page Title & Date Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-zinc-900 dark:text-white m-0">
            Daily Execution
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Build discipline, slot by slot, day by day.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark px-4 py-2 rounded-xl card-shadow">
          <button 
            onClick={() => adjustDate(-1)}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition text-zinc-600 dark:text-zinc-400 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 px-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <span className="min-w-[120px] text-center">
              {formatDisplayDate(selectedDate)}
            </span>
          </div>

          <button 
            onClick={() => adjustDate(1)}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition text-zinc-600 dark:text-zinc-400 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid Layout: Top Row Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Streak Card */}
        <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-5 rounded-2xl card-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Streak</span>
            <Flame className="w-5 h-5 text-brand-amber fill-brand-amber/10" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-display font-bold text-zinc-900 dark:text-white">
              {analytics ? analytics.currentStreak : 0}
            </span>
            <span className="text-xs text-zinc-400">days</span>
          </div>
          <div className="text-[10px] text-zinc-500 mt-2">
            Longest streak: {analytics ? analytics.longestStreak : 0} days
          </div>
        </div>

        {/* Completed Hours Card */}
        <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-5 rounded-2xl card-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Time Invested</span>
            <Clock className="w-5 h-5 text-brand-blue" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-display font-bold text-zinc-900 dark:text-white">
              {completedHoursToday}
            </span>
            <span className="text-xs text-zinc-400">hours</span>
          </div>
          <div className="text-[10px] text-zinc-500 mt-2">
            Tasks completed: {completedTasks} / {totalTasks}
          </div>
        </div>

        {/* Missed Tasks Card */}
        <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-5 rounded-2xl card-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Missed</span>
            <XCircle className="w-5 h-5 text-brand-red" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-display font-bold text-zinc-900 dark:text-white">
              {missedTasksCount}
            </span>
            <span className="text-xs text-zinc-400">blocks</span>
          </div>
          <div className="text-[10px] text-zinc-500 mt-2">
            Current goal: {user ? user.dailyGoal : 4} hours
          </div>
        </div>

        {/* Productivity Percentage Card */}
        <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-5 rounded-2xl card-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Efficiency</span>
            <CheckCircle2 className="w-5 h-5 text-brand-green" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-display font-bold text-zinc-900 dark:text-white">
              {completionPercentage}%
            </span>
          </div>
          {/* Micro Progress Bar */}
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-brand-green h-full rounded-full transition-all duration-500" 
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Dynamic Summary Card */}
      <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-5 rounded-2xl card-shadow mb-8">
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-purple/5 dark:bg-brand-purple/10 flex items-center justify-center text-brand-purple flex-shrink-0">
            <CircleDot className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-0.5">
              Daily Summary
            </h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed capitalize">
              {getMotivationSummary()}
            </p>
          </div>
        </div>
      </div>

      {/* Main Section Header: Timeline and Add Controls */}
      <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-3 mb-6">
        <h3 className="text-lg font-display font-semibold text-zinc-800 dark:text-zinc-200 m-0">
          Routine Timeline
        </h3>
        
        <div className="flex items-center gap-2">
          {totalTasks === 0 && (
            <button
              onClick={handleCopyPrevious}
              className="flex items-center gap-1.5 px-3.5 py-1.5 border border-border-light dark:border-border-dark hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer transition select-none"
            >
              <CopyPlus className="w-3.5 h-3.5" />
              Copy Previous Day
            </button>
          )}

          <button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-xl text-xs font-semibold cursor-pointer transition select-none card-shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Slot
          </button>
        </div>
      </div>

      {/* Quick Add Slot Panel */}
      {showQuickAdd && (
        <form 
          onSubmit={handleQuickAddSubmit} 
          className="bg-zinc-50 dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-5 rounded-2xl mb-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Task Title
              </label>
              <input 
                type="text" 
                placeholder="e.g. Study Data Structures"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800/50 border border-border-light dark:border-border-dark rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple text-zinc-900 dark:text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Start Time
              </label>
              <input 
                type="time" 
                value={quickStart}
                onChange={(e) => setQuickStart(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800/50 border border-border-light dark:border-border-dark rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple text-zinc-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                End Time
              </label>
              <input 
                type="time" 
                value={quickEnd}
                onChange={(e) => setQuickEnd(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800/50 border border-border-light dark:border-border-dark rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple text-zinc-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Category:</span>
              <div className="flex flex-wrap gap-1.5">
                {['Work', 'Study', 'Health', 'Personal', 'Routine'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setQuickCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer select-none ${
                      quickCategory === cat 
                        ? 'bg-brand-purple text-white border-brand-purple' 
                        : 'bg-white dark:bg-zinc-800 border-border-light dark:border-border-dark text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowQuickAdd(false)}
                className="px-4 py-2 border border-border-light dark:border-border-dark text-zinc-600 dark:text-zinc-400 text-xs font-semibold rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-semibold rounded-xl transition cursor-pointer card-shadow"
              >
                Create Block
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Task List / Timeline Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400 dark:text-zinc-500">
          <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm">Synchronizing schedule...</p>
        </div>
      ) : totalTasks === 0 ? (
        // Empty State Container
        <div className="flex flex-col items-center justify-center text-center border border-dashed border-border-light dark:border-border-dark rounded-2xl py-16 px-4 bg-white dark:bg-bg-card-dark">
          <div className="w-12 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h4 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
            No Routine Slots Booked
          </h4>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-6">
            You haven't planned any blocks for {formatDisplayDate(selectedDate)} yet. Copy your previous day's routine, or map out custom hours now.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyPrevious}
              className="flex items-center gap-1.5 px-4 py-2 border border-border-light dark:border-border-dark hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer transition"
            >
              <CopyPlus className="w-3.5 h-3.5" />
              Copy Previous Routine
            </button>
            <button
              onClick={() => setShowQuickAdd(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-xl text-xs font-semibold cursor-pointer transition card-shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule First Task
            </button>
          </div>
        </div>
      ) : (
        /* Render Schedule list */
        <div className="space-y-3">
          {tasks.map(task => (
            <div 
              key={task._id} 
              className={`flex flex-col md:flex-row md:items-center justify-between border rounded-2xl p-5 bg-white dark:bg-bg-card-dark transition duration-150 card-shadow ${
                task.status === 'Completed' 
                  ? 'border-brand-green/20' 
                  : task.status === 'Missed' 
                    ? 'border-brand-red/20'
                    : 'border-border-light dark:border-border-dark'
              }`}
            >
              {/* Left Side: Time, Category & Title */}
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Time Indicator */}
                <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-100 dark:border-zinc-700/50 self-start md:self-auto min-w-[125px] justify-center">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{task.startTime}</span>
                  <span className="text-zinc-400 dark:text-zinc-500 font-normal">-</span>
                  <span>{task.endTime}</span>
                </div>

                {/* Task Details */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`text-base font-semibold tracking-tight m-0 ${
                      task.status === 'Completed' 
                        ? 'line-through text-zinc-400 dark:text-zinc-500' 
                        : 'text-zinc-800 dark:text-zinc-200'
                    }`}>
                      {task.title}
                    </h4>
                    
                    <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-md uppercase tracking-wider ${getCategoryStyles(task.category)}`}>
                      {task.category}
                    </span>
                  </div>
                  
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 border rounded-md uppercase tracking-wider ${getStatusBadge(task.status)}`}>
                    {task.status}
                  </span>
                </div>
              </div>

              {/* Right Side: Quick Action Toggles */}
              <div className="flex items-center gap-1.5 mt-4 md:mt-0 pt-3 md:pt-0 border-t border-zinc-100 dark:border-zinc-800 md:border-t-0 self-end md:self-auto">
                <button
                  onClick={() => handleStatusChange(task._id, 'In Progress')}
                  className={`p-2 rounded-xl border text-xs font-semibold cursor-pointer transition select-none flex items-center gap-1 ${
                    task.status === 'In Progress' 
                      ? 'bg-brand-blue text-white border-brand-blue' 
                      : 'border-border-light dark:border-border-dark text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                  title="Mark In Progress"
                >
                  <CircleDot className="w-4 h-4" />
                  <span className="hidden sm:inline">Active</span>
                </button>

                <button
                  onClick={() => handleStatusChange(task._id, 'Completed')}
                  className={`p-2 rounded-xl border text-xs font-semibold cursor-pointer transition select-none flex items-center gap-1 ${
                    task.status === 'Completed' 
                      ? 'bg-brand-green text-white border-brand-green' 
                      : 'border-border-light dark:border-border-dark text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                  title="Mark Completed"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Complete</span>
                </button>

                <button
                  onClick={() => handleStatusChange(task._id, 'Missed')}
                  className={`p-2 rounded-xl border text-xs font-semibold cursor-pointer transition select-none flex items-center gap-1 ${
                    task.status === 'Missed' 
                      ? 'bg-brand-red text-white border-brand-red' 
                      : 'border-border-light dark:border-border-dark text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                  title="Mark Missed"
                >
                  <XCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Missed</span>
                </button>

                <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>

                <button
                  onClick={() => handleDeleteTask(task._id)}
                  className="p-2 border border-border-light dark:border-border-dark hover:bg-brand-red/5 hover:border-brand-red/20 text-zinc-400 hover:text-brand-red rounded-xl transition cursor-pointer"
                  title="Delete Slot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
export default Dashboard;
