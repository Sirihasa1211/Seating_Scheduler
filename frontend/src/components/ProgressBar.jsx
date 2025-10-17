import { CheckCircle, Circle, Loader2 } from 'lucide-react';

export default function ProgressBar({ progress, currentStage, stages }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-700 dark:text-gray-300">{stages[currentStage]?.label || 'Ready'}</span>
          <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {stages.map((stage, idx) => {
          const isCompleted = idx < currentStage;
          const isCurrent = idx === currentStage;
          
          return (
            <div key={stage.id} className={`flex flex-col items-center text-center p-3 rounded-lg ${isCurrent ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
              {isCompleted && <CheckCircle className="w-6 h-6 text-green-500 mb-2" />}
              {isCurrent && <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin mb-2" />}
              {!isCompleted && !isCurrent && <Circle className="w-6 h-6 text-gray-400 mb-2" />}
              <span className={`text-xs font-medium ${isCurrent ? 'text-blue-600 dark:text-blue-400' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
