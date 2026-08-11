import ProcedureModel, {
  IProcedureField,
  IProcedure,
  SCORABLE_FIELD_TYPES,
} from "../models/Procedure.model.js";
import MaintenanceRequestModel from "../models/Maintenancerequest.model.js";

// ─── Types ────────────────────────────────────────────────────────────────

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

function makeFieldId() {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function fetchAllProcedures(filters: ProcedureFilters = {}) {
  const { status, tag, search } = filters;

  const query: Record<string, any> = { active: true };
  if (status) query.status = status;
  if (tag) query.tags = tag;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  return ProcedureModel.find(query).sort({ updatedAt: -1 }).lean();
}

export async function fetchProcedureById(id: number) {
  return ProcedureModel.findOne({ id }).lean();
}

// ─── Create / update / delete ────────────────────────────────────────────────

export async function createProcedureService(input: CreateProcedureInput) {
  const procedure = await ProcedureModel.create({
    title: input.title.trim(),
    description: input.description ?? null,
    coverImageUrl: input.coverImageUrl ?? null,
    tags: input.tags ?? [],
    teams: input.teams ?? [],
    scoringEnabled: input.scoringEnabled ?? false,
    goalScore: input.goalScore ?? 0,
    createdByName: input.createdByName,
    status: "draft",
    fields: [],
  });

  return procedure.toObject();
}

export async function updateProcedureService(id: number, data: UpdateProcedureInput) {
  const updated = await ProcedureModel.findOneAndUpdate(
    { id },
    { $set: data },
    { new: true, runValidators: true },
  );
  return updated?.toObject() ?? null;
}

export async function deleteProcedureService(id: number) {
  // Soft delete — keeps history on any work order that already snapshotted this procedure.
  const deleted = await ProcedureModel.findOneAndUpdate(
    { id },
    { $set: { active: false } },
    { new: true },
  );
  return deleted;
}

export async function publishProcedureService(id: number) {
  const procedure = await ProcedureModel.findOne({ id });
  if (!procedure) return null;

  if (!procedure.fields.length) {
    throw new Error("Add at least one field before publishing this procedure");
  }

  procedure.status = "published";
  await procedure.save();
  return procedure.toObject();
}

export async function duplicateProcedureService(id: number, actorName: string) {
  const source = await ProcedureModel.findOne({ id }).lean();
  if (!source) return null;

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
    // fresh field ids — this copy's fields are independent of the source's
    fields: source.fields.map((f) => ({ ...f, id: makeFieldId() })),
  });

  return copy.toObject();
}

// ─── Field management ─────────────────────────────────────────────────────────

export async function addFieldService(procedureId: number, input: ProcedureFieldInput) {
  if (input.scoringEnabled && !SCORABLE_FIELD_TYPES.includes(input.type)) {
    throw new Error(`Field type "${input.type}" doesn't support scoring`);
  }

  const procedure = await ProcedureModel.findOne({ id: procedureId });
  if (!procedure) return null;

  procedure.fields.push({
    id: makeFieldId(),
    type: input.type,
    label: input.label,
    required: input.required ?? false,
    options: input.options ?? [],
    order: procedure.fields.length,
    scoringEnabled: input.scoringEnabled ?? false,
    maxScore: input.maxScore ?? 0,
    optionScores: input.optionScores ?? [],
    condition: input.condition ?? null,
  });

  await procedure.save();
  return procedure.toObject();
}

export async function updateFieldService(
  procedureId: number,
  fieldId: string,
  data: Partial<ProcedureFieldInput>,
) {
  const procedure = await ProcedureModel.findOne({ id: procedureId });
  if (!procedure) return null;

  const field = procedure.fields.find((f) => f.id === fieldId);
  if (!field) throw new Error("Field not found on this procedure");

  if (data.type !== undefined) field.type = data.type;
  if (data.label !== undefined) field.label = data.label;
  if (data.required !== undefined) field.required = data.required;
  if (data.options !== undefined) field.options = data.options;
  if (data.scoringEnabled !== undefined) field.scoringEnabled = data.scoringEnabled;
  if (data.maxScore !== undefined) field.maxScore = data.maxScore;
  if (data.optionScores !== undefined) field.optionScores = data.optionScores as any;
  if (data.condition !== undefined) field.condition = data.condition as any;

  if (field.scoringEnabled && !SCORABLE_FIELD_TYPES.includes(field.type)) {
    throw new Error(`Field type "${field.type}" doesn't support scoring`);
  }

  await procedure.save();
  return procedure.toObject();
}

export async function removeFieldService(procedureId: number, fieldId: string) {
  const procedure = await ProcedureModel.findOne({ id: procedureId });
  if (!procedure) return null;

  procedure.fields = procedure.fields.filter((f) => f.id !== fieldId) as any;
  procedure.fields.forEach((f, i) => (f.order = i));

  await procedure.save();
  return procedure.toObject();
}

