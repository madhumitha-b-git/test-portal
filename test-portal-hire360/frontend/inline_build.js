const fs = require("fs");
const path = require("path");

const buildDir = path.join(__dirname, "build");
const indexPath = path.join(buildDir, "index.html");
const staticJsDir = path.join(buildDir, "static", "js");
const staticCssDir = path.join(buildDir, "static", "css");

let html = fs.readFileSync(indexPath, "utf8");

// Read and inline CSS
if (fs.existsSync(staticCssDir)) {
  const cssFiles = fs.readdirSync(staticCssDir).filter((f) => f.endsWith(".css") && !f.endsWith(".map"));
  for (const cssFile of cssFiles) {
    const cssContent = fs.readFileSync(path.join(staticCssDir, cssFile), "utf8");
    html = html.replace(
      new RegExp(`<link[^>]*href=["']/static/css/${cssFile}["'][^>]*>`, "g"),
      `<style>${cssContent}</style>`
    );
  }
}

// Read and inline JS chunks (453 chunk first, then main)
if (fs.existsSync(staticJsDir)) {
  const jsFiles = fs.readdirSync(staticJsDir).filter((f) => f.endsWith(".js") && !f.endsWith(".map") && !f.endsWith(".LICENSE.txt"));
  
  // Sort so chunks come before main
  jsFiles.sort((a, b) => (a.startsWith("main") ? 1 : -1));

  for (const jsFile of jsFiles) {
    const jsContent = fs.readFileSync(path.join(staticJsDir, jsFile), "utf8");
    
    // Check if script tag exists in html
    const scriptRegex = new RegExp(`<script[^>]*src=["']/static/js/${jsFile}["'][^>]*></script>`, "g");
    if (scriptRegex.test(html)) {
      html = html.replace(scriptRegex, `<script>${jsContent}</script>`);
    } else {
      // Append before </body>
      html = html.replace("</body>", `<script>${jsContent}</script></body>`);
    }
  }
}

fs.writeFileSync(indexPath, html, "utf8");
console.log("Successfully created self-contained inlined index.html! Size:", html.length, "bytes");
