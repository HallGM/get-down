import { Link } from "react-router-dom";
import type { Gig } from "@get-down/shared";
import { formatGigName } from "../utils/people.js";
import { gigUrl } from "../utils/gigUrl.js";

export interface GigLinkProps {
  gigId?: number;
  gigs?: Gig[];
  tab?: string;
}

/**
 * Displays a linked gig name, or an em dash if no gig is linked.
 * If the gig data is not yet loaded, shows the gig ID as a fallback.
 */
export default function GigLink({ gigId, gigs, tab }: GigLinkProps) {
  if (!gigId) return <>—</>;

  const gig = gigs?.find((g) => g.id === gigId);
  const name = gig ? formatGigName(gig) : `#${gigId}`;

  return <Link to={gigUrl(gigId, tab)}>{name}</Link>;
}
