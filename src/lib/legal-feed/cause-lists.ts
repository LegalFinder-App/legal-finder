// Courts that publish daily cause lists on judiciary.go.ug, taken from the site's own Cause
// List menu (2026-11-08). Links only: the lists name parties, so LegalFinder never copies or
// indexes them (docs/SOURCES.md, Personal data). Refresh from the menu if courts change.
// Same base as the collector's JUDICIARY_BASE; kept literal so the page doesn't bundle parsers.
const JUDICIARY_BASE = "https://judiciary.go.ug/";

export type CourtLevel = "supreme" | "appeal" | "high" | "magistrate";

export const COURT_LEVELS: { id: CourtLevel; label: string }[] = [
  { id: "supreme", label: "Supreme Court" },
  { id: "appeal", label: "Court of Appeal" },
  { id: "high", label: "High Court" },
  { id: "magistrate", label: "Magistrates" },
];

const COURTS: [CourtLevel, string, string][] = [
  ["supreme", "Supreme Court", "data/causelist/31/1/Supreme%20Court.html"],
  ["appeal", "Court of Appeal", "data/causelist/101/2/Court%20of%20Appeal.html"],
  ["high", "Anti-Corruption Division", "data/causelist/42/Anti-Corruption%20Division.html"],
  ["high", "Arua High Court", "data/causelist/56/Arua%20High%20Court.html"],
  ["high", "Bushenyi High Court", "data/causelist/163/Bushenyi%20High%20Court.html"],
  ["high", "Civil Division", "data/causelist/38/Civil%20Division.html"],
  ["high", "Commercial Division", "data/causelist/40/Commercial%20Division.html"],
  ["high", "Criminal Division", "data/causelist/37/Criminal%20Division.html"],
  ["high", "Entebbe High Court", "data/causelist/187/Entebbe%20High%20Court.html"],
  ["high", "Family Division", "data/causelist/41/Family%20Division.html"],
  ["high", "Fort Portal High Court", "data/causelist/64/Fort%20Portal%20High%20Court.html"],
  ["high", "Gulu High Court", "data/causelist/63/Gulu%20High%20Court.html"],
  ["high", "Hoima High Court", "data/causelist/164/Hoima%20High%20Court.html"],
  ["high", "Iganga High Court", "data/causelist/160/Iganga%20High%20Court.html"],
  [
    "high",
    "International Crimes Division",
    "data/causelist/118/International%20Crimes%20Division.html",
  ],
  ["high", "Jinja High Court", "data/causelist/59/Jinja%20High%20Court.html"],
  ["high", "Kabale High Court", "data/causelist/61/Kabale%20High%20Court.html"],
  ["high", "Kasese High Court", "data/causelist/176/Kasese%20High%20Court.html"],
  ["high", "Kiboga High Court", "data/causelist/169/Kiboga%20High%20Court.html"],
  ["high", "Kitgum High Court", "data/causelist/173/Kitgum%20High%20Court.html"],
  ["high", "Kumi High Court", "data/causelist/191/Kumi%20High%20Court.html"],
  ["high", "Land Division", "data/causelist/39/Land%20Division.html"],
  ["high", "Lira High Court", "data/causelist/66/Lira%20High%20Court.html"],
  ["high", "Lugazi High Court", "data/causelist/189/Lugazi%20High%20Court.html"],
  ["high", "Luwero High Court", "data/causelist/155/Luwero%20High%20Court.html"],
  ["high", "Masaka High Court", "data/causelist/75/Masaka%20High%20Court.html"],
  ["high", "Masindi High Court", "data/causelist/62/Masindi%20High%20Court.html"],
  ["high", "Mbale High Court", "data/causelist/57/Mbale%20High%20Court.html"],
  ["high", "Mbarara High Court", "data/causelist/71/Mbarara%20High%20Court.html"],
  ["high", "Moroto High Court", "data/causelist/171/Moroto%20High%20Court.html"],
  ["high", "Mpigi High Court", "data/causelist/134/Mpigi%20High%20Court.html"],
  ["high", "Mubende High Court", "data/causelist/126/Mubende%20High%20Court.html"],
  ["high", "Mukono High Court", "data/causelist/125/Mukono%20High%20Court.html"],
  ["high", "Patongo High Court", "data/causelist/196/Patongo%20High%20Court%20.html"],
  ["high", "Rukungiri High Court", "data/causelist/166/Rukungiri%20High%20Court.html"],
  ["high", "Soroti High Court", "data/causelist/60/Soroti%20High%20Court.html"],
  ["high", "Tororo High Court", "data/causelist/158/Tororo%20High%20Court.html"],
  ["high", "Wakiso High Court", "data/causelist/194/Wakiso%20High%20Court.html"],
  [
    "magistrate",
    "Abim Chief Magistrate Court",
    "data/causelist/206/Abim%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Adjumani Chief Magistrate Court",
    "data/causelist/205/Adjumani%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Apac Chief Magistrate Court",
    "data/causelist/192/Apac%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Arua Chief Magistrate Court",
    "data/causelist/52/Arua%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Buganda Road Chief Magistrate Court",
    "data/causelist/43/Buganda%20Road%20Chief%20Magistrate%20Court%20.html",
  ],
  [
    "magistrate",
    "Bugiri Chief Magistrate Court",
    "data/causelist/167/Bugiri%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Buhweju Chief Magistrate Court",
    "data/causelist/229/Buhweju%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Buliisa Chief Magistrate Court",
    "data/causelist/180/Buliisa%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Bushenyi Chief Magistrate Court",
    "data/causelist/157/Bushenyi%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Busia Chief Magistrate Court",
    "data/causelist/231/Busia%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Butambala Chief Magistrate Court",
    "data/causelist/214/Butambala%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Buyende Chief Magistrate Court",
    "data/causelist/198/Buyende%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Dokolo Chief Magistrate Court",
    "data/causelist/188/Dokolo%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Entebbe Chief Magistrate Court",
    "data/causelist/110/Entebbe%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Fort Portal Chief Magistrate Court",
    "data/causelist/49/Fort%20Portal%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Gomba - Kanoni Chief Magistrate Court",
    "data/causelist/232/Gomba%20-%20Kanoni%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Gomba-Kanoni Chief Magistrate Court",
    "data/causelist/181/Gomba-Kanoni%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Gulu Chief Magistrate Court",
    "data/causelist/55/Gulu%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Hoima Chief Magistrate Court",
    "data/causelist/92/Hoima%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Ibanda Chief Magistrate Court",
    "data/causelist/201/Ibanda%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Iganga Chief Magistrate Court",
    "data/causelist/122/Iganga%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Isingiro Chief Magistrate Court",
    "data/causelist/207/Isingiro%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Jinja Chief Magistrate Court",
    "data/causelist/48/Jinja%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kabale Chief Magistrate Court",
    "data/causelist/54/Kabale%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kaberamaido Chief Magistrate Court",
    "data/causelist/186/Kaberamaido%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kajjansi Chief Magistrate Court",
    "data/causelist/182/Kajjansi%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kalangala Chief Magistrate Court",
    "data/causelist/208/Kalangala%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kamuli Chief Magistrate Court",
    "data/causelist/209/Kamuli%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kamwenge Chief Magistrate Court",
    "data/causelist/210/Kamwenge%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kanungu Chief Magistrate Court",
    "data/causelist/172/Kanungu%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kapchorwa Chief Magistrate Court",
    "data/causelist/211/Kapchorwa%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kasangati Chief Magistrate Court",
    "data/causelist/195/Kasangati%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kasese Chief Magistrate Court",
    "data/causelist/159/Kasese%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Katakwi Chief Magistrate Court",
    "data/causelist/162/Katakwi%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kawempe Chief Magistrate Court",
    "data/causelist/183/Kawempe%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kayunga Chief Magistrate Court",
    "data/causelist/174/Kayunga%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kibaale Chief Magistrate Court",
    "data/causelist/212/Kibaale%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kiboga Chief Magistrate Court",
    "data/causelist/168/Kiboga%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kiruhura Chief Magistrate Court",
    "data/causelist/199/Kiruhura%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kiryandongo Chief Magistrates Court",
    "data/causelist/165/Kiryandongo%20Chief%20Magistrates%20Court.html",
  ],
  [
    "magistrate",
    "Kisoro Chief Magistrate Court",
    "data/causelist/153/Kisoro%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kitgum Chief Magistrate Court",
    "data/causelist/170/Kitgum%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kotido Chief Magistrate Court",
    "data/causelist/213/Kotido%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kumi Chief Magistrate Court",
    "data/causelist/161/Kumi%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kyankwanzi Chief Magistrate Court",
    "data/causelist/215/Kyankwanzi%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Kyenjojo Chief Magistrate",
    "data/causelist/193/Kyenjojo%20Chief%20Magistrate.html",
  ],
  [
    "magistrate",
    "Lira Chief Magistrate Court",
    "data/causelist/46/Lira%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Lugazi Chief Magistrate Court",
    "data/causelist/190/Lugazi%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Luwero Chief Magistrate Court",
    "data/causelist/130/Luwero%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Lyantonde Chief Magistrate Court",
    "data/causelist/216/Lyantonde%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Makindye Chief Magistrate Court",
    "data/causelist/44/Makindye%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Masaka Chief Magistrate Court",
    "data/causelist/50/Masaka%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Masindi Chief Magistrate Court",
    "data/causelist/53/Masindi%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Mbale Chief Magistrate Court",
    "data/causelist/47/Mbale%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Mbarara Chief Magistrate Court",
    "data/causelist/79/Mbarara%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Mengo Chief Magistrate Court",
    "data/causelist/76/Mengo%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Mitooma Chief Magistrate Court",
    "data/causelist/217/Mitooma%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Mityana Chief Magistrate Court",
    "data/causelist/152/Mityana%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Moroto Chief Magistrate Court",
    "data/causelist/178/Moroto%20Chief%20Magistrate%20Court%20.html",
  ],
  [
    "magistrate",
    "Moyo Chief Magistrate Court",
    "data/causelist/218/Moyo%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Mubende Chief Magistrate Court",
    "data/causelist/127/Mubende%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Mukono Chief Magistrate Court",
    "data/causelist/120/Mukono%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Nabweru Chief Magistrate Court",
    "data/causelist/131/Nabweru%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Nakaseke Chief Magistrate Court",
    "data/causelist/233/Nakaseke%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Nakasongola Chief Magistrate Court",
    "data/causelist/220/Nakasongola%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Nakawa Chief Magistrate Court",
    "data/causelist/51/Nakawa%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Nebbi Chief Magistrate Court",
    "data/causelist/234/Nebbi%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Nsangi Chief Magistrate Court",
    "data/causelist/185/Nsangi%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Ntungamo Chief Magistrate Court",
    "data/causelist/235/Ntungamo%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Nwoya Chief Magistrate Court",
    "data/causelist/236/Nwoya%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Oyam Chief Magistrate Court",
    "data/causelist/222/Oyam%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Pallisa Chief Magistrate Court",
    "data/causelist/223/Pallisa%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Rakai Chief Magistrate Court",
    "data/causelist/224/Rakai%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Rukungiri Chief Magistrate Court",
    "data/causelist/154/Rukungiri%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Sembabule Chief Magistrate Court",
    "data/causelist/228/Sembabule%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Serere Chief Magistrate Court",
    "data/causelist/225/Serere%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Sheema Chief Magistrate Court",
    "data/causelist/226/Sheema%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Sironko Chief Magistrate Court",
    "data/causelist/227/Sironko%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Soroti Chief Magistrate Court",
    "data/causelist/45/Soroti%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Standards, Wildlife and Utilities Chief Magistrate Court",
    "data/causelist/156/Standards%2C%20Wildlife%20and%20Utilities%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Tororo Chief Magistrate Court",
    "data/causelist/128/Tororo%20Chief%20Magistrate%20Court.html",
  ],
  [
    "magistrate",
    "Wakiso Chief Magistrate Court",
    "data/causelist/135/Wakiso%20Chief%20Magistrate%20Court.html",
  ],
];

export const CAUSE_LISTS = COURTS.map(([level, name, path]) => ({
  level,
  name,
  url: JUDICIARY_BASE + path,
}));
