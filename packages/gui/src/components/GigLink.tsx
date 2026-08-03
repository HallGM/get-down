import { Link } from "react-router-dom";
import type { Gig } from "@get-down/shared";
import { formatGigName } from "../utils/people.js";

export interface GigLinkProps {
  gigId?: number;
  gigs?: Gig[];
}

/**
 * Displays a linked gig name, or an em dash if no gig is linked.
 * If the gig data is not yet loaded, shows the gig ID as a fallback.
 */
export default function GigLink({ gigId, gigs }: GigLinkProps) {
  if (!gigId) return <>—</>;

  const gig = gigs?.find((g) => g.id === gigId);
  const name = gig ? formatGigName(gig) : `#${gigId}`;

  return <Link to={`/gigs/${gigId}`}>{name}</Link>;
}
