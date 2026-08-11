import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler.js";
import {
  fetchAllProcedures,
  fetchProcedureById,
  createProcedureService,
  updateProcedureService,
  deleteProcedureService,
  publishProcedureService,
  duplicateProcedureService,
  addFieldService,
  updateFieldService,
  removeFieldService,
  reorderFieldsService,
  attachProcedureToRequestService,
  bulkAttachProcedureService,
  submitProcedureResponsesService,
  completeProcedureService,
  fetchProcedureInstanceService,
} from "../services/Procedure.service.js";

// ─── Get all procedures ─────────────────────────────────────────────────────
// ?status=published&tag=safety&search=forklift

export const getAllProcedures = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, tag, search } = req.query as { status?: string; tag?: string; search?: string };
    const procedures = await fetchAllProcedures({ status, tag, search });

    res.status(200).json({ success: true, total: procedures.length, data: procedures });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

// ─── Get procedure by ID ─────────────────────────────────────────────────────

export const getProcedureById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid ID" });

    const procedure = await fetchProcedureById(id);
    if (!procedure) return res.status(404).json({ success: false, message: "Procedure not found" });

    res.status(200).json({ success: true, data: procedure });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

// ─── Create procedure ────────────────────────────────────────────────────────

export const createProcedure = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, coverImageUrl, tags, teams, scoringEnabled, goalScore } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: "title is required" });
    }

    const actor = req.user as any;
    const procedure = await createProcedureService({
      title,
      description,
      coverImageUrl,
      tags,
      teams,
      scoringEnabled,
      goalScore,
      createdByName: actor?.name ?? "Unknown",
    });

    res.status(201).json({ success: true, message: "Procedure created successfully", data: procedure });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

// ─── Update procedure ────────────────────────────────────────────────────────

export const updateProcedure = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid ID" });

    const { title, description, coverImageUrl, tags, teams, scoringEnabled, goalScore } = req.body;
    const updated = await updateProcedureService(id, {
      title,
      description,
      coverImageUrl,
      tags,
      teams,
      scoringEnabled,
      goalScore,
    });

    if (!updated) return res.status(404).json({ success: false, message: "Procedure not found" });

    res.status(200).json({ success: true, message: "Procedure updated successfully", data: updated });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

// ─── Delete (soft) procedure ─────────────────────────────────────────────────

export const deleteProcedure = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid ID" });

    const deleted = await deleteProcedureService(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Procedure not found" });

    res.status(200).json({ success: true, message: "Procedure deleted successfully" });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

// ─── Publish (draft → published) ─────────────────────────────────────────────

export const publishProcedure = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid ID" });

    const updated = await publishProcedureService(id);
    if (!updated) return res.status(404).json({ success: false, message: "Procedure not found" });

    res.status(200).json({ success: true, message: "Procedure published", data: updated });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

// ─── Duplicate ────────────────────────────────────────────────────────────────

export const duplicateProcedure = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid ID" });

    const actor = req.user as any;
    const copy = await duplicateProcedureService(id, actor?.name ?? "Unknown");
    if (!copy) return res.status(404).json({ success: false, message: "Procedure not found" });

    res.status(201).json({ success: true, message: "Procedure duplicated", data: copy });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

// ─── Fields ───────────────────────────────────────────────────────────────────
// Body: { type, label, required?, options?, scoringEnabled?, maxScore?, optionScores?, condition? }

export const addProcedureField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid ID" });

    const { type, label } = req.body;
    if (!type || !label?.trim()) {
      return res.status(400).json({ success: false, message: "type and label are required" });
    }

    const updated = await addFieldService(id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: "Procedure not found" });

    res.status(201).json({ success: true, message: "Field added", data: updated });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

export const updateProcedureField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const { fieldId } = req.params;
    if (isNaN(id) || !fieldId) {
      return res.status(400).json({ success: false, message: "Invalid id or fieldId" });
    }

    const updated = await updateFieldService(id, fieldId as string, req.body);
    if (!updated) return res.status(404).json({ success: false, message: "Procedure not found" });

    res.status(200).json({ success: true, message: "Field updated", data: updated });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

