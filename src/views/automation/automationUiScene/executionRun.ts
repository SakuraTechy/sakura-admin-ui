import type { ExecutionType } from './execution'
import { type SceneExecutionProgress, queuedSceneProgress } from './sceneSummary'

export interface ExecutionRunScene extends SceneExecutionProgress {
  sceneDbId: string
  sceneId: string
  sceneName: string
}

/** 页面内一次调试执行的范围，不是服务端批次，也不承载 capability 或原始步骤。 */
export interface ExecutionRun {
  id: string
  /** 服务端持久化的任务归属，页面 ID 仍负责本次执行视图切换。 */
  serverRunId?: string
  executionType: Exclude<ExecutionType, 'jenkins'>
  startedAt: number
  finishedAt?: number
  cancelRequested: boolean
  scenes: ExecutionRunScene[]
}

export type ExecutionHistoryTarget = { kind: 'all' } | { kind: 'scene', sceneId: string } | { kind: 'run', runId: string }

export function createExecutionRun(scenes: any[], executionType: ExecutionRun['executionType']): ExecutionRun {
  const startedAt = Date.now()
  return {
    id: `ui-run-${startedAt}-${crypto.getRandomValues(new Uint32Array(2)).join('-')}`,
    executionType,
    startedAt,
    cancelRequested: false,
    scenes: scenes.map((scene) => ({
      ...queuedSceneProgress(scene, startedAt),
      sceneDbId: String(scene.id),
      sceneId: String(scene.sceneId || scene.id),
      sceneName: String(scene.name || scene.sceneId || scene.id),
    })),
  }
}

export function executionRunSummary(run: ExecutionRun) {
  const states = run.scenes
  const terminal = (status: string) => ['completed', 'cancelled', 'startup-failed'].includes(status)
  return {
    total: states.length,
    completed: states.filter((scene) => terminal(scene.executeStatus)).length,
    running: states.filter((scene) => ['starting', 'running', 'cancelling'].includes(scene.executeStatus)).length,
    queued: states.filter((scene) => scene.executeStatus === 'queued').length,
    passed: states.filter((scene) => terminal(scene.executeStatus) && scene.executeResult === 'passed').length,
    failed: states.filter((scene) => scene.executeResult === 'failed' || scene.executeStatus === 'startup-failed').length,
    cancelled: states.filter((scene) => scene.executeStatus === 'cancelled').length,
    skipped: states.filter((scene) => scene.executeResult === 'skipped').length,
  }
}
