import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";

// Import all common programming languages
import "prismjs/components/prism-clike.js";
import "prismjs/components/prism-javascript.js";
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-jsx.js";
import "prismjs/components/prism-tsx.js";
import "prismjs/components/prism-rust.js";
import "prismjs/components/prism-python.js";
import "prismjs/components/prism-json.js";
import "prismjs/components/prism-yaml.js";
import "prismjs/components/prism-toml.js";
import "prismjs/components/prism-bash.js";
import "prismjs/components/prism-markdown.js";
import "prismjs/components/prism-sql.js";
import "prismjs/components/prism-go.js";
import "prismjs/components/prism-c.js";
import "prismjs/components/prism-cpp.js";
import "prismjs/components/prism-diff.js";

// Add common aliases
if (Prism.languages) {
  Prism.languages.ts = Prism.languages.typescript;
  Prism.languages.js = Prism.languages.javascript;
  Prism.languages.rs = Prism.languages.rust;
  Prism.languages.py = Prism.languages.python;
  Prism.languages.sh = Prism.languages.bash;
  Prism.languages.shell = Prism.languages.bash;
  Prism.languages.yml = Prism.languages.yaml;
  Prism.languages.md = Prism.languages.markdown;
}

export default Prism;
