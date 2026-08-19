import type { Trip } from "@/types";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function itineraryToText(trip: Trip): string {
  const itinerary = trip.itinerary;
  if (!itinerary) return "";

  const lines: string[] = [
    `${trip.destination} Itinerary`,
    `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`,
    "",
    itinerary.summary,
    "",
    `Estimated budget: ${itinerary.currency} ${itinerary.totalEstimatedBudget}`,
    "",
  ];

  for (const day of itinerary.days) {
    lines.push(`Day ${day.day} — ${day.city}: ${day.theme}`);
    for (const activity of day.activities) {
      const cost =
        activity.estimatedCost != null
          ? `${itinerary.currency} ${activity.estimatedCost}`
          : "—";
      lines.push(`  ${activity.time}  ${activity.title} (${cost})`);
      if (activity.description) lines.push(`      ${activity.description}`);
    }
    lines.push("");
  }

  if (itinerary.travelTips.length > 0) {
    lines.push("Travel tips:");
    for (const tip of itinerary.travelTips) lines.push(`  - ${tip}`);
  }

  return lines.join("\n");
}

/** Downloads a trip's itinerary as a plain-text file, entirely client-side. */
export function downloadItinerary(trip: Trip) {
  const text = itineraryToText(trip);
  if (!text) return;

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${trip.destination.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-itinerary.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
