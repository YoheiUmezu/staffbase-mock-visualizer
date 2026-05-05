import skillMd from "../../SKILL.md?raw";
import projectInstruction from "../../PROJECT_INSTRUCTION.md?raw";
import mockHtmlRequirements from "../../templates/mock_html_requirements.md?raw";
import colorPaletteTemplate from "../../templates/color_palette_mapping_template.md?raw";
import desktopSample from "../../sample_deliverables/03_mock_desktop.html?raw";
import mobileSample from "../../sample_deliverables/04_mock_mobile.html?raw";
import customCss from "../../sample_deliverables/06_staffbase_custom.css?raw";
import officialCssRules from "../../references/staffbase_official_css_rules.md?raw";
import brandingMapping from "../../references/staffbase_branding_mapping_guide.md?raw";

export const systemContext = `
${skillMd}
---
## プロジェクト指示
${projectInstruction}
---
## HTMLモック要件
${mockHtmlRequirements}
---
## カラーパレットマッピング
${colorPaletteTemplate}
---
## Staffbase公式CSSルール
${officialCssRules}
---
## ブランドマッピングガイド
${brandingMapping}
---
## デスクトップモックサンプル
${desktopSample}
---
## モバイルモックサンプル
${mobileSample}
---
## カスタムCSSサンプル
${customCss}
`;
