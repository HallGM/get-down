import { Link, useParams } from "react-router-dom";
import { usePerformerGig } from "../../api/hooks/usePerformer.js";
import { formatDate } from "../../utils/date.js";

export default function PerformerGigDetail() {
  const { token = "", gigId } = useParams<{ token: string; gigId: string }>();
  const { data: gig, isLoading, error } = usePerformerGig(token, Number(gigId));

  const header = (
    <header style={{ borderBottom: "1px solid var(--pico-muted-border-color)", marginBottom: "2rem", paddingBottom: "1rem" }}>
      <strong>Every Angle</strong>
    </header>
  );

  if (isLoading) {
    return (
      <main className="container">
        {header}
        <p aria-busy="true">Loading…</p>
      </main>
    );
  }

  if (error || !gig) {
    return (
      <main className="container">
        {header}
        <article>
          <p>Gig not found. <Link to={`/p/${token}`}>← Back to your gigs</Link></p>
        </article>
      </main>
    );
  }

  return (
    <main className="container">
      {header}

      <nav aria-label="breadcrumb">
        <ul>
          <li><Link to={`/p/${token}`}>Your gigs</Link></li>
          <li>{formatDate(gig.date)}</li>
        </ul>
      </nav>

      <hgroup>
        <h1>{gig.firstName} {gig.lastName}</h1>
        <p>{formatDate(gig.date)}</p>
      </hgroup>

      {/* Services */}
      {gig.services.length > 0 && (
        <article>
          <h2>Services</h2>
          <ul>
            {gig.services.map((s) => <li key={s.id}>{s.name}</li>)}
          </ul>
        </article>
      )}

      {/* Event details */}
      <article>
        <h2>Event details</h2>
        <dl style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {gig.venueName && (
            <div>
              <dt><small><strong>Venue</strong></small></dt>
              <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{gig.venueName}</dd>
            </div>
          )}
          {gig.location && (
            <div>
              <dt><small><strong>Location</strong></small></dt>
              <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{gig.location}</dd>
            </div>
          )}
          {gig.timings && (
            <div>
              <dt><small><strong>Timings</strong></small></dt>
              <dd style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{gig.timings}</dd>
            </div>
          )}
          {gig.contactNumber && (
            <div>
              <dt><small><strong>Contact number</strong></small></dt>
              <dd style={{ margin: 0, overflowWrap: "anywhere" }}>
                <a href={`tel:${gig.contactNumber}`}>{gig.contactNumber}</a>
              </dd>
            </div>
          )}
          {gig.parkingInfo && (
            <div>
              <dt><small><strong>Parking</strong></small></dt>
              <dd style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{gig.parkingInfo}</dd>
            </div>
          )}
          {gig.clientNotes && (
            <div>
              <dt><small><strong>Client notes</strong></small></dt>
              <dd style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{gig.clientNotes}</dd>
            </div>
          )}
          {gig.performerNotes && (
            <div>
              <dt><small><strong>Performer notes</strong></small></dt>
              <dd style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{gig.performerNotes}</dd>
            </div>
          )}
          {gig.playlistUrl && (
            <div>
              <dt><small><strong>DJ playlist</strong></small></dt>
              <dd style={{ margin: 0, overflowWrap: "anywhere" }}>
                <a href={gig.playlistUrl} target="_blank" rel="noopener noreferrer">Open playlist ↗</a>
              </dd>
            </div>
          )}
          {gig.endOfNightSong && (
            <div>
              <dt><small><strong>End of night</strong></small></dt>
              <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{gig.endOfNightSong}</dd>
            </div>
          )}
          {gig.firstDanceSong && (
            <div>
              <dt><small><strong>First dance</strong></small></dt>
              <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{gig.firstDanceSong}</dd>
            </div>
          )}
          {gig.firstDanceType && (
            <div>
              <dt><small><strong>First dance type</strong></small></dt>
              <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{gig.firstDanceType}</dd>
            </div>
          )}
          <div>
            <dt><small><strong>Ceilidh</strong></small></dt>
            <dd style={{ margin: 0 }}>{gig.ceilidh ? "Yes" : "No"}</dd>
          </div>
          {gig.ceilidh && gig.ceilidhLength && (
            <div>
              <dt><small><strong>Ceilidh length</strong></small></dt>
              <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{gig.ceilidhLength}</dd>
            </div>
          )}
          {gig.ceilidh && gig.ceilidhStyle && (
            <div>
              <dt><small><strong>Ceilidh style</strong></small></dt>
              <dd style={{ margin: 0, overflowWrap: "anywhere" }}>{gig.ceilidhStyle}</dd>
            </div>
          )}
        </dl>
      </article>

      {/* Other performers */}
      {gig.otherPerformers.length > 0 && (
        <article>
          <h2>Other performers</h2>
          <ul>
            {gig.otherPerformers.map((p) => (
              <li key={p.id}>{p.displayName ?? `${p.firstName}${p.lastName ? ` ${p.lastName}` : ""}`}</li>
            ))}
          </ul>
        </article>
      )}

      {/* Must-play songs */}
      {gig.mustPlaySongs.length > 0 && (
        <article>
          <h2>Must-play songs</h2>
          <ul>
            {gig.mustPlaySongs.map((s, i) => (
              <li key={i}>{s.title}{s.artist && ` — ${s.artist}`}</li>
            ))}
          </ul>
        </article>
      )}

      {/* Songs to avoid */}
      {gig.avoidSongs.length > 0 && (
        <article>
          <h2>Songs to avoid</h2>
          <ul>
            {gig.avoidSongs.map((s, i) => (
              <li key={i}>{s.title}{s.artist && ` — ${s.artist}`}</li>
            ))}
          </ul>
        </article>
      )}
    </main>
  );
}
