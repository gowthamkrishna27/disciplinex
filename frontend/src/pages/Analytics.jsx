import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend
} from 'recharts';
import { 
  Award, 
  Flame, 
  Clock, 
  Briefcase, 
  BarChart3,
  CheckSquare,
  AlertCircle
} from 'lucide-react';

export const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const summary = await api.get('/analytics/summary');
      setData(summary);
    } catch (err) {
      setError(err.message || 'Failed to fetch analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
        <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm">Compiling productivity scores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-20 p-6 border border-brand-red/20 bg-brand-red/5 rounded-2xl text-center">
        <AlertCircle className="w-8 h-8 text-brand-red mx-auto mb-3" />
        <h4 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-1">Failed to load analytics</h4>
        <p className="text-sm text-zinc-500 mb-4">{error}</p>
        <button 
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-brand-purple text-white text-xs font-semibold rounded-xl hover:bg-brand-purple/90 transition cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Handle case where user has zero tasks in database
  if (!data || data.totalTasks === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 px-4">
        <div className="w-16 h-16 bg-brand-purple/5 dark:bg-brand-purple/10 rounded-2xl flex items-center justify-center text-brand-purple mx-auto mb-6 border border-brand-purple/15">
          <BarChart3 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-display font-semibold text-zinc-800 dark:text-zinc-200 mb-2">
          Awaiting Performance Data
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-6">
          Schedule tasks in your timeline, mark them complete or missed, and DisciplineX will compile your streak statistics and visual chart trends.
        </p>
      </div>
    );
  }

  // Pie chart data prep
  const completedMissedData = [
    { name: 'Completed', value: data.completedTasks, color: '#198038' },
    { name: 'Missed', value: data.missedTasks, color: '#da1e28' },
    { name: 'In Progress', value: data.inProgressTasks, color: '#0f62fe' },
    { name: 'Not Started', value: Math.max(0, data.totalTasks - data.completedTasks - data.missedTasks - data.inProgressTasks), color: '#8e8e8e' }
  ].filter(item => item.value > 0);

  // Custom tooltips for graphs
  const CustomTooltipLine = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-lg shadow-lg text-xs">
          <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">{payload[0].payload.date}</p>
          <p className="text-brand-purple font-medium">Efficiency: {payload[0].value}%</p>
          <p className="text-zinc-500">Tasks scheduled: {payload[0].payload.tasksCount}</p>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipBar = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-lg shadow-lg text-xs">
          <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">{payload[0].payload.date}</p>
          <p className="text-brand-blue font-medium">Productive: {payload[0].value} hours</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-sans">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold tracking-tight text-zinc-900 dark:text-white m-0">
          Productivity Analytics
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Review your aggregate routine performance, streaks, and productive hours.
        </p>
      </div>

      {/* Numerical Stats Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        
        {/* Grand Score Card */}
        <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-2xl card-shadow text-center flex flex-col justify-center items-center">
          <div className="w-10 h-10 rounded-xl bg-brand-purple/10 dark:bg-brand-purple/20 flex items-center justify-center text-brand-purple mb-3">
            <Award className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Productivity Score
          </span>
          <span className="text-4xl font-display font-extrabold text-zinc-900 dark:text-white">
            {data.productivityScore}%
          </span>
          <span className="text-[10px] text-zinc-500 mt-2 block">
            Completed tasks ratio
          </span>
        </div>

        {/* Total Hours Invested Card */}
        <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-2xl card-shadow text-center flex flex-col justify-center items-center">
          <div className="w-10 h-10 rounded-xl bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center text-brand-blue mb-3">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Total Hours Logged
          </span>
          <span className="text-4xl font-display font-extrabold text-zinc-900 dark:text-white">
            {data.totalCompletedHours}
          </span>
          <span className="text-[10px] text-zinc-500 mt-2 block">
            Completed hours in history
          </span>
        </div>

        {/* Streaks Card */}
        <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-2xl card-shadow text-center flex flex-col justify-center items-center">
          <div className="w-10 h-10 rounded-xl bg-brand-amber/10 dark:bg-brand-amber/20 flex items-center justify-center text-brand-amber mb-3">
            <Flame className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Active Streak
          </span>
          <span className="text-4xl font-display font-extrabold text-zinc-900 dark:text-white">
            {data.currentStreak}
          </span>
          <span className="text-[10px] text-zinc-500 mt-2 block">
            Longest streak: {data.longestStreak} days
          </span>
        </div>

        {/* Most Productive Hour Card */}
        <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-2xl card-shadow text-center flex flex-col justify-center items-center">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 dark:bg-brand-green/20 flex items-center justify-center text-brand-green mb-3">
            <Briefcase className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Peak Performance Era
          </span>
          <span className="text-sm font-display font-bold text-zinc-900 dark:text-white line-clamp-2 max-w-[150px] leading-tight">
            {data.mostProductiveTime}
          </span>
          <span className="text-[10px] text-zinc-500 mt-2 block">
            Highest completion rate time
          </span>
        </div>

      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Weekly Consistency (Line Chart) */}
        <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-2xl card-shadow">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
            Weekly Consistency (%)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.weeklyConsistency} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                <XAxis dataKey="day" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                <Tooltip content={<CustomTooltipLine />} />
                <Line 
                  type="monotone" 
                  dataKey="percentage" 
                  stroke="#8a3ffc" 
                  strokeWidth={2.5} 
                  dot={{ r: 4, stroke: '#8a3ffc', strokeWidth: 1.5, fill: '#ffffff' }}
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Productive Hours (Bar Chart) */}
        <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-2xl card-shadow">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
            Daily Productive Hours
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.productiveHoursChart} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                <XAxis dataKey="day" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}h`} />
                <Tooltip content={<CustomTooltipBar />} />
                <Bar 
                  dataKey="hours" 
                  fill="#0f62fe" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Bottom Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Completed vs Missed Donut Chart */}
        <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-2xl card-shadow lg:col-span-1 flex flex-col">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
            Task Status Profile
          </h3>
          <div className="h-48 flex items-center justify-center relative flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={completedMissedData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {completedMissedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center score display */}
            <div className="absolute text-center">
              <span className="text-xl font-bold font-display text-zinc-800 dark:text-white block leading-none">
                {data.completedTasks}
              </span>
              <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider block mt-1">
                Completed
              </span>
            </div>
          </div>

          {/* Minimal Custom Legend */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-zinc-600 dark:text-zinc-400">
            {completedMissedData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown list */}
        <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-2xl card-shadow lg:col-span-2">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
            Category Breakdown & Success Ratios
          </h3>
          
          <div className="space-y-4">
            {data.categoryBreakdown.map((cat, idx) => (
              <div key={idx}>
                {/* Meta details */}
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{cat.name}</span>
                    <span className="text-[10px] text-zinc-400">({cat.completed} of {cat.value} tasks)</span>
                  </div>
                  <span className="font-semibold text-brand-purple">{cat.percentage}% success</span>
                </div>
                
                {/* Bar Graph */}
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden flex">
                  {/* Successful part */}
                  <div 
                    className="bg-brand-purple h-full transition-all duration-500" 
                    style={{ width: `${cat.percentage}%` }}
                  />
                  {/* Uncompleted part */}
                  <div 
                    className="bg-zinc-200 dark:bg-zinc-700 h-full" 
                    style={{ width: `${100 - cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
export default Analytics;
