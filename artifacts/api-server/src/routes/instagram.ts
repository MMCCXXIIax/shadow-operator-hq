import { Router, type IRouter } from "express";
import { GetInstagramStatusResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/route-auth";
import { instagramConfigStatus } from "../lib/instagram/config";

const router: IRouter = Router();

// Answers "is Instagram data access wired up yet, and if not what is missing?"
// without ever returning a credential value.
router.get("/instagram/status", (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  res.json(GetInstagramStatusResponse.parse(instagramConfigStatus()));
});

export default router;
