import ProcedureModel, {
  IProcedureField,
  IProcedure,
  SCORABLE_FIELD_TYPES,
  VALID_FIELD_TYPES,
} from "../models/Procedure.model.js";
import MaintenanceRequestModel, { IProcedureInstance } from "../models/Maintenancerequest.model.js";

export interface CreateProcedureInput {
  title: string;
  description?: string | null;
  coverImageUrl?: string | null;
  tags?: string[];
  teams?: string[];
  scoringEnabled?: boolean;
  goalScore?: number;
  createdByName: string;
}

export interface UpdateProcedureInput {
  title?: string;
  description?: string | null;
  coverImageUrl?: string | null;
  tags?: string[];
  teams?: string[];
  scoringEnabled?: boolean;
  goalScore?: number;
}

export interface ProcedureFieldInput {
  type: IProcedureField["type"];
  label: string;
  required?: boolean;
  options?: string[];
  scoringEnabled?: boolean;
  maxScore?: number;
  optionScores?: { option: string; score: number }[];
  condition?: { fieldId: string; equals: string } | null;
}

export interface ProcedureFilters {
  status?: string;
  tag?: string;
  search?: string;
}

export type ProcedureResponseValue = string | number | boolean | string[] | null;

export interface ProcedureResponseInput {
  fieldId: string;
  value: ProcedureResponseValue;
}

