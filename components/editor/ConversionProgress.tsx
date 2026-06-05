// ============================================================
// ConversionProgress — 两阶段转换进度指示器
// ============================================================

'use client';

import type { ConvertState, ConvertPhase1 } from '@/types';

interface ConversionProgressProps {
  state: ConvertState;
}

export function ConversionProgress({ state }: ConversionProgressProps) {
  const { status, phase1, error } = state;

  // 空闲或完成时不显示
  if (status === 'idle' || status === 'complete') return null;

  // 以下 status 已排除 idle 和 complete
  const isError = status === 'error';
  const step1Done = !isError && status !== 'validating_input';
  const step2Done = !isError && (phase1 !== null || status === 'generating_scenes' || status === 'formatting');
  const step3Done = !isError && status === 'formatting';

  return (
    <div className={`rounded-lg border bg-white p-6 shadow-sm ${isError ? 'border-red-200' : ''}`}>
      {/* 进度条 */}
      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-4">
        <Step label="校验输入" active={!isError && status === 'validating_input'} done={step1Done} error={isError} />
        <StepConnector />
        <Step label="生成角色" active={!isError && status === 'generating_characters'} done={step2Done} error={false} />
        <StepConnector />
        <Step label="生成场景" active={!isError && status === 'generating_scenes'} done={step3Done} error={false} />
        <StepConnector />
        <Step label="格式化" active={!isError && status === 'formatting'} done={false} error={false} />
      </div>

      {/* 状态文案 */}
      <StatusMessage status={status} phase1={phase1} error={error} />
    </div>
  );
}

// ── 子组件 ─────────────────────────────────────────────

interface StepProps {
  label: string;
  active: boolean;
  done: boolean;
  error?: boolean;
}

function Step({ label, active, done, error }: StepProps) {
  const baseClass = 'flex items-center gap-1.5 text-sm transition-colors';
  if (error) return <span className={`${baseClass} text-red-600`}>✕ {label}</span>;
  if (done) return <span className={`${baseClass} text-green-600`}>✓ {label}</span>;
  if (active) return <span className={`${baseClass} font-medium text-amber-700`}>◉ {label}</span>;
  return <span className={`${baseClass} text-gray-300`}>○ {label}</span>;
}

function StepConnector() {
  return <span className="mx-0.5 text-gray-300 sm:mx-0">→</span>;
}

interface StatusMessageProps {
  status: string;
  phase1: ConvertPhase1 | null;
  error: string | null;
}

function StatusMessage({ status, phase1, error }: StatusMessageProps) {
  if (error) {
    return <p className="text-sm text-red-600">❌ {error}</p>;
  }

  switch (status) {
    case 'validating_input':
      return <p className="text-sm text-gray-500">正在检查输入数据…</p>;
    case 'generating_characters':
      return <p className="text-sm text-gray-500">正在分析小说角色…</p>;
    case 'generating_scenes':
      return (
        <div>
          <p className="text-sm text-gray-500">
            正在生成场景内容…
            {phase1 && `（已识别 ${phase1.characters.length} 个角色，${phase1.scene_outline.length} 个场景大纲）`}
          </p>
          {phase1 && (
            <div className="mt-2 max-h-24 overflow-y-auto rounded bg-gray-50 p-2">
              <p className="mb-1 text-xs font-medium text-gray-500">已识别角色：</p>
              <div className="flex flex-wrap gap-1">
                {phase1.characters.map(ch => (
                  <span key={ch.id} className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                    {ch.name}（{ch.category === 'main' ? '主角' : ch.category === 'supporting' ? '配角' : ch.category}）
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    case 'formatting':
      return <p className="text-sm text-gray-500">正在格式化 YAML 输出…</p>;
    default:
      return null;
  }
}
