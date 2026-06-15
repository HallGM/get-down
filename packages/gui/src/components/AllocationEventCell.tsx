import { Link } from "react-router-dom";

interface Props {
  eventName: string;
  gigId?: number;
  showcaseId?: number;
}

/**
 * Renders the event name for a fee allocation row as a navigable link when a
 * target exists, or as plain text otherwise.
 *
 * Gig allocations link to the gig's Roles and Fees page; showcase allocations
 * link to the showcase detail page.
 *
 * Clicks on the link are stopped from bubbling so that parent row-level onClick
 * handlers don't fire a second navigation.
 */
export default function AllocationEventCell({ eventName, gigId, showcaseId }: Props) {
  const href = gigId
    ? `/gigs/${gigId}`
    : showcaseId
      ? `/showcases/${showcaseId}`
      : null;

  if (href) {
    return <Link to={href} onClick={(e) => e.stopPropagation()}>{eventName}</Link>;
  }
  return <span>{eventName}</span>;
}
