/* 색감(tone)을 모양(theme)에서 뗀다.

   전에는 프리셋 일곱이 «모양 + 색» 을 한 덩이로 들고 있었다. 그래서
   「공책 모양은 좋은데 청사진 색으로 보고 싶다」 를 할 수 없었고,
   일곱 벌의 팔레트가 손으로 적혀 있어 조금씩 어긋나 있었다.

   여기서 만드는 것 · 
     [data-theme=…]  모양만: 글꼴 · 모서리 · 테두리 굵기 · 돌기 · 여백 · 덮개
     [data-tone=…]   색만  : 종이 · 잉크 · 강조 · 선 · 유형 여섯 · 알림 세 벌
   순서가 중요하다. 색이 «뒤에» 와야 모양 블록의 남은 색을 덮는다.

   ⚠️ 이것은 «점검» 이 아니라 «만드는» 도구다. 한 번 돌리면 index.html 의 색 부분을 갈아 끼운다.
      색감을 고칠 일이 있으면 아래 TONES 만 고치고 다시 돌린다. 손으로 CSS 를 고치지 말 것 · 
      어두울 때 값이 두 자리(기기 따름 · 사람이 고름)에 놓여야 해서, 한쪽만 고치면 어긋난다.

   ⚠️ 이미 갈아 끼운 뒤에는 그대로 다시 못 돌린다 (찾는 자리가 사라졌다).
      다시 쓰려면 아래 from/to 를 지금 파일에 맞게 손봐야 한다.

   실행:  node docs/점검도구/색감만들기.mjs */
import fs from "node:fs";

const nl = "\r\n";

/* ── 색감 여섯 벌 ──────────────────────────────────────────
   한 벌은 밝을 때와 어두울 때를 «같은 자리» 에 적는다.
   두 자리에 나눠 적으면 한쪽만 고치고 다른 쪽을 잊는다. */