export const removeProcedureField = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    const { fieldId } = req.params;
    if (isNaN(id) || !fieldId) {
      return res.status(400).json({ success: false, message: "Invalid id or fieldId" });
    }

    const updated = await removeFieldService(id, fieldId as string);
    if (!updated) return res.status(404).json({ success: false, message: "Procedure not found" });

    res.status(200).json({ success: true, message: "Field removed", data: updated });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

// Body: { orderedFieldIds: string[] }

export const reorderProcedureFields = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ success: false, message: "Invalid ID" });

    const { orderedFieldIds } = req.body as { orderedFieldIds: string[] };
    if (!Array.isArray(orderedFieldIds) || !orderedFieldIds.length) {
      return res.status(400).json({ success: false, message: "orderedFieldIds must be a non-empty array" });
    }

    const updated = await reorderFieldsService(id, orderedFieldIds);
    if (!updated) return res.status(404).json({ success: false, message: "Procedure not found" });

    res.status(200).json({ success: true, message: "Fields reordered", data: updated });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

// ─── Attach to work order(s) ──────────────────────────────────────────────────

export const attachProcedureToRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const procedureId = parseInt(req.params.procedureId as string);
    const requestId = parseInt(req.params.requestId as string);
    if (isNaN(procedureId) || isNaN(requestId)) {
      return res.status(400).json({ success: false, message: "Invalid procedureId or requestId" });
    }

    const actor = req.user as any;
    const updated = await attachProcedureToRequestService(procedureId, requestId, {
      name: actor?.name ?? "Unknown",
    });

    if (!updated) return res.status(404).json({ success: false, message: "Work order not found" });

    res.status(200).json({ success: true, message: "Procedure attached to work order", data: updated });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

// Body: { requestIds: number[] }

export const bulkAttachProcedure = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const procedureId = parseInt(req.params.procedureId as string);
    if (isNaN(procedureId)) return res.status(400).json({ success: false, message: "Invalid procedureId" });

    const { requestIds } = req.body as { requestIds: number[] };
    if (!Array.isArray(requestIds) || !requestIds.length) {
      return res.status(400).json({ success: false, message: "requestIds must be a non-empty array" });
    }

    const actor = req.user as any;
    const result = await bulkAttachProcedureService(procedureId, requestIds, {
      name: actor?.name ?? "Unknown",
    });

    res.status(200).json({
      success: true,
      message: `Procedure added to ${result.modified} work order(s)`,
      data: result,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

// ─── Fill out / complete ──────────────────────────────────────────────────────

export const getProcedureInstance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestId = parseInt(req.params.requestId as string);
    if (isNaN(requestId)) return res.status(400).json({ success: false, message: "Invalid requestId" });

    const instance = await fetchProcedureInstanceService(requestId);
    res.status(200).json({ success: true, data: instance });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

// Body: { responses: [{ fieldId, value }] }

export const submitProcedureResponses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestId = parseInt(req.params.requestId as string);
    if (isNaN(requestId)) return res.status(400).json({ success: false, message: "Invalid requestId" });

    const { responses } = req.body as { responses: { fieldId: string; value: any }[] };
    if (!Array.isArray(responses) || !responses.length) {
      return res.status(400).json({ success: false, message: "responses must be a non-empty array" });
    }

    const updated = await submitProcedureResponsesService(requestId, responses);
    if (!updated) return res.status(404).json({ success: false, message: "Work order not found" });

    res.status(200).json({ success: true, message: "Responses saved", data: updated.procedure });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};

export const completeProcedure = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestId = parseInt(req.params.requestId as string);
    if (isNaN(requestId)) return res.status(400).json({ success: false, message: "Invalid requestId" });

    const actor = req.user as any;
    const updated = await completeProcedureService(requestId, { name: actor?.name ?? "Unknown" });
    if (!updated) return res.status(404).json({ success: false, message: "Work order not found" });

    res.status(200).json({ success: true, message: "Procedure completed", data: updated.procedure });
  } catch (error: any) {
    return next(new ErrorHandler(error.message || "Something went wrong", 400));
  }
};