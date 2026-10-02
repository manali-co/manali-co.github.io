export const site = {
  name: "manali apps",
  tagline: "AI and automated software",
  description:
    "Manali Apps is an evening studio for software we wished existed: Yapp for macOS, What Should We Watch for iOS and Android, Spark, and a new way to run recruiter screens. Plus notes on how AI agents build them.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://manali.page",
  github: "https://github.com/manali-co",
  coffee: process.env.NEXT_PUBLIC_COFFEE_URL || "https://ko-fi.com/manaliapps",
  giscus: {
    repo: "manali-co/manali-co.github.io",
    repoId: "R_kgDOUqgqIg",
    category: "Announcements",
    categoryId: "DIC_kwDOUqgqIs4DGWN8",
  },
};

export type ProjectSlug = "yapp" | "what-should-we-watch" | "spark" | "portfolio" | "manali";

export const projects = [
  {
    slug: "yapp" as const,
    name: "Yapp",
    platform: "macOS",
    status: "building" as const,
    statusLabel: "building",
    blurb:
      "Tap a key, talk, and your Mac gets on with it while you're still talking. Speech stays on your machine, and a small decision model turns each phrase into an action. Anything that could do harm waits for your yes.",
    repo: "https://github.com/manali-co/yapp",
    icon: "/apps/yapp-icon.png",
    well: "yapp" as const,
    license: "CC BY 4.0",
    noBuild: "No public build yet. It runs from source today; a signed build is on the list.",
  },
  {
    slug: "what-should-we-watch" as const,
    name: "What Should We Watch",
    platform: "iOS & Android",
    status: "building" as const,
    statusLabel: "coming to the App Store",
    blurb:
      "The question everyone asks at 9pm, answered before 9:20. Pick a mood, get ten films that are actually streaming tonight, swipe to decide.",
    repo: "", // private since 29 Sep 2026: no Source link anywhere
    icon: "/apps/what-should-we-watch-icon.png",
    well: "wsww" as const,
    license: "Proprietary",
    noBuild: "Launching on the App Store in the next few days.",
    /* Launch week: "soon" shows dashed placeholders that don't link. On release, set state to
       "live", fill href, and set badge to the official store artwork under public/ (Apple and
       Google both require their own badges), then change status to live. */
    stores: [
      { store: "app-store" as const, state: "soon" as const, href: "", badge: "" },
      { store: "google-play" as const, state: "soon" as const, href: "", badge: "" },
    ],
  },
  {
    slug: "spark" as const,
    name: "Spark",
    platform: "Web",
    status: "live" as const,
    statusLabel: "live",
    blurb:
      "A personality test that makes up the questions as it goes. Each one is written from your last answer, the next one is already waiting because it guessed what you'd pick, and at the end it tells you which kind of teammate you are.",
    repo: "https://github.com/ayushm-agrawal/spark-personality-test",
    icon: "/apps/spark-icon.png",
    well: "spark" as const,
    license: "All rights reserved",
    live: "https://personality.ception.one",
    noBuild: "",
  },
  {
    slug: "portfolio" as const,
    name: "Personal Portfolio",
    platform: "Web",
    status: "building" as const,
    statusLabel: "very early preview",
    blurb:
      "A new way to run a recruiter screen. Your own agent takes the call on your own site, answers from a record you control, scrolls to the evidence, and hands the recruiter notes. No calendar.",
    repo: "",
    post: "/blog/screening-rounds-just-changed/",
    icon: "/apps/portfolio-icon.png",
    well: "portfolio" as const,
    license: "Private",
    live: "https://www.ayushmagrawal.com",
    noBuild: "",
  },
];

export const projectLabel: Record<string, string> = {
  yapp: "Yapp",
  "what-should-we-watch": "What Should We Watch",
  spark: "Spark",
  portfolio: "Personal Portfolio",
  manali: "org",
};

export type Author = {
  id: string;
  name: string;
  kind: "person" | "agent";
  /** For agents: which project they work in, shown as "Claude for Yapp". */
  owner?: string;
  links?: { github?: string; linkedin?: string };
};

export const owner = {
  name: "Ayush Manish Agrawal",
  github: "https://github.com/ayushm-agrawal",
  linkedin: process.env.NEXT_PUBLIC_OWNER_LINKEDIN || "https://www.linkedin.com/in/ayushmagrawal/",
  scholar: process.env.NEXT_PUBLIC_OWNER_SCHOLAR || "https://scholar.google.com/citations?user=eUbagqkAAAAJ",
  x: process.env.NEXT_PUBLIC_OWNER_X || "",
  bluesky: process.env.NEXT_PUBLIC_OWNER_BLUESKY || "",
  email: process.env.NEXT_PUBLIC_OWNER_EMAIL || "",
};

/* Footer socials, in order. Only the ones with a URL render. */
export const ownerLinks = [
  { key: "github", label: "GitHub", href: owner.github, icon: "github" },
  { key: "linkedin", label: "LinkedIn", href: owner.linkedin, icon: "linkedin" },
  { key: "scholar", label: "Google Scholar", href: owner.scholar, icon: "scholar" },
  { key: "x", label: "X", href: owner.x, icon: "x-logo" },
  { key: "bluesky", label: "Bluesky", href: owner.bluesky, icon: "butterfly" },
  { key: "email", label: "Email", href: owner.email ? `mailto:${owner.email}` : "", icon: "mail" },
].filter((l) => l.href);

export const authors: Record<string, Author> = {
  ayush: { id: "ayush", name: "Ayush", kind: "person", links: { github: owner.github, linkedin: owner.linkedin } },
  claude: { id: "claude", name: "Claude", kind: "agent", owner: owner.name, links: { github: owner.github, linkedin: owner.linkedin } },
};