const TONES = {
  craft: {
    label: "크래프트", sub: "크림 종이에 붉은 흙",
    l: { bg:"#FBF6EE", panel:"#FFFDF8", ink:"#26221E", inks:"#685F54",
         brand:"#A8483C", brandd:"#7F352C", brands:"#F6E2DC",
         line:"#DCD1BE", lines:"#E2D8C6", hard:"#26221E",
         t:[["#4F6B3E","#DFEAC8"],["#3A5D85","#D6E6F2"],["#7A5A12","#FBE8BE"],
            ["#8F5626","#F7DFC4"],["#8E4A60","#F8DCE2"],["#4C4370","#E5DDF0"]],
         warn:["#FBF3E0","#E8D9B4","#6B5320"], ok:["#EDF3E8","#CFDDC2","#3F5A33"], pin:"#F7EBD2" },
    d: { bg:"#1C1917", panel:"#24201C", ink:"#F0E9DD", inks:"#AEA394",
         brand:"#E08A7C", brandd:"#C4705F", brands:"#3A2B26",
         line:"#4A423A", lines:"#332D27", hard:"#0F0D0B",
         t:[["#C5DBA6","#313B26"],["#A9C9E4","#24313D"],["#E8CE8C","#3B3320"],
            ["#E2B589","#3B2C1E"],["#E3AFC0","#3A252C"],["#C2B6E0","#2C2740"]],
         warn:["#332911","#5A4715","#F0D78F"], ok:["#12301C","#1E5C3C","#9AE0BB"], pin:"#3A2F12" }
  },
  sunny: {
    label: "볕", sub: "노란 종이에 빨강",
    l: { bg:"#FFF8E4", panel:"#FFFFFF", ink:"#2B2118", inks:"#6C5D4B",
         brand:"#D8402F", brandd:"#B22F21", brands:"#FFE0DB",
         line:"#E7D8B4", lines:"#F0E2C4", hard:"#2B2118",
         t:[["#2B6F2F","#CDEBC6"],["#1F63B8","#CFE3F8"],["#8C6300","#FFEDB8"],
            ["#A34615","#FFDDC2"],["#A83567","#FFD6E6"],["#6B44B0","#E4D8F8"]],
         warn:["#FFF3D4","#EFDCA6","#6B5117"], ok:["#E9F6E4","#C6E2BC","#33612F"], pin:"#FFEFC2" },
    d: { bg:"#1C1917", panel:"#24201C", ink:"#F0E9DD", inks:"#AEA394",
         brand:"#F07A6C", brandd:"#D4604F", brands:"#3E2823",
         line:"#4A423A", lines:"#332D27", hard:"#0F0D0B",
         t:[["#9FD69B","#24331F"],["#96C2F0","#1E2C3D"],["#F0D48C","#3A3018"],
            ["#F0B48C","#3B2A1B"],["#F0A8C4","#3A2029"],["#C4AEEF","#2B2440"]],
         warn:["#332911","#5A4715","#F0D78F"], ok:["#12301C","#1E5C3C","#9AE0BB"], pin:"#3A2F12" }
  },
  sky: {
    label: "하늘", sub: "흰 종이에 파랑",
    l: { bg:"#F5F7FB", panel:"#FFFFFF", ink:"#1B2130", inks:"#5A6478",
         brand:"#2F5FD6", brandd:"#24499F", brands:"#EAF0FF",
         line:"#E3E8F2", lines:"#EEF1F7", hard:"#1B2130",
         t:[["#2F6D4A","#E3F1E8"],["#2F5FD6","#EAF0FF"],["#7A5A12","#F7EEDA"],
            ["#9A4E24","#FBE9DE"],["#94406A","#FBE4EE"],["#4F45A8","#EAE7FA"]],
         warn:["#FFF8E6","#F0DCA8","#6B4E00"], ok:["#EAF7F0","#B9E3CD","#0F5C39"], pin:"#FFF4D6" },
    d: { bg:"#12161F", panel:"#1B202B", ink:"#E8ECF4", inks:"#98A2B3",
         brand:"#7D9DFF", brandd:"#5F83F0", brands:"#232C44",
         line:"#2B3242", lines:"#232936", hard:"#05070B",
         t:[["#86D0A6","#17301F"],["#7D9DFF","#232C44"],["#DFC582","#332C18"],
            ["#EFA277","#33241A"],["#EC93B8","#331F29"],["#A99BF0","#26224A"]],
         warn:["#332911","#5A4715","#F0D78F"], ok:["#10321F","#1E5C3C","#97E0BB"], pin:"#3A2F12" }
  },
  ink: {
    label: "먹", sub: "회백 종이에 먹",
    l: { bg:"#F4F2ED", panel:"#FFFFFF", ink:"#1F1D1A", inks:"#65605A",
         brand:"#3A4A5C", brandd:"#2A3745", brands:"#E7EBF0",
         line:"#DAD5CC", lines:"#EDEAE3", hard:"#1F1D1A",
         t:[["#3F5C3F","#E6EDE5"],["#37506A","#E4EBF1"],["#6B5828","#F0EADC"],
            ["#6B4633","#EFE5DE"],["#5E3B4A","#EDE3E7"],["#454063","#E7E5EF"]],
         warn:["#F6F1E4","#E0D6BE","#6B5A32"], ok:["#EBF0EB","#CBD8CB","#3E5540"], pin:"#F2ECDC" },
    d: { bg:"#17181A", panel:"#202225", ink:"#E8E6E1", inks:"#9C978F",
         brand:"#A8BBD0", brandd:"#8FA3BA", brands:"#262B33",
         line:"#37393D", lines:"#2A2C2F", hard:"#08090A",
         t:[["#A9C4A9","#232A23"],["#A5BACD","#212830"],["#CDBB8C","#2C2921"],
            ["#CDAE96","#2C2622"],["#C4A2AF","#2B2427"],["#ADA8C6","#26242E"]],
         warn:["#2B2718","#4C4423","#E0CE96"], ok:["#1B2A20","#33513E","#A8CDB4"], pin:"#2E2A1E" }
  },
  blue: {
    label: "청사진", sub: "청회 바탕에 청록",
    l: { bg:"#EDF1F4", panel:"#FFFFFF", ink:"#16202B", inks:"#54custom", // 자리표시
         brand:"#0E6FA8", brandd:"#0A5580", brands:"#DCEDF8",
         line:"#C6D2DC", lines:"#E6ECF1", hard:"#16202B",
         t:[["#2B764A","#E2F0E8"],["#1B6FA8","#DEEDF7"],["#816613","#F4EEDC"],
            ["#9C5328","#F7E9DE"],["#9C3F63","#F6E3EA"],["#55499B","#E7E5F4"]],
         warn:["#EEF3F7","#C6D2DC","#3E5468"], ok:["#E9F2EC","#C2D8CA","#2E5741"], pin:"#E4EDF4" },
    d: { bg:"#10161C", panel:"#182028", ink:"#DCE6EF", inks:"#8FA2B3",
         brand:"#5FB3E0", brandd:"#4593BC", brands:"#1B2B37",
         line:"#2C3945", lines:"#1E2833", hard:"#05080B",
         t:[["#7CC49B","#1A2B22"],["#6FB4DE","#172833"],["#D2BB78","#2B2718"],
            ["#DFA277","#2F241B"],["#D28FAA","#2D1F26"],["#A79BDC","#232040"]],
         warn:["#22303B","#3C5062","#B9CFE0"], ok:["#162C22","#2C513E","#9CCBB0"], pin:"#1D2A34" }
  },
  forest: {
    label: "숲", sub: "연둣 종이에 짙은 초록",
    l: { bg:"#F2F5EC", panel:"#FFFFFF", ink:"#1D241B", inks:"#5A6455",
         brand:"#2F6B3C", brandd:"#22522D", brands:"#E2EFE2",
         line:"#D6DECC", lines:"#E8EEE0", hard:"#1D241B",
         t:[["#2F6B3C","#E971placeholder"],["#2F5F86","#E2EDF5"],["#75620F","#F5EFD8"],
            ["#8A4E22","#F6E7DA"],["#8A3D5E","#F6E1EA"],["#4A4478","#E8E5F3"]],
         warn:["#F7F2E0","#DFD6B4","#63541F"], ok:["#E7F2E7","#C4DCC4","#2E5537"], pin:"#EFF1D6" },
    d: { bg:"#141812", panel:"#1C211A", ink:"#E6EDE2", inks:"#9AA495",
         brand:"#8FCB96", brandd:"#6EAE77", brands:"#22301F",
         line:"#3A422F", lines:"#272D22", hard:"#080A07",
         t:[["#9FD6A6","#1F2E20"],["#93BEDE","#1C2833"],["#DCC585","#2D2818"],
            ["#DFA57C","#2F241B"],["#DA94B2","#2D1F27"],["#A79CDA","#242140"]],
         warn:["#2C2913","#4C4523","#DECB92"], ok:["#172B1C","#2E5238","#A3CCA9"], pin:"#2C2E16" }
  }
};

