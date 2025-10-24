import pageMap from "../pageMap.json";

/**
 * Converts **page names** in text into clickable links
 * using the path definitions in pageMap.json.
 */
export function linkifyPages(text: string): string {
  const replaceLinks = (str: string, map: Record<string, any>): string => {
    let result = str;

    Object.entries(map).forEach(([key, value]) => {
      if (value && typeof value === "object") {
        // 🔁 Recurse into nested pages if present
        if ("pages" in value && value.pages) {
          result = replaceLinks(result, value.pages);
        }

        // 🔗 Replace **Page Name** with hyperlink if path exists
        if ("path" in value && typeof value.path === "string") {
          const pattern = new RegExp(`\\*\\*${key}\\*\\*`, "g");
          result = result.replace(
            pattern,
            `<a href="${value.path}" class="text-emerald-700 font-semibold hover:underline">${key}</a>`
          );
        }
      }
    });

    return result;
  };

  return replaceLinks(text, pageMap);
}
