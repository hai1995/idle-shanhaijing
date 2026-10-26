# 第三方素材授权记录（LICENSE_ASSETS）

> 登记一切非本项目原创的素材（字体 / 音频 / 图标 / 图片）。新增必须在此登记后再使用。

| 素材 | 类型 | 来源 / 作者 | 授权 | 用途 | 登记日期 |
|---|---|---|---|---|---|
| `rare-han.woff2`（14KB 子集） | 字体 | 花园明朝 HanaMinB · GlyphWiki Project（Koichi Kamichi） | Hanazono Font License / SIL OFL 1.1 | 仅 41 个 CJK 扩展 B 区罕用字（𧔥 𪁺 𩽵 …），供异兽／物品名显示 | 2026-10-26 |

## 字体

### 随项目分发的字体（1 个）

`assets/rare-han.woff2` —— **花园明朝 HanaMinB 的 41 字子集**（14KB）。

- 为什么需要：异兽名里的「𧔥」「𪁺」「𩽵」等在 CJK 扩展 B 区（U+20000+），
  PingFang / HarmonyOS Sans / 思源黑 / Noto CJK **都不收**这些码位，浏览器只能画成豆腐圈。
  系统层无解：Windows 仅 SimSun-ExtB 覆盖一部分，Android / iOS 几乎全缺。
- 授权：上游 `fonts-hanazono` 声明 `Hanazono-Font-License or Open-Font-License`，
  原文为「Unlimited permission is granted to use, copy, and distribute it,
  with or without modification, either commercially and noncommercially.」
  —— 子集化与随项目分发均在其许可范围内。
- 生成方式（可复现）：
  ```
  pyftsubset HanaMinB.ttf --unicodes-file=<41 个码位> --flavor=woff2 \
    --output-file=assets/rare-han.woff2 --no-hinting --desubroutinize --layout-features=''
  ```
- `style.css` 的 `@font-face` 用**精确列出的 `unicode-range`**，不是整段 U+20000-2A6DF ——
  后者会让浏览器以为本字体覆盖整个扩展 B 区，遇到别的扩展字也选它，照样豆腐。
- 单文件版由 `scripts/build-standalone.js` 内联为 base64 data URI，并有构建期自检
  （产物里残留 `assets/` 引用即失败）。

### 其余为系统字体栈

`"Noto Serif SC","Source Han Serif SC","Songti SC","SimSun","RareHan",serif`。

- Noto Serif SC / Source Han Serif：SIL Open Font License 1.1，可商用（本项作为系统字体名引用，未随项目分发字体文件）。
- 宋体（SimSun / Songti SC）：随操作系统分发，未随项目分发文件，不构成再分发。

## 音频

无。

## 图标

使用操作系统 Emoji 字体渲染的字符（📜 ⚔️ 🕯️ 等），未使用任何第三方图标库文件。
