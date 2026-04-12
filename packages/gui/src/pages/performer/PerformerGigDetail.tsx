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
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1.5rem" }}>
          {gig.venueName && (
            <><dt>Venue</dt><dd>{gig.venueName}</dd></>
          )}
          {gig.location && (
            <><dt>Location</dt><dd>{gig.location}</dd></>
          )}
          {gig.timings && (
            <><dt>Timings</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.timings}</dd></>
          )}
          {gig.contactNumber && (
            <><dt>Contact number</dt><dd><a href={`tel:${gig.contactNumber}`}>{gig.contactNumber}</a></dd></>
          )}
          {gig.parkingInfo && (
            <><dt>Parking</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.parkingInfo}</dd></>
          )}
          {gig.clientNotes && (
            <><dt>Client notes</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.clientNotes}</dd></>
          )}
          {gig.performerNotes && (
            <><dt>Performer notes</dt><dd style={{ whiteSpace: "pre-wrap" }}>{gig.performerNotes}</dd></>
          )}
          {gig.playlistUrl && (
            <><dt>DJ playlist</dt><dd><a href={gig.playlistUrl} target="_blank" rel="noopener noreferrer">{gig.playlistUrl}</a></dd></>
          )}
          {gig.endOfNightSong && (
            <><dt>End of night</dt><dd>{gig.endOfNightSong}</dd></>
          )}
          {gig.firstDanceSong && (
            <><dt>First dance</dt><dd>{gig.firstDanceSong}</dd></>
          )}
          {gig.firstDanceType && (
            <><dt>First dance type</dt><dd>{gig.firstDanceType}</dd></>
          )}
          <dt>Ceilidh</dt><dd>{gig.ceilidh ? "Yes" : "No"}</dd>
          {gig.ceilidh && gig.ceilidhLength && (
            <><dt>Ceilidh length</dt><dd>{gig.ceilidhLength}</dd></>
          )}
          {gig.ceilidh && gig.ceilidhStyle && (
            <><dt>Ceilidh style</dt><dd>{gig.ceilidhStyle}</dd></>
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
