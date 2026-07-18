import { useState, useEffect } from "react";
import type { Gig, DeliveryVideo } from "@get-down/shared";
import {
  useGigDeliveryVideos,
  useCreateDeliveryVideo,
  useUpdateDeliveryVideo,
  useDeleteDeliveryVideo,
  useReorderDeliveryVideos,
  useRefreshDeliveryPhotos,
} from "../../api/hooks/useDelivery.js";
import { useUpdateGig } from "../../api/hooks/useGigs.js";
import CopyLinkBanner from "../../components/CopyLinkBanner.js";
import FormField from "../../components/FormField.js";

interface Props {
  gigId: number;
  gig: Gig;
}

const EMPTY_VIDEO = { title: "", vimeoUrl: "" };

export default function GigDeliveryTab({ gigId, gig }: Props) {
  const { data: deliveryVideos = [] } = useGigDeliveryVideos(gigId);
  const createDeliveryVideo = useCreateDeliveryVideo(gigId);
  const updateDeliveryVideo = useUpdateDeliveryVideo(gigId);
  const deleteDeliveryVideo = useDeleteDeliveryVideo(gigId);
  const reorderDeliveryVideos = useReorderDeliveryVideos(gigId);
  const updateGig = useUpdateGig();
  const refreshDeliveryPhotos = useRefreshDeliveryPhotos(gigId);

  const [newVideoForm, setNewVideoForm] = useState(EMPTY_VIDEO);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [editVideoId, setEditVideoId] = useState<number | null>(null);
  const [editVideoForm, setEditVideoForm] = useState(EMPTY_VIDEO);
  
  const [deliveryTitle, setDeliveryTitle] = useState(gig.deliveryTitle ?? "");
  const [dropboxUrl, setDropboxUrl] = useState(gig.dropboxUrl ?? "");

  useEffect(() => {
    setDeliveryTitle(gig.deliveryTitle ?? "");
    setDropboxUrl(gig.dropboxUrl ?? "");
  }, [gig.deliveryTitle, gig.dropboxUrl]);

  return (
    <>
      {gig.clientToken && (
        <CopyLinkBanner
          url={`${window.location.origin}/d/${gig.clientToken}`}
          label="Delivery page"
          status={deliveryVideos.length > 0 || gig.dropboxUrl
            ? <>·{deliveryVideos.length > 0 ? ` ${deliveryVideos.length} video${deliveryVideos.length > 1 ? "s" : ""}` : ""}{deliveryVideos.length > 0 && gig.dropboxUrl ? " +" : ""}{gig.dropboxUrl ? " photos" : ""} added</>
            : "· no media added yet"}
          successMessage="Delivery page link copied!"
        />
      )}

      {/* Photos */}
      <section>
        <h2>Photos</h2>
        <FormField label="Delivery page title" value={deliveryTitle} onChange={(e) => setDeliveryTitle(e.target.value)} placeholder="e.g. Sarah & Sean · Wedding Film" />
        <FormField label="Dropbox folder link" value={dropboxUrl} onChange={(e) => setDropboxUrl(e.target.value)} />
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", alignItems: "flex-start" }}>
          <button
            aria-busy={updateGig.isPending}
            disabled={updateGig.isPending}
            onClick={async () => {
              await updateGig.mutateAsync({
                id: gigId,
                input: { deliveryTitle, dropboxUrl },
              });
            }}
          >
            Save
          </button>
          {gig.dropboxUrl && (
            <button
              type="button"
              className="secondary outline"
              style={{ fontSize: "0.85rem", padding: "0.3em 0.8em" }}
              aria-busy={refreshDeliveryPhotos.isPending}
              disabled={refreshDeliveryPhotos.isPending}
              onClick={() => refreshDeliveryPhotos.mutate()}
            >
              Refresh photos
            </button>
          )}
        </div>
      </section>

      {/* Delivery videos */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Delivery videos</h2>
          {!showAddVideo && (
            <button className="secondary" onClick={() => { setNewVideoForm(EMPTY_VIDEO); setShowAddVideo(true); }}>
              + Add video
            </button>
          )}
        </div>

        {deliveryVideos.length > 0 && (
          <table>
            <thead>
              <tr><th>Title</th><th>Vimeo URL</th><th>Order</th><th aria-label="Actions"></th></tr>
            </thead>
            <tbody>
              {deliveryVideos.map((v: DeliveryVideo, i: number) => (
                <tr key={v.id}>
                  {editVideoId === v.id ? (
                    <>
                      <td colSpan={2}>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <input
                            style={{ flex: 1 }}
                            value={editVideoForm.title}
                            onChange={(e) => setEditVideoForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="Title"
                            aria-label="Video title"
                          />
                          <input
                            style={{ flex: 2 }}
                            value={editVideoForm.vimeoUrl}
                            onChange={(e) => setEditVideoForm((f) => ({ ...f, vimeoUrl: e.target.value }))}
                            placeholder="Vimeo URL"
                            aria-label="Vimeo URL"
                          />
                        </div>
                      </td>
                      <td></td>
                      <td>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <button
                            className="secondary outline"
                            style={{ padding: "0.2em 0.5em" }}
                            aria-busy={updateDeliveryVideo.isPending}
                            onClick={async () => {
                              await updateDeliveryVideo.mutateAsync({ videoId: v.id, input: editVideoForm });
                              setEditVideoId(null);
                            }}
                          >Save</button>
                          <button className="secondary outline" style={{ padding: "0.2em 0.5em" }} onClick={() => setEditVideoId(null)}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{v.title}</td>
                      <td style={{ fontSize: "0.85em", color: "var(--pico-muted-color)", maxWidth: "20rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.vimeoUrl}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <button
                            className="secondary outline"
                            style={{ padding: "0.1em 0.4em" }}
                            aria-label="Move up"
                            disabled={i === 0 || reorderDeliveryVideos.isPending}
                            onClick={() => {
                              const ids = deliveryVideos.map((x: DeliveryVideo) => x.id);
                              [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                              reorderDeliveryVideos.mutate(ids);
                            }}
                          >↑</button>
                          <button
                            className="secondary outline"
                            style={{ padding: "0.1em 0.4em" }}
                            aria-label="Move down"
                            disabled={i === deliveryVideos.length - 1 || reorderDeliveryVideos.isPending}
                            onClick={() => {
                              const ids = deliveryVideos.map((x: DeliveryVideo) => x.id);
                              [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]];
                              reorderDeliveryVideos.mutate(ids);
                            }}
                          >↓</button>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <button
                            className="secondary outline"
                            style={{ padding: "0.2em 0.5em" }}
                            onClick={() => { setEditVideoId(v.id); setEditVideoForm({ title: v.title, vimeoUrl: v.vimeoUrl }); }}
                          >Edit</button>
                          <button
                            className="contrast outline"
                            style={{ padding: "0.2em 0.5em" }}
                            aria-busy={deleteDeliveryVideo.isPending}
                            onClick={() => deleteDeliveryVideo.mutate(v.id)}
                          >✕</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showAddVideo && (
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: "120px" }}>
              <label style={{ fontSize: "0.85em", display: "block", marginBottom: "0.25rem" }}>Title</label>
              <input
                value={newVideoForm.title}
                onChange={(e) => setNewVideoForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Wedding Film"
                aria-label="New video title"
              />
            </div>
            <div style={{ flex: 2, minWidth: "200px" }}>
              <label style={{ fontSize: "0.85em", display: "block", marginBottom: "0.25rem" }}>Vimeo URL</label>
              <input
                value={newVideoForm.vimeoUrl}
                onChange={(e) => setNewVideoForm((f) => ({ ...f, vimeoUrl: e.target.value }))}
                placeholder="https://vimeo.com/..."
                aria-label="New video Vimeo URL"
              />
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                aria-busy={createDeliveryVideo.isPending}
                disabled={createDeliveryVideo.isPending || !newVideoForm.title || !newVideoForm.vimeoUrl}
                onClick={async () => {
                  await createDeliveryVideo.mutateAsync(newVideoForm);
                  setNewVideoForm(EMPTY_VIDEO);
                  setShowAddVideo(false);
                }}
              >Save</button>
              <button className="secondary" onClick={() => { setShowAddVideo(false); setNewVideoForm(EMPTY_VIDEO); }}>Cancel</button>
            </div>
          </div>
        )}

        {deliveryVideos.length === 0 && !showAddVideo && (
          <p style={{ color: "var(--pico-muted-color)" }}>No videos added yet.</p>
        )}
      </section>
    </>
  );
}