export async function reorderFieldsService(procedureId: number, orderedFieldIds: string[]) {
  const procedure = await ProcedureModel.findOne({ id: procedureId });
  if (!procedure) return null;

  const byId = new Map(procedure.fields.map((f) => [f.id, f]));
  const reordered = orderedFieldIds.map((id) => byId.get(id)).filter(Boolean) as IProcedureField[];

  if (reordered.length !== procedure.fields.length) {
    throw new Error("orderedFieldIds must include every field id on this procedure exactly once");
  }

  reordered.forEach((f, i) => (f.order = i));
  procedure.fields = reordered as any;

  await procedure.save();
  return procedure.toObject();
}

// ─── Attach to work orders ────────────────────────────────────────────────────
// Mirrors MaintainX's "Use in New Work Order" / "Use in Existing Work Orders":
// copies the procedure's current fields onto the request as a frozen instance.

function buildInstance(procedure: IProcedure, actorName: string) {
  const maxScore = procedure.scoringEnabled
    ? procedure.fields.reduce((sum, f) => sum + (f.scoringEnabled ? f.maxScore : 0), 0)
    : 0;

  return {
    procedureId: procedure.id,
    title: procedure.title,
    fields: procedure.fields,
    responses: [],
    scoringEnabled: procedure.scoringEnabled,
    maxScore,
    totalScore: null,
    completedAt: null,
    completedBy: null,
    attachedAt: new Date(),
    attachedBy: actorName,
  };
}

export async function attachProcedureToRequestService(
  procedureId: number,
  requestId: number,
  actor: { name: string },
) {
  const procedure = await ProcedureModel.findOne({ id: procedureId }).lean();
  if (!procedure) throw new Error("Procedure not found");

  const request = await MaintenanceRequestModel.findOneAndUpdate(
    { id: requestId },
    { $set: { procedure: buildInstance(procedure, actor.name) } },
    { new: true },
  );

  return request ? request.toObject() : null;
}

// Bulk version — mirrors "Use in Existing Work Orders". Skips (rather than
// throws on) requests that don't exist so one bad id doesn't kill the batch.
export async function bulkAttachProcedureService(
  procedureId: number,
  requestIds: number[],
  actor: { name: string },
) {
  const procedure = await ProcedureModel.findOne({ id: procedureId }).lean();
  if (!procedure) throw new Error("Procedure not found");

  const instance = buildInstance(procedure, actor.name);
  const result = await MaintenanceRequestModel.updateMany(
    { id: { $in: requestIds } },
    { $set: { procedure: instance } },
  );

  return { matched: result.matchedCount, modified: result.modifiedCount };
}

// ─── Fill out / complete a procedure on a work order ─────────────────────────

function scoreResponse(field: IProcedureField, value: any): number | null {
  if (!field.scoringEnabled) return null;

  switch (field.type) {
    case "checkbox":
      return value === true ? field.maxScore : 0;
    case "inspection":
      if (value === "pass") return field.maxScore;
      if (value === "flagged") return Math.round(field.maxScore / 2);
      return 0; // "fail" or anything else
    case "multiple_choice": {
      const match = field.optionScores.find((o) => o.option === value);
      return match ? match.score : 0;
    }
    default:
      return null;
  }
}

export async function submitProcedureResponsesService(
  requestId: number,
  responses: { fieldId: string; value: any }[],
) {
  const request = await MaintenanceRequestModel.findOne({ id: requestId });
  if (!request) return null;
  if (!request.procedure) throw new Error("This work order has no procedure attached");

  const fieldsById = new Map(request.procedure.fields.map((f) => [f.id, f]));
  const responsesByFieldId = new Map(request.procedure.responses.map((r) => [r.fieldId, r]));

  for (const r of responses) {
    const field = fieldsById.get(r.fieldId);
    if (!field) throw new Error(`Field ${r.fieldId} is not on this procedure`);

    const scoreEarned = scoreResponse(field, r.value);
    responsesByFieldId.set(r.fieldId, { fieldId: r.fieldId, value: r.value, scoreEarned });
  }

  request.procedure.responses = [...responsesByFieldId.values()] as any;

  if (request.procedure.scoringEnabled) {
    request.procedure.totalScore = request.procedure.responses.reduce(
      (sum, r) => sum + (r.scoreEarned ?? 0),
      0,
    );
  }

  await request.save();
  return request.toObject();
}

export async function completeProcedureService(requestId: number, actor: { name: string }) {
  const request = await MaintenanceRequestModel.findOne({ id: requestId });
  if (!request) return null;
  if (!request.procedure) throw new Error("This work order has no procedure attached");

  const answeredIds = new Set(request.procedure.responses.map((r) => r.fieldId));
  const missingRequired = request.procedure.fields.find(
    (f) => f.required && f.type !== "section_header" && !answeredIds.has(f.id),
  );
  if (missingRequired) {
    throw new Error(`"${missingRequired.label}" is required before this procedure can be completed`);
  }

  request.procedure.completedAt = new Date();
  request.procedure.completedBy = actor.name;

  await request.save();
  return request.toObject();
}

export async function fetchProcedureInstanceService(requestId: number) {
  const request = await MaintenanceRequestModel.findOne({ id: requestId }).select("procedure").lean();
  return request?.procedure ?? null;
}