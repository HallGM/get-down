/**
 * Core model interfaces and types for the get-down application.
 * These are shared across API and frontend.
 */

export interface Service {
  id: number;
  name: string;
  category?: string;
  description?: string;
  priceToClient?: number;
  feePerPerson?: number;
  numberOfPeople?: number;
  extraFee?: number;
  extraFeeDescription?: string;
  isBand?: boolean;
  isDj?: boolean;
  isActive?: boolean;
  airtableId?: string;
}

export interface CreateServiceRequest {
  name: string;
  category?: string;
  description?: string;
  priceToClient?: number;
  feePerPerson?: number;
  numberOfPeople?: number;
  extraFee?: number;
  extraFeeDescription?: string;
  isBand?: boolean;
  isDj?: boolean;
  isActive?: boolean;
  airtableId?: string;
}

export interface UpdateServiceRequest {
  name?: string;
  category?: string;
  description?: string;
  priceToClient?: number;
  feePerPerson?: number;
  numberOfPeople?: number;
  extraFee?: number;
  extraFeeDescription?: string;
  isBand?: boolean;
  isDj?: boolean;
  isActive?: boolean;
  airtableId?: string;
}

export interface Person {
  id: number;
  firstName: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  bankDetails?: string;
  isPartner: boolean;
  isActive: boolean;
  airtableId?: string;
}

export interface CreatePersonRequest {
  firstName: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  bankDetails?: string;
  isPartner?: boolean;
  isActive?: boolean;
  airtableId?: string;
}

export interface UpdatePersonRequest {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  bankDetails?: string;
  isPartner?: boolean;
  isActive?: boolean;
  airtableId?: string;
}

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName?: string;
  displayName?: string;
  isPartner: boolean;
  accountId?: number;
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
  airtableId?: string;
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
  airtableId?: string;
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

export interface Attribution {
  id: number;
  name: string;
  type: string;
  notes?: string;
  airtableId?: string;
}

export interface CreateAttributionRequest {
  name: string;
  type: string;
  notes?: string;
  airtableId?: string;
}

export interface UpdateAttributionRequest {
  name?: string;
  type?: string;
  notes?: string;
  airtableId?: string;
}

export interface GigLineItem {
  id: number;
  gigId: number;
  description?: string;
  amount?: number;
}

export interface CreateGigLineItemRequest {
  description?: string;
  amount?: number;
}

export interface Gig {
  id: number;
  enquiryId?: number;
  attributionId?: number;
  name?: string;
  status: string;
  firstName: string;
  lastName: string;
  partnerName?: string;
  email?: string;
  phone?: string;
  date: string;
  venueName?: string;
  location?: string;
  description?: string;
  totalPrice?: number;
  depositPaid: number;
  balanceAmount: number;
  travelCost: number;
  discountPercent: number;
  lineItems?: GigLineItem[];
  services?: Service[];
  airtableId?: string;
}

export interface CreateGigRequest {
  enquiryId?: number;
  attributionId?: number;
  name?: string;
  status?: string;
  firstName: string;
  lastName: string;
  partnerName?: string;
  email?: string;
  phone?: string;
  date: string;
  venueName?: string;
  location?: string;
  description?: string;
  totalPrice?: number;
  depositPaid?: number;
  balanceAmount?: number;
  travelCost?: number;
  discountPercent?: number;
  airtableId?: string;
}

export interface UpdateGigRequest {
  enquiryId?: number;
  attributionId?: number;
  name?: string;
  status?: string;
  firstName?: string;
  lastName?: string;
  partnerName?: string;
  email?: string;
  phone?: string;
  date?: string;
  venueName?: string;
  location?: string;
  description?: string;
  totalPrice?: number;
  depositPaid?: number;
  balanceAmount?: number;
  travelCost?: number;
  discountPercent?: number;
  airtableId?: string;
}

export interface Showcase {
  id: number;
  attributionId: number;
  nickname?: string;
  fullName?: string;
  name?: string;
  date: string;
  location?: string;
  airtableId?: string;
}

export interface CreateShowcaseRequest {
  attributionId: number;
  nickname?: string;
  fullName?: string;
  name?: string;
  date: string;
  location?: string;
  airtableId?: string;
}

export interface UpdateShowcaseRequest {
  attributionId?: number;
  nickname?: string;
  fullName?: string;
  name?: string;
  date?: string;
  location?: string;
  airtableId?: string;
}

export interface FeeAllocation {
  id: number;
  personId: number;
  notes?: string;
  isInvoiced: boolean;
  isPaid: boolean;
  invoiceRef?: string;
  lineItems?: FeeAllocationLineItem[];
}

export interface FeeAllocationLineItem {
  id: number;
  allocationId: number;
  description?: string;
  amount?: number;
}

export interface CreateFeeAllocationRequest {
  personId: number;
  notes?: string;
  isInvoiced?: boolean;
  isPaid?: boolean;
  invoiceRef?: string;
}

export interface UpdateFeeAllocationRequest {
  personId?: number;
  notes?: string;
  isInvoiced?: boolean;
  isPaid?: boolean;
  invoiceRef?: string;
}

export interface CreateFeeAllocationLineItemRequest {
  description?: string;
  amount?: number;
}

