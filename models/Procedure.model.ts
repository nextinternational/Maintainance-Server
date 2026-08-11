import mongoose, { Document, Model, Schema } from "mongoose";

// ─── Auto-increment counter (same shared pattern as Equipment / Part / Meter) ───

interface ICounter extends Omit<Document, "_id"> {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const CounterModel: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>("Counter", counterSchema);

async function getNextSequence(name: string): Promise<number> {
  const counter = await CounterModel.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return counter.seq;
}

// ─── Procedure ────────────────────────────────────────────────────────────
// Mirrors MaintainX's Library > Procedures: a reusable template of fields
// (checklist items, inspections, text prompts, etc.) that gets attached to
// one or more work orders. The template itself never accumulates answers —
// answers live on the work order as a snapshotted "instance"
// (see IProcedureInstance in Maintenancerequest.model.ts) so editing a
// published procedure later doesn't retroactively rewrite completed history.

export type ProcedureStatus = "draft" | "published";

export type ProcedureFieldType =
  | "section_header"
  | "text"
  | "number"
  | "checkbox"
  | "multiple_choice"
  | "inspection"    // pass / fail / flagged
  | "photo"
  | "signature"
  | "date";

export const VALID_FIELD_TYPES: ProcedureFieldType[] = [
  "section_header",
  "text",
  "number",
  "checkbox",
  "multiple_choice",
  "inspection",
  "photo",
  "signature",
  "date",
];

// Only these types can carry a point value when procedure scoring is on —
// open-ended types (text/photo/signature/date) aren't scorable, same as MaintainX.
export const SCORABLE_FIELD_TYPES: ProcedureFieldType[] = ["checkbox", "multiple_choice", "inspection"];

export interface IProcedureFieldCondition {
  fieldId: string;   // id of the field this one depends on
  equals: string;    // shown only when that field's answer === this value
}

export interface IOptionScore {
  option: string;
  score: number;
}

export interface IProcedureField {
  id: string;
  type: ProcedureFieldType;
  label: string;
  required: boolean;
  options: string[];             // multiple_choice choices
  order: number;

  scoringEnabled: boolean;
  maxScore: number;              // points this field is worth when scoringEnabled
  optionScores: IOptionScore[];  // per-option point values for multiple_choice

  condition: IProcedureFieldCondition | null;
}

export interface IProcedure {
  id: number;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  status: ProcedureStatus;
  fields: IProcedureField[];

  tags: string[];
  teams: string[];               // team names "in charge" — free text, same convention as Equipment.maintenanceTeam

  scoringEnabled: boolean;
  goalScore: number;             // falling under this triggers a corrective action, same as MaintainX

  createdByName: string;
  active: boolean;
}

export interface IProcedureDocument extends Document, IProcedure {
  createdAt: Date;
  updatedAt: Date;
}

const conditionSchema = new Schema<IProcedureFieldCondition>(
  {
    fieldId: { type: String, required: true },
    equals: { type: String, required: true },
  },
  { _id: false },
);

const optionScoreSchema = new Schema<IOptionScore>(
  {
    option: { type: String, required: true },
    score: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const fieldSchema = new Schema<IProcedureField>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: VALID_FIELD_TYPES, required: true },
    label: { type: String, required: true, trim: true },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
    order: { type: Number, default: 0 },

    scoringEnabled: { type: Boolean, default: false },
    maxScore: { type: Number, default: 0, min: 0 },
    optionScores: { type: [optionScoreSchema], default: [] },

    condition: { type: conditionSchema, default: null },
  },
  { _id: false },
);

const procedureSchema = new Schema<IProcedureDocument>(
  {
    id: { type: Number, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    coverImageUrl: { type: String, default: null },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    fields: { type: [fieldSchema], default: [] },

    tags: { type: [String], default: [], index: true },
    teams: { type: [String], default: [] },

    scoringEnabled: { type: Boolean, default: false },
    goalScore: { type: Number, default: 0, min: 0 },

    createdByName: { type: String, required: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

procedureSchema.pre("save", async function () {
  if (this.isNew && !this.id) {
    this.id = await getNextSequence("procedure");
  }
});

const ProcedureModel: Model<IProcedureDocument> =
  mongoose.models.Procedure || mongoose.model<IProcedureDocument>("Procedure", procedureSchema);

export default ProcedureModel;