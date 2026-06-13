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
  /** Computed: count of role slots linked to this service (read-only, not in mutation requests). */
  numberOfPeople?: number;
  extraFee?: number;
  extraFeeDescription?: string;
  isBand?: boolean;
  isDjOnly?: boolean;
  requiresMeal?: boolean;
  isActive?: boolean;
  airtableId?: string;
}

export interface CreateServiceRequest {
  name: string;
  category?: string;
  description?: string;
  priceToClient?: number;
  extraFee?: number;
  extraFeeDescription?: string;
  isBand?: boolean;
  isDjOnly?: boolean;
  requiresMeal?: boolean;
  isActive?: boolean;
  airtableId?: string;
}

export interface UpdateServiceRequest {
  name?: string;
  category?: string;
  description?: string;
  priceToClient?: number;
  extraFee?: number;
  extraFeeDescription?: string;
  isBand?: boolean;
  isDjOnly?: boolean;
  requiresMeal?: boolean;
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
  performerToken?: string;
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
  performerToken?: string;
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
  /** Present on single-record fetch only. */
  showcase?: { id: number; date: string; location?: string };
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

export interface AttributionFee {
  id: number;
  attributionId: number;
  description?: string;
  date?: string;
  amount?: number;
  /** IDs of expenses linked to this fee via attribution_fees_expenses. Always present. */
  expenseIds: number[];
}

export interface CreateAttributionFeeRequest {
  description?: string;
  date?: string;
  amount?: number;
}

export interface UpdateAttributionFeeRequest {
  description?: string;
  date?: string;
  amount?: number;
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
  depositPaid?: number;
  balanceAmount?: number;
  travelCost: number;
  discountPercent: number;
  lineItems?: GigLineItem[];
  services?: Service[];
  airtableId?: string;
  // Event details
  timings?: string;
  contactNumber?: string;
  parkingInfo?: string;
  mealDetails?: string;
  clientNotes?: string;
  performerNotes?: string;
  playlistUrl?: string;
  endOfNightSong?: string;
  firstDanceSong?: string;
  firstDanceType?: string;
  ceilidh?: boolean;
  ceilidhLength?: string;
  ceilidhStyle?: string;
  // Client form
  clientToken?: string;
  formSavedAt?: string;
  // Media delivery
  vimeoUrl?: string;
  dropboxUrl?: string;
  deliveryTitle?: string;
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
  travelCost?: number;
  discountPercent?: number;
  airtableId?: string;
  // Event details
  timings?: string;
  contactNumber?: string;
  parkingInfo?: string;
  mealDetails?: string;
  clientNotes?: string;
  performerNotes?: string;
  playlistUrl?: string;
  endOfNightSong?: string;
  firstDanceSong?: string;
  firstDanceType?: string;
  ceilidh?: boolean;
  ceilidhLength?: string;
  ceilidhStyle?: string;
  // Media delivery
  vimeoUrl?: string;
  dropboxUrl?: string;
  deliveryTitle?: string;
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
  travelCost?: number;
  discountPercent?: number;
  airtableId?: string;
  // Event details
  timings?: string;
  contactNumber?: string;
  parkingInfo?: string;
  mealDetails?: string;
  clientNotes?: string;
  performerNotes?: string;
  playlistUrl?: string;
  endOfNightSong?: string;
  firstDanceSong?: string;
  firstDanceType?: string;
  ceilidh?: boolean;
  ceilidhLength?: string;
  ceilidhStyle?: string;
  // Media delivery
  vimeoUrl?: string;
  dropboxUrl?: string;
  deliveryTitle?: string;
}

// ─── Media delivery types ──────────────────────────────────────────────────────

export interface DeliveryVideo {
  id: number;
  title: string;
  vimeoUrl: string;
  position: number;
}

export interface CreateDeliveryVideoRequest {
  title: string;
  vimeoUrl: string;
}

export interface UpdateDeliveryVideoRequest {
  title?: string;
  vimeoUrl?: string;
}

export interface DeliveryPageResponse {
  firstName: string;
  lastName: string;
  partnerName?: string;
  date: string;
  venueName?: string;
  videos: DeliveryVideo[];
  dropboxUrl?: string;
  deliveryTitle?: string;
}

export interface DeliveryPhoto {
  name: string;
}

// ─── Performer portal types ────────────────────────────────────────────────────

/** Summary of a gig shown on the performer's gig list page */
export interface PerformerGig {
  id: number;
  date: string;
  firstName: string;
  lastName: string;
  venueName?: string;
  location?: string;
}

/** Full gig detail shown on the performer's gig detail page */
export interface PerformerGigDetail {
  id: number;
  date: string;
  firstName: string;
  lastName: string;
  venueName?: string;
  location?: string;
  services: { id: number; name: string }[];
  timings?: string;
  contactNumber?: string;
  parkingInfo?: string;
  clientNotes?: string;
  performerNotes?: string;
  playlistUrl?: string;
  endOfNightSong?: string;
  firstDanceSong?: string;
  firstDanceType?: string;
  ceilidh: boolean;
  ceilidhLength?: string;
  ceilidhStyle?: string;
  otherPerformers: { id: number; firstName: string; lastName?: string; displayName?: string }[];
  mustPlaySongs: { title: string; artist?: string }[];
  avoidSongs: { title: string; artist?: string }[];
}

/** Response shape for GET /performer/:token */
export interface PerformerResponse {
  person: { id: number; firstName: string; lastName?: string; displayName?: string };
  gigs: PerformerGig[];
}

// ─── Client form portal types ──────────────────────────────────────────────────

export interface ClientFormSongGroup {
  genre: string;
  songs: { id: number; title: string; artist?: string }[];
}

/** Response shape for GET /client-form/:token */
export interface ClientFormResponse {
  gigId: number;
  date: string;
  firstName: string;
  lastName: string;
  partnerName?: string;
  venueName?: string;
  location?: string;
  timings?: string;
  contactNumber?: string;
  parkingInfo?: string;
  mealDetails?: string;
  clientNotes?: string;
  playlistUrl?: string;
  endOfNightSong?: string;
  firstDanceSong?: string;
  firstDanceType?: string;
  ceilidh: boolean;
  ceilidhLength?: string;
  ceilidhStyle?: string;
  preferences: GigSongPreferences;
  songGroups: ClientFormSongGroup[];
  hasBand: boolean;
  hasDj: boolean;
  requiresMeal: boolean;
}

/** Request body for PUT /client-form/:token */
export type SaveClientFormRequest = Pick<
  UpdateGigRequest,
  | "venueName"
  | "location"
  | "timings"
  | "contactNumber"
  | "parkingInfo"
  | "mealDetails"
  | "clientNotes"
  | "playlistUrl"
  | "endOfNightSong"
  | "firstDanceSong"
  | "firstDanceType"
  | "ceilidh"
  | "ceilidhLength"
  | "ceilidhStyle"
> & { preferences: GigSongPreferences };

export interface ShowcaseExpenseLink {
  expenseId: number;
  /** null means the full expense amount applies to this showcase. */
  apportionedAmount: number | null;
}

export interface Showcase {
  id: number;
  attributionId: number;
  nickname?: string;
  fullName?: string;
  date: string;
  location?: string;
  airtableId?: string;
  costAirtable?: number;
  expenseLinks: ShowcaseExpenseLink[];
}

export interface CreateShowcaseRequest {
  /** Optional — if omitted the server auto-creates a linked attribution. */
  attributionId?: number;
  nickname?: string;
  fullName?: string;
  date: string;
  location?: string;
  airtableId?: string;
  costAirtable?: number;
}

export interface UpdateShowcaseRequest {
  attributionId?: number;
  nickname?: string;
  fullName?: string;
  date?: string;
  location?: string;
  airtableId?: string;
  costAirtable?: number;
}

export interface FeeAllocation {
  id: number;
  personId?: number;
  gigId?: number;
  notes?: string;
  isInvoiced: boolean;
  invoiceRef?: string;
  lineItems?: FeeAllocationLineItem[];
  /** IDs of expenses linked to this allocation via fee_allocations_expenses. Always present, never undefined. */
  expenseIds: number[];
  /** IDs of account transactions linked to this allocation via account_transactions_fee_allocations. Always present, never undefined. */
  transactionIds: number[];
}

export interface FeeAllocationLineItem {
  id: number;
  allocationId: number;
  description?: string;
  amount?: number;
}

export interface CreateFeeAllocationRequest {
  personId?: number;
  gigId: number;
  notes?: string;
  isInvoiced?: boolean;
  invoiceRef?: string;
}

export interface UpdateFeeAllocationRequest {
  personId?: number;
  gigId?: number;
  notes?: string;
  isInvoiced?: boolean;
  invoiceRef?: string;
}

export interface UpdateFeeAllocationLineItemRequest {
  description?: string;
  amount?: number;
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
  /** `null` explicitly clears the assigned person; `undefined` leaves it unchanged. */
  personId?: number | null;
  roleName?: string;
  /** `null` explicitly clears the fee allocation link; `undefined` leaves it unchanged. */
  feeAllocationId?: number | null;
}

export interface Role {
  id: number;
  name: string;
  fee?: number;
  /** Only present when the role is returned in the context of a specific service slot. */
  roleServicesId?: number;
}

export interface CreateRoleRequest {
  name: string;
  fee?: number;
}

export interface UpdateRoleRequest {
  name?: string;
  fee?: number;
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

/** Maximum allowed document attachment size in bytes (20 MB). */
export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024;

export interface ExpensePayment {
  id: number;
  expenseId: number;
  accountId: number;
  /** Signed amount in pennies: positive = payment, negative = refund. */
  amount: number;
  date?: string;
  paymentMethod?: string;
  description?: string;
}

export interface CreateExpensePaymentRequest {
  accountId: number;
  /** Signed amount in pennies: positive = payment, negative = refund. */
  amount: number;
  date?: string;
  paymentMethod?: string;
  description?: string;
}

export interface UpdateExpensePaymentRequest {
  accountId?: number;
  amount?: number;
  date?: string;
  paymentMethod?: string;
  description?: string;
}

export interface Expense {
  id: number;
  date?: string;
  amount: number;
  description: string;
  category?: string;
  recipientName?: string;
  airtableId?: string;
  documentUrl?: string;
  /** IDs of fee allocations linked to this expense via fee_allocations_expenses. Always present, never undefined. */
  feeAllocationIds: number[];
  /** IDs of attribution fees linked to this expense via attribution_fees_expenses. Always present, never undefined. */
  attributionFeeIds: number[];
  /** Sum of all payment amounts in pennies (after refunds). */
  totalPaid: number;
  /** Derived from totalPaid vs amount. */
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  /** Full list of payments. Present on single-record fetch; undefined on list fetch. */
  payments?: ExpensePayment[];
}

export interface CreateExpenseRequest {
  date?: string;
  amount: number;
  description: string;
  category?: string;
  recipientName?: string;
  airtableId?: string;
}

export interface UpdateExpenseRequest {
  date?: string;
  amount?: number;
  description?: string;
  category?: string;
  recipientName?: string;
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
  invoiceId?: number;
}

export interface Refund {
  id: number;
  gigId: number;
  date?: string;
  amount: number;
  method?: string;
  description?: string;
}

export interface CreateRefundRequest {
  gigId: number;
  date?: string;
  amount: number;
  method?: string;
  description?: string;
}

export interface UpdateRefundRequest {
  gigId?: number;
  date?: string;
  amount?: number;
  method?: string;
  description?: string;
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
  invoiceType: 'deposit' | 'balance';
  lineItems?: InvoiceLineItem[];
  additionalCharges?: InvoiceAdditionalCharge[];
  paymentsMade?: InvoicePaymentMade[];
}

export interface CreateInvoiceRequest {
  gigId: number;
  invoiceType?: 'deposit' | 'balance';
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
  invoiceType?: 'deposit' | 'balance';
}

export interface CreateInvoiceLineItemRequest {
  description?: string;
  amount?: number;
}

export interface UpdateInvoiceLineItemRequest {
  description?: string;
  amount?: number;
}

export interface UpdateInvoiceAdditionalChargeRequest {
  description?: string;
  amount?: number;
}

export interface UpdateInvoicePaymentMadeRequest {
  description?: string;
  date?: string;
  amount?: number;
}

export interface Account {
  id: number;
  /** Undefined for the business account. */
  personId?: number;
  personName: string;
  caBalance: number;
  isBusiness: boolean;
}

export interface CreateAccountRequest {
  personId: number;
}

export interface LinkedFeeAllocationSummary {
  id: number;
  eventName?: string;
  eventDate?: string;
  gigId?: number;
  showcaseId?: number;
  totalAmount: number;
  notes?: string;
}

export interface LedgerEntry {
  sourceId: number;
  entryType: 'transaction' | 'allocation' | 'expense_payment' | 'gig_payment' | 'drawing';
  accountId: number;
  date?: string;
  amount: number;
  label: string;
  description?: string;
  /** IDs of fee allocations linked to this transaction. Only present for transaction entries. */
  feeAllocationIds?: number[];
  /** Rich summaries of linked fee allocations. Only present for transaction entries. */
  linkedFeeAllocations?: LinkedFeeAllocationSummary[];
}

export interface AccountTransaction {
  id: number;
  accountId: number;
  date?: string;
  amount: number;
  type: string;
  description?: string;
  feeAllocationIds: number[];
}

export interface CreateAccountTransactionRequest {
  date: string;
  amount: number;
  type: string;
  description?: string;
  feeAllocationIds?: number[];
}

export interface UpdateAccountTransactionRequest {
  date?: string;
  amount?: number;
  type?: string;
  description?: string;
  feeAllocationIds?: number[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface CreateGenreRequest {
  name: string;
}

export interface Song {
  id: number;
  title: string;
  artist?: string;
  genre?: string;
  genreId?: number;
  musicalKey?: string;
  keyChange?: string;
  bpm?: number;
  vocalType?: string;
  airtableId?: string;
  duration?: number;
  active: boolean;
}

export interface CreateSongRequest {
  title: string;
  artist?: string;
  genreId?: number;
  musicalKey?: string;
  keyChange?: string;
  bpm?: number;
  vocalType?: string;
  airtableId?: string;
  duration?: number;
  active?: boolean;
}

export interface UpdateSongRequest {
  title?: string;
  artist?: string;
  genreId?: number;
  musicalKey?: string;
  keyChange?: string;
  bpm?: number;
  vocalType?: string;
  airtableId?: string;
  duration?: number;
  active?: boolean;
}

export interface SetListItem {
  id: number;
  gigId: number;
  itemType: 'song' | 'section';
  sectionName?: string;
  songId?: number;
  position?: number;
  notes?: string;
  overrideKey?: string;
  overrideKeyChange?: string;
  overrideVocalType?: string;
  overrideDuration?: number;
  unlinkedTitle?: string;
  unlinkedArtist?: string;
  unlinkedKey?: string;
  unlinkedKeyChange?: string;
  unlinkedVocalType?: string;
  unlinkedDuration?: number;
}

export interface SetListItemWithSong extends SetListItem {
  title: string;
  artist?: string;
  musicalKey?: string;
  keyChange?: string;
  vocalType?: string;
  duration?: number;
  isMustPlay: boolean;
  isFavourite: boolean;
  isDoNotPlay: boolean;
}

export interface CreateSetListItemRequest {
  songId?: number;
  position?: number;
  notes?: string;
  // Unlinked song fields (used when songId is absent)
  unlinkedTitle?: string;
  unlinkedArtist?: string;
  unlinkedKey?: string;
  unlinkedKeyChange?: string;
  unlinkedVocalType?: string;
  unlinkedDuration?: number;
}

export interface UpdateSetListItemRequest {
  overrideKey?: string | null;
  overrideKeyChange?: string | null;
  overrideVocalType?: string | null;
  overrideDuration?: number | null;
  sectionName?: string | null;
  // Unlinked song fields
  unlinkedTitle?: string | null;
  unlinkedArtist?: string | null;
  unlinkedKey?: string | null;
  unlinkedKeyChange?: string | null;
  unlinkedVocalType?: string | null;
  unlinkedDuration?: number | null;
}

export interface CreateSetListSectionRequest {
  sectionName: string;
}

export interface GigSongPreferences {
  favourites: number[];
  mustPlays: number[];
  doNotPlays: number[];
}

export interface HousePlaylistSong {
  id: number;       // house_playlist_songs.id
  songId: number;
  title: string;
  artist?: string;
  musicalKey?: string;
  vocalType?: string;
}

export interface CreateHousePlaylistEntryRequest {
  songId: number;
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
  /** Only present when fetched via GET /gigs/:id/rehearsals */
  costShare?: number;
  /** Total number of gigs this rehearsal is linked to */
  gigCount?: number;
  expenseId?: number;
  expenseDescription?: string;
  expenseAmount?: number;
}

export interface CreateRehearsalRequest {
  name: string;
  date: string;
  location?: string;
  cost?: number;
  notes?: string;
  /** Additional gig IDs to link beyond the one in the URL */
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

export interface UpdateRehearsalCostShareRequest {
  costShare: number;
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

export interface DrawingBreakdown {
  personId: number;
  personName: string;
  /** Amount in pence (positive = money taken from business). */
  amount: number;
}

export interface AccountingSummary {
  // Gig activity (counts for the selected period, filtered by gig date)
  gigsBooked: number;
  gigsPerformed: number;

  // Income in pence
  /** All payments received in period (by payment date) minus refunds (by refund date). */
  potIncome: number;
  /** Payments for non-cancelled past gigs in period (by gig date) minus refunds for those gigs. */
  earnedIncome: number;

  // Expenses in pence (all expenses by invoice date, regardless of payment status)
  expenses: number;

  // Profit before drawings (in pence)
  potProfit: number;
  taxableProfit: number;

  // Drawings in pence (positive = money out of business)
  drawingsTotal: number;
  drawingsBreakdown: DrawingBreakdown[];

  // Profit after drawings (in pence)
  potAfterDrawings: number;
  sharedProfit: number;
}

export function createService(id: number, name: string): Service {
  return { id, name };
}

// ─── Dashboard types ───────────────────────────────────────────────────────────

export interface GigPaymentAlert {
  id: number;
  firstName: string;
  lastName: string;
  date: string;
  venueName?: string;
  location?: string;
  /** Quoted price in pennies. */
  totalPrice: number;
  /** Net received (payments minus refunds) in pennies. */
  netReceived: number;
}

export interface FeeAllocationAlert {
  id: number;
  /** Performer name, or undefined if the allocation is unassigned. */
  personName?: string;
  /** Client name for gig allocations, or showcase name for showcase allocations. */
  eventName: string;
  /** ISO date string of the event, or undefined if no event is linked. */
  eventDate?: string;
  /** Present when the allocation belongs to a gig. */
  gigId?: number;
  /** Present when the allocation belongs to a showcase. */
  showcaseId?: number;
  /** Sum of line item amounts in pennies. Zero if there are no line items. */
  totalFee: number;
}

export interface ExpenseApportionmentMismatchAlert {
  /** Expense id. */
  id: number;
  /** Expense description. */
  description: string;
  /** Expense total in pennies. */
  amount: number;
  /** Sum of all apportioned amounts across showcase links (null links count as zero) in pennies. */
  apportionedTotal: number;
  /** Difference between expense total and apportioned total (amount - apportionedTotal) in pennies. */
  difference: number;
}

export interface DashboardAlerts {
  /** Confirmed upcoming gigs where no payment has been received. */
  noDeposit: GigPaymentAlert[];
  /** Confirmed gigs with a date within the next 2 months that still have an outstanding balance. */
  balanceDueSoon: GigPaymentAlert[];
  /** Fee allocations (gig or showcase) with no expense record linked. */
  allocationsWithoutExpenses: FeeAllocationAlert[];
  /** Expenses linked to showcases where explicit apportioned amounts don't sum to the expense total. */
  apportionmentMismatches: ExpenseApportionmentMismatchAlert[];
}
