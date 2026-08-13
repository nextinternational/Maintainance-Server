import mongoose, { Document, Model, Schema } from "mongoose";
import { IOptionScore, IProcedureField, IProcedureFieldCondition } from "./Procedure.model.js";

export type MaintenanceStatus = "new" | "under_repair" | "done" | "cancel" |"pending_review";
export const VALID_STATUSES: MaintenanceStatus[] = ["new", "under_repair", "pending_review", "done", "cancel"];

export interface IMaintenanceMedia {
  url: string;
  public_id: string | null;
  type: "image" | "video";
}

export interface ITechnicianRef {
  id: string;
  name: string;
  email: string;
}
export interface IReviewCriteria {
  professionalism: number; // 1-5
  communication: number;   // 1-5
  quality: number;         // 1-5
}

export interface IPerformanceReview {
  criteria: IReviewCriteria | null;
  overallRating: number | null; // 1-5
  comment: string | null;
  signatureUrl: string | null;
  signaturePublicId: string | null;
  ratedAt: Date | null;
  ratedBy: string | null;
}


export interface IMaintenanceRequest extends Document {
  id: number;
  name: string;
  equipmentId: number;
  priority: string;
  description: string;
  reportedBy: string;
  reportedByEmail: string;
  status: MaintenanceStatus;
  source: "reactive" | "repeatable";
  technicians: ITechnicianRef[];
  scheduleDate: Date | null;
  closeDate: Date | null;
  media: IMaintenanceMedia[];
   technicianCompletedAt: Date | null;
  technicianCompletedBy: string | null;
  completionNotes: string | null;
  review: IPerformanceReview;           
  createdAt: Date;
  updatedAt: Date;
     partsUsed: IUsedPart[];
  /** @deprecated Legacy records only; new writes use `procedures`. */
  procedure: IProcedureInstance | null;
  procedures: IProcedureInstance[];

}
export interface IProcedureFieldResponse {
  fieldId: string;
  value: string | number | boolean | string[] | null;
  scoreEarned: number | null;
}

export interface IProcedureInstance {
  instanceId: string;
  procedureId: number | null;   // null if the source procedure was later deleted

  title: string;
  fields: IProcedureField[];    // snapshot of the template's fields at attach time
  responses: IProcedureFieldResponse[];
  scoringEnabled: boolean;
  maxScore: number;
  totalScore: number | null;
  completedAt: Date | null;
  completedBy: string | null;
  attachedAt: Date;
  attachedBy: string;
}
// ─── Auto-increment counter ────────────────────────────────────────────────
interface ICounter extends Omit<Document, "_id"> {
  _id: string;
  seq: number;
}
export interface IUsedPart {
  partId: number;
  partName: string | null;
  quantity: number;
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

const mediaSchema = new Schema<IMaintenanceMedia>(
  {
    url: { type: String, required: true },
    public_id: { type: String, default: null },
    type: { type: String, enum: ["image", "video"], required: true },
  },
  { _id: false },
);

const technicianSchema = new Schema<ITechnicianRef>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
  },
  { _id: false },
);


const reviewCriteriaSchema = new Schema<IReviewCriteria>(
  {
    professionalism: { type: Number, min: 1, max: 5, required: true },
    communication: { type: Number, min: 1, max: 5, required: true },
    quality: { type: Number, min: 1, max: 5, required: true },
  },
  { _id: false },
);
const reviewSchema = new Schema<IPerformanceReview>(
  {
    criteria: { type: reviewCriteriaSchema, default: null },
    overallRating: { type: Number, min: 1, max: 5, default: null },
    comment: { type: String, default: null },
    signatureUrl: { type: String, default: null },
    signaturePublicId: { type: String, default: null },
    ratedAt: { type: Date, default: null },
    ratedBy: { type: String, default: null },
  },
  { _id: false },
);

const usedPartSchema = new Schema<IUsedPart>(
  {
    partId: {
      type: Number,
      required: true,
    },
    partName: {
      type: String,
      default: null,
    },
    quantity: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);
const procConditionSchema = new Schema<IProcedureFieldCondition>(
  { fieldId: { type: String, required: true }, equals: { type: String, required: true } },
  { _id: false },
);
const procOptionScoreSchema = new Schema<IOptionScore>(
  { option: { type: String, required: true }, score: { type: Number, required: true, min: 0 } },
  { _id: false },
);
const procFieldSchema = new Schema<IProcedureField>(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    label: { type: String, required: true },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
    order: { type: Number, default: 0 },
    scoringEnabled: { type: Boolean, default: false },
    maxScore: { type: Number, default: 0 },
    optionScores: { type: [procOptionScoreSchema], default: [] },
    condition: { type: procConditionSchema, default: null },
  },
  { _id: false },
);
const procResponseSchema = new Schema<IProcedureFieldResponse>(
  {
    fieldId: { type: String, required: true },
    value: { type: Schema.Types.Mixed, default: null },
    scoreEarned: { type: Number, default: null },
  },
  { _id: false },
);
const procInstanceSchema = new Schema<IProcedureInstance>(
  {
    instanceId: { type: String, required: true },
    procedureId: { type: Number, default: null },

    title: { type: String, required: true },
    fields: { type: [procFieldSchema], default: [] },
    responses: { type: [procResponseSchema], default: [] },
    scoringEnabled: { type: Boolean, default: false },
    maxScore: { type: Number, default: 0 },
    totalScore: { type: Number, default: null },
    completedAt: { type: Date, default: null },
    completedBy: { type: String, default: null },
    attachedAt: { type: Date, default: () => new Date() },
    attachedBy: { type: String, required: true },
  },
  { _id: false },
);
const maintenanceRequestSchema = new Schema<IMaintenanceRequest>(
  {
    id: { type: Number, unique: true, index: true },
    name: { type: String, required: true },
    equipmentId: { type: Number, required: true, index: true },
  priority: { type: String, enum: ["high", "medium", "low", "none"], default: "none", required: true },
    description: { type: String, required: true },
    reportedBy: { type: String, required: true },
    reportedByEmail: { type: String, required: true },
    
    status: {
      type: String,
      enum: ["new", "under_repair","pending_review", "done", "cancel"],
      default: "new",
      index: true,
    },
    source: {
      type: String,
      enum: ["reactive", "repeatable"],
      default: "reactive",
      index: true,
    },
    technicians: { type: [technicianSchema], default: [] },
    scheduleDate: { type: Date, default: null },
    closeDate: { type: Date, default: null },
    media: { type: [mediaSchema], default: [] },
      technicianCompletedAt: { type: Date, default: null },
    technicianCompletedBy: { type: String, default: null },
    completionNotes: { type: String, default: null },
        review: { type: reviewSchema, default: () => ({}) },
    // Legacy singular field retained so old documents remain readable.
    procedure: { type: procInstanceSchema, default: null },
    procedures: { type: [procInstanceSchema], default: [] },
     partsUsed: {

   type: [usedPartSchema],
   default: [],
 },
    
  },
  { timestamps: true },
);

maintenanceRequestSchema.pre("save", async function () {
  if (this.isNew && !this.id) {
    this.id = await getNextSequence("maintenanceRequest");
  }
});

const MaintenanceRequestModel: Model<IMaintenanceRequest> =
  mongoose.models.MaintenanceRequest ||
  mongoose.model<IMaintenanceRequest>("MaintenanceRequest", maintenanceRequestSchema);

export default MaintenanceRequestModel;