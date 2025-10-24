import pageMap from "../pageMap.json";

/**
 * Converts **page names** in text into clickable links
 * using the path definitions in pageMap.json.
 */
export function linkifyPages(text: string): string {
  const replaceLinks = (str: string, map: any): string => {
    let result = str;

    Object.entries(map).forEach(([key, value]) => {
      if (typeof value === "object" && value.pages) {
        // Recurse into nested sections
        result = replaceLinks(result, value.pages);
      } else if (value.path) {
        const pattern = new RegExp(`\\*\\*${key}\\*\\*`, "g");
        result = result.replace(
          pattern,
          `<a href="${value.path}" class="text-emerald-700 font-semibold hover:underline">${key}</a>`
        );
      }
    });

    return result;
  };

  return replaceLinks(text, pageMap);
}
