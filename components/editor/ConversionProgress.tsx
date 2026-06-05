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

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      {/* 进度条 */}
      <div className="mb-4 flex items-center gap-4">
        <Step
          label="校验输入"
          active={status === 'validating_input'}
          done={status !== 'idle' && status !== 'validating_input' && status !== 'error'}
        />
        <StepConnector />
        <Step
          label="生成角色"
          active={status === 'generating_characters'}
          done={phase1 !== null || status === 'generating_scenes' || status === 'formatting' || status === 'complete'}
        />
        <StepConnector />
        <Step
          label="生成场景"
          active={status === 'generating_scenes'}
          done={status === 'formatting' || status === 'complete'}
        />
        <StepConnector />
        <Step
          label="格式化"
          active={status === 'formatting'}
          done={status === 'complete'}
        />
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
}

function Step({ label, active, done }: StepProps) {
  const baseClass = 'flex items-center gap-1.5 text-sm transition-colors';
  if (done) return <span className={`${baseClass} text-green-600`}>✓ {label}</span>;
  if (active) return <span className={`${baseClass} font-medium text-amber-700`}>◉ {label}</span>;
  return <span className={`${baseClass} text-gray-300`}>○ {label}</span>;
}

function StepConnector() {
  return <span className="text-gray-200">→</span>;
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
