import { describe, expect, it } from "vitest";
import {
  htmlToText,
  isSensitiveSentence,
  splitSentences,
  summarize,
  tidyTitle,
} from "@/lib/legal-feed/text";
import {
  mapUpfPost,
  parseJudiciaryArticle,
  parseJudiciaryDate,
  parseJudiciaryListing,
  type UpfCategory,
} from "@/lib/legal-feed/parse";

describe("privacy redaction", () => {
  it("flags children, including ages written as words", () => {
    expect(isSensitiveSentence("the recovery of a five-year-old girl in Luwero")).toBe(true);
    expect(isSensitiveSentence("the murder of a 10-Year-Old pupil")).toBe(true);
    expect(isSensitiveSentence("a boy aged 12 was found")).toBe(true);
    expect(isSensitiveSentence("a 34-year-old trader was arrested")).toBe(false);
  });

  it("flags sexual offences", () => {
    expect(isSensitiveSentence("He was charged with aggravated defilement.")).toBe(true);
    expect(isSensitiveSentence("Suspects in a rape case were remanded.")).toBe(true);
    expect(isSensitiveSentence("Police recovered stolen fuel.")).toBe(false);
  });

  it("withholds the whole summary when the headline concerns a child", () => {
    const r = summarize(
      "A suspect is in custody. Investigations continue in Kazo district today.",
      {
        title: "Police Statement on the Murder of a 10-Year-Old Pupil",
      },
    );
    expect(r).toEqual({ summary: null, withheld: true });
  });

  it("drops sensitive sentences and keeps the rest", () => {
    const r = summarize(
      "Police are investigating the abduction of a five-year-old girl. The suspects were arrested in Mabale Village on Monday.",
    );
    expect(r.summary).toBe("The suspects were arrested in Mabale Village on Monday.");
    expect(r.withheld).toBe(false);
  });
});

describe("summaries", () => {
  it("does not split on dates or abbreviations", () => {
    expect(
      splitSentences("Police at Jinja Road on 04.11.2026 arrested two suspects. Both are held."),
    ).toEqual(["Police at Jinja Road on 04.11.2026 arrested two suspects.", "Both are held."]);
  });

  it("drops a trailing fragment cut by WordPress", () => {
    const r = summarize(
      "The DIGP opened a workshop at Naguru today. Heads of departments attended to strengthen",
    );
    expect(r.summary).toBe("The DIGP opened a workshop at Naguru today.");
  });

  it("strips pasted social-media tags", () => {
    const r = summarize(
      "UPFCommunityEngagements The KMP Commander held a community meeting in Entebbe today.",
    );
    expect(r.summary).toBe("The KMP Commander held a community meeting in Entebbe today.");
  });

  it("keeps summaries short", () => {
    const long = Array.from(
      { length: 6 },
      (_, i) => `Sentence number ${i + 1} describes the court session in detail.`,
    ).join(" ");
    expect(summarize(long).summary!.length).toBeLessThanOrEqual(280);
  });
});

describe("titles", () => {
  it("turns ALL-CAPS headlines into title case, keeping acronyms", () => {
    expect(tidyTitle("KMP COMMUNITY ENGAGEMENT MEETING HELD AT KASANJE TOWN COUNCIL")).toBe(
      "KMP Community Engagement Meeting Held at Kasanje Town Council",
    );
    expect(tidyTitle("DIGP OPENS TRAINING WORKSHOP ON BUDGETING")).toBe(
      "DIGP Opens Training Workshop on Budgeting",
    );
  });

  it("leaves normal titles alone", () => {
    expect(tidyTitle("Supreme Court Begins Three-Day Session")).toBe(
      "Supreme Court Begins Three-Day Session",
    );
  });

  it("decodes entities and strips tags", () => {
    expect(htmlToText("<p>Fuel &amp; gas [&hellip;]</p>")).toBe("Fuel & gas");
  });
});

describe("Uganda Police Force mapping", () => {
  const cats = new Map<number, UpfCategory>([
    [21, { id: 21, slug: "latest-posts", name: "Latest Posts" }],
    [5, { id: 5, slug: "traffic-alert", name: "Traffic Alert" }],
    [9, { id: 9, slug: "sports", name: "Sports" }],
  ]);

  it("maps a post with its category, UTC date and redacted summary", () => {
    const item = mapUpfPost(
      {
        id: 101,
        date_gmt: "2026-11-06T08:01:11",
        link: "https://upf.go.ug/road-closure/",
        title: { rendered: "ROAD CLOSURE ON ENTEBBE EXPRESSWAY" },
        excerpt: {
          rendered:
            "<p>The expressway will be closed for repairs on Sunday. Motorists should use [&hellip;]</p>",
        },
        categories: [21, 5],
      },
      cats,
    );
    expect(item).toMatchObject({
      source: "upf",
      source_id: "101",
      category: "Traffic alert",
      title: "Road Closure on Entebbe Expressway",
      published_at: "2026-11-06T08:01:11.000Z",
      summary: "The expressway will be closed for repairs on Sunday.",
    });
  });

  it("skips sports and off-site links", () => {
    const base = { id: 1, link: "https://upf.go.ug/x/", title: { rendered: "Match" } };
    expect(mapUpfPost({ ...base, categories: [9] }, cats)).toBeNull();
    expect(
      mapUpfPost({ ...base, link: "https://example.com/x/", categories: [5] }, cats),
    ).toBeNull();
  });
});

describe("Judiciary parsing", () => {
  it("reads 'Posted 27th, October 2026' as Kampala midnight", () => {
    expect(parseJudiciaryDate("Posted 27th, October 2026 Judiciary")).toBe(
      "2026-10-26T21:00:00.000Z",
    );
    expect(parseJudiciaryDate("no date here")).toBeNull();
  });

  it("dedupes the three links per story and keeps the real title", () => {
    const html = `
      <a href="./data/news/2056/10238/Budget Talks.html"><img src="x.jpg"></a>
      <a href="./data/news/2056/10238/Budget Talks.html">Judiciary Begins Budget Talks</a>
      <a href="data/news/2056/10238/Budget Talks.html">Read More »</a>
      <a href="./data/news/2054/10314/Swearing In.html">HW Swears in Board Members</a>`;
    const items = parseJudiciaryListing(html);
    expect(items.map((i) => [i.source_id, i.title])).toEqual([
      ["10238", "Judiciary Begins Budget Talks"],
      ["10314", "HW Swears in Board Members"],
    ]);
    expect(items[0].url).toBe("https://judiciary.go.ug/data/news/2056/10238/Budget%20Talks.html");
  });

  it("takes the date and summary from an article page", () => {
    const article = parseJudiciaryArticle(
      `<div>Posted 3rd, November 2026</div>
       <p>The Judiciary has commenced a two-day consultative engagement to guide the preparation of its budget estimates.</p>`,
    );
    expect(article.published_at).toBe("2026-11-02T21:00:00.000Z");
    expect(article.summary).toMatch(/^The Judiciary has commenced/);
  });
});
