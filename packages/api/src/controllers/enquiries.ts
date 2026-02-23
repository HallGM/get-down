import express, { Router, Request, Response } from "express";
import { createEnquiry as createEnquiryModel, type Enquiry } from "@get-down/shared";
import * as svcEnquiries from "../services/enquiries.js";

const router: Router = express.Router();

router.post("/enquiry", createEnquiry);
router.post("/enquiry/message", emailMessage);
router.get("/enquiries", getEnquiries);
router.delete("/enquiry/:id", deleteEnquiry);

async function createEnquiry(req: Request, res: Response): Promise<void> {
  try {
    await svcEnquiries.createEnquiry(req.body);
    res.status(201).send();
  } catch (error) {
    console.error("Error creating enquiry:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function getEnquiries(req: Request, res: Response): Promise<void> {
  try {
    const enquiries = await svcEnquiries.getEnquiries();
    res.status(200).json(enquiries);
  } catch (error) {
    console.error("Error fetching enquiries:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function deleteEnquiry(req: Request, res: Response): Promise<void> {
  try {
    await svcEnquiries.deleteEnquiry(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting enquiry:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function emailMessage(req: Request, res: Response): Promise<void> {
  try {
    const { firstName, partnersName, services } = req.body;

    // Validate required fields
    if (!firstName || !Array.isArray(services)) {
      res.status(400).json({
        message: "firstName and services (array) are required",
      });
      return;
    }

    // Create enquiry object for message generation
    const enquiry: Enquiry = {
      firstName: firstName.trim(),
      partnersName: partnersName?.trim() || undefined,
      services: services,
    } as Enquiry;

    // Generate email message
    const messageText = svcEnquiries.getText(enquiry);

    res.status(200).json({
      message: messageText,
    });
  } catch (error) {
    console.error("Error generating email message:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export default router;