/* 자리표시로 남긴 곳을 바로잡는다 (손으로 적다 흘린 것을 여기서 막는다) */
TONES.blue.l.inks = "#54636F";
TONES.forest.l.t[0][1] = "#E0EFDF";

function palette(v, pad) {
  const P = " ".repeat(pad);
  const t = v.t.map((x, i) => `--t${i + 1}: ${x[0]}; --t${i + 1}s: ${x[1]};`);
  return [
    `--bg: ${v.bg}; --panel: ${v.panel}; --ink: ${v.ink}; --ink-soft: ${v.inks};`,
    `--brand: ${v.brand}; --brand-dark: ${v.brandd}; --brand-soft: ${v.brands};`,
    `--line: ${v.line}; --line-soft: ${v.lines}; --hard: ${v.hard};`,
    `--warn-bg: ${v.warn[0]}; --warn-line: ${v.warn[1]}; --warn-ink: ${v.warn[2]};`,
    `--ok-bg: ${v.ok[0]}; --ok-line: ${v.ok[1]}; --ok-ink: ${v.ok[2]}; --pin-bg: ${v.pin};`,
    t[0] + " " + t[1], t[2] + " " + t[3], t[4] + " " + t[5]
  ].map((l) => P + l).join(nl);
}

/* ── 모양 일곱 벌 · 색은 한 톨도 없다 ────────────────────── */
const SHAPES = {
  memo: { title: "메모지 · 손으로 그린 듯 삐뚤한 테두리", css: [
    `--shadow: none;`,
    `--font-title: "Gaegu", var(--font-body); --title-spacing: -.5px;`,
    `--bw: 2.5px;`,
    `--line: var(--ink);          /* 굵고 짙은 테두리가 이 모양의 얼굴이다 */`,
    `--radius: 255px 15px 225px 15px / 15px 225px 15px 255px;`,
    `--r-btn: 225px 15px 255px 15px / 15px 255px 15px 225px;`,
    `--r-btn-sm: 225px 15px 255px 15px / 15px 255px 15px 225px;`,
    `--r-inp: 255px 15px 225px 15px / 15px 225px 15px 255px;`,
    `--r-block: 15px 225px 15px 255px / 225px 15px 255px 15px;`,
    `--veil: transparent;         /* 유형 색이 카드에 드러난다 */`,
    `--accent-w: 0px;`] },
  brick: { title: "블록 · 쌓아 올리는 조각", css: [
    `--shadow: 2.5px 2.5px 0 var(--hard);`,
    `--font-title: "Gaegu", var(--font-body); --title-spacing: -.5px;`,
    `--bw: 2.5px;`,
    `--line: var(--ink);`,
    `--radius: 8px; --r-btn: 7px; --r-btn-sm: 6px; --r-inp: 7px; --r-pill: 5px; --r-block: 7px;`,
    `--veil: transparent;`,
    `--entry-pt: 26px;`,
    `--accent-w: 0px;`,
    `--stud: block;`] },
  note: { title: "공책 · 한 권에 이어 적기", css: [
    `--shadow: none;`,
    `--font-title: "Gaegu", var(--font-body); --title-spacing: -.5px;`,
    `--bw: 1.5px;`,
    `--radius: 4px; --r-btn: 6px; --r-btn-sm: 5px; --r-inp: 6px; --r-block: 5px;`,
    `--accent-w: 0px; --accent-l: 5px;   /* 왼쪽에 유형 색줄 */`] },
  play: { title: "블록놀이 · 가장 아이답게", css: [
    `--shadow: 0 5px 0 var(--hard);`,
    `--font-title: "Jua", var(--font-body); --title-spacing: 0px;`,
    `--bw: 3.5px;`,
    `--line: var(--ink);`,
    `--radius: 18px; --r-btn: 14px; --r-btn-sm: 12px; --r-inp: 14px; --r-pill: 999px; --r-block: 14px;`,
    `--veil: transparent;`,
    `--entry-pt: 34px;`,
    `--accent-w: 0px;`,
    `--stud: block; --stud-w: 108px; --stud-h: 18px; --stud-step: 27px;`] },
  paper: { title: "문서 · 인쇄물처럼", css: [
    `--shadow: none;`,
    `--font-body: "Gowun Batang", "Apple SD Gothic Neo", "Malgun Gothic", serif;`,
    `--font-title: "Gowun Batang", serif; --title-spacing: -.2px;`,
    `--bw: 1px;`,
    `--radius: 2px; --r-btn: 2px; --r-btn-sm: 2px; --r-inp: 2px; --r-pill: 2px; --r-block: 2px;`,
    `--veil: var(--panel);`,
    `--accent-w: 0px; --accent-l: 2px;`] },
  draft: { title: "설계도 · 가장 정밀하게", css: [
    `--shadow: none;`,
    `--font-body: "IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;`,
    `--font-title: "IBM Plex Sans KR", sans-serif; --title-spacing: -.2px;`,
    `--bw: 1px;`,
    `--radius: 0px; --r-btn: 0px; --r-btn-sm: 0px; --r-inp: 0px; --r-pill: 0px; --r-block: 0px;`,
    `--veil: var(--panel);`,
    `--accent-w: 2px; --accent-l: 0px;`] }
};

