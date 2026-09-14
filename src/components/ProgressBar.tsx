export function ProgressBar({ step, totalSteps }: { step: number; totalSteps: number }) {
  return (
    <div className="w-full max-w-xl mx-auto mb-8">
      <div className="flex justify-between text-xs text-ink-300 mb-2 font-medium tracking-wide uppercase">
        <span>Etapa {step} de {totalSteps}</span>
        <span>{Math.round((step / totalSteps) * 100)}%</span>
      </div>
      <div className="h-1.5 bg-ink-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-gold-500 to-gold-300 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}
