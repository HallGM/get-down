import { useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  useGig,
  useUpdateGig,
  useDeleteGig,
} from "../../api/hooks/useGigs.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import StatusBadge from "../../components/StatusBadge.js";
import ConfirmDelete from "../../components/ConfirmDelete.js";
import TabBar from "../../components/TabBar.js";
import type { UpdateGigRequest } from "@get-down/shared";
import GigOverviewTab from "./GigOverviewTab.js";
import GigDeliveryTab from "./GigDeliveryTab.js";
import GigRehearsalsTab from "./GigRehearsalsTab.js";
import GigRoles from "./GigRoles.js";
import SetListBuilder from "./SetListBuilder.js";
import GigBilling from "./GigBilling.js";

type GigTab = "overview" | "delivery" | "rehearsals" | "roles" | "set-list" | "billing";

const ALL_TABS: GigTab[] = ["overview", "billing", "roles", "set-list", "rehearsals", "delivery"];

const TAB_LABELS: Record<GigTab, string> = {
  overview: "Overview",
  delivery: "Delivery",
  rehearsals: "Rehearsals",
  roles: "Roles & Fees",
  "set-list": "Set List",
  billing: "Invoice & Billing",
};

function isGigTab(s: string | null): s is GigTab {
  return s !== null && ALL_TABS.includes(s as GigTab);
}

export default function GigDetail() {
  const { id } = useParams<{ id: string }>();
  const gigId = Number(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const initialTab: GigTab = isGigTab(tabParam) ? tabParam : "overview";

  const { data: gig, isLoading, error } = useGig(gigId);
  const updateGig = useUpdateGig();
  const deleteGig = useDeleteGig();

  const [activeTab, setActiveTab] = useState<GigTab>(initialTab);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateGigRequest>({});
  const [showDeleteGig, setShowDeleteGig] = useState(false);

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error || !gig) return <main className="container"><ErrorBanner error={error ?? "Gig not found"} /></main>;

  function startEdit() {
    setEditForm({
      firstName: gig!.firstName,
      lastName: gig!.lastName,
      partnerName: gig!.partnerName,
      email: gig!.email,
      phone: gig!.phone,
      date: gig!.date,
      venueName: gig!.venueName,
      location: gig!.location,
      description: gig!.description,
      status: gig!.status,
      totalPrice: gig!.totalPrice,
      timings: gig!.timings,
      contactNumber: gig!.contactNumber,
      parkingInfo: gig!.parkingInfo,
      clientNotes: gig!.clientNotes,
      performerNotes: gig!.performerNotes,
      playlistUrl: gig!.playlistUrl,
      endOfNightSong: gig!.endOfNightSong,
      firstDanceSong: gig!.firstDanceSong,
      firstDanceType: gig!.firstDanceType,
      ceilidh: gig!.ceilidh ?? false,
      ceilidhLength: gig!.ceilidhLength,
      ceilidhStyle: gig!.ceilidhStyle,
      mealDetails: gig!.mealDetails,
      dropboxUrl: gig!.dropboxUrl,
      deliveryTitle: gig!.deliveryTitle,
    });
    setEditing(true);
  }

  function handleEdit() {
    if (activeTab !== "overview") setActiveTab("overview");
    startEdit();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    await updateGig.mutateAsync({ id: gigId, input: editForm });
    setEditing(false);
  }

  async function handleDeleteGig() {
    await deleteGig.mutateAsync(gigId);
    navigate("/gigs");
  }

  return (
    <main className="container">
      <div style={{ marginBottom: "0.5rem" }}>
        <Link to="/gigs" style={{ color: "var(--pico-muted-color)", fontSize: "0.875rem" }}>
          ← Gigs
        </Link>
      </div>

      {/* Persistent header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <hgroup>
          <h1 style={{ marginBottom: "0.25rem" }}>{gig.firstName} {gig.lastName}</h1>
          <p>
            <StatusBadge status={gig.status} />
            {gig.settled && <> · <span style={{ color: "var(--pico-muted-color)" }}>Settled</span></>}
            {gig.venueName && <> · <span>{gig.venueName}</span></>}
          </p>
        </hgroup>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="secondary" onClick={handleEdit}>Edit</button>
          <button className="contrast outline" onClick={() => setShowDeleteGig(true)}>Delete</button>
        </div>
      </div>

      <TabBar tabs={ALL_TABS} labels={TAB_LABELS} active={activeTab} onChange={setActiveTab} />

      {/* Tab panels */}
      {activeTab === "overview" && (
        <GigOverviewTab
          gig={gig}
          gigId={gigId}
          editing={editing}
          editForm={editForm}
          setEditForm={setEditForm}
          saveEdit={saveEdit}
          cancelEdit={() => setEditing(false)}
          isPending={updateGig.isPending}
        />
      )}
      {activeTab === "delivery" && <GigDeliveryTab gigId={gigId} gig={gig} />}
      {activeTab === "rehearsals" && <GigRehearsalsTab gigId={gigId} />}
      {activeTab === "roles" && <GigRoles />}
      {activeTab === "set-list" && <SetListBuilder />}
      {activeTab === "billing" && <GigBilling />}

      <ConfirmDelete
        open={showDeleteGig}
        itemName={`${gig.firstName} ${gig.lastName ?? ""}`.trim()}
        onConfirm={handleDeleteGig}
        onCancel={() => setShowDeleteGig(false)}
        loading={deleteGig.isPending}
      />
    </main>
  );
}
