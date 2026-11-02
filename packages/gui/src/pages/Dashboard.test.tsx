// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { DashboardAlerts } from "@get-down/shared";
import Dashboard from "./Dashboard.js";
import { isOlderThanTwoCalendarMonths } from "../utils/dashboardDates.js";

const dashboardFixture: DashboardAlerts = {
  noDeposit: [], gigsWithoutLineItems: [], balanceDueSoon: [], pastPaymentMismatches: [],
  unpaidExpenses: [], expensePaymentMismatches: [], allocationsWithoutExpensesGigs: [],
  allocationsWithoutExpensesShowcases: [], unconfirmedPartnerAllocationsGigs: [],
  unconfirmedPartnerAllocationsShowcases: [], allocationsWithoutRolesGigs: [],
  allocationsWithoutRolesShowcases: [], apportionmentMismatches: [], feeAllocationExpenseMismatches: [],
  expenseOverApportioned: [], gigRolesWithoutAllocation: [], showcaseRolesWithoutAllocation: [],
  emptyGigRoles: [], emptyShowcaseRoles: [],
};

const alerts: DashboardAlerts = {
  ...dashboardFixture,
  noDeposit: [{ id: 80, firstName: "Main", lastName: "Alert", date: "2027-01-01", totalPrice: 10000, netReceived: 0 }],
  allocationsWithoutExpensesGigs: [
    { id: 1, eventName: "Old allocation", eventDate: "2026-08-14", gigId: 1, totalFee: 1000 },
    { id: 2, eventName: "Cutoff allocation", eventDate: "2026-08-15", gigId: 2, totalFee: 1000 },
    { id: 3, eventName: "Recent allocation", eventDate: "2026-09-01", gigId: 3, totalFee: 1000 },
    { id: 4, eventName: "Undated allocation", gigId: 4, totalFee: 1000 },
  ],
  allocationsWithoutExpensesShowcases: [
    { id: 10, eventName: "Old showcase missing expense", eventDate: "2026-08-14", showcaseId: 10, totalFee: 1000 },
    { id: 11, eventName: "Recent showcase missing expense", eventDate: "2026-09-01", showcaseId: 11, totalFee: 1000 },
  ],
  unconfirmedPartnerAllocationsGigs: [
    { id: 12, eventName: "Old unconfirmed allocation", eventDate: "2026-08-14", gigId: 12, totalFee: 1000 },
    { id: 13, eventName: "Recent unconfirmed allocation", eventDate: "2026-09-01", gigId: 13, totalFee: 1000 },
  ],
  unconfirmedPartnerAllocationsShowcases: [
    { id: 18, eventName: "Old showcase unconfirmed allocation", eventDate: "2026-08-14", showcaseId: 18, totalFee: 1000 },
    { id: 19, eventName: "Recent showcase unconfirmed allocation", eventDate: "2026-09-01", showcaseId: 19, totalFee: 1000 },
  ],
  allocationsWithoutRolesGigs: [
    { id: 14, eventName: "Old allocation without role", eventDate: "2026-08-14", gigId: 14, totalFee: 1000 },
    { id: 15, eventName: "Recent allocation without role", eventDate: "2026-09-01", gigId: 15, totalFee: 1000 },
  ],
  allocationsWithoutRolesShowcases: [
    { id: 20, eventName: "Old showcase allocation without role", eventDate: "2026-08-14", showcaseId: 20, totalFee: 1000 },
    { id: 21, eventName: "Recent showcase allocation without role", eventDate: "2026-09-01", showcaseId: 21, totalFee: 1000 },
  ],
  gigRolesWithoutAllocation: [
    { id: 5, personName: "Old performer", roleName: "Singer", eventName: "Old role event", eventDate: "2026-08-14", gigId: 5 },
    { id: 6, personName: "Recent performer", roleName: "Singer", eventName: "Recent role event", eventDate: "2026-09-01", gigId: 6 },
  ],
  showcaseRolesWithoutAllocation: [
    { id: 16, personName: "Old showcase performer", roleName: "Singer", eventName: "Old showcase role event", eventDate: "2026-08-14", showcaseId: 16 },
    { id: 17, personName: "Recent showcase performer", roleName: "Singer", eventName: "Recent showcase role event", eventDate: "2026-09-01", showcaseId: 17 },
  ],
  emptyGigRoles: [{ id: 7, roleName: "Empty slot", eventName: "Empty role event", eventDate: "2026-01-01", gigId: 7 }],
  feeAllocationExpenseMismatches: [
    { allocationId: 22, eventName: "Mismatch old", eventDate: "2026-08-14", gigId: 22, allocationTotal: 1000, apportionedTotal: 0, difference: 1000 },
    { allocationId: 8, eventName: "Mismatch recent", eventDate: "2026-09-01", gigId: 8, allocationTotal: 1000, apportionedTotal: 0, difference: 1000 },
  ],
  expenseOverApportioned: [{ id: 9, description: "Over-apportioned old expense", amount: 1000, apportionedTotal: 1200, difference: 200, allocations: [] }],
};

