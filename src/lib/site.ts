export const site = {
  name: "manali apps",
  tagline: "AI and automated software",
  description:
    "Manali Apps: a tiny umbrella for things we wish existed. Yapp for macOS, What Should We Watch for iOS and Android, and notes on how they get made.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://manali-co.github.io",
  github: "https://github.com/manali-co",
  coffee: process.env.NEXT_PUBLIC_COFFEE_URL || "https://ko-fi.com/manaliapps",
  giscus: {
    repo: "manali-co/manali-co.github.io",
    repoId: "R_kgDOUqgqIg",
    category: "Announcements",
    categoryId: "DIC_kwDOUqgqIs4DGWN8",
  },
};

export type ProjectSlug = "yapp" | "what-should-we-watch" | "manali";

export const projects = [
  {
    slug: "yapp" as const,
    name: "Yapp",
    platform: "macOS",
    status: "building" as const,
    statusLabel: "building",
    blurb:
      "Hold a key, talk, and your Mac gets on with it while you're still talking. Speech stays on your machine; a small decision model turns each phrase into an action. It never asks \"are you sure?\"",
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
    statusLabel: "building · TestFlight",
    blurb:
      "The question everyone asks at 9pm, answered before 9:20. Pick a mood, get ten films that are actually streaming tonight, swipe to decide.",
    repo: "https://github.com/manali-co/what-should-we-watch",
    icon: "/apps/what-should-we-watch-icon.png",
    well: "wsww" as const,
    license: "Proprietary",
    noBuild: "No public build yet. It ships to TestFlight from main; a public link follows when it's ready.",
  },
];

export const projectLabel: Record<string, string> = {
  yapp: "Yapp",
  "what-should-we-watch": "What Should We Watch",
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
  linkedin: process.env.NEXT_PUBLIC_OWNER_LINKEDIN || "",
};

export const authors: Record<string, Author> = {
  ayush: { id: "ayush", name: "Ayush", kind: "person", links: { github: owner.github, linkedin: owner.linkedin } },
  claude: { id: "claude", name: "Claude", kind: "agent", owner: owner.name, links: { github: owner.github, linkedin: owner.linkedin } },
};
