export function formatRelativeTime(dateStr: string, timestamp?: number): string {
  const date = timestamp ? new Date(timestamp * 1000) : new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  let relative = "";
  if (diffSec < 60) {
    relative = "just now";
  } else if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    relative = `${mins} min${mins > 1 ? "s" : ""} ago`;
  } else if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    relative = `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else if (diffSec < 2592000) {
    const days = Math.floor(diffSec / 86400);
    relative = `${days} day${days > 1 ? "s" : ""} ago`;
  } else {
    const months = Math.floor(diffSec / 2592000);
    relative = `${months} month${months > 1 ? "s" : ""} ago`;
  }

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  const exact = date.toLocaleString("en-US", options);

  return `${relative} (${exact})`;
}