/* ── CSS 를 찍어 낸다 ─────────────────────────────────────── */
const out = [];
out.push("");
out.push("  /* =========================================================");
out.push("     모양 일곱 · **색은 한 톨도 없다.**");
out.push("     색은 아래 «색감» 이 맡는다. 그래야 모양을 고쳐도 색이 안 흔들린다.");
out.push("     ⚠️ 여기에 색을 적고 싶어지면, 그건 색감에 적어야 하는 것이다.");
out.push("        딱 하나 예외 · 테두리를 «잉크색으로» 쓰는 모양은 --line: var(--ink) 로");
out.push("        «가리키기만» 한다. 색 자체를 적는 것이 아니다.");
out.push("     ========================================================= */");
for (const [k, v] of Object.entries(SHAPES)) {
  out.push(`  /* ${v.title} */`);
  out.push(`  [data-theme="${k}"] {`);
  v.css.forEach((l) => out.push("    " + l));
  out.push("  }");
}

out.push("");
out.push("  /* =========================================================");
out.push("     색감 여섯 · **모양은 한 톨도 없다.**");
out.push("     한 벌이 밝을 때와 어두울 때를 «같은 자리» 에 갖는다.");
out.push("     ⚠️ 어두울 때 값은 두 곳에 놓인다 (기기 따름 · 사람이 고름).");
out.push("        손으로 두 벌을 쓰지 말 것 · 찍어 낸 것이다 (scratchpad/tone.mjs).");
out.push("     ========================================================= */");
for (const [k, v] of Object.entries(TONES)) {
  out.push(`  /* ${v.label} · ${v.sub} */`);
  out.push(`  [data-tone="${k}"] {`);
  out.push(palette(v.l, 4));
  out.push("  }");
}
out.push("  @media (prefers-color-scheme: dark) {");
for (const [k, v] of Object.entries(TONES)) {
  out.push(`    [data-tone="${k}"]:not([data-mode="light"]) {`);
  out.push(palette(v.d, 6));
  out.push("    }");
}
out.push("  }");
out.push("  /* ↑ 와 같은 색. 사람이 「어둡게」 를 고른 경우 (기기 설정과 무관하게) */");
for (const [k, v] of Object.entries(TONES)) {
  out.push(`  [data-tone="${k}"][data-mode="dark"] {`);
  out.push(palette(v.d, 4));
  out.push("  }");
}
out.push("");

const block = out.join(nl);

const p = "index.html";
const lines = fs.readFileSync(p, "utf8").split(nl);
// 85줄(1-based 86: @media dark) 부터 298줄까지가 «옛 색 + 옛 모양» 이다
const from = lines.findIndex((l) => l.trim() === "@media (prefers-color-scheme: dark) {");
const to = lines.findIndex((l) => l.indexOf("/* ---------- 글자 크기 ----------") >= 0);
if (from < 0 || to < 0 || to <= from) throw new Error("자리를 못 찾음 " + from + " " + to);
lines.splice(from, to - from, ...block.split(nl));
fs.writeFileSync(p, lines.join(nl));
console.log(`갈아 끼운 줄 ${to - from} → ${block.split(nl).length}`);
