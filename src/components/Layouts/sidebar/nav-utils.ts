import {
  JOB_GROUPS,
  MAIN_NAV,
  NAV_DATA,
  PINNED_NAV,
  type NavGroupItem,
  type NavLinkItem,
  type NavSection,
} from "./data";

export interface FlatNavEntry {
  title: string;
  url: string;
  section: string;
  parent?: string;
}

function isNavGroup(
  item: NavLinkItem | NavGroupItem,
): item is NavGroupItem {
  return "items" in item && Array.isArray(item.items);
}

export function flattenNavSections(sections: NavSection[]): FlatNavEntry[] {
  const out: FlatNavEntry[] = [];
  for (const section of sections) {
    for (const item of section.items) {
      if (isNavGroup(item)) {
        for (const sub of item.items) {
          out.push({
            title: sub.title,
            url: sub.url,
            section: section.label,
            parent: item.title,
          });
        }
      } else if (item.url) {
        out.push({ title: item.title, url: item.url, section: section.label });
      }
    }
  }
  return out;
}

export function getAllNavEntries(): FlatNavEntry[] {
  const pinned = PINNED_NAV.map((item) => ({
    title: item.title,
    url: item.url,
    section: "Pinned",
  }));
  const main = MAIN_NAV.map((item) => ({
    title: item.title,
    url: item.url,
    section: "Main",
  }));
  const jobs = JOB_GROUPS.flatMap((group) =>
    group.items.map((sub) => ({
      title: sub.title,
      url: sub.url,
      section: "Groups",
      parent: group.title,
    })),
  );
  const sections = flattenNavSections(NAV_DATA);
  return [...pinned, ...main, ...jobs, ...sections];
}

export function navMatchesQuery(text: string, query: string): boolean {
  if (!query.trim()) return true;
  return text.toLowerCase().includes(query.trim().toLowerCase());
}
