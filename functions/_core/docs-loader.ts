import { skillDoc } from "./docs/skill";
import { instructionDoc } from "./docs/instruction";
import { requirementsDoc } from "./docs/requirements";
import { cssRulesDoc, brandingDoc, colorPaletteDoc } from "./docs/css-rules";
import { samplesDoc } from "./docs/samples";

export const systemContext = `
${skillDoc}
---
## プロジェクト指示
${instructionDoc}
---
## HTMLモック要件
${requirementsDoc}
---
## カラーパレットマッピング
${colorPaletteDoc}
---
## Staffbase公式CSSルール
${cssRulesDoc}
---
## ブランドマッピングガイド
${brandingDoc}
---
## 成果物サマリー要件
${samplesDoc}
`;
