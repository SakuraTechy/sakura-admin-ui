import http from '@/utils/http'

const BASE_URL = '/automation/automationUiScene'

export type ReviewStatus = 'NOT_SUBMITTED' | 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED' | 'OUTDATED' | 'WITHDRAWN'
export type ReviewSeverity = 'BLOCKER' | 'MAJOR' | 'MINOR' | 'SUGGESTION'

export interface ReviewPolicy {
  projectId?: string
  mode: 'OBSERVE' | 'ENFORCE'
  requiredApprovals: number
  executionEvidenceRequired: boolean
  executionEvidenceMaxAgeHours: number
  reviewSlaHours: number
  version?: number
  updateUser?: string
  updateTime?: string
}

export interface ReviewReviewerOption {
  id: string
  name: string
}

export interface ReviewQueueItem {
  reviewId: string
  sceneId: string
  sceneName: string
  projectId: string
  projectName?: string
  caseId: string
  caseName: string
  roundNo: number
  status: ReviewStatus
  submitterId: string
  submitterName?: string
  submittedAt: string
  dueAt: string
  overdue: boolean
  requiredApprovals: number
  approvedCount: number
  version: number
}

export interface ReviewQueue {
  pending: ReviewQueueItem[]
  submitted: ReviewQueueItem[]
  outdated: ReviewQueueItem[]
  dueSoon: ReviewQueueItem[]
}

export interface ReviewGovernanceMetrics {
  projectId: string
  from: string
  to: string
  reviewCount: number
  completedCount: number
  averageReviewDurationHours?: number
  firstPassApprovalRate?: number
  outdatedRate?: number
  commonBlockerRules: Array<{ ruleCode: string, count: number }>
}

export interface ReviewMetrics {
  checkPassed: number
  checkTotal: number
  blockerCount: number
  openCommentCount: number
  approvedCount: number
}

export interface ReviewCheck {
  id: string
  ruleCode: string
  result: 'PASS' | 'WARNING' | 'FAIL'
  severity: ReviewSeverity
  effectiveSeverity: ReviewSeverity
  message: string
  anchors: Array<{ nodeType: 'CASE' | 'STEP', stepId?: string, stepName?: string, fieldPath?: string }>
  evidence: Record<string, unknown>
  checkedAt: string
}

export interface ReviewComment {
  id: string
  threadId: string
  parentId?: string
  nodeType: 'CASE' | 'STEP'
  stepId?: string
  fieldPath?: string
  severity?: ReviewSeverity
  resolution: 'OPEN' | 'RESOLVED' | 'WONT_FIX'
  resolutionType?: 'FIXED' | 'EVIDENCED' | 'WONT_FIX'
  content: string
  authorId: string
  authorName: string
  createTime: string
  resolvedBy?: string
  resolvedAt?: string
  resolutionReason?: string
}

export interface ReviewReviewer {
  id: string
  name: string
  role?: string
  decision: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED'
  summary?: string
  decisionAt?: string
}

export interface ReviewChecklistItem {
  code: 'GOAL' | 'COVERAGE' | 'REPEATABLE' | 'ASSERTION' | 'MAINTAINABILITY' | 'SECURITY'
  label: string
  checked: boolean
  checkedAt?: string
}

export interface ReviewEvidence {
  executionId: string
  triggerType: string
  environmentName?: string
  result: string
  finishedAt: string
  durationMs?: number
  reportUrl?: string
  exactVersion: boolean
}

export interface ReviewEvent {
  id: string
  type: string
  actorId: string
  actorName: string
  payload: Record<string, unknown>
  createTime: string
}

export interface AutomationUiCaseReview {
  id?: string
  sceneId: string
  caseId: string
  caseName: string
  definitionRevisionId?: string
  definitionVersion: number
  caseContentHash?: string
  hashSchemaVersion: string
  roundNo?: number
  status: ReviewStatus
  submitterId?: string
  submitterName?: string
  submittedAt?: string
  requiredApprovals?: number
  summary?: string
  completedAt?: string
  version?: number
  outdated: boolean
  currentCaseContentHash?: string
  checkRunStatus?: 'NOT_RUN' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  policy: ReviewPolicy
  metrics: ReviewMetrics
  evidence?: ReviewEvidence
  reviewers: ReviewReviewer[]
  checks: ReviewCheck[]
  comments: ReviewComment[]
  checklist: ReviewChecklistItem[]
  events: ReviewEvent[]
}

export interface ReviewDiffChange {
  type: 'CASE_FIELD_MODIFIED' | 'STEP_ADDED' | 'STEP_DELETED' | 'STEP_MOVED' | 'STEP_MODIFIED'
  field?: string
  stepId?: string
  stepName?: string
  fields?: string[]
  from?: number
  to?: number
}

export interface ReviewDiff {
  baseline: 'EMPTY' | 'PREVIOUS_APPROVED'
  added: number
  modified: number
  deleted: number
  changes: ReviewDiffChange[]
}

