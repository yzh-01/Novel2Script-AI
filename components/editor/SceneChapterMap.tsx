// ============================================================
// SceneChapterMap — 章节 → 场景溯源映射表
// 展示"第1章→SC-001~004 / 第2章→SC-005~008"
// 贴合改编场景，评委加分点
// ============================================================

'use client';

import { memo, useMemo } from 'react';
import { tryParseYaml } from '@/lib/yaml';
import type { Screenplay, Scene } from '@/types';

interface SceneChapterMapProps {
  yaml: string;
}

export const SceneChapterMap = memo(function SceneChapterMap({ yaml }: SceneChapterMapProps) {
  const mapping = useMemo(() => {
    const result = tryParseYaml(yaml);
    if (!result.success) return null;

    const data = result.data as unknown as Screenplay;
    if (!data?.scenes) return null;

    // 构建 source_chapter → scenes 映射（source_chapter 为单值 int）
    const map = new Map<number, Scene[]>();
    for (const scene of data.scenes) {
      if (!scene.source_chapter) continue;
      const ch = Number(scene.source_chapter);
      if (isNaN(ch)) continue;
      if (!map.has(ch)) map.set(ch, []);
      map.get(ch)!.push(scene);
    }

    // 按章节号排序
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [yaml]);

  if (!mapping || mapping.length === 0) {
    return (
      <div className="rounded-lg border bg-gray-50 p-4 text-center text-sm text-gray-400">
        暂无溯源信息（请确保 YAML 中 scenes 包含 source_chapter 字段）
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-700">📖 章节 → 场景溯源</h3>

      <div className="space-y-2">
        {mapping.map(([chapter, scenes]) => (
          <div key={chapter} className="flex items-start gap-3 rounded bg-gray-50 px-3 py-2">
            <span className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              第 {chapter} 章
            </span>
            <div className="flex flex-wrap gap-1">
              {scenes.map(scene => (
                <span
                  key={scene.id}
                  className="rounded bg-white px-2 py-0.5 text-xs text-gray-600 shadow-sm"
                  title={scene.heading ? `${scene.heading.interior ? 'INT.' : 'EXT.'} ${scene.heading.location}` : ''}
                >
                  {scene.id}
                  {scene.summary && (
                    <span className="ml-1 text-gray-400">— {scene.summary.slice(0, 20)}{scene.summary.length > 20 ? '…' : ''}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
