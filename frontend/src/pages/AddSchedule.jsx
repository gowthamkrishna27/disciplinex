import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Trash2, 
  Clock, 
  FolderPlus, 
  CalendarDays,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const AddSchedule = () => {
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
  const [loading, setLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [category, setCategory] = useState('Work');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await api.get(`/schedule?date=${selectedDate}`);
      setTasks(data.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedDate]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!title.trim()) {
      setErrorMessage('Please add a task title');
      return;
    }

    if (startTime >= endTime) {
      setErrorMessage('Start time must be chronologically earlier than end time');
      return;
    }

    try {
      const newTask = await api.post('/schedule', {
        title,
        startTime,
        endTime,
        category,
        date: selectedDate
      });

      setTasks(prev => [...prev, newTask].sort((a, b) => a.startTime.localeCompare(b.startTime)));
      
      // Reset form
      setTitle('');
      setSuccessMessage('Task successfully added to your schedule!');
      
      // Auto-expire success message
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to add task.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this routine block?')) return;
    try {
      await api.delete(`/schedule/${taskId}`);
      setTasks(prev => prev.filter(t => t._id !== taskId));
    } catch (err) {
      alert(err.message || 'Failed to delete task');
    }
  };

  // Generate presets to make scheduling frictionless
  const loadPreset = (pTitle, pStart, pEnd, pCat) => {
    setTitle(pTitle);
    setStartTime(pStart);
    setEndTime(pEnd);
    setCategory(pCat);
  };

  const presets = [
    { title: 'Morning Deep Work', start: '08:00', end: '11:00', cat: 'Work' },
    { title: 'Technical Skill Study', start: '13:00', end: '15:00', cat: 'Study' },
    { title: 'Cardio & Fitness Session', start: '17:30', end: '18:30', cat: 'Health' },
    { title: 'Evening Reading Routine', start: '21:30', end: '22:30', cat: 'Personal' }
  ];

  // Helper to draw visual blocks in routine timeline
  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'Work': return 'bg-brand-purple/20 border-brand-purple text-brand-purple dark:text-purple-300';
      case 'Study': return 'bg-brand-blue/20 border-brand-blue text-brand-blue dark:text-blue-300';
      case 'Health': return 'bg-brand-green/20 border-brand-green text-brand-green dark:text-green-300';
      case 'Personal': return 'bg-brand-amber/20 border-brand-amber text-brand-amber dark:text-amber-300';
      default: return 'bg-zinc-100 border-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-sans">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold tracking-tight text-zinc-900 dark:text-white m-0">
          Routine Designer
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Map out blocks of deep work, studying, training, and self-care.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Create / Add Slot Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-2xl card-shadow">
            
            <div className="flex items-center gap-2 mb-6">
              <CalendarDays className="w-5 h-5 text-brand-purple" />
              <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 m-0">
                Schedule Designer
              </h3>
            </div>

            {/* Target Date Picker */}
            <div className="mb-6">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Target Date
              </label>
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-border-light dark:border-border-dark rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple text-zinc-800 dark:text-zinc-200"
              />
            </div>

            {/* Success/Error Alerts */}
            {successMessage && (
              <div className="mb-4 p-3 bg-brand-green/5 border border-brand-green/20 text-brand-green text-xs font-semibold rounded-xl text-center">
                {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="mb-4 p-3 bg-brand-red/5 border border-brand-red/20 text-brand-red text-xs font-semibold rounded-xl text-center">
                {errorMessage}
              </div>
            )}

            {/* Custom Task Form */}
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Routine Title
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Study Chemistry / Practice Guitar"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-border-light dark:border-border-dark rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple text-zinc-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Start
                  </label>
                  <input 
                    type="time" 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-border-light dark:border-border-dark rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple text-zinc-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    End
                  </label>
                  <input 
                    type="time" 
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-border-light dark:border-border-dark rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple text-zinc-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Category Tag
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['Work', 'Study', 'Health', 'Personal', 'Routine'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`py-1.5 border rounded-lg text-xs font-semibold transition cursor-pointer select-none ${
                        category === cat 
                          ? 'bg-brand-purple text-white border-brand-purple' 
                          : 'bg-zinc-50 dark:bg-zinc-800 border-border-light dark:border-border-dark text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-xl text-sm font-semibold transition cursor-pointer select-none card-shadow flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Routine Block
              </button>
            </form>

          </div>

          {/* Quick Presets Section */}
          <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-2xl card-shadow">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-brand-amber" />
              <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 m-0">
                Routine Presets
              </h4>
            </div>
            
            <div className="space-y-2">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => loadPreset(p.title, p.start, p.end, p.cat)}
                  className="w-full flex items-center justify-between p-3 border border-border-light dark:border-border-dark rounded-xl bg-zinc-50/50 dark:bg-zinc-800/20 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 text-left text-xs transition cursor-pointer"
                >
                  <div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">{p.title}</span>
                    <span className="text-[10px] text-zinc-500">{p.start} - {p.end}</span>
                  </div>
                  <div className="flex items-center gap-1 text-brand-purple">
                    <span className="font-semibold text-[10px] uppercase tracking-wider">{p.cat}</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Visual Routine Timeline Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-2xl card-shadow">
            
            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-6">
              Active Routine List
            </h3>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-sm">Mapping routine blocks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 dark:text-zinc-400 border border-dashed border-border-light dark:border-border-dark rounded-xl">
                <Clock className="w-8 h-8 mx-auto text-zinc-400 mb-3" />
                <h5 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">Timeline Empty</h5>
                <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                  No routine blocks are design-mapped for this day. Use the creator form or pick a preset to configure your routine.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map(task => (
                  <div 
                    key={task._id} 
                    className="flex items-center justify-between p-4 border border-border-light dark:border-border-dark rounded-xl bg-zinc-50/20 dark:bg-zinc-800/10"
                  >
                    <div className="flex items-center gap-4">
                      {/* Time Accent Block */}
                      <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg min-w-[95px] text-center border border-zinc-200 dark:border-zinc-700/50">
                        {task.startTime} - {task.endTime}
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-0.5">
                          {task.title}
                        </h4>
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 border rounded-md uppercase tracking-wider ${getCategoryColor(task.category)}`}>
                          {task.category}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTask(task._id)}
                      className="p-1.5 text-zinc-400 hover:text-brand-red hover:bg-brand-red/5 rounded-lg border border-transparent hover:border-brand-red/20 transition cursor-pointer"
                      title="Remove from routine"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};
export default AddSchedule;