const path = (sceneId: string | number, caseId: string) => `${BASE_URL}/${sceneId}/cases/${encodeURIComponent(caseId)}`

export function getAutomationUiCaseReview(sceneId: string | number, caseId: string) {
  return http.get<AutomationUiCaseReview>(`${path(sceneId, caseId)}/review`)
}

export function listAutomationUiCaseReviews(sceneId: string | number, caseId: string) {
  return http.get<AutomationUiCaseReview[]>(`${path(sceneId, caseId)}/reviews`)
}

export function getAutomationUiCaseReviewDiff(sceneId: string | number, caseId: string, reviewId: string) {
  return http.get<ReviewDiff>(`${path(sceneId, caseId)}/reviews/${reviewId}/diff`)
}

export function submitAutomationUiCaseReview(sceneId: string | number, caseId: string, data: { expectedDefinitionVersion: number, reviewerIds: Array<string | number>, summary?: string }) {
  return http.post<AutomationUiCaseReview>(`${path(sceneId, caseId)}/reviews/submit`, data)
}

export function decideAutomationUiCaseReview(sceneId: string | number, caseId: string, reviewId: string, data: { decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED', comment?: string, expectedReviewVersion: number }) {
  return http.post<AutomationUiCaseReview>(`${path(sceneId, caseId)}/reviews/${reviewId}/decision`, data)
}

export function recheckAutomationUiCaseReview(sceneId: string | number, caseId: string, reviewId: string, expectedReviewVersion: number) {
  return http.post<AutomationUiCaseReview>(`${path(sceneId, caseId)}/reviews/${reviewId}/recheck`, { expectedReviewVersion })
}

export function addAutomationUiCaseReviewComment(sceneId: string | number, caseId: string, reviewId: string, data: Record<string, unknown>) {
  return http.post<AutomationUiCaseReview>(`${path(sceneId, caseId)}/reviews/${reviewId}/comments`, data)
}

export function resolveAutomationUiCaseReviewComment(sceneId: string | number, caseId: string, reviewId: string, commentId: string, data: { resolutionType: 'FIXED' | 'EVIDENCED' | 'WONT_FIX' | 'REOPEN', reason?: string }) {
  return http.put<AutomationUiCaseReview>(`${path(sceneId, caseId)}/reviews/${reviewId}/comments/${commentId}/resolve`, data)
}

export function updateAutomationUiCaseReviewChecklist(sceneId: string | number, caseId: string, reviewId: string, data: { itemCode: ReviewChecklistItem['code'], checked: boolean }) {
  return http.put<AutomationUiCaseReview>(`${path(sceneId, caseId)}/reviews/${reviewId}/checklist`, data)
}

export function withdrawAutomationUiCaseReview(sceneId: string | number, caseId: string, reviewId: string, expectedReviewVersion: number) {
  return http.post<AutomationUiCaseReview>(`${path(sceneId, caseId)}/reviews/${reviewId}/withdraw`, { expectedReviewVersion })
}

export function remindAutomationUiCaseReview(sceneId: string | number, caseId: string, reviewId: string) {
  return http.post(`${path(sceneId, caseId)}/reviews/${reviewId}/remind`)
}

export function revokeAutomationUiCaseReviewApproval(sceneId: string | number, caseId: string, reviewId: string, expectedReviewVersion: number) {
  return http.post<AutomationUiCaseReview>(`${path(sceneId, caseId)}/reviews/${reviewId}/revoke-approval`, { expectedReviewVersion })
}

export function getMyAutomationUiCaseReviewQueue(projectId?: string | number) {
  return http.get<ReviewQueue>(`${BASE_URL}/case-reviews/my-queue`, { projectId })
}

export function getAutomationUiCaseReviewMetrics(params: { projectId: string | number, from?: string, to?: string }) {
  return http.get<ReviewGovernanceMetrics>(`${BASE_URL}/case-reviews/metrics`, params)
}

export function getAutomationUiCaseReviewPolicy(projectId: string | number) {
  return http.get<ReviewPolicy>(`${BASE_URL}/case-reviews/projects/${projectId}/policy`)
}

export function listAutomationUiCaseReviewEligibleReviewers(projectId: string | number) {
  return http.get<ReviewReviewerOption[]>(`${BASE_URL}/case-reviews/projects/${projectId}/eligible-reviewers`)
}

export function updateAutomationUiCaseReviewPolicy(projectId: string | number, data: {
  mode: ReviewPolicy['mode']
  requiredApprovals: number
  executionEvidenceRequired: boolean
  executionEvidenceMaxAgeHours: number
  reviewSlaHours: number
  expectedVersion: number
}) {
  return http.put<ReviewPolicy>(`${BASE_URL}/case-reviews/projects/${projectId}/policy`, data)
}

export function batchAssignAutomationUiCaseReviewers(data: {
  reviewIds: string[]
  reviewerIds: string[]
  expectedVersions: Record<string, number>
}, projectId?: string | number) {
  return http.post<ReviewQueue>(`${BASE_URL}/case-reviews/reviewers/batch-assign`, data, { params: { projectId } })
}