export interface AssignedRole {
  id: number;
  gigId?: number;
  showcaseId?: number;
  personId?: number;
  roleName: string;
  feeAllocationId?: number;
}

export interface CreateAssignedRoleRequest {
  gigId?: number;
  showcaseId?: number;
  personId?: number;
  roleName: string;
  feeAllocationId?: number;
}

export interface UpdateAssignedRoleRequest {
  gigId?: number;
  showcaseId?: number;
  personId?: number;
  roleName?: string;
  feeAllocationId?: number;
}

export interface ApiErrorResponse {
  message: string;
  code?: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface EmailMessageRequest {
  firstName: string;
  partnersName?: string;
  services: string[];
}

export interface EmailMessageResponse {
  message: string;
}

export interface Expense {
  id: number;
  date?: string;
  amount: number;
  description: string;
  category?: string;
  recipientName?: string;
  paymentMethod?: string;
  airtableId?: string;
}

export interface CreateExpenseRequest {
  date?: string;
  amount: number;
  description: string;
  category?: string;
  recipientName?: string;
  paymentMethod?: string;
  airtableId?: string;
}

export interface UpdateExpenseRequest {
  date?: string;
  amount?: number;
  description?: string;
  category?: string;
  recipientName?: string;
  paymentMethod?: string;
  airtableId?: string;
}

export interface Payment {
  id: number;
  gigId: number;
  date?: string;
  amount: number;
  method?: string;
  description?: string;
  airtableId?: string;
}

export interface CreatePaymentRequest {
  gigId: number;
  date?: string;
  amount: number;
  method?: string;
  description?: string;
  airtableId?: string;
}

export interface UpdatePaymentRequest {
  gigId?: number;
  date?: string;
  amount?: number;
  method?: string;
  description?: string;
  airtableId?: string;
}

export interface InvoiceLineItem {
  id: number;
  invoiceId: number;
  description?: string;
  amount?: number;
}

export interface InvoiceAdditionalCharge {
  id: number;
  invoiceId: number;
  description?: string;
  amount?: number;
}

export interface InvoicePaymentMade {
  id: number;
  invoiceId: number;
  description?: string;
  date?: string;
  amount?: number;
}

export interface Invoice {
  id: number;
  gigId: number;
  invoiceNumber: string;
  customerName: string;
  eventDate?: string;
  venue?: string;
  date: string;
  subtotalAmount: number;
  discountPercent: number;
  travelCost: number;
  totalAmount: number;
  amountDue: number;
  lineItems?: InvoiceLineItem[];
  additionalCharges?: InvoiceAdditionalCharge[];
  paymentsMade?: InvoicePaymentMade[];
}

export interface CreateInvoiceRequest {
  gigId: number;
}

export interface UpdateInvoiceRequest {
  invoiceNumber?: string;
  customerName?: string;
  eventDate?: string;
  venue?: string;
  date?: string;
  subtotalAmount?: number;
  discountPercent?: number;
  travelCost?: number;
  totalAmount?: number;
  amountDue?: number;
}

export interface CreateInvoiceLineItemRequest {
  description?: string;
  amount?: number;
}

export interface AccountTransaction {
  id: number;
  accountId: number;
  date?: string;
  amount: number;
  type: string;
  description?: string;
}

export interface CreateAccountTransactionRequest {
  accountId: number;
  date?: string;
  amount: number;
  type: string;
  description?: string;
}

export interface Song {
  id: number;
  title: string;
  artist?: string;
  genre?: string;
  musicalKey?: string;
  bpm?: number;
  vocalType?: string;
  airtableId?: string;
}

export interface CreateSongRequest {
  title: string;
  artist?: string;
  genre?: string;
  musicalKey?: string;
  bpm?: number;
  vocalType?: string;
  airtableId?: string;
}

export interface UpdateSongRequest {
  title?: string;
  artist?: string;
  genre?: string;
  musicalKey?: string;
  bpm?: number;
  vocalType?: string;
  airtableId?: string;
}

export interface SetListItem {
  id: number;
  gigId: number;
  songId: number;
  position?: number;
  notes?: string;
}

export interface SetListItemWithSong extends SetListItem {
  title: string;
  artist?: string;
  musicalKey?: string;
  vocalType?: string;
  isMustPlay: boolean;
  isFavourite: boolean;
}

export interface CreateSetListItemRequest {
  songId: number;
  position?: number;
  notes?: string;
}

export interface GigSongPreferences {
  favourites: number[];
  mustPlays: number[];
  doNotPlays: number[];
}

export interface ReorderSetListRequest {
  itemIds: number[];
}

export interface Rehearsal {
  id: number;
  name: string;
  date: string;
  location?: string;
  cost?: number;
  notes?: string;
  airtableId?: string;
}

export interface CreateRehearsalRequest {
  name: string;
  date: string;
  location?: string;
  cost?: number;
  notes?: string;
  gigIds?: number[];
  airtableId?: string;
}

export interface UpdateRehearsalRequest {
  name?: string;
  date?: string;
  location?: string;
  cost?: number;
  notes?: string;
  gigIds?: number[];
  airtableId?: string;
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
    airtableId: data.airtableId,
  };
}

export function createService(id: number, name: string): Service {
  return { id, name };
}
