import { Router } from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth.js";
import {
  getAllProcedures,
  getProcedureById,
  createProcedure,
  updateProcedure,
  deleteProcedure,
  publishProcedure,
  duplicateProcedure,
  addProcedureField,
  updateProcedureField,
  removeProcedureField,
  reorderProcedureFields,
  attachProcedureToRequest,
  bulkAttachProcedure,
  submitProcedureResponses,
  completeProcedure,
    getProcedureInstance,
  getProcedureInstances,

} from "../controllers/Procedure.controller.js";

const procedureRouter = Router();

// ─── Reads — anyone authenticated can browse the library ────────────────────
procedureRouter.get("/get-all-procedures", isAuthenticated, getAllProcedures);
procedureRouter.get("/get-procedure/:id", isAuthenticated, getProcedureById);

// ─── Library management — Administrators (manager) and Full Users (Enduser) ─
procedureRouter.post("/create-procedure", isAuthenticated, authorizeRoles("manager", "Enduser"), createProcedure);
procedureRouter.put("/update-procedure/:id", isAuthenticated, authorizeRoles("manager", "Enduser"), updateProcedure);
procedureRouter.delete("/delete-procedure/:id", isAuthenticated, authorizeRoles("manager", "Enduser"), deleteProcedure);
procedureRouter.patch("/publish/:id", isAuthenticated, authorizeRoles("manager", "Enduser"), publishProcedure);
procedureRouter.post("/duplicate/:id", isAuthenticated, authorizeRoles("manager", "Enduser"), duplicateProcedure);

// ─── Field management ────────────────────────────────────────────────────────
procedureRouter.post("/add-field/:id", isAuthenticated, authorizeRoles("manager", "Enduser"), addProcedureField);
procedureRouter.put(
  "/update-field/:id/:fieldId",
  isAuthenticated,
  authorizeRoles("manager", "Enduser"),
  updateProcedureField,
);
procedureRouter.delete(
  "/remove-field/:id/:fieldId",
  isAuthenticated,
  authorizeRoles("manager", "Enduser"),
  removeProcedureField,
);
procedureRouter.patch(
  "/reorder-fields/:id",
  isAuthenticated,
  authorizeRoles("manager", "Enduser"),
  reorderProcedureFields,
);

// ─── Attach to work orders — same "Administrator or Full User" split as POs ──
procedureRouter.post(
  "/attach/:procedureId/request/:requestId",
  isAuthenticated,
  authorizeRoles("manager", "Enduser"),
  attachProcedureToRequest,
);
procedureRouter.post(
  "/attach/:procedureId/bulk",
  isAuthenticated,
  authorizeRoles("manager", "Enduser"),
  bulkAttachProcedure,
);

// ─── Fill out a procedure — technicians are the ones executing the work ─────
procedureRouter.get("/request/:requestId/instances", isAuthenticated, getProcedureInstances);
procedureRouter.get("/request/:requestId/instance", isAuthenticated, getProcedureInstance);
procedureRouter.get("/request/:requestId/instance/:instanceId", isAuthenticated, getProcedureInstance);

procedureRouter.patch(
  "/request/:requestId/responses",

  isAuthenticated,
  authorizeRoles("manager", "Enduser", "technician"),
  submitProcedureResponses,
);
procedureRouter.patch(
  "/request/:requestId/instance/:instanceId/responses",
  isAuthenticated,
  authorizeRoles("manager", "Enduser", "technician"),
  submitProcedureResponses,
);
procedureRouter.patch(
  "/request/:requestId/complete",
  isAuthenticated,
  authorizeRoles("manager", "Enduser", "technician"),
  completeProcedure,
);
procedureRouter.patch(
  "/request/:requestId/instance/:instanceId/complete",
  isAuthenticated,
  authorizeRoles("manager", "Enduser", "technician"),
  completeProcedure,
);


export default procedureRouter;