import express from "express";
import svcEnquiries from "../services/enquiries.mjs";

const router = express.Router();

router.post("/enquiry", createEnquiry);
router.get("/enquiries", getEnquiries);
router.delete("/enquiry/:id", deleteEnquiry);

async function createEnquiry(req, res) {
  try {
    await svcEnquiries.createEnquiry(req.body);
    res.status(201).send();
  } catch (error) {
    console.error("Error creating enquiry:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function getEnquiries(req, res) {
  try {
    let enquiries = await svcEnquiries.getEnquiries();
    res.status(200).json(enquiries);
  } catch (error) {
    console.error("Error creating enquiry:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

async function deleteEnquiry(req, res) {
  try {
    await svcEnquiries.deleteEnquiry(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting enquiry:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export default router;