vi.mock("../api/hooks/useDashboard.js", () => ({ useDashboardAlerts: () => ({ data: alerts, isLoading: false, error: null }) }));
vi.mock("../api/hooks/useExpenses.js", () => ({ useExpenses: () => ({ data: [] }) }));
vi.mock("../api/hooks/useFeeAllocations.js", () => ({ useFeeAllocations: () => ({ data: [] }) }));
vi.mock("../api/hooks/useAttributionFees.js", () => ({ useAllAttributionFees: () => ({ data: [] }) }));
vi.mock("../components/GigFeeAllocationCard.js", () => ({ GigFeeAllocationCard: () => null }));
vi.mock("../components/ShowcaseFeeAllocationCard.js", () => ({ ShowcaseFeeAllocationCard: () => null }));
vi.mock("../components/ExpenseModal.js", () => ({ default: () => null }));

afterEach(cleanup);
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 15, 12));
});
afterEach(() => { vi.useRealTimers(); });

function renderDashboard() {
  return render(<MemoryRouter><Dashboard /></MemoryRouter>);
}

describe("dashboard fee allocation tabs", () => {
  it("keeps non-allocation alerts, empty roles, and over-apportionment on Main while applying age filtering", () => {
    renderDashboard();
    const main = screen.getByRole("tabpanel", { name: "Main" });
    expect(within(main).getByText("Main Alert")).toBeTruthy();
    expect(within(main).getByText("Old allocation")).toBeTruthy();
    expect(within(main).getByText("Undated allocation")).toBeTruthy();
    expect(within(main).queryByText("Cutoff allocation")).toBeNull();
    expect(within(main).queryByText("Recent allocation")).toBeNull();
    expect(within(main).queryByText("Recent role event")).toBeNull();
    expect(within(main).getByText("Old role event")).toBeTruthy();
    expect(within(main).getByText("Old showcase role event")).toBeTruthy();
    expect(within(main).queryByText("Recent showcase role event")).toBeNull();
    expect(within(main).getByText("Old showcase missing expense")).toBeTruthy();
    expect(within(main).queryByText("Recent showcase missing expense")).toBeNull();
    expect(within(main).getByText("Old unconfirmed allocation")).toBeTruthy();
    expect(within(main).queryByText("Recent unconfirmed allocation")).toBeNull();
    expect(within(main).getByText("Old showcase unconfirmed allocation")).toBeTruthy();
    expect(within(main).queryByText("Recent showcase unconfirmed allocation")).toBeNull();
    expect(within(main).getByText("Old allocation without role")).toBeTruthy();
    expect(within(main).queryByText("Recent allocation without role")).toBeNull();
    expect(within(main).getByText("Old showcase allocation without role")).toBeTruthy();
    expect(within(main).queryByText("Recent showcase allocation without role")).toBeNull();
    expect(within(main).getByText("Mismatch old")).toBeTruthy();
    expect(within(main).getByText("Empty role event")).toBeTruthy();
    expect(within(main).getByText("Over-apportioned old expense")).toBeTruthy();
    expect(within(main).queryByText("Mismatch recent")).toBeNull();
  });

  it("shows all returned allocation issues on Fee Allocations but no empty slots", () => {
    renderDashboard();
    fireEvent.click(screen.getByRole("tab", { name: "Fee Allocations" }));
    const allocations = screen.getByRole("tabpanel", { name: "Fee Allocations" });
    expect(screen.getByRole("tab", { name: "Fee Allocations" }).getAttribute("aria-selected")).toBe("true");
    expect(within(allocations).getByText("Cutoff allocation")).toBeTruthy();
    expect(within(allocations).getByText("Recent allocation")).toBeTruthy();
    expect(within(allocations).getByText("Undated allocation")).toBeTruthy();
    expect(within(allocations).getByText("Recent role event")).toBeTruthy();
    expect(within(allocations).getByText("Old showcase role event")).toBeTruthy();
    expect(within(allocations).getByText("Recent showcase role event")).toBeTruthy();
    expect(within(allocations).getByText("Old showcase missing expense")).toBeTruthy();
    expect(within(allocations).getByText("Recent showcase missing expense")).toBeTruthy();
    expect(within(allocations).getByText("Old unconfirmed allocation")).toBeTruthy();
    expect(within(allocations).getByText("Recent unconfirmed allocation")).toBeTruthy();
    expect(within(allocations).getByText("Old showcase unconfirmed allocation")).toBeTruthy();
    expect(within(allocations).getByText("Recent showcase unconfirmed allocation")).toBeTruthy();
    expect(within(allocations).getByText("Old allocation without role")).toBeTruthy();
    expect(within(allocations).getByText("Recent allocation without role")).toBeTruthy();
    expect(within(allocations).getByText("Old showcase allocation without role")).toBeTruthy();
    expect(within(allocations).getByText("Recent showcase allocation without role")).toBeTruthy();
    expect(within(allocations).getByText("Mismatch recent")).toBeTruthy();
    expect(within(allocations).getByText("Mismatch old")).toBeTruthy();
    expect(within(allocations).queryByText("Empty role event")).toBeNull();
    expect(within(allocations).queryByText("Main Alert")).toBeNull();
    expect(within(allocations).queryByText("Over-apportioned old expense")).toBeNull();
  });
});

