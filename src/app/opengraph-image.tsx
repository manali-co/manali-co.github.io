import { ogImage, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "manali apps";

export default async function Image() {
  return ogImage({ title: "Things we wished existed. So we're building them.", kicker: "manali apps", byline: "AI and automated software, built by people with help from agents." });
}
