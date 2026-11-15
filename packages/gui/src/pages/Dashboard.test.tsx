// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { DashboardAlerts } from "@get-down/shared";
import Dashboard from "./Dashboard.js";
import { isOlderThanTwoCalendarMonths } from "../utils/dashboardDates.js";
import { formatDate } from "../utils/date.js";

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
    { id: 1, eventName: "Old allocation", eventDate: "2026-07-18T00:00:00.000Z", gigId: 1, totalFee: 1000 },
    { id: 2, eventName: "Cutoff allocation", eventDate: "2026-08-15", gigId: 2, totalFee: 1000 },
    { id: 3, eventName: "Recent allocation", eventDate: "2026-09-01", gigId: 3, totalFee: 1000 },
    { id: 4, eventName: "Undated allocation", gigId: 4, totalFee: 1000 },
  ],
  allocationsWithoutExpensesShowcases: [
    { id: 10, eventName: "Old showcase missing expense", eventDate: "2026-07-18T00:00:00.000Z", showcaseId: 10, totalFee: 1000 },
    { id: 11, eventName: "Cutoff showcase missing expense", eventDate: "2026-08-15", showcaseId: 11, totalFee: 1000 },
    { id: 12, eventName: "Recent showcase missing expense", eventDate: "2026-09-01", showcaseId: 12, totalFee: 1000 },
    { id: 13, eventName: "Undated showcase missing expense", showcaseId: 13, totalFee: 1000 },
  ],
  unconfirmedPartnerAllocationsGigs: [
    { id: 14, eventName: "Old unconfirmed allocation", eventDate: "2026-07-18T00:00:00.000Z", gigId: 14, totalFee: 1000 },
    { id: 15, eventName: "Cutoff unconfirmed allocation", eventDate: "2026-08-15", gigId: 15, totalFee: 1000 },
    { id: 16, eventName: "Recent unconfirmed allocation", eventDate: "2026-09-01", gigId: 16, totalFee: 1000 },
    { id: 17, eventName: "Undated unconfirmed allocation", gigId: 17, totalFee: 1000 },
  ],
  unconfirmedPartnerAllocationsShowcases: [
    { id: 18, eventName: "Old showcase unconfirmed allocation", eventDate: "2026-07-18T00:00:00.000Z", showcaseId: 18, totalFee: 1000 },
    { id: 19, eventName: "Cutoff showcase unconfirmed allocation", eventDate: "2026-08-15", showcaseId: 19, totalFee: 1000 },
    { id: 20, eventName: "Recent showcase unconfirmed allocation", eventDate: "2026-09-01", showcaseId: 20, totalFee: 1000 },
    { id: 21, eventName: "Undated showcase unconfirmed allocation", showcaseId: 21, totalFee: 1000 },
  ],
  allocationsWithoutRolesGigs: [
    { id: 22, eventName: "Old allocation without role", eventDate: "2026-08-14", gigId: 22, totalFee: 1000 },
    { id: 23, eventName: "Cutoff allocation without role", eventDate: "2026-08-15", gigId: 23, totalFee: 1000 },
    { id: 24, eventName: "Recent allocation without role", eventDate: "2026-09-01", gigId: 24, totalFee: 1000 },
    { id: 25, eventName: "Undated allocation without role", gigId: 25, totalFee: 1000 },
  ],
  allocationsWithoutRolesShowcases: [
    { id: 20, eventName: "Old showcase allocation without role", eventDate: "2026-08-14", showcaseId: 20, totalFee: 1000 },
    { id: 21, eventName: "Cutoff showcase allocation without role", eventDate: "2026-08-15", showcaseId: 21, totalFee: 1000 },
    { id: 28, eventName: "Recent showcase allocation without role", eventDate: "2026-09-01", showcaseId: 28, totalFee: 1000 },
    { id: 29, eventName: "Undated showcase allocation without role", showcaseId: 29, totalFee: 1000 },
  ],
  gigRolesWithoutAllocation: [
    { id: 5, personName: "Old performer", roleName: "Singer", eventName: "Old role event", eventDate: "2026-08-14", gigId: 5 },
    { id: 30, personName: "Cutoff performer", roleName: "Singer", eventName: "Cutoff role event", eventDate: "2026-08-15", gigId: 30 },
    { id: 6, personName: "Recent performer", roleName: "Singer", eventName: "Recent role event", eventDate: "2026-09-01", gigId: 6 },
  ],
  showcaseRolesWithoutAllocation: [
    { id: 16, personName: "Old showcase performer", roleName: "Singer", eventName: "Old showcase role event", eventDate: "2026-08-14", showcaseId: 16 },
    { id: 31, personName: "Cutoff showcase performer", roleName: "Singer", eventName: "Cutoff showcase role event", eventDate: "2026-08-15", showcaseId: 31 },
    { id: 17, personName: "Recent showcase performer", roleName: "Singer", eventName: "Recent showcase role event", eventDate: "2026-09-01", showcaseId: 17 },
  ],
  emptyGigRoles: [{ id: 7, roleName: "Empty slot", eventName: "Empty role event", eventDate: "2026-01-01", gigId: 7 }],
  feeAllocationExpenseMismatches: [
    { allocationId: 22, eventName: "Mismatch old", eventDate: "2026-08-14", gigId: 22, allocationTotal: 1000, apportionedTotal: 0, difference: 1000 },
    { allocationId: 32, eventName: "Mismatch cutoff", eventDate: "2026-08-15", gigId: 32, allocationTotal: 1000, apportionedTotal: 0, difference: 1000 },
    { allocationId: 8, eventName: "Mismatch recent", eventDate: "2026-09-01", gigId: 8, allocationTotal: 1000, apportionedTotal: 0, difference: 1000 },
    { allocationId: 33, eventName: "Mismatch undated", gigId: 33, allocationTotal: 1000, apportionedTotal: 0, difference: 1000 },
  ],
  apportionmentMismatches: [{ id: 34, description: "Showcase mismatch expense", amount: 1000, apportionedTotal: 900, difference: 100 }],
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
    const mainVisibility = [
      ["Old allocation", true],
      ["Undated allocation", true],
      ["Cutoff allocation", false],
      ["Recent allocation", false],
      ["Old showcase missing expense", true],
      ["Undated showcase missing expense", true],
      ["Cutoff showcase missing expense", false],
      ["Recent showcase missing expense", false],
      ["Old unconfirmed allocation", true],
      ["Undated unconfirmed allocation", true],
      ["Cutoff unconfirmed allocation", false],
      ["Recent unconfirmed allocation", false],
      ["Old showcase unconfirmed allocation", true],
      ["Undated showcase unconfirmed allocation", true],
      ["Cutoff showcase unconfirmed allocation", false],
      ["Recent showcase unconfirmed allocation", false],
      ["Old allocation without role", true],
      ["Undated allocation without role", true],
      ["Cutoff allocation without role", false],
      ["Recent allocation without role", false],
      ["Old showcase allocation without role", true],
      ["Undated showcase allocation without role", true],
      ["Cutoff showcase allocation without role", false],
      ["Recent showcase allocation without role", false],
      ["Old role event", true],
      ["Cutoff role event", false],
      ["Recent role event", false],
      ["Old showcase role event", true],
      ["Cutoff showcase role event", false],
      ["Recent showcase role event", false],
      ["Mismatch old", true],
      ["Mismatch undated", true],
      ["Mismatch cutoff", false],
      ["Mismatch recent", false],
    ] as const;
    for (const [label, shouldBeVisible] of mainVisibility) {
      const alert = within(main).queryByText(label);
      if (shouldBeVisible) expect(alert).toBeTruthy();
      else expect(alert).toBeNull();
    }
    expect(within(main).getByText("Empty role event")).toBeTruthy();
    expect(within(main).getByText("Over-apportioned old expense")).toBeTruthy();
    expect(within(main).getByText("Showcase mismatch expense")).toBeTruthy();

    const section = (title: RegExp) => {
      const heading = within(main).getByRole("heading", { name: title });
      return heading.closest("section")!;
    };
    const formattedDateRows = [
      [/Fee Allocations Missing Expenses \(Gigs\)/, /Old allocation.*18 Jul 2026/],
      [/Fee Allocations Missing Expenses \(Showcases\)/, /Old showcase missing expense.*18 Jul 2026/],
      [/Partner Fee Allocations Awaiting Confirmation \(Gigs\)/, /Old unconfirmed allocation.*18 Jul 2026/],
      [/Partner Fee Allocations Awaiting Confirmation \(Showcases\)/, /Old showcase unconfirmed allocation.*18 Jul 2026/],
    ] as const;
    for (const [sectionTitle, rowName] of formattedDateRows) {
      expect(within(section(sectionTitle)).getByRole("row", { name: rowName })).toBeTruthy();
    }
  });

  it("shows all returned allocation issues on Fee Allocations but no empty slots", () => {
    renderDashboard();
    fireEvent.click(screen.getByRole("tab", { name: "Fee Allocations" }));
    const allocations = screen.getByRole("tabpanel", { name: "Fee Allocations" });
    expect(screen.getByRole("tab", { name: "Fee Allocations" }).getAttribute("aria-selected")).toBe("true");
    expect(within(allocations).getByText("Cutoff allocation")).toBeTruthy();
    expect(within(allocations).getByText("Recent allocation")).toBeTruthy();
    expect(within(allocations).getByText("Undated allocation")).toBeTruthy();
    expect(within(allocations).getByText("Cutoff showcase missing expense")).toBeTruthy();
    expect(within(allocations).getByText("Undated showcase missing expense")).toBeTruthy();
    expect(within(allocations).getByText("Cutoff unconfirmed allocation")).toBeTruthy();
    expect(within(allocations).getByText("Undated unconfirmed allocation")).toBeTruthy();
    expect(within(allocations).getByText("Cutoff showcase unconfirmed allocation")).toBeTruthy();
    expect(within(allocations).getByText("Undated showcase unconfirmed allocation")).toBeTruthy();
    expect(within(allocations).getByText("Cutoff allocation without role")).toBeTruthy();
    expect(within(allocations).getByText("Undated allocation without role")).toBeTruthy();
    expect(within(allocations).getByText("Cutoff showcase allocation without role")).toBeTruthy();
    expect(within(allocations).getByText("Undated showcase allocation without role")).toBeTruthy();
    expect(within(allocations).getByText("Recent role event")).toBeTruthy();
    expect(within(allocations).getByText("Cutoff role event")).toBeTruthy();
    expect(within(allocations).getByText("Old showcase role event")).toBeTruthy();
    expect(within(allocations).getByText("Cutoff showcase role event")).toBeTruthy();
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
    expect(within(allocations).getByText("Mismatch cutoff")).toBeTruthy();
    expect(within(allocations).getByText("Mismatch undated")).toBeTruthy();
    expect(within(allocations).queryByText("Empty role event")).toBeNull();
    expect(within(allocations).queryByText("Main Alert")).toBeNull();
    expect(within(allocations).queryByText("Over-apportioned old expense")).toBeNull();
    expect(within(allocations).queryByText("Showcase mismatch expense")).toBeNull();
  });
});

describe("two-calendar-month dashboard cutoff", () => {
  it("clamps month-end and excludes the cutoff date itself", () => {
    const today = new Date(2026, 9, 31);
    expect(isOlderThanTwoCalendarMonths("2026-08-30", today)).toBe(true);
    expect(isOlderThanTwoCalendarMonths("2026-08-31", today)).toBe(false);
    expect(isOlderThanTwoCalendarMonths("2026-09-01", today)).toBe(false);
  });

  it("handles ISO timestamps as calendar dates for filtering and display", () => {
    const today = new Date(2026, 9, 15);
    expect(isOlderThanTwoCalendarMonths("2026-07-18T00:00:00.000Z", today)).toBe(true);
    expect(isOlderThanTwoCalendarMonths("2026-08-15T00:00:00.000Z", today)).toBe(false);
    expect(formatDate("2026-07-18T00:00:00.000Z")).toBe("18 Jul 2026");
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