describe("two-calendar-month dashboard cutoff", () => {
  it("clamps month-end and excludes the cutoff date itself", () => {
    const today = new Date(2026, 9, 31);
    expect(isOlderThanTwoCalendarMonths("2026-08-30", today)).toBe(true);
    expect(isOlderThanTwoCalendarMonths("2026-08-31", today)).toBe(false);
    expect(isOlderThanTwoCalendarMonths("2026-09-01", today)).toBe(false);
  });

  it("clamps a long current month to the target month's final day", () => {
    const today = new Date(2026, 4, 31);
    expect(isOlderThanTwoCalendarMonths("2026-03-30", today)).toBe(true);
    expect(isOlderThanTwoCalendarMonths("2026-03-31", today)).toBe(false);
  });

  it("keeps undated issues on Main and rejects malformed dates", () => {
    expect(isOlderThanTwoCalendarMonths(undefined, new Date(2026, 9, 31))).toBe(true);
    expect(isOlderThanTwoCalendarMonths("not-a-date", new Date(2026, 9, 31))).toBe(false);
    expect(isOlderThanTwoCalendarMonths("2026-02-31", new Date(2026, 9, 31))).toBe(false);
  });

  it("compares the same local calendar dates consistently across timezones", () => {
    const originalTimezone = process.env.TZ;
    try {
      for (const timezone of ["UTC", "America/Los_Angeles", "Pacific/Auckland"]) {
        process.env.TZ = timezone;
        const today = new Date(2026, 9, 31, 12);
        expect(isOlderThanTwoCalendarMonths("2026-08-30", today)).toBe(true);
        expect(isOlderThanTwoCalendarMonths("2026-08-31", today)).toBe(false);
      }
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
  });
});
