use crate::commands::connections::CommandError;

/// Escapes every `</` in the JSON text before it's embedded inside a
/// `<script>` block. The HTML parser looks for the literal byte sequence
/// `</script` to end the tag *before* the JS parser ever sees the content,
/// regardless of any JSON/JS string escaping — since this is rendering a
/// Kafka message payload (arbitrary, untrusted data), a value containing
/// that sequence could otherwise break out of the script and inject
/// markup into the generated page.
fn escape_for_script_tag(json: &str) -> String {
    json.replace("</", "<\\/")
}

fn viewer_html(json: &str) -> String {
    let escaped = escape_for_script_tag(json);
    format!(
        r##"<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>JSON Viewer</title>
<style>
  :root {{ color-scheme: light dark; }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0;
    padding: 16px;
    background: #1e1e2e;
    color: #cdd6f4;
    font-family: ui-monospace, "SF Mono", Consolas, monospace;
    font-size: 13px;
  }}
  .toolbar {{ display: flex; justify-content: flex-end; margin-bottom: 8px; }}
  #copy-btn {{
    padding: 4px 12px;
    border-radius: 4px;
    border: 1px solid #313244;
    background: #262638;
    color: #8890b5;
    font-family: inherit;
    font-size: 12px;
    cursor: pointer;
  }}
  #copy-btn:hover {{ color: #cdd6f4; border-color: #89b4fa; }}
  #root {{
    background: #181825;
    border: 1px solid #313244;
    border-radius: 4px;
    padding: 8px 10px;
    overflow-x: auto;
  }}
  .line {{ display: flex; align-items: center; gap: 2px; line-height: 1.6; white-space: pre; }}
  .indent {{ display: inline-block; width: 16px; flex-shrink: 0; }}
  .caret {{
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    color: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
  }}
  .caret::before {{
    content: "";
    width: 0;
    height: 0;
    border-left: 5px solid currentColor;
    border-top: 3.5px solid transparent;
    border-bottom: 3.5px solid transparent;
    transition: transform 0.1s ease;
  }}
  .caret.expanded::before {{ transform: rotate(90deg); }}
  .key {{ color: #8890b5; }}
  .bracket {{ color: #8890b5; }}
  .summary {{ color: #8890b5; font-style: italic; margin: 0 4px; }}
  .value-string {{ color: #a6e3a1; }}
  .value-number {{ color: #89b4fa; }}
  .value-boolean {{ color: #f38ba8; font-weight: 600; }}
  .value-null {{ color: #8890b5; font-style: italic; }}
</style>
</head>
<body>
<div class="toolbar"><button type="button" id="copy-btn">Copy</button></div>
<div id="root" role="tree"></div>
<script>
const data = {escaped};

function renderNode(value, container, label, depth) {{
  const indentPx = depth * 14;
  const isExpandable = value !== null && typeof value === "object";

  if (!isExpandable) {{
    const line = document.createElement("div");
    line.className = "line";
    line.style.paddingLeft = indentPx + "px";
    const indent = document.createElement("span");
    indent.className = "indent";
    line.appendChild(indent);
    if (label !== null) {{
      const key = document.createElement("span");
      key.className = "key";
      key.textContent = label + ": ";
      line.appendChild(key);
    }}
    const val = document.createElement("span");
    const type = value === null ? "null" : typeof value;
    val.className = "value-" + type;
    val.textContent = value === null ? "null" : typeof value === "string" ? JSON.stringify(value) : String(value);
    line.appendChild(val);
    container.appendChild(line);
    return;
  }}

  const isArray = Array.isArray(value);
  const entries = isArray ? value.map((item, index) => [String(index), item]) : Object.entries(value);
  const openBracket = isArray ? "[" : "{{";
  const closeBracket = isArray ? "]" : "}}";

  const openLine = document.createElement("div");
  openLine.className = "line";
  openLine.style.paddingLeft = indentPx + "px";

  const caret = document.createElement("button");
  caret.type = "button";
  caret.className = "caret expanded";
  caret.setAttribute("aria-label", "Collapse " + (label ?? "value"));
  openLine.appendChild(caret);

  if (label !== null) {{
    const key = document.createElement("span");
    key.className = "key";
    key.textContent = label + ": ";
    openLine.appendChild(key);
  }}

  const openSpan = document.createElement("span");
  openSpan.className = "bracket";
  openSpan.textContent = openBracket;
  openLine.appendChild(openSpan);

  const summary = document.createElement("span");
  summary.className = "summary";
  summary.textContent = entries.length + (isArray ? " items" : " keys");
  summary.style.display = "none";
  openLine.appendChild(summary);

  const inlineClose = document.createElement("span");
  inlineClose.className = "bracket";
  inlineClose.textContent = closeBracket;
  inlineClose.style.display = "none";
  openLine.appendChild(inlineClose);

  container.appendChild(openLine);

  const childrenBlock = document.createElement("div");
  entries.forEach(([key, item]) => renderNode(item, childrenBlock, key, depth + 1));

  const closeLine = document.createElement("div");
  closeLine.className = "line";
  closeLine.style.paddingLeft = indentPx + "px";
  const closeIndent = document.createElement("span");
  closeIndent.className = "indent";
  closeLine.appendChild(closeIndent);
  const closeSpan = document.createElement("span");
  closeSpan.className = "bracket";
  closeSpan.textContent = closeBracket;
  closeLine.appendChild(closeSpan);
  childrenBlock.appendChild(closeLine);

  container.appendChild(childrenBlock);

  caret.addEventListener("click", () => {{
    const expanded = caret.classList.toggle("expanded");
    childrenBlock.style.display = expanded ? "" : "none";
    summary.style.display = expanded ? "none" : "";
    inlineClose.style.display = expanded ? "none" : "";
    caret.setAttribute("aria-label", (expanded ? "Collapse " : "Expand ") + (label ?? "value"));
  }});
}}

renderNode(data, document.getElementById("root"), null, 0);

document.getElementById("copy-btn").addEventListener("click", async () => {{
  await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  const btn = document.getElementById("copy-btn");
  const original = btn.textContent;
  btn.textContent = "Copied!";
  setTimeout(() => {{ btn.textContent = original; }}, 1500);
}});
</script>
</body>
</html>"##
    )
}

/// Writes the given JSON text into a standalone HTML page (a minimal
/// collapsible tree viewer, no app chrome) and opens it with the OS's
/// default handler for `.html` files — reliably the system browser, unlike
/// `window.open()` inside a Tauri webview, which has no concept of tabs.
#[tauri::command]
pub fn open_json_viewer(json: String) -> Result<(), CommandError> {
    let html = viewer_html(&json);
    let mut path = std::env::temp_dir();
    path.push(format!("kafkaoxide-json-{}.html", uuid::Uuid::new_v4()));
    std::fs::write(&path, html).map_err(|err| CommandError {
        message: format!("failed to write JSON viewer file: {err}"),
    })?;
    open::that(&path).map_err(|err| CommandError {
        message: format!("failed to open JSON viewer: {err}"),
    })?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escapes_script_close_sequences() {
        let json = r#"{"evil":"</script><script>alert(1)</script>"}"#;
        let escaped = escape_for_script_tag(json);
        assert!(!escaped.contains("</script"));
        assert!(escaped.contains("<\\/script"));
    }

    #[test]
    fn leaves_ordinary_json_untouched() {
        let json = r#"{"a":1,"b":"hello"}"#;
        assert_eq!(escape_for_script_tag(json), json);
    }

    #[test]
    fn generated_html_embeds_the_json_and_has_no_unescaped_script_close() {
        let json = r#"{"note":"</script>"}"#;
        let html = viewer_html(json);
        assert!(html.contains("const data ="));
        // Only the two real </script> closing tags (for the page's own
        // script block) should remain unescaped.
        assert_eq!(html.matches("</script>").count(), 1);
    }
}