function makeFieldId() {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function makeInstanceId() {
  return `pi_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function getFieldMaxScore(field: IProcedureField): number {
  if (!field.scoringEnabled) return 0;
  if (field.type === "multiple_choice") {
    return Math.max(0, ...field.optionScores.map((item) => item.score));
  }
  return Math.max(0, field.maxScore);
}

function getProcedureMaxScore(procedure: IProcedure): number {
  return procedure.scoringEnabled
    ? procedure.fields.reduce((sum, field) => sum + getFieldMaxScore(field), 0)
    : 0;
}

function normalizeOptions(options: string[] = []) {
  return [...new Set(options.map((option) => option.trim()).filter(Boolean))];
}

function validateFieldInput(input: ProcedureFieldInput) {
  if (!VALID_FIELD_TYPES.includes(input.type)) throw new Error(`Invalid field type: ${input.type}`);
  if (!input.label?.trim()) throw new Error("Field label is required");
  if (input.options && !Array.isArray(input.options)) throw new Error("Field options must be an array");
  if (input.type === "multiple_choice" && normalizeOptions(input.options).length < 2) {
    throw new Error("Multiple choice fields require at least two options");
  }
  if (input.scoringEnabled && !SCORABLE_FIELD_TYPES.includes(input.type)) {
    throw new Error(`Field type "${input.type}" does not support scoring`);
  }
  if ((input.maxScore ?? 0) < 0 || (input.optionScores ?? []).some((item) => item.score < 0)) {
    throw new Error("Scores cannot be negative");
  }
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function fetchAllProcedures(filters: ProcedureFilters = {}) {
  const { status, tag, search } = filters;
  const query: Record<string, unknown> = { active: true };
  if (status) query.status = status;
  if (tag) query.tags = tag;
  if (search?.trim()) {
    const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { title: { $regex: safeSearch, $options: "i" } },
      { description: { $regex: safeSearch, $options: "i" } },
      { tags: { $regex: safeSearch, $options: "i" } },
    ];
  }
  return ProcedureModel.find(query).sort({ updatedAt: -1 }).lean();
}

export async function fetchProcedureById(id: number) {
  return ProcedureModel.findOne({ id, active: true }).lean();
}

// ─── Create / update / delete ───────────────────────────────────────────────

export async function createProcedureService(input: CreateProcedureInput) {
  const title = input.title?.trim();
  if (!title) throw new Error("Procedure title is required");
  if ((input.goalScore ?? 0) < 0) throw new Error("Goal score cannot be negative");

  const procedure = await ProcedureModel.create({
    title,
    description: input.description?.trim() || null,
    coverImageUrl: input.coverImageUrl ?? null,
    tags: normalizeOptions(input.tags),
    teams: normalizeOptions(input.teams),
    scoringEnabled: input.scoringEnabled ?? false,
    goalScore: input.scoringEnabled ? input.goalScore ?? 0 : 0,
    createdByName: input.createdByName,
    status: "draft",
    fields: [],
  });
  return procedure.toObject();
}

export async function updateProcedureService(id: number, data: UpdateProcedureInput) {
  if (data.title !== undefined && !data.title.trim()) throw new Error("Procedure title is required");
  if ((data.goalScore ?? 0) < 0) throw new Error("Goal score cannot be negative");
  const payload: UpdateProcedureInput = {
    ...data,
    ...(data.title !== undefined ? { title: data.title.trim() } : {}),
    ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
    ...(data.tags !== undefined ? { tags: normalizeOptions(data.tags) } : {}),
    ...(data.teams !== undefined ? { teams: normalizeOptions(data.teams) } : {}),
    ...(data.scoringEnabled === false ? { goalScore: 0 } : {}),
  };
  const updated = await ProcedureModel.findOneAndUpdate({ id, active: true }, { $set: payload }, { new: true, runValidators: true });
  return updated?.toObject() ?? null;
}

export async function deleteProcedureService(id: number) {
  return ProcedureModel.findOneAndUpdate({ id, active: true }, { $set: { active: false } }, { new: true });
}

export async function publishProcedureService(id: number) {
  const procedure = await ProcedureModel.findOne({ id, active: true });
  if (!procedure) return null;
  if (!procedure.fields.some((field) => field.type !== "section_header")) {
    throw new Error("Add at least one answerable field before publishing this procedure");
  }
  procedure.status = "published";
  await procedure.save();
  return procedure.toObject();
}

export async function duplicateProcedureService(id: number, actorName: string) {
  const source = await ProcedureModel.findOne({ id, active: true }).lean();
  if (!source) return null;
  const sourceFields = source.fields.map((field) => ({ ...field, id: makeFieldId() }));
  const fieldIdMap = new Map(source.fields.map((field, index) => [field.id, sourceFields[index].id]));
  sourceFields.forEach((field) => {
    if (field.condition?.fieldId) field.condition.fieldId = fieldIdMap.get(field.condition.fieldId) ?? field.condition.fieldId;
  });
  const copy = await ProcedureModel.create({
    title: `Copy of ${source.title}`,
    description: source.description,
    coverImageUrl: source.coverImageUrl,
    tags: source.tags,
    teams: source.teams,
    scoringEnabled: source.scoringEnabled,
    goalScore: source.goalScore,
    createdByName: actorName,
    status: "draft",
    fields: sourceFields,
  });
  return copy.toObject();
}

// ─── Field management ───────────────────────────────────────────────────────

function normalizeFieldInput(input: ProcedureFieldInput, order: number) {
  validateFieldInput(input);
  const options = input.type === "multiple_choice" ? normalizeOptions(input.options) : [];
  const optionScores = input.type === "multiple_choice" && input.scoringEnabled
    ? options.map((option) => ({ option, score: Math.max(0, input.optionScores?.find((item) => item.option === option)?.score ?? 0) }))
    : [];
  return {
    id: makeFieldId(),
    type: input.type,
    label: input.label.trim(),
    required: input.type === "section_header" ? false : input.required ?? false,
    options,
    order,
    scoringEnabled: input.scoringEnabled ?? false,
    maxScore: input.type === "multiple_choice" ? 0 : Math.max(0, input.maxScore ?? 0),
    optionScores,
    condition: input.type === "section_header" ? null : input.condition ?? null,
  };
}

export async function addFieldService(procedureId: number, input: ProcedureFieldInput) {
  const procedure = await ProcedureModel.findOne({ id: procedureId, active: true });
  if (!procedure) return null;
  procedure.fields.push(normalizeFieldInput(input, procedure.fields.length) as any);
  await procedure.save();
  return procedure.toObject();
}

export async function updateFieldService(procedureId: number, fieldId: string, data: Partial<ProcedureFieldInput>) {
  const procedure = await ProcedureModel.findOne({ id: procedureId, active: true });
  if (!procedure) return null;
  const field = procedure.fields.find((item) => item.id === fieldId);
  if (!field) throw new Error("Field not found on this procedure");

  const next = {
    type: data.type ?? field.type,
    label: data.label ?? field.label,
    required: data.required ?? field.required,
    options: data.options ?? field.options,
    scoringEnabled: data.scoringEnabled ?? field.scoringEnabled,
    maxScore: data.maxScore ?? field.maxScore,
    optionScores: data.optionScores ?? field.optionScores,
    condition: data.condition !== undefined ? data.condition : field.condition,
  } as ProcedureFieldInput;
  validateFieldInput(next);
  const normalized = normalizeFieldInput(next, field.order);
  field.type = normalized.type;
  field.label = normalized.label;
  field.required = normalized.required;
  field.options = normalized.options;
  field.scoringEnabled = normalized.scoringEnabled;
  field.maxScore = normalized.maxScore;
  field.optionScores = normalized.optionScores;
  field.condition = normalized.condition;
  await procedure.save();
  return procedure.toObject();
}

export async function removeFieldService(procedureId: number, fieldId: string) {
  const procedure = await ProcedureModel.findOne({ id: procedureId, active: true });
  if (!procedure) return null;
  const before = procedure.fields.length;
  procedure.fields = procedure.fields.filter((field) => field.id !== fieldId) as any;
  if (before === procedure.fields.length) throw new Error("Field not found on this procedure");
  procedure.fields.forEach((field, index) => (field.order = index));
  procedure.fields.forEach((field) => {
    if (field.condition?.fieldId === fieldId) field.condition = null;
  });
  await procedure.save();
  return procedure.toObject();
}

export async function reorderFieldsService(procedureId: number, orderedFieldIds: string[]) {
  const procedure = await ProcedureModel.findOne({ id: procedureId, active: true });
  if (!procedure) return null;
  const currentIds = procedure.fields.map((field) => field.id);
  const submittedIds = new Set(orderedFieldIds);
  if (orderedFieldIds.length !== currentIds.length || submittedIds.size !== currentIds.length || currentIds.some((id) => !submittedIds.has(id))) {
    throw new Error("orderedFieldIds must include every field id exactly once");
  }
  const byId = new Map(procedure.fields.map((field) => [field.id, field]));
  procedure.fields = orderedFieldIds.map((id, index) => {
    const field = byId.get(id)!;
    field.order = index;
    return field;
  }) as any;
  await procedure.save();
  return procedure.toObject();
}

// ─── Multiple frozen instances on work orders ───────────────────────────────

function buildInstance(procedure: IProcedure, actorName: string): IProcedureInstance {
  return {
    instanceId: makeInstanceId(),
    procedureId: procedure.id,
    title: procedure.title,
    fields: procedure.fields.map((field) => ({ ...field, options: [...field.options], optionScores: field.optionScores.map((score) => ({ ...score })) })),
    responses: [],
    scoringEnabled: procedure.scoringEnabled,
    maxScore: getProcedureMaxScore(procedure),
    totalScore: null,
    completedAt: null,
    completedBy: null,
    attachedAt: new Date(),
    attachedBy: actorName,
  };
}

function getRequestInstances(request: any): IProcedureInstance[] {
  if (Array.isArray(request.procedures) && request.procedures.length) return request.procedures as IProcedureInstance[];
  if (request.procedure) {
    return [{ ...request.procedure, instanceId: request.procedure.instanceId ?? `legacy_${request.procedure.procedureId ?? "unknown"}` }];
  }
  return [];
}

function findInstance(request: any, instanceId?: string): IProcedureInstance {
  const instances = getRequestInstances(request);
  if (!instances.length) throw new Error("This work order has no procedure attached");
  const instance = instanceId ? instances.find((item) => item.instanceId === instanceId) : instances[0];
  if (!instance) throw new Error("Procedure instance not found on this work order");
  return instance;
}

function persistInstances(request: any, instances: IProcedureInstance[]) {
  request.procedures = instances as any;
  // Keep a normalized first-instance mirror for old consumers; new clients use procedures.
  request.procedure = instances[0] ?? null;
}

export async function attachProcedureToRequestService(procedureId: number, requestId: number, actor: { name: string }) {
  const procedure = await ProcedureModel.findOne({ id: procedureId, active: true }).lean();
  if (!procedure) throw new Error("Procedure not found");
  if (procedure.status !== "published") throw new Error("Only published procedures can be attached to a work order");
  const request = await MaintenanceRequestModel.findOne({ id: requestId });
  if (!request) return null;
  const instances = getRequestInstances(request);
  const instance = buildInstance(procedure, actor.name);
  persistInstances(request, [...instances, instance]);
  await request.save();
  return request.toObject();
}

export async function bulkAttachProcedureService(procedureId: number, requestIds: number[], actor: { name: string }) {
  const procedure = await ProcedureModel.findOne({ id: procedureId, active: true }).lean();
  if (!procedure) throw new Error("Procedure not found");
  if (procedure.status !== "published") throw new Error("Only published procedures can be attached to a work order");
  const uniqueRequestIds = [...new Set(requestIds)];
  const requests = await MaintenanceRequestModel.find({ id: { $in: uniqueRequestIds } });
  const instanceByRequest = new Map<number, IProcedureInstance>();
  for (const request of requests) {
    const instance = buildInstance(procedure, actor.name);
    instanceByRequest.set(request.id, instance);
    persistInstances(request, [...getRequestInstances(request), instance]);
    await request.save();
  }
  return { matched: requests.length, modified: requests.length, instances: [...instanceByRequest.entries()].map(([requestId, instance]) => ({ requestId, instanceId: instance.instanceId })) };
}

// ─── Fill out / complete a procedure on a work order ─────────────────────────

function serializeValue(value: unknown): string {
  return typeof value === "boolean" ? String(value) : String(value ?? "");
}

function isVisible(field: IProcedureField, responses: Map<string, unknown>): boolean {
  if (!field.condition) return true;
  return serializeValue(responses.get(field.condition.fieldId)) === field.condition.equals;
}

function validateResponse(field: IProcedureField, value: unknown) {
  if (field.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) throw new Error(`"${field.label}" must be a valid number`);
  if (field.type === "checkbox" && typeof value !== "boolean") throw new Error(`"${field.label}" must be checked or unchecked`);
  if (field.type === "inspection" && !["pass", "flagged", "fail"].includes(String(value))) throw new Error(`"${field.label}" has an invalid inspection value`);
  if (field.type === "multiple_choice" && !field.options.includes(String(value))) throw new Error(`"${field.label}" has an invalid option`);
  if (field.type === "date" && (typeof value !== "string" || Number.isNaN(Date.parse(value)))) throw new Error(`"${field.label}" must be a valid date`);
}

function scoreResponse(field: IProcedureField, value: unknown): number | null {
  if (!field.scoringEnabled) return null;
  switch (field.type) {
    case "checkbox": return value === true ? field.maxScore : 0;
    case "inspection": return value === "pass" ? field.maxScore : value === "flagged" ? Math.round(field.maxScore / 2) : 0;
    case "multiple_choice": return field.optionScores.find((item) => item.option === value)?.score ?? 0;
    default: return null;
  }
}

export async function submitProcedureResponsesService(requestId: number, responses: ProcedureResponseInput[], instanceId?: string) {
  const request = await MaintenanceRequestModel.findOne({ id: requestId });
  if (!request) return null;
  const instances = getRequestInstances(request);
  const instance = findInstance(request, instanceId);
  if (instance.completedAt) throw new Error("This procedure is already completed");

  const fieldsById = new Map(instance.fields.map((field) => [field.id, field]));
  const responseByFieldId = new Map(instance.responses.map((response) => [response.fieldId, response]));
  const currentValues = new Map(instance.responses.map((response) => [response.fieldId, response.value]));
  for (const response of responses) {
    const field = fieldsById.get(response.fieldId);
    if (!field) throw new Error(`Field ${response.fieldId} is not on this procedure`);
    validateResponse(field, response.value);
    currentValues.set(field.id, response.value);
    responseByFieldId.set(field.id, { fieldId: field.id, value: response.value, scoreEarned: scoreResponse(field, response.value) });
  }
  instance.responses = [...responseByFieldId.values()] as any;
  instance.totalScore = instance.scoringEnabled ? instance.responses.reduce((sum, response) => sum + (response.scoreEarned ?? 0), 0) : null;
  persistInstances(request, instances);
  await request.save();
  return request.toObject();
}

export async function completeProcedureService(requestId: number, actor: { name: string }, instanceId?: string) {
  const request = await MaintenanceRequestModel.findOne({ id: requestId });
  if (!request) return null;
  const instances = getRequestInstances(request);
  const instance = findInstance(request, instanceId);
  if (instance.completedAt) return request.toObject();
  const values = new Map(instance.responses.map((response) => [response.fieldId, response.value]));
  const missingRequired = instance.fields.find((field) => field.required && field.type !== "section_header" && isVisible(field, values) && !instance.responses.some((response) => response.fieldId === field.id && response.value !== null && response.value !== ""));
  if (missingRequired) throw new Error(`"${missingRequired.label}" is required before this procedure can be completed`);
  instance.completedAt = new Date();
  instance.completedBy = actor.name;
  persistInstances(request, instances);
  await request.save();
  return request.toObject();
}

export async function fetchProcedureInstancesService(requestId: number) {
  const request = await MaintenanceRequestModel.findOne({ id: requestId }).select("procedure procedures").lean();
  return request ? getRequestInstances(request) : [];
}

export async function fetchProcedureInstanceService(requestId: number, instanceId?: string) {
  const instances = await fetchProcedureInstancesService(requestId);
  return instanceId ? instances.find((instance) => instance.instanceId === instanceId) ?? null : instances[0] ?? null;
}
