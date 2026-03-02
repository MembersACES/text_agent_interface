const fs = require("fs");
const path = require("path");

const pagePath = path.join(__dirname, "..", "src", "app", "crm-members", "[id]", "page.tsx");

let buf = fs.readFileSync(pagePath);
// If file is UTF-16 LE, every other byte is 0; decode as UTF-16 then write as UTF-8
let content;
if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
  content = buf.toString("utf16le");
} else if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
  content = buf.toString("utf16be");
} else {
  content = buf.toString("utf8");
}
// Strip BOM and any null bytes
content = content.replace(/^\uFEFF/, "").replace(/\0/g, "");

fs.writeFileSync(pagePath, content, "utf8");
console.log("Fixed encoding for", pagePath);
