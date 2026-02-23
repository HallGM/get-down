/**
 * Core model interfaces and types for the get-down application.
 * These are shared across API and frontend.
 */

export interface Service {
  id: number;
  name: string;
}

export interface Enquiry {
  id?: number | string;
  createdAt: Date;
  firstName: string;
  lastName: string;
  partnersName?: string;
  email: string;
  phone?: string;
  eventDate?: Date;
  venueLocation?: string;
  services: string[] | Service[];
  otherServices: string[];
  message?: string;
}

export interface EnquiryWithServices extends Enquiry {
  services: Service[];
}

/**
 * Request/Response DTOs for API endpoints
 */

export interface CreateEnquiryRequest {
  firstName: string;
  lastName: string;
  partnersName?: string;
  email: string;
  phone?: string;
  eventDate?: string;
  venueLocation?: string;
  services: (number | string)[];
  otherServices?: string[];
  message?: string;
}

export interface EnquiryResponse {
  id: number;
  createdAt: string;
  firstName: string;
  lastName: string;
  partnersName?: string;
  email: string;
  phone?: string;
  eventDate?: string;
  venueLocation?: string;
  services: Service[];
  otherServices: string[];
  message?: string;
}

export interface ApiErrorResponse {
  message: string;
  code?: string;
}

export interface EmailMessageRequest {
  firstName: string;
  partnersName?: string;
  services: string[];
}

export interface EmailMessageResponse {
  message: string;
}

/**
 * Factory functions for creating instances
 */

export function createEnquiry(data: Partial<Enquiry>): Enquiry {
  return {
    id: data.id,
    createdAt: data.createdAt || new Date(),
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    partnersName: data.partnersName || "",
    email: (data.email || "").trim().replace(/\s+/g, ""),
    phone: data.phone || "",
    eventDate: data.eventDate,
    venueLocation: data.venueLocation || "",
    services: Array.isArray(data.services) ? data.services : [],
    otherServices: Array.isArray(data.otherServices) ? data.otherServices : [],
    message: data.message || "",
  };
}

export function createService(id: number, name: string): Service {
  return { id, name };
}
