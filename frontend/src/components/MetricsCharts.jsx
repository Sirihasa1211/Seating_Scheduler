import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Clock, AlertTriangle } from 'lucide-react';

export default function MetricsCharts({ metrics }) {
  if (!metrics || metrics.length === 0) return null;

  // Aggregate metrics across all sessions/departments
 let sumFairness = 0, sumUtilization = 0, sumTimeslots = 0, sumConflicts = 0,totalRUntime=0;

for (let i = 0; i < metrics.length; i++) {
  const m = metrics[i];
  sumFairness += Number(m.FairnessStdDev) || 0;
  sumUtilization += Number(m.AvgUtilization) || 0;
  sumTimeslots += Number(m.Timeslots) || 0;
  sumConflicts += Number(m.Conflicts) || 0;
  totalRUntime += Number(m.Runtime) || 0;

}

const avgFairness = sumFairness / metrics.length;
const avgUtilization = sumUtilization / metrics.length;
const AvgRuntime = totalRUntime / metrics.length;
const totalTimeslots = sumTimeslots;
const totalConflicts = sumConflicts;

//console.log({ avgFairness, avgUtilization, totalTimeslots, totalConflicts });


  // Prepare PieChart data
  const pieData = [
    { name: 'Used', value: avgUtilization, fill: '#3b82f6' },
    { name: 'Unused', value: 100 - avgUtilization, fill: '#94a3b8' }
  ];


  return (
    <div className="space-y-6">
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Runtime</span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{AvgRuntime.toFixed(1)}%</div>
        </div>
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Fairness Score</span>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{avgFairness.toFixed(2)}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Room Utilization</span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{avgUtilization.toFixed(1)}%</div>
        </div>
         

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Timeslots</span>
            <Clock className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalTimeslots}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Conflicts</span>
            <AlertTriangle className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalConflicts}</div>
        </div>
      </div>

     

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Room Utilization</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      </div>
  );
}
